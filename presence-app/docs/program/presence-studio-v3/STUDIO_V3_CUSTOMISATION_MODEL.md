# Presence Studio V3 Customisation Model

**Status:** Normative customisation, inheritance, lock, preset, and restore contract
**Product scope:** [Product specification](./STUDIO_V3_PRODUCT_SPEC.md)
**Interaction behavior:** [Interaction model](./STUDIO_V3_INTERACTION_MODEL.md)
**Content scopes:** [Content architecture](./STUDIO_V3_CONTENT_ARCHITECTURE.md)
**Compiler mapping:** [View model and compiler](./STUDIO_V3_VIEW_MODEL_AND_COMPILER.md)

## 1. Purpose

Studio V3 customisation must create visibly different identities while remaining understandable, reversible, responsive, and compatible with the existing V2 renderer/compiler boundary.

The model separates:

- **layers** — what kind of experience is being customised;
- **scopes** — where a value is defined or overridden;
- **Looks** — editable bundles that propose values across layers;
- **locks** — explicit instructions that protect a layer at a scope from future preset changes;
- **save points** — reversible state metadata created before structural transformation.

This separation prevents a Look from being a disguised colour theme and prevents one preset change from erasing deliberate Room or Piece art direction.

## 2. Six customisation layers

These six layers are the complete V3.0 client-facing model.

### 2.1 Presence Look

The overall identity language of the Presence. It may provide:

- colour and contrast roles;
- typography roles and scale rhythm;
- surface/background defaults;
- density and spacing character;
- global frame, shadow, radius, and signal treatment;
- default Room Style recommendations;
- default motion and journey character.

Presence Look is not a single V2 skin object. The compiler maps supported values into current V2 world, skin, public style, and presentation fields while retaining unsupported V3 metadata only within the gated V3 state.

### 2.2 Room Style

The spatial grammar of one Room:

- registered composition and zones;
- density and pacing;
- feature hierarchy;
- compatible Piece types and capacities;
- responsive/mobile behavior;
- default Collection Presentation;
- permitted direct manipulation and depth behavior.

Room Style is structural. Changing it always uses preview/apply.

### 2.3 Collection Presentation

How an ordered Collection appears within a Room:

- wall/grid;
- focused sequence;
- strip/carousel;
- archive/list;
- clustered board when registered;
- labels, progress, and navigation within the set;
- capacity and overflow behavior.

Collection Presentation never changes canonical Collection membership or Work content by itself. It is structural and uses preview/apply.

### 2.4 Piece Treatment

How an individual Piece is framed:

- size role and feature state;
- crop and focal point;
- image filter/treatment;
- frame, border, caption, and shadow;
- typography/text role;
- CTA style;
- local depth/layer where supported.

Supported treatment changes are instant on the draft canvas. Structural relocation triggered by feature/size changes follows the registered placement rules and may require confirmation when another Piece is displaced.

### 2.5 Motion / Atmosphere

The living quality of the Presence:

- motion intensity;
- ambient texture/grain;
- parallax/depth cues where supported;
- Piece entrance/idle behavior from registered options;
- background image/video and fallback treatment;
- reduced-motion resolution.

Motion intensity, background, and registered atmosphere values are instant on the draft canvas. Room transitions and authored entrance timelines are deferred to V3.1.

### 2.6 Navigation / Journey

How visitors move through the Presence:

- entry Room;
- Room order and onward paths;
- index/sequence behavior;
- CTA destination and journey role;
- Collection progress/navigation pattern;
- future registered Room transitions.

Navigation changes are structural, protected, and use preview/apply.

## 3. Scope model and precedence

Layers describe **what** changes. Scopes describe **where** a value applies.

The supported resolution order is:

> **Piece → Collection → Room → Presence**

The first applicable defined value wins. If a scope does not define a value, resolution continues toward Presence defaults and finally the registered system-safe default.

```text
resolved property =
  Piece override
  ?? Collection-placement override
  ?? Room override
  ?? Presence value
  ?? registered safe default
```

### 3.1 Presence scope

Defines global defaults for all Rooms, Collections, and Pieces. A global Look applies here unless the owner explicitly targets a Room.

### 3.2 Room scope

Overrides global values for one Room. Room Style is normally defined here. Room overrides can include supported typography, background, atmosphere, treatment defaults, and navigation behavior.

### 3.3 Collection scope

Applies to one Collection placement, not necessarily every use of the canonical Collection. It can define Collection Presentation, member treatment defaults, density, progress/navigation treatment, and motion for that placement.

### 3.4 Piece scope

Applies to one Piece placement. It can define crop/focus, treatment, size/feature state, text/CTA role, motion, visibility, and depth where the Room Style supports them.

### 3.5 Applicability

Not every layer/property is valid at every scope. For example, a Piece cannot redefine the Presence entry Room, and a Presence Look cannot choose one Piece's focal point. The UI must omit invalid controls; the resolver must reject unknown or inapplicable values rather than retaining hidden inert configuration.

## 4. Inheritance and override behavior

Each customisable property resolves to one of four visible states:

- **Inherited** — uses the next lower-priority scope.
- **Overridden** — defines a local value.
- **Locked** — defines or inherits a value protected from preset application at this scope.
- **Unavailable** — unsupported by the current Room Style, media type, or renderer path.

Resetting an override removes the local value and reveals the inherited result. It does not copy the inherited value into the local scope.

The editor must show both the resolved value and its source, using client copy such as **From Nocturnal Gallery**, **From this room**, or **Custom for this piece**. It must not show V2 field names.

## 5. Lock model

### 5.1 Lock unit

A lock protects one of the six layers at a supported scope. A lock can protect the whole layer or, where explicitly designed later, named properties within it. The prototype requires whole-layer locks; property-level locks are deferred unless needed to prove a critical interaction.

Examples:

- lock Motion / Atmosphere at Presence scope to retain a reduced-motion identity across Look changes;
- lock Room Style for the Archive Room while changing the global Look;
- lock Piece Treatment for one hero Work;
- lock Collection Presentation for one selected-works sequence.

### 5.2 Preset application rule

Presets change only unlocked layers.

For every proposed layer at every targeted scope:

1. resolve whether a lock applies at that scope;
2. if locked, retain the existing resolved layer and record **Preserved — locked** in the impact summary;
3. if unlocked, validate and stage the preset's layer values;
4. do not remove unrelated overrides outside the target scope;
5. do not silently unlock anything.

A higher-precedence local override remains effective even when an unlocked lower-precedence preset value changes. This is inheritance, not a lock. The impact summary distinguishes **Preserved — local override** from **Preserved — locked**.

### 5.3 Lock persistence

Locks persist across preset preview, application, save/reload at the supported prototype persistence boundary, named Look restore, and before/after compare. Locks are independent destination state and are never stored inside a named Look. Saving or restoring a named Look therefore cannot add, remove, or replace locks.

This default avoids a restored Look unexpectedly removing later safety or art-direction locks.

## 6. Look model

### 6.1 What a Look contains

A Look is editable metadata with:

- stable Look identity;
- owner-visible name and optional description;
- origin: system preset, owner-named Look, or transformation preset;
- revision/version metadata;
- normalised editable values across the six layers;
- recommended/default Room Style and Collection Presentation mappings;
- optional scope target and override metadata;
- for owner-named Looks, optional opaque stable asset identifiers validated against the current owner's authorised asset list, never copied media;
- creation/update timestamps and provenance;
- compatibility/version information for deterministic resolution.

A Look is not:

- a screenshot;
- a flattened visitor page;
- a duplicated set of images/video;
- a capture of Piece placements, Piece order, Room order, visibility, CTA designation, or navigation structure;
- a raw copy of the entire backend Presence payload;
- an arbitrary CSS/code bundle.

For an owner-named Look, an asset reference is only an opaque stable owner-authorised identifier (for example, a validated `media_id` from the current owner asset list). It is never an asset URL, blob/base64 value, copied file, expiring preview reference, or other private-draft reference. If the prototype cannot obtain and validate a stable identifier, **Save as Look** omits the media-affecting value; restore then leaves the destination's current media unchanged. A URL's apparent stability or owner origin does not make it an acceptable Look reference.

### 6.2 System presets

System Looks are immutable definitions. Applying one creates editable owner state; it does not mutate the system preset. Owners use **Save as Look** to capture their adapted version.

### 6.3 Named Looks

Owners can:

- save the resolved normalised layer values/recommendations and provenance as a named Look;
- rename it;
- update it explicitly from current state;
- duplicate it as metadata;
- compare it with current state;
- restore it;
- delete the named metadata without deleting media or current Presence content.

Ordinary editing after save does not silently update the named Look.

Named Look restore changes only its included unlocked layer values/recommendations. It does not move or reorder Pieces. When a named Look recommends a different Room Style, Collection Presentation, or journey, applying that recommendation is a separate structural preview/apply action.

### 6.4 Save points

A structural save point is created immediately before a structural transformation, including separately applying a named Look's structural recommendation. It contains sufficient editable metadata and references to restore:

- Room order and entry identity;
- Room Styles and relevant compositions;
- Collection Presentations;
- Piece placement/order/feature/depth state;
- all six resolved layer values and overrides;
- visibility and required CTA designation;
- locks;
- referenced Look/revision provenance.

Save points reference canonical media and Works. They are editable structural metadata, not media snapshots. Retention and durable storage are deferred schema decisions; the prototype holds them in gated browser-local state.

## 7. First three Looks

Gate P0 proves one visibly changed Look; Gate P1 proves all three Looks and all three Room Styles, including Film Strip / Selected Works. The exact colour/font assets are design-token decisions, but the following behavior is normative. For P1 and V3.0 market acceptance, every finished Look/Room Style combination must be independently judged more original and resolved than the current BBB baseline across spatial concept, content hierarchy, atmosphere/treatment, motion behavior, and responsive continuity. Prototype mappings prove the seam only; they do not lower that quality bar.

| Dimension | Soft Editorial | Nocturnal Gallery | Zine Archive |
| --- | --- | --- | --- |
| Atmosphere | Light paper/linen, calm, spacious | Near-black field, grain/depth, focused signal | Ink/burgundy or ledger paper, tactile scan texture |
| Typography | Editorial serif-led hierarchy, restrained sans labels | High-contrast display/editorial type, luminous labels | Condensed/display labels, assertive mixed-scale editorial rhythm |
| Default Room behavior | Gallery Wall or Film Strip, generous pacing | Threshold Portal or focused Gallery Wall, cinematic emphasis | Denser Gallery Wall/Film Strip with staggered archival rhythm |
| Piece treatment | Quiet/framed, restrained shadow, generous captions | Dark-field focus, luminous/gold signal, stronger depth | Captioned/scanned/outlined, varied registered sizes, tactile labels |
| Density | Low to medium | Low, focused | Medium to high within readability limits |
| Motion | Still/gentle | Living but reduced-motion-safe | Gentle stagger/scan; never essential to comprehension |
| CTA | Understated editorial action | High-contrast signal | Label/stamp-like action with protected contrast |
| Journey | Calm browse/sequence | Threshold then focused reveal | Discoverable archive/index rhythm |

### 7.1 Soft Editorial

Intent: the work and writing feel curated, breathable, and publication-like.

Required visible change from the other Looks:

- light surface and clear whitespace rhythm;
- larger editorial type relationships;
- restrained framing and depth;
- quiet motion;
- Gallery Wall or Film Strip preference rather than threshold spectacle.

The proven Christina visual language is a reference foundation, not a claim that the V3 Look already exists as a reusable preset.

### 7.2 Nocturnal Gallery

Intent: the Presence feels immersive, cinematic, and alive without making content inaccessible.

Required visible change:

- black/near-black environment with grain/depth;
- strong luminous or gold signal treatment;
- sparse focused composition and threshold behavior;
- living atmosphere with a complete reduced-motion resolution;
- stronger depth hierarchy and concentrated CTA.

BBB's proven black/gold environment is a quality reference. Applying Nocturnal Gallery does not require the BBB spherical canvas in every Room and must not mutate BBB's public implementation.

### 7.3 Zine Archive

Intent: the Presence feels assembled, authored, tactile, and exploratory rather than like a recoloured gallery.

Required visible change:

- ink/burgundy or ledger-paper surface;
- scan/ledger texture and strong label language;
- denser registered rhythm with deliberate stagger/rotation where responsive-safe;
- caption-forward Piece treatment and mixed semantic sizes;
- archive/index navigation cues;
- gentle stagger or scan motion with reduced-motion fallback.

Current V2 zine/archive CSS provides atmosphere references but is not by itself sufficient. The Room/Collection presentation must also change to meet the radical-difference requirement.

## 8. First three Room Styles

### 8.1 Threshold Portal

**Purpose:** A memorable arrival with one dominant image, framing statement, signal/proof, and onward action.

**Existing foundation:** Registered V2 `portal-threshold` composition.

**Normative zones:**

- threshold image — one dominant visual;
- threshold statement — up to two framing text Pieces;
- signal — compact proof, event, service, or credential;
- portal — one protected onward CTA.

**Responsive behavior:** Dominant visual first, statement and signal in reading order, CTA always reachable. Advanced depth may add atmosphere but cannot hide the onward path.

### 8.2 Gallery Wall

**Purpose:** A paced exhibition wall with a clear opening work, supporting works, labels/context, and exit.

**Existing foundation:** Registered V2 `gallery-wall` composition and proven Gallery P2 public rhythm.

**Normative zones:**

- opening/feature work;
- main wall;
- supporting notes;
- exit CTA;
- optional influence layer hidden or reduced on constrained mobile output.

**Responsive behavior:** Feature first, main wall in deterministic order, context adjacent in reading order, secondary influence content never obscures the primary experience.

### 8.3 Film Strip / Selected Works

**Purpose:** A focused, ordered sequence where one Work receives attention at a time.

**Existing foundation:** Proven Christina selected-works public presentation in `PresenceStudioV2PublicRoom`; not currently a registered V2 layout.

**Normative structure:**

- active Work stage;
- previous/next controls;
- progress and direct index/dots where accessible;
- optional caption/context;
- optional focus view;
- protected exit/onward action.

**Responsive behavior:** Swipe plus labelled buttons, stable aspect handling, visible progress, keyboard navigation, no mandatory autoplay. Reduced motion changes transitions to immediate or minimal fades.

Film Strip requires a deliberately bounded V3 presentation adapter. The prototype must not duplicate the special renderer into an unrelated second public path.

## 9. Room Style and Look relationship

A Look may recommend or propose a Room Style, but the concepts remain independent:

- Look defines identity across layers;
- Room Style defines spatial grammar for one Room;
- applying a Look may stage a Room Style change only when the Room Style layer is unlocked;
- a locked Room Style remains while other Look layers change;
- a Room Style may resolve different treatment tokens under different Looks;
- unsupported Look/Room combinations fall back through an explicit compatibility mapping and are shown before Apply.

This separation removes the current V2 coupling where special public styles activate only for a particular world value.

## 10. Collection Presentation set for the slice

The prototype needs only the presentations required to prove the three styles:

- **Wall:** ordered member placements across Gallery Wall zones;
- **Selected sequence:** one active member with progress for Film Strip;
- **Threshold feature:** designated cover/feature plus compact supporting members where capacity permits.

Zine Archive may initially resolve through a denser Wall or Selected sequence treatment. A true overlapping Zine Board is deferred until it has registered responsive zones, collision/snap behavior, and accessible order.

## 11. Instant versus preview/apply

| Change | Behavior | Save-point requirement |
| --- | --- | --- |
| Image treatment/filter | Instant in draft canvas | Normal undo value |
| Motion intensity | Instant in draft canvas | Normal undo value |
| Background image/video or surface | Instant after media validation | Normal undo value |
| Typography | Instant in draft canvas | Normal undo value |
| CTA style | Instant in draft canvas | Normal undo value |
| Room Style | Preview/apply | Required before Apply |
| Navigation structure | Preview/apply | Required before Apply |
| Collection Presentation | Preview/apply | Required before Apply |
| Transformation preset | Preview/apply | Required before Apply |

“Instant” means immediate draft-canvas feedback, never immediate publication. If a supposedly instant change creates structural displacement, the displacement portion becomes preview/apply.

## 12. Preset and transformation resolution algorithm

The implementation must produce deterministic results from the same starting state, preset revision, and content graph.

1. Capture the current editable state as a save point for structural operations.
2. Resolve the target scope: Presence, selected Room, Collection placement, or Piece.
3. Load the immutable preset revision and its compatibility mapping.
4. For each proposed layer:
   1. skip invalid properties for the target scope;
   2. retain layers protected by a lock;
   3. retain higher-precedence local overrides unless the owner explicitly includes them in the transformation target;
   4. stage valid unlocked values.
5. Resolve Room Style and Collection Presentation compatibility.
6. Auto-place compatible Pieces in stable order using registered zones/capacity.
7. Put incompatible or overflow Pieces into visible **Unplaced after change** state.
8. Validate entry Room, required CTA, navigation reachability, visibility, contrast, media, responsive behavior, and private/public eligibility.
9. Show impact summary: changed, preserved by lock, preserved by local override, moved, and unplaced.
10. On Apply, commit V3 metadata only to the qualified browser-local working state and compile in memory through the existing V2 boundary. Apply is never authority for a server write.
11. On Cancel or failure, restore the captured state exactly.

No step may silently delete, hide, unlock, publish, or write a new public path.

## 13. Before/after compare

Compare is state-based, not image-based.

- **Before** resolves the captured pre-change view model through the same renderer/projection path.
- **After** resolves the staged/current state.
- Toggling does not mutate either state.
- Selection, zoom, and Room position remain aligned where the two structures permit.
- When structures differ, compare returns to the same Room identity and closest valid Piece/source reference, with a clear note.
- Compare never stores screenshots as the restoration mechanism.

Named Look compare limits Before/After to normalised layer values and recommendations; it does not manufacture a placement comparison. Structural transformation compare uses the pre-transformation save point and may compare Room/style, Collection Presentation, placement/order, visibility, CTA, navigation, and lock changes.

## 14. Save and exact restore

### 14.1 Named Look restore

Named Look restore must be exact for its included normalised editable metadata:

- layer values and applicable overrides;
- Room Style and Collection Presentation recommendations, without applying structural rearrangement;
- opaque stable owner-authorised asset identifiers, when available; otherwise media is omitted and destination media remains unchanged;
- preset/revision provenance.

It does not restore Piece placements/order, Room order, visibility, CTA designation, or navigation structure. If the owner chooses to apply one of its structural recommendations, that action enters structural preview/apply and first creates a save point.

### 14.2 Structural save-point restore

Restoring a structural save point must be exact for all included editable metadata and references:

- layer values and applicable overrides;
- Room/style references and compositions;
- Collection Presentations;
- Piece placements, order, feature, depth, crop/focus, treatment, motion, and visibility;
- Room order and entry designation;
- navigation and CTA styling/designation;
- complete lock metadata;
- preset/revision provenance.

Media and canonical Works are referenced by identity. If a referenced Work or asset has changed or is missing, restore must report the difference and retain the last safe snapshot rather than claiming perfect restoration. Milestone 2's “perfect BBB return” uses the pre-transformation structural save point—not named Look restore alone—and therefore requires pinned compatible metadata revisions and all referenced sources to remain available.

## 15. Guardrails

- All text/CTA combinations must resolve to readable contrast; a preset cannot lower contrast below the approved threshold.
- Reduced-motion preference overrides non-essential motion without changing content access or order.
- Room Style capacity and media compatibility are validated before Apply.
- Entry and final Room protections remain authoritative.
- Required CTA cannot become hidden, unreachable, empty, or invalid.
- Private Library content cannot become public because of a Look or Piece override.
- Editor-only Look, lock, compare, source, and save-point metadata cannot enter public projection.
- Preset changes remain draft-only and cannot publish.

## 16. Prototype persistence boundary

The prototype requires enough browser-local V3 metadata to prove:

- selected system Look;
- one global or Room layer lock;
- one named Look;
- one pre-change save point;
- resolved placement changes for a Piece and Collection.

This metadata is default-off, local/test, BBB-scoped, browser-local, and non-publishing. It is split into Presence and Room envelopes under an opaque authenticated-owner partition and requires an exact schema/scope/complete-base-identity/fingerprint match. Locks, named Looks, structural save points, staging, compare state, and source provenance are never POSTed wholesale into current `editable_config` or `locked_fields`. Any named-Look asset identifier must pass the owner-authorised stable-identity rule above.

The base fingerprint uses the stable persisted-semantic projection: remove only owner-GET transport-added `url` and `preview_expires_at`, only on valid `private_draft` objects with a valid `media_id` within `scene_config`, `asset_config`, or `content_config`. Ordinary/public URLs and every other field remain authoritative. The nine-field wire candidate must be evaluated after actual JSON serialization and parsing, with all nine top-level POST fields still present.

The current refetch-plus-full-config-POST flow is non-atomic, may create a draft, and can verify by refetch only after mutation. A disposable local/test single-writer replacement/private-media fixture may characterize those effects but can never enable the product Save control. Runtime M1 Save and server Visitor Preview stay blocked until a separately approved server operation atomically verifies the expected existing-draft identity, revision, and stable fingerprint and replaces it in one transaction. Absent/mismatched state must conflict with zero config/media mutation, and all media assignment/orphaning effects must be transactional. This docs-only specification authorises no backend change. Durable hosted storage, server-enforced concurrency, retention, cross-device restore, preset version migration, and collaborative editing require separate architecture and schema approval.

The implementation must not repurpose current `locked_fields` or other backend fields for V3 metadata in the prototype.

## 17. Customisation acceptance criteria

- **CM-001:** Soft Editorial, Nocturnal Gallery, and Zine Archive visibly differ in atmosphere, presentation, treatment, density, motion, and journey—not colour alone.
- **CM-002:** Threshold Portal, Gallery Wall, and Film Strip have different spatial grammars and responsive behavior.
- **CM-003:** The resolver applies precedence Piece → Collection → Room → Presence for every applicable property.
- **CM-004:** Applying a preset changes only unlocked targeted layers and reports every preserved layer.
- **CM-005:** A higher-precedence local override survives a lower-precedence preset without being mislabeled as a lock.
- **CM-006:** Instant changes are visible on the draft canvas and can be cancelled to the editing-session start value.
- **CM-007:** Room Style, navigation, Collection Presentation, and transformations do not commit before Apply.
- **CM-008:** Structural Apply creates a save point; Cancel and undo restore the exact prior editable state.
- **CM-009:** Overflow/incompatible Pieces remain visible in the shelf with titles and reasons.
- **CM-010:** A named Look can be saved, renamed, explicitly updated, compared, restored, and deleted without duplicating media or capturing Piece placements/order; it retains media only as an opaque stable owner-authorised asset identifier and omits media when that identifier is unavailable.
- **CM-011:** Named Look restore always preserves independent destination locks and cannot add, remove, or replace lock state.
- **CM-012:** Compare resolves Before and After through the same renderer path and does not use screenshots as source state.
- **CM-013:** Reduced-motion, contrast, CTA, Room, visibility, and private-content guardrails override unsafe preset values.
- **CM-014:** The gated prototype keeps required V3 metadata in opaque-owner-partitioned Presence/Room envelopes, never POSTs it wholesale into current `editable_config` or `locked_fields`, and makes no publish request. P0/P1 and local M1 editing remain zero-write. Stable comparison strips only the two permitted private-draft owner-GET transport fields, and the nine POST fields must survive actual JSON serialization. Current refetch plus POST and its disposable single-writer fixture cannot enable Save. Runtime M1 Save/server Visitor Preview require a separately approved atomic expected-existing-draft identity/revision/stable-fingerprint check-and-replace transaction with zero mutation on conflict and transactional media effects; current PATCH remains forbidden.
- **CM-015:** Restoring the pre-transformation BBB structural save point after a radical transformation returns all available included metadata and reports any missing/changed source instead of claiming false fidelity; named Look restore alone makes no structural-return claim.
- **CM-016:** Applying a named Look never moves/reorders Pieces; applying one of its structural recommendations is a distinct preview/apply operation with a pre-transformation save point.

## 18. Deferred work and non-goals

Deferred beyond the prototype or V3.0 where noted:

- durable named Look/save-point schema and version migration;
- property-level locks beyond the whole-layer prototype;
- collaborative/concurrent Look editing;
- marketplace or arbitrary user-authored presets;
- raw CSS, code injection, shaders, or arbitrary animation timelines;
- unbounded 3D positioning;
- Room transition and entrance-animation authoring before V3.1;
- a true Zine Board until responsive spatial, collision, and accessibility rules are registered;
- silently generalising BBB's specialised spherical renderer to every Room;
- a new renderer or parallel public projection;
- publication from the gated V3 prototype.
