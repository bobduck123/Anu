# Custom Presence Style DNA — Systemic Notes (v3)

Date: 2026-05-23
Owner: future custom-Presence ingestions
Replaces / extends: `CUSTOM_PRESENCE_STYLE_DNA.md` (v2)

This document captures the patterns that should become reusable
primitives for any future custom-Presence Room ingestion, after the
v3 GGM pass.

## Patterns ready for promotion

| # | Pattern | Status | Lives at |
|---|---|---|---|
| 1 | **Scene plate navigation** | Ready | `GgmStage` + `GgmStage`-internal Rail / MobileDock |
| 2 | **Artwork-first hero** | Ready | Scene `surface: undefined` + `overlay` |
| 3 | **Source-derived paper palette** | Ready (v1) | `.ggm` CSS vars |
| 4 | **Source-derived motion grammar** | Ready | `GgmMotionContext` + `GgmLiquidCanvas` |
| 5 | **Liquid image morphology** | Ready | `GgmLiquidCanvas` (WebGL2, no Three.js) |
| 6 | **Dither / film atmosphere** | Ready | `.ditherFilm` SVG-noise composite |
| 7 | **About-as-Studio** | Ready | `GgmStudioScene` |
| 8 | **Contact-as-Object** | Ready | `GgmCallingCard` |
| 9 | **App-side motion controls** | Ready | `GgmSettingsMenu` + `GgmMotionContext` |
| 10 | **RoomKey as scene entry** | Ready | `RoomKeyEntry` dispatch + Scene 01 `roomKeySourceLabel` chip |
| 11 | **Mechanical card transitions** | Ready | `GgmStage` state machine + `GgmLiquidCanvas` morph |
| 12 | **Source-site motion ingestion** | Documented | `MOTION_REFERENCE_REVIEW.md` |

## Proposed shared-kit shape

When the second custom-Presence pilot lands, these primitives graduate
to `lib/presence/custom-dna/`:

```
lib/presence/custom-dna/
  registry.ts              # custom-renderer activation table
  stage/
    Stage.tsx              # scene state machine + rail + mobile dock
    LiquidCanvas.tsx       # WebGL2 image morph (port of GgmLiquidCanvas)
    SettingsMenu.tsx       # motion settings dropdown
    MotionContext.tsx      # provider + localStorage persistence
    types.ts               # SceneDef, LiquidStyle, MotionSettings
  scenes/
    ArtworkField.tsx       # generic "image + overlay" scene
    PracticeStudio.tsx     # generic workbench scene (config: timeline, strands, inspire)
    CallingCard.tsx        # generic invitation-card scene (config: lines, seal text)
    WorkWall.tsx           # generic asymmetric image wall (config: works[], layout)
  atmosphere/
    DitherFilm.tsx         # generic SVG-noise dither film
    LiquidField.tsx        # generic cursor-tracked radial bloom
  chrome/
    Cursor.tsx             # generic mix-blend-difference cursor dot
    ScrollProgress.tsx     # generic 1px scroll bar
  README.md
```

The GGM renderer would then become:

```tsx
<CustomPresenceRoom
  paletteTokens={GGM_PALETTE}
  brand={artist.name}
  scenes={[
    { kind: "artwork-field", overlay: <ArtworkFieldOverlay …/> },
    { kind: "work-wall", works: GGM_WORKS },
    { kind: "practice-studio", studio: GGM_STUDIO_CONTENT },
    { kind: "calling-card", lines: GGM_CONTACT_LINES, seal: "GGM ✱ 2026" },
  ]}
/>
```

That's the shape future pilots should adopt.

## Activation contract (unchanged)

Custom renderers register by key. `PresenceDnaRenderer` checks
`resolveCustomRendererKey(node)` after the DNA plan hook and dispatches
before falling through to the generic blueprint chain. The signature
helpers in `lib/presence/ggm/activate.ts` are a pattern future
activators should follow:

1. Canonical slug constant.
2. Metadata path checks (`metadata.custom_presence.style_dna.renderer_key`,
   `metadata.custom_renderer_key`).
3. Identity signature fallback (slug pattern + display-name pattern).
4. Dispatch only after hooks have been called (rules-of-hooks safe).

## Source-site ingestion checklist

For each new custom-Presence ingestion, walk through:

- [ ] Inspect source-site routes, components, palette, type, motion,
      atmosphere → write `CLAUDE_SOURCE_REVIEW.md`.
- [ ] Identify what the current Presence renderer gets wrong → write
      `CURRENT_<PILOT>_FAILURE_REVIEW.md`.
- [ ] Author 4–6 scenes that map to the source narrative.
- [ ] Capture source palette tokens verbatim.
- [ ] Capture source motion grammar as 4–6 named motifs.
- [ ] Identify a "Contact-as-Object" composition that fits the source
      brand (calling card, letter, appointment slip, certificate).
- [ ] Identify an "About-as-Studio" composition that fits the source
      practice (workbench, clinic, ledger, kitchen pass).
- [ ] Wire RoomKey scene-entry chip into Scene 01.
- [ ] Activate via metadata + signature fallback.
- [ ] Honour reduced-motion, mobile, low-power.
- [ ] Capture parity screenshots (source vs custom) at desktop + mobile.
- [ ] Document gaps + reusable primitive promotions.

## What we deliberately did NOT abstract

A few elements stayed pilot-specific on purpose:

- **Wall layout (`wallTile1`–`wallTile8`)**: the asymmetric 12-col
  hang was authored for the GGM artwork aspect ratios. A new pilot
  will want a different layout grammar; we keep this as a per-pilot
  choice, not a shared component.
- **Studio composition**: the four strand cards + working-path
  timeline + inspire-rail composition fits a watercolour painter's
  about page. A consultant or a hospitality pilot would compose
  differently.
- **Calling-card content rows**: the STUDIO / PRACTICE / DIRECT /
  EXTERNAL rows are specific to GGM. The seal text "GGM ✱ 2026" is
  authored per pilot.

The right abstraction line is: **shared primitives for behaviour and
chrome; per-pilot composition for content.**
