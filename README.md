# Magpie Documentation

The Docusaurus source for the Magpie documentation published at
[magpie.tools/docs](https://magpie.tools/docs/).

## Requirements

- Node.js `20+`
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
