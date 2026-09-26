# Owner content binding contract

Date: 2026-08-17
Scope: How owner/client content enters spatial displays
Status: **Specification only.** No code was written. Nothing here admits any component or option, and no claim is made about production readiness, public launch, client self-serve, Mobstar creative acceptance, commerce, multiplayer or publishing.

Companion to [DISPLAY_ARRANGEMENT_CONTRACT](DISPLAY_ARRANGEMENT_CONTRACT_2026-08-17.md).
Arrangement decides *where the Nth thing goes*. Binding decides *what the Nth thing is*.

---

## 1. The governing principle

> **Saved layouts store references, ordering, transforms, display settings and bindings — never copied media or model blobs.**

This is already the model's posture. `SpatialLogicalRef` is a prefixed reference type
(`asset:`, `public:`, `generated:`, `presence:`, `space:`, `room:`, `piece:`, `action:`), and
the existing validator rejects `.glb`/`.gltf` locators outright. Binding must not weaken that.

Three practical consequences:

1. **A layout never grows with media size.** Twenty photographs cost twenty references.
2. **Replacing content never rewrites a layout.** Repoint the asset; the room is unchanged.
3. **`SPATIAL_LAYOUT_JSON_BUDGET_BYTES` (100 KB) stays achievable** at realistic content counts.

---

## 2. What a binding is

```ts
// Pseudocode. Not an implementation.
interface SpatialDisplayBinding {
  id: string;
  hostPlacementId: string;
  arrangement: SpatialArrangementSpec;
  entries: readonly SpatialBindingEntry[];
}

interface SpatialBindingEntry {
  pieceRef: SpatialLogicalRef;    // "piece:..." — the owner's content record
  mediaRef?: string;              // id into SpatialRoomDefinition.media
  actionRefs: readonly string[];  // ids into SpatialRoomDefinition.actions
  label: string;                  // REQUIRED — accessible name and fallback row
  caption?: string;
  order: number;
  visible: boolean;
  pinnedSlotId?: string;
}
```

The binding is stored. Slot transforms are derived. See the arrangement contract.

---

## 3. Content types

`PieceType` today: `image`, `video`, `audio`, `garment`, `product`, `event`, `flyer`, `text`,
`link`, `gallery`, `collection`, `archive-item`.

| Piece type | Minimum metadata | Optional | Fallback representation |
|---|---|---|---|
| `image` | `title`, `mediaUrl`, alt text | `caption`, dimensions, credit, date | Thumbnail + title + alt |
| `video` | `title`, `mediaUrl`, poster, alt | duration, captions track, credit | Poster + title + link to play |
| `audio` | `title`, `mediaUrl`, duration | artwork, transcript, credit | Title + duration + play link |
| `text` | `title`, body | author, date | The text itself |
| `link` | `title`, target URL | description, favicon/thumb | Title + destination |
| `product` | `title`, `mediaUrl` | price, variants, availability | Thumbnail + title (**no purchase path**) |
| `garment` | `title`, `mediaUrl` | size, colourway, fabric | Thumbnail + title |
| `event` | `title`, date/time | venue, capacity, RSVP target | Title + date + location |
| `flyer` | `title`, `mediaUrl` | date, venue, download ref | Thumbnail + title |
| `archive-item` | `title`, identifier | date, provenance, rights, `mediaUrl` | Identifier + title + date |
| `collection` | `title`, member refs | cover media, count | Title + count + member list |
| `gallery` | `title`, member refs | cover media, ordering | Title + ordered member list |

Notes that matter:

- **Alt text is required for every visual piece.** It is the accessible name and the no-media
  fallback. It is not optional metadata.
- **`collection` and `gallery` are containers.** Binding one to a display means binding its
  members. Nesting depth must be capped — recommend 1 — to avoid unbounded expansion.
- **`product` binds display only.** Price may be shown as text; no checkout, cart or payment
  path is in scope for this contract.

---

## 4. Binding targets

For each target: what it accepts, what it needs, and how it degrades.

### `piece-plane` — `presence.piece-plane`
- **Accepts:** any type with visual media, plus `text` and `link`.
- **Requires:** `label`, and a `mediaRef` or text body.
- **Actions:** `inspect`, and one primary action.
- **Fallback:** a card with thumbnail, title, caption, actions.
- **Editing:** assign media, set caption, reorder, show/hide.
- **Stored:** piece ref, media ref, action refs, label, caption, order.
- **Never embedded:** image bytes, data URIs, model data.
- This is the universal carrier. Every other target should degrade to it conceptually.

### Framed work — `presence.framed-media`
- **Accepts:** `image`, `flyer`, `archive-item`, `text` (as a printed card).
- **Requires:** `label`, `mediaRef`, alt text. Aspect ratio strongly recommended — an
  unspecified ratio means the frame guesses and may letterbox or crop.
- **Actions:** `inspect`; optionally `open-link`.
- **Fallback:** thumbnail + title + caption card.
- **Arrangement:** `wall-grid` default.

### Projection wall — `presence.projection-wall`
- **Accepts:** `image`, `video`, `flyer`, `gallery`.
- **Requires:** `label`, `mediaRef`, alt text; for `video`, a poster frame **and** a captions
  track reference.
- **Actions:** `inspect`, `sequence-previous`/`sequence-next`, `watch`.
- **Fallback:** ordered list of stills with titles; the poster stands in for the video.
- **Arrangement:** `projection`. The existing 32-cell wall is this at fixed capacity.
- **Constraint:** video must never autoplay with sound. See fallback rules.

### Archive wall — `presence.archive-wall`
- **Accepts:** `archive-item`, `flyer`, `text`, `image`, `collection`.
- **Requires:** `label` and a stable **identifier**. Archive content without an identifier is
  not archive content.
- **Optional but strongly recommended:** date, provenance, rights statement.
- **Actions:** `inspect`, `open-link` to a record.
- **Fallback:** an ordered, readable index — identifier, title, date. This is arguably the
  *primary* representation for archives; the 3D wall is the secondary one.
- **Arrangement:** `grid` or `timeline`.

### Listening station — `presence.listening-station`
- **Accepts:** `audio`, `collection` of audio, `event` (as a session).
- **Requires:** `label`, duration, and an audio media reference — **which the runtime media
  type does not currently support.** See section 6.
- **Optional:** artwork, transcript, credits, track order.
- **Actions:** `listen`, `inspect`, sequence controls.
- **Fallback:** a track list with titles, durations and play links; transcript where present.
- **Constraint:** audio requires a user gesture to start. A listening station must be
  legible and navigable in silence.

### Display island — `presence.rounded-island`
- **Accepts:** `product`, `garment`, `archive-item`, `image`, physical-object pieces.
- **Requires:** `label`.
- **Actions:** `inspect`, `enquire`.
- **Fallback:** grouped card list under the island's own label.
- **Arrangement:** `grid` (small counts) or `row`.

### Spherical gallery — `presence.spherical-gallery`
- **Accepts:** `image`, `flyer`, `archive-item`, `gallery`.
- **Requires:** `label`, `mediaRef`, alt text.
- **Actions:** `inspect`, sequence controls.
- **Fallback:** ordered gallery list — already its declared `mobileFallback: semantic-only`.
- **Arrangement:** `spherical`, `viewerInside: true`.
- **Constraint:** currently 12 fixed cells; an overflow policy is required before real content.

### Orbital carousel — deferred
- **Would accept:** `image`, `product`, `garment`, `event`.
- **Blocked on:** the arrangement contract and a reduced-motion equivalent.
- **Fallback:** ordered list; ring position must not be the only meaning.

### Constellation archive — not yet an option
- **Would accept:** `archive-item`, `collection`, `image`, `text`.
- **Requires additionally:** a **relationship source** — the thing that decides what sits near
  what. Without it, a constellation is scatter with extra steps.
- **Fallback:** grouped list by cluster, with relationships stated in text.

### Timeline spiral — not yet an option
- **Would accept:** any type carrying a date.
- **Requires additionally:** a **date per entry**. `Piece.createdAt` exists but is a record
  timestamp, not the work's date. A separate typed date field is needed.
- **Fallback:** a chronological list — which is a genuinely good archive view in its own right.

---

## 5. What is stored, referenced, and never embedded

| Stored in layout JSON | Referenced externally | Never embedded |
|---|---|---|
| `pieceRef` (`piece:…`) | Image/video/audio bytes | Base64 or data URIs |
| `mediaRef` id | Model geometry (`.glb`) | Model geometry of any kind |
| `actionRefs` ids | Transcripts, caption tracks | Full text bodies beyond a short caption |
| `label`, `caption` | Owner records and CMS entries | Owner PII |
| `order`, `visible`, `pinnedSlotId` | Thumbnails | Credentials, tokens, signed URLs |
| Arrangement spec + params | | Client-specific baked textures |
| Material slot overrides, skin refs | | |

**Signed or expiring URLs must never be stored in a layout.** They belong to the asset
resolution layer; a saved room that embeds one becomes silently broken later.

Rough budget sanity check against the 100 KB limit: a binding entry of roughly 150–250 bytes
means around 100 entries costs 15–25 KB, leaving ample room for placements and states. Storing
a transform per entry instead would roughly double that and scale worse.

---

## 6. Two blocking gaps in the current model

**Gap 1 — no audio or video media kind.**
`SpatialMediaRef.kind` is `"image" | "poster" | "logo" | "placeholder"`. `PieceType` has
`audio` and `video`, and `presence.listening-station` is a registered component. A listening
station cannot bind audio today.

*Recommendation:* extend `SpatialMediaRef.kind` with `audio` and `video`, and add the fields
those types need — `durationSeconds`, `posterAssetId` for video, `captionsAssetId`,
`transcriptAssetId`. Keep `safety` as-is.

**Gap 2 — runtime actions do not cover strategic actions.**
Runtime `SpatialActionRef` kinds: `inspect`, `navigate-state`, `sequence-previous`,
`sequence-next`, `disabled-placeholder`. Strategic `ActionType`: `view`, `buy`, `enquire`,
`listen`, `watch`, `book`, `RSVP`, `donate`, `enter-room`, `unlock-room`, `open-link`.

Binding needs an explicit mapping, or actions vanish between layers. Suggested initial mapping:

| Strategic `ActionType` | Runtime treatment |
|---|---|
| `view` | `inspect` |
| `watch`, `listen` | new `media-control` kind, or `inspect` + media state |
| `open-link` | new `open-link` kind, external target |
| `enter-room` | `navigate-state`, or a room transition |
| `enquire`, `book`, `RSVP` | `disabled-placeholder` until a real intake path exists |
| `buy`, `donate` | `disabled-placeholder` — **out of scope; no commerce assumption** |

Rendering a commerce-shaped action as a `disabled-placeholder` with an honest reason is the
correct behaviour today, and it is already supported by the existing action union.

---

## 7. Editing affordances

What an operator should be able to do, per binding, without touching geometry:

- Add or remove content, and reorder it (drag or move up/down).
- Choose the arrangement kind from those the option supports.
- Set or clear a caption; edit the label.
- Show or hide an entry without deleting it.
- Pin one entry to a specific slot; unpin it.
- Swap the media on an entry, keeping its position and actions.
- Preview the semantic fallback — **operators should be able to see what a screen reader gets.**

What should be blocked: editing derived slot transforms directly (use `pinnedSlotId`),
embedding a file into the layout, and setting an action that has no working target.

---

## 8. Validation rules

An implementation should reject:

- `pieceRef` that does not resolve, or is not `piece:`-prefixed.
- A missing or empty `label`.
- `mediaRef` not present in `SpatialRoomDefinition.media`.
- `actionRefs` not present in `SpatialRoomDefinition.actions`.
- A media kind the target does not accept.
- A `.glb`/`.gltf`/data-URI locator anywhere in a binding.
- A binding whose `hostPlacementId` does not exist or does not carry a display component.
- Duplicate `order` values within one binding.
- A layout exceeding `SPATIAL_LAYOUT_JSON_BUDGET_BYTES`.

And warn on: entries beyond `maxRecommendedEntries`, missing alt text, missing captions on
video, missing identifiers on archive items, and `truncate` overflow.
