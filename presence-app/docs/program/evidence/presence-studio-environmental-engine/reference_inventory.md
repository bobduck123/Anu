# Presence Studio environmental engine — reference inventory

## Brand direction used

`C:\Dev\Presence (3)\HANDOFF.html` establishes Presence as a quiet, premium frame for a client's own world: calm core shell, expressive client material, and restrained system support. It specifically favours spatial attention, editorial atmosphere, DOM-critical content, and reduced-motion-safe crossfades over generic dashboard decoration.

Applied decisions:

- The room remains the client's content and editable objects; the environmental layer stays recessive and decorative.
- Gallery-oriented material uses paper/north-light depth rather than a dark generic “tech” scene.
- Focus changes are readable through framing, contrast, depth, and surface response, not an opaque loading or theatrical transition.
- All meaningful editor controls, content, and preview output stay in the DOM.

## Local prototype inventory

| Group | Path | Technology / effect | Value and recommended adaptation | Cost / mobile / accessibility | Provenance / decision |
|---|---|---|---|---|---|
| atmosphere | `C:\Dev\tools\bioluminescence` | Canvas particle field | Keep as a future nocturnal-world reference; do not impose it on an art-gallery room. | Continuous canvas work; reduced-motion and GPU risk. | CodePen provenance recorded in its README; **retain as reference**, no import. |
| chamber navigation | `C:\Dev\tools\time-traveling-art-gallery` | Immersive gallery sequencing | Borrow slow editorial framing and gallery-as-space, not its content/data machinery. | Needs a clear touch/navigation model. | CodePen original is documented in its README; **retain as composition reference**. |
| object focus | `C:\Dev\tools\gsap-floating-image-reveal-portfolio` | Pointer image reveal, GSAP quick transforms | Use the principle of deliberate focus only; selection stays click/tap and keyboard-safe. | Pointer-first interaction fails as a primary mobile/editor control. | CodePen original is documented; **reject raw implementation**. |
| camera and depth | `C:\Dev\tools\threejs-gsap-cinematic-ocean-scroll-scene\threejs-gsap-cinematic-ocean-scroll-scene` | Three.js / GSAP camera-led scroll scene | Reinterpret as deterministic room/chamber/object CSS camera states. | Large demo script, scroll coupling, WebGL and bundle cost. | Licence file present; **reject import**, retain architecture idea. |
| transitions | `C:\Dev\tools\threejs-gsap-liquid-morphology-slideshow\threejs-gsap-liquid-morphology-slideshow` | Three.js / GSAP liquid morphology | Adapt only layered material response through existing texture/motion fields. | High shader/GPU cost and unclear editing parity. | Licence file present; **reject import**, retain material-transition idea. |
| artwork presentation | `C:\Dev\tools\time-traveling-art-gallery` | Gallery wall / artwork sequence | Influence chamber framing and editorial work focus. | Must remain semantic image/content DOM. | **Retain reference**; no external image/API use. |
| cursor and pointer response | `C:\Dev\tools\gsap-draggable-image-gallery` | GSAP Draggable gallery | No adaptation in this proof; existing object selection has stronger, explicit semantics. | Drag conflicts with editing gestures and is weak on touch/accessibility. | CodePen original in README; **reject**. |
| text behaviour | `C:\Dev\tools\editorial-fashion-slider` | Editorial typography / image pacing | Keep typography integrated with depth, but leave content DOM-readable. | Low if CSS-only; source not used. | **Retain visual reference only**. |
| editor interaction | `C:\Dev\tools\dither`, `C:\Dev\tools\infinite-grid` | Material/grain and spatial composition studies | Use restrained texture/plane treatment, not a new canvas workspace. | Risk of visual noise and performance cost. | **Retain visual references only**. |
| mobile environmental behaviour | `C:\Dev\tools\gsap-draggable-image-gallery` | Touch-adjacent drag pattern | Do not carry over: use tap selection and fixed bottom-sheet inspector instead. | Explicit no-hover/touch-safe rule. | **Reject as interaction source**. |

## Existing repository primitives inspected

| Primitive | Reusable learning | Decision |
|---|---|---|
| `components/presence/world/engine/RoomCameraRig.tsx` | CSS 3D camera states, no animation loop, reduced-motion fallback | Adopt the deterministic state philosophy, not the world graph contract. |
| `components/presence/world/engine/RoomGraphRenderer.tsx` | Room/chamber composition and bounded environmental complexity | Keep V2 as its existing room/editor contract; do not introduce a second graph renderer. |
| `components/presence/world/BioluminescentField.tsx` | Canvas lifecycle hygiene | Do not require canvas/WebGL for this slice. |
| `components/presence/world/MagneticHover.tsx` | Pointer and reduced-motion handling | Do not add pointer-only choreography to editing. |

## Reuse / generalise / retire

- **Reuse:** deterministic CSS state philosophy from `RoomCameraRig`, existing chamber/world concepts, Studio V2 selection and private-preview contracts.
- **Generalise later:** the new `StudioV2EnvironmentModel` can become a shared environment primitive only after a second real room proves the contract.
- **Retire now:** none. Existing bioluminescent/canvas and pointer effects are room-specific references, not faults to remove in this task.

## Architecture decision

The implementation is a **DOM-first environmental layer**: exactly three decorative planes, CSS custom properties, and state-derived `room`, `chamber`, and `object` focus. It consumes existing V2 world/skin/chamber/object data and adds no persistence fields, API calls, third-party runtime, WebGL requirement, or animation-frame loop.

This is the smallest truthful working slice because it produces visible environment/camera/focus behaviour in both editor and preview while remaining safe for mobile, reduced motion, and no-WebGL environments. A future WebGL layer, if justified by a real migration, must be separately scoped with performance budgets and equivalent DOM fallback proof.
