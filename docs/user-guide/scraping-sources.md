# Scraping Sources

Scrape sources are websites Magpie crawls to discover proxies.

## Manage sources

- `GET /api/getScrapingSourcesCount`
- `GET /api/getScrapingSourcesPage/{page}`
- `POST /api/scrapingSources`
- `DELETE /api/scrapingSources`
- `GET /api/scrapingSources/{id}`
- `GET /api/scrapingSources/{id}/proxies`

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

Tags belong to the workspace's managed proxy, not to the scrape source.
Automatic scraping does not assign tags, and changing a tag from this table also
changes what every member sees in the main proxy list and proxy detail.

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
