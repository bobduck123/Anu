# Presence Studio V2 — Design Direction Audit

**Audit date:** 2026-05-31  
**Auditor:** Kimi (agent)  
**Design source:** `semi launchable (3).zip` — Claude Design Direction Pack + Pilot Rooms + Editor Prototype  
**Production target:** `presence-app/` (Next.js 16, React 19, TypeScript)  
**Scope:** Public renderer, owner editor, token system, world atlas, object vocabulary, motion grammar, mobile model  

---

## Executive Summary

The production V2 implementation is **architecturally sound** and **correctly scoped** for a first pilot launch. The design direction pack defines a much more ambitious full system (cinematic thresholds, per-world motion verbs, 3-pane cockpit, operator mode, real traces). The gap between design ambition and production reality is **expected and manageable** — but several design tokens, world definitions, and mobile rules should be adopted now to prevent drift.

**Bottom line:** Ship the hosted smoke first. Then adopt tokens and world gaps. Then iterate on threshold cinema and motion grammar room by room.

---

## § 1 · Token Architecture Gap Analysis

### 1.1 WORLD tokens (`--p-*`) — Design vs Production

| Token | Design Value | Production Current | Gap |
|-------|-------------|-------------------|-----|
| `--p-paper` | `#f0ebe1` | Not defined in public CSS | **Missing** — add to global CSS |
| `--p-bone` | `#f8f4ec` | Not defined | **Missing** |
| `--p-stage` | `#0e0d0b` | Hardcoded in world-zine/dj | **Missing as token** |
| `--p-ink` | `#0d0c0a` | Hardcoded `#161410` in public CSS | **Close but not exact** |
| `--p-copper` | `oklch(0.62 0.13 38)` | Approximated as `#8f6f3f` | **Adopt oklch** for perceptual uniformity |
| `--p-copper-soft` | `oklch(0.86 0.06 60)` | Not defined | **Missing** |
| `--p-moss` | `oklch(0.52 0.08 138)` | Not defined | **Missing** |
| `--p-moss-soft` | `oklch(0.68 0.06 138)` | Not defined | **Missing** |
| `--p-vermilion` | `oklch(0.58 0.16 32)` | Not defined | **Missing** |
| `--p-brass` | `oklch(0.74 0.13 82)` | Not defined | **Missing** |
| `--p-cobalt` | `oklch(0.55 0.13 250)` | Not defined | **Missing** |
| `--p-rule` | `color-mix(in oklab, var(--p-ink) 14%, transparent)` | `rgba(22,20,16,0.14)` | **Close** — adopt mix for consistency |
| `--p-rule-strong` | `color-mix(in oklab, var(--p-ink) 28%, transparent)` | Not defined | **Missing** |
| `--p-rule-dark` | `color-mix(in oklab, var(--p-on-stage) 14%, transparent)` | Not defined | **Missing** |
| `--p-f-display` | `"Instrument Serif", "Cormorant Garamond", ...` | `Georgia, "Times New Roman", serif` | **Wrong** — must load Instrument Serif |
| `--p-f-ui` | `"Geist", "Helvetica Neue", ...` | `system-ui, -apple-system, ...` | **Wrong** — must load Geist |
| `--p-f-mono` | `"JetBrains Mono", ...` | Not explicitly defined | **Missing** |
| `--p-r-1` | `2px` | Not used consistently | **Adopt** |
| `--p-r-pill` | `999px` | Used for CTA buttons | **OK but misused** — design says pills only for status |
| `--p-sh-1/2/3` | Defined | Not used | **Missing** |
| `--p-ease-*` | 4 cinematic eases | Not used | **Missing** — critical for motion grammar |
| `--p-dur-*` | tap/glide/cine/air | Not used | **Missing** |

**Verdict:** Production CSS is **functional but token-poor**. The design's token architecture is production-ready and should be adopted wholesale. The oklch accent system is particularly important — it ensures all accents share chroma/lightness and only vary in hue, which is the design's core "premium = sharp + quiet" thesis.

### 1.2 COCKPIT tokens (`--ck-*`) — Design vs Production

| Token | Design | Production | Gap |
|-------|--------|-----------|-----|
| `--ck-bg` | `stage` | `#0c0c0e` | **Close** — align naming |
| `--ck-accent` | `↑ room` (inherits from room) | `#c69148` hardcoded | **Missing inheritance** |
| `--ck-aurora-tint` | `↑ room` | Not implemented | **Missing** |
| `--ck-rule` | `8% bone` | `rgba(255,255,255,0.08)` | **Close** |
| `--ck-glow` | `↑ room` | Not implemented | **Missing** |
| `--ck-spine-bg` | `stage-2` | Not named | **Missing** |
| `--ck-inspector-bg` | `stage-2` | Not named | **Missing** |
| `--ck-thumb-zone` | `88px` | Not implemented | **Missing** — needed for mobile cockpit |
| `--ck-radius` | `2px` | Mixed | **Adopt** |
| `--ck-motion` | `studio ease` | Not used | **Missing** |

**Verdict:** Editor chrome is **adequate** but not tokenized. The design's cockpit token layer would make the editor feel more coherent and make it easier to add dark/light mode later.

### 1.3 ROOM tokens (`--r*`) — Design vs Production

| Token | Design | Production | Gap |
|-------|--------|-----------|-----|
| `--rb` (background) | Kit-defined | `room.skin.background` → `--v2-public-bg` | **OK** |
| `--rs` (surface) | Kit-defined | Not exposed | **Missing** |
| `--rt` (text) | Kit-defined | `--v2-public-ink` | **OK** |
| `--rm` (muted) | Kit-defined | `--v2-public-muted` | **OK** |
| `--ra` (accent) | Kit-defined | `--v2-public-accent` | **OK** |
| `--rg` (glow) | Kit-defined | Not exposed | **Missing** |
| `--rr` (radius) | Kit-defined | `--v2-public-radius` | **OK** |
| `--rhw` (heading weight) | Kit-defined | `--v2-public-heading-weight` | **OK** |
| `.kit-*` classes | 5 defined in design CSS | `world-${id}` classes | **OK pattern** |

**Verdict:** Room token system is **largely implemented**. Missing `--rs` (surface) and `--rg` (glow/selection) would unlock per-kit panel treatments and selection halos.

---

## § 2 · World Atlas Gap Analysis

### 2.1 Worlds in Design vs Production

| # | Design World | Design Kit Class | In Production? | Notes |
|---|-------------|------------------|----------------|-------|
| i | Gallery Wall | `.kit-gallery-artist` | ✅ `gallery` | Implemented |
| ii | DJ Booth | `.kit-dj-booth` | ✅ `dj` | Implemented |
| iii | Healing Altar | `.kit-healing-practitioner` | ✅ `healing` | Implemented |
| iv | Archive / Evidence | `.kit-archive-evidence` | ✅ `archive` | Implemented |
| v | Market Stall | `.kit-stall` | ✅ `market` | Implemented |
| vi | Clothing Label / Drop | *implied* | ❌ **Missing** | Design has canvas mock; no model entry |
| vii | Consultant Desk | `.kit-consultant-contractor` | ✅ `consultant` | Implemented |
| viii | Workshop / Bench | *implied* | ✅ `carpenter` | Mapped |
| ix | Shrine / Ritual | *implied* | ❌ **Missing** | Design says "used sparingly" but must exist |
| x | Corridor / Path | *implied* | ❌ **Missing** | Requires backend path/routing work |

**Production model (`model.ts`):**
```ts
export type StudioV2WorldId =
  | "gallery" | "zine" | "dj" | "healing"
  | "market" | "archive" | "carpenter" | "consultant";
```

**Design model (implicit):** 10 archetypes including `clothing-label`, `shrine/ritual`, `corridor/path`. Note: design doesn't mention `zine` explicitly — zine may be a production addition replacing `clothing-label` or `corridor`.

**Verdict:**
- **Add `shrine` world immediately** — low risk, completes the atlas, signals the system's emotional range.
- **Defer `corridor`** — requires product work on multi-room paths. Add placeholder to model but don't implement renderer.
- **Clarify `zine` vs `clothing-label`** — Product decision needed. Are these the same kit? If so, document.

### 2.2 World Kit Feel Descriptions (Design vs Production)

Production `worlds.ts` has good `feel` strings. Design's atlas cards are richer. Adopt design prose:

| World | Production Feel | Design Feel | Action |
|-------|----------------|-------------|--------|
| gallery | "Museum-quiet, editorial, delicate" | "Spotlight · recede · hush · focus · drift" | **Adopt design verbs** |
| dj | "Club, nocturnal, vibrant, dense" | "Pulse · scan · marquee · spin · strobe-restraint" | **Adopt design verbs** |
| healing | "Calm, held, slow breath, sanctuary" | "Breath · glow · soft · still · warm" | **Adopt design verbs** |
| archive | "Documentary, organised, evidential, civic" | "Reveal · evidence · drawer · paper · memory" | **Adopt design verbs** |
| market | "Bazaar, abundant, warm, direct" | "Stack · sort · touch · table · offer" | **Adopt design verbs** |
| carpenter | "Sturdy, raw, proof-first, tradesman" | "Material · process · before-after · tool-mark" | **Adopt design verbs** |
| consultant | "Professional, precise, calm, partner-desk authority" | "Paper · margin · framework · proof · invitation" | **Adopt design verbs** |

---

## § 3 · Object Vocabulary Gap Analysis

### 3.1 Object Types: Design's Closed List vs Production

| # | Design Type | Design Visual Specimen | Production Type | Status |
|---|------------|----------------------|-----------------|--------|
| i | artwork | `.v-frame` — held frame, caption below | `image` | ⚠️ **Merged** — design wants separate artwork vs image |
| ii | image | `.v-img` — frameless, grain | `image` | ✅ Covered |
| iii | text / story | `.v-text` — copper rule left | `text`, `note` | ⚠️ **Merged** — design wants one text type with style variants |
| iv | proof / document | `.v-doc` — paper-stock, stamp, archive no. | `proof`, `credential` | ⚠️ **Split** — credential may overlap |
| v | event | `.v-event` — date as largest type | `event` | ✅ Covered |
| vi | mix / audio | `.v-mix` — waveform, mono metadata | `media` | ⚠️ **Merged** — media is too broad |
| vii | product / drop | `.v-drop` — price in display italic, status dot | `shop` | ⚠️ **Renamed** — shop is commerce-facing |
| viii | booking / contact | `.v-cta` — single-question first | `cta` | ✅ Covered |
| ix | testimonial | `.v-test` — pull-quote, author in mono | `testimonial` | ✅ Covered |
| x | moodboard / influence | `.v-mood` — 4-9 asymmetric tiles | `moodboard` refs | ⚠️ **Different** — design wants in-room objects, not just refs |
| xi | portal / link | `.v-portal` — aperture, glow | `portal`, `link` | ✅ Covered |
| xii | trace / guestbook | `.v-trace` — handwritten, initial, date | Traces config | ⚠️ **Different layer** — design wants traces as objects |
| xiii | cta | `.v-cta` — two words mono uppercase | `cta` | ✅ Covered |
| xiv | archive item | `.v-archive` — catalogue number, hairline | `proof` | ⚠️ **Merged** |
| xv | signal / status | Dot + mono, 6 states max | ❌ **Missing** | **Add to model** |

**Critical finding:** The design's object vocabulary has **15 closed types** with distinct visual specimens. Production has **14 types** but several are merged or renamed, and **signal/status** is completely missing.

The design rule is explicit: "No new object types per release." Production should align its type names with the design's closed list before the list hardens.

**Recommended mapping:**
```
Design              → Production
artwork             → image (with role="artwork")
image               → image (with role="image")
text / story        → text (with borderStyle variant)
proof / document    → proof
event               → event
mix / audio         → media (with role="mix")
product / drop      → shop (rename?)
booking / contact   → cta
testimonial         → testimonial
moodboard           → moodboard refs (keep as refs layer)
portal / link       → portal (internal) / link (external)
trace / guestbook   → traces config (keep as config layer)
cta                 → cta (role="cta")
archive item        → proof (role="archive")
signal / status     → ❌ ADD: signal
```

---

## § 4 · Motion Grammar Gap Analysis

### 4.1 Motion is Mostly Absent from Production

The design defines **per-world motion verbs** with specific easings and durations. Production has:

- `motionIntensity: "still" | "gentle" | "living"` in skin model ✅
- No per-world motion implementation ❌
- No easing curves used in CSS ❌
- No `prefers-reduced-motion` fallback ❌

### 4.2 What Production Should Adopt (After Smoke)

| World | Design Verbs | Production Action |
|-------|-------------|-------------------|
| Gallery | spotlight-in (1400ms), hush (recede 6%), focus (ken burns), dust | Add CSS keyframes for hush + dust |
| DJ | marquee (14s scroll), scan (line wipe), pulse (BPM sync), signal | Marquee CSS animation; defer BPM sync |
| Altar | breath (4s scale 0.4%), glow, still (hover suppress), warmth | CSS breathing keyframe |
| Archive | reveal (720ms drawer), page-turn, evidence (pull-out), residue | Drawer slide transition |
| Stall | none, sort, touch, stamp | Minimal motion — align with "still" |
| Drop | fall, rack, turn (360°), sold (cross-out) | 3D turn on hover; sold strikethrough |

**Critical rule from design:** "Every motion respects prefers-reduced-motion (static fallback to end state)."

---

## § 5 · Threshold → Chamber → Object → Action Gap

### 5.1 Threshold (Entry State)

| Aspect | Design | Production | Gap |
|--------|--------|-----------|-----|
| Background | Full-bleed cinematic (paintings, scanlines, paper) | Plain CSS radial-gradient | **Massive gap** |
| Title | Large display italic, positioned in space | Centered text block | **Structural gap** |
| Status | Live dot + mono uppercase, positioned | Missing | **Missing** |
| Index | Right-side work list (gallery), marquee (DJ), card (stall) | Missing | **Missing** |
| Plate | Museum label metadata, syncs with active item | Missing | **Missing** |
| Enter CTA | Positioned, contextual subtext | Simple centered button | **OK but plain** |
| Mobile | Cinematic, thumb-safe | Simplified | **OK** |

**Verdict:** The production threshold is a **placeholder**. It renders correctly but has none of the cinematic atmosphere that defines the design. This is the **biggest single visual gap**.

**However:** Building cinematic thresholds requires per-world asset pipelines (background images, slideshows, scanline canvases). This is **correctly deferred** until after smoke. But the threshold CSS architecture should be designed now to accommodate it.

### 5.2 Chamber (Room Itself)

| Aspect | Design | Production | Gap |
|--------|--------|-----------|-----|
| Layout | Spatial, per-kit logic | CSS grid, auto-fit | **Acceptable for v1** |
| Objects | Specific visual treatments per type | Generic card with image + copy | **Medium gap** |
| Moodboard | In-room asymmetric tiles | Separate influence section | **Different** |
| Mobile | Stacked, one work at a time | Grid collapses | **OK** |

### 5.3 Object (Focus)

| Aspect | Design | Production | Gap |
|--------|--------|-----------|-----|
| Focus state | Ken burns, spotlight, zoom | None implemented | **Missing** |
| Transform | x, y, scale, rotation, zIndex | Implemented ✅ | **OK** |
| Mobile mute | `.is-mobile-muted` | Implemented ✅ | **OK** |

### 5.4 Action (Trace/Portal)

| Aspect | Design | Production | Gap |
|--------|--------|-----------|-----|
| CTA | "A line, a step, a calendar" | Simple link button | **OK for v1** |
| Portal | "Aperture mark, soft glow" | Plain link | **Missing visual treatment** |
| Trace | Guestbook entries, spatial marks | Demo traces only | **Not real** |

---

## § 6 · Mobile Model Gap Analysis

### 6.1 Design Mobile Rules

- Hit targets ≥ 44px
- Thumb-zone action bar on every chamber
- Threshold motion ≤ 1.4s, cap fps to 48
- Wild mode mobile recovery is one tap
- Incognito visit from owner's phone shows visitor experience exactly
- Bottom-sheet inspector in cockpit
- Save FAB

### 6.2 Production Mobile

- Breakpoint at 720px ✅
- Transform suppression (`transform: none !important`) ✅
- `.is-mobile-muted` hidden ✅
- No thumb-zone action bar ❌
- No bottom-sheet inspector ❌
- No save FAB ❌
- No fps cap ❌

**Verdict:** Production mobile is **safe but minimal**. The design's mobile-native thinking (primary surface, not fallback) is not yet reflected. Add thumb-zone action bar and FAB after smoke.

---

## § 7 · Cockpit (Editor) Gap Analysis

### 7.1 Design Cockpit

Three modes on one spectrum:
1. **Guided** — kit defaults, validated placement, calm inspector, save always reachable
2. **Wild** — freeform canvas, floating tools, move/resize/rotate/layer/pin
3. **Operator** — terminal-like, internal only, hidden behind long-press

Visual: 3-pane layout (outline left, canvas center, properties right). Dark chrome. Collaboration cursors. Live asset grid. Visitor analytics.

### 7.2 Production Editor

- Toolbar with Guided/Wild mode toggle ✅
- Desktop/Mobile viewport switch ✅
- World/Skin/Mood/+Add panels ✅
- Floating toolbar for selected objects ✅
- Dirty state tracking ✅
- Save via API ✅

**Missing from design:**
- 3-pane layout (outline tree + canvas + properties inspector)
- Collaboration cursors
- Live asset grid with thumbnails
- Visitor analytics (uniq, dwell, focus, enquiry)
- Frame/wall styling per object (frame style, wall warmth, spotlight radius)
- Content/Style/Motion tabs on object inspector
- Curator note field
- Operator mode (correctly hidden for now)

**Verdict:** Production editor is **functional and scoped correctly** for pilot launch. The design's 3-pane cockpit is a v2+ aspiration. Do not chase it now.

---

## § 8 · Typography Gap Analysis

### 8.1 Fonts: Design vs Production

| Font | Design | Production | Action |
|------|--------|-----------|--------|
| Display | Instrument Serif → Cormorant Garamond fallback | Georgia | **Load Instrument Serif from Google Fonts** |
| UI | Geist → Helvetica Neue fallback | system-ui | **Load Geist from Google Fonts** |
| Mono | JetBrains Mono | Not explicitly loaded | **Load JetBrains Mono** |
| Studio display | Cormorant Garamond / Inter Tight | Not used | **Load for editor** |
| Studio sans | Inter | Not used | **Load for editor** |

**Critical:** The design's "premium = sharp + quiet" thesis depends on Instrument Serif. Georgia is a poor substitute. Production must load the design fonts.

### 8.2 Type Scale

| Element | Design | Production | Action |
|---------|--------|-----------|--------|
| Hero/Threshold | `clamp(40px, 5.4vw, 78px)` / `clamp(56px, 8vw, 140px)` | `clamp(3rem, 9vw, 7.6rem)` | **Close enough** |
| h1 | `clamp(30px, 3.6vw, 52px)` | `clamp(3rem, 9vw, 7.6rem)` | **Production h1 is threshold-size** — needs hierarchy fix |
| Eyebrow | `11px`, `0.16em` tracking, uppercase | `0.68rem`, `0.18em` | **Close** |
| Body | `15px`, line-height `1.65` | `0.92rem`, `1.55` | **Close** |

---

## § 9 · "Do Not Flatten" Rules — Compliance Audit

| Rule | Design Text | Production Status |
|------|------------|-------------------|
| i. Rooms are not website templates | "If you can describe it as header·hero·features·CTA·footer, it has flattened" | ✅ **Compliant** — chamber/object model prevents this |
| ii. Not all rooms should look clean | "Some rooms are loud, loose, torn" | ⚠️ **At risk** — all worlds share similar grid layout |
| iii. Do not remove weirdness for polish | "Glitch, marquee, torn moodboard tile" | ⚠️ **At risk** — no weirdness yet implemented |
| iv. Never hide the spatial metaphor | Banned: page, section, block, widget | ✅ **Compliant** — uses room, chamber, object, portal |
| v. The cockpit is not a CMS | "No fill-in forms as primary surface" | ⚠️ **Partial** — editor has form panels, but also canvas |
| vi. Do not invent live social proof | "No fake '27 people viewing'" | ✅ **Compliant** — traces are demo-only, clearly labeled |
| vii. Public rooms never expose editor state | "No selection rings, hover handles, draft watermarks" | ✅ **Compliant** — public renderer is sanitized |
| viii. Never sacrifice mobile safety for desktop wildness | "Mobile-safe recovery must exist" | ✅ **Compliant** — mobile breakpoint + mute |
| ix. Do not over-polish away identity | "Room should look like the person whose room it is" | ⚠️ **At risk** — limited skin customization so far |
| x. Do not borrow another world's verbs | "Gallery does not marquee" | ✅ **Compliant** — no motion verbs implemented yet |
| xi. "New age" is not astrology-app generic | "No zodiac, crystals, purple gradients" | ✅ **Compliant** |
| xii. If you can ship it from a Figma template, you have failed | "Each pilot is hand-directed" | ⚠️ **At risk** — production is more template-like than design |

---

## § 10 · Categorized Adoption Map

### 🔵 ADOPT IMMEDIATELY (Low Risk, Before Hosted Smoke)

These are token/CSS additions that improve fidelity without changing architecture.

1. **Load design fonts** — Instrument Serif, Geist, JetBrains Mono from Google Fonts in `_app.tsx` or layout
2. **Add oklch accent tokens** — `--p-copper`, `--p-copper-soft`, `--p-moss`, `--p-moss-soft`, `--p-vermilion`, `--p-brass`, `--p-cobalt` to global CSS
3. **Fix `--p-f-display`** — use `"Instrument Serif", "Cormorant Garamond", serif` instead of Georgia
4. **Add `--p-f-ui`** and `--p-f-mono` tokens and use them
5. **Add easing curve tokens** — `--p-ease-cinema`, `--p-ease-camera`, `--p-ease-tactile`, `--p-ease-studio` to CSS
6. **Add duration tokens** — `--p-dur-tap`, `--p-dur-glide`, `--p-dur-cine`, `--p-dur-air`
7. **Add `shrine` world** to `StudioV2WorldId`, `WORLD_KITS`, and `STUDIO_V2_WORLD_IDS`
8. **Add `signal` object type** to `StudioV2ObjectType`
9. **Add `--rs` (surface) and `--rg` (glow)** to skin model and public CSS
10. **Add shadow tokens** `--p-sh-1`, `--p-sh-2`, `--p-sh-3` and use in public object cards
11. **Radius discipline** — change CTA from `999px` to sharp corners per design (or use `--p-r-1: 2px`)
12. **World feel verbs** — update `WORLD_KITS` feel strings to match design motion verbs

### 🟡 IMPLEMENT AFTER HOSTED SMOKE (Medium Risk, Feature Work)

13. **Cinematic threshold backgrounds** — Per-world full-bleed backgrounds (gallery slideshow, DJ scanlines, stall paper texture). Requires asset pipeline.
14. **Threshold layout system** — Positioned elements (title plate left, index right, plate bottom-left, enter bottom-right) instead of centered block.
15. **Per-world motion verbs** — CSS keyframes for gallery "hush" (room recedes), DJ "marquee" (scroll), altar "breath" (scale), archive "reveal" (drawer slide).
16. **Object-specific visual treatments** — Framed artwork border, document with stamp overlay, event date-as-type card, waveform for mix, moodboard asymmetric tiles.
17. **Mobile thumb-zone action bar** — Fixed bottom bar on chambers.
18. **Mobile save FAB** — Floating action button in cockpit.
19. **`prefers-reduced-motion`** — Static fallbacks for all motion.
20. **Portal visual treatment** — Aperture mark, soft glow, receiving room accent leak.
21. **Chamber-to-chamber navigation** — Visual doorway/portal between chambers.
22. **Texture system expansion** — Implement scan, timber, ledger textures beyond current paper/grain.

### 🔴 REQUIRES PRODUCT WORK (High Coordination, Architecture Changes)

23. **Corridor / Path world** — Multi-room navigation requires backend path model and routing.
24. **Real trace system** — Guestbook entries, footfall, seeds. Needs database schema + write API.
25. **Operator mode** — Internal terminal. Needs auth gate, internal API.
26. **Collaboration cursors** — WebSocket or SSE for multi-user editing.
27. **Live asset grid** — Thumbnails of uploaded images in editor sidebar. Needs asset upload + storage.
28. **Visitor analytics in editor** — uniq, dwell, focus, enquiry. Needs analytics pipeline.
29. **Object frame/wall styling** — Frame style picker, wall warmth slider, spotlight radius. Needs UI + model fields.
30. **Clothing label / Drop world** — Needs product definition (is this `zine`? or separate?).
31. **Full 3-pane cockpit** — Outline tree + live canvas + properties inspector. Major editor redesign.

### ⚫ DO NOT PORT (Out of Scope, Prototype-Only, or Replaced)

32. **Pilot room HTML/CSS files** — `threshold.css`, `chamber.html` from design pack are prototypes. Rebuild via skin system.
33. **Editor.html prototype** — Production has React-based editor. Do not port the HTML prototype.
34. **Canvas grain implementation** — Design uses `<canvas class="paint-grain">`. Production should use CSS noise or SVG for performance.
35. **Specific animation keyframes** — `paint-breathe`, `status-pulse` from prototypes. Replace with CSS transitions for `prefers-reduced-motion` compliance.
36. **Hardcoded pilot content** — bbb.vision, T.AMP, Halberg content. These are demo data, not system code.
37. **Corridor as implemented navigation** — Design says "several rooms arranged into a path." This is a future product feature, not a rendering concern.

---

## § 11 · Exact File Touch List

### For "Adopt Immediately" items:

| File | Change |
|------|--------|
| `presence-app/pages/_app.tsx` or `layout.tsx` | Add Google Fonts link: Instrument Serif, Geist, JetBrains Mono, Cormorant Garamond, Inter |
| `presence-app/components/presence-studio-v2/presence-studio-v2-public.css` | Add `--p-*` token block; fix `--v2-public-ink` and font families; add easing tokens |
| `presence-app/components/presence-studio-v2/worlds.ts` | Add `shrine` to `WORLD_KITS`; update feel strings to design verbs |
| `presence-app/lib/presence/studio-v2/model.ts` | Add `"shrine"` to `StudioV2WorldId`; add `"signal"` to `StudioV2ObjectType` |
| `presence-app/lib/presence/studio-v2/adapters.ts` | Handle `signal` type in adapters |
| `presence-app/components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx` | Use design font tokens for h1/h2 |
| `presence-app/components/presence-studio-v2/presence-studio-v2-public.css` | Add `--rs`, `--rg` to custom properties; use shadow tokens |
| `presence-app/components/presence-studio-v2/SKIN_CONTROLS` in `worlds.ts` | Add surface and glow controls if needed |

### For "After Hosted Smoke" items:

| File | Change |
|------|--------|
| `presence-studio-v2-public.css` | Add `@keyframes` for per-world motion verbs; `prefers-reduced-motion` media query |
| `PresenceStudioV2PublicRoom.tsx` | Threshold section overhaul — per-world background component |
| New: `components/presence-studio-v2/thresholds/` | Per-world threshold components |
| `presence-studio-v2-public.css` | Object-type-specific styles (`.v2-public-object-artwork`, etc.) |
| `PresenceStudioV2PublicRoom.tsx` | Mobile thumb-zone bar component |

---

## § 12 · Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Font loading delays FOIT/FOUT on public pages | Medium | Medium | Use `display=swap`, preload critical fonts |
| oklch() unsupported in older browsers | Low | Low | Provide hex fallbacks via `@supports not` |
| Adding `shrine` world without renderer treatment | Low | Low | Add to model now; CSS treatment can be minimal (calm, still) |
| Threshold cinema work expands scope | High | High | **Cap at one world** (gallery) for first post-smoke pass |
| Object-specific styling proliferates CSS | Medium | Medium | Use CSS custom properties per object type, not hardcoded values |
| Design drift if tokens aren't adopted now | High | High | **Adopt tokens immediately** — this is the cheapest anti-drift measure |

---

## § 13 · Recommended Next Passes

### Pass 1: Token Adoption (this agent or next)
- [ ] Load Google Fonts in app layout
- [ ] Add `--p-*` token block to public CSS
- [ ] Add `shrine` world + `signal` type to model
- [ ] Update world feel strings
- [ ] Update `SKIN_CONTROLS` with surface/glow
- [ ] Add `prefers-reduced-motion` media query skeleton

### Pass 2: Hosted Smoke (Codex)
- [ ] Deploy Vercel env vars
- [ ] Run `presence-studio-v2-hosted-lifecycle.spec.ts`
- [ ] Capture screenshots of room 11 public page
- [ ] File defects for any render issues

### Pass 3: Design Parity — Threshold Cinema (dedicated pass)
- [ ] Design per-world threshold background architecture
- [ ] Implement gallery threshold with image slideshow
- [ ] Add threshold positioning system (plate left, index right, etc.)
- [ ] Mobile threshold treatment

### Pass 4: Design Parity — Motion Grammar (dedicated pass)
- [ ] Implement per-world CSS keyframes
- [ ] Add `motionIntensity` CSS class application
- [ ] `prefers-reduced-motion` end-state fallbacks

### Pass 5: Design Parity — Object Treatments (dedicated pass)
- [ ] Artwork frame treatment
- [ ] Document/proof stamp treatment
- [ ] Event date card treatment
- [ ] Portal aperture treatment

---

*End of audit. This document should be updated after each pass to track adoption progress.*
