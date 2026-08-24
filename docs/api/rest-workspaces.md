# REST: Workspaces

All endpoints require a valid bearer token. Workspace resource endpoints also require membership in the selected workspace.

## Workspace selection

Send a positive workspace ID on workspace-scoped requests:

```http
Authorization: Bearer <token>
X-Workspace-ID: 42
```

If `X-Workspace-ID` is omitted, Magpie selects the membership marked as the account's default. If no membership is marked as default, it uses the earliest membership. A malformed ID returns `400`; an ID for which the account has no membership returns `403`.

The workspace-management endpoints use the `{id}` path value for authorization and do not require the selection header.

## `GET /api/workspaces`

Lists every workspace membership for the authenticated account. The default workspace is first.

```json
{
  "workspaces": [
    {
      "id": 42,
      "name": "Edge operations",
      "personal": false,
      "role": "operator",
      "billing_admin": false,
      "is_default": true,
      "capacity": {
        "active_routes": 1842,
        "stored_routes": 1910,
        "included_routes": 2000,
        "additional_routes": 0,
        "overage_routes": 0,
        "activation_limit": 2000,
        "overage_mode": "disabled"
      },
      "subscription": {
        "plan_code": "self-hosted",
        "status": "active",
        "included_operators": 0,
        "statistics_retention_days": 0,
        "minimum_check_interval_seconds": 0,
        "cancel_at_period_end": false
      },
      "created_at": "2026-08-24T10:00:00Z"
    }
  ]
}
```

`activation_limit` is `null` for unlimited workspaces. Billing-provider customer and subscription identifiers are never returned.

## `POST /api/workspaces`

Creates a workspace with the authenticated account as owner and billing administrator. New workspaces receive the instance's default judges, scrape sources, operational settings, and self-hosted entitlement.

```json
{"name": "Edge operations"}
```

Returns the workspace with `201`. Names are whitespace-normalized, required, and limited to 120 characters.

## `GET /api/workspaces/{id}`

Requires viewer or higher. Returns one workspace in the same shape as the list response item.

## `PATCH /api/workspaces/{id}`

Requires admin or owner. Renames a workspace and returns `204`.

```json
{"name": "Production routes"}
```

## `POST /api/workspaces/{id}/select`

Requires viewer or higher. Marks the membership as the authenticated account's default and returns `204`. This changes only that account's default selection.

## Members

### `GET /api/workspaces/{id}/members`

Requires viewer or higher.

```json
{
  "members": [
    {
      "user_id": 7,
      "email": "operator@example.com",
      "role": "operator",
      "billing_admin": false,
      "joined_at": "2026-08-24T10:15:00Z"
    }
  ]
}
```

### `POST /api/workspaces/{id}/members`

Requires admin or owner. The account identified by email must already exist. Valid roles are `admin`, `operator`, and `viewer`; adding an owner directly is rejected. Returns the member with `201`.

```json
{
  "email": "operator@example.com",
  "role": "operator",
  "billing_admin": false
}
```

Only an owner can grant billing-administrator status.

### `PATCH /api/workspaces/{id}/members/{userId}`

Requires admin or owner. Replaces the role and billing-administrator flag and returns `204`.

```json
{
  "role": "admin",
  "billing_admin": false
}
```

This endpoint transfers ownership by changing another member's role to `owner`. Only an owner can make that change, change an owner's membership, or change billing access. Owners always become billing administrators. A workspace cannot lose its final owner.

### `DELETE /api/workspaces/{id}/members/{userId}`

Requires admin or owner and returns `204`. Removing a membership never changes route capacity or deletes workspace resources. Only an owner can remove another owner, the final owner cannot be removed, and the owner of an unshared personal workspace cannot be removed.

## Managed-proxy lifecycle

### `PUT /api/proxies/{id}/lifecycle`

Requires operator or higher in the selected workspace. Sets that workspace's management state for the proxy route.

```json
{"state": "paused"}
```

Valid states are `active`, `paused`, and `archived`. Activating a route returns `409 Conflict` when the workspace has reached its finite activation limit. Paused and archived routes remain stored and do not enter checker or rotator queues.
