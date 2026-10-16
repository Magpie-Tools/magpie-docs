---
description: "Choose an installation method, configure secrets and persistence, and start the bundled Docker stack."
---

# Installation

Use the [quick start](quick-start.md) for the shortest path to a local instance.
This page explains what it installs, where data lives, and which values you
must preserve. Use [deployment](../operations/deployment.md) for a public server.

## Choose an installation route

| Route | Use it when | Instructions |
| --- | --- | --- |
| Installer script | You want published images and generated database/JWT credentials. | [Quick start](quick-start.md#1-install-and-start-the-stack). |
| Clone the distribution repository | You want to inspect or customize Compose and pin image tags. | [Manual workflow below](#local-clone-workflow). |
| Run components from source | You are changing the application. | [Local development](local-development.md). |

The distribution repository contains deployment files. It does not contain
all component source code. A normal installation pulls frontend and backend
images; it does not require Go or Angular build tools.

## Docker Compose stack

| Service | Purpose | Default host access |
| --- | --- | --- |
| `frontend` | nginx serves Angular and forwards `/api` requests. | `http://localhost:5050`. |
| `backend` | Go API, workers, jobs, rotating listeners. | API at `127.0.0.1:5656`. |
| `postgres` | Durable resources and committed results. | Loopback `127.0.0.1:5434`. |
| `redis` | Runtime queues, result handoff, coordination. | Loopback `127.0.0.1:8946`. |
| `backend-volume-init` | One-time ownership repair for backend data/cache. | No application port; exits after success. |

The backend also publishes rotating listener ports `20000-20100` over TCP and
UDP. Use the specific allocated listener port for proxy clients. The UI and API
ports are not proxy listener ports.

Inside Compose, the backend reaches `postgres:5432` and `redis:6379`. A local
Go process uses the published host ports instead. `localhost` inside a
container means that container, not your host computer.

## Required secrets/config

Replace the example `PROXY_ENCRYPTION_KEY` before migration or startup. Keep
the exact value stable. It encrypts managed proxy credentials in PostgreSQL,
keys credential-sensitive route fingerprints, and protects queue credentials
when queue encryption is enabled. It also protects stored alert destination
secrets. Changing it is not a routine password rotation and makes older
protected values unreadable.

For manual installation, replace the example database password too. Installer
scripts generate strong database credentials. Set matching `DB_USERNAME`,
`DB_PASSWORD`, and `DB_NAME` for the selected database. Editing initialization
variables does not change the password inside an already initialized
PostgreSQL volume.

`JWT_SECRET` can stay empty for a single instance. The backend generates and
persists `/app/data/jwt_secret` in `backend_data`. Installers instead generate
an explicit secret in `.env`. All backend replicas must share an explicit
JWT secret. Preserve the selected signing key during recovery.

Redis queue credentials are plaintext by default for checker throughput.
Keep `PROXY_QUEUE_ENCRYPT_CREDENTIALS=false` unless you deliberately choose
and measure the encrypted mode. Protect database/Redis access, volumes, and
backups as described in [security](../operations/security.md).

## Local clone workflow

From the parent directory where you want the distribution checkout:

```bash
git clone https://github.com/Magpie-Tools/magpie.git
cd magpie
cp .env.example .env
```

Open `.env` in your editor and replace `PROXY_ENCRYPTION_KEY` and `DB_PASSWORD`.
Then create the schema and start the stack:

```bash
docker compose run --rm backend --migrate-only
docker compose up -d
docker compose ps
```

Open `http://localhost:5050` and follow [first login](first-login.md). If startup
fails, read `docker compose logs --tail=100 backend` and the
[troubleshooting guide](../operations/troubleshooting.md). A volume initializer
that exited with code zero is expected.

## Persisted data

| Named volume | Contains | Keep it for |
| --- | --- | --- |
| `postgres_data` | PostgreSQL data. | Resources, membership, history, and committed evidence. |
| `redis_data` | Redis persistence, including append-only data. | Queued work, pending results, coordination/session state. |
| `backend_data` | `settings.json` and generated JWT key when used. | Instance configuration and signing-key continuity. |
| `backend_browser_cache` | Chromium cache. | Avoiding repeated browser downloads/cache setup. It can be recreated. |

Compose prefixes actual volume names with the project name. Preserve that
project selection during updates and restores. Container replacement retains
named volumes; `docker compose down -v` removes them. Use
[backup and recovery](../operations/backup-and-recovery.md) before a reset.

## Installer script notes

Installers create a new `magpie` directory by default, ask for the stable proxy
encryption key, download both Compose files, migrate, and start the base stack.
Downloading the production overlay does not automatically enable it.

Common overrides include `MAGPIE_INSTALL_DIR`, component image/tag settings,
`MAGPIE_REPO_OWNER`, `MAGPIE_REPO_NAME`, and `MAGPIE_REPO_REF`. See
[environment variables](../reference/environment-variables.md#installerupdater-script-envs)
for the distinction between installer inputs and backend environment.

For LAN access, use the server's frontend address and configure
`CORS_ALLOWED_ORIGINS` for the exact scheme, hostname, and port you open. For
internet access, continue with [deployment](../operations/deployment.md).
