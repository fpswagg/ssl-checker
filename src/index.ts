import express from "express";
import cors from "cors";
import { env } from "./lib/env.js";
import { authRouter } from "./routes/auth.js";
import { emailsRouter } from "./routes/emails.js";
import { urlsRouter } from "./routes/urls.js";
import { jobsRouter } from "./routes/jobs.js";
import { checksRouter } from "./routes/checks.js";
import { overviewRouter } from "./routes/overview.js";
import { reportsRouter } from "./routes/reports.js";
import { startAutoCheckScheduler } from "./lib/jobs/auto-check-scheduler.js";
import {
  notifyOpsError,
  registerProcessErrorHandlers,
} from "./lib/ops-notify.js";

const app = express();

registerProcessErrorHandlers();

app.use(
  cors({
    origin: env.corsOrigin,
    credentials: typeof env.corsOrigin === "string",
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/emails", emailsRouter);
app.use("/api/urls", urlsRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/checks", checksRouter);
app.use("/api/overview", overviewRouter);
app.use("/api/reports", reportsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    notifyOpsError({
      category: "http-500",
      message: err.message,
      details: `${req.method} ${req.path}`,
    });
    res.status(500).json({ error: "Internal server error" });
  },
);

app.listen(env.port, () => {
  console.log(`SSL Checker API listening on port ${env.port}`);
  startAutoCheckScheduler();
});
