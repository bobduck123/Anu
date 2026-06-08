# Presence Studio V2 — Prototype Superiority Audit

**Date:** 2026-06-04
**Auditor:** Kimi Code CLI (product design + frontend architecture audit)
**Scope:** `semi launchable (4).zip` prototype vs. production `presence-app`
**Verdict:** Production is materially weaker in Studio UX, information architecture, and direct manipulation. Recovery is feasible without backend changes for the first phase.

---

## 1. Executive Verdict

### Is hosted Studio currently weaker than the prototype?

**Yes. In almost every Studio-facing dimension.**

The prototype contains **two distinct editor concepts**:

| Prototype Editor | Paradigm | Production Proximity |
|------------------|----------|---------------------|
| `pilots/editor.html` — Static IDE Editor | 3-pane Figma-like: outline / iframe canvas / persistent inspector | Production has none of this |
| `Presence Studio.html` + `studio/app-pure.js` — V2 Immersive Cockpit | Full-screen spatial editor, floating chrome, direct manipulation, device frames | Production is a simplified subset |

Production implemented a **minimal subset** of the immersive cockpit concept. It discarded the IDE editor concept entirely. The result is a Studio that is **safer but weaker** — it has real auth, real save, real publish, and real payload hygiene, but it lacks the spatial confidence, information architecture, and direct-manipulation power that makes the prototype feel like a professional creative tool.

### In which ways is production weaker?

1. **No information architecture** — No outline tree, no chamber tabs, no room structure navigation. Objects are dumped into scrollable chambers with no structural visibility.
2. **No direct manipulation** — Objects cannot be dragged, resized, or rotated on canvas. Transforms are nudged via 11 discrete buttons in a side panel.
3. **No persistent inspector** — The right panel is a conditional sheet that opens only on selection. There is no always-visible properties surface.
4. **~~No asset browser~~** — Recovered in S5. Derived Room Assets panel with thumbnails, status badges, and usage mapping.
5. **Weak top chrome** — No breadcrumbs, no undo indicator, no in-chrome preview/share/publish. Just "Studio V2", mode toggles, and "Save draft".
6. **No object frame/handles** — Selected objects get a CSS shadow ring but no bounding box, no resize handles, no rotation handle.
7. **No Content/Style/Motion tabs** — Object editing is a flat field list. The prototype inspector groups controls into semantic tabs.
8. **No threshold/chamber/archive navigation** — The prototype has explicit tabs for Threshold, Chamber, Studio Archive, Add Page. Production shows all chambers sequentially.
9. **No collaboration presence** — Even simulated presence (activity feed, cursor) is absent.
10. **Visual cockpit gap** — The prototype cockpit has cinematic grain, aurora backgrounds, device frames, and refined easing. Production is functional but plain.

### What must be recovered first?

**Phase S1: Studio layout recovery** — Add left outline panel, persistent right inspector, and better top chrome. This is pure UI, no backend changes, and immediately improves operator confidence.

**Phase S2: Direct manipulation** — Drag-to-move on canvas, object frame with handles, rotation handle. Uses existing transform model. No backend changes.

These two phases alone would close 60% of the perceived quality gap.

---

## 2. Prototype Capabilities Inventory

| Capability | Prototype Evidence | Production Status | Priority | Porting Risk |
|-----------|-------------------|-------------------|----------|-------------|
| **3-pane IDE layout** (outline / canvas / inspector) | `pilots/editor.html`: `grid-template-columns: 280px 1fr 320px` | **Absent** — single scrollable stage with floating sheets | P1 | Low — pure UI layout |
| **Left outline tree** | `pilots/editor.html`: `.ed-tree` with folders, leaf nodes, gold active border, metadata | **Absent** — no structural navigation | P1 | Low — render from existing `chambers[]` |
| **Threshold/Chamber/Archive tabs** | `pilots/editor.html`: `.ed-top-mid` tab bar, 4 tabs in bordered pill | **Absent** — all chambers inline | P1 | Low — UI chrome only |
| **Asset/archive browser grid** | `pilots/editor.html`: `.ed-assets` 3-col grid with thumbnails, labels, "+11" overflow | **Recovered in S5** — left-rail Room Assets panel with thumbnails, status badges, usage mapping, and replace-URL flow | P2 | Low — derived from object images |
| **Persistent right inspector** | `pilots/editor.html`: `.ed-right` always visible, 320px | **Absent** — conditional `.v2-side-panel` sheet | P1 | Low — repurpose existing sheets |
| **Content/Style/Motion tabs** | `pilots/editor.html`: `.ed-prop-tab` with 3 tabs inside inspector | **Absent** — flat field list | P2 | Low — reorganize existing fields |
| **Object frame + handles** | `pilots/editor.html`: `.ed-frame-handle` dashed gold border + 4 corner squares + label tag | **Absent** — only CSS `box-shadow` ring | P2 | Medium — need overlay positioning logic |
| **Direct drag-to-move** | `studio/app-pure.js`: `useWildDrag` — mousedown on selected object updates `x,y` | **Absent** — 10px nudge buttons only | P1 | Medium — need mouse event handlers |
| **Direct resize handles** | `studio/app-pure.js`: `.wild-handle` corners (tl/tr/bl/br) with glow | **Absent** — scale nudge buttons only | P2 | Medium — pointer drag + transform update |
| **Rotation handle** | `studio/app-pure.js`: `.wild-rotate` circular grab above object | **Absent** — 5° nudge buttons only | P2 | Medium — pointer drag + rotation update |
| **Selection aura/breathing glow** | `studio/app-pure.js`: `.room-obj.selected::after` animated `selection-breathe` | **Partial** — production has static `::after` glow | P3 | Low — CSS animation only |
| **Top chrome breadcrumbs** | `pilots/editor.html`: `.ed-crumbs` "my rooms › Christina › Chamber — Room I" | **Absent** — only "Studio V2" label | P2 | Low — static nav links |
| **Undo indicator** | `pilots/editor.html`: "saved · 12s ago" with green dot | **Partial** — dirty/saved badges exist but weaker language | P3 | Low — UI copy only |
| **In-chrome preview/share/publish** | `pilots/editor.html`: top-right buttons: undo, share, preview, publish | **Absent** — publish is on separate preview page | P2 | Low — can link to existing `/editor/preview` |
| **Collaboration cursor (simulated)** | `pilots/editor.html`: `.ed-cursor` arrow + tag "helena · curator" | **Absent** | P4 | N/A — do not port fake cursor |
| **Visitor stats panel** | `pilots/editor.html`: "Visitors today" section with uniq/dwell/focus/enquiry | **Absent** | P4 | High — requires real analytics backend |
| **Activity feed** | `pilots/editor.html`: "Activity now" with helena/otto entries | **Absent** | P4 | High — requires real activity stream |
| **Cinematic grain overlay** | `Presence Studio.html`: `#root::after` SVG fractalNoise at 0.028 opacity | **Absent** from editor | P3 | Low — CSS only |
| **Aurora background blobs** | `studio/cockpit.css`: `aurora-drift` 25s animation, 3 blobs | **Absent** from editor | P3 | Low — CSS only |
| **Device frames** (mobile/desktop) | `studio/app-pure.js`: `.imm-phone-wrap` 390×760 with dynamic island; `.imm-desktop-wrap` 1100×700 scaled | **Partial** — production has `mobile-viewport` CSS class but no frame chrome | P3 | Low — CSS frame wrappers |
| **Mobile recovery modal** | `studio/app-pure.js`: `MobileRecovery` — "Keep wild layout" vs "Apply safe recovery" | **Partial** — model has `mobileRecovery` but no UI | P3 | Low — wire existing model to UI |
| **Floating toolbar** | `studio/app-pure.js`: `FloatingTools` — 4 tools guided, 11 tools wild | **Present** — production has `FloatingToolbar` with deselect/edit/copy/hide/delete/lock/pin/layerUp/layerDown | P0 | Already exists |
| **World switcher** | `studio/app-pure.js`: `.imm-worlds-overlay` fullscreen grid | **Present** — production `WorldSwitcher` exists | P0 | Already exists |
| **Skin Lab** | `studio/app-pure.js`: `SkinLabSheet` bottom sheet with 10 controls | **Present** — production `SkinLabSheet` exists with same categories | P0 | Already exists |
| **Moodboard/Influences** | `studio/app-pure.js`: `.imm-sheet` bottom sheet with reference types | **Present** — production `MoodboardSheet` exists | P0 | Already exists |
| **Guided/Wild mode** | `studio/app-pure.js`: mode toggle suspends transforms | **Present** — production has identical concept | P0 | Already exists |
| **Save draft** | N/A (prototype has no real persistence) | **Present** — real POST/Patch to `/api/presence/owner/rooms/${id}/editor/draft` | P0 | Production only |
| **Real preview page** | N/A | **Present** — `/studio/${id}/editor/preview` with real public renderer | P0 | Production only |
| **Real publish** | N/A (fake button) | **Present** — real POST to `/api/presence/owner/rooms/${id}/editor/publish` | P0 | Production only |
| **Payload hygiene** | N/A | **Present** — `sanitizeStudioV2PublicPayload()`, `assertStudioV2PublicRoomClean()` | P0 | Production only |
| **Room 11 feature gating** | N/A | **Present** — V2 editor only renders for eligible rooms | P0 | Production only |

---

## 3. Immediate Recovery List (No Backend Changes Required)

These capabilities can be implemented **honestly** using only the existing `StudioV2State` model and existing API surface.

### 3.1 Left Outline Panel
- Render a persistent `aside` on the left side of the editor (collapsible on small screens)
- Tree structure derived from `v2State.chambers`
- Folder nodes = chambers (expandable/collapsible)
- Leaf nodes = objects within chambers
- Show object type glyph, title, and optional year/meta
- Click object to select + scroll into view + open Object Tuning
- Click chamber to expand/collapse
- Active state = gold left border + subtle gold bg (match prototype)
- **New UI only. No model changes.**

### 3.2 Persistent Right Inspector (Sheet → Panel)
- Convert `ObjectEditorSheet` from modal sheet to persistent right panel
- Panel width: `320px` (or `min(320px, 30vw)`)
- Collapsible with a toggle button
- When no object selected, show room-level properties (title, tagline, world, CTA)
- When object selected, show object properties
- **New UI only. No model changes.**

### 3.3 Object Inspector Tabs (Content / Style / Motion)
- Inside the persistent right panel, add tab bar: Content / Style / Motion
- **Content tab** (default): Title, Type, Meta, Detail, Link, Image URL, Visibility checkboxes
- **Style tab**: Transform controls (the existing 11 nudge buttons), Locked, Pinned, plus future frame/wall controls
- **Motion tab**: Placeholder for future animation controls; for now show transform preview
- **New UI only. Reorganizes existing fields.**

### 3.4 Top Chrome Recovery
- Add breadcrumb: "My rooms › {room name} › Editor"
- Add status indicator: green dot + "Saved" / yellow dot + "Unsaved changes" / pulsing dot + "Saving…"
- Add action buttons: Preview (links to `/studio/${id}/editor/preview`), Share (copies public URL), Publish (links to preview page with publish CTA)
- Replace "Studio V2" plain text with brand glyph + "Studio" in Instrument Serif italic
- **New UI only. Uses existing pages and URLs.**

### 3.5 Object Frame + Selection Handles
- When object is selected, render a bounding box overlay (not CSS shadow)
- Dashed gold border (`1px dashed var(--p-copper)`) with 4 corner squares
- Label tag above frame showing object type + title
- Render as absolutely-positioned overlay or pseudo-elements
- **New UI only. No model changes.**

### 3.6 Direct Drag-to-Move (Wild Mode)
- In Wild mode, enable `mousedown` + `mousemove` + `mouseup` on selected object
- Update `transform.x` and `transform.y` in real time
- Use existing `updateObject()` path
- Show coordinate readout during drag
- **Uses existing transform model. No backend changes.**

### 3.7 Asset Grid (Derived from Objects)
- Left panel section below outline: "Room assets"
- 3-column grid of all object images in the room
- Thumbnail = `object.image.src` with `aspect-ratio: 1`
- Click asset to select object + scroll into view
- Show "+N" overflow tile if > 6 assets
- **Derived from existing data. No upload/storage needed.**

### 3.8 Chamber Navigation Tabs
- Add tab bar inside the room stage or below the toolbar
- Tabs = each chamber's label
- Click tab to scroll to chamber
- Visual active state
- **New UI only. Uses existing chamber data.**

### 3.9 Save/Dirty Language Improvement
- "Unsaved" → "Unsaved changes"
- "All changes saved to your draft room." → "Saved · just now" (with timestamp)
- Add subtle animation on save completion
- **UI copy only.**

### 3.10 Editor Grain + Atmosphere
- Add subtle paper grain overlay to editor stage (`::after` with noise SVG)
- Add subtle radial gradient lighting to stage background
- Use existing tokens (`--p-paper`, `--p-stage`, `--p-copper`)
- **CSS only. No logic changes.**

---

## 4. Requires Model/API Work

These capabilities **cannot be honestly implemented** without extending the backend or data model.

### 4.1 Real Multi-Page / Chamber CRUD
- Current model supports chambers, but the editor UI does not allow adding/removing/renaming/reordering chambers
- Need: `addChamber()`, `removeChamber()`, `reorderChamber()`, `renameChamber()`
- Backend: PATCH draft endpoint must accept chamber-level mutations
- **Risk: Low** — chambers already exist in model

### 4.2 Undo/Redo History
- Need an action history stack (at minimum client-side, ideally server-persisted)
- Each user action (add object, delete object, skin change, transform nudge) pushed to stack
- `Ctrl+Z` / `Ctrl+Shift+Z` support
- **Risk: Medium** — client-side undo is feasible, server-persisted is harder

### 4.3 Real Asset Upload / Archive
- Need file storage API (S3, Vercel Blob, etc.)
- Need upload endpoint (`/api/presence/owner/rooms/${id}/assets`)
- Need asset metadata (filename, size, type, upload date)
- Need asset grid with real files, not just derived thumbnails
- **Risk: High** — new storage infrastructure

### 4.4 Collaboration Cursors / Multi-User Editing
- Need WebSocket or Yjs infrastructure
- Need presence awareness (who is editing, what are they selecting)
- Need cursor position broadcast
- Need conflict resolution for simultaneous edits
- **Risk: High** — new real-time infrastructure

### 4.5 Real Visitor Analytics
- Need analytics ingestion pipeline
- Need aggregation (uniq visitors, dwell time, focus object, enquiries)
- Need privacy-compliant tracking
- **Risk: High** — new data pipeline

### 4.6 Studio Archive / Version History
- Need snapshot storage (each publish creates an archive snapshot)
- Need browse/restore UI
- Need diff visualization
- **Risk: Medium** — can leverage existing draft/publish snapshots

### 4.7 Real Share Management
- Need share token generation
- Need access control (password-protected preview, time-limited links)
- Need share analytics (who opened, when)
- **Risk: Medium** — new auth layer

### 4.8 Object-Level Animation / Motion
- Current model stores `motionIntensity` as a string enum (`still`/`gentle`/`living`)
- Need per-object animation config (entrance animation, hover effect, scroll trigger)
- Need animation runtime in public renderer
- **Risk: Medium** — model extension + runtime

---

## 5. Do Not Port Directly

These prototype assumptions must **not** enter production.

| Anti-Pattern | Why | What To Do Instead |
|-------------|-----|-------------------|
| **Standalone HTML architecture** | `pilots/editor.html` is a static file with no auth, no API, no tenant scope | Keep Next.js app with real auth middleware |
| **localStorage as state truth** | Prototype stores state in memory/localStorage | Keep real draft load/save API |
| **Fake collaboration cursor** | `pilots/editor.html` has hardcoded `.ed-cursor` at `left:72%;top:62%` | Omit until real WebSocket presence exists |
| **Fake visitor stats** | "43 uniq · 3m 42s avg · 1 enquiry" is static demo text | Omit until real analytics pipeline exists |
| **Fake archive data** | "Studio archive" tab has no real backend | Omit or show "Coming soon" with honest messaging |
| **Fake publish button** | `pilots/editor.html` publish button is a no-op | Keep real publish flow via preview page |
| **Fake activity feed** | "helena editing this work · just now" is static | Omit until real activity stream exists |
| **Hardcoded content** | All prototype rooms have hardcoded HTML/JS content | Keep dynamic React rendering from API data |
| **Iframe-based canvas** | `pilots/editor.html` embeds `chamber.html` in iframe | Keep native React rendering (production got this right) |
| **TemplateKit endpoints** | No TemplateKit integration should be introduced | Keep existing API surface |

---

## 6. Production Implementation Sequence

### Phase S1 — Studio Layout Recovery (Est. 2–3 days)
**Goal:** Close the information architecture gap.

1. Add left outline panel (`StudioOutlinePanel`)
   - Tree from chambers/objects
   - Expand/collapse chambers
   - Click to select + scroll
   - Collapsible on mobile

2. Convert right sheet to persistent inspector (`StudioInspectorPanel`)
   - 320px width, collapsible
   - Room-level props when nothing selected
   - Object props when selected
   - Content / Style / Motion tabs

3. Recover top chrome
   - Brand glyph + "Studio"
   - Breadcrumb nav
   - Status indicator (saved/unsaved/saving)
   - Preview / Share / Publish actions

4. Add chamber navigation tabs
   - Horizontal tab bar above stage
   - Scroll-to-chamber on click
   - Active state

**Backend changes:** None.
**Tests:** Update `presence-studio-v2-hosted-lifecycle.spec.ts` selectors.
**Evidence:** Screenshot comparison of editor chrome before/after.

---

### Phase S2 — Direct Manipulation (Est. 3–4 days)
**Goal:** Objects should feel tangible on the canvas.

1. Object selection frame + handles
   - Dashed bounding box on selected object
   - 4 corner squares
   - Type+title label tag

2. Drag-to-move (Wild mode)
   - `pointerdown` on selected object initiates drag
   - `pointermove` updates `transform.x/y`
   - `pointerup` commits
   - Coordinate tooltip during drag

3. Resize handles (Wild mode)
   - Corner drag updates `transform.scale`
   - Maintain aspect ratio option

4. Rotation handle (Wild mode)
   - Circular handle above object
   - Drag rotates object

5. Selection aura animation
   - Breathing glow ring on selected object
   - CSS keyframe animation

**Backend changes:** None. Uses existing transform model.
**Tests:** Add drag/resize/rotate tests.
**Evidence:** Screen recording of direct manipulation.

---

### Phase S3 — Inspector Depth (Est. 2 days)
**Goal:** Object editing feels professional, not form-like.

1. Content / Style / Motion tabs in persistent inspector
2. Style tab: richer transform controls (coordinate inputs, rotation dial, scale slider)
3. Content tab: image preview thumbnail, not just URL text
4. Motion tab: entrance animation preview (placeholder for future)

**Backend changes:** None.
**Tests:** Update lifecycle spec.

---

### Phase S4 — Threshold/Chamber Management (Est. 2–3 days)
**Goal:** Rooms have structure, not just a bag of objects.

1. Add chamber CRUD UI
   - "Add chamber" button
   - Chamber rename (inline or in panel)
   - Chamber reorder (drag handles in outline)
   - Chamber delete (with confirmation)

2. Threshold editor mode
   - Dedicated threshold editing view
   - Hero image selection
   - CTA configuration
   - Title/tagline editing with live preview

3. Chamber-specific settings
   - Chamber layout override (grid type)
   - Chamber visibility

**Backend changes:** Extend PATCH draft endpoint to accept chamber CRUD. Low risk — chambers already in model.
**Tests:** Chamber CRUD tests.

---

### Phase S5 — Asset/Archive Browser (Est. 2–3 days)
**Goal:** Visual asset management, not URL pasting.

1. Derived asset grid
   - 3-column grid of all object images
   - Click to select object
   - Empty state when no images

2. Image URL preview
   - Thumbnail preview in object inspector
   - Error state for broken URLs

3. Asset drag-to-object
   - Drag image from asset grid onto object to set image

**Backend changes:** None for derived grid. Real upload requires Phase S7.
**Tests:** Asset grid visibility tests.

---

### Phase S6 — Preview/Publish Confidence (Est. 1–2 days)
**Goal:** Operator knows exactly what will go live.

1. Inline preview toggle
   - Split view: editor left / preview right
   - Or modal preview overlay

2. Publish readiness checklist
   - "Room name is set" ✓
   - "At least one public object" ✓
   - "CTA is configured" ✓
   - "Mobile view tested" ✓

3. Diff indicator
   - Highlight changed objects since last publish

**Backend changes:** None. Uses existing preview page.
**Tests:** Preview toggle test.

---

### Phase S7 — Advanced/Future (Est. 2–4 weeks)
**Goal:** Professional-grade features requiring infrastructure.

1. Undo/redo (client-side action stack)
2. Real asset upload (S3/Vercel Blob)
3. Studio archive / version history
4. Collaboration cursors (WebSocket)
5. Real visitor analytics
6. Object-level animations
7. Mobile recovery UI

**Backend changes:** Required for most items.
**Tests:** Full integration tests.

---

## 7. Codex Implementation Brief

### Exact Next Prompt for Codex

> **Implement Phase S1: Studio Layout Recovery**
>
> The production Presence Studio V2 editor (`components/presence-studio-v2/PresenceStudioV2Editor.tsx`) is missing the information architecture that the prototype editor had. Your task is to add a 3-pane cockpit layout without changing any backend APIs or data models.
>
> **Specific changes:**
> 1. **Left Outline Panel**: Add a persistent `aside` panel (collapsible, ~260px wide) that renders a tree of chambers and objects from `v2State.chambers`. Include expand/collapse, click-to-select, and active state styling (gold left border). Use existing `setSelectedId` and `setActivePanel("object")` flow.
> 2. **Persistent Right Inspector**: Convert `ObjectEditorSheet` from a conditional overlay sheet to a persistent right panel (~320px, collapsible). When no object is selected, show room-level fields (title, tagline, CTA). When object selected, show existing object fields organized into Content/Style/Motion tabs. Reuse all existing field controls — do not add new input types.
> 3. **Top Chrome Recovery**: Enhance the toolbar with: (a) brand glyph + "Studio" in Instrument Serif, (b) breadcrumb "My rooms › {title} › Editor", (c) improved save status indicator with timestamp, (d) Preview button linking to `/studio/${nodeId}/editor/preview`, (e) Share button copying the public room URL, (f) Publish button linking to preview page.
> 4. **Chamber Tabs**: Add a horizontal tab bar below the toolbar showing each chamber label. Clicking a tab scrolls the stage to that chamber.
> 5. **Visual Polish**: Add subtle paper grain overlay to the stage background using CSS `::after` with an inline SVG noise filter. Use existing color tokens.
>
> **Constraints:**
> - Do NOT change `lib/presence/studio-v2/model.ts`
> - Do NOT change adapter logic
> - Do NOT change API calls
> - Do NOT break existing tests — update selectors in `tests/e2e/presence-studio-v2-hosted-lifecycle.spec.ts` if DOM changes
> - Preserve Room 11 feature gating
> - Preserve all existing `data-testid` attributes or add new ones, never remove existing testids
> - Preserve legacy room behavior
>
> **Evidence required:**
> - Screenshot of new 3-pane layout
> - Screenshot of persistent inspector with tabs
> - Updated lifecycle spec passing (at least read-only sanity)
> - No payload hygiene regressions

---

## Appendix A: Visual Evidence

### Prototype Editor (`pilots/editor.html`)
- 3-pane grid: outline (280px) / canvas (1fr) / inspector (320px)
- Dark IDE aesthetic with gold accents
- Collaboration cursor visible on canvas
- Selection frame with handles over iframe content

### Production Editor (`PresenceStudioV2Editor.tsx`)
- Single scrollable stage, no persistent panels
- Functional but plain toolbar
- Objects in CSS grid, no canvas overlay
- Conditional sheets for editing

### Prototype Public Room (`pilots/ckg-room/threshold.html`)
- Cinematic threshold with painting slideshow
- Cursor-driven spotlight
- Museum plate with roman numerals
- Influence rail at bottom

### Production Public Room (`PresenceStudioV2PublicRoom.tsx`)
- Threshold with world mark and artifact card
- Chamber grid with object cards
- Influence layer as card grid
- Traces strip

**Conclusion:** Production public renderer is visually competitive with the prototype. The **editor** is where the gap lives. Recover the Studio first.

---

## S1 Status - 2026-06-04

Studio Recovery S1 has been implemented locally.

Recovered:

- three-pane Studio cockpit
- left outline/assets rail
- persistent right inspector
- Content / Style / Motion object inspector tabs
- room-level inspector when no object is selected
- top chrome with breadcrumb, save state, Share, Preview, and Publish actions
- Threshold / Chamber / Studio Archive tabs
- chamber navigation tabs
- selected object route through outline and stage
- scoped stage atmosphere and responsive collapse

Still deferred to S2:

- direct drag-to-move
- resize handles
- rotation handles
- grouping
- real asset upload
- undo/redo
- real archive/version history

Evidence:

```txt
PRESENCE_STUDIO_V2_STUDIO_RECOVERY_S1_REPORT.md
docs/program/evidence/presence-studio-v2-studio-recovery-s1/
```

S1 does not change backend contracts, public payload shape, feature gating, auth, save/reload, owner preview, or publish.

---

## S1 Hosted Status - 2026-06-05

Studio Recovery S1 has been deployed and verified on hosted Room 11 / `ggm-christina-goddard`.

Hosted confirmation:

- `/studio/11/editor` renders the S1 three-pane cockpit.
- Left outline/assets rail appears and is scoped to V2.
- Persistent right inspector appears with Content, Style, and Motion tabs.
- Top chrome, Threshold/Chamber/Studio Archive tabs, and chamber navigation tabs appear.
- Owner preview renders V2 through the sanitized public renderer.
- Public `/p` and `/presence` routes render V2 without editor chrome.
- Room 1 remains legacy.
- Payload hygiene remains clean with `0` hosted violations.
- Full hosted lifecycle smoke passed after selector/spec stabilization.

Evidence:

```txt
PRESENCE_STUDIO_V2_STUDIO_RECOVERY_S1_HOSTED_SMOKE.md
docs/program/evidence/presence-studio-v2-studio-recovery-s1-hosted/
```

S1 status is now hosted-ready for controlled Room 11 operator-led pilot use.

Remaining prototype superiority gap:

- S2 direct manipulation: drag-to-move, resize handles, rotation handles, and stronger in-canvas spatial editing.
- Real asset upload and assignment.
- Undo/redo and grouping.
- True archive/version history.

Public self-serve onboarding remains out of scope until S2 and further usability hardening are complete.

---

## S2 Status - 2026-06-05

Studio Recovery S2 has been implemented locally.

Recovered:

- editor-only selected-object frame
- selected object type/title label
- corner resize handles
- rotate handle
- Wild Mode drag-to-move
- Wild Mode scale via corner handles
- Wild Mode rotation via rotate handle
- Motion inspector sync for x, y, scale, rotation, and z-index
- explicit disabled handle states in Guided Mode
- explicit disabled handle/input states for locked objects
- Escape deselect
- Arrow-key nudging in Wild Mode for selected, unlocked objects
- local save/reload persistence through the existing owner draft API mock path

Evidence:

```txt
PRESENCE_STUDIO_V2_STUDIO_RECOVERY_S2_REPORT.md
docs/program/evidence/presence-studio-v2-studio-recovery-s2/
```

Still deferred beyond S2:

- real asset upload and assignment
- undo/redo
- grouping
- chamber CRUD
- collaboration cursors
- true archive/version history
- public self-serve onboarding readiness

S2 does not change backend contracts, public payload shape, feature gating, auth, save/reload, owner preview, or publish. Hosted S2 verification remains pending deployment.

---

## S2 Hosted Status - 2026-06-06

Studio Recovery S2 has been deployed and verified on hosted Room 11 / `ggm-christina-goddard`.

Hosted confirmation:

- Wild Mode drag-to-move works.
- Wild Mode resize works.
- Wild Mode rotate works.
- Guided Mode disables manipulation.
- Locked objects disable manipulation.
- Motion inspector syncs with canvas manipulation.
- Save/reload persisted transform values exactly.
- Owner preview has no editor chrome leakage.
- Public desktop/mobile render cleanly.
- Legacy rooms remain unaffected.
- Full hosted lifecycle smoke passed in 36.7s.
- Cleanup restored transform values to the original state.

Evidence:

```txt
PRESENCE_STUDIO_V2_S2_HOSTED_REPORT.md
docs/program/evidence/presence-studio-v2-studio-recovery-s2-hosted/
```

Remaining prototype superiority gaps after S2:

- real asset upload and assignment
- undo/redo
- grouping
- chamber CRUD
- collaboration cursors
- true archive/version history
- broader self-serve usability hardening

S3 can begin after the S2 release baseline commit is pushed. Public self-serve onboarding remains out of scope.

---

## S3 Status - 2026-06-06

Studio Recovery S3 has been implemented locally.

Recovered:

- clearer professional persistent inspector
- Content tab image preview and image empty state
- object link status
- clearer public/mobile visibility language
- Style tab state badges, lock/pin clarity, layer summary, duplicate, and delete confirmation
- Motion tab x/y steppers, scale slider, rotation slider, z-index clarity, and mode guidance
- editor-only desktop/mobile device frame chrome
- mid-width/narrow Outline and Inspector toggles
- room-level preview/publish confidence checklist
- clearer dirty-state warning for preview/share confidence
- editor-only object state clarity for hidden/locked/pinned/transformed/unsaved states

Evidence:

```txt
PRESENCE_STUDIO_V2_STUDIO_RECOVERY_S3_REPORT.md
docs/program/evidence/presence-studio-v2-studio-recovery-s3/
```

S3 local QA passed:

- typecheck
- build
- feature tests
- adapter tests
- public payload tests
- resolver tests
- readiness tests
- V2 public render Playwright
- V2 draft preview Playwright
- public payload hygiene Playwright
- S2 direct manipulation Playwright
- S3 inspector usability Playwright

Remaining prototype superiority gaps after S3:

- chamber CRUD
- real asset upload and assignment
- undo/redo
- grouping
- collaboration cursors
- true archive/version history
- broader self-serve onboarding readiness

S3 does not change backend contracts, public payload shape, feature gating, auth, save/reload, owner preview, or publish. Hosted S3 verification remains pending deployment.

---

## S3 Hosted Status - 2026-06-06

Studio Recovery S3 has been deployed and verified on hosted Room 11 / `ggm-christina-goddard`.

Hosted confirmation:

- S3 editor cockpit mounts on `/studio/11/editor`.
- Content tab image preview/empty state path works.
- Link status and visibility guidance render in the inspector.
- Style tab state badges, lock/pin clarity, layer summary, and delete confirmation work.
- Motion tab X/Y steppers and scale/rotation sliders sync with transform inputs.
- S2 selection frame and Wild Mode manipulation remain functional.
- Guided Mode disables manipulation.
- Desktop/mobile device frames render in the editor only.
- Narrow Outline/Inspector toggles work.
- Preview/publish confidence checklist and dirty-state warning render honestly.
- Owner preview remains sanitized.
- Public desktop/mobile routes remain clean.
- Room 1 remains legacy.
- Full hosted lifecycle smoke passed after S3 deploy.
- Hosted payload hygiene passed with `0` violations.

Evidence:

```txt
PRESENCE_STUDIO_V2_STUDIO_RECOVERY_S3_HOSTED_SMOKE.md
docs/program/evidence/presence-studio-v2-studio-recovery-s3-hosted/
```

Remaining prototype superiority gaps after hosted S3:

- chamber CRUD
- real asset upload and assignment
- undo/redo
- grouping
- collaboration cursors
- true archive/version history
- broader self-serve onboarding readiness

S4 can be scoped next, but was not started in the S3 deploy/smoke pass. Public self-serve onboarding remains out of scope.

Release baseline:

```txt
PRESENCE_STUDIO_V2_S3_RELEASE_BASELINE_REPORT.md
```

S4 is cleared to begin after the S3 baseline commit is pushed and the working tree is clean.

---

## S5 Status - 2026-06-08

Studio Recovery S5 Asset / Media Library Foundations has been implemented locally.

Recovered honestly:

- Derived Room Assets registry from current Studio V2 objects.
- Left-rail Room Assets panel with thumbnails, status badges, and usage mapping.
- Inspector asset detail view with full URL, replacement field, object/chamber usage, public/mobile status, threshold/hero context, duplicate warning, and test/smoke warning.
- Replace image URL flow through existing object `image.src`.
- Media health checklist for missing URLs, broken/unloaded thumbnails, suspected test assets, duplicate URLs, external URLs, public-visible media, and mobile-visible media.
- Owner preview/public renderer remain clean because S5 warnings are editor-only.

Still deferred beyond S5:

- Real upload.
- Crop/storage/CDN library.
- Multi-replace for duplicate URLs.
- Asset approval workflow.
- Version history and archive restore.

Evidence:

```txt
PRESENCE_STUDIO_V2_ASSET_LIBRARY_S5_REPORT.md
docs/program/evidence/presence-studio-v2-asset-library-s5/
```

S5 local QA passed. No backend contracts, model fields, adapter behavior, public projection, public payload shape, hosted data, or S4A stash contents were changed.

S5 audit: `PRESENCE_STUDIO_V2_ASSET_LIBRARY_S5_AUDIT.md` — **CONDITIONAL PASS**. Deploy allowed; P1 unit-test gap to close before next refactor.

---

## Public Output Recovery P1 Status - 2026-06-06

After S3, Kimi's public-room output review identified a separate product gap: the public Room 11/Gallery output was functionally clean but still read as a structured content page instead of a threshold into a world.

Public Output Recovery P1 addresses the Gallery/GGM minimum standard without changing Studio editor behavior or backend contracts.

Recovered public-room qualities:

- Full-viewport Gallery threshold using the first safe public image.
- Lower-chrome entry with spatial title and portal-style CTA.
- Gallery chambers changed from framed card panels to exhibition-path room bands.
- Gallery object layout changed from generic auto-fit cards to an editorial 12-column rhythm.
- Gallery images now use sharper museum-frame treatment and `object-fit: contain`.
- Visible system labels and object-count pseudo text are removed or heavily reduced.
- Moodboard references read as influence fragments.
- Demo traces read as marginal residue rather than metric chips.
- Mobile Gallery threshold and chamber rhythm are improved.

Evidence:

```txt
PRESENCE_PUBLIC_OUTPUT_RECOVERY_P1_REPORT.md
docs/program/evidence/presence-public-output-recovery-p1/
```

New local regression gate:

```txt
tests/e2e/presence-public-output-gallery-quality.spec.ts
```

P1 is ready for Kimi art-direction audit. It has not been deployed. S4A chamber-management work remains parked and is not included in this public-output pass.
