# FAQ

## Where should I start if I have never used a proxy manager?

Follow [Learn Magpie in an afternoon](learn/index.md). It introduces the parts,
walks through one route, then explains automation and troubleshooting. The
[backend section](backend/index.md) continues into the implementation.

## Does installing Magpie give me a working proxy pool?

Magpie manages routes you import or discover from sources. Installation does
not supply a guaranteed working pool. Use your own allowed proxy for the
[first live workflow](learn/first-proxy.md). Development fixtures provide
simulated UI data and do not run live checking or rotation.

## Which address should my application connect to?

Use the allocated listener host and port shown for your rotating proxy.
`5050` serves the dashboard and `5656` serves the API. They are separate from
the proxy listener ports, which default to the range `20000-20100` in Compose.
See [the first curl request](learn/first-proxy.md#5-create-a-rotating-listener).

## Why is an active proxy not alive yet?

Active means the workspace manages it actively. Health needs applicable
committed check evidence. Unknown can mean a scheduled check has not run,
no eligible judge/protocol exists, or settings changed and need new evidence.
Use the [diagnostic workflow](learn/observe-and-troubleshoot.md).

## Is Magpie multi-user?

Yes. Accounts join workspaces through memberships with owner, admin, operator,
or viewer roles. Workspaces own the operational resources and capacity.
See [workspaces](user-guide/workspaces.md).

## How is the first admin created?

Default local behavior: first registered user becomes admin.

Production-oriented deployments may disable public registration and require a controlled bootstrap window (`ENABLE_PUBLIC_FIRST_ADMIN_BOOTSTRAP`).

## Which proxy protocols are supported?

HTTP, HTTPS, SOCKS4, and SOCKS5 for proxy protocol. Listener transport supports TCP, QUIC, and HTTP/3 where applicable.

## Are IPv6 proxies supported?

Yes for manual import, storage, checking, filtering, blacklists, export, and rotating proxies. Use `[2001:db8::1]:8080` when an IPv6 address includes a port. Proxy scraping is still IPv4-only.

## Are proxy provider hostnames supported?

Yes. Manual imports accept entries such as `gateway.provider.example:8080`, including the same credential forms as IP routes. The hostname remains the route identity when DNS answers change. Checking, search, export, and rotating proxies support it. IP blacklists, GeoLite, and AbuseIPDB do not resolve hostname routes, and scraping remains IPv4-only.

## Does Magpie support both REST and GraphQL?

Yes. REST endpoints are under `/api/*` and GraphQL is at `/api/graphql`.

## What happens if I lose `PROXY_ENCRYPTION_KEY`?

Previously encrypted proxy secrets cannot be decrypted. Store this key securely and keep backups.

## Are proxy hosts encrypted in PostgreSQL?

No. PostgreSQL stores the canonical proxy host in plaintext and keeps a native
`inet` projection for literal IP routes so Magpie can run subnet and blacklist
range queries. Proxy usernames and passwords use application-level encryption.
Protect proxy hosts through database access controls, private networking, and
encrypted storage and backups.

## Are proxy credentials encrypted in Redis?

Not by default. The checker reads and reschedules millions of proxy routes, and
per-check encryption and decryption materially reduces throughput. Keep Redis
private with authentication, restricted ACLs, encrypted storage, and protected
backups. Set `PROXY_QUEUE_ENCRYPT_CREDENTIALS=true` only if that security tradeoff
fits your measured workload.

## Can I filter rotating proxies by reputation?

Yes. Rotating proxy definitions accept `reputation_labels` (`good`, `neutral`, `poor`) used during upstream selection.
