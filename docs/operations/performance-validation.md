---
description: Prepare an isolated workload, run the performance gate, interpret latency and growth budgets, and retain reproducible release evidence.
---

# Performance validation

Magpie's capacity depends on active route count, check intervals, shared
workspace ownership, response sizes, and storage throughput. A small successful
installation does not establish how it behaves with millions of routes.
Use this guide when releasing a backend change or sizing a deployment.

## Goal

Measure API latency, errors, checker/scraper backlog, database growth, and
statistics drops under a representative sustained workload. Choose the
acceptable latency and growth budgets before the run.

| Check | What it can establish | What it leaves open |
| --- | --- | --- |
| Unit and integration regressions | Correctness and bounded operation counts for controlled fixtures. | Full-system throughput and long-running resource growth. |
| Component benchmarks | Cost per queue cycle, decode, or checker request on the measured host. | Production networking, shared-tenant persistence, and outage behavior. |
| Smoke gate | The load scripts, authentication, snapshots, and log collection work. | Production capacity and durability. |
| Release gate | Sustained behavior for the recorded dataset, hardware, and test duration. | Different workloads and longer unmeasured periods. |

Retained local rehearsal fixtures sign in once when the backend becomes ready
and keep the new token in private fixture state. A week-old fixture can contain
an expired token even when its signing key is intact. Login and protected API
failures must still fail validation; do not suppress a 401 or extend token
lifetimes to make a run pass. Recovery must accept the token held before backup
and reject the separately revoked token after restoration. Observer errors and
failed preparation runs remain failures, with no sustained-load credit.

The [backend walkthrough](../backend/index.md) explains which components these
measurements cover. [Testing](../contributing/testing.md) lists the correctness
checks to run before expensive load validation.

## Prepare an isolated target

Use a dedicated Magpie installation, PostgreSQL database, and Redis service.
The harness imports data and changes storage volume; queue regression fixtures
can flush their configured database. Do not point them at a live installation.

1. Migrate and start the target at the proposed component versions.
2. Seed the intended number of active routes, sources, workspaces, and shared
   ownership. Use reachable controlled judges and representative proxy behavior.
3. Set the checker/scraper concurrency and intervals you intend to deploy.
4. Install `k6` and Docker with Compose support on the load runner.
5. Supply a dedicated test account/token and a backend log source for the whole
   run. An empty log file does not satisfy the drop check.
6. Record hardware, container limits, component/dependency versions, shard counts,
   retention settings, and dataset size before starting.

Run the default capacity profile with `PROXY_QUEUE_ENCRYPT_CREDENTIALS=false`.
If the deployment opts into queue encryption, repeat the same matrix with it
enabled and report its measured capacity separately.

From the `magpie` repository root, prepare the API target and token:

```bash
export MAGPIE_BASE_URL=http://127.0.0.1:5656
export MAGPIE_REGISTER_IF_MISSING=false
read -rs -p 'Dedicated test account bearer token: ' MAGPIE_TOKEN
export MAGPIE_TOKEN
```

The harness uses this account's default workspace. Confirm it is the workspace
whose dataset you prepared. To target an installer-created stack in another
directory, also set the distribution harness inputs:

```bash
export MAGPIE_COMPOSE_FILE=/absolute/path/to/installation/docker-compose.yml
export MAGPIE_ENV_FILE=/absolute/path/to/installation/.env
```

See the [distribution harness README](https://github.com/Magpie-Tools/magpie/blob/master/scripts/perf/README.md)
for suite-specific rates, virtual users, and fixture controls.

## Go and dependency upgrades

Use the Go version declared in `magpie-backend/go.mod` and run the full backend
checks described in [Testing](../contributing/testing.md). For before/after
comparisons, run the plaintext queue decode, Redis dequeue/requeue, checker HTTP,
and client-cache churn benchmarks from the harness README.

The HTML scraper uses golang.org/x/net v0.62.0 to address
[GO-2026-6860](https://pkg.go.dev/vuln/GO-2026-6860), a reachable HTML-parser
allocation vulnerability. Its module graph also upgrades x/crypto, x/sys,
x/text and x/sync. Retain the dependency scan and full normal/race, vet and
build results for this exact graph, then repeat recovery, smoke and the entire
load gate. Results from the preceding graph cannot qualify the upgrade.

Use the same host, toolchain settings, dataset, and dependency configuration.
Record allocations, time per operation, and throughput. For checker/queue
changes, count added cryptographic operations, JSON encodes, Redis commands,
and database queries per check. Current plaintext payloads must reuse the
stored route hash, and normal requeues must leave the payload untouched.

Include stalled dependencies and reconnects in comparisons. For example, the
Redis client 9.22 defaults changed read/write timeouts from 3 to 5 seconds,
retry backoff from 8ms/512ms to 10ms/1s, and idle TCP keep-alive probing from
five minutes to 30 seconds. Explicit single-mode `REDIS_URL` values still
override the client defaults. A normal-path benchmark does not expose those
outage latencies.

Include cold dashboard reads when validating demand-based caching. Successful
cache hits have a 30-second maximum age, and the timer keeps only components
requested within the last two minutes warm. A restart clears this process-local
demand. Record the first synchronous load separately, then measure the actual
requested-component background refresh alongside checker and persisted
projection progress for every fixture workspace. An info-only REST read must
not warm recent-check or fastest-route components. Delayed historical-counter
backfills can write and must be included in completion and cleanup evidence.
Cold preparation time provides no credit toward the unchanged load durations
or latency budgets. A private diagnostic alone does not establish a capacity
improvement or release readiness.

During startup queue loading, select each physical route once when it has an
active owner. Shared routes must still hydrate every active workspace and their
existing credentials. Measure enumeration alongside checker and projection work
on the million-route profile. A stopped page comparison cannot establish
startup readiness or replace the unchanged recovery, smoke and load gates.

## Test matrix

| Suite | Script | Default duration | Primary focus | Gate criteria |
| --- | --- | --- | --- | --- |
| Read-heavy | `scripts/perf/k6/read-path.js` | `30m` | proxy pages, filters, dashboard, GraphQL, proxy statistics reads | content checks, request coverage, latency, HTTP failures, and dropped arrivals |
| Write-heavy | `scripts/perf/k6/write-path.js` | `30m` | sustained `POST /api/addProxies` ingestion | content checks, request coverage, latency, HTTP failures, and dropped arrivals |
| Mixed soak | `scripts/perf/k6/mixed-soak.js` | gate default `24h`; standalone script `2h` | long-running mixed reads + writes | per-scenario thresholds plus growth/drop budgets below |
| Growth budget | `scripts/perf/assert-snapshot-delta.sh` | N/A | queue and DB growth across test window | queue/db deltas within configured limits |
| Drop budget | `scripts/perf/check-drop-budget.sh` | N/A | proxy statistics queue drop protection | `dropped_total` must be less than or equal to configured budget |

## Release gate procedure

Run from the `magpie` distribution repository root:

```bash
cd scripts/perf
./run-gate.sh
```

The default release gate runs 30-minute read and write suites plus a 24-hour
mixed soak. It rejects shorter soaks, skipped drop checks and missing/empty log
sources. For a short functional check, run `PERF_GATE_MODE=smoke ./run-gate.sh`.
Smoke mode does not establish production capacity.

Every content check must pass. An HTTP 200 response containing GraphQL errors or
malformed import/statistics data fails the command. Each scenario must make a
request, and statistics scenarios require an existing proxy in the selected
workspace. Missing proxies abort setup. They do not substitute a different
workload. Dropped load iterations default to zero; `PERF_MAX_DROPPED_ITERATIONS`
sets an explicit nonnegative count budget when the test plan permits drops.

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

## Authentication inputs {/* #inputs-for-auth */}

Provide one of:

- `MAGPIE_TOKEN`
- `MAGPIE_USER_EMAIL` and `MAGPIE_USER_PASSWORD`

If credentials are missing and `MAGPIE_REGISTER_IF_MISSING=true`, the k6 harness auto-registers a user for test execution.

## Running with a local backend {/* #running-with-local-backend-no-backend-container */}

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
- `PERF_DROP_BUDGET_SOURCE=skip`, available only in smoke mode

Snapshots sum the legacy queues and all supported shard names, proxy shards
`0` through `127` and scrape shards `0` through `63`. This includes older shard
layouts after a shard-count change. A short atomic aggregate makes exactly 194
constant-time cardinality reads without scanning the Redis keyspace, so payload
key count does not increase its Redis work. Keep these bounds aligned with the
backend's supported limits. Statistics byte measurements include the partitioned parent,
all descendant partitions and their indexes. Redis authentication is passed to
the snapshot client. The gate saves start/end snapshots and JSON summaries for
all k6 suites. Its log window starts before the first suite; retain backend logs
for the complete run, including rotations.

Record route count, tenant sharing, active checker/scraper load, hardware,
retention settings and dependency versions with release evidence. Include
outages, import/delete churn, month boundaries, idle tunnels and a backup
restore exercise. Use a representative 24-to-72-hour soak for release evidence. Regression tests
and a short smoke run cannot establish that capacity or months of stability.

For a reproducible local baseline, the distribution repository includes
[`scripts/recovery`](https://github.com/Magpie-Tools/magpie/tree/master/scripts/recovery).
It prepares one million authenticated routes shared across eight workspaces,
runs controlled checker/scraper services, rehearses coordinated recovery into
fresh volumes, and starts the corrected gate with telemetry. Its internal Docker
network prevents external requests. This Linux workflow needs a locally built
backend image, k6, Go, Python, and sufficient RAM and disk for the recorded profile.
Review its README before running it.

The baseline cycles imports through a finite existing pool using
`PERF_PROXY_FIXTURE_FILE`. That measures repeated ingestion. Record new-route
imports and deletion separately, and report the measured protocols, proxy
latency, resource limits, and maintenance settings with the result. A pending
24-hour run is incomplete evidence.

The local baseline retains an unknown Redis consumer lag as `null`. When stream
deletions make lag unavailable, it uses stream length plus pending IDs as an
upper bound on outstanding work. This can count an entry twice; it cannot omit
an unread entry or a pending ID whose payload was deleted. Existing backlog
limits and persistence-credit deductions apply to that larger bound. Missing
streams or groups and malformed diagnostics still fail validation.

## Regression coverage and upgrade constraints

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

### Real-service regression fixtures

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

### Bulk deletion

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

### Queue alias migration

Alias migration regressions cover concurrent aliases, current claims and
imports during migration preparation, stale source leases, and expired current
leases with plaintext and encrypted compatibility payloads. The separate
`BenchmarkProxyQueueLegacyRekey` benchmark measures migration with eight
existing owners and one added owner. Compare its cost separately from ordinary
plaintext queue throughput.

### Shutdown and replay

On shutdown, the backend waits for producers to stop before canceling usage
and statistics consumers. After statistics and reputation writers stop, read
models refresh proxy filters, then drain all queued scrape-source statistics
batches. Redis stays open until these stages finish. The SIGTERM regression
checks both proxy filters and source counters in stream and memory modes, with
more source associations than fit in one refresh batch.
Statistics stream workers leave unacknowledged entries pending for
recovery. The ledger prevents committed entries from counting twice. Pending
entries from another consumer become recoverable after at least one minute idle.
The volatile in-memory fallback retries its unfinished final buffer, with each
flush bounded by a shared 30-second preparation/write deadline. It remains
active until empty, so the overall background shutdown deadline reports an
error if draining cannot finish. A forced exit has no durable recovery for
results that exist only in memory.

### Asynchronous read models

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

Proxy-list refresh batches count workspace/route pairs. Shared owners of one
physical route are grouped within that limit so the statement can reuse route
metadata. An upsert still checks each owner's current evidence and lifecycle
state, and orders writes by workspace and route. Grouping adds no capacity
guarantee: measure current projection lag and write/index costs under the full
resource profile. A failed clean drain still requires stopped-writer repair.

Unchanged proxy-list rows are filtered before the upsert acquires conflict
locks. Changed and missing rows retain the existing null-safe conflict check.
Validate every projected content field, unchanged timestamps and concurrent
row locks. The filter adds a projection lookup inside the existing statement;
measure its read cost alongside avoided locks. A stopped comparison that ran
the original first cannot attribute later latency or WAL reductions to this
filter, and cannot qualify readiness or load capacity.

Pending physical route IDs drain in sorted rounds to retain index locality.
An unseen queued route reads the latest committed evidence when processed;
invalidations for in-flight routes remain queued for another round. Sorting
adds memory and CPU work, so include a large pending set in measurements and
verify that new invalidations and failed prefixes survive until drained.

Include repeated imports of existing management in the workload. Those imports
preserve lifecycle and usage counters without recounting the whole inventory;
actual new ownership still refreshes authoritative capacity and peak usage.
Measure import transaction/lock time alongside statistics and projection lag.
Check mixed new/existing rows, finite quotas, encrypted credentials and deletion
between the ownership conflict check and credential update. A no-addition import
must neither resurrect deleted ownership nor write unchanged billing usage.

Periodic alive-count snapshots join a scoped active-ownership input to current
evidence. Validate both sparse and dense evidence, one and multiple workspaces,
protocol overrides, legacy generations and inactive ownership. PostgreSQL must
avoid an ownership lookup for every alive result in the dense case. Record
shared reads and temporary-file I/O: the scoped join can trade more temporary
I/O for fewer repeated index probes. Stopped-data equivalence and query timings
do not establish sustained capacity or replace recovery, smoke or load gates.

Cold dashboard country counts, reputation counts and top-proxy selection share
one materialized active-workspace projection. Include the first dashboard
request in validation and measure its complete latency, including joined legacy
daily-check backfill. Record base-table reads and temporary-file I/O together:
sharing the input reduces repeated scans but can increase temporary storage.
Check tenant/lifecycle scope, null scores, tie order, cancellation and retained
history. Read-only probes that prevent backfill writes cannot qualify readiness;
query equivalence or lower read counts cannot replace the full load gate.

Dashboard check counts combine retained counters and raw day-boundary results
before one current-ownership join. Verify exact UTC cutoffs, compacted history,
successful and unsuccessful attempts, legacy NULL results and current ownership
across active, paused and archived management. Record command counts, parallel
plans, shared reads and temporary I/O together. The combined count read uses
one SQL statement; its result does not replace complete cold-request latency,
joined backfill, clean recovery or sustained load evidence.

After a recognized projection child deadline, the updater retains a smaller
statement width within that owner batch. Two consecutive full-width commits
using at most a quarter of the child timeout allow growth toward the configured
ceiling. A successful full-width commit taking more than half of the child
timeout also halves the next width, retaining its committed prefix without a
retry interval. Short tails do not trigger this change; new batches still start
at ordinary width. Record failed attempts, successful widths, round trips and write/index
costs together. Verify that timing-based growth preserves contiguous progress,
source-only retries, concurrent invalidations and clean drain behavior. The
ordinary pair ceiling, invocation count, timer and timeout remain unchanged;
smaller statements and unit delay fixtures do not establish sustained capacity.

### Long-running storage growth

Ledger maintenance persists a replay floor before retiring event identities.
Measure `proxy_statistic_events` and its indexes, `proxy_statistic_streams`, and
`proxy_check_totals`. Monitor pending age and maintenance progress; an old pending
event delays retirement. Accelerated regressions do not establish stability over
months. Sustained soaks should include dependency outages, import/delete churn,
month boundaries, and idle tunnels.
