# Authentication

Magpie uses JWT bearer tokens for API authentication.

## Token lifecycle

- Public auth endpoints: `POST /api/register`, `POST /api/login`, `POST /api/forgotPassword`, `POST /api/resetPassword`
- Token rotation endpoint: `POST /api/refreshToken` (requires auth)
- Logout endpoint: `POST /api/logout` (requires auth; revokes current token)
- JWTs contain `user_id`, `role`, `exp`, `iat`, and `jti` claims.
- Signing algorithm: `HS256`
- Secret source: `JWT_SECRET` (required)
- TTL source: `JWT_TTL_MINUTES` (default `10080`, range `15..10080` minutes)

## Authorization header

Send the token on protected endpoints:

```http
Authorization: Bearer <token>
```

If the header is missing, malformed, or invalid, protected endpoints return `401 Unauthorized`.

## Route protection model

- `RequireAuth`: endpoint requires a valid JWT.
- `IsAdmin`: endpoint requires a valid JWT and `role=admin`.
- `withWorkspaceViewer`: endpoint also requires a workspace membership with
  viewer or higher.
- `withWorkspaceOperator`: endpoint also requires a workspace membership with
  operator or higher.
- Auth checks are applied to REST routes in
  `internal/app/server/routes.go` in `magpie-backend`.

The JWT's `role` claim is the global instance role and is distinct from a
workspace role. Global administrator status does not grant access to a
workspace. Access is resolved from membership on each workspace-scoped request.

## Workspace header

Select the workspace for a protected resource request with:

```http
X-Workspace-ID: 42
```

Omitting the header selects the account's default membership. The header does
not grant access: the authenticated account must still be a member. See
[REST: Workspaces](./rest-workspaces.md).

## Revocation behavior

- Tokens are revocable by token id (`jti`) and by user-wide revoke cutoff (used for password change/account deletion/session revocation).
- Revocation state is stored in Redis.
- Password change and successful password reset revoke active sessions under normal revocation-store operation.
- `AUTH_REVOCATION_FAIL_OPEN` controls outage behavior when Redis is unavailable:
  - default: `true` (availability-first)
  - when `false`: revocation-store outages cause strict auth failures.

## Password recovery

- Password recovery uses short-lived, single-use reset tokens stored only as hashes in the database.
- Reset links are generated from `PUBLIC_APP_URL` rather than request headers.
- Reset requests are throttled both by request volume and by target account identifier.
- Default per-email forgot-password throttle is 1 request per 60 seconds.

## Workspace invitation authentication

- Invitation inbox, accept, and decline endpoints require the recipient's normal bearer token.
- Invitation emails contain no acceptance token and link only to `/invitations`.
- Workspace membership is not required to list or act on an invitation addressed to the authenticated account.
- Managing outgoing invitations requires admin or owner access to the workspace path ID.

## GraphQL authentication

- GraphQL endpoint: `POST /api/graphql`
- Uses the same bearer token header.
- Uses the same workspace selection and viewer-membership requirement.
- If token is missing/invalid, endpoint returns `401 Unauthorized`.

## Quick verification endpoint

- `GET /api/checkLogin`
- Requires auth.
- Returns `200` if token is valid.
