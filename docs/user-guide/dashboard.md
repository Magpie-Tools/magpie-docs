# Dashboard

Open `/dashboard` to see the selected workspace's totals and trends. Confirm
the workspace in the top bar before comparing numbers with another member.
An empty dashboard on a new installation is expected until routes and checks
have been recorded.

## Read the measurements

| Measurement | What to use it for | What it does not prove |
| --- | --- | --- |
| Proxy inventory | Understand how much the workspace stores. | Total stored proxies are not all active or usable by a rotator. |
| Check totals and weekly aggregates | Follow checker activity over time. | A check result is not a request made by your application. |
| Proxy history and snapshots | Compare inventory and health trends. | An older snapshot does not define a route's current health. |
| Reputation breakdown | See how recorded quality evidence is distributed. | A good label does not replace a successful current check. |
| Country breakdown | Inspect location data when enrichment is available. | Hostname routes do not acquire IP enrichment just because DNS resolves. |
| Judge quality breakdown | Investigate a test destination that fails across routes. | A failed judge check alone cannot identify whether the judge or proxy caused it. |

Active, paused, and archived are lifecycle states. Alive, dead, and unknown
describe health under the workspace's current checker settings. Use the
workspace page for active capacity and a rotator's usable count for its
eligible pool. These numbers answer different questions.

## Investigate a change

If a healthy pool suddenly shrinks:

1. Check whether you switched workspaces or changed checker settings.
2. Open a few affected route details and compare current attributed results
   with their older history.
3. Inspect judges and shared request errors if many routes fail together.
4. Compare rotator filters and lifecycle state if routes look healthy but
   disappear from a pool.

History and latest evidence commit together. Dashboard caches, source counts,
and reputation refresh afterward, so brief differences are possible. For a
growing delay, use [observe and troubleshoot](../learn/observe-and-troubleshoot.md)
and [results and storage](../backend/results-and-storage.md).

Successful dashboard cache hits are at most 30 seconds old. The first read
after startup or an idle period, and any expired read, loads current data
before responding and can take longer. Concurrent readers share that refresh.
The background timer keeps only recently requested components warm for two
minutes after their last read. The info summary, recent checks and fastest
routes are tracked separately. Refreshing one does not warm the others.
Opening a browser tab does not by itself keep these entries warm; the page
loads on entry and manual refresh. Historical daily-counter backfill for an
unread workspace waits until its dashboard counts are requested.

## Data sources

- REST: `GET /api/getDashboardInfo`
- GraphQL: `viewer.dashboard`, `viewer.proxyHistory`, `viewer.proxySnapshots`

For a guided first result, follow [your first proxy workflow](../learn/first-proxy.md).
