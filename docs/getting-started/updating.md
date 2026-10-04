# Updating

## If you installed via one-command installer

### macOS/Linux

```bash
curl -fsSL https://raw.githubusercontent.com/Magpie-Tools/magpie/refs/heads/master/scripts/update.sh | bash
```

### Windows (PowerShell)

```powershell
iwr -useb https://raw.githubusercontent.com/Magpie-Tools/magpie/refs/heads/master/scripts/update.ps1 | iex
```

## If you cloned manually

### macOS/Linux

```bash
./scripts/update-frontend-backend.sh
```

### Windows (CMD)

```bat
scripts\update-frontend-backend.bat
```

## Key safety requirement

Keep `PROXY_ENCRYPTION_KEY` stable during updates. If you rotate it unintentionally, previously encrypted data becomes unreadable.

## Database migration

The bundled update scripts stop the backend and run the new image's migration
before restarting the stack. Before updating, take coordinated PostgreSQL and
Redis backups. For a manual Docker Compose update, run:

```bash
docker compose pull
docker compose stop backend
docker compose run --rm backend --migrate-only
docker compose up -d
```

Keep every backend instance stopped until the migration finishes. The proxy
storage migration removes columns used by older backend images, so rollback
requires the matching PostgreSQL and Redis backups.

### Workspace ownership migration

The workspace release performs an ownership-boundary migration:

- creates one personal workspace, owner membership, entitlement, and preference
  row for every existing account;
- copies each account's operational settings into that workspace;
- moves managed proxies, tags, assignments, judges, scrape sources, rotators,
  histories, and snapshots from `user_id` ownership to `workspace_id` ownership;
- keeps existing managed proxies active initially; and
- repairs PostgreSQL foreign keys to reference `workspaces`.

The migration deliberately uses the legacy account ID as the personal
workspace ID where possible, but clients must discover workspaces through
`GET /api/workspaces` instead of relying on that detail. Existing API clients
that omit `X-Workspace-ID` continue through the migrated default workspace.

Do not run an older backend against the migrated database. There is no in-place
downgrade because ownership columns and constraints have changed; restore the
coordinated PostgreSQL and Redis backups to roll back.

### Tag checker settings migration

Update the frontend and every backend instance together. Stop all backend
instances, run `--migrate-only`, and start the new images after it succeeds.
This release adds workspace protocol defaults and ordered tag rules, a sparse
projection for tagged proxy checks, and workspace/configuration attribution to
latest statistics. The latest-statistics primary key changes; older workers
must not write to the migrated database.

Existing checker values become shared Default settings with no tag rules.
Earlier per-protocol draft profiles remain readable and convert to shared values
using the first enabled Default protocol and first explicit rule fields in
HTTP, HTTPS, SOCKS4, SOCKS5 order. If converted transports are incompatible with
SOCKS, conversion uses TCP. Update the frontend and backend together. Legacy statistics remain available as history. Their
transport and settings cannot be reliably attributed, so current health starts
unknown until fresh matching checks complete. TCP rotators also wait for current
TCP evidence. Existing failure streaks are retained.

No new environment variables are needed. Keep `PROXY_ENCRYPTION_KEY` stable and
retain the coordinated backups for rollback. Redis queue payloads and ordinary
requeue scheduling keep their existing format and credential policy.

Checker projection refreshes reconcile committed keys and tag overrides across
backend instances. Unrelated classification tags do not refresh workspace health,
and checker tag edits refresh only affected proxy and source summaries. Dashboard
caches verify the committed checker generation before serving health. Unchanged
reconciliation skips route reads; column-only saves skip checker refresh. Recent
checks select indexed candidates before fetching their evidence.

Run the updated migration even when upgrading an earlier tag-settings build. It
adds workspace revision counters, a coalesced per-route change journal, and an
index for active recent-check candidates. These changes require no new environment
settings and add no database queries to individual checker runs.
The journal retains temporary removal records so a reimported proxy does not
reuse settings from its previous tag membership. Retention maintenance expires
committed removal records after 24 hours; workspace deletion removes its journal.
