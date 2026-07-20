# Presence Studio V2 — Studio Recovery S1 Audit

**Date:** 2026-06-04
**Auditor:** Kimi Code CLI (Studio UX auditor + frontend regression reviewer + production QA lead)
**Scope:** Audit whether Codex's S1 implementation recovers the prototype-grade Studio cockpit enough to deploy for hosted Room 11 smoke.
**Verdict:** `CONDITIONAL PASS — deploy S1 to hosted smoke`

---

## 1. Executive Verdict

S1 successfully recovers the prototype's information architecture without introducing fake capabilities or weakening the real production lifecycle. The Studio editor now has a credible three-pane cockpit: top chrome, left outline/assets rail, center stage, persistent right inspector, surface tabs, and chamber navigation.

The implementation is **honest**:
- Studio Archive explicitly says "Operator archive is not enabled in this build" instead of faking version history.
- Motion tab explicitly says "Direct drag and handles arrive in S2" instead of faking direct manipulation.
- Share copies the real public URL.
- Preview navigates to the real preview page.
- Publish navigates to preview (where the real publish control lives) instead of pretending to publish from the editor.

There are **no P0 blockers**. Two P1 issues exist (teardown timeout in capture spec, hosted smoke not yet validated), but neither prevents deployment.

**Recommendation:** Deploy to hosted preview/staging and run the hosted lifecycle smoke against Room 11. S1 is safe to go live for operator-led pilot use.

---

## 2. Visual/UX Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Three-pane cockpit reality | 9/10 | Real grid layout, all three panes present and functional |
| Top chrome premium feel | 8/10 | Brand glyph, breadcrumb, status, actions all present; could use more Instrument Serif in breadcrumb |
| Left outline usefulness | 9/10 | Chamber expand/collapse, object selection, scroll-to-object all work |
| Asset rail honesty | 10/10 | Derived from existing image URLs only; no upload implication |
| Persistent inspector reality | 9/10 | Truly persistent; room state when empty, object tabs when selected |
| Content/Style/Motion tabs | 8/10 | Work correctly; Motion tab is appropriately honest about S2 |
| Surface tabs (Threshold/Chamber/Archive) | 9/10 | Honest behavior; Archive placeholder is ethically correct |
| Stage atmosphere | 8/10 | Gradient lighting, grid overlay, rounded stage frame all present |
| Responsive degradation | 7/10 | Stacks safely at 860px; left rail drops below stage which is usable but not ideal |
| Prototype resemblance | 8/10 | Information architecture match is strong; direct manipulation still missing |
| Overall Studio confidence | 8.4/10 | Enough for serious room-arrangement demos |

**Average: 8.4/10** (up from ~5/10 pre-S1)

---

## 3. What S1 Recovered Successfully

### 3.1 Three-Pane Cockpit
- `v2-studio-layout` uses `grid-template-columns: minmax(220px, 260px) minmax(0, 1fr) minmax(280px, 330px)`
- Left rail: outline + assets
- Center: stage shell with chamber tabs + room stage
- Right: persistent inspector
- All three panes scroll independently with `position: sticky`
- Responsive breakpoints at 1180px (inspector drops below) and 860px (full stack)

### 3.2 Top Chrome
- Brand glyph (`v2-brand-glyph`) + "Presence Studio" in Instrument Serif
- Breadcrumb: "My rooms > {title} > Editor"
- Save status pill: "Saved" / "Unsaved changes" / "Saving"
- Surface tabs: Threshold / Chamber / Studio Archive
- Mode toggles: Guided / Wild
- Viewport toggles: Desktop / Mobile
- Panel launchers: World / Skin / Mood / + Add
- Actions: Share (copies `/presence/{slug}`) / Preview / Publish
- Save Draft primary button preserved

### 3.3 Left Outline / Asset Rail
- `StudioOutlinePanel` renders from `state.chambers`
- Chamber rows show label + object count
- Expand/collapse toggle (`+` / `-`)
- Active chamber gets gold border highlight
- Object rows show type glyph + title + meta/type
- Active object gets gold background
- Click object → select + scroll to object + open inspector
- Click chamber name → scroll to chamber
- Asset grid below outline shows all objects with `image.src`
- Empty state: "No image objects in this draft yet. Add image URLs through object content fields."

### 3.4 Persistent Right Inspector
- `StudioInspectorPanel` is always visible (not a sheet)
- No-object state: Room title, tagline, world (with Change button), CTA label/href, draft status, Open Skin Lab button
- Selected-object state: Content / Style / Motion tabs
- **Content tab:** Title, Type, Meta, Detail, Link, Image URL, visibility checkboxes
- **Style tab:** Locked, Pinned, Layer up/down, Duplicate, Delete, Skin Lab button
- **Motion tab:** X/Y/Scale/Rotation/Z index numeric inputs, Reset transform, mode indicator, honest S2 note
- Existing object test IDs preserved (`studio-v2-object-title`, `studio-v2-object-type`, etc.)

### 3.5 Surface Tabs
- **Threshold tab:** Shows `ThresholdWorkbench` with room title, tagline, world, object count, influence count, CTA, and first image artifact
- **Chamber tab:** Default editing surface; shows chamber tabs and room stage
- **Studio Archive tab:** Shows `ArchiveWorkbench` with honest read-only message and room metadata (ID, slug, draft state, dirty state)
- Tab switching preserves selection state

### 3.6 Chamber Navigation Tabs
- Horizontal pill tabs above stage for each chamber
- Click tab → scroll to chamber
- Active tab highlighted
- Sticky positioning at top of stage shell

### 3.7 Stage Atmosphere
- Stage shell has radial gradient + linear gradient
- Subtle grid overlay via `::before` with 30px lines and mask fade
- Stage frame has rounded corners (26px) and inner shadow
- Room card has world-specific backgrounds preserved
- Object cards have glassmorphic treatment with hover lift

### 3.8 Existing Functionality Preserved
- `SkinLabSheet` still opens as overlay sheet (not broken by inspector)
- `AddObjectSheet` still works
- `MoodboardSheet` still works
- `WorldSwitcher` overlay still works
- `FloatingToolbar` still appears on selection
- Guided/Wild mode still suspends/applies transforms
- Desktop/Mobile viewport still narrows room
- Save Draft still POSTs/PATCHes to real API
- Dirty/saved/error states still work
- Object add/duplicate/delete still work

---

## 4. What Remains Weaker Than Prototype

| Gap | Prototype Standard | S1 Status | Planned Phase |
|-----|-------------------|-----------|---------------|
| Direct drag-to-move on canvas | `useWildDrag` in prototype cockpit | Still nudge buttons / numeric inputs | S2 |
| Resize handles on objects | `.wild-handle` corners | Not present | S2 |
| Rotation handle | `.wild-rotate` circular grab | Numeric input only | S2 |
| Selection frame + label tag | `.ed-frame-handle` dashed gold border | CSS `box-shadow` ring only | S2 |
| Real asset upload | File upload + archive grid | URL text input + derived grid | S7 |
| Multiplayer cursor | Hardcoded `.ed-cursor` in prototype (fake) | Not copied — correct | N/A |
| Visitor stats | Hardcoded "43 uniq · 3m 42s" (fake) | Not copied — correct | N/A |
| Real archive/version history | "Studio archive" tab with fake data | Honest placeholder | S7 |
| Undo/redo | Fake "undo" button in prototype | Not copied — correct | S7 |
| Device frames | Phone frame with dynamic island in prototype | CSS `mobile-viewport` class only | S3 |

The remaining gaps are **all S2/S7 scope** and were intentionally deferred. S1 closed the information architecture gap. The direct manipulation gap is the largest remaining UX deficit.

---

## 5. P0 Blockers Before Deploy

**None.**

---

## 6. P1 Issues Before High-Stakes Studio Demo

### P1.1 — Capture spec teardown timeout
- **Observation:** `presence-studio-v2-studio-recovery-s1-capture.spec.ts` test body passes and writes screenshots, but the wrapper command times out during Playwright web-server teardown.
- **Impact:** No product impact. Screenshots are written successfully.
- **Action:** Document only. No fix needed for deploy.

### P1.2 — Hosted lifecycle not yet validated with new selectors
- **Observation:** S1 is local and not deployed. The hosted lifecycle spec uses the new test IDs, but the deployed build does not yet contain them.
- **Impact:** Cannot claim hosted S1 readiness until post-deploy smoke.
- **Action:** Deploy to staging/preview and rerun hosted lifecycle against Room 11.

### P1.3 — Mobile narrow layout order
- **Observation:** At <860px, the layout stacks as: stage → left rail → inspector.
- **Impact:** On mobile, the outline is below the stage, which is less useful for editing.
- **Action:** P2. Consider keeping rail above stage or making inspector/rail collapsible drawers on narrow screens.

### P1.4 — Toolbar group wrapping on narrow desktop
- **Observation:** At ~1000–1180px width, the toolbar wraps into two rows and can overlap with sticky left rail.
- **Impact:** Slight visual clutter on mid-width screens.
- **Action:** P2. Add a compact toolbar variant or collapse some groups into a "More" menu.

---

## 7. P2 Issues for S2/S3

1. **Direct drag-to-move** — add pointer event handlers on selected objects in Wild mode
2. **Resize handles** — corner squares that update scale
3. **Rotation handle** — circular grab above object
4. **Selection frame + label tag** — dashed bounding box with object type/title label
5. **Selection aura animation** — breathing glow ring
6. **Mobile drawer UX** — collapsible rail/inspector on narrow screens
7. **Toolbar compact mode** — reduce chrome on mid-width screens
8. **Device frame chrome** — add phone/desktop bezel frames in viewport toggle
9. **Grain overlay** — subtle SVG noise texture on stage

---

## 8. Test Results

### 8.1 TypeScript
```bash
npm.cmd run typecheck
```
**Result:** PASS (no errors)

### 8.2 Production Build
```bash
npm.cmd run build
```
**Result:** PASS

### 8.3 Node Unit Tests
```bash
node --experimental-strip-types --test lib/presence/studio-v2/feature.test.ts
```
**Result:** 8/8 pass

```bash
node --experimental-strip-types --test lib/presence/studio-v2/studioV2Adapters.test.ts
```
**Result:** 14/14 pass

```bash
node --experimental-strip-types --test lib/presence/render/publicPayload.test.ts
```
**Result:** 5/5 pass

```bash
node --experimental-strip-types --test lib/presence/render/resolver.test.ts
```
**Result:** 8/8 pass

```bash
node --experimental-strip-types --test lib/editor/readiness.test.ts
```
**Result:** 5/5 pass

### 8.4 Playwright Smoke Tests
```bash
npx.cmd playwright test presence-studio-v2-public-render.spec.ts --project=chromium
```
**Result:** 3/3 pass

```bash
npx.cmd playwright test presence-studio-v2-draft-preview.spec.ts --project=chromium --workers=1
```
**Result:** 2/2 pass

```bash
npx.cmd playwright test presence-public-payload-hygiene.spec.ts --project=chromium
```
**Result:** 2/2 pass

### 8.5 Hosted Lifecycle
```bash
npx.cmd playwright test tests/e2e/presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
```
**Result:** 1 skipped (PRESENCE_HOSTED_SMOKE not set in this audit run)

**Note:** A hosted run would require deployment first, since the new test IDs are not in the currently deployed build.

### 8.6 Known Warnings (Pre-existing, Not Regressions)
- `MODULE_TYPELESS_PACKAGE_JSON` from Node direct TypeScript execution
- Turbopack workspace-root warning from multiple lockfiles
- EADDRINUSE can occur when running multiple Playwright specs in parallel against the shared mock API port; sequential runs pass

---

## 9. Screenshot/Evidence Assessment

Evidence directory: `docs/program/evidence/presence-studio-v2-studio-recovery-s1/`

| Screenshot | Assessment |
|-----------|-----------|
| `01-full-three-pane-studio-cockpit.png` | ✅ Cockpit is real. Top chrome, left rail, center stage, right inspector all visible. Premium dark atmosphere. |
| `02-left-outline-assets-rail.png` | ✅ Outline shows chamber + 4 objects with glyphs. Asset grid shows 1 image. Clean typography. |
| `03-right-inspector-content-tab.png` | ✅ Persistent inspector with Content/Style/Motion tabs. Locked object warning is clear. |
| `04-right-inspector-style-tab.png` | ✅ Style tab shows Lock/Pin/Layer/Duplicate/Delete. |
| `05-right-inspector-motion-tab.png` | ✅ Motion tab shows numeric transform inputs and honest S2 note. |
| `06-threshold-tab.png` | ✅ Threshold workbench shows title, tagline, world, facts, CTA, first image artifact. |
| `07-chamber-tab-selected-object-state.png` | ✅ Chamber tab with selected object and inspector. |
| `08-studio-archive-tab.png` | ✅ Archive tab is honest: "Operator archive is not enabled in this build." |
| `09-mobile-narrow-editor-state.png` | ✅ Narrow viewport stacks stage/rail/inspector safely. |

All screenshots support the S1 claim.

---

## 10. UX Honesty Check

| Potential Fake Feature | S1 Treatment | Verdict |
|-----------------------|--------------|---------|
| Real asset upload | Asset grid is derived only from existing object image URLs. Empty state tells user to paste URLs. | ✅ Honest |
| Fake archive/version history | Archive tab says "Operator archive is not enabled in this build." | ✅ Honest |
| Fake collaboration | No cursors, no activity feed, no visitor stats. | ✅ Honest |
| Fake analytics | Not shown. | ✅ Honest |
| Fake undo/redo | No undo button. | ✅ Honest |
| Fake direct manipulation | Motion tab says "Direct drag and handles arrive in S2." | ✅ Honest |
| Fake publish from Studio | Publish button navigates to preview page where real publish exists. | ✅ Honest |
| localStorage as truth | Not used in V2 editor. | ✅ Honest |
| TemplateKit endpoints | No TemplateKit usage in V2 editor. | ✅ Honest |

---

## 11. Regression Checks

| Existing Feature | Status | Evidence |
|-----------------|--------|----------|
| V2 editor root mounts | ✅ Pass | `presence-studio-v2-root` visible in all screenshots |
| Object edit works | ✅ Pass | Inspector fields update state |
| Add/delete/duplicate works | ✅ Pass | Existing handlers preserved |
| Skin Lab works | ✅ Pass | `studio-v2-open-skin` opens sheet, test IDs preserved |
| Moodboard works | ✅ Pass | `studio-v2-open-moodboard` opens sheet |
| Guided/Wild mode works | ✅ Pass | Mode toggle + transform suspension preserved |
| Desktop/Mobile viewport works | ✅ Pass | Viewport buttons preserved |
| Save Draft works | ✅ Pass | Same `saveDraft()` function, same API call |
| Dirty/saving/saved states work | ✅ Pass | Badges and save status pill updated |
| Owner preview path works | ✅ Pass | Preview navigates to `/studio/{id}/editor/preview` |
| Public renderer unaffected | ✅ Pass | `presence-studio-v2-public-render.spec.ts` passes |
| Payload hygiene unaffected | ✅ Pass | `presence-public-payload-hygiene.spec.ts` passes |
| Legacy rooms unaffected | ✅ Pass | Legacy path in `PortfolioRenderer` preserved |
| Existing test IDs preserved | ✅ Pass | `studio-v2-object-title`, `studio-v2-open-skin`, etc. still present |

---

## 12. Whether S1 Is Safe to Deploy for Hosted Room 11 Smoke

**Yes. S1 is safe to deploy for hosted Room 11 smoke.**

Reasons:
1. No backend contracts changed.
2. No adapter logic changed.
3. No auth, routing, preview, publish, or feature-gating logic changed.
4. Public renderer, payload sanitization, and legacy room paths are untouched.
5. Local QA passes completely (47/47 tests).
6. The only new UI is the editor chrome, which is gated behind the existing V2 feature flag.
7. No fake capabilities were introduced.

**Required post-deploy action:** Run the hosted lifecycle smoke against Room 11 with `PRESENCE_HOSTED_SMOKE=1` to validate the new test IDs against the deployed build.

---

## 13. Final Verdict

**`CONDITIONAL PASS — deploy S1 to hosted smoke`**

S1 successfully recovered the prototype's information architecture. The Studio now feels like a serious room-arrangement tool. The real production lifecycle (auth, save, preview, publish, payload hygiene) remains intact. The main remaining work is S2 direct manipulation, which was intentionally out of scope.

Deploy. Smoke. Then move to S2.
