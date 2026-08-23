# Managing Proxies

## Import proxies

`POST /api/addProxies` accepts multipart input from any combination of:

- `file`
- `proxyTextarea`
- `clipboardProxies`

Accepted formats include:

- IPv4: `192.0.2.1:8080`
- IPv6: `[2001:db8::1]:8080`
- Colon-delimited credentials: `host:port:user:pass`
- Prefix credentials: `user:pass@host:port`
- Suffix credentials: `host:port@user:pass`

Invalid entries are counted and returned in response statistics.
IPv6 literals must use brackets when a port is present. Proxy scraping remains IPv4-only.

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

The `ip:port` placeholder pair brackets IPv6 addresses in exported endpoints, for example `[2001:db8::1]:8080`.
