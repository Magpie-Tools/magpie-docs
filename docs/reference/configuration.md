# Configuration

Global config is modeled by `config.Config` and persisted in `data/settings.json`.

Default values come from `internal/config/default_settings.json` in
`magpie-backend`.

## Top-level sections

- `protocols`
- `checker`
- `scraper`
- `proxy_limits`
- `runtime`
- `geolite`
- `blacklist_timer`
- `blacklist_sources`
- `website_blacklist`

## Example

```json
{
  "protocols": {
    "http": false,
    "https": true,
    "socks4": false,
    "socks5": false
  },
  "proxy_limits": {
    "enabled": false,
    "max_per_user": 1000,
    "exclude_admins": true
  }
}
```

## Workspace capacity compatibility

`proxy_limits.max_per_user` retains its configuration name for compatibility,
but workspace-capable releases use it to seed the included active-route
capacity of personal and newly created workspaces when limits are enabled.
Memberships do not contribute or pool this allowance. If
`proxy_limits.exclude_admins` applies when an entitlement is created, that
workspace is seeded as unlimited.

Existing workspace subscription rows are entitlement snapshots. Editing the
global configuration does not turn member allowances into capacity; future
billing and capacity administration should update the workspace entitlement.

## Runtime note

When running without a persistent backend filesystem mount, settings written to `data/settings.json` may not survive container replacement unless explicitly persisted.
