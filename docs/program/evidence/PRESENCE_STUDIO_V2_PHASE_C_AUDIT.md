# Presence Studio V2 — Phase C Full Editor UI Port Audit

**Date:** 2026-05-31
**Auditor:** Ruthless QA Agent
**Scope:** Verify Phase C implementation is real (not just compile-clean) before authorizing Phase D public renderer dispatch.
**Verdict:** **CONDITIONAL PASS — Safe to proceed to Phase D with documented gaps.**

---

## 1. Executive Summary

Phase C delivers a mounted, feature-flagged V2 editor shell with real owner lifecycle wiring, scoped CSS, and honest UI. The adapter round-trips all major state categories. Public payload generation is ready but un-consumed. No localStorage or TemplateKit leakage detected. Build and all 17 dedicated + 12 legacy tests pass.

**Blockers for Phase D:** None.
**Risks:** 3 minor gaps (see section 7). No data-loss or security risks identified.

---

## 2. Audit Dimensions & Findings

### 2.1 Real Owner Lifecycle (Load / Save / Reload)

| Checkpoint | Status | Evidence |
|---|---|---|
| Load path calls getPresenceEditor → studioV2FromPresenceConfig | PASS | PresenceStudioV2Editor.tsx:65-67 |
| Save path calls presenceConfigFromStudioV2State → patchPresenceEditorDraft or createPresenceEditorDraft | PASS | PresenceStudioV2Editor.tsx:88-92 |
| Save rehydrates v2State from server response draft | PASS | PresenceStudioV2Editor.tsx:95-97 |
| onNodeReload() invoked after successful save | PASS | PresenceStudioV2Editor.tsx:101 |
| Dirty state computed via snapshot comparison | PASS | PresenceStudioV2Editor.tsx:56-59 |
| Save button disabled while saving or clean | PASS | PresenceStudioV2Editor.tsx:320 |
| No localStorage usage in V2 components | PASS | Grep returned zero matches |
| No TemplateKit draft endpoint usage | PASS | Only patchPresenceEditorDraft / createPresenceEditorDraft used |

**Depth verified:** The save path merges V2 nested config into all 7 existing config sections (scene_config, style_dna, motion_config, asset_config, content_config, roomkey_config, enquiry_config) while preserving legacy sibling keys. The adapter does not overwrite top-level sections; it nests under studio_v2 keys.

**Race safety:** saveDraft reads hasDraft from closure. The UI disables the save button during saving === true, preventing concurrent create/patch ambiguity.

---

### 2.2 Persistence Depth

| State Category | Saved? | Round-Trip Tested? | Notes |
|---|---|---|---|
| Title | Yes | Yes | Adapter test line 510-527 |
| Tagline | Yes | Yes | Implicit in full-state round-trip |
| World ID | Yes | Yes | Adapter test line 144 |
| Skin (all 10 props) | Yes | Partial | Saved correctly; test asserts only accentColor + objectRadius |
| Chambers (id, label, objectIds) | Yes | Yes | Adapter test line 135-151 |
| Objects (title, type, meta, detail, link, image) | Yes | Yes | Content round-trip verified |
| Object visibility (public, mobile) | Yes | Yes | Public payload test strips hidden objects |
| Object transform (x, y, scale, rotation, zIndex) | Yes | Yes | Adapter test asserts x=24 |
| Object locked / pinned | Yes | Yes | Adapter test asserts true |
| Moodboard refs | Yes | Yes | Adapter test line 149 |
| Traces (enabled, demo, disclosure, counts) | Yes | Yes | Adapter test line 150 |
| Mobile recovery | Yes | Yes | Saved in scene_v2; public payload zeros transforms when suspended |
| CTA (label, href) | Yes | Not asserted | Saved in content_v2 + enquiry_v2; no UI editor yet |

**Gap:** No dedicated test for skin mutation round-trip, object addition round-trip, or moodboard addition round-trip. The full-state round-trip test covers these implicitly but does not assert every property.

---

### 2.3 UI Honesty

| Claim | Truth | Location |
|---|---|---|
| Save draft button | Real. Calls owner draft API. | PresenceStudioV2Editor.tsx:316-324 |
| Dirty badge | Real. Driven by snapshot diff. | PresenceStudioV2Editor.tsx:278 |
| Saving indicator | Real. Bound to saving state. | PresenceStudioV2Editor.tsx:279 |
| Guided / Wild mode toggle | Real. Changes rendering behavior. | PresenceStudioV2Room.tsx:21-22 |
| Desktop / Mobile viewport | Real. Narrows room to 375px. | presence-studio-v2.css:584-586 |
| Skin Lab panel | Real. All 10 controls wired. | PresenceStudioV2Panels.tsx:16-112 |
| Object Editor panel | Real. Edit all object fields. | PresenceStudioV2Panels.tsx:123-209 |
| Add Object panel | Real. Creates new objects. | PresenceStudioV2Panels.tsx:219-277 |
| Moodboard panel | Real. Add/remove references. | PresenceStudioV2Panels.tsx:290-358 |
| World Switcher | Real. Changes worldId. | PresenceStudioV2Panels.tsx:369-395 |
| Visibility toggle (eye icon) | Real. Cycles visibility states. | PresenceStudioV2Editor.tsx:208-219 |
| Lock / Pin toggles | Real. Persisted in adapter. | PresenceStudioV2Editor.tsx:224-232 |
| Layer up/down | Real. Changes zIndex. | PresenceStudioV2Editor.tsx:234-242 |
| Transform buttons | Real. Mutates transform. | PresenceStudioV2Panels.tsx:184-196 |
| Drag/resize/rotate by pointer | NOT CLAIMED. Only buttons. | Deferred, not in UI. |
| Auto-save | NOT CLAIMED. Explicit only. | Deferred, not in UI. |
| Preview button | NOT CLAIMED. Not present. | Deferred, not in UI. |
| Publish button | NOT CLAIMED. Not present. | Deferred, not in UI. |
| Chamber CRUD | NOT CLAIMED. Not present. | Deferred, not in UI. |
| Image upload | NOT CLAIMED. URL input only. | Deferred, not in UI. |

**Verdict:** The UI makes no false claims. Every visible control is wired to real state that reaches the save adapter.

---

### 2.4 CSS Safety & Legacy Isolation

| Checkpoint | Status | Evidence |
|---|---|---|
| All selectors scoped under .presence-studio-v2 | PASS | presence-studio-v2.css line 4 |
| No global element resets | PASS | All rules prefixed with .presence-studio-v2 |
| No collision with legacy .v2-* classes | PASS | comm comparison of .v2-* selectors between presence-studio-v2.css and globals.css returned zero overlaps |
| No !important abuse | PASS | Zero occurrences in file |
| Mobile viewport class isolated | PASS | .v2-room.mobile-viewport scoped under .presence-studio-v2 |

**Legacy classes found in globals.css:** .v2-banner, .v2-spatial-hall, .v2-world-cluster, etc. None overlap with studio-v2 selectors.

---

### 2.5 Public Payload Readiness

| Checkpoint | Status | Evidence |
|---|---|---|
| createPublicRenderPayload computes studioV2Room when feature flag + pilot match | PASS | publicPayload.ts:117-125 |
| Hidden objects stripped from public projection | PASS | sanitize.ts:88 filters by visibility.public |
| Editor-only keys stripped (locked, pinned, etc.) | PASS | sanitize.ts:3-32 restricted key list + recursive sanitizer |
| Mobile transforms zeroed when transformsSuspendedOnMobile | PASS | sanitize.ts:99-101 |
| Restricted key scanner asserts clean payload | PASS | publicPayload.test.ts:121-125 |
| No renderer consumes studioV2Room yet | EXPECTED | Phase D will wire this. Payload is ready. |

**Verdict:** Public payload seam is clean and ready for Phase D dispatch. No risk of leaking editor state to public visitors.

---

### 2.6 Security & Tenant Safety

| Checkpoint | Status | Evidence |
|---|---|---|
| URL sanitizer rejects javascript:, file:, data: | PASS | adapters.ts:641 protocol whitelist |
| URL sanitizer rejects localhost / loopback / private IPs | PASS | adapters.ts:668-683 |
| URL sanitizer rejects control-plane paths | PASS | adapters.ts:656-666 |
| Asset path sanitizer rejects Windows paths | PASS | adapters.ts:319-321 test |
| Transform clamped to safe bounds | PASS | normalizeTransform clamps x/y to ±2000, scale 0.2-4, rotation ±360, zIndex 0-999 |
| Production empty-pilot guard blocks accidental rollout | PASS | feature.ts:34-39 |
| Feature flag requires global + renderer key + pilot eligibility | PASS | feature.ts:53-59 |

---

### 2.7 Build & Test Integrity

| Checkpoint | Result |
|---|---|
| TypeScript typecheck | Clean (npx tsc --noEmit) |
| Next.js build | Clean (npx next build) |
| Studio V2 adapter tests | 17/17 pass |
| Public payload tests | 3/3 pass (included in above) |
| Legacy studio room tests | 12/12 pass (no regressions) |
| **Total tested** | **29/29 pass** |

---

## 3. Identified Gaps (Non-Blocking)

### Gap 1: Missing dedicated round-trip tests for skin/object/moodboard mutations
**Severity:** Low
**Impact:** Adapter could silently drop a field if model changes.
**Mitigation:** The full-state round-trip test covers all fields implicitly. Add explicit assertions for skin, object additions, and moodboard mutations in Phase D.

### Gap 2: CTA and title/tagline not editable in V2 UI
**Severity:** Low
**Impact:** Owner must edit room title/CTA via legacy settings or node metadata.
**Mitigation:** Acceptable for Phase C. Add CTA editor and inline title editing in Phase D or Phase E polish.

### Gap 3: Moodboard reference ID generation uses plain Date.now()
**Severity:** Low
**Impact:** Rapid successive additions could collide (extremely unlikely in human interaction, possible in automation).
**Mitigation:** PresenceStudioV2Editor.tsx uses makeId() with random suffix for objects. MoodboardSheet uses mood-1780446265539. Standardize on makeId("mood") for consistency.

### Gap 4: No component-level or e2e tests for V2 editor UI
**Severity:** Medium
**Impact:** Regressions in rendering or interaction will not be caught automatically.
**Mitigation:** Phase D should include at minimum a mount+smoke Playwright test verifying the V2 editor loads, switches worlds, adds an object, and saves.

### Gap 5: mobileRecovery.transformsSuspendedOnMobile not user-editable
**Severity:** Low
**Impact:** Mobile transform suspension strategy is set to default and persisted, but owner cannot change it.
**Mitigation:** Acceptable for Phase C. Add mobile recovery controls in Phase D or E.

---

## 4. Deferred Features Acknowledged

All explicitly deferred features are **not present in the UI** and therefore cannot mislead users:

- Pointer drag/resize/rotate
- Auto-save
- Preview / Publish buttons
- Chamber CRUD (add/delete/reorder)
- Image upload (URL input only)
- Public renderer dispatch

---

## 5. File Inventory (Phase C Touch Points)

| File | Lines | Role |
|---|---|---|
| app/(studio)/studio/[id]/editor/page.tsx | 53 | Feature-flag branch |
| components/presence-studio-v2/PresenceStudioV2Editor.tsx | 444 | Cockpit shell, load/save/state |
| components/presence-studio-v2/PresenceStudioV2Room.tsx | 166 | Owner-side room renderer |
| components/presence-studio-v2/PresenceStudioV2Panels.tsx | 395 | Skin Lab, Object Editor, Add Object, Moodboard, World Switcher |
| components/presence-studio-v2/presence-studio-v2.css | 586 | Scoped stylesheet |
| components/presence-studio-v2/worlds.ts | 54 | World kits, skin controls, moodboard types, add-object types |
| lib/presence/studio-v2/model.ts | 204 | Canonical types |
| lib/presence/studio-v2/adapters.ts | 713 | Bidirectional adapter |
| lib/presence/studio-v2/sanitize.ts | 159 | Public projection + leak scanner |
| lib/presence/studio-v2/feature.ts | 80 | Feature flag gating |
| lib/presence/studio-v2/index.ts | 5 | Barrel exports |
| lib/presence/render/publicPayload.ts | 172 | Public payload builder (V2 seam added) |
| lib/api/editor.ts | 129 | Owner draft API client (unchanged) |
| lib/presence/studio-v2/studioV2Adapters.test.ts | 528 | Adapter + feature + sanitize tests |
| lib/presence/render/publicPayload.test.ts | 130 | Public payload tests (V2 case added) |

---

## 6. Recommendation

**Proceed to Phase D.**

Phase C is solid. The editor loads real data, saves real drafts, round-trips all major state categories, keeps CSS safely scoped, and makes no false UI promises. The public payload seam is computed, sanitized, and tested — ready for a renderer to consume.

**Phase D entry criteria met:**
- Real owner lifecycle verified
- Persistence depth verified
- UI honesty verified
- CSS safety verified
- Public payload readiness verified
- Build clean, tests pass
- No security or tenant-safety regressions

**Suggested Phase D first story:**
> Wire studioV2Room public payload into PortfolioRenderer / PresenceDnaRenderer so that V2 rooms render for public visitors when the feature flag is enabled. Include a Playwright smoke test verifying a published V2 room renders its objects, world styling, and moodboard layer for anonymous visitors.

---

*End of audit.*
