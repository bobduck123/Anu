# Presence Studio V3 Milestones

**Status:** implementation-ready planning baseline
**Date:** 2026-07-21
**Product boundary:** a new owner-facing Studio shell over the proven Studio V2 renderer, draft, preview, and public-projection engine
**Implementation state:** not started by this specification pass
**Validation state:** planning contract only; no runtime command or acceptance test is claimed as run

## Purpose

This document turns the Studio V3 north star into staged, reviewable outcomes. It deliberately separates the smallest local prototype from marketability work and from later backend cleanup.

Read this with:

- [Product specification](./STUDIO_V3_PRODUCT_SPEC.md)
- [Interaction model](./STUDIO_V3_INTERACTION_MODEL.md)
- [Content architecture](./STUDIO_V3_CONTENT_ARCHITECTURE.md)
- [Customisation model](./STUDIO_V3_CUSTOMISATION_MODEL.md)
- [View model and compiler](./STUDIO_V3_VIEW_MODEL_AND_COMPILER.md)
- [Prototype slice](./STUDIO_V3_PROTOTYPE_SLICE.md)
- [Acceptance tests](./STUDIO_V3_ACCEPTANCE_TESTS.md)
- [Risk register](./STUDIO_V3_RISK_REGISTER.md)
- [Implementation task packets](./STUDIO_V3_SUBAGENT_TASKS.md)

## Fixed delivery contract

Every milestone inherits these constraints:

1. Studio V3 is the client-facing presentation and controller shell; Studio V2 remains the renderer, composition, draft, preview, and public-projection engine.
2. V3 enters through the existing `/studio/[id]/editor` route. The prototype does not add a permanent `/editor-v3` route.
3. The V3 gate is explicit, pilot-scoped, and default-off. A room that is not eligible continues into its current editor unchanged.
4. Prototype-only V3 metadata is browser-local and split into Presence and Room envelopes under an opaque authenticated-owner partition. It is scoped by envelope schema, Presence/Room, the complete immutable selected server base identity, and the stable persisted-semantic fingerprint of the complete selected base config; `updated_at` is diagnostic only. It contains no media blobs, credentials, raw owner/visitor data, or private payload copies, and the prior partition is cleared on logout/account switch.
5. P0 and P1 perform no server draft write. Local M1 editing may proceed after them, but runtime Save and server Visitor Preview remain a blocked M1 subgate. The current client refetch plus full-config POST is non-atomic, may create a draft, and cannot be made authoritative by a post-refetch or disposable single-writer characterization fixture. Persistence requires a separately approved atomic expected-existing-draft identity/revision/stable-fingerprint precondition-and-replacement server contract with zero config/media mutation on conflict and transactional media effects. Recursive-merge PATCH remains forbidden. This docs task authorises no backend change.
6. Full V3 metadata, locks, named Looks, save points, and editor-only provenance are not stored in the current editable-config JSON during the prototype. The existing serializer can expose unknown/raw fields, and the current limits are 256 KiB total, 96 KiB per section, 160 list items, 160 object keys, and nesting depth 9.
7. Preview is explicit and publish remains a final checklist action. Prototype and milestone validation must not call publish, mutate hosted data, change production configuration, or alter public BBB state.
8. GGM is private working reference material only. No GGM content, assets, private route, or transformation screenshot may be published or committed as public proof.
9. With the editor bridge present, first activation selects and suppresses visitor behavior inside the native actionable callback before any effect is scheduled; links, CTA/internal/direct/window navigation, gallery advance, media activation, lightboxes, and pending focus do not fire implicitly. Deferred BBB focus/navigation rechecks bridge mode; a CTA/link without a stable Piece ID and unsupported chrome return suppress-only results and never guess a selection. Owners use explicit **Test as visitor** or **Open link** actions. The [view-model bridge contract](./STUDIO_V3_VIEW_MODEL_AND_COMPILER.md#optional-editor-bridge) is normative; when the bridge is `undefined`, current behavior remains unchanged.
10. Matching browser-local provenance can qualify local source recovery only when the opaque owner partition, Presence/Room scope, complete immutable base identity, stable persisted-semantic full-base fingerprint, and envelope schema all match. Durable source-linked placement identity is required before market launch.

## Stage 0 — Specification and implementation gate

### Outcome

A coherent product/architecture pack exists, the prototype boundary is frozen, and each implementation lane can be assigned without letting a coding agent invent product semantics.

### Deliverables

- The eleven Studio V3 specification documents.
- Planning evidence with an execution plan, decision log, and independent no-merge review.
- A bounded canon update that records V3 as the new client shell over the V2 engine rather than a second renderer or backend.
- Eight implementation task packets with non-overlapping ownership and review gates.

### Exit criteria

- [x] The terminology `Presence`, `Room`, `Piece`, `Collection`, and `Look` is consistent across all documents.
- [x] The first three Room Styles and first three Looks are named and their differences are testable.
- [x] Local-state versioning, draft merge, public invariance, restoration, privacy, and rollback rules are explicit.
- [x] Every risky runtime change has a default-off gate and a named negative test.
- [x] An independent reviewer records `VERDICT: MERGE` for the docs-only specification diff.

Stage 0 authorises no runtime implementation, hosted mutation, publish, deploy, or production-data access.

## Gate P0 — renderer seam and minimum owner-loop proof

P0 is a prototype gate, not Milestone 1. It answers one question: can the default-off owner shell complete the user-required minimum loop—safe selection, contextual controls, one Piece and Collection placement, one visible Look change, one lock, and named Look restore—on the exact V2 public-room renderer without changing visitor behavior or writing a draft?

### P0 scope

- Default-off V3 selection inside the existing editor route for a sanitized local/test BBB-shaped fixture only.
- The actual `PresenceStudioV2PublicRoom` live canvas with an optional, default-undefined editor bridge.
- First activation on a supported Piece is intercepted inside its native actionable callback, calls selection, and suppresses the Piece's visitor action before it is scheduled. It cannot perform direct/window/CTA/internal navigation, open a lightbox, advance a gallery, play media, or leave pending focus. Deferred BBB focus/navigation rechecks bridge mode; a no-ID CTA/link and unsupported chrome are suppress-only and never create a guessed selection.
- A floating action bar and expandable bottom sheet for safe contextual editing.
- A Piece Shelf that loads canonical Works/Collections and places one Work-derived Piece plus one Collection into the selected Room in the in-memory/browser-local working model, with deterministic IDs and visible compatibility accounting.
- One visibly changed Look, one layer lock that survives the next preset-state switch, and one editable named Look saved/altered/restored without changing locks or placement/order.
- Separate opaque-owner-partitioned Presence and Room envelopes with complete base-identity/fingerprint qualification for the P0 local state.
- Explicit **Test as visitor** temporarily removes the bridge/overlay so normal visitor interaction can be tested; returning restores editor selection without mutation.
- Explicit **Open link** displays the resolved safe destination and opens it deliberately in a new context. A Piece activation never acts as an implicit Open link.
- Public canonical/alias invariance and no editor instrumentation with the bridge absent.

### P0 exclusions

- No V3 server draft create/PATCH, preview POST, publish, rollback, hosted mutation, canonical Work/Collection mutation, structural transformation, or claim that P0 proves the three-Look/three-Room-Style market set.
- No visitor-action behavior is available while the editor bridge is active.
- No new renderer, public route, auth, backend, serializer, or production flag.

### P0 exit gate

- [ ] Default-off and ineligible-room behavior is unchanged.
- [ ] The exact public-room renderer is used; the generic editor room is not substituted.
- [ ] First pointer and keyboard activation selects once inside the native callback and prevents all visitor side effects, direct/window navigation, and pending/deferred focus; no-ID CTA/link and unsupported chrome return suppress-only results.
- [ ] The action bar and bottom sheet open/close accessibly while the actual renderer remains visible.
- [ ] One canonical Piece and one Collection can be placed into the local working Room; deterministic placement/Collection accounting leaves incompatible content visible and performs no canonical or server mutation.
- [ ] One Look visibly changes the canvas, one locked layer survives a preset-state switch, and one named Look can be saved, altered, and restored without changing locks or placement/order.
- [ ] P0 local state uses the qualified opaque-owner-partitioned Presence/Room envelope contract and contains no forbidden data.
- [ ] **Test as visitor** removes editor interception and **Open link** is explicit, labeled, safe-scheme-only, and separate from Piece activation.
- [ ] Bridge-undefined public payload, DOM, event behavior, focus behavior, instrumentation, and stable visual output match baseline.
- [ ] The request ledger contains no draft write, preview POST, publish, rollback, hosted, or public mutation.

Failure of P0 stops P1. It does not justify a new renderer or weakened public comparison.

## Gate P1 — local style and state proof

P1 is a second prototype gate, separate from P0 and Milestone 1. It proves meaningful style range and reversible browser-local creative state on the P0 seam. P1 still performs no server write.

### P1 scope

- Three visibly different Looks: Soft Editorial, Nocturnal Gallery, and Zine Archive.
- Three structurally different Room Styles: Threshold Portal, Gallery Wall, and Film Strip / Selected Works.
- The passing P0 Piece/Collection placement, lock, and named Look loop exercised across all three styles; canonical owner records remain unchanged.
- Staged Before/After plus one structural save point, kept distinct from P0 named layer Look restore.
- Separate browser-local Presence and Room envelopes keyed by opaque authenticated-owner partition, scope, complete immutable selected base identity, stable persisted-semantic full-base-config fingerprint, and schema; `updated_at` is diagnostic only.
- Source-reference recovery only from a fully matching loaded provenance envelope; otherwise compiled objects remain conservative `legacy-object:<id>` entries.
- **Test as visitor** renders the in-memory compiled canvas without the editor bridge. **Open link** opens only the currently resolved safe link. Neither writes or publishes.

### P1 exclusions

- No draft create/PATCH, private-preview POST, publish, rollback, hosted mutation, permanent delete, or claim of durable cross-device state.
- No title/URL heuristic source matching.
- No claim that browser-local provenance is market-ready identity.

### P1 exit gate

- [ ] P0 continues to pass.
- [ ] The three Looks differ in atmosphere, presentation, treatment, density, and motion—not color alone.
- [ ] The three Room Styles have distinct spatial/interaction grammars and account for every Piece.
- [ ] A locked layer survives preset switches.
- [ ] A named Look restores only its normalized layer values/recommendations under independent destination locks; it cannot restore placement/order/visibility/CTA/navigation.
- [ ] The structural save point restores its included Room/style refs, placement/order/visibility, CTA/navigation, and locks or reports unresolved references.
- [ ] Fully matching Presence/Room envelopes reload; any base-identity, full-fingerprint, owner partition, Presence/Room scope, or schema mismatch is quarantined/discarded and never guessed into canonical source refs. `updated_at` drift is recorded diagnostically and neither qualifies nor disqualifies an otherwise identical envelope.
- [ ] The request ledger proves zero server write and zero forbidden call.
- [ ] Public canonical and alias fingerprints remain unchanged.

Passing P1 authorizes local Milestone 1 planning and editing only. It does not authorize a draft write. Replacement/deletion characterization and the compiler-owned path allowlist are necessary evidence but cannot enable Save; runtime persistence remains blocked until the separately approved atomic server contract passes.

## Milestone 1 — understandable, live, safe owner editing

### Outcome

An owner can open Studio, understand the next action within five seconds, shape the live-feeling Presence, manage and place Pieces, make substantial visual changes, preserve decisions locally, and test the in-memory visitor experience safely without mutating public state. Persisted Save and server Visitor Preview remain a separately blocked subgate until the required atomic server contract is approved and exists.

### Owner journey

1. Open **Edit Presence** and see the Presence itself, not a renderer cockpit.
2. Recognise a primary creative action within five seconds: select something, add from the Piece Shelf, or change the Look.
3. Tap a Piece, Room background, text, or CTA and receive contextual controls.
4. Add or edit a Piece once in the Library model, group it in a Collection, and place the Piece or Collection into a Room.
5. Reorder, feature/unfeature, resize safely, adjust crop/focus, and apply visible treatment/motion changes.
6. Choose among three meaningfully distinct Looks and three meaningfully distinct Room Styles.
7. Override a layer, lock it, switch presets, and see the locked layer survive.
8. Save and restore a named Look, and compare staged before/after states.
9. Use **Test as visitor** for the current compiled editor state and explicit **Open link** for a visitor destination. Server Visitor Preview remains disabled until the separately approved atomic draft-persistence subgate passes; understand that **Review & publish** is a separate final safety checklist.
10. Leave the flow with public BBB content unchanged until a separately authorised publish action.

### Functional scope

#### Live editor shell

- Full-screen live canvas, floating action bar, expandable bottom sheet, Piece Shelf, Room navigator, local working state, **Test as visitor**, explicit **Open link**, a visibly disabled server Visitor Preview until its persistence subgate passes, and Review & publish boundary affordance.
- Simple mode as the default; Advanced Creative is an explicit opt-in. Operator/debug controls remain absent.
- Tablet is the ideal canvas, with mobile-first interaction and desktop-expanded controls.

#### Pieces, Collections, and Rooms

- Canonical Pieces and Collections come from the existing owner APIs; V2 renderer objects are compiled placements, not the canonical content record.
- A Piece may be placed into a Room without being duplicated as canonical content.
- A Collection placement expands deterministically into supported Piece placements.
- Duplicate placements are skipped and reported. Incompatible Pieces remain visible in the Shelf with a reason and a summary; they are never silently hidden or deleted.
- Removing a Piece from a Room or Collection is distinct from permanent deletion.
- Permanent Work deletion remains a Library action with explicit confirmation and an impact summary.
- Entry/core Room deletion and hiding the final required CTA are blocked.

#### Looks and customisation

- Six layers: Presence Look, Room Style, Collection Presentation, Piece Treatment, Motion / Atmosphere, and Navigation / Journey.
- Override precedence: Piece > Collection > Room > Presence/global.
- Presets update only unlocked layers.
- Instant-on-canvas fields: image treatment, motion intensity, background, typography, and CTA styling.
- Staged preview/apply fields: Room Style, navigation structure, Collection Presentation, and transformation presets.
- Named Looks store normalized, editable layer values and provenance references, not screenshots or media blobs.
- A named Look may include normalized layer recommendations/defaults, but it never contains lock state, Room placement/order/visibility, CTA state, or navigation structure. Restoring a named Look restyles the current structure under its existing locks; it does not reconstruct it.
- Save points store deterministic structural/style references, order, locks, and IDs sufficient for exact restoration.
- Structural save points—not named Looks—own Room/style refs, placements/order/visibility, CTA/navigation state, and locks required for exact BBB return.

#### Safety and persistence

- P0 and P1 have no server-write action. Their “saved” state means explicitly browser-local only.
- Stable comparison fingerprints the ten editable fields after one narrow persisted-semantic projection: remove only owner-GET transport-added `url` and `preview_expires_at` from valid `private_draft` objects with a valid `media_id` within `scene_config`, `asset_config`, or `content_config`. Ordinary/public URLs and every other field remain authoritative. Same-version/different-content fails and `updated_at` is diagnostic only.
- The ten-field logical candidate intentionally omits only `schema_version` when projected to the current nine-field transport. Validation uses actual JSON serialization/parse semantics and fails unless all nine top-level POST fields remain present on the wire.
- The current immediate client refetch plus full-config POST is not atomic, and the POST helper may create a draft. A post-refetch verifies only after mutation. A disposable local/test single-writer fixture may characterize owned replacement/deletion, unowned retention, public invariance, and private-media assignment/orphaning side effects, but it can never enable product Save or server Visitor Preview.
- Runtime M1 Save and server Visitor Preview remain blocked until a separately approved server operation checks the expected existing-draft identity, revision, and stable persisted-semantic fingerprint and replaces the exact draft in one transaction. Absent or mismatched state returns conflict with zero config/media mutation; media assignment/orphaning effects participate in the same transaction. No backend implementation is authorised by this docs-only task.
- Every future qualified draft write must start from the atomic operation's matching immutable base, change only allowlisted compiler-owned paths, preserve every other authoritative path, and return the committed identity/revision/fingerprint. Current recursive-merge `PATCH` remains forbidden.
- Prototype local state is accepted only from opaque-owner-partitioned Presence/Room envelopes whose schema, scope, complete immutable base identity, and stable persisted-semantic full-base fingerprint all match. Matching loaded provenance qualifies local source recovery; otherwise unresolved objects remain `legacy-object:<id>`. An `updated_at` value never qualifies or disqualifies an envelope by itself.
- Dirty and local-recovery states are visible now. Saving/saved/server-conflict states remain unavailable until the persistence subgate passes; local state must not be labelled as a saved server draft.
- Discarding unsaved local changes requires confirmation and rehydrates the last confirmed draft without invoking the publish/rollback endpoints.
- **Test as visitor**, **Open link**, blocked server Visitor Preview, and Review & publish are clearly distinct. Publish is never triggered by applying a Look, restoring, placing, testing, opening a link, previewing, or any future save.

### Milestone 1 acceptance gate

The local-editing checklist may be completed while persistence is blocked. It does not authorise or claim a server-saved draft or server Visitor Preview; those capabilities have the separate blocked subgate below.

- [ ] A first-time owner passes the five-second comprehension check without coaching.
- [ ] Gate P0 and Gate P1 acceptance checks continue to pass.
- [ ] Piece create/edit/group/place/remove/reorder flows meet the content acceptance matrix.
- [ ] The three Looks differ in atmosphere, presentation/layout, treatment, density, and motion—not only colour.
- [ ] The three Room Styles are structurally different and use the same content safely.
- [ ] Independent creative review judges every finished Look/Room Style combination more original and resolved than the current BBB baseline; prototype adapter reuse alone is insufficient.
- [ ] Lock, named Look, reload, compare, and restore tests pass.
- [ ] Simple and Advanced Creative modes expose only their defined control sets.
- [ ] Mobile, tablet, desktop, keyboard, screen-reader, reduced-motion, touch-target, and contrast checks pass.
- [ ] Draft-section retention, serializer-limit, stale-state, media-error, duplicate, incompatible, delete, CTA, and Room guardrail tests pass.
- [ ] The persisted-semantic fingerprint removes only the two permitted owner-GET private-media transport fields; ordinary/public URLs and every other field remain authoritative. Actual JSON serialization preserves all nine top-level POST fields.
- [ ] The disposable single-writer fixture records replacement/deletion and private-media side effects without exposing Save; the request ledger proves no runtime M1 Save or server Visitor Preview call.
- [ ] The blocked persistence subgate names the required atomic expected-existing-draft identity/revision/stable-fingerprint check-and-replace transaction, zero-mutation conflict, and transactional media effects; no current refetch/POST/post-refetch sequence is treated as equivalent.
- [ ] Matching loaded provenance is the only local source-recovery authority; durable server-side placement/source identity is a recorded pre-market blocker.
- [ ] Editor bridge interception occurs in the native actionable callback, blocks direct/window navigation, cancels and rechecks pending BBB focus, returns suppress-only for no-ID CTA/link and unsupported chrome, and cannot trigger visitor actions; **Test as visitor** and **Open link** are explicit and independently tested. Undefined-bridge behavior remains unchanged.
- [ ] Public-route, public-payload, and public-instrumentation invariance checks pass.
- [ ] Independent no-merge review returns `VERDICT: MERGE`; human approval is still required before merge or any pilot enablement.

### Blocked M1 persistence subgate

This subgate is not authorised for implementation by the Studio V3 specification task. It requires a separate backend work order, architecture/security review, migration and rollback analysis, and explicit human approval. The operation must atomically require the expected existing-draft identity, revision, and stable persisted-semantic fingerprint; replace that exact draft and apply media assignment/orphaning effects in one transaction; and return conflict on absence or mismatch with zero config/media mutation. Only a passing implementation of that contract may expose runtime Save or server Visitor Preview. The current refetch, current POST, and post-refetch sequence cannot pass this subgate.

### Evidence

- Focused unit/compiler tests and Playwright results mapped to acceptance IDs.
- Request ledger proving no publish call.
- Before/after public fingerprints for local BBB routes.
- Screenshots of the V3 shell at mobile, tablet, and desktop widths; selected Piece; bottom sheet; Shelf; each public-safe Look/Room Style; named Look restore; in-memory **Test as visitor**; and the honestly disabled server Visitor Preview state. A server Visitor Preview screenshot is evidence only after the atomic persistence subgate is separately approved and passed.
- No GGM or GGM-like transformation screenshots in committed/public evidence.
- Manual five-second comprehension notes using only approved, non-sensitive participants or internal review.

## Milestone 2 — radical transformation with exact return

### Outcome

The same BBB content can be transformed into a radically different, GGM-like identity inside Studio and then restored exactly to BBB without leaving the editor, publishing, losing content, or leaking private reference material.

“GGM-like” means an abstract, locally defined transformation recipe used to prove range. It does not permit copying or exposing private GGM content, assets, routes, screenshots, client notes, or identity claims.

### Transformation contract

Before a transformation applies, Studio must:

1. fetch and validate the complete immutable base identity (including version) plus stable persisted-semantic complete-base fingerprint; record `updated_at` only for diagnostics;
2. create a complete deterministic save point;
3. record the normalized V3 workspace fingerprint (excluding the independent named Look library) and compiled V2 draft fingerprint;
4. report unsupported media or placements before apply;
5. require explicit apply after preview.

Applying the transformation must visibly change:

- Presence Look and atmosphere;
- Room Styles and spatial composition;
- Collection Presentation and sequence/density;
- Piece Treatment and focal hierarchy;
- typography and CTA styling;
- motion intensity and behavior within reduced-motion constraints;
- navigation/journey;
- arrangement of compatible Pieces.

Incompatible Pieces must be auto-retained in a visible Shelf with a reason and summary. Nothing may be silently deleted, hidden from inventory, or removed from its canonical Work/Collection record.

### Exact restore definition

Returning to BBB is perfect only when all of the following match the pre-transformation save point:

- normalized V3 structural/style values;
- Room order and selected entry Room;
- deterministic placement IDs, Piece order, featured state, and source references;
- all layer locks, room/collection/piece overrides, and navigation settings from the structural save point; the independent named Look library remains unchanged and is not reconstructed by that save point;
- compiled V2 editable-config sections owned by V3;
- preserved non-V3 config sections;
- complete immutable base identity and stable persisted-semantic full-base-config fingerprint progression are valid and conflict-free; `updated_at` remains diagnostic only;
- draft-preview semantic fingerprint and supported visual baseline;
- canonical Works and Collections are unchanged except for owner actions explicitly performed outside restore.

Binary media is never copied into a save point; stable media references are restored. If a referenced asset is no longer available, restore must stop with a clear unresolved-reference report rather than substitute silently.

### Milestone 2 acceptance gate

- [ ] A BBB baseline save point is created automatically before transformation.
- [ ] A reviewer can identify the transformed state as a fundamentally different identity without relying on colour alone.
- [ ] Every incompatible Piece remains in the visible Shelf with a reason.
- [ ] The owner can tune transformed Rooms and Pieces, save a template/draft layout, and restore a named previous Look without leaving the editor.
- [ ] Restore produces the exact normalized and compiled fingerprints defined above.
- [ ] The BBB restored preview passes approved semantic and visual baselines.
- [ ] The public BBB route and payload remain unchanged throughout the entire exercise.
- [ ] No publish request occurs.
- [ ] GGM private content, assets, routes, screenshots, and instrumentation are absent from committed/public evidence.
- [ ] Independent high-blast-radius review and explicit human approval pass before any wider pilot.

### Evidence

- Hash/fingerprint ledger for BBB-before, transformed local draft, and BBB-restored states.
- Machine-readable placement compatibility summary.
- Network ledger proving draft/preview-only traffic and zero publish.
- BBB-before and BBB-restored screenshots only; the GGM-like state is reviewed locally and not stored as public or repository evidence.
- Manual restoration checklist signed by a reviewer separate from the builder.

## Deferred market-launch and V3.1 cleanup

The following are requirements discovery, not authorised Milestone 1 implementation:

- A backend-owned V3 metadata contract with explicit private/public serialization and versioned migrations.
- Rich Work media types beyond the current image-shaped fields.
- Many-to-many Work/Collection membership and first-class Collection ordering.
- Durable server-side Room-placement/source identity and provenance rather than V2 object snapshots or browser-local recovery; this is mandatory before market launch.
- Optimistic concurrency or conflict-safe multi-tab editing.
- Normalized responsive positioning replacing the prototype’s inherited V2 pixel transforms.
- Room transitions and entrance animation.
- Durable named Looks/templates across devices and collaborators.
- An atomic expected-existing-draft identity/revision/stable-fingerprint precondition-and-replacement API with zero-mutation conflicts and transactional media assignment/orphaning effects; it requires a separate backend work order before runtime M1 Save or server Visitor Preview.
- Media processing, compression, quotas, and accessible transcript/caption workflows by type.
- Generalised eligibility beyond the first approved pilot and removal of hard-coded legacy pilot assumptions.
- Validated Visitors IA and analytics privacy contract.

Each item needs its own task, migration/rollback plan, public/private review, and human gate. It must not be smuggled into the prototype or Milestone 1.

## Sequencing and stop rules

Recommended sequence:

1. Freeze the pure compiler/view-model contract and default-off gate.
2. Pass Gate P0: actual renderer, bridge interception, explicit visitor actions, one Piece and Collection placement, one visible Look/lock/named-restore loop, qualified local-envelope hygiene, and public invariance with zero write.
3. Pass Gate P1: three style proofs, structural save point/compare, qualified envelope reload/provenance, and independent aesthetic review with zero write.
4. Run only the disposable local/test single-writer characterization: stable persisted-semantic ten-field fingerprint projection, actual-serialization nine-field presence, explicit compiler-owned path/subtree table, full replacement/deletion behavior, unowned retention, and private-media effects. Record that this cannot enable Save.
5. Implement Milestone 1 local broader removal/Library/content management and direct manipulation with runtime Save and server Visitor Preview disabled; use in-memory **Test as visitor**.
6. Complete accessibility/mobile and negative-path hardening and run the Milestone 1 local-editing review.
7. In a separately approved backend work order, design and review the atomic expected-existing-draft identity/revision/stable-fingerprint check-and-replace transaction. Only after it passes may runtime M1 Save and server Visitor Preview be enabled.
8. Only after the local Milestone 1 sign-off, implement transformation/save-point flow and run Milestone 2 locally; it remains zero-write while the persistence subgate is blocked.

Stop and escalate if implementation requires auth, tenancy, backend schema, public-route, public serializer, production config, hosted data, or publish changes; if runtime Save or server Visitor Preview is proposed without the separately approved atomic server contract; if the actual renderer cannot remain unchanged without the editor bridge; if native-callback interception cannot suppress direct/window navigation and cancel/recheck pending focus, if a no-ID CTA/link or unsupported chrome cannot remain suppress-only, or if undefined-bridge behavior changes; if browser-local identity/provenance lacks any required match field; if the persisted-semantic fingerprint strips anything beyond the two permitted private-media transport fields; if any of the nine POST fields disappears under actual JSON serialization; or if exact restoration cannot be proven deterministically.
