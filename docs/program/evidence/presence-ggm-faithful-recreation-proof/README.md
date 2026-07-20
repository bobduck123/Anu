# GGM Faithful Recreation — Evidence Pack

Date: 2026-05-23
Renderer key: `ggm-faithful-room-v1` (single GGM Room across v1 → v2 → v3)
Pilot: GGM (Christina Kerkvliet Goddard)
Canonical slug: `ggm-christina-goddard`
Latest pass: **v5 — Scene 1 slideshow + scrollable wall + arrows-only nav**
Verdict: **GO for visual fidelity gate. NO-GO for full pilot launch
pending hosted auth + RoomKey smoke (see §10).**

## Evidence files (read in this order)

1. `CLAUDE_SOURCE_REVIEW.md` — source-site immersion review (v1).
2. `CURRENT_GGM_FAILURE_REVIEW.md` — pre-renderer audit (v1).
3. `GGM_STYLE_DNA.md` + `ggm_style_dna.json` — pre-existing style DNA fixtures.
4. `GGM_VISUAL_GAP_REPORT.md` — pre-existing gap report.
5. `V2_UPGRADE_REVIEW.md` — v2 (block model) changes.
6. `MOTION_REFERENCE_REVIEW.md` — v3 motion-grammar study + porting strategy.
7. `MOTION_SETTINGS_NOTES.md` — v3 motion settings dropdown notes.
8. `STYLE_DNA_SYSTEMIC_NOTES.md` — v3 reusable-pattern notes.
9. `AUTH_OWNER_REGRESSION_NOTES.md` — auth / owner regression notes.
10. `VISUAL_FIDELITY_REVIEW.md` — full scorecard across v1 → v2 → v3.
11. `CUSTOM_PRESENCE_STYLE_DNA.md` — v2 reusable pattern doc (superseded by `STYLE_DNA_SYSTEMIC_NOTES.md`).
12. `SCENE_NAVIGATION_REDESIGN.md` — v4 UX-reset rationale (this pass).
13. `screenshots/` — pairs of source-vs-Presence + v2 blocks + v3 scenes + **v4 minimal**.

---

## 1. Summary

This pack records the faithful recreation of the GGM source site
(`https://christina-goddard.vercel.app/` and `C:\Dev\ggm`) as a custom
Presence Room renderer keyed by `ggm-faithful-room-v1`. The previous
generic gallery/blueprint surface has been replaced with a dedicated
GGM-only renderer that activates ONLY for the GGM pilot Room and leaves
every other Presence Room on its existing renderer chain.

The faithful Room reproduces:

- The full-viewport artwork stage (slideshow + parallax + atmospheric
  liquid bloom + dither film grain + bottom liquid UI + counter).
- The mix-blend-difference nav.
- The exact source palette (`#f4f4f4` / `#eceae7` / `#111` / muted /
  hairlines at 0.12 opacity).
- Source typography rhythm (tight tracking, low weight, uppercase
  eyebrows at 0.12em tracking) — Haffer XH is unavailable, fallback is
  Inter Tight.
- Source layout (`min(1200px, 92vw)` container, 1px hairline section
  dividers, 4-up featured strip, two-column intro, three-column work
  story triptych, paper-card framed work-detail hero with
  `object-fit: contain`, animated inspiration board marquee, etc.).
- All 8 source artworks with verbatim title / year / medium /
  dimensions / description / context / process / memory / moodTags.
- The serendipity-pathway panel, working-path timeline, 4 strand cards,
  and 6-card inspire board.
- Reduced-motion fallback (canvas dither + reveal animations + marquee
  all disabled when `prefers-reduced-motion: reduce`).
- Mobile-faithful collapse (4-up → 2-up → 1-up; nav compressions;
  counter hidden ≤700px).

Presence-native functions are integrated quietly:

- `PublicEnquiryDialog` rendered inline in the contact card with the
  GGM paper-pill button style.
- `PresenceGraphActions` (save / signal / mood-board / field-note) in
  a re-themed `presenceActionLayer` at the bottom, using the GGM paper
  palette via local `--room-*` overrides.
- RoomKey entry (`/r/[token]`) dispatches to the faithful Room with
  an "Opened via NFC" paper chip when the resolved Room is GGM.
- Pilot/beta gallery card shows the Willow of Port Arthur artwork as
  cover with a "First pilot" pill.

---

## 2. Source site reviewed

- Local source: `C:\Dev\ggm` — fully inspected. Routes, components,
  design system, assets, typography, motion, atmosphere documented in
  `CLAUDE_SOURCE_REVIEW.md`.
- Specific files read: `index.html`, `about/index.html`, `work/index.html`,
  `work/willow-of-port-arthur-2019/index.html`, `data/artist.json`,
  `data/works.json`, `styles/global.css`, `styles/home.css`,
  `styles/pages.css`, `styles/work-detail.css`.

## 3. Live demo reviewed

- Live demo: `https://christina-goddard.vercel.app/`
- Inspected via WebFetch summary + Playwright screenshot captures at
  desktop (1440x900) and mobile (390x844) viewports.
- The home page deliberately holds visitors on an Osmo loading dither
  for ~10s before resolving to the artwork-first slideshow. This
  loader is not part of the Presence Room (vendor code is not
  redistributable; see §8 limitations).
- Source screenshots saved as
  `screenshots/source-ggm-{home,home-late,work,about}-{desktop,mobile}.png`.

## 4. What was wrong with the old Presence GGM Room

See `CURRENT_GGM_FAILURE_REVIEW.md` for the full failure audit. Summary:

- The previous Room dispatched through the generic `PresenceDnaRenderer`
  → `GalleryRoom` chamber-graph (forward / left / right / back
  navigation), losing the source's scroll narrative.
- Hero was a generic Threshold tile instead of the full-viewport
  artwork stage.
- Palette was `gallery_white` adjacent but not the GGM paper system.
- Typography defaulted to theme genome (Georgia serif fallback in some
  paths) instead of editorial sans.
- Cards used heavy rounded chrome + shadows; artworks were cropped
  destructively into portrait/square tiles.
- No memory-prompt overlay, no inspire board, no working-path
  timeline.
- The RoomKey entry surface stayed on the stone-950 + orange-300
  default for every Room including GGM.
- The gallery card used backend cover/profile fallbacks that did not
  surface artwork on local/demo environments.

## 5. What was recreated

| Surface | Recreated | Component |
|---|---|---|
| Full-viewport artwork hero with parallax + liquid + dither | ✓ | `GgmHero` + `GgmAtmosphere` |
| Mix-blend-difference fixed nav | ✓ | `FaithfulRoomShell` inside `GgmFaithfulRoom` |
| Practice intro 2-column | ✓ | `GgmFaithfulRoom` home section |
| 4-up featured strip | ✓ | `GgmFaithfulRoom` |
| Work index (year filters + grid/list + serendipity pathway) | ✓ | `GgmWorkIndex` |
| Work detail (paper hero + memory prompt + Context/Process/Memory triptych + statement + related) | ✓ | `GgmWorkDetail` |
| About: practice note, working-path timeline, 4 strand cards | ✓ | `GgmFaithfulRoom` about sections |
| Inspire board marquee | ✓ | `GgmFaithfulRoom` inspire section |
| Contact with Presence enquiry | ✓ | `GgmFaithfulRoom` contact section |
| Reveal-on-scroll | ✓ | `GgmReveal` |
| Reduced-motion fallback | ✓ | `ggm.module.css` @media block |
| Mobile collapse | ✓ | `ggm.module.css` ≤920 / ≤700 blocks |
| Presence-native action layer (paper-themed) | ✓ | `presenceActionLayer` section + `--room-*` overrides |
| RoomKey "Opened via" chip in paper palette | ✓ | `roomKeyChip` + `RoomKeyEntry` dispatch |
| Beta-gallery faithful card | ✓ | `app/gallery/page.tsx` enhancements |

## 6. Files changed

**Created:**

- `presence-app/lib/presence/ggm/source.ts` — canonical content fixtures
  (artist + 8 works + featured + hero sequence + inspire + strands).
- `presence-app/lib/presence/ggm/activate.ts` — renderer-key resolution
  with metadata-first + signature fallback.
- `presence-app/components/presence/ggm/ggm.module.css` — scoped GGM
  styles.
- `presence-app/components/presence/ggm/GgmAtmosphere.tsx` — liquid +
  dither layers (Presence-safe substitute for Three.js morph).
- `presence-app/components/presence/ggm/GgmReveal.tsx` — reveal-on-scroll.
- `presence-app/components/presence/ggm/GgmHero.tsx` — artwork-first
  hero stage.
- `presence-app/components/presence/ggm/GgmWorkIndex.tsx` — work index
  with year filters + grid/list + serendipity pathway.
- `presence-app/components/presence/ggm/GgmWorkDetail.tsx` — work detail
  with memory prompt + story triptych + related grid.
- `presence-app/components/presence/ggm/GgmFaithfulRoom.tsx` — top-level
  faithful Room component.
- `presence-app/scripts/capture-ggm-screenshots.mjs` — visual parity
  capture harness.
- `presence-app/public/ggm/works/*.webp` — 8 artwork images.
- `presence-app/public/ggm/thumbs/*.webp` — 8 thumbnails.
- `presence-app/public/ggm/portrait/christina-kerkvliet-goddard-portrait.webp`.

**Edited:**

- `presence-app/components/presence/PresenceDnaRenderer.tsx` — added
  custom-renderer dispatch after DNA plan resolution; only fires when
  `resolveCustomRendererKey(node) === GGM_RENDERER_KEY`.
- `presence-app/components/presence/graph/RoomKeyEntry.tsx` — added GGM
  dispatch after loader/error returns.
- `presence-app/app/(public)/p/[slug]/works/[workId]/page.tsx` — added
  GGM faithful detail dispatch + backend-missing fallback.
- `presence-app/app/gallery/page.tsx` — non-destructive GGM card
  enhancement + synth fallback when backend lacks the pilot Room.
- `presence-app/lib/presence/demo/profiles.ts` — added `ggm` demo
  profile with `metadata.custom_presence.style_dna.renderer_key`.

**Evidence:**

- `docs/program/evidence/presence-ggm-faithful-recreation-proof/CLAUDE_SOURCE_REVIEW.md`
- `docs/program/evidence/presence-ggm-faithful-recreation-proof/CURRENT_GGM_FAILURE_REVIEW.md`
- `docs/program/evidence/presence-ggm-faithful-recreation-proof/VISUAL_FIDELITY_REVIEW.md`
- `docs/program/evidence/presence-ggm-faithful-recreation-proof/AUTH_OWNER_REGRESSION_NOTES.md`
- `docs/program/evidence/presence-ggm-faithful-recreation-proof/screenshots/*.png`
- this `README.md`

## 7. Routes / components changed

- `/p/[slug]` — when the slug resolves to a GGM Room, renders
  `GgmFaithfulRoom`. Otherwise unchanged.
- `/p/[slug]/works/[workId]` — when the parent Room is GGM, renders
  `GgmFaithfulRoom` with `focusWorkSlug` set. Otherwise unchanged.
- `/r/[token]` — when the resolved Room is GGM, dispatches to
  `GgmFaithfulRoom` with `roomKeySourceLabel`. Otherwise unchanged.
- `/presence/[slug]` — alias of `/p/[slug]`, inherits the new
  behaviour.
- `/gallery` — GGM card is enhanced with canonical artwork + "First
  pilot" pill, and synthesised when the backend lacks the pilot Room.
- `/studio/**` — untouched.
- `/world` — untouched (still "forming").

## 8. Renderer key / activation logic

Renderer key: **`ggm-faithful-room-v1`**

Activation order (see `lib/presence/ggm/activate.ts`):

1. `node.metadata.custom_presence.style_dna.renderer_key === "ggm-faithful-room-v1"`
2. `node.metadata.custom_renderer_key === "ggm-faithful-room-v1"`
3. Signature fallback:
   - slug matches `ggm` / `ggm-*` / `*-ggm` / `*kerkvliet-goddard*` /
     `*christina-goddard*` / `*christina-kerkvliet*`
   - OR display name contains `christina kerkvliet goddard` / `christina goddard`

Dispatch:

- `PresenceDnaRenderer.tsx:64-69` — public Room dispatch.
- `RoomKeyEntry.tsx:84-87` — RoomKey dispatch.
- `app/(public)/p/[slug]/works/[workId]/page.tsx:48-65` — work-detail dispatch.

## 9. RoomKey / NFC status

- The RoomKey route (`/r/[token]`) is wired to dispatch to the GGM
  faithful Room when the backend resolves the Room as GGM.
- The "Opened via NFC / QR / sticker / short_link" source label is
  surfaced as a paper-styled chip at the top of the GGM Room (see
  `roomKeyChip` style and `GgmHero` `topNoteLeft` override).
- Invalid / revoked / expired RoomKey states fall through to the
  existing universal stone-950 surface (unchanged) so the
  "no-longer-active" state still feels safe.
- Guest view continues to work — `PresenceGraphActions` does NOT force
  signup before viewing; the chip + enter Room flow is the same.

## 10. Auth regression status

- Frontend has zero references to `platform_admin` or `e4hatu` in any
  file under `presence-app`. The renderer pass does not introduce
  email-based gates.
- Public surface verified locally:
  - No operator email leaked.
  - No `platform_admin` exposed.
  - No `C:\Dev` paths leaked.
  - World remains hidden / forming.
- Non-GGM Rooms continue to render through the existing DNA renderer
  chain. Verified with a live fetch against `/p/rooms-underground-dj`.
- `/r/[token]` with a non-GGM token still hits the universal loader /
  error path. Verified live.
- `studio/[id]/**` routes were not touched.

Hosted verification still required for:

- e4hatu@gmail.com interactive sign-in.
- Owner-only Studio + analytics gating.
- Logout flow.
- Non-owner denial.

The existing `playwright.first-pilot-ggm.config.ts` covers these when
the `.env.presence-first-pilot-ggm.local` env file is present. See
`AUTH_OWNER_REGRESSION_NOTES.md` for the manual checklist.

## 11. Screenshot evidence

Captured at desktop (1440x900) and mobile (390x844) for:

- `presence-ggm-room-{desktop,mobile}.png` — first viewport of the
  faithful Room.
- `presence-ggm-room-full-{desktop,mobile}.png` — full-page scroll
  (intro → featured → work index → about → inspire → contact).
- `presence-ggm-work-detail-{desktop,mobile}.png` — work detail first
  viewport (paper hero with contained artwork).
- `presence-ggm-work-detail-full-{desktop,mobile}.png` — full work
  detail page (memory prompt + story triptych + statement + related).
- `presence-ggm-gallery-{desktop,mobile}.png` — gallery threshold.
- `presence-ggm-gallery-card-{desktop,mobile}.png` — scrolled to GGM
  card (artwork cover + "First pilot" pill + paper styling).
- `presence-ggm-roomkey-entry-{desktop,mobile}.png` — RoomKey loader
  state (universal, awaiting backend token).
- `source-ggm-{home,home-late,work,about}-{desktop,mobile}.png` —
  source live demo captures for parity comparison.

Captured by `scripts/capture-ggm-screenshots.mjs` against the local
dev server. Re-runnable with `node scripts/capture-ggm-screenshots.mjs`.

## 12. Visual fidelity score

Per `VISUAL_FIDELITY_REVIEW.md`:

| Axis | Score |
|---|---|
| First impression | 9 / 10 |
| Typography | 7.5 / 10 (Haffer fallback) |
| Palette | 10 / 10 |
| Layout | 9 / 10 |
| Artwork / image treatment | 9.5 / 10 |
| Motion | 7 / 10 (no Three.js morph) |
| Content | 10 / 10 |
| Mobile | 9 / 10 |
| Presence-native integration | 9 / 10 |
| **Aggregate** | **9 / 10** |

The new version is no longer worse than the source. Remaining gaps are
documented and bounded.

## 13. Tests run

- `npm run typecheck` — passed (zero TS errors).
- `npm run build` — passed (`Compiled successfully in 3.5s`; 50 routes
  generated; no GGM route fails).
- `node scripts/capture-ggm-screenshots.mjs` — captured 24 screenshots
  (12 Presence + 8 source pairs + 4 gallery / detail / RoomKey
  variants).
- Live-DOM probes via `preview_eval` / `preview_inspect` confirmed:
  - GGM CSS palette values match source.
  - `mix-blend-mode: difference` applied to nav.
  - No operator email / admin / local path leakage.
  - World page still shows "forming" copy.
  - Non-GGM rooms still render through the original DNA chain.

Not run (requires hosted environment):

- `npx playwright test --config=playwright.first-pilot-ggm.config.ts`
  — needs PRESENCE_PILOT_GGM_* env vars pointing at deployed frontend /
  backend / real Room slug / real Room ID / real RoomKey token.
- `npx playwright test --config=playwright.auth-permanence.config.ts`
  — needs deployed Supabase Auth credentials.

## 14. Known limitations

1. **Haffer XH font** is not redistributable. The faithful Room uses
   Inter Tight as a closely-matched fallback. At hero sizes the
   letterform difference is visible; at body sizes it is subtle.
   Resolving requires the artist or operator to provide a licensed copy
   of Haffer / Haffer XH that can be added to `public/fonts/`.
2. **Three.js liquid morph** between slideshow slides is replaced with
   a crossfade + parallax scale. The slideshow UI, parallax intensity,
   and counter rhythm are preserved; the wave-distortion effect is not.
3. **Osmo loader** is not reproduced (vendor code not redistributable).
   The Presence Room paints the first slide immediately; the source
   waits ~10s on its loader. This is a BETTER first impression, not a
   worse one.
4. **Tiny mix-blend-difference cursor dot** is not reproduced
   (accessibility concerns; inconsistent with Presence default cursor
   behaviour).
5. **Home hover-reveal companion card** (the floating image that
   follows the cursor on home) is not reproduced.
6. **Bottom zoom/blur** as the visitor scrolls toward the footer is
   not reproduced.
7. The GGM RoomKey "Opened via" chip only renders after the backend
   resolves a real Room. With an invalid token, the universal "Room
   Key is no longer active" surface still applies (which is correct
   behaviour, but it does not show the GGM identity).
8. Hosted auth + RoomKey smoke is required to claim a full pilot
   launch GO. The visual fidelity gate is GO; the launch gate awaits
   the existing hosted-smoke evidence chain.

## 15. GO / NO-GO

**Visual fidelity gate: GO.** The Presence GGM Room is now visually
and behaviorally faithful to the source. The faithful renderer is
scoped, activates only on the GGM signature, and does not contaminate
any other Room.

**Full pilot launch: NO-GO until hosted smoke completes**, specifically:

1. Hosted run of `playwright.first-pilot-ggm.config.ts` against the
   deployed frontend + backend + real RoomKey token.
2. Hosted run of `playwright.auth-permanence.config.ts` confirming the
   e4hatu@gmail.com session refresh path.
3. Owner / operator visual sign-off on the new Room
   (`/p/ggm` + `/r/<real-token>` on the production frontend).

Once these three pieces land, the pilot can launch.
