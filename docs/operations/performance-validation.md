# Performance Validation

## Goal

Prove million-scale behavior with repeatable load and soak tests, not assumptions.

Validation should cover:

- latency SLOs (p95/p99)
- error rate under sustained load
- queue depth/backlog behavior
- DB row/size growth during soak
- dropped statistics budget

Run million-scale checker validation with
`PROXY_QUEUE_ENCRYPT_CREDENTIALS=false`, which is the throughput-oriented
default. If a deployment enables queue credential encryption, repeat the same
test matrix with it enabled and treat the resulting checker capacity as a
separate deployment profile.

## Go and dependency upgrades

The backend uses Go `1.27.1` in its module, CI, and Docker builder. Backend CI
runs tests, race tests, vet, build, a vulnerability scan, and the PostgreSQL
integration tests.

For compiler and dependency comparisons, run the plaintext queue decode,
Redis dequeue/requeue, and checker HTTP benchmarks documented in the
[distribution performance harness](https://github.com/Magpie-Tools/magpie/blob/main/scripts/perf/README.md).
Keep the Redis instance and PostgreSQL database isolated from running Magpie
installations. Compare allocations and time per operation with the same
settings on the same host, then run the sustained load and soak matrix below
before a production rollout.

The Redis client `9.22` changes its default read/write timeouts from `3s` to
`5s`, and retry backoff from `8ms`/`512ms` to `10ms`/`1s`. In single-instance
mode, explicit values in `REDIS_URL` continue to override those defaults.
Include stalled Redis and reconnect cases when validating upgrade latency.
TCP keep-alive now starts probing after `30s` of idle time, previously `5m`.

## Test matrix

Statistics replay protection and persisted reputation refresh require the
`proxy_statistic_events` and `proxy_reputation_refreshes` tables. Run the
backend's `--migrate-only` job before starting upgraded backends, and stop
previous checker instances during the upgrade so all workers use lease renewal
and fenced completion.
The updated queue marks leases in scheduling scores. Previous checker versions
cannot safely share the queue with new workers. Bulk requeue preserves active
checks; expired leases remain available for normal recovery. Imports retain a
route in its owned shard until its worker completes.
Old and current hashes for the same route also reconcile atomically when a
worker encounters the old alias. The worker merges workspace owners, consumes
the alias, and preserves an active current lease without starting another
check. No queue flush or additional database migration is required for this
reconciliation. Keep the encryption key stable and the shard count consistent
across instances.

Set `MAGPIE_TEST_POSTGRES_DSN` and `MAGPIE_TEST_REDIS_URL` to disposable services
when running the backend regression suites. They cover partial pending stream
recovery, duplicate usage accounting, rotator counts at 65,536 candidates,
usage writes with one million routes, uptime selection with unrelated history,
and source count coalescing.
Set `MAGPIE_TEST_QUEUE_REDIS_URL` to a separate empty disposable Redis database
to exercise queue races against real Redis. That fixture flushes its database.
These regressions include bulk requeue during an active check, imports from
legacy and other configured shards, and statistics cancellation followed by
replay of a 5,001-event batch. Unset `REDIS_URL` and `redisUrl` during full suites
so connection-failure fixtures can override their addresses.

Bulk proxy deletion has a separate PostgreSQL regression. From `magpie-backend`,
using an isolated test database:

```sh
MAGPIE_TEST_BULK_DELETE_ROUTES=70000 \
  go test ./internal/database -run '^TestBulkProxyDeletion' -count=1 -v -timeout=10m
```

Keep `MAGPIE_TEST_POSTGRES_DSN` set for this command. The fixture includes
41 overlapping sources, four checker rules, tagged overrides, and shared route
ownership. It checks that source health refreshes once, orphan lookups stay
within PostgreSQL's parameter limit, and counts remain correct after a later
batch fails. Measure endpoint completion under normal checker and scraper load
as well; this fixture measures database work and excludes Redis cleanup and
live checker-snapshot refresh. This correction requires no schema or
configuration change.

Alias migration regressions cover concurrent aliases, current claims and
imports during migration preparation, stale source leases, and expired current
leases with plaintext and encrypted compatibility payloads. The separate
`BenchmarkProxyQueueLegacyRekey` benchmark measures migration with eight
existing owners and one added owner. Compare its cost separately from ordinary
plaintext queue throughput.

On shutdown, statistics stream workers leave unacknowledged entries pending for
recovery. The ledger prevents committed entries from counting twice. Pending
entries from another consumer become recoverable after at least one minute idle.
The volatile in-memory fallback makes one final persistence attempt bounded by
the 30-second database timeout; a failed final attempt has no durable recovery.

Reputation workers drain persisted requests continuously. Watch
`magpie_proxy_reputation_refresh_pending` and
`magpie_proxy_reputation_refresh_oldest_age_seconds` during sustained tests.
Tune worker count and batch size against database load. The defaults do not
establish capacity for a tens-of-millions installation.

Source health counts update in a separate coalescing loop, every 30 seconds
for up to 100 source/workspace pairs by default. Large backlogs require more
time or an adjusted batch size. Proxy-list health keeps its own refresh loop.
Source notification work no longer recounts the pool after every route update;
the coalesced refresh still aggregates the affected source pool.

The statistics event ledger retains one identity per accepted stream event
after history expires. Include this table and its primary key index in storage
growth measurements. Preserve identities when pruning history so delayed
replays cannot increment counters again.

| Suite | Script | Default duration | Primary focus | Gate criteria |
| --- | --- | --- | --- | --- |
| Read-heavy | `scripts/perf/k6/read-path.js` | `30m` | proxy pages, filters, dashboard, GraphQL, proxy statistics reads | per-scenario thresholds in script (p95/p99 + error rate) |
| Write-heavy | `scripts/perf/k6/write-path.js` | `30m` | sustained `POST /api/addProxies` ingestion | per-scenario thresholds in script (p95/p99 + error rate) |
| Mixed soak | `scripts/perf/k6/mixed-soak.js` | `2h` (set to `24h`/`72h` for release proof) | long-running mixed reads + writes | per-scenario thresholds in script + growth/drop budgets below |
| Growth budget | `scripts/perf/assert-snapshot-delta.sh` | N/A | queue and DB growth across test window | queue/db deltas within configured limits |
| Drop budget | `scripts/perf/check-drop-budget.sh` | N/A | proxy statistics queue drop protection | `dropped_total` must be less than or equal to configured budget |

## Release gate procedure

Run from repo root:

```bash
cd scripts/perf
./run-gate.sh
```

For full soak proof:

```bash
cd scripts/perf
PERF_SOAK_DURATION=24h ./run-gate.sh
```

For extended soak:

```bash
cd scripts/perf
PERF_SOAK_DURATION=72h ./run-gate.sh
```

## Default growth/drop budgets

Configured in `scripts/perf/assert-snapshot-delta.sh` and `scripts/perf/check-drop-budget.sh`:

- `PERF_MAX_PROXY_QUEUE_DEPTH_DELTA=50000`
- `PERF_MAX_SCRAPESITE_QUEUE_DEPTH_DELTA=5000`
- `PERF_MAX_PROXY_STATISTICS_ROW_DELTA=25000000`
- `PERF_MAX_PROXY_STATISTICS_RESPONSE_ROWS_DELTA=250000`
- `PERF_MAX_PROXY_STATISTICS_BYTES_DELTA=16106127360`
- `PERF_MAX_DATABASE_BYTES_DELTA=21474836480`
- `PERF_PROXY_STAT_DROPS_BUDGET=0`

Tune these to your hardware/profile and enforce them in CI/CD.

## Inputs for auth

Provide one of:

- `MAGPIE_TOKEN`
- `MAGPIE_USER_EMAIL` and `MAGPIE_USER_PASSWORD`

If credentials are missing and `MAGPIE_REGISTER_IF_MISSING=true`, the k6 harness auto-registers a user for test execution.

## Running with local backend (no backend container)

You can run Postgres/Redis in Docker Compose and run backend from source (`go run`) for pre-push validation.

In that setup, pass backend logs to the drop-budget check:

```bash
# terminal 1
cd magpie-backend
go run ./cmd/magpie 2>&1 | tee /tmp/magpie-backend.log
```

```bash
# terminal 2
cd magpie/scripts/perf
PERF_BACKEND_LOG_FILE=/tmp/magpie-backend.log ./run-gate.sh
```

Drop-budget log source can be controlled with:

- `PERF_DROP_BUDGET_SOURCE=auto` (default)
- `PERF_DROP_BUDGET_SOURCE=compose`
- `PERF_DROP_BUDGET_SOURCE=file`
- `PERF_DROP_BUDGET_SOURCE=skip`
