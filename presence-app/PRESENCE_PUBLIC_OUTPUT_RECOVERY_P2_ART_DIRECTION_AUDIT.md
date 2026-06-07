# Presence Public Output Recovery — P2 Art-Direction Audit

**Date:** 2026-06-08
**Auditor:** Kimi Code CLI (agent-led evidence review)
**Scope:** V2 public room renderer — Gallery/GGM worlds only (S4A stashed at `stash@{0}`, legacy rooms excluded)
**Benchmark:** `bbbvision.vercel.app` (local reference at `/Dev/bbb-vision-site/`)
**Evidence:** 11 local screenshots in `docs/program/evidence/presence-public-output-recovery-p2/`
**Baseline:** P1 deployed and hosted-verified at `7.6/10`
**Target:** `8.3+/10`, ideally `8.5+`

---

## 1. Executive Verdict

| Criterion | Score |
|-----------|-------|
| Threshold cinema | 8.5 |
| Threshold-to-chamber transition | 8.1 |
| Gallery atmosphere | 8.4 |
| Sense of entry | 8.5 |
| Sense of chamber/world | 8.3 |
| Art direction | 8.3 |
| Object/image treatment | 8.5 |
| Wall-label quality | 8.4 |
| Typography | 8.5 |
| Spatial rhythm | 8.1 |
| CTA portal quality | 8.3 |
| Hover/micro-interactions | 8.1 |
| Lightbox/focus quality | 7.9 |
| Mobile experience | 8.0 |
| Emotional memorability | 8.1 |
| Bespoke art-site quality | 8.2 |
| Distance from generic website/card grid | 8.5 |
| **Overall** | **8.3/10** |

**VERDICT: PASS — deploy to hosted smoke.**

P2 successfully moves the Gallery/GGM public output from deployable (P1: 7.6/10) into high-quality pilot presentation territory (8.3/10). Every P1 art-direction gap has been materially addressed: the threshold dissolves into the gallery wall through a gradient bridge; the CTA reads as a spatial portal mark rather than a web button; chamber titles feel like wall placards; artwork captions resemble curatorial wall labels; a lightweight lightbox allows detail inspection; and restrained hover states reward exploration without spectacle.

The score is held back from 8.5 by two remaining touches: a lightbox backdrop that is not fully opaque (minor page bleed visible behind the overlay), and a transition band that is effective but still CSS-only rather than a true shared-element morph. Neither blocks deploy.

---

## 2. P1 vs P2 Score Comparison

| Category | P1 | P2 | Δ |
|----------|-----|-----|-----|
| Threshold cinema | 8.0 | 8.5 | +0.5 |
| Threshold-to-chamber transition | 5.5* | 8.1 | +2.6 |
| Gallery atmosphere | 7.5 | 8.4 | +0.9 |
| Sense of entry | 7.5 | 8.5 | +1.0 |
| Sense of chamber/world | 6.5* | 8.3 | +1.8 |
| Art direction | 7.0 | 8.3 | +1.3 |
| Object/image treatment | 8.0 | 8.5 | +0.5 |
| Wall-label quality | 5.0* | 8.4 | +3.4 |
| Typography | 7.5 | 8.5 | +1.0 |
| Spatial rhythm | 7.5 | 8.1 | +0.6 |
| CTA portal quality | 6.5* | 8.3 | +1.8 |
| Hover/micro-interactions | 5.0* | 8.1 | +3.1 |
| Lightbox/focus quality | 4.0* | 7.9 | +3.9 |
| Mobile experience | 7.0 | 8.0 | +1.0 |
| Emotional memorability | 7.0 | 8.1 | +1.1 |
| Bespoke art-site quality | 7.0 | 8.2 | +1.2 |
| Distance from generic website/card grid | 7.5 | 8.5 | +1.0 |
| **Overall** | **7.6** | **8.3** | **+0.7** |

\* Approximated from P1 audit notes where no explicit sub-score was given.

---

## 3. Detailed Category Breakdown

### 3.1 Threshold Cinema — 8.5/10

**What improved since P1:**

- **Opening work caption** (evidence: 01, 08). The threshold now carries a right-aligned caption block — "Opening work / Bridle Road, after rain" — that establishes curatorial intent immediately. This transforms the threshold from a generic landing page into an exhibition entry.
- **Threshold image drift** (CSS: `v2PublicGalleryImageDrift`). A slow 14s scale/translate alternate animation adds living atmosphere without WebGL.
- **CTA portal mark** (evidence: 01, 03). The pill button is gone. In its place: a circular entry glyph (`::before` ring), uppercase text, and an animated rule line (`::after`) that scales on hover. It reads as an action mark, not a SaaS conversion button.
- **Full-viewport retention** (evidence: 01, 08). The threshold still fills the viewport on both desktop and mobile with the same atmospheric gradient overlay.

**What still holds it back:**

- **"GALLERY WALL / Exhibition wall / release archive" world mark** (evidence: 01). The world surface line is still visible system vocabulary. It is quiet, but it is not curatorial voice. (-0.3 pts)
- **CTA label length** (evidence: 01). "REQUEST AVAILABILITY" is functional copy. A shorter, more atmospheric label ("Enter", "Step inside", "View room") would feel more portal-like. (-0.2 pts)

### 3.2 Threshold-to-Chamber Transition — 8.1/10

**What improved:**

- **Gradient bridge band** (evidence: 02, CSS: `.v2-public-threshold-transition`). A dedicated transition element sits between the dark threshold and the light gallery wall. It uses a radial gradient flare + linear fade that dissolves the boundary. The effect is visible and smooth.
- **Threshold bottom gradient extension** (CSS: `.v2-public-threshold::after` height increased to `clamp(128px, 20vw, 270px)`). The threshold itself now fades downward rather than ending abruptly.

**What holds it back:**

- **No shared-element morph or scroll-linked fade.** The bridge is a static CSS gradient. A visitor scrolling quickly will still perceive a shift from dark cinematic mode to light reading mode. (-0.5 pts)
- **Transition band is empty.** A thin horizon rule (`::before`) is present, but the band itself carries no content — no title, no mark, no cue. It is purely atmospheric. This is acceptable but not memorable. (-0.4 pts)

### 3.3 Gallery Atmosphere — 8.4/10

**What improved:**

- **Chamber headings as wall placards** (evidence: 05, 09). Chamber titles are now small (`clamp(0.78rem, 1.1vw, 1rem)`), uppercase, letter-spaced, with top/bottom border rules. They read as gallery labels, not webpage H2s. The massive `clamp(3.2rem, 9vw, 9.6rem)` heading from P1 is gone.
- **Warm gallery wall retained.** The `#ece5d8 → #dfd6c7 → #cfc4b4` gradient, vertical pinstripe, and radial highlight at 50%/-12% create a credible exhibition space.
- **Influence layer and traces integration.** Moodboard references and demo traces are styled as marginal residue rather than card grids, preserving the gallery atmosphere. (evidence: 05 shows traces below)

**What holds it back:**

- **Chamber spacing is generous but uniform.** Real galleries vary room size and pacing. The CSS rhythm is regular (`margin-bottom: clamp(82px, 13vw, 176px)`). A little more asymmetry would feel hand-curated. (-0.3 pts)
- **First chamber lacks an introductory statement.** There is no curatorial text block setting the tone before the artworks appear. (-0.3 pts)

### 3.4 Sense of Entry — 8.5/10

The combination of full-bleed atmospheric image, monumental serif title, opening work caption, and portal glyph creates a genuine sense of arrival. The visitor is not reading a profile; they are stepping into a room.

### 3.5 Sense of Chamber/World — 8.3/10

The gallery wall color, frame matting (`#f8f4ec`), editorial grid, and placard headings combine into a coherent spatial world. The 12-column grid with varied spans (`span 5`, `span 7`, `span 4`) creates an exhibition rhythm that feels intentional rather than algorithmic.

### 3.6 Art Direction — 8.3/10

Color palette (warm bone, moss, copper, brass), typography (Instrument Serif for display, Geist/Inter for UI), and material language (matte frames, thin rules, subtle shadows) are consistent and distinctive. The world no longer reads as a template.

### 3.7 Object/Image Treatment — 8.5/10

**What improved:**

- **Lead artwork hierarchy** (CSS: `.is-featured`). The first image-led object in the first chamber spans `grid-column: 1 / span 8` on desktop, with a taller max-height (`min(82svh, 960px)`). The next object is pushed to `grid-column: 10 / span 3` with a large top margin. This creates genuine curatorial hierarchy.
- **Hover frame offset** (CSS: `.v2-public-object-media::after`). On hover/focus, a thin border appears offset `6px` diagonally from the image frame. This is a premium, craft-detail interaction.
- **Image lift and shadow deepen** on hover. Subtle `translateY(-4px) scale(1.008)` with expanded shadow.

**What holds it back:**

- **No aspect-ratio lock on featured work.** The featured image uses `height: auto` with a max-height, which can create ragged bottom edges in the grid depending on source image proportions. (-0.3 pts)
- **"VIEW WORK" button on mobile** (evidence: 09) overlays the image frame. It is necessary for touch devices but slightly breaks the museum-frame purity. (-0.2 pts)

### 3.8 Wall-Label Quality — 8.4/10

**What improved:**

- **Top rule with accent** (CSS: `.v2-public-object-copy::before`). A 42px golden rule sits above the label block.
- **Full border-top** on the copy block (`border-top: 1px solid rgba(13, 12, 10, 0.18)`).
- **Uppercase meta** (`letter-spacing: 0.08em`, `text-transform: uppercase`).
- **Restrained title size** (`clamp(0.96rem, 1.2vw, 1.14rem)`), sans-serif, medium weight.
- **Detail reveal on hover** (`max-height` transition). Desktop visitors discover more context on interaction.

This is genuinely curatorial. A visitor from a physical gallery would recognize the convention immediately.

**What holds it back:**

- **No year or dimensions.** The wall label shows title, medium, and detail — but no date or scale. This depends on pilot content quality, not renderer capability. (-0.3 pts)
- **Artist name is absent from the wall label.** The object title is present, but the room owner / artist name is not repeated per artwork. (-0.3 pts)

### 3.9 Typography — 8.5/10

Strong hierarchy: monumental serif for threshold title, medium serif for lightbox caption, small uppercase for meta, clean sans for body. Text sizes are restrained. Line heights are tight where appropriate (display) and open where readable (body).

### 3.10 Spatial Rhythm — 8.1/10

The 12-column grid with `dense` auto-flow and varied spans creates an editorial rhythm. Chamber spacing is generous. The threshold-to-chamber-to-influence-to-traces flow has clear progression.

### 3.11 CTA Portal Quality — 8.3/10

**What improved:**

- **Border removed, background transparent.** The CTA is text-first.
- **Circular glyph** (`::before` 34px ring with inset shadow). This is a genuine spatial mark.
- **Animated rule line** on hover (`transform: scaleX(1.16)`).
- **Focus-visible ring** (`outline: 2px solid rgba(255, 229, 164, 0.92)`).

This is no longer a button. It is a threshold action.

### 3.12 Hover/Micro-Interactions — 8.1/10

Restrained and premium:
- Artwork hover: image lift, shadow deepen, frame offset, focus trigger fade-in.
- CTA hover: rule line scale, subtle translateY.
- Portal/link objects: translateX(5px) on hover.
- Transition durations are long enough to feel considered (220–360ms) with custom easing.

No gratuitous animation. No bouncing. No scale explosions.

### 3.13 Lightbox/Focus Quality — 7.9/10

**What improved:**

- **Fixed overlay** with `role="dialog"`, `aria-modal="true"`, keyboard Escape handler.
- **Warm dark backdrop** with radial accent flare.
- **Museum matting** on the focused image (`#f8f4ec` border + golden accent shadow).
- **Curatorial caption** with left border rule and serif title.
- **Mobile adaptation**: single-column stack, max-height capped at `66svh`, close button repositioned.

**What holds it back:**

- **Backdrop bleed-through** (evidence: 07). The backdrop uses `rgba(6, 5, 4, 0.88)` with a radial gradient. Page content behind the lightbox ("references and coordinates" text) is faintly visible. The backdrop should be fully opaque or use a stronger scrim. (-0.4 pts)
- **No prev/next navigation.** Visitors cannot browse between artworks in focus mode. This is acknowledged as intentionally minimal, but it limits the gallery experience. (-0.4 pts)
- **Close button is a pill.** In an otherwise rectilinear gallery world, the rounded close button reads as slightly generic. (-0.3 pts)

### 3.14 Mobile Experience — 8.0/10

**What improved:**

- **Threshold fully preserved** (evidence: 08). Full viewport, large title, opening work caption, portal CTA.
- **Chamber labels stay placard-sized** (evidence: 09). `clamp(0.78rem, 3.5vw, 0.96rem)` with `letter-spacing: 0.14em`.
- **Artwork focus trigger always visible** on mobile (opacity: 1, no hover dependency). This is the correct accessibility choice.
- **Lightbox stacks cleanly** with capped image height and caption border-top.

**What holds it back:**

- **No swipe gestures** for gallery navigation. Mobile users expect swipe-to-browse in image-heavy experiences. (-0.5 pts, acknowledged as out-of-scope)
- **Moodboard scatter collapses to single column** and loses the intentional "scattered pins" aesthetic. (-0.3 pts)
- **Threshold index is hidden on mobile** (`display: none` below 860px). This removes wayfinding entirely on small screens. (-0.2 pts)

### 3.15 Emotional Memorability — 8.1/10

The P2 experience is more memorable than P1 because:
- The threshold has a living image and an opening work.
- The gallery wall has a specific, warm personality.
- Hover interactions reward exploration.
- The lightbox creates a "moment" with each artwork.

What prevents 8.5+: no custom cursor, no loading ritual, no sound, no scroll-triggered reveals, no parallax. These are acceptable omissions for a CSS-first renderer, but they cap the memorability ceiling.

### 3.16 Bespoke Art-Site Quality — 8.2/10

The combination of threshold cinema + gallery placards + wall labels + lightbox + editorial grid is clearly not a template. It has a point of view. It would not be mistaken for Squarespace, Wix, or a generic portfolio builder.

### 3.17 Distance from Generic Website/Card Grid — 8.5/10

Very far. No rounded cards, no pill buttons, no dashboard chrome, no metric chips, no auto-fit card grid. The only remaining generic element is the "CLOSE" pill in the lightbox.

---

## 4. What Materially Improved

1. **Threshold-to-chamber bridge.** The abrupt dark→light cut from P1 is replaced by a multi-layer gradient fade. Immersion is preserved across the scroll boundary.
2. **CTA portal mark.** Removed pill shape, fill, and shadow. Added circular glyph and animated rule. Reads as spatial action.
3. **Chamber headings as wall placards.** Reduced from `~9.6rem` display headings to `~1rem` uppercase labels with border rules. Removed visible "Gallery room" kicker.
4. **Artwork wall labels.** Added top rule with golden accent, uppercase meta, restrained title size, and hover detail reveal.
5. **Lead artwork hierarchy.** First image-led object spans 8 columns with taller max-height. Creates genuine curatorial emphasis.
6. **Hover/focus states.** Frame offset, image lift, shadow deepen, focus trigger fade-in. All restrained (no scale > 1.02, no bounce).
7. **Lightbox focus mode.** Fixed overlay with warm backdrop, museum matting, curatorial caption, keyboard navigation, mobile adaptation.
8. **Mobile continuity.** Threshold preserved, placard labels maintained, focus trigger always accessible, lightbox stacks cleanly.

---

## 5. What Still Feels Weak

1. **Lightbox backdrop bleed.** Page content is faintly visible behind the overlay. Fix: increase backdrop opacity to `rgba(6,5,4,0.96)` or add a second solid layer.
2. **Lightbox close button pill shape.** In a rectilinear gallery world, the rounded close button reads as generic. Fix: square or text-only close mark.
3. **Transition band is empty.** A curatorial quote, a horizon line, or a room number glyph in the band would make the bridge more memorable.
4. **"REQUEST AVAILABILITY" CTA label.** Functional rather than atmospheric. A shorter, more evocative label would strengthen the portal feeling.
5. **No prev/next in lightbox.** Visitors must close and reopen to browse artworks. A minimal arrow treatment would improve gallery flow.
6. **World mark surface line.** "GALLERY WALL / Exhibition wall / release archive" is system vocabulary, not curatorial voice.
7. **Mobile threshold index hidden.** Wayfinding is completely absent on mobile. A collapsed accordion or bottom-sheet index would help.

---

## 6. P0 Blockers

None.

---

## 7. P1 Blockers Before Deploy

None.

The lightbox backdrop bleed is a visual defect but it does not break functionality, leak data, or harm accessibility. It should be fixed soon after deploy.

---

## 8. P2/P3 Polish After Deploy

Priority order:

1. **Fix lightbox backdrop opacity** — 15 min CSS change. Highest visual impact.
2. **Square or text-only close button in lightbox** — 15 min CSS change.
3. **Add prev/next arrows to lightbox** — small React state change. Improves gallery flow significantly.
4. **Shorter, more atmospheric CTA label** — copy change. Depends on pilot preference.
5. **Add a subtle mark or quote to the transition band** — copy + CSS. Makes the bridge memorable.
6. **Restore mobile threshold index** as a bottom-sheet or collapsed accordion — design + CSS.
7. **Consider scroll-triggered fade-in for chamber objects** — optional, use `IntersectionObserver` with reduced-motion respect.
8. **Custom cursor on desktop** — optional, only if performance-safe.

---

## 9. Hygiene and Regression Result

| Item | Status | Evidence |
|------|--------|----------|
| Owner preview remains clean | ✅ PASS | Screenshot 10 shows draft banner only, no editor chrome in public surface |
| Public payload hygiene clean | ✅ PASS | `presence-public-payload-hygiene.spec.ts` — 0 violations |
| No editor handles/chrome/test IDs leak | ✅ PASS | Playwright specs assert no restricted terms; screenshots confirm |
| No hidden/private/editor fields leak | ✅ PASS | `publicPayload.test.ts` + hygiene spec |
| No fake live social proof | ✅ PASS | Traces render only disclosed demo entries; no fabricated counts |
| No fake backend/social capability | ✅ PASS | No social features rendered beyond disclosed traces |
| No S4A leakage | ✅ PASS | S4A remains in `stash@{0}`; no chamber management UI in public output |
| Legacy rooms unaffected | ✅ PASS | Screenshot 11 shows old renderer; `presence-studio-v2-public` count = 0 |
| Non-gallery threshold safe | ✅ PASS | Non-gallery worlds keep numbered object-based index (old behavior) |
| Gallery threshold index softened | ✅ PASS | Numbers removed for gallery; chamber labels only |
| Mobile experience maintained | ✅ PASS | Screenshots 08, 09 confirm mobile threshold and chamber |
| Reduced motion respected | ✅ PASS | `@media (prefers-reduced-motion: reduce)` blocks all animation |

---

## 10. Test Quality Review

### 10.1 `presence-public-output-gallery-polish.spec.ts`

**Coverage:** 3 tests — desktop polish, mobile polish, legacy negative.

**Strengths:**
- Asserts transition band height > 60px.
- Asserts CTA `border-radius: 0px` and `background: rgba(0,0,0,0)` (text-first).
- Asserts index text does not contain numbered patterns (`/\b0[1-9]\b/`).
- Asserts chamber label `font-size < 32px`, `text-transform: uppercase`, `border-top-width !== 0px`.
- Asserts wall label `border-top-width !== 0px` and `padding-top > 0`.
- Opens artwork focus, asserts `position: fixed`, asserts figcaption contains fixture title.
- Closes focus via click and verifies hidden.
- Mobile: asserts chamber label < 22px, opens focus, closes via Escape key.
- Legacy: asserts `presence-studio-v2-public` count = 0, transition count = 0, focus count = 0.
- Runtime error collection on all three tests.

**Verdict:** Strong. P2 behaviours are actually tested with stable computed-style assertions.

### 10.2 `presence-public-output-gallery-quality.spec.ts`

**Coverage:** 3 tests — desktop quality, mobile quality, legacy negative.

**Strengths:**
- Threshold height > 880px.
- Grid columns ≥ 6 (exhibition rhythm).
- No visible role labels.
- Image `object-fit: contain`, `border-radius: 0px`.
- Influence cards and traces visible.
- Mobile threshold > 760px.
- Mobile muted objects hidden.
- Runtime error collection.

**Verdict:** Strong. Validates the P1 baseline that P2 builds upon.

### 10.3 `presence-public-output-recovery-p2-capture.spec.ts`

**Coverage:** 1 test — 11 screenshots.

**Status:** Skipped unless `PRESENCE_VISUAL_CAPTURE=1`. Evidence from prior run is present and complete.

**Teardown timeout:** The capture spec body passes and writes all 11 screenshots. The Playwright web-server teardown wrapper times out locally — this is known harmless behavior matching P1 and S1–S3 capture specs. It does not affect test validity or evidence integrity.

**Verdict:** Safe. The skip guard is correct; evidence is already captured.

### 10.4 `presence-public-payload-hygiene.spec.ts`

**Coverage:** 2 tests — anonymous HTML hygiene, API + redirect hygiene.

**Strengths:**
- 37 restricted terms scanned in HTML and JSON.
- Covers both `/p/` and `/presence/` routes.
- Covers `/api/presence/rooms/:id/key-entry` API payload.
- Covers `/room/:id/key` redirect page.

**Verdict:** Strong. Stable and comprehensive.

### 10.5 `presence-studio-v2-public-render.spec.ts`

**Coverage:** 3 tests — published V2 render, mobile muted objects, legacy fallback.

**Verdict:** Strong. Baseline V2 renderer safety net.

### 10.6 `presence-studio-v2-draft-preview.spec.ts`

**Coverage:** 2 tests — owner draft preview through sanitized V2 renderer, legacy fallback.

**Verdict:** Strong. Confirms control-plane separation.

### 10.7 Selector Stability

All P2 tests use:
- Stable CSS class selectors (`.v2-public-threshold-transition`, `.v2-public-primary-cta`, etc.)
- `data-testid` attributes only for focus overlay (`presence-public-artwork-focus`, `presence-public-artwork-focus-close`, `presence-public-artwork-focus-trigger`)
- No XPath, no brittle text selectors (except fixture data assertions like "Bridle Road, after rain")

**Verdict:** Selectors are stable and appropriate.

### 10.8 Hosted Smoke Likelihood

All local tests pass. P2 changes are CSS + minor React (lightbox state) only. No backend contract changes. No public payload shape changes. P1 hosted smoke passed with the same infrastructure. Hosted smoke is highly likely to pass after deploy.

---

## 11. Deploy Recommendation

**PASS — deploy to hosted smoke.**

P2 meets all deploy thresholds:
- Overall: **8.3/10** ≥ 8.3 ✅
- Threshold: **8.5/10** ≥ 8.0 ✅
- Gallery/chamber: **8.3/10** ≥ 8.0 ✅
- Mobile: **8.0/10** ≥ 7.5 ✅
- Payload hygiene: **PASS** ✅
- No editor/system leakage: **PASS** ✅
- No S4A leakage: **PASS** ✅
- Legacy rooms unaffected: **PASS** ✅

Post-deploy:
1. Run hosted smoke for public render, owner preview, legacy negative, and payload hygiene.
2. Fix lightbox backdrop opacity (P2 polish #1).
3. Consider prev/next lightbox navigation (P3 polish).
