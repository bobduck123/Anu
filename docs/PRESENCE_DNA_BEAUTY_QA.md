# Presence DNA — Beauty QA checklist

This is the acceptance harness for any Presence Room rendered through the
Presence DNA system. A room is **not ready to ship** until every box is
checked. Run through the list on desktop AND mobile, and once with
`prefers-reduced-motion: reduce` enabled in the browser.

The product law: **industry informs the room, identity authors the
room**. Profession is an input signal to DNA inference. It is never the
final layout selector. If a room reads as "the carpenter template" or
"the artist template", it fails this checklist.

## The twelve checks

1. **First-screen specificity.** Could you swap the display name for
   another person in the same profession and the room would still feel
   right? If yes, the room is too generic. Fail.

2. **Not an industry template.** Two rooms with the same `practice.field`
   must not share the same blueprint, signature module, palette mode,
   and entry type all at once. Use the uniqueness engine to verify.

3. **A distinctive front-end behaviour system.** One implemented
   behaviour preset is loaded and visible. Glitch rooms glitch.
   Material rooms reveal. Editorial rooms snap. Care rooms breathe
   gently. The behaviour is recognisable within five seconds.

4. **One memorable signature module.** The room has exactly one signature
   module surfaced at `featured` or `hero_level` intensity. Two
   competing signatures dilute the room — pick one.

5. **Intentional mobile navigation.** Open the room on a phone-sized
   viewport. The nav is not a hamburger by default. It is a `floating_index`,
   `bottom_sheet`, `portal_cards`, `glyph_nav`, or `mobile_drawer`
   chosen by DNA — or a deliberate `single_scroll` with a sticky CTA
   dock. Hamburger menus on a single-page room fail this check.

6. **Image treatment reinforces identity.** Every image in the room
   passes through `TreatedImage` with a treatment that matches the
   DNA. A nocturnal sonic room with crisp clean-product images fails.
   A gallery painter room with glitch fails.

7. **CTA matches the real-world goal.** The primary CTA label maps to
   `goal.primary_goal × goal.conversion_style`. "Send an enquiry" for
   a performer asking for bookings fails. The CTA for a carpenter
   chasing local jobs should be "Get a quote", not "Open a project
   conversation".

8. **Proof modules match the trust need.** A cold-audience trust room
   surfaces proof EARLY (top of page or hero strip). A referred-audience
   editorial room surfaces proof AFTER the story. If the order doesn't
   match `audience.audience_temperature × proof.proof_position`, fail.

9. **Reduced-motion compliance.** With `prefers-reduced-motion: reduce`
   set:
   - `controlled_glitch` shows one static colour-split frame, no animation.
   - `gallery_breath` is disabled entirely (no transform, no opacity loop).
   - `material_reveal` reveals on mount without parallax.
   - `editorial_snap` reveals on mount without slide.
   - `GlitchGalleryWall` shimmer animation is disabled.
   If any motion plays under reduced-motion, fail.

10. **Mobile and desktop both feel premium.** Open the URL on a phone.
    Check spacing, typography, image cropping, nav. Re-open on a
    desktop. Both must feel authored. A mobile layout that looks like a
    responsive afterthought fails — mobile is part of identity.

11. **Regenerable from structured DNA.** The room must be reconstructible
    from `PresenceDna` alone — no inline copy buried in the blueprint.
    If you delete the demo overlay for a room and re-infer DNA from the
    PresenceNode, the room should still produce a coherent result (it
    may pick a different blueprint, but it must not crash or render
    empty sections).

12. **Not a colour/font swap of another room.** Run the uniqueness check
    (`npx tsx lib/presence/uniqueness.test.ts`). Every pairwise score
    must be below the `TOO_SIMILAR_THRESHOLD` (0.70). If a pair is
    above, follow the recommendations the engine emits.

## The proof case

The two carpenter rooms are the proof case for the whole system:

- `rooms-material-carpenter` (Salt & Grain Studio) — Material Studio
  blueprint, materials_board signature, warm timber palette, slow
  material_reveal motion, collage section rhythm.

- `rooms-local-carpenter` (Dave Carpentry) — Trust Conversion blueprint,
  before_after_slider signature, warm_neutral palette, editorial_snap
  motion, service_ladder rhythm, hero-level trust strip.

These two are the same `practice.field = building_trade` and should look
like two different worlds. The uniqueness engine asserts they sit below
the similarity threshold; the script fails CI if they ever collide.

## Running the uniqueness check

```bash
cd presence-app
npm i -D tsx          # one-time
npx tsx lib/presence/uniqueness.test.ts
```

Expected: every pairwise score reported, no "TOO SIMILAR" warnings,
and the proof-case assertion passes.

## What is fully implemented in this pass vs scaffolded

See `PRESENCE_DNA_PHASE_10_REPORT.md` for the explicit
implemented / scaffolded matrix. A room that depends on a scaffolded
signature module will fall back via the signature registry to the
closest implemented module — when that falls back, the room is "shippable"
but not yet fully authored. The Phase 10 report lists which rooms are
in that state.
