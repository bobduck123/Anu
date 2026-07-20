# Security Checklist

| Requirement | Result | Proof |
| --- | --- | --- |
| Owner-only editor retained | Passed locally | Standard/debug owner and anonymous/non-owner Playwright assertions |
| Owner-only preview retained | Passed locally | Preview owner/anonymous/non-owner assertions |
| Debug is not an auth bypass | Passed locally | Anonymous and non-owner debug URL tests; source inspection |
| No public draft preview endpoint introduced | Confirmed | No route/API contract change |
| No preview token bypass introduced | Confirmed | Existing bearer owner access remains required |
| Draft/public boundary retained | Passed locally | Existing Canvas parity/publish tests |
| Publish remains explicit and confirmed | Passed locally | Publish confirmation browser test |
| Public changes only after publish | Passed locally | Public-before/public-after assertions |
| RoomKey remains published-only | Passed locally | Browser and backend regression coverage |
| Safe read retry does not retry publish writes | Retained | Existing client unit contract |
| Auth diagnostics contain no secrets/private metadata | Confirmed by inspection | Labels/hosts/readiness only |
| Backend auth/schema weakened | No | Backend code/schema untouched |

## Hosted Check Required

After deployment, repeat the anonymous standard/debug/preview denial checks and public HTML leakage scan before opening the pilot.
