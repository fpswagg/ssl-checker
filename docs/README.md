# Documentation index (API)

## Purpose

Backend and operations documentation for the SSL Checker API.

## Key files

- Source: [`../src/`](../src/)
- Schema: [`../prisma/schema.prisma`](../prisma/schema.prisma)

## When to read what

| Doc | Read when |
|-----|-----------|
| [architecture.md](./architecture.md) | API design, auth, jobs |
| [database.md](./database.md) | Models and migrations |
| [ssl-checks.md](./ssl-checks.md) | Check logic and statuses |
| [email-alerts.md](./email-alerts.md) | Resend and alert rules |
| [environment.md](./environment.md) | `.env` variables |
| [operations.md](./operations.md) | Docker, cron, deploy |

## Dashboard UI

The React dashboard lives in a **separate git repository**. It calls this API using `VITE_API_URL` and JWT auth.

## Related

- [../AGENTS.md](../AGENTS.md) — AI cheat sheet
