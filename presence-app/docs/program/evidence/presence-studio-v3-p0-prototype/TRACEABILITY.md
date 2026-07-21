# Traceability

| Requirement | Evidence | Status |
| --- | --- | --- |
| Default-off BBB-only gate | `lib/presence/studio-v3/feature.ts`; `compiler.test.ts`; `presence-studio-v3-bbb-prototype.spec.ts` | Implemented |
| Existing editor route only | `app/(studio)/studio/[id]/editor/page.tsx`; no `/editor-v3` route added | Implemented |
| Live V2 public canvas | `components/presence-studio-v3/PresenceStudioV3Shell.tsx`; `PresenceStudioV2PublicRoom` receives optional bridge | Implemented |
| Synchronous bridge suppresses visitor behavior in editor | `lib/presence/studio-v3/editorBridge.ts`; `PresenceStudioV2PublicRoom.tsx`; `BbbVisionCanvasGallery.tsx`; bridge validation unit test | Implemented after capture-phase and destination-ID fixes |
| Local Piece and Collection placement | `compiler.ts`; `compiler.test.ts`; `presence-studio-v3-bbb-prototype.spec.ts` | Implemented with hidden/unavailable/incompatible/duplicate safeguards |
| One visible Look loop and one lock | `compiler.ts`; `PresenceStudioV3Shell.tsx`; prototype/mobile specs | Implemented |
| Named Look save/alter/restore | `compiler.ts`; unit test; prototype spec; owner-name input in shell | Implemented |
| Browser-local envelopes only | `localState.ts`; `compiler.test.ts`; restore assertion in prototype spec | Implemented with exact schema/base/session-partition/fingerprint validation |
| No public mutation | public invariance spec; request ledger | Implemented in local/mock coverage |
| No server draft/preview/publish/rollback writes | focused E2E request-ledger checks | Implemented; broad non-test write assertion added |
| Test-as-visitor removes editor bridge/chrome and returns | public invariance and mobile specs | Implemented |
| V2 editor eligibility remains unaffected by V3 gate | `presence-studio-v2-bbbvision-eligibility.spec.ts`; no global V3 env flag in Playwright config | Implemented |
| Undefined-bridge BBB renderer invariance | `BbbVisionCanvasGallery.tsx`; `PresenceStudioV2PublicRoom.tsx`; V2 BBB gallery parity spec | Implemented with bridge-scoped fallbacks/touch handling |
| Editor/mobile canvas activation coordinates | `BbbVisionCanvasGallery.tsx`; V3 mobile spec; V2 BBB gallery parity spec | Implemented from the canvas bounding rectangle, so editor topbar offsets do not move hit testing |
| Authenticated-session partition and lifecycle cleanup | `components/studio/ownerSession.ts`; `localState.ts`; `PresenceStudioV3Shell.tsx`; compiler unit tests | Implemented from the existing trusted Supabase browser-session subject, hashed before storage; no resource-owner partitioning or raw subject persistence |
| Strict local envelope rejection | `localState.ts`; compiler unit test | Implemented with whole-record rejection and invalid-key removal on restore |
| Required P0 More action and retained Shelf rows | `PresenceStudioV3Shell.tsx`; prototype spec | Implemented |
| Atomic browser-local snapshot and previous-good fallback | `PresenceStudioV3Shell.tsx`; `localState.ts`; compiler unit tests | Implemented as an immutable staged generation plus active/previous manifest. One opaque owner-scoped browser Web Lock serializes cleanup, restore/repair, pruning, and writes; restore accepts only a complete validated generation |
| Safe owner-authored local labels and locks | `compiler.ts`; `PresenceStudioV3Shell.tsx`; compiler unit test | Implemented |

Review gate:

- Fresh independent no-merge review is still required before commit.
