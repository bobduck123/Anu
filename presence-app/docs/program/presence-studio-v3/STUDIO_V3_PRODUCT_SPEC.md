# Presence Studio V3 Product Specification

**Status:** Implementation contract for the gated Studio V3 prototype
**Audience:** Product, design, engineering, QA, accessibility, security, and no-merge reviewers
**Decision boundary:** This document specifies a new client-facing editor shell over the existing Studio V2 draft compiler, renderer, and private/public projection. It does not authorise any backend change, a new public renderer, publishing, production enablement, or runtime draft persistence.

## Related specifications

- [Interaction model](./STUDIO_V3_INTERACTION_MODEL.md)
- [Content architecture](./STUDIO_V3_CONTENT_ARCHITECTURE.md)
- [Customisation model](./STUDIO_V3_CUSTOMISATION_MODEL.md)
- [View model and compiler](./STUDIO_V3_VIEW_MODEL_AND_COMPILER.md)
- [Prototype slice](./STUDIO_V3_PROTOTYPE_SLICE.md)
- [Acceptance tests](./STUDIO_V3_ACCEPTANCE_TESTS.md)
- [Risk register](./STUDIO_V3_RISK_REGISTER.md)

The four product-facing specifications are normative together. If wording appears to conflict, the safer interpretation wins: preserve the existing draft/public boundary, do not publish, do not delete content implicitly, and do not expose V2 or backend language to clients.

## 1. Product statement

Presence Studio V3 is the place where an owner shapes their digital showroom, home, or world while seeing the result as they work. It should feel like touching the Presence itself, not configuring a CMS or operating a renderer.

The V3 editor is a presentation and interaction layer. For the first slice it compiles client-facing concepts into the proven V2 draft shape and displays the existing projection. The public Presence remains unchanged until the existing, separately confirmed publish flow is deliberately used. The prototype does not publish at all.

## 2. Problem to solve

Studio V2 proved the environmental layer, layout composition, draft persistence, private preview, and safe public projection through BBB Vision. Its owner experience remains unsuitable as the market-facing product:

- the live Presence is subordinate to navigation, steps, outline, and inspector panels;
- clients encounter renderer and backend concepts instead of creative concepts;
- Works and Collections feel separate from pieces shown in rooms;
- the editing canvas does not accurately express the most distinctive public styles;
- mobile controls are technically reachable but not touch-first;
- style choices often read as token changes rather than different spatial experiences;
- the first meaningful view of some presentation changes occurs in preview rather than in the editor.

V3 fixes the product surface without reopening the proven launch-critical renderer and publication architecture.

## 3. North star and experience promise

Within five seconds of opening Studio, the owner must be able to answer:

1. **What am I looking at?** My Presence, as a visitor will experience it.
2. **What can I do?** Tap something to shape it, or open my Piece Shelf to add something.
3. **Is this live?** No. The visible status makes clear that changes are draft-only until separately reviewed and published.

The intended feelings are:

- this is mine;
- this is alive;
- this is beautiful;
- this is easy;
- this expresses my identity.

The editor must not make the owner feel that they are editing payloads, operating a generic page builder, or risking an accidental public change.

## 4. Users and modes

### 4.1 Primary user

The primary user is a Presence owner: artist, cultural organisation, creative practitioner, service provider, or small team member responsible for presentation. They may be confident in their creative judgement without being confident in web tooling.

### 4.2 Simple mode

Simple mode is the default. It exposes safe, high-value actions in client language:

- select and edit Pieces;
- place and reorder Pieces and Collections;
- feature or unfeature a Piece;
- choose Looks and Room Styles;
- use constrained resize, crop/focus, treatment, motion, and CTA controls;
- save and restore named Looks;
- preview as a visitor.

Layout rules, snap targets, responsive constraints, contrast protection, entry-room protection, and required actions remain enforced.

### 4.3 Advanced Creative mode

Advanced Creative mode is opt-in and can be selected as the owner's preferred default from Studio Home or Settings. It adds safe spatial controls such as direct transforms, depth, layering, finer motion, and expanded typography without exposing operator/debug concepts.

Advanced Creative mode is not permission to create arbitrary breakable mobile coordinates. It still compiles through registered room and placement rules.

### 4.4 Hidden operator concerns

Normal clients must never see control-plane fields, owner binding, payload JSON, renderer eligibility flags, migration state, route internals, raw auth data, sanitisation internals, legacy editor switching, proof labels, or test controls.

## 5. Client model and terminology

Only the following product model is used in client-facing V3 copy:

| Term | Meaning | First-slice implementation boundary |
| --- | --- | --- |
| Presence | The owner's complete visitor experience and global identity | A V3 view over the existing eligible Presence draft |
| Room | A spatial presentation within the Presence | Compiles to one V2 chamber |
| Work | A canonical item in the owner Library | Existing owner-library Work record |
| Piece | A placed, editable instance of a Work or supported authored content | Compiled V2 object snapshot with an explicit source reference when library-backed |
| Collection | An ordered, curated set of Works | Existing owner-library Collection plus ordered membership in the V3 view model |
| Look | An editable bundle of customisation choices | V3 metadata resolved into supported V2 world, skin, style, composition, and presentation values |

The UI says **Room**, never chamber; **Piece**, never object; **Look**, never world/skin/preset payload; and **Visitor Preview**, never public projection.

Detailed ownership, source references, removal, and deletion semantics are defined in [Content architecture](./STUDIO_V3_CONTENT_ARCHITECTURE.md).

## 6. Information architecture

Studio V3 has four top-level areas:

1. **Edit Presence** — Studio Home and the live editor.
2. **Library** — Works and Collections for bulk creation and management.
3. **Visitors** — visits, activity, enquiries, and entry paths as those capabilities become available.
4. **Settings** — owner preferences, sharing, advanced identity settings, and safe configuration.

**Visitors** must answer four owner questions in client language: Who came? What did they do? Who contacted me? How did they enter? The prototype does not invent analytics or visitor data; the area exposes only capabilities already backed by an approved data and privacy contract.

Legacy surfaces map as follows:

| Existing area | V3 destination |
| --- | --- |
| Overview | Studio Home within Edit Presence |
| Editor | Edit Presence live canvas |
| Works and Collections | Library |
| Enquiries and Analytics | Visitors |
| Passes | Visitors or hidden until client-ready |
| DNA | Look & Feel or advanced identity settings |
| QR & NFC | Settings / Share |
| Halls | Hidden/future |

The prototype may implement only the Edit Presence canvas and the in-editor shelf. It must not reproduce the current eleven-tab shell inside the canvas.

### 6.1 Studio Home essentials

Studio Home contains only what helps an owner continue safely:

- live link and current publication status;
- **Edit Presence** primary action;
- **Visitor Preview** action, visibly disabled with its persistence-gate reason until the separately approved atomic draft contract passes;
- unpublished-change and readiness summary;
- suggested next creative action;
- preferred Simple or Advanced Creative default.

## 7. Primary journeys

### 7.1 Open and understand

1. The owner opens `/studio/[id]/editor` for an eligible, gated Presence.
2. The live-feeling draft canvas fills the working surface.
3. A compact status area says whether the view has unpublished changes and confirms that it is not live.
4. The canvas supplies two obvious invitations: tap a visible Piece, or open the Piece Shelf.

### 7.2 Edit a Piece in context

1. The owner taps a Piece.
2. The Piece receives a clear selection outline that does not appear in visitor output.
3. A floating action bar appears near the bottom safe area.
4. A high-frequency action changes the canvas immediately, or **Edit** expands the bottom sheet.
5. The owner closes the sheet and remains at the same room, scroll position, zoom, and selection.

In editor mode, the first mouse, touch, or keyboard activation selects the Piece and suppresses that activation's visitor navigation, CTA, internal-navigation, or artwork-focus behaviour. For BBB, suppression must occur inside the native gallery callback before it can schedule focus, change direct/window location, open a window, or perform another visitor effect; a container-only capture handler is insufficient. A pending artwork-focus request is cancelled when editor mode intercepts it, and every deferred focus/navigation callback rechecks the current bridge mode before acting. A CTA/link without a stable selectable Piece ID and unsupported BBB chrome use the suppress-only no-ID policy: they cannot navigate or manufacture a guessed/anonymous selection. A validated destination is available through an explicit **Open link** action. **Test as visitor** temporarily removes the editor bridge/overlays from the current in-memory compiled canvas and returns without a write. The existing server-backed **Visitor Preview** is a separate M1 target that remains blocked until an atomic qualified draft save exists. With the optional editor bridge absent, current visitor event behaviour, direct/window navigation, deferred focus behaviour, markup, instrumentation, and focus order remain exactly unchanged. The complete normative bridge contract is [View model and compiler: Optional editor bridge](./STUDIO_V3_VIEW_MODEL_AND_COMPILER.md#optional-editor-bridge).

### 7.3 Add content once and place it

1. The owner opens the Piece Shelf.
2. They choose an existing Work or Collection, or enter the Library flow to create one.
3. They place it into the active Room through a valid drop target or explicit **Add to this room** action.
4. The canvas shows the result immediately.
5. The shelf shows whether an item is placed, available, or could not fit.

Creating and editing canonical Works remains a Library responsibility. The shelf is for finding and placing content, not a second hidden content database.

### 7.4 Change the identity safely

1. The owner opens Looks.
2. They preview Soft Editorial, Nocturnal Gallery, or Zine Archive on the current draft canvas.
3. Instant properties update continuously; structural properties are staged with a visible **Apply** action.
4. Applying a structural change creates a reversible save point.
5. Locked layers retain their values.
6. Any incompatible Pieces return visibly to the shelf with a summary; nothing is silently deleted or hidden.

### 7.5 Save and restore a named Look

1. The owner chooses **Save as Look**.
2. They name the current normalised layer values, recommendations, and provenance. Locks remain independent destination state.
3. Later they select that named Look and see a before/after comparison.
4. They restore its included unlocked layer values and recommendations deterministically.

A named Look is editable metadata and may include only opaque, stable asset identifiers validated against the current owner's authorised asset list. It never stores URLs, blobs/base64, copied media, or private-draft references. If a stable authorised asset identifier is unavailable, the prototype excludes that media choice from the named Look and leaves destination media unchanged on restore. A named Look is not a screenshot, flattened media capture, duplicate set of uploaded assets, or capture of Piece placements/order. Applying a named Look's structural recommendation is a separate preview/apply transformation that creates a structural save point.

### 7.6 Preview and understand publishing

1. The owner uses **Test as visitor** to inspect the current in-memory compiled canvas without editor controls.
2. Server-backed **Visitor Preview** remains visibly unavailable until the current state has been saved through the separately approved atomic draft-persistence contract.
3. When that persistence subgate is eventually approved and passed, the existing private, editor-free projection may open and the interface distinguishes saved draft, unpublished change, and live state.
4. **Review & Publish** may remain visible as a product boundary, but the V3 prototype cannot execute publish.

## 8. Functional requirements

### 8.1 Canvas and selection

- **PS-001:** The gated editor opens on the live Presence canvas, not a form or inspector.
- **PS-002:** Selecting any supported Piece exposes the floating action bar.
- **PS-003:** The bottom sheet expands without navigating away or losing spatial context.
- **PS-004:** Selection, guides, instrumentation, and draft-only content never enter public output.
- **PS-005:** Desktop, tablet, and mobile use the same interaction model; desktop may expand the sheet laterally but may not require a side inspector.
- **PS-006:** With the optional editor bridge present, first mouse/touch/keyboard activation selects and suppresses visitor link/CTA, internal-navigation, direct/window navigation, and artwork-focus behaviour at the native actionable callback before any effect is scheduled. BBB callbacks cancel pending focus and recheck bridge mode before deferred focus/navigation; a CTA/link without a stable Piece ID and unsupported chrome return suppress-only results, never a guessed selection or visitor fallback. **Open link** deliberately opens a validated destination, and **Test as visitor** deliberately enters the reversible in-memory bridge-free canvas mode. The [normative bridge contract](./STUDIO_V3_VIEW_MODEL_AND_COMPILER.md#optional-editor-bridge) governs implementation.
- **PS-007:** With the bridge `undefined`, public markup, focus order, instrumentation, native callbacks, deferred focus, and mouse/touch/keyboard/CTA/internal-navigation/direct-or-window-navigation behaviour remain exactly unchanged.

### 8.2 Content placement

- **PS-010:** The shelf can display canonical Works and Collections with clear placed/available state.
- **PS-011:** A Piece or Collection can be placed only into a compatible Room target.
- **PS-012:** Placing a Collection preserves its order and reports members that do not fit.
- **PS-013:** Removing a Piece from a Room never deletes its Work.
- **PS-014:** Permanent Work deletion is available only from Library and requires an impact confirmation listing placements and Collection memberships.
- **PS-015:** Removing a Work from a Collection never deletes the Work or its independent Room placements.

### 8.3 Manipulation

- **PS-020:** Supported Pieces can be moved or reordered, featured/unfeatured, and resized within registered constraints.
- **PS-021:** Image Pieces expose crop/focus and treatment controls.
- **PS-022:** Text and CTA Pieces expose safe position and size controls.
- **PS-023:** Advanced Creative mode exposes supported depth/layer controls without allowing arbitrary responsive breakage.
- **PS-024:** Background media, gallery/Room Style, motion intensity, and image treatment have visible editor feedback.

Some requirements above are target V3 behaviour and are not implemented in V2 today. The prototype slice must label unsupported controls as deferred rather than displaying non-functional affordances.

### 8.4 Looks and customisation

- **PS-030:** Three compound Looks are available: Soft Editorial, Nocturnal Gallery, and Zine Archive.
- **PS-031:** Three structurally different Room Styles are available: Threshold Portal, Gallery Wall, and Film Strip / Selected Works.
- **PS-032:** Looks affect atmosphere, presentation, treatment, density, and motion rather than colour alone. At the V3.0 market gate, each finished Look/Room Style combination must pass independent creative review as more original and resolved than the current BBB baseline; reusing a proven preset mapping is prototype evidence, not market acceptance.
- **PS-033:** Each of six customisation layers can be overridden and locked at supported scopes.
- **PS-034:** Applying a Look changes only unlocked layers.
- **PS-035:** Owners can save, rename, update, restore, and delete named Looks without duplicating media.
- **PS-036:** Before/after compare uses resolved editable state, not screenshots.
- **PS-037:** Named Look restore does not move or reorder Pieces; exact structural restoration uses a pre-transformation save point.
- **PS-038:** A named Look may retain media choices only as opaque, stable, owner-authorised asset identifiers; when no such identifier exists, the prototype omits the media choice rather than storing a URL, blob, copy, or private-draft reference.

The layer definitions and resolution rules are normative in [Customisation model](./STUDIO_V3_CUSTOMISATION_MODEL.md).

### 8.5 Safety

- **PS-040:** The prototype gate is default-off and available only in local/test contexts for the BBB pilot unless separately approved.
- **PS-041:** V3-only locks, named Looks, save points, placements, object edits, staging, and compare metadata remain isolated from `editable_config` and `locked_fields`. The browser keeps atomic Presence/Room snapshots under an opaque authenticated-owner partition. M1 may also replace the same bounded, reference-only metadata through the separately reviewed owner/Room-scoped `PUT /editor/v3/state` contract with exact base identity/fingerprint and metadata-revision preconditions. That owner-private metadata save is not draft replacement, Visitor Preview, publish, or authority to relax PS-047.
- **PS-042:** No prototype action publishes or mutates the public BBB route.
- **PS-043:** In-memory **Test as visitor** remains editor-free and zero-write. Server-backed Visitor Preview remains private, editor-free, and blocked while atomic draft persistence is unavailable.
- **PS-044:** The entry Room and final remaining Room cannot be deleted.
- **PS-045:** A required visible CTA cannot be removed, hidden, or made unreadable without a replacement.
- **PS-046:** Media limits, compression, contrast, responsive constraints, and private-content filtering remain authoritative.
- **PS-047:** Fingerprint comparison uses a stable persisted-semantic projection of the ten-field config. Only owner-GET transport-added `url` and `preview_expires_at` are removed, and only from valid `private_draft` objects with a valid `media_id` within `scene_config`, `asset_config`, or `content_config`; ordinary/public URLs and every other field remain authoritative. The nine-field wire candidate is inspected after actual JSON serialization semantics, and all nine top-level POST fields must still be present. The current client refetch plus current full-config `POST` is not atomic, may create a draft, and its post-refetch can verify only after mutation; therefore a disposable local/test single-writer fixture may characterize replacement/deletion and private-media side effects but can never enable product Save. Runtime M1 Save and server Visitor Preview remain blocked until a separately approved server contract atomically checks the expected existing-draft identity, revision, and stable fingerprint and replaces it in one transaction. An absent or mismatched draft must return conflict with zero config/media mutation, and media assignment/orphaning effects must be transactional. Recursive-merge `PATCH` is forbidden. This docs task authorises no backend change.

## 9. Instant and staged changes

The editor uses two clearly different update behaviours:

| Behaviour | Properties | User contract |
| --- | --- | --- |
| Instant on canvas | Image treatment, motion intensity, background, typography, CTA style | Update continuously in draft state; undo and cancel return to the prior value |
| Preview then apply | Room Style, navigation structure, Collection Presentation, transformation presets | Show a staged preview, impact summary, and explicit Apply/Cancel; Apply creates a save point |

The status treatment must never imply that an instant canvas change is publicly live. “Instant” means immediate in the draft canvas only.

## 10. First marketable style set

The current BBB experience is the quality floor, not the target ceiling. All three finished Look/Room Style combinations must exceed it through a distinct spatial idea, content hierarchy, atmosphere/treatment, motion behavior, and responsive continuity. A prototype adapter may establish technical feasibility before that creative bar is met, but it cannot be called market-ready.

### 10.1 Looks

- **Soft Editorial:** light paper/linen atmosphere, generous spacing, editorial typography, restrained treatment, and low motion.
- **Nocturnal Gallery:** black or near-black field, grain/depth, gold or high-contrast signal, cinematic focus, and reduced-motion-safe living atmosphere.
- **Zine Archive:** ink, burgundy, or ledger-paper atmosphere; denser staggered rhythm; scan/ledger texture; assertive labels and treatment.

### 10.2 Room Styles

- **Threshold Portal:** one dominant entry image, statement, signal, and onward CTA.
- **Gallery Wall:** paced exhibition wall with a feature work, supporting works, labels, and contextual material.
- **Film Strip / Selected Works:** ordered, focused sequence with previous/next movement, progress, and optional artwork focus.

The first two map to registered V2 layouts. Film Strip is a new V3 Room Style adapter extracted from the proven Christina selected-works presentation; the specification does not claim it is already registered as a V2 layout.

## 11. Scope

### 11.1 Gate P0 — seam proof

The first implementation proves only that:

- the V3 canvas can sit over the existing V2 renderer/compiler path;
- first activation selects a Piece without executing visitor behaviour, then opens the action bar and bottom sheet;
- the shelf can place one Work-derived Piece and one Collection into a Room;
- one Look visibly changes the canvas;
- one layer lock survives that Look switch in browser-local prototype metadata;
- one named Look can be saved, changed, and restored without media leakage or structural movement;
- the existing public BBB output and undefined-bridge interaction matrix remain byte/behaviourally unaffected at the agreed assertion boundary;
- no publish occurs.

P0 and P1 are strictly local/in-memory proof gates and perform no draft write or server preview. M1 local editing may proceed after them, but qualified draft save/reload and server Visitor Preview remain a blocked M1 persistence subgate until the separately approved atomic server precondition-and-replacement contract in PS-047 exists and passes.

### 11.2 Gate P1 — style proof

Only after P0 passes, P1 proves:

- all three Looks—Soft Editorial, Nocturnal Gallery, and Zine Archive—are visibly distinct;
- all three Room Styles—Threshold Portal, Gallery Wall, and Film Strip / Selected Works—are structurally distinct;
- one structural transformation creates a complete pre-change save point and supports truthful before/after compare and exact cancel/restore for available references;
- independent creative review judges each finished Look/Room Style combination more original and resolved than the current BBB baseline across spatial concept, hierarchy, atmosphere/treatment, motion, and responsive continuity.

### 11.3 V3.0 product target beyond the gates

V3.0 adds complete Library workflows, supported crop/focus and treatment, the three Room Styles at production quality, global and Room overrides, resilient save/restore, full responsive/a11y coverage, and safe integration with the existing final publish checklist.

### 11.4 Non-goals

- backend, auth, tenant, routing, or control-plane redesign;
- a new public renderer;
- a generic Webflow, Figma, or Canva clone;
- arbitrary freeform mobile positioning;
- code injection or raw CSS;
- 3D authoring or a generic spatial engine;
- exposing operator/debug mode;
- executing publish in the prototype;
- migrating GGM or changing its privacy posture;
- deleting or redesigning existing public BBB work.

## 12. Deferred cleanup before market launch or V3.1

The following are known V2-era seams, not already-solved capabilities:

1. Canonical Works/Collections and embedded V2 objects are separate systems; persistent source references and membership ordering need an approved storage home.
2. V2 has no native named Looks, layer locks, Room-specific Look overrides, or compare/save-point model.
3. V2 supports only two registered compositions. Film Strip must be extracted into an explicit presentation adapter.
4. Existing public style selection is coupled to the Gallery world; presentation and atmosphere need clearer separation.
5. The current editor preview does not render all specialised public styles with parity.
6. Crop/focus, filters, text/CTA spatial sizing, snapping, and durable upload flows are not complete V2 capabilities.
7. Placement treatment and most size values do not yet produce sufficient visual differentiation.
8. Current owner navigation and mobile layout remain legacy presentation surfaces and must be bypassed or replaced for the gate.
9. Named Look, structural save-point, placement, and Piece-override metadata remain outside current `editable_config` and `locked_fields`. M1 persists their bounded reference-only projection in the reviewed owner-private V3 state row while retaining browser-local recovery snapshots; no draft/public projection follows from that save.
10. Durable server-side Piece placement identity and source provenance do not yet exist. They are a pre-market gate for cross-reload/cross-device “edit once, see it everywhere”, reliable impact accounting, and any permanent deletion workflow.
11. Existing-draft full-config POST replacement, omission, empty-value, deletion, and private-media side effects may be characterized only in a disposable local/test single-writer fixture. The current refetch-plus-POST sequence is non-atomic and the POST may create a draft, so that fixture cannot enable product Save. A separately approved atomic expected-existing-draft identity/revision/stable-fingerprint precondition-and-replacement server contract is required before runtime M1 Save or server Visitor Preview; recursive-merge PATCH remains forbidden.

No prototype task may silently “solve” these seams by adding a parallel backend or public rendering path.

## 13. Product acceptance

The local-editing portion of gated Milestone 1 passes when an owner can:

- understand the editor's purpose and draft safety within five seconds;
- select and edit a Piece without leaving the canvas;
- find and place a Piece or Collection from the shelf;
- arrange supported content into a Room;
- switch to a visibly different Look;
- lock an override and observe it surviving the next preset;
- save and restore a named Look's normalised layer values and recommendations exactly, without moving or reordering Pieces;
- save bounded V3 metadata privately, use in-memory **Test as visitor**, and understand that draft Save, server Visitor Preview, and executable Review & Publish remain separate and unavailable until their own gates pass;
- complete the journey without public mutation, private-data leakage, or editor instrumentation in public output.

M1 may claim only a persisted owner-private V3 metadata journey through PS-041. It cannot claim a persisted/saved draft or server Visitor Preview journey until the atomic draft contract in PS-047 is separately approved, implemented, and verified. A single-writer draft characterization fixture and a successful post-refetch are evidence only, never authority to expose draft Save.

Milestone 2 additionally requires transforming the same content between radically different identities and restoring BBB exactly from inside the editor. That exact return is performed by the pre-transformation structural save point—not by named Look restore alone—and includes resolved customisation, Room/style references, Collection Presentations, placements/order, visibility, CTA state, navigation, and locks. Uploaded media is referenced, not copied.

Detailed automated and human acceptance belongs in [Acceptance tests](./STUDIO_V3_ACCEPTANCE_TESTS.md).

## 14. Resolved product decisions

- V3 is a shell/controller over V2, not V2 replacement architecture.
- The existing `/studio/[id]/editor` route remains the entry and eligibility boundary.
- The initial gate is default-off and local/test BBB-only.
- The canvas is the primary surface; the inspector is not.
- Simple is the default; Advanced Creative is opt-in.
- Works and Collections remain canonical owner-library records.
- Placed Pieces are compiled snapshots with explicit source references where applicable.
- Prototype source references use only `work:<id>`, `collection:<id>`, and `legacy-object:<id>`; Room-native legacy elements map to `legacy-object:<id>` rather than inventing a Work identity.
- Scope resolution is Piece → Collection → Room → Presence.
- Presets change only unlocked layers.
- Structural changes use preview/apply and create save points.
- Removal and deletion are separate operations.
- Entry/last Room and required CTA protections are mandatory.
- Named Looks contain normalised editable layer values/recommendations and provenance; any media choice is an opaque stable owner-authorised asset identifier. They contain no URL/blob/copied-media/private-draft reference, lock state, or Piece placements/order, and omit media when no safe stable identifier exists.
- Structural save points contain the Room/style references, Collection Presentation, placement/order, visibility, CTA, navigation, and lock metadata required for exact transformation restore; they are not media snapshots.
- Prototype V3 metadata stays outside current `editable_config` and `locked_fields`. It uses atomic browser snapshots plus the reviewed owner-private V3 state replacement contract; neither path changes the draft/public renderer configuration. Current editable-config refetch plus POST remains a non-atomic characterization surface only, and draft persistence still requires the separate PS-047 contract with transactional media effects.
- The prototype does not publish and cannot change public BBB output.
