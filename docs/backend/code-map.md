---
title: Code map and reading exercises
description: Find the repository, Go package, entry functions, and regression tests for each stage of the proxy lifecycle.
---

# Code map and reading exercises

Use this page after reading the workflow chapters. You do not need to read
every backend file. Pick a behavior, find its entry point, and read the tests
that describe its edge cases.

## Repository map

| Repository | Owns |
| --- | --- |
| [magpie](https://github.com/Magpie-Tools/magpie) | Compose, install/update scripts, deployment defaults, release validation. |
| [magpie-backend](https://github.com/Magpie-Tools/magpie-backend) | Go API, domain/storage code, queues, checker, scraper, jobs, listeners. |
| [magpie-frontend](https://github.com/Magpie-Tools/magpie-frontend) | Angular application and its nginx image. |
| [magpie-docs](https://github.com/Magpie-Tools/magpie-docs) | These Docusaurus lessons and reference pages. |
| [magpie-website](https://github.com/Magpie-Tools/magpie-website) | Public product website. |

## Backend package map

Paths below are relative to `magpie-backend`. Follow the linked source directory
to inspect the files named in the reading exercises.

| Package | Start with | Responsibility |
| --- | --- | --- |
| [`internal/app`](https://github.com/Magpie-Tools/magpie-backend/tree/main/internal/app) | `app.go`, `bootstrap/setup.go`, `bootstrap/lifecycle.go` | Process lifecycle and runtime startup. |
| [`internal/app/server`](https://github.com/Magpie-Tools/magpie-backend/tree/main/internal/app/server) | `routes.go`, `workspace_middleware.go`, `route_proxy_handler.go` | HTTP registration, authorization, input, response mapping. |
| [`internal/domain`](https://github.com/Magpie-Tools/magpie-backend/tree/main/internal/domain) | `proxy_model.go`, `user_proxy_model.go`, `checker_settings.go` | Resource models, lifecycle, checker configuration. |
| [`internal/database`](https://github.com/Magpie-Tools/magpie-backend/tree/main/internal/database) | `database_proxy_ingestion.go`, `database_proxy_status_handler.go` | Transactions, queries, projections, and schema. |
| [`internal/checkerconfig`](https://github.com/Magpie-Tools/magpie-backend/tree/main/internal/checkerconfig) | `cache.go`, `proxy_plans.go` | Compiled workspace snapshots and sparse plans. |
| [`internal/jobs/queue`](https://github.com/Magpie-Tools/magpie-backend/tree/main/internal/jobs/queue) | `proxy/proxy_queue.go`, `proxy/pop.lua`, `proxy/complete.lua` | Due-time scheduling and leases. |
| [`internal/jobs/checker`](https://github.com/Magpie-Tools/magpie-backend/tree/main/internal/jobs/checker) | `thread_handler.go`, `failure_tracker.go`, `ownership_verifier.go` | Shared checks and per-workspace outcomes. |
| [`internal/jobs/scraper`](https://github.com/Magpie-Tools/magpie-backend/tree/main/internal/jobs/scraper) | `thread_handler.go`, `browser_manager.go`, `request_handler.go` | Fetch, render, extract, and import source results. |
| [`internal/jobs/runtime`](https://github.com/Magpie-Tools/magpie-backend/tree/main/internal/jobs/runtime) | `proxy_statistics.go`, `alerts.go`, `workspace_usage.go` | Result consumers and recurring jobs. |
| [`internal/rotatingproxy`](https://github.com/Magpie-Tools/magpie-backend/tree/main/internal/rotatingproxy) | `manager.go`, `handler.go` | Listener lifecycle and client forwarding. |
| [`internal/security`](https://github.com/Magpie-Tools/magpie-backend/tree/main/internal/security) | `proxy_secret.go` | Credential cipher and keyed route identity. |
| [`internal/auth`](https://github.com/Magpie-Tools/magpie-backend/tree/main/internal/auth) | `middleware.go`, `jwt_handler.go`, `token_revocation.go` | Authentication and session revocation. |

Historical names remain in some files, tables, and environment variables.
`user_proxies` is workspace-managed proxy storage, and `Proxy.IP` can contain
a hostname. Read [the domain glossary](https://github.com/Magpie-Tools/magpie-backend/blob/main/CONTEXT.md)
before interpreting a compatibility name as a different ownership model.

## Exercise 1: trace a single upload

Find `addProxies` and `ingestProxyUploadMultipartWithTags` in the upload handler.
Follow a flush into `InsertAndGetProxiesWithWorkspace`. Identify the transaction
that stores routes and management, then locate tag assignment and Redis
publication after it.

Explain which changes can remain committed if the response reports a later
failure. Read `route_proxy_handler_test.go` and
`proxy_access_storage_test.go` for explicit workspace selection and exact
credential identity.

## Exercise 2: explain the queue cost

Follow `GetNextProxyContext`, `RequeueProxy`, and `RequeueProxyWithPayload`.
Compare `pop.lua` and `complete.lua`. Find these regression tests:

- `TestQueuedProxyToDomainProxy_CurrentPlaintextPayloadReusesHashWithoutEncryptionKey`
  in `proxy_queue_test.go`.
- `TestRequeueProxy_OnlyPersistsPayloadWhenRequested` in the same file.
- `TestPlaintextProxyCycleCommandBudgetAndPayload` in
  `proxy_queue_concurrency_test.go`.

Explain why normal completion cannot overwrite a newer payload. Count cipher
operations, JSON encodes, Redis client calls and internal commands, and
database queries before proposing any hot-loop change. A new operation needs
representative throughput measurements and a written reason.

## Exercise 3: follow conflicting workspace verdicts

Read `buildRequestAssignments`, `processJudgeAssignments`, and
`CheckProxyWithRetries` in the checker. Then read
`TestSharedRequestKeepsWorkspaceValidationEvidence` in `tag_settings_test.go`.
Trace the evidence through `InsertProxyStatistics` to latest health reads.

Explain why one physical response can produce opposite workspace health and
why a changed configuration cannot reuse every old success.

## Exercise 4: crash between commit and acknowledgement

Read `proxy_statistics_recovery_test.go`,
`proxy_statistics_shutdown_test.go`, and
`proxy_statistics_idempotency_test.go`. Locate the event ledger write inside
the statistics transaction.

Explain what another consumer can replay, what prevents duplicate counters,
and why the memory fallback has a weaker recovery guarantee.

## Validate changes in the right environment

The [local development guide](../getting-started/local-development.md) sets up
PostgreSQL and Redis. Use disposable test services and separate Redis databases
for queue concurrency tests; those fixtures flush their selected test database.
Do not point them at a running instance's Redis.

For a queue or checker change, run the required backend checks from
`magpie-backend`:

```bash
go test ./... -count=1
go test -race ./... -count=1
go vet ./...
go build ./cmd/magpie
```

Real-service tests use `MAGPIE_TEST_POSTGRES_DSN`, `MAGPIE_TEST_REDIS_URL`, and
`MAGPIE_TEST_QUEUE_REDIS_URL` for their respective fixtures. Many tests use
SQLite or miniredis without those settings, while tests requiring real
services skip. Passing a skipped test does not measure PostgreSQL query cost
or production Redis concurrency. See [testing](../contributing/testing.md)
and [performance validation](../operations/performance-validation.md).

You have completed the backend tour. Return to the
[backend overview](index.md) for the whole pipeline, or use
[configuration](../reference/configuration.md) and the [API reference](../api/rest-overview.md)
while building an integration.
