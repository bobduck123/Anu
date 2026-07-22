# Studio V3 M1 constrained direct manipulation

Status: bounded interaction implemented; final desktop/mobile E2E rerun passed

## Interaction contract

1. Click/tap selects a Piece through the synchronous editor bridge; visitor CTA/link behavior is suppressed.
2. Arrange presents only registered zones from the active Room Style and a visible zone/order/size/visibility summary.
3. The selected card sets a custom Studio MIME payload. A zone accepts a drop only when that payload exactly matches the selected object; files, webpage text, wrong IDs, and unknown drags no-op.
4. Accepted moves snap to a registered zone and registered size/treatment. No arbitrary x/y coordinates exist.
5. Zone cards, Earlier/Later, Feature/Unfeature, stepped Size, per-Piece Treatment, Show/Hide, and Unplace provide keyboard/tap/mobile alternatives.
6. Required navigation CTA visibility and label invariants are enforced in both UI and core mutation helpers.
7. Done accepts valid private state. Cancel, Close, or Escape restores the exact Arrange-entry state while preserving newly completed private media inventory.
8. When Unplace removes the invoker, focus returns to the stable topbar Pieces trigger.

Advanced depth/free transforms and crop/focal manipulation are not part of this bounded interaction set; their disabled states say so explicitly.

## Evidence

- compiler tests reject unknown zones, exclude hidden/unavailable Pieces before capacity allocation, preserve visible residents, and retain source-safe explicit arrangements across private restore;
- E2E asserts a real zone/order/feature transition, wrong drag payload no-op, exact cancel, visitor suppression, focus restoration, and mobile alternatives;
- screenshot `05-direct-manipulation-reorder.png` shows the registered-zone board and placement readout.
