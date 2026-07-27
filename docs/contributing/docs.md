# Documentation Maintenance

Docs live in the `magpie-docs` repository. When documentation accompanies a
change in another repository, cross-link the pull requests.

## Local docs development

```bash
npm install
npm run start
```

## Build verification

```bash
npm run build
```

## Content guidelines

- Prefer behavior that is observable in code
- Call out constraints and defaults explicitly
- Keep API examples aligned with actual payload shapes
- Cross-link documentation and implementation pull requests
