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
repository's `gh-pages` branch. The final production deployment can combine
that directory with the output of `magpie-website`.

## Related repositories

- [Backend](https://github.com/Magpie-Tools/magpie-backend)
- [Frontend](https://github.com/Magpie-Tools/magpie-frontend)
- [Website](https://github.com/Magpie-Tools/magpie-website)

## License

Magpie is distributed under the GNU Affero General Public License v3.0.
