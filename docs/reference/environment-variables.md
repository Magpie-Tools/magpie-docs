---
description: Apply environment settings correctly and compare backend defaults, Compose overrides, units, and advanced worker controls.
---

# Environment variables

Environment variables configure the process or deployment. Workspace checker
rules and most operational settings live in the application database instead.
See [Configuration](./configuration.md) to choose the correct place to change
behavior.

## Apply a setting {/* #apply-a-setting */}

First identify who reads the variable:

| Consumer | Where to set it | How to apply it |
| --- | --- | --- |
| Backend running from source | Export it in that process's shell, or put it in the backend working-directory `.env`. | Restart the Go process. An existing process environment takes precedence over values loaded from `.env`. |
| Backend or frontend container | A Compose `environment` entry or explicitly selected `env_file`. | Recreate that container. `docker compose restart` keeps the old environment. |
| Compose itself | Installation `.env` or shell, referenced by the selected Compose files. | Run Compose with the same project/file selection. Some changes recreate services or select different volumes. |
| Installer/updater script | The script's documented environment inputs. | Set them when running the script. They are not backend settings. |

Compose's `.env` supplies **substitution values**. It does not automatically
export every entry into every container. Check `docker-compose.yml` before
assuming an advanced backend variable is forwarded.

For example, to reject authenticated requests when session revocation cannot be
checked, create `docker-compose.local.yml`:

```yaml
services:
  backend:
    environment:
      AUTH_REVOCATION_FAIL_OPEN: "false"
```

Include that overlay after the existing production files and recreate the
backend:

```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml \
  -f docker-compose.local.yml up -d --force-recreate backend
```

Keep any other custom overlays in their existing order. Persist the full file
list through `COMPOSE_FILE` if that is how you operate the installation.
`docker compose config --quiet` checks whether it resolves successfully.
The full `docker compose config` output can contain secrets, so do not paste it
into public issues.

Defaults below refer to the backend process unless a Compose override is stated.
Sizes are bytes; `1048576` is 1 MiB. Variables ending in `_MS`, `_SECONDS`,
`_MINUTES`, `_HOURS`, or `_DAYS` use that unit. Duration-string settings accept
values such as `500ms`, `30s`, and `5m`; where a numeric fallback is listed,
a valid duration string takes precedence.

## Core backend

- `PROXY_ENCRYPTION_KEY`: required key for encrypted PostgreSQL proxy usernames and passwords and keyed route fingerprints. It also protects Redis queue credentials when optional queue encryption is enabled. It does not encrypt proxy hosts.
- `JWT_SECRET`: optional signing key. Installers generate and save a unique key. When empty, the backend generates `/app/data/jwt_secret` with mode 0600 and reuses it across restarts. Set one shared explicit key for multiple instances. The old published Compose default is replaced automatically.
- `JWT_TTL_MINUTES` (default `10080`, allowed `15..10080`): access token lifetime.
- `LOG_LEVEL` (default `info`): backend logger level (`debug`, `info`, `warn`, `error`, `fatal`).
- `BACKEND_PORT` (default `5656`): API listen port.
- `backend-port`: legacy fallback env for API listen port.

## Runtime mode and strict validation

Production mode can be inferred from any of:

- `APP_ENV`
- `ENVIRONMENT`
- `GO_ENV`
- `MAGPIE_ENV`

Values `prod` or `production` are treated as production.

- `STRICT_SECRET_VALIDATION`: override strict startup validation for `JWT_SECRET` and `PROXY_ENCRYPTION_KEY`.
- `DEVELOPMENT_FIXTURES` (default `false`): local development mode that keeps the API, checker settings, and dashboard cache available while skipping autonomous jobs and rotating listeners. API-created rotators are saved without opening TCP or UDP listeners. Restart with fixture mode disabled to activate them. Use with the [repeatable test dataset](../getting-started/local-development.md#restore-development-test-data) to preserve synthetic results. Production mode rejects `true`.
- `MAGPIE_DEV_PASSWORD`: password used only by `go run ./cmd/seed-dev-data --reset` when it creates missing development accounts. Existing passwords remain unchanged. This variable is not needed by the backend server.

## API hardening

- `CORS_ALLOWED_ORIGINS` (default `http://localhost:5050,http://127.0.0.1:5050,http://localhost:4200,http://127.0.0.1:4200`): comma-separated browser origin allowlist. Include scheme and port, without a URL path. Use exact origins for the deployed application.
- `SERVER_READ_TIMEOUT_SECONDS` (default `30`)
- `SERVER_READ_HEADER_TIMEOUT_SECONDS` (default `10`)
- `SERVER_WRITE_TIMEOUT_SECONDS` (default `30`): normal API response write timeout. Proxy exports use the separate deadline below.
- `PROXY_EXPORT_TIMEOUT_SECONDS` (default `300`): total proxy export database and formatting time. The response write deadline adds 5 seconds so an error can be sent when no data has been written.
- `EXPORT_PROXY_READ_TIMEOUT_SECONDS` (default `310`, frontend container): nginx timeout between reads from the proxy export endpoint, including the initial response. Keep this at least 10 seconds above `PROXY_EXPORT_TIMEOUT_SECONDS`. Compose passes both export settings from `.env`; recreate backend and frontend containers after changing them. Configure any external reverse proxy accordingly.
- `SERVER_IDLE_TIMEOUT_SECONDS` (default `120`)
- `SERVER_SHUTDOWN_TIMEOUT_SECONDS` (default `20`): graceful API drain timeout.
- `BACKGROUND_SHUTDOWN_TIMEOUT_SECONDS` (default `60`): time to stop producers, finish usage/statistics writes, and drain filter/source read models after API drain.
- `BACKEND_STOP_GRACE_PERIOD` (Compose default `90s`): container grace period; keep it above the sum of the API and background timeouts.
- `BACKEND_BIND_ADDRESS` (Compose default `127.0.0.1`): host address for the API port binding.
- `API_UPLOAD_MAX_BODY_BYTES` (default `10485760`, 10 MiB): max request size for multipart upload endpoints.
- `API_JSON_MAX_BODY_BYTES` (default `1048576`, 1 MiB): max request size for JSON endpoints.
- `API_MULTIPART_MEMORY_BYTES` (default `1048576`, 1 MiB): in-memory budget used by multipart parsing before temp-file spillover.
- `SECURITY_HEADERS_ENABLED` (default `true`): enables base response security headers.

## Trusted proxy and outbound safety

- `TRUSTED_PROXY_CIDRS`: comma-separated trusted reverse-proxy CIDRs used for `X-Forwarded-For` / `X-Real-IP` parsing.
- `ALLOW_PRIVATE_NETWORK_EGRESS` (default `false`): allows outbound HTTP targets in private/loopback/reserved ranges (disabled by default for safety).

## Auth and registration controls

- `DISABLE_PUBLIC_REGISTRATION`: disable public `/api/register`.
- `ENABLE_PUBLIC_FIRST_ADMIN_BOOTSTRAP`: allow first-admin creation through public registration.
- `ALLOW_INSECURE_REGISTRATION_DEFAULTS` (base Compose default `true`): enables public registration and first-admin bootstrap for local setup. Production mode ignores this helper, and the production overlay sets it to false. Explicit registration/bootstrap overrides still apply.
- `AUTH_REVOCATION_FAIL_OPEN` (default `true`): when Redis revocation store is unavailable, allow already-signed/non-expired JWTs.

Auth route rate limiting:

- `AUTH_REQUEST_RATE_LIMIT_WINDOW_SECONDS` (default `60`)
- `AUTH_LOGIN_RATE_LIMIT_PER_WINDOW` (default `60`)
- `AUTH_REGISTER_RATE_LIMIT_PER_WINDOW` (default `20`)
- `AUTH_FORGOT_PASSWORD_RATE_LIMIT_PER_WINDOW` (default `10`)
- `AUTH_RESET_PASSWORD_RATE_LIMIT_PER_WINDOW` (default `20`)
- `AUTH_FORGOT_PASSWORD_LIMIT_PER_EMAIL` (default `1`)
- `AUTH_RESET_PASSWORD_LIMIT_PER_EMAIL` (default `5`)
- `AUTH_LOGIN_FAILURE_WINDOW_SECONDS` (default `900`)
- `AUTH_LOGIN_FAILURE_LIMIT_PER_IP` (default `30`)
- `AUTH_LOGIN_FAILURE_LIMIT_PER_EMAIL` (default `10`)
- `AUTH_RATE_LIMIT_LOCAL_FALLBACK_MAX_KEYS` (default `10000`)

## Outbound email, password recovery, and invitations

Mail configuration:

- `MAIL_FROM_ADDRESS`: sender address used for outbound auth/recovery and workspace-invitation mail.
- `MAIL_FROM_NAME`: optional sender display name.
- `EMAIL_BRAND_IMAGE_URL`: optional public absolute `https://` image URL shown at the top of branded auth/recovery and invitation emails.
- `SMTP_HOST`: SMTP server hostname.
- `SMTP_PORT` (default `587`): SMTP submission port. Port `587` requires successful `STARTTLS`; port `465` uses implicit TLS.
- `SMTP_USERNAME`: optional SMTP auth username. Set together with `SMTP_PASSWORD`.
- `SMTP_PASSWORD`: optional SMTP auth password. Set together with `SMTP_USERNAME`.
- `PUBLIC_APP_URL`: required when email delivery is enabled. Used to build password-reset links and the fixed `/invitations` inbox link; request headers are never used as the public base URL.

Password reset behavior:

- `PASSWORD_RESET_TOKEN_TTL_MINUTES` (default `30`)
- `PASSWORD_RESET_CLEANUP_INTERVAL`: duration string for expired-token cleanup, default `1h`
- `PASSWORD_RESET_CLEANUP_INTERVAL_MINUTES` (default `60`): integer fallback for expired-token cleanup

Workspace invitation behavior:

- `WORKSPACE_INVITATION_TTL_HOURS` (default `168`, allowed `1..720`): lifetime of a new invitation in whole hours. Editing an invitation never renews this expiry.

SMTP is optional for invitations. When mail is not configured, pending invitations are still created and remain visible in the in-app inbox.

Durable email outbox worker:

- `EMAIL_OUTBOX_POLL_INTERVAL` (default `5s`): duration string poll interval
- `EMAIL_OUTBOX_POLL_INTERVAL_SECONDS` (default `5`): integer fallback poll interval
- `EMAIL_OUTBOX_BATCH_SIZE` (default `10`)
- `EMAIL_PROCESSING_TIMEOUT` (default `15m`): duration string for stale in-flight email recovery
- `EMAIL_PROCESSING_TIMEOUT_SECONDS` (default `900`): integer fallback processing timeout
- `EMAIL_OUTBOX_RETENTION_HOURS` (default `24`): retain sent rows from `sent_at` and abandoned rows from their last status update.
- `EMAIL_RETRY_BASE_SECONDS` (default `5`): exponential backoff base for email retries
- `EMAIL_MAX_ATTEMPTS` (default `4`): max delivery attempts before abandoning an outbox row

In multi-instance deployments, all backend instances can poll and deliver from the shared outbox concurrently. Stale-message recovery and sent-row cleanup remain leader-coordinated.

## Observability and health

- `ALLOW_PUBLIC_OBSERVABILITY_ENDPOINTS` (default non-production `true`, production `false`): controls public access to `/healthz`, `/readyz`, `/metrics`.
- `OBSERVABILITY_TOKEN`: token accepted via `X-Observability-Token` when public observability access is disabled.
- `READYZ_ALLOW_REDIS_DEGRADED` (default `false`): allows `readyz` to return degraded-ready status when Redis is unavailable.

## GraphQL guards

- `GRAPHQL_MAX_DEPTH` (default `12`)
- `GRAPHQL_MAX_FIELDS` (default `250`)
- `GRAPHQL_MAX_QUERY_BYTES` (default `16384`)
- `GRAPHQL_ALLOW_INTROSPECTION` (default `false`)

## Redis

- `REDIS_MODE` (default `single`): `single` or `sentinel`.
- `REDIS_URL` (default `redis://localhost:8946`): Redis URL for single mode.
- `redisUrl`: legacy `REDIS_URL` fallback.
- `REDIS_PASSWORD`: optional Redis password.
- `REDIS_CONNECT_RETRY_BACKOFF_MS` (default `5000`): reconnect defer/backoff duration.
- `PROXY_QUEUE_ENCRYPT_CREDENTIALS` (default `false`): encrypt proxy credentials in Redis queue payloads. The default keeps the million-scale checker hot path free of per-check encryption and decryption. Enabling it reduces credential exposure to Redis readers but costs checker throughput.

In default Docker Compose single-mode deployment, the backend points to
`redis://redis:6379`. A Go process on the host instead uses the published port.
If both URL names are set, `REDIS_URL` takes precedence over `redisUrl`.

For an existing Sentinel deployment:

| Variable | Meaning |
| --- | --- |
| `REDIS_MASTER_NAME` | Logical master name monitored by Sentinel. |
| `REDIS_SENTINEL_ADDRS` | Comma-separated Sentinel `host:port` addresses reachable from the backend. |
| `REDIS_SENTINEL_PASSWORD` | Authentication for the Sentinel servers. `REDIS_PASSWORD` is for the Redis data service. |

`REDIS_MODE=sentinel` selects the backend client mode. The base Compose stack
does not create Sentinel servers or replicas; provide that infrastructure and
its connection settings separately.

## Database

| Variable | Backend default | Bundled Compose behavior |
| --- | --- | --- |
| `DB_HOST` | `localhost` | Fixed to service name `postgres`. An external DB requires an overlay changing this entry. |
| `DB_PORT` | `5434` | Fixed to internal port `5432`; host publication is `127.0.0.1:5434`. |
| `DB_NAME` | `magpie` | Also initializes the PostgreSQL database. |
| `DB_USERNAME` | `magpie_user` | Also initializes the PostgreSQL role. |
| `DB_PASSWORD` | Empty | Falls back to `ChangeMeToAStrongDbPassword`. Replace before first initialization. |
| `DB_SSLMODE` | `require` | Defaults to `disable` for the bundled private PostgreSQL connection. |
| `DB_AUTO_MIGRATE` | Local `true`, production `false` | Explicitly `false` in the base stack and production overlay. |
| `DB_MAX_OPEN_CONNS` | `32` | Per-backend connection pool ceiling. |
| `DB_MAX_IDLE_CONNS` | Value of `DB_MAX_OPEN_CONNS` | Per-backend idle connection ceiling. |
| `DB_CONN_MAX_LIFETIME` | `300` seconds | Maximum connection lifetime. |
| `DB_CONN_MAX_IDLE_TIME` | `60` seconds | Maximum idle lifetime. |

Changing initialization credentials in `.env` does not alter a role already
stored in `postgres_data`. Change the database role and its clients together.
Do not delete a populated volume to apply a password change.

Accepted TLS modes include `disable`, `allow`, `prefer`, `require`, `verify-ca`,
and `verify-full`. For remote databases, choose certificate verification and
trust configuration appropriate to your service. See [Security](../operations/security.md).

With automatic migration disabled, run the selected backend image once with
`--migrate-only` before starting the application. For an existing installation,
stop all backend writers first and follow [Updating](../getting-started/updating.md).

## Rotating proxy listeners

- `ROTATING_PROXY_PORT_START` (default `20000`)
- `ROTATING_PROXY_PORT_END` (default `20100`)
- `ROTATING_PROXY_SYNC_INTERVAL_SECONDS` (default `10`): interval used by each backend instance to reconcile local rotating listeners.
- `ROTATING_PROXY_UPSTREAM_TIMEOUT_MS` (default `30000`): upstream connection/request timeout.
- `ROTATING_PROXY_HANDSHAKE_TIMEOUT_MS` (default `15000`): client handshake timeout.
- `ROTATING_PROXY_MAX_REQUEST_BODY_BYTES` (default `10485760`, 10 MiB): listener HTTP request body limit.
- `ROTATING_PROXY_SOCKS_MAX_CONCURRENT_CONNECTIONS` (default `512`): concurrent SOCKS connections per listener.
- `ROTATING_PROXY_MAX_CONCURRENT_TUNNELS` (default `1024`): CONNECT/SOCKS clients per listener, including handshakes. The SOCKS worker limit also applies.

Multi-instance identity:

- `MAGPIE_INSTANCE_ID` (default hostname): stable identifier for backend instance ownership.
- `MAGPIE_INSTANCE_ID_FILE`: optional file path fallback source for instance id.
- `MAGPIE_INSTANCE_NAME` (default `MAGPIE_INSTANCE_ID`): human-readable instance label.
- `MAGPIE_INSTANCE_REGION` (default `Unknown`): region label.
- `MAGPIE_INSTANCE_SCOPE`: optional scope label.

Optional HTTP/3 TLS files for rotating listeners:

- `ROTATING_PROXY_HTTP3_TLS_CERT_FILE`
- `ROTATING_PROXY_HTTP3_TLS_KEY_FILE`

Each TLS handshake reloads changed valid files. Invalid or mismatched replacements
preserve the last valid certificate.

## Queue and startup toggles

| Variable | Default | Meaning |
| --- | --- | --- |
| `PROXY_QUEUE_SHARDS` | `16`, maximum `128` | Proxy scheduling shards. Keep consistent across replicas. |
| `SCRAPE_QUEUE_SHARDS` | `8`, maximum `64` | Scrape scheduling shards. Keep consistent across replicas. |
| `STARTUP_QUEUE_BOOTSTRAP_ASYNC` | `true` | Rebuild queues in the background while readiness remains unavailable until bootstrap completes. |

Changing a shard count is an operational change, not a free throughput multiplier.
Current readers can encounter older supported shard layouts; measure recovery
and backlog behavior and retain the original encryption key.

Queue marker checks run every ten seconds. Missing state triggers PostgreSQL
reconstruction; readiness is HTTP 503 after detection until completion.

- `PROXY_ORPHAN_CLEAN_INTERVAL` / `PROXY_ORPHAN_CLEAN_INTERVAL_MINUTES` (default `60` minutes): delay after completed cleanup passes.
- `PROXY_ORPHAN_CLEAN_MAX_RUN_DURATION` (default `45s`): pass budget; drain batches of 5,000 distinct route IDs per table.
- `PROXY_ORPHAN_CLEAN_RETRY_INTERVAL` (default `1m`): delay after failed or interrupted passes, capped at the normal interval. Committed deletions are retained.

## Proxy statistics and timeline maintenance

Read [Results and storage](../backend/results-and-storage.md) before changing
persistence or retention. History retention, replay identity retention, and
current-health projections serve different purposes.

### Ingestion and stream backpressure

| Variable | Default | Meaning |
| --- | --- | --- |
| `PROXY_STATISTICS_INGEST_WORKERS` | `4` | Per-instance persistence workers, clamped to 1 through 32. |
| `PROXY_STATISTICS_REDIS_STREAM_ENABLED` | `true` | Durable Redis stream path; disabling uses a volatile memory fallback. |
| `PROXY_STATISTICS_REDIS_STREAM_KEY` | `magpie:proxy_statistics:stream` | Shared stream key. |
| `PROXY_STATISTICS_REDIS_STREAM_GROUP` | `magpie:proxy_statistics:consumers` | Shared consumer group. |
| `PROXY_STATISTICS_REDIS_STREAM_MAXLEN` | `1000000` | Stream admission capacity. |
| `PROXY_STATISTICS_REDIS_STREAM_OVERLOAD_POLICY` | `block` | Backpressure policy when capacity is exhausted. See the persistence chapter for supported policies. |
| `PROXY_STATISTICS_TENANT_OVERLOAD_POLICIES` | Empty | Per-workspace overrides under the legacy variable name. |
| `PROXY_STATISTICS_PRODUCER_BLOCK_TIMEOUT_MS` | `500` | Producer blocking budget. |

Keep stream identity settings consistent across instances. Disabling durability
changes what can be recovered after a process failure; it is not merely a worker
tuning option.

### Statistics history retention

| Variable | Default | Meaning |
| --- | --- | --- |
| `PROXY_STATISTICS_RETENTION_DAYS` | `30` | Retained check history. |
| `PROXY_STATISTICS_RESPONSE_RETENTION_DAYS` | `7` | Retained response bodies. |
| `PROXY_STATISTICS_RETENTION_INTERVAL` | `5m` | Duration-string pass interval. |
| `PROXY_STATISTICS_RETENTION_INTERVAL_MINUTES` | `5` | Numeric fallback interval. |
| `PROXY_STATISTICS_RETENTION_BATCH_SIZE` | `50000` | Rows per deletion batch. |
| `PROXY_STATISTICS_RETENTION_MAX_BATCHES` | `240` | Batch ceiling per pass. |
| `PROXY_STATISTICS_RETENTION_WORKERS` | `4` | Retention worker count. |
| `PROXY_STATISTICS_RETENTION_MAX_RUN_DURATION` | `4m` | Pass time budget. |
| `PROXY_STATISTICS_RETENTION_DROP_PARTITIONS` | `true` | Drop fully expired history partitions when possible. |
| `PROXY_STATISTICS_RETENTION_MAX_PARTITION_DROPS` | `2` | Partition-drop ceiling per pass. |
| `PROXY_STATISTICS_AUTO_PARTITION_MIGRATION` | `true` | Permit automatic conversion of the existing history table during schema migration. |
| `PROXY_STATISTICS_PARTITION_PRECREATE_MONTHS` | `2` | Future months prepared for history partitions. |
| `PROXY_STATISTICS_PARTITION_PAST_MONTHS` | Retention days / 30 + 1, minimum `2` | Past partition range prepared by migration/maintenance. |
| `PROXY_DAILY_CHECK_RETENTION_DAYS` | `30`, minimum `8` | Compact older UTC daily counters into lifetime totals. All-time dashboard counts survive. |
| `PROXY_STATISTICS_LEDGER_RETENTION_BATCH_SIZE` | `50000` | Replay identities retired per DB batch after durable stream progress. |
| `PROXY_STATISTICS_LEDGER_RETENTION_MAX_BATCHES` | `240` | Ledger batches per pass, run each minute with a 45-second budget. |

### Reputation and source summaries

Reputation refresh uses a durable PostgreSQL queue shared across backend
instances. These settings apply per instance:

| Variable | Default | Meaning |
| --- | ---: | --- |
| `PROXY_REPUTATION_REFRESH_WORKERS` | `4` | Concurrent refresh workers, clamped to 1 through 32. |
| `PROXY_REPUTATION_REFRESH_BATCH_SIZE` | `1000` | Routes claimed per worker batch, clamped to 1 through 5000. |
| `PROXY_REPUTATION_REFRESH_INTERVAL_SECONDS` | `1` | Idle or error retry delay. Workers continue immediately while work remains. |
| `SCRAPE_SOURCE_STATS_REFRESH_INTERVAL_SECONDS` | `30` | Interval for coalesced source health counts. Proxy-list projection keeps its own refresh interval. |
| `SCRAPE_SOURCE_STATS_REFRESH_BATCH_SIZE` | `100` | Source/workspace pairs refreshed per interval, clamped to 1 through 1000. |

Monitor `magpie_proxy_reputation_refresh_pending` and
`magpie_proxy_reputation_refresh_oldest_age_seconds` to check whether refresh
workers keep up with ingestion. These gauges describe the shared database
backlog. Do not sum them across backend instances.

Statistics stream replays use the stream key and message ID as a durable event
identity. Run `--migrate-only` before starting updated backends to create
`proxy_statistic_events` and `proxy_reputation_refreshes`. Event identities
survive history retention and require storage capacity separate from retained
history. The in-memory fallback has no durable stream identity.

### Timeline retention

| Variable | Default | Meaning |
| --- | --- | --- |
| `PROXY_HISTORY_RETENTION_DAYS` | `90` | Proxy timeline history lifetime. |
| `PROXY_SNAPSHOT_RETENTION_DAYS` | `30` | Proxy snapshot lifetime. |
| `PROXY_TIMELINE_RETENTION_INTERVAL` | `10m` | Duration-string pass interval. |
| `PROXY_TIMELINE_RETENTION_INTERVAL_MINUTES` | `10` | Numeric fallback interval. |
| `PROXY_TIMELINE_RETENTION_BATCH_SIZE` | `50000` | Rows per batch. |
| `PROXY_TIMELINE_RETENTION_MAX_BATCHES` | `120` | Batches per pass. |
| `PROXY_TIMELINE_RETENTION_MAX_RUN_DURATION` | `90s` | Pass time budget. |

Orphan cleanup has separate controls in [Queue and startup toggles](#queue-and-startup-toggles).

## Worker/tuning envs

- `SCRAPER_PAGE_POOL_MIN_CAPACITY`: obsolete; browser pages are created on demand.
- `SCRAPER_PAGE_POOL_MAX_CAPACITY`: concurrent browser scrapes per instance, default `4`, clamped to 1 through 64. HTTP fetching does not consume browser capacity. Read at first browser use; restart to change it.
- `SCRAPER_POST_PROCESS_QUEUE_CAPACITY`: queued HTML jobs, default `16`, clamped to 1 through 4096.
- `SCRAPER_POST_PROCESS_WORKERS` (default `8`, maximum `64`): concurrent HTML post-processing workers.
- `SCRAPER_CAPTURED_MAX_RESPONSE_BODY_BYTES`: maximum returned rendered HTML, default 8 MiB. This does not bound Chromium process memory.
- `SCRAPER_FALLBACK_MAX_RESPONSE_BODY_BYTES`: maximum HTTP response body, default 8 MiB. The variable name is retained for compatibility.
- `CHECKER_DEFAULT_REQUEST_TIMEOUT_MS` (default `10000`): fallback request timeout; workspace checker settings select the effective check timeout.
- `CHECKER_MAX_RESPONSE_BODY_BYTES` (default `1048576`, 1 MiB): maximum judge response body read by a check.

## Releases endpoint

- `GITHUB_TOKEN`: optional token for higher GitHub API quota on `/api/releases`.

## Docker Compose resources

These variables are read by Compose, not by the backend. Limits bound each
container. Reservations describe its requested resources; how they are enforced
depends on the container runtime and scheduler.

| Service prefix | CPU limit | Memory limit | CPU reservation | Memory reservation |
| --- | --- | --- | --- | --- |
| `BACKEND` | `2.00` | `1G` | `0.50` | `256M` |
| `FRONTEND` | `1.00` | `512M` | `0.25` | `128M` |
| `POSTGRES` | `1.50` | `1G` | `0.50` | `256M` |
| `REDIS` | `1.00` | `512M` | `0.25` | `128M` |

Append `_CPU_LIMIT`, `_MEMORY_LIMIT`, `_CPU_RESERVATION`, or
`_MEMORY_RESERVATION` to the prefix. For example, `BACKEND_MEMORY_LIMIT=2G`.
Larger limits do not automatically increase checker or scraper worker counts.

`DOCKER_LOG_MAX_SIZE` defaults to `100m` and `DOCKER_LOG_MAX_FILE` to `3` for
the bundled rotating JSON logs. Retain enough history for your troubleshooting
and performance-validation window.

## Component images and versions

| Variable | Default | Meaning |
| --- | --- | --- |
| `MAGPIE_BACKEND_IMAGE` | `kuuchen/magpie-backend` | Backend image repository. |
| `MAGPIE_FRONTEND_IMAGE` | `kuuchen/magpie-frontend` | Frontend image repository. |
| `MAGPIE_BACKEND_TAG` | Shared tag fallback | Backend component version. |
| `MAGPIE_FRONTEND_TAG` | Shared tag fallback | Frontend component version. |
| `MAGPIE_IMAGE_TAG` | `latest` | Compatibility fallback when a component tag is unset. |

Keep component versions compatible. Record exact deployed tags or digests for
recovery instead of relying on a moving `latest` tag.

## Installer/updater script envs

These are script inputs. See [Installation](../getting-started/installation.md)
and [Updating](../getting-started/updating.md) for the normal workflows.

| Variable | Purpose |
| --- | --- |
| `MAGPIE_INSTALL_DIR` | Installation directory selected by the helper. |
| `MAGPIE_IMAGE_TAG` | Shared image tag when separate component tags are not set. |
| `MAGPIE_BACKEND_TAG`, `MAGPIE_FRONTEND_TAG` | Component-specific tag overrides. |
| `MAGPIE_REPO_OWNER`, `MAGPIE_REPO_NAME`, `MAGPIE_REPO_REF` | Distribution source used by script downloads, normally `Magpie-Tools`, `magpie`, `master`. |
| `MAGPIE_COMPOSE_URL` | Override the downloaded base Compose file URL. |
| `MAGPIE_PRODUCTION_COMPOSE_URL` | Override the downloaded production overlay URL. |
| `MAGPIE_ENV_EXAMPLE_URL` | Override the downloaded example environment URL. |
| `MAGPIE_FORCE` | Installer replacement override. `1` deletes an existing installation directory before installing. |

Use the update helper for an existing installation. `MAGPIE_FORCE=1` is a
replacement operation that can remove installation configuration and files;
it is not the routine way to resolve an update problem.
