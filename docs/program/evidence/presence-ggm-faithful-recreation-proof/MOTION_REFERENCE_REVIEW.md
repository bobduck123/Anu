# Motion Reference Review

Date: 2026-05-23
Pass: v3 (premium motion + scene-stage)

## References inspected

| Reference | Type | Use |
|---|---|---|
| `C:\Dev\tools\threejs-gsap-liquid-morphology-slideshow` | MIT-licensed Three.js + GSAP shader slideshow | Source of liquid morph technique (glass / frost / ripple / plasma / timeshift) |
| `C:\Dev\tools\12-principlesbrutalist-scroll-page-with-gsap` | MIT-licensed GSAP brutalist scroll | Choreography idioms (ghosts, IO reveals, custom cursor) — adopted in v2 |
| `https://maanara.vercel.app/` | Live site | Card-as-surface interaction model with stable chrome |
| `C:\Dev\ggm` | Local static source | Canonical content + visual language |
| `presence-app/components/presence/ggm/*` | Current renderer | What we're upgrading |

## Liquid morphology reference — technical breakdown

**Stack.** Three.js (ES module from esm.sh), GSAP timeline, tweakpane
control panel. Single full-viewport quad with a `ShaderMaterial`. Two
`uTexture1` / `uTexture2` sampler2D inputs and one `uProgress` uniform.
Effect selected at runtime via `uEffectType` int. Five effect modes:

| Mode | Visual idea | Key shader move |
|---|---|---|
| `glass` | Bubble/sphere emerges from center, refracts the new image inside, chromatic aberration on the bubble edge, rim light | `smoothstep` mask of radial distance, refraction offset along `normalize(p - center)`, RGB channels sampled at slightly different UVs |
| `frost` | Crystalline ice growth covers the old image | Multi-octave `smoothNoise` + smoothstep on noise threshold ramped by progress |
| `ripple` | Concentric waves emanate from center and displace the new image | `sin((dist - waveRadius) * frequency) * exp(-abs(dist - waveRadius) * decay)` — classic shock-wave displacement |
| `plasma` | Energetic plasma field with electric flow and color glow | Layered `sin`/`cos` plasma fields + smooth noise turbulence + saturation/contrast boost |
| `timeshift` | Motion-blur/chromatic time-flow transition | Per-channel UV offsets along a flow field with blur sample loop |

All five effects share a `getCoverUV()` helper that does proper
object-fit:cover sampling from the textures into the viewport.

**Why it works.** The shader works on the artist's images directly,
not on abstractions. The morph isn't a CSS overlay — it's the new
image being warped, sampled, and revealed via a GPU pixel program.
Performance is a single full-viewport draw per frame so a mid-range
laptop / phone GPU handles it easily.

**What we can safely port.** The shader fragments are clean GLSL ES,
~50 lines each. They depend on:
- two image textures
- one progress uniform
- the viewport resolution + texture sizes
- a few effect-specific uniforms

None of this requires Three.js. We can run the same shaders in a
vanilla WebGL2 quad with ~150 lines of setup code, no GSAP. GSAP just
animates the progress uniform; React state + rAF does the same job.

**What we should simplify.** The reference ships all five effects plus
a tweakpane control panel; that's a heavy bundle. For GGM we only
need:
- one cinematic effect (we choose **ripple** for art-gallery feel —
  soft, image-native, no chromatic aberration extremes) plus
- one alternate effect for the settings dropdown (we choose **glass**
  — bubble emergence — for a more cinematic alternative).
- a "soft dissolve" fallback that runs in CSS only (used under reduced
  motion or low-power).

**What should become reusable.** A `WebGLImageMorph` primitive that
takes two image URLs + a progress (0..1) + an effect name and renders
the morph into a `<canvas>`. It belongs under
`lib/presence/custom-dna/atmosphere/` when 2–3 pilots are using it.

## Maanara card / tile reference

The Maanara model gives us:

- **Stable chrome**: left rail + top brand. The visitor's eye trains
  on the chrome as constant.
- **Central tile** that takes the role of the active scene.
- **Internal scroll within a tile** when a scene has more content
  than the tile can show.
- **Mechanical replacement** of one scene by another rather than
  scroll-driven reveal.

**What we keep for GGM.**

- A central staged area ("Stage") that the active scene fills.
- A left rail with brand + chapter index + settings.
- Top edge still carries the GGM mix-blend-difference nav (a GGM-specific
  signature we preserve).
- Internal scroll allowed inside long scenes (Work Wall, Practice
  Studio).
- Scene transitions feel like the stage being replaced, not scrolled.

**What we don't copy.** Maanara's vertical pill-text rail design,
their teal/orange palette, their card-stack styling. We use GGM's
paper palette and editorial type.

## Combining the two

The GGM v3 scene system:

1. The visitor sees a stable frame: GGM nav (top), brand + scene rail
   + settings (left), Presence action strip (bottom), all in paper.
2. The Stage in the center holds the active scene.
3. Scene transitions play a WebGL liquid morph between the outgoing
   scene's "background image" (or a snapshot) and the incoming scene's
   background image.
4. Scenes 01 (Artwork Field) and 02 (Work Wall) use real artworks as
   the morph source/target.
5. Scenes 03 (Practice Studio) and 04 (Calling Card) use generated
   paper backgrounds (subtle radial gradients) so the morph still
   reads as a real image transition, not a generic crossfade.
6. Settings dropdown lets owner/operator tune the morph live (intensity,
   distortion, dither strength, transition style, duration, cursor on/off,
   power saver).
7. Reduced-motion / low-power: WebGL canvas swaps for a 220ms crisp
   cross-cut between scene cards (still feels mechanical, no motion
   sickness).

## Porting strategy (no Three.js bundle)

- **Shader.** Pull glass + ripple from the reference, simplify uniforms
  to a single `uProgress` + a couple of style knobs.
- **Renderer.** Vanilla WebGL2 setup in `GgmLiquidCanvas.tsx`. ~150
  lines, no dependencies. Falls back to CSS crossfade if `getContext("webgl2")`
  returns null.
- **Progress animation.** React state + rAF with a configurable
  easing curve. No GSAP.
- **Textures.** `Image()` loaded async + `texImage2D`. Each scene
  declares its background image URL; the stage preloads them.

This keeps the bundle small (estimated ~6 KB for the GL primitive +
shader) and lets us drop Three.js entirely.

## What this gives us creatively

- Premium image-driven transitions that match the source's intent.
- Scene replacement feel (Maanara) instead of scroll-page feel.
- Owner-tunable motion grammar (settings dropdown).
- A clean fallback path for reduced motion / low-power devices.
- Reusable primitives the next custom pilot can inherit.
