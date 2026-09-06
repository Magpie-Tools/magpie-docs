# GraphQL API

## Endpoint

```text
POST /api/graphql
```

GraphQL uses the same bearer token auth and workspace selection as REST. Send
`X-Workspace-ID`, or omit it to use the account's default membership. Viewer or
higher is required for queries; the settings mutation requires operator or
higher.

## Request envelope

```json
{
  "query": "query { viewer { id email } }",
  "variables": {}
}
```

## Root fields

Current schema exposes workspace-scoped data through:

- `Query.viewer`
- `Mutation.updateUserSettings(input: UpdateUserSettingsInput!)`

## Viewer data

`viewer` includes:

- Identity: account `id`, `email`, and global instance `role`
- Settings: workspace protocol/checker settings, judges, scraping source URLs,
  and per-member/workspace table-column preferences
- Dashboard: counts and breakdowns
- Proxy metrics: `proxyCount`, `proxyLimit`, `proxyHistory`, `proxySnapshots`
- Paged resources: `proxies(page: Int!)`, `scrapeSources(page: Int!)`
- Scrape-source URL helper list: `scrapeSourceUrls`

## Example dashboard query

```graphql
query DashboardData($proxyPage: Int!) {
  viewer {
    dashboard {
      totalChecks
      totalScraped
      reputationBreakdown { good neutral poor unknown }
      countryBreakdown { country count }
    }
    proxyCount
    proxyLimit
    proxies(page: $proxyPage) {
      page
      pageSize
      totalCount
      items {
        id
        ip
        port
        estimatedType
        responseTime
        country
        anonymityLevel
        alive
        latestCheck
        state
        pauseReason
        tags { id name color }
      }
    }
    proxyHistory(limit: 168) { count recordedAt }
    proxySnapshots(limit: 168) {
      alive { count recordedAt }
      scraped { count recordedAt }
    }
    scrapeSourceCount
  }
}
```

## Update settings mutation

```graphql
mutation Update($input: UpdateUserSettingsInput!) {
  updateUserSettings(input: $input) {
    httpProtocol
    httpsProtocol
    socks4Protocol
    socks5Protocol
    timeout
    retries
    useHttpsForSocks
    autoRemoveFailingProxies
    autoRemoveFailureThreshold
    judges { url regex }
    scrapingSources
    proxyListColumns
    scrapeSourceProxyColumns
    scrapeSourceListColumns
  }
}
```

Input fields are optional. Supported fields include the checker booleans,
`timeout`, `retries`, `autoRemoveFailureThreshold`, `judges`, and column-list
arrays. Omitted fields retain their current values.

- `timeout` accepts integers from `0` to `65535`.
- `retries` and `autoRemoveFailureThreshold` accept integers from `0` to `255`.
- Values outside these ranges are rejected before settings are saved.
- Judge changes refresh the checker cache and are broadcast to other backend
  instances. Blocked judge websites are rejected, as in REST.
- `scrapingSources` is a response field only. Manage sources through the REST
  scrape-source endpoints. The previously accepted, no-op `scrapingSources`
  mutation input has been removed; clients must omit it from mutation variables.

The mutation saves settings for the selected workspace, despite the legacy
`updateUserSettings` name.

## Query guardrails

GraphQL requests are validated before execution:

- Max query bytes: `GRAPHQL_MAX_QUERY_BYTES` (default `16384`)
- Max depth: `GRAPHQL_MAX_DEPTH` (default `12`)
- Max field count: `GRAPHQL_MAX_FIELDS` (default `250`)
- Introspection disabled by default unless `GRAPHQL_ALLOW_INTROSPECTION=true`

Violations return HTTP `400` or `413` with `{"error": ...}`.

## Error format

GraphQL resolver errors follow standard GraphQL response shape:

```json
{
  "errors": [
    {"message": "unauthenticated"}
  ]
}
```
