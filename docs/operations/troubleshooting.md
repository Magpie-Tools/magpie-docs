---
description: Diagnose startup, authentication, workspace, checker, scraping, listener, email, and build failures with concrete next steps.
---

# Troubleshooting

Start with the first failing step in the workflow. A successful login does not
prove a workspace request is authorized; a successful import does not prove a
proxy is usable. For the complete path, see
[Observe and troubleshoot](../learn/observe-and-troubleshoot.md).

## Find the right starting point

| Symptom | Start here |
| --- | --- |
| Backend exits or reports a dependency connection error | [Redis/PostgreSQL connectivity](#backend-cannot-connect-to-redispostgres). |
| Browser login or registration fails | [401](#401-unauthorized-on-api-calls), [429](#429-too-many-requests-on-auth-routes), or [CORS](#registration-failed-cors-origin-is-not-allowed). |
| Login works, selected workspace fails | [Workspace permissions](#workspace-request-returns-403). |
| Proxies are stored but not checked | [Capacity](#proxy-activation-returns-409), then [checker workflow](../user-guide/checker-and-judges.md). |
| A source has no new proxies | [Source outcomes](#sources-stay-empty-or-scraping-stops). |
| A listener has no usable upstreams | [Rotating pool guide](../user-guide/rotating-proxies.md). |
| An alert has no message | [Delivery diagnosis](../user-guide/alerts.md#diagnose-an-unsent-notification). |

For a Compose installation, capture state from the installation directory using
the same project and file selection as startup:

```bash
docker compose ps
docker compose logs --since=10m --tail=200 backend
```

Keep the first relevant error, the component version, the time, and the action
that triggered it. Remove tokens, passwords, proxy credentials, and private
URLs before sharing logs. Avoid flushing Redis or deleting volumes as a general
repair; those actions discard evidence and may remove recoverable work.

## `401 Unauthorized` on API calls

1. Confirm the request includes `Authorization: Bearer <token>`. Use a current
   token from the same Magpie installation.
2. Sign in again. Logout, password changes, password resets, and deletion can
   revoke an older session.
3. If every session failed after a restart, check whether the JWT signing secret
   changed or the generated `/app/data/jwt_secret` file was lost.
4. In a multi-instance deployment, confirm all instances share the explicit JWT
   secret. Alternating acceptance and rejection often indicates inconsistent
   replicas.

Refresh is a token replacement operation. Coordinate clients so one refresh
updates the token used by subsequent requests. See [Authentication](../api/authentication.md).

## `429 Too Many Requests` on auth routes

Read `Retry-After` and wait before retrying. Tight retry loops extend the load
without fixing the cause.

Login and recovery apply several limits, including request-volume limits and
account-identifier limits. The default request window is 60 seconds, and
forgot-password allows one request per email in that window. Reset-password
requests have their own limits.

If many users share an ingress, check `TRUSTED_PROXY_CIDRS`. Without the correct
trusted ingress addresses, the backend may see one proxy IP for every user.
Do not trust every address to bypass the limit. Inspect the `AUTH_*` settings in
the [environment reference](../reference/environment-variables.md#auth-and-registration-controls)
after confirming the client IP path.

## Password reset email not arriving

1. Confirm SMTP is configured with `MAIL_FROM_ADDRESS`, `SMTP_HOST`, and
   `SMTP_PORT`. Set `SMTP_USERNAME` and `SMTP_PASSWORD` together if required.
2. Check `PUBLIC_APP_URL` matches the browser URL. It supplies reset links and
   the fixed `/invitations` link.
3. Check backend logs for configuration, outbox, TLS, or provider errors. The
   forgot-password response deliberately does not reveal whether an account
   exists, so a successful HTTP response is not delivery confirmation.
4. Verify the provider accepts the configured sender and credentials. Port 587
   requires STARTTLS; port 465 uses implicit TLS.
5. If mail is queued or retrying, inspect `EMAIL_OUTBOX_*`,
   `EMAIL_RETRY_BASE_SECONDS`, and `EMAIL_MAX_ATTEMPTS`. Wait for the worker's
   retry instead of repeatedly requesting resets.

`MAIL_FROM_NAME` and `EMAIL_BRAND_IMAGE_URL` control presentation. If customized,
check that their values are forwarded into the backend container.

For workspace invitations, email failure does not remove the offer. Sign in as
the recipient and open `/invitations`. The sender can inspect notification
status on `/workspace`. There is no manual resend action. Changing the offered
role or billing access queues an "invitation changed" message without renewing
expiry.

## Password reset link is invalid or expired

Use the most recent complete link, within
`PASSWORD_RESET_TOKEN_TTL_MINUTES`, which defaults to 30 minutes. A token can be
used only once, and a newer forgot-password request replaces the previous token.
Check whether a mail client truncated or modified the URL.

If the link is expired, request a new one and wait for that message. Do not
continue trying older messages from the same recovery attempt.

## Registration fails in production

The production overlay disables public registration and first-admin bootstrap.
For a new installation, restrict frontend access, temporarily enable
`ENABLE_PUBLIC_FIRST_ADMIN_BOOTSTRAP=true`, and recreate the backend. Register
the first administrator, then disable the flag and recreate again.

If an administrator already exists, bootstrap is not an account recovery tool.
Use [password recovery](../user-guide/account.md#recover-a-forgotten-password)
or have the operator review the intended registration policy. See
[First login](../getting-started/first-login.md).

## `Registration failed: CORS origin is not allowed`

Set `CORS_ALLOWED_ORIGINS` to the exact origin shown in the browser, including
scheme and any nondefault port. A NAS or remote server opened through a LAN
address is a different origin from `localhost`.

```dotenv
CORS_ALLOWED_ORIGINS=http://nas.local:5050
```

For multiple origins, use a comma-separated list. HTTPS and HTTP are different
origins, and paths such as `/login` do not belong in the value.

Recreate the backend after changing its environment. A plain container restart
does not apply a changed Compose environment. Reload the page and retry. Use
specific origins for the application rather than opening the allowlist to all
sites.

## `403 Forbidden` on `/healthz`, `/readyz`, or `/metrics`

Production observability protection is active. Send
`X-Observability-Token` with the configured `OBSERVABILITY_TOKEN`, or use a path
whose source address is loopback inside the backend's network namespace.
A request to the host's `127.0.0.1:5656` can arrive from a Docker bridge address
inside the container and still require the token.

For a deliberate public probe policy, `ALLOW_PUBLIC_OBSERVABILITY_ENDPOINTS=true`
is an explicit override. The production overlay forces protection, so changing
that deployment needs a later custom overlay. Prefer a token or private monitor
path. A `503` from `/readyz` is a dependency/bootstrap problem; it differs from
an authorization failure.

## `413 Request Entity Too Large`

Compare the upload size with `API_UPLOAD_MAX_BODY_BYTES`, JSON size with
`API_JSON_MAX_BODY_BYTES`, and GraphQL query size with `GRAPHQL_MAX_QUERY_BYTES`.
Check any external ingress request limit too.

Split large imports when practical. If increasing a limit, forward the value
into the backend, recreate it, and consider the resulting memory and temporary
storage use. Increasing multipart memory alone does not increase the total body
limit.

## GraphQL request rejected before resolver

Check query depth against `GRAPHQL_MAX_DEPTH`, expanded field count against
`GRAPHQL_MAX_FIELDS`, and query bytes against `GRAPHQL_MAX_QUERY_BYTES`.
Introspection is disabled by default through `GRAPHQL_ALLOW_INTROSPECTION=false`.

Reduce the selected fields or split the operation first. A JSON `errors` array
can also arrive with HTTP 200 after execution; inspect it before using partial
`data`. See [GraphQL](../api/graphql.md).

## Rotating proxy creation fails

Check the selected workspace and role, then the reported validation error:

- Enable the requested protocol in that workspace's checker settings.
- Use a name unique within the workspace.
- Supply both listener username and password when authentication is required.
- Select an available instance with a free port in its configured range.

If creation succeeds but clients cannot connect, check the host port publication
and firewall for that exact instance and transport. If clients connect but get
no upstream route, inspect current TCP health and pool filters in the
[rotator guide](../user-guide/rotating-proxies.md).

## Workspace request returns `403`

Check that the account is a member of the `X-Workspace-ID` value and has the
role required by the endpoint. Global instance administrator status does not
grant workspace access. Omit the header to test the account's default
membership, or select a valid workspace in the top bar.

## Proxy activation returns `409`

The selected workspace has reached its finite active-route capacity. Pause or
archive another active managed proxy, then activate the intended route. The
blocked proxy remains stored. Confirm the active count and limit on the
workspace page; total stored count includes paused and archived routes.

If an import succeeds with fewer active routes than imported lines, inspect
lifecycle states. Overflow routes can be stored as paused for capacity.

## The same proxy is checked every few seconds

Check the global checker timer. Several protocol results can appear together
within one cycle, but repeated successful results for the same protocol every
second indicate that the route is being scheduled too soon. Tag checker rules
change the checks in a cycle and do not override its interval.

Older backend builds published a one-second placeholder interval to Redis during
package initialization, before loading settings. Starting a test process,
migration, or replica against the same Redis could overwrite the running
checker's interval. A full notification channel could also drop the configured
interval update.

Update and restart every backend replica to restore the interval from loaded
settings. The fix starts interval synchronization after settings load and keeps
the newest pending notification. Routes already due may run once before their
normal requeue uses the restored interval. Use disposable Redis and PostgreSQL
instances for tests and benchmarks.

## Scrape source rejected

Read the source error. A website blacklist match and an outbound-address policy
failure need different fixes. Private, loopback, link-local, and reserved targets
are blocked by default, including addresses obtained through DNS.

Check the configured URL and the destination it resolves to. For an intentional
internal source, the operator can evaluate `ALLOW_PRIVATE_NETWORK_EGRESS=true`
in a trusted deployment. That override affects other application outbound
requests too. It should not be used to mask an unexpected DNS destination.

## Old data not decrypting after restart/update

Compare the deployment's `PROXY_ENCRYPTION_KEY` with the original value in your
secret store or coordinated backup. Stop the affected backends and restore the
original key before restarting them. A new key cannot decrypt old credentials
and also changes keyed route identities.

If the original key is missing, preserve the volumes and backups while locating
it. Repeatedly generating replacement keys cannot repair the ciphertext. See
[Backup and recovery](./backup-and-recovery.md).

## Backend cannot connect to Redis/Postgres

1. Check service state and the first backend connection error. Distinguish DNS,
   connection refusal, authentication, and TLS errors.
2. Use container addresses inside Compose: `postgres:5432` and `redis:6379`.
   A backend running directly on the host uses the published loopback ports,
   normally `5434` and `8946`. `localhost` inside a container is that container.
3. Check effective DB settings: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`,
   `DB_PASSWORD`, and `DB_SSLMODE`. The bundled PostgreSQL does not enable TLS;
   its internal Compose connection uses `disable`. A remote database may require
   a different TLS mode and CA configuration.
4. Check Redis mode, URL, credentials, and Sentinel settings. `REDIS_URL` takes
   precedence over the legacy `redisUrl` fallback when both are present.
5. Confirm the variable reaches the process. Compose's `.env` is used for
   substitution; unlisted values need explicit forwarding. A Go process uses
   its own environment and working-directory `.env`.

Changing `DB_PASSWORD` in Compose does not update a role in an already initialized
PostgreSQL volume. Reconcile the actual database role and client credential
through the database administrator; do not remove the volume to reset it.
See [Apply a setting](../reference/environment-variables.md#apply-a-setting).

## Build or install dependency issues

Use the repository's committed lockfile and supported toolchain. From the
frontend or docs repository:

```bash
npm ci
npm run build
```

`npm ci` replaces `node_modules` using `package-lock.json`. Keep the lockfile;
deleting it changes the dependency graph and can hide the original problem.
For backend failures, compare `go version` with the version declared in
`magpie-backend/go.mod`, then rerun the failing command. See
[Testing](../contributing/testing.md) for repository-specific checks.

## Sources stay empty or scraping stops

Open a source's detail page and check the last scrape outcome and error. Proxy
health's **No data** label describes discovered proxies, not fetch availability.
Use HTTP for raw lists and static HTML. Enable **Requires JavaScript** only when
the page needs it to produce proxy data.

Browser sources share a bounded Chromium instance per backend. Its default
concurrency is four. Capacity failures and browser outages are retried without
blocking workers waiting for a page. Cleanup has a two-second deadline and an
unresponsive browser is discarded; startup failures back off for 30 seconds.
Network failures for optional resources such as images leave valid proxy HTML
and concurrent browser scrapes usable. Main-document failures and outbound
policy violations still fail the scrape.

If browser failures persist, check backend logs for `scrape failed` entries,
Chromium launch errors, and container memory pressure. HTTP sources continue
without Chromium. Capture logs around the first failure, along with the backend
version, memory limit, and `SCRAPER_PAGE_POOL_MAX_CAPACITY`.

On upgrade, run the normal migration step before restarting all backend
replicas. Existing sources preserve their browser mode; switch static sources
to HTTP from the detail page to reduce resource use.

### PostgreSQL parameter limit while saving scraped proxies

`process scrape result ... extended protocol limited to 65535 parameters`
means a database statement used too many bound values after the source was
fetched. It does not indicate a browser failure. PostgreSQL limits each statement
to [65,535 parameters](https://www.postgresql.org/docs/current/limits.html), not
65,535 proxies across the deployment.

Older builds batched proxy inserts but reused that batch size for the wider
workspace-association table and left some hash lookups unbatched. A single source
with 6,000 proxies could already exceed the limit in the association insert.
Current builds calculate insert batch sizes separately for each table and split
large hash lookups, including the workspace filter parameter.

Upgrade the backend to a build containing this fix, then use **Scrape now** on
failed sources or wait for their normal scrape interval. Reducing browser
concurrency or switching fetching mode does not fix this database error. No
additional schema migration or batch-size environment setting is needed for
this fix.
