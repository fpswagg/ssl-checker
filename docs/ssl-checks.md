# SSL checks

## Purpose

How hosts are normalized, checked over TLS, and classified OK / WARNING / ERROR.

## Key files

- Check: [`../src/lib/ssl/check-certificate.ts`](../src/lib/ssl/check-certificate.ts)
- Status rules: [`../src/lib/ssl/status.ts`](../src/lib/ssl/status.ts)
- Normalize: [`../src/lib/ssl/normalize-url.ts`](../src/lib/ssl/normalize-url.ts)

## Related docs

- [email-alerts.md](./email-alerts.md)
- [environment.md](./environment.md)

---

## Normalization

Input `https://Example.com/path` → `example.com`. Invalid hostnames are rejected on create/update.

## TLS probe

- Port **443**, SNI = hostname, **10s** timeout
- Reads peer certificate; does not require full chain validation in v1 (warns on expiry/hostname)

## Status rules (`SSL_WARN_DAYS`, default 14)

| Status | Condition |
|--------|-----------|
| OK | Valid hostname match, expires in more than warn days |
| WARNING | Valid but within warn window |
| ERROR | Expired, no cert, TLS error, timeout, hostname mismatch |

## Alert transitions

Alerts fire only on **change**, not every day while still broken:

- **Failure**: `OK`→`WARNING`/`ERROR`, `WARNING`→`ERROR`, or first non-OK
- **Recovery**: any non-OK → `OK`

See [email-alerts.md](./email-alerts.md).
