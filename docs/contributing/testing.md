# Testing

## Backend

```bash
# In magpie-backend
go test ./...
```

## Frontend

```bash
# In magpie-frontend
npm test
```

## Docs

```bash
# In magpie-docs
npm run build
```

## Suggested PR checks

- backend tests pass for touched packages
- frontend tests/build pass for touched components
- docs build succeeds if docs changed
