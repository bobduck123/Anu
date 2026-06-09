# Presence V3 Chamber Dynamics — Pass 1 Architecture Audit

**Date:** 2026-06-09
**Auditor:** Kimi Code CLI (architecture auditor, chamber-state designer, public-renderer reviewer, implementation risk mapper)
**Scope:** `lib/presence/studio-v2/*`, `components/presence-studio-v2/*`, bbbvision parity recovery, S4A stash, S5 asset layer, prototype superiority audit
**Baseline:** `c9192b7` on `feature/presence-ecosystem-alpha`
**S4A status:** Parked in `stash@{0}` — not applied, not merged
**Deliverable:** This document only. No code changes. No deploy. No hosted mutation.

---

## 1. Executive Verdict

### Is the current chamber model sufficient for V3?

**No.** The current `StudioV2Chamber` is `{ id, label, objects[] }` — an anemic bag with no semantic metadata. It cannot express:
- what a chamber *is* (threshold, gallery, practice, about, archive...)
- how a chamber behaves (layout, transition, entry state)
- whether a chamber is public, hidden, or mobile-only
- which chamber is the default/entry point

Chambers are currently page sections with labels, not room states.

### What is missing?

1. **Chamber metadata model** — role, layout hint, transition hint, visibility, entry/default flags
2. **Generic chamber-state navigation** — the bbbvision hash/router is style-specific and private to the renderer
3. **Studio controls for chamber semantics** — no way for an artist to say "this chamber IS the threshold"
4. **Public-safe chamber metadata projection** — adapter and sanitizer need to know new fields are public-safe
5. **Renderer consumption of chamber metadata** — bbbvision should use chamber roles instead of flattening by object type

### Is bbbvision currently a one-off state machine?

**Yes.** `BbbVisionThresholdGalleryPublicRoom` implements `BbbVisionPublicView = "threshold" | "gallery" | "practice"` as pure client-side React state (`useState`). It:
- Flattens ALL chambers via `room.chambers.flatMap()`
- Decides threshold content = first 10 image objects (regardless of which chamber they came from)
- Decides gallery content = all image objects (first 20 for orbit)
- Decides practice content = text/note/proof objects + tagline
- Has its own hash router, keyboard handlers, and animation state

The artist cannot control which chamber becomes the threshold. They can only influence it indirectly by object ordering and types. This is the exact failure mode the product standard rejects: "Chambers must become room states/scenes, not page sections."

### What should be generalized first?

1. **Chamber metadata types + normalization helpers** (Pass 2)
2. **Adapter round-trip for chamber metadata** (Pass 2)
3. **Studio chamber dynamics UI** (Pass 3)
4. **bbbvision renderer consuming chamber roles** (Pass 4)

### Is S4A useful or outdated?

**Partially useful, partially dangerous.**

S4A stash implements basic chamber CRUD: `addChamber`, `renameChamber`, `moveChamber` (up/down swap), `deleteChamber`. It also adds surface tabs ("threshold" | "chamber" | "archive") and active chamber tracking.

**Reusable:**
- `addChamber` / `renameChamber` / `moveChamber` logic
- Active chamber ID state management
- Chamber expansion/collapse in outline

**Unsafe:**
- `deleteChamber` with NO object safety check (can delete a chamber containing objects)
- Surface tabs conflate editor surface navigation with chamber roles
- No chamber metadata support

S4A should NOT be un-stashed. Cherry-pick `addChamber`, `renameChamber`, `moveChamber` after the metadata model exists. Keep `deleteChamber` disabled until object safety is proven.

### What is the safest next coding pass?

**Pass 2: Chamber metadata helpers and unit tests only.**

No UI. No renderer. No deploy. Just:
- `StudioV2ChamberMetadata` type
- Normalization helpers
- Adapter round-trip
- `chambers.test.ts`

This is the narrowest possible foundation. Everything else builds on it.

---

## 2. Current Chamber Model Inventory

### 2.1 Chamber shape

```typescript
export interface StudioV2Chamber {
  id: string;
  label: string;
  objects: StudioV2Object[];
}
```

**What exists:** `id`, `label`, `objects[]` (array order = implicit order).
**What is missing:** role, description, layout, transition, visibility, entry/default flags, ordering index, skin override.

### 2.2 Public chamber shape

```typescript
export interface StudioV2PublicChamber {
  id: string;
  label: string;
  objects: StudioV2PublicObject[];
}
```

Identical to editor shape minus `locked`/`pinned`/visibility objects. No metadata survives because there is none to survive.

### 2.3 Where chamber data is stored

| Config bucket | Chamber data |
|---------------|-------------|
| `scene_config.studio_v2.chambers` | `id`, `label`, `objectIds[]` |
| `scene_config.studio_v2.objectState` | `chamberId` per object, transform, visibility, locked, pinned |
| `content_config.studio_v2.objects` | Object content (id, type, title, meta, detail, link, image) |

**Critical:** This is a **dual-indexed relationship** with no runtime integrity check. `chambers[i].objectIds` and `objectState[objId].chamberId` can disagree. Corruption in either bucket causes object loss or misplacement.

### 2.4 How chamber order is represented

Array index only. No explicit `sortOrder` or `index` field. Reordering mutates the array.

### 2.5 How objects reference chambers

Per-object `chamberId` in `objectState`. The chamber record only holds `objectIds[]` — it does not own the objects.

### 2.6 What chamber metadata exists now

| Metadata | Exists? | Where |
|----------|---------|-------|
| `id` | Yes | `scene_config.studio_v2.chambers[].id` |
| `label` | Yes | `scene_config.studio_v2.chambers[].label` |
| `objects` | Yes | `content_config.studio_v2.objects` + `scene_config.studio_v2.objectState` |
| `role` | No | — |
| `description` | No | — |
| `layout` | No | — |
| `transition` | No | — |
| `visibility` | No (object-level only) | — |
| `isEntry` | No | — |
| `isDefault` | No | — |
| `sortOrder` | No | — |

### 2.7 How chamber data persists through adapters

**Serialization (`presenceConfigFromStudioV2State`):**
```typescript
scene_config.studio_v2.chambers = [
  { id, label, objectIds: ["obj1", "obj2"] }
]
```

Chambers are flattened to skeletons. Object content is split to `content_config`. Object state is split to `objectState`.

**Deserialization (`studioV2FromStoredConfig`):**
1. Read chamber skeletons
2. Read object content map
3. Read object state map
4. Rebuild chambers by resolving `objectId` → content + state
5. Fallback: `chambersFromStoredObjects` groups orphaned objects by `chamberId`

**What metadata is lost:** Everything beyond `id`/`label`/`objectIds`. There is no chamber metadata to lose because none exists.

### 2.8 How public projection handles chambers

`stripEditorStateFromStudioV2` maps each chamber to:
```typescript
{
  id: chamber.id,
  label: chamber.label,
  objects: chamber.objects
    .filter(o => o.visibility.public)
    .map(o => ({ /* stripped public object */ }))
}
```

No chamber-level filtering exists. A chamber with zero public objects renders as an empty chamber.

### 2.9 How hidden public/mobile state currently works

**Per-object only.** `StudioV2ObjectVisibility = { public: boolean; mobile: boolean }`.

- `public: false` → object excluded from public projection
- `mobile: false` → object excluded from narrow viewport rendering
- **No chamber-level equivalent.** If all objects in a chamber are hidden, the chamber still renders (empty).

---

## 3. bbbvision State-Flow Analysis

### 3.1 Current implementation

bbbvision implements three public client states in `BbbVisionThresholdGalleryPublicRoom`:

```typescript
type BbbVisionPublicView = "threshold" | "gallery" | "practice";
type BbbVisionMovement = "enter" | "prev" | "next" | "index";
```

**State machine:**
```
threshold --(Enter click)--> gallery
  gallery --(ArrowLeft)--> gallery (prev image)
  gallery --(ArrowRight)--> gallery (next image)
  gallery --(Escape)--> threshold
  gallery --(Practice click)--> practice
practice --(Escape)--> gallery
```

**Hash/back support:**
- `moveToView()` pushes `window.history.pushState({ bbbvisionView }, "", "#gallery")`
- `syncViewFromLocation()` listens to `hashchange` and `popstate`
- Browser back from gallery returns to threshold

**Keyboard navigation:**
- `ArrowLeft` / `ArrowRight` in gallery moves images
- `Escape` in gallery → threshold; in practice → gallery
- Disabled when `focusedArtwork` modal is open

**Mobile behaviour:**
- Threshold-only first state
- Bottom controls for gallery
- Horizontal image rhythm

**Reduced-motion:**
- CSS class `motion-${room.skin.motionIntensity}` controls animation
- `is-moving-${movement}` class triggers CSS transitions
- No JS animation; all motion is CSS-driven

### 3.2 Where logic lives

All state logic is **inside the bbbvision renderer component**:
- `useState<BbbVisionPublicView>("threshold")`
- `useState<BbbVisionMovement | null>(null)`
- `useEffect` for hash/popstate sync
- `useEffect` for keyboard handlers
- `useCallback` for `moveToView`, `setActiveImage`, `markMovement`

This is **style-specific, not generic.** No other preset can use threshold/gallery/practice states without copying this code.

### 3.3 What is data-driven

| Aspect | Data-driven? | Source |
|--------|-------------|--------|
| Room title | Yes | `room.title` |
| Tagline | Yes | `room.tagline` |
| Threshold images | **Partially** | First 10 image objects from ALL chambers (flattened) |
| Gallery images | **Partially** | All image objects from ALL chambers (flattened) |
| Practice copy | **Partially** | Text/note/proof objects from ALL chambers + tagline |
| Enter label | Yes | CTA object title or `room.cta.label` |
| Image captions | Yes | Object title/meta/detail |
| Chamber labels | Yes | Used in captions but chambers are flattened |

### 3.4 What is style-specific (hardcoded)

| Aspect | Hardcoded? |
|--------|-----------|
| threshold = first 10 images | Yes |
| gallery = all images | Yes |
| practice = text objects + tagline | Yes |
| Hash router logic | Yes |
| Keyboard handlers | Yes |
| CSS animation classes | Yes |
| Progress label format | Yes (`01 / N`) |
| Side ghost images | Yes |
| Orbit rail | Yes |

### 3.5 What should be generalized

The **entire state machine** should become generic chamber-state infrastructure:

- `threshold` → `chamber.role === "threshold"`
- `gallery` → `chamber.role === "gallery"`
- `practice` → `chamber.role === "practice"` or `chamber.role === "about"`
- Hash router → generic mini-router keyed by active chamber role
- Keyboard navigation → generic prev/next across chambers of role `gallery`
- Enter action → generic "move to entry chamber" action

The bbbvision renderer should consume chamber metadata like:
```typescript
const thresholdChamber = room.chambers.find(c => c.role === "threshold");
const galleryChambers = room.chambers.filter(c => c.role === "gallery");
const practiceChamber = room.chambers.find(c => c.role === "practice" || c.role === "about");
```

Fallback (for rooms without chamber roles):
```typescript
// Current heuristic: first chamber = threshold, all image objects = gallery, text objects = practice
```

---

## 4. Chamber Dynamics Model Proposal

### 4.1 Proposed chamber metadata

```typescript
export type StudioV2ChamberRole =
  | "threshold"
  | "gallery"
  | "practice"
  | "about"
  | "archive"
  | "contact"
  | "index"
  | "custom";

export type StudioV2ChamberLayout =
  | "stack"
  | "focus"
  | "grid"
  | "sequence"
  | "wall"
  | "field";

export type StudioV2ChamberTransition =
  | "none"
  | "fade"
  | "slide"
  | "recede"
  | "portal"
  | "snap";

export interface StudioV2ChamberMetadata {
  role?: StudioV2ChamberRole;
  description?: string;
  layout?: StudioV2ChamberLayout;
  transition?: StudioV2ChamberTransition;
  isEntry?: boolean;
  isDefault?: boolean;
}
```

### 4.2 Updated chamber types

```typescript
export interface StudioV2Chamber {
  id: string;
  label: string;
  objects: StudioV2Object[];
  metadata?: StudioV2ChamberMetadata;
}

export interface StudioV2PublicChamber {
  id: string;
  label: string;
  objects: StudioV2PublicObject[];
  metadata?: StudioV2ChamberMetadata;
}
```

### 4.3 Field specification

| Field | Type | Already exists? | Persist location | Public-safe? | Fallback | Risk |
|-------|------|----------------|------------------|--------------|----------|------|
| `role` | `StudioV2ChamberRole` | No (object `role` exists as ghost field) | `scene_config.studio_v2.chambers[].metadata.role` | Yes | `"custom"` | Low |
| `description` | `string` | No | `scene_config.studio_v2.chambers[].metadata.description` | Yes | `undefined` | Low |
| `layout` | `StudioV2ChamberLayout` | No | `scene_config.studio_v2.chambers[].metadata.layout` | Yes | `"stack"` | Low |
| `transition` | `StudioV2ChamberTransition` | No | `scene_config.studio_v2.chambers[].metadata.transition` | Yes | `"none"` | Low |
| `isEntry` | `boolean` | No | `scene_config.studio_v2.chambers[].metadata.isEntry` | Yes | `false` | Low |
| `isDefault` | `boolean` | No | `scene_config.studio_v2.chambers[].metadata.isDefault` | Yes | First chamber = implicit default | Low |

### 4.4 Why `scene_config`?

Chamber metadata is **structural/scene-level configuration**, not content, style, or motion. It belongs in `scene_config.studio_v2.chambers[]` alongside `id`, `label`, `objectIds`.

Proposed stored shape:
```typescript
scene_config.studio_v2.chambers = [
  {
    id: "threshold",
    label: "Threshold",
    objectIds: ["obj1", "obj2"],
    metadata: {
      role: "threshold",
      layout: "focus",
      transition: "portal",
      isEntry: true,
    }
  }
]
```

### 4.5 Public-safe projection rules

`stripEditorStateFromStudioV2` passes `metadata` through unchanged. All fields are public-safe scalars. No new restricted keys needed.

Sanity check: `metadata` is NOT in `STUDIO_V2_PUBLIC_RESTRICTED_KEYS`. Add it explicitly to the allowed list in both `sanitize.ts` and `publicPayload.ts` documentation.

### 4.6 Fallback rules for old rooms

| Scenario | Fallback |
|----------|----------|
| No `metadata` field on chamber | `role: undefined`, `layout: undefined`, `transition: undefined`, `isEntry: false`, `isDefault: false` |
| Invalid `role` string | `normalizeChamberRole()` → `"custom"` |
| Invalid `layout` string | `normalizeChamberLayout()` → `"stack"` |
| Invalid `transition` string | `normalizeChamberTransition()` → `"none"` |
| Multiple `isEntry: true` | First one wins; warn in dev |
| No `isEntry: true` and no `isDefault: true` | First chamber is implicit default |

### 4.7 What is intentionally NOT in this model

- **No animation engine** — transitions are CSS hint strings only. No WebGL, GSAP, or canvas references.
- **No per-chamber skin override** — skin remains global. Future pass can add if needed.
- **No chamber-level visibility** — visibility stays per-object. A chamber with all hidden objects is effectively hidden.
- **No scheduled visibility** — no time-based or A/B chamber states.
- **No object relationships** — no parent/child or cross-chamber links.
- **No versioning** — no chamber history or undo stack.

This model is intentionally minimal. It gives chambers semantic meaning without building an animation framework.

---

## 5. Adapter and Public Projection Seam Map

### 5.1 Files/functions requiring changes

#### `lib/presence/studio-v2/model.ts`

| Change | Risk | Test |
|--------|------|------|
| Add `StudioV2ChamberRole`, `StudioV2ChamberLayout`, `StudioV2ChamberTransition` enums | Low — additive, no breaking change | Unit test: enum exhaustiveness |
| Add `StudioV2ChamberMetadata` interface | Low — additive | Unit test: type compatibility |
| Add `metadata?: StudioV2ChamberMetadata` to `StudioV2Chamber` | Low — optional field | Unit test: old chambers still valid |
| Add `metadata?: StudioV2ChamberMetadata` to `StudioV2PublicChamber` | Low — optional field | Unit test: public projection passes metadata |

#### `lib/presence/studio-v2/adapters.ts`

| Change | Risk | Test |
|--------|------|------|
| `presenceConfigFromStudioV2State`: serialize `chamber.metadata` into `scene_config.studio_v2.chambers[].metadata` | Medium — new config path | Unit test: round-trip preserves metadata |
| `studioV2FromStoredConfig`: read `chamber.metadata` from stored config | Medium — malformed metadata must not crash | Unit test: malformed metadata recovers safely |
| `studioV2FromLegacyPresenceConfig`: chambers get `metadata: undefined` | Low | Unit test: legacy lift produces undefined metadata |
| Add `normalizeChamberRole`, `normalizeChamberLayout`, `normalizeChamberTransition` | Low | Unit test: invalid values fall back safely |

#### `lib/presence/studio-v2/sanitize.ts`

| Change | Risk | Test |
|--------|------|------|
| `stripEditorStateFromStudioV2`: pass `metadata` through to public chamber | Low — metadata is public-safe | Unit test: metadata survives projection |
| Verify `metadata` is not in restricted keys | Low | Unit test: no leak scanner false positive |

#### `lib/presence/studio-v2/publicProjection.ts`

| Change | Risk | Test |
|--------|------|------|
| No change required | — | — |

#### `lib/presence/render/publicPayload.ts`

| Change | Risk | Test |
|--------|------|------|
| Verify `metadata` is not in `RESTRICTED_PUBLIC_PAYLOAD_KEYS` | Low | Unit test: payload hygiene passes with metadata |

#### `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`

| Change | Risk | Test |
|--------|------|------|
| bbbvision renderer: consume `chamber.metadata?.role` instead of flattening | High — must preserve recovered behaviour | Playwright: bbbvision parity spec |
| Gallery P2 renderer: no visual change, optionally use entry chamber | Low | Playwright: Gallery P2 regression |
| Christina renderer: no visual change | Low | Playwright: Christina regression |

#### `components/presence-studio-v2/PresenceStudioV2Editor.tsx`

| Change | Risk | Test |
|--------|------|------|
| Add chamber dynamics UI section | Medium — new inspector panel | Playwright: chamber dynamics spec |
| Cherry-pick `handleAddChamber` from S4A stash | Low — already proven | Playwright: add chamber test |
| Cherry-pick `handleRenameChamber` from S4A stash | Low — already proven | Playwright: rename chamber test |
| Cherry-pick `handleMoveChamber` from S4A stash | Low — already proven | Playwright: reorder chamber test |
| Keep `handleDeleteChamber` DISABLED until safety proven | High — destructive | Playwright: delete negative test |

### 5.2 Can this be done without backend contract changes?

**Yes.** All changes stay within the existing `scene_config.studio_v2.chambers[]` structure. The backend stores the entire `scene_config` blob opaquely. No new API endpoints, no new database columns, no backend type changes.

The only contract is between `presenceConfigFromStudioV2State` and `studioV2FromStoredConfig` — both live in the frontend codebase.

---

## 6. Studio UI Plan

### 6.1 Minimum honest controls

When a chamber is selected (or when no object is selected), the inspector shows a **Chamber Dynamics** section:

```
CHAMBER DYNAMICS
────────────────
Role          [ threshold ▼ ]
              [ gallery   ▼ ]
              [ practice  ▼ ]
              [ about     ▼ ]
              [ archive   ▼ ]
              [ contact   ▼ ]
              [ index     ▼ ]
              [ custom    ▼ ]

Layout        [ stack  ▼ ]
              [ focus  ▼ ]
              [ grid   ▼ ]
              [ sequence ▼ ]
              [ wall   ▼ ]
              [ field  ▼ ]

Transition    [ none   ▼ ]
              [ fade   ▼ ]
              [ slide  ▼ ]
              [ recede ▼ ]
              [ portal ▼ ]
              [ snap   ▼ ]

[ ] Entry chamber (visitor lands here)
[ ] Default chamber (fallback if no entry)
```

### 6.2 Placement

- **Left outline:** Chamber label with role badge (e.g., "Threshold 🚪", "Gallery 🖼️"). Click to select chamber.
- **Inspector (when chamber selected, no object selected):** Full Chamber Dynamics panel.
- **Inspector (when object selected):** Object inspector + parent chamber label (read-only).

### 6.3 Proposed test IDs

```
presence-studio-v2-chamber-dynamics
presence-studio-v2-chamber-role
presence-studio-v2-chamber-layout
presence-studio-v2-chamber-transition
presence-studio-v2-chamber-entry-toggle
presence-studio-v2-chamber-default-toggle
presence-studio-v2-chamber-role-option
presence-studio-v2-chamber-layout-option
presence-studio-v2-chamber-transition-option
```

### 6.4 What is NOT in this pass

- No drag-to-reorder chambers (S4A has `handleMoveChamber` up/down; use that)
- No chamber delete (keep disabled)
- No chamber skin override
- No chamber-level visibility toggle (use object visibility)
- No animation timeline or keyframe editor
- No complex state machine editor

---

## 7. Public Renderer Plan

### 7.1 How renderers should consume chamber metadata

**bbbvision (`BbbVisionThresholdGalleryPublicRoom`):**

```typescript
const thresholdChamber = room.chambers.find(c => c.metadata?.role === "threshold");
const galleryChambers = room.chambers.filter(c => c.metadata?.role === "gallery");
const practiceChamber = room.chambers.find(c =>
  c.metadata?.role === "practice" || c.metadata?.role === "about"
);

// Fallback to current heuristic if no roles assigned
const thresholdObjects = thresholdChamber?.objects ?? works.slice(0, 10);
const galleryObjects = galleryChambers.flatMap(c => c.objects) ?? works;
const practiceObjects = practiceChamber?.objects ?? storyObjects;
```

**Gallery P2:**
- No visual change in Pass 4.
- Internally, could use entry chamber for threshold section if `isEntry` is set.
- Fallback: current behaviour (all chambers stacked sequentially).

**Christina Liquid Gallery:**
- No visual change in Pass 4.
- Could use `gallery` role chambers for selected-works sequence.
- Fallback: current behaviour (all image objects across all chambers).

**Legacy rooms:**
- Must remain untouched.
- Legacy renderer does not consume Studio V2 payload at all.

### 7.2 No public metadata leakage

`metadata` contains only public-safe scalar strings and booleans. It passes through both sanitization layers unchanged. The existing payload hygiene tests will verify this.

---

## 8. S4A Reuse Assessment

### 8.1 What S4A implemented

From `git stash show -p stash@{0}`:

- `handleAddChamber()` — creates new chamber with `makeId("chamber")`, empty objects array
- `handleRenameChamber(id, label)` — updates chamber label
- `handleMoveChamber(id, direction)` — swaps chamber with neighbour (up/down)
- `handleDeleteChamber(id)` — removes chamber, objects are LOST (not moved to another chamber)
- Surface tabs: `"threshold" | "chamber" | "archive"`
- `activeChamberId` state
- `expandedChambers` Set state
- Chamber scroll-to on selection

### 8.2 What is reusable

| Feature | Reusable? | Notes |
|---------|-----------|-------|
| `handleAddChamber` | **Yes** | Clean, safe. Needs metadata initialization. |
| `handleRenameChamber` | **Yes** | Clean, safe. |
| `handleMoveChamber` | **Yes** | Clean, safe. Array swap is robust. |
| `activeChamberId` | **Yes** | Useful for Studio UI. |
| `expandedChambers` | **Yes** | Useful for outline tree. |
| `scrollToChamber` | **Yes** | Clean. |

### 8.3 What is unsafe

| Feature | Unsafe? | Why |
|---------|---------|-----|
| `handleDeleteChamber` | **YES — DANGEROUS** | Deletes chamber AND its objects. No confirmation modal in stash. No object rescue. Objects are permanently lost from the room. |
| Surface tabs | **Misleading** | "threshold" | "chamber" | "archive" conflates editor surface navigation with chamber roles. A chamber can HAVE role "threshold"; the editor should not have a "threshold" tab. |

### 8.4 Cherry-pick recommendation

```
✅ handleAddChamber    → reuse with metadata init
✅ handleRenameChamber → reuse as-is
✅ handleMoveChamber   → reuse as-is
❌ handleDeleteChamber → DISABLE until object safety proven
❌ surface tabs        → redesign as chamber-role-aware navigation
```

### 8.5 Does S4A conflict with the new chamber-state model?

**No direct conflict.** S4A adds CRUD; the new model adds metadata. They are orthogonal. However, S4A's surface tabs would need redesign to avoid conflating editor navigation with chamber roles.

---

## 9. Testing Plan

### 9.1 Required unit test

`lib/presence/studio-v2/chambers.test.ts`

Must cover:

```typescript
test("default chamber metadata is undefined for legacy rooms");
test("chamber role normalizes to custom for invalid values");
test("chamber layout normalizes to stack for invalid values");
test("chamber transition normalizes to none for invalid values");
test("entry chamber derivation returns first isEntry chamber");
test("default chamber falls back to first chamber if no isEntry/isDefault");
test("public chamber filtering preserves metadata");
test("hidden public objects are filtered but chamber metadata survives");
test("invalid metadata values do not mutate input state");
test("malformed stored config recovers with safe metadata defaults");
test("adapter round-trip preserves chamber metadata through save and reload");
```

### 9.2 Required Playwright test

`tests/e2e/presence-studio-v2-chamber-dynamics.spec.ts`

Must cover:

```typescript
test("chamber dynamics controls render in inspector");
test("role selector shows all options and selects correctly");
test("layout selector shows all options and selects correctly");
test("transition selector shows all options and selects correctly");
test("save/reload persists role/layout/transition");
test("bbbvision preview uses chamber roles when assigned");
test("Enter moves to gallery chamber with role gallery");
test("practice chamber with role practice renders separately");
test("chamber with all hidden objects does not leak editor state");
test("Gallery P2 regression — stacked chambers still work");
test("Christina regression — liquid sequence still works");
test("S5 asset library regression — asset panel still works");
test("legacy room negative — no V2 renderer leakage");
test("payload hygiene — no chamber metadata leaks restricted keys");
```

---

## 10. Risk Register

| Risk | Severity | Likelihood | Mitigation | Test/Evidence |
|------|----------|------------|------------|---------------|
| Flattening bbbvision again | Critical | Medium | Keep current renderer as fallback heuristic; only switch to role-based when roles are explicitly assigned | bbbvision parity spec must still pass |
| Breaking Gallery P2 | High | Low | No visual change to P2 renderer in Pass 4; metadata is opt-in | Gallery P2 polish/quality specs |
| Breaking Christina | High | Low | No visual change to Christina renderer in Pass 4 | Christina spec |
| Leaking chamber metadata publicly | High | Low | Metadata contains only scalars; add to hygiene scanners | payload hygiene spec |
| Invalid metadata corrupting old rooms | Medium | Low | Normalization helpers with safe fallbacks | chambers.test.ts |
| Destructive chamber deletion | High | Medium | Keep delete DISABLED in UI until object safety proven | Playwright negative test |
| Over-merging S4A | Medium | Medium | Do NOT un-stash S4A; cherry-pick only safe functions | Manual code review |
| Hidden/mobile visibility ambiguity | Medium | Low | Keep visibility per-object; chamber hiddenness is derived from object visibility | public render spec |
| Editor UI becoming too complex | Medium | Medium | Limit to 3 dropdowns + 2 toggles; no animation editor | UI screenshot review |
| Motion controls implying unsupported WebGL/GSAP | Low | Low | Transition is a CSS hint string only; no engine port | CSS scan |
| Hosted mutation without backup | High | Low | Pass 2/3 are local-only; no deploy | No hosted tests in Pass 2/3 |
| Dual-index corruption on chamber reorder | Medium | Low | `moveChamber` swaps array positions but does not touch `objectState.chamberId` | Adapter test |

---

## 11. Implementation Sequence

### Pass 2 — Model/helpers/unit tests only

- [ ] Add `StudioV2ChamberRole`, `StudioV2ChamberLayout`, `StudioV2ChamberTransition` enums
- [ ] Add `StudioV2ChamberMetadata` interface
- [ ] Add `metadata?: StudioV2ChamberMetadata` to `StudioV2Chamber` and `StudioV2PublicChamber`
- [ ] Add normalization helpers: `normalizeChamberRole`, `normalizeChamberLayout`, `normalizeChamberTransition`
- [ ] Add entry/default chamber derivation helpers
- [ ] Update `presenceConfigFromStudioV2State` to serialize metadata
- [ ] Update `studioV2FromStoredConfig` to deserialize metadata
- [ ] Verify `stripEditorStateFromStudioV2` passes metadata through
- [ ] Create `lib/presence/studio-v2/chambers.test.ts`
- [ ] Update `studioV2Adapters.test.ts` with metadata round-trip tests
- [ ] Verify payload hygiene still passes
- [ ] **No UI. No renderer. No deploy.**

### Pass 3 — Studio controls

- [ ] Cherry-pick `handleAddChamber`, `handleRenameChamber`, `handleMoveChamber` from S4A stash
- [ ] Add Chamber Dynamics section to inspector
- [ ] Add role/layout/transition dropdowns
- [ ] Add entry/default toggles
- [ ] Wire save/reload
- [ ] Create `tests/e2e/presence-studio-v2-chamber-dynamics.spec.ts`
- [ ] Verify Gallery P2, Christina, S5 regressions
- [ ] **No public visual change.**

### Pass 4 — bbbvision consumes chamber metadata

- [ ] Update `BbbVisionThresholdGalleryPublicRoom` to use `chamber.metadata?.role`
- [ ] Implement fallback heuristic for rooms without roles
- [ ] Update `tests/e2e/presence-studio-v2-bbbvision-parity.spec.ts`
- [ ] Verify threshold/gallery/practice states still work
- [ ] Verify hash/back/keyboard still work
- [ ] Verify mobile/reduced-motion still work
- [ ] **Local visual proof only.**

### Pass 5 — Kimi audit

- [ ] Visual/interaction audit of bbbvision with chamber roles
- [ ] Payload hygiene audit
- [ ] Regression audit (P2, Christina, S5, legacy)
- [ ] Deploy decision

### Pass 6 — Hosted smoke

- [ ] Only after audit pass
- [ ] Backup Room 29 and Room 11 before any hosted mutation
- [ ] Verify hosted bbbvision with chamber roles
- [ ] Verify Room 11 and legacy rooms

---

## 12. Recommended First Coding Pass

> **Pass 2 — Chamber metadata helpers and unit tests only.**

**Exact prompt for the next agent:**

Implement the chamber metadata model and normalization helpers in `lib/presence/studio-v2/model.ts` and `lib/presence/studio-v2/adapters.ts`. Add `StudioV2ChamberRole`, `StudioV2ChamberLayout`, `StudioV2ChamberTransition` enums, `StudioV2ChamberMetadata` interface, and update `StudioV2Chamber`/`StudioV2PublicChamber` with an optional `metadata` field. Update the serialization and deserialization paths to round-trip chamber metadata through `scene_config.studio_v2.chambers[].metadata`. Add normalization helpers with safe fallbacks. Create `lib/presence/studio-v2/chambers.test.ts` covering default metadata, role/layout/transition normalization, entry chamber derivation, public chamber filtering, invalid value recovery, and no input mutation. Verify payload hygiene still passes. Do NOT touch UI components. Do NOT touch public renderers. Do NOT deploy. Do NOT un-stash S4A.

---

## Verdict

**PASS — proceed to Pass 2 model/helpers/unit tests.**

The architecture is clear. The seams are mapped. The risks are documented. The model is minimal and safe. The next pass is narrow and testable.
