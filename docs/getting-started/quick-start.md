# Quick start

This guide starts a local Magpie installation. You will finish with the web
dashboard, a first account, and a readiness check. You do not need a source
checkout of the backend or frontend.

If you are new to proxies, read [How Magpie works](../learn/how-magpie-works.md)
first. For a public server, follow [deployment](../operations/deployment.md)
and its production bootstrap policy after learning the local workflow.

## Prerequisites

- Docker Desktop, or Docker Engine + Compose
- Internet access to pull container images

Docker must be running. Verify these commands in your terminal:

```bash
docker version
docker compose version
```

The first command should report both a client and a server. If it cannot
connect to the Docker daemon, start Docker before continuing.

## 1. Install and start the stack

Run the command for your operating system from the parent directory where you
want a new `magpie` folder. The installer asks for `PROXY_ENCRYPTION_KEY`,
generates database/JWT secrets, downloads the Compose files, runs migrations,
and starts the containers. Save the encryption key somewhere safe and keep it
stable across updates. It protects saved credentials and route identity.

### macOS/Linux

```bash
curl -fsSL https://raw.githubusercontent.com/Magpie-Tools/magpie/refs/heads/master/scripts/install.sh | bash
```

### Windows (PowerShell)

```powershell
iwr -useb https://raw.githubusercontent.com/Magpie-Tools/magpie/refs/heads/master/scripts/install.ps1 | iex
```

<details>
<summary>Alternative: install manually from a clone</summary>

Use this route if you want to inspect the distribution files or set deployment
values yourself. The commands below use a Bash-compatible shell.

```bash
git clone https://github.com/Magpie-Tools/magpie.git
cd magpie
cp .env.example .env
# Open .env in your editor before running the next commands.
# Replace PROXY_ENCRYPTION_KEY and DB_PASSWORD with strong unique values.
docker compose run --rm backend --migrate-only
docker compose up -d
```

The migration creates or updates database tables before normal workers start.
`up -d` starts the services in the background. `JWT_SECRET` can stay blank for
a single local instance; Magpie persists an automatically generated signing
key in its backend data volume. See [installation](installation.md) for the
secret and persistence details.

</details>

## 2. Verify the running services

From the installer directory or cloned `magpie` directory, run:

```bash
cd magpie
docker compose ps
curl --fail --show-error http://127.0.0.1:5656/readyz
```

Skip `cd magpie` if you are already there after the manual commands. On Windows,
use `curl.exe` for this request if PowerShell aliases `curl` to another command.

Expected result: backend, frontend, PostgreSQL, and Redis are running. The
volume initializer is a one-time helper and may show as exited successfully.
Readiness returns `"status":"ready"` when dependencies and queue bootstrap
are ready. It can temporarily return `503` during startup. Retry after setup
finishes; for a persistent failure, inspect:

```bash
docker compose logs --tail=100 backend
```

Observability protection can require a token if Docker does not present the
request as loopback. See [observability access](../operations/troubleshooting.md#403-forbidden-on-healthz-readyz-or-metrics)
for a `403`, and [troubleshooting](../operations/troubleshooting.md) for
database or Redis failures.

## 3. Open the dashboard and create an account

- UI: `http://localhost:5050`
- API base: `http://localhost:5656/api`

Open the UI URL in your browser, choose registration, and create your account.
The first local account becomes an instance administrator and receives its
initial workspace. The [first login guide](first-login.md) explains the two
role levels and production setup.

If the browser is on a different computer, `localhost` refers to that computer.
Use the server's address for the frontend and configure its allowed origin as
described in [installation](installation.md) and
[CORS troubleshooting](../operations/troubleshooting.md#registration-failed-cors-origin-is-not-allowed).
The API is bound to server loopback by default; the frontend forwards its own
`/api` requests to the backend.

## 4. Try one complete workflow

Continue with [your first proxy workflow](../learn/first-proxy.md). It shows
how to import a route, understand its check result, and use a rotating listener.
You need your own working upstream proxy for live traffic.

## Stop and restart

Use the same directory and Compose file selection for later commands:

```bash
docker compose stop
docker compose start
```

Named volumes keep your data when containers are replaced. `docker compose
down -v` deletes those volumes and their data. Use the
[backup guide](../operations/backup-and-recovery.md) before a reset or upgrade.
