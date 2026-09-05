# REST: Scraping Sources

## `GET /api/getScrapingSourcesCount`

Requires viewer or higher. Returns source count for the selected workspace.

## `GET /api/getScrapingSourcesPage/{page}`

Requires viewer or higher. Returns paged source summaries for the selected workspace.

## `POST /api/scrapingSources`

Requires operator or higher. Uploads sources for the selected workspace from multipart form data.

Accepted form fields:

- `file`
- `scrapeSourceTextarea`
- `clipboardScrapeSources`
- `fetch_mode`: `http` by default, or `browser` for JavaScript rendering. Applies only to newly added workspace associations.

Success (`200`):

```json
{"sourceCount": 18}
```

Rejected sources return `400` with details for blocked and/or unsafe targets:

```json
{
  "error": "One or more scrape sources are not allowed",
  "blocked_sources": ["https://blocked.example/list.txt"],
  "unsafe_sources": ["http://127.0.0.1/internal"],
  "websiteBlacklist": ["blocked.example"]
}
```

Notes:

- Oversized uploads return `413`.
- If sources are saved but queueing fails, backend rolls back and returns `503`.

## `DELETE /api/scrapingSources`

Requires operator or higher in the selected workspace.

Request body is an array of scrape source IDs:

```json
[12, 13, 14]
```

Response is a JSON string, for example: `"Deleted 3 scraping sources."`.

## `GET /api/scrapingSources/{id}`

Requires viewer or higher. Returns detailed source stats for the selected workspace.

## `GET /api/scrapingSources/{id}/proxies`

Requires viewer or higher. Returns the selected workspace's paged managed
proxies associated with a source.

Query params:

- `page`
- `pageSize`
- `search`
- same filter params as proxy list:
  - `status`, `protocol`, `country`, `type`, `anonymity`, `reputation`, `tagId`, `maxTimeout`, `maxRetries`

Rows include the selected workspace's `tags` array. Search matches tag names,
and repeated `tagId` values use ANY matching. Operators can assign tags here
even though automatic scraping itself does not assign tags.

## `GET /api/scrapingSources/check?url=...`

Requires viewer or higher. Checks `robots.txt` allowance.

Response:

```json
{
  "allowed": true,
  "robots_found": true,
  "error": ""
}
```

## `GET /api/scrapingSources/respectRobots`

Requires viewer or higher.

Response:

```json
{
  "respect_robots_txt": true
}
```

## `PATCH /api/scrapingSources/{id}`

Requires operator or higher in the active workspace. Updates only that
workspace's source setting. Other workspaces using the URL retain their settings.

```json
{"fetch_mode": "browser"}
```

Accepted values are `http` and `browser`. Success returns `200` with the saved
`fetch_mode`. Invalid modes return `400`; sources outside the active workspace
return `404`. The last scrape status clears when settings are saved, and the
new mode applies on the next scrape.

Source list and detail responses include `fetch_mode`, `last_scraped_at`,
`last_scrape_status`, `last_scrape_error`, and `last_scrape_proxy_count`.
`last_scrape_status` is empty before an attempt, then `success`, `empty`, `error`,
or `blocked`. These fields describe scraping, independently of proxy health.
