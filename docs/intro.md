---
sidebar_position: 1
slug: /
title: Magpie documentation
description: Learn to run Magpie, manage a proxy pool, and understand the Go backend through guided workflows and diagrams.
hide_table_of_contents: true
---

import Link from '@docusaurus/Link';

# Understand your proxy pool

Magpie is a self-hosted proxy manager. You give it proxy addresses or webpages
that list them. It checks those proxies repeatedly, records the results, and
lets your applications connect through a rotating selection of healthy routes.
The web dashboard and API manage the same workspace resources.

<div className="docs-paths">
  <Link className="docs-path" to="/learn/">
    <span className="docs-path__label">Start here</span>
    <h2>Learn Magpie</h2>
    <p>A guided afternoon for a first-time user. Learn the terms, import a route, read a check, and connect through a rotator.</p>
    <span className="docs-path__action">Follow the learning path →</span>
  </Link>
  <Link className="docs-path" to="/backend/">
    <span className="docs-path__label">Go deeper</span>
    <h2>Inside the backend</h2>
    <p>Follow a route through the Go process, Redis scheduling, workspace checks, PostgreSQL results, and upstream selection.</p>
    <span className="docs-path__action">Explore the backend →</span>
  </Link>
  <Link className="docs-path" to="/getting-started/quick-start">
    <span className="docs-path__label">Get running</span>
    <h2>Install Magpie</h2>
    <p>Start the Docker Compose stack, create your first account, and verify that the backend is ready.</p>
    <span className="docs-path__action">Open the quick start →</span>
  </Link>
</div>

## The whole workflow

```mermaid
flowchart TD
    accTitle: The Magpie workflow
    accDescr: Proxy inputs become checked workspace routes. Your application reaches a target through a Magpie listener and an eligible upstream.
    Input["Your proxy list or scrape sources"] --> Import["Magpie imports routes into a workspace"]
    Import --> Check["Workers test routes through judges"]
    Check --> History["Save workspace check results"]
    History --> UI["Inspect health in the dashboard"]
    History --> Pool["Select eligible healthy routes"]
    App["Your application"] --> Listener["Magpie rotating listener"]
    Listener --> Pool
    Pool --> Target["Upstream proxy connects to your target"]
```

Magpie manages proxies you supply or discover. A successful import only means
Magpie accepted the route. A successful check means it passed a particular
workspace's validation at that time. Neither guarantees that every target
website will accept traffic through it.

## Find the right guide

| You want to… | Read |
| --- | --- |
| Understand proxies and the parts of Magpie | [How Magpie works](learn/how-magpie-works.md) |
| Learn by doing | [Your first proxy workflow](learn/first-proxy.md) |
| Add sources, tags, and alerts | [Build a pool that maintains itself](learn/automate-a-pool.md) |
| Explain an empty pool or an unknown health result | [Observe and troubleshoot](learn/observe-and-troubleshoot.md) |
| Understand the implementation | [Backend internals](backend/index.md) |
| Look up a field or endpoint | [Configuration](reference/configuration.md), [environment variables](reference/environment-variables.md), or [REST API](api/rest-overview.md) |
| Run a server for other people | [Deployment](operations/deployment.md), [security](operations/security.md), and [backups](operations/backup-and-recovery.md) |

The code lives in the [Magpie-Tools repositories](https://github.com/Magpie-Tools).
The [backend code map](backend/code-map.md) explains which repository and package
owns each part.
