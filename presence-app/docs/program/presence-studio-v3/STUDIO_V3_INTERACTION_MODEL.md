# Presence Studio V3 Interaction Model

**Status:** Normative interaction contract for the gated Studio V3 prototype and V3.0 target
**Depends on:** [Product specification](./STUDIO_V3_PRODUCT_SPEC.md)
**Content semantics:** [Content architecture](./STUDIO_V3_CONTENT_ARCHITECTURE.md)
**Look resolution:** [Customisation model](./STUDIO_V3_CUSTOMISATION_MODEL.md)

## 1. Interaction promise

The owner edits the Presence by touching the Presence. The canvas is always the spatial anchor; contextual controls arrive when needed and leave without displacing the owner into an administration workflow.

Every interaction must preserve four truths:

1. the owner can see what is changing;
2. changes are draft-only in the editor;
3. the owner can reverse or cancel the current operation;
4. constrained placement rules protect public and mobile output.

The V3 shell replaces the current owner-facing cockpit presentation. It does not replace the V2 compiler, registered layout constraints, draft boundary, private preview, or public renderer.

## 2. Surface anatomy

The live editor has six persistent or summonable regions.

### 2.1 Live canvas

- Occupies the full available viewport beneath device safe areas.
- Displays the resolved draft through the existing V2-compatible projection.
- Preserves the visitor composition as closely as editing affordances allow.
- Keeps selection outlines, handles, drop targets, snap guides, and draft badges in an editor-only overlay.
- Does not show the current legacy outline panel or inspector as the primary surface.

For the prototype, the exact existing V2 public-room renderer is the read-only canvas layer, with a narrowly optional editor bridge and V3 selection/placement overlays. Public call sites receive no bridge. The prototype must not substitute the generic V2 editor room or introduce a second “close enough” renderer for specialised presentations.

#### Normative optional bridge contract

The sole normative TypeScript API is the synchronous `[PROPOSED] PresenceStudioV2EditorActivationInput`, `[PROPOSED] PresenceStudioV2EditorIntent`, `[PROPOSED] PresenceStudioV2EditorResult`, and `[PROPOSED] PresenceStudioV2EditorBridge.handleIntent(intent)` contract in [View model and compiler — Optional editor bridge](./STUDIO_V3_VIEW_MODEL_AND_COMPILER.md#optional-editor-bridge). `lib/presence/studio-v3/editorBridge.ts` must implement it verbatim: no renamed loose callbacks, widened union, Promise/delayed result, or alternate interface is allowed in P0/P1.

Prop presence means editor interception is active. An `activate-piece` intent uses the runtime-valid, trimmed, non-empty deterministic `StudioV2PublicObject.id`; an array index, title, URL, label, DOM ID, position, or transient focus index is never an ID substitute. A `navigate-room` intent uses the runtime-valid, trimmed, non-empty destination chamber/Room ID, not a hash or display label. Every synchronous result has `suppressVisitor: true`.

The bridge event algorithm is exact:

1. Every BBB native pointer/touch/`Enter`/`Space` entry point branches on the current bridge *inside that native callback*, before the current visitor `onSelectWork`, `focusTransition`, `onFocusWork`, link/CTA, `moveToView`, history/hash, gallery, lightbox, or media path. An outer React overlay alone is insufficient.
2. If the target is a Piece with a stable `pieceId`, the branch consumes the event, cancels any pending artwork-focus transition, and synchronously calls `handleIntent({ kind: "activate-piece", pieceId, input })` exactly once. It requires the matching `piece-selected` result and performs no visitor focus, navigation, media, CTA, gallery, or lightbox action.
3. A CTA or link without a stable Piece ID emits `suppress-action-without-piece` and requires `action-suppressed`; unsupported renderer chrome emits `suppress-unsupported-chrome` and requires `chrome-suppressed`. Both are consumed and inert: no ID guess, destination, or visitor fallthrough.
4. Direct Room navigation and the BBB window `ArrowLeft`/`ArrowRight` path are consumed. They resolve the destination first and emit `navigate-room` with source `direct`, `arrow-previous`, or `arrow-next`, require `room-selected`, and select that Room in V3 editor state without calling visitor `moveToView`, `setActiveImage`, history/hash mutation, or artwork focus. An invalid/unresolved Room ID fails to suppress-only; it never falls through.
5. `Escape` is consumed before any visitor Escape handler and synchronously emits `clear-selection`, requiring `selection-cleared`. The shell interprets this intent as clearing the deepest open editor state first—modal/popover, then sheet, then selection—without closing visitor artwork, moving visitor view, or navigating; the fixed intent/result identifier is not permission to skip deeper editor state.
6. A selected Piece's second activation, key repeat, and every later activation remain consumed. Editing and visitor behavior are available only through labelled editor actions: **Edit**, **Open link**, or **Test as visitor**.
7. A bridge transition from `undefined` to present, and every handled intent, cancels any pending BBB `focusTransition`. The animation-completion callback re-reads the current bridge immediately before `onFocusWork`; if the bridge is present it cancels the transition, synchronously emits `activate-piece` for the stable object ID, requires `piece-selected`, and returns without calling `onFocusWork`. This closes the attach-during-animation race.
8. Merely tabbing focus onto a Piece does not activate it. **Open link** opens one validated destination deliberately. **Test as visitor** temporarily renders the current in-memory compiled canvas without the bridge, overlays, action bar, or editor instrumentation and restores the same editor Room/selection without a network write.

The server-backed **Visitor Preview** is distinct from **Test as visitor** and stays disabled. Current single-writer local/test POST characterization is not authority to enable it or runtime Save. Both require a separately approved server contract that checks expected existing-draft identity, revision, and stable semantic fingerprint atomically with the mutation. When the bridge is `undefined`, the renderer adds no editor handler, attribute, focus order, state, or event suppression; all existing visitor callbacks, pending transitions, pointer/touch/keyboard behavior, CTA/link behavior, direct/window navigation, focus, markup, instrumentation, and visuals remain exactly unchanged.

### 2.2 Compact top bar

The top bar contains only:

- back to Studio Home;
- Presence name and current Room name;
- local working state: **Saved locally**, **Unsaved local changes**, or **Local recovery needed**; future **Saving**, **Saved draft**, and conflict states may appear only after the separately approved atomic server precondition is qualified;
- undo/redo when available;
- **Visitor Preview**, visibly disabled with a reason until an atomically qualified saved draft exists;
- **Review & Publish** as a visible boundary.

In the prototype, Review & Publish is non-executing and explains that publishing is unavailable in the gated slice. No top-bar action may publish.

### 2.3 Room navigator

The Room navigator is a compact, dismissible strip or sheet trigger. It shows client-facing Room names and an entry marker, not chamber IDs or roles.

It supports:

- moving between Rooms without losing unsaved local interaction state;
- adding and renaming a Room when permitted;
- reordering Rooms through a staged navigation change;
- opening Room Style controls;
- protected-state messaging for the entry and last remaining Room.

Room deletion is outside the prototype. V3.0 may expose it only when the Room is neither the protected entry Room nor the final Room, and only after content-placement impact review.

### 2.4 Floating action bar

Selecting a Piece opens a bottom-safe-area floating action bar. The default actions are:

1. **Edit** — opens the bottom sheet at the most relevant control group.
2. **Arrange** — enters safe placement/reorder mode.
3. **Feature** or **Unfeature** — applies the registered featured placement when valid.
4. **Show** or **Hide** — changes draft visibility subject to required-CTA protection.
5. **More** — opens the bottom sheet's complete options.

The bar may replace an unavailable action with the next relevant safe action, but its order should remain stable. Destructive actions never appear as an unlabelled primary icon.

When nothing is selected, the canvas-level floating bar offers:

- **Pieces** — opens the Piece Shelf;
- **Look** — opens Look controls;
- **Room** — opens Room and Room Style controls;
- **Preview** — opens Visitor Preview.

### 2.5 Expandable bottom sheet

The bottom sheet is the one deeper-control surface across touch and desktop. It has three heights:

- **Peek:** title, current state, and primary action remain visible while most of the canvas is exposed.
- **Working:** default editing height, with the selected control group and live canvas still visible.
- **Full:** complex lists, crop/focus, Collection ordering, or accessibility help; dismiss returns to the prior canvas state.

The sheet:

- never navigates to a separate form for an ordinary Piece edit;
- retains selection, Room, canvas scroll/zoom, and staged values while changing control groups;
- provides labelled close and drag-handle behavior;
- traps focus only at full/modal height, not at peek or working height;
- avoids covering the selected Piece by panning or reframing the canvas when necessary;
- becomes a wider bottom-anchored tray on large screens, not a permanent side inspector.

Piece control groups are:

- **Content** — title, date, description, media summary, link/action where supported;
- **Size & Crop** — registered size, aspect/crop, focal point, text/CTA scale;
- **Treatment** — image treatment/filter, frame, caption, typography, CTA style;
- **Motion** — supported entrance/ambient behavior and intensity;
- **Placement** — Room zone, order, feature state, depth/layer, Collection context;

Unsupported V2-era capabilities are omitted or labelled **Coming later** in specification/demo contexts. The prototype must not expose controls that appear to save but do nothing.

### 2.6 Piece Shelf

The Piece Shelf is a bottom sheet mode with tabs:

- **Pieces** — canonical Works from Library;
- **Collections** — canonical Collections and member counts;
- **In this room** — current placements, including hidden or off-canvas items.

Each shelf item shows one state:

- **Available** — not placed in the active Room;
- **Placed here** — one or more placements in the active Room;
- **Placed elsewhere** — available for another placement if permitted;
- **Needs attention** — missing media, stale source, or incompatible with the current target;
- **Unplaced after change** — returned to the visible shelf by a transformation.

The shelf is an inventory and placement surface. Permanent Work deletion and full bulk editing remain in Library.

## 3. Core state model

The interaction shell has one mutually exclusive primary state and optional subordinate state.

| Primary state | Entry | Exit | Canvas behavior |
| --- | --- | --- | --- |
| Browsing | Open editor, clear selection | Select Piece, open shelf/Look/Room | Visitor-like navigation; no handles |
| Piece selected | Tap/click a Piece | Clear selection, select another, open deep control | Selection outline and floating bar |
| Piece editing | Edit or More | Done, Cancel, select another after resolution | Bottom sheet; instant or staged feedback |
| Arranging | Arrange, long-press/drag, keyboard move | Place, Cancel, invalid drop | Valid targets and snap guides visible |
| Shelf open | Pieces action | Close, place item, open Library | Canvas remains a drop destination |
| Look editing | Look action | Apply/Cancel/Done | Resolved Look previews on canvas |
| Structural preview | Choose Room Style, navigation, Collection Presentation, transformation | Apply or Cancel | Preview badge and impact summary; draft not committed until Apply |
| Visitor Preview | Visitor Preview | Back to editor | Existing private editor-free projection |

Subordinate states include saving, offline/retry, undo available, validation warning, protected action, and incompatible-content summary. A saving failure must never masquerade as Saved.

## 4. Selection and contextual behavior

### 4.1 Selecting

- A tap/click on a Piece selects it without moving it.
- A second tap on the selected Piece remains consumed; editing opens through the labelled **Edit** action and it must not begin an accidental drag or visitor action.
- Touch drag requires a short hold or an explicit Arrange state to prevent scroll conflicts.
- Empty-canvas tap clears selection unless a structural preview or unsaved modal decision is active.
- Escape emits the normative synchronous `clear-selection` intent and clears the deepest editor state first: modal/control popover → bottom sheet → selection; no visitor Escape handler runs.
- Selection must be conveyed by more than colour and have a programmatic accessible state.

### 4.2 Editor event precedence

- Pointer click/tap and keyboard `Enter`/`Space` use the normative bridge contract above while the bridge is present; the branch lives inside the BBB native callback before any visitor callback or focus transition.
- A stable-ID Piece emits one `activate-piece` intent and requires `piece-selected`. A no-ID CTA/link emits `suppress-action-without-piece`; unsupported chrome emits `suppress-unsupported-chrome`; both are consumed and inert with no title/URL/label/index guess.
- Direct Room controls and window Arrow navigation emit `navigate-room` with the resolved destination `roomId` and require `room-selected`, without changing visitor view/history/focus. Escape emits `clear-selection` and requires `selection-cleared` without visitor handling.
- The selection handler prevents the same or repeated activation from reaching an underlying anchor, CTA, internal navigation handler, artwork-focus/lightbox handler, media handler, or nested visitor action.
- Bridge attachment and interception cancel any pending BBB focus transition, and its animation callback must recheck the current bridge immediately before any `onFocusWork` call.
- A selected Piece still does not execute visitor behaviour on an unlabelled second activation; editing opens through **Edit**, and visitor actions use **Open link** or **Test as visitor**.
- Focus arrival and focus-visible styling remain available for keyboard users, but focus alone never opens visitor content or navigates.
- Tests cover stable-ID and missing-ID mouse/touch/keyboard targets, CTA/link/unsupported chrome, direct Room controls, window Arrow navigation, Escape depth, repeated activation, and attach-during-focus-animation behavior with the bridge present, plus the identical visitor matrix with the bridge `undefined` to prove current behavior is unchanged.

### 4.3 Overlapping Pieces

Simple mode selects the visually topmost eligible Piece. A **Choose layer** action lists overlapping Pieces by title. Advanced Creative mode may cycle layers with keyboard or sheet controls.

### 4.4 Locked and protected Pieces

A locked customisation layer can still be selected and inspected. Attempting to alter it explains which layer is locked and offers **Unlock this layer**; it never silently ignores input.

A required CTA can be selected and styled. Hiding, removing, or making it unavailable triggers a protection message and requires a valid replacement before the action can complete.

## 5. Direct and near-direct manipulation

### 5.1 Safe movement

Simple mode movement is near-direct:

- drag toward named/visible registered zones;
- magnetise to compatible zone boundaries and ordered insertion points;
- announce the proposed destination before drop;
- reject incompatible zones with an explanation and keep the original placement;
- preserve a valid mobile order automatically.

Advanced Creative mode may expose finer transforms inside the active layout's bounded coordinate system. It still snaps to safe edges, minimum spacing, readable bounds, and supported depth layers.

### 5.2 Reordering

- Dragging within a sequence shows an insertion marker.
- Keyboard users use **Move earlier/later** and **Move to start/end**.
- Collection member reordering occurs in Collection controls and updates every derived Collection Presentation preview.
- Reordering navigation or Room sequence is a structural preview/apply operation.

### 5.3 Feature and resize

- **Feature** requests the layout's feature zone/size rather than setting arbitrary dimensions.
- If the feature zone is occupied, the sheet offers swap, move existing feature to shelf, or cancel. It never overwrites.
- Resize handles map to registered sizes in Simple mode and announce the resolved size.
- Advanced Creative resizing may use continuous feedback but commits a constrained, responsive-safe value.

### 5.4 Crop and focus

Image crop/focus uses a dedicated full-height sheet state:

- the original asset is never destructively rewritten;
- aspect ratio comes from the resolved Piece/Room treatment;
- pinch/zoom or pointer drag adjusts the non-destructive crop;
- a visible focal-point control supports responsive reframing;
- Reset returns to the inherited/default treatment;
- Apply updates the draft canvas instantly after local validation.

Crop/focus is a V3 target, not an existing V2 capability. The first prototype may demonstrate the contract in local state only if the compiled/public path is explicitly excluded from acceptance.

### 5.5 Text and CTA

Text and CTA Pieces can move only to compatible zones. Simple mode exposes semantic scale values rather than pixel dimensions. Advanced Creative mode may expose width and alignment within registered limits.

CTA label, destination, and style update visibly. A destination validation failure retains the previous valid value and explains the issue. Required CTA contrast and presence protections cannot be bypassed.

### 5.6 Depth and layering

Depth is an ordered, bounded layer value. Simple mode offers **Bring forward** and **Send backward** only where overlap is part of the Room Style. Advanced Creative mode may expose the permitted depth range. Locked Pieces and structural/entry elements cannot be moved behind inaccessible layers.

## 6. Placing Pieces and Collections

### 6.1 Piece placement

1. Open the shelf.
2. Choose **Place** or drag a Work toward the canvas.
3. Show compatible Room targets only.
4. Preview the derived Piece using canonical Work content and inherited treatment.
5. Commit a placement with an explicit source reference and unique placement identity.
6. Announce success and leave the new Piece selected.

If no compatible target exists, the Work stays in the shelf and the UI offers a compatible Room Style or a different Room. No content is hidden.

### 6.2 Collection placement

1. Choose a Collection and inspect its ordered members.
2. Choose a compatible Collection Presentation or accept the Room Style's default.
3. Preview how many members fit and where.
4. Apply the placement.
5. Place compatible members in order; return the remainder to **Unplaced after change** with a summary.

The operation is atomic at the view-model level: cancelling restores the pre-placement state. Partial success is allowed only after the owner sees and accepts the explicit summary.

### 6.3 Removal versus deletion

- **Remove from this room** removes one placement only.
- **Remove from collection** removes membership only.
- **Delete Work permanently** exists only in Library, shows every affected placement and membership, and requires explicit confirmation.

The exact content rules are defined in [Content architecture](./STUDIO_V3_CONTENT_ARCHITECTURE.md).

## 7. Look interaction

### 7.1 Look browser

The Look sheet displays Soft Editorial, Nocturnal Gallery, Zine Archive, and named Looks. Each card communicates more than a swatch:

- representative spatial thumbnail or small live preview;
- atmosphere and motion description;
- default Room Style behavior;
- indication of locked layers that will remain unchanged.

### 7.2 Instant changes

Image treatment, motion intensity, background, typography, and CTA style update continuously on the draft canvas. Their editing session records a start value:

- **Done** keeps the current draft value;
- **Cancel** restores the start value;
- Undo restores the previous committed edit;
- closing through navigation resolves via an explicit keep/discard prompt if the value is not yet committed.

### 7.3 Preview/apply changes

Room Style, navigation structure, Collection Presentation, and transformation presets use a structural preview:

1. capture an in-memory pre-change save point;
2. calculate the resolved result and incompatibilities;
3. display the staged canvas with a persistent **Previewing** badge;
4. show moved, restyled, and unplaced counts;
5. **Apply** commits the working view-model change and retains its save point in the browser-local envelope; runtime Save remains disabled even after payload characterization and can be considered only after the separately approved atomic expected-existing-draft identity/revision/stable-semantic-fingerprint server gate passes;
6. **Cancel** restores the captured state exactly.

### 7.4 Locks and named Looks

- A lock appears at the layer/scope it protects.
- Applying any preset changes only unlocked applicable layers.
- **Save as Look** creates normalised editable layer values/recommendations and provenance. It may retain a media choice only as an opaque, stable asset identifier that the current owner-authorised asset list validates. It never stores a URL, blob/base64 value, copied media, or private-draft reference. If no stable authorised asset identifier exists, the prototype omits that media choice from the named Look and leaves destination media unchanged on restore. Locks remain independent destination state. A named Look does not capture pixels, duplicate files, store lock state, or store Piece placements/order.
- **Update named Look** is explicit; ordinary later edits do not silently mutate a saved Look.
- Named Look restore supports compare first and returns the included unlocked layer values/recommendations exactly without moving or reordering Pieces.
- If the owner elects to apply a named Look's structural recommendation, that is a separate structural preview/apply operation with its own pre-transformation save point.

Resolution details are normative in [Customisation model](./STUDIO_V3_CUSTOMISATION_MODEL.md).

## 8. Simple and Advanced Creative mode behavior

| Concern | Simple | Advanced Creative |
| --- | --- | --- |
| Selection | Tap/click | Same |
| Move | Registered zones and reorder | Bounded direct transform plus snapping |
| Resize | Semantic registered sizes | Finer constrained scale/width |
| Depth | Forward/back where supported | Permitted ordered depth range |
| Typography | Curated role/scale/style | Additional scale, width, alignment, weight |
| Motion | Off/gentle/living | Supported intensity and per-Piece variants |
| Navigation | Curated patterns with preview/apply | More supported transitions, still registered |
| Debug/renderer fields | Never | Never |

Changing mode does not change visitor output by itself. It changes which editing controls are exposed. Mode preference is owner metadata and is not part of a named Look.

## 9. Responsive model

### 9.1 Mobile

- Canvas remains the primary surface.
- Floating controls respect bottom safe areas and minimum 44 × 44 CSS-pixel targets.
- The sheet is the primary deeper-control surface.
- Arrange uses explicit mode/hold to avoid page-scroll conflicts.
- The selected Piece is automatically reframed above the sheet.
- No horizontal inspector or tiny three-pane layout is permitted.

### 9.2 Tablet

Tablet is the ideal canvas: touch-first controls, more visible canvas, working-height sheet, and optional persistent Room navigator.

### 9.3 Desktop

Desktop retains the same model with hover previews, pointer drag, keyboard operations, and a wider bottom tray. Additional width must benefit the canvas; it must not recreate outline/canvas/inspector columns as the default.

## 10. Keyboard and assistive technology

- All floating-bar and sheet actions are reachable in logical order.
- Selecting a Piece announces title, type, Room, visibility, and lock/protection state.
- Move, reorder, feature, layer, and resize have button/menu equivalents to drag.
- Live-region announcements report selection, placement target, successful placement, invalid drop, save state, preset preview, and restored state.
- Focus returns to the originating Piece or trigger when a sheet closes.
- While the bridge is active, `Enter`/`Space`, window Arrows, and Escape follow the normative bridge callbacks; no visitor callback or history/focus transition runs. The selected Piece/Room announcement uses the emitted stable ID resolved to owner-facing text by V3.
- Motion controls respect `prefers-reduced-motion`; Nocturnal Gallery and Zine Archive must remain comprehensible with motion disabled.
- Contrast protection applies to text, CTA, focus indication, controls, and editor overlays.
- Canvas zoom is not required for basic text legibility or control access.

## 11. Recovery and guardrails

### 11.1 Local recovery and future Save failure

- Retain the unsaved local operation.
- Before the separately approved atomic server precondition exists, keep runtime Save and server Visitor Preview disabled and explain that work is browser-local.
- After that contract is independently qualified, a failed or conflicting atomic save changes status to **Could not save** or **Conflict**, offers Retry/reload as appropriate, and retains a copyable diagnostic reference without backend detail.
- Block server Visitor Preview whenever there is no atomically confirmed draft matching the local working state.

An explicit **Discard local changes** action requires confirmation, rehydrates the last confirmed draft, and clears only the matching transient working state. It never calls publish or the server rollback endpoint.

### 11.2 Invalid or incompatible placement

- Preserve the previous valid placement.
- Explain the Room/zone constraint in client terms.
- Offer valid alternatives.
- Never discard, hide, or silently move content outside the owner's awareness.

### 11.3 Transformation overflow

- Place what is compatible in deterministic order.
- Put remaining Pieces in the visible shelf under **Unplaced after change**.
- Show counts and titles before Apply and after completion.
- Cancel/undo restores the exact prior state.

### 11.4 Protected Rooms and CTA

- Entry Room deletion is blocked until another Room is assigned entry and validated.
- Final Room deletion is blocked.
- Required CTA removal/hiding is blocked until a valid visible replacement exists.
- Structural previews include these protections before Apply.

### 11.5 Public safety

- No editor control invokes publish in the prototype.
- **Test as visitor** uses the bridge-free in-memory canvas. The existing private server Visitor Preview remains disabled until a separately approved atomic save establishes the matching draft.
- Public output contains no selection, shelf, status, analytics, instrumentation, source reference, lock, save-point, or editor metadata.

## 12. Prototype capability truth table

| Capability | Existing foundation | Prototype commitment | Deferred production work |
| --- | --- | --- | --- |
| V3 shell over canvas | V2 editor/public projection | Required | Full Studio IA integration |
| Piece selection | V2 selected object state | Required | Complete cross-renderer hit mapping |
| Floating bar | V2 toolbar precedent | Required with V3 actions/copy | Full action coverage |
| Bottom sheet | No dedicated V2 owner sheet | Required | Full control inventory and persistence |
| Typed placement | Gallery Wall/Portal Threshold compositions | Required for one Piece and one Collection | All media/style compatibility |
| Direct transforms | V2 Wild mode | Reuse only where safe | Snapping, crop/focus, text/CTA sizing |
| Look switch | V2 skin/world/public style values | Required and visibly truthful | Complete decoupled presentation model |
| Layer lock | Not native to V2 | Browser-local V3 metadata required; never POST wholesale | Reviewed durable private schema |
| Named Look | Not native to V2 | Browser-local layer/recommendation metadata; no placement/order capture | Multi-device persistence/versioning |
| Publish | Existing separate preview/confirm flow | Prohibited | Later integration after review |

## 13. Interaction acceptance criteria

- **IM-001:** A first-time owner identifies the canvas, edit action, shelf action, and draft/public status within five seconds without explanation.
- **IM-002:** One tap selects a Piece; a second deliberate action opens editing; ordinary scrolling never moves content.
- **IM-003:** The floating bar and bottom sheet can be completed on a 360 CSS-pixel-wide viewport without horizontal overflow.
- **IM-004:** Closing the sheet returns to the same Room, canvas context, and selection.
- **IM-005:** Every drag operation has a keyboard/button alternative and a voiced result.
- **IM-006:** Invalid placement preserves the original state and offers at least one valid next action.
- **IM-007:** A Collection placement previews fit, preserves member order, and reports all unplaced members.
- **IM-008:** Instant properties can be cancelled to the session-start value.
- **IM-009:** Structural changes do not commit before Apply; Cancel restores the exact pre-preview state.
- **IM-010:** Switching a preset visibly preserves locked layers and explains that preservation.
- **IM-011:** Restoring a named Look restores its included unlocked layer values/recommendations without copying media and without changing Piece placement/order.
- **IM-012:** Required CTA and protected Room actions cannot be completed through pointer, keyboard, or direct API-facing UI state.
- **IM-013:** **Test as visitor** contains no editor overlay or private Piece. Server Visitor Preview remains disabled until an atomically qualified saved draft exists, and the prototype produces no publish request.
- **IM-014:** Desktop expansion does not make a permanent side inspector the primary interaction pattern.
- **IM-015:** V3-only locks, named Looks, save points, staging, and compare metadata remain browser-local and are never POSTed wholesale into current `editable_config` or `locked_fields`. Disposable single-writer POST characterization cannot enable runtime Save. Save and server Visitor Preview stay disabled until separately approved server work proves an atomic expected-existing-draft identity/revision/stable-semantic-fingerprint precondition in the same transaction as config and media mutation; absence or mismatch conflicts before either mutation, and every failure rolls both back. A post-write refetch verifies output but is not concurrency control.
- **IM-016:** BBB → transformed identity → BBB exact structural return uses the pre-transformation save point, not named Look restore alone.
- **IM-017:** With the editor bridge present, the BBB native callback consumes stable-ID Piece activation before visitor selection/focus/navigation; no-ID CTA/link/unsupported chrome is inert; direct Room/window Arrow events select the destination Room only in editor state; Escape clears deepest editor state; repeated activation remains suppressed; and pending focus transitions cannot call `onFocusWork` after bridge attachment. **Open link** and **Test as visitor** are the only deliberate visitor paths.
- **IM-018:** With the editor bridge `undefined`, mouse, touch, keyboard, CTA/link, direct and window navigation, pending focus transitions, markup, instrumentation, focus, and focus order remain exactly unchanged.

## 14. Explicit non-goals

- arbitrary pixel-perfect freeform placement;
- a multi-tool design-program mode system;
- lasso selection or bulk transform in the prototype;
- timeline animation editing in V3.0;
- Room transitions or entrance-animation authoring before V3.1;
- editing raw V2 world, skin, composition, chamber, transform, route, or payload fields;
- permanent Work deletion from the canvas or shelf;
- publishing from V3 prototype controls.
