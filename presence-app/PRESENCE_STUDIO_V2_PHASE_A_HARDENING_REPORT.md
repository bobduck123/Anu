# Presence Studio V2 — Phase A Adapter Hardening Report

**Date:** 2026-06-03  
**Scope:** Adapter hardening only. No UI mount. No route changes.  
**Status:** Complete — all acceptance criteria met.

---

## Summary

Closed 6 pre-mount adapter gaps identified in `PRESENCE_STUDIO_V2_KIMI_READINESS_PACKET.md`. Expanded test coverage from 5 to 13 adapter tests. Public payload tests remain at 3 (unchanged, still passing). Typecheck and build are clean.

---

## Files Changed

| File | Change |
|------|--------|
| `lib/presence/studio-v2/feature.ts` | Production empty-pilot guard added |
| `lib/presence/studio-v2/model.ts` | Orphaned `eventBeacon` / `portal` removed from `StudioV2TraceConfig` |
| `lib/presence/studio-v2/adapters.ts` | `fallbackNode` → `createFallbackNode` (typed factory); `worldIdFromLegacy` explicit room_type map; `legacyMoodboardRefsFromConfig` helper; `safePublicUrl` pathname safety hardened; 3 helper functions exported for testing |
| `lib/presence/studio-v2/studioV2Adapters.test.ts` | 8 new tests added (production guard, sanitizer, URL safety, clamp boundaries, malformed config recovery, moodboard lift, world mapping) |

---

## Hardening Items — Detail

### 1. Production Pilot Gating Guard

**File:** `lib/presence/studio-v2/feature.ts`

**Change:** `isPresenceStudioV2PilotEligible` now checks `NODE_ENV` when the pilot ID list is empty.

- `production` + empty pilot list → `false` (blocked)
- `production` + explicit pilot IDs → `true` (allowed)
- dev/test + empty pilot list → `true` (flexible, preserves existing staging behaviour)

**Test:** `"production empty pilot list blocks all rooms unless explicit override"`

---

### 2. Adapter/Sanitizer Tests

**File:** `lib/presence/studio-v2/studioV2Adapters.test.ts`

**New tests:**

| Test | What it proves |
|------|----------------|
| `sanitizeStudioV2PublicPayload strips restricted keys recursively` | Nested `locked`, `pinned`, `scene_config`, `token` etc. are removed at all depths |
| `safePublicUrl rejects unsafe URLs` | `file://`, `javascript:`, `data:`, `localhost`, `127.0.0.1`, `192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`, `//evil.com`, control-plane paths all rejected |
| `safeAssetPath rejects unsafe paths` | Windows paths (`C:\`), UNC paths (`\\server`), `//`, control-plane paths rejected |
| `normalizeTransform clamps at boundaries` | x/y ±2000, scale 0.2–4, rotation ±360, zIndex 0–999 enforced |
| `studioV2FromStoredConfig recovers from malformed config` | Missing `objectState`, null/garbage V2 sections, arrays where objects expected — all recover to safe fallback |

---

### 3. Moodboard Legacy Lift

**File:** `lib/presence/studio-v2/adapters.ts`

**New function:** `legacyMoodboardRefsFromConfig(config)`

- Searches `content_config.moodboard`, `content_config.moodboardRefs`, `asset_config.moodboard`, `asset_config.references`
- Tolerates malformed items (missing id, missing url, etc.)
- Strips unsafe URLs via `safePublicUrl`
- Deduplicates by `${label}|${url}`
- Never crashes on garbage input

**Test:** `"legacy moodboard references lift from multiple config sources"`

---

### 4. Orphaned Trace Model Fields

**File:** `lib/presence/studio-v2/model.ts`

**Change:** Removed `eventBeacon` and `portal` sub-objects from `StudioV2TraceConfig`.

**Rationale:** The adapters never loaded or saved these fields. Keeping them in the model created false confidence that traces were fully implemented. They can be re-added when the feature is actually wired.

---

### 5. Typed Fallback Factory

**File:** `lib/presence/studio-v2/adapters.ts`

**Change:** Replaced `fallbackNode(config): PresenceNode` with `createFallbackNode(config): PresenceNode`.

The old function returned an object with an `as PresenceNode` cast, which hid missing required fields. The new function constructs a valid `PresenceNode` object directly without any cast.

**Note:** The return type is still `PresenceNode` because TypeScript infers the object literal against the return type annotation. No broad `as` cast is needed because all required fields are present.

---

### 6. Hardened Legacy World Mapping

**File:** `lib/presence/studio-v2/adapters.ts`

**Change:** `worldIdFromLegacy` now has an explicit `room_type` → V2 world ID map before the substring heuristic:

| `room_type` | V2 world |
|-------------|----------|
| `artist_studio` | `gallery` |
| `practitioner` | `healing` |
| `performer_music` | `dj` |
| `organisation` | `archive` |
| `minimal_card` | `consultant` |

Substring matching on `renderer_key` / `display_mode` remains as fallback.

**Test:** `"legacy world mapping uses explicit room_type first, then substring fallback"`

---

## Commands Run & Results

```bash
cd /c/Dev/Flora_fauna/presence-app
npm run typecheck       # ✅ clean
npm run build           # ✅ clean
npx tsx --test lib/presence/studio-v2/studioV2Adapters.test.ts lib/presence/render/publicPayload.test.ts
# ✅ 16/16 pass (13 adapter + 3 public payload)
```

---

## Risks Closed

| Risk | Status | How closed |
|------|--------|------------|
| Pilot flag enables all rooms in production | ✅ Closed | `NODE_ENV === "production"` guard rejects empty pilot list |
| No sanitizer direct tests | ✅ Closed | `sanitizeStudioV2PublicPayload` recursive strip test added |
| No clamp boundary tests | ✅ Closed | `normalizeTransform` boundary test for all 5 dimensions added |
| No URL safety tests | ✅ Closed | `safePublicUrl` and `safeAssetPath` rejection tests added |
| No malformed-config recovery tests | ✅ Closed | Missing objectState, garbage sections, wrong-type values tested |
| Legacy moodboard data dropped | ✅ Closed | `legacyMoodboardRefsFromConfig` lifts from 4 legacy sources |
| Orphaned trace types | ✅ Closed | Removed from model until implemented |
| `fallbackNode` cast | ✅ Closed | Replaced with typed `createFallbackNode` |
| `worldIdFromLegacy` fragile heuristic | ✅ Closed | Explicit `room_type` map added before substring fallback |

---

## Risks Remaining

| Risk | Severity | Mitigation |
|------|----------|------------|
| V2 editor shell not mounted | **P0** | Phase B — minimal editor shell |
| V2 public renderer not dispatched | **P0** | Phase D — renderer dispatch |
| `moodboardRefs` lack per-reference visibility flags | **P1** | Add `visibility` field before first pilot with moodboard content |
| Backend `_public_redact` needs V2-specific tests | **P1** | Backend test pass before hosted rollout |
| Hosted smoke deferred | **P1** | Run after editor + renderer mounted |

---

## Is Phase B Minimal Editor Mount Now Safe?

**Yes — with conditions:**

1. ✅ Adapter hardening is complete.
2. ✅ All tests pass.
3. ✅ Typecheck and build are clean.
4. ✅ Production pilot gating is closed.
5. ✅ Public payload sanitization is layered and tested.

**Recommended next pass:** Create a minimal `PresenceStudioV2Editor.tsx` that loads V2 state, edits a single field (e.g. title), and saves via `patchPresenceEditorDraft`. Branch in `app/(studio)/studio/[id]/editor/page.tsx` behind the feature flag, preserving the existing editor for non-V2 rooms.
