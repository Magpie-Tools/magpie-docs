# Data Storage

## PostgreSQL

Primary persistent store for:

- user accounts and global instance roles
- workspaces, memberships, pending workspace invitations, workspace roles, and member preferences
- subscription entitlements and monthly usage periods
- proxy routes, workspace-managed proxies, and lifecycle state
- proxy statistics and reputation snapshots
- workspace-owned proxy tags and their managed-proxy assignments
- scrape sources and relations
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
