# Studio V2 layout composition — private local slice

## Status

This is a private local fixture proof built from environmental checkpoint `d656add`. It adds a guarded room-arrangement contract, not arbitrary page-building and not a hosted migration claim.

## What owners can do

- Choose Gallery Wall or Portal Threshold for the active chamber.
- See typed layout zones inside the editor room.
- Select an existing object and choose a compatible zone, size, treatment, or zone order using touch-safe controls.
- Preview the same resolved composition through the existing private renderer.

## Guardrails

- Missing or invalid placement data becomes a stable default based on chamber object order.
- Compatibility, maximum-zone capacity, and visibility remain authoritative.
- Hidden-from-public objects are removed before composition reaches the public projection.
- **PARTIAL — DRAG FALLBACK ONLY:** this pass deliberately provides accessible controlled placement and reorder controls; it does not claim pointer drag-and-drop.

## Architecture

- `layouts.ts` is the typed registry and normalizer.
- Chamber composition is persisted inside the existing `scene_config.studio_v2.chambers[]` draft shape.
- No backend, schema, dependency, WebGL, GSAP, publication, or public route change is included.

## Validation

Record focused layout, existing private/environment regression, typecheck, and build results after implementation.
