# Presence Studio V3 Content Architecture

**Status:** Normative client model, ownership, placement, and lifecycle contract
**Product boundary:** [Product specification](./STUDIO_V3_PRODUCT_SPEC.md)
**Interaction behavior:** [Interaction model](./STUDIO_V3_INTERACTION_MODEL.md)
**Compiler details:** [View model and compiler](./STUDIO_V3_VIEW_MODEL_AND_COMPILER.md)

## 1. Purpose

This document makes Works, Collections, Rooms, and placed Pieces one understandable product system without pretending that Studio V2 already stores them that way.

The central rule is:

> Works and Collections are canonical owner-library records. A Piece in a Room is a placed, compiled snapshot with its own placement identity and an explicit source reference when it comes from Library.

This separation is the product model for adding or editing content once and using it in multiple places, while removing a placement without accidentally deleting the source Work. In the prototype, “edit once, see it everywhere” is limited to currently loaded placements whose matching source identity is proven by the browser-local provenance envelope. Durable cross-reload, cross-device, impact-accounting, and deletion guarantees require server-side placement identity and source provenance before market release. The separation also lets the existing V2 renderer continue consuming safe object snapshots.

## 2. Client vocabulary

### 2.1 Presence

The complete visitor experience owned by one Presence owner. It contains global Look defaults, ordered Rooms, navigation metadata, draft state, and links to canonical Library content.

### 2.2 Room

A spatial presentation of Pieces and/or Collections. In the first implementation adapter, one Room maps to one V2 chamber. The client UI never exposes the term chamber or its internal identifiers.

A Room owns:

- stable V3 Room identity;
- title and optional description;
- order and entry status;
- Room Style and Room-scoped customisation overrides;
- ordered Piece placements;
- Collection placements/presentation references;
- navigation relationship metadata;
- required-action status.

### 2.3 Work

A canonical Library item. A Work is flexible multimedia content and is not limited to visual art.

Supported product meanings include:

- image;
- video;
- audio;
- writing;
- project;
- product;
- service;
- proof;
- event;
- memory;
- release;
- moment;
- archive item.

The UI may adapt singular/plural labels to the Presence type, but the stored product concept remains Work and must not box a client into one medium.

### 2.4 Piece

A Piece is an instance arranged in a Room. It has placement identity distinct from its source identity, so the same Work can be placed independently in different Rooms. The prototype emits one terminal placement per source reference per Room; duplicate Collection sources in the same Room resolve deterministically to that placement rather than creating accidental duplicates.

A library-backed Piece contains:

- `placementId` — stable identity for this Room placement;
- `sourceRef` — explicit Work reference using the prototype grammar `work:<id>`;
- resolved content snapshot used by the compiler;
- Room and zone/order placement;
- Piece-scoped treatment, visibility, motion, crop/focus, and other supported overrides;
- inheritance metadata and locks.

Existing V2 Room-native content, such as a statement or required CTA, uses `legacy-object:<id>` when it cannot be matched confidently to a canonical Work. It never receives a fabricated Work ID. A future authored-content source kind requires a separate reviewed extension; the prototype source grammar is limited to `work:<id>`, `collection:<id>`, and `legacy-object:<id>`.

### 2.5 Collection

A canonical Library record representing an ordered curated set of Work references. A Collection is a story world or set that can be presented as a gallery, archive, sequence, proof wall, drop, slideshow, or other registered Collection Presentation.

A Collection does not become a Room merely because it exists. The owner explicitly places it into a Room or chooses a supported **Create Room from Collection** action in a later reviewed slice.

### 2.6 Look

An editable customisation configuration. Looks do not own Work media and do not duplicate content. See [Customisation model](./STUDIO_V3_CUSTOMISATION_MODEL.md).

## 3. Ownership and relationship model

```text
Presence
├── Presence Look defaults
├── ordered Room references
└── Rooms
    ├── Room Style and overrides
    ├── Piece placements ── sourceRef ──> canonical Work
    └── Collection placements ─────────> canonical Collection
                                      └── ordered Work references

Library
├── canonical Works and media references
└── canonical Collections and ordered memberships
```

The V3 view model resolves the graph into renderer-ready snapshots. The V2 compiler sees safe room/object content, not live backend records or editor-only metadata. Public projection must not expose source references, Library identity, locks, save points, or private content.

## 4. Canonical records

### 4.1 Minimum Work fields

Every Work supports the following product-level minimum:

| Field | Requirement | Notes |
| --- | --- | --- |
| Title | Required | Human-readable; fallback labels are draft-only |
| Date | Optional but supported | General date or display date; not limited to a four-digit art year |
| Description | Optional | Plain/rich-safe content according to existing sanitisation rules |
| Media | Required for media-led types; optional for writing/service/proof | References approved owner media; never embeds secrets |
| Media type | Required | Image, video, audio, writing, project, product, service, proof, event, memory, release, moment, archive item, or approved extension |

Existing owner records currently expose title, year, medium, description, image/gallery URLs, external link, availability, price, exhibition history, sort order, visibility, and `collection_id`. V3 must adapt these honestly rather than claiming the complete flexible media model already exists.

Additional supported fields may include caption, alt text, thumbnail/poster, external action, duration, medium, dimensions, availability, price, credits, and accessibility transcript. New persistence fields require a separate reviewed schema task.

### 4.2 Work visibility

Library visibility and Piece placement visibility are distinct:

- Library visibility controls whether the Work may be used in public projection by default.
- Piece visibility controls one placement.
- A private/non-public canonical Work cannot be made public merely by changing a Piece toggle.
- A public Work may have both visible and hidden Piece placements.

The compiler applies the most restrictive applicable visibility and sanitisation rule.

### 4.3 Minimum Collection fields

| Field | Requirement |
| --- | --- |
| Title | Required |
| Description | Optional |
| Cover/media reference | Optional |
| Ordered Work references | Required, may be empty while drafting |
| Visibility | Required |
| Default Collection Presentation | Optional, inherited when absent |

The current backend exposes a Collection record and `Work.collection_id`, but current owner UI does not provide the V3 ordered membership experience. The V3 prototype may model ordered membership in local/test state; it must not imply durable support until an approved persistence adapter exists.

## 5. Placement records and snapshots

### 5.1 Why a snapshot exists

The existing V2 compiler and renderer consume embedded object content. V3 therefore materialises the current canonical Work into a renderer-safe Piece snapshot while retaining `sourceRef` in editor-only metadata.

The snapshot:

- gives the renderer a stable draft payload;
- survives temporary Library read failure;
- records exactly what the draft preview used;
- contains only public-safe fields eligible for projection;
- is not a new canonical Work and must not be edited as if it were one.

### 5.2 Required Piece placement fields

The conceptual V3 placement contract is:

```ts
type PiecePlacement = {
  placementId: string;
  sourceRef: `work:${number}` | `legacy-object:${string}`;
  roomId: string;
  collectionContext?: { sourceRef: `collection:${number}`; memberOrder: number };
  contentSnapshot: ResolvedPieceContent;
  zoneId: string;
  order: number;
  size: RegisteredPieceSize;
  visibility: PieceVisibility;
  treatmentOverride?: PieceTreatmentOverride;
  cropFocusOverride?: CropFocusOverride;
  motionOverride?: PieceMotionOverride;
  depth?: number;
  sourceStatus: "current" | "updated" | "missing" | "unavailable";
};
```

This is a product contract, not a claim that the type or durable fields already exist. The exact implementation belongs in [View model and compiler](./STUDIO_V3_VIEW_MODEL_AND_COMPILER.md).

### 5.3 Source refresh policy

Canonical content fields resolve from the Work; placement/presentation fields resolve from the Piece.

When a canonical Work is edited:

1. only loaded Pieces whose browser-local provenance has the same Presence/Room base and exact matching `sourceRef` are marked `updated`;
2. title, date, description, media, media type, and other non-overridden canonical fields re-resolve immediately in the draft canvas;
3. placement, Room, crop/focus, treatment, motion, visibility, and depth overrides remain unchanged;
4. the next draft compile materialises refreshed safe snapshots;
5. if refresh fails, the last valid snapshot stays visible with **Needs attention** status; no Piece disappears silently.

The owner should experience “edit once, see it everywhere” across those proven loaded placements while retaining placement-specific art direction. The prototype must not claim a durable global refresh: unmatched, stale, unloaded, or provenance-free placements remain unchanged and visibly require reconciliation. Durable server-side placement identity plus source provenance is a pre-market gate for the unrestricted promise.

### 5.4 Missing source policy

If a source Work is missing or no longer readable:

- keep the last safe snapshot in draft state;
- mark every placement **Needs attention**;
- block publishing through future integration until the owner replaces, removes, or explicitly resolves it;
- never fall back to raw/private source data;
- never silently delete the Piece.

The gated prototype does not publish, but must still show the state honestly.

### 5.5 Named Looks and structural save points

These metadata types have deliberately different content responsibilities:

- A **named Look** stores normalised editable layer values and recommendations plus provenance. It may retain a media choice only as an opaque, stable asset identifier validated against the current owner's authorised asset list. It never stores a URL, blob/base64 value, copied media, or private-draft reference. If no stable authorised asset identifier exists, the prototype omits that media choice and leaves destination media unchanged on restore. It stores neither lock state nor Piece placements/order and does not duplicate Works or Collections.
- A **structural save point** stores the Room/style references, Collection Presentation, Piece placement/order, visibility, CTA, navigation, and lock metadata needed to reverse a structural transformation exactly. It references canonical Works and media; it does not copy them.

BBB → another identity → BBB exact return uses the pre-transformation structural save point. Restoring a named Look alone must never claim to restore Piece placement/order.

## 6. Collection membership and placement

### 6.1 Membership

Collection membership is an ordered reference relationship, not content duplication.

The owner can:

- add an existing Work to a Collection;
- create a Work and add it once saved;
- remove a Work from a Collection without deleting it;
- reorder members;
- use the same Work in multiple Collections if the eventual durable model permits it.

The existing single `collection_id` field may constrain multi-Collection membership. The first implementation must either respect that constraint explicitly or keep multi-membership local/test-only; it must not add unreviewed backend schema.

### 6.2 Collection placement identity

Placing a Collection creates:

- one Collection placement identity;
- reference to the canonical Collection;
- selected/inherited Collection Presentation;
- deterministic member-derived Piece placement identities;
- member order and fit result;
- Collection-scoped overrides and lock state.

Derived member placements still carry explicit `work:<id>` references. Removing the Collection placement removes those derived placements from that Room only.

### 6.3 Collection updates after placement

- Reordering canonical membership re-resolves order in Collection-derived placements.
- Adding a member marks placements as having one available update; the owner sees the proposed fit before structural Apply when layout could change.
- Removing membership removes the member from Collection-derived placements after an explicit impact summary, but does not affect independent placements of that Work.
- Piece-specific overrides tied to a removed member placement remain in reversible draft history/save-point metadata until history retention expires; they are not applied to another Work.

### 6.4 Placement fit

When placing or transforming a Collection:

1. resolve compatible member types against Room Style zones;
2. preserve Collection order;
3. fill deterministic eligible zones up to capacity;
4. show compatible and incompatible counts before Apply;
5. place accepted members;
6. return remaining members visibly to **Unplaced after change**;
7. never hide, discard, or reorder incompatible members without explanation.

## 7. Piece Shelf and Library responsibilities

### 7.1 Piece Shelf

The shelf supports in-editor discovery and placement:

- browse/search/filter Works;
- browse Collections and member counts;
- identify placed/available/attention state;
- place a Piece or Collection;
- inspect current Room placements;
- remove a placement from the Room;
- send the owner to the canonical Library edit flow.

### 7.2 Library

Library owns canonical administration:

- create and edit a Work;
- upload/replace approved media;
- manage required Work fields;
- create/edit a Collection;
- add/remove/reorder Collection members;
- manage Library visibility;
- permanently delete a Work or Collection after impact confirmation.

The prototype may use existing owner Works/Collections reads and local/test membership/placement state. It must not duplicate records into a V3-only hidden library.

## 8. Operation semantics

### 8.1 Remove from Room

- Deletes one placement from the active Room draft.
- Does not delete or hide the canonical Work.
- Does not remove Collection membership.
- If the Piece is the required CTA, removal is blocked until a valid replacement exists.
- Is undoable and included in structural save points.

### 8.2 Remove from Collection

- Deletes one membership reference.
- Does not delete the Work.
- Does not delete independent Room placements.
- Shows which Collection-derived Room presentations will change.
- Preserves deterministic restore information in the current draft/save point.

### 8.3 Delete Work permanently

Permanent deletion is available only from Library. Confirmation must show:

- Work title and media summary;
- number and names of Collections containing it;
- number and names of Rooms containing independent or derived placements;
- whether it supplies a required CTA or protected entry experience;
- that deletion is permanent and different from removal.

Deletion may proceed only when the owner-authorized content/placement index can account for every affected Collection and Room. An unmapped `legacy-object:<id>`, unavailable Room, stale source reference, or incomplete placement provenance blocks deletion and offers a cleanup/mapping path; the prototype must never guess that the impact list is complete.

Deletion cannot proceed while it is the only required CTA source or a protected required entry element. The owner must replace those roles first.

After approved deletion, all affected placements are resolved explicitly according to the confirmed plan; they are never silently left as broken public content. The prototype must not implement permanent deletion from the canvas or shelf.

Studio V3 must keep every permanent deletion write disabled until durable source/placement identity, a complete owner-authorised impact index, and the endpoint's full replacement/deletion semantics are proven together. A plausible-looking confirmation list is not sufficient proof.

### 8.4 Delete Collection permanently

- Available only from Library with placement impact confirmation.
- Deletes the Collection record and its memberships, not member Works.
- Requires removal or conversion of all Collection placements.
- Does not affect independent Piece placements sourced from member Works.

### 8.5 Remove or delete Room

The prototype does not delete Rooms. Later V3.0 behavior must:

- block deletion of the final Room;
- block entry Room deletion until another valid Room becomes entry;
- list all contained placements;
- offer moving Pieces to another Room or returning them to the shelf;
- preserve canonical Works and Collections;
- stage navigation changes through preview/apply.

## 9. Required CTA and entry protections

### 9.1 Required CTA

The Presence must retain at least one valid, visible, reachable required CTA where product configuration requires it.

A CTA is valid only when:

- its label is non-empty and readable;
- its destination passes allowed destination validation;
- its contrast and hit target pass guardrails;
- it is public-eligible;
- its Room/zone remains visitor-reachable.

Hiding, removing, deleting its source, or transforming it into an incompatible Room Style is blocked until a replacement is designated and validated.

### 9.2 Entry Room

Exactly one Room is the visitor entry Room in the first-slice model. Changing entry is structural and uses preview/apply. The current entry Room cannot be removed before another valid entry is selected.

### 9.3 Final Room

A Presence cannot have zero Rooms. The final remaining Room cannot be deleted. Emptying its optional Pieces is allowed only if required entry and CTA rules still pass.

## 10. Media model and limits

- Library media remains referenced, not copied into each Piece. A named Look may retain only an opaque stable owner-authorised asset identifier and otherwise omits media.
- Piece crop/focus and treatment are non-destructive metadata.
- Upload limits, accepted formats, transcoding/compression, alt text, poster frames, and private/public eligibility remain governed by the approved media service and security rules.
- The V3 prototype must not introduce direct arbitrary URLs, base64 payloads, code embeds, or a parallel uploader.
- Video backgrounds require an approved compressed asset, poster/fallback, mute/default behavior, and reduced-motion treatment before production use.
- Missing or unloaded assets surface as **Needs attention** and cannot disappear silently.

## 11. Compilation boundary

The content pipeline is:

```text
canonical owner Library records
        +
V3 Rooms, placements, memberships, overrides, locks
        ↓ resolve and validate
renderer-safe Piece snapshots and registered compositions
        ↓ existing adapter/compiler boundary
V2-compatible in-memory configuration
        ↓ existing sanitised projection
bridge-free Test as visitor / unchanged public renderer

server Visitor Preview remains blocked pending atomic draft persistence
```

The V3 layer must not:

- write canonical Work edits through V2 object mutation;
- treat a V2 object ID as a canonical Work ID;
- expose editor-only source refs or metadata to public output;
- create a second public projection;
- bypass existing visibility/sanitisation rules;
- write hosted or public state during the prototype.

Prototype-only locks, named Looks, structural save points, staging, compare state, and source provenance remain browser-local. They are never POSTed wholesale into current `editable_config` or `locked_fields`. Local M1 content editing may continue against the in-memory compiler boundary, but runtime Save and server Visitor Preview stay disabled.

Stable base comparison uses a persisted-semantic fingerprint projection over the ten editable config fields. It recursively removes only owner-GET transport-added `url` and `preview_expires_at`, and only on valid objects whose `visibility` is `private_draft` and whose `media_id` is valid, within `scene_config`, `asset_config`, or `content_config`. It does not strip URLs generically: ordinary/public URLs and every other field remain authoritative. `updated_at` remains diagnostic only.

The logical ten-field candidate is projected to the nine-field POST wire shape using actual JSON serialization semantics. After serialization and parse, all nine top-level POST fields must remain present; an `undefined` value that disappears on the wire is a missing field and fails characterization. Current recursive-merge `PATCH` remains forbidden.

The current client refetch followed by current full-config `POST` is not atomic, the POST helper may create a draft, and a post-POST refetch is verification only after mutation has already occurred. A disposable local/test, single-writer fixture may characterize full replacement/deletion, unowned retention, public invariance, and private-media assignment/orphaning side effects, but passing that fixture can never enable product Save.

Runtime M1 Save and server Visitor Preview require a separately approved server operation that checks the expected existing-draft identity, revision, and stable persisted-semantic fingerprint and replaces that exact draft in one transaction. Absent or mismatched draft state must return conflict with zero configuration or media mutation; media assignment/orphaning effects must participate in the same transaction. No backend change is authorised by this specification task, so persistence remains a blocked M1 subgate.

## 12. Deferred persistence cleanup

The following decisions require a later backend/schema review before market launch:

1. durable storage for Piece `sourceRef`, placement identity, source status, and V3-only overrides; this is a pre-market gate for cross-reload refresh, complete impact accounting, and deletion;
2. durable ordered multi-Collection membership versus the current `Work.collection_id` constraint;
3. general date and flexible media-type fields beyond existing year/medium/image-oriented records;
4. non-destructive crop/focus, text/CTA size, treatment/filter, and media-poster metadata;
5. durable Room identity and V3 terminology independent of V2 chamber storage;
6. named Look/save-point persistence and retention;
7. stale-source reconciliation and publish-readiness blocking;
8. transactional handling of permanent deletion across placements and Collections;
9. a separately approved atomic expected-existing-draft identity/revision/stable-fingerprint precondition-and-replacement operation with transactional media side effects for M1 Save and server Visitor Preview.

Until approved, prototype-only data remains default-off, local/test, BBB-scoped, and unable to publish.

## 13. Content acceptance criteria

- **CA-001:** A Work is created once in Library and can produce a Piece in a Room without duplicating the canonical Work.
- **CA-002:** Every library-backed Piece carries an explicit Work source reference distinct from its placement identity.
- **CA-003:** Editing a Work refreshes canonical content only across loaded placements with matching browser-local source provenance while retaining placement-specific overrides; unmatched/unloaded placements are not claimed as refreshed.
- **CA-004:** The same Work can have independent placement, visibility, crop/treatment, and order in different Rooms where supported.
- **CA-005:** Removing a Piece from a Room leaves its Work and Collection memberships intact.
- **CA-006:** Removing a Work from a Collection leaves the Work and independent Room placements intact.
- **CA-007:** Permanent Work deletion is accessible only from Library, names all affected Rooms and Collections before confirmation, and is blocked when impact accounting is incomplete.
- **CA-008:** Placing a Collection preserves member order, reports capacity/incompatibility, and never silently drops a member.
- **CA-009:** A missing/unavailable source retains its last safe draft snapshot and visible attention state.
- **CA-010:** Public projection includes only validated snapshot content and contains no source refs, locks, save points, or Library metadata.
- **CA-011:** The entry Room, final Room, and required CTA cannot be removed through any owner interaction without satisfying replacement rules.
- **CA-012:** Named Looks contain normalised layer values/recommendations and provenance, retain media only through opaque stable owner-authorised asset identifiers, contain no URL/blob/copied-media/private-draft reference or lock state, omit media when no safe identifier exists, and never capture Piece placements/order.
- **CA-013:** The Piece Shelf and Library present one coherent inventory, not separate V2 and V3 content databases.
- **CA-014:** The prototype writes no backend schema, hosted content, publication state, or public BBB output.
- **CA-015:** Structural save points reference, rather than duplicate, canonical content and contain the placement/order, visibility, CTA, navigation, Room/style, Collection Presentation, and lock metadata needed for exact transformation restore.
- **CA-016:** Prototype V3 metadata remains browser-local and never enters current `editable_config` or `locked_fields` wholesale. Local M1 content editing may proceed, but runtime Save and server Visitor Preview remain disabled until the separately approved atomic persistence contract passes.
- **CA-017:** Durable server-side placement/source identity is a pre-market gate; no permanent deletion write or unrestricted “edit once, see it everywhere” claim is permitted before it exists and complete impact accounting is proven.
- **CA-018:** Stable comparison removes only transport-added `url` and `preview_expires_at` from valid `private_draft`/`media_id` objects in `scene_config`, `asset_config`, or `content_config`; ordinary/public URLs and all other fields remain authoritative. All nine POST fields must survive actual JSON serialization. Current refetch plus POST is non-atomic and may create a draft, so its disposable single-writer fixture and post-refetch are characterization/verification only. A Studio V3 draft write requires a separately approved atomic expected-existing-draft identity/revision/stable-fingerprint check-and-replace transaction with conflict-with-zero-mutation semantics and transactional media effects; this docs task authorises no backend change.

## 14. Explicit non-goals

- converting every embedded legacy V2 object into a canonical Work during the prototype;
- general-purpose digital asset management;
- arbitrary HTML, script, embed, or code content;
- an unreviewed multi-Collection database migration;
- destructive editing of original media;
- permanent deletion from the live canvas;
- automatic Collection-to-Room conversion without owner preview;
- publishing stale, missing, private, or incompatible source content.
