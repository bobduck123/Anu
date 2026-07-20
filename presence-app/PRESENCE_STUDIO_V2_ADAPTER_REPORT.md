# Presence Studio V2 Adapter Report

Date: 2026-06-03

## Status

Completed the first safe integration slice: Studio V2 model, adapter, sanitizer, feature flag helper, and optional sanitized public payload projection.

**Phase A adapter hardening is also complete.** See `PRESENCE_STUDIO_V2_PHASE_A_HARDENING_REPORT.md` for details.

This is not the full Studio V2 UI integration yet. The real owner editor route still renders the existing production editor unless later work mounts the V2 editor behind the feature flag.

## What Was Integrated

- Added Studio V2 typed runtime/public models.
- Added `studioV2FromPresenceConfig(config, node)` to load V2 state from the real nested editable config contract.
- Added `presenceConfigFromStudioV2State(studioState, existingConfig)` to save V2 state back into:
  - `scene_config`
  - `style_dna`
  - `motion_config`
  - `asset_config`
  - `content_config`
  - `roomkey_config`
  - `enquiry_config`
- Added `publicRoomFromStudioV2State(studioState)` for public projection.
- Added `sanitizeStudioV2PublicPayload(configOrState)` and leak scanner.
- Added `PRESENCE_STUDIO_V2_RENDERER_KEY = presence-studio-v2-room`.
- Added feature flag helper for:
  - `NEXT_PUBLIC_PRESENCE_STUDIO_V2`
  - `NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS`
  - `PRESENCE_STUDIO_V2_ENABLED`
  - `PRESENCE_STUDIO_V2_PILOT_IDS`
- Extended public payload restricted-key scanning for V2-specific forbidden terms.
- Added optional `studioV2Room` to public render payloads only when the flag and pilot eligibility allow it.

## Phase A Hardening (New)

- **Production pilot gating guard:** Empty pilot list in production now returns `false`.
- **Moodboard legacy lift:** Safely lifts references from `content_config.moodboard`, `content_config.moodboardRefs`, `asset_config.moodboard`, `asset_config.references`.
- **Typed fallback factory:** `fallbackNode` cast replaced with `createFallbackNode`.
- **Explicit world mapping:** `room_type` → V2 world ID map added before substring heuristic.
- **Trace model cleaned:** Removed orphaned `eventBeacon` / `portal` sub-objects.
- **URL safety hardened:** `safePublicUrl` now rejects `//` pathnames in full URLs.
- **Test coverage expanded:** 13 adapter tests (was 5), 3 public payload tests.

## What Remains Prototype-Only

- Studio V2 cockpit UI.
- Wild/Guided Mode controls inside the real owner route.
- V2 Skin Lab UI inside the real owner route.
- V2 public room renderer dispatch.
- Hosted save/preview/publish lifecycle through the real UI.
- Browser QA for the full V2 experience.

## Persistence Decision

Studio V2 should save through the existing owner editor draft API, not the TemplateKit draft endpoint.

Reason: the TemplateKit endpoint currently protects private draft templates by rejecting structural room edits. Studio V2 requires structural actions such as add, delete, duplicate, transforms, Skin Lab changes, moodboard references, and mobile recovery state.

## Public Hygiene

The public projection strips:

- `locked`
- `pinned`
- `hiddenPublic`
- `hiddenMobile`
- `draft`
- owner/editor/internal fields
- local filesystem paths
- owner API paths
- preview tokens/signed URLs/storage keys

Hidden public objects are removed from the public room. Mobile transform suspension is applied by zeroing public transforms while preserving layer order.

## Files Changed

- `lib/presence/studio-v2/model.ts`
- `lib/presence/studio-v2/adapters.ts`
- `lib/presence/studio-v2/sanitize.ts`
- `lib/presence/studio-v2/feature.ts`
- `lib/presence/studio-v2/index.ts`
- `lib/presence/studio-v2/studioV2Adapters.test.ts`
- `lib/presence/render/publicPayload.ts`
- `lib/presence/render/publicPayload.test.ts`

## Verification

- `npm.cmd run typecheck` passed.
- `npm.cmd run build` passed.
- `node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts` passed (13 tests).
- `node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts` passed (3 tests).

Node emitted a `MODULE_TYPELESS_PACKAGE_JSON` warning for direct TypeScript test execution. This is a test-runner warning only; the production build is clean.

## Remaining Risks

- The V2 UI has not been mounted inside `PresenceStudioEditorApp.tsx`.
- The V2 public renderer has not been dispatched from `PortfolioRenderer` or `PresenceDnaRenderer`.
- Backend `_public_redact` should still receive V2-specific redaction tests before hosted rollout.
- Hosted smoke is blocked until the editor UI integration is complete.
