---
description: Read and persist per-account notification read status across browsers.
---

# REST: notifications

These endpoints require a bearer token and use the authenticated account.
`X-Workspace-ID` does not change whose read status is returned or saved.

Notification IDs combine a source with its positive numeric event ID, for
example `invitation-91`, `alert-102`, or `release-201`. These namespaces keep
different event types distinct even when they share a numeric ID.

The dashboard combines the five newest invitations, selected-workspace
incidents, and releases. Read state does not change their order or remove them
from the menu. See [navigation](../user-guide/navigation.md).

## `GET /api/notifications/read-state`

Pass up to 50 comma-separated notification IDs in `ids`:

```http
GET /api/notifications/read-state?ids=invitation-91,alert-102,release-201
Authorization: Bearer <token>
```

```json
{"read_ids": ["alert-102", "release-201"]}
```

Only requested IDs with a receipt for this account are returned. An omitted ID
has no receipt; this endpoint does not check whether the event still exists.
Omitting `ids` returns an empty array. Responses use `Cache-Control: no-store`.
Invalid IDs or more than 50 IDs return `400`.

## `PUT /api/notifications/{id}/read`

Marks one event as read. No request body is required. A successful write returns
`204`; repeat writes keep the original read time. Reading the menu alone does
not create receipts.

```http
PUT /api/notifications/alert-102/read
Authorization: Bearer <token>
```

An invitation must be pending for this account. An incident must belong to a
workspace in which this account is a member, including viewers. Release IDs are
public; saving a receipt does not fetch release content from GitHub. Invalid IDs
return `400`. Inaccessible, expired, or missing invitations and incidents return
`404`.

The operation changes only read status. It does not accept an invitation, close
an incident, or affect another account's unread count. Read receipts persist in
PostgreSQL and are deleted with the account. Existing events start unread when
the feature is first installed.
