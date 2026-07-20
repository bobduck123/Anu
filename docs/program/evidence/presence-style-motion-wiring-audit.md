# Presence Style / Motion Wiring Audit

Date: 2026-05-24

Scope: Presence Studio editor controls for the GGM faithful renderer after the Kimi salvage integration pass.

## Active, Stored, and Rendered

These controls remain enabled because they are persisted in `PresenceEditableConfig` and produce visible renderer changes in public/published config or authenticated draft preview.

| Control | Config path | Renderer wiring |
| --- | --- | --- |
| Mood palette: bg | `style_dna.palette.bg` | `--ggm-bg` |
| Mood palette: paper | `style_dna.palette.paper` | `--ggm-paper` |
| Mood palette: paper warm | `style_dna.palette.paper_warm` | `--ggm-paper-warm` |
| Mood palette: ink | `style_dna.palette.ink` | `--ggm-ink` |
| Mood palette: muted | `style_dna.palette.muted` | `--ggm-muted` |
| Mood palette: line | `style_dna.palette.line` | `--ggm-line` |
| Mood palette: hero stage bg | `style_dna.palette.hero_stage_bg` | `--ggm-stage` |
| Heading stack | `style_dna.typography.heading_stack` | `--ggm-display-family` |
| Body stack | `style_dna.typography.body_stack` | `--ggm-body-family` |
| Transition style | `motion_config.transition_style` / `liquid_style` | `GgmLiquidCanvas.style` |
| Morph speed | `motion_config.morph_speed_ms` | `GgmLiquidCanvas.transitionMs` |
| Liquid intensity | `motion_config.liquid_intensity` | `GgmLiquidCanvas.intensity` |
| Distortion scale | `motion_config.distortion_scale` | `GgmLiquidCanvas.distortion` |
| Dither strength | `motion_config.dither_strength` | `GgmStage.frameGrainLayer` opacity |
| Film grain strength | `motion_config.film_grain_strength` | `GgmStage.frameGrainLayer` opacity |
| Blur amount | `motion_config.blur_amount` | `GgmStage.frameCanvasLayer` blur |
| Heavy motion opt-in | `motion_config.heavy_motion_enabled` | `GgmMotionContext.effective` caps motion when false |

## System-Controlled

| Control | Config path | Reason |
| --- | --- | --- |
| Reduced-motion fallback | `motion_config.reduced_motion_fallback` | Accessibility fallback remains always on through `prefers-reduced-motion` and power saver handling; owners cannot disable it. |

## Disabled / Coming Soon

These controls are visible but disabled. They are stored or planned tokens but are not active renderer branches yet.

| Control | Config path | Reason |
| --- | --- | --- |
| Accent palette | `style_dna.palette.accent` | Stored token only; current GGM CSS does not use it as a distinct public accent. |
| Background treatment | `style_dna.background_treatment` | Stored token; renderer does not branch background treatment yet. |
| Frame treatment | `style_dna.frame_treatment` | Commissioned GGM frame remains locked in this renderer. |
| Texture treatment | `style_dna.texture_tokens.treatment` | Stored token; film texture is controlled by wired dither/film motion controls. |
| Scene rhythm | `style_dna.spacing.scene_rhythm` | Stored token; scene rhythm is not a renderer branch yet. |
| Artwork treatment | `style_dna.artwork_treatment.hero_fit` | Stored token; artwork fit is still governed by the GGM renderer. |
| Parallax depth | `motion_config.parallax_depth` | Stored token; the public renderer does not apply parallax depth yet. |
| Custom cursor | `motion_config.custom_cursor_enabled` | Stored token; the GGM renderer does not currently draw a custom cursor. |

## Presets

Room DNA presets are enabled only where they map to visible palette/typography/liquid motion tokens:

- Paper Gallery
- Ink Room
- Liquid Signal

No Kimi preset was imported directly because the bundle used a flattened `EditorConfig` shape and several preset fields that are not visible in the current renderer.

## Security / Public Contract Notes

- Public rendering still consumes only `node.editable_config` with `status === "published"`.
- The full-screen Studio draft preview locally marks the owner-authenticated draft config as renderable for preview only; it is not a public route and does not add a public draft endpoint.
- Heavy motion is no longer default-on in the editor fallback or mock config.
