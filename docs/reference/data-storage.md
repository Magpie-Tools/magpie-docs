# Data Storage

## PostgreSQL

Primary persistent store for:

- users and roles
- proxies and stats
- proxy reputation snapshots
- user-owned proxy tags and their proxy-access assignments
- scrape sources and relations
- rotating proxies

Default Docker setup persists Postgres data via named volume `postgres_data`.

Proxy routes can be shared, while tag catalogs and assignments are scoped to a user and their `user_proxies` access record. Tags are not copied into Redis queue payloads and do not add work to the steady-state checker loop.

## Redis

Used for:

- queue/sync behavior across routines
- runtime distribution features
- leadership lock coordination

Proxy queue credentials are plaintext by default to keep the checker hot path
fast. Treat Redis as trusted infrastructure and protect its network access,
storage, and backups. Optional application-level encryption is controlled by
`PROXY_QUEUE_ENCRYPT_CREDENTIALS`.

## File-based settings

Global settings are read/written at `data/settings.json` in local backend runs.

In containerized runs, persist this path with a volume if you require file-level durability beyond the container lifecycle.
