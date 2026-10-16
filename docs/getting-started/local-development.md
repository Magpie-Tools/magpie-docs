# Local Development

## Prerequisites

- Go `1.27.2` or newer
- Node.js `20.19+` or `22.12+`
- npm
- Docker (for Postgres + Redis during local dev)

The application components are maintained in separate repositories:

- `magpie-backend`: Go `1.27.2`
- `magpie-frontend`: Angular `21`, PrimeNG `21`, Tailwind CSS `4`; use the exact dependency versions in `package.json` and the lockfile.
- `magpie-docs`: Docusaurus on Node.js `20+`

Clone the repositories as siblings so commands and tooling have a predictable
workspace:

```bash
mkdir magpie-workspace
cd magpie-workspace
git clone https://github.com/Magpie-Tools/magpie.git
git clone https://github.com/Magpie-Tools/magpie-backend.git
git clone https://github.com/Magpie-Tools/magpie-frontend.git
git clone https://github.com/Magpie-Tools/magpie-website.git
git clone https://github.com/Magpie-Tools/magpie-docs.git
```

## Start infrastructure

```bash
cd magpie
cp .env.example .env
# Set PROXY_ENCRYPTION_KEY in .env.
docker compose up -d postgres redis
```

## Run backend

The backend loads `.env` from its own working directory. The distribution's
`.env` is not automatically loaded by a Go process in the sibling repository.
Create `magpie-backend/.env` in your editor with the matching values:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=5434
DB_NAME=magpie
DB_USERNAME=magpie_user
DB_PASSWORD=replace-with-the-distribution-database-password
DB_SSLMODE=disable
REDIS_URL=redis://127.0.0.1:8946
PROXY_ENCRYPTION_KEY=replace-with-the-same-stable-key-as-the-distribution
DB_AUTO_MIGRATE=false
```

Match database name and username too if you changed them in the distribution.
The host ports differ from container ports: local processes use PostgreSQL
`5434` and Redis `8946`; containers on the Compose network use `5432` and
`6379`. Keep `.env` private and out of commits.

Migrate from the backend repository before the first normal start:

```bash
cd ../magpie-backend
go run ./cmd/magpie --migrate-only
go run ./cmd/magpie
```

Backend defaults to port `5656`.

For the runtime reading path, open [backend internals](../backend/index.md).

## Run frontend

```bash
cd ../magpie-frontend
npm ci
npm run start
```

Frontend dev server defaults to `http://localhost:4200`.

## Restore development test data

The backend includes a repeatable dataset for developing lists, filters, detail
pages, dashboards, alerts, and workspace permissions. Its default accounts are:

| Account | Default workspace | Role on a fresh database |
| --- | --- | --- |
| `username@gmx.at` | Personal lab | Administrator, if no administrator exists |
| `username2@gmx.at` | Provider testing | User |
| `username3@gmx.at` | Scraping research | User |

Existing account IDs, passwords, and global roles remain unchanged. The reset
replaces all workspaces containing these users. It refuses to run if an affected
workspace includes an unselected user or has no selected owner. Unrelated
accounts, workspaces, and routes remain intact.

Stop every backend connected to this database before resetting. For a local
`go run` backend, use Ctrl+C. Back up any data you want to retain with the
[backup workflow](../operations/backup-and-recovery.md).

Preview the affected accounts, workspaces, and route counts, then apply:

```bash
cd magpie
./scripts/seed-dev-data.sh --dry-run
./scripts/seed-dev-data.sh --reset
```

The script uses the sibling `magpie-backend` repository and its `.env`. Set
`MAGPIE_BACKEND_REPO` if it lives elsewhere. You can also run the command
directly from `magpie-backend` with `go run ./cmd/seed-dev-data`.

On a fresh database, run `go run ./cmd/magpie --migrate-only` from the backend
repository first. Set `MAGPIE_DEV_PASSWORD` for the accounts being created.
It must satisfy the normal password policy. You can read it without including
it in shell history:

```bash
read -rs -p 'Development account password: ' MAGPIE_DEV_PASSWORD
export MAGPIE_DEV_PASSWORD
./scripts/seed-dev-data.sh --reset
unset MAGPIE_DEV_PASSWORD
```

The default dataset contains:

- Five workspaces with 1,000 routes each. Each account owns a personal lab.
- A QA team where the accounts are owner, administrator, and operator, in the
  order shown above. The last two accounts are viewers in Read-only review.
- IPv4, IPv6, hostname gateways, authenticated routes, and active, paused, and
  archived lifecycle states. Unknown, alive, dead, slow, and intermittent checks
  exercise health, country, protocol, anonymity, and reputation filters.
- Thirty days of check history, dashboard charts, check totals, and usage.
- Forty tags, tag-specific checker rules, and sixty scraping sources with HTTP
  and browser modes, populated lists, empty lists, and scrape errors.
- Twenty rotating proxy configurations, thirty alert rules, ninety incidents,
  delivery history, disabled destinations, and three pending invitations.

Restore this dataset any time by repeating `--reset`. Rows are replaced rather
than appended, and dates move relative to the reset time. IDs can change, so
refresh open pages after a reset. Options include:

```bash
./scripts/seed-dev-data.sh --reset \
  --accounts dev1@example.invalid,dev2@example.invalid,dev3@example.invalid \
  --proxies-per-workspace 2000 --history-days 45 --seed 42
```

The reset runs in one PostgreSQL transaction. A failed insert restores the old
data. It removes or refreshes only affected Redis queue entries after commit
and never flushes the Redis database. If queue reconciliation fails, the
command reports that the database committed. Resolve Redis availability
before starting a backend.

## Keep fixture data stable

Start the backend with fixture mode enabled:

```bash
cd ../magpie-backend
DEVELOPMENT_FIXTURES=true go run ./cmd/magpie
```

You can put `DEVELOPMENT_FIXTURES=true` in the backend's local `.env` so it
survives restarts. For a backend container built from the updated source, set
the variable in the distribution repository's `.env` and recreate the backend.
The default is `false`.

Fixture mode serves the API, keeps checker settings and dashboard caches
current, and skips autonomous jobs and rotating listeners. This includes
proxy checks, scraping, judge checks, alert evaluation and delivery, outbound
mail, enrichment, retention, and cleanup. Account and workspace actions remain
available through the API. Rotators created through the API are saved without
opening TCP or UDP listeners, including during listener reconciliation. Restart
with fixture mode disabled to activate them. Fixture startup and the seed
command reject production mode.

Fixture hosts use documentation IP ranges and `.invalid` domains. They are
simulated routes, sources, judges, and notification endpoints. To test live
proxy traffic, use a separate development dataset and start the backend with
fixture mode disabled.

## Common dev commands

```bash
cd ../magpie-backend
go test ./...
```

```bash
cd ../magpie-frontend
npm test
```
