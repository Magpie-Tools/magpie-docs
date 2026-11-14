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
| Number of checker/scraper workers and the default monthly check and scrape allowances | Global checker/scraper pages | Instance administrator. |
| One workspace's own monthly allowances | `PUT /api/global/workspaces/{id}/allowances`, or the Workspace page for workspaces you belong to | Instance administrator. |
| Default and tag-specific protocols, timeout, retries, judges, failure actions | Workspace checker settings | Workspace operator or higher. |
| Workspace members, capacity display, invitations | Workspace page | Role-dependent workspace access. |
| Database, Redis, TLS ingress, secrets, process limits | Deployment configuration | Installation operator. |
| Columns and accent color | Personal display preferences | The signed-in member/browser. |

Global defaults seed new workspace settings. Editing those defaults is not a
replacement for editing existing workspaces' saved checker profiles.

Administrators do not set a check or scrape interval. They set how many checks
and scrapes a workspace may use per month. Magpie derives each workspace's
cadence from that, unless the workspace's operators choose a fixed interval,
which then runs until the allowance is used up (see
[Check and scrape allowances](./workspaces.md#check-and-scrape-allowances)).
The instance defaults on the global checker and scraper pages apply to every
workspace without its own allowance. **No monthly limit** removes the default
limit. Those workspaces then run at a fixed interval chosen by their operators,
and hourly until they choose one. On a workspace's own page, the allowance
row has the same **No limit** option for that workspace. Raising a default
speeds up those workspaces within about a minute for new cycles. Routes already
scheduled far ahead are revisited within six hours. Tag rules do not define
separate intervals.

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

Use `/plugins/geolite`, `/plugins/abuseipdb`, and `/plugins/ipgeolocation` for
their integration settings. See [IPGeolocation.io](ipgeolocation.md) for its
shared IP cache, credit budget, and optional security intelligence.
These add location or reputation evidence when configured and available.
They do not create a working proxy pool or replace checker validation.
A hostname route can remain without IP enrichment even when its checks succeed.

## API and operating limits

`GET /api/global/settings` reads the current instance configuration;
`POST /api/saveSettings` saves the full `config.Config` object. API clients
should read the current object and preserve fields they are not changing.
A partial global object is different from a partial workspace-settings save.

See the [admin API](../api/rest-admin-and-system.md) for global requeue actions.
Use **Check now** on one active route when investigating a problem: it checks
that route at once for every workspace that manages it. A bulk requeue does
not force checks. It makes workers revisit every waiting route within a short
time, and a visit checks a route only for workspaces whose scheduled check
has come. This realigns the queue with the current cadences and adds queue
load across the instance while it runs.
Use [performance validation](../operations/performance-validation.md) before
making capacity claims from worker-count changes.
