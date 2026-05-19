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

export const env = {
  port: Number(optional("PORT", "3001")),
  nodeEnv: optional("NODE_ENV", "development"),
  corsOrigin: optional("CORS_ORIGIN", "http://localhost:5173"),
  jwtSecret: () => required("JWT_SECRET"),
  dashboardPassword: () => process.env.DASHBOARD_PASSWORD,
  dashboardPasswordHash: () => process.env.DASHBOARD_PASSWORD_HASH,
  fallbackEmail: () => required("FALLBACK_EMAIL"),
  resendApiKey: () => process.env.RESEND_API_KEY,
  resendFrom: () => required("RESEND_FROM"),
  cronSecret: () => required("CRON_SECRET"),
  sslWarnDays: Number(optional("SSL_WARN_DAYS", "14")),
};
