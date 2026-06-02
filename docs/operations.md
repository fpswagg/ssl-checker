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

## Production API (PM2 on VPS)

Run Postgres (Docker or managed), then start the API with PM2:

```bash
cd server
cp .env.example .env   # edit secrets
npm run docker:up      # optional: local Postgres on :5433

npm install -g pm2     # once
chmod +x scripts/pm2.sh
./scripts/pm2.sh start # install, migrate, build, pm2 start
```

Other commands:

```bash
./scripts/pm2.sh restart   # after git pull / code changes
./scripts/pm2.sh status
./scripts/pm2.sh logs
./scripts/pm2.sh stop
```

Or via npm: `npm run pm2:start`, `pm2:restart`, `pm2:stop`, `pm2:status`, `pm2:logs`.

Optional: persist PM2 across reboot — `pm2 startup` (run the command it prints), then `pm2 save`.

Config: [`../ecosystem.config.cjs`](../ecosystem.config.cjs). Logs: `server/logs/`.

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

## Automatic checks

The API includes a built-in scheduler. Every `AUTO_CHECK_POLL_SECONDS` seconds
(default `60`), it finds enabled URLs whose latest check is at least
`AUTO_CHECK_INTERVAL_HOURS` old (default `24`) and checks only those URLs.

Set `AUTO_CHECK_ENABLED=false` if you want to rely only on external cron.

## Optional external cron (on VPS or any host that can reach the API)

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
