# Backup and Recovery

## What to back up

1. PostgreSQL data (`postgres_data` volume)
2. Redis data (`redis_data` volume)
3. Deployment env/secrets (`PROXY_ENCRYPTION_KEY`, `JWT_SECRET`)
4. Optional backend settings file persistence if mounted separately

Encrypt PostgreSQL and Redis volume snapshots and every exported backup. Proxy
IP addresses remain visible in PostgreSQL backups. Redis backups also contain
plaintext proxy credentials by default; PostgreSQL proxy credentials remain
encrypted by the application.

## Why secrets matter for recovery

Without original `PROXY_ENCRYPTION_KEY`, encrypted PostgreSQL proxy secrets and
any queue payloads created with `PROXY_QUEUE_ENCRYPT_CREDENTIALS=true` cannot be
decrypted after restore.

## Recovery checklist

1. Restore the matching PostgreSQL and Redis backups.
2. Restore exact secret values.
3. Start Redis, Postgres, backend, frontend.
4. Verify login and proxy visibility.
