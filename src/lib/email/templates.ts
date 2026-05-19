import type { SslStatus } from "@prisma/client";

const styles = {
  bg: "#faf7f0",
  text: "#0a0e0c",
  muted: "#576067",
  border: "#d1d5db",
  primary: "#0f3d2e",
  accent: "#0f766e",
  warning: "#f59e0b",
  danger: "#dc2626",
  success: "#1b7a47",
};

function statusColor(status: SslStatus): string {
  switch (status) {
    case "OK":
      return styles.success;
    case "WARNING":
      return styles.warning;
    case "ERROR":
      return styles.danger;
  }
}

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:24px;background:${styles.bg};font-family:Inter,Arial,sans-serif;color:${styles.text};">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
    <tr><td style="padding:16px;border:1px solid ${styles.border};background:#f2ede0;border-radius:2px;">
      <h1 style="margin:0 0 16px;font-size:20px;color:${styles.primary};">${title}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding-top:12px;font-size:12px;color:${styles.muted};">SSL Checker</td></tr>
  </table>
</body>
</html>`;
}

export function renderAlertEmail(params: {
  host: string;
  label: string | null;
  status: SslStatus;
  kind: "failure" | "recovery";
  validTo: Date | null;
  daysRemaining: number | null;
  errorMessage: string | null;
}): { subject: string; html: string } {
  const name = params.label ?? params.host;
  const subject =
    params.kind === "recovery"
      ? `SSL recovered: ${name}`
      : `SSL alert: ${name}`;

  const expiry =
    params.validTo !== null
      ? params.validTo.toISOString().slice(0, 10)
      : "unknown";

  const body = `
    <p style="margin:0 0 12px;">Host: <strong>${params.host}</strong></p>
    <p style="margin:0 0 12px;">Status: <strong style="color:${statusColor(params.status)};">${params.status}</strong></p>
    <p style="margin:0 0 12px;">Expires: ${expiry}</p>
    ${
      params.daysRemaining !== null
        ? `<p style="margin:0 0 12px;">Days remaining: ${params.daysRemaining}</p>`
        : ""
    }
    ${
      params.errorMessage
        ? `<p style="margin:0;color:${styles.danger};">${params.errorMessage}</p>`
        : ""
    }
  `;

  return { subject, html: layout(subject, body) };
}

export type WeeklyReportRow = {
  host: string;
  label: string | null;
  status: SslStatus;
  validTo: Date | null;
  daysRemaining: number | null;
  errorMessage: string | null;
  checkedAt: Date | null;
};

export function renderWeeklyReportEmail(
  rows: WeeklyReportRow[],
  options?: { subjectNote?: string },
): {
  subject: string;
  html: string;
} {
  const note = options?.subjectNote ? ` — ${options.subjectNote}` : "";
  const subject = `SSL report (${rows.length} hosts)${note}`;
  const tableRows = rows
    .map((row) => {
      const name = row.label ?? row.host;
      const checked = row.checkedAt
        ? row.checkedAt.toISOString().slice(0, 16).replace("T", " ")
        : "never";
      return `<tr>
        <td style="padding:8px;border:1px solid ${styles.border};">${name}</td>
        <td style="padding:8px;border:1px solid ${styles.border};color:${statusColor(row.status)};">${row.status}</td>
        <td style="padding:8px;border:1px solid ${styles.border};">${row.daysRemaining ?? "—"}</td>
        <td style="padding:8px;border:1px solid ${styles.border};font-size:12px;">${row.errorMessage ?? "—"}</td>
        <td style="padding:8px;border:1px solid ${styles.border};font-size:12px;">${checked}</td>
      </tr>`;
    })
    .join("");

  const body = `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#ebe4d3;">
          <th style="padding:8px;border:1px solid ${styles.border};text-align:left;">Host</th>
          <th style="padding:8px;border:1px solid ${styles.border};text-align:left;">Status</th>
          <th style="padding:8px;border:1px solid ${styles.border};text-align:left;">Days</th>
          <th style="padding:8px;border:1px solid ${styles.border};text-align:left;">Error</th>
          <th style="padding:8px;border:1px solid ${styles.border};text-align:left;">Checked</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;

  return { subject, html: layout(subject, body) };
}

export type OpsErrorItem = {
  category: string;
  message: string;
  details?: string;
  at: Date;
};

export function renderOpsErrorEmail(
  items: OpsErrorItem[],
  suppressedTotal: number,
): { subject: string; html: string } {
  const subject =
    items.length === 1
      ? `SSL Checker ops: ${items[0].category}`
      : `SSL Checker ops: ${items.length} errors`;

  const intro =
    suppressedTotal > 0
      ? `<p style="margin:0 0 16px;color:${styles.muted};font-size:13px;">${suppressedTotal} similar alert(s) were suppressed by cooldown since the last digest.</p>`
      : "";

  const blocks = items
    .map((item) => {
      const time = item.at.toISOString().replace("T", " ").slice(0, 19);
      const details = item.details
        ? `<pre style="margin:8px 0 0;padding:8px;background:#ebe4d3;border:1px solid ${styles.border};font-size:12px;white-space:pre-wrap;word-break:break-word;">${escapeHtml(item.details)}</pre>`
        : "";
      return `<div style="margin:0 0 16px;padding:12px;border:1px solid ${styles.border};">
        <p style="margin:0 0 4px;font-size:12px;color:${styles.muted};">${escapeHtml(item.category)} · ${time} UTC</p>
        <p style="margin:0;font-weight:600;">${escapeHtml(item.message)}</p>
        ${details}
      </div>`;
    })
    .join("");

  const body = `${intro}${blocks}`;
  return { subject, html: layout(subject, body) };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
