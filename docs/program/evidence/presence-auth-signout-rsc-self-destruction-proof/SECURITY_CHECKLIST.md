# Security Checklist

| Control | Status | Evidence |
| --- | --- | --- |
| GET sign-out no longer mutates session | Passed locally | Direct and RSC-style GET browser tests |
| RSC/prefetch cannot invoke visible logout link | Confirmed | Logout links removed; request monitor remains empty |
| Logout still requires explicit user action | Passed locally | Button click clears session marker |
| Explicit logout failure is not shown as success | Confirmed | Button retains retry state on Supabase error |
| Owner-only editor unchanged | Passed locally | Auth gate/editor tests |
| Owner-only draft preview unchanged | Passed locally | Preview tests |
| Anonymous/non-owner still denied | Passed locally | Existing and new browser tests |
| Debug query is not a bypass | Passed locally | Auth gate parity test |
| Draft/public/publish boundary unchanged | Covered by regression run | Canvas lifecycle suite |
| RoomKey remains published-only | Covered by regression run | RoomKey/browser/backend suite |
| No tokens, identities, or private metadata exposed | Confirmed | Test cookie is local fixture only; documentation contains no secrets |
| Backend schema/auth weakening | None | Backend untouched in this pass |
