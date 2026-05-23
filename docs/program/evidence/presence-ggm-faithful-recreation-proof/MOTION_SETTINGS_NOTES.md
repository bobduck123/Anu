# Motion Settings — Notes

Date: 2026-05-23
Component: `components/presence/ggm/GgmSettingsMenu.tsx`
Context provider: `components/presence/ggm/GgmMotionContext.tsx`
Persistence: `localStorage["ggm:motion-settings:v1"]`

## What the menu controls

The "Motion" pill in the GGM left rail opens a four-section dropdown:

### Motion
- **Transition style**: `Liquid morph (ripple)`, `Liquid morph (glass)`,
  `Soft dissolve`, `Reduced motion (cut)`.
  Maps directly to `GgmLiquidCanvas.style`.
- **Liquid intensity** (0..1)
- **Distortion scale** (0..1.5)
- **Transition speed** (400ms..2400ms)

### Surface
- **Parallax depth** (0..1) — reserved for the active scene parallax
  behaviour (currently informational; scene parallax wired in
  follow-up).
- **Atmosphere blur** (0..1) — drives the `--ggm-atmosphere-blur` CSS
  variable consumed by the dither film and any future surface blur.
- **Custom cursor** (on / off)
- **Scroll progress** (on / off)

### Texture
- **Dither strength** (0..1)
- **Film grain** (0..1)

### Power Saver
- Forces `liquidStyle = "cut"`, sets intensities to 0, disables custom
  cursor, disables decorative film/dither, shortens transition to 240ms.

## How it persists

- All settings are written to `localStorage["ggm:motion-settings:v1"]`
  whenever they change (after first hydrate).
- On mount, the provider hydrates from localStorage and falls back to
  `GGM_MOTION_DEFAULTS` for any missing key.
- The provider also subscribes to `prefers-reduced-motion` and exposes
  it as `reducedMotion` so dependent components can branch on it.

## How "effective" values work

The context exposes both `settings` (raw owner choices) and `effective`
(values used by renderers). `effective` applies these overrides:

- If `reducedMotion` from the OS is `true`, OR `settings.powerSaver` is
  `true`, then animation-related fields are clamped to safe values
  (`liquidStyle: "cut"`, `liquidIntensity: 0`, `liquidDistortion: 0`,
  `liquidDurationMs: 240`, `ditherStrength: 0`, `filmGrainStrength: 0`,
  `blurAmount: 0`, `parallaxDepth: 0`, `customCursor: false`).

Renderers always read `effective`. This way operators cannot
inadvertently override accessibility preferences — the OS always wins.

## Why localStorage now (and not backend)

We deliberately chose local-only persistence for v3:

1. The backend `metadata.custom_presence.style_dna` is the right
   long-term home but does not currently expose per-pilot tuning
   fields in the schema. Designing those fields without a second pilot
   to compare against would over-fit the schema to GGM.
2. Owner / operator iteration during preview should be fast and
   reversible — localStorage gives that. When two pilots have tuned
   their motion grammar this way and a stable shape emerges, we
   promote the fields into the backend schema and switch the
   provider's persistence layer.
3. No backend writes means no auth permissions or RLS work needed for
   this pass.

## Visibility

The trigger is currently public. We left the pill in the rail rather
than gating it behind an owner-only role check because:

- The settings only affect the visitor's local rendering. Nothing is
  pushed to the Room owner or other visitors.
- Visitors who don't want to fiddle with motion can ignore it; the
  default values are tuned for the GGM aesthetic.
- A future Studio role check can gate the trigger via `<GgmSettingsMenu
  visible={isOwner} />` if we decide to make it owner-only.

## Documented future fields

When backend persistence opens up, the following should move to style
DNA so a fresh visitor sees the owner-authored settings before they
have a chance to tweak locally:

```jsonc
{
  "motion": {
    "transition": {
      "style": "ripple|glass|dissolve|cut",
      "intensity": 0.95,
      "distortion": 1.0,
      "duration_ms": 1100
    },
    "surface": {
      "parallax_depth": 0.5,
      "atmosphere_blur": 0.5
    },
    "texture": {
      "dither_strength": 0.62,
      "film_grain_strength": 0.42
    },
    "chrome": {
      "custom_cursor": true,
      "scroll_progress": true
    },
    "power_saver_default": false
  }
}
```

The local provider already speaks this shape (under camelCase keys),
so the migration is a serializer change.
