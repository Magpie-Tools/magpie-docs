---
title: Glossary
description: Plain-language definitions of Magpie domain terms and the backend concepts used throughout the documentation.
---

# Glossary

These terms have the same meaning in the user guides and backend lessons.
The backend's [domain glossary](https://github.com/Magpie-Tools/magpie-backend/blob/main/CONTEXT.md)
records the canonical resource vocabulary.

## Resources and access

| Term | Meaning |
| --- | --- |
| User account | Your login identity and personal credentials. |
| Workspace | The owner of operational resources, settings, capacity, and subscription. |
| Membership | Your access to one workspace, with a workspace role. |
| Workspace role | Owner, admin, operator, or viewer. Controls actions in that workspace. |
| Instance administrator | A global account role for installation settings. It does not grant membership in every workspace. |
| Invitation | An offer to an existing account to join a workspace. It grants access only after acceptance. |
| Capacity | The workspace's allowed active managed-proxy count. Paused and archived entries stay stored without using active capacity. |

## Proxies and checks

| Term | Meaning |
| --- | --- |
| Host | A DNS hostname, IPv4 address, or IPv6 address where a proxy can be reached. Compatibility API fields may call this `ip`. |
| Proxy route | Host, port, and one exact credential pair. Shared route identity is independent of workspace management. |
| Managed proxy | A workspace's management of a route, including its encrypted credential copy, lifecycle, failure state, and tags. |
| Lifecycle | Active, paused, or archived state of a managed proxy. Separate from health. |
| Tag | A workspace-owned name and color assigned to managed proxies. Tags can also match checker rules. |
| Checker profile | Enabled proxy protocols and shared transport, timeout, and retries in Default or an Add/Replace tag rule. |
| Effective checker settings | The result of combining workspace defaults and matching tag rules in priority order. |
| Proxy protocol | The proxy behavior used for a check or upstream connection: HTTP, HTTPS, SOCKS4, or SOCKS5. |
| Transport | How bytes travel. Magpie supports TCP, QUIC, and HTTP/3 in specified checker/listener combinations; SOCKS requires TCP. |
| Judge | A test URL reached through a proxy, with a workspace validation rule for its response. |
| Check cycle | One scheduled route visit by a worker. It can contain several protocol/judge assignments and request retries. |
| Check evidence | A result's verdict and configuration identity for a participating workspace. |
| Current health | This workspace's health assessment using evidence matching its current effective settings. |
| Unknown health | No applicable evidence, or a pending settings refresh. It does not prove failure. |
| Failure streak | Consecutive eligible cycles with no success for one managed proxy. A successful cycle resets it. |
| Reputation | A score or label derived from check and enrichment evidence. It is separate from current health. |

## Discovery and traffic

| Term | Meaning |
| --- | --- |
| Scrape source | A webpage URL from which Magpie extracts proxy routes. |
| Source subscription | A workspace's use of a source, including its fetch mode and settings. |
| Source tagging rule | Tags to add to accepted proxies found in future scrapes. Existing assignments remain until removed. |
| Rotating proxy or rotator | A named workspace listener that selects upstream routes according to a policy. |
| Listener | The host, port, protocol, and transport to which a proxy client connects. |
| Upstream | The selected proxy through which Magpie forwards client traffic. |
| Rotator pool | Routes governed by one rotator's policy. The usable pool contains routes currently eligible for selection. |
| CONNECT tunnel | A connection through an HTTP proxy that forwards bytes to a target, commonly for HTTPS. An established tunnel keeps its upstream. |
| Alert rule | A workspace-owned threshold condition with optional delivery destinations. |
| Incident | A sustained breach tracked until sustained recovery or a configuration change closes it. |
| Checker success rate | The proportion of attributed checker attempts that passed in an observation window. It does not measure your application's requests. |

## Backend concepts

| Term | Meaning |
| --- | --- |
| Worker | A background routine that processes queued work. In Go, many run concurrently in one process. |
| Queue | Runtime work waiting for its scheduled time, stored in Redis. |
| Sorted set | A Redis collection whose numeric scores order entries. Magpie uses due times to schedule route checks. |
| Shard | One of several sorted sets used to distribute a large queue. |
| Lease | A temporary claim on a route. Expiry lets another worker recover interrupted work. |
| Fingerprint or route hash | A stable keyed identifier derived from host, port, and exact credentials. Current queue payloads store it for reuse. |
| Runtime snapshot | Compiled settings held in memory so workers can resolve checks without loading tags and configuration for every route. |
| Redis Stream | A sequence of result entries that consumers can claim, process, acknowledge, and replay. |
| Acknowledgement | Recording that a stream entry has been handled. Magpie acknowledges successfully handled results after persistence. |
| Transaction | A database unit whose changes commit together or roll back together. |
| Idempotent ingestion | Replaying an identified result does not create duplicate committed history or counters. |
| Read model | A derived table or cache shaped for reads, such as source totals or dashboard summaries. |
| Leader job | A job coordinated with a Redis lease so backend replicas avoid running the same maintenance concurrently. |
| Outbox | Durable database rows awaiting external message delivery and retries. |

Return to the [learning path](index.md) or open the [backend overview](../backend/index.md).
