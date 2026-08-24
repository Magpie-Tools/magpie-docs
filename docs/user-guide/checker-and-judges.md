# Checker and Judges

Checker behavior combines global instance settings and settings owned by the
active workspace.

## Workspace settings

Workspace settings include:

- enabled protocols (`http`, `https`, `socks4`, `socks5`)
- timeout and retries
- transport protocol
- `use_https_for_socks`
- automatic failure-pause settings (the compatibility API fields retain the
  `auto_remove` name)
- judge list (`url`, `regex`)

REST endpoints:

- `GET /api/workspace/settings`
- `POST /api/workspace/settings`

The legacy `/api/user/settings` aliases remain available and resolve the same
selected workspace. Viewer or higher can read settings; operator or higher is
required to change them. Table-column selections are the exception: they are
stored per member and workspace.

GraphQL equivalent:

- Query: `viewer.settings`
- Mutation: `updateUserSettings(input: ...)`

## Judge notes

- Judge URLs are validated against website blacklist.
- Workspace judge relations are synchronized into the in-memory runtime cache.
