# Presence Studio environmental engine — private local proof

## Scope and status

This evidence records a **private, local Room 11-shaped fixture** on `feat/presence-studio-environmental-engine`. It proves presentation behaviour in Studio V2 only. It does not prove hosted owner access, a real backend owner mapping, durable media migration, a public GGM route, or launch readiness.

The slice adds a three-plane DOM environment to the existing V2 room. It derives room/chamber/object focus from existing V2 state, remains editor/preview-consistent, and requires neither WebGL nor a new runtime dependency.

## What changed

- Added `deriveStudioV2Environment`, a small shared state contract with `room`, `chamber`, and `object` focus.
- Added an `aria-hidden` three-plane DOM depth layer to the editor room and V2 preview renderer.
- Added deterministic CSS focus/camera transitions and chamber de-emphasis without making them an interaction dependency.
- Kept all meaningful room content, editing controls, private preview, and fallback behaviour in semantic DOM.
- Made the selected-object inspector a fixed contextual mobile sheet without changing its data or save path.

## Environmental contract

| Primitive | This slice |
|---|---|
| RoomWorld | Existing V2 world and Style DNA remain the room identity source. |
| EnvironmentLayer | Three `aria-hidden` DOM planes for atmosphere, depth, texture, and deterministic focus response. |
| SpatialChamber | Existing chamber IDs and active-chamber state determine focus/emphasis; no new schema. |
| RoomObject | Existing selectable object ID triggers object focus while its visibility/lock state remains unchanged. |
| CameraDirector | `deriveStudioV2Environment` moves explicitly between `room`, `chamber`, and `object`; CSS transitions have no uncontrolled loop. |
| StudioInstrumentation | Existing selection outline, handles, labels, Guide, dirty state, and inspector remain editor-only. |
| PerformanceProfile | Contract exposes `high`, `balanced`, `reduced`, and `fallback`; this release implements the bounded DOM `balanced` path and the reduced/fallback-safe path. |

The draft pipeline remains unchanged: draft payload → existing Studio V2 state/canvas → sanitized private preview → shared public renderer. The environment derives from that state, so it does not create a parallel renderer or an editor-only world schema.

## Evidence frames

| Frame | What it proves |
|---|---|
| `01-room-overview-desktop.png` | Local private Studio overview and room-level environmental frame. |
| `02-room-focus-frame.png` | Room focus state in the editor canvas. |
| `03-chamber-focus-frame.png` | Chamber selection shifts the deterministic focus state. |
| `04-object-focus-inspector.png` | Object selection produces an editor selection frame and contextual inspector. |
| `05-style-dna-environment.png` | Existing background, texture, and motion fields alter the same room environment. |
| `06-private-preview-parity.png` | Owner-only private preview uses the same DOM environment without editor instrumentation. |
| `07-mobile-contextual-inspector.png` | Small-screen selected-object inspector is a contextual bottom sheet. |
| `08-reduced-motion-no-webgl.png` | Reduced motion and a no-canvas context retain room editing and DOM environment. |

Frames `01` through `06` form the requested state sequence: room → chamber → object → Style DNA → private preview. The files are deliberately stored as private local evidence; they must not be used as public GGM proof.

## Validation record

```text
npm run typecheck
  PASS

npm run test:e2e -- [eight Studio V2 / containment / private-proof specs] --project=chromium --retries=0 --workers=1
  PASS — 18 tests

npm run build
  PASS — Next.js production build
```

No lint script and no named npm unit-test script exist in `package.json`.

### Focused regression coverage

- Room click returns the environment to `room` focus.
- Chamber selection moves it to `chamber` focus.
- Object selection moves it to `object` focus and preserves inspector/selection affordances.
- Reduced motion disables transition timing; no-WebGL capability is irrelevant to editing.
- Mobile keeps a visible contextual inspector; preview contains no editor controls.
- Existing private GGM containment, local draft save/reload/preview proof, direct manipulation, inspector, preview, and on-brand working-state suites remain green.

## Architecture and performance

- **Runtime:** DOM/CSS only; three decorative elements per room.
- **Animation:** CSS transitions only; no requestAnimationFrame loop, canvas requirement, or WebGL dependency.
- **Accessibility:** layer is `aria-hidden`; native editor controls and content remain the interaction surface.
- **Fallback:** browsers without WebGL continue to receive the same DOM room; reduced motion disables environmental transitions.
- **Rejected for this task:** raw prototype imports, new Three.js/GSAP dependencies, drag-first gallery behaviour, and any global renderer rewrite.

High is deliberately deferred until a real room demonstrates that a GPU layer earns its bundle and lifecycle cost. There is no WebGL context to lose or dispose in this DOM slice; no requestAnimationFrame loop, GSAP timeline, canvas allocation, or shader resource is introduced. The environmental layer is available immediately with the editor rather than blocking draft load or hydration.

See [reference_inventory.md](reference_inventory.md) for source review and [EXEC_PLAN.md](EXEC_PLAN.md) for the scoped plan.

## Known limits and next proof gate

- The local fixture does not establish a real client session, owner scope, or system-native migrated record.
- It changes neither public containment nor any fallback policy; frontend fallback is not migration evidence.
- The build passes with Next.js’s pre-existing multiple-lockfile workspace-root warning. No config change was made in this slice.

The next safe task is a separate read-safe hosted owner-bound Studio diagnostic when the owner/auth contract is available. It must confirm the real room, persisted draft read/write behaviour, and private/public boundary before any migration claim.
