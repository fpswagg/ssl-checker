import { Router } from "express";
import { prisma } from "../lib/db.js";
import { authMiddleware } from "../lib/auth.js";

export const overviewRouter = Router();
overviewRouter.use(authMiddleware);

overviewRouter.get("/", async (_req, res) => {
  const [emailCount, urlCount, enabledCount, enabledUrls] = await Promise.all([
    prisma.notificationEmail.count(),
    prisma.monitoredUrl.count(),
    prisma.monitoredUrl.count({ where: { enabled: true } }),
    prisma.monitoredUrl.findMany({
      where: { enabled: true },
      include: { checks: { orderBy: { checkedAt: "desc" }, take: 1 } },
    }),
  ]);

  const failing = enabledUrls
    .filter((u) => u.checks[0] && u.checks[0].status !== "OK")
    .map((u) => ({
      id: u.id,
      url: u.url,
      label: u.label,
      status: u.checks[0]!.status,
      daysRemaining: u.checks[0]!.daysRemaining,
      checkedAt: u.checks[0]!.checkedAt,
    }));

  const lastRun = await prisma.sslCheckResult.findFirst({
    orderBy: { checkedAt: "desc" },
    select: { checkedAt: true },
  });

  res.json({
    emailCount,
    urlCount,
    enabledCount,
    failing,
    lastRunAt: lastRun?.checkedAt ?? null,
  });
});
