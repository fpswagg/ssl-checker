import { Router } from "express";
import { authMiddleware } from "../lib/auth.js";
import { runAllChecks } from "../lib/jobs/run-checks.js";

export const checksRouter = Router();
checksRouter.use(authMiddleware);

checksRouter.post("/run", async (_req, res) => {
  const summary = await runAllChecks();
  res.json(summary);
});
