# Managing Proxies

## Import proxies

`POST /api/addProxies` accepts multipart input from any combination of:

- `file`
- `proxyTextarea`
- `clipboardProxies`

Accepted formats include:

- Provider hostname: `gateway.provider.example:8080`
- IPv4: `192.0.2.1:8080`
- IPv6: `[2001:db8::1]:8080`
- Colon-delimited credentials: `host:port:user:pass`
- Prefix credentials: `user:pass@host:port`
- Suffix credentials: `host:port@user:pass`

Invalid entries are counted and returned in response statistics. Magpie lowercases DNS hostnames, removes a trailing root dot, and converts internationalized names to their ASCII form so equivalent names share one route identity.

IPv6 literals must use brackets when a port is present. Proxy scraping remains IPv4-only and does not import hostnames. A provider hostname remains one route when its DNS answers change. Magpie checks it through normal DNS resolution, but IP blacklists, GeoLite, and AbuseIPDB apply only to routes entered as literal IP addresses.

## Browse and filter

Use:

- `GET /api/getProxyPage/{page}`
- `GET /api/proxyFilters`

Filter/query parameters include:

- `search`
- `pageSize`
- `status=alive|dead`
- repeated: `protocol`, `country`, `type`, `anonymity`, `reputation`
- `maxTimeout`, `maxRetries`

Search accepts complete or partial provider hostnames as well as IPv4, IPv6, and CIDR terms.

## Proxy detail and stats

- `GET /api/proxies/{id}`
- `GET /api/proxies/{id}/statistics?limit=...`
- `GET /api/proxies/{id}/statistics/{statisticId}`

## Delete proxies

`DELETE /api/proxies` supports two body formats:

1. JSON array of IDs: `[1,2,3]`
2. Filter settings object (`scope`, protocol filters, timeout/retries, reputation labels)

## Export proxies

`POST /api/user/export` returns formatted text.

Output format is a template string; placeholders include:

- `protocol`
- `ip`
- `port`
- `username`
- `password`
- `country`
- `alive`
- `type`
- `time`
- `reputation`
- `reputation_label`
- `reputation_score`

Example format:

```text
protocol ip:port username password country alive type time reputation_score reputation_label
```

The existing `ip` placeholder represents the route host and may output a provider hostname. The `ip:port` placeholder pair brackets IPv6 addresses in exported endpoints, for example `[2001:db8::1]:8080`, while a hostname is exported as `gateway.provider.example:8080`.
