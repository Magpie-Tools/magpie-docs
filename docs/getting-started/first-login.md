# First login

This guide starts after the stack is running. Use the
[quick start](quick-start.md) if you cannot open the dashboard yet.

## Default local behavior

1. Open `http://localhost:5050`.
2. Register a user account.
3. The first user becomes `admin` automatically.

`admin` here is the global instance role. Your initial workspace also gives
you owner membership. The global role controls installation settings; workspace
membership controls that workspace's proxies, sources, judges, and rotators.

## Find your workspace and the main pages

Look at the workspace switcher in the top bar. Keep the initial workspace
selected during your first exercise.

| Page | Use it to |
| --- | --- |
| Workspace, `/workspace` | Inspect capacity and membership. |
| Proxies, `/proxies` | Import routes and read lifecycle, tags, health, and history. |
| Checker Settings, `/checker/settings` | Choose the checks for this workspace. |
| Judges, `/checker/judges` | Inspect the test destinations and their validation rules. |
| Scrape sources, `/scraper` | Discover routes from webpages. |
| Rotating proxies, `/rotating` | Create listener ports for your applications. |

An empty dashboard before importing or scraping is expected. Magpie does not
ship a guaranteed working proxy pool. Start with
[your first proxy workflow](../learn/first-proxy.md), then add automation.

## Production bootstrap behavior

Production mode and the production Compose overlay disable public registration
and first-admin bootstrap by default.

For controlled first-admin bootstrap windows:

1. Restrict frontend/API access to the administrator setting up the instance.
2. Set `ENABLE_PUBLIC_FIRST_ADMIN_BOOTSTRAP=true` and recreate the backend.
3. Call `POST /api/register` to create the first account.
4. Set `ENABLE_PUBLIC_FIRST_ADMIN_BOOTSTRAP=false`, keep `DISABLE_PUBLIC_REGISTRATION=true`, and recreate the backend before opening access.

## Verify backend auth

You can verify auth status with:

- `GET /api/checkLogin` using `Authorization: Bearer <token>`

## After the first workflow

1. Configure checker/scraper global settings.
2. Add or validate judge endpoints.
3. Configure scrape sources.
4. Set GeoLite API key if geo enrichment is needed.
5. Review website blacklist policy.
6. Review auth and observability hardening envs.

Use [deployment](../operations/deployment.md) before opening the installation
to other people. For ordinary workspace users, start with
[workspaces and roles](../user-guide/workspaces.md).

## JWT behavior

- Login/register returns JWT.
- JWT is expected in `Authorization: Bearer <token>`.
- `POST /api/refreshToken` rotates and revokes the old token.
- `POST /api/logout` revokes the current token.
- Role-based authorization protects admin endpoints.
