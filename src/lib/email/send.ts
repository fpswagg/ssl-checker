import { Resend } from "resend";
import { env } from "../env.js";

let resend: Resend | null = null;

function getResend(): Resend | null {
  const key = env.resendApiKey();
  if (!key) return null;
  if (!resend) resend = new Resend(key);
  return resend;
}

export async function sendEmail(params: {
  to: string[];
  subject: string;
  html: string;
  idempotencyKey: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const client = getResend();
  if (!client) {
    return { ok: false, error: "RESEND_API_KEY is not configured" };
  }

  const uniqueTo = [...new Set(params.to.filter(Boolean))];
  if (uniqueTo.length === 0) {
    return { ok: false, error: "No recipients" };
  }

  const { data, error } = await client.emails.send(
    {
      from: env.resendFrom(),
      to: uniqueTo,
      subject: params.subject,
      html: params.html,
    },
    { idempotencyKey: params.idempotencyKey },
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, id: data?.id ?? "unknown" };
}
