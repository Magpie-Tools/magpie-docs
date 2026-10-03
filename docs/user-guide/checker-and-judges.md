# Checker and Judges

Checker behavior combines global instance settings and settings owned by the
active workspace.

## Workspace settings

Workspace settings include:

- enabled protocols (`http`, `https`, `socks4`, `socks5`)
- timeout and retries
- transport protocol
- `use_https_for_socks`
- automatic failure-action settings, choosing Pause or Delete (the compatibility API fields retain the
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

## Automatic failure action

In **Checker Settings**, enable automatic failure handling, choose **Pause** or
**Delete**, and set the number of consecutive failed checks. The action applies
to the selected workspace. Automatic handling is disabled by default, the
default action is Pause, and the default threshold is three failed checks.

A failure means a completed check cycle had eligible judge/protocol checks but
none succeeded. Any successful result resets the workspace's failure streak.
A cycle with no eligible checks does not count as a failure. The threshold UI
accepts 1 through 255; the APIs also accept zero to disable threshold enforcement.

- **Pause** retains the managed proxy, credentials, and tag assignments so you
  can activate it again. Reimporting or scraping it again leaves it paused.
- **Delete** removes the managed proxy, credentials, failure streak, and tag
  assignments from this workspace. Other workspaces managing the same route
  retain their proxies. Later scraping or import may add the deleted route
  again with a fresh failure streak and without its former tag assignments.
  A source's configured automatic tags or selected import tags may be assigned
  when the route is added again.

Changing the action preserves current failure streaks and leaves already-paused
and archived proxies untouched. Delete requires a subsequent failed check,
including after a restart. Pause keeps the existing startup cleanup of active
proxies whose saved failure streak already meets the threshold.

REST exposes the choice as `failure_action`, accepting `pause` or `delete`.
GraphQL uses `failureAction` with the same values. Omitting the action when
saving settings preserves the workspace's current choice.

## Judge notes

- Judge URLs are validated against website blacklist.
- Workspace judge relations are synchronized into the in-memory runtime cache.
