---
description: "Choose meaningful backend, frontend, docs, and distribution checks with isolated real-service fixtures."
---

# Testing

Choose checks by the behavior you changed. A passing fast suite is useful,
but it does not establish PostgreSQL query cost, real Redis concurrency, or
long-running checker capacity.

## Pick the right level

| Check | Finds | Does not establish |
| --- | --- | --- |
| Package/unit tests | Parsing, validation, state transitions, regression behavior. | Production dependency behavior or capacity. |
| Race tests | Unsafe concurrent access in exercised Go paths. | Correct behavior in every possible interleaving. |
| Real PostgreSQL/Redis tests | Storage constraints, queries, leases, replay, shutdown. | Capacity on deployment hardware. |
| UI tests and build | Component behavior and compilation. | A live upstream proxy's availability. |
| Load and soak tests | Measured latency, backlog, drops, and storage growth. | Capacity outside the tested workload. |
| Docs build and browser review | Links, MDX, diagrams, examples, layout. | Successful live proxy traffic unless separately exercised. |

## Backend

Use the Go version declared by `magpie-backend/go.mod`. From that repository:

```bash
go test ./... -count=1
go test -race ./... -count=1
go vet ./...
go build ./cmd/magpie
```

All four checks are required before merging queue or checker changes. Keep
the current plaintext hash-reuse and scheduling-only requeue tests, and
record the per-check operation budget. The [code-reading exercises](../backend/code-map.md)
point to those tests.

Backend CI also runs a dependency vulnerability scan:

```bash
go run golang.org/x/vuln/cmd/govulncheck@v1.8.0 ./...
```

### Real-service fixtures

Many tests use SQLite or miniredis without external services. Tests that require
PostgreSQL or specific real-service behavior skip when their settings are
missing. Look for skipped tests in output before reporting integration coverage.

Use disposable services with these variables:

| Variable | Used for |
| --- | --- |
| `MAGPIE_TEST_POSTGRES_DSN` | PostgreSQL storage and integration fixtures. |
| `MAGPIE_TEST_REDIS_URL` | Statistics, startup, recovery, and coordination fixtures. |
| `MAGPIE_TEST_QUEUE_REDIS_URL` | Queue concurrency fixtures in a separate empty Redis database. |

For example, after starting isolated PostgreSQL and Redis services:

```bash
export MAGPIE_TEST_POSTGRES_DSN='host=127.0.0.1 port=15432 user=magpie_test password=magpie_test dbname=magpie_test sslmode=disable'
export MAGPIE_TEST_REDIS_URL='redis://127.0.0.1:16379/14'
export MAGPIE_TEST_QUEUE_REDIS_URL='redis://127.0.0.1:16379/13'
unset REDIS_URL redisUrl
go test ./... -count=1
```

The ports and credentials above are fixture examples, not Magpie's normal
installation ports. Queue fixtures flush their selected Redis database. Keep
all test databases separate from a running installation and from one another.
Unsetting ordinary Redis URLs lets connection-failure fixtures select their
own addresses. Follow any package-specific fixture setup in the tests.

Start with a focused regression while editing, then run required broader
checks once it passes. Some shutdown integration tests accept a prebuilt
backend through `MAGPIE_TEST_BACKEND_BINARY`; CI builds a race-instrumented
binary before its race suite. See the
[backend CI definition](https://github.com/Magpie-Tools/magpie-backend/blob/main/.github/workflows/ci.yml)
for that setup.

## Frontend

From `magpie-frontend`:

```bash
npm ci
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
```

The test command needs a usable Chrome/Chromium binary. For interactive work,
`npm test` starts the normal watch runner. Check the affected workflow in the
browser as well, especially workspace switching, loading/error states, keyboard
controls, and permissions.

## Documentation

From `magpie-docs`:

```bash
npm ci
npm run typecheck
npm run build
npm run serve
```

The build checks internal links and anchors. Mermaid rendering is a browser
step, so inspect changed diagrams, expand them, close with Escape, and check
light/dark themes and narrow screens. Verify shell syntax and API payloads
against the owning code. See [documentation maintenance](docs.md).

## Distribution and release work

From `magpie`, CI validates Compose and script regressions:

```bash
docker compose --env-file .env.example -f docker-compose.yml -f docker-compose.production.yml config --quiet
python3 -m unittest discover -s scripts/tests -v
```

These tests may need Docker, Redis, or PowerShell depending on the fixture.
The distribution CI enables Docker integration explicitly. For a backend image
release, also run `scripts/validate-container-startup.sh IMAGE:TAG`.

For checker benchmarks, load, and long-running stability, use
[performance validation](../operations/performance-validation.md). A smoke run
is not a substitute for its release soak.
