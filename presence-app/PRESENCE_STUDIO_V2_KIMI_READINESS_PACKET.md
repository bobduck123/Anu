# Presence Studio V2 — Kimi Integration Readiness Packet

**Date:** 2026-06-03  
**Repo:** `C:\Dev\Flora_fauna\presence-app`  
**Target:** Mount V2 editor + public renderer into real `presence-app` without breaking existing Studio/editor routes  
**Status:** Adapter layer complete and passing. Editor shell NOT mounted. Public renderer NOT dispatched.

---

## 1. What Is Already Done (Verified)

| Layer | File(s) | Status | Evidence |
|-------|---------|--------|----------|
| **Canonical types** | `lib/presence/studio-v2/model.ts` | ✅ Done | 210 lines, 8 world IDs, 14 object types, full runtime + public types |
| **Bidirectional adapter** | `lib/presence/studio-v2/adapters.ts` | ✅ Done | 658 lines, round-trip proven |
| **Public sanitiser** | `lib/presence/studio-v2/sanitize.ts` | ✅ Done | 159 lines, leak scanner + assert |
| **Feature flag gating** | `lib/presence/studio-v2/feature.ts` | ✅ Done | 73 lines, global + pilot eligibility |
| **Public payload integration** | `lib/presence/render/publicPayload.ts` | ✅ Done | V2 projection wired, restricted keys extended |
| **Unit tests (adapter)** | `lib/presence/studio-v2/studioV2Adapters.test.ts` | ✅ 5/5 pass | Round-trip, legacy lift, public strip, flag logic |
| **Unit tests (public payload)** | `lib/presence/render/publicPayload.test.ts` | ✅ 3/3 pass | Key scanner, V2 conditional projection |
| **Typecheck** | `tsc --noEmit` | ✅ Clean | No errors across full app |
| **Existing editor** | `components/studio/editor/PresenceStudioEditorApp.tsx` | ✅ Stable | Loads/saves/publishes through real APIs |
| **Save API** | `lib/api/editor.ts` → `patchPresenceEditorDraft` | ✅ Confirmed | Correct structural save path |

---

## 2. What Is NOT Done (Blockers to Mount)

### 2.1 Feature flag is not wired into the editor route

`lib/presence/studio-v2/feature.ts` is **not imported by any file in `components/studio/`**.

The editor route (`app/(studio)/studio/[id]/editor/page.tsx`) unconditionally renders `PresenceStudioEditorApp`. There is no branch for V2.

**Required:** Add a V2 eligibility check in the editor route and conditionally render the V2 editor shell.

### 2.2 V2 editor shell components do not exist

Planned files from `PRESENCE_STUDIO_V2_INTEGRATION_PLAN.md`:

- `components/presence-studio-v2/PresenceStudioV2Editor.tsx`
- `components/presence-studio-v2/PresenceStudioV2Room.tsx`
- `components/presence-studio-v2/PresenceStudioV2Panels.tsx`
- `components/presence-studio-v2/PresenceStudioV2PublicRenderer.tsx`
- `components/presence-studio-v2/presence-studio-v2.css`

**None exist yet.** These must be created from the prototype reference (`C:\Dev\presence-studio-v2-semi-launchable`) — but **only the runtime model, interaction behaviour, and visual system** may be ported. The prototype's CDN React/Babel, localStorage persistence, and standalone HTML entry must NOT be used.

### 2.3 V2 public renderer is not dispatched

`PortfolioRenderer` / `PresenceDnaRenderer` do not yet branch on `renderer_key === "presence-studio-v2-room"`. The `studioV2Room` field exists in `PublicRenderPayload` but no renderer consumes it.

### 2.4 Adapter gaps (pre-mount fixes required)

The adapter works, but has known weaknesses that will surface under real owner editing:

| Gap | Risk | Fix |
|-----|------|-----|
| **Legacy moodboard data dropped** | `moodboardRefs: []` in legacy migration | Add `moodboardRefs` lift from legacy `content_config` / `asset_config` |
| **Legacy theme `surface`/`text`/`muted` dropped** | No V2 skin target | Map to closest V2 skin defaults or preserve in fallback |
| **`StudioV2TraceConfig.eventBeacon` / `.portal` orphaned** | Types exist but adapters never read/write | Either wire them in adapters or remove from model |
| **`fallbackNode` uses `as PresenceNode` cast** | Type safety risk | Build a typed fallback factory |
| **`worldIdFromLegacy` uses substring matching** | Fragile heuristic | Add explicit `room_type` → worldId map, keep substring as fallback |
| **Pilot gating: empty list + global ON = all rooms eligible** | Staging convenience, production risk | Add explicit `NODE_ENV === "production"` guard that rejects empty pilot list |
| **No sanitizer/leak direct tests** | Leak scanner untested in isolation | Add `sanitizeStudioV2PublicPayload` unit tests |
| **No clamp boundary tests** | `normalizeTransform` / `normalizeSkin` edge cases unproven | Add boundary tests for -2000/2000, 0.2/4, -360/360, 0/999 |
| **No URL safety tests** | `safePublicUrl` / `safeAssetPath` / `isSafePublicHost` untested | Add malicious URL rejection tests |
| **No malformed-config recovery tests** | Corrupted stored config could crash editor | Add garbage-in recovery tests for `studioV2FromStoredConfig` |

### 2.5 Public payload risks before V2 renderer dispatch

| Risk | Current State | Mitigation |
|------|---------------|------------|
| `moodboardRefs` lack per-reference visibility flags | All moodboard refs are public | Add `visibility` to `StudioV2MoodboardReference` and filter in `stripEditorStateFromStudioV2` |
| Mobile recovery preserves `zIndex` without re-clamping | `zIndex` passed through verbatim | Re-clamp `zIndex` in public projection (already done for transforms, verify for zIndex) |
| Future sensitive field mirror lag | New field in `StudioV2PublicRoom` must be added to BOTH `sanitize.ts` AND `RESTRICTED_PUBLIC_PAYLOAD_KEYS` | Document this invariant in `model.ts` header comment |

---

## 3. Exact Mount Plan — Step by Step

### Phase A: Adapter Hardening (Do First)

**Goal:** Close pre-mount gaps so the adapter does not corrupt owner data when V2 editor goes live.

1. **Fix pilot gating production risk**
   - File: `lib/presence/studio-v2/feature.ts`
   - Change: In `isPresenceStudioV2PilotEligible`, if `ids.size === 0` AND `NODE_ENV === "production"`, return `false`.
   - Reason: Prevents accidental global enablement in production.

2. **Add missing adapter tests**
   - File: `lib/presence/studio-v2/studioV2Adapters.test.ts`
   - Add tests:
     - `sanitizeStudioV2PublicPayload` strips restricted keys recursively
     - `safePublicUrl` rejects `file://`, `localhost`, `192.168.x.x`, `//evil.com`, `javascript:`, control-plane paths
     - `normalizeTransform` clamps at boundaries (-2000, 2000, 0.2, 4, -360, 360, 0, 999)
     - `studioV2FromStoredConfig` recovers from malformed stored config (missing `objectState`, missing `chambers`, null `contentV2`)
     - Legacy config with `moodboardRefs` in `content_config` lifts correctly

3. **Add `moodboardRefs` legacy lift**
   - File: `lib/presence/studio-v2/adapters.ts`
   - In `studioV2FromLegacyPresenceConfig`, look for legacy moodboard references in `config.content_config.moodboard` or `config.asset_config.moodboard` and map to `moodboardRefs`.

4. **Resolve orphaned trace sub-objects**
   - File: `lib/presence/studio-v2/model.ts`
   - Decision: Either remove `eventBeacon` and `portal` from `StudioV2TraceConfig`, or wire them in `adapters.ts`. **Recommended:** Remove from model until they are used. Keeps types honest.

5. **Fix `fallbackNode` type safety**
   - File: `lib/presence/studio-v2/adapters.ts`
   - Replace `as PresenceNode` cast with a factory function that fills all required fields.

6. **Harden `worldIdFromLegacy`**
   - File: `lib/presence/studio-v2/adapters.ts`
   - Add explicit `room_type` → worldId map before substring fallback. Document the heuristic.

### Phase B: Feature Flag Wiring (Small, Safe)

**Goal:** Enable the editor route to branch to V2 without affecting non-V2 rooms.

1. **Import feature flag into editor route**
   - File: `app/(studio)/studio/[id]/editor/page.tsx`
   - Add: `import { shouldUsePresenceStudioV2 } from "@/lib/presence/studio-v2/feature";`
   - After `useOwnerNode` resolves, compute:
     ```ts
     const isV2 = shouldUsePresenceStudioV2({ roomId: nodeId, slug: node.slug, rendererKey: node.renderer_key, config: node.editable_config, node });
     ```
   - Pass `isV2` into `StudioShell` or branch before rendering `PresenceStudioEditorApp`.

2. **Do NOT change the default editor path for non-V2 rooms.**
   - Non-V2 rooms must continue to render `PresenceStudioEditorApp` exactly as they do today.
   - This preserves all existing e2e tests and TemplateKit behaviour.

### Phase C: V2 Editor Shell (Biggest Work)

**Goal:** Create the V2 editor UI components that wrap the prototype's interaction model around real APIs.

1. **Create component directory**
   - `components/presence-studio-v2/`

2. **Create `PresenceStudioV2Editor.tsx`**
   - Props interface:
     ```ts
     interface Props {
       node: PresenceNode;
       nodeId: number;
       token: string;
       onNodeReload?: () => Promise<void> | void;
     }
     ```
   - Responsibilities:
     - Load draft via `getPresenceEditor` + `studioV2FromPresenceConfig`
     - Maintain `StudioV2State` in React state
     - Save via `presenceConfigFromStudioV2State` → `patchPresenceEditorDraft` / `createPresenceEditorDraft`
     - Preview via `previewPresenceEditorDraft`
     - Publish via `publishPresenceEditorDraft`
     - Render mode switcher: Build / Look / Preview (maps to prototype's Studio / Preview / Publish)

3. **Create `PresenceStudioV2Room.tsx`**
   - The world renderer from `studio/rooms.jsx`
   - Direct object selection, public-preview guards, trace rendering
   - Must receive `StudioV2State` (owner) or `StudioV2PublicRoom` (public)

4. **Create `PresenceStudioV2Panels.tsx`**
   - Skin Lab panel
   - Object editor panel
   - Add object panel
   - Moodboard panel
   - Mobile recovery panel
   - Publish confirmation surface

5. **Create `presence-studio-v2.css`**
   - Port from `studio/tokens.css`, `studio/cockpit.css`, `studio/worlds.css`
   - Scope ALL selectors under a `.presence-studio-v2` root class to avoid colliding with existing global styles

6. **Wiring in `PresenceStudioEditorApp.tsx` or route**
   - Option A (recommended): Branch in `page.tsx` — if `isV2`, render `PresenceStudioV2Editor` instead of `PresenceStudioEditorApp`.
   - Option B: Branch inside `PresenceStudioEditorApp` — more intrusive, not recommended.

### Phase D: V2 Public Renderer Dispatch

**Goal:** Published V2 rooms render through the V2 public renderer, not legacy renderers.

1. **Identify renderer dispatch point**
   - Likely `components/portfolio/PortfolioRenderer.tsx` or `components/presence-dna/PresenceDnaRenderer.tsx`
   - Find where `renderer_key` is used to select a renderer component.

2. **Add V2 branch**
   - When `renderer_key === "presence-studio-v2-room"`, render `PresenceStudioV2PublicRenderer`.
   - Pass `studioV2Room` from `PublicRenderPayload`.

3. **Create `PresenceStudioV2PublicRenderer.tsx`**
   - Reuses `PresenceStudioV2Room.tsx` with `StudioV2PublicRoom` (read-only)
   - No editor chrome, no save button, no object editing
   - Respects `mobileRecovery.transformsSuspendedOnMobile`

### Phase E: Preview Route Update

**Goal:** Owner preview renders V2 rooms correctly.

1. **File:** `components/studio/editor/PresenceDraftPreviewPage.tsx`
2. **Check:** Does it use `createPublicRenderPayload` or its own payload builder?
3. **Action:** Ensure preview route calls `previewPresenceEditorDraft` then renders the same public renderer dispatch as the live public route. Do NOT create a separate preview renderer.

### Phase F: Test & Evidence

1. **Unit tests**
   - Run `npx tsx --test lib/presence/studio-v2/studioV2Adapters.test.ts`
   - Run `npx tsx --test lib/presence/render/publicPayload.test.ts`
   - Add and run new tests from Phase A.

2. **Typecheck**
   - `npm run typecheck` — must remain clean.

3. **Build**
   - `npm run build` — must succeed.

4. **E2E smoke (local)**
   - Existing Playwright tests must not regress:
     - `tests/e2e/presence-studio-editor.spec.ts`
     - `tests/e2e/presence-canvas-direct-manipulation.spec.ts`
     - `tests/e2e/canvas-builder-preview-publish-p0.spec.ts`
     - `tests/e2e/presence-public-payload-hygiene.spec.ts`

5. **E2E smoke (hosted)**
   - Only after local pass:
     - `PRESENCE_HOSTED_SMOKE=1`
     - Select a pilot room ID, enable flag, run owner lifecycle.

---

## 4. File Touch Summary

| File | Action | Phase |
|------|--------|-------|
| `lib/presence/studio-v2/feature.ts` | Add production empty-pilot guard | A |
| `lib/presence/studio-v2/adapters.ts` | Fix fallbackNode, worldIdFromLegacy, moodboardRefs lift | A |
| `lib/presence/studio-v2/model.ts` | Remove orphaned trace sub-objects (or wire them) | A |
| `lib/presence/studio-v2/studioV2Adapters.test.ts` | Add sanitizer, clamp, URL, recovery tests | A |
| `app/(studio)/studio/[id]/editor/page.tsx` | Import feature flag, add V2 branch | B |
| `components/presence-studio-v2/PresenceStudioV2Editor.tsx` | Create V2 editor shell | C |
| `components/presence-studio-v2/PresenceStudioV2Room.tsx` | Create world renderer | C |
| `components/presence-studio-v2/PresenceStudioV2Panels.tsx` | Create panels | C |
| `components/presence-studio-v2/presence-studio-v2.css` | Create scoped CSS | C |
| `components/portfolio/PortfolioRenderer.tsx` (or DNA renderer) | Add V2 renderer dispatch | D |
| `components/presence-studio-v2/PresenceStudioV2PublicRenderer.tsx` | Create public renderer | D |
| `components/studio/editor/PresenceDraftPreviewPage.tsx` | Verify V2 preview path | E |

---

## 5. Critical Decisions for Next Agent

### Decision 1: Where to branch — route level or component level?

**Recommendation:** Branch in `app/(studio)/studio/[id]/editor/page.tsx`.

```tsx
const isV2 = shouldUsePresenceStudioV2({ roomId: nodeId, slug: node.slug, rendererKey: node.renderer_key, config: node.editable_config, node });

// Inside return:
{isV2 ? (
  <StudioShell node={node}>
    <PresenceStudioV2Editor node={node} nodeId={nodeId} token={token} onNodeReload={reload} />
  </StudioShell>
) : (
  <StudioShell node={node}>
    <PresenceStudioEditorApp node={node} nodeId={nodeId} token={token} onNodeReload={reload} />
  </StudioShell>
)}
```

This keeps `PresenceStudioEditorApp` untouched and preserves all existing tests.

### Decision 2: How to handle save debouncing?

The prototype saved every pointermove to localStorage. The real app must NOT do this.

**Recommendation:**
- Auto-save debounced (e.g., 2s after last change) via `patchPresenceEditorDraft`.
- Explicit "Save" button for immediate feedback.
- Show dirty state indicator.
- On publish, save first if dirty, then call `publishPresenceEditorDraft`.

### Decision 3: CSS scoping strategy

**Recommendation:** Wrap every V2 component in `<div className="presence-studio-v2">` and scope ALL CSS under that class:

```css
.presence-studio-v2 .studio-toolbar { ... }
.presence-studio-v2 .world-gallery { ... }
```

This prevents collision with existing Tailwind and global styles.

### Decision 4: Trace / eventBeacon / portal — keep or cut?

**Recommendation:** Cut `eventBeacon` and `portal` from the model until they are implemented. Orphaned types create false confidence. Add them back when the feature is wired.

---

## 6. Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| V2 editor corrupts owner draft on first save | **P0** | Phase A adapter hardening + round-trip tests + staged rollout behind pilot flag |
| Public payload leaks editor-only fields | **P0** | Existing `sanitize.ts` + `publicPayload.ts` layered protection. Add direct sanitizer tests in Phase A. |
| Existing e2e tests regress | **P0** | Branch at route level; non-V2 rooms use exact same code path as today |
| V2 CSS collides with existing styles | **P1** | Scope under `.presence-studio-v2` root class |
| Prototype localStorage habit leaks into real app | **P0** | Code review check: assert NO `localStorage` calls in `components/presence-studio-v2/*` |
| Pilot flag accidentally enables all rooms in production | **P0** | Phase A production guard in `feature.ts` |
| TemplateKit save endpoint used by mistake | **P1** | Document: V2 MUST use `patchPresenceEditorDraft` only. Add code comment in `PresenceStudioV2Editor.tsx`. |
| Moodboard refs all public by default | **P1** | Add per-reference visibility before first pilot with moodboard content |

---

## 7. Definition of Ready for Mount

Before any V2 editor component is created, the following must be true:

- [ ] Phase A adapter hardening complete (all 6 items)
- [ ] All unit tests pass (`npx tsx --test` on adapter + public payload tests)
- [ ] `tsc --noEmit` clean
- [ ] `npm run build` succeeds
- [ ] Feature flag wired into editor route with non-V2 fallback preserved
- [ ] `isPresenceStudioV2PilotEligible` rejects empty pilot list in production
- [ ] Document explicitly states: "V2 uses `patchPresenceEditorDraft`, NEVER TemplateKit draft"
- [ ] CSS scoping strategy documented and implemented

---

## 8. Recommended Next Pass

**Pass 1 (this agent):** Phase A — Adapter hardening + test expansion + feature.ts production guard. Small, safe, high value.

**Pass 2 (next agent):** Phase B — Wire feature flag into editor route; create minimal `PresenceStudioV2Editor.tsx` shell that loads V2 state and can save a trivial change (e.g., change room title). No panels, no world renderer yet.

**Pass 3:** Phase C — Port world renderer + panels from prototype into scoped components. Add Skin Lab, object editing, moodboard.

**Pass 4:** Phase D — Wire public renderer dispatch. Add V2 branch to `PortfolioRenderer` or `PresenceDnaRenderer`.

**Pass 5:** Phase E + F — Preview route verification, e2e tests, hosted smoke, pilot rollout.

---

## 9. Quick Reference — Key API Functions

```ts
// Load
import { getPresenceEditor } from "@/lib/api/editor";
import { studioV2FromPresenceConfig } from "@/lib/presence/studio-v2";
const overview = await getPresenceEditor(roomId, token);
const v2State = studioV2FromPresenceConfig(overview.draft ?? overview.published, node);

// Save
import { patchPresenceEditorDraft, createPresenceEditorDraft } from "@/lib/api/editor";
import { presenceConfigFromStudioV2State } from "@/lib/presence/studio-v2";
const payload = presenceConfigFromStudioV2State(v2State, existingConfig);
const response = overview.draft
  ? await patchPresenceEditorDraft(roomId, token, payload)
  : await createPresenceEditorDraft(roomId, token, payload);

// Preview
import { previewPresenceEditorDraft } from "@/lib/api/editor";
await previewPresenceEditorDraft(roomId, token);

// Publish
import { publishPresenceEditorDraft } from "@/lib/api/editor";
await publishPresenceEditorDraft(roomId, token);

// Public payload (server-side)
import { createPublicRenderPayload } from "@/lib/presence/render/publicPayload";
const payload = createPublicRenderPayload(node); // includes studioV2Room when eligible
```

---

## 10. Handoff Notes

- **Do NOT paste the prototype directly.** The prototype at `C:\Dev\presence-studio-v2-semi-launchable` is a reference for behaviour and visual treatment only. Its entry point (`index.html`), CDN scripts, and localStorage persistence are forbidden in production.
- **The correct save path is `patchPresenceEditorDraft`.** The TemplateKit private draft endpoint (`/studio-rooms/{id}/draft`) explicitly rejects structural changes. V2 requires structural changes.
- **All protection is client-side.** There is no middleware file. `useOwnerNode` + `StudioNodeGate` gate the editor route. The V2 editor must continue to rely on these.
- **Non-V2 rooms must be untouched.** The branch must be clean enough that disabling the feature flag instantly reverts to the existing editor.
- **If you find new risks during implementation, name them clearly and add them to this document.** Do not hide them.
