import { prisma } from "../db.js";
import { env } from "../env.js";
import {
  renderWeeklyReportEmail,
  type WeeklyReportRow,
} from "../email/templates.js";
import { sendEmail } from "../email/send.js";

export async function buildReportRows(): Promise<WeeklyReportRow[]> {
  const urls = await prisma.monitoredUrl.findMany({
    include: {
      checks: { orderBy: { checkedAt: "desc" }, take: 1 },
    },
    orderBy: { url: "asc" },
  });

  return urls.map((u) => {
    const last = u.checks[0];
    return {
      host: u.url,
      label: u.label,
      status: last?.status ?? ("ERROR" as const),
      validTo: last?.validTo ?? null,
      daysRemaining: last?.daysRemaining ?? null,
      errorMessage: last?.errorMessage ?? null,
      checkedAt: last?.checkedAt ?? null,
    };
  });
}

export async function sendSslReport(params: {
  recipients: string[];
  idempotencyKey: string;
  subjectNote?: string;
}): Promise<{ ok: true; sentTo: string[] } | { ok: false; error: string }> {
  const rows = await buildReportRows();
  const { subject, html } = renderWeeklyReportEmail(rows, {
    subjectNote: params.subjectNote,
  });

  const uniqueTo = [...new Set(params.recipients.filter(Boolean))];
  if (uniqueTo.length === 0) {
    return { ok: false, error: "No recipients" };
  }

  const result = await sendEmail({
    to: uniqueTo,
    subject,
    html,
    idempotencyKey: params.idempotencyKey,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, sentTo: uniqueTo };
}

export async function resolveReportRecipients(options: {
  includeFallback: boolean;
  emailIds: string[];
}): Promise<{ recipients: string[] } | { error: string }> {
  const recipients = new Set<string>();

  if (options.includeFallback) {
    recipients.add(env.fallbackEmail());
  }

  if (options.emailIds.length > 0) {
    const emails = await prisma.notificationEmail.findMany({
      where: { id: { in: options.emailIds } },
      select: { id: true, address: true },
    });

    if (emails.length !== options.emailIds.length) {
      return { error: "One or more selected emails were not found" };
    }

    for (const row of emails) {
      recipients.add(row.address);
    }
  }

  if (recipients.size === 0) {
    return { error: "Select at least one recipient" };
  }

  return { recipients: [...recipients] };
}
