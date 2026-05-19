import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { authMiddleware } from "../lib/auth.js";

const createSchema = z.object({
  address: z.string().email(),
  label: z.string().optional().nullable(),
});

const updateSchema = z.object({
  address: z.string().email().optional(),
  label: z.string().optional().nullable(),
});

export const emailsRouter = Router();
emailsRouter.use(authMiddleware);

emailsRouter.get("/", async (_req, res) => {
  const emails = await prisma.notificationEmail.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { urls: true } } },
  });
  res.json(emails);
});

emailsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const email = await prisma.notificationEmail.create({
      data: {
        address: parsed.data.address.toLowerCase(),
        label: parsed.data.label ?? null,
      },
    });
    res.status(201).json(email);
  } catch {
    res.status(409).json({ error: "Email already exists" });
  }
});

emailsRouter.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const email = await prisma.notificationEmail.update({
      where: { id: req.params.id },
      data: {
        ...(parsed.data.address && {
          address: parsed.data.address.toLowerCase(),
        }),
        ...(parsed.data.label !== undefined && { label: parsed.data.label }),
      },
    });
    res.json(email);
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

emailsRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.notificationEmail.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});
