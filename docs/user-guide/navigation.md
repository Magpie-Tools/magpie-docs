---
description: "Find each Magpie screen by task and understand which workspace and administrator permissions it needs."
---

# Find your way around Magpie

The top-bar workspace selector determines which proxies, sources, settings,
rotators, and alerts you see. Check it first when a list looks empty or another
member sees different data. Your account and invitation inbox span workspaces.

Open the bell in the top right to see your five most recent notifications,
newest first. It combines pending workspace invitations, incidents in the
selected workspace, and Magpie releases. The order uses the invitation's creation
time, the incident's opening time, or the release's publication time.

The badge counts unread items among those five notifications. Unread rows have a
dot and stronger text. Selecting a notification marks only that event as read;
opening the menu or using its footer links does not mark events as read. Read
items stay in their original time order.

Read status belongs to your account and is saved on the server, so it survives
sign-out, restarts, and use in another browser. The menu checks it when opened or
refreshed and when you return to the browser. Reading an invitation does not
accept it, and reading an alert does not close the incident.

The releases page uses the same account read status. Opening release notes marks
that release as read, and **Mark all as read** marks the releases shown in the
archive without marking invitations or alerts.

Select an item to open the invitation inbox, alert history, or that release's
notes. Invitation and alert notifications scroll to the matching invitation or
incident and highlight it for three seconds. **Workspace invitations** stays available at the bottom of the menu,
even when invitations are outside the latest five. The menu refreshes when you
open it; use its refresh button to check again while it is open.

## Choose a page by task

The paths below belong to the application, for example
`http://localhost:5050/proxies`. The linked guides explain each task.

| You want to… | Application page | Guide |
| --- | --- | --- |
| Read totals and trends | `/dashboard` | [Dashboard](dashboard.md) |
| Import or organize proxy routes | `/proxies`, `/addProxies` | [Managing proxies](proxies.md) |
| Inspect one route and its check history | `/proxies/:id` | [First proxy workflow](../learn/first-proxy.md) |
| Discover proxies from webpages | `/scraper`, `/scraper/:id` | [Scrape sources](scraping-sources.md) |
| Choose protocols, timeouts, and tag rules | `/checker/settings` | [Checker settings](checker-and-judges.md) |
| Configure the URLs used to test proxies | `/checker/judges` | [Judges](checker-and-judges.md#judge-notes) |
| Give your application a proxy listener | `/rotating` | [Rotating proxies](rotating-proxies.md) |
| Monitor a workspace or rotator pool | `/alerts` | [Alerts](alerts.md) |
| Inspect capacity or manage members | `/workspace` | [Workspaces](workspaces.md) |
| Accept an offer to join a workspace | `/invitations` | [Invitations](workspaces.md#invitations) |
| Change your password or browser accent | `/account` | [Account](account.md) |
| Read release and build information | `/notifications` | [Updating](../getting-started/updating.md) |

`:id` means a resource ID. Open a row's details to reach that page rather than
entering the literal text `:id` in the address bar.

## The usual daily workflow

1. Select the workspace you intend to operate.
2. Check its dashboard for a trend worth investigating.
3. Open affected proxies or sources and inspect their latest evidence.
4. Change the relevant workspace setting, then wait for new applicable checks.
5. Confirm the usable pool on the rotator your application actually uses.

The [diagnostic workflow](../learn/observe-and-troubleshoot.md) helps you find
which stage needs attention. Refreshing the dashboard repeatedly does not
force a new proxy check.

## Pages for instance administrators

| Page | Changes |
| --- | --- |
| `/global/checker` | Instance worker limits, cycle intervals, and defaults. |
| `/global/scraper` | Instance scraping limits, interval, and robots policy. |
| `/global/blacklist` | IP blacklist sources and blocked website policy. |
| `/plugins` | Enrichment integrations. |
| `/plugins/geolite` | GeoLite configuration. |
| `/plugins/abuseipdb` | AbuseIPDB configuration. |
| `/plugins/ipgeolocation` | IPGeolocation.io credentials, cache policy, and credit budget. |

These pages require the global account `admin` role. A workspace owner does
not automatically become an instance administrator. Conversely, an instance
administrator still needs workspace membership to read its resources.
See [admin settings](admin.md).

If a control is missing or disabled, inspect your workspace role and the
resource's lifecycle before treating it as a loading failure. Viewers can
read resources; operators and higher can operate them.
