# Deployment

## Default Docker deployment

From repo root:

```bash
docker compose run --rm backend --migrate-only
docker compose up -d
```

Services:

- frontend: `:5050`
- backend: `127.0.0.1:5656`
- postgres: `:5434`
- redis: `:8946`

## Backend image/runtime notes

- Backend is built from the Go `1.27.2` codebase and runs as a distroless binary image.
- Frontend builds the Angular `21.1` app and serves the static build via nginx.

## Production configuration

Use the production overlay for migration and startup:

```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml run --rm backend --migrate-only
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d
```

The overlay runs `-production`, enforces strict secrets, disables public
registration and first-admin bootstrap, protects observability endpoints and
keeps application startup free of migrations. Set `OBSERVABILITY_TOKEN` for
remote monitoring clients and send it in `X-Observability-Token`. The backend
API binds to loopback by default; `BACKEND_BIND_ADDRESS` changes that binding.
The frontend stays on port 5050.

Update helpers recover the project name, working directory and file selection
from an existing backend, including a stopped container. This also covers
projects named only by an overlay. To keep the selection after `docker compose down`, set
`COMPOSE_FILE=docker-compose.yml:docker-compose.production.yml` in `.env`. Use
`;` as the separator on Windows and append custom overlays in the same order.
Persist a custom project name with `COMPOSE_PROJECT_NAME=magpie-production` too.
See [Updating](../getting-started/updating.md). `MAGPIE_ENV=production` in `.env`
also enables backend production defaults.

For a new production installation, restrict access to the frontend, enable
`ENABLE_PUBLIC_FIRST_ADMIN_BOOTSTRAP=true`, recreate the backend and register
the first account. Set it back to false and recreate the backend before opening
access. See [First login](../getting-started/first-login.md).

## Production recommendations

1. Set a strong, stable `PROXY_ENCRYPTION_KEY`. The installer generates `JWT_SECRET`; manual starts can leave it blank to use the persistent generated key. Multi-instance deployments must supply one shared JWT secret.
2. Optionally override `DB_USERNAME`, `DB_PASSWORD`, and `DB_NAME` (Compose provides defaults).
3. Set `DB_SSLMODE=require` (or `verify-ca`/`verify-full`) when using an external/production Postgres endpoint.
4. Use persistent volumes for Postgres and backend settings if needed.
5. Put reverse proxy/TLS in front of frontend and backend.
6. Restrict PostgreSQL and Redis to private networks. Require Redis authentication and restricted ACLs; use TLS for a remote Redis service.
7. Encrypt and regularly back up PostgreSQL and Redis. Redis queue payloads contain plaintext proxy credentials by default.

Default Compose includes CPU/memory limits and reservations per service. Tune them with `*_CPU_LIMIT`, `*_MEMORY_LIMIT`, `*_CPU_RESERVATION`, and `*_MEMORY_RESERVATION` env vars.

Before production rollout, run the load/soak gate documented in [Performance Validation](./performance-validation.md).

## Database migrations

Keep `DB_AUTO_MIGRATE=false` on production application instances. Before
starting a new backend image, stop all backend instances and run that image once
with `--migrate-only`.

```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml stop backend
docker compose -f docker-compose.yml -f docker-compose.production.yml run --rm backend --migrate-only
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d backend
```

Take coordinated PostgreSQL and Redis backups first. A failed migration leaves
the backend stopped so it cannot run against a partially migrated schema.

## Multi-instance considerations

Leader-based routines use Redis locks. If running multiple backend instances, ensure all instances share the same Redis and database.

Email delivery scales horizontally through the shared database outbox: every backend instance can claim and send queued messages, while only outbox maintenance remains leader-coordinated.

For rotating proxy listeners, set per-instance identity vars so instances are distinguishable in the UI and API:

- `MAGPIE_INSTANCE_ID`: stable unique id for the instance.
- `MAGPIE_INSTANCE_NAME`: display name for the instance.
- `MAGPIE_INSTANCE_REGION`: region label for the instance.

Optionally tune listener reconciliation:

- `ROTATING_PROXY_SYNC_INTERVAL_SECONDS` (default `10`).

## Data volume ownership and shutdown

The image provisions `/app/data` and `/home/nonroot/.cache/rod` for UID/GID
65532. Compose's one-shot `backend-volume-init` service repairs existing volume
ownership before startup. Bind-mounted data directories in custom deployments
must also be writable by 65532 and should use mode 0700.

On SIGTERM, the API drains first. The backend then stops producers, waits for
checker/scraper workers and rotating clients, and lets usage/statistics consumers
finish their final flush. After statistics and reputation writers stop, read
models refresh proxy filters, then drain all queued scrape-source statistics
batches before Redis closes. This keeps both proxy filters and source health
counters current after restart. The default API drain timeout is 20 seconds;
`BACKGROUND_SHUTDOWN_TIMEOUT_SECONDS` allows another 60 seconds.
Compose's `BACKEND_STOP_GRACE_PERIOD` defaults to 90 seconds. Keep it longer than
the sum of both timeouts when changing them. Redis stream entries still pending
at shutdown remain available for replay; a failed memory flush has no durable
recovery.

Run the container startup regression before releasing an image:

```bash
scripts/validate-container-startup.sh kuuchen/magpie-backend:YOUR_TAG
```

It creates disposable PostgreSQL, Redis and data/cache volumes. It checks fresh
volume production startup, repair of old root ownership, stable automatic JWT
keys and graceful container exit.
