# Alerts

Open **Alerts** in the sidebar to monitor a rotating proxy's upstream pool or your whole workspace. Rules are opt-in. Creating a rule starts evaluation; Magpie does not create rules or send alert messages automatically for existing workspaces.

## Configure delivery

Workspace admins and owners add shared destinations. Operators can attach existing destinations to rules. Viewers can read rules, incidents, and delivery status.

Supported destinations are:

| Channel | Configuration |
| --- | --- |
| Email | One email address, including a shared team mailbox. Requires the installation's existing SMTP sender settings. |
| Slack | An [incoming webhook URL](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/) beginning with `https://hooks.slack.com/services/`, or the GovSlack equivalent. |
| Discord | A [webhook URL](https://docs.discord.com/developers/resources/webhook) beginning with `https://discord.com/api/webhooks/`. |
| Webhook | An HTTPS URL receiving structured JSON. An optional signing secret signs the exact request body. |

Give each destination a recognizable name, such as `Operations mailbox` or `Production Discord`. Saved addresses, webhook URLs, and signing secrets are hidden. When editing, leave the target or secret blank to keep the saved value. The signing-secret checkbox removes a saved secret explicitly. A destination's channel cannot change; create a new destination for a different channel.

Webhook delivery follows Magpie's outbound network policy. Private, loopback, link-local, and reserved addresses are blocked by default, including after DNS resolution. Redirects are rejected. Self-hosted operators can explicitly set `ALLOW_PRIVATE_NETWORK_EGRESS=true` to allow internal destinations and HTTP generic webhooks. That setting also affects other outbound application requests.

Changing or disabling a destination cancels its queued messages. Messages already in transit may finish. Rules can record incidents with no attached destinations.

### Optional chat mentions

Mentions default to **No mention**. Admins and owners can choose one audience on each Discord or Slack destination. It applies to both opening and recovery messages.

| Channel | Mention choices |
| --- | --- |
| Discord | `@here`, `@everyone`, or a role by its numeric ID. Enable Developer Mode in Discord and copy the role ID. |
| Slack | `@here`, `@channel`, `@everyone`, or a user group by its ID, such as `SAZ94GDB8`. The group ID is available in its profile URL. |

Discord notifications depend on the webhook's permissions and the role's mention settings. Slack's `@here` targets active channel members, `@channel` targets the channel, and `@everyone` targets the general channel. See [Discord mentions](https://docs.discord.com/developers/resources/message#allowed-mentions-object) and [Slack mentions](https://docs.slack.dev/messaging/formatting-message-text/#special-mentions) for platform behavior. Rule and workspace names cannot introduce additional pings.

Route counts and thresholds appear as whole numbers in every channel. Discord and Slack messages show native timestamps in the reader's local time, followed by the original ISO timestamp on the next line. Email shows readable UTC time followed by the ISO timestamp, including in the plain-text version.

## Choose a condition

Every rule has one scope, one condition, a threshold, and up to ten destinations. A workspace supports up to 100 rules and 20 destinations.

| Condition | Measurement | Breach |
| --- | --- | --- |
| Usable routes | Whole workspace: active managed routes with successful evidence for any current effective checker protocol. Rotator pool: the exact eligible routes used by that rotator, including its protocol, reputation, and uptime filters. | Count is strictly below the minimum. |
| Checker success rate | Successful attributed checker attempts divided by all attributed attempts in the last 15 minutes. | Percentage is strictly below the minimum. |
| Average successful-check latency | Mean response time of successful attributed checks in the last 15 minutes. Failed requests do not enter the latency average. | Milliseconds are strictly above the maximum. |

For example, set a usable-route minimum of `50` to monitor an operational pool, or `1` to detect an empty pool. Success-rate thresholds accept percentages between 0 and 100. Latency thresholds must be positive and at most 65,535 milliseconds.

### Pool counts and checker measurements

Success rate and latency describe checker attempts, not customer traffic or the routes currently surviving a pool's filters. Whole-workspace rules combine its attributed protocols and transports. Rotator rules measure that workspace's checks for the upstream protocol over TCP. Two rotators with the same upstream protocol share these checker measurements even when their reputation or uptime filters differ.

Failures remain in the window after a managed route is paused or deleted. History uses the verdict attributed to this workspace, not another workspace's validation or a shared physical request's overall verdict. Historical attempts from previous checker settings still belong to the window. Unattributed legacy records do not count as alert samples. Physical orphan cleanup retains routes with recent check history until the 15-minute window has passed.

Usable counts use current effective checker settings, just as rotation does. They do not introduce a new expiry rule into rotation. A count is unknown if active routes have no applicable current evidence from the last 15 minutes, or while checker settings are being applied. A workspace with no active routes has a known usable count of zero.

## Follow an incident

Magpie evaluates enabled rules every minute. A breach must remain observed for two minutes before opening an incident. Recovery likewise requires two healthy minutes. Missing data and gaps in evaluation interrupt either timer.

Magpie evaluates a workspace's rules together and shares repeated measurements. If a pass reaches its deadline, workspaces that have waited longer go first on the next pass. A failed or interrupted attempt does not count toward the two-minute timer.

Success-rate rules need at least 20 attributed attempts in the window. Latency rules need at least 20 successful attempts. Too few samples, missing current evidence, unapplied checker settings, and measurement-query failures produce **Unknown**. Unknown neither opens a threshold incident nor reports recovery for an open one.

An incident sends one opening message and one recovery message to its enabled destinations. There are no recurring reminders. Delivery attempts may retry; they are separate from repeated incident notifications.

Editing, disabling, or deleting a rule closes its open incident as **Configuration changed** and cancels unsent messages. Deleting a monitored rotator also disables its rules and closes their incidents. These closures do not send a recovery message. Saving an edited rule starts evaluation again, so a continuing breach can open a new incident after two minutes.

The history lists opening and closing measurements, timestamps, destinations, and delivery outcomes. Closed incidents are retained for 90 days after closing; open incidents remain stored. Use **Older incidents** to page through history.

Rules and history remain available when rotator details cannot load. The page shows the rotator ID until its name is available and keeps the selected pool when editing a rule. Use **Retry rotator details** to reload names independently, or **Refresh** to reload alerts and scope details together. Automatic refreshes and history pagination reuse scope details.

## Delivery status

Messages move through `pending`, `processing`, and `sent`. Temporary failures retry with increasing delays, for at most four attempts. Webhook rate limits respect `Retry-After`, capped at 30 minutes. Permanent webhook errors fail immediately. A missing SMTP configuration appears as a delivery error while the incident itself remains recorded.

Each backend instance sends up to ten messages concurrently and keeps draining queued messages as sends finish. A slow receiver occupies one worker slot. When no messages are eligible, the worker checks again every five seconds.

Opening and recovery messages are ordered for each incident and destination. After fixing a destination or sender configuration, an admin can retry the latest failed message if the destination is enabled and the rule has not changed. An older opening cannot be retried once a newer recovery message exists.

Delivery is at least once. A crash after the receiver accepts a message but before Magpie records success can produce a duplicate. Generic webhook receivers should deduplicate using `X-Magpie-Delivery-ID`.

## Generic webhook payload

```json
{
  "version": 1,
  "incident_id": 42,
  "workspace_id": 7,
  "workspace_name": "Production",
  "rule_id": 12,
  "rule_name": "Minimum usable routes",
  "scope_name": "Production HTTP pool",
  "rotator_id": 12,
  "measurement_scope": "current_routing_eligibility",
  "protocol": "http",
  "metric": "usable_routes",
  "threshold": 50,
  "value": 18,
  "event": "opened",
  "occurred_at": "2026-10-09T12:00:00Z"
}
```

`event` is `opened` or `recovered`. `rotator_id` is null for whole-workspace rules. `measurement_scope` is `current_routing_eligibility` for usable counts, `workspace_checks` for whole-workspace checker metrics, or `workspace_protocol_tcp_checks` for rotator checker metrics. Rotator events also identify their upstream `protocol`.

For signed destinations, verify `X-Magpie-Signature` as `sha256=` followed by the lowercase hexadecimal HMAC-SHA256 of the exact raw body, using the configured secret. Use a constant-time comparison. Headers also include `Content-Type: application/json` and `X-Magpie-Delivery-ID`.

See [Alerts API](../api/rest-alerts.md) for rule and destination management.
