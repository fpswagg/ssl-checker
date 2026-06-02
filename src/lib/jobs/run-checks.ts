import type { Prisma, SslStatus } from "@prisma/client";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { renderAlertEmail } from "../email/templates.js";
import { sendEmail } from "../email/send.js";
import { sendSslReport } from "../reports/ssl-report.js";
import { notifyOpsError } from "../ops-notify.js";
import { checkCertificate } from "../ssl/check-certificate.js";
import {
  shouldSendFailureAlert,
  shouldSendRecoveryAlert,
} from "../ssl/status.js";

const CHECK_DELAY_MS = 200;
const HISTORY_KEEP = 90;
const ONE_HOUR_MS = 60 * 60 * 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function pruneHistory(urlId: string): Promise<void> {
  const old = await prisma.sslCheckResult.findMany({
    where: { urlId },
    orderBy: { checkedAt: "desc" },
    skip: HISTORY_KEEP,
    select: { id: true },
  });
  if (old.length > 0) {
    await prisma.sslCheckResult.deleteMany({
      where: { id: { in: old.map((r) => r.id) } },
    });
  }
}

async function sendTransitionAlert(
  urlId: string,
  host: string,
  label: string | null,
  kind: "failure" | "recovery",
  status: SslStatus,
  validTo: Date | null,
  daysRemaining: number | null,
  errorMessage: string | null,
  recipients: string[],
): Promise<void> {
  const { subject, html } = renderAlertEmail({
    host,
    label,
    status,
    kind,
    validTo,
    daysRemaining,
    errorMessage,
  });

  const idempotencyKey = `ssl-alert/${urlId}/${todayKey()}/${kind}`;
  const result = await sendEmail({
    to: recipients,
    subject,
    html,
    idempotencyKey,
  });

  if (result.ok) {
    await prisma.alertDelivery.create({
      data: { urlId, kind, resendId: result.id },
    });
  }
}

export type RunChecksSummary = {
  checked: number;
  alertsSent: number;
  errors: string[];
};

async function runChecks(
  where: Prisma.MonitoredUrlWhereInput,
  errorCategory: string,
): Promise<RunChecksSummary> {
  const summary: RunChecksSummary = {
    checked: 0,
    alertsSent: 0,
    errors: [],
  };

  const urls = await prisma.monitoredUrl.findMany({
    where,
    include: { emails: { include: { email: true } } },
  });

  const fallback = env.fallbackEmail();
  const warnDays = env.sslWarnDays;

  for (const monitored of urls) {
    try {
      const outcome = await checkCertificate(monitored.url, warnDays);

      const previous = await prisma.sslCheckResult.findFirst({
        where: { urlId: monitored.id },
        orderBy: { checkedAt: "desc" },
      });

      await prisma.sslCheckResult.create({
        data: {
          urlId: monitored.id,
          status: outcome.status,
          validTo: outcome.validTo,
          daysRemaining: outcome.daysRemaining,
          issuer: outcome.issuer,
          errorCode: outcome.errorCode,
          errorMessage: outcome.errorMessage,
        },
      });

      await pruneHistory(monitored.id);
      summary.checked += 1;

      const assigned = monitored.emails.map((e) => e.email.address);
      const recipients = [...new Set([...assigned, fallback])];

      const prevStatus = previous?.status ?? null;

      if (shouldSendFailureAlert(prevStatus, outcome.status)) {
        await sendTransitionAlert(
          monitored.id,
          monitored.url,
          monitored.label,
          "failure",
          outcome.status,
          outcome.validTo,
          outcome.daysRemaining,
          outcome.errorMessage,
          recipients,
        );
        summary.alertsSent += 1;
      } else if (shouldSendRecoveryAlert(prevStatus, outcome.status)) {
        await sendTransitionAlert(
          monitored.id,
          monitored.url,
          monitored.label,
          "recovery",
          outcome.status,
          outcome.validTo,
          outcome.daysRemaining,
          outcome.errorMessage,
          recipients,
        );
        summary.alertsSent += 1;
      }
    } catch (err) {
      summary.errors.push(
        `${monitored.url}: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }

    await sleep(CHECK_DELAY_MS);
  }

  if (summary.errors.length > 0) {
    notifyOpsError({
      category: errorCategory,
      message: `${summary.errors.length} host(s) failed during SSL checks`,
      details: summary.errors.slice(0, 15).join("\n"),
    });
  }

  return summary;
}

export async function runAllChecks(): Promise<RunChecksSummary> {
  return runChecks({ enabled: true }, "daily-check");
}

export async function runDueChecks(
  now = new Date(),
): Promise<RunChecksSummary> {
  const cutoff = new Date(
    now.getTime() - env.autoCheckIntervalHours * ONE_HOUR_MS,
  );
  const urls = await prisma.monitoredUrl.findMany({
    where: { enabled: true },
    select: {
      id: true,
      checks: {
        orderBy: { checkedAt: "desc" },
        take: 1,
        select: { checkedAt: true },
      },
    },
  });

  const dueIds = urls
    .filter((url) => {
      const lastCheck = url.checks[0]?.checkedAt;
      return !lastCheck || lastCheck <= cutoff;
    })
    .map((url) => url.id);

  if (dueIds.length === 0) {
    return { checked: 0, alertsSent: 0, errors: [] };
  }

  return runChecks({ enabled: true, id: { in: dueIds } }, "auto-check");
}

export async function runWeeklyReport(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const result = await sendSslReport({
    recipients: [env.fallbackEmail()],
    idempotencyKey: `ssl-weekly/${todayKey()}`,
    subjectNote: "weekly",
  });

  if (!result.ok) {
    notifyOpsError({
      category: "weekly-report",
      message: "Weekly SSL report failed to send",
      details: result.error,
    });
    return { ok: false, error: result.error };
  }

  return { ok: true };
}
