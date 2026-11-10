# REST: Admin, System, and Observability

## `POST /api/saveSettings` (admin)

Requires admin role. Persists global configuration.

Request body is the full `config.Config` object (see [Configuration](../reference/configuration.md)).

Possible blocked-website response (`400`):

```json
{
  "error": "One or more URLs are blocked by website blacklist",
  "blocked_websites": {
    "judges": ["https://..."],
    "scrape_sites": ["https://..."],
    "blacklist_sources": ["https://..."],
    "ip_lookup": ["https://..."]
  },
  "website_blacklist": ["example.com"]
}
```

Success (`200`):

```json
{"message": "Configuration updated successfully"}
```

Side effects when config changes:

- Website blacklist cleanup across workspace judges/sources
- Queue cleanup for removed scrape sources
- GeoLite update job trigger when API key is set
- Blacklist refresh trigger when new blacklist source URLs are added

## `GET /api/global/settings` (admin)

Requires admin role. Returns full current global config.

## `GET /api/plugins/ipgeolocation/status` (admin)

Returns `used_credits`, `daily_credit_limit`, `reset_at`, `next_request_at`,
`last_checked_at`, and `last_error`. Usage is Magpie's local credit budget,
not the provider account balance. This endpoint reads local state and does not
perform a provider lookup. Configure the plugin through the full global settings
object's `plugins.ipgeolocation` field. See [IPGeolocation.io](../user-guide/ipgeolocation.md).

## `POST /api/global/proxies/requeue` (admin)

Requires admin role. Redistributes waiting proxy checks across the fastest
workspace check cadence, but no less than 15 minutes and no more than 6 hours.
Each workspace is still checked only as often as its monthly check allowance
permits. Checks already in progress retain their leases and finish normally.
Expired leases remain available for workers to recover.

Success (`200`):

```json
{
  "message": "All queued proxies were requeued successfully",
  "proxy_count": 42
}
```

`proxy_count` is the number of waiting queue members actually rescheduled.
It excludes leased members, including leases claimed during the operation.

## `PUT /api/global/workspaces/{id}/allowances` (admin)

Requires the global admin role. Sets one workspace's own monthly check and
scrape allowances. `0` makes the workspace use the instance default again.
`unlimited_checks` or `unlimited_scrapes` removes the limit and ignores the
matching monthly value. The workspace must then choose a fixed interval and
runs hourly until it does. Cadence follows within about a minute.

```json
{"monthly_checks": 8000000, "monthly_scrapes": 0, "unlimited_checks": false, "unlimited_scrapes": true}
```

Success (`200`) echoes the four fields and `workspace_id`.
An unknown workspace returns `404`.

## Requeue one proxy {/* #requeue-one-proxy */}

`POST /api/global/proxies/{id}/requeue` requires the global admin role and
access to the selected workspace. It reloads the managed route and queues it
for an immediate worker visit. It does not run the check synchronously or
wait for statistics to commit. The visit checks the route only for workspaces
whose check cadence is due and which have allowance left. Otherwise the route
returns to the queue without a check.

Send your bearer token and, when needed, `X-Workspace-ID`. No body is required.
For example, with your own token, workspace ID, and route ID:

```http
POST /api/global/proxies/123/requeue
Authorization: Bearer <token>
X-Workspace-ID: 42
```

Success is `200` with `{"message":"Proxy queued successfully","proxy_id":123}`.
Invalid IDs return `400`, a missing managed route returns `404`, and queue
synchronization failures return `503`. A successful request still requires
active workspace management, eligible settings, judges, and functioning
statistics ingestion for a new result to become visible.

## `GET /api/getDashboardInfo`

Requires viewer or higher. Returns dashboard metrics for the selected workspace.

Includes totals, weekly totals, reputation/country breakdowns, judge success aggregates, and optional `top_reputation_proxy`.

## `GET /api/releases`

Public endpoint (no auth required).

Response:

```json
{
  "releases": [
    {
      "id": 1,
      "tagName": "v1.2.3",
      "title": "Release title",
      "body": "...",
      "htmlUrl": "https://github.com/...",
      "publishedAt": "2026-02-01T12:00:00Z",
      "prerelease": false
    }
  ],
  "build": {
    "buildVersion": "abcdef1",
    "builtAt": "2026-02-01T10:00:00Z"
  }
}
```

## Observability endpoints

- `GET /healthz`: process liveness and build metadata.
- `GET /readyz`: dependency readiness (`database`, `redis`, `startup_queue_bootstrap`) with `ready`, `degraded`, or `not_ready` status.
- `GET /metrics`: Prometheus metrics endpoint.

These routes are wrapped by observability protection:

- In non-production mode, public access is allowed by default.
- In production mode, public access is denied by default unless:
  - caller is loopback, or
  - `X-Observability-Token` matches `OBSERVABILITY_TOKEN`, or
  - `ALLOW_PUBLIC_OBSERVABILITY_ENDPOINTS=true`.

Example metrics families exposed by `/metrics`:

- `magpie_http_requests_total`
- `magpie_http_request_duration_seconds`
- `magpie_auth_failures_total`
- `magpie_rate_limit_blocks_total`
- `magpie_rotating_proxy_errors_total`
