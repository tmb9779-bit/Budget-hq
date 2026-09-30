# Budget HQ Universal Data — Phase 2 (0.9.155)

Budget HQ can now use either its existing encrypted local vault or PostgreSQL-backed hosted storage through the same asynchronous store contract.

## Storage modes

- `BUDGET_HQ_STORE=local` (default): existing local AES-256-GCM vault. No behavior change.
- `BUDGET_HQ_STORE=hosted`: PostgreSQL storage. Each JSON record is AES-256-GCM encrypted by Budget HQ before it is sent to PostgreSQL.

Hosted mode requires two deployment secrets:

- `DATABASE_URL`: a PostgreSQL connection URL.
- `BUDGET_HQ_HOSTED_KEY`: exactly 32 random bytes encoded as 64 hexadecimal characters or base64. Keep this separate from the database and never commit it to Git.

`BUDGET_HQ_PG_SSL=0` may be used only for a trusted local PostgreSQL development server. Remote databases use TLS by default.

## Schema

The adapter creates `budget_hq_records` automatically. The database stores namespace, record name, ciphertext, and update time. It does not need the encryption key.

## Migration

Keep `BUDGET_HQ_STORE=local` while migrating from the old computer. Set `DATABASE_URL` and `BUDGET_HQ_HOSTED_KEY`, then run:

    npm run migrate:hosted

That is a dry run: it counts eligible local records and writes nothing remotely.

To copy and verify every record:

    npm run migrate:hosted -- --copy

The migration never deletes or modifies the local source. After verification, configure the hosted server with `BUDGET_HQ_STORE=hosted` and the same database URL/key.

## Important deployment note

The current Budget HQ server is a persistent Node HTTP process with hourly/30-second background timers. A static/serverless frontend deployment alone is not a replacement for that process. Host the Node server on persistent compute, then point browsers/PWA installs at that HTTPS service.
