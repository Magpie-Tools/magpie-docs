# Managing Proxies

## Import proxies

`POST /api/addProxies` accepts multipart input from any combination of:

- `file`
- `proxyTextarea`
- `clipboardProxies`

Before importing, you can select any number of tags. The chosen tags are added
to every imported proxy in the active workspace. If that workspace already
manages one of the submitted proxy routes, its existing tags stay in place and
the selected import tags are added to them.

Accepted formats include:

- Provider hostname: `gateway.provider.example:8080`
- IPv4: `192.0.2.1:8080`
- IPv6: `[2001:db8::1]:8080`
- Colon-delimited credentials: `host:port:user:pass`
- Prefix credentials: `user:pass@host:port`
- Suffix credentials: `host:port@user:pass`

Invalid entries are counted and returned in response statistics. Magpie lowercases DNS hostnames, removes a trailing root dot, and converts internationalized names to their ASCII form so equivalent names share one route identity.

One workspace association consumes one active-route unit. If an import exceeds
a finite workspace capacity limit, Magpie still stores the overflow managed
proxies but marks them paused. Existing routes are never displaced or deleted.

IPv6 literals must use brackets when a port is present. Proxy scraping remains IPv4-only and does not import hostnames. A provider hostname remains one route when its DNS answers change. Magpie checks it through normal DNS resolution, but IP blacklists, GeoLite, and AbuseIPDB apply only to routes entered as literal IP addresses.

## Browse and filter

Use:

- `GET /api/getProxyPage/{page}`
- `GET /api/proxyFilters`

Filter/query parameters include:

- `search`
- `pageSize`
- `status=alive|dead`
- repeated: `protocol`, `country`, `type`, `anonymity`, `reputation`, `tagId`
- `maxTimeout`, `maxRetries`

Selecting several tags matches proxies that have any selected tag. Search accepts tag names, complete or partial provider hostnames, IPv4, IPv6, and CIDR terms.

The proxy list uses a two-row dashboard toolbar: list actions, refresh, filters, and column controls are grouped above a full-width search field. The Tags column is always available so tags can be changed without leaving the list.

## Lifecycle

Each managed proxy is active, paused, or archived. Active routes are checked,
available to rotators, and count toward workspace capacity. Paused and archived
routes remain stored without consuming active capacity and can be restored from
the proxy list or detail page.

Activating a route can fail when the workspace is at its finite capacity limit.
Pause another route or increase the workspace entitlement before retrying.

## Organize proxies with tags

A tag has a name and a color. Tags belong to the active workspace, so all
members see the same classification subject to their role. Another workspace
managing the same underlying proxy route has an independent tag catalog and
cannot see these assignments. Names are unique within a workspace without
regard to capitalization, may contain up to 40 characters, and a managed proxy
can have any number of tags.

Use **Manage tags** from the proxy list, proxy detail, scrape-source proxy list, or import dialog to create, rename, recolor, and delete tags. You can assign several tags:

- inline from any row in the main proxy list
- inline from a scrape source's proxy list
- from an individual proxy's detail page
- to every proxy in an import

Deleting a tag removes that tag from every proxy without deleting the proxies themselves.

## Proxy detail and stats

- `GET /api/proxies/{id}`
- `GET /api/proxies/{id}/statistics?limit=...`
- `GET /api/proxies/{id}/statistics/{statisticId}`

## Delete proxies

`DELETE /api/proxies` supports two body formats:

1. JSON array of IDs: `[1,2,3]`
2. Filter settings object (`scope`, protocol filters, timeout/retries, reputation labels, tag IDs)

## Export proxies

`POST /api/user/export` returns formatted text. The backend sends completed batches
as they become available; the browser saves the file after the whole response
finishes. Exports have a separate five-minute work limit by default, and closing
the request cancels its database work. If the export times out or the connection
is interrupted, retry with a smaller selection. A partial transfer is a failed
export, not a complete file.

Administrators can adjust `PROXY_EXPORT_TIMEOUT_SECONDS` and the frontend's
`EXPORT_PROXY_READ_TIMEOUT_SECONDS` together. See the [environment variable
reference](../reference/environment-variables.md#api-hardening).

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
