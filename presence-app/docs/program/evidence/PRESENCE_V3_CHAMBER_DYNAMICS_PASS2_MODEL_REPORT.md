# Presence V3 Chamber Dynamics — Pass 2 Model/Helpers/Adapter Report

**Date:** 2026-06-09
**Auditor/Implementer:** Kimi Code CLI
**Scope:** Chamber metadata model, normalization helpers, adapter round-trip, unit tests
**Baseline:** `c9192b7` on `feature/presence-ecosystem-alpha`
**S4A status:** Parked in `stash@{0}` — not applied, not merged
**Deliverable:** This document + code changes

---

## 1. Executive Summary

Pass 2 implemented the chamber metadata foundation:

- Chamber metadata types added to `model.ts`
- Pure helper module `chambers.ts` created with normalization + query functions
- Adapter serialization/deserialization updated to round-trip metadata
- Public projection passes metadata through safely
- 33 new unit tests in `chambers.test.ts`
- 6 new adapter round-trip tests in `studioV2Adapters.test.ts`
- **Total: 39 new tests, 0 failures**
- Typecheck passes, build passes, all existing tests pass

**No UI added. No public renderer behaviour changed. No deploy. No hosted mutation. S4A remains parked.**

---

## 2. Files Changed

| File | Change | Lines |
|------|--------|-------|
| `lib/presence/studio-v2/model.ts` | Added `StudioV2ChamberRole`, `StudioV2ChamberLayout`, `StudioV2ChamberTransition`, `StudioV2ChamberMetadata` enums/types; extended `StudioV2Chamber` and `StudioV2PublicChamber` with optional `metadata` | +31 |
| `lib/presence/studio-v2/chambers.ts` | **New file.** Normalization helpers + query functions | +128 |
| `lib/presence/studio-v2/chambers.test.ts` | **New file.** 33 unit tests | +354 |
| `lib/presence/studio-v2/index.ts` | Added `export * from "./chambers.ts"` | +1 |
| `lib/presence/studio-v2/adapters.ts` | Serialization includes `metadata` in chamber skeleton; deserialization reads and normalizes `metadata` from stored config | +4 |
| `lib/presence/studio-v2/sanitize.ts` | `stripEditorStateFromStudioV2` passes `metadata` through to public chamber | +1 |
| `lib/presence/studio-v2/studioV2Adapters.test.ts` | Added 6 adapter round-trip tests for metadata | +152 |

**Total:** 7 files touched, 2 new files created, ~671 lines added.

---

## 3. Metadata Model

### Types added

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

### Safe extension pattern

Both `StudioV2Chamber` and `StudioV2PublicChamber` gained:
```typescript
metadata?: StudioV2ChamberMetadata;
```

This is an **optional field** — old rooms without metadata remain fully valid. No migration needed.

---

## 4. Helper Functions

All functions are **pure, non-mutating, and tolerate malformed data**.

### Normalization

| Function | Fallback | Behaviour |
|----------|----------|-----------|
| `normalizeStudioV2ChamberRole(value)` | `"custom"` | Case-insensitive match against allowed roles |
| `normalizeStudioV2ChamberLayout(value)` | `"stack"` | Case-insensitive match against allowed layouts |
| `normalizeStudioV2ChamberTransition(value)` | `"none"` | Case-insensitive match against allowed transitions |
| `normalizeStudioV2ChamberMetadata(value)` | `{}` | Normalizes each field individually; strips unknown fields; strips `undefined` values |
| `withNormalizedStudioV2ChamberMetadata(chamber)` | passthrough | Returns chamber with normalized metadata (no mutation) |
| `normalizeStudioV2Chambers(chambers)` | passthrough | Maps normalization over array (no mutation) |

### Query / Derivation

| Function | Fallback chain | Behaviour |
|----------|---------------|-----------|
| `getStudioV2EntryChamber(chambers)` | `isEntry` → `role === "threshold"` → first chamber | Returns the chamber visitors should land on |
| `getStudioV2DefaultChamber(chambers)` | `isDefault` → entry chamber → first chamber | Returns the fallback/default chamber |
| `getStudioV2ChambersByRole(chambers, role)` | empty array | Returns all chambers matching role |
| `getStudioV2PublicChambers(chambers)` | empty array | Returns chambers with ≥1 public-visible object |

---

## 5. Adapter Round-Trip

### Serialization (`presenceConfigFromStudioV2State`)

Chamber skeletons now include metadata when present:
```typescript
chambers: studioState.chambers.map((chamber) => ({
  id: chamber.id,
  label: chamber.label,
  objectIds: chamber.objects.map((object) => object.id),
  ...(chamber.metadata ? { metadata: chamber.metadata } : {}),
})),
```

Stored at: `scene_config.studio_v2.chambers[].metadata`

### Deserialization (`studioV2FromStoredConfig`)

Reads `layout.metadata`, normalizes it safely:
```typescript
const metadata = record(layout.metadata);
return {
  id: text(layout.id) || `chamber-${index + 1}`,
  label: text(layout.label) || `Room section ${index + 1}`,
  objects: [...],
  ...(Object.keys(metadata).length > 0
    ? { metadata: normalizeStudioV2ChamberMetadata(metadata) }
    : {}),
};
```

### Fallback paths

- `chambersFromStoredObjects` (orphaned objects) → chambers get `metadata: undefined`
- `studioV2FromLegacyPresenceConfig` → chambers get `metadata: undefined`
- Old configs without `metadata` field → `metadata: undefined`
- Invalid persisted metadata → normalized to safe defaults (e.g., `"custom"`, `"stack"`, `"none"`)

### Round-trip proven

Test `"chamber metadata round-trips through adapter save and reload"` proves:
1. `presenceConfigFromStudioV2State` writes metadata to `scene_config.studio_v2.chambers[].metadata`
2. `studioV2FromPresenceConfig` reads and normalizes it back
3. All fields (`role`, `layout`, `transition`, `isEntry`, `description`) survive intact

---

## 6. Public Projection

### What changed

`stripEditorStateFromStudioV2` in `sanitize.ts` now passes `metadata` through:
```typescript
chambers: state.chambers.map((chamber) => ({
  id: chamber.id,
  label: chamber.label,
  ...(chamber.metadata ? { metadata: chamber.metadata } : {}),
  objects: [...],
})),
```

### What did NOT change

- No public renderer behaviour changed
- `BbbVisionThresholdGalleryPublicRoom` still flattens by object type (Pass 4 will consume roles)
- `ChristinaLiquidGalleryPublicRoom` unchanged
- Default Gallery P2 renderer unchanged

### Safety verification

Test `"metadata does not break public projection or payload hygiene"` proves:
- `findStudioV2PublicPayloadLeaks(publicRoom)` returns `[]`
- `findRestrictedPublicPayloadKeys(publicRoom)` returns `[]`
- Metadata contains only scalar strings and booleans — no restricted keys

---

## 7. QA Results

### TypeScript
```
> tsc --noEmit
✓ No errors
```

### Build
```
> next build
✓ Compiled successfully
✓ TypeScript finished
✓ Static pages generated (29/29)
```

### Unit Tests

| Test file | Tests | Pass | Fail |
|-----------|-------|------|------|
| `chambers.test.ts` | 33 | 33 | 0 |
| `studioV2Adapters.test.ts` | 22 | 22 | 0 |
| `assets.test.ts` | 8 | 8 | 0 |
| `feature.test.ts` | 8 | 8 | 0 |
| `publicPayload.test.ts` | 5 | 5 | 0 |
| `resolver.test.ts` | 8 | 8 | 0 |
| `readiness.test.ts` | 5 | 5 | 0 |
| **Total** | **89** | **89** | **0** |

### Warnings
- `MODULE_TYPELESS_PACKAGE_JSON` — pre-existing Node TS test warning, not a regression
- Turbopack workspace root warning — pre-existing, not a regression

---

## 8. Bugs Found / Fixed

### Found during implementation

**Issue:** `normalizeStudioV2ChamberMetadata` initially returned an object with explicit `undefined` values for every field (e.g., `{ role: undefined, layout: undefined, ... }`). Node's `assert.deepEqual` rejected `{}` as not deeply-equal to this.

**Fix:** Changed helper to conditionally set properties only when valid, so the returned object has no `undefined` keys. This is cleaner for serialization and comparison.

**No other bugs found.**

---

## 9. S4A Stash Status

**Still parked in `stash@{0}`.** No un-stash occurred.

S4A functions assessed for future Pass 3 cherry-pick:
- `handleAddChamber` → safe, will need metadata init
- `handleRenameChamber` → safe
- `handleMoveChamber` → safe
- `handleDeleteChamber` → **still dangerous, keep disabled**
- surface tabs → **needs redesign to avoid conflating editor nav with chamber roles**

---

## 10. Remaining Risks

| Risk | Severity | Status |
|------|----------|--------|
| bbbvision renderer still flattens all chambers (ignores roles) | Medium | **Deferred to Pass 4** |
| No Studio UI for editing metadata | Medium | **Deferred to Pass 3** |
| `deleteChamber` remains unimplemented | Low | **Intentionally deferred** |
| Chamber reorder via drag-and-drop not implemented | Low | **Intentionally deferred** |
| No chamber-level visibility toggle | Low | **Intentionally deferred — visibility stays per-object** |
| Dual-index object-chamber relationship unchanged | Medium | **Acknowledged — not in scope for this pass** |
| CSS orbit math hardcoded to 10 positions | Low | **Pre-existing — not in scope** |

---

## 11. Recommended Pass 3 Prompt/Scope

> **Pass 3 — Studio Chamber Controls**
>
> Add Chamber Dynamics UI to the Studio V2 editor inspector. When a chamber is selected (and no object is selected), show:
> - Role dropdown (threshold, gallery, practice, about, archive, contact, index, custom)
> - Layout dropdown (stack, focus, grid, sequence, wall, field)
> - Transition dropdown (none, fade, slide, recede, portal, snap)
> - Entry chamber toggle
> - Default chamber toggle
>
> Cherry-pick `handleAddChamber`, `handleRenameChamber`, `handleMoveChamber` from S4A stash@{0}. Initialize new chambers with `metadata: { role: "custom" }`. Keep `handleDeleteChamber` DISABLED. Add surface tab awareness so editor navigation does not conflate with chamber roles.
>
> Create `tests/e2e/presence-studio-v2-chamber-dynamics.spec.ts` with Playwright tests for role selection, layout selection, save/reload persistence, and regressions (Gallery P2, Christina, S5 asset library, legacy rooms).
>
> Do NOT change public renderers. Do NOT deploy. Do NOT mutate hosted data.

---

## Verdict

**PASS — proceed to Pass 3 Studio chamber controls.**

The chamber metadata foundation is solid, tested, and safe. All helper functions are pure and non-mutating. Adapter round-trip is proven. Public projection is clean. No regressions introduced.
