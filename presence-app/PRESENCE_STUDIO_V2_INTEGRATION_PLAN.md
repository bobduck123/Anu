# Presence Studio V2 Integration Plan

Date: 2026-06-03

## Executive Summary

Presence Studio V2 should be integrated as a feature-flagged Studio/editor and public renderer layer on top of the real Presence editable config contract. The prototype's runtime model, interaction behavior, visual system, and pilot content patterns are useful references, but the prototype's localStorage persistence must not become the hosted source of truth.

The safest integration path is:

1. Keep existing owner auth, preview, publish, public routes, and backend editable config APIs.
2. Add a Studio V2 adapter layer that maps between Studio V2 state and the existing nested config areas.
3. Save owner edits through the existing `/api/presence/owner/rooms/:id/editor/draft` API.
4. Publish through the existing `/api/presence/owner/rooms/:id/editor/publish` API.
5. Render published V2 rooms through a sanitized, allowlisted public projection.
6. Gate all V2 editor/public behavior behind explicit feature flags and pilot room IDs.

Do not use the current TemplateKit private draft endpoint as the main Studio V2 persistence path. That endpoint intentionally rejects structural changes such as chamber/object add/remove and broader room mutation, while Studio V2 requires add/delete/duplicate/transforms/Skin Lab/moodboard state.

## Integration Audit Map

### 1. Current Studio/editor Route

- Real editor route: `app/(studio)/studio/[id]/editor/page.tsx`
- Component: `components/studio/editor/PresenceStudioEditorApp.tsx`
- Access control: `useOwnerNode` + `StudioNodeGate`
- Current behavior: loads the owner room editor payload, edits nested config, saves drafts, opens private preview, publishes through the real editor APIs.

Related route:

- TemplateKit draft shell: `app/(studio)/studio/[id]/studio-room/page.tsx`
- Component: `components/presence-studio/StudioRoomOwnerEditorShell.tsx`
- Current behavior: private unpublished TemplateKit draft editing only. It intentionally has no publish action.

### 2. Current Owner Draft Load/Save API

Frontend client:

- `lib/api/editor.ts`
- `getPresenceEditor(roomId, token)`
- `getPresenceEditorDraft(roomId, draftId, token)`
- `createPresenceEditorDraft(roomId, input, token)`
- `patchPresenceEditorDraft(roomId, draftId, input, token)`

Backend:

- `flora-fauna/backend/app/api/presence_graph.py`
- `GET /api/presence/owner/rooms/<room_id>/editor`
- `GET|POST|PATCH /api/presence/owner/rooms/<room_id>/editor/draft`
- Service: `flora-fauna/backend/app/services/presence_editor_config.py`

This is the correct persistence path for Studio V2 owner edits.

### 3. Current Owner Preview Route

- Route: `app/(studio)/studio/[id]/editor/preview/page.tsx`
- Component: `components/studio/editor/PresenceDraftPreviewPage.tsx`
- API: `previewPresenceEditorDraft`
- Backend: `POST /api/presence/owner/rooms/<room_id>/editor/preview`
- Preview page metadata sets `robots: { index: false, follow: false }`.

Preview must remain owner-only/noindex and render a sanitized preview projection, not raw draft internals.

### 4. Current Publish Endpoint/Flow

Frontend:

- `publishPresenceEditorDraft(roomId, draftId, token)` in `lib/api/editor.ts`
- Existing UI in `PresenceStudioEditorApp.tsx`

Backend:

- `POST /api/presence/owner/rooms/<room_id>/editor/publish`
- Service: `publish_draft_config` in `presence_editor_config.py`

Studio V2 must publish through this flow.

### 5. Current Public Room Renderer

Routes:

- `app/(public)/p/[slug]/page.tsx`
- `app/(public)/presence/[slug]/page.tsx`
- `app/(public)/p/[slug]/works/[workId]/page.tsx`
- `app/(public)/p/[slug]/collections/[collectionId]/page.tsx`
- `app/(public)/room/[id]/key/page.tsx`

Public rendering path:

- `fetchDemoOrPublicNode(slug)`
- `createPublicRenderPayload(node)` in `lib/presence/render/publicPayload.ts`
- `PortfolioRenderer`
- `PresenceDnaRenderer` / existing renderer variants

Studio V2 public rendering should be dispatched by a new renderer key, using only a sanitized public room model.

### 6. Current Room Config Types

Frontend:

- `lib/api/types.ts`
- `PresenceEditableConfig`
- `PresenceEditorConfigInput`

Backend:

- `presence_editor_config.py`
- JSON fields:
  - `scene_config`
  - `style_dna`
  - `motion_config`
  - `asset_config`
  - `content_config`
  - `roomkey_config`
  - `enquiry_config`
  - `locked_fields`

No backend schema migration is required for Studio V2 if V2 state is mapped into these existing sections.

### 7. Current Media/Upload Flow

Frontend:

- `listPresenceEditorAssets`
- `attachPresenceEditorAsset`
- `uploadPresenceEditorAsset`

Backend:

- `presence_media_storage.py`
- `presence_graph.py` asset endpoints

Current media posture:

- Public-safe unlisted media fallback exists.
- Private draft media depends on configured and verified private media capability.
- Publish can promote private media to public storage when capability is configured.

Studio V2 should not imply self-serve private draft media is solved unless the existing capability reports it as verified.

### 8. Current Public Payload Allowlist/Sanitiser

Frontend:

- `lib/presence/render/publicPayload.ts`
- `createPublicRenderPayload`
- `RESTRICTED_PUBLIC_PAYLOAD_KEYS`
- `PUBLIC_DISPLAY_NODE_KEYS`

Backend:

- `serialize_public_editable_config`
- `_public_redact`
- `public_presence_metadata`

Existing public hygiene strips nested config internals, private fields, tokens, draft state, storage keys, signed URLs, owner/admin fields, and known private media values. Studio V2 needs additional sanitizer coverage for editor-only fields such as `locked`, `pinned`, `hiddenPublic`, `hiddenMobile`, `selected`, `editor`, `draft`, and labels such as `WILD TRANSFORM SUSPENDED`.

### 9. Current Playwright/E2E Smoke Tests

Relevant local tests:

- `tests/e2e/presence-studio-editor.spec.ts`
- `tests/e2e/presence-canvas-direct-manipulation.spec.ts`
- `tests/e2e/canvas-builder-preview-publish-p0.spec.ts`
- `tests/e2e/presence-public-payload-hygiene.spec.ts`
- `tests/e2e/presence-studio-room-owner-lifecycle.spec.ts`
- `tests/e2e/presence-studio-room-hosted-lifecycle.spec.ts`
- `tests/e2e/presence-studio-room-hosted-multi-kit-lifecycle.spec.ts`
- media/upload lifecycle tests

Important existing expectation:

- TemplateKit `studio-room` shell tests assert that this private draft shell has no publish action. Studio V2 should not break this default path unless those tests are intentionally replaced by a new flagged V2 route/test.

### 10. Current Hosted Smoke Setup

Playwright config supports hosted mode:

- `PRESENCE_HOSTED_SMOKE=1`
- `PRESENCE_E2E_BASE_URL`
- `PRESENCE_E2E_API_URL`
- `PRESENCE_E2E_OWNER_EMAIL`
- `PRESENCE_E2E_OWNER_PASSWORD`

Optional cleanup:

- `PRESENCE_E2E_CLEANUP_STRATEGY=control-delete`
- `PRESENCE_E2E_CONTROL_TOKEN`
- `PRESENCE_E2E_CONTROL_SECRET`

Hosted Studio V2 smoke should follow the same lifecycle: sign in, open pilot draft, edit, save, reload, preview, publish, visit public route, assert payload hygiene, cleanup or document retained fixture.

## Prototype Source Files To Port

Reference project:

- `C:\Dev\presence-studio-v2-semi-launchable`
- `C:\Users\emadh\Downloads\semi launchable (1).zip`

Primary source files:

- `studio/app.jsx` - Studio V2 runtime state, mode, preview/publish/add/edit/moodboard/local recovery patterns.
- `studio/rooms.jsx` - room/world renderer, direct object selection, public-preview guards, trace rendering, world object treatments.
- `studio/panels.jsx` - Skin Lab, object editor, add object, moodboard, mobile recovery, publish confirmation surfaces.
- `studio/data.js` - eight worlds, fixture objects, Skin Lab options, pilot content patterns.
- `studio/tokens.css` - V2 material, typography, atmosphere, and token system.
- `studio/cockpit.css` - Studio shell, cockpit, toolbar, sheets, mobile preview, preview overlay.
- `studio/worlds.css` - world-specific surfaces, traces, object treatments, Consultant Desk fixes.
- `tweaks-panel.jsx` - standalone dev reset/tweaks utility reference.

Reports to use as behavior context:

- `AUDIT_REPORT.md`
- `VISUAL_PASS_REPORT.md`
- `DEMO_INTEGRITY_FIX_REPORT.md`
- `PACKAGING_REPORT.md`
- `PILOT_CONTENT_ART_REVIEW.md`

## Real Files/Routes To Modify

Planned frontend additions:

- `lib/presence/studio-v2/model.ts`
- `lib/presence/studio-v2/adapters.ts`
- `lib/presence/studio-v2/sanitize.ts`
- `lib/presence/studio-v2/feature.ts`
- `components/presence-studio-v2/PresenceStudioV2Editor.tsx`
- `components/presence-studio-v2/PresenceStudioV2Room.tsx`
- `components/presence-studio-v2/PresenceStudioV2Panels.tsx`
- `components/presence-studio-v2/PresenceStudioV2PublicRenderer.tsx`
- `components/presence-studio-v2/presence-studio-v2.css`

Planned frontend modifications:

- `components/studio/editor/PresenceStudioEditorApp.tsx`
  - Load V2 editor only when feature flag and pilot eligibility allow it.
  - Continue using existing draft load/save/preview/publish APIs.
- `components/studio/editor/PresenceDraftPreviewPage.tsx`
  - Render V2 public preview projection when renderer key is V2.
- `components/portfolio/PortfolioRenderer.tsx` or `components/presence-dna/PresenceDnaRenderer.tsx`
  - Dispatch published V2 rooms to the V2 public renderer.
- `lib/presence/render/publicPayload.ts`
  - Add V2 public projection/sanitizer and restricted-key checks.
- `lib/api/types.ts`
  - Add narrow V2 type helpers if needed without changing backend contract.

Planned backend modifications:

- Prefer no DB migration.
- `presence_editor_config.py`
  - Add sanitizer coverage for V2 editor-only keys if raw V2 structures could appear in public editable config.
  - Add tests proving V2 public config redaction.
- `presence_graph.py`
  - Keep existing draft/preview/publish endpoints.
  - Only add feature-flag checks if backend-level enforcement is required.

Do not modify the current TemplateKit save endpoint as the primary V2 persistence strategy. If needed later, extend it behind a separate explicit flag and tests.

## Adapter Functions Required

### `studioV2FromPresenceConfig(config, node?)`

Purpose: convert real nested Presence config into Studio V2 runtime state.

Inputs:

- `PresenceEditableConfig`
- optional owner/public node summary

Behavior:

- Prefer existing V2 state if present under the agreed nested config locations.
- Fallback from existing DNA/render model or current Studio Room adapters for older rooms.
- Provide safe defaults for malformed or missing data.
- Normalize world IDs, chambers, objects, Skin Lab values, motion values, CTA/enquiry paths, moodboard references, trace disclosure, and mobile recovery flags.
- Never require localStorage to load hosted owner state.

### `presenceConfigFromStudioV2State(studioState, existingConfig)`

Purpose: convert Studio V2 runtime state back into the existing nested editable config contract.

Mapping:

- `scene_config`
  - room world/kit
  - chambers
  - layout order
  - transforms
  - layer values
  - mobile-safe override/recovery settings
- `style_dna`
  - Skin Lab background
  - texture
  - accent color
  - font family choice
  - heading weight
  - object radius
  - border style
  - shadow depth
  - aura intensity
- `motion_config`
  - motion intensity
  - transition behavior
  - ambient motion setting
- `asset_config`
  - image/media references
  - public-safe asset references only
  - no local filesystem paths
- `content_config`
  - room objects
  - object text/meta/detail/role/link
  - object public/mobile visibility intent
  - moodboard references
  - proof/testimonial/archive content
  - pilot/demo trace fixture flag if explicitly enabled
- `roomkey_config`
  - share/key/beacon/portal concepts where applicable
- `enquiry_config`
  - CTA object
  - booking/contact/enquiry pathway

Output must be a `PresenceEditorConfigInput` compatible with the existing owner draft API.

### `publicRoomFromStudioV2State(studioState)`

Purpose: create a public-safe room model for owner preview and published public routes.

Behavior:

- Strip all editor UI state.
- Drop hidden/private objects.
- Apply mobile-safe transform behavior where relevant.
- Preserve visual world, public object content, CTA, proof, safe media references, moodboard public references, and explicit demo trace disclosure when allowed.
- Never expose raw nested config names.

### `sanitizeStudioV2PublicPayload(configOrState)`

Purpose: enforce public allowlist and leak prevention for V2 rooms.

Must remove or prevent:

- `scene_config`
- `style_dna`
- `motion_config`
- `asset_config`
- `content_config`
- `roomkey_config`
- `enquiry_config`
- `owner`
- `draft`
- `locked`
- `pinned`
- `hiddenPublic`
- `hiddenMobile`
- `WILD TRANSFORM SUSPENDED`
- editor route strings
- internal API paths
- auth/session/token strings
- private media/storage/signed URL values
- `Demo traces` unless room is explicitly marked as pilot/demo

## Feature Flag Strategy

Suggested frontend flags:

- `NEXT_PUBLIC_PRESENCE_STUDIO_V2`
- `NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS`

Suggested backend flags if enforcement is needed:

- `PRESENCE_STUDIO_V2_ENABLED`
- `PRESENCE_STUDIO_V2_PILOT_IDS`

Rules:

- Disabled by default.
- Enabled only for selected pilot room IDs/slugs in preview/staging first.
- Existing rooms continue to render through existing renderers.
- Existing TemplateKit private draft shell remains unchanged unless explicitly routed to V2 for a pilot.
- Rollback is disabling the flags and leaving published non-V2 rooms untouched.

Renderer key:

- Use a clear renderer key such as `presence-studio-v2-room`.
- Public renderer dispatch must only use this key after public payload sanitization.

## Hosted Rollout Plan

1. Add adapter/model/sanitizer unit tests locally.
2. Add feature flag helper and V2 renderer key detection.
3. Port V2 public room renderer and scoped CSS.
4. Add V2 editor shell inside the real owner editor route for pilot-eligible rooms.
5. Wire load/save through existing owner draft APIs.
6. Wire preview and publish through existing preview/publish APIs.
7. Add public payload hygiene tests for V2-specific forbidden strings.
8. Run local unit/type/build tests.
9. Run local Playwright owner lifecycle and public payload tests.
10. Deploy to preview/staging with V2 disabled.
11. Enable V2 for selected pilot IDs only.
12. Run hosted smoke with real owner credentials.
13. Verify payload hygiene on hosted public routes.
14. Document rollback and remaining limitations.
15. Production rollout only after hosted smoke passes.

## Risk List

### P0 Risks

- Public payload could leak raw nested config or editor-only state if V2 state is serialized directly.
- Draft/private media could leak if V2 asset references bypass existing media sanitizers.
- Owner-only preview could become public if V2 preview reimplements routing instead of using the existing preview flow.
- Existing TemplateKit tests and behavior could regress if V2 replaces the private draft shell wholesale.

### P1 Risks

- Current TemplateKit save endpoint rejects V2 structural edits. Use the full editor draft API for V2.
- V2 state may exceed backend JSON section limits if pilot content is stored too verbosely.
- Public HTML hygiene tests may catch restricted terms in serialized client props even if visual output is clean.
- Existing public routes dispatch through multiple render paths; V2 needs one clear sanitized dispatch point.
- Backend `_public_redact` does not currently target all V2 editor-only terms such as `locked`, `pinned`, `hiddenPublic`, or `hiddenMobile`.

### P2 Risks

- Eight V2 worlds exceed current TemplateKit production kit list and may need pilot-only availability rules.
- Local prototype CSS could collide with existing global styles if not scoped.
- Real media/upload capability remains operator-led unless private draft media capability is verified.
- Some pilot content patterns need richer object types than current public render model.

## Test Plan

### Unit/Adapter Tests

- V2 state round-trips through existing nested config areas.
- Old room config still loads through V2 fallback.
- Missing/malformed config falls back safely.
- Hidden/private objects do not appear in public projection.
- Locked/pinned state persists for owner editing but is stripped publicly.
- Mobile-safe transform behavior applies in public/mobile projection.
- Skin Lab values persist in `style_dna` and `motion_config`.
- Moodboard references persist in `content_config`.
- Sanitizer removes V2 editor-only and internal keys.

### Backend Tests

- Draft update accepts V2 nested config without schema migration.
- Public serialized config redacts V2 editor-only fields.
- Publish produces public config without draft/private media references.
- Private media behavior remains capability-gated.

### E2E Owner Lifecycle

- Sign in as owner.
- Open Studio V2 editor for feature-flagged pilot room.
- Load existing draft.
- Edit object content.
- Add object.
- Delete object.
- Adjust Skin Lab.
- Switch world.
- Use Wild Mode drag/rotate/resize/layer.
- Save draft.
- Reload editor and confirm persistence.
- Open private preview.
- Publish.
- Visit public route.
- Verify public render.
- Verify no editor chrome or internal field names.
- Cleanup or document retained pilot fixture.

### Public Payload Hygiene

Assert public HTML/API output does not contain:

- `style_dna`
- `scene_config`
- `motion_config`
- `asset_config`
- `content_config`
- `roomkey_config`
- `enquiry_config`
- `owner`
- `draft`
- `locked`
- `pinned`
- `hiddenPublic`
- `hiddenMobile`
- `WILD TRANSFORM SUSPENDED`
- `Demo traces` unless explicitly pilot/demo
- editor route strings
- internal API paths
- auth/session/token strings

### Hosted Smoke

Use existing hosted smoke environment variables:

- `PRESENCE_HOSTED_SMOKE=1`
- `PRESENCE_E2E_BASE_URL`
- `PRESENCE_E2E_API_URL`
- `PRESENCE_E2E_OWNER_EMAIL`
- `PRESENCE_E2E_OWNER_PASSWORD`

Flow:

1. Real sign-in.
2. Create/open pilot draft.
3. Edit in Studio V2.
4. Save draft.
5. Reload editor.
6. Preview privately.
7. Publish.
8. Verify public route.
9. Verify payload hygiene.
10. Cleanup through existing control-delete strategy if configured.

## Implementation Decision

Proceed with a staged integration:

1. Adapter and public projection first.
2. V2 public renderer behind renderer key and feature flag.
3. V2 editor shell behind pilot room flag.
4. Existing editor draft API save/preview/publish integration.
5. Hosted smoke and rollout documentation.

Do not replace the existing Studio/editor route globally until V2 passes local and hosted lifecycle tests.

