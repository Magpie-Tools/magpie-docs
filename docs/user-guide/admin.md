# Admin Settings

Admin APIs allow editing global runtime configuration.

## Endpoints

- `GET /api/global/settings`
- `POST /api/saveSettings`

## Scope of global settings

- protocol defaults for new users
- checker timers and judge config
- scraper timers and robots behavior
- per-user proxy limit policy
- GeoLite updater config
- blacklist sources and website blacklist

Proxy blacklist sources may contain individual IPv4 or IPv6 addresses and CIDR ranges for either family. These lists apply only to literal IP proxy routes. Magpie does not resolve provider hostnames for blacklist matching because their DNS answers may change.

## Website blacklist effects

Updating website blacklist can:

- reject blocked judge/source URLs in future saves
- remove blocked user judge/source relations
- purge queued blocked scrape sources

Use caution when tightening blacklist rules on existing deployments.
