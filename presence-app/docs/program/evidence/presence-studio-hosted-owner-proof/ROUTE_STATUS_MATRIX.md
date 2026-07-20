# Route/status matrix

This matrix records the successful hosted owner read-only run. The full machine-readable matrix is in `route-status-matrix.json`.

| Surface | Method | Status | Result | Notes |
|---|---:|---:|---|---|
| Hosted sign-in | Browser | n/a | Passed | Owner sign-in reached the deployed app using local env credentials. No credentials were printed. |
| `/studio/11/editor` | Browser | n/a | Passed | V2 editor shell loaded, and layout-composition controls were visible. |
| `/api/presence/owner/nodes` | GET | 200 | Passed | Owner-scoped list readable. |
| `/api/presence/owner/nodes/11` | GET | 200 | Passed | Owner-scoped node detail readable. |
| `/api/presence/owner/rooms/11/editor` | GET | 200 | Passed | Owner-scoped editor overview readable. |
| `/api/presence/owner/rooms/11/editor/draft` | GET | 200 | Passed | Owner-scoped editor draft readable. |
| `/studio/11/editor/preview` | Browser | 200 | Passed | Authenticated private preview loaded without editor instrumentation. |
| `/p/ggm-christina-goddard` | Browser | 404 | Passed | Anonymous public canonical route stayed unavailable/private and had no editor instrumentation. |
| `/presence/ggm-christina-goddard` | Browser | 404 | Passed | Anonymous public legacy route stayed unavailable/private and had no editor instrumentation. |

## Mutation/publication check

- Draft write/revert: not attempted.
- Publish: not attempted.
- Backend mutation: not attempted.
- Public state mutation: not attempted.
- Safe preview generation: existing owner preview endpoint used `POST /api/presence/owner/rooms/11/editor/preview`; this is the repo's `ownerReadFetch` safe preview contract and did not publish or overwrite owner content.
- Screenshots retained: four hosted proof screenshots.
