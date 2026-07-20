# Presence Studio V2 — S2 Hosted Verification Report

**Date:** 2026-06-06
**Room:** 11 (`ggm-christina-goddard`)
**Frontend:** `https://your-presence.vercel.app`
**Backend:** `https://anu-back-end.vercel.app`
**Branch:** `feature/presence-ecosystem-alpha`
**S2 product commit:** `a7cb6d6`

---

## Summary

**PASS.** All S2 hosted verification stages completed successfully. Direct manipulation (drag, resize, rotate), persistence, preview/public hygiene, and cleanup all verified against the live deployed Room 11.

| Stage | Check | Result |
|-------|-------|--------|
| 1 — Cockpit read-only | Editor chrome, outline, inspector | ✅ |
| 2 — Direct manipulation | Drag, resize, rotate in Wild mode | ✅ |
| 2 — Guided mode | Drag disabled, handles locked | ✅ |
| 3 — Persistence | Save → reload → values match | ✅ |
| 4 — Preview hygiene | No editor chrome, no restricted terms | ✅ |
| 4 — Public hygiene | Desktop + mobile render, no leaks | ✅ |
| 5 — Lifecycle smoke | Full owner edit/save/preview/publish | ✅ |
| 6 — Payload scan | No config/editor terms in public HTML | ✅ |
| 7 — Cleanup | Reset transform → save → verified | ✅ |

---

## Stage 1: Cockpit Read-Only Verification

**Method:** Owner sign-in → open Room 11 editor → select first object → inspect chrome.

**Observations:**
- Three-pane cockpit renders correctly (outline rail, stage, inspector).
- Selection frame appears around selected object.
- 4 resize handles + 1 rotate handle visible.
- Floating toolbar (Clear/Edit/Duplicate/Visibility/Layer/Pin/Lock/Delete) present.
- Motion tab in inspector accessible and contains transform inputs.
- Wild/Guided mode toggle functional.

**Evidence:** `hosted-s2-guided-mode.png`, `hosted-s2-wild-drag.png`

---

## Stage 2: Direct Manipulation

### Guided Mode (Layout Protection)

**Test:** Select object → verify in Guided mode → attempt drag.

**Result:** ✅ Drag has no effect. Transform inputs stay at X=0, Y=0. Resize/rotate handles have `aria-disabled="true"`. No drag readout appears.

**Evidence:** `hosted-s2-guided-mode.png`

### Wild Mode — Drag

**Test:** Switch to Wild → drag object ~84px right, 42px down.

**Result:** ✅ Object moves. Inspector updates: X=276, Y=313. Drag readout shows "DRAG X 276 / Y 313 / 100% / 13 deg".

**Evidence:** `hosted-s2-wild-drag.png`

### Wild Mode — Resize

**Test:** Drag SE resize handle ~58px diagonally outward.

**Result:** ✅ Object scales. Inspector updates: Scale=1.27. Readout shows "RESIZE X 276 / Y 313 / 127% / 13 deg".

**Evidence:** `hosted-s2-resize.png`

### Wild Mode — Rotate

**Test:** Drag rotate handle in arc.

**Result:** ✅ Object rotates. Inspector updates: Rotation=31°. Readout shows "ROTATE X 276 / Y 313 / 127% / 31 deg".

**Evidence:** `hosted-s2-rotate.png`

---

## Stage 3: Save / Reload Persistence

**Test:** Save draft → wait for saved confirmation → reload page → reselect object → verify Motion tab values.

**Result:** ✅ All four transform values persisted exactly:
- X: 276
- Y: 313
- Scale: 1.27
- Rotation: 31

**Evidence:** `hosted-s2-after-reload.png`

---

## Stage 4: Preview & Public Hygiene

### Owner Preview

**Test:** Navigate to `/studio/11/editor/preview`.

**Result:** ✅ Renders with draft preview banner. No selection frame, resize handles, rotate handle, or drag readout. No restricted config terms in HTML source.

**Evidence:** `hosted-s2-preview.png`

### Public Route

**Test:** Anonymous browser context → `/p/ggm-christina-goddard`.

**Result:** ✅ Desktop: clean render, no editor chrome. Mobile (390×844): clean render. No restricted terms in HTML.

**Evidence:** `hosted-s2-public.png`

### Legacy Room Negative Check

**Test:** `/p/presence-controlled-launch-smoke-room`.

**Result:** ✅ No V2 public renderer present (uses legacy V1).

---

## Stage 5: Full Lifecycle Smoke

**Method:** Run existing `presence-studio-v2-hosted-lifecycle.spec.ts`.

**Result:** ✅ Passed (36.7s). Owner edits, adds objects, saves, previews, publishes, public renders, cleans up.

---

## Stage 6: Payload Hygiene Scan

**Restricted terms checked (preview + public HTML):**

```
style_dna, scene_config, motion_config, asset_config, content_config,
roomkey_config, enquiry_config, editable_config, hiddenPublic, hiddenMobile,
WILD TRANSFORM SUSPENDED, localStorage, TemplateKit,
presence-studio-v2-toolbar, presence-studio-v2-panel,
presence-studio-v2-selection-frame, presence-studio-v2-resize-handle,
presence-studio-v2-rotate-handle, presence-studio-v2-drag-readout
```

**Result:** ✅ None found in either preview or public HTML.

---

## Stage 7: Cleanup / Restoration

**Test:** Reset transform to X=0, Y=0, Scale=1, Rotation=0 → save → reload → verify.

**Result:** ✅ All values reset and persisted. Object returns to original position.

**Evidence:** `hosted-s2-after-cleanup.png`

---

## Issues Encountered

| Issue | Severity | Status |
|-------|----------|--------|
| Initial audit script used `dragTo` (HTML5 DnD) instead of raw mouse events | Test-only | Fixed — re-ran with `mouse.move/down/move/up` |
| Transform inputs not found in initial audit (Motion tab not clicked) | Test-only | Fixed — explicit tab click added |
| PostCSS moderate vulnerability in next@16.2.7 | P2 | Deferred — monitor next patch release |

No product defects found.

---

## Evidence Files

```
docs/program/evidence/presence-studio-v2-studio-recovery-s2-hosted/
├── hosted-s2-guided-mode.png      — Guided mode, drag disabled
├── hosted-s2-wild-drag.png        — Wild mode drag active
├── hosted-s2-resize.png           — Resize handle active
├── hosted-s2-rotate.png           — Rotate handle active
├── hosted-s2-after-reload.png     — Persistence verified
├── hosted-s2-preview.png          — Owner preview hygiene
├── hosted-s2-public.png           — Public route hygiene
└── hosted-s2-after-cleanup.png    — Cleanup verified
```

---

## Sign-Off

**S2 Hosted Verification: PASS**

All direct manipulation features work correctly on the live deployed environment. Preview and public surfaces are clean. Persistence is reliable. Cleanup restores original state. Ready for release baseline lock.

---

*Report generated by automated S2 hosted audit. Credentials used for this session only, not persisted.*
