# Updating

## If you installed via one-command installer

### macOS/Linux

```bash
curl -fsSL https://raw.githubusercontent.com/Magpie-Tools/magpie/refs/heads/master/scripts/update.sh | bash
```

### Windows (PowerShell)

```powershell
iwr -useb https://raw.githubusercontent.com/Magpie-Tools/magpie/refs/heads/master/scripts/update.ps1 | iex
```

## If you cloned manually

### macOS/Linux

```bash
./scripts/update-frontend-backend.sh
```

### Windows (CMD)

```bat
scripts\update-frontend-backend.bat
```

## Key safety requirement

Keep `PROXY_ENCRYPTION_KEY` stable during updates. If you rotate it unintentionally, previously encrypted data becomes unreadable.

## Database migration

The bundled update scripts stop the backend and run the new image's migration
before restarting the stack. Before updating, take coordinated PostgreSQL and
Redis backups. For a manual Docker Compose update, run:

```bash
docker compose pull
docker compose stop backend
docker compose run --rm backend --migrate-only
docker compose up -d
```

Keep every backend instance stopped until the migration finishes. The proxy
storage migration removes columns used by older backend images, so rollback
requires the matching PostgreSQL and Redis backups.
