import { Router } from "express";
import { cronAuthMiddleware } from "../lib/auth.js";
import { runAllChecks, runWeeklyReport } from "../lib/jobs/run-checks.js";

export const jobsRouter = Router();
jobsRouter.use(cronAuthMiddleware);

jobsRouter.post("/daily-check", async (_req, res) => {
  const summary = await runAllChecks();
  res.json(summary);
});

jobsRouter.post("/weekly-report", async (_req, res) => {
  const result = await runWeeklyReport();
  if (!result.ok) {
    res.status(500).json({ error: result.error });
    return;
  }
  res.json({ ok: true });
});
