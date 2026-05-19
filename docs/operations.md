# Operations

## Purpose

Run the API on a VPS, deploy the client elsewhere, and schedule checks.

## Key files

- Compose: [`../docker-compose.yml`](../docker-compose.yml)
- Dockerfile: [`../Dockerfile`](../Dockerfile)
- Entrypoint: [`../scripts/docker-entrypoint.sh`](../scripts/docker-entrypoint.sh)

## Related docs

- [environment.md](./environment.md)
- [architecture.md](./architecture.md)

---

## Local development

```bash
cd server
npm run docker:up      # Postgres on localhost:5433
npm run db:migrate
npm run dev            # API :3001

cd ../client
npm run dev            # UI :5173
```

## Production API (Docker)

```bash
cd server
cp .env.example .env
npm run docker:prod    # db + api
```

API listens on `3001`. Migrations run on container start.

## Production client (elsewhere)

```bash
cd client
echo 'VITE_API_URL=https://api.yourdomain.com' > .env
npm run build
# Deploy dist/ to Netlify, S3, Cloudflare Pages, etc.
```

Set `CORS_ORIGIN=https://your-dashboard-domain` on the API.

## Cron (on VPS or any host that can reach the API)

Daily check (example 06:00 UTC):

```cron
0 6 * * * curl -sf -X POST -H "Authorization: Bearer $CRON_SECRET" https://api.yourdomain.com/api/jobs/daily-check
```

Weekly report (Sunday 09:00 UTC):

```cron
0 9 * * 0 curl -sf -X POST -H "Authorization: Bearer $CRON_SECRET" https://api.yourdomain.com/api/jobs/weekly-report
```

## Manual check

Dashboard: **Run checks now**, or:

```bash
curl -X POST -H "Authorization: Bearer $JWT" https://api.yourdomain.com/api/checks/run
```

## Health

```bash
curl https://api.yourdomain.com/api/health
```

## RAM notes

- Run **only** the API container on the VPS; do not run the Vite dev server in production.
- Postgres: tune `shared_buffers` if needed; default Alpine image is fine for small lists.
