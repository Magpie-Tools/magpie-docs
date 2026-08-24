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
