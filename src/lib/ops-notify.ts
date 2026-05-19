import { createHash } from "node:crypto";
import { prisma } from "./db.js";
import { env } from "./env.js";
import { renderOpsErrorEmail, type OpsErrorItem } from "./email/templates.js";
import { sendEmail } from "./email/send.js";

export type OpsErrorEvent = {
  category: string;
  message: string;
  details?: string;
};

type QueuedEvent = OpsErrorEvent & { at: Date };

const pending: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

function normalizeForFingerprint(text: string): string {
  return text
    .slice(0, 300)
    .replace(/\d{4}-\d{2}-\d{2}/g, "<date>")
    .replace(/\d{2}:\d{2}:\d{2}/g, "<time>")
    .replace(/\b\d+\b/g, "<n>");
}

function fingerprint(event: OpsErrorEvent): string {
  const raw = `${event.category}|${normalizeForFingerprint(event.message)}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushOpsErrors();
  }, env.opsNotifyDigestSeconds() * 1000);
}

/** Queue an ops error for digest email (rate-limited, batched). */
export function notifyOpsError(event: OpsErrorEvent): void {
  pending.push({ ...event, at: new Date() });

  if (pending.length >= env.opsNotifyDigestMaxBatch()) {
    void flushOpsErrors();
    return;
  }

  scheduleFlush();
}

async function withinGlobalHourlyLimit(): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const count = await prisma.opsDigestSend.count({
    where: { sentAt: { gte: since } },
  });
  return count < env.opsNotifyMaxPerHour();
}

async function shouldSendFingerprint(fp: string): Promise<{
  send: boolean;
  suppressed: number;
}> {
  const existing = await prisma.opsNotificationLog.findUnique({
    where: { fingerprint: fp },
  });

  if (!existing) {
    return { send: true, suppressed: 0 };
  }

  const cooldownMs = env.opsNotifyCooldownMinutes() * 60 * 1000;
  const elapsed = Date.now() - existing.lastSentAt.getTime();

  if (elapsed < cooldownMs) {
    await prisma.opsNotificationLog.update({
      where: { fingerprint: fp },
      data: { suppressed: { increment: 1 } },
    });
    return { send: false, suppressed: existing.suppressed + 1 };
  }

  return { send: true, suppressed: existing.suppressed };
}

async function recordFingerprintSent(
  fp: string,
  event: QueuedEvent,
): Promise<void> {
  await prisma.opsNotificationLog.upsert({
    where: { fingerprint: fp },
    create: {
      fingerprint: fp,
      category: event.category,
      lastMessage: event.message.slice(0, 500),
      lastSentAt: event.at,
      suppressed: 0,
    },
    update: {
      category: event.category,
      lastMessage: event.message.slice(0, 500),
      lastSentAt: event.at,
      suppressed: 0,
    },
  });
}

export async function flushOpsErrors(): Promise<void> {
  if (flushing) return;
  flushing = true;

  const batch = pending.splice(0);
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  try {
    if (batch.length === 0) return;

    if (!(await withinGlobalHourlyLimit())) {
      console.warn(
        `[ops-notify] Hourly cap (${env.opsNotifyMaxPerHour()}) reached; dropping ${batch.length} error(s)`,
      );
      return;
    }

    const byFp = new Map<string, QueuedEvent>();
    for (const event of batch) {
      byFp.set(fingerprint(event), event);
    }

    const toSend: OpsErrorItem[] = [];
    let suppressedTotal = 0;

    for (const [fp, event] of byFp) {
      const gate = await shouldSendFingerprint(fp);
      if (!gate.send) {
        suppressedTotal += gate.suppressed;
        continue;
      }
      toSend.push({
        category: event.category,
        message: event.message,
        details: event.details,
        at: event.at,
      });
    }

    if (toSend.length === 0) return;

    const { subject, html } = renderOpsErrorEmail(toSend, suppressedTotal);
    const digestKey = `ssl-ops/${new Date().toISOString().slice(0, 13)}-${toSend.length}`;

    const result = await sendEmail({
      to: [env.fallbackEmail()],
      subject,
      html,
      idempotencyKey: digestKey,
    });

    if (!result.ok) {
      console.error("[ops-notify] Failed to send digest:", result.error);
      return;
    }

    await prisma.opsDigestSend.create({
      data: { errorCount: toSend.length },
    });

    for (const item of toSend) {
      const fp = fingerprint(item);
      const queued = byFp.get(fp);
      if (queued) {
        await recordFingerprintSent(fp, queued);
      }
    }
  } finally {
    flushing = false;
    if (pending.length > 0) {
      scheduleFlush();
    }
  }
}

export function registerProcessErrorHandlers(): void {
  process.on("unhandledRejection", (reason) => {
    const message =
      reason instanceof Error ? reason.message : String(reason ?? "unknown");
    const details =
      reason instanceof Error ? reason.stack?.slice(0, 2000) : undefined;
    notifyOpsError({
      category: "unhandledRejection",
      message,
      details,
    });
  });

  process.on("uncaughtException", (err) => {
    notifyOpsError({
      category: "uncaughtException",
      message: err.message,
      details: err.stack?.slice(0, 2000),
    });
    console.error("[ops-notify] uncaughtException:", err);
  });
}
