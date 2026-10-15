# Installation

## Docker Compose stack

The default stack includes:

- `backend` on loopback port `5656`
- `frontend` on port `5050`
- `postgres` on host port `5434`
- `redis` on host port `8946`

Current build/runtime status:

- backend image is built from the Go `1.27.2` codebase
- frontend image builds the Angular `21.1` app and serves the static output via nginx

Rotating proxy listener ports are also mapped by default:

- TCP: `20000-20100`
- UDP: `20000-20100`

## Required secrets/config

Set a strong `PROXY_ENCRYPTION_KEY` before starting Magpie.

`JWT_SECRET` is optional. The installer generates a unique value and saves it
in `.env`. With an empty value, the backend creates `/app/data/jwt_secret`
and reuses it from `backend_data`. Back up that file. Set the same explicit
`JWT_SECRET` on every instance in a multi-instance deployment.

Optional DB overrides:

- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_NAME`

If omitted, Docker Compose uses built-in DB defaults. Installer scripts auto-generate strong DB credentials.

`PROXY_ENCRYPTION_KEY` has several uses:

- It encrypts proxy usernames and passwords in PostgreSQL.
- It derives the keyed fingerprint used to distinguish case-sensitive proxy credentials.
- It encrypts Redis queue credentials only when `PROXY_QUEUE_ENCRYPT_CREDENTIALS=true`.
- Changing it later prevents old encrypted values from being decrypted.

Proxy hosts are stored in plaintext, with a native PostgreSQL `inet` projection
for literal IP routes. Protect them with database access controls plus encrypted
volumes and backups. Redis queue credentials are plaintext by default for
checker throughput, so keep Redis private and protect its access, volumes, and
backups.

## Local clone workflow

```bash
git clone https://github.com/Magpie-Tools/magpie.git
cd magpie
cp .env.example .env
# edit .env and set a strong PROXY_ENCRYPTION_KEY; JWT_SECRET can stay blank
# optional: override DB_USERNAME/DB_PASSWORD/DB_NAME
docker compose run --rm backend --migrate-only
docker compose up -d
```

## Installer script notes

Install scripts support environment overrides such as:

- `MAGPIE_INSTALL_DIR`
- `MAGPIE_IMAGE_TAG`
- `MAGPIE_REPO_OWNER`
- `MAGPIE_REPO_NAME`
- `MAGPIE_REPO_REF`

See [Deployment](../operations/deployment.md) and [Environment Variables](../reference/environment-variables.md).

Compose initializes settings and browser-cache volume ownership for the nonroot
backend and repairs volumes created by older root-running images. For internet
deployments, set `MAGPIE_ENV=production` in `.env` and use
`docker-compose.production.yml` alongside the base file as described in
[Deployment](../operations/deployment.md). Both installers download the overlay.
