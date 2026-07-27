---
sidebar_position: 1
slug: /
---

# Magpie Documentation

Magpie is a self-hosted proxy manager for teams and individuals who need to ingest, validate, score, and rotate large proxy pools.

This site is the technical documentation for Magpie. The product source is
maintained across the repositories in the
[Magpie-Tools organization](https://github.com/Magpie-Tools).

## What Magpie does

- Scrapes proxies from user-defined sources
- Continuously checks proxies for liveness and quality
- Computes reputation labels and scores
- Exposes rotating proxy endpoints over HTTP/HTTPS/SOCKS
- Provides a web dashboard for day-to-day operations
- Exposes both REST and GraphQL APIs

## System at a glance

- [`magpie-backend`](https://github.com/Magpie-Tools/magpie-backend): Go `1.26` API + worker routines + rotating proxy listeners
- [`magpie-frontend`](https://github.com/Magpie-Tools/magpie-frontend): Angular `21.1` dashboard UI
- `postgres`: persistent relational storage
- `redis`: queueing, coordination, and distributed routines
- [`magpie-website`](https://github.com/Magpie-Tools/magpie-website): marketing website
- [`magpie-docs`](https://github.com/Magpie-Tools/magpie-docs): this Docusaurus documentation site

## Where to start

1. Use [Quick Start](getting-started/quick-start.md) if you want a working instance quickly.
2. Use [Installation](getting-started/installation.md) for setup variants.
3. Use [First Login](getting-started/first-login.md) for initial admin setup.
4. Use [API](api/rest-overview.md) if you are integrating clients.
