# Local Development

## Prerequisites

- Go `1.26.x`
- Node.js `20.19+` or `22.12+`
- npm
- Docker (for Postgres + Redis during local dev)

The application components are maintained in separate repositories:

- `magpie-backend`: Go `1.26`
- `magpie-frontend`: Angular `21.1`, PrimeNG `21`, Tailwind CSS `4`
- `magpie-docs`: Docusaurus on Node.js `20+`

Clone the repositories as siblings so commands and tooling have a predictable
workspace:

```bash
mkdir magpie-workspace
cd magpie-workspace
git clone https://github.com/Magpie-Tools/magpie.git
git clone https://github.com/Magpie-Tools/magpie-backend.git
git clone https://github.com/Magpie-Tools/magpie-frontend.git
git clone https://github.com/Magpie-Tools/magpie-website.git
git clone https://github.com/Magpie-Tools/magpie-docs.git
```

## Start infrastructure

```bash
cd magpie
cp .env.example .env
# Set PROXY_ENCRYPTION_KEY in .env.
docker compose up -d postgres redis
```

## Run backend

```bash
cd ../magpie-backend
go run ./cmd/magpie
```

Backend defaults to port `5656`.

## Run frontend

```bash
cd ../magpie-frontend
npm ci
npm run start
```

Frontend dev server defaults to `http://localhost:4200`.

## Common dev commands

```bash
cd ../magpie-backend
go test ./...
```

```bash
cd ../magpie-frontend
npm test
```
