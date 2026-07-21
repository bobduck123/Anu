# Presence Studio V3 Subagent Task Packets

**Status:** implementation delegation plan; no packet is authorised by this specification alone
**Date:** 2026-07-21
**Shape:** exactly eight bounded implementation/review lanes
**Rule:** one bounded child packet = one seam = one branch = one PR; Tasks 2, 4, and 5 are parent workstreams and must never be implemented as single omnibus PRs; no deployment, publish, merge, hosted mutation, or production-data action
**Validation state:** planning only; no test or command is claimed as run

## Shared contract for every lane

Before editing, each subagent must read the repository operating docs and the complete Studio V3 specification pack. The builder receives one packet only and must stop if it needs files, behavior, or architecture outside that packet.

Fixed architecture:

- V3 is a default-off, pilot-scoped client shell selected inside `/studio/[id]/editor`.
- V2 remains the renderer, composition, draft, preview, and public-projection engine.
- The live editor canvas uses `PresenceStudioV2PublicRoom`; the optional bridge implements the normative `[PROPOSED] PresenceStudioV2EditorBridge` TypeScript contract in `STUDIO_V3_INTERACTION_MODEL.md`. With the bridge present, the selection branch lives inside the BBB native callback before visitor focus/navigation, accepts only stable Piece/Room IDs, consumes no-ID CTA/link/unsupported chrome, direct Room/window Arrow navigation, Escape, and repeated activation, and cancels/rechecks pending focus transitions. With the bridge `undefined`, behavior and output are exactly unchanged.
- Canonical Works/Collections come from owner APIs. V2 objects are compiled Room placements.
- Prototype metadata is browser-local, split into Presence and Room envelopes under an opaque authenticated-owner partition, and contains no blobs/secrets/private payload copies. Only an exact envelope-schema, owner-partition, Presence/Room-scope, complete immutable-base-identity, and stable-semantic-full-base-fingerprint match qualifies loaded local provenance; `updated_at` is diagnostic only and unresolved objects remain legacy refs.
- Gate P0 and Gate P1 perform no server write. Disposable single-writer local/test characterization of current POST replacement/deletion semantics cannot enable runtime Save or server Visitor Preview. Both stay disabled until separately approved server work atomically checks expected existing-draft identity/scope, revision, and stable semantic fingerprint in the same transaction before config/media mutation; absence/mismatch conflicts and every failure rolls both mutations back. Current PATCH, current unguarded POST, and all no-draft create paths are forbidden for V3 runtime use; post-refetch verification is not concurrency control.
- Full V3 metadata is not persisted in the current editable-config JSON.
- No task may call publish, mutate hosted data, change backend/auth/tenancy/control-plane/public routes, or expose GGM private material.

Normative documents:

- [Product specification](./STUDIO_V3_PRODUCT_SPEC.md)
- [Interaction model](./STUDIO_V3_INTERACTION_MODEL.md)
- [Content architecture](./STUDIO_V3_CONTENT_ARCHITECTURE.md)
- [Customisation model](./STUDIO_V3_CUSTOMISATION_MODEL.md)
- [View model and compiler](./STUDIO_V3_VIEW_MODEL_AND_COMPILER.md)
- [Prototype slice](./STUDIO_V3_PROTOTYPE_SLICE.md)
- [Milestones](./STUDIO_V3_MILESTONES.md)
- [Acceptance tests](./STUDIO_V3_ACCEPTANCE_TESTS.md)
- [Risk register](./STUDIO_V3_RISK_REGISTER.md)

Canonical proposed test-file manifest; child packets add their acceptance IDs to these files rather than inventing new V3 test names:

```text
lib/presence/studio-v3/compiler.test.ts
tests/e2e/presence-studio-v3-bbb-prototype.spec.ts
tests/e2e/presence-studio-v3-public-invariance.spec.ts
tests/e2e/presence-studio-v3-mobile-accessibility.spec.ts
```

Run the pure contract with `npx.cmd tsx --test lib\presence\studio-v3\compiler.test.ts`. If that would require an unapproved download, stop rather than adding or mutating a dependency. Gate-specific Playwright commands are canonical in `STUDIO_V3_ACCEPTANCE_TESTS.md`.

## Integration order and ownership

Recommended order:

```text
5.1-5.3 Pure model, identity and read-only compiler
  -> 1 UX shell
    -> 2.1-2.2 P0 bridge/selection proof
      -> 3.1 P0 Piece/Collection Shelf loop
        -> 4.1-4.2 P0 one-Look/lock/named-restore loop
          -> P0 gate
            -> 4.3-4.5 P1 full style/savepoint proof
              -> P1 gate
                -> 2.3 bounded manipulation + 3.2 Library/content completion (M1)
                  -> 5.4 current-POST characterization -> 5.5 blocked atomic-precondition contract/qualification (no runtime Save)
      -> 7 Accessibility/mobile hardening
        -> 6 Tests/evidence consolidation
          -> 8 Independent no-merge/security review
```

Each numbered child packet below lands only after its stated dependency and review. No two agents edit a shared renderer file concurrently. Gate P0 must pass before P1; P1 must pass before characterization. Task 5.5 remains blocked without separate human approval for backend contract work and does not itself grant that approval. A parent workstream heading carries no implementation authority.

Review tiers:

- **Tier 1 — focused:** builder checks plus one focused reviewer; low-blast isolated UI/test/document change.
- **Tier 2 — independent no-merge:** separate reviewer, focused typecheck/tests/manual QA, explicit rollback; medium product or persistence-adjacent change.
- **Tier 3 — high-boundary:** strongest independent reviewer plus human approval; renderer, draft merge, public/private, auth-adjacent, deletion, or privacy consequence.

Every builder handoff must state summary, files changed, commands/tests, manual QA, screenshots, risks, rollback, remaining work, and next task. A task that cannot produce its evidence is incomplete.

## Task 1 — UX shell subagent

**Suggested branch:** `feat/presence-studio-v3-ux-shell`
**Suggested PR title:** `[presence] add default-off Studio V3 live shell`
**Size:** M
**Blast radius:** medium, with route-selection sensitivity
**Review tier:** Tier 3
**Owned risks:** R-18, R-19, R-27, R-28

### Goal

Add the smallest default-off V3 route selection and full-screen client shell so an approved local/test pilot opens directly onto the live Presence with contextual surface placeholders rather than the legacy cockpit.

### Scope

- Add a separate V3 feature function with explicit enable flag plus pilot allow-list and production deny-by-default behavior.
- Branch inside the existing `/studio/[id]/editor` page after current owner/session/node resolution.
- Render the V3 shell outside the legacy `StudioShell` tab chrome.
- Provide shell regions for live canvas, Room navigator, floating action bar host, bottom-sheet host, Piece Shelf host, browser-local status, **Test as visitor**, **Open link**, and disabled Review & publish.
- Implement Studio Home essentials inside the V3 shell: live link, current status, Edit Presence, **Test as visitor**, unpublished/readiness status, and one suggested next creative action. P0/P1 have no server save/preview action.
- Expose top-level client language only: Edit Presence, Library, Visitors, Settings. Do not implement navigation destinations beyond approved existing routes.
- Add stable test-facing semantics only where accessible names/roles are insufficient.

### Files likely involved

```text
app/(studio)/studio/[id]/editor/page.tsx
lib/presence/studio-v3/feature.ts                         (new)
lib/presence/studio-v3/index.ts                           (new)
components/presence-studio-v3/PresenceStudioV3Shell.tsx   (new)
components/presence-studio-v3/StudioV3Home.tsx            (new, if needed)
components/presence-studio-v3/StudioV3ActionBarHost.tsx   (new placeholder)
components/presence-studio-v3/StudioV3BottomSheetHost.tsx (new placeholder)
components/presence-studio-v3/presence-studio-v3.css      (new)
playwright.config.ts                                      (local test flag/allow-list only, if required)
tests/e2e/presence-studio-v3-bbb-prototype.spec.ts        (canonical V3 shell cases)
tests/e2e/presence-studio-v3-public-invariance.spec.ts    (canonical public cases)
```

### Non-goals

- No renderer rewrite or optional selection bridge.
- No Piece placement, manipulation, Look logic, named Look persistence, compiler, or draft write.
- No permanent `/editor-v3` route.
- No changes to `StudioShell` navigation for non-V3 pages.
- No auth, owner mapping, backend, public route, public renderer, publish, deploy, or hosted changes.
- No new dependency.

### Acceptance criteria

- [ ] With no V3 flag/allow-list, every room follows its prior editor path and no V3 storage is touched.
- [ ] With explicit local/test eligibility, the existing editor URL displays a full-screen V3 shell.
- [ ] Ineligible/legacy rooms remain unchanged.
- [ ] No `/editor-v3` surface is added.
- [ ] The initial screen has one visually dominant creative next action and meets the automated companion to V3-UX-001.
- [ ] **Test as visitor** and **Open link** are explicit; Review & publish is explanatory/disabled; no server write or preview POST exists in P0/P1.
- [ ] Operator/debug language and the legacy 11-tab cockpit are absent from the V3 shell.
- [ ] Mobile, tablet, and desktop shells render without horizontal overflow or unreachable controls.
- [ ] Existing auth/ownership/session handling is reused unchanged.

### Tests

- V3-GATE-001 through V3-GATE-005.
- Automated companion for V3-UX-001 and shell portion of V3-UX-006.
- Route smoke for V3 pilot, V2 non-pilot, legacy room, `/p/bbbvision`, and `/presence/bbbvision`.
- `npm run typecheck`, focused Chromium Playwright, then `npm run build`.

### Evidence required

- Gate matrix: flag, allow-list, room, expected editor, actual editor.
- Local screenshots at 390×844, 768×1024, and 1440×900.
- Diff/file allow-list and request ledger proving no publish/hosted mutation.
- Manual five-second comprehension note using sanitized/local content.

### Rollback notes

Remove the V3 branch from the existing editor route and the new V3-only files/env values. Existing V2/legacy editor code and public routes must require no rollback.

### Dependencies and handoff

- Depends on reviewed Task 5 interfaces for the shell input/view-model contract, though static shell scaffolding may be prepared without writes.
- Hands stable shell regions and selection/action APIs to Tasks 2–4.
- Stop if route selection requires auth, tenancy, owner-session, or public-route changes.

## Task 2 — interaction/direct manipulation subagent

**Workstream:** parent coordination only; do not create a Task 2 branch/PR
**Size:** L across the bounded child packets below
**Blast radius:** high because public renderer source may be touched
**Review tier:** Tier 3
**Owned risks:** R-02, R-03, R-15, R-17, R-20, R-27

### Goal

Make supported objects on the actual V2 public-room canvas selectable and safely manipulable through a floating action bar and expandable bottom sheet, with no behavior change when the editor bridge is absent.

### Scope

- Implement verbatim the synchronous `PresenceStudioV2EditorActivationInput` / `PresenceStudioV2EditorIntent` / `PresenceStudioV2EditorResult` / `PresenceStudioV2EditorBridge.handleIntent` contract in `STUDIO_V3_VIEW_MODEL_AND_COMPILER.md`; no renamed callback API, widened union, or delayed result. Piece/Room IDs must be trimmed, non-empty, and stable; index/title/URL/label/DOM/position identity is forbidden.
- Thread that optional bridge through `PresenceStudioV2PublicRoom` and BBB specialization only where required.
- Branch inside each BBB native pointer/touch/`Enter`/`Space` callback before visitor `onSelectWork`, focus transition, `onFocusWork`, or navigation; stable-ID Pieces select once, while no-ID CTA/link/unsupported chrome is consumed and inert. Direct Room and window Arrow paths emit/select only the destination Room in editor state; Escape clears deepest editor state without visitor handling; repeated activation remains suppressed. Bridge attachment/interception cancels pending focus transition and its animation callback rechecks the current bridge immediately before `onFocusWork`.
- Implement contextual action bar and bottom sheet for one supported Piece in the prototype, then safe move/reorder/feature/resize/crop/focus and supported text/CTA controls for Milestone 1.
- Provide magnetized zones, discrete safe sizes, viewport clamps, selection/deselection, undo of local staged manipulation, and keyboard/non-drag alternatives.
- Implement Simple/Advanced Creative capability exposure from the shared model. Hidden operator/debug capability must not be introduced.
- Keep editor overlays outside public payload and inert when bridge props are undefined.

### Numbered bounded child packets

#### 2.1 — P0 optional renderer bridge

- **One seam / branch / PR:** normative optional bridge contract and complete event interception only; `feat/presence-studio-v3-p0-renderer-bridge`; `[presence] add inert V3 renderer selection bridge`.
- **Dependencies:** reviewed Task 5.1 identity/types and Task 1 gate shell; no Task 4 shared-renderer edit in flight.
- **Tests:** V3-UX-002/003/005, V3-BRIDGE-001/002, V3-A11Y-003, V3-SAFE-008/009/010 in the canonical BBB prototype/public-invariance/mobile-accessibility specs plus current public-render/payload regressions. Include stable-ID pointer/touch/Enter/Space, no-ID CTA/link/unsupported chrome, direct Room/window Arrow, Escape depth, repeated activation, and attach-during-focus-animation rows.
- **Evidence:** bridge-undefined payload/DOM/event/focus/pending-transition fingerprints; native callback-order and stable-ID ledger; destination-Room and clear-depth intents; proof that `onFocusWork` is rechecked/suppressed after attachment; zero-write request ledger.
- **Stop:** any visitor side effect; index/title/URL/label identity; unresolved-ID fallthrough; public difference; editor instrumentation; new public data requirement; or write requirement.

#### 2.2 — P0 contextual controls and explicit visitor actions

- **One seam / branch / PR:** V3 action bar, bottom sheet, **Test as visitor**, and **Open link** only; `feat/presence-studio-v3-p0-contextual-controls`; `[presence] add safe V3 contextual controls`.
- **Dependencies:** 2.1 reviewed and P0 bridge interface frozen.
- **Tests:** V3-UX-004/005, V3-BRIDGE-003/004, V3-A11Y-003, V3-MOBILE-002 in canonical BBB prototype/mobile-accessibility specs.
- **Evidence:** selection/control/focus captures; safe-scheme link matrix; visitor-test bridge-absent fingerprint; zero-write ledger.
- **Stop:** visitor mode retains editor hooks, Open link is implicit/unsafe, focus is lost, or P0 requires a server preview/write.

#### 2.3 — M1 bounded manipulation and modes

- **One seam / branch / PR:** safe local transform/reorder/feature/mode controls only; `feat/presence-studio-v3-m1-manipulation`; `[presence] add bounded V3 manipulation modes`.
- **Dependencies:** P0 and P1 passed; Task 3 placement contract and Task 5 pure compiler interfaces reviewed. This packet has no draft persistence; 5.4 characterizes only, and 5.5 remains a separately approved server-contract blocker.
- **Tests:** V3-EDIT-001–004, V3-MODE-001–004, V3-MOBILE-001/003 in canonical BBB prototype/mobile-accessibility specs.
- **Evidence:** safe-zone/capability matrix, keyboard/non-drag proof, viewport captures, and compiler delta with no network mutation.
- **Stop:** arbitrary freeform scope, responsive breakage, editor/public drift, hidden debug controls, or dependency on unqualified writes.

### Files likely involved

```text
components/presence-studio-v3/StudioV3ActionBar.tsx        (new)
components/presence-studio-v3/StudioV3BottomSheet.tsx      (new)
components/presence-studio-v3/StudioV3SelectionOverlay.tsx (new, if overlay is needed)
components/presence-studio-v3/directManipulation.ts        (new or lib equivalent)
components/presence-studio-v3/presence-studio-v3.css
components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx
components/presence-studio-v2/BbbVisionCanvasGallery.tsx   (only if the supported Piece is inside it)
lib/presence/studio-v3/editorBridge.ts                     (new)
tests/e2e/presence-studio-v3-bbb-prototype.spec.ts
tests/e2e/presence-studio-v3-public-invariance.spec.ts
tests/e2e/presence-studio-v3-mobile-accessibility.spec.ts
```

### Non-goals

- No new renderer or duplication of the public renderer tree.
- No arbitrary breakable freeform positioning, normalized responsive-coordinate rewrite, rotation free-for-all, code injection, or entrance/Room-transition authoring.
- No Look, Collection, compiler, API, backend, public payload, instrumentation, publish, or hosted work.
- No changing public output to make selection easier.

### Acceptance criteria

- [ ] V3 canvas is `PresenceStudioV2PublicRoom`, including the BBB specialized branch where applicable.
- [ ] Pointer/touch/Enter/Space on a stable-ID Piece selects it once from inside the BBB native callback before visitor focus/navigation and opens the correctly named floating action bar.
- [ ] Deeper controls open in the bottom sheet and return focus correctly.
- [ ] No-ID CTA/link/unsupported chrome is consumed/inert; direct Room/window Arrow input selects only the destination Room in V3 state; repeated activation remains suppressed; Escape clears one deepest editor layer without visitor handling.
- [ ] Bridge attachment/interception cancels pending BBB focus transition and the animation callback recheck prevents `onFocusWork`; background/Escape clears selection without changing the draft.
- [ ] Safe manipulation creates deterministic view-model updates and remains recoverable at 320–1440 widths.
- [ ] Simple mode exposes guided safe actions; Advanced Creative exposes only approved transforms/depth/per-Piece overrides.
- [ ] Every drag has keyboard/tap controls.
- [ ] With no bridge prop, public and preview renderer DOM, events, CSS, payload, pending-focus completion, direct/window navigation, focus, and instrumentation match baseline.

### Tests

- V3-UX-002 through V3-UX-005.
- V3-EDIT-001 through V3-EDIT-004.
- V3-MODE-001 through V3-MODE-004 (interaction aspects).
- V3-SAFE-008 through V3-SAFE-010.
- V3-A11Y-001, V3-A11Y-003, V3-MOBILE-001 through V3-MOBILE-003.
- Existing focused V2 public render, BBB canvas, direct-manipulation, and layout-composition regressions.
- `npm run typecheck`, focused cross-browser Playwright, `npm run build`.

### Evidence required

- Before/after public DOM/payload/request fingerprints with bridge absent.
- Local screenshots/video-free sequence: unselected, selected, action bar, bottom sheet, safe move/resize at mobile/tablet/desktop.
- Capability table showing what each mode exposes.
- No screenshot or trace containing GGM material.

### Rollback notes

Remove V3 interaction components and optional bridge wiring. Restore renderer component signatures/behavior exactly; retain a read-only actual-renderer V3 canvas if the shell remains. Disable V3 gate if public invariance is uncertain.

### Dependencies and handoff

- Depends on Tasks 5 and 1.
- Must complete and land before Task 4 edits any shared public-room renderer file.
- Hands selection/capability events to Tasks 3, 4, and 7.
- Stop if the bridge requires public state, payload, route, analytics, or renderer behavior changes when absent.

## Task 3 — Pieces/Collections Shelf subagent

**Workstream:** parent coordination only; do not create a Task 3 branch/PR
**Size:** M across the two bounded child packets below
**Blast radius:** medium, with content-integrity consequence
**Review tier:** Tier 3
**Owned risks:** R-06, R-09, R-10, R-11, R-14, R-25, R-26

### Goal

Connect canonical owner Works/Collections to an in-editor Piece Shelf and produce deterministic Room placements without duplicating, deleting, or silently dropping content.

### Scope

- Load canonical Works and Collections with existing owner API/session clients.
- Adapt Works to Pieces and Collections to curated source sets using explicit source refs.
- Display placed/unplaced/incompatible state and adaptive client labels without claiming unsupported media functionality.
- Place one Piece and one Collection into a selected Room.
- Expand a Collection in canonical order, skip/report duplicates, retain incompatible items in the Shelf, and show a complete placement summary.
- Remove a placement from a Room without deleting the Work or Collection membership.
- Provide edit/open-in-Library affordance; keep permanent deletion in Library with an impact/confirmation contract.
- Support deterministic reorder/feature values through the view model.

### Numbered bounded child packets

#### 3.1 — P0 canonical Shelf and local placement loop

- **One seam / branch / PR:** Shelf read/adaptation plus local placement of one Piece and one Collection with deterministic IDs, compatibility accounting, and zero server/canonical mutation; `feat/presence-studio-v3-p0-piece-shelf`; **Dependencies:** Tasks 5.1–5.3, 1, and 2.1–2.2; **Tests:** V3-CONTENT-001–004 plus P0 request ledger/public invariance; **Evidence:** input/output accounting, before/after local canvas, incompatible Shelf item, canonical Work fingerprint; **Stop:** server write, canonical mutation, silent omission, title/URL source guess, or unsupported media claim.

#### 3.2 — M1 removal, Library handoff, edit, and reorder completion

- **One seam / branch / PR:** remove-from-Room/Collection semantics, edit/open-in-Library handoff, impact-accounting gate, and supported reorder/feature behavior only; `feat/presence-studio-v3-m1-content-completion`; **Dependencies:** passing P0/P1, 3.1, and separately reviewed current Library/API capability; **Tests:** V3-CONTENT-005–010 and guardrail/delete negative cases; **Evidence:** removal versus deletion ledger, complete/blocked impact examples, refresh/reorder fixtures; **Stop:** incomplete impact accounting, permanent delete from canvas, backend expansion, unqualified durable-provenance claim, or unsupported API semantics.

### Files likely involved

```text
components/presence-studio-v3/PieceShelf.tsx              (new)
components/presence-studio-v3/PieceShelfItem.tsx          (new, if useful)
components/presence-studio-v3/PlacementSummary.tsx        (new)
lib/presence/studio-v3/contentAdapters.ts                 (new)
lib/presence/studio-v3/placements.ts                      (new)
lib/api/owner.ts                                          (reuse first; edit only if an existing safe call is missing)
lib/api/types.ts                                          (reuse first; no speculative rich-media type expansion)
app/(studio)/studio/[id]/works/page.tsx                   (only a separately reviewed delete-confirmation fix if explicitly included)
app/(studio)/studio/[id]/collections/page.tsx             (only if existing reorder/edit behavior is explicitly in this task)
tests/e2e/presence-studio-v3-bbb-prototype.spec.ts        (canonical content cases)
```

### Non-goals

- No backend models/endpoints/migrations, batch reorder endpoint, upload pipeline, many-to-many Collection redesign, first-class Room-placement persistence, or rich-media promise.
- No permanent Work deletion from the Room editor.
- No silent conversion of legacy V2 objects into canonical Works.
- No public route, renderer, Look, transformation, publish, or hosted mutation.
- Do not broaden into a Library redesign; missing backend capabilities become follow-up tickets.

### Acceptance criteria

- [ ] Each canonical Work appears once in the Shelf with `work:<id>` regardless of placement count.
- [ ] Piece placement updates the actual canvas immediately and compiles deterministically.
- [ ] Collection placement accounts for every source ref as placed, duplicate, incompatible, or explicitly rejected.
- [ ] Duplicates are not placed twice and are reported.
- [ ] Incompatible/missing-media Pieces remain visible with a reason.
- [ ] Removing from Room or Collection never deletes the Work.
- [ ] Permanent delete is Library-only, explicit, cancelable, and lists affected placements/Collections before mutation.
- [ ] Reorder/edit-once semantics remain consistent with current owner API capability; unsupported many-to-many behavior is not faked.

### Tests

- V3-CONTENT-001 through V3-CONTENT-010.
- V3-SAFE-003, V3-SAFE-011, V3-SAFE-012 where content contributes.
- API request assertions: no delete during placement/removal, no publish, no hosted target.
- Boundary Collections at legal compiler list capacity and one beyond.
- `npm run typecheck`, focused Chromium/keyboard/touch Playwright, then `npm run build`.

### Evidence required

- Fixture and input/output accounting table.
- Screenshots: Shelf, Piece placement, mixed Collection result, visible incompatible item, remove-from-Room result, delete impact confirmation if that separately scoped change is made.
- Network ledger and canonical Work fingerprints before/after placement/removal.
- Documented capability gaps for media type, many-to-many membership, ordering, and placement persistence.

### Rollback notes

Remove Shelf/adapter/placement components and compiler inputs. Do not delete or alter canonical fixture Works as rollback. If a Library confirmation change is included, revert that isolated UI change without calling delete.

### Dependencies and handoff

- Depends on Tasks 5 and 1; consumes Task 2 selection/Room targeting where available.
- Provides deterministic source refs/placements to Task 4 and test fixtures to Task 6.
- Stop if required behavior needs backend schema/API, auth/ownership, hosted data, or silent content loss.

## Task 4 — Look/customisation subagent

**Workstream:** parent coordination only; do not create a Task 4 branch/PR
**Size:** L across the bounded child packets below
**Blast radius:** high because renderer-visible configuration and one new presentation adapter are involved
**Review tier:** Tier 3
**Owned risks:** R-03, R-07, R-08, R-12, R-13, R-21, R-22, R-24, R-29

### Goal

Deliver the customisation system in two gates: P0 proves one visible Look change, one lock, and named layer Look restore; P1 adds the complete three-Look/three-Room-Style range plus structural staging/savepoint proof.

### Scope

- Define Soft Editorial, Nocturnal Gallery, and Zine Archive as normalized, client-named presets.
- Provide Threshold Portal and Gallery Wall through existing V2 adapters and add the smallest Film Strip / Selected Works presentation adapter extracted from proven sequence behavior.
- Implement Presence, Room, Collection, and Piece override precedence and layer locks.
- Apply image treatment, motion intensity, background, typography, and CTA styling instantly on canvas.
- Stage Room Style, navigation, Collection Presentation, and transformation changes with Before/After plus Apply/Cancel.
- Save/restore named Looks as editable normalized layer values, recommendations/defaults, and provenance, never screenshots, blobs, lock state, Room placements/order/visibility, CTA state, or navigation structure.
- Store prototype locks/named Looks/save points only in the Task 5 schema keyed by full qualified local identity; quarantine every mismatch. P1 has no server write.
- Protect entry/core Room and required CTA invariants during preset/apply/restore.
- Implement only the pre-transform save-point primitive needed by Milestone 2; the full radical transformation may be a follow-on PR after Milestone 1 sign-off.

### Numbered bounded child packets

#### 4.1 — pure layer, precedence, lock, and named-Look semantics

- **One seam / branch / PR:** pure customisation values, precedence, locks, and named-Look apply/restore semantics only; `feat/presence-studio-v3-customisation-model`; **Dependencies:** Task 5.1/5.2; **Tests:** pure equivalents of V3-LOOK-005–007 in canonical compiler test; **Evidence:** value/precedence/lock/named-restore matrix; **Stop:** renderer, storage, UI, or network changes.

#### 4.2 — P0 one-Look, lock, and named-restore owner loop

- **One seam / branch / PR:** Soft Editorial over an existing safe Room Style plus one lock and current-session named Look save/alter/restore UI; `feat/presence-studio-v3-p0-look-loop`; **Dependencies:** Tasks 1, 2.1–2.2, 3.1, 5.3, and 4.1; **Tests:** V3-LOOK-003/005/007 plus local-envelope hygiene and public invariance; **Evidence:** visible same-content delta, locked value before/after preset-state switch, editable named restore, sanitized envelope, zero-write ledger; **Stop:** palette-only/no visible change, lock/placement conflation, server write, unsafe media reference, or public drift.

#### 4.3 — P1 complete three-Look range

- **One seam / branch / PR:** add Nocturnal Gallery and Zine Archive preset values/UI to the passing P0 Look loop; `feat/presence-studio-v3-p1-looks`; **Dependencies:** passing P0 and 4.2; **Tests:** V3-LOOK-001/003/006 plus public invariance; **Evidence:** same-content deltas and independent creative rubric; **Stop:** palette-only result, server write, or public drift.

#### 4.4 — P1 Film Strip presentation adapter

- **One seam / branch / PR:** third presentation adapter/registration only; `feat/presence-studio-v3-p1-film-strip`; **Dependencies:** 2.1 landed, 4.3 reviewed, no shared-renderer edit in flight; **Tests:** V3-LOOK-002 plus current layout/public regressions; **Evidence:** structural distinction, keyboard/touch/reduced-motion, bridge-undefined fingerprint; **Stop:** new renderer family, unaccounted Piece, or existing-layout change.

#### 4.5 — P1 structural savepoint, compare, and qualified reload UI

- **One seam / branch / PR:** structural savepoint plus Before/After/Apply/Cancel UI and consumption of Task 5.3 qualified Presence/Room envelopes; `feat/presence-studio-v3-p1-structural-compare`; **Dependencies:** Task 5.3 and 4.1–4.4; **Tests:** V3-LOOK-004/008–010 and V3-RESILIENCE-001; **Evidence:** exact authoritative-match/mismatch matrix, diagnostic-timestamp case, sanitized envelopes, and structural restore fingerprint; **Stop:** partial identity match, title/URL provenance guess, server write, blob/private data, or conflated named Look/savepoint.

### Files likely involved

```text
components/presence-studio-v3/LookPicker.tsx               (new)
components/presence-studio-v3/LayerControls.tsx            (new)
components/presence-studio-v3/NamedLooks.tsx               (new)
components/presence-studio-v3/BeforeAfter.tsx               (new)
components/presence-studio-v3/RoomStylePicker.tsx           (new)
lib/presence/studio-v3/looks.ts                            (new)
lib/presence/studio-v3/overrides.ts                        (new)
lib/presence/studio-v3/savePoints.ts                       (new)
lib/presence/studio-v3/presentations/filmStrip.ts          (new)
lib/presence/studio-v2/layouts.ts                          (only the minimal adapter registration if required)
components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx (only after rebasing Task 2; minimal new style selection)
components/presence-studio-v2/presence-studio-v2-public.css (only scoped Film Strip styling if required)
tests/e2e/presence-studio-v3-bbb-prototype.spec.ts         (canonical Look/style cases)
```

### Non-goals

- No palette-only presets, generic design system, arbitrary code/CSS injection, Webflow/Figma/Canva clone, or unsupported freeform positioning.
- No new renderer, backend metadata persistence, public serializer, cross-device named Looks, media blobs, or public publish.
- No room transitions/entrance animation for V3.0.
- No GGM content/assets/screenshots. A synthetic GGM-like transformation is Milestone 2 only.
- Do not modify a shared renderer file concurrently with Task 2.

### Acceptance criteria

- [ ] All six layers have explicit normalized values, scope, provenance, and supported compiler target.
- [ ] Three Looks differ in atmosphere, structural presentation, treatment, density, and motion.
- [ ] Threshold Portal, Gallery Wall, and Film Strip / Selected Works are structurally distinct and account for all Pieces.
- [ ] Piece > Collection > Room > Presence/global precedence is deterministic.
- [ ] Preset switching changes only unlocked layers.
- [ ] Instant fields update live; structural fields stage with exact Apply/Cancel and Before/After baseline.
- [ ] Named Look restores exactly and remains editable.
- [ ] Named Look restore changes only normalized layer values/recommendations; it neither stores nor changes locks, Room placement/order/visibility, CTA state, or navigation structure.
- [ ] Structural save points are a separate type owning Room/style refs, placements/order/visibility, CTA/navigation, and locks for exact BBB return.
- [ ] Reload restores local metadata only from separate Presence/Room envelopes with a complete schema/opaque-owner-partition/scope/immutable-base-identity/full-base-fingerprint match; every authoritative mismatch is quarantined/discarded and `updated_at` is diagnostic only.
- [ ] Local records contain no media blobs, credentials, private payloads, or GGM material.
- [ ] Existing published public styles/routes remain unchanged. A later, separately approved publish may make an intentionally selected adapter live, but this task never publishes.

### Tests

- V3-LOOK-001 through V3-LOOK-010.
- V3-SAFE-003, V3-SAFE-004, V3-SAFE-011, V3-SAFE-012.
- V3-RESILIENCE-001 and V3-RESILIENCE-002.
- Existing V2 public style-presets, BBB parity, public render, and layout-composition regressions.
- `npm run typecheck`, focused cross-browser Playwright, `npm run build`.

### Evidence required

- Normalized preset/override/lock matrix.
- Public-safe local screenshots of each initial Look and Room Style, plus lock switch, Before/After, and named restore.
- Local-storage allow-list dump with values sanitized.
- Compiler/public fingerprints and request ledger proving draft-only behavior.
- No GGM-like transformed screenshot in committed evidence.

### Rollback notes

Remove V3 Look UI/state/preset definitions and the Film Strip adapter registration/styles. Existing two V2 layouts and published configs must continue to resolve unchanged. Clear only the exact V3 local namespace for the affected fixture/version when needed.

### Dependencies and handoff

- Depends on Tasks 5, 1, and 2; consumes Task 3 source/placement semantics.
- Hands full Look/restore scenarios to Tasks 6 and 7.
- Stop if named Looks require current editable-config persistence, if Film Strip changes existing public output, or if exact restore cannot be fingerprinted.

## Task 5 — V3 view-model/compiler subagent

**Workstream:** parent coordination only; do not create a Task 5 branch/PR
**Size:** L across the bounded child packets below
**Blast radius:** high because draft integrity and public projection are adjacent
**Review tier:** Tier 3
**Owned risks:** R-01, R-04, R-05, R-06, R-07, R-09, R-12, R-13, R-23, R-25, R-26, R-30

### Goal

Provide a pure, deterministic V3 client view model/compiler, qualified local provenance, an exact JSON wire/semantic comparison contract, and disposable current-POST characterization. Expose no runtime Save or server Visitor Preview. Those remain blocked on a separately approved atomic expected-existing-draft server precondition that this task pack specifies but does not authorize anyone to implement.

### Scope

- Define Presence, Room, Piece, Collection, Look/layer, placement, lock, mode, named Look, structural save-point, and source-reference types. Enforce that named Looks contain only normalized layer values/recommendations/provenance, while structural save points alone contain Room/style refs, placements/order/visibility, CTA/navigation, and locks.
- Define explicit `work:<id>`, `collection:<id>`, and `legacy-object:<id>` parsing/formatting and deterministic Room-scoped placement IDs.
- Adapt current editor overview/draft, owner Works/Collections, and legacy V2 objects into one normalized V3 view model without treating placements as canonical Works.
- Define a concrete compiler-owned leaf/path allowlist and map supported V3 values into current V2 semantics; no implicit/wildcard section ownership.
- Define the ten-field logical comparison type and nine-field current POST transport type. Inject fresh-base `schema_version` unchanged for diffing and intentionally omit only it from transport. Define the wire value as `JSON.parse(JSON.stringify(payload))`, assert all nine named top-level keys survive, allow nested plain-object `undefined` elision, and prove sparse/`undefined` arrays would coerce to `null` and are therefore rejected before projection/request.
- Define the exact stable stored-semantic ten-field projection: recurse only within `scene_config`, `asset_config`, and `content_config`; on an object with its own non-empty trimmed `media_id` and own `visibility: "private_draft"`, omit only its own `url` and `preview_expires_at`; preserve `image_url`, `thumbnail_url`, every other key, and all values outside those sections.
- Treat source kind, config ID, Room ID, version, status, and schema version as the complete immutable base identity and pair it with the stable semantic fingerprint. `updated_at` is diagnostic only. P0/P1 produce no write input; current POST characterization produces evidence only; runtime M1 Save/Visitor Preview stays disabled pending separate approval and atomic server qualification.
- Preflight backend serializer limits: 256 KiB total, 96 KiB section, 160 list/key counts, depth 9, plus URL/string/media constraints exposed by the current contract.
- Define full-qualified browser-local identity/provenance validation, but keep storage adapters pure and UI-agnostic; partial match never recovers canonical refs.
- Provide deterministic normalization/fingerprints for view model, compiled output, and save points.
- Guard core Room, required CTA, content accounting, and unknown-value fail-safe behavior.

### Numbered bounded child packets

#### 5.1 — pure identity, stable semantic fingerprint, JSON wire projection, and owned paths

- **One seam / branch / PR:** types + immutable identity comparator + ten-field stored-semantic serializer/fingerprint + exact nine-field JSON wire projection + explicit owned-path constant only; `feat/presence-studio-v3-model-identity`; **Dependencies:** specs only; **Tests:** V3-SAFE-001/002/003 pure equivalents covering schema, exact nine-key set, nested object `undefined` elision, rejection of sparse/`undefined` arrays, and qualifying/non-qualifying three-section media objects; **Evidence:** full-field/stable-media/wire vectors and allowlist table; **Stop:** stripping beyond the exact two keys/three sections, missing field, unsafe JSON, wildcard ownership, network/UI edit, or version-only authority.

#### 5.2 — pure deterministic content/compiler pipeline

- **One seam / branch / PR:** source refs, IDs, Collection accounting, pure V3→V2 compile only; `feat/presence-studio-v3-pure-compiler`; **Dependencies:** 5.1; **Tests:** V3-CONTENT-003/004 and limit/guardrail pure cases; **Evidence:** repeat fingerprints and all-input accounting; **Stop:** canonical mutation, lossy unknown handling, network call, or public raw refs.

#### 5.3 — P1 local identity and provenance envelope

- **One seam / branch / PR:** local envelope/load/quarantine only; `feat/presence-studio-v3-local-provenance`; **Dependencies:** 5.1/5.2; **Tests:** V3-LOOK-008–010 and V3-RESILIENCE-001; **Evidence:** exact/base-identity/fingerprint/owner-partition/Presence/Room/schema mismatch matrix plus diagnostic-timestamp cases; **Stop:** heuristic title/URL matching, partial qualification, blobs/secrets, or server write.

#### 5.4 — isolated current-POST replacement/media characterization

- **One seam / branch / PR:** test-only characterization harness against isolated disposable local/test existing-draft and no-draft fixtures, with no product UI/runtime enablement; `test/presence-studio-v3-write-characterization`; **Dependencies:** P0, P1, 5.1–5.3; **Tests:** current PATCH stale-key negative; exact nine-field JSON body and ten-field semantic/schema retention; full-config POST owned replacement/deletion and unowned survival; same-revision semantic-fingerprint drift; current no-draft POST recorded as unsafe; current private-media request normalization strips `url`/`image_url`/`thumbnail_url`/`preview_expires_at`, while the comparison projector strips only `url`/`preview_expires_at`; exact media-row effects; and zero publish/public mutation. **Evidence:** before/after GET plus direct disposable-fixture row snapshots, stable semantic/full-owned-path diff, raw/parsed body, request ledger, public fingerprint, and an explicit “not runtime authority” verdict. **Allowed media-row delta:** only a referenced owner/Room-matching `private_draft` row may transition `draft_uploaded`/`orphaned`/`ready`→`draft_attached` with `updated_at`; an existing `draft_attached` row stays so; every other row/column, visibility, ownership, storage/publication field, and public/non-referenced row is unchanged. **Stop:** any hosted/production target, logical field loss, missing post-JSON key, semantic stripping beyond the exact two keys/three sections, unexpected/new/deleted media row, unowned delta, retained deleted object, changed public state, or ambiguity. This packet may mutate only disposable local/test fixtures and can never unlock Save/Visitor Preview.

#### 5.5 — blocked atomic server-precondition contract and qualification

- **Status/authority:** blocked. This packet freezes the required contract and qualification evidence only. It authorizes no backend/API edit, migration, runtime Save wiring, or server Visitor Preview. A human must issue a separate explicit backend work order with its own branch/PR scope before implementation begins.
- **Future one seam / branch / PR (descriptive, not authorized):** an expected-existing-draft compare-and-replace server operation that accepts exact draft identity/scope, revision, stable semantic fingerprint, and the nine-field wire payload; under one transaction it locks/re-reads, recomputes/compares, conflicts on absent/mismatch *before* config/media mutation, applies config plus only the allowed media status transitions, and commits or rolls both back; suggested future branch `feat/presence-studio-v3-atomic-draft-precondition`.
- **Dependencies:** 5.4 characterization and an independent Tier 3 review, followed by separate explicit human approval for backend contract work. A passing 5.4, immediate refetch, single-writer harness, or post-refetch match does not satisfy this dependency.
- **Future qualification tests:** V3-SAFE-001–007/013 and V3-RESILIENCE-002 plus backend transaction tests for missing draft, wrong ID/scope, stale revision, same-revision stable-fingerprint drift, signed private URL/expiry churn, mid-transaction validation/media failure rollback, exact allowed media transition, zero unexpected row change, and current draft-write/public regressions.
- **Required evidence:** atomic server-side compare location and transaction boundary; before/after config and media-row snapshots; conflict-before-mutation ledger; forced-failure rollback proof; stable semantic fingerprint parity vectors; public/request fingerprints; independent Tier 3 verdict. Post-refetch is verification evidence only.
- **Stop:** no separate approval; client-side compare as authority; current unguarded POST/PATCH reuse; no-draft creation; comparison outside the mutation transaction; mismatch after any mutation; partial config/media commit; unexpected media-row change; forbidden endpoint; public drift; or metadata leak. Runtime integration is a later separately scoped packet after this contract qualifies.

### Files likely involved

```text
lib/presence/studio-v3/model.ts             (new)
lib/presence/studio-v3/sourceRefs.ts        (new)
lib/presence/studio-v3/adapters.ts          (new)
lib/presence/studio-v3/compiler.ts          (new)
lib/presence/studio-v3/mergeDraft.ts        (new)
lib/presence/studio-v3/validation.ts        (new)
lib/presence/studio-v3/localState.ts        (new)
lib/presence/studio-v3/fingerprint.ts       (new)
lib/presence/studio-v3/index.ts             (new)
lib/api/editor.ts                            (read for current-helper characterization only; no runtime wiring in this task pack)
lib/api/types.ts                             (read/reuse existing types; no backend-contract authority)
lib/presence/studio-v2/model.ts              (read/reuse first; avoid mutation)
lib/presence/studio-v2/adapters.ts           (read/reuse first; avoid mutation)
lib/presence/studio-v2/layouts.ts            (read/reuse first; Task 4 owns new presentation registration)
lib/presence/studio-v3/compiler.test.ts                    (canonical proposed pure test)
tests/e2e/presence-studio-v3-bbb-prototype.spec.ts        (gate-driving compiler/safety cases)
tests/e2e/presence-studio-v3-public-invariance.spec.ts    (canonical public cases)
```

### Non-goals

- No UI, renderer bridge, CSS, new Room Style component, backend model/endpoint/migration, runtime Save/Visitor Preview wiring, auth, public serializer, public route, publish, rollback, upload, or hosted mutation. Task 5.5's future server contract description is a blocker/acceptance boundary, not implementation authority.
- No speculative rich-media, many-to-many Collection, placement persistence, or normalized-responsive backend schema.
- No full V3 metadata in `editable_config`, including `locked_fields` as a shortcut.
- No silent lossy adapter. Unknown/unsupported data must survive in its source or produce a visible diagnostic.

### Acceptance criteria

- [ ] Identical normalized input compiles byte/value deterministically with stable unique IDs and order.
- [ ] Canonical Works/Collections remain distinct from derived V2 placements.
- [ ] Complete immutable base identity/revision and stable semantic ten-field fingerprint are required; only verified `private_draft` media refs omit exactly `url`/`preview_expires_at`, every authoritative mismatch blocks, and `updated_at` is diagnostic only.
- [ ] Only the explicit compiler-owned paths can change; every unrelated sentinel is preserved.
- [ ] The logical candidate contains all ten fields with unchanged base `schema_version`; after `JSON.parse(JSON.stringify(...))` the transport contains all and only the nine named fields with exact `undefined` behavior; characterization refetch returns the same schema/semantic config but is never treated as concurrency control.
- [ ] All limit validators handle boundary and over-boundary values without truncation.
- [ ] Local metadata uses opaque-owner-partitioned Presence/Room envelopes and requires a complete schema/scope/base-identity/full-fingerprint match; otherwise it rejects/quarantines and cannot qualify source refs. Logout/account switch clears the prior partition.
- [ ] The compiled full-config characterization candidate excludes locks, named Looks, save points, compare baselines, editor provenance, tokens, blobs, and private data except renderer-visible V2 fields explicitly required; current PATCH/current POST are never V3 runtime outputs.
- [ ] 5.4 proves the no-draft current POST is unsafe, strips only valid private-ref `url`/`preview_expires_at` for semantic comparison, and permits exactly the documented private-media status/`updated_at` delta with no unexpected row change.
- [ ] Runtime Save and server Visitor Preview stay disabled until separately approved server work passes 5.5's in-transaction expected-existing identity/revision/stable-fingerprint conflict and config/media rollback contract.
- [ ] Entry Room, required CTA, content-accounting, and unique-ID invariants block invalid output before network calls.
- [ ] The module cannot call publish or hosted endpoints.

### Tests

- V3-CONTENT-003, V3-CONTENT-004.
- V3-LOOK-005 through V3-LOOK-010 at pure model level.
- V3-SAFE-001 through V3-SAFE-004 and V3-SAFE-011 through V3-SAFE-013, treating SAFE-001/002 runtime portions as blocked future atomic-contract acceptance rather than current-POST authorization.
- V3-XFORM-001, V3-XFORM-005, V3-XFORM-006 at save-point/fingerprint level when Milestone 2 begins.
- Boundary/property-style fixture matrices for IDs, order, limits, unknown keys, malformed refs, and repeat compilation.
- Existing `lib/api/editor.test.ts` and V2 adapter/model test coverage where the repository’s chosen runner is available; do not invent a package script.
- `npm run typecheck`, focused Playwright contract tests, `npm run build`.

### Evidence required

- Compiler ownership-path table.
- Input/output and fingerprint fixtures for deterministic, stale, stable-private-media, JSON wire/undefined, limit, unknown, CTA, Room, and unrelated-section cases.
- Captured nine-field characterization body proving exact post-serialization key presence and editor-only metadata exclusion; disposable config/media row before/after evidence and an explicit “not runtime authority” verdict.
- Diff review confirming no backend/public/auth files changed.

### Rollback notes

Remove the isolated `lib/presence/studio-v3` modules and V3-only tests. Because this task has no route/UI/API mutation and V3 is default-off, existing V2 draft/public behavior should require no data rollback.

### Dependencies and handoff

- Foundation task; depends only on approved specification and read-only repo contracts.
- Must be reviewed before Tasks 1–4 integrate against it.
- Publishes typed interfaces and test fixtures, not runtime enablement.
- Stop if safe compile requires backend/public serializer/auth/publish changes or if non-owned field retention cannot be proved.

## Task 6 — tests/evidence subagent

**Suggested branch:** `test/presence-studio-v3-evidence`
**Suggested PR title:** `[presence] prove Studio V3 prototype safety and owner flow`
**Size:** M
**Blast radius:** low code blast, high evidence consequence
**Review tier:** Tier 2, escalated to Tier 3 for any public-boundary finding
**Owned risks:** R-01, R-18, R-20, R-21, R-27, R-30 and validation coverage for all other risks

### Goal

Implement and run the acceptance matrix against sanitized local fixtures, capture a complete evidence pack, and identify failures without modifying product behavior to make tests pass.

### Scope

- Build the V3 Playwright specs and local mock fixtures named in the acceptance document.
- Add request, public payload, DOM, compiler, state, and visual oracles.
- Execute focused, cross-browser, typecheck, and build validation appropriate to changed code.
- Run manual mobile/tablet/desktop, keyboard, reduced-motion, zoom, comprehension, and restore checks.
- Create a sanitized evidence pack with command logs, traceability, screenshots allowed by privacy rules, request ledger, public invariance fingerprints, risks, and rollback notes.
- Record test failures precisely and hand them back to the owning builder. Do not repair runtime code in this lane.

### Files likely involved

```text
tests/e2e/presence-studio-v3-*.spec.ts
tests/e2e/mock-presence-api.mjs                  (additive sanitized V3 fixtures only)
playwright.config.ts                             (explicit local V3 test flags only if required)
docs/program/evidence/presence-studio-v3-prototype/README.md
docs/program/evidence/presence-studio-v3-prototype/VALIDATION_RECORD.md
docs/program/evidence/presence-studio-v3-prototype/TRACEABILITY.md
docs/program/evidence/presence-studio-v3-prototype/REQUEST_LEDGER.md
docs/program/evidence/presence-studio-v3-prototype/PUBLIC_INVARIANCE.md
docs/program/evidence/presence-studio-v3-prototype/ROLLBACK.md
docs/program/evidence/presence-studio-v3-prototype/screenshots/* (public-safe states only)
```

### Non-goals

- No runtime product fixes, refactors, feature implementation, hosted smoke, publish, rollback endpoint, deploy, or production-data access.
- No weakening assertions or broad ignore masks to obtain a pass.
- No GGM content/assets/routes/screenshots or transformed GGM-like screenshot evidence.
- No final no-merge verdict; Task 8 owns independent review.

### Acceptance criteria

- [ ] Every required acceptance ID is automated or has a justified manual record.
- [ ] Request ledger proves zero publish/rollback/hosted mutation.
- [ ] Canonical and alias public invariance has payload, DOM, renderer, instrumentation, and visual evidence.
- [ ] Compiler/state fingerprints prove draft retention and restore behavior.
- [ ] Mobile/accessibility/failure paths are represented, not only the happy path.
- [ ] Evidence contains no secret, token, private payload, GGM material, or unapproved BBB asset.
- [ ] Failing tests remain failed and are assigned to the owning task with reproduction details.
- [ ] Commands, environment, fixture version, commit, browser, viewport, risks, and rollback are recorded.

### Tests

- Execute the complete command sequence from [Acceptance tests](./STUDIO_V3_ACCEPTANCE_TESTS.md).
- Run the relevant existing V2/BBB public-render, draft-preview, layout, style, owner-experience, and eligibility regression specs.
- Inspect retained traces/screenshots before committing.
- Confirm no repository lint or named unit-test script is claimed.

### Evidence required

The evidence pack is the output. It must include a matrix from acceptance ID to test/manual evidence, exact commands/results, sanitized fingerprints, request ledger, public-safe screenshots, known gaps, and rollback. BBB transformed/GGM-like visuals are never captured; BBB baseline/restored images are allowed only if already approved for this internal evidence task.

### Rollback notes

Remove V3-only specs, sanitized fixture additions, and the evidence pack. Do not remove existing test fixtures or weaken existing assertions. Evidence rollback cannot correct a privacy leak; escalate immediately if one is found.

### Dependencies and handoff

- Runs after Tasks 1–5 and 7 are integrated on a review branch.
- May prepare fixture/test skeletons earlier but must not assume unreviewed selectors/contracts.
- Hands complete evidence plus unresolved failures to Task 8.
- Stop before any hosted/network target or when test artifacts contain sensitive material.

## Task 7 — accessibility/mobile subagent

**Suggested branch:** `fix/presence-studio-v3-accessibility-mobile`
**Suggested PR title:** `[presence] harden Studio V3 for touch keyboard and mobile`
**Size:** M
**Blast radius:** medium
**Review tier:** Tier 2
**Owned risks:** R-12, R-14, R-15, R-16, R-17

### Goal

Make every Milestone 1 owner action usable by touch, keyboard, screen-reader semantics, reduced motion, zoom, and representative mobile/tablet/desktop viewports without changing product architecture.

### Scope

- Audit and fix accessible names, roles, states, descriptions, announcements, focus order/return, modal trapping, and error/status semantics across V3 controls.
- Add keyboard and non-drag alternatives for selection, placement, reorder, feature, safe move/resize, locks, Looks, save/restore, preview, and confirmations.
- Enforce touch targets, safe-area/virtual-keyboard handling, bottom-sheet detents, orientation, scroll recovery, and 320–1440 responsive layouts.
- Validate contrast/focus in all three Looks/Room Styles and add safe fallbacks where media makes contrast uncertain.
- Respect reduced motion while preserving meaning.
- Clamp inherited V2 pixel transforms so permitted edits cannot hide required content on narrow output.
- Improve media alt/error states within current capability; document transcript/caption gaps rather than invent backend support.

### Files likely involved

```text
components/presence-studio-v3/*.tsx
components/presence-studio-v3/presence-studio-v3.css
components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx (only if editor-bridge semantics require a minimal fix; public-negative review mandatory)
tests/e2e/presence-studio-v3-mobile-accessibility.spec.ts   (canonical accessibility/mobile cases)
tests/e2e/presence-studio-v3-bbb-prototype.spec.ts          (non-drag interaction additions)
```

### Non-goals

- No visual redesign, architecture change, renderer replacement, generic design-system refactor, backend media workflow, normalized responsive-coordinate model, new dependency, or broad public CSS change.
- No product feature expansion to solve an accessibility finding; return an owning-task ticket when behavior must change.
- No publish, hosted, GGM, or production work.

### Acceptance criteria

- [ ] Every Milestone 1 core action is keyboard operable with visible focus and meaningful names/states.
- [ ] Dialog/sheet focus is contained and returned predictably; Escape/cancel never loses edits unexpectedly.
- [ ] Drag actions have tap/keyboard alternatives.
- [ ] Primary touch targets meet 44×44 CSS pixels or have equivalent spacing/target expansion.
- [ ] 320×568 through 1440×900, portrait/landscape, 200% zoom, and virtual-keyboard-sensitive flows retain all functions.
- [ ] All Looks/Room Styles retain readable contrast and focus visibility.
- [ ] Reduced motion removes nonessential movement without removing content/state.
- [ ] Safe transforms cannot strand Piece, text, or required CTA off-canvas.
- [ ] No accessibility/editor hook appears on public routes when the bridge is absent.

### Tests

- V3-A11Y-001 through V3-A11Y-005.
- V3-MOBILE-001 through V3-MOBILE-003.
- V3-CONTENT-002/003/009 using non-drag paths.
- V3-SAFE-010/011/012.
- Focused Chromium plus configured Firefox/WebKit; manual keyboard, reduced-motion, zoom, and at least one screen-reader semantic pass.
- `npm run typecheck` and `npm run build`.

### Evidence required

- Accessibility checklist mapped to acceptance IDs and components.
- Keyboard path recording in text, focus-order notes, contrast results, and live-region/state assertions.
- Screenshots at required viewports/zoom and all three Looks; no sensitive/private content.
- Known limitations and follow-up ticket for normalized responsive placement and rich-media accessibility.

### Rollback notes

Revert only scoped V3 semantic/CSS/test changes. Never remove working keyboard labels/guards merely to restore a visual baseline. If a public-renderer semantic change causes drift, revert that change first and keep editor semantics outside the renderer.

### Dependencies and handoff

- Runs after Tasks 1–4 on top of reviewed Task 5.
- Coordinates with Task 6 for test/evidence capture, but Task 7 owns fixes and Task 6 owns validation records.
- Stop if a fix needs a new dependency, broad renderer/public CSS change, or unsupported media/backend contract.

## Task 8 — no-merge/security reviewer

**Suggested branch:** none for review; if an evidence-only verdict file is required, use `review/presence-studio-v3-prototype`
**Suggested PR title:** none; reviewer does not merge
**Size:** S–M depending on findings
**Blast radius:** review of high-boundary work
**Review tier:** Tier 3, reviewer must be independent of Tasks 1–7
**Owned risks:** independent verification of R-01 through R-30

### Goal

Adversarially review the integrated V3 diff and evidence, issue the exact repository no-merge verdict, and prevent merge/pilot expansion when public, persistence, privacy, owner, UX, or evidence boundaries are unproven.

### Scope

- Establish base/head commits and list every changed file.
- Verify changes match the approved task allow-lists and no backend/auth/tenancy/control-plane/public-route/deploy/config/secrets scope entered accidentally.
- Review route gate, exact native-callback bridge contract/race handling, compiler-owned paths, stable semantic/JSON wire projection, disposable current-POST/media characterization, disabled runtime persistence, 5.5 atomic-server blocker, local schema, IDs, content accounting, deletion/CTA/Room guards, modes, and exact restore.
- Run or independently inspect typecheck, build, focused/full tests, request ledger, public fingerprints, screenshots, mobile/accessibility evidence, and rollback.
- Scan committed fixtures, logs, traces, screenshots, and docs for credentials, private payloads, hosted data, GGM material, and unapproved BBB assets.
- Start the review record with exactly one repository verdict: `VERDICT: MERGE`, `VERDICT: MERGE AFTER FIXES`, or `VERDICT: NO MERGE`.
- Return blockers to the owning builder. Do not fix runtime code in the review lane and do not merge/deploy/publish.

### Files likely involved

```text
.agent/NO_MERGE_REVIEW.md                                  (read-only checklist)
docs/program/presence-studio-v3/*                          (read-only normative specs)
docs/program/evidence/presence-studio-v3-prototype/*       (read evidence)
docs/program/evidence/presence-studio-v3-prototype/NO_MERGE_REVIEW.md (review output only)
all runtime/test files changed by Tasks 1–7                  (read-only review)
```

### Non-goals

- No runtime fix, refactor, merge, rebase, push, deploy, publish, hosted mutation, stakeholder contact, or scope negotiation.
- No soft pass based on screenshots or builder claims.
- No acceptance of missing tests without a concrete, risk-proportionate reason and human decision.
- No GGM-like screenshot capture during review.

### Acceptance criteria

- [ ] Review file begins with one exact verdict and includes every required repository review section.
- [ ] Base/head, files changed, unexpected changes, and task ownership are explicit.
- [ ] All critical/high risks map to preventive control, test, evidence, and rollback.
- [ ] Public canonical/alias behavior and absence of editor instrumentation are independently verified.
- [ ] Draft merge cannot lose non-owned sections and no full V3 metadata enters editable config/public payload.
- [ ] No publish/rollback/hosted mutation occurred.
- [ ] Auth/tenancy/owner boundaries are unchanged.
- [ ] Mobile/accessibility evidence covers the core journey.
- [ ] Privacy scan finds no secret/private/GGM leakage.
- [ ] Any failed/missing criterion produces a blocker or named required fix, not an ambiguous recommendation.
- [ ] Human approval remains required after a merge verdict and before merge, enablement, hosted validation, deployment, or publish.

### Tests and review commands

- Inspect diff/name-status against the approved base.
- Run `git diff --check` and search changed content for secrets/private markers.
- Run the complete V3 test sequence and relevant V2/public regressions from the acceptance plan.
- Run `npm run typecheck` and `npm run build` for runtime changes.
- Independently reproduce at least the gate negative, exact-merge sentinel, no-publish ledger, canonical/alias public invariance, stale local state, mixed Collection accounting, required CTA/core Room guard, keyboard flow, and exact BBB restore.
- Inspect all retained traces/screenshots before review sign-off.

### Evidence required

- Completed no-merge review with binary verdict.
- Command/test results and independently reproduced acceptance IDs.
- Changed-file allow-list, privacy scan, request ledger review, public fingerprints, rollback assessment, and required fixes.
- If `MERGE AFTER FIXES`, a second review after fixes; do not treat the first verdict as approval.

### Rollback notes

The reviewer recommends the narrowest rollback: disable V3 gate, remove route selection, remove optional bridge, remove isolated V3 modules, or revert the owning task. The reviewer performs no destructive rollback and never calls a production rollback endpoint.

### Dependencies and handoff

- Depends on integrated Tasks 1–7 and the complete Task 6 evidence pack.
- Must be a separate agent/reviewer from all builders.
- Hands a binary verdict and required fixes to the human owner; no implementation or merge authority.
- Stops immediately on secrets/private exposure, hosted mutation, public drift, auth/tenant change, or missing exact-restore/public-invariance evidence.

## Human gates after the eight lanes

Even a clean `VERDICT: MERGE` authorises only human review of the branch. Separate explicit human approval is required to merge, enable a pilot outside local/test, run a hosted check, deploy, publish, expand eligibility, change persistence, or use BBB/GGM evidence publicly.
