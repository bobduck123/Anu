# Security Checklist

| Requirement | Result | Evidence |
| --- | --- | --- |
| Owner-only editor preserved | Pass | Existing auth Playwright suite passed. |
| Owner-only private preview preserved | Pass | Preview/publish and auth browser tests passed. |
| No public draft preview introduced | Pass | No route/API change; private preview flow retained. |
| Draft does not change public room before publish | Pass | New V1.5 media flow browser test and existing parity tests passed. |
| Publish remains explicit and confirmed | Pass | Dialog/browser proof passed. |
| Public room updates only after publish | Pass | Browser proof passed. |
| RoomKey remains published-only | Pass | New flow and existing RoomKey tests passed. |
| No schema/backend change | Pass | Frontend-only implementation and evidence additions. |
| No fake upload | Pass | Upload is rendered unavailable; no upload request is implemented in Media drawer. |
| No raw URL primary owner flow | Pass | Canvas selected-image raw URL panel replaced by candidate-based Media drawer. |
| Asset safety retained | Pass | Existing asset validator tests passed; Media drawer selects existing safe candidates. |
| No internal language on normal shell | Pass | New browser assertion on Build mode passed. |
| No auth/sign-out regression | Pass | Sign-out/RSC and auth-gate browser tests passed. |

## Deferred Media Security Work

Before enabling device upload, V1B must prove owner/room scope, private draft handling, MIME and extension validation, file-size limits, SVG policy, metadata stripping policy, publication transition behavior, and stable public serving.

