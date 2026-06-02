# SSL Checker API

Standalone repository. Express API, Prisma/PostgreSQL, automatic SSL checks, Resend email, cron job endpoints.

The dashboard is a **separate git repository** — clone and deploy it independently; set `CORS_ORIGIN` to its URL.

## Setup

```bash
cp .env.example .env
npm run docker:up
npm run db:migrate
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | API on port 3001 |
| `npm run build` / `start` | Production build |
| `npm run db:migrate` | Apply migrations |
| `npm run docker:up` | Start Postgres only |
| `npm run docker:prod` | Postgres + API containers |
| `npm test` | Unit tests |

## Docs

[docs/README.md](docs/README.md)

## Password hash

```bash
node scripts/hash-password.mjs 'your-password'
```
