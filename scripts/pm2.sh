#!/usr/bin/env bash
# Run the SSL Checker API with PM2 (build, migrate, start/restart).
#
# Usage:
#   ./scripts/pm2.sh start    # install, migrate, build, pm2 start
#   ./scripts/pm2.sh restart  # migrate, build, pm2 restart
#   ./scripts/pm2.sh stop
#   ./scripts/pm2.sh status
#   ./scripts/pm2.sh logs
#
# Requires: Node.js, npm, pm2 (`npm install -g pm2`), .env in server root.
# Database: ensure Postgres is up (e.g. `npm run docker:up`).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

APP_NAME="ssl-checker-api"
ECOSYSTEM="$ROOT/ecosystem.config.cjs"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: '$1' is not installed." >&2
    exit 1
  fi
}

ensure_env() {
  if [[ ! -f "$ROOT/.env" ]]; then
    echo "Error: missing $ROOT/.env (copy from .env.example)" >&2
    exit 1
  fi
}

prepare_build() {
  echo "==> Installing dependencies..."
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi

  echo "==> Prisma generate + migrate..."
  npx prisma generate
  npx prisma migrate deploy

  echo "==> Building TypeScript..."
  npm run build
}

cmd_start() {
  require_cmd node
  require_cmd npm
  require_cmd pm2
  ensure_env
  mkdir -p "$ROOT/logs"

  prepare_build

  if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    echo "==> App already registered — restarting..."
    pm2 restart "$ECOSYSTEM" --update-env
  else
    echo "==> Starting with PM2..."
    pm2 start "$ECOSYSTEM"
  fi

  pm2 save
  echo ""
  echo "API running. Useful commands:"
  echo "  pm2 status"
  echo "  pm2 logs $APP_NAME"
  echo "  ./scripts/pm2.sh stop"
}

cmd_restart() {
  require_cmd pm2
  ensure_env
  mkdir -p "$ROOT/logs"
  prepare_build

  if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    pm2 restart "$ECOSYSTEM" --update-env
  else
    pm2 start "$ECOSYSTEM"
  fi

  pm2 save
  echo "==> Restarted $APP_NAME"
}

cmd_stop() {
  require_cmd pm2
  if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    pm2 stop "$APP_NAME"
    pm2 delete "$APP_NAME"
    pm2 save
    echo "==> Stopped and removed $APP_NAME"
  else
    echo "==> $APP_NAME is not running in PM2"
  fi
}

cmd_status() {
  require_cmd pm2
  pm2 status "$APP_NAME" 2>/dev/null || pm2 status
}

cmd_logs() {
  require_cmd pm2
  pm2 logs "$APP_NAME" --lines 100
}

ACTION="${1:-start}"

case "$ACTION" in
  start) cmd_start ;;
  restart) cmd_restart ;;
  stop) cmd_stop ;;
  status) cmd_status ;;
  logs) cmd_logs ;;
  *)
    echo "Usage: $0 {start|restart|stop|status|logs}" >&2
    exit 1
    ;;
esac
