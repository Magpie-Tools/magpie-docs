# Alerts API

Alert resources belong to the active workspace selected through `X-Workspace-ID` or the account's default membership. Global administrator status alone does not grant workspace access.

| Endpoint | Minimum workspace role |
| --- | --- |
| `GET /api/alerts` | Viewer |
| `GET /api/alerts/rotators` | Viewer |
| `POST /api/alerts/rules` | Operator |
| `PUT /api/alerts/rules/{id}` | Operator |
| `DELETE /api/alerts/rules/{id}` | Operator |
| `POST /api/alerts/destinations` | Admin |
| `PUT /api/alerts/destinations/{id}` | Admin |
| `DELETE /api/alerts/destinations/{id}` | Admin |
| `POST /api/alerts/deliveries/{id}/retry` | Admin |

## Read rules and history

`GET /api/alerts` returns `rules`, `destinations`, `incidents`, `deliveries`, and `next_cursor`. Each page contains the most recent 50 incidents in descending ID order and their delivery records. Pass `?before={next_cursor}` for older incidents. A zero cursor indicates the end; a final full page may return a cursor followed by an empty page.

Rules include `revision`, `status`, `last_value`, `sample_count`, `last_evaluated_at`, `breach_since`, `recovery_since`, and `active_incident_id`. A null value means no current measurement. Status is `healthy`, `breaching`, `unknown`, or `disabled`. An active incident can remain open while status is unknown or while a recovery timer is running. Incidents record the `rule_revision` that opened them.

Destination responses contain `id`, `name`, `kind`, `enabled`, `target_configured`, `signing_configured`, `mention_mode`, and `mention_id`. Targets and signing secrets are write-only. Mention IDs are configuration metadata. Delivery records expose status and a sanitized error, never the target or stored payload.

`GET /api/alerts/rotators` returns an array of scope metadata for this workspace, such as `[{"id":12,"name":"Production HTTP pool","protocol":"http"}]`. It selects only IDs, names, and upstream protocols. It does not calculate pool counts or read rotator credentials. The alert page loads this metadata independently and reuses it while refreshing or paging through alert history.

## Save a rule

POST creates a rule; PUT replaces its configuration.

```json
{
  "name": "Minimum usable routes",
  "rotator_id": 12,
  "metric": "usable_routes",
  "threshold": 50,
  "enabled": true,
  "destination_ids": [3, 4]
}
```

Use `rotator_id: null` for the whole workspace. The rotator and all destinations must belong to the same workspace. Supported metrics are `usable_routes`, `success_rate`, and `latency_ms`. Threshold is required; names must be nonempty and at most 120 UTF-8 bytes. Route thresholds are whole numbers from 1 to 1,000,000,000, success-rate thresholds are 0 to 100, and latency thresholds are positive and at most 65,535 milliseconds.

Deleting a destination leaves its ID in existing rules for historical reference. Omit that ID when editing a rule. Deleting a rotator disables its associated rules; change their scope or delete them before enabling again.

Rule edits and deletion close existing incidents as `configuration_changed`, cancel queued messages, and reset evaluation. DELETE retains incident history. Timing, sample minimums, and retention follow the fixed [alert policy](../user-guide/alerts.md).

## Save a destination

```json
{
  "name": "Operations webhook",
  "kind": "webhook",
  "enabled": true,
  "target": "https://ops.example.com/magpie-alerts",
  "signing_secret": "your-shared-secret"
}
```

Kinds are `email`, `slack`, `discord`, or `webhook`. Create requires `target`; update may omit it to retain the stored target. `signing_secret` applies only to generic webhooks. Omit it to retain the existing value, or send an empty string to clear it. Targets and secrets are at most 4096 bytes; an email target must be one plain address of at most 254 bytes. Channel kind cannot change on update.

Optional `mention_mode` defaults to `none`. Discord accepts `none`, `here`, `everyone`, and `role`. Slack accepts `none`, `here`, `channel`, `everyone`, and `user_group`. For `role`, set `mention_id` to the numeric Discord role ID as a string. For `user_group`, use a Slack group ID beginning with `S`. Other modes clear any saved ID. Email and generic webhooks accept only `none`. Omit both mention fields when updating to retain saved settings.

For example, configure a Discord destination with `"mention_mode": "role"` and `"mention_id": "165511591545143296"` to mention that role on opening and recovery messages. Changing mentions cancels queued messages just as changing a destination target does.

All resources have workspace isolation. Invalid configuration returns 400, insufficient role returns 403, and an unknown ID inside the selected workspace returns 404. A destination from another workspace cannot be attached to a rule.

## Retry a delivery

The retry endpoint takes an empty body and returns 204. Only the latest failed delivery for an enabled destination and the current rule revision can be retried. Editing or deleting the rule prevents retries of its earlier messages, including failures from previously recovered incidents. Once a newer event exists for that incident and destination, an older event cannot be replayed. Invalid retries return 400.
