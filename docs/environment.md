# Environment variables

## Purpose

Every configuration variable for API and client builds.

## Key files

- API example: [`.env.example`](../.env.example)
- Dashboard: `VITE_API_URL` in the **client repo** `.env`
- Loader: [`../src/lib/env.ts`](../src/lib/env.ts)

## Related docs

- [operations.md](./operations.md)
- [email-alerts.md](./email-alerts.md)

---

## API (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `PORT` | no | API port (default `3001`) |
| `NODE_ENV` | no | `development` / `production` |
| `JWT_SECRET` | yes | Signs dashboard JWTs (32+ chars) |
| `DASHBOARD_PASSWORD` | dev | Plain password for local dev |
| `DASHBOARD_PASSWORD_HASH` | prod | bcrypt hash (use `node scripts/hash-password.mjs`) |
| `CORS_ORIGIN` | yes | Frontend origin, e.g. `https://app.example.com` |
| `FALLBACK_EMAIL` | yes | Always notified on alerts; weekly report only recipient |
| `RESEND_API_KEY` | for mail | Resend API key |
| `RESEND_FROM` | yes | Verified sender, e.g. `SSL Checker <alerts@domain.com>` |
| `CRON_SECRET` | yes | Bearer token for job endpoints |
| `SSL_WARN_DAYS` | no | Days before expiry → WARNING (default `14`) |

## Client (`client/.env` at build time)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Public API base URL baked into the static build |

Rebuild the client after changing `VITE_API_URL`.

## Generate password hash

```bash
cd server && node scripts/hash-password.mjs 'your-secure-password'
# Put output in DASHBOARD_PASSWORD_HASH; remove DASHBOARD_PASSWORD in production
```
