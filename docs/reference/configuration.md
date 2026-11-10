# Configuration

Global config is modeled by `config.Config` and persisted in `data/settings.json`.

## Which kind of setting are you changing?

| Kind | Stored in | Examples |
| --- | --- | --- |
| Deployment | Environment, usually supplied through `.env` and Compose | Database/Redis connections, secrets, upload limits. |
| Instance behavior | Backend `data/settings.json` | Worker limits, checker/scraper intervals, blacklist and plugin configuration. |
| Workspace behavior | PostgreSQL workspace settings | Default/tag checker profiles, judges, failure actions. |
| Member display preferences | PostgreSQL member preferences | Selected columns in a workspace's tables. |

This page covers instance behavior. Use [environment variables](environment-variables.md)
for deployment and [checker settings](../user-guide/checker-and-judges.md) for
workspace behavior. The [API and ownership chapter](../backend/api-and-workspaces.md)
explains why these owners differ.

Default values come from `internal/config/default_settings.json` in
`magpie-backend`.

## Top-level sections

- `protocols`
- `checker`
- `scraper`
- `proxy_limits`
- `runtime`
- `plugins`, including `geolite`, `abuseipdb`, and `ipgeolocation`
- `blacklist_timer`
- `blacklist_sources`
- `website_blacklist`

## Example

`plugins.ipgeolocation` has `enabled` (default `false`), `api_key`,
`include_security` (default `false`), `daily_credit_limit` (default `300`,
range 1–100000), and `cache_hours` (default `168`, range 1–720). Security
lookups require a budget of at least 3 credits. See
[IPGeolocation.io](../user-guide/ipgeolocation.md) for billing and freshness.

```json
{
  "protocols": {
    "http": false,
    "https": true,
    "socks4": false,
    "socks5": false
  },
  "checker": {
    "monthly_checks_per_workspace": 1500000,
    "unlimited_monthly_checks": false
  },
  "scraper": {
    "monthly_scrapes_per_workspace": 3000,
    "unlimited_monthly_scrapes": false
  },
  "proxy_limits": {
    "enabled": false,
    "max_per_user": 1000,
    "exclude_admins": true
  }
}
```

## Check and scrape allowances

`checker.monthly_checks_per_workspace` (default `1500000`) and
`scraper.monthly_scrapes_per_workspace` (default `3000`) are the monthly
allowances of every workspace that has none of its own. Magpie derives each
workspace's check and scrape cadence from them, so there is no interval
setting. A missing or `0` value falls back to the default. See
[Check and scrape allowances](../user-guide/workspaces.md#check-and-scrape-allowances).

`checker.unlimited_monthly_checks` and `scraper.unlimited_monthly_scrapes`
(default `false`) remove the default limit. Workspaces that inherit it run at
a fixed interval chosen on their Workspace page, and hourly until they choose
one. A workspace with its own monthly allowance keeps it.

These settings replace `checker.checker_timer` and `scraper.scraper_timer`.
When the backend starts with a settings file that still contains those timers,
it converts them once, keeping the old behavior. Every existing workspace gets
the old timer as its fixed check or scrape interval, and the instance default
becomes unlimited (`unlimited_monthly_checks` and `unlimited_monthly_scrapes`),
because the old timers had no monthly limit. Intervals are raised to the
minimum (one minute for checks, 15 minutes for scrapes) and capped at 31 days.
Workspaces created after the upgrade run hourly until they choose an interval.
To introduce limits later, turn off **No monthly limit** and set allowances.

## Workspace capacity compatibility

`proxy_limits.max_per_user` retains its configuration name for compatibility,
but workspace-capable releases use it to seed the included active-route
capacity of personal and newly created workspaces when limits are enabled.
Memberships do not contribute or pool this allowance. If
`proxy_limits.exclude_admins` applies when an entitlement is created, that
workspace is seeded as unlimited.

This allowance limits active routes. It does not cap stored proxies. Scrape
sources and manual imports retain overflow as paused routes, so the total
proxy count can exceed the active-route limit.

Existing workspace subscription rows are entitlement snapshots. Editing the
global configuration does not turn member allowances into capacity; future
billing and capacity administration should update the workspace entitlement.

## Runtime note

When running without a persistent backend filesystem mount, settings written to `data/settings.json` may not survive container replacement unless explicitly persisted.
