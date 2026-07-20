# Presence Studio V2 — Phase B Editor Mount Report

**Date:** 2026-05-31  
**Status:** Complete  
**Goal:** Mount a minimal Studio V2 editor shell behind the feature flag in the real owner editor route.

---

## 1. What Changed

### 1.1 Editor route branched

**File:** `app/(studio)/studio/[id]/editor/page.tsx`

- Added import for `shouldUsePresenceStudioV2` from `@/lib/presence/studio-v2/feature`
- Added import for `PresenceStudioV2Editor` from `@/components/presence-studio-v2/PresenceStudioV2Editor`
- After `useOwnerNode` resolves, computes V2 eligibility:
  ```ts
  const isV2Enabled = shouldUsePresenceStudioV2({
    roomId: nodeId,
    slug: node.slug,
    rendererKey: node.renderer_key,
    config: node.editable_config,
    node,
  });
  ```
- Branches render inside `StudioShell`:
  - `isV2Enabled === true` → `<PresenceStudioV2Editor />`
  - `isV2Enabled === false` → `<PresenceStudioEditorApp />` (unchanged)

### 1.2 Minimal V2 editor shell created

**File:** `components/presence-studio-v2/PresenceStudioV2Editor.tsx`

Capabilities:
- **Load:** Calls `getPresenceEditor(roomId, token)`, then `studioV2FromPresenceConfig(config, node)`
- **Display:** Shows "Studio V2" status bar with room title input
- **Edit title:** `onChange` updates local React state, marks dirty
- **Dirty state:** Computed via `JSON.stringify` snapshot comparison
- **Save:** Converts via `presenceConfigFromStudioV2State(nextState, existingConfig)`, then calls:
  - `createPresenceEditorDraft` when no draft exists
  - `patchPresenceEditorDraft` when draft exists
- **Reload persistence:** After save, rehydrates state from backend response and calls `onNodeReload`
- **Error handling:** Load error surface with retry button; save error shown in status bar
- **No localStorage:** Verified zero `localStorage` reads/writes
- **No TemplateKit:** Uses only `lib/api/editor.ts` owner draft APIs

Test IDs added:
- `data-testid="presence-studio-v2-root"`
- `data-testid="presence-studio-v2-title-input"`
- `data-testid="presence-studio-v2-save"`
- `data-testid="presence-studio-v2-dirty"`
- `data-testid="presence-studio-v2-saved"`
- `data-testid="presence-studio-v2-error"`

### 1.3 Scoped CSS root created

**File:** `components/presence-studio-v2/presence-studio-v2.css`

Minimal root declaration under `.presence-studio-v2`. All future V2 CSS will be scoped under this class.

### 1.4 Mount evidence test added

**File:** `lib/presence/studio-v2/studioV2Adapters.test.ts`

New test: `V2 editor title mutation produces saveable config payload and round-trips`
- Mutates `title` on a `StudioV2State`
- Converts via `presenceConfigFromStudioV2State`
- Asserts `renderer_key === "presence-studio-v2-room"`
- Asserts nested `content_config.studio_v2.title` matches mutation
- Round-trips through `studioV2FromPresenceConfig` and asserts title restored

---

## 2. Feature Flag Behaviour

| Flag state | Room state | Result |
|---|---|---|
| `NEXT_PUBLIC_PRESENCE_STUDIO_V2=0` | any | Legacy editor renders |
| `NEXT_PUBLIC_PRESENCE_STUDIO_V2=1` | Non-pilot, non-V2 renderer key | Legacy editor renders |
| `NEXT_PUBLIC_PRESENCE_STUDIO_V2=1` | Pilot ID in list + V2 renderer key | V2 editor renders |
| `NEXT_PUBLIC_PRESENCE_STUDIO_V2=1` | Empty pilot list, `NODE_ENV=production` | Legacy editor renders (production guard) |

Rollback: set `NEXT_PUBLIC_PRESENCE_STUDIO_V2=0` → all rooms instantly revert to legacy editor.

---

## 3. API Functions Used

| Function | File | Purpose |
|---|---|---|
| `getPresenceEditor` | `lib/api/editor.ts` | Load owner editor overview (draft + published) |
| `patchPresenceEditorDraft` | `lib/api/editor.ts` | Save structural changes to existing draft |
| `createPresenceEditorDraft` | `lib/api/editor.ts` | Create first draft when none exists |
| `studioV2FromPresenceConfig` | `lib/presence/studio-v2/adapters.ts` | Hydrate V2 state from nested config |
| `presenceConfigFromStudioV2State` | `lib/presence/studio-v2/adapters.ts` | Serialize V2 state into nested config |

---

## 4. Verification Results

### 4.1 Typecheck
```bash
npm run typecheck
```
✅ Clean — no errors.

### 4.2 Build
```bash
npm run build
```
✅ Succeeds — all routes compile, no new warnings.

### 4.3 Adapter tests
```bash
node --experimental-strip-types --test lib/presence/studio-v2/studioV2Adapters.test.ts
```
✅ 14/14 pass (was 13, +1 new mount evidence test).

### 4.4 Public payload tests
```bash
node --experimental-strip-types --test lib/presence/render/publicPayload.test.ts
```
✅ 3/3 pass.

---

## 5. Known Limitations (Explicit)

This pass does **NOT** complete:

- Full V2 cockpit UI (world renderer, object editing, panels)
- Skin Lab
- Wild Mode / guided mode
- Moodboard editing
- Mobile recovery controls
- Auto-save debounce
- Preview button
- Publish button
- V2 public renderer dispatch
- Real V2 public route rendering
- Hosted smoke verification
- Pilot rollout

These are deferred to Phase C/D/E.

---

## 6. Files Changed

| File | Action |
|---|---|
| `app/(studio)/studio/[id]/editor/page.tsx` | Added feature-flag branch; imports V2 editor and flag helper |
| `components/presence-studio-v2/PresenceStudioV2Editor.tsx` | **NEW** — minimal V2 editor shell with load/edit title/save/reload |
| `components/presence-studio-v2/presence-studio-v2.css` | **NEW** — scoped CSS root |
| `lib/presence/studio-v2/studioV2Adapters.test.ts` | Added mount evidence test (title mutation round-trip) |

---

## 7. Acceptance Criteria Checklist

| # | Criterion | Status |
|---|---|---|
| 1 | V2 editor shell mounts behind feature flag | ✅ |
| 2 | Non-V2 editor path is unchanged | ✅ |
| 3 | V2 shell loads real draft data via adapter | ✅ |
| 4 | User can edit room title | ✅ |
| 5 | Save uses full owner editor draft API | ✅ |
| 6 | Reload restores saved title from backend draft | ✅ (adapter round-trip proven) |
| 7 | No localStorage used as production truth | ✅ |
| 8 | TemplateKit save endpoint not used | ✅ |
| 9 | Typecheck passes | ✅ |
| 10 | Build passes | ✅ |
| 11 | Adapter and public payload tests still pass | ✅ |
| 12 | Public renderer dispatch remains deferred | ✅ |
| 13 | Hosted readiness not claimed | ✅ |

---

## 8. Next Recommended Pass (Phase C)

1. Port `PresenceStudioV2Room.tsx` — world renderer from prototype (read-only display of chambers/objects)
2. Port `PresenceStudioV2Panels.tsx` — Skin Lab, object editor, add object
3. Add auto-save debounce to `PresenceStudioV2Editor`
4. Wire preview and publish buttons
5. Add public renderer dispatch (Phase D)
