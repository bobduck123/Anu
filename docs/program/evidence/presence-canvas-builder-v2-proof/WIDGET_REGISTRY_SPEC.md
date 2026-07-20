# Widget Registry — Spec

Date: 2026-05-24
Implementation: `lib/presence/widgets/registry.ts`

## Why a registry

Widgets are the unit of editing. Every visible element on a Presence
Room (title, caption, image, work-wall, statement, calling card,
invitation, …) is a `WidgetInstance` referenced by id in the
`PresenceRenderModel`. The registry declares what widgets exist, who
can see them, where they can live, and how the inspector edits them.

## Lifecycle states

| State | Meaning | Pilot visibility |
|---|---|---|
| `live` | Fully wired in Canvas + public renderer | Default |
| `canvas-draft` | Usable in Canvas, public render not wired | Advanced |
| `coming-soon` | Visible in library, click disabled | Advanced |
| `staff` | Operator-only | Hidden |
| `experimental` | Design exploration | Hidden |

The Canvas widget-library drawer reads `listWidgetsForPilot()` which
returns only `live` + `coming-soon` widgets with pilot or advanced
visibility. Pilots can see "coming soon" cards so the product roadmap
is honest, but they can't add them.

## Categories

- **identity** — title, caption, hero image, slideshow.
- **story** — biography, statement, process notes, studio fragments, inspiration board.
- **gallery** — work wall (with layout variants), feature work.
- **action** — calling card, invitation, external link.
- **spatial** — RoomKey chip.
- **decorative** — divider, frame.
- **scene-frame** — reserved for future per-scene chrome controls.

## Inventory shipped in this pass (17)

| Type | Category | Support | Scenes | Cardinality |
|---|---|---|---|---|
| `hero-title` | identity | live | any | single |
| `hero-caption` | identity | live | any | single |
| `hero-image` | identity | live | field | single |
| `hero-slideshow` | identity | live | field | single |
| `statement` | story | live | studio, card | single |
| `biography` | story | live | studio | single |
| `process-notes` | story | live | studio | single |
| `studio-fragments` | story | live | studio | single |
| `inspire-board` | story | live | studio | single |
| `work-wall` | gallery | live | wall | single |
| `work-feature` | gallery | live | wall | single |
| `calling-card` | action | live | card | single |
| `invitation` | action | live | card, studio | many |
| `external-link` | action | live | card, studio | many |
| `roomkey-chip` | spatial | live | field | single |
| `divider` | decorative | coming-soon | any | many |
| `decorative-frame` | decorative | staff | any | single |

## Each widget declares

```ts
interface WidgetDefinition<TConfig> {
  type: WidgetType;
  category: WidgetCategory;
  label: string;           // Library label
  description: string;     // Description on hover
  hint: string;            // Sub-line in drawer
  support: WidgetSupportState;
  pilotVisibility: WidgetPilotVisibility;
  allowedScenes: string[] | null;
  cardinality: "single" | "many";
  defaultConfig: TConfig;
  renderers: string[];      // renderer_key list this widget renders under
  inspector: {              // which inspector tabs to show
    content: boolean;
    style: boolean;
    layout: boolean;
    motion: boolean;
    actions: boolean;
  };
}
```

## Extending the registry (for Codex / future passes)

To add a new widget:

1. Add the `WidgetType` literal to `lib/presence/render/model.ts`.
2. Append a `WidgetDefinition` to `WIDGET_DEFINITIONS` in `lib/presence/widgets/registry.ts`.
3. Teach the resolver (`lib/presence/render/resolver.ts`) how to produce the widget instance from the config.
4. Teach the renderer (`GgmFaithfulRoom` or future renderer) how to draw the widget.
5. Set `support: "live"` only when steps 3 + 4 are both done. Otherwise `canvas-draft` so it's visible in the library but unrenderable.

## Public renderer wiring (Codex P0)

Today, `GgmFaithfulRoom` hard-codes the 4 GGM scenes + their widget composition. After the resolver wiring:

- `GgmFaithfulRoom` receives `model: PresenceRenderModel`.
- For each scene, iterate `scene.widgets` and dispatch by `widget.type` to the matching scene component (`<ArtworkFieldContent>`, `<WorkWallSurface>`, `<GgmStudioScene>`, `<GgmCallingCard>`, etc.).
- Each component reads its config from `widget.config`.
- Layout variants (`gallery-wall` vs `stack` vs `archive-drawer`) are switched on `widget.config.layout`.

This is what closes the parity gap: the renderer reads widgets from the same registry the Canvas inspects.
