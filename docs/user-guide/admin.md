---
description: "Use instance administration safely and distinguish global settings from workspace and deployment configuration."
---

# Admin settings

Instance administrators control how this installation runs. Workspace owners
and operators control how their own resources are checked and used. Check
which scope you are editing before changing a setting.

## Global settings or workspace settings?

| Change | Where it belongs | Who can change it |
| --- | --- | --- |
| Number of checker/scraper workers or the cycle interval | Global checker/scraper pages | Instance administrator. |
| Default and tag-specific protocols, timeout, retries, judges, failure actions | Workspace checker settings | Workspace operator or higher. |
| Workspace members, capacity display, invitations | Workspace page | Role-dependent workspace access. |
| Database, Redis, TLS ingress, secrets, process limits | Deployment configuration | Installation operator. |
| Columns and accent color | Personal display preferences | The signed-in member/browser. |

Global defaults seed new workspace settings. Editing those defaults is not a
replacement for editing existing workspaces' saved checker profiles. In
particular, the global checker timer controls route cycle scheduling; tag rules
do not define separate intervals.

## Change an instance setting

1. Open the relevant global page from the administrator navigation.
2. Inspect the current values and change one related group at a time.
3. Save, then reopen or reload the settings to confirm the saved value.
4. Watch worker activity, queue progress, and database load before increasing
   concurrency again.

Global settings persist in the backend's `data/settings.json`. Keep the
`backend_data` volume across container replacements. Deployment environment
changes follow a different path and normally require container recreation.
See [configuration](../reference/configuration.md) and
[environment variables](../reference/environment-variables.md).

## Manage blacklists

There are two separate controls:

| Control | Matches | Effect |
| --- | --- | --- |
| Proxy IP blacklist | Literal IPv4/IPv6 addresses and CIDR ranges from configured lists | Filters literal IP proxy routes. |
| Website blacklist | Configured website policy for sources, judges, and other URL settings | Rejects blocked URLs and can remove existing blocked workspace relations. |

Hostname proxy routes keep their DNS name as identity. Magpie does not resolve
provider hostnames into stored IP identities for IP blacklist matching,
GeoLite, or AbuseIPDB.

Before tightening website policy, identify affected judges and sources.
A successful policy save can remove their workspace relations and queued source
work. A later policy change does not automatically reconstruct those removed
subscriptions. Add allowed resources again when appropriate.

## Configure enrichment

Use `/plugins/geolite` and `/plugins/abuseipdb` for their integration settings.
These add location or reputation evidence when configured and available.
They do not create a working proxy pool or replace checker validation.
A hostname route can remain without IP enrichment even when its checks succeed.

## API and operating limits

`GET /api/global/settings` reads the current instance configuration;
`POST /api/saveSettings` saves the full `config.Config` object. API clients
should read the current object and preserve fields they are not changing.
A partial global object is different from a partial workspace-settings save.

See the [admin API](../api/rest-admin-and-system.md) for global requeue actions.
Prefer **Check now** on one active route when investigating a problem. A bulk
requeue redistributes waiting work and can change load across the instance.
Use [performance validation](../operations/performance-validation.md) before
making capacity claims from worker-count changes.
