# Presence Canvas Builder v2 — Proof Pack

Date: 2026-05-24
Status: **architectural foundation landed; Codex handoff required for
UI wiring + drag-drop + parity tests across remaining tokens.**

## What this pack contains

1. `README.md` — this index.
2. `CANVAS_PUBLIC_PARITY_REPORT.md` — the audit that identified why
   Canvas and public renderer were detached, with exact code paths.
3. `WIDGET_REGISTRY_SPEC.md` — the widget catalog, state flags, pilot
   visibility model.
4. `OPTION_PACKS_SPEC.md` — option pack schema + the 3 starter packs
   (Paper Gallery, Ink Room, Warm Archive) + advanced pack (Liquid
   Signal).
5. `CUSTOMISATION_CONTROLS_SPEC.md` — text / colour / background /
   image / gallery / motion / action control surfaces and their
   token bindings.
6. `CODEX_HANDOFF.md` — the prompt Codex executes next.
7. `KNOWN_LIMITATIONS.md` — what is honestly unfinished.

## What Claude implemented in this pass

| Layer | File | Status |
|---|---|---|
| Render contract types | `lib/presence/render/model.ts` | ✓ |
| Shared resolver | `lib/presence/render/resolver.ts` | ✓ (GGM + generic) |
| Resolver parity tests | `lib/presence/render/resolver.test.ts` | ✓ 6/6 pass |
| Widget registry | `lib/presence/widgets/registry.ts` | ✓ 17 widgets defined |
| Option pack registry | `lib/presence/option-packs/registry.ts` | ✓ 4 packs (3 pilot-safe, 1 advanced) |
| Font registry | `lib/presence/typography/registry.ts` | ✓ 12 fonts + 6 packs |

Verification:
- `npm run typecheck` ✓ clean
- `npm run build` ✓ clean
- `node --test lib/presence/render/resolver.test.ts` ✓ 6/6 pass

## What Claude did NOT change

- `lib/presence/ggm/editable.ts` — the GGM-specific public adapter (kept; Codex retires this as the resolver replaces it).
- `lib/editor/canvasModel.ts` — the Canvas-side adapter (kept; Codex
  retires this as the resolver becomes the read path).
- `components/portfolio/PortfolioRenderer.tsx` — Codex wires this to
  consume `resolveRenderModel(node, "published")`.
- `components/studio/editor/PresenceCanvasMode.tsx` — Codex wires this
  to consume `resolveRenderModel({ ...node, editable_config: draft }, "draft")`.
- 11-tab advanced editor — unchanged; demotes to advanced drawer in
  next pass.

## Pilot launch implications

- **Pilot still NO-GO** until Codex completes the wiring pass below.
  The foundation is in place but the public renderer and Canvas
  still read their separate adapters. Until both call the shared
  resolver, the parity guarantee is type-level only.
- After Codex wiring lands, the system is **ready for friendly
  pilots** with the widget drawer + 3 option packs + curated fonts
  + colour controls + per-element style overrides — **without** the
  user having to touch the 11-tab CRM.

## Final standard reached?

- ☑ Single render model (`PresenceRenderModel`)
- ☑ Single resolver (`resolveRenderModel`)
- ☑ Widget registry with state + pilot flags
- ☑ Option pack schema + 3 starter packs
- ☑ Font registry with system + curated Google Fonts
- ☐ Public renderer consumes resolver (Codex)
- ☐ Canvas consumes resolver (Codex)
- ☐ Widget library drawer in Canvas (Codex)
- ☐ Per-widget inspector with style/layout/motion tabs (Codex)
- ☐ Drag-reorder via dnd-kit for work wall + calling-card lines + studio fragments (Codex)
- ☐ Font picker in Canvas (Codex)
- ☐ Colour pickers per palette token (Codex)
- ☐ Parity test matrix for every widget × token (Codex)
- ☐ Hosted owner-auth proof of the full lifecycle (Codex + operator)

When the unchecked items land, the product crosses from "Level 3 — Visual inspector" into "Level 4 — Direct manipulation".
