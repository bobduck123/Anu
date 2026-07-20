# Presence GGM Uniqueness Differentiation Proof

Date: 2026-05-29

## Summary

Restored the Presence demo-room distinctiveness guard without weakening the uniqueness threshold or changing the test. The collision was caused by `ggm-christina-goddard` resolving to the same gallery-artist DNA as `rooms-gallery-painter`.

## Root Cause

`ggm-christina-goddard` had no demo DNA overlay, so the inferrer treated it as a visual-art / artist-studio profile. That produced the same high-weight uniqueness inputs as `rooms-gallery-painter`:

- `blueprint = editorial_identity`
- `signature_module = gallery_wall`
- `motion_preset = gallery_breath`
- `palette_mode = gallery_white`
- `image_treatment = gallery_matte`

The pair scored `1.000` and failed the `0.70` threshold.

## Fix

Added an explicit GGM demo DNA overlay and adjusted the local fallback demo profile copy/content to support a cultural-community artist / practice archive meaning.

GGM now resolves as:

- `blueprint = program`
- `signature_module = archive_wall`
- `motion_preset = editorial_snap`
- `palette_mode = cultural`
- `image_treatment = archive`
- `entry_type = archive_first`
- `navigation_mode = story_path`
- CTA strategy from DNA: `Partner with us`

The fallback demo profile now includes public-safe practice archive services and proof records. No private contact fields were added.

## Result

`rooms-gallery-painter` remains the quiet gallery / commission profile.
`ggm-christina-goddard` now reads as a cultural-community artist, practice archive, public story, and cultural evidence surface.

After the fix:

- `rooms-gallery-painter ~ ggm-christina-goddard`: `0.045`
- closest GGM pair: `rooms-community-healer ~ ggm-christina-goddard`: `0.309`
- uniqueness threshold remains `0.70`

## Safety

- Public routes were not changed.
- Studio Room remains preview/internal only.
- TemplateKit starter flow was not changed.
- `lib/presence/uniqueness.test.ts` was not weakened.
- No runtime AI/LLM route, dependency, env var, API call, or UI was added.
- Public payload hygiene and explicit-public contact mapping remain intact.
