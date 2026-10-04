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
    checkerSettings {
      defaults { protocols transport timeout retries }
      rules { tagId mode protocols transport timeout retries }
    }
    httpProtocol
    httpsProtocol
    socks4Protocol
    socks5Protocol
    timeout
    retries
    useHttpsForSocks
    autoRemoveFailingProxies
    autoRemoveFailureThreshold
    failureAction
    judges { url regex }
    scrapingSources
    proxyListColumns
    scrapeSourceProxyColumns
    scrapeSourceListColumns
  }
}
```

Input fields are optional. Supported fields include the checker booleans,
`timeout`, `retries`, `autoRemoveFailureThreshold`, `failureAction`, `judges`, and column-list
arrays. Omitted fields retain their current values.

- `timeout` accepts integers from `0` to `65535`.
- `retries` and `autoRemoveFailureThreshold` accept integers from `0` to `255`.
- Values outside these ranges are rejected before settings are saved.
- `failureAction` accepts `"pause"` or `"delete"`, with `"pause"` as the default.
  Omitted or empty values preserve the stored choice. Unsupported values are
  rejected before any settings are saved. `autoRemoveFailingProxies` enables
  the selected action. See [automatic failure action](../user-guide/checker-and-judges.md#automatic-failure-action)
  for deletion scope, rediscovery, and startup behavior.
- Judge changes refresh the checker cache and are broadcast to other backend
  instances. Blocked judge websites are rejected, as in REST.
- `scrapingSources` is a response field only. Manage sources through the REST
  scrape-source endpoints. The previously accepted, no-op `scrapingSources`
  mutation input has been removed; clients must omit it from mutation variables.

The mutation saves settings for the selected workspace, despite the legacy
`updateUserSettings` name.

Proxy list items expose `healthKnown`. When false, `alive: false` means the
current configuration has no applicable evidence, not a confirmed failure.

## Tag checker settings

`UpdateUserSettingsInput.checkerSettings` accepts the same behavior as REST,
using lists for protocols and GraphQL IDs for tags:

```json
{
  "input": {
    "checkerSettings": {
      "defaults": {"protocols": ["socks5"], "transport": "tcp", "timeout": 7500, "retries": 2},
      "rules": [
        {"tagId": "42", "mode": "add", "protocols": ["http"], "timeout": 5000, "retries": 0}
      ]
    }
  }
}
```

Providing this field saves Default and rules atomically. Default requires a
protocol-name list and shared transport, timeout, and retries. The rules list is
highest priority first. Omitted or `null` rule fields inherit independently.
Explicit fields apply to every enabled protocol. Remove rules contain only tag
identity, mode, and protocol names. Timeouts accept 1–65535 ms and retries accept
0–255. Validation, including all reachable tag combinations, and workspace tag
ownership checks are shared with REST. Omitting `checkerSettings` preserves rules.

`viewer.settings.checkerSettings` and the settings mutation response expose the
same shared profile objects. See
[Default and tag settings](../user-guide/checker-and-judges.md#default-and-tag-settings)
for merging, inheritance, and health behavior.

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
