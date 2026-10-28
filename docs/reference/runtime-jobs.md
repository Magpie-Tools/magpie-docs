# Runtime Jobs

Magpie starts several long-running routines on backend startup.

For the guided explanation of coordination and replicas, see
[background jobs](../backend/background-jobs.md). This reference records the
routine families, intervals, and limits.

## How the jobs fit together

| Family | Purpose | Where to understand it |
| --- | --- | --- |
| Producers | Discover routes, check them, collect enrichment, and record traffic usage. | [Import](../backend/import-and-scraping.md), [checker](../backend/checker.md), [rotation](../backend/rotation.md). |
| Consumers and derived views | Commit check batches, update usage, refresh reputation, source counts, and dashboards. | [Results and storage](../backend/results-and-storage.md). |
| Evaluation and delivery | Read existing measurements, track incidents, and send durable outbox messages. | [Alerts](../user-guide/alerts.md). |
| Maintenance and recovery | Retain bounded history, reclaim work, expire old records, and rebuild lost queues. | [Startup and recovery](../backend/startup-and-lifecycle.md). |

Shutdown stops producers first, then consumers, then read-model refreshes.
Coordination differs by routine: queue leases, stream consumer groups, Redis
leadership, and PostgreSQL delivery claims solve different problems.

Statistics consumers flush at 5,000 physical results or every 15 seconds. They
bound transactions by 5,000 potential latest-evidence rows, keeping a single
result atomic even if it exceeds that limit. All transactions and preparation
in a flush share a 30-second deadline. Committed prefixes survive later
failures; only handled original stream IDs can be acknowledged. Memory workers
retry unfinished final buffers until empty or the overall shutdown fails.

Proxy-list read models coalesce dirty route IDs, discover their owners, and
refresh at most 5,000 workspace/route rows per prefix by default. Each prefix
has a 30-second deadline. Metadata reads use only its candidate routes. A
normal pass handles at most four projection statements on its five-second
timer. It retains unfinished ownership pairs for retry without repeating
committed prefixes. When a projection prefix reaches its child deadline while
its parent refresh context remains active, the next invocation halves its width within that
failed interval. Successful smaller statements commit independently; completing
the interval restores ordinary width. Discovery, source-lookup, parent
cancellation, and permanent-error paths do not trigger splitting. Smaller
retries can add database round trips and still need representative throughput
validation. Source invalidations follow all completed owner prefixes
for the original route batch; a failed source lookup retries separately.
Final draining retries proxy and source failures with a 250 ms backoff until
both dirty queues are empty. Source-counter batches have their own 30-second
deadline. Unfinished work makes the overall shutdown deadline report an error.
The environment reference lists the `READ_MODEL_REFRESH_*` controls.

Read-model failure logs distinguish numeric stages: `1` is owner discovery,
`2` is a chosen projection prefix, and `3` is its final source lookup. `cursor`,
`attempted_pairs`, `owner_pairs`, `retry_end`, and `retry_pair_limit` describe
in-memory progress without logging route arrays or credentials. A prefix stage
includes its existing table check; it does not prove the upsert reached the
server. Timing fields report milliseconds for owner, projection and source
work. These fields support diagnosis and do not certify capacity.

Dashboard refreshes pass job cancellation into all database reads, including
delayed daily-counter backfills. Every 30 seconds, the normal timer snapshots
components requested within the last two minutes and refreshes them serially,
rechecking demand before each component. It does not scan every workspace or
renew demand itself. Info, recent checks and fastest routes are independent
keys, including custom list limits. Demand and cached entries are process-local
and expire after idle; restarting clears them.

Each successful entry is eligible for cache hits for at most 30 seconds. A
cold or expired request loads synchronously or joins the same component's
refresh. Each loader inherits its caller context and a 30-second child bound.
Canceled or failed refreshes retain the previous stored snapshot without
granting an expired hit. Delayed daily-counter backfills follow the refresh's
cancellation and completion lifecycle. Historical counter backfill for unread
workspaces waits until their dashboard counts are requested; this timer is
not an unattended all-workspace historical-backfill job. The explicit force
prewarm still visits all workspaces for strict development fixture startup.
Judge and fastest-route queries retain their existing workspace scope and
query fan-out; fastest-route metadata loads after selecting the winners.

## Core routines

- judge refresh routine
- proxy statistics routine
- proxy statistics retention routine
- proxy history routine
- proxy snapshot routine
- proxy geo refresh routine
- orphan cleanup routine
- GeoLite update routine
- blacklist refresh routine
- checker thread dispatcher
- scraper page pool manager
- scraper thread dispatcher
- email delivery routine (durable outbox worker)
- password reset token cleanup routine
- workspace invitation cleanup routine
- workspace alert evaluation and incident-history cleanup routine
- durable alert delivery routine for email, Slack, Discord, and webhooks

## Leadership and coordination

Some routines are executed with leader-election semantics using Redis locks to avoid duplicate execution across instances.

Leadership, configuration subscriptions, checker settings, and stream startup
retry when Redis returns. Lost consumer groups restart with database replay
protection. Queue marker checks run every ten seconds; missing queues rebuild
from PostgreSQL under shared leadership, with readiness at 503 after detection.

Statistics maintenance precreates months even when migrations or history retention
are disabled, moves affected DEFAULT rows, and compacts older daily counts into
lifetime totals. Stream maintenance retires acknowledged identities behind a
durable replay floor. Orphan cleanup drains counter tables hourly with a 45-second
budget and retries failures or interruptions after one minute by default.

Obsolete latest-evidence cleanup evaluates at most
`PROXY_STATISTICS_RETENTION_BATCH_SIZE` candidate pointers per page in primary-key order.
It runs once per coordinated history-worker round. An unfinished scan resumes
on the next scheduled pass, within the existing batch and runtime limits. Each
scan fixes its upper key before starting, then returns to earlier keys in the
next scan so new evidence cannot indefinitely postpone older invalidations.
Dirty workspace namespaces and current legacy, default, and tag-override
evidence remain protected; history retention keeps their referenced checks.

Monitor `magpie_leader_job_active`, `magpie_maintenance_last_success_timestamp_seconds`,
`magpie_maintenance_failures_total`, and `magpie_statistics_replay_floor_timestamp_seconds`.
An old pending event delays ledger retirement.

Minute sweeps expire DNS/robots caches, bounded to 20,000/2,000 entries. Public-IP
lookup repeats every 15 minutes after success. Rotators close client/upstream
sockets when stopped and reload changed valid TLS certificates on handshake.

The durable email outbox is split across two coordination models:

- Every backend instance runs the email delivery worker and can poll, claim, and send queued outbox rows in parallel.
- Outbox housekeeping remains leader-coordinated to avoid duplicate stale-message recovery and terminal-row cleanup work. Both sent and abandoned messages expire.

## Timers

Most intervals are configured in global settings (`checker_timer`, `scraper_timer`, `judge_timer`, `blacklist_timer`, runtime timers, GeoLite update timer).

Retention routine interval/limits are configured via environment variables:

- `PROXY_STATISTICS_RETENTION_INTERVAL` / `PROXY_STATISTICS_RETENTION_INTERVAL_MINUTES`
- `PROXY_STATISTICS_RETENTION_DAYS`
- `PROXY_STATISTICS_RESPONSE_RETENTION_DAYS`
- `PROXY_STATISTICS_RETENTION_BATCH_SIZE`
- `PROXY_STATISTICS_RETENTION_MAX_BATCHES`

Password recovery maintenance is configured via:

- `PASSWORD_RESET_CLEANUP_INTERVAL` / `PASSWORD_RESET_CLEANUP_INTERVAL_MINUTES`
- `EMAIL_OUTBOX_POLL_INTERVAL` / `EMAIL_OUTBOX_POLL_INTERVAL_SECONDS`
- `EMAIL_OUTBOX_BATCH_SIZE`
- `EMAIL_PROCESSING_TIMEOUT` / `EMAIL_PROCESSING_TIMEOUT_SECONDS`
- `EMAIL_OUTBOX_RETENTION_HOURS`
- `EMAIL_RETRY_BASE_SECONDS`
- `EMAIL_MAX_ATTEMPTS`

The workspace invitation cleanup routine runs hourly under a Redis leader lock and deletes expired invitation rows. New invitation lifetime is configured with `WORKSPACE_INVITATION_TTL_HOURS`; cleanup does not renew or archive invitations.

Alert evaluation runs every minute under its own Redis leader lock and reads
existing measurements only for enabled rules. Each pass has a 45-second deadline
and four PostgreSQL workers. Each worker processes a workspace's enabled rules
together, starting with the least recently attempted workspace. One persisted
attempt marker advances the workspace's priority before measurement; successful
state writes stamp all observed rules in the same batch. A timeout or leadership
change leaves unattempted workspaces first in the next pass. Attempts do not
count as incident observations.

The shared rolling-history scan has a 15-second budget. Whole-workspace route
counts share grouped reads with a five-second budget. Each distinct pool-count
measurement has five seconds, with at most ten seconds for all pool measurements
in a workspace. Scheduling and state writes each have a fresh three-second
budget. Identical pool filters share counts within the workspace batch.
Measurement failures produce Unknown without consuming the whole pass. Rule
state, bulk incident transitions, and bounded delivery-record inserts commit
together under database locks, with rule-revision and checker-generation checks.
History cleanup has its own
ten-second budget. Closed incidents and their deliveries expire after 90 days.
Orphan route cleanup retains the last 15 minutes of check history so deleting
the final managed association cannot erase recent failures.

The opt-in backend test `TestAlertsScaleCadencePostgres` validates six consecutive
passes for 2,000 workspaces with 100 rules each. On two-CPU PostgreSQL 17 with
`GOMAXPROCS=2`, all 200,000 rules completed each pass in 19 to 30 seconds with one
destination per rule. This includes opening and recovering every incident and
queuing 400,000 notification records. The backend alert ADR records the exact
workload and command. Projection size, history volume, pool filters, notification
fanout, and other database traffic determine capacity for a deployment.

Each instance runs ten alert delivery workers. The dispatcher claims only free
slots and refills them as sends finish, draining eligible messages continuously.
It polls every five seconds when no messages are eligible or a claim fails.
PostgreSQL `SKIP LOCKED` claims distribute work, and claim tokens fence stale workers.
Processing claims become eligible again after five minutes. HTTP requests have
a 15-second timeout; SMTP conversations have a 30-second total timeout and
support cancellation. Messages retry up to four times. Alert evaluation and
delivery add no operations to the proxy checker or queue loop.
