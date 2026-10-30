---
title: IPGeolocation.io
description: Configure cached IP location, network classification, and optional security intelligence.
---

# IPGeolocation.io

The optional IPGeolocation.io plugin enriches public, literal proxy IPs with
location and network data. Routes with different ports or credentials share
one lookup when they use the same IP. It does not discover usable proxy routes
or replace Magpie's protocol and health checks.

## Configure the plugin

1. As an instance administrator, open **Plugins → IPGeolocation.io**.
2. Enter your API key. A paid provider plan is required for network and company
   classifications. Confirm your plan includes security access before enabling
   **Security intelligence**.
3. Set a **Daily credit budget** and **Cache duration in hours**. Defaults are
   300 credits per UTC day and 168 hours. The plugin starts disabled.
4. Enable the plugin and save. The worker notices configuration changes within
   a minute and respects any existing request deadline.

Basic lookups use the v3 IP Geolocation endpoint and cost 1 credit. Including
security adds 2 credits, for 3 per lookup. Security provides residential-proxy,
VPN, proxy, and Tor observations, plus provider names and confidence when
available. See the provider's [credit rules](https://ipgeolocation.io/documentation/credits-usage.html).
Saving settings does not purchase credits or change the provider subscription.

The daily budget is Magpie's own limit, independent of the provider account's
remaining credits. Magpie reserves credits before each request, records the
provider's `X-Credits-Charged` header, and conservatively counts requests whose
billing outcome is unknown. Explicit unsuccessful HTTP responses release their
reservation. Reservations and request deadlines survive backend restarts.

The settings page shows budget usage, the last request, the next eligible
request, and the latest error. Status refreshes every minute while that page
is open. HTTP 401/403 usually indicates a credential or plan-access issue;
HTTP 429 pauses work according to `Retry-After` when provided.

## Classification and freshness

Known provider classifications replace local estimates while cached. Hosting
maps to **Datacenter**, cellular access to **Mobile**, and explicit residential
or DSL/cable access to **Residential**. An ISP classification alone stays
**ISP**. Unmapped or missing provider fields retain the existing local estimate.
Local GeoLite and reverse-DNS refreshes cannot overwrite a fresh provider value.

Proxy details show the cached provider fields, lookup time, and whether the
cache has expired. Network classification and observed use as a proxy or VPN
are distinct signals. An absent signal displays **Unknown**. A negative proxy
flag does not establish that the route is safe or works with a target service.

Lookups cover the stored route IP. Provider hostnames are not resolved into
enrichment identities, and gateway exit IPs are not inferred. Private,
loopback, link-local, documentation, and other special-use addresses are skipped.
Only IPs currently managed as active proxies are sent to the provider.

Cache policy changes queue renewed lookups as the bounded background discovery
cursor reaches affected routes. The same daily budget and provider backoff still
apply. Disabling stops provider lookups and cache overrides; stored labels may
return to local estimates during later GeoLite refreshes.

## Deployment and load

Upgrade the frontend and all backend replicas together, then run the normal
database migration before enabling the plugin. The migration creates
`ipgeolocation_lookups` and `ipgeolocation_states`. No environment variables or
new services are required. It also adds a composite `(ip_address, id)` index on
`proxies` for bounded shared-IP updates. Building that index can take time on a
large inventory; stop all backend replicas for the coordinated migration.
API keys remain in the protected backend settings
file and are available through the existing administrator settings API.

A single elected worker paces requests across replicas. Existing inventory is
discovered in primary-key pages of 256 routes, at most one page per minute.
Cached results update at most
256 routes per transaction and refresh read models only for changed labels.
First-time enrichment still adds database work; choose a small budget initially.

A limited budget can delay enrichment or renewal beyond the chosen cache
duration. Increase the budget or extend the cache duration to cover a larger
pool; expired results fall back to local estimates until refreshed.

The plugin adds no work to the proxy checker loop, dashboard queries, or proxy
list queries. When enabled, route imports enqueue public IPs in a bounded cache
write, local geo-enrichment batches read the cache, and proxy details read one
cache record. Those operations do not call the provider synchronously.
