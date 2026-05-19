import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../lib/auth.js";
import {
  resolveReportRecipients,
  sendSslReport,
} from "../lib/reports/ssl-report.js";
import { notifyOpsError } from "../lib/ops-notify.js";

const sendSchema = z.object({
  recipientMode: z.enum(["fallback", "emails", "both"]),
  emailIds: z.array(z.string()).optional(),
});

export const reportsRouter = Router();

reportsRouter.use(authMiddleware);

reportsRouter.post("/send", async (req, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { recipientMode, emailIds = [] } = parsed.data;

  if (recipientMode !== "fallback" && emailIds.length === 0) {
    res.status(400).json({ error: "Select at least one notification email" });
    return;
  }

  const resolved = await resolveReportRecipients({
    includeFallback:
      recipientMode === "fallback" || recipientMode === "both",
    emailIds:
      recipientMode === "emails" || recipientMode === "both" ? emailIds : [],
  });

  if ("error" in resolved) {
    res.status(400).json({ error: resolved.error });
    return;
  }

  const result = await sendSslReport({
    recipients: resolved.recipients,
    idempotencyKey: `ssl-report-manual/${Date.now()}`,
    subjectNote: "manual",
  });

  if (!result.ok) {
    notifyOpsError({
      category: "report-send",
      message: "Manual SSL report failed to send",
      details: result.error,
    });
    res.status(500).json({ error: result.error });
    return;
  }

  res.json({ ok: true, sentTo: result.sentTo });
});
