# Runtime Jobs

Magpie starts several long-running routines on backend startup.

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

The durable email outbox is split across two coordination models:

- Every backend instance runs the email delivery worker and can poll, claim, and send queued outbox rows in parallel.
- Outbox housekeeping remains leader-coordinated to avoid duplicate stale-message recovery and sent-row cleanup work.

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
`GOMAXPROCS=2`, all 200,000 rules completed each pass in 19–30 seconds with one
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
