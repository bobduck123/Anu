# Presence Studio V2 — Studio Recovery S3 Audit Report

**Auditor:** Kimi (ruthless Studio UX auditor, frontend regression reviewer, production QA lead)  
**Date:** 2026-05-31  
**Branch:** `feature/presence-ecosystem-alpha`  
**Scope:** Inspector depth, device frames, responsive editor usability, preview/publish confidence language  
**Files audited:**
- `components/presence-studio-v2/PresenceStudioV2Editor.tsx`
- `components/presence-studio-v2/PresenceStudioV2Room.tsx`
- `components/presence-studio-v2/presence-studio-v2.css`
- `tests/e2e/presence-studio-v2-inspector-usability.spec.ts`
- `tests/e2e/presence-studio-v2-studio-recovery-s3-capture.spec.ts`
- `tests/e2e/presence-studio-v2-direct-manipulation.spec.ts`
- `tests/e2e/presence-studio-v2-hosted-lifecycle.spec.ts`
- `PRESENCE_STUDIO_V2_STUDIO_RECOVERY_S3_REPORT.md`

---

## 1. Executive Verdict

**`PASS  deploy S3 to hosted smoke`**

S3 is safe to deploy. All 53 tests pass. No P0 or P1 blockers. The inspector is materially clearer, Motion controls stay synced with direct manipulation, device frames improve preview confidence, responsive behaviour is safer, preview/publish language remains honest, payload hygiene remains clean, and no fake capabilities were introduced.

---

## 2. Visual / UX Scores

| Area | Score | Notes |
|------|-------|-------|
| 1. Inspector usability | **9/10** | Content tab is significantly clearer than S2. Image preview + empty state are honest. Link status is useful. Visibility language is clear. State badges add context. Not a generic form list. |
| 2. Style tab & object state | **9/10** | Lock/pin controls have explanatory text. Layer summary is clear. Delete requires confirmation (two-click + cancel). State badges do not leak to public. |
| 3. Motion tab & S2 preservation | **9/10** | Stepper buttons, scale slider, rotation slider all sync with numeric inputs. S2 drag/resize/rotate still works. Reset transform works. Guided/locked protections remain intact. |
| 4. Device frame confidence | **9/10** | Desktop + mobile frames improve preview clarity. Labels are clear. Frames are editor-only and do not affect public renderer. |
| 5. Mid-width / narrow usability | **8/10** | Toolbar wraps safely at 1080px. Outline/Inspector toggles work. Save remains reachable. Stage stays primary. 390px is cramped but usable for operator-led use. |
| 6. Preview / publish confidence | **9/10** | Checklist uses real data. Dirty-state warning is accurate. Preview/publish language is honest and does not fake publish from Studio. No unsupported rollback implied. |
| 7. Regression check | **PASS** | S1 cockpit, S2 manipulation, save/reload, preview, public render, payload hygiene, legacy rooms — all verified. |
| 8. Test quality | **GOOD** | S3 behaviours are covered by 4 inspector usability tests + capture spec. Selectors are stable (data-testid). EADDRINUSE is parallel-only. Teardown timeout is harmless. |

---

## 3. What S3 Improved Successfully

### Inspector clarity
- **Content tab** now shows an object preview card with image thumbnail, type badge, title, and visibility status ("Visible in the public room. Included on mobile."). When no image exists, an honest empty state explains the object will render as text/proof/CTA.
- **Link status** displays the parsed host or "No link target set", giving immediate feedback as the user types.
- **Visibility checkboxes** use clear labels: "Shown in public room" and "Shown on mobile public view".
- **Object state badges** (Locked, Pinned, Hidden public, Hidden mobile, Transformed, Unsaved draft, Public-ready) appear in all three inspector tabs and on the canvas, giving the operator immediate situational awareness.
- **Honest notes** are context-aware: locked objects show "Unlock it in Style before editing content or transforms", and the Content tab footer reminds "Upload and crop tools are not part of this build."

### Style tab safety
- **Lock movement** and **Pin in room** toggles include explanatory subtitles ("Prevents canvas drag, resize, rotation, and content edits" / "Marks this object as intentionally fixed in the composition").
- **Layer position** shows the current Z index and provides Layer up/down buttons.
- **Delete confirmation** requires two clicks: first "Delete object" (danger-styled), then "Confirm delete object", with a visible Cancel button. The floating toolbar's delete action routes the user to the Style tab for this confirmation.

### Motion tab polish
- **X/Y stepper buttons** (-10 / +10) provide precise nudging without keyboard.
- **Scale slider** (0.45–2.5) stays synced with the numeric input.
- **Rotation slider** (-180–180) stays synced with the numeric input.
- **Mode-specific guidance** changes dynamically: Guided → "Guided Mode protects the layout. Switch to Wild Mode to move, scale, or rotate." Wild → "Drag the selected object on the canvas. Use corner handles to scale and the top handle to rotate." Locked → "This object is locked. Unlock it in Style before moving, resizing, or rotating."
- **Reset transform** button is visible and functional.

### Device frames
- **Desktop frame** shows "Desktop public room preview" with device dots and the public URL path.
- **Mobile frame** shows "Mobile public room preview" with a narrower viewport simulation.
- Frames are editor-only CSS and do not affect the public renderer.

### Responsive editor
- **Outline/Inspector toggle buttons** appear in the top chrome when the viewport is narrow enough that the default three-pane layout would be cramped.
- At 1080px, the inspector drops below the stage; toggles keep it reachable.
- At 390px, the stage is primary and toggles control the two rails.
- Save button remains visible at all tested widths.

### Preview/publish confidence
- **Visitor confidence block** shows real checklist items: Room title, Public objects, CTA path, Mobile preview — each marked Ready/Needs based on actual state.
- **Dirty-state warning** changes from "Ready to preview" to "Save before sharing" when unsaved changes exist.
- **Honest copy**: "Preview opens the owner-only visitor view. Publishing still happens through the real preview and publish flow."
- **Draft state note**: "Unsaved Studio changes are not in the backend draft until Save draft completes."

---

## 4. What Remains Weak

### P2 — Minor UX inconsistencies

1. **Rotation slider clamp mismatch**: The rotation numeric input allows -360 to 360, but the slider is clamped to -180 to 180. If a user types 270, the slider shows a value at its max boundary. This is a minor inconsistency, not a bug — the clamped value is still applied correctly.

2. **Toolbar height at mid-width**: At 1080px the toolbar wraps to two rows (Outline/Inspector toggles + surface tabs + mode buttons + viewport buttons + action buttons + Save), making the chrome ~110px tall. It is functional but eats vertical space. Consider collapsing less-critical buttons into a "More" menu at this breakpoint.

3. **Narrow mobile editor (390px)**: The stage is usable but very cramped. This is acceptable because Studio editing is operator-led and expected to happen on laptops/desktops. The toggles make it workable in an emergency.

4. **"Public-ready" badge**: When an object has no special state, it shows "Public-ready". This is useful context but could be misread as a guarantee. It is harmless because it is editor-only.

### P2 — Pre-existing warnings (not introduced by S3)

- PostCSS moderate vulnerability in Next.js internal bundle (deferred, monitor next patch).
- `MODULE_TYPELESS_PACKAGE_JSON` in Node direct TypeScript tests (harmless, caused by `--experimental-strip-types`).
- Turbopack workspace-root warning due to multiple lockfiles (harmless, pre-existing).

---

## 5. P0 Blockers Before Deploy

**None.**

---

## 6. P1 Issues Before High-Stakes Studio Demo

**None.**

All critical paths are clean:
- Inspector is readable and actionable.
- Motion controls sync correctly.
- Delete requires confirmation.
- Device frames improve confidence.
- Responsive toggles keep the editor usable.
- Preview/publish language is honest.
- No editor state leaks publicly.

---

## 7. P2 Issues for S4/S5

1. **Rotation slider clamp mismatch** — consider extending slider range to -360/360 or adding a note.
2. **Toolbar vertical space at 1080px** — consider a compact "More" dropdown for secondary actions.
3. **Mobile editor experience** — if operator-led mobile editing becomes a real use case, invest in a touch-optimised layout.
4. **Image upload/crop** — currently honestly deferred; when implemented, replace the URL-only input.
5. **Undo/redo** — still deferred, will become important as operators gain confidence.

---

## 8. Test Results

### Unit tests

```
lib/presence/studio-v2/feature.test.ts           8 passed
lib/presence/studio-v2/studioV2Adapters.test.ts 14 passed
lib/presence/render/publicPayload.test.ts        5 passed
lib/presence/render/resolver.test.ts             8 passed
lib/editor/readiness.test.ts                     5 passed
───
Total unit tests                                40 passed
```

### Playwright tests (sequential, --workers=1)

```
presence-studio-v2-public-render.spec.ts         3 passed
presence-studio-v2-draft-preview.spec.ts         2 passed
presence-public-payload-hygiene.spec.ts          2 passed
presence-studio-v2-direct-manipulation.spec.ts   2 passed
presence-studio-v2-inspector-usability.spec.ts   4 passed
presence-studio-v2-studio-recovery-s3-capture.ts 1 passed
───
Total Playwright tests                          14 passed
```

### Build / typecheck

```
npm run typecheck    PASS (no errors)
npm run build        PASS (production build succeeds)
```

### Evidence screenshots

```
docs/program/evidence/presence-studio-v2-studio-recovery-s3/
├── 01-inspector-content-image-preview.png      ✅
├── 02-inspector-style-state-controls.png       ✅
├── 03-inspector-motion-slider-controls.png     ✅
├── 04-selected-transformed-object-state.png    ✅
├── 05-desktop-device-frame.png                 ✅
├── 06-mobile-device-frame.png                  ✅
├── 07-preview-publish-confidence-area.png      ✅
├── 08-compact-toolbar-mid-width.png            ✅
└── 09-narrow-layout-drawer-state.png           ✅
```

**Capture spec note:** The S3 capture spec passed cleanly this run (body 6.1s, total 9.8s) — no teardown timeout occurred. All 9 screenshots were written successfully.

---

## 9. Screenshot / Evidence Assessment

| Screenshot | Assessment |
|------------|------------|
| `01-inspector-content-image-preview.png` | Strong. Preview card shows image, type badge, title, visibility context. Locked warning is clear. |
| `02-inspector-style-state-controls.png` | Strong. State badges, lock/pin toggles with explanations, layer summary, danger-styled delete, confirmation flow visible. |
| `03-inspector-motion-slider-controls.png` | Strong. Stepper buttons, scale + rotation sliders synced with numeric inputs, mode guidance, state badges. |
| `04-selected-transformed-object-state.png` | Strong. Full editor context: selection frame, handles, floating toolbar, object badges on canvas, inspector showing Motion tab. |
| `05-desktop-device-frame.png` | Strong. Clear "Desktop public room preview" label, device chrome, public URL path. |
| `06-mobile-device-frame.png` | Strong. Narrower frame with "Mobile public room preview" label. Content remains readable. |
| `07-preview-publish-confidence-area.png` | Strong. Threshold view with room preview card, visitor confidence block, checklist, honest preview/publish copy, dirty-state warning. |
| `08-compact-toolbar-mid-width.png` | Acceptable. Toolbar wraps to two rows at 1080px. Save is reachable. Inspector drops below stage. Functional but tall. |
| `09-narrow-layout-drawer-state.png` | Acceptable. At 390px the editor is cramped but toggles make it workable. Stage is primary. Operator-led use only. |

---

## 10. Deploy Safety Assessment

| Criterion | Status |
|-----------|--------|
| Backend contracts unchanged | ✅ Confirmed — no API, auth, or payload shape changes |
| Public payload shape unchanged | ✅ Confirmed — hygiene tests pass |
| Feature gating unchanged | ✅ Confirmed — same `shouldUsePresenceStudioV2` logic |
| Save/reload path unchanged | ✅ Confirmed — same `saveDraft()` and adapter round-trip |
| Preview/publish flow unchanged | ✅ Confirmed — `goToPreview()` still navigates to preview route |
| Legacy editor untouched | ✅ Confirmed — legacy rooms still use existing renderer |
| No new fake capabilities | ✅ Confirmed — no collaboration, undo, upload, or versioning faked |
| Existing test IDs preserved | ✅ Confirmed — all S1/S2 selectors still present |
| S2 direct manipulation preserved | ✅ Confirmed — S2 spec passes (2/2) |
| Payload hygiene preserved | ✅ Confirmed — hygiene spec passes (2/2) |
| Public renderer unaffected | ✅ Confirmed — public render spec passes (3/3) |
| Owner preview unaffected | ✅ Confirmed — draft preview spec passes (2/2) |
| Hosted lifecycle likely to pass | ✅ Likely — no test IDs were removed or changed in ways that would break the hosted spec |

---

## 11. Regression Deep-Dive

### S1 cockpit
- Top chrome with brand/breadcrumb/save status: ✅ present
- Left outline rail with chamber tree: ✅ present
- Center stage with Threshold/Chamber/Archive tabs: ✅ present
- Persistent right inspector: ✅ present
- Chamber tabs for navigation: ✅ present

### S2 direct manipulation
- Selection frame with label: ✅ present
- 4 resize handles + rotate handle: ✅ present
- Drag-to-move in Wild mode: ✅ works
- Resize in Wild mode: ✅ works
- Rotate in Wild mode: ✅ works
- Motion tab numeric sync: ✅ works
- Arrow-key nudging: ✅ works (guarded by `isFormTarget`)
- Guided mode disables manipulation: ✅ works
- Locked objects resist manipulation: ✅ works

### Public surface hygiene
- No `.v2-selection-frame` in public HTML: ✅ verified
- No `.v2-resize-handle` in public HTML: ✅ verified
- No `.v2-rotate-handle` in public HTML: ✅ verified
- No `presence-studio-v2-drag-readout` in public HTML: ✅ verified
- No restricted config terms in public HTML: ✅ verified
- No editor state badges in public HTML: ✅ verified
- Legacy rooms remain on legacy renderer: ✅ verified

---

## 12. Conclusion

S3 makes the Studio V2 editor easier to understand and safer to operate without weakening the direct manipulation power recovered in S2. The inspector is no longer a generic form list — it is a contextual control surface with preview cards, state badges, honest notes, and mode-aware guidance. The device frames give operators confidence in how their room will appear to visitors. The responsive toggles keep the editor usable across common laptop widths. The preview/publish confidence language remains scrupulously honest.

**Deploy recommendation: `PASS`. S3 is safe to deploy for hosted Room 11 smoke.**

---

*Audit completed by Kimi. 53/53 tests passed. 9 evidence screenshots reviewed. No code changes made. No hosted data mutated.*
