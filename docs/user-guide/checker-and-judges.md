# Checker and Judges

Checker behavior combines global instance settings and settings owned by the
active workspace.

## Workspace settings

Workspace settings include:

- Default and ordered tag rules for `http`, `https`, `socks4`, and `socks5`
- one shared transport, timeout, and retry count per Default or tag profile
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

## Default and tag settings

In **Checker Settings**, select **Default** to edit the baseline for every
managed proxy in the active workspace. Choose the enabled protocols in the
original protocol cards. The transport, timeout in milliseconds, and retries
apply to every enabled protocol in this profile.

Select a workspace tag and add a checker rule. A tag without a rule uses Default
and any other matching rules. Choose its mode:

| Mode | Effect |
| --- | --- |
| **Replace** | Use only the selected protocols. |
| **Add** | Include the selected protocols alongside the existing selection. |
| **Remove** | Disable the selected protocols and retain shared settings. |

For Replace and Add, transport, timeout, and retries can each **Inherit** or have
an explicit value. Explicit fields apply to every enabled protocol, including
protocols already enabled by Default or another tag. Inherited fields keep the
value from Default and preceding matching rules. Zero retries explicitly disables
extra attempts. An Add rule with no selected protocols can change only shared
settings.

For example, Default enables SOCKS5 with TCP, a 7500 ms timeout, and two retries.
An Add rule enables HTTP with a 5000 ms timeout and one retry. A matching proxy
runs both HTTP and SOCKS5 with TCP, 5000 ms, and one retry.

Open **Tag priority** to arrange configured tags by dragging their handles or
using the up/down buttons. The top tag has highest priority and applies last.
**Apply order** keeps the new order in your draft; **Cancel** discards popup
changes. A higher rule can remove a protocol added by a lower rule, restore a
removed protocol, or override shared settings.

TCP supports HTTP, HTTPS, SOCKS4, and SOCKS5. QUIC and HTTP/3 checks currently
support HTTP and HTTPS with HTTPS judges. SOCKS checks require TCP. Magpie rejects settings whose matching tag combinations
could leave SOCKS using QUIC or HTTP/3. Timeouts
accept 1–65535 ms and retries accept 0–255.

Judges, **Use HTTPS for SOCKS**, and automatic Pause/Delete settings remain
workspace-wide. Switching profiles keeps drafts. **Save checker settings** saves all
profiles and their priority order together; a failed save keeps the drafts.
Renaming or recoloring a tag preserves its rule. Deleting the tag deletes its
rule.

Edits and tag assignments take effect at the next scheduled check. A check
already running finishes with its captured settings. Changes do not reset
failure streaks. If the resulting selection is empty, Magpie skips checking
without increasing the failure streak or taking a failure action. The managed
proxy remains active and consumes workspace capacity.

## Current health and history

Current health uses results for this workspace's effective settings, including
transport, timeout, retries, and judge validation. A changed check has unknown
health until a matching result arrives. Unchanged checks keep their applicable
evidence. Old results remain in history, including results from checks that
were already running when settings changed. Another workspace's result cannot
supply this workspace's health.

While a committed settings change is waiting for its runtime refresh, health
reads show unknown and rotation excludes the affected workspace's proxies.
Refresh is retried automatically. Rotators require current TCP evidence for
their upstream connections; a successful QUIC check cannot qualify a TCP
upstream. See [Rotating Proxies](rotating-proxies.md).

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
