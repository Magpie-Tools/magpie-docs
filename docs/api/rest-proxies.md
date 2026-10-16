---
description: "Import and manage proxy routes, compare health fields, and use filters, tags, lifecycle actions, and exports."
---

# REST: proxies

A proxy ID identifies a shared route. Each selected workspace has its own
management, lifecycle, tags, credentials, and applicable health evidence for
that route. Every request on this page needs a bearer token and the
appropriate selected-workspace role.

## Follow a route through the API

| Step | Request | What to inspect |
| --- | --- | --- |
| 1. Import a small list | `POST /api/addProxies` | Parsed/rejected counts. Acceptance does not establish health. |
| 2. Find its ID | `GET /api/getProxyPage/1?search=...` | Host, tags, lifecycle, and `health_known`. |
| 3. Read current detail | `GET /api/proxies/{id}` | `alive` can be null for unknown health. |
| 4. Read evidence | `GET /api/proxies/{id}/statistics` | Protocol, transport, configuration, and result time. |
| 5. Operate management | Lifecycle/tag endpoints below | The selected workspace changes independently of others. |

For a live walkthrough, see [your first proxy workflow](../learn/first-proxy.md).
For route identity and transaction boundaries, see
[import internals](../backend/import-and-scraping.md).

## Example import

After defining the [curl client variables](rest-overview.md#first-authenticated-workflow),
import a local text file with one route per line:

```bash
curl --silent --show-error --fail-with-body \
  -H "Authorization: Bearer $MAGPIE_TOKEN" \
  -H "X-Workspace-ID: $MAGPIE_WORKSPACE_ID" \
  -F 'file=@proxies.txt' \
  "$MAGPIE_ORIGIN/api/addProxies"
```

Let curl set multipart `Content-Type` and its boundary. Do not send the input
as JSON. Earlier upload batches may have committed if a later batch fails;
inspect inventory before retrying. Existing management is deduplicated and
keeps its lifecycle state on reimport.

## Interpret health correctly

| Response | Alive | Dead | Unknown |
| --- | --- | --- | --- |
| Proxy list | `health_known: true`, `alive: true` | `health_known: true`, `alive: false` | `health_known: false`; false `alive` alone is not failure. |
| Proxy detail | `alive: true` | `alive: false` | `alive: null`. |
| Historical statistic | Workspace-attributed result | Workspace-attributed result | Inspect `current`; an old success need not match present settings. |

Active/paused/archived describe lifecycle, independently of those health
values. Alive/dead list filters exclude unknown evidence. Rotators also
require the requested upstream protocol's current TCP evidence.

## `POST /api/addProxies`

Requires auth. Uploads proxies from multipart fields.

Accepted form fields:

- `file`: uploaded proxy text file
- `proxyTextarea`: raw text area input
- `clipboardProxies`: pasted input

Optional query parameter:

- repeated `tagId`: tags to add to every imported proxy

Requires operator or higher in the selected workspace. The workspace is
selected with `X-Workspace-ID`, or the account's default when omitted.

The endpoint accepts provider hostnames as `gateway.provider.example:8080`, IPv4 as `192.0.2.1:8080`, and IPv6 as `[2001:db8::1]:8080`. The same host forms support `user:pass@host:port`, `host:port@user:pass`, and `host:port:user:pass` credentials.

Success (`200`):

```json
{
  "proxyCount": 42,
  "details": {
    "submittedCount": 100,
    "parsedCount": 70,
    "invalidFormatCount": 20,
    "invalidAddressCount": 5,
    "invalidIpCount": 5,
    "invalidIpv4Count": 0,
    "invalidPortCount": 3,
    "blacklistedCount": 28,
    "processingMs": 17
  }
}
```

Notes:

- Oversized uploads return `413`.
- If no upload input is provided, returns `400`.
- `invalidAddressCount` covers invalid DNS hostnames, IPv4 addresses, and IPv6 addresses. `invalidIpCount` is a deprecated alias with the same value.
- `invalidIpv4Count` is retained as a deprecated compatibility field and is always `0` for manual uploads.
- Proxy scraping remains IPv4-only and rejects hostnames.
- Import tag assignment is additive. Existing workspace tags remain assigned when an already-managed proxy route is imported again.
- Routes beyond a finite active capacity are stored as paused rather than discarded.
- Every `tagId` must belong to the selected workspace. Unknown or malformed IDs reject the request.

## `GET /api/getProxyCount`

Requires viewer or higher. Returns the selected workspace's managed-proxy count.

## `GET /api/getProxyPage/{page}`

Requires viewer or higher. Returns paged proxy rows. Page numbers are
one-based. Keep the same search and filters when moving to another page.

Query params:

- `pageSize`
- `search`
- repeated `state=active|paused|archived`
- `status=alive|dead`
- repeated `protocol=http|https|socks4|socks5`
- repeated `country`
- repeated `type`
- repeated `anonymity`
- repeated `reputation=good|neutral|poor|unknown`
- repeated `tagId`
- `maxTimeout`
- `maxRetries`

The optional repeated `state` filter selects workspace lifecycle states independently of alive/dead `status`. For example, `state=paused&state=archived` includes proxies in either state. Omitting it includes all lifecycle states. Unsupported values are ignored.

Several `tagId` values use ANY matching: a proxy is included when it has at least one selected tag. The `search` parameter also matches tag names.

Response:

```json
{
  "proxies": [
    {
      "id": 1,
      "ip": "gateway.provider.example",
      "port": 8080,
      "estimated_type": "N/A",
      "response_time": 280,
      "country": "N/A",
      "anonymity_level": "elite",
      "alive": true,
      "health_known": true,
      "latest_check": "2026-02-12T10:00:00Z",
      "state": "active",
      "tags": [
        {"id": 4, "name": "Residential", "color": "#22C55E"}
      ],
      "reputation": {
        "overall": {"kind": "overall", "score": 0.89, "label": "good"}
      }
    }
  ],
  "total": 1234
}
```

The `ip` response property keeps its existing name for API compatibility. Its value is the canonical route host, which may be a DNS hostname, IPv4 address, or IPv6 address. Country, estimated type, AbuseIPDB data, and IP blacklist matching are unavailable for hostname routes because Magpie does not resolve changing gateway answers into stored identity data.

Proxy list rows include `health_known`. When false, the current effective
checker settings have no applicable evidence; `alive: false` then means unknown
rather than a confirmed failure. Health filters exclude unknown proxies.
Settings changes, empty protocol selections, and pending runtime refreshes can
make health unknown.

## `GET /api/proxyFilters`

Requires auth. Returns available filter values:

```json
{
  "countries": ["DE", "US"],
  "types": ["datacenter", "residential"],
  "anonymityLevels": ["elite", "anonymous", "transparent", "N/A"],
  "tags": [
    {"id": 4, "name": "Residential", "color": "#22C55E"}
  ]
}
```

## Proxy tags

Tags and assignments are scoped to the selected workspace. Tag names are
case-insensitively unique per workspace, whitespace is normalized, and names
may contain at most 40 characters. Colors use `#RRGGBB` notation. Viewers can
read tags; operator or higher is required to change them.

### `GET /api/proxyTags`

Returns the workspace's tags ordered by name.

```json
[
  {"id": 4, "name": "Residential", "color": "#22C55E"},
  {"id": 9, "name": "Vendor A", "color": "#0EA5E9"}
]
```

### `POST /api/proxyTags`

Creates a tag and returns it with status `201`.

```json
{"name": "Vendor A", "color": "#0EA5E9"}
```

### `PUT /api/proxyTags/{id}`

Renames and recolors one of the workspace's tags using the same request body as creation.

### `DELETE /api/proxyTags/{id}`

Deletes one of the workspace's tags, its assignments, and references in source
automatic-tag rules. Returns `204`; proxies are not deleted.

### `PUT /api/proxies/{id}/tags`

Replaces the selected workspace's complete tag selection for a managed proxy.
An empty array removes every tag from that proxy.

This is replacement semantics, unlike additive import and source tags. Read
the current tag list, merge the change your client intends, then submit the
full desired selection if you need to preserve other assignments.

A later scrape can add a removed tag again if it remains configured in that
source's automatic tags. Source rules only add missing tags and never replace
this proxy's other assignments.

Request:

```json
{"tagIds": [4, 9]}
```

Response:

```json
{
  "tags": [
    {"id": 4, "name": "Residential", "color": "#22C55E"},
    {"id": 9, "name": "Vendor A", "color": "#0EA5E9"}
  ]
}
```

Unknown tags, tags owned by another workspace, and routes not managed by the
selected workspace return `404`. Duplicate names return `409`; invalid names,
colors, or path IDs return `400`.

## `GET /api/proxies/{id}`

Requires viewer or higher. Returns proxy detail including latest statistic,
reputation breakdown, the selected workspace's `tags`, and its `state` and
optional `pause_reason`. Its `alive` field is `true`, `false`, or `null` for
current alive, dead, or unknown health. `latest_statistic` uses only evidence
matching this workspace's current effective checker settings.

## `PUT /api/proxies/{id}/lifecycle`

Requires operator or higher. Sets the selected workspace's managed-proxy state
to `active`, `paused`, or `archived`.

```json
{"state": "paused"}
```

Returns `204`. Activating a route at a finite workspace capacity limit returns
`409`. A paused or archived association remains stored and stops contributing
that workspace to checker and rotator work.

## `GET /api/proxies/{id}/statistics`

Requires auth.

Query params:

- `limit` (optional positive integer, default `100`)

Response:

```json
{
  "statistics": [
    {
      "id": 987,
      "alive": true,
      "attempt": 1,
      "response_time": 190,
      "protocol": "http",
      "transport": "tcp",
      "timeout": 7500,
      "retries": 2,
      "config_key": "32bd6c...",
      "current": true,
      "anonymity_level": "elite",
      "judge": "https://judge.example",
      "created_at": "2026-02-12T09:58:00Z"
    }
  ]
}
```

Attributed history shows this workspace's verdict, transport, timeout, retries,
and configuration key. `current` indicates that the configuration still
matches an enabled current check; it does not mean this is the latest event.
Obsolete and legacy rows remain historical. Legacy rows lack configuration
attribution and never qualify as current after snapshot initialization.

## `GET /api/proxies/{id}/statistics/{statisticId}`

Requires auth.

Response:

```json
{
  "response_body": "...",
  "regex": "..."
}
```

## `DELETE /api/proxies`

Requires operator or higher. Deletes selected workspace associations and
supports two body modes. A globally shared route remains stored while any other
workspace manages it.

Bulk deletion runs in batches. Affected scrape-source counts and health refresh
once after the committed batches. If a later batch fails, earlier deletions
remain committed; refresh the proxy list before retrying.

Deletion removes this workspace's management. Pause or archive instead when
you want to retain credentials and tags for later activation. Other workspaces
managing the route remain independent.

Mode A: selected IDs array.

```json
[101, 102, 103]
```

Mode B: filter object.

```json
{
  "proxies": [101, 102],
  "filter": true,
  "http": true,
  "https": false,
  "socks4": false,
  "socks5": false,
  "maxRetries": 2,
  "maxTimeout": 5000,
  "proxyStatus": "alive",
  "reputationLabels": ["good"],
  "tagIds": [4, 9],
  "scope": "selected"
}
```

When `filter` is enabled, the optional `states` array accepts `active`, `paused`, and `archived` with ANY matching, for example `"states": ["paused", "archived"]`. The single `state` field remains supported. Omitting it includes all lifecycle states.

When `filter` is enabled, `tagIds` uses the same ANY matching as proxy-list filtering.

Responses are JSON strings, for example:

- `"Deleted 25 proxies."`
- `"No proxies matched the delete criteria."`
