# Security Checklist

| Check | Status | Evidence |
| --- | --- | --- |
| Owner-only upload endpoint | Passed locally | Existing auth coverage and editor foundation tests |
| Room ownership enforced on upload/delete/cleanup | Passed locally | Owner API guards and negative upload tests |
| Draft object protected before publish | Implemented; hosted pending | Local protected-store test; hosted bucket re-smoke required |
| Publicly readable “private” Supabase bucket rejected | Passed locally | Mocked anonymous-read probe test |
| Short-lived private preview delivery | Passed locally | Signed local read test; Supabase hosted pending |
| Signed URL not persisted in draft state | Passed locally | Raw draft record assertion |
| Public unchanged before publish | Passed locally | Backend + Playwright lifecycle tests |
| Publish uses public media reference only | Passed locally | Promotion assertion |
| Unused private uploads omitted from public payload | Passed locally | Public serializer/promotion test |
| Public payload field hygiene retained | Passed locally | Unit + Playwright hygiene tests |
| RoomKey published-only behavior retained | Passed locally | Playwright and backend regression suites |
| Unsafe MIME/extension/signature/oversize inputs rejected | Passed locally | Existing upload policy tests |
| SVG blocked | Passed locally | Upload policy test |
| No frontend service credentials | Preserved | Storage operations remain backend-only |
| EXIF/GPS stripping | Not implemented | Deferred |
| Scheduled orphan purge | Not implemented | Authenticated cleanup endpoint only |
