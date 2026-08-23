# REST: Proxies

## `POST /api/addProxies`

Requires auth. Uploads proxies from multipart fields.

Accepted form fields:

- `file`: uploaded proxy text file
- `proxyTextarea`: raw text area input
- `clipboardProxies`: pasted input

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
- `maxTimeout`
- `maxRetries`

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
  "anonymityLevels": ["elite", "anonymous", "transparent", "N/A"]
}
```

## `GET /api/proxies/{id}`

Requires auth. Returns proxy detail including latest statistic and reputation breakdown.

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
  "scope": "selected"
}
```

Responses are JSON strings, for example:

- `"Deleted 25 proxies."`
- `"No proxies matched the delete criteria."`
