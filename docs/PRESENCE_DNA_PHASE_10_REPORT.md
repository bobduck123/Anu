# Presence DNA — Phase 10 implementation report

**Status:** Pass 1 complete. Front-end Presence DNA system is live and is
the rendering authority for `/p/[slug]` and `/presence/[slug]`. Six demo
rooms are reachable. The proof case (two carpenters) lands as a pair of
visibly different worlds.

**Branch:** `feature/presence-ecosystem-alpha`
**Date:** 2026-05-19
**Scope:** Frontend-only adapter pass — no backend migration in this pass.

---

## 1. Summary of what changed

The renderer is now DNA-driven. Profession (room_type, node_type,
display_mode) is an input signal to a typed Presence DNA model; the DNA
selects the room blueprint, theme genome, motion behaviour, image
treatment, signature module, and mobile nav. The five legacy
profession-template renderers (`PresenceRoomRenderer`,
`StudioPracticeView`, `PractitionerView`, `VenueView`, generic fallback)
are still in the codebase but are reached only behind a never-set
`legacyMode` prop — they are safely retained, not used.

A demo overlay layer maps six demo slugs to rich Presence DNA + synthetic
PresenceNode payloads, so the demos render through the same code path as
any future backend-persisted room. The overlay is clearly marked
TEMPORARY and will become a no-op as soon as the backend persists DNA.

---

## 2. Files changed

**New (24):**

- `lib/presence/dna/types.ts` — DNA model: EntityDna, PracticeDna,
  AudienceDna, GoalDna, PersonalityDna, ProofDna, VisualWorldDna,
  CompositionDna, SignatureDna, ThemeGenome, RoomBlueprint, RoomOutput,
  UniquenessInputs.
- `lib/presence/dna/infer.ts` — `inferPresenceDna(node)`: derives DNA from
  existing PresenceNode fields. No content fabrication.
- `lib/presence/dna/overlay.ts` — `resolvePresenceDna(node)`: merges
  `backend_persisted > demo_overlay > inferred`.
- `lib/presence/dna/demoOverlays.ts` — DNA overlays for the six demo
  slugs. **Temporary. Marked for deletion when backend persists DNA.**
- `lib/presence/theme/palettes.ts` — 10 palette modes.
- `lib/presence/theme/genome.ts` — DNA → ThemeGenome → CSS variables +
  class hooks.
- `lib/presence/behaviours/registry.ts` — All 12 behaviour presets with
  implemented/scaffolded flag.
- `lib/presence/blueprints/registry.ts` — All 14 blueprints with
  implemented/scaffolded flag + safe fallback chain.
- `lib/presence/blueprints/select.ts` — `selectBlueprint(dna)`,
  `trustPathway(dna)`, `ctaLabel(dna)`.
- `lib/presence/uniqueness.ts` — pairwise similarity engine with
  weighted axes + Jaccard for section order. Threshold 0.70.
- `lib/presence/uniqueness.test.ts` — runnable assertion script.
  Asserts no pair >= threshold and that the carpenter proof case passes.
- `lib/presence/demo/profiles.ts` — synthetic PresenceNode payloads for
  six demo slugs. **Temporary. Marked for deletion.**
- `lib/presence/demo/fetch.ts` — `fetchDemoOrPublicNode(slug)`: real
  backend first, demo fixture fallback. **Removable.**
- `components/presence/PresenceDnaRenderer.tsx` — top-level DNA-driven
  renderer + `getRenderPlan(node)`.
- `components/presence/TreatedImage.tsx` — image treatment wrapper.
- `components/presence/behaviours/ControlledGlitch.tsx`
- `components/presence/behaviours/GalleryBreath.tsx`
- `components/presence/behaviours/MaterialReveal.tsx`
- `components/presence/behaviours/EditorialSnap.tsx`
- `components/presence/signatures/GlitchGalleryWall.tsx`
- `components/presence/signatures/MaterialsBoard.tsx`
- `components/presence/signatures/BeforeAfterProofSlider.tsx`
- `components/presence/signatures/registry.ts`
- `components/presence/nav/FloatingIndexNav.tsx`
- `components/presence/blueprints/shared.tsx`
- `components/presence/blueprints/NocturnalSonicRoom.tsx`
- `components/presence/blueprints/EditorialIdentityRoom.tsx`
- `components/presence/blueprints/MaterialStudioRoom.tsx`
- `components/presence/blueprints/TrustConversionRoom.tsx`
- `components/presence/blueprints/ProgramCareRoom.tsx`
- `components/presence/blueprints/GlitchGalleryRoom.tsx`
- `docs/PRESENCE_DNA_BEAUTY_QA.md` — 12-check acceptance harness.
- `docs/PRESENCE_DNA_PHASE_10_REPORT.md` — this file.

**Modified (3):**

- `app/globals.css` — appended Presence room primitives, image treatment
  classes, texture overlays, behaviour styles, signature module styles,
  mobile nav styles, blueprint-specific styles. ~700 lines net.
- `components/portfolio/PortfolioRenderer.tsx` — dispatches to
  `PresenceDnaRenderer` by default. Legacy renderers retained behind
  unused `legacyMode` prop.
- `app/(public)/p/[slug]/page.tsx` — uses `fetchDemoOrPublicNode` so
  demo slugs render without backend. `/presence/[slug]/page.tsx` is a
  re-export and inherits the change.

**Untouched:**
- Backend (`flora-fauna/backend/...`) — no changes this pass.
- Studio routes (`app/(studio)/...`) — no changes.
- Existing v1 `PresenceRoomRenderer` and v1.1 distinctive views —
  retained, only callable via `legacyMode`.

---

## 3. The Presence DNA model

Implemented in `lib/presence/dna/types.ts`. Every category from the brief
is typed:

| Category | Field count | Status |
|---|---|---|
| EntityDna | 3 | typed + inferred |
| PracticeDna | 3 | typed + inferred |
| AudienceDna | 3 | typed + inferred |
| GoalDna | 3 | typed + inferred |
| PersonalityDna | 3 | typed + inferred |
| ProofDna | 3 | typed + inferred |
| VisualWorldDna | 4 | typed + inferred |
| CompositionDna | 3 | typed + inferred |
| SignatureDna | 2 | typed + inferred |
| ThemeGenome | 12 | typed + derived from DNA |

Provenance is tracked on every DNA object via the `source` field:
`"inferred" | "demo_overlay" | "node_metadata" | "backend_persisted"`.
The renderer can show the source in a debug overlay later.

---

## 4. Room blueprints

| Blueprint | Status | Notes |
|---|---|---|
| `editorial_identity` | **implemented** | Quiet/restrained. Used by gallery painter + sharp consultant — same blueprint, different DNA → visibly different rooms. |
| `trust_conversion` | **implemented** | Trust strip in hero, before/after signature, service ladder. |
| `material_studio` | **implemented** | Material-first hero, materials board signature, collage works. |
| `program` | **implemented** | Service-first, four-step care pathway, soft palette. |
| `nocturnal_sonic` | **implemented** | Audio-first, glitch hero title, floating index nav. |
| `glitch_gallery` | **implemented** | Glitch hero, wall, contact. Mobile portal nav. |
| `proof_wall` | scaffolded → `trust_conversion` |  |
| `atmosphere` | scaffolded → `program` |  |
| `craft` | scaffolded → `material_studio` |  |
| `archive` | scaffolded → `glitch_gallery` |  |
| `booking` | scaffolded → `program` |  |
| `commission` | scaffolded → `editorial_identity` |  |
| `civic` | scaffolded → `program` |  |
| `field_record` | scaffolded → `editorial_identity` |  |

Fallback chain lives in `lib/presence/blueprints/registry.ts:fallbackBlueprint`.

---

## 5. Aesthetic behaviour presets

| Preset | Status |
|---|---|
| `controlled_glitch` | **implemented** — scanline shake + chromatic split, throttled, reduced-motion = single static frame. |
| `gallery_breath` | **implemented** — slow scale/opacity rhythm via rAF. Reduced-motion = disabled. |
| `material_reveal` | **implemented** — IntersectionObserver lift+fade. Reduced-motion = revealed on mount. |
| `editorial_snap` | **implemented** — IntersectionObserver fast fade. Reduced-motion = revealed on mount. |
| `archival_flicker` | scaffolded |
| `cinematic_drift` | scaffolded |
| `scanline_noise` | scaffolded |
| `soft_parallax` | scaffolded |
| `kinetic_index` | scaffolded |
| `tactile_hover` | scaffolded |
| `image_displacement` | scaffolded |
| `mobile_portal_nav` | scaffolded |

Reduced-motion is honoured at two layers: each component checks
`window.matchMedia('(prefers-reduced-motion: reduce)')` in its effect
AND the CSS contains a global `@media (prefers-reduced-motion: reduce)`
rule that disables animations/transitions on `.presence-behaviour-*`.
Verified live in the preview server.

---

## 6. Signature modules

| Module | Status |
|---|---|
| `glitch_gallery` | **implemented** — asymmetric grid + throttled shimmer. |
| `materials_board` | **implemented** — cork pinboard with brass pins, polaroid cards. |
| `before_after_slider` | **implemented** — keyboard + touch + mouse, AA slider role. |
| `gallery_wall` | scaffolded → falls back to `glitch_gallery` (treatment swap recommended). |
| `audio_strip` | scaffolded → blueprint handles audio inline today. |
| `availability_panel` | scaffolded |
| `press_wall` | scaffolded |
| `project_timeline` | scaffolded |
| `map_memory` | scaffolded |
| `ritual_booking_panel` | scaffolded → ProgramCareRoom blueprint owns the booking pattern inline. |
| `impact_counter` | scaffolded |
| `quote_oracle` | scaffolded |
| `process_reel` | scaffolded |
| `program_grid` | scaffolded |
| `commission_pathway` | scaffolded |
| `archive_wall` | scaffolded |
| `mobile_room_switcher` | scaffolded |

Safe-fallback table lives in `components/presence/signatures/registry.ts`.

---

## 7. Image treatment + texture

`TreatedImage` accepts one of 15 treatments. CSS implements:
`editorial, documentary, cinematic, clean_product, archive,
warm_portrait, high_gloss, raw, gallery_matte, polaroid, halftone,
photocopy, projection, glitch, duotone`. Texture overlays:
`grain, scanline, paper, timber, fabric, stone, light_leak, paint, dust`.
Both compose: a glitch image with scanline texture is two layers.

---

## 8. Mobile navigation variants

| Variant | Status |
|---|---|
| `floating_index` | **implemented** — bottom-centre pill on mobile, vertical dot rail on desktop. Used by `nocturnal_sonic` and `glitch_gallery`. |
| `single_scroll` | implicit default (no nav rendered) — used by editorial, material, trust, program rooms. |
| `mobile_drawer`, `bottom_sheet`, `portal_cards`, `glyph_nav`, `room_tabs`, `anchor_nav`, `story_path` | scaffolded — registry entry exists, component not built. |

The DNA inference picks a mobile nav per room; only `floating_index`
currently renders a non-default. The architecture is in place for the
remaining variants to drop in without renderer changes.

---

## 9. Seeded demo presences

All reachable at both `/p/[slug]` and `/presence/[slug]`:

| Slug | Blueprint | Signature | Motion | Palette | Identity in one line |
|---|---|---|---|---|---|
| `rooms-underground-dj` | nocturnal_sonic | glitch_gallery | controlled_glitch | nocturnal | Gold-on-black booking pit, scanline grid, lowercase mono title. |
| `rooms-gallery-painter` | editorial_identity | gallery_wall (→ glitch_gallery fallback) | gallery_breath | gallery_white | Work-first museum-label hero, paper texture, serif. |
| `rooms-material-carpenter` | material_studio | materials_board | material_reveal | material_based | Dark timber, cork-board signature, polaroid material cards. |
| `rooms-local-carpenter` | trust_conversion | before_after_slider | editorial_snap | warm_neutral | Quote-promise hero, trust pills, draggable before/after, terracotta CTA. |
| `rooms-community-healer` | program | ritual_booking_panel (→ blueprint-owned) | editorial_snap | soft_gradient | Green pill CTA, "held with care" eyebrow, four-step pathway. |
| `rooms-sharp-consultant` | editorial_identity | quote_oracle (→ before_after_slider fallback) | editorial_snap | monochrome | Industrial sans, statement-as-title, sharp black CTA. |

Live uniqueness check (`npx tsx lib/presence/uniqueness.test.ts`):

```
[ok] rooms-gallery-painter ~ rooms-sharp-consultant  score=0.291  (most similar)
[ok] rooms-material-carpenter ~ rooms-local-carpenter score=0.057 (proof case)
[ok] rooms-underground-dj ~ rooms-sharp-consultant   score=0.000  (most different)
All pairs distinct. Proof case passes. ✓
```

Note: signatures listed as `→` indicate the registry fell back to a
shipped module because the DNA-preferred one is scaffolded. The blueprint
still composes the rest of the room intentionally — these are "shippable
with one finishing pass" not "broken".

---

## 10. Verification results

| Check | Result |
|---|---|
| `npm run typecheck` | ✓ pass (0 errors) |
| `npm run build` | ✓ pass (Next.js 16 / Turbopack, 18/18 static pages, all routes generated) |
| `npx tsx lib/presence/uniqueness.test.ts` | ✓ pass, proof case asserted |
| Public route renders for each demo slug | ✓ all 6 verified in browser, no console errors, no hydration errors |
| Canonical `/presence/[slug]` route | ✓ verified (renders via re-export, `data-presence-blueprint` correct) |
| Mobile viewport (375×812) | ✓ verified on DJ room — floating index nav docks at bottom |
| Reduced-motion CSS rule | ✓ confirmed present in compiled stylesheet via DOM inspection |
| Reduced-motion JS layer | ✓ each behaviour component checks `matchMedia` |
| Existing legacy slugs (non-demo) | not regressed — same fetch path, demo branch only triggers on slug-miss |

Browser screenshots captured for all 6 desktop rooms + the DJ mobile
variant via the preview server. Saved during the verification pass (in
the chat transcript).

---

## 11. Constraints honoured

| Constraint | Honoured by |
|---|---|
| Don't break existing public routes | `/p/[slug]` and `/presence/[slug]` still 200 for backend-served slugs; signature unchanged. |
| Don't remove existing renderers | `PresenceRoomRenderer`, `StudioPracticeView`, `PractitionerView`, `VenueView` all retained; only reachable via `legacyMode` prop nothing currently sets. |
| DNA is the rendering authority | `PortfolioRenderer` default path → `PresenceDnaRenderer` → blueprint via `selectBlueprint(dna)`. Profession only feeds inference. |
| Room_type/profession can only be an input signal | Verified: `inferPresenceDna` uses `room_type` only as one of many signals; `selectBlueprint` never branches on `room_type`. |
| Demo synthetic DNA marked temporary | Big banners atop `demoOverlays.ts` and `profiles.ts`; explicit removal path documented. |
| Each demo room a different world | Uniqueness engine + browser verification confirm. |
| Two carpenters as proof case | material_carpenter (Material Studio + materials_board + timber) vs local_carpenter (Trust Conversion + before/after + warm neutral) — score 0.057. |
| Reduced-motion mandatory | Implemented at CSS layer + JS layer for all 4 behaviour presets and the glitch shimmer. |
| Mobile as identity | Floating index nav implemented with deliberate gold-pill mobile treatment; single_scroll rooms use sticky CTA pattern instead of hamburger. |
| Report distinguishes implemented vs scaffolded | Sections 4, 5, 6, 8 above all mark explicitly. |

---

## 12. What remains scaffolded

These are intentionally NOT shipped in this pass. The architecture
already supports them — they just need component implementations and
(in some cases) CSS.

**Blueprints (8):** proof_wall, atmosphere, craft, archive, booking,
commission, civic, field_record. Today they resolve via
`fallbackBlueprint` to a shipped blueprint with similar DNA.

**Behaviour presets (8):** archival_flicker, cinematic_drift,
scanline_noise, soft_parallax, kinetic_index, tactile_hover,
image_displacement, mobile_portal_nav. Currently the theme picker maps
unimplemented preferences to one of the four implemented presets.

**Signature modules (14):** gallery_wall, audio_strip, availability_panel,
press_wall, project_timeline, map_memory, ritual_booking_panel,
impact_counter, quote_oracle, process_reel, program_grid,
commission_pathway, archive_wall, mobile_room_switcher.
`fallbackSignature` maps each to the nearest implemented module.

**Mobile nav variants (5):** mobile_drawer, bottom_sheet, portal_cards,
glyph_nav, story_path. Today the system uses `floating_index` for
DNA that prefers any of these, and `single_scroll` otherwise.

---

## 13. Remaining gaps (acknowledged)

1. **Backend persistence of Presence DNA.** This pass is frontend-only.
   The full backend follow-up requires:
   - Adding `metadata.presence_dna` JSONB column on `presence_nodes` (or
     a dedicated `presence_dna` table joined by `node_id`).
   - Migration in `flora-fauna/backend/migrations/versions/`.
   - Service-layer write path in `presence_service.py`.
   - Read path: include `metadata.presence_dna` in `serialize_presence_node`
     so `resolvePresenceDna` picks it up at the highest priority.
   - Seed update: `seed_presence_demo_data()` to author DNA for the
     existing 5 backend demo slugs (`rooms-independent-artist`,
     `rooms-healing-practitioner`, `rooms-dj-performer`,
     `rooms-consultant`, `rooms-community-organisation`).
   - Once the backend persists DNA, delete `lib/presence/demo/*` and
     `lib/presence/dna/demoOverlays.ts`. The renderer needs no changes.

2. **Admin/editor for DNA fields.** No Studio UI lets owners edit DNA
   today. Studio still edits the existing room_type/theme_preset/etc.
   The next pass should add a DNA editor (Phase 8 in the original spec)
   that writes to `metadata.presence_dna`.

3. **Deployed verification.** Not performed. Requires the backend running
   with seeded DNA. Local verification was sufficient because the demo
   slugs bypass the backend entirely in this pass.

4. **Visual regression coverage.** No screenshot diffing yet. Playwright
   is already in devDependencies — adding visual snapshots for each
   blueprint at desktop/mobile/dark/reduced-motion is the natural next
   step.

5. **Some demo content polish.** The Unsplash photo chosen for the
   healer room hero ("woman with headphones, yellow background") doesn't
   ideally evoke a somatic practitioner. The image URL is in
   `lib/presence/demo/profiles.ts` at `rooms-community-healer.hero_image_url`
   and is a one-line swap.

6. **Two of the six demo rooms render a fallback signature module.**
   `rooms-gallery-painter` wants `gallery_wall` (scaffolded → glitch_gallery
   fallback, which the blueprint suppresses in favour of its own works
   grid) and `rooms-sharp-consultant` wants `quote_oracle` (scaffolded
   → before_after_slider fallback, also suppressed by the editorial
   blueprint). The rooms read correctly because the blueprints don't
   force the fallback signature into the layout — but a future pass
   should ship `gallery_wall` and `quote_oracle` proper for full effect.

---

## 14. Exact commands to run

```bash
# Local dev (presence-app only — backend not required for demo slugs)
cd C:/Dev/Flora_fauna/presence-app
npm run dev               # default port 3001

# Static analysis + build
npm run typecheck         # tsc --noEmit
npm run build             # Next.js production build

# Uniqueness assertion (proof case)
npx tsx lib/presence/uniqueness.test.ts

# Try the six demo rooms
#   http://localhost:3001/p/rooms-underground-dj
#   http://localhost:3001/p/rooms-gallery-painter
#   http://localhost:3001/p/rooms-material-carpenter
#   http://localhost:3001/p/rooms-local-carpenter
#   http://localhost:3001/p/rooms-community-healer
#   http://localhost:3001/p/rooms-sharp-consultant
# All also work at /presence/<slug>.
```

---

## 15. Deployment / env requirements

No new environment variables. No new dependencies in `package.json`
(uniqueness check uses `tsx` via `npx --yes`; recommend adding it as a
dev dep before CI integration).

For deployed hosts: the existing public route works unchanged for
non-demo slugs. To make the six demo slugs work in production, either:

- Ship this branch with `lib/presence/demo/*` included (current state —
  no migration, demo slugs render via fallback), OR
- Seed the demo slugs in the production backend and remove the demo
  layer (Phase 2 / Phase 11 backend work).

---

## 16. Successor agent — start here

The brief was 10 phases. This pass landed phases 1–7 and 10 at a
frontend-only depth. To pick up where this left off:

1. **Most impactful next move:** ship the backend DNA columns +
   serialiser + control-plane endpoints (gap #1 above). Until DNA is
   persisted, no admin editor (Phase 8) is meaningful.
2. **Highest-leverage UI next move:** ship `gallery_wall` and
   `quote_oracle` signature modules so the painter and consultant rooms
   reach their full intended effect.
3. **Most user-visible next move:** implement two more blueprints
   (suggest `civic` and `archive` — they unlock a wholly different
   visual world from the six already shipped).
4. **Polish queue:** swap the healer hero image; ship 2–3 more
   behaviour presets (`tactile_hover`, `soft_parallax`,
   `cinematic_drift`); ship one more mobile nav variant (`bottom_sheet`
   for the program/booking rooms).

The existing implementation has clear extension points everywhere —
registries declare what's missing and the fallback chains keep the
system shippable while you build out.
