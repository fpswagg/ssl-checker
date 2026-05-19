# AGENTS.md — SSL Checker API

Standalone Express API for SSL monitoring.

## Stack

Express, Prisma, PostgreSQL, Resend, JWT auth.

## Layout

```
src/           Application code
prisma/        Schema and migrations
docs/          Backend documentation
scripts/       Docker entrypoint, password hash helper
```

## Invariants

1. Normalize URLs to hostname only.
2. Alerts on status transition only.
3. Weekly report → `FALLBACK_EMAIL` only.
4. Resend: check `{ data, error }`; use idempotency keys.
5. Cron jobs: `Authorization: Bearer ${CRON_SECRET}`.

## Commands

```bash
npm install
cp .env.example .env
npm run docker:up && npm run db:migrate
npm run dev
```

## Docs

[docs/README.md](docs/README.md)

## Related repo

Dashboard UI is a **separate repository** (`ssl-checker-client` or similar). Configure `CORS_ORIGIN` to its URL.
