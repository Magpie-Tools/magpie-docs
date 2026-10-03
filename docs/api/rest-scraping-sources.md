# REST: Scraping Sources

## `GET /api/getScrapingSourcesCount`

Requires viewer or higher. Returns source count for the selected workspace.

## `GET /api/getScrapingSourcesPage/{page}`

Requires viewer or higher. Returns paged source summaries for the selected workspace.

Query parameters:

- `pageSize`: 1–100, defaults to 40.
- `search`: source URL search.
- `protocol`: repeat for multiple protocols, `http` or `https`.
- `proxyCount`, `proxyCountOperator`, `aliveCount`, `aliveCountOperator`: positive count thresholds with `>` or `<`.
- `sortField`: `url`, `proxy_count`, `alive_count`, or `health`.
- `sortOrder`: `asc` or `desc`.

Sorting applies to all matching sources before pagination. Health sorts by the
alive-to-total proxy ratio; sources with no proxies sort before zero-health
sources ascending and after them descending. URL sorting is case-insensitive.
Equal values use source ID ascending for stable pagination. Missing or invalid
sort parameters keep the default newest-added order, with source ID as a tie-breaker.

## `POST /api/scrapingSources`

Requires operator or higher. Uploads sources for the selected workspace from multipart form data.

Accepted form fields:

- `file`
- `scrapeSourceTextarea`
- `clipboardScrapeSources`
- `fetch_mode`: `http` by default, or `browser` for JavaScript rendering. Applies only to newly added workspace associations.
- `auto_tag_ids`: positive IDs from the workspace's tag catalog, repeated or comma-separated. Defaults to no automatic tags and applies the same selection to all newly added source subscriptions.

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
- Re-adding an existing source preserves its fetch mode and automatic tags.
- Invalid tag IDs or tags outside the selected workspace return `400`.
- Saving automatic tags affects future scrape results, including rediscovered proxies, and leaves historical assignments unchanged.

## `DELETE /api/scrapingSources`

Requires operator or higher in the selected workspace.

Request body is an array of scrape source IDs:

```json
[12, 13, 14]
```

Response is a JSON string, for example: `"Deleted 3 scraping sources."`.

Deleting a source subscription removes its automatic-tag configuration and
preserves tags already assigned to managed proxies.

## `GET /api/scrapingSources/{id}`

Requires viewer or higher. Returns detailed source stats for the selected workspace.

The `auto_tags` array contains the source subscription's selected automatic tags:

```json
{"auto_tags": [{"id": 4, "name": "Vendor A", "color": "#0EA5E9"}]}
```

It is an empty array when automatic tagging is disabled.

## `GET /api/scrapingSources/{id}/proxies`

Requires viewer or higher. Returns the selected workspace's paged managed
proxies associated with a source.

Query params:

- `page`
- `pageSize`
- `search`
- same filter params as proxy list:
  - `state`, `status`, `protocol`, `country`, `type`, `anonymity`, `reputation`, `tagId`, `maxTimeout`, `maxRetries`

Rows include the selected workspace's `tags` array. Search matches tag names,
and repeated `tagId` values use ANY matching. Operators can assign tags here.
Source automatic tags add missing assignments during future scrapes without
replacing manual tags or tags from another source.

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
workspace's source settings. Other workspaces using the URL retain their settings.

```json
{"fetch_mode": "browser", "auto_tag_ids": [4, 9]}
```

Both fields are optional, but at least one must be supplied. Accepted
`fetch_mode` values are `http` and `browser`. `auto_tag_ids` must be an array of
positive tag IDs belonging to the workspace. Omitted fields preserve existing
settings; `"auto_tag_ids": []` disables future automatic assignments.

Success returns `200` with the submitted settings. Invalid modes, malformed IDs,
and unavailable or foreign tags return `400`; sources outside the active workspace
return `404`. Settings are saved atomically. Changing the fetch mode clears the
last scrape status and applies on the next scrape; tag-only updates preserve it.

Tag updates do not change existing proxy assignments. Future accepted scrape
results use the current configuration when saved, including for existing,
paused, or archived managed proxies. Tags are additive and may be restored after
manual removal if another scrape observes the route while the rule is configured.
Clearing or changing the selection never removes existing assignments. Deleting
a tag removes its source-rule references and assignments without recreating it.

Source list and detail responses include `fetch_mode`, `last_scraped_at`,
`last_scrape_status`, `last_scrape_error`, and `last_scrape_proxy_count`.
`last_scrape_status` is empty before an attempt, then `success`, `empty`, `error`,
or `blocked`. These fields describe scraping, independently of proxy health.
