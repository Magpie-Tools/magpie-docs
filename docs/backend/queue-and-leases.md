---
title: Queue scheduling and leases
description: Understand Redis payloads, sorted-set scheduling, atomic leases, concurrent imports, and the cost of a normal requeue.
---

# Queue scheduling and leases

The proxy queue is a recurring schedule. Claiming a route does not permanently
remove it. Redis temporarily moves its due time into the future, giving a
worker a lease. Successful completion schedules the next cycle; a crashed
worker leaves work recoverable when its lease expires.

## Payload and schedule are separate

| Redis structure | Purpose |
| --- | --- |
| `proxy:<hash>` | Compact route payload with route ID, host, port, credentials, stored route hash, and active workspace IDs. |
| Sharded sorted sets | Route membership with numeric due-time scores in Unix milliseconds. |
| `proxy_queue_heads` | Index of the earliest score in each shard, so workers can find due work. |

A **sorted set** orders members by their score. Shards split the large queue
into several sets. The heads index tells the worker which shard to inspect
first. A route is first due at the earliest scheduled check time of any
workspace that manages it, which spreads an import across the workspace's
check cadence. An import that adds a workspace with a faster cadence pulls an
already queued route forward; no import postpones one.

The payload describes what to check. The sorted-set score describes when to
check it. Normal requeues change scheduling state without writing the payload.

## One lease lifecycle

```mermaid
stateDiagram-v2
    accTitle: Recurring route lease lifecycle
    accDescr: A waiting route is leased. A current worker can renew or complete it. An interrupted lease expires and another worker can recover it. Inactive routes are removed.
    [*] --> Waiting: Publish active route
    Waiting --> Leased: Due route claimed atomically
    Leased --> Leased: Renew between long-running attempts
    Leased --> Waiting: Complete current lease and schedule next cycle
    Leased --> Recoverable: Worker exits or stops renewing
    Recoverable --> Leased: Lease expires and another worker claims
    Waiting --> Removed: No active management
    Leased --> Removed: Ownership verification finds no active management
    Removed --> [*]
```

`GetNextProxyContext` calls `pop.lua`, which atomically reads the payload and
moves the score to a five-minute lease expiry. The exact fractional `.5`
marks the score as a lease rather than an ordinary due time. The worker
retains its lease score, shard, original payload, and cancellation context.

The worker renews between outbound attempts when less than two minutes remain.
A short cycle needs no renewal command. If it loses the lease, it abandons
the cycle. Another worker can reclaim expired work.

## Completion must prove ownership of the lease

Imagine worker A claims a route and stalls. Its lease expires; worker B claims
it. If A finishes afterward, it must not overwrite B's schedule. `complete.lua`
compares the expected lease score with the current score and rejects stale
completion. Removal also checks the original payload so a stale worker cannot
erase a concurrent import.

Another race occurs when a workspace imports the route during a check. Normal
completion leaves the payload untouched. If the worker also needs an ownership
change, `RequeueProxyWithPayload` supplies its original snapshot and desired
payload. The completion script merges that worker's ownership delta into the
newer payload, retaining concurrently added workspaces and current credentials.

```mermaid
sequenceDiagram
    accTitle: An import during a check
    accDescr: While a worker checks a Lab route, an import adds Production. Normal lease completion changes only the schedule, preserving both workspace IDs.
    participant A as Worker A
    participant Q as Redis
    participant I as Concurrent import
    A->>Q: Claim route with workspace Lab
    I->>Q: Publish updated payload with Lab and Production
    A->>Q: Normal completion with expected lease
    Q->>Q: Update schedule only
    Note over Q: Updated payload still includes Production
    Q-->>A: Lease completion accepted
```

`RequeueProxy` makes the route due again at the time the checker gives it: the
earliest scheduled check time of any workspace that manages the route. Each
workspace's check cadence gives it fixed check times on each route, computed
from the in-memory allowance snapshot. A dequeue checks the route only for the
workspaces that have reached one of theirs, so every workspace keeps its own
cadence on a shared route. Workspaces share those checks. The check times of
all workspaces on one route are laid over each other, so equal cadences and
cadences that divide each other are due at the same dequeues. A cycle that
checks a route also serves a workspace whose next check time comes before the
route's next visit, ahead of that time. A shared route is therefore checked
about as often as its fastest workspace alone would check it: exactly for
fixed intervals and for automatic cadences with the same minimum interval,
and a few percent more often for other combinations. A workspace the cycle
checked
waits for its first time after the cycle ended, which keeps slow checks from
running back to back. A route whose workspaces have no check time within six
hours is revisited after at most six hours without a check. Tag profiles
change the checks inside the cycle. They affect this schedule only through
the number of checks per cycle, from which an automatic cadence is computed.

## The default queue path has a deliberate cost boundary

Magpie checks millions of routes repeatedly. It keeps work that belongs to
import or settings changes out of routine queue maintenance.

| Queue operation | Current default behavior |
| --- | --- |
| Decode a claimed payload | Decode its JSON and reuse the stored route hash. |
| Credential encryption/decryption or route-fingerprint calculation on dequeue | None for a current plaintext payload. |
| Load credentials from PostgreSQL on dequeue | None for a current payload. |
| Ordinary requeue | Complete the lease and update sorted-set scheduling through Lua. |
| JSON encode or payload `SET` on ordinary requeue | None. |
| Changed ownership, credentials, or payload format | Persist a changed payload through the appropriate mutation/migration path. |

This table describes queue payload maintenance. It does not claim that an
entire check has no database or Redis work. Failure tracking, batched ownership
verification, and result admission have separate responsibilities. A Lua call
also executes several Redis operations internally; one client call is not one
internal operation.

`PROXY_QUEUE_ENCRYPT_CREDENTIALS=false` is intentional. PostgreSQL encrypts
managed credentials; Redis is trusted runtime infrastructure. Protect Redis
with private networking, authentication, restricted ACLs, TLS for remote
connections, and encrypted volumes and backups.

Opt-in queue encryption encrypts new or changed payloads and decrypts on
dequeue. Normal requeue still avoids rewriting unchanged credentials. Readers
support legacy plaintext and encrypted payloads until an explicit migration
removes them. Keep `PROXY_ENCRYPTION_KEY` stable because PostgreSQL credentials,
keyed route fingerprints, and legacy encrypted queue data depend on it.

<details>
<summary>Checkpoint: why not encrypt and rewrite the route after every check?</summary>

Ordinary checks did not change its credentials or ownership. Repeating that
work adds cipher operations, JSON encoding, and payload writes to every cycle.
The current design pays for changed payloads when they change and uses the
stored hash while scheduling routine checks.

</details>

Read the source: [queue implementation](https://github.com/Magpie-Tools/magpie-backend/blob/main/internal/jobs/queue/proxy/proxy_queue.go),
[claim script](https://github.com/Magpie-Tools/magpie-backend/blob/main/internal/jobs/queue/proxy/pop.lua),
[completion script](https://github.com/Magpie-Tools/magpie-backend/blob/main/internal/jobs/queue/proxy/complete.lua),
and [Redis credential ADR](https://github.com/Magpie-Tools/magpie-backend/blob/main/docs/adr/0002-keep-hot-proxy-credentials-plaintext-in-redis.md).

Next: [the checker](checker.md).
