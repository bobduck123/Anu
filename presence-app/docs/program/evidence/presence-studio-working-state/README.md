# Presence Studio Working-State Evidence

Date: 2026-07-20

## Scope proved

- Studio V2 remains the canonical editor for explicitly eligible V2 rooms; the legacy editor remains compatibility-only and Studio Room remains a separate template workflow.
- Ordinary V2 draft edits use a debounced autosave that never publishes and preserves local changes after a failed autosave.
- Canvas transforms remain explicitly saved after the gesture settles; the save/reload regression verifies drag, scale, and rotation values in the acknowledged draft payload and after reload.
- The private preview uses the existing sanitized V2 public-renderer projection.
- The controlled GGM Room 11-shaped local fixture removes share and publish affordances in both editor and preview. No publish request is made.
- Existing public GGM containment, an unrelated demo, a backend-published room, responsive device controls, and renderer hygiene all remain covered by the targeted suite.
- The rendered Studio now has a deterministic Studio Guide. It responds to saved, saving, unsaved, selected-public, selected-private, and no-selection states without an LLM dependency.
- The supported Style DNA subset is truthful: background, texture, motion intensity, heading weight, object shape, shadow depth, and accent are persisted through the existing V2 schema. Background, accent, object shape, and shadow are reflected on the editor canvas; the renderer projection receives the same background value.
- Aura Intensity, Display Type, and Borders were removed from the active Skin Lab because the current renderer contract does not make them truthful controls.
- At mobile width the global Studio controls form a horizontally scrollable RoomDock, leaving the canvas primary while retaining access to outline, inspector, viewport, preview, and save controls.
- The Skin Lab overlay now rises above the parent Studio header while open, so its close action remains reachable.

## Visual evidence

The screenshots in `screenshots/` are authorised local Room 11-shaped fixture evidence only. They contain no real owner session, credential, token, or hosted data.

- `01-initial-studio-load-desktop.png` â€” desktop Studio shell and dominant canvas.
- `02-canvas-no-selection-desktop.png` â€” room with no object selected.
- `03-chamber-selected-desktop.png` â€” chamber focus is reflected in the canvas.
- `04-object-selected-contextual-inspector.png` â€” selected object and contextual inspector.
- `05-active-text-edit.png` â€” active content edit.
- `06-saving-state.png` and `07-saved-state.png` â€” truthful save feedback.
- `08-private-preview.png` â€” owner-only preview surface.
- `09-mobile-canvas.png` and `10-mobile-contextual-controls.png` â€” narrow-room canvas and selected-object controls.
- `11-laptop-constrained-layout.png`, `12-tablet-portrait-layout.png`, and `13-mobile-landscape-roomdock.png` â€” constrained desktop, tablet portrait, and landscape control layouts.

## Validation run

```text
npm run typecheck
npm run test:e2e -- [targeted Studio, renderer, containment, and on-brand specs] --project=chromium --retries=0 --workers=1
npm run build
```

Result: the baseline typecheck/build and 11 Chromium checks passed before this pass. The on-brand working-state browser spec adds 2 Chromium checks, including private screenshot capture, Style DNA projection, Studio Guide, and mobile RoomDock reachability.

The test server was an isolated local Next process configured only with the repository's existing mock API and test authentication flag. The normal project E2E launcher infers `C:\Dev` as the workspace root because another lockfile exists there, so this focused run used the app-rooted local server instead. This is a harness limitation, not a production result.

## What this does not prove

- No real GGM Candidate A owner session, credential, auth subject, or backend draft was read or changed.
- No hosted owner Studio workflow was exercised.
- No GGM media access, upload/crop persistence, history integration, public release, deployment, or publish workflow was added.
- No fallback was removed beyond the already-deployed contained-GGM public route policy.
- Asset selection remains reference-based. The asset panel accurately reports derived references and does not claim that uploads are durable.

GGM remains private working proof. This evidence is not launch evidence and must not be presented as a system-native migration.

## Follow-up gate

Before claiming a real GGM migration, complete a separately authorised hosted owner-bound diagnostic/proof against the controlled backend room. It must show the actual owner scope, draft read/save/reload, authenticated private preview, and continued private/public containment without exposing private data.

The next build work order for media is: add a bounded owner asset upload/reference contract with server-issued durable asset IDs, validation, private-preview resolution, renderer resolution, and save/reload proof. Do not present browser blob URLs as persisted assets.
