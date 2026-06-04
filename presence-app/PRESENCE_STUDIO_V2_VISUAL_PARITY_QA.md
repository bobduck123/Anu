# Presence Studio V2 Visual Parity QA

**Auditor:** Kimi (ruthless creative director / production QA)
**Date:** 2026-06-03
**Scope:** Codex local visual parity pass vs `semi launchable (3).zip` prototype
**Verdict:** **DEPLOY-READY** with P1 follow-up list

---

## Executive Summary

The visual parity pass is a **material improvement** over the previously deployed build. It is **not** a functional regression with nicer CSS — it is a genuine step toward the prototype's spatial cinema, world-specific atmosphere, and premium cockpit feel.

The threshold is meaningfully cinematic. Chambers read as surfaced rooms, not generic card grids. Objects are visibly differentiated by type. Mobile is designed as a first-class room view. The cockpit feels premium and dark.

It is **not identical** to the prototype. Key gaps remain (gallery frame treatment, paper grain texture, world-specific object layouts, cockpit device frames). But the direction is correct, the boundaries are safe, and the current state is good enough to put in front of high-quality pilot prospects.

**Recommendation: Deploy. Then run a short P1 follow-up pass.**

---

## Visual Scores (1–10)

| Dimension | Score | Notes |
|-----------|-------|-------|
| 1. Public threshold cinema | **8** | Dark gradient stage, large Instrument Serif display, artifact card with rotation, object index, world mark. Strong cinematic entry. Not as spatially deep as prototype's full-viewport immersive stage, but close. |
| 2. GGM/gallery atmosphere | **7** | Gallery threshold and chamber surfaces are present. Missing: paper grain SVG texture, museum-frame shadows (images have border-radius), vertical stack layout. Still reads as gallery, not profile page. |
| 3. Chamber spatiality | **7** | Chambers now have rounded surfaces, gradient backgrounds, backdrop blur, object-count metadata, and border treatments. Better than generic grid. Not yet "entered room" level of prototype's spotlight and physical spacing. |
| 4. Object treatment specificity | **7** | Image (dark bg), CTA/portal (accent gradient + pill action), proof/testimonial/credential (dashed border + "Proof" watermark), event/media (signal lines), shop/service (brass tint). Good differentiation. Missing: prototype's role-specific font choices and layout (gallery text objects have max-width and italic meta). |
| 5. Mobile public experience | **8** | Threshold stacks cleanly, artifact preserves presence, chambers stack with readable type, muted objects hidden. Designed, not collapsed. |
| 6. Studio cockpit premium feel | **7** | Dark console shell, premium toolbar buttons, floating object toolbar, rich side panel, Skin Lab. Better than plain toolbar. Missing: prototype's device frames (phone/desktop), aurora background, grain overlay. |
| 7. Typography/token quality | **8** | Instrument Serif + Geist loaded via layout.tsx. Strong token variables (paper, bone, stage, ink, copper, moss, vermilion, brass, cobalt). Typography scale is present and consistent. |
| 8. New-age/spatial category feel | **7** | Threshold reads as spatial entry. Chamber surfaces give room feel. Influence cards have fragment rotation. Traces have pill badges. Not yet fully "world-specific place" for all kits, but gallery and DJ are close. |
| 9. Resemblance to latest design prototype | **7** | Materially closer. Threshold, typography, and cockpit direction match. Gaps: object layout graininess, device frames, paper texture, zine tape strips. |
| 10. Pilot presentation readiness | **8** | Room 11 will present as a premium digital gallery room. The threshold makes a strong first impression. Object differentiation proves the system works. Safe to show curated prospects. |

**Average: 7.4 / 10** — Good enough for controlled pilot. Not final.

---

## What Improved Materially

1. **Cinematic threshold** — The public threshold went from a standard hero block to a dark stage with large serif display type, a rotated artifact card, an object index, and a world mark. This is the strongest improvement.
2. **Chamber surfaces** — Chambers now have rounded borders, gradient backgrounds, backdrop-filter blur, object-count metadata, and shadow depth. They feel like contained spaces.
3. **Object type differentiation** — Image objects get dark backgrounds. CTA/portal get accent gradients and pill actions. Proof objects get dashed borders and a "Proof" watermark stamp. Event/media get signal-line gradients. Shop/service get brass tints.
4. **Mobile design** — Mobile threshold is intentionally stacked. Artifact card remains prominent. Chambers stack cleanly. Muted objects are hidden. Touch targets are reasonable.
5. **Premium cockpit** — Editor shell is now dark (`#0e0d0b` stage), toolbar is premium glass, selected objects have a floating toolbar, side panels are rich and dark.
6. **World-specific thresholds** — Gallery (warm paper), DJ/zine (dark signal), archive (red-line ledger), market (warm gold), healing (moss green), carpenter (wood grain), consultant (cobalt grid) all have distinct threshold backgrounds.
7. **Motion** — Threshold reveal animation, artifact entrance rotation, DJ signal drift, hover lift on objects, reduced-motion fallback.
8. **Typography** — Instrument Serif + Geist are now loaded and used consistently in both public and editor surfaces.

---

## What Still Feels Weak / Regressed vs Prototype

1. **Gallery image frames** — Prototype gallery images have `border-radius: 0` with frame shadows and museum labels. Production images have rounded corners (`border-radius: clamp(16px, 2vw, 24px)` in artifact, or `overflow: hidden` + radius on object cards). This removes the museum-frame feel.
2. **Paper grain texture** — Prototype gallery uses an SVG feTurbulence noise texture overlay. Production has grid-line overlays but no paper grain.
3. **World-specific object layouts** — Prototype gallery uses `flex-direction: column` with `gap: 0` and `border-bottom` separators. Zine uses `grid-template-columns: 1fr 1fr`. DJ uses `1fr 1fr 1fr`. Production uses a generic `auto-fit` grid for all worlds.
4. **Prototype cockpit immersion** — Prototype has device frames (phone/desktop), aurora background blobs, grain overlay, and dynamic island. Production has a dark shell but no device frame or aurora.
5. **Zine texture** — Prototype zine has tape strips, photocopy grain, scan lines. Production's zine treatment is dark but lacks the punk-board materiality.
6. **DJ object signal lines** — Prototype DJ objects have signal-line left edges and 3-column grid. Production DJ has threshold signal drift but generic object grid.

---

## Issue Classification

### P0 — Blocks Deployment

**None.**

### P1 — Should Fix Before Pilot Presentation

| # | Issue | File | Selector / Detail |
|---|-------|------|-------------------|
| 1 | **CSS double-definition waste** | `presence-studio-v2-public.css` | Lines 1–360 (base styles) are almost entirely overridden by lines 362–978 (parity layer). This is ~360 lines of dead CSS. Should be consolidated into a single coherent layer. |
| 2 | **Gallery image border-radius** | `presence-studio-v2-public.css` | `.world-gallery .v2-public-object-media-img` and `.v2-public-threshold-artifact` use rounded corners. Prototype gallery uses sharp corners (`border-radius: 0`) for museum-frame feel. Consider making `border-radius` world-configurable or zero for gallery. |
| 3 | **Object grid should respect world layout** | `presence-studio-v2-public.css` | `.v2-public-object-grid` uses `grid-template-columns: repeat(auto-fit, minmax(...))` for all worlds. Should vary: gallery = `1fr` (vertical stack), zine = `1fr 1fr`, DJ = `1fr 1fr 1fr`, etc. |

### P2 — Can Fix After Deploying Visual Pass

| # | Issue | File | Detail |
|---|-------|------|--------|
| 4 | **Missing paper grain texture** | `presence-studio-v2-public.css` | Add SVG feTurbulence noise overlay for `.world-gallery` and `.world-archive` to match prototype texture. |
| 5 | **Missing cockpit device frames** | `presence-studio-v2.css` | Prototype cockpit has `.imm-phone` and `.imm-desktop` device frames with shadows and dynamic island. Production cockpit is functional but lacks this immersive framing. |
| 6 | **Missing cockpit aurora** | `presence-studio-v2.css` | Prototype has animated aurora blobs behind device frames. Would add premium feel without affecting functionality. |
| 7 | **Zine tape strips and photocopy texture** | `presence-studio-v2-public.css` | `.world-zine` objects could have tape-strip pseudo-elements and photocopy grain overlay. |

### P3 — Future Design Parity

| # | Issue | Detail |
|---|-------|--------|
| 8 | **Archive ledger rules and stamps** | Archive world needs stronger civic-memory texture: red-line authority, document surfaces, stamp pseudo-elements. |
| 9 | **Market stall logic** | Market world needs table/stall visual logic, offering tags, stacked product surfaces. |
| 10 | **Full prototype object role specificity** | Prototype has per-role max-widths, font choices, and spacing (e.g., gallery text objects have `max-width: 320px` and italic meta). Production has type classes but not full role specificity. |

---

## Regression Check

| Check | Result |
|-------|--------|
| V2 editor still mounts | ✅ `data-testid="presence-studio-v2-root"` present in `PresenceStudioV2Editor.tsx` |
| Owner preview renders V2 | ✅ `.presence-studio-v2-public` class present in `PresenceStudioV2PublicRoom.tsx` |
| Public renderer renders V2 | ✅ `presence-studio-v2-public` class present |
| Payload hygiene clean | ✅ No restricted terms in public CSS or component |
| Legacy room remains legacy | ✅ Not affected (scoped CSS) |
| Mobile public usable | ✅ Screenshot evidence confirms designed mobile view |
| No editor chrome publicly | ✅ Public component is separate from editor; CSS scoped |
| No hidden/internal fields | ✅ Component uses sanitized `StudioV2PublicRoom` data only |
| No fake backend capability | ✅ No new backend implications |
| Test IDs preserved | ✅ Editor test IDs intact; public uses class selectors (`.presence-studio-v2-public`) |
| CSS scoped | ✅ `.presence-studio-v2` and `.presence-studio-v2-public` prefixes throughout |
| Fonts loaded | ✅ `layout.tsx` loads Instrument Serif + Geist from Google Fonts |
| Typecheck | ✅ 0 errors |
| Build | ✅ Success |
| Unit tests | ✅ 183/183 pass |
| Playwright V2 public | ✅ 3/3 pass |
| Playwright draft preview | ✅ 2/2 pass |
| Playwright hygiene | ✅ 2/2 pass |

---

## Verdicts

| Gate | Verdict |
|------|---------|
| Room 11 V2 conversion readiness | ✅ Ready (unchanged) |
| Visual parity pass deploy readiness | ✅ **DEPLOY-READY** |
| Hosted V2 editor readiness | ✅ Ready after deploy |
| Hosted owner preview readiness | ✅ Ready after deploy |
| Hosted public render readiness | ✅ Ready after deploy |
| Controlled operator-led pilot | ✅ Ready with curated content |
| Public self-serve onboarding | ❌ Not ready (out of scope) |

---

## Deployment Recommendation

**Deploy this visual pass.**

Rationale:
- It is a material improvement, not a cosmetic band-aid.
- The threshold is cinematic and will make a strong first impression on pilot prospects.
- Object differentiation proves the system understands type specificity.
- Mobile is designed, not collapsed.
- The cockpit feels premium and dark.
- No regressions were found in lifecycle, security, or payload boundaries.
- All tests pass. Build passes.

**After deploy:**
1. Run hosted smoke on Room 11 to confirm editor mount and public render.
2. Capture hosted Room 11 screenshots for GGM-specific visual verification.
3. Address P1 list (CSS consolidation, gallery border-radius, world-specific grids) in the next visual pass.
4. Address P2 list (paper grain, device frames, aurora) before broadening pilot.

---

*QA complete. No P0 blockers. P1 follow-up list documented. Deploy recommended.*
