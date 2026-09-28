# ExecPlan: Presence Gate 2 V3.1 Owner Capability

## Objective

Allow an owner to shape real Presence content while keeping V3 controlled, honest, private/public safe, and unpublished until explicit publish readiness exists in later gates.

## Why now

Gate 1 is accepted after human smoke confirmed the stale private-state clear action works. The next product risk is owner capability: letting an owner shape real content without leaking placeholder/GGM material, corrupting private state, implying fake persistence, or changing public output before explicit publish.

## Current state

Target frontend: `C:\Dev\Flora_fauna\presence-app`.

Backend for owner APIs and persistence: `C:\Dev\Flora_fauna\flora-fauna\backend`.

Gate 2 was high-blast-radius implementation work. This ExecPlan now records the accepted local/dev owner-capability packet and its limits.

Gate 2 is accepted for local/dev owner capability as of 2026-07-28 after the auth-mock hardening closeout. The real local BBBVision owner-capability proof path passes, browser-readable owner-token mock support has been removed from normal client auth, and public output remained unchanged.

Gate 2 primary development target:

- BBBVision local/dev Presence: room id `29`, slug `bbbvision`, owner Studio path `/studio/29/editor`.
- BBBVision is now seeded into the real local contract backend through `C:\Dev\Flora_fauna\flora-fauna\backend\scripts\seed_presence_gate2_bbbvision_local.py`.
- Real local BBBVision seed state: room `29`, slug `bbbvision`, status `draft`, visibility `private`, public status `draft`, four canonical owner Works (`2901`-`2904`), two canonical Collections (`291`, `292`), and one draft editable config.
- The controlled Playwright/mock API harness remains useful for existing M1/M2 UI tests, but BBBVision no longer needs to be treated as mock-only for local owner-capability work.
- Local proof backend used for M1.5 browser evidence: `http://127.0.0.1:5015`, started with `PRESENCE_STUDIO_V3_BACKEND_ENABLED=1` and BBBVision allowlist values. The already-running backend on `http://localhost:5000` may still need restart with those flags before V3 private-state routes answer for room `29`.

Gate 2 control target:

- Room `1` / `presence-contract-room`, used for empty owner Works state, no fake content, public invariance, and fallback safety.
- M1.5 confirmed room `1` remains unchanged with zero owner Works and zero Collections.

Evidence standard:

- BBBVision proves real owner-content capability in the real local contract backend after Gate 2 M1.5.
- Room `1` proves empty-state honesty and non-enabled/control behaviour.
- BBBVision is approved as the primary local/dev Gate 2 owner-capability proof target. It is not public launch proof, not hosted launch proof, and not evidence that BBBVision is approved for public V3 launch.

### Current content model

- V3 Studio loads its base from `getPresenceEditor(nodeId, token)` in `components/presence-studio-v3/PresenceStudioV3Shell.tsx`.
- The canvas is hydrated from the selected editable config: draft first, otherwise published.
- `studioV2FromPresenceConfig()` converts the selected editable config into Studio V2 chambers and objects.
- `hydrateStudioV3Document()` converts those Studio V2 chambers into V3 Rooms and renderer-backed Room-native Pieces.
- The Piece shelf reads canonical owner Works through `listWorks(nodeId, token)` and canonical owner Collections through `listCollections(nodeId, token)`.
- Renderer-backed room material is any `legacy-object:<object-id>` generated from Studio V2/base config objects. It is room-native display material, not owner Works.
- Canonical owner Works are `work:<id>` source refs generated from `PresenceWork` rows.
- Canonical owner Collections are `collection:<id>` source refs generated from `PresenceCollection` rows; members are inferred from Works whose `collection_id` matches the Collection id.
- BBBVision local room `29` has four canonical owner Work rows (`2901`-`2904`) and two canonical owner Collection rows (`291`, `292`) in the real local contract backend after M1.5.
- BBBVision also has renderer-backed base material from its Studio V2 editable config, so Gate 2 must continue distinguishing owner Works/Collections from room-native display material.
- Local room `1` / `presence-contract-room` currently has `0` owner Works and `0` owner Collections in the local contract backend and remains the empty-state/control target.
- Room `1` visible pieces therefore come from the editable config's Studio V2/base objects, not from migrated owner Works.
- Rooms in V3 are currently derived from Studio V2 chambers and renderer layout/composition. They are not yet editable owner-owned Room records.
- True owner Works are missing for room `1`: the canonical owner Works table is empty, and there is no migration/import step that maps current renderer-backed base objects into owned Works.

### Current persistence model

- V3 `Save private state` saves only owner-private V3 metadata through `PUT /api/presence/owner/rooms/:roomId/editor/v3/state`.
- V3 private state is stored in the backend `presence_studio_v3_state` table.
- The saved metadata includes V3 private structural state such as mode, named Looks, layer locks, layer values, object edits, savepoints, placements, restore state, and compatibility rows.
- The saved metadata is bound to the exact editable-config base identity and fingerprint: room id, config id, source kind, status, version, revision, schema version, fingerprint, and metadata revision.
- `base_revision` is part of the stale-base guard. If the underlying draft/published config revision changes, the backend refuses silent replacement and returns a conflict.
- BBBVision real local room `29` supports V3 private state read/write only when the backend is started with `PRESENCE_STUDIO_V3_BACKEND_ENABLED=1` and pilot allowlist `29`/`bbbvision`. M1.5 proof backend returned 200 for owner Works, Collections, editor, and V3 private state routes while public `/api/presence/public/bbbvision` remained 404.
- Current stale-base handling preserves existing private state and blocks save. Gate 1 added blunt owner-only clear through `DELETE /api/presence/owner/rooms/:roomId/editor/v3/state`.
- The clear path deletes only owner-private V3 metadata. It is not a rebase, not publish, and not draft replacement.
- The backend also contains an atomic V3 draft replacement contract at `PUT /api/presence/owner/rooms/:roomId/editor/v3/draft`, but the UI deliberately keeps server visitor preview and draft replacement unavailable until separately approved.
- Safe Gate 2 rebase/clear would require explicit owner review of old base versus current base, source-reference availability checks, metadata category compatibility checks, conflict tests, and a no-public-mutation proof.
- Never silently overwrite private metadata, canonical owner Works, Collection membership, Room assignments, private media references, published config, or public routes.

### Current preview model

- `Test as visitor` uses the in-memory V3 document compiled to a Studio V2 public-room shape through `compileStudioV3Document()` and `publicRoomFromStudioV2State()`.
- `Test as visitor` does not read the public route and does not prove a saved draft preview.
- The local preview canvas reflects current client-side V3 state and can include unsaved owner-private metadata.
- Server Visitor Preview remains disabled in V3 as `Server preview deferred`.
- Backend `POST /api/presence/owner/rooms/:roomId/editor/preview` exists for the existing editor and returns a tokenized draft preview payload from current draft config, not from unsaved V3 private metadata unless the V3 compiled draft has first been safely written to the draft config.
- A truthful Gate 2 draft preview must state its source: in-memory private projection, saved private V3 metadata, or saved editable draft.
- Public visitor output remains unchanged until an explicit publish path is separately authorized and proven. Gate 2 must continue public route invariance checks.

### Current editing model

- Current V3 owner edits are mostly private/editor-level: object copy overrides, media choices from existing sources/private inventory, placement, ordering, visibility, feature state, Look choices, Room Style previews, locks, and savepoints.
- Persisted current V3 edits are persisted as owner-private V3 metadata only.
- Existing owner Works and Collections pages/API clients can create, patch, and delete canonical Works/Collections, but V3 Studio does not yet expose a coherent owner journey around those APIs.
- Existing owner Work/Collection APIs write canonical rows directly. They are not draft-only and should be treated as high risk for Gate 2.
- M1.5 investigation confirmed `PATCH /api/presence/owner/works/:workId` directly updates `PresenceWork`, and `PATCH /api/presence/owner/collections/:collectionId` directly updates `PresenceCollection`. These are canonical-row mutations, not draft/private-state saves.
- Existing owner Work delete is hard delete. Existing Collection delete detaches Works and hard deletes the Collection. This does not meet the Gate 2 reversible/archive expectation without a safer UX or backend change.
- Media association exists for owner content through `POST /api/presence/owner/nodes/:nodeId/media`, targeting `work_image` or `collection_cover`. It directly writes the Work or Collection media URL.
- V3 private upload exists only for protected owner-private inventory and remains disabled unless storage/migration capability is verified.
- UI labels already improved from `Review & publish` to `Review private state`, and server preview is explicitly deferred.
- Remaining UI risk: `Save private state` can be misunderstood as saving real owner content if Gate 2 introduces real Works/Collections beside private V3 metadata. Labels must distinguish "Save Studio choices" from "Save Work" or "Save Collection".

### Files likely involved

Frontend:

- `components/presence-studio-v3/PresenceStudioV3Shell.tsx`
- `components/presence-studio-v3/StudioV3PieceShelf.tsx`
- `components/presence-studio-v3/StudioV3PieceControls.tsx`
- `components/presence-studio-v3/StudioV3ArrangeControls.tsx`
- `components/presence-studio-v3/presence-studio-v3.css`
- `lib/api/owner.ts`
- `lib/api/editor.ts`
- `lib/api/studioV3.ts`
- `lib/api/types.ts`
- `lib/presence/studio-v3/compiler.ts`
- `lib/presence/studio-v3/model.ts`
- `lib/presence/studio-v3/p1State.ts`
- `tests/e2e/presence-studio-v3-bbb-prototype.spec.ts`
- `tests/e2e/presence-studio-v3-public-invariance.spec.ts`
- `tests/e2e/presence-studio-v3-mobile-accessibility.spec.ts`

Backend:

- `C:\Dev\Flora_fauna\flora-fauna\backend\app\api\presence_owner.py`
- `C:\Dev\Flora_fauna\flora-fauna\backend\app\api\presence_graph.py`
- `C:\Dev\Flora_fauna\flora-fauna\backend\app\services\presence_service.py`
- `C:\Dev\Flora_fauna\flora-fauna\backend\app\services\presence_editor_config.py`
- `C:\Dev\Flora_fauna\flora-fauna\backend\app\services\presence_studio_v3_state.py`
- `C:\Dev\Flora_fauna\flora-fauna\backend\tests\test_presence_nodes.py`
- `C:\Dev\Flora_fauna\flora-fauna\backend\tests\test_presence_studio_v3_backend_foundation.py`

## Non-goals

- No full Gate 2 implementation in one pass.
- No full Works/Collections/Rooms UI in one pass.
- No publish.
- No production or hosted data changes.
- No public renderer output changes.
- No payment, booking, enquiry, or support flows.
- No Gate 3 style registry.
- No canonical 10 Looks / 10 Room Styles.
- No Fable pass.
- No auth, tenant, or route-guard architecture changes.
- No broad redesign.

## Scope

### In scope

- Establish source truth for owner Works, Collections, and renderer-backed Room-native material.
- Use BBBVision as the primary local/dev owner-capability target for real Work/Piece editing evidence.
- Use room `1` for honest empty/import-needed states and public-invariance/control evidence.
- Allow a first real owner content operation only after source truth is accepted.
- Keep save/reload language precise about what is saved.
- Preserve public output until explicit publication in later gates.
- Capture desktop and mobile evidence for each milestone.
- Add focused tests for validation and failure states.

### Out of scope

- Public launch.
- Hosted deployment.
- New public renderer behavior.
- Publish/sync automation.
- Payments or execution flows.
- General style system architecture.

## Risks and blast radius

Risk: high for implementation, medium for this planning artifact.

Affected systems:

- Owner Studio V3 UI.
- Owner Works/Collections APIs.
- Private V3 state persistence.
- Editable draft config and preview semantics.
- Media upload/association.
- Public/private content boundary.

Specific risks:

- Wrong owner content appearing in the V3 Studio.
- Placeholder/GGM content leakage.
- Room-native renderer material being mistaken for canonical Works.
- Private state conflict after real owner content mutation changes base revision.
- Silent rebase corruption.
- Public/private drift between in-memory preview, private state, draft config, and public route.
- UI implying publish or public changes.
- Mobile editing becoming second-class.
- Draft preview lying about what visitors will see.
- Hard delete of owner Work/Collection data without reversible archive.

## Milestones

### Milestone 1 - Model and source truth

Goal:

Establish the correct source of truth for owner Works, Collections and Rooms.

Acceptance criteria:

- V3 no longer relies on misleading placeholder/GGM content.
- BBBVision and room `1` source mapping are documented in evidence.
- Missing owner Works produce an honest empty/import-needed state.
- Renderer-backed material is clearly distinguished from owner Works.
- Collection absence is explicit and uses Presence language.
- Rooms are described as current renderer Rooms/chambers, not fully owner-owned Room records.
- No public output changes.

Evidence:

- Source map document or evidence README.
- Desktop and mobile screenshots of BBBVision owner Works/Collections and room `1` empty/import-needed owner Works state.
- Public route invariance proof.
- Focused tests where possible for empty Works/Collections source state and labels.

### Milestone 1.5 - BBBVision local backend seed/connect

Goal:

Seed and connect BBBVision to the real local contract backend as the primary owner-capability proof target.

Status:

Complete on 2026-07-27.

Acceptance result:

- Room `29` / `bbbvision` exists in `presence_contract_local`.
- Room is `draft` / `private` / `public_status=draft`.
- Four canonical owner Works exist: `2901` Opening image, `2902` Portrait field, `2903` Stage image, `2904` Shadow image.
- Two canonical Collections exist: `291` Threshold Sequence and `292` Gallery Field.
- Work-to-Collection relationships are deterministic.
- One draft editable config exists; no published config was seeded.
- Seed is deterministic, idempotent, and marker-guarded.
- Reset is marker-guarded and was tested before final reseed.
- Room `1` remains the empty owner Works/Collections control.
- Real local public BBBVision API remains 404/unpublished.
- Browser proof captured desktop and mobile owner flow against the real local backend.

Evidence:

- `docs/program/evidence/presence-gate2-m15-bbbvision-local-seed-connect-20260727/`

Remaining restriction:

- Direct Work/Collection PATCH remains canonical-row mutation. Gate 2 M2 must use owner-private/draft-safe persistence or explicitly block save unless the human approves direct canonical mutation risk.

### Milestone 2 - First real Piece/Work edit

Goal:

Owner can edit one real Piece/Work field safely.

Status:

Complete on 2026-07-27 for first private-overlay proof.

Acceptance result:

- Real BBBVision Work `2901` / `work:2901` was selected from Owner Works.
- Field edited: private display title overlay.
- Saved through owner-private V3 metadata at `PUT /api/presence/owner/rooms/29/editor/v3/state`.
- Saved metadata used `object_edits` and referenced `sourceRef: work:2901`.
- Studio reload restored the private overlay.
- Local `Test as visitor` reflected the private overlay in the in-memory/private projection.
- Canonical Work row stayed unchanged: Work `2901` title remained `Opening image`.
- Public BBBVision API remained `404`; `/p/bbbvision` remained `404`; `/presence/bbbvision` did not contain the private title.
- Room `1` remained the empty owner Works control.
- No direct canonical Work PATCH/POST, draft replacement, publish, or public mutation was used.
- Mobile proof was captured at 390px viewport.

Evidence:

- `docs/program/evidence/presence-gate2-m2-first-real-work-edit-bbbvision-20260727/`

Acceptance criteria:

- Owner can edit at least one real Piece/Work field, preferably title or description.
- The operation is explicitly labelled as saving a Work, not publishing.
- Edit persists and reload behavior is proven, or the UI honestly blocks persistence.
- Validation errors are shown in owner language, not backend schema terms.
- First M2 implementation targets one safe BBBVision Work/Piece field in the local/dev harness.
- If M2 needs real contract-backend persistence instead of the existing BBBVision mock-harness private-state path, stop for a separate local BBB seed/connect decision.
- Public route remains unchanged unless the existing canonical public Work routes already reflect owner Work rows; this must be measured and documented before implementation.

Evidence:

- Backend API test for accepted and rejected Work edit.
- Browser proof: edit, save, reload.
- Public unchanged proof or explicit note if canonical Work routes are inherently public-visible and therefore unsuitable for Gate 2 first edit.
- Mobile screenshot of edit flow.

### Milestone 3 - Collection or Room assignment

Goal:

Owner can organise at least one Piece/Work into a Collection or Room.

Status:

Complete on 2026-07-27 for private Room placement/arrangement proof.

Acceptance result:

- Real BBBVision Work `2901` / `work:2901` was selected from Owner Works.
- Organisation type used: private Room/chamber/zone placement overlay, not canonical Collection membership.
- Private metadata saved `placements[]` for `sourceRef: work:2901`, `roomId: gallery`, `status: placed`.
- Private metadata saved `object_edits[]` for `sourceRef: work:2901`, `roomId: gallery`, `zoneId: main-wall`, `size: large`, and the M3 private title overlay.
- Saved through owner-private V3 metadata at `PUT /api/presence/owner/rooms/29/editor/v3/state`.
- Studio reload restored the private placement and arrangement.
- Local `Test as visitor` reflected the private overlay in the in-memory/private projection.
- Canonical Work rows stayed unchanged; Work `2901` title remained `Opening image` and collection id remained `291`.
- Canonical Collection rows stayed unchanged; Collections `291` and `292` were not patched and membership was not mutated.
- Public BBBVision API remained `404`; `/p/bbbvision` remained `404`; `/presence/bbbvision` did not contain the private title.
- Room `1` remained the empty owner Works control.
- No direct canonical Work PATCH/POST, Collection PATCH/POST, draft replacement, publish, or public mutation was used.
- Mobile proof was captured at 390px viewport.

Evidence:

- `docs/program/evidence/presence-gate2-m3-bbbvision-private-organisation-20260727/`

Remaining restriction:

- M3 does not prove Collection creation/editing or Collection membership. Collection organisation still needs either a safe private overlay model or separately approved canonical mutation with same-node ownership validation and reversible/archive handling.

Acceptance criteria:

- At least one Collection or Room assignment is real.
- Assignment survives reload or is honestly marked local-only.
- If using Collections, membership is stored through `PresenceWork.collection_id` only after validating same-node ownership.
- If using Room assignment, the plan states whether this is private V3 placement metadata or a real owner Room model.
- Preview reflects the draft/private state truthfully.
- Public output remains unchanged.

Evidence:

- Collection creation/edit or assignment proof.
- Room assignment/private placement proof.
- Reload proof.
- Failure-state test for cross-room or wrong-owner assignment.
- Mobile proof.

### Milestone 4 - Safe draft preview

Goal:

Owner can preview draft/private state without changing public visitor output.

Status:

Complete on 2026-07-27 for private preview source-truth proof.

Acceptance result:

- V3 top action now says `Private preview`, not `Test as visitor`.
- V3 preview mode displays a source/status panel.
- Source/status panel says the preview is local/private, uses unsent Studio changes, is not a public preview link, leaves the visitor site unchanged, and does not publish or change the public payload.
- Review sheet says server draft preview is deferred and current M4 preview is a local/private Studio projection.
- Disabled publish-shaped review control was removed; review now shows a public-route boundary note instead.
- Real BBBVision Work `2901` / `work:2901` used the M2 title overlay `Opening image - private M2 proof`.
- The same Work used M3 private Room placement/arrangement into Room `gallery`, zone `main-wall`, size `large`.
- Saved through owner-private V3 metadata at `PUT /api/presence/owner/rooms/29/editor/v3/state`.
- Editor was reopened in a fresh page and restored the private overlay from durable V3 state.
- Private preview reflected the title and Room placement overlay.
- Canonical Work rows stayed unchanged; Work `2901` title remained `Opening image` and collection id remained `291`.
- Canonical Collection rows stayed unchanged; Collections `291` and `292` were not patched and membership was not mutated.
- Public BBBVision API remained `404`; `/p/bbbvision` remained `404`; `/presence/bbbvision` did not contain the private title or placement marker.
- Room `1` remained isolated through the empty owner Works control and editor control check.
- No direct canonical Work PATCH/POST, Collection PATCH/POST, preview POST, draft replacement, publish, or public mutation was used.
- Mobile private preview source panel was captured at 390px viewport.

Evidence:

- `docs/program/evidence/presence-gate2-m4-safe-draft-private-preview-20260727/`

Remaining restriction:

- M4 does not implement server draft preview. It makes the current local/private projection explicit and testable.

Acceptance criteria:

- Preview source is explicit: in-memory private canvas, saved private V3 state, or saved editable draft.
- Preview does not read stale/wrong public data.
- Server preview is enabled only if V3 has safely written an existing draft through an approved atomic replacement contract.
- Public route invariance is proven.
- Mobile preview remains usable.

Evidence:

- Browser proof of preview mode and source label.
- Public route unchanged proof before and after preview.
- Test for preview denial or unavailable state when draft/private persistence is not safe.

### Milestone 5 - Persistence recovery

Goal:

Replace blunt stale-state clearing with a safer Gate 2 recovery path if feasible.

Status:

Accepted for the scoped local/dev BBBVision proof target on 2026-07-28 during the Gate 2 acceptance review.

Implementation finding:

- Compatible private V3 metadata can now be explicitly preserved from a stale base onto the latest base through an owner-only private-state rebase route.
- The owner must choose preservation; stale state is never silently rebased.
- Preservation uses strict V3 private metadata restore/normalisation and source ownership checks.
- Clear stale private Studio state remains available and explicit.
- M5 does not publish, does not enable server draft preview, and does not mutate canonical Works/Collections.

Evidence:

- `docs/program/evidence/presence-gate2-m5-persistence-recovery-rebase-20260727/`

Acceptance criteria:

- Base conflicts are resolved through explicit owner action.
- Compatible private metadata can be preserved where safe.
- Unsafe rebase requires clear/confirm.
- Backend tests cover stale-base conflict and recovery.
- Browser proof covers conflict and recovery.
- No silent overwrite of canonical Works, Collections, Room assignments, private media, draft config, or published config.

Evidence:

- Backend conflict/rebase/clear tests.
- Browser stale-base recovery screenshots.
- Persistence ledger showing write endpoints used.

### Milestone 6 - Private Collection curation overlay

Goal:

Owner can privately curate at least one real BBBVision Work into one real BBBVision Collection without canonical membership mutation.

Status:

Accepted on 2026-07-28 after real-backend BBBVision proof.

Implementation result:

- Real target semantics are Work `2901` / `work:2901` and Collection `292` / `collection:292`.
- Private Collection curation is represented as `placements[].collectionSourceRef`, not as a canonical Work or Collection row update.
- The Arrange sheet now exposes owner-facing `Private Collection curation` controls.
- The selected action bar shows the current private Collection curation.
- The private preview source panel reports active private Collection curation.
- Existing M2 title overlay and M3 Room placement overlay compose with the Collection curation overlay.
- Restore/rebase now treats missing Collection references as partial restore issues instead of silently accepting unavailable Collection overlays.
- No publish, public preview, canonical Work PATCH/POST, or canonical Collection PATCH/POST was added.
- Real-backend proof saved, reloaded, previewed, and preserved the private Collection curation overlay through compatible rebase.
- Real-backend proof confirmed canonical Work `2901` stayed canonically assigned to Collection `291`.
- Real-backend proof confirmed canonical Works and Collections stayed unchanged before and after the product UI flow.
- Real-backend proof confirmed public BBBVision API/routes stayed unpublished/non-public and room `1` stayed isolated.
- Real-backend product UI write ledger contained only private-state save and private-state rebase endpoints.

Evidence:

- `docs/program/evidence/presence-gate2-m6-bbbvision-private-collection-curation-20260727/`

Acceptance criteria:

- Owner can select real Work `2901`.
- Owner can select real Collection `292`.
- Private metadata saves `collectionSourceRef: collection:292` on the placement for `work:2901`.
- Reload restores the private Collection curation.
- Preserve-compatible rebase keeps the Collection overlay when Work and Collection references are current.
- Private preview truthfully shows the Collection curation source.
- Canonical Work `2901` remains canonically assigned to Collection `291`.
- Canonical Collection rows remain unchanged.
- Public BBBVision remains unpublished/non-public.
- Room `1` remains isolated.
- Mobile owner flow remains usable.

Remaining restriction:

- M6 is not full Collection editing, not canonical membership editing, not deletion/archive, and not a publish path.

## Tests and validation

Commands for frontend implementation slices:

```bash
cmd /c npm run typecheck
cmd /c npm run build
cmd /c npx tsx --test <focused test file>
cmd /c npm run test:e2e -- <focused Playwright spec>
```

There is currently no confirmed `npm test` script.

Backend commands when backend code changes:

```bash
python -m py_compile app\api\presence_owner.py app\api\presence_graph.py app\services\presence_service.py app\services\presence_editor_config.py app\services\presence_studio_v3_state.py
python -m pytest tests/test_presence_nodes.py::<focused_test> tests/test_presence_studio_v3_backend_foundation.py::<focused_test> -q
```

Manual QA required for implementation slices:

- Local editor route loads.
- Empty/import-needed states are legible.
- Create/edit/assign operation works or is honestly blocked.
- Save/reload behavior is proven.
- Preview source is truthful.
- Public route remains unchanged until publish.
- Mobile flow is usable.

Screenshots:

- Desktop owner flow.
- Mobile owner flow.
- Preview state.
- Public unchanged route.

## Rollback plan

- Revert only the Gate 2 slice files.
- If backend rows are created in local testing, delete or archive only test data with human confirmation.
- Do not alter production or hosted data.
- If Work/Collection APIs are used directly, record exact rows created/updated and rollback procedure in evidence.
- If V3 private state changes, clear only the local owner-private V3 row for the test room.
- Public publish rollback is out of scope because Gate 2 must not publish.

## Human decisions required

1. Resolved: BBBVision became the primary local/dev Gate 2 owner-capability target, and M1.5 seeded it into the real local contract backend.
2. Resolved: blunt Gate 1 clear-state remained a repair fallback; Gate 2 M5 added a scoped local/dev rebase path for compatible private overlays.
3. Resolved for Gate 2: placeholder/demo content was not used as owner capability proof; owner Works/Collections and renderer-backed base material are labelled separately.
4. Resolved for Gate 2: canonical BBBVision owner Works/Collections may exist in the local contract database seed only; accepted owner edits remain private overlays and do not directly mutate canonical rows.

2026-07-27 human decision: BBBVision is the primary Gate 2 owner-capability local/dev target. Room `1` remains the empty-state/public-invariance control. BBBVision evidence can prove real Gate 2 owner capability when it stays local/dev only and no public/hosted output changes without explicit approval.

## Stop conditions

- Correct owner Works source is unclear.
- BBBVision cannot be identified locally.
- BBBVision has no canonical owner-content target in either the approved local/dev harness or a separately approved local backend seed.
- Opening BBBVision V3 Studio requires hosted/prod data.
- Target selection would require auth/tenant changes.
- Safe draft/private persistence contract cannot be identified.
- Preview truth cannot be established.
- Any fix would require public renderer changes.
- Any fix would require auth/tenant architecture changes.
- Any task crosses into Gate 3 style registry or Gate 7 public execution.
- Existing owner Work/Collection hard-delete behavior would be exposed without a safer reversible/archive design or explicit human confirmation.

## Progress log

```text
2026-07-27 - Gate 2 ExecPlan created after Gate 1 human acceptance closeout. Local backend read confirmed room `1` has zero owner Works and zero Collections, draft config id `1` revision `3`, and no published config in the local contract DB.
2026-07-27 - M1 owner content source-truth slice implemented. V3 shelf now separates owner Works, owner Collections, and renderer-backed room/base material; zero-owner-library state is tested; no local seeding or backend mutation was performed. Evidence lives at `docs/program/evidence/presence-gate2-m1-owner-content-source-truth-20260727/`. Status: accepted as source-truth/control evidence after the later BBBVision real-backend proof and auth-mock hardening closeout.
2026-07-27 - Human switched Gate 2 target posture: BBBVision became the primary local/dev owner-capability target; room `1` is the empty-state/public-invariance control. Local inspection first found BBBVision as room `29` / slug `bbbvision` in the controlled e2e mock harness with four owner Work fixtures and two Collection fixtures; the later M1.5 slice seeded BBBVision into the real local contract backend.
2026-07-27 - M1.5 seeded and connected BBBVision to the real local contract backend as room `29` / slug `bbbvision`, with four canonical owner Works, two Collections, one draft editable config, and public BBBVision remaining unpublished/404.
2026-07-27 - M2 accepted first real BBBVision Work edit through private V3 `object_edits` metadata for `work:2901`, with reload, local Test as visitor, canonical Work non-mutation, public unchanged, room `1` control, and mobile proof.
2026-07-27 - M3 accepted first real BBBVision organisation proof through private V3 `placements` plus `object_edits` metadata for `work:2901` in Room `gallery` / zone `main-wall`, with reload, local Test as visitor, canonical Work/Collection non-mutation, public unchanged, room `1` control, and mobile proof.
2026-07-27 - M4 accepted private preview source truth: V3 preview is labelled as local/private, source/status language is visible, review states server draft preview is deferred, no publish-shaped review control remains, private preview reflects M2/M3 overlays, canonical rows and public routes remain unchanged, room `1` remains isolated, and mobile proof is captured.
2026-07-27 - M6 private Collection curation overlay implemented and mock-proven: Work `2901` can be privately curated into Collection `292` via `placements[].collectionSourceRef`, M2 title and M3 placement overlays compose, private preview reports the curation, compatible rebase preserves it, missing Collection restore is partial, and no canonical Work/Collection mutation or publish path was added.
2026-07-28 - M6 accepted after real-backend BBBVision proof: private Collection curation saved, reloaded, previewed, and rebased through owner-private V3 state; canonical Works/Collections stayed unchanged; public BBBVision stayed unpublished/non-public; room `1` stayed isolated; local owner token was loaded without being printed or recorded.
2026-07-28 - Gate 2 acceptance/hardening review found one remaining auth-mock blocker after M1.5-M6 real-backend proofs passed. Backend private-state validation rejected unknown current-base legacy source refs; preview copy no longer claimed route state; protected placement actions used real disabled controls. The next closeout hardened the browser-readable E2E owner-token path.
2026-07-28 - Gate 2 auth-mock hardening closeout accepted Gate 2 for local/dev owner capability: `NEXT_PUBLIC_E2E_AUTH_TOKEN` is no longer read by runtime client auth, the mock cannot mint a fallback owner token, focused auth specs passed, and M1.5-M6 real-backend proofs passed again with public output unchanged.
```

## Final review checklist

- [x] Local owner-capability acceptance criteria product proof met.
- [x] Tests run.
- [x] Browser proof completed through Playwright.
- [x] Screenshots captured.
- [x] Proof evidence updated.
- [x] No unrelated feature scope.
- [x] No auth boundary changed without approval.
- [x] Gate 2 fully accepted after auth-mock hardening closeout.
