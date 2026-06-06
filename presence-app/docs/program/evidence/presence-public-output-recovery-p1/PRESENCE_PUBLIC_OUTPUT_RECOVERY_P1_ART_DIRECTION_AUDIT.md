# Presence Public Output Recovery — P1 Art-Direction Audit

**Date:** 2025-06-07
**Auditor:** Kimi Code CLI (agent-led evidence review)
**Scope:** V2 public room renderer — gallery worlds only (S4A stashed, legacy rooms excluded)
**Benchmark:** `bbbvision.vercel.app` (local reference at `/Dev/bbb-vision-site/`)
**Evidence:** 10 screenshots in this directory (01–10)
**Deploy Floor:** Overall ≥ 7.5/10, all individual thresholds ≥ 7.0/10

---

## 1. Executive Verdict

| Criterion | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Threshold Cinema | 8.0 | 25% | 2.00 |
| Gallery Atmosphere | 7.5 | 25% | 1.875 |
| Object / Image Treatment | 8.0 | 20% | 1.600 |
| Mobile Experience | 7.0 | 15% | 1.050 |
| Emotional Memorability | 7.0 | 15% | 1.050 |
| **Overall** | **—** | **100%** | **7.575 ≈ 7.6** |

**VERDICT: MEETS DEPLOY FLOOR (7.6/10 ≥ 7.5/10).** All individual category thresholds also clear 7.0/10.

The P1 pass transforms the public output from a generic content card wall into a credible gallery-exhibition experience. The full-viewport atmospheric threshold, museum-frame image treatment, and 12-column editorial grid are the three strongest improvements. What holds the score back from 8.0+ is residual generic UI chrome (numbered index, pill CTA, section headings) and the absence of transition continuity and micro-interactions that would make the experience unforgettable.

**Recommendation:** Deploy P1 as-is. Schedule P2 for threshold-to-chamber transitions, CTA portal refinement, and curatorial hierarchy.

---

## 2. Category Breakdown

### 2.1 Threshold Cinema — 8.0/10

**What lifts the score:**

- **Full-viewport image field** (evidence: 01, 07). The threshold object image renders edge-to-edge with a controlled dark gradient overlay (`rgba(0,0,0,0.2) → rgba(0,0,0,0.72)`). This creates genuine atmospheric depth — the visitor enters through an image, not a description.
- **Editorial typography** (evidence: 01). The room title is large, white, high-contrast serif against the atmospheric background. It reads as exhibition signage, not a webpage heading.
- **Spatial CTA placement** (evidence: 04). The primary CTA is positioned low-right in the threshold zone, reading as a portal mark rather than a generic button.
- **Owner preview gate** (evidence: 09). The "DRAFT PREVIEW — ONLY YOU CAN SEE THIS" banner is clearly separated from the public surface, confirming control-plane hygiene.

**What holds it back:**

- **"ENTRY WORK" label** (evidence: 01, 04). The small uppercase label above the threshold caption is metadata chrome. It reads as CMS output, not curatorial voice. (-0.5 pts)
- **Numbered chamber index** (evidence: 01). The "01 / 02 / 03" numbered list in the threshold feels like a table of contents or navigation pattern, not an exhibition curation. It breaks the atmospheric immersion. (-0.5 pts)
- **CTA pill border** (evidence: 04). The CTA retains a pill shape with visible border. A true portal mark would be subtler — perhaps a thin underline, a glyph, or text-only treatment. (-0.5 pts)
- **Abrupt threshold-to-chamber transition** (evidence: 01 → 02). The shift from dark atmospheric threshold to light beige gallery wall has no visual bridge (no shared element, no fade, no scroll cue). The two zones feel like separate pages. (-0.5 pts)

**bbbvision comparison:** bbbvision uses a canvas/WebGL distortion field, custom cursor, and loading counter to create obsessive craft. P1 intentionally avoids canvas effects, which is correct — but the threshold could still gain transition continuity without adding technical weight.

---

### 2.2 Gallery Atmosphere — 7.5/10

**What lifts the score:**

- **12-column editorial grid** (evidence: 02, 03, 05). The gallery chamber uses `grid-template-columns: repeat(12, 1fr)` with objects spanning 3–8 columns depending on type and position. This creates exhibition-wall rhythm rather than a uniform card wall.
- **Museum-frame image treatment** (evidence: 03). Images use `object-fit: contain`, `border-radius: 0`, and a warm background (`#f8f4ec`). This is a deliberate, dignified frame — the image is presented, not cropped into a container.
- **Scattered moodboard** (evidence: 05). Moodboard objects receive rotation offsets and varied positioning, creating a physical-pinboard feel rather than a grid-aligned card set.
- **Warm beige gallery wall** (evidence: 02, 03, 05). The `#ebe3d5` background color reads as gallery plaster, not generic SaaS off-white. Combined with the museum frames, it establishes spatial credibility.
- **Suppressed role labels** (evidence: 02, 03). Generic role labels (`image`, `text`, `note`, `link`) are hidden in gallery contexts via `publicObjectRoleLabel()`. This removes CMS chrome from the public surface.

**What holds it back:**

- **"Current Works" heading** (evidence: 01→02 transition). The large heading between threshold and gallery is generic website copy. An exhibition would use a wall label, a floor plan reference, or simply let the work speak. (-0.5 pts)
- **Chamber titles as section headings** (evidence: 02). Chamber titles render as large bold text with heavy borders, feeling like webpage sections rather than gallery room names. A subtler treatment — smaller, possibly italic, possibly with a rule line — would read as curatorial. (-0.5 pts)
- **No wall labels or curatorial hierarchy** (evidence: 02, 03). All artworks receive equal visual weight. There's no distinction between a featured piece and a supporting work. No artist name, year, medium, or dimensions appear as wall labels would provide. (-0.5 pts)
- **Object arrangement still feels somewhat programmatic** (evidence: 02). While the 12-column grid is editorial, the specific placement of objects within it doesn't yet feel hand-curated. This is acceptable at P1 but limits the score. (-0.5 pts)

---

### 2.3 Object / Image Treatment — 8.0/10

**What lifts the score:**

- **Object-fit contain** preserves image integrity. No faces cropped, no artwork edges clipped. (evidence: 03)
- **Zero border-radius** removes the default "card" aesthetic. Images read as framed prints, not social-media tiles. (evidence: 03)
- **Warm frame background (`#f8f4ec`)** complements typical artwork color temperatures and creates visible matting for images with transparent or light edges. (evidence: 03)
- **Varied grid spans** give natural hierarchy: larger works span more columns, smaller works sit in narrower frames. (evidence: 02, 03)
- **Moodboard distinct treatment** separates influence-layer images from gallery artworks through rotation, offset, and scattered positioning. (evidence: 05)

**What holds it back:**

- **No zoom / lightbox** for detailed artwork viewing. The visitor cannot inspect texture, brushwork, or fine detail. This is a significant gap for a gallery experience. (-0.5 pts)
- **No wall-label aesthetic** for captions. Object titles/descriptions appear inline but without the typographic restraint of a gallery label (small, aligned, possibly with a rule). (-0.5 pts)
- **Aspect-ratio handling** uses `aspect-ratio: auto` which can lead to uneven frame heights in the grid, creating a slightly ragged gallery wall. This is arguably authentic to real galleries but can feel unintentional. (-0.5 pts, partially offset by the authentic feel)

---

### 2.4 Mobile Experience — 7.0/10

**What lifts the score:**

- **Full-viewport threshold on mobile** (evidence: 07). The threshold image fills the mobile viewport with the same atmospheric overlay and large typography. No degradation from desktop.
- **Readable text sizes** at mobile scale. The title, caption, and CTA remain legible without excessive zoom. (evidence: 07)
- **Tappable CTA** with adequate touch target size. (evidence: 07)
- **Grid adapts** to narrower viewport. The 12-column grid compresses but maintains exhibition rhythm rather than collapsing to a single card stack. (evidence: 08)
- **No horizontal scroll** or overflow issues detected. (evidence: 07, 08)

**What holds it back:**

- **Threshold-to-chamber transition is more abrupt on mobile** because there's less vertical space to absorb the shift. The user scrolls past the threshold and immediately hits the gallery wall with no buffer. (-0.5 pts)
- **Moodboard scatter may feel random on narrow screens** where fewer objects are visible at once. The intentional "scattered pins" aesthetic can read as "messy layout" on mobile. (-0.5 pts)
- **Some metadata still visible** (e.g., "ENTRY WORK" label) that consumes precious mobile vertical space. (-0.5 pts)
- **No swipe gestures** for gallery navigation. Mobile users expect swipe-to-browse in image-heavy experiences. (-0.5 pts, acknowledged as out-of-scope for P1)

---

### 2.5 Emotional Memorability — 7.0/10

**What lifts the score:**

- **Atmospheric threshold creates a first impression**. The full-bleed tree image with dark overlay and large white title is the strongest memory anchor. A visitor would recall "the tree room" or "the dark entry." (evidence: 01)
- **Gallery wall color and frame treatment are distinctive**. The warm beige + museum-frame combination is not a common SaaS pattern. It has a specific, restrained personality. (evidence: 02, 03)
- **Editorial typography** (large serif title, small uppercase labels) gives the experience a voice that is more *Kinfolk* than *Squarespace*. (evidence: 01, 02)

**What holds it back:**

- **No micro-interactions or hover states**. Images don't respond to cursor presence. The CTA doesn't shift on hover. There's no subtle animation or feedback loop that rewards exploration. (-1.0 pts)
- **Residual generic elements**: numbered index, pill CTA, "Current Works" heading, chamber titles as section headers. These are functional but not memorable. They dilute the atmospheric gains. (-1.0 pts)
- **No transition moments or reveal animations**. Elements appear instantly as the user scrolls. A slow fade, a parallax shift, or a staggered grid reveal would create temporal memory. (-0.5 pts)
- **Compared to bbbvision, lacks obsessive craft details**. bbbvision has: custom cursor, canvas distortion, loading counter, brand mark repositioning on scroll, footer detail lines, and hover-state image zoom. Each of these is a small touch that compounds into an unforgettable whole. P1 has the structural bones but not the obsessive surface polish. (-0.5 pts)

**Note:** The bbbvision comparison is used as a benchmark for "what 9/10 feels like," not as a target to copy. P1 deliberately avoids canvas/WebGL for simplicity and performance. The memorability gap is acceptable at this phase but should be addressed in P2 through CSS transitions, hover states, and threshold continuity.

---

## 3. Evidence Reference

| # | File | What It Proves |
|---|------|----------------|
| 01 | `01-gallery-threshold-desktop.png` | Full-viewport atmospheric threshold with image field, overlay, large title, and spatial CTA |
| 02 | `02-gallery-chamber-desktop.png` | 12-column editorial grid, museum-frame images, hidden role labels, beige gallery wall |
| 03 | `03-artwork-image-treatment.png` | Object-fit contain, zero border-radius, warm background, varied grid spans |
| 04 | `04-threshold-cta-portal-treatment.png` | CTA positioned as portal mark; ENTRY WORK label visible as metadata chrome |
| 05 | `05-moodboard-influence-layer.png` | Scattered moodboard with rotation/offset, distinct from gallery grid |
| 06 | `06-traces-residue-treatment.png` | Quiet trace residue, no pill/chip aesthetics, marginal placement |
| 07 | `07-gallery-mobile-threshold.png` | Full-viewport threshold preserved on mobile, readable text, tappable CTA |
| 08 | `08-gallery-mobile-chamber.png` | Grid adapts to mobile viewport, chamber objects remain readable |
| 09 | `09-owner-preview-clean.png` | Editor chrome properly gated behind draft-preview banner |
| 10 | `10-legacy-negative.png` | Legacy rooms render through old renderer, no P1 regression |

---

## 4. Regression Checklist

| Item | Status | Evidence |
|------|--------|----------|
| Legacy rooms unaffected | ✅ PASS | Screenshot 10 shows old renderer, old layout, no P1 CSS applied |
| Owner preview still gated | ✅ PASS | Screenshot 9 shows "DRAFT PREVIEW" banner, "Back to editor" button |
| Non-gallery worlds not broken | ✅ PASS | Gallery-specific CSS scoped under `.world-gallery` |
| S4A chamber management excluded | ✅ PASS | S4A stashed; no chamber delete button in public output |
| No editor terms in public HTML | ✅ PASS | QA spec asserts no restricted terms; screenshots confirm |
| No object counts visible | ✅ PASS | Screenshots show no "3 objects held here" text |
| No hidden fields leaked | ✅ PASS | Public output shows only title, description, image, CTA, objects |
| Mobile threshold > 760px | ✅ PASS | Screenshot 7 confirms full mobile viewport usage |
| Desktop threshold > 880px | ✅ PASS | Screenshot 1 confirms full desktop viewport usage |

---

## 5. What P2 Should Address

In priority order for the next art-direction pass:

1. **Threshold-to-chamber transition continuity.** Add a visual bridge: either a shared element that morphs, a color gradient that spans the boundary, or a scroll-triggered fade. The current abrupt shift from dark to light is the biggest immersion break.

2. **CTA portal refinement.** Replace the pill button with a thinner, more atmospheric treatment: text-only with a subtle underline, a small glyph (→ or ↓), or a line that draws attention without reading as a web form CTA.

3. **Remove or soften the numbered chamber index.** The "01 / 02 / 03" list in the threshold is navigation chrome, not curation. Consider: removing numbers entirely, using chamber titles only, or collapsing into a minimal line.

4. **Chamber title and "Current Works" heading treatment.** Reduce heading weight. Use smaller, possibly italic typography. Add a thin rule line. Make chamber titles feel like gallery room labels, not webpage H2s.

5. **Wall-label aesthetic for artworks.** Add small, aligned captions below images with artist name, title, year, medium — styled as museum wall labels (small, uppercase, with a thin rule).

6. **Hover states and micro-interactions.** Image scale on hover (subtle, 1.02×), CTA underline animation, chamber card lift. These create the "obsessive craft" feeling without canvas complexity.

7. **Image zoom / lightbox.** Allow visitors to inspect artwork detail. This is table stakes for a gallery experience.

8. **Curatorial hierarchy.** Distinguish featured works from supporting works through size, placement, or a "featured" marker. Not all works are equal in a real exhibition.

---

## 6. QA Status

| Suite | Result | Details |
|-------|--------|---------|
| Typecheck | ✅ PASS | `npm run typecheck` — 0 errors |
| Build | ✅ PASS | `npm run build` — 0 errors, 0 warnings |
| Unit tests | ✅ PASS | 40/40 passed |
| Playwright E2E | ✅ PASS | 13/13 specs passed (including new gallery-quality spec) |
| S4A safety audit | ✅ PASS | 21/21 unit tests, 21/21 Playwright E2E |
| Art-direction audit | ✅ PASS | 7.6/10 overall, meets 7.5 deploy floor |

---

## 7. Deploy Recommendation

**DEPLOY P1.**

The public output has crossed the threshold from "embarrassing to share" to "credible gallery experience." The atmospheric entry, museum-frame treatment, and editorial grid establish a genuine aesthetic identity. The residual issues (numbered index, pill CTA, abrupt transitions) are real but do not prevent public sharing. They are P2 polish items.

Post-deploy monitoring:
- Track bounce rate on threshold vs. scroll depth into chambers.
- Gather artist feedback on whether the gallery feels like "their" space.
- Monitor mobile share rate — if artists are sharing their room links on mobile, the mobile experience is validated.
