# Data Storage

## PostgreSQL

Primary persistent store for:

- user accounts and global instance roles
- workspaces, memberships, pending workspace invitations, workspace roles, and member preferences
- subscription entitlements and monthly usage periods
- proxy routes, workspace-managed proxies, and lifecycle state
- proxy statistics and reputation snapshots
- workspace-owned proxy tags and their managed-proxy assignments
- scrape sources, workspace source settings, automatic-tag rules, and relations
- rotating proxies

Default Docker setup persists Postgres data via named volume `postgres_data`.

Proxy routes can be shared across workspaces. The legacy `user_proxies` table
name remains for compatibility, but each row is a managed proxy keyed by
`workspace_id` and `proxy_id`. It stores that workspace's encrypted credential
copy, active/paused/archived state, pause reason, failure counter, and lifecycle
timestamps. A route is active in the checker queue while at least one workspace
actively manages it.

Tag catalogs and assignments are scoped to a workspace and managed proxy. Tags
are not copied into Redis queue payloads and do not add work to the steady-state
checker loop.

Workspace checker defaults and ordered tag rules are stored as JSON in
`workspaces.checker_config`. `proxy_checker_plans` contains only protocol keys
that differ from the workspace Default for a tagged managed proxy. Startup and
settings/tag mutations compile immutable runtime snapshots; workers resolve
checks from memory without loading credentials or tag assignments from the
database.

Workspace revision counters and `checker_proxy_changes` track which routes need
recompilation. The journal coalesces edits per workspace and route, letting
unchanged cached reconciliation skip assignment and projection reads. Removed
memberships retain temporary records so missed notifications cannot restore old
tag settings after a reimport. Retention maintenance expires committed removal
records after 24 hours and advances a full-refresh watermark before discarding
them. Workspace deletion removes its journal. The active recent-checks index
selects dashboard candidates before evidence aggregation.

Physical check history remains one row per event. Its `check_evidence` records
the verdict and configuration key for each participating workspace, together
with transport and budget metadata. `proxy_latest_statistics` is keyed by
workspace, configuration, route, and protocol. Current-health reads accept only
keys matching the current effective settings. Historical results retain their
original attribution, and retention removes obsolete latest pointers outside
checker workers. A pending projection suppresses current health until refresh
succeeds.

`scrape_source_tags` stores each workspace source subscription's automatic tag
selection. Its rules reference the existing workspace tag catalog. Source or tag
deletion removes the corresponding rule rows. Scraping adds ordinary managed
proxy tag assignments; changing or deleting a source rule does not remove those
assignments. Rules and assignments remain in PostgreSQL, outside queue payloads.

`workspace_subscriptions` is the entitlement snapshot and future billing seam.
It stores included, additional, and permitted-overage route capacity together
with plan constraints and private provider references. `workspace_usage_periods`
stores monthly active/peak routes, check attempts, and reserved managed-traffic
meters. Rotator request and payload-byte deltas are flushed to these rows in
batches. Membership rows never contain capacity.

`workspace_invitations` contains only live, account-bound offers. Each row stores the workspace, recipient account, requested access, expiry, notification state, and an inviter email snapshot. The inviter foreign key is nullable so the workspace can continue to manage the invitation after the inviter leaves. Acceptance, decline, revoke, and expiry cleanup delete the row; Magpie does not retain invitation history.

The durable email outbox carries optional invitation notifications independently of invitation persistence. Outbox delivery state never controls whether an invitation can be accepted.

## Redis

Used for:

- queue/sync behavior across routines
- runtime distribution features
- leadership lock coordination

Current queue payloads identify active workspace associations. Readers remain
compatible with legacy user-ID payloads during migration. Pausing or archiving
the final active association removes the route from checking and rotators.

Proxy queue credentials are plaintext by default to keep the checker hot path
fast. Treat Redis as trusted infrastructure and protect its network access,
storage, and backups. Optional application-level encryption is controlled by
`PROXY_QUEUE_ENCRYPT_CREDENTIALS`.

## File-based settings

Global settings are read/written at `data/settings.json` in local backend runs.

In containerized runs, persist this path with a volume if you require file-level durability beyond the container lifecycle.
