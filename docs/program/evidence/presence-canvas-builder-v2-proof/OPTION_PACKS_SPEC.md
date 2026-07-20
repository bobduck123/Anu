# Option Packs — Spec

Date: 2026-05-24
Implementation: `lib/presence/option-packs/registry.ts`

## Shape

Each pack bundles:

- **palette** — 8 colour tokens (bg / paper / paper-warm / ink / muted / line / stage / accent).
- **typography** — heading + body stacks + `font_pack_id` reference.
- **motion** — intensity + liquid style + numeric motion knobs + heavy-motion-enabled flag.
- **layout** — per-scene layout tokens + per-widget layout tokens.
- **actions** — invitation button style.
- **pilotSafe** — true means visible to default pilots.
- **publicRendererSupport** — true means every layout token the pack writes is actually wired in the renderer today. Packs that exercise unwired layout tokens are pilot-hidden.
- **advancedOnly** — true means only owners with advanced mode unlocked see the pack.

## Why a pack is not the end of customisation

After applying a pack, the owner can override **any token** through the inspector:

- swap the heading font without losing the body font.
- change one palette colour without losing the pack's motion settings.
- change motion intensity without disturbing the palette.
- change the work-wall layout without changing the calling-card layout.

Packs are starting points. The Canvas surfaces them as visual swatches. After application, the per-element inspector exposes the same tokens for tuning.

## Apply mechanism

`optionPackToConfigPatch(pack)` returns a partial editable_config that the editor's `mutate()` merges into the draft:

- `style_dna.palette.*` — full palette overwrite.
- `style_dna.typography.heading_stack / body_stack / font_pack_id` — set.
- `style_dna.invitation_style` — set.
- `motion_config.*` — every motion knob set to pack defaults.
- `scene_config.layouts.{sceneId} = layoutToken` — sets layout tokens per scene.

The pack does **not** touch:

- `content_config.*` — owner-authored content is preserved.
- `asset_config.*` — owner-attached assets are preserved.
- `roomkey_config.*` — RoomKey copy is preserved.
- `enquiry_config.*` — enquiry posture is preserved.

So applying "Ink Room" after authoring biography text won't lose the biography.

## Shipped starter packs

| Pack | Pilot safe | Renderer support | Description |
|---|---|---|---|
| **Paper Gallery** | ✓ | ✓ | Default. Quiet paper, gallery ink, gentle ripple. The Christina Goddard default mood. |
| **Ink Room** | ✓ | ✓ | Dark stage, warm type, slower glass morph. Photography / fashion friendly. |
| **Warm Archive** | hidden | ✗ | Ochre paper, mono captions, archive-drawer wall. Layout token not yet wired. |
| **Liquid Signal** | hidden | ✗ | Immersive heavy motion + magazine-spread layout. Both unwired + advanced-only. |

Pilot owners see 2 packs today. After Codex wires `archive-drawer` and `magazine-spread` layouts, the count rises.

## Adding new packs

Packs are data, not code. To add "Soft Studio":

1. Append a `PresenceOptionPack` to `OPTION_PACKS` in `registry.ts`.
2. Set `publicRendererSupport: true` only if every layout token + invitation style + motion preset already renders.
3. Set `pilotSafe: false` if it uses heavy motion or experimental layouts.
4. Add a thumbnail / swatch gradient.
5. Done.

No code change required to expose it in the Canvas drawer.

## Future packs (recommended)

- **Editorial Gallery** — already covered by Paper Gallery; expose typography pack independently.
- **Soft Studio** — pair Instrument Serif headings with Inter body.
- **Brutalist Poster** — Space Grotesk + bold accent + magazine-spread layout (needs renderer wiring).
- **Calm Practitioner** — desaturated palette + soft transitions + practitioner-card layout (needs new renderer).
- **Club Flyer** — Caveat handwritten headings + saturated accent + carousel wall (needs renderer wiring).
- **Institutional Clean** — Inter throughout + grid wall + neutral palette.
- **Street/Zine** — Bold contrast + monospaced + film-strip wall (needs renderer wiring).
- **Luxury Serif** — Playfair display + warm neutrals + business-card calling card.

Each future pack is an `OPTION_PACKS` entry. The infrastructure shipped this pass supports them without code changes once their layout tokens are wired.

## Marketplace direction (Level 5)

Packs become first-class shareable objects:

- An owner who lands on a perfect mood can `Save this mood as…` → creates a private pack in their account.
- A curator's pack can be `Publish to community gallery` (later).
- Other owners can `Try this pack` to apply it to their draft.
- Optionally licensed packs ($) for premium aesthetics.

This is all enabled by the pack schema being data-driven and non-destructive.
