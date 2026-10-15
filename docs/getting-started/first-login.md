# First Login

## Default local behavior

1. Open `http://localhost:5050`.
2. Register a user account.
3. The first user becomes `admin` automatically.

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

## Recommended first admin tasks

1. Configure checker/scraper global settings.
2. Add or validate judge endpoints.
3. Configure scrape sources.
4. Set GeoLite API key if geo enrichment is needed.
5. Review website blacklist policy.
6. Review auth and observability hardening envs.

## JWT behavior

- Login/register returns JWT.
- JWT is expected in `Authorization: Bearer <token>`.
- `POST /api/refreshToken` rotates and revokes the old token.
- `POST /api/logout` revokes the current token.
- Role-based authorization protects admin endpoints.
