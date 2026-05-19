import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { authMiddleware } from "../lib/auth.js";
import { normalizeHost } from "../lib/ssl/normalize-url.js";

const createSchema = z.object({
  url: z.string().min(1),
  label: z.string().optional().nullable(),
  enabled: z.boolean().optional(),
  emailIds: z.array(z.string()).default([]),
});

const updateSchema = z.object({
  url: z.string().min(1).optional(),
  label: z.string().optional().nullable(),
  enabled: z.boolean().optional(),
  emailIds: z.array(z.string()).optional(),
});

const urlInclude = {
  emails: { include: { email: true } },
  checks: { orderBy: { checkedAt: "desc" as const }, take: 1 },
};

export const urlsRouter = Router();
urlsRouter.use(authMiddleware);

urlsRouter.get("/", async (_req, res) => {
  const urls = await prisma.monitoredUrl.findMany({
    orderBy: { createdAt: "desc" },
    include: urlInclude,
  });
  res.json(urls);
});

urlsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  let host: string;
  try {
    host = normalizeHost(parsed.data.url);
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Invalid URL",
    });
    return;
  }

  if (parsed.data.emailIds.length > 0) {
    const found = await prisma.notificationEmail.count({
      where: { id: { in: parsed.data.emailIds } },
    });
    if (found !== parsed.data.emailIds.length) {
      res.status(400).json({ error: "One or more email IDs are invalid" });
      return;
    }
  }

  try {
    const url = await prisma.monitoredUrl.create({
      data: {
        url: host,
        label: parsed.data.label ?? null,
        enabled: parsed.data.enabled ?? true,
        emails: {
          create: parsed.data.emailIds.map((emailId) => ({ emailId })),
        },
      },
      include: urlInclude,
    });
    res.status(201).json(url);
  } catch {
    res.status(409).json({ error: "URL already exists" });
  }
});

urlsRouter.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  let host: string | undefined;
  if (parsed.data.url) {
    try {
      host = normalizeHost(parsed.data.url);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "Invalid URL",
      });
      return;
    }
  }

  try {
    if (parsed.data.emailIds) {
      if (parsed.data.emailIds.length > 0) {
        const found = await prisma.notificationEmail.count({
          where: { id: { in: parsed.data.emailIds } },
        });
        if (found !== parsed.data.emailIds.length) {
          res.status(400).json({ error: "One or more email IDs are invalid" });
          return;
        }
      }
      await prisma.monitoredUrlOnEmail.deleteMany({
        where: { urlId: req.params.id },
      });
      if (parsed.data.emailIds.length > 0) {
        await prisma.monitoredUrlOnEmail.createMany({
          data: parsed.data.emailIds.map((emailId) => ({
            urlId: req.params.id,
            emailId,
          })),
        });
      }
    }

    const url = await prisma.monitoredUrl.update({
      where: { id: req.params.id },
      data: {
        ...(host && { url: host }),
        ...(parsed.data.label !== undefined && { label: parsed.data.label }),
        ...(parsed.data.enabled !== undefined && {
          enabled: parsed.data.enabled,
        }),
      },
      include: urlInclude,
    });
    res.json(url);
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

urlsRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.monitoredUrl.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

urlsRouter.get("/:id/checks", async (req, res) => {
  const url = await prisma.monitoredUrl.findUnique({
    where: { id: req.params.id },
    select: { id: true },
  });
  if (!url) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [checks, total] = await Promise.all([
    prisma.sslCheckResult.findMany({
      where: { urlId: req.params.id },
      orderBy: { checkedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.sslCheckResult.count({ where: { urlId: req.params.id } }),
  ]);

  res.json({ checks, total, page, limit });
});
