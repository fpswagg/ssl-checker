import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  config({ path: envPath });
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function optionalBoolean(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function corsOriginOption(): string | boolean {
  const value = optional("CORS_ORIGIN", "http://localhost:5173").trim();
  if (value === "*" || value.toLowerCase() === "all") {
    return true;
  }
  return value;
}

export const env = {
  port: Number(optional("PORT", "3001")),
  nodeEnv: optional("NODE_ENV", "development"),
  corsOrigin: corsOriginOption(),
  jwtSecret: () => required("JWT_SECRET"),
  dashboardPassword: () => process.env.DASHBOARD_PASSWORD,
  dashboardPasswordHash: () => process.env.DASHBOARD_PASSWORD_HASH,
  fallbackEmail: () => required("FALLBACK_EMAIL"),
  resendApiKey: () => process.env.RESEND_API_KEY,
  resendFrom: () => required("RESEND_FROM"),
  cronSecret: () => required("CRON_SECRET"),
  sslWarnDays: Number(optional("SSL_WARN_DAYS", "14")),
  autoCheckEnabled: optionalBoolean("AUTO_CHECK_ENABLED", true),
  autoCheckIntervalHours: Number(optional("AUTO_CHECK_INTERVAL_HOURS", "24")),
  autoCheckPollSeconds: Number(optional("AUTO_CHECK_POLL_SECONDS", "60")),
  weeklyReportEnabled: optionalBoolean("WEEKLY_REPORT_ENABLED", true),
  weeklyReportDay: Number(optional("WEEKLY_REPORT_DAY", "0")),
  weeklyReportHour: Number(optional("WEEKLY_REPORT_HOUR", "9")),
  opsNotifyCooldownMinutes: () =>
    Number(optional("OPS_NOTIFY_COOLDOWN_MINUTES", "30")),
  opsNotifyMaxPerHour: () => Number(optional("OPS_NOTIFY_MAX_PER_HOUR", "8")),
  opsNotifyDigestSeconds: () =>
    Number(optional("OPS_NOTIFY_DIGEST_SECONDS", "90")),
  opsNotifyDigestMaxBatch: () =>
    Number(optional("OPS_NOTIFY_DIGEST_MAX_BATCH", "5")),
};
