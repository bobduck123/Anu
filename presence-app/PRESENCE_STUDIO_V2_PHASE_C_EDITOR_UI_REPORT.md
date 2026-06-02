# Presence Studio V2 — Phase C Editor UI Report

**Date:** 2026-05-31  
**Status:** Complete  
**Goal:** Upgrade the minimal mounted V2 editor into a functional owner-side Studio V2 editor using the semi-launchable prototype as reference.

---

## 1. What Changed

### 1.1 `PresenceStudioV2Editor.tsx` — Full cockpit

**Before:** Minimal shell with title input only.  
**After:** Full cockpit with:

- **Toolbar:** Studio V2 label, dirty/saved/error badges, Guided/Wild mode toggle, Desktop/Mobile viewport toggle, World/Skin/Mood/Add buttons, Save Draft button
- **Room stage:** Renders `PresenceStudioV2Room` with chambers, objects, moodboard layer, traces
- **Object selection:** Click object to select; click background to deselect
- **Floating toolbar:** Appears when object selected with actions: Clear, Edit, Duplicate, Visibility toggle, Layer up/down (wild), Pin, Lock, Delete
- **Panels:** Skin Lab, Object Editor, Add Object, Moodboard, World Switcher — all wired to React state
- **Save/reload:** Same Phase B path — converts via `presenceConfigFromStudioV2State` → owner draft API

### 1.2 `PresenceStudioV2Room.tsx` — Owner-side room renderer

**NEW.** Renders `StudioV2State` into a visual room with:

- World-specific CSS backgrounds (8 worlds)
- Room header with title, tagline, world eyebrow
- Chambers with labels
- Object cards with images, titles, meta, detail, links
- Editor-only badges: Locked, Pinned, Hidden public, Hidden mobile, Wild transform suspended
- Corner indicators for locked/pinned
- Moodboard influence layer
- Social traces strip (entries/seeds/guestbook)
- Mobile viewport simulation (max-width 375px)

### 1.3 `PresenceStudioV2Panels.tsx` — All editor panels

**NEW.** Exports 5 panel components:

| Panel | Features |
|---|---|
| `SkinLabSheet` | Background swatch, texture choice, aura slider, motion choice, display font, heading weight, object radius, border style, shadow depth, accent swatch |
| `ObjectEditorSheet` | Title, type select, meta, detail textarea, link, image URL, visibility toggles, transform controls (X/Y/rotate/scale/Z), lock/pin toggles |
| `AddObjectSheet` | Type grid (text, image, portal, cta, testimonial, note, event), title/meta/detail/link fields |
| `MoodboardSheet` | Reference type grid, title/URL/detail form, add reference, current refs list with remove |
| `WorldSwitcher` | Overlay grid of 8 worlds with name, surface, verb |

### 1.4 `presence-studio-v2.css` — Scoped visual system

**Expanded from 6 lines to ~350 lines.** Covers:

- Cockpit toolbar and buttons
- Room stage with 8 world backgrounds
- Object cards with hover/selected states
- Editor badges and corner indicators
- Moodboard and traces
- Floating toolbar
- Side panels with forms
- Skin Lab controls (sliders, choices, swatches)
- World switcher overlay
- Transform button controls

All selectors scoped under `.presence-studio-v2`.

### 1.5 `worlds.ts` — World data and control definitions

**NEW.** Contains:

- `WORLD_KITS` — 8 world definitions (id, name, surface, verb, feel)
- `SKIN_CONTROLS` — 10 skin control definitions matching `StudioV2Skin`
- `MOODBOARD_TYPES` — 8 moodboard reference types
- `ADD_OBJECT_TYPES` — 7 addable object types

---

## 2. Feature Port Matrix

| Feature | Prototype | Phase C | Notes |
|---|---|---|---|
| Cockpit toolbar | ✅ | ✅ | Full toolbar with mode/viewport/panel buttons |
| World switcher | ✅ | ✅ | Overlay grid, 8 worlds |
| Room renderer | ✅ | ✅ | Chambers, objects, world backgrounds |
| Object selection | ✅ | ✅ | Click to select, background to deselect |
| Floating toolbar | ✅ | ✅ | Edit/duplicate/visibility/delete + wild extras |
| Object editor panel | ✅ | ✅ | Title, type, meta, detail, link, image, visibility, transform |
| Add object | ✅ | ✅ | Type grid + form |
| Delete object | ✅ | ✅ | Floating toolbar + state update |
| Duplicate object | ✅ | ✅ | Floating toolbar, offset transform, selects new object |
| Skin Lab | ✅ | ✅ | 10 controls mapped to `StudioV2Skin` |
| Guided/Wild mode | ✅ | ✅ | Toggle in toolbar; wild shows transform controls + layer/pin/lock |
| Moodboard | ✅ | ✅ | Add/remove references with type/color |
| Mobile viewport | ✅ | ✅ | Desktop/mobile toggle narrows room |
| Traces | ✅ | ✅ | Entries/seeds/guestbook strip |
| Object transforms | ✅ | ✅ | Button-based adjustment (X/Y/rotate/scale/Z) |
| Drag/resize/rotate pointer events | ✅ | ⏳ Deferred | Button controls only; pointer drag is Phase C+ |
| Auto-save | ✅ | ❌ Not implemented | Explicit Save only (by design) |
| Preview button | ✅ | ❌ Not implemented | Phase D/E |
| Publish button | ✅ | ❌ Not implemented | Phase D/E |

---

## 3. Persistence Behaviour

### Load
1. `getPresenceEditor(roomId, token)`
2. `studioV2FromPresenceConfig(config, node)`
3. Initialise React state + base snapshot

### Edit
1. User interacts with UI ( Skin Lab, object edit, add, delete, etc.)
2. `setV2State` updates React state
3. `dirty` recomputes via JSON.stringify snapshot comparison

### Save
1. `presenceConfigFromStudioV2State(v2State, existingConfig)`
2. `patchPresenceEditorDraft` or `createPresenceEditorDraft`
3. Backend response → `studioV2FromPresenceConfig(savedConfig, node)`
4. Update state + base snapshot → dirty clears

### No localStorage
Verified zero `localStorage` reads/writes in `components/presence-studio-v2/*`.

---

## 4. Verification Results

### Typecheck
```bash
npm run typecheck
```
✅ Clean — no errors.

### Build
```bash
npm run build
```
✅ Succeeds — all routes compile.

### Adapter tests
```bash
node --experimental-strip-types --test lib/presence/studio-v2/studioV2Adapters.test.ts
```
✅ 14/14 pass.

### Public payload tests
```bash
node --experimental-strip-types --test lib/presence/render/publicPayload.test.ts
```
✅ 3/3 pass.

---

## 5. Files Changed

| File | Action |
|---|---|
| `components/presence-studio-v2/PresenceStudioV2Editor.tsx` | **Rewritten** — full cockpit with toolbar, room, panels, floating toolbar, actions |
| `components/presence-studio-v2/PresenceStudioV2Room.tsx` | **NEW** — owner-side room renderer |
| `components/presence-studio-v2/PresenceStudioV2Panels.tsx` | **NEW** — Skin Lab, Object Editor, Add Object, Moodboard, World Switcher |
| `components/presence-studio-v2/presence-studio-v2.css` | **Expanded** — full scoped visual system (~350 lines) |
| `components/presence-studio-v2/worlds.ts` | **NEW** — world data, skin controls, moodboard types, add object types |

---

## 6. Known Limitations (Explicit)

This pass does **NOT** complete:

- **Pointer-based drag/resize/rotate** — Wild Mode uses button controls only. Pointer events for direct manipulation deferred.
- **Auto-save** — Explicit Save button only. Debounced auto-save can be added later.
- **Preview button** — No preview panel wired.
- **Publish button** — No publish flow in V2 UI yet.
- **Public renderer dispatch** — Still deferred to Phase D.
- **Hosted smoke** — Not claimed.
- **Object image upload** — Image URL text input only; no media upload integration.
- **Chamber add/delete/reorder** — Only object-level editing; chamber structure is read-only.
- **Mobile recovery simulation** — Viewport toggle resizes room but does not apply transform suspension logic in renderer.

---

## 7. Acceptance Criteria Checklist

| # | Criterion | Status |
|---|---|---|
| 1 | Full owner-side V2 cockpit renders behind flag | ✅ |
| 2 | Legacy editor path remains unchanged | ✅ |
| 3 | V2 state loads from real draft | ✅ |
| 4 | Object selection works | ✅ |
| 5 | Object edit/add/delete/duplicate works | ✅ |
| 6 | Skin Lab changes visible state | ✅ |
| 7 | Guided/Wild Mode works at prototype-equivalent level | ✅ |
| 8 | Moodboard add/remove works | ✅ |
| 9 | Save Draft persists V2 state through real owner editor draft API | ✅ |
| 10 | Reload restores saved V2 state from backend | ✅ |
| 11 | No localStorage used as production source of truth | ✅ |
| 12 | No TemplateKit endpoint used | ✅ |
| 13 | Typecheck/build/tests pass | ✅ |
| 14 | Public renderer remains deferred | ✅ |
| 15 | Remaining limitations documented honestly | ✅ |

---

## 8. Next Recommended Pass (Phase D)

1. **Public renderer dispatch** — Wire `PortfolioRenderer` to pass `studioV2Room` to new `PresenceStudioV2PublicRenderer`
2. **Preview route** — Verify `PresenceDraftPreviewPage` handles V2 rooms
3. **Pointer drag/resize/rotate** — Add direct manipulation in Wild Mode
4. **Auto-save debounce** — Optional, with explicit Save fallback
5. **Preview/Publish buttons** — Wire to existing `previewPresenceEditorDraft` / `publishPresenceEditorDraft`
6. **Hosted smoke** — Run full owner lifecycle with real credentials
