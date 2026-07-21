# Presence Studio V3 Prototype Slice

Status: recommended prototype definition; no code is implemented in this documentation pass.

## How to read this document

- **CURRENT FACT** identifies existing repository code or behaviour.
- **PROPOSED** identifies future implementation work.
- Every proposed implementation identifier is prefixed with **`[PROPOSED]`**.

## Slice verdict

Build one default-off, local/test-only BBB owner-editor slice at the existing `/studio/[id]/editor` URL. It replaces the legacy shell only for the gated BBB session, renders the exact V2 public room as its live canvas, and keeps all experimental creative metadata browser-local. The slice has two sequential zero-write gates: P0 proves the editor seam with one visibly changed Look; P1 proves the complete three-Look/three-Room-Style creative claim. Neither gate creates or updates a draft or calls server preview. Under this no-backend plan Milestone 1 Save Draft also remains disabled pending a separately approved atomic expected-existing-draft server contract; the slice cannot publish.

This is the smallest slice that tests the product claim: an owner can shape the Presence they are actually seeing without risking the live BBB site.

## Proof question

**Gate P0 — seam proof:** Can a BBB owner select a Piece without triggering its visitor action, open the floating controls, place one Work and one Collection, make one Look visibly change the canvas, preserve one lock, and save/change/restore one named Look in browser-local state while public BBB and undefined-bridge behaviour remain unchanged and the request ledger shows zero writes?

**Gate P1 — style proof:** After P0, can the same bounded surface show all three Looks and all three Room Styles—including Film Strip / Selected Works—create and compare a structural savepoint, and pass independent aesthetic review against the current BBB baseline?

If any answer depends on a new backend, a new renderer, public mutation, or fake screenshot state, the slice is too broad or invalid.

## Target user journey

### Gate P0 journey

1. An authorised BBB owner opens `/studio/29/editor` or the equivalent BBB editor link.
2. With the `[PROPOSED]` local/test flag enabled, the route opens `[PROPOSED] PresenceStudioV3Editor` before current `StudioShell`.
3. The first frame is the live Presence canvas rendered by current `PresenceStudioV2PublicRoom`.
4. The owner's first mouse, touch, or keyboard activation of a BBB canvas Piece selects it; visitor CTA/link, internal navigation, and artwork-focus behaviour are suppressed for that activation.
5. `[PROPOSED] PresenceStudioV2EditorBridge` reports the selected deterministic Piece identifier to the V3 shell.
6. `[PROPOSED] StudioV3ActionBar` appears with safe editor actions and labelled **Open link** / **Test as visitor** actions where applicable.
7. **More** expands `[PROPOSED] StudioV3BottomSheet` without replacing the canvas.
8. The owner opens `[PROPOSED] StudioV3PieceShelf` and places one Work, then one Collection, into the current Room.
9. The Collection expands into unique compatible Pieces; incompatible content remains visible on the Shelf with a summary.
10. The owner chooses one Look and sees an immediate visible change, locks one layer, switches the Look state again, and sees the locked value preserved.
11. The owner names the current Look, alters unlocked layer values, compares and restores it. Named media is omitted unless an opaque stable owner-authorised asset identifier is available.
12. The flow remains browser-local and the P0 request ledger contains no draft write or server-preview request.
13. Tests verify that no publish endpoint was called and that public BBB plus undefined-bridge interaction behaviour remain identical to baseline.

### Gate P1 journey

1. Starting from a passing P0, the owner switches Soft Editorial → Nocturnal Gallery → Zine Archive and sees materially distinct atmosphere, presentation, treatment, density, and motion.
2. They exercise Threshold Portal, Gallery Wall, and Film Strip / Selected Works on the bounded fixture.
3. They stage one structural transformation, inspect before/after, and cancel or restore it through the complete pre-transformation savepoint.
4. Independent creative reviewers assess every finished Look/Room-Style combination against the current BBB baseline; seam reuse alone does not pass P1.

## In scope

### Route and gate

CURRENT entry:

- `presence-app/app/(studio)/studio/[id]/editor/page.tsx`
- Current owner hook `useOwnerNode` from `presence-app/components/studio/useOwnerNode.ts`

Proposed additions:

- `[PROPOSED] shouldUsePresenceStudioV3Editor`
- `[PROPOSED] NEXT_PUBLIC_PRESENCE_STUDIO_V3_BBB_PILOT`
- `[PROPOSED] presence-app/lib/presence/studio-v3/feature.ts`

Gate contract:

- Explicitly off by default.
- True only in local/test (`NODE_ENV !== production`).
- True only with explicit flag value and BBB room `29` or slug `bbbvision`.
- False in production even if misconfigured.
- Does not change current V2 editor/public eligibility.
- Branches outside current `StudioShell`.

### Visitor-accurate live canvas

CURRENT rendering path:

- `publicRoomFromStudioV2State` in `presence-app/lib/presence/studio-v2/adapters.ts`
- `PresenceStudioV2PublicRoom` in `presence-app/components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`
- BBB branch `BbbVisionCanvasGallery` in `presence-app/components/presence-studio-v2/BbbVisionCanvasGallery.tsx`

Proposed seam:

- `[PROPOSED] PresenceStudioV2EditorBridge`, optional and default `undefined`.

The bridge implements verbatim the synchronous `PresenceStudioV2EditorIntent` / `PresenceStudioV2EditorResult` / `handleIntent` TypeScript contract in `STUDIO_V3_VIEW_MODEL_AND_COMPILER.md`. Stable-ID Piece pointer/touch/`Enter`/`Space` selects and suppresses visitor effects; a no-ID CTA/link is suppress-only inert; direct or Arrow Room navigation emits/selects the computed destination Room in editor state without visitor view/hash/history navigation; Escape clears selection; unsupported chrome is suppress-only. Merely moving focus does not activate. Labelled **Open link** / **Test as visitor** are deliberate V3-shell actions outside this native path.

Every native BBB callback branches before its first visitor effect. Handling cancels any pending focus transition; animation completion rechecks the current bridge before `onFocusWork`; direct navigation and window Arrow/Escape paths recheck before focus, view, hash, history, or navigation effects. A missing ID, delayed result, uncancelled transition, or bridge-present visitor effect stops the slice.

Current public call sites pass no bridge. When the bridge is `undefined`, the renderer adds no editor handler, attribute, state, tab stop, focus-order change, or event suppression. Public mouse, touch, keyboard, CTA, internal-navigation, and artwork-focus behaviour, payload requirements, markup, and visuals must remain exactly unchanged for a deterministic fixture.

### V3 working model and compiler

Proposed area:

- `[PROPOSED] presence-app/lib/presence/studio-v3/model.ts`
- `[PROPOSED] presence-app/lib/presence/studio-v3/compiler.ts`
- `[PROPOSED] presence-app/lib/presence/studio-v3/sourceRefs.ts`

Proposed symbols:

- `[PROPOSED] StudioV3Document`
- `[PROPOSED] StudioV3Presence`
- `[PROPOSED] StudioV3Room`
- `[PROPOSED] StudioV3Piece`
- `[PROPOSED] StudioV3Collection`
- `[PROPOSED] StudioV3Look`
- `[PROPOSED] hydrateStudioV3Document`
- `[PROPOSED] compileStudioV3ToStudioV2`
- `[PROPOSED] mergeStudioV3CompiledDraft`

Rules:

- One V3 Room maps to one current V2 chamber.
- Canonical source references are `work:<id>`, `collection:<id>`, and `legacy-object:<id>`.
- V2 visitor objects are compiled snapshots with opaque deterministic identifiers derived from Room and terminal Piece source reference. Raw source references stay in browser-local editor provenance matching the exact server base-config identity and canonical full-base fingerprint; they do not enter public object fields/identifiers.
- A Collection placement expands into terminal Pieces, dedupes within the Room, and keeps incompatible/unresolved Pieces visibly shelved.
- Existing current pixel transforms are used; safe bounds remain current V2 bounds.
- Compilation is pure and repeatable.

### Piece Shelf

CURRENT content APIs:

- `listWorks` and `listCollections` in `presence-app/lib/api/owner.ts`
- `PresenceWork` and `PresenceCollection` in `presence-app/lib/api/types.ts`
- Existing Work/Collection arrays on the owner node when already supplied

Proposed UI and adapter:

- `[PROPOSED] StudioV3PieceShelf`
- `[PROPOSED] adaptPresenceWorkToStudioV3Piece`
- `[PROPOSED] expandStudioV3CollectionPlacement`

The Shelf supports search/list, unplaced/placed state, one-click/touch placement into the active Room, Collection expansion, and visible incompatibility reasons. The prototype does not duplicate Work/Collection CRUD.

### Looks, locks, savepoints, and compare

Built-in proposed Looks:

1. `[PROPOSED] Soft Editorial` — Gallery Wall, light/soft atmosphere, airy density, restrained treatment, low motion.
2. `[PROPOSED] Nocturnal Gallery` — Threshold Portal, dark/deep atmosphere, focused density, stronger treatment, moderate motion.
3. `[PROPOSED] Zine Archive` — Film Strip / Selected Works, stark high contrast, dense sequence, clipped treatment, energetic motion.

Initial Room Styles:

1. Threshold Portal — current `portal-threshold` composition.
2. Gallery Wall — current `gallery-wall` composition.
3. Film Strip / Selected Works — `[PROPOSED] film-strip-selected-works`, the smallest new V2 composition adapter.

Proposed metadata symbols:

- `[PROPOSED] StudioV3LayerLockMap`
- `[PROPOSED] StudioV3OwnerPartitionKey`
- `[PROPOSED] StudioV3PresenceLocalEnvelope`
- `[PROPOSED] StudioV3RoomLocalEnvelope`
- `[PROPOSED] deriveStudioV3OwnerPartitionKey`
- `[PROPOSED] applyStudioV3Look`
- `[PROPOSED] loadStudioV3LocalMetadata`

Each Look changes atmosphere, layout/presentation, treatment, density, and motion. Locks preserve the current layer value across a preset switch. Named Looks store normalised editable layer values/recommendations and provenance, not locks, forced screenshots, placement/order, or duplicated content. A named Look may retain a media choice only as an opaque stable asset identifier validated against the current owner's authorised asset list (for example, an eligible `media_id`); it never stores a URL, blob/base64 value, copied media, expiring preview reference, or other private-draft reference. If that stable identifier is unavailable, P0 omits the media choice and restore leaves destination media unchanged. Destination locks remain independent and in force during named-Look apply/restore.

`[PROPOSED] StudioV3Savepoint` is a separate structural restoration record created before a transformation, including separately applying a named Look's structural recommendations. Ordinary named Look layer restore uses a reversible staged layer baseline, not a structural savepoint. A savepoint carries references for Room order/entry, Room Styles/compositions, Collection Presentations, Piece placement/order/feature/depth, visibility, required CTA, navigation, resolved layer values/overrides, locks, and Look/revision provenance. It references canonical media and never stores media blobs.

### Browser-local safety

`[PROPOSED] deriveStudioV3OwnerPartitionKey` derives an opaque digest from deployment scope plus the stable owner subject supplied by the validated authenticated session. It stores no raw user ID, email, token, or token claim. If the validated owner subject is unavailable, local storage is disabled and state remains in memory.

The exact proposed namespaces are:

- Presence: `presence-studio-v3:prototype:<opaque-owner-key>:presence:<presence-id>:<base-kind>:<config-id>:<base-fingerprint>`
- Room: `presence-studio-v3:prototype:<opaque-owner-key>:room:<presence-id>:<room-id>:<base-kind>:<config-id>:<base-fingerprint>`
- Quarantine: the same opaque owner partition under `:quarantine:<timestamp>:...`

`[PROPOSED] StudioV3PresenceLocalEnvelope` owns validated mode preference, active/global Look values, named Looks, Presence/global locks and navigation, Presence-wide structural savepoint index, and Presence staging/compare state. It contains no Room placement map.

`[PROPOSED] StudioV3RoomLocalEnvelope` owns only that Room's locks/overrides, placement and Collection provenance, visible Shelf state, Room staging/compare state, and Room savepoint fragments. It contains no named Look library or cross-Room state. Both envelope bodies repeat the opaque owner partition, schema, scope, complete immutable base identity, and canonical full-base fingerprint; key equality alone is insufficient.

`version` is one field in the complete immutable base-compatibility identity, but it is never a sufficient concurrency guard without the canonical full-base fingerprint. `updated_at` may be recorded only as diagnostics and is not identity authority.

Allowed:

- Presence/global and Room-scoped locks in their owning envelopes.
- Named Look normalised editable layer values/recommendations, provenance, and only validated opaque stable owner-authorised asset identifiers in the Presence envelope; never locks or placement/order.
- Presence savepoint index plus Room savepoint fragments containing the structural/style references required for exact restoration.
- Scope-correct staging and before/after state.
- Room-local source-reference and Collection-placement provenance.

Forbidden:

- Media blobs or base64.
- Full server configs or node payloads.
- Auth/session values or raw owner identifiers.
- Private URLs or secrets.
- Any URL, blob/base64 value, copied media, expiring preview reference, or other private-draft media reference inside a named Look.
- A cross-room or cross-version automatic merge.

Logout or account switch clears in-memory state and every envelope/quarantine record for the previous opaque owner partition before deriving the next partition. If cleanup cannot be confirmed, local storage is disabled for the new session and prior data is never loaded as fallback.

When owner partition, envelope schema, Presence/Room scope, complete server base-config identity, or canonical full-base fingerprint differs, `[PROPOSED] loadStudioV3LocalMetadata` must quarantine/discard the record and start from current server state. A `version`/`updated_at` match does not rescue a fingerprint mismatch; an `updated_at` difference alone is diagnostic and does not invalidate an otherwise authoritative match. Invalid, URL-bearing named-Look, blob-like, copied-payload, cross-owner, or cross-Room envelopes are never applied.

### Draft save and reload

CURRENT APIs:

- `getPresenceEditor`
- `createPresenceEditorDraft` only inside disposable current-endpoint characterization; its create-or-update behavior disqualifies it from V3 runtime Save.
- `patchPresenceEditorDraft` is a known current helper but is forbidden for V3 saves because recursive deep-merge retains omitted stale nested keys.

Proposed integration symbol:

- `[PROPOSED] saveStudioV3CompiledDraft`

Rules:

1. Keep the complete exact `overview.draft` config as the load base, or the complete exact `overview.published` config when no draft exists. Save remains disabled.
2. Record immutable identity and fingerprint the frozen stable stored-semantic ten-field projection: only under `scene_config`/`asset_config`/`content_config`, recursively omit `url` and `preview_expires_at` only on valid non-empty-`media_id` + `visibility === "private_draft"` objects; preserve every other field and public/ordinary URL. Record `updated_at` only as diagnostics.
3. Hydrate current V2 through `studioV2FromPresenceConfig`.
4. Advisory refetch uses the identical stable projection. Client equality is not atomic with current POST; post-refetch is verification only.
5. Wire-project candidates exactly as `JSON.parse(JSON.stringify(candidateInput))` after rejecting unsafe non-JSON values. Allowed-diff sees projected JSON. Nested object `undefined` is omitted; all ten comparison fields and all nine payload fields (after omitting only `schema_version`) are required post-serialization.
6. Disposable single-writer local/test characterization captures all-nine-field existing replacement, unsafe no-draft creation, owned deletion/unowned retention/public invariance, private-media stripping and exact assignment-status effects/no unexpected media rows, plus negative PATCH stale retention. It never enables Save.
7. Compile only visitor-visible V3 intent into `StudioV2State`.
8. Merge through `presenceConfigFromStudioV2State(compiledState, exactLatestMatchingConfig)` without removing unrelated fields or collection members.
9. Runtime Save requires a separately approved server operation that atomically locks/selects and checks expected existing-draft identity, revision, schema, and stable fingerprint before config/media mutation, never creates a draft, replaces all nine fields, and transactionally rolls back config/media effects on failure. No such implementation is authorised here.
10. After a future approved atomic replacement, refetch uses the same stable projection only to verify and re-scope metadata; it is not concurrency protection.
11. Never call `publishPresenceEditorDraft`, `rollbackPresenceEditor`, `publishNode`, `unpublishNode`, or any public update endpoint.

## Explicitly out of scope

- Backend, database, auth, tenant, owner-binding, or control-plane changes.
- Production feature flags or hosted activation.
- Any public route or public payload mutation.
- Publishing, rollback, unpublish, or production-data writes.
- A new renderer or copied/forked BBB renderer.
- Durable server persistence for V3 locks, named Looks, savepoints, or staging.
- Storing V3 metadata in `editable_config` or `locked_fields`.
- Work/Collection CRUD redesign.
- Generic multimedia schema migration.
- Arbitrary freeform layout or a Figma/Webflow/Canva clone.
- Normalised responsive placement; the prototype uses current pixel transforms.
- Full crop/focus, video/audio authoring, navigation redesign, entrance animation, or room transitions.
- Operator/debug tools in client UI.
- Claims that prototype Look polish is already market-ready.

## Likely implementation files

No file in this section is changed by this documentation pass.

### Existing files requiring narrow, reviewable edits

- `presence-app/app/(studio)/studio/[id]/editor/page.tsx`
- `presence-app/components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`
- `presence-app/components/presence-studio-v2/BbbVisionCanvasGallery.tsx`
- `presence-app/lib/presence/studio-v2/layouts.ts`
- `presence-app/components/presence-studio-v2/presence-studio-v2-public.css`

### Proposed new files

- `[PROPOSED] presence-app/components/presence-studio-v3/PresenceStudioV3Editor.tsx`
- `[PROPOSED] presence-app/components/presence-studio-v3/PresenceStudioV3Canvas.tsx`
- `[PROPOSED] presence-app/components/presence-studio-v3/StudioV3ActionBar.tsx`
- `[PROPOSED] presence-app/components/presence-studio-v3/StudioV3BottomSheet.tsx`
- `[PROPOSED] presence-app/components/presence-studio-v3/StudioV3PieceShelf.tsx`
- `[PROPOSED] presence-app/components/presence-studio-v3/StudioV3LookControls.tsx`
- `[PROPOSED] presence-app/components/presence-studio-v3/presence-studio-v3.css`
- `[PROPOSED] presence-app/lib/presence/studio-v3/feature.ts`
- `[PROPOSED] presence-app/lib/presence/studio-v3/model.ts`
- `[PROPOSED] presence-app/lib/presence/studio-v3/compiler.ts`
- `[PROPOSED] presence-app/lib/presence/studio-v3/sourceRefs.ts`
- `[PROPOSED] presence-app/lib/presence/studio-v3/contentAdapter.ts`
- `[PROPOSED] presence-app/lib/presence/studio-v3/looks.ts`
- `[PROPOSED] presence-app/lib/presence/studio-v3/localMetadata.ts`
- `[PROPOSED] presence-app/lib/presence/studio-v3/draft.ts`

## Prototype acceptance matrix

### Gate P0 — seam proof

| Proof | Pass condition |
| --- | --- |
| Gate isolation | Flag absent, production, and non-BBB all use current routes. Explicit local/test BBB flag alone enters V3. |
| Full-screen product surface | V3 branches before `StudioShell`; the live Presence is the primary surface, not a dashboard/inspector cockpit. |
| Exact live canvas | Every edit preview renders current `PresenceStudioV2PublicRoom` from current `publicRoomFromStudioV2State`. |
| Editor event precedence | Exact synchronous bridge contract passes stable-ID Piece pointer/touch/`Enter`/`Space`, no-ID CTA/link suppress-only, direct/Arrow destination-Room selection without navigation, Escape clear, unsupported-chrome suppression, pending-transition cancellation, and animation-time bridge recheck before `onFocusWork`. |
| Undefined bridge | With the bridge `undefined`, markup, focus order, and mouse/touch/keyboard/CTA/internal-navigation/artwork-focus behaviour are exactly unchanged. |
| Action bar and sheet | Selection opens a touch-friendly floating action bar; **More** opens a focus-managed sheet while the canvas remains visible. |
| Piece placement | One canonical Work can be placed into a Room and appears immediately. |
| Collection placement | One Collection expands in deterministic order, dedupes Pieces, and reports placed/shelved counts; incompatible content stays visible. |
| One visibly changed Look | At least one Look changes the same canvas obviously beyond a label or colour-only no-op. |
| Layer lock | One locked layer remains equal across a Look-state change. |
| Named Look | Owner can name, save, alter, and restore normalised editable values/recommendations without changing locks or placement/order. Media is retained only by an opaque stable owner-authorised asset identifier and is otherwise omitted. |
| Local-only safety | P0/P1 expose no draft-write or server-preview control. M1 Save also remains disabled under this plan; current endpoint characterization cannot enable it. |
| No forbidden local data | Local storage contains no URL/blob/base64/copied-media/private-draft media reference, full server payload, token, or secret. |
| No publish/public change | Source/network evidence shows no publish/rollback/unpublish/public update call; canonical and legacy-compatible BBB public fixtures remain byte-for-byte equivalent and payload hygiene passes. |
| Source privacy | Public payload/markup contains no raw `work:<id>`, `collection:<id>`, or `legacy-object:<id>` editor provenance. |
| Core responsive/accessibility | P0 works with mouse, touch, keyboard, 360px mobile, tablet, reduced motion, and acceptable contrast/focus. |

### Gate P1 — style proof

| Proof | Pass condition |
| --- | --- |
| Room Styles | Threshold Portal, Gallery Wall, and Film Strip / Selected Works are structurally and visually distinct on the bounded fixture. |
| Looks | Soft Editorial, Nocturnal Gallery, and Zine Archive visibly differ in atmosphere, presentation, treatment, density, and motion. |
| Savepoint/compare | A structural transformation creates a complete savepoint; before/after is truthful; cancel/restore returns placement/order/visibility/CTA/navigation/locks and included visual state exactly or reports unresolved references. |
| Independent aesthetic review | Independent reviewers judge every finished Look/Room-Style combination more original and resolved than the current BBB baseline across spatial concept, hierarchy, atmosphere/treatment, motion, and responsive continuity. Reused preset wiring alone fails. |
| Zero-write boundary | The request ledger contains no draft create/update, server-preview, publish, rollback, hosted, or public mutation request. Draft save/reload is a separate Milestone 1 gate. |

## Allowed and forbidden network surface

### Allowed for Gate P0 and Gate P1

- Owner-auth/session requests already used by `useOwnerNode`.
- Owner node read through current `getNode`.
- Editor overview/draft read through current `getPresenceEditor`/`getPresenceEditorDraft` as required.
- Canonical Work/Collection reads through current owner data/APIs.

P0/P1 permit reads only. Any draft create/update or server-preview request fails the gate.

### Milestone 1 persistence boundary (not part of prototype completion)

- Current `createPresenceEditorDraft`/`patchPresenceEditorDraft` are characterization-only and cannot enable Save.
- Save remains disabled until a separately approved server endpoint enforces expected-existing identity/revision/stable fingerprint atomically with all-nine-field replacement and transactionally rolled-back media effects; no backend work is authorised here.

### Forbidden

- `publishPresenceEditorDraft`
- `rollbackPresenceEditor`
- `publishNode`
- `unpublishNode`
- Any backend admin/control-plane route
- Any public node/config mutation
- Any hosted/prod setup or migration script

The proposed E2E test must abort immediately if a forbidden request is observed.

## Test plan

### Pure compiler tests

Proposed test:

- `[PROPOSED] presence-app/lib/presence/studio-v3/compiler.test.ts`

Cases:

1. Hydration preserves current V2 chamber/object identity as legacy source refs.
2. Room/Piece object identifiers are deterministic.
3. Compile is pure and idempotent.
4. Collection expansion is ordered and deduped.
5. Incompatible/missing Pieces remain in visible shelf results.
6. Look application preserves locked layers.
7. Named Look restore is deterministic for unchanged content and cannot change placement/order.
8. Structural savepoint restore returns all included structure/style references or reports unresolved sources.
9. Wire projection is exact JSON transport; allowed-diff sees projected JSON; the comparison retains ten fields and payload retains nine after omitting only `schema_version`; nested object `undefined` is omitted and top-level required `undefined` blocks.
10. Public projection omits browser-local metadata and raw source references.
11. Named Looks accept only validated opaque stable owner-authorised asset identifiers; URL, blob/base64, copied-media, expiring-preview, and private-draft references are rejected, and absent IDs cause media omission.
12. Malformed, URL-bearing named-Look, or blob-like local metadata is rejected.
13. Draft identity or canonical full-base fingerprint mismatch never hydrates stale metadata or writes a draft, even when `version`/`updated_at` match.
14. Stable projection fixtures prove regenerated qualifying private URL/expiry equality and changed media ID/visibility/stored field/public URL inequality; load/fresh/refetch share one projector.
15. Disposable endpoint characterization captures all nine fields, no-draft creation, private-media stripping, exact assignment-status effects/no unexpected media rows, owned deletion/unowned retention/public invariance; Save remains disabled.

### End-to-end tests

Proposed tests:

- `[PROPOSED] presence-app/tests/e2e/presence-studio-v3-bbb-prototype.spec.ts`
- `[PROPOSED] presence-app/tests/e2e/presence-studio-v3-public-invariance.spec.ts`
- `[PROPOSED] presence-app/tests/e2e/presence-studio-v3-mobile-accessibility.spec.ts`

Required current regression tests:

- `presence-app/tests/e2e/presence-studio-v2-bbbvision-pilot.spec.ts`
- `presence-app/tests/e2e/presence-studio-v2-bbbvision-generalisation.spec.ts`
- `presence-app/tests/e2e/presence-studio-v2-bbbvision-draft-write.spec.ts`
- `presence-app/tests/e2e/presence-studio-v2-layout-composition.spec.ts`
- `presence-app/tests/e2e/presence-studio-v2-public-render.spec.ts`
- `presence-app/tests/e2e/presence-public-payload-hygiene.spec.ts`
- `presence-app/tests/e2e/presence-studio-owner-experience.spec.ts`

The V3 E2E matrix must exercise the exact bridge contract: stable-ID Piece mouse/touch/`Enter`/`Space`; no-ID CTA/link suppress-only; direct and Arrow destination-Room selection without view/hash/history mutation; Escape clear; unsupported chrome suppress-only; pending focus cancellation; animation-time recheck before `onFocusWork`; focus-only arrival; deliberate **Open link**/**Test as visitor**; and complete unchanged behavior with bridge `undefined`.

Safe commands after implementation code exists:

- `npm run typecheck`
- `npm run build`
- `npm run test:e2e -- <target spec>` or the equivalent Playwright targeted invocation supported by the current script.

No hosted smoke, migration, publish-execution, or production-data test is part of this prototype.

## Public invariance proof

Before shared renderer edits:

1. Capture deterministic public payload and rendered output for `/p/bbbvision` and `/presence/bbbvision` using a controlled fixture.
2. Record that public call sites do not supply `[PROPOSED] PresenceStudioV2EditorBridge`.
3. Record current mouse, touch, keyboard, CTA/link, internal-navigation, focus-order, and BBB artwork-focus/gallery behaviour.

After implementation:

1. Repeat the same fixture with the V3 flag absent.
2. Compare payload and stable rendered output byte-for-byte, excluding only explicitly documented nondeterministic transport headers that are outside the rendered fixture.
3. Run current payload-hygiene and BBB public-render regressions.
4. Search the public result for V3 metadata keys, local-storage namespace, editor bridge attributes, locks, named Looks, savepoints, and owner data; all must be absent.
5. Repeat the complete interaction matrix with the editor bridge `undefined`; any handler, focus-order, navigation, or artwork-focus difference fails.
6. Current-endpoint characterization, if separately run on disposable local/test data, must prove published/public output unchanged; it does not enable V3 Save.

Any unexplained public difference fails the slice.

## Manual QA evidence

Capture only local/test evidence:

1. Flag-off BBB current editor.
2. Flag-on BBB first-frame full-screen V3 canvas.
3. Selected BBB Piece with floating action bar.
4. Expanded bottom sheet on desktop, tablet, and mobile.
5. Piece Shelf before and after placing one Work.
6. Collection placement summary showing placed, deduped, and incompatible/shelved outcomes.
7. P0: one visibly changed Look and one locked layer preserved across the change.
8. P0: named Look save, alteration, and restore, with asset-ID validation or explicit media omission.
9. P0: mouse, touch, `Enter`, and `Space` first-activation selection over CTA/link, internal navigation, and artwork focus; explicit **Open link** / **Test as visitor**; focus-only arrival.
10. P0: the same interaction matrix with the bridge `undefined`, showing unchanged visitor behaviour.
11. P1: Soft Editorial, Nocturnal Gallery, and Zine Archive on the same content.
12. P1: Threshold Portal, Gallery Wall, and Film Strip / Selected Works.
13. P1: structural before/after compare and exact cancel/restore evidence plus independent aesthetic review notes.
14. M1 characterization only: all-nine-field/no-draft/private-media/status/public-invariance evidence, explicitly labelled non-enabling; no runtime Save control.
15. Network trace showing zero forbidden calls; if writes remain disabled, the trace must show zero draft writes as well.
16. Canonical and legacy-compatible public BBB before/after comparison.
17. Keyboard focus order, touch targets, reduced-motion state, and narrow mobile safety.

No screenshot or evidence may expose tokens, raw auth, owner bindings, private payloads, or control-plane data.

## Stop conditions

Stop and split a follow-up task if any of these occurs:

- The exact visitor renderer cannot support optional selection without changing public output when undefined.
- Exact overview draft/published config is unavailable as a safe merge base.
- First activation cannot be made selection-first without also executing CTA/link, internal navigation, or artwork-focus behaviour.
- The frozen wire/stable-semantic projection cannot be applied identically at load/fresh/refetch, or a required payload field disappears during serialization.
- Any implementation proposes current POST/PATCH as V3 runtime Save, relies on post-refetch as concurrency protection, or lacks atomic pre-mutation expected-existing identity/revision/stable-fingerprint conflict and transactional media rollback.
- A proposed feature requires persisting V3 metadata into current `editable_config`.
- The implementation needs a backend, database, auth, serializer, or production flag change.
- Film Strip expands into a new renderer family or generic layout platform.
- A Piece cannot be placed without silently dropping incompatible content.
- Public BBB changes during disposable endpoint characterization.
- A test requires publishing or hosted production mutation.
- Current pixel transforms cannot meet mobile safety for the bounded BBB fixture; defer placement rather than inventing unreviewed responsive architecture.

If Film Strip fails its seam or safety gate, stop the slice and review Zine Board as the only named third-style fallback candidate. Do not silently replace Film Strip with Gallery Wall or begin a generic layout system.

## Rollback

1. Disable or remove the proposed local/test V3 flag.
2. BBB returns to the current V2 editor at the same URL.
3. Clear only the proposed browser-local namespace for the affected local/test browser.
4. Remove the optional bridge wiring if it causes any undefined-mode regression.
5. Remove the proposed Film Strip branch; the compiler reports/falls back to Gallery Wall rather than corrupting state. This is rollback behavior, not a passing substitute for the third-style proof.
6. Leave server drafts untouched unless a human explicitly approves the existing draft revert process.
7. No public rollback is required because the prototype never publishes.

## Prototype completion gates

Gate P0 is complete only when every P0 acceptance row passes, typecheck/build and targeted P0 regressions pass, public/undefined-bridge invariance and a zero-write/no-publish ledger are attached, a no-merge/security reviewer finds no metadata leak, and the default-off local/test BBB boundary remains intact. P0 cannot enable draft writes.

Gate P1 begins only after P0. It is complete only when every P1 acceptance row passes, including Film Strip / Selected Works, truthful structural savepoint/compare evidence, responsive checks, independent aesthetic review of all three Looks and all three Room Styles against the current BBB baseline, and a zero-write/no-publish ledger. P1 cannot enable draft writes.

Known limitations must state that browser-local metadata, loaded-placement-only provenance, and pixel placement are prototype constraints, not market architecture. Passing either gate authorises only a decision about the next implementation milestone. It does not authorise production activation, backend persistence, draft-write enablement without its separate contract proof, or publication.
