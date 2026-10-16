---
description: "Find the repository that owns a change and follow a reproducible contribution and review workflow."
---

# Contributing

Choose the repository that owns the behavior you want to change. The
[backend code map](../backend/code-map.md) is a good starting point when you
are unsure where a proxy workflow is implemented.

## Repository responsibilities

| Repository | Changes it owns |
| --- | --- |
| [magpie](https://github.com/Magpie-Tools/magpie) | Compose, installation, updates, and release validation. |
| [magpie-backend](https://github.com/Magpie-Tools/magpie-backend) | Go API, domain/storage, checker, scraper, jobs, listeners. |
| [magpie-frontend](https://github.com/Magpie-Tools/magpie-frontend) | Angular UI and the frontend nginx image. |
| [magpie-docs](https://github.com/Magpie-Tools/magpie-docs) | Learning paths, guides, references, and runbooks. |
| [magpie-website](https://github.com/Magpie-Tools/magpie-website) | Public website. |

Use that repository's default branch when creating your branch. The component
repositories use `main`; the distribution repository uses `master`. Check the
remote default rather than assuming all repositories use the same name.

## A change a reviewer can assess

1. Reproduce the behavior on a small, isolated dataset. Record the expected and
   observed result with the selected workspace and relevant settings.
2. Read applicable `AGENTS.md` instructions and the backend's `CONTEXT.md`
   vocabulary. For a backend change, trace the relevant workflow before editing.
3. Make the change in its owning repository. Add tests that protect a behavior
   or a failure boundary rather than repeating implementation details.
4. Run the [checks for that area](testing.md). State when real-service tests
   skipped or a representative load test has not run.
5. Update user-facing docs and deployment files when behavior changes how Magpie
   is operated. Link related pull requests across repositories.
6. Describe the concrete before/after behavior and the validation in the PR.
   Include migration, compatibility, and rollback requirements when they apply.

## Backend boundaries to preserve

Workspace membership grants access; workspaces own operational resources and
capacity. Shared physical checks still need separate workspace validation
and current-health evidence. Avoid interpreting historical `user_*` table
or API names as a different ownership model.

The recurring checker loop is performance-sensitive. Current plaintext queue
payloads reuse their stored hash, and normal requeues change scheduling only.
Queue encryption remains opt-in. Count added cipher operations, JSON encodes,
Redis commands, and database queries per check; any addition needs a written
reason and representative measurements. Keep the hash-reuse and
scheduling-only requeue regressions. Read
[queue scheduling](../backend/queue-and-leases.md) and the backend's Redis
credential ADR before changing that boundary.

## Local setup and documentation

Use [local development](../getting-started/local-development.md) for the sibling
checkout layout and development fixtures. Fixtures help UI work; live jobs
and listeners remain stopped in fixture mode.

For a docs change, follow [documentation maintenance](docs.md), including
browser review of diagrams. Installation commands should be tested on
isolated infrastructure rather than a running personal installation.

## License

Magpie is distributed under AGPL-3.0. Review the owning repository's `LICENSE`
before contributing.
