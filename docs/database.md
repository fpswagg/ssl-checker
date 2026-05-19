# Database

## Purpose

Prisma models, relationships, and migration commands.

## Key files

- Schema: [`prisma/schema.prisma`](../prisma/schema.prisma)
- Migrations: [`prisma/migrations/`](../prisma/migrations/)
- Client usage: [`../src/lib/db.ts`](../src/lib/db.ts)

## Related docs

- [architecture.md](./architecture.md)
- [environment.md](./environment.md)

---

## Models

| Model | Role |
|-------|------|
| `NotificationEmail` | Alert recipient address |
| `MonitoredUrl` | Normalized hostname to check |
| `MonitoredUrlOnEmail` | Many-to-many URL ↔ email |
| `SslCheckResult` | Historical check row |
| `AlertDelivery` | Sent alert audit log |

`MonitoredUrl.url` is unique (normalized host only, e.g. `example.com`).

## Commands

```bash
npm run docker:up
npm run db:migrate          # dev: create/apply migration
npm run db:migrate:deploy   # production
npm run db:studio           # GUI
```

## History retention

After each check, rows older than the latest **90** per URL are deleted in the daily job.
