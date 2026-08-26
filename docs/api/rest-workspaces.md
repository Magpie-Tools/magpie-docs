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

## Invitations

Invitations are pending offers for existing Magpie accounts. They grant no workspace access before acceptance and do not use transferable bearer tokens.

### `GET /api/workspaces/{id}/invitations`

Requires admin or owner. Lists non-expired outgoing invitations owned by the workspace.

```json
{
  "invitations": [
    {
      "id": 91,
      "workspace_id": 42,
      "workspace_name": "Edge operations",
      "invitee_user_id": 17,
      "invitee_email": "operator@example.com",
      "inviter_user_id": 7,
      "inviter_email": "owner@example.com",
      "role": "operator",
      "billing_admin": false,
      "notification_status": "queued",
      "expires_at": "2026-08-31T10:15:00Z",
      "created_at": "2026-08-24T10:15:00Z",
      "updated_at": "2026-08-24T10:15:00Z"
    }
  ]
}
```

`notification_status` is `queued`, `not_configured`, or `failed`. It reports the latest notification enqueue result; the invitation row is the source of truth.

### `POST /api/workspaces/{id}/invitations`

Requires admin or owner. The email must identify an existing Magpie account that is not already a member. Owners can invite admins, operators, or viewers and can grant billing access. Admins can invite operators or viewers without billing access.

```json
{
  "email": "operator@example.com",
  "role": "operator",
  "billing_admin": false
}
```

Returns `201` with an invitation response:

```json
{
  "invitation": {
    "id": 91,
    "workspace_id": 42,
    "workspace_name": "Edge operations",
    "invitee_user_id": 17,
    "invitee_email": "operator@example.com",
    "inviter_user_id": 7,
    "inviter_email": "owner@example.com",
    "role": "operator",
    "billing_admin": false,
    "notification_status": "not_configured",
    "expires_at": "2026-08-31T10:15:00Z",
    "created_at": "2026-08-24T10:15:00Z",
    "updated_at": "2026-08-24T10:15:00Z"
  }
}
```

There can be one pending invitation per workspace and recipient account. An unknown account returns `404`; an existing member or duplicate pending invitation returns `409`.

If SMTP is configured, Magpie queues the invitation email after persistence. An enqueue failure does not roll back the invitation: the same `201` response includes a `warning` and `notification_status` is `failed`. If SMTP is not configured, no email is attempted and the invitation remains visible in the in-app inbox.

### `PATCH /api/workspaces/{id}/invitations/{invitationId}`

Requires admin or owner and replaces the role and billing flag.

```json
{
  "role": "viewer",
  "billing_admin": false
}
```

Owners can edit any pending invitation. Admins can edit only operator/viewer invitations that do not include billing access, and can keep them only as operator or viewer. Returns `200` in the same response shape as creation.

Changing access does not renew `expires_at`. When SMTP is configured, an actual role or billing change queues an email with the subject `Your Magpie workspace invitation changed`. An unchanged request does not queue another email, and there is no resend endpoint.

### `DELETE /api/workspaces/{id}/invitations/{invitationId}`

Requires admin or owner and returns `204`. Admins cannot revoke admin or billing-enabled invitations. Revocation deletes the invitation and sends no email.

### `GET /api/invitations`

Lists every non-expired invitation addressed to the authenticated account across workspaces. The response uses the same `{"invitations": [...]}` shape as the outgoing list. Membership in the inviting workspace is not required.

### `POST /api/invitations/{invitationId}/accept`

Only the addressed account can accept. Acceptance atomically creates the workspace membership and deletes the invitation.

```json
{
  "workspace_id": 42,
  "workspace_name": "Edge operations"
}
```

Accepting does not select the workspace or change the account's default membership.

### `POST /api/invitations/{invitationId}/decline`

Only the addressed account can decline. Returns `204` and deletes the invitation.

Accepting, declining, revoking, or expiring an invitation creates no history row and sends no email. Expired invitations return `410` until cleanup removes them.

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

### `PATCH /api/workspaces/{id}/members/{userId}`

Requires admin or owner. Replaces the role and billing-administrator flag and returns `204`.

```json
{
  "role": "admin",
  "billing_admin": false
}
```

An owner can manage every member, change ownership, and change billing access. Admins can update operators and viewers only, and cannot promote a member to admin. Owners always become billing administrators. A workspace cannot lose its final owner.

### `DELETE /api/workspaces/{id}/members/{userId}`

Requires admin or owner and returns `204`. Removing a membership never changes route capacity or deletes workspace resources. Admins can remove operators and viewers only; they cannot remove owners, admins, or billing administrators. The final owner cannot be removed, and the owner of an unshared personal workspace cannot be removed.

## Managed-proxy lifecycle

### `PUT /api/proxies/{id}/lifecycle`

Requires operator or higher in the selected workspace. Sets that workspace's management state for the proxy route.

```json
{"state": "paused"}
```

Valid states are `active`, `paused`, and `archived`. Activating a route returns `409 Conflict` when the workspace has reached its finite activation limit. Paused and archived routes remain stored and do not enter checker or rotator queues.
