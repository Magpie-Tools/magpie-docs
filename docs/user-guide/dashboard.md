# Dashboard

Open `/dashboard` to see the selected workspace's totals and trends. Confirm
the workspace in the top bar before comparing numbers with another member.
An empty dashboard on a new installation is expected until routes and checks
have been recorded.

## Read the measurements

| Measurement | What to use it for | What it does not prove |
| --- | --- | --- |
| Proxy inventory | Understand how much the workspace stores. | Total stored proxies are not all active or usable by a rotator. |
| Checks this month and total checks | Follow the check requests charged to the workspace, retries included. "Checks this month" is the allowance period. | A check is not a request made by your application. |
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

History and latest evidence commit together. Dashboard snapshots, source
counts, and reputation refresh afterward, so brief differences are possible.
For a growing delay, use [observe and troubleshoot](../learn/observe-and-troubleshoot.md)
and [results and storage](../backend/results-and-storage.md).

## How current the dashboard is

The dashboard comes from a snapshot that the backend stores in PostgreSQL and
shares across backend instances. The header shows when the snapshot's data was
collected and, when it is not current, its state:

| State | Meaning |
| --- | --- |
| No label | The snapshot was published in the last 30 seconds, or during this page load. |
| Not current | The snapshot is up to ten minutes old, or the last rebuild failed while older data is still valid. A rebuild runs when one is allowed. |
| Updating | No valid snapshot yet, or a rebuild is running. The page asks again every few seconds for up to a minute. Parts without data show a dash. |
| Update failed | The last rebuild failed and nothing valid is stored. The next rebuild is retried with a growing delay of up to ten minutes. |

A page load that finds an old snapshot starts one rebuild and waits up to two
seconds for it. Each workspace is rebuilt at most once every 30 seconds across
all instances, and a workspace nobody views is never rebuilt.

After a change to checker settings, health figures (alive routes, recent
checks, fastest routes and the judge breakdown) stay empty while the change is
being applied, and the header says so. Health computed under earlier settings
is never shown. Inventory figures stay visible.

"Checks this month" and "Total checks" are read live from the usage meter on
every load. "Checks this month" uses the same count as the workspace
allowance; the workspace page can run up to about a minute ahead because it
also counts usage not yet written. "Total checks" adds the best available
count for each month since the workspace was created: the checker's metered
requests where they exist, and the statistics count for earlier months.

## Data sources

- GraphQL: `viewer.dashboardView`, `viewer.proxyHistory`, `viewer.proxySnapshots`

For a guided first result, follow [your first proxy workflow](../learn/first-proxy.md).
