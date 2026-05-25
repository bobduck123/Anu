# Security Checklist

| Control | Status | Evidence |
| --- | --- | --- |
| Draft preview remains owner-authenticated only | Passed locally | Browser owner/anonymous/non-owner preview assertions |
| No public draft preview endpoint introduced | Confirmed by change review | Existing protected editor preview route retained |
| No preview tokens introduced or exposed | Confirmed by change review | Bearer owner session remains the transport |
| Public route remains published-only before confirmation | Passed locally | Browser public-before-publish assertion |
| RoomKey remains published-only | Passed locally | Browser and backend RoomKey coverage |
| Publish requires explicit owner action and confirmation | Passed locally | Visible button/dialog/request test |
| Publish is not automatically retried | Confirmed by code and unit test | `ownerReadFetch` excluded from publish |
| Confirmed non-owner denial is not retried into access | Passed locally | Unit and browser denial coverage |
| Unsafe image URLs remain blocked | Passed locally | Readiness and asset validator contracts |
| Public private/internal metadata leakage introduced | No change identified | Backend redaction tests pass |
| Debug panel exposes only safe runtime labels | Confirmed by inspection | Panel contains build/host/connection/transport labels only |
| Backend schema drift | None | Frontend-only source changes and test fixtures |

## Hosted Verification Still Required

After deployment, repeat anonymous preview denial, public-before-publish, public-after-publish, RoomKey, and public HTML leakage checks on the hosted URL.
