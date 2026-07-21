# Studio V3 P1 Room Style matrix

Status: PASS; three Room Styles and deterministic remapping implemented; compiler suite passed 28/28; Studio V3 Chromium passed 10/10; independent aesthetic review passed; formal `MERGE AFTER FIXES` remains recorded; fresh final review pending

| Room Style | V2 composition | Registered zones | Journey / interaction | Collection presentation |
|---|---|---|---|---|
| Threshold Portal | `portal-threshold` | one threshold image; up to two threshold statements; signal; one protected exit | dominant entry and onward portal | `threshold-feature` |
| Gallery Wall | `gallery-wall` | one opening work; main wall; supporting notes; one exit; secondary influence layer | paced scroll/browse exhibition | `wall` |
| Film Strip / Selected Works | `film-strip-selected-works` | one active-work stage; ordered sequence index; contextual notes; one protected exit | previous/next, direct index, keyboard and touch sequence | `selected-sequence` |

## Structural staging and accounting

Room Style selection stages a transformation against the active Room; it does not immediately mutate the accepted document. The remapper:

1. captures the pre-change structural savepoint;
2. resolves any higher-precedence Room override or Room-style lock;
3. visits base objects followed by explicit placements in stable order;
4. selects the first compatible registered zone with remaining capacity;
5. records every candidate as `placed`, `shelved`, `unplaced`, or `duplicate`;
6. reports changed/moved/overflow flags and preserved lock/override IDs;
7. emits a bounded composition only for accepted placements.

Incompatible and overflow Pieces remain in Room placement state with a shelf reason; they are not silently substituted. Works marked unavailable are normalized to shelved, hidden owner state during placement, remap, metadata restore, and savepoint restore. An explicitly hidden placement stays hidden even when its Work is otherwise current. Public object projection and every Room composition include only `placed`, non-hidden placements whose Piece source is current. Film Strip renders only those accepted composition IDs, so shelved, unavailable, hidden, unplaced, and duplicate objects cannot leak into its selected-work sequence.

## Film Strip boundary

Film Strip is one registered editor-preview composition branch inside the existing V2 public-room component. It is deliberately absent from the legacy V2 owner-editor layout list (`ownerEditorVisible: false`), requires `editorBridge`, and is not a new renderer family. If the bridge is absent, the component ignores `film-strip-selected-works` and P1 experience facets and resolves through the exact pre-P1 shared composition/rendering path, even when those private/draft tokens are supplied.

For an editor-bridged BBB-specialized room, only the active/gallery chamber with `film-strip-selected-works` uses the Film Strip adapter; unrelated threshold/practice chambers and the global BBB renderer remain intact. The adapter provides:

- an active visual stage;
- previous/next buttons with disabled bounds;
- a direct selected-work index and live progress text;
- Left/Right/Home/End keyboard handling;
- bounded horizontal touch-swipe handling;
- contextual material and a protected exit region;
- immediate transitions under reduced motion.

## Compatibility rule

All three Looks are registered with all three Room Styles. A Look may recommend a style, but structural change remains explicit through Preview, Before/After, Apply, or Cancel. The compatibility summary exposes placed, moved, shelved/unplaced, overflow, and preserved lock/override information before Apply.

## Confirmed automated evidence

The 28-test compiler suite confirms the complete 3x3 registry, exact Film Strip composition projection, Look/Room-Style independence, deterministic full accounting, exact Cancel, partial missing-reference reporting, preservation of Room locks/overrides, exact fallback owner-Library provenance, and exclusion of unavailable/hidden placements through projection, remap, metadata restore, and savepoint restore.

The Studio V3 Chromium suite passed 10/10, covering desktop/mobile Film Strip interaction, keyboard and touch sequence control, reduced motion, same-content Room Style comparisons, exact Cancel, durable-state protections, public invariance, and forced P1-token no-bridge fallback. V2 BBB parity/eligibility passed 14/14; the added public regression confirms Enter again opens the visibly hovered shape when no editor bridge exists. The independent review of the fresh Room Style captures returned `PASS`. The formal no-merge verdict and publish-lock approval gate remain outstanding despite these green rendering results.
