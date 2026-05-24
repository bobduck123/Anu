# Security Checklist

| Control | Status | Evidence / Note |
| --- | --- | --- |
| Draft privacy | Passed locally | Canvas persists through existing draft endpoints; backend draft-not-public regression passed |
| Owner-only access | Passed locally | Playwright non-owner denial plus backend owner authorization regression |
| Public preview prevention | Retained | No public draft endpoint added; full preview remains authenticated route |
| Asset safety | Hardened | Blocks file/data/internal/traversal/script/secrets; does not render or offer unsafe Canvas imagery; warns and confirms expiring signed CDN links |
| RoomKey published-only | Passed locally | Existing backend RoomKey/public contract tests passed |
| Public renderer published-only | Passed locally | E2E verifies draft title absent on public room until confirmed publish |
| No internal metadata leakage | Retained | No audit/owner/auth metadata exposed by Canvas; backend redaction regression passed |
| No unsafe style injection | Passed by design | Canvas exposes controlled style/mood/motion tokens only; no raw CSS input |
| No hard-coded owner identity | Retained | Existing owner auth flow used; no owner identifiers added |
| No backend schema drift | Passed by scope | No backend files, migrations, flattened configuration model, or preview-token system added |

## Asset Rules Enforced

- Reject local filesystem paths, traversal, `file:` URLs, `data:` URLs, script-like strings, non-HTTPS external links, embedded credentials, localhost, and private/internal network hosts.
- Reject raw access tokens and secrets even when the URL is on a signed-image CDN host.
- Permit common signed image CDN links only with an expiry warning and an explicit confirmation action.

## Explicit Non-Changes

- No Kimi backend, migration, token storage, or public preview endpoint was copied or reimplemented.
- No live/published write occurs from a Canvas edit; publish remains a separate confirmed operation.
