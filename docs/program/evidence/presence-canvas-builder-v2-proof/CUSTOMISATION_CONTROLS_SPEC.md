# Customisation Controls — Spec

Date: 2026-05-24

Every control listed here maps to a concrete token in
`PresenceEditableConfig` and is consumed by the resolver. There are
no fake controls — if a control appears in this list, the renderer
reads it. Controls that the renderer does not yet read are marked
"Codex P0/P1" with the exact field path that needs wiring.

## Text controls (per selected element)

Surface: floating mini-toolbar (desktop) + bottom-sheet inspector (mobile).

| Control | Token | Choices | Renderer status |
|---|---|---|---|
| Size | `style_dna.element_styles[id].size` | small / medium / large / feature | ✓ live |
| Weight | `style_dna.element_styles[id].weight` | light / regular / bold | ✓ live |
| Colour | `style_dna.element_styles[id].color` | ink / muted / paper / accent | ✓ live |
| Alignment | `style_dna.element_styles[id].align` | left / centre / right | ✓ live |
| Italic | `style_dna.element_styles[id].italic` | bool | ✓ live |
| Underline | `style_dna.element_styles[id].underline` | bool | ✓ live |
| Font mood | `style_dna.element_styles[id].font_mood` | editorial / display / soft / mono / handwritten | ✓ live (maps to a stack via `textStyleCss`) |
| Reset | clear all `element_styles[id]` keys | — | ✓ |

## Room-level typography

| Control | Token | Choices | Renderer status |
|---|---|---|---|
| Font pack | `style_dna.typography.font_pack_id` | from `FONT_PACKS` registry | Codex P0 — `<FontLoader>` shell needs to inject the Google CSS link |
| Heading family | `style_dna.typography.heading_stack` | from `ALL_FONTS` registry | ✓ live |
| Body family | `style_dna.typography.body_stack` | from `ALL_FONTS` registry | ✓ live |

## Colour controls (room palette)

Surface: dedicated palette inspector panel.

| Control | Token | Renderer status |
|---|---|---|
| Background | `style_dna.palette.bg` | ✓ live |
| Paper | `style_dna.palette.paper` | ✓ live |
| Paper warm | `style_dna.palette.paper_warm` | ✓ live |
| Ink | `style_dna.palette.ink` | ✓ live |
| Muted | `style_dna.palette.muted` | ✓ live |
| Line | `style_dna.palette.line` | ✓ live |
| Hero stage | `style_dna.palette.hero_stage_bg` | ✓ live |
| Accent | `style_dna.palette.accent` | ✓ live (resolver now reads it; needs renderer to actually paint accent — Codex P0 trivial) |

## Background controls (per scene)

Surface: scene inspector "Background" tab.

| Control | Token | Renderer status |
|---|---|---|
| Treatment | `scene_config.scenes[id].background` | Codex P0 — renderer needs to switch on paper / paper-warm / stage / ink / custom |
| Custom colour | `scene_config.scenes[id].background_custom` | Codex P0 |
| Texture intensity | `scene_config.scenes[id].texture_intensity` | Codex P1 — reads existing dither/grain layers |
| Image background | `scene_config.scenes[id].background_image_url` | Codex P1 — needs renderer branch + asset validator integration |

## Image controls

Surface: image asset picker overlay.

| Control | Token | Renderer status |
|---|---|---|
| Replace image | `asset_config.{slot}.url` | ✓ live |
| Alt text | `asset_config.{slot}.alt_text` | ✓ live |
| Focal point | `asset_config.{slot}.focal_point: {x, y}` | Codex P1 — renderer needs `object-position` |
| Restore previous | `asset_config.{slot}._history[0]` | Codex P1 — needs history list on asset |
| Caption | `asset_config.{slot}.caption` | ✓ for works; Codex P1 for hero |
| Lightbox | `asset_config.{slot}.lightbox_enabled` | Codex P2 |

## Gallery controls (work-wall widget)

Surface: widget inspector → Layout tab.

| Control | Token | Choices | Renderer status |
|---|---|---|---|
| Layout | `scene_config.scenes[wall].layout` | gallery-wall / stack / film-strip / archive-drawer / magazine-spread / carousel / polaroid-wall / masonry | ✓ gallery-wall + stack + film-strip live; rest Codex P1 |
| Featured work | `scene_config.scenes[wall].featured_work_slug` | any work.slug | ✓ live |
| Columns | `scene_config.scenes[wall].columns` | 1–4 | Codex P1 |
| Spacing | `scene_config.scenes[wall].spacing` | tight / standard / open | Codex P1 |
| Frame style | `scene_config.scenes[wall].frame_style` | hairline / filled / polaroid / none | Codex P1 |
| Caption style | `scene_config.scenes[wall].caption_style` | overlay / below / hidden | Codex P1 |
| Ordering | `scene_config.scenes[wall].artwork_order` | array of slugs | ✓ live (drag-reorder Codex P0) |
| Visibility per work | `asset_config.artworks[].is_visible` | bool | ✓ live |
| Mobile layout | `scene_config.scenes[wall].mobile_layout` | stack / film-strip / current | Codex P2 |

## Action/button controls (invitation widget)

Surface: widget inspector → Actions tab.

| Control | Token | Choices | Renderer status |
|---|---|---|---|
| Label | `enquiry_config.cta_label` | text | ✓ live |
| Destination | `enquiry_config.delivery_posture` | backend_enquiry_capture / mailto / external_url | ✓ live for backend_enquiry_capture; Codex P1 for the others |
| Style | `style_dna.invitation_style` | soft-pill / framed-card / underlined-link / floating-tag | Codex P0 — renderer needs to switch |
| Size | `style_dna.invitation_size` | small / medium / large | Codex P1 |
| Icon | `style_dna.invitation_icon` | feather icon name | Codex P2 |
| Colour | `style_dna.invitation_color` | uses accent by default | Codex P1 |

## Motion controls

Surface: motion inspector (or scene inspector → Motion tab).

| Control | Token | Choices | Renderer status |
|---|---|---|---|
| Intensity | `motion_config.intensity` | still / gentle / living / immersive | ✓ live |
| Transition style | `motion_config.liquid_style` | ripple / glass / dissolve / cut | ✓ live |
| Liquid intensity | `motion_config.liquid_intensity` | 0..1 | ✓ live |
| Distortion | `motion_config.distortion_scale` | 0..1 | ✓ live |
| Speed | `motion_config.morph_speed_ms` | 400..2400 | ✓ live |
| Dither | `motion_config.dither_strength` | 0..1 | ✓ live |
| Film grain | `motion_config.film_grain_strength` | 0..1 | ✓ live |
| Blur | `motion_config.blur_amount` | 0..1 | ✓ live |
| Parallax depth | `motion_config.parallax_depth` | 0..1 | Codex P1 — token reads but no renderer branch |
| Custom cursor | `motion_config.custom_cursor_enabled` | bool | Codex P1 |
| Heavy motion | `motion_config.heavy_motion_enabled` | bool (advanced) | ✓ live (cap visibility Codex P0) |
| Reduced-motion fallback | `motion_config.reduced_motion_fallback` | always true | ✓ system-controlled |

## Decorative controls

| Control | Token | Renderer status |
|---|---|---|
| Divider | widget type `divider` | Codex P1 (renderer + inspector) |
| Background texture | `style_dna.texture_tokens.treatment` | Codex P1 |
| Floating label | widget type `floating-label` | Codex P2 (new widget) |
| Stamp / seal | `style_dna.seal_glyph` | Codex P2 |

## What the Canvas inspector surfaces vs hides

Pilot owners see only:
- Mood pack picker (3 packs).
- Per-element text style toolbar (size / weight / colour / alignment / italic / underline / font mood / reset).
- Font pack picker (6 packs) + advanced font picker behind "Show advanced".
- Palette per-token picker (8 colours).
- Scene background treatment (4 presets).
- Asset picker overlay (canonical / attached / coming-soon upload).
- Work-wall layout (3 live layouts; rest disabled with "Coming soon").
- Invitation style (Codex P0).
- Motion intensity (Still / Gentle / Living + Immersive behind "Show advanced").

Advanced owners additionally see:
- Per-token motion knobs.
- Custom palette colours (hex).
- Heavy motion opt-in.
- Coming-soon widgets and layouts visible (but disabled).
- Drag-add of widgets from the library drawer.

Staff additionally see:
- Decorative-frame widget.
- Renderer key + schema version.
- Locked field overrides.
