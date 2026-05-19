# Email alerts

## Purpose

Resend integration, recipients, idempotency, and weekly report behavior.

## Key files

- Send: [`../src/lib/email/send.ts`](../src/lib/email/send.ts)
- Templates: [`../src/lib/email/templates.ts`](../src/lib/email/templates.ts)
- Job logic: [`../src/lib/jobs/run-checks.ts`](../src/lib/jobs/run-checks.ts)

## Related docs

- [environment.md](./environment.md)
- [operations.md](./operations.md)
- [ssl-checks.md](./ssl-checks.md)

---

## Resend

- Set `RESEND_API_KEY` and `RESEND_FROM` (verified domain).
- SDK returns `{ data, error }` — never assume throw on failure.
- Use **idempotency keys**: `ssl-alert/{urlId}/{date}/{kind}`, `ssl-weekly/{date}`.

## Recipients

| Event | To |
|-------|-----|
| Failure / recovery | All emails linked to the URL **plus** `FALLBACK_EMAIL` (deduped) |
| Weekly report | `FALLBACK_EMAIL` only |
| Manual report (dashboard) | `POST /api/reports/send` — fallback, selected emails, or both |

## Ops error digests (anti-spam)

Unhandled errors, HTTP 500s, check-run failures, and failed report sends are queued and emailed to **`FALLBACK_EMAIL`** as a digest.

| Control | Env | Default |
|---------|-----|---------|
| Same-error cooldown | `OPS_NOTIFY_COOLDOWN_MINUTES` | 30 |
| Max digests per hour | `OPS_NOTIFY_MAX_PER_HOUR` | 8 |
| Batch window | `OPS_NOTIFY_DIGEST_SECONDS` | 90 |
| Flush when queue reaches | `OPS_NOTIFY_DIGEST_MAX_BATCH` | 5 |

Similar errors share a fingerprint (category + normalized message) so repeated failures do not flood the inbox.

## Templates

HTML uses light Sawabo tokens (Bone background, Ink text) for readability in clients.

## Without API key

If `RESEND_API_KEY` is unset, checks still run and results are stored; sends return an error logged in the job response.
