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

## Templates

HTML uses light Sawabo tokens (Bone background, Ink text) for readability in clients.

## Without API key

If `RESEND_API_KEY` is unset, checks still run and results are stored; sends return an error logged in the job response.
