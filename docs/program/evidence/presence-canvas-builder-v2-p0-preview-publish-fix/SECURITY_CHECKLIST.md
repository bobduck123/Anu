# Security Checklist

| Control | Status | Evidence |
| --- | --- | --- |
| No public draft preview endpoint added | Confirmed | Preview remains under `/studio/[id]/editor/preview` and uses bearer-authenticated owner editor endpoints. |
| No preview token exposed publicly | Confirmed for modified flow | No public route was added or altered; preview data is fetched only after owner-session validation. |
| No draft state in public output before publish | Passed locally | P0 Playwright test saves a marker, confirms it is absent publicly, then publishes. |
| No owner/internal/audit metadata introduced into public output | Confirmed for patch | No public serializer or backend response contract was changed in this pass. |
| Public route stays published-only | Passed locally | Marker becomes public only after confirmed publish; backend boundary tests pass. |
| RoomKey stays published-only | Passed locally | RoomKey displays the marker after publish only; backend RoomKey/public tests pass. |
| Anonymous preview denied | Passed locally | Anonymous preview renders the auth gate and no marker. |
| Non-owner preview denied | Passed locally | Mock authenticated non-owner receives denial and no marker. |
| Publish requires owner auth | Retained and tested indirectly | Publish uses the existing owner editor bearer-authenticated endpoint; backend owner-boundary tests pass. |
| Publish requires explicit confirmation | Passed locally | Visible primary action opens accessible dialog; request is sent only after `Open to visitors`. |
| Actual safety blockers still block opening | Passed locally | Unsafe asset test remains critical while first opening itself is non-blocking. |
| No backend schema change | Confirmed | Frontend lifecycle/readiness and tests only; no migration or model change. |
| No hard-coded hosted owner/room behavior | Confirmed | Production code remains parameterized by route room ID/session. Test fixture uses its existing deterministic room only. |

