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

## `POST /api/global/proxies/requeue` (admin)

Requires admin role. Redistributes waiting proxy checks across the current
check interval. Checks already in progress retain their leases and finish
normally. Expired leases remain available for workers to recover.

Success (`200`):

```json
{
  "message": "All queued proxies were requeued successfully",
  "proxy_count": 42
}
```

`proxy_count` is the number of waiting queue members actually rescheduled.
It excludes leased members, including leases claimed during the operation.

## Requeue one proxy {/* #requeue-one-proxy */}

`POST /api/global/proxies/{id}/requeue` requires the global admin role and
access to the selected workspace. It reloads the managed route and queues it
for an immediate worker visit. It does not run the check synchronously or
wait for statistics to commit.

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
