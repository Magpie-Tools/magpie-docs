# Magpie Documentation

The Docusaurus source for the Magpie documentation published at
[magpie.tools/docs](https://magpie.tools/docs/).

## Reading paths

- [Learn Magpie in an afternoon](docs/learn/index.md) introduces the software
  through diagrams, practical workflows, and checkpoints.
- [Backend internals](docs/backend/index.md) follows a route through the Go
  process, queues, checker, persistence, and rotation, with source links.
- [Documentation maintenance](docs/contributing/docs.md) describes the content
  structure and visual review workflow.

## Requirements

- Node.js `22.12+`
- npm

## Development

```bash
npm ci
npm run start
```

## Validation

```bash
npm run typecheck
npm run build
```

The generated static output is written to `build/`.

[Dependency security review](DEPENDENCY_SECURITY.md) records the build-tool
overrides and the applicability of remaining audit findings.

The build checks internal links and anchors strictly. Run `npm run serve` to
inspect the result. Mermaid diagrams render in the browser and include
accessible descriptions, horizontal scrolling, and an expandable view. Check
changed diagrams in light/dark themes and at desktop/mobile widths.

## Deployment

```bash
npm run deploy
```

The deployment script publishes the generated site beneath `/docs` on the
distribution repository's `gh-pages` branch. Clone `magpie-docs` and `magpie`
as siblings, or set `MAGPIE_DISTRIBUTION_REPO` to the local distribution
repository path.

Use `MAGPIE_DEPLOY_DRY_RUN=1 npm run deploy` to build and validate without
changing `gh-pages`. Use `MAGPIE_DEPLOY_PUSH=0 npm run deploy` to create the
Pages commit locally without pushing it.

## Related repositories

- [Distribution and deployment](https://github.com/Magpie-Tools/magpie)
- [Backend](https://github.com/Magpie-Tools/magpie-backend)
- [Frontend](https://github.com/Magpie-Tools/magpie-frontend)
- [Website](https://github.com/Magpie-Tools/magpie-website)

## License

Magpie is distributed under the GNU Affero General Public License v3.0.
