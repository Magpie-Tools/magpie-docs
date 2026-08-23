# REST: Proxies

## `POST /api/addProxies`

Requires auth. Uploads proxies from multipart fields.

Accepted form fields:

- `file`: uploaded proxy text file
- `proxyTextarea`: raw text area input
- `clipboardProxies`: pasted input

Optional query parameter:

- repeated `tagId`: tags to add to every imported proxy

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
- Import tag assignment is additive. Existing tags remain assigned when an already-owned proxy route is imported again.
- Every `tagId` must belong to the authenticated user. Unknown or malformed IDs reject the request.

## `GET /api/getProxyCount`

Requires auth. Returns total proxy count for the user.

## `GET /api/getProxyPage/{page}`

Requires auth. Returns paged proxy rows.

Query params:

- `pageSize`
- `search`
- `status=alive|dead`
- repeated `protocol=http|https|socks4|socks5`
- repeated `country`
- repeated `type`
- repeated `anonymity`
- repeated `reputation=good|neutral|poor|unknown`
- repeated `tagId`
- `maxTimeout`
- `maxRetries`

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
      "latest_check": "2026-02-12T10:00:00Z",
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

Tags and assignments are scoped to the authenticated user. Tag names are case-insensitively unique per user, whitespace is normalized, and names may contain at most 40 characters. Colors use `#RRGGBB` notation.

### `GET /api/proxyTags`

Returns the user's tags ordered by name.

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

Renames and recolors one of the user's tags using the same request body as creation.

### `DELETE /api/proxyTags/{id}`

Deletes one of the user's tags and all of its assignments. Returns `204`; proxies are not deleted.

### `PUT /api/proxies/{id}/tags`

Replaces the authenticated user's complete tag selection for a proxy. An empty array removes every tag from that proxy.

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

Unknown tags, tags owned by another user, and proxies outside the user's pool return `404`. Duplicate names return `409`; invalid names, colors, or path IDs return `400`.

## `GET /api/proxies/{id}`

Requires auth. Returns proxy detail including latest statistic, reputation breakdown, and the authenticated user's `tags` array.

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
      "anonymity_level": "elite",
      "judge": "https://judge.example",
      "created_at": "2026-02-12T09:58:00Z"
    }
  ]
}
```

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

Requires auth. Supports two body modes.

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

When `filter` is enabled, `tagIds` uses the same ANY matching as proxy-list filtering.

Responses are JSON strings, for example:

- `"Deleted 25 proxies."`
- `"No proxies matched the delete criteria."`
