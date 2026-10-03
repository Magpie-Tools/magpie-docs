# Testing

## Backend

```bash
# In magpie-backend
go test ./... -count=1
go test -race ./... -count=1
go vet ./...
go build ./cmd/magpie
go run golang.org/x/vuln/cmd/govulncheck@v1.8.0 ./...
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
