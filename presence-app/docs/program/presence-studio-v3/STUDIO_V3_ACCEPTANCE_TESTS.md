# Presence Studio V3 Acceptance Tests

**Status:** executable acceptance contract; runtime tests are not implemented or run by this specification pass
**Date:** 2026-07-21
**Applies to:** Gate P0, Gate P1, Milestone 1, and Milestone 2
**Primary harness:** local mock API plus Playwright; never hosted BBB or GGM data

## Test purpose

These scenarios decide whether Studio V3 is a safe owner product, not merely whether controls render. They prove comprehension, actual-renderer editing, canonical content placement, meaningful customisation, deterministic restore, accessibility, and public-state invariance.

Normative inputs:

- [Milestones](./STUDIO_V3_MILESTONES.md)
- [Interaction model](./STUDIO_V3_INTERACTION_MODEL.md)
- [Content architecture](./STUDIO_V3_CONTENT_ARCHITECTURE.md)
- [Customisation model](./STUDIO_V3_CUSTOMISATION_MODEL.md)
- [View model and compiler](./STUDIO_V3_VIEW_MODEL_AND_COMPILER.md)
- [Prototype slice](./STUDIO_V3_PROTOTYPE_SLICE.md)
- [Risk register](./STUDIO_V3_RISK_REGISTER.md)

## Non-negotiable test boundary

- Use only local/test owner fixtures and the repository mock API.
- Do not set `PRESENCE_HOSTED_SMOKE=1` for V3 implementation acceptance.
- Do not call publish, rollback, deploy, production configuration, or hosted mutation endpoints.
- Do not load, copy, capture, or commit GGM content, assets, routes, tokens, screenshots, or client notes.
- The GGM-like Milestone 2 recipe is synthetic and abstract. Its transformed visual state may be reviewed locally but must not be saved as repository/public screenshot evidence.
- BBB public invariance is tested against local deterministic BBB-shaped fixtures and the canonical `/p/bbbvision` plus alias `/presence/bbbvision` route behavior. A later hosted check needs a separately authorised read-only work order.
- Gate P0 and Gate P1 are strictly server-write-disabled. Any draft create/PATCH, preview POST, publish, rollback, hosted, or public mutation request fails those gates.
- Runtime Save and server Visitor Preview remain disabled in Milestone 1 even if the disposable single-writer local/test POST characterization passes. Enabling either requires a separately approved server contract that, in the same transaction as config/media mutation, locks and compares expected existing-draft identity, revision, and stable semantic fingerprint; absence or mismatch returns conflict before either mutation and every failure rolls both back. Current recursive-merge `PATCH`, the current unguarded full-config POST, and every no-draft create path remain forbidden for V3 runtime use; `updated_at` is diagnostic only. Post-write refetch is output verification, not concurrency control.

## Harness contract

### Canonical proposed test-file manifest

```text
lib/presence/studio-v3/compiler.test.ts
tests/e2e/presence-studio-v3-bbb-prototype.spec.ts
tests/e2e/presence-studio-v3-public-invariance.spec.ts
tests/e2e/presence-studio-v3-mobile-accessibility.spec.ts
```

This is the only V3 test-file manifest for the planned slice. Do not create per-feature V3 spec names without first updating the architecture/specification as one reviewed decision. Every acceptance ID below must appear in a test title or an evidence traceability table assigned to one of these files.

Current regression manifest:

```text
tests/e2e/presence-studio-v2-bbbvision-pilot.spec.ts
tests/e2e/presence-studio-v2-bbbvision-generalisation.spec.ts
tests/e2e/presence-studio-v2-bbbvision-draft-write.spec.ts
tests/e2e/presence-studio-v2-layout-composition.spec.ts
tests/e2e/presence-studio-v2-public-render.spec.ts
tests/e2e/presence-public-payload-hygiene.spec.ts
tests/e2e/presence-studio-owner-experience.spec.ts
```

### Required fixtures

1. **BBB baseline room:** a sanitized, local BBB-shaped V2 draft with deterministic Rooms, Pieces, Collection, CTA, and both canonical and alias public routes.
2. **Owned/unowned replacement fixture:** recognizable values on every explicit compiler-owned path, every unowned editable-config path, one owned object to replace, one owned object to delete, and one unowned object that must survive.
3. **Mixed Collection:** supported image Pieces, a duplicate Piece, and an unsupported/incomplete media Piece.
4. **Required-core fixture:** one entry Room and one required CTA, used for destructive guardrails.
5. **Identity/provenance fixtures:** opaque authenticated-owner partitions, immutable config/draft identities, stable semantic complete-base fingerprints, schema, Presence and Room variants covering: exact match; changed ID with same version; same ID with changed stable fingerprint; same identity/fingerprint with changed diagnostic `updated_at`; signed private-media URL/expiry churn only; wrong owner/Presence/Room; and absent durable ID.
6. **Limit fixtures:** values at and just beyond 256 KiB total, 96 KiB per section, 160 list entries, 160 object keys, and depth 9.
7. **Synthetic transformation recipe:** a GGM-like abstract style/layout recipe with no GGM source material.
8. **Wire/media characterization fixtures:** all nine current POST fields populated; nested object `undefined`, sparse/`undefined` array, and top-level `undefined` probes; owner/Room-matching `private_draft` media rows in `draft_uploaded`, `orphaned`, `ready`, and `draft_attached`; unrelated private/public media rows; hydrated private refs with changing `url`/`preview_expires_at`; and a disposable no-existing-draft case that demonstrates why the current POST is unsafe for runtime replacement.

### Required state oracles

- **Stable semantic full-base-config fingerprint:** first apply the exact valid-private-media projection below, then recursively sort every object key while preserving arrays, nulls, all remaining values/key presence, unknown keys, and all ten current editable base fields (`schema_version`, `renderer_key`, the seven config sections, and `locked_fields`) before hashing. Immutable/audit metadata is compared separately: source kind, config `id`, `room_id`, revision/version, status, and `schema_version` form the complete base identity; `updated_at` is diagnostic only.
- **Comparison versus JSON wire oracle:** the logical comparison candidate has all ten base fields and injects `schema_version` unchanged from the fresh base. The current transport projection has exactly these nine top-level fields: `renderer_key`, `scene_config`, `style_dna`, `motion_config`, `asset_config`, `content_config`, `roomkey_config`, `enquiry_config`, and `locked_fields`; it intentionally omits only `schema_version`. The sparse/`undefined` array probe proves raw JSON would coerce the entry to `null`, so `[PROPOSED] projectStudioV3WireJson` rejects it before round-trip/request; it also rejects every other unsafe non-JSON value, then returns exactly `JSON.parse(JSON.stringify(payload))`. Nested plain-object `undefined` properties are elided. After projection, the exact nine-key set must remain—no top-level field may be `undefined` or omitted. Characterization refetch must retain base `schema_version` and match the expected ten-field semantic candidate, but that verification is not concurrency control.
- **Stable stored-semantic editable-config projection:** follow `[PROPOSED] projectStudioV3StoredSemanticConfig` exactly. Recurse only inside `scene_config`, `asset_config`, and `content_config`; when an object's own trimmed `media_id` is non-empty and its own `visibility` is exactly `private_draft`, omit only that object's own `url` and `preview_expires_at`. Preserve `image_url`, `thumbnail_url`, every differently named URL, every value outside those three sections, and every other key/value exactly. Fingerprints used by a future server precondition are computed over this ten-field projection.
- **Loaded local identity/provenance qualification:** browser-local data is split into opaque authenticated-owner-partitioned Presence and Room envelopes. Recovered `work:<id>`/`collection:<id>` refs qualify only when envelope schema, owner partition, Presence/Room scope, complete immutable base identity, and stable semantic full-base fingerprint all match the just-loaded server selection. Otherwise local data is quarantined/discarded and unmatched objects remain `legacy-object:<id>`; title/URL guessing is forbidden. Logout/account switch clears the previous partition; `updated_at` is diagnostic only.
- **Compiler-owned path allowlist:** a concrete code constant and evidence table enumerates every writable scalar or closed subtree and its replacement, deletion, normalization, and unknown-key behavior. No undeclared wildcard or root ownership is accepted. A diff outside the table blocks compile/write.
- **Full replacement/deletion characterization oracle:** replacing an allowlisted closed owned subtree removes the prior owned value exactly once; omission within that authoritative replacement subtree deletes the intended owned placement; unowned Rooms/objects/keys survive; omission outside an explicitly owned replacement subtree is never deletion. Current recursive-merge `PATCH` must fail the stale-key negative fixture. The disposable current-POST characterization must also show the no-draft behavior and record it as unsafe, not as qualification. Passing this oracle proves payload/replacement behavior only and cannot expose runtime Save.
- **Media-row characterization oracle:** for an existing disposable local/test draft, the only allowed media-row side effect is an owner/Room-matching referenced `private_draft` row changing `draft_uploaded`, `orphaned`, or `ready` to `draft_attached`, with its `updated_at` change. A referenced row already `draft_attached` remains so. Visibility, ownership, storage keys, public URL, publication fields, and every other column remain equal; unreferenced, cross-scope, and public rows have no row change. Any new/deleted row or any other status/column delta fails characterization.
- **Future atomic server-precondition oracle:** a separately approved request must carry expected existing-draft ID/scope, revision, and stable semantic fingerprint. The server locks/re-reads that exact draft and recomputes the same fingerprint inside the transaction before applying the nine-field replacement or media assignment. Missing draft, revision mismatch, identity mismatch, or fingerprint mismatch returns a conflict before config or media mutation. Config replacement and the strictly allowed media-row transition commit together or roll back together. A post-commit refetch verifies the result only; it never closes the compare/write race. This specification and its characterization tests do not authorize backend implementation.
- **V3 workspace fingerprint:** include Room order, source references, deterministic placement IDs, featured/order state, layer values, locks, and navigation settings. Exclude the independent named Look library from structural-restore equality.
- **Named Look library fingerprint:** include each named Look's normalized layer values/recommendations and provenance. Structural transformation/restore must not overwrite this library; only explicit owner save/update/delete actions may change it.
- **Compiled V2 fingerprint:** include every editable-config section after exact merge, including unrelated-section sentinels.
- **Public response fingerprint:** record normalized local public payload responses before opening Studio and after the full flow.
- **Public DOM fingerprint:** record stable semantic content/order and renderer markers on canonical and alias routes. Ignore only known nondeterministic animation timestamps; never ignore content, hrefs, media refs, or ordering.
- **Request ledger:** capture method and pathname for all editor-owner requests. Any Gate P0/P1 write fails immediately. The isolated 5.4 characterization may issue current draft POST/PATCH requests only against its disposable local/test fixtures and never through product UI. Every runtime V3 draft request and server preview POST remains a failure until the separately approved atomic server-precondition contract passes; immediate client refetch does not make one permissible. Any call ending in `/publish`, `/rollback`, or an unapproved/hosted/public mutation endpoint fails every gate.
- **Editor bridge event oracle:** use the normative `[PROPOSED] PresenceStudioV2EditorBridge` contract in `STUDIO_V3_INTERACTION_MODEL.md`. The ledger records native callback branch order, stable Piece/Room IDs, visitor callbacks, history/hash changes, focus-transition lifecycle, and V3 selection/clear intents for pointer, touch, `Enter`, `Space`, window Arrows, and Escape. Bridge-present visitor-callback count is zero; bridge-undefined output and callback order match baseline exactly.
- **Visual oracle:** use focused screenshots for public-safe states and bounded visual comparisons. A structural/compiler assertion is required even when a screenshot passes.

### Exact supported command set by first required gate

These commands are planned, not run by this docs-only pass. Use the existing npm scripts exactly; do not invent `lint`, `npm test`, or a unit-test script.

#### Gate P0

```powershell
npm run typecheck
npm run build
npx.cmd tsx --test lib\presence\studio-v3\compiler.test.ts
npm run test:e2e -- tests/e2e/presence-studio-v3-bbb-prototype.spec.ts tests/e2e/presence-studio-v3-public-invariance.spec.ts --project=chromium
npm run test:e2e -- tests/e2e/presence-studio-v2-bbbvision-pilot.spec.ts tests/e2e/presence-studio-v2-bbbvision-generalisation.spec.ts tests/e2e/presence-studio-v2-public-render.spec.ts tests/e2e/presence-public-payload-hygiene.spec.ts --project=chromium
```

#### Gate P1

```powershell
npm run typecheck
npm run build
npx.cmd tsx --test lib\presence\studio-v3\compiler.test.ts
npm run test:e2e -- tests/e2e/presence-studio-v3-bbb-prototype.spec.ts tests/e2e/presence-studio-v3-public-invariance.spec.ts tests/e2e/presence-studio-v3-mobile-accessibility.spec.ts --project=chromium
npm run test:e2e -- tests/e2e/presence-studio-v2-bbbvision-pilot.spec.ts tests/e2e/presence-studio-v2-layout-composition.spec.ts tests/e2e/presence-studio-v2-public-render.spec.ts tests/e2e/presence-public-payload-hygiene.spec.ts --project=chromium
```

#### Milestone 1

```powershell
npm run typecheck
npm run build
npx.cmd tsx --test lib\presence\studio-v3\compiler.test.ts
npm run test:e2e -- tests/e2e/presence-studio-v3-bbb-prototype.spec.ts tests/e2e/presence-studio-v3-public-invariance.spec.ts tests/e2e/presence-studio-v3-mobile-accessibility.spec.ts --project=chromium
npm run test:e2e -- tests/e2e/presence-studio-v2-bbbvision-pilot.spec.ts tests/e2e/presence-studio-v2-bbbvision-generalisation.spec.ts tests/e2e/presence-studio-v2-bbbvision-draft-write.spec.ts tests/e2e/presence-studio-v2-layout-composition.spec.ts tests/e2e/presence-studio-v2-public-render.spec.ts tests/e2e/presence-public-payload-hygiene.spec.ts tests/e2e/presence-studio-owner-experience.spec.ts --project=chromium
npm run test:e2e -- tests/e2e/presence-studio-v3-bbb-prototype.spec.ts tests/e2e/presence-studio-v3-public-invariance.spec.ts tests/e2e/presence-studio-v3-mobile-accessibility.spec.ts
```

#### Milestone 2

```powershell
npm run typecheck
npm run build
npx.cmd tsx --test lib\presence\studio-v3\compiler.test.ts
npm run test:e2e -- tests/e2e/presence-studio-v3-bbb-prototype.spec.ts --project=chromium --grep "V3-XFORM"
npm run test:e2e -- tests/e2e/presence-studio-v3-bbb-prototype.spec.ts tests/e2e/presence-studio-v3-public-invariance.spec.ts tests/e2e/presence-studio-v3-mobile-accessibility.spec.ts
npm run test:e2e -- tests/e2e/presence-studio-v2-bbbvision-pilot.spec.ts tests/e2e/presence-studio-v2-bbbvision-generalisation.spec.ts tests/e2e/presence-studio-v2-bbbvision-draft-write.spec.ts tests/e2e/presence-studio-v2-layout-composition.spec.ts tests/e2e/presence-studio-v2-public-render.spec.ts tests/e2e/presence-public-payload-hygiene.spec.ts tests/e2e/presence-studio-owner-experience.spec.ts --project=chromium
```

The current package has no named unit-test script. Use the already evidenced workspace form `npx.cmd tsx --test lib\presence\studio-v3\compiler.test.ts`; do not invent a package script or silently modify dependencies. If that invocation would require an unapproved download in the implementation environment, stop and obtain approval rather than claiming the unit assertions ran. `npm run typecheck` alone does not execute them.

## Gate and route scenarios

### V3-GATE-001 — default-off means no V3 surface

**First required gate:** P0

**Given** no Studio V3 enable flag or pilot ID is configured
**When** an eligible V2 room opens at `/studio/[id]/editor`
**Then** the existing editor is rendered, no V3 bundle marker is present, and no local V3 state is read or written.

### V3-GATE-002 — explicit local pilot enters V3

**First required gate:** P0

**Given** the local/test V3 enable flag is true and the room matches the explicit V3 pilot allow-list
**When** the existing editor route opens
**Then** the V3 full-screen shell renders over the V2 engine and the route remains `/studio/[id]/editor`.

### V3-GATE-003 — ineligible room remains unchanged

**First required gate:** P0

**Given** V3 is enabled for a different pilot room
**When** a legacy or non-pilot room opens its editor
**Then** its existing editor and feature-gate outcome match the baseline, with no V3 state or API traffic.

### V3-GATE-004 — no permanent parallel route

**First required gate:** P0

**Given** the app is running with the V3 pilot enabled
**When** a caller requests `/studio/[id]/editor-v3`
**Then** no V3 editor is exposed there; only the canonical existing editor route can select V3.

### V3-GATE-005 — owner access contract is reused

**First required gate:** P0

**Given** an unauthenticated or wrong-owner local fixture
**When** the caller requests the existing editor route
**Then** current auth/ownership behavior is preserved and V3 does not bypass, duplicate, or weaken it.

## Milestone 1 comprehension and shell scenarios

### V3-UX-001 — five-second comprehension

**First required gate:** P0

**Given** a first-time owner opens an already loaded V3 Studio Home/Edit Presence surface
**When** they are asked “What would you do next?” after five seconds with no coaching
**Then** they identify at least one intended primary action—select something on the Presence, add from the Piece Shelf, or change the Look—and do not describe payload/CMS/debug work.

This is a moderated manual acceptance test with a short observation note. An automated companion asserts one visible live canvas, one dominant creative prompt, explicit **Test as visitor**, visibly disabled server **Visitor Preview**, and Review & publish without an open inspector wall.

### V3-UX-002 — actual public-room renderer is the canvas

**First required gate:** P0

**Given** the BBB-shaped V2 draft uses a renderer specialization supported by `PresenceStudioV2PublicRoom`
**When** V3 loads the Room
**Then** editor canvas semantics, content order, and specialization markers match the bridge-free in-memory **Test as visitor** projection rather than the generic `PresenceStudioV2Room` fallback; a future server Visitor Preview comparison is additive only after atomic-save qualification.

### V3-UX-003 — contextual action bar

**First required gate:** P0

**Given** no object is selected
**When** the owner taps or clicks a selectable Piece
**Then** it becomes visibly selected, the floating action bar names it, safe primary actions are available, no unrelated side inspector opens, and the Piece's visitor action is prevented.

### V3-UX-004 — expandable bottom sheet

**First required gate:** P0

**Given** a Piece is selected
**When** the owner requests deeper controls
**Then** a bottom sheet opens with the selected Piece’s controls, retains canvas context, traps focus only while modal, and returns focus to the invoking control when closed.

### V3-UX-005 — background deselection

**First required gate:** P0

**Given** a Piece is selected and no deeper modal, popover, or sheet is open
**When** the owner taps an inert canvas area or presses Escape while the bridge is active
**Then** selection clears, the contextual bar closes, draft content is unchanged, and synchronous `handleIntent({ kind: "clear-selection", source: "escape" })` returns `selection-cleared` before any visitor artwork-close, view-change, history, or navigation handler. The shell clears exactly one deeper editor level at a time before selection.

### V3-BRIDGE-001 — first activation selects and intercepts

**First required gate:** P0

**Given** the normative editor bridge is present and a BBB canvas Work has a non-empty deterministic `StudioV2PublicObject.id`, a stable destination Room ID, and a visitor focus/link/lightbox/gallery/media/CTA path
**When** the owner first activates it by pointer, touch, Enter, or Space—including when the bridge attaches while a prior visitor focus animation is pending
**Then** the bridge branch runs inside the BBB native callback before `onSelectWork`, `focusTransition`, `onFocusWork`, focus/navigation, or any nested visitor callback; it consumes the event, cancels the pending transition, synchronously emits `activate-piece` with the stable Piece ID, requires `piece-selected`, and causes zero visitor side effects. The animation completion callback rechecks the bridge immediately before `onFocusWork` and, when present, cancels, emits the same intent/result for the stable ID, and returns without calling `onFocusWork`. Array index, title, URL, label, DOM ID, and position are rejected as ID substitutes.

### V3-BRIDGE-002 — editor mode suppresses visitor actions continuously

**First required gate:** P0

**Given** the editor bridge remains active across a selected Piece, a no-stable-ID CTA/link or unsupported chrome target, direct Room controls, and BBB window Arrow handling
**When** the owner repeats Piece activation, holds a key, activates the no-ID target, chooses direct Room navigation, or presses ArrowLeft/ArrowRight
**Then** every intent/result is synchronous and consumed before visitor behavior: repeated Piece activation remains `activate-piece`/`piece-selected`; no-ID CTA/link uses `suppress-action-without-piece`/`action-suppressed`; unsupported chrome uses `suppress-unsupported-chrome`/`chrome-suppressed`; and direct/Arrow navigation uses `navigate-room` with `direct`/`arrow-previous`/`arrow-next` and requires `room-selected`, without visitor view/history/focus. An invalid destination fails to suppress-only and never falls through.

### V3-BRIDGE-003 — Test as visitor is explicit and reversible

**First required gate:** P0

**Given** the owner wants to exercise true visitor behavior
**When** they choose **Test as visitor**
**Then** the editor bridge, selection overlay, action bar, and editor instrumentation are absent for the test surface; visitor actions work normally there; exiting returns to the same editor Room/selection without a server write or public mutation.

### V3-BRIDGE-004 — Open link is explicit and safe

**First required gate:** P0

**Given** a selected Piece exposes a valid visitor destination
**When** the owner chooses **Open link** from the contextual action
**Then** the destination is labeled, restricted to an approved safe scheme, opened deliberately with safe new-context behavior, and recorded separately from Piece selection; invalid/private/editor-internal destinations are blocked with a clear reason.

For V3-BRIDGE-001 through V3-BRIDGE-004, rerun the full pointer/touch/keyboard/CTA/link/direct-Room/window-Arrow/Escape/focus-transition matrix with the bridge `undefined`. Existing callback order, pending-focus completion, visitor navigation/history/hash, markup, focus order, instrumentation, and visual output must equal the frozen baseline exactly.

### V3-UX-006 — dirty/save/conflict states are explicit

**First required gate:** M1

**Given** a clean loaded draft and browser-local V3 working state
**When** the owner stages/completes a local change, inspects disabled Save, or—only after separate atomic-contract approval—saves or conflicts
**Then** the shell distinguishes local clean/dirty/recovery, disabled-with-reason, and future saving/saved-draft/conflict states without implying publication or presenting characterization as persistence authority.

## Direct manipulation and modes

### V3-EDIT-001 — safe move and snap

**First required gate:** M1

**Given** Simple mode and a movable Piece in a supported Room Style
**When** it is dragged beyond a safe zone
**Then** it snaps/magnetizes into the nearest permitted zone, remains fully recoverable on mobile widths, and records one deterministic placement change.

### V3-EDIT-002 — safe resize and crop/focus

**First required gate:** M1

**Given** an image Piece is selected
**When** the owner resizes it and changes crop/focus
**Then** allowed size steps and focal position update the live canvas immediately, retain readable surrounding content, and compile into supported V2 fields.

### V3-EDIT-003 — text and CTA manipulation

**First required gate:** M1

**Given** editable text and a required CTA
**When** the owner moves/resizes them within Simple mode
**Then** only safe zones and size steps are accepted, readable contrast is retained, and the required CTA remains reachable at all tested widths.

### V3-EDIT-004 — feature, unfeature, and reorder

**First required gate:** M1

**Given** three Pieces in one Room
**When** the owner features the second and reorders the third before the first
**Then** the canvas updates immediately and deterministic feature/order values survive browser-local save-point/reload. Durable draft save/reload remains disabled until the separately approved atomic server-precondition contract passes.

### V3-MODE-001 — Simple mode is the client default

**First required gate:** M1

**Given** a client with no saved mode preference
**When** V3 opens
**Then** Simple mode is active and shows guided zones, reorder, feature, crop/focus, safe sizing, Looks, and supported treatment controls without arbitrary depth/free transform controls.

### V3-MODE-002 — Advanced Creative is explicit and reversible

**First required gate:** M1

**Given** the owner is in Simple mode
**When** they opt into Advanced Creative
**Then** advanced transforms, depth/layering, and supported per-Piece overrides become available; returning to Simple preserves valid changes while safely constraining further edits.

### V3-MODE-003 — mode preference can be chosen without exposing internals

**First required gate:** M1

**Given** the owner chooses their default in Studio Home or Settings
**When** the editor is reopened
**Then** that client preference is applied, while operator/debug controls, payload JSON, renderer flags, owner binding, migration status, and route internals remain absent.

### V3-MODE-004 — unknown mode is fail-safe

**First required gate:** M1

**Given** browser-local state contains an unknown or malformed mode value
**When** V3 loads
**Then** it uses Simple mode, reports recoverable local-state cleanup, and does not pass the value to draft or public payloads.

## Pieces, Collections, Shelf, and deletion scenarios

### V3-CONTENT-001 — canonical Piece appears once in the Shelf

**First required gate:** P0

**Given** a Work returned by the owner Works API
**When** the Piece Shelf loads
**Then** exactly one canonical Piece entry exists with a stable `work:<id>` source reference regardless of how many Rooms contain compiled placements.

### V3-CONTENT-002 — place a Piece into a Room

**First required gate:** P0

**Given** a compatible unplaced Piece and a selected Room
**When** the owner drags or activates Place
**Then** a deterministic Room-scoped placement is created in the local working model, the canvas updates immediately, the canonical Work is unchanged, and the request ledger shows no draft or canonical-content write. Durable save/reload is a blocked M1 persistence assertion pending the separately approved atomic server contract.

### V3-CONTENT-003 — place a Collection with mixed compatibility

**First required gate:** P0

**Given** a Collection containing compatible, duplicate, and incompatible Pieces
**When** it is placed into a Room
**Then** compatible non-duplicates are placed in Collection order, duplicates are skipped, incompatible Pieces remain visibly in the Shelf, and a summary lists placed/skipped/retained counts and reasons.

### V3-CONTENT-004 — deterministic IDs survive repeated compile

**First required gate:** P0

**Given** an unchanged V3 view model with source references
**When** it is compiled twice
**Then** every object/placement ID and ordering fingerprint is identical and IDs are unique within the Room.

### V3-CONTENT-005 — remove from Room is not delete

**First required gate:** M1

**Given** a Piece placed in a Room and present in its canonical Work record
**When** the owner chooses Remove from Room
**Then** only the Room placement disappears; the Work, Collection membership, media reference, and other Room placements remain.

### V3-CONTENT-006 — remove from Collection is not delete

**First required gate:** M1

**Given** a Work in a Collection and placed independently in a Room
**When** the owner removes it from the Collection in Library
**Then** the canonical Work and independent Room placement remain, and the Collection order updates visibly.

### V3-CONTENT-007 — permanent Work delete is Library-only

**First required gate:** M1

**Given** a Work used by Collections or Rooms
**When** the owner initiates permanent delete from Library
**Then** Studio lists affected Collections and placements, requires explicit destructive confirmation, performs no delete on cancel, and cannot expose a permanent-delete action in the contextual Room editor; if any legacy/unavailable placement cannot be accounted for, delete is blocked rather than presenting a partial impact list.

### V3-CONTENT-008 — edit once, reflect everywhere

**First required gate:** M1

**Given** one Work has placements in two Rooms loaded in the current session and both placements carry matching qualified browser-local source provenance for the exact owner partition and base identity/fingerprint
**When** its title/description/media reference is edited through the canonical Library flow
**Then** both qualified loaded placements reflect the edit after refresh without creating duplicate Works or losing placement-specific treatment; unloaded, unmatched, or provenance-free placements are not claimed as refreshed and remain visibly subject to reconciliation. Durable cross-reload/cross-device refresh remains blocked on server-side placement/source identity.

### V3-CONTENT-009 — reorder Collection

**First required gate:** M1

**Given** a Collection with three Works
**When** the owner moves the third to first
**Then** the Collection and all presentations that inherit Collection order use the new deterministic order, while Room-specific explicit overrides remain documented and stable.

### V3-CONTENT-010 — missing media is recoverable

**First required gate:** M1

**Given** a Piece has an unavailable or unsupported media reference
**When** Shelf, canvas, compile, and restore process it
**Then** no private URL is leaked, the UI shows a useful media state/reason, the Piece remains in inventory, and no silent substitute or deletion occurs.

## Looks, locks, staging, and named restore scenarios

### V3-LOOK-001 — three Looks are materially different

**First required gate:** P1

**Given** identical BBB-shaped content
**When** Soft Editorial, Nocturnal Gallery, and Zine Archive are applied in turn
**Then** each changes atmosphere, structural presentation/layout defaults, Piece treatment, density, and motion in testable fields; a palette-only delta fails. At the V3.0 market gate, an independent creative reviewer must also judge each finished combination more original and resolved than the current BBB baseline across spatial concept, content hierarchy, atmosphere/treatment, motion behavior, and responsive continuity; a technical preset mapping alone does not pass.

### V3-LOOK-002 — three Room Styles are structurally different

**First required gate:** P1

**Given** the same compatible Piece set
**When** Threshold Portal, Gallery Wall, and Film Strip / Selected Works are applied
**Then** their ordering/presentation adapter, hierarchy, and interaction semantics differ while every Piece remains accounted for.

### V3-LOOK-003 — instant controls update live

**First required gate:** P0

**Given** a selected Piece or Room
**When** image treatment, motion intensity, background, typography, or CTA styling changes
**Then** the actual canvas updates in the same interaction frame or bounded render cycle without an Apply step, while the public route remains unchanged.

### V3-LOOK-004 — structural controls stage before apply

**First required gate:** P1

**Given** a current Room Style
**When** the owner previews a new Room Style, navigation structure, Collection Presentation, or transformation
**Then** the staged result is visible with Before/After and explicit Apply/Cancel; Cancel returns the exact pre-stage view model without any draft write.

### V3-LOOK-005 — locked layer survives preset switch

**First required gate:** P0

**Given** the owner overrides and locks Piece Treatment at Room or Piece scope
**When** another Look preset is applied
**Then** every unlocked layer receives the preset values and the locked Piece Treatment retains its exact normalized value and provenance.

### V3-LOOK-006 — override precedence is deterministic

**First required gate:** P1

**Given** different values at Presence, Room, Collection, and Piece scopes
**When** the effective treatment is calculated
**Then** Piece wins over Collection, Collection over Room, and Room over Presence/global; removing the highest override reveals the next value without destroying it.

### V3-LOOK-007 — named Look is real and editable

**First required gate:** P0

**Given** customized normalized layer values and current destination locks
**When** it is saved as a named Look, restored, and then edited
**Then** the restored layer values/recommendations match exactly, remain individually editable, retain provenance, and do not depend on an image/screenshot or media blob; the named Look contains and changes no lock state, Room placement/order/visibility, CTA state, or navigation structure, and current destination locks remain independently intact.

### V3-LOOK-008 — reload retains local metadata only for fully matching identity

**First required gate:** P1

**Given** locks and a named Look are stored in separate opaque-owner-partitioned Presence and Room envelopes under matching schema, scope, complete immutable base identity, and stable semantic full-base-config fingerprint
**When** the page reloads and every authoritative value matches the just-loaded server selection
**Then** those values and matching local source provenance qualify for restore, and the compiled in-memory canvas remains consistent without a server write.

### V3-LOOK-009 — stale local metadata is quarantined

**First required gate:** P1

**Given** any browser-local envelope schema, opaque owner partition, Presence/Room scope, complete immutable base identity, or stable semantic full-base fingerprint does not match the loaded server selection
**When** V3 loads
**Then** it does not apply or merge the envelope, marks it stale/quarantined or discards it with a clear recovery action, uses the loaded server state as the only compile base, and hydrates unmatched objects conservatively as `legacy-object:<id>` without title/URL guessing.

### V3-LOOK-010 — local state contains no forbidden material

**First required gate:** P0

**Given** a flow involving Pieces, media, locks, named Looks, preview, and transformation staging
**When** browser storage is inspected
**Then** records are separated into opaque-owner-partitioned Presence and Room envelopes scoped by complete immutable base identity, stable semantic full-base fingerprint, and schema; `updated_at` may appear only as diagnostic metadata; and no record contains a token, raw owner/visitor data, private payload, media blob/base64, GGM material, or publish state.

## Draft merge, serializer, preview, and public invariance

### V3-SAFE-001 — exact draft merge preserves unrelated sections

**First required gate:** M1

**Given** the disposable 5.4 replacement characterization has passed *and* a separately approved server endpoint has independently qualified the atomic expected-existing-draft precondition, with allowlisted owned replacement/deletion fixtures and unowned sentinels
**When** one V3-visible field is saved through that future endpoint
**Then** the request carries expected draft identity/scope, revision, and stable semantic fingerprint; the server locks/re-reads and compares all three inside the same transaction before mutation; the candidate starts from an immutable complete base, changes only allowlisted paths, replaces/deletes owned values exactly, and preserves every unowned sentinel. The ten-field logical candidate retains base `schema_version`; `JSON.parse(JSON.stringify(nineFieldPayload))` contains all and only the nine named transport fields; nested `undefined` follows the wire oracle; and refetch retains schema and matches the stable semantic expected result. Refetch is post-commit verification only. Until both prerequisites pass, runtime Save is disabled.

### V3-SAFE-002 — stale write cannot overwrite a newer draft

**First required gate:** M1

**Given** the owner loaded one complete immutable base and another transaction removes the draft or changes its identity, revision, or stable semantic fingerprint—including same-revision content drift after any client refetch
**When** the first session submits its expected values to the future atomically guarded save endpoint
**Then** the server returns conflict before changing editable config or any media row, V3 keeps recoverable local state, and no partial side effect commits. Version/revision equality cannot override an ID or fingerprint mismatch; signed private-media `url`/`preview_expires_at` churn alone is ignored only under the valid-private-ref semantic projection; `updated_at` is diagnostic only. A client refetch plus the current unguarded POST fails this scenario and cannot enable Save.

### V3-SAFE-003 — serializer limits fail before network mutation

**First required gate:** M1

**Given** a proposed compiled draft at or beyond each configured limit, including the JSON wire `undefined` fixtures
**When** V3 creates and validates the nine-field wire projection
**Then** values at the legal boundary are handled; over-limit values, sparse/`undefined` array entries, and other unsafe non-JSON shapes are rejected before any request; nested plain-object `undefined` is elided exactly; all nine top-level keys remain after serialization; and no data is truncated or silently omitted.

### V3-SAFE-004 — full V3 metadata never enters editable config

**First required gate:** M1

**Given** locks, named Looks, save points, compare baselines, and editor provenance exist locally
**When** the current nine-field wire candidate is captured for pure testing or disposable 5.4 characterization
**Then** it contains all nine required top-level fields after JSON serialization, only renderer-visible V2 values required for the current draft, and none of the full V3 metadata structures. This capture is not runtime-write authority.

### V3-SAFE-005 — Visitor Preview is clean and draft-only

**First required gate:** M1

**Given** the separately approved atomic server-precondition contract is not yet qualified
**When** the owner inspects preview actions with unsaved or browser-local changes
**Then** server **Visitor Preview** is disabled with a clear reason and issues no preview POST; **Test as visitor** provides the bridge-free in-memory experience. If a later approved atomic save produces a confirmed matching draft, the server preview may then reflect only that draft, contain no editor controls/selection/instrumentation, and neither imply nor perform publication.

### V3-SAFE-006 — Review & publish is understandable but inert until final confirmation

**First required gate:** M1

**Given** a draft has unpublished changes
**When** the owner selects Review & publish
**Then** a readiness/checklist surface explains current status, preview, and consequences, while the prototype exposes no executable publish handoff and makes no publish call. Connecting the existing final confirmation is a separately reviewed V3.0 task.

### V3-SAFE-007 — editor actions never publish

**First required gate:** M1

**Given** a request ledger is active and no separately approved atomic save contract exists
**When** the full Milestone 1 local flow runs—place, move, restyle, lock, save named Look, restore, reload, and **Test as visitor**
**Then** the runtime ledger contains no draft POST/PATCH, server preview POST, `/publish`, `/rollback`, hosted-data, or unapproved production mutation call. Requests from the isolated disposable 5.4 characterization are recorded in a separate harness ledger and never originate from product UI.

### V3-SAFE-008 — canonical public BBB route is invariant

**First required gate:** P0

**Given** a baseline public payload, DOM, and visual fingerprint for local `/p/bbbvision`
**When** the Gate P0 bridge/shell flow completes, and again after every later qualified flow
**Then** the route’s published payload and semantic DOM fingerprints are identical and the approved visual comparison remains within zero or explicitly documented nondeterministic pixels.

### V3-SAFE-009 — public BBB alias is invariant

**First required gate:** P0

**Given** a baseline for local `/presence/bbbvision`
**When** the same Gate P0 flow completes, and again after every later qualified flow
**Then** alias routing, hrefs, content, payload, renderer selection, and visual result match the baseline.

### V3-SAFE-010 — public output has no editor instrumentation

**First required gate:** P0

**Given** V3 editor selection hooks are enabled locally
**When** canonical and alias public routes are rendered without an editor bridge
**Then** they have no selection outlines, data payloads containing editor state, edit handlers, action bars, bottom sheets, local-storage access, or V3 analytics events.

### V3-SAFE-011 — core Room cannot be removed

**First required gate:** M1

**Given** the Presence has one entry/core Room
**When** the owner attempts to delete or hide it
**Then** the action is blocked, the reason and recovery option are clear, and no draft write removes the Room.

### V3-SAFE-012 — required CTA cannot be hidden accidentally

**First required gate:** M1

**Given** only one required contact/booking CTA remains
**When** a Look, Room Style, direct edit, or transformation would hide or make it unreachable
**Then** preview/apply is blocked or repaired visibly before save, with no silent CTA loss.

### V3-SAFE-013 — discard local changes returns to the confirmed draft safely

**First required gate:** M1

**Given** the owner has unsaved local edits or a staged structural preview over a known saved draft
**When** they choose **Discard local changes** and confirm the impact
**Then** V3 rehydrates the exact last confirmed draft, clears only matching transient/local working state, leaves canonical Library and public state unchanged, and makes no publish or rollback-endpoint request.

## Accessibility, mobile, media, and resilience

### V3-A11Y-001 — complete keyboard path

**First required gate:** M1

**Given** desktop V3 with no pointer
**When** the owner uses Tab, Shift+Tab, Enter/Space, arrow keys where documented, and Escape
**Then** they can select a stable-ID Piece, operate the editor surfaces, place/reorder accessibly, change a Look, save/restore a named Look locally, and enter/exit **Test as visitor** with visible focus. Bridge-active keyboard input uses the exact synchronous `activate-piece`, `navigate-room`, and `clear-selection` intents with matching suppressing results; Escape clears one editor depth at a time; and disabled server Visitor Preview exposes its reason accessibly.

### V3-A11Y-002 — names, roles, states, and announcements

**First required gate:** M1

**Given** a screen-reader semantic inspection
**When** controls, selected objects, locks, dirty/save states, placement results, incompatibility summaries, and conflicts change
**Then** every control has a client-facing accessible name, state is programmatically exposed, and significant asynchronous outcomes use bounded live announcements.

### V3-A11Y-003 — focus management is deterministic

**First required gate:** P0

**Given** action bar, bottom sheet, confirmation, Shelf, **Test as visitor**, and a BBB artwork-focus animation that began before bridge attachment
**When** each editor surface opens/closes by keyboard and pointer, Escape clears editor depth, or the bridge attaches before animation completion
**Then** focus enters the intended control group, cannot fall behind a modal, returns to the invoker/stable-ID selection, and never resets to document start. Escape runs no visitor handler; bridge attachment cancels the pending focus transition; and the animation callback's bridge recheck proves `onFocusWork` was not called. The same pending transition completes exactly as baseline when the bridge is `undefined`.

### V3-A11Y-004 — contrast remains safe across Looks

**First required gate:** P1

**Given** every text, CTA, focus ring, status, and control state in all three Looks/Room Styles
**When** computed foreground/background contrast is checked
**Then** normal and large text and non-text UI meet the project’s WCAG AA target, with an automatic safe fallback where owner-selected media makes contrast uncertain.

### V3-A11Y-005 — reduced motion and motion intensity

**First required gate:** P1

**Given** `prefers-reduced-motion: reduce`
**When** all Looks, selection effects, bottom-sheet transitions, motion controls, **Test as visitor**, and the disabled server Visitor Preview control render
**Then** nonessential movement is removed or reduced, no control depends on motion, and content/order remains equivalent.

### V3-MOBILE-001 — touch targets and gestures

**First required gate:** M1

**Given** representative 320, 375, 390, and 430 CSS-pixel mobile viewports
**When** the owner selects, drags, reorders, opens controls, and previews
**Then** primary touch targets meet the 44-by-44 CSS-pixel target, gestures do not block page recovery, and every drag action has a non-drag alternative.

### V3-MOBILE-002 — bottom sheet preserves a usable canvas

**First required gate:** P0

**Given** portrait and landscape mobile/tablet viewports
**When** the bottom sheet opens at each supported detent
**Then** the selected object can be identified, the sheet does not strand controls off-screen, safe areas/virtual keyboard are respected, and close/apply/cancel remain reachable.

### V3-MOBILE-003 — pixel-transform content cannot break narrow output

**First required gate:** M1

**Given** the prototype uses inherited V2 pixel transforms
**When** extreme but permitted moves/resizes are tested across mobile, tablet, and desktop
**Then** clamping/safe zones prevent off-canvas or overlapping required content; any unsupported transform is rejected rather than saved.

### V3-RESILIENCE-001 — local storage unavailable or full

**First required gate:** P1

**Given** browser storage throws, is disabled, or reaches quota
**When** V3 tries to persist locks/named Looks/save points
**Then** live editing remains recoverable, the owner receives an honest warning, no draft corruption occurs, and persistence is not falsely claimed.

### V3-RESILIENCE-002 — draft/preview network failure

**First required gate:** M1

**Given** a future separately approved atomically guarded existing-draft save or its subsequent private preview fails, conflicts, or times out
**When** the owner saves or previews after that contract is qualified
**Then** dirty state remains, retry/reload is explicit and idempotent, config and media side effects commit together or roll back together, the last confirmed draft is not overwritten locally, and public state remains unchanged. Before qualification, both runtime operations are disabled and issue no request.

## Milestone 2 transformation and exact-restore scenarios

### V3-XFORM-001 — transformation creates a save point first

**First required gate:** M2

**Given** a clean BBB baseline and a synthetic GGM-like recipe
**When** the owner previews and applies the transformation
**Then** a complete baseline save point and its V3/compiled fingerprints exist before any transformed draft write is allowed.

### V3-XFORM-002 — transformed identity is radical, not a palette swap

**First required gate:** M2

**Given** identical BBB content before and after transformation
**When** the synthetic recipe applies
**Then** Room Styles, Collection Presentation, Piece arrangement/treatment, hierarchy/density, typography/CTA style, atmosphere/motion, and navigation all change in defined values, and a local human review identifies a fundamentally different identity.

### V3-XFORM-003 — incompatible content remains visible

**First required gate:** M2

**Given** the BBB fixture includes Pieces incompatible with the target Room Styles
**When** transformation applies
**Then** supported Pieces auto-place deterministically, every incompatible Piece remains in the visible Shelf, and the apply summary accounts for all inputs.

### V3-XFORM-004 — transformed state remains tunable

**First required gate:** M2

**Given** the synthetic transformation is applied
**When** the owner edits a Room, Piece, motion value, and named Look
**Then** each remains editable under normal precedence/lock rules and can be saved as a local template/draft layout without flattening into a screenshot.

### V3-XFORM-005 — exact BBB restore

**First required gate:** M2

**Given** the transformed/tuned state and original BBB save point
**When** Restore BBB is confirmed
**Then** the structural save point—not a named Look—restores normalized V3 workspace state, deterministic IDs/order/visibility, Room/style refs, locks/overrides, CTA/navigation, compiled owned sections, unrelated-section sentinels, and draft-preview semantic/visual fingerprints to the pre-transformation baseline exactly as defined in the milestones document; the independent named Look library is preserved rather than rolled back.

### V3-XFORM-006 — missing media blocks dishonest restore

**First required gate:** M2

**Given** a baseline save point references media that becomes unavailable
**When** restore runs
**Then** it reports the unresolved stable reference and stops or restores with an explicit incomplete state; it never embeds a blob, substitutes another asset, or claims an exact restore.

### V3-XFORM-007 — transform and restore never mutate public state

**First required gate:** M2

**Given** public/request fingerprints are active
**When** BBB transforms, is tuned, and returns to BBB
**Then** no publish call occurs and canonical/alias public payload, DOM, renderer, and instrumentation fingerprints remain unchanged throughout.

### V3-XFORM-008 — GGM privacy boundary

**First required gate:** M2

**Given** all transformation tests and evidence outputs
**When** source paths, fixtures, logs, traces, attachments, screenshots, test names, and committed artifacts are scanned
**Then** no GGM content, asset, route, private screenshot, client note, token, or identifying payload exists; only the approved phrase “GGM-like” and abstract recipe identifiers may appear in internal specification text.

## Acceptance traceability

| Product outcome | Required IDs |
|---|---|
| P0 route/renderer seam and activation safety | V3-GATE-001 through V3-GATE-005, V3-UX-002 through V3-UX-005, V3-BRIDGE-001 through V3-BRIDGE-004 |
| Understand within five seconds | V3-UX-001 |
| Edit the actual live-feeling Presence | V3-UX-002 through V3-EDIT-004 |
| Manage and place Pieces/Collections | V3-CONTENT-001 through V3-CONTENT-010 |
| Three Looks and three Room Styles | V3-LOOK-001 through V3-LOOK-004 |
| Lock and named Look restore | V3-LOOK-005 through V3-LOOK-010 |
| Simple/Advanced modes | V3-MODE-001 through V3-MODE-004 |
| Visitor Preview and publish understanding | V3-SAFE-005 through V3-SAFE-007 |
| Zero accidental public mutation | V3-SAFE-007 through V3-SAFE-010 |
| Qualified local identity, disposable POST characterization, and future atomic-save blockers | V3-LOOK-008 through V3-LOOK-010, V3-SAFE-001 through V3-SAFE-004 |
| Guardrails and failure recovery | V3-SAFE-011 through V3-SAFE-013, V3-RESILIENCE-001, V3-RESILIENCE-002 |
| Accessibility and mobile safety | V3-A11Y-001 through V3-MOBILE-003 |
| Radical transform and exact BBB return | V3-XFORM-001 through V3-XFORM-008 |

Canonical file assignment:

- `presence-studio-v3-bbb-prototype.spec.ts`: gate/route, shell/bridge, content, Looks, draft qualification, guardrails, resilience, and transformation scenarios.
- `presence-studio-v3-public-invariance.spec.ts`: canonical/alias output, bridge-undefined behavior, request ledger, public instrumentation, and zero-public-mutation scenarios.
- `presence-studio-v3-mobile-accessibility.spec.ts`: keyboard, focus, semantics, contrast, motion, touch, viewport, zoom, and non-drag alternatives.
- `compiler.test.ts`: pure normalization, immutable identity/fingerprint, exact three-section stored-semantic media projection, ten-field comparison/exact nine-field JSON wire projection with `schema_version` retention and nested-object/array `undefined` behavior, owned-path allowlist, replacement/deletion, deterministic IDs, Collection accounting, named Look, save-point, and limit contracts.

## Manual QA matrix

Run after focused automation passes:

| Viewport/input | Required review |
|---|---|
| 320×568 touch emulation | first action, Shelf, selection, bottom sheet, safe transform, CTA, close/recovery |
| 390×844 touch emulation | full owner journey, virtual-keyboard-sensitive fields, Visitor Preview |
| 768×1024 touch/tablet | ideal canvas, direct manipulation, action bar/sheet detents, rotation |
| 1440×900 mouse | desktop-expanded shell, advanced controls, before/after, multi-Room navigation |
| Keyboard only | all core Milestone 1 actions and confirmations |
| Reduced motion | all three Looks/Room Styles and preview |
| 200% zoom | shell, controls, selected object, status, dialogs without loss of function |

The reviewer records pass/fail by acceptance ID, browser, viewport, fixture version, and evidence path. A screenshot without a structural assertion, request ledger, and state fingerprint is supporting evidence only.

## Release/no-merge gate

Any of the following is a blocker:

- a publish/rollback/hosted mutation request;
- public payload/route/renderer drift;
- any Gate P0/P1 server write or preview POST;
- any runtime draft write or server preview before a separately approved server transaction atomically checks expected existing-draft identity/scope, revision, and stable semantic fingerprint before config/media mutation, conflicts on absence/mismatch, and rolls config/media side effects back together;
- treating the disposable single-writer current-POST characterization or a post-write refetch as concurrency control/runtime enablement;
- any bridge-present native callback that reaches visitor behavior; guesses a missing Piece/Room ID; lets direct Room/window Arrow/Escape change visitor state; permits repeated activation; or allows a pending focus animation to call `onFocusWork` after bridge attachment;
- browser-local provenance loaded or source refs recovered without a complete identity match;
- lost unrelated draft config;
- silent stale-state merge, truncation, content drop, duplicate, deletion, or hidden incompatible Piece;
- named Look or exact restore mismatch;
- core Room/required CTA loss;
- editor instrumentation in public output;
- inaccessible core action or mobile breakage;
- GGM private material in committed/public evidence;
- V3 enabled by default or for an unapproved room;
- missing test/evidence explanation.

No command or scenario in this document was run by the specification pass. Results belong only in later implementation evidence.

The implementation diff requires an independent reviewer using the repository no-merge checklist and explicit human approval before merge, deployment, pilot expansion, hosted access, or publish.
