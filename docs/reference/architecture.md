# Architecture

Magpie is a multi-component system:

- Go `1.26` API server (`internal/app/server` in `magpie-backend`)
- background job routines (`internal/jobs/*` in `magpie-backend`)
- rotating proxy listener manager (`internal/rotatingproxy` in `magpie-backend`)
- Angular `21.1` frontend (`src/app` in `magpie-frontend`)

## Startup flow

At startup, backend:

1. Loads settings from `data/settings.json` (or embedded defaults)
2. Connects Redis and Postgres
3. Initializes blacklist and optional redis sync hooks
4. Loads existing proxies/sites into queues
5. Starts rotating proxy listeners
6. Starts periodic job routines

## API style

- REST endpoints mounted under `/api`
- GraphQL endpoint mounted at `/api/graphql`

## Storage model

- PostgreSQL stores users, proxies, statistics, reputations, sites, rotators
- Redis provides queue/coordinator features used by runtime routines
