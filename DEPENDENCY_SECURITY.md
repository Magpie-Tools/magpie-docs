# Dependency security review

Reviewed on 20 October 2026 with Node.js 22.23.1 and npm 10.9.8.

The dependency refresh removes all critical findings. Both the full audit and
`npm audit --omit=dev` report 29 high and 2 moderate affected packages. These are
propagated findings from two advisories described below. Docusaurus puts its
build and development tools in `dependencies`, so `--omit=dev` also includes
tools that never run on the deployed site. `scripts/deploy-gh-pages.sh`
publishes only the generated static `build/` directory.

## Patched dependencies

All Docusaurus packages remain on 3.10.2. Do not use the audit command's suggested
forced downgrade to 3.7.0. The lockfile updates webpack-dev-server to 5.2.7 and
the package overrides select patched versions where upstream dependency ranges
still exclude them:

| Dependency | Previous | Selected | Reason |
| --- | --- | --- | --- |
| tinypool | 1.1.1 | 2.1.2 | Fix both prototype-pollution worker execution gadgets. |
| serialize-javascript | 6.0.2 | 7.0.5 | Fix executable serialized output and array-like input CPU exhaustion. |
| postcss-selector-parser | 6.1.4 | 7.1.6 | Fix quadratic selector parsing. |

Tinypool's major-version change drops Node 18 support. The serializer's major
change requires Node 20. Both fit this repository's Node 22.12 minimum. The
selector parser changes insertion behavior during iteration; the clean
production build verifies its use by the existing CSS plugins. See the upstream
[tinypool release](https://github.com/tinylibs/tinypool/releases/tag/v2.0.0),
[serializer release](https://github.com/yahoo/serialize-javascript/releases/tag/v7.0.0),
and [selector parser release](https://github.com/postcss/postcss-selector-parser/releases/tag/v7.0.0).

The fixed issues are documented in the upstream
[worker options advisory](https://github.com/tinylibs/tinypool/security/advisories/GHSA-5gmw-xhrv-c9v3),
[run options advisory](https://github.com/tinylibs/tinypool/security/advisories/GHSA-85c8-ppgw-ccpr),
[serialization advisory](https://github.com/yahoo/serialize-javascript/security/advisories/GHSA-5c6j-r48x-rmvq),
[serializer CPU advisory](https://github.com/yahoo/serialize-javascript/security/advisories/GHSA-qj8w-gfj5-8c6v),
and [selector parsing advisory](https://github.com/postcss/postcss-selector-parser/security/advisories/GHSA-rj75-hqrm-r3gf).

Remove each override when Docusaurus and its plugins declare a patched compatible
range, then repeat the clean installation, typecheck, and production build.

## Remaining applicability decisions

### Braces, GHSA-vfj7-8cjw-p6xm

`braces@3.0.3` remains through chokidar and micromatch, including the Docusaurus
utilities, copy plugin, and development-server dependency chains. The
[upstream report](https://github.com/micromatch/braces/issues/70) concerns deeply
nested attacker-supplied glob patterns. No patched release is available in the
[advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

The docs build takes source paths and glob patterns from the checked-in
configuration and build tools. The static deployment does not accept remote
glob patterns or run these Node packages. Retain the current toolchain for this
deployment. This decision does not cover a future service that accepts external
patterns, a publicly exposed development server, or builds of untrusted source
with publishing credentials. Reassess when a fix becomes available or those
inputs change. All 29 high package findings derive from this advisory.

### UUID, GHSA-w5hq-g745-h8pq

`webpack-dev-server -> sockjs@0.3.24 -> uuid@8.3.2` accounts for the two moderate
findings. The [upstream advisory](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq)
affects the `v3`, `v5`, and `v6` methods when callers provide an output buffer.
SockJS's `lib/transport.js` imports only `v4` and calls it with no arguments.
That call does not reach the affected methods or buffer path. The development
server is also absent from the static deployment. Retain the upstream version
until SockJS updates its supported UUID range; reassess if this call path changes.

## Validation

`npm ci --ignore-scripts`, `npm run typecheck`, and `npm run build` pass. An
additional webpack build explicitly enables two SSG worker threads to exercise
the patched CSS and serialization tools and the overridden tinypool package.
Internal links and anchors retain their strict build checks.
The full and production-only audit outputs remain nonzero for the reviewed
findings above; they are not suppressed.
