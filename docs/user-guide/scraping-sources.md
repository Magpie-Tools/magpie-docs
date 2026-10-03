# Scraping Sources

Scrape sources are webpage URLs Magpie fetches to discover proxies.

## Manage sources

- `GET /api/getScrapingSourcesCount`
- `GET /api/getScrapingSourcesPage/{page}`
- `POST /api/scrapingSources`
- `DELETE /api/scrapingSources`
- `GET /api/scrapingSources/{id}`
- `PATCH /api/scrapingSources/{id}`
- `GET /api/scrapingSources/{id}/proxies`

## Table actions

Click the URL, proxy count, alive count, or health column header to sort all
matching sources across pages. Click again to reverse the order, then a third
time to restore the default newest-added order. Changing the
sort returns to the first page. A thin progress bar appears while the existing
rows dim until the updated results arrive.

Use the ellipsis in the **Actions** column to view source details or copy its URL.
Administrators can also choose **Scrape now**. **Check robots.txt** is available
when respecting robots.txt is enabled. Pending actions are disabled until the
request completes.

Select **Actions (buttons)** in **Columns** to show the previous inline Details
button. The separate **Scrape Now** and **Robots Check** columns remain available.
**Robots Check** is hidden by default; saved column selections are preserved.
The inline-actions preference requires matching frontend and backend releases.

## Add sources input

`POST /api/scrapingSources` accepts multipart content from:

- `file`
- `scrapeSourceTextarea`
- `clipboardScrapeSources`

## Organize scraped proxies

Open a source to see its related proxies. The table shows the active workspace's
proxy tags and lets operators change them inline, search by tag name, and filter
by one or more tags. Selecting several tags matches proxies with any selected
tag.

Tags belong to the workspace's managed proxy. Changing a tag from this table also
changes what every member sees in the main proxy list and proxy detail.

## Automatically tag proxies from a source

Choose **Automatic tags** when adding sources or on a source's detail page.
You can select several existing workspace tags or open **Manage tags** to create
them. Operators, admins, and owners can change this setting; viewers can read it.

Future scrapes add any missing selected tags to every accepted proxy they save,
including proxies already managed by the workspace. Existing manual tags and
tags from other sources stay in place. Saving the setting does not tag historical
source results. Paused proxies receive tags too, and tagging does not require a
successful health check or change a proxy's lifecycle state.

If you manually remove a configured tag from a proxy, a later scrape that finds
that proxy adds it again. Clear the source's automatic tag selection to stop
future assignments. Clearing or changing the selection, or removing the source,
leaves existing proxy tags in place. Deleting a tag removes it from proxies and
source rules; scrapes do not recreate it.

When adding several sources at once, all newly added sources receive the same
selection. Re-adding an existing source preserves its settings. Each workspace
has its own source rules, even when workspaces use the same URL. Results use the
current saved selection when processed, including changes made during a running
scrape.

## Robots check

Use these endpoints before enabling a source:

- `GET /api/scrapingSources/check?url=...`
- `GET /api/scrapingSources/respectRobots`

## Blacklist interaction

If a source URL is present in website blacklist, save/check requests return validation errors.

## Choose how a source is fetched

Leave **Requires JavaScript** off for raw proxy lists and static HTML pages.
Magpie fetches these sources over HTTP, with lower memory and CPU use.

Enable it for pages that need JavaScript to populate their proxy list. Magpie
renders those sources in Chromium. You can choose the setting when adding a
batch of sources or change it in an individual source's detail page. Changes
apply to the active workspace on the next scrape. Re-importing an existing
source does not overwrite its setting.

Existing sources keep browser rendering when you upgrade. Switch static
sources to HTTP to reduce browser work. JavaScript sources do not silently fall
back to unrendered HTML when rendering fails.

## Understand scrape status

The list and detail page show the last scrape outcome:

- **Waiting for scrape**: no completed attempt in the current mode.
- **Scraped**: the scrape found allowed proxies and processed them.
- **No proxies found**: fetching succeeded but extraction produced no allowed proxies.
- **Scrape failed**: fetching or processing failed. The detail page shows the error.
- **Blocked by robots.txt**: the source disallowed scraping while robots checks were enabled.

The timestamp is the start time of the attempt whose result is shown. Proxy
health is separate: **No data** in a health bar does not mean that fetching failed.

New sources enter the queue immediately. Browser outages, exhausted browser
capacity, timeouts, HTTP 429 and HTTP 5xx retry after 30 seconds or the configured
scrape interval, whichever is shorter. Other failures wait for the normal interval.
