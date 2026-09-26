# Internal Piece Library Binding - 2026-08-18

## Status

Acceptance classification: `internal authoring evidence`.

This note records a bounded internal Piece Library for the spatial arranger. It is browser-local/internal only. It is not backend persistence, real upload support, public self-serve, publish flow, component admission, Mobstar creative acceptance, commerce, multiplayer, audio/video playback proof, or launch readiness.

## What The Piece Library Supports

The spatial room schema now accepts an optional `pieceLibrary` array. Each internal piece stores:

- stable `id`
- `pieceType`
- operator-facing `label`
- optional `caption`
- `mediaRefs`
- `actionRefs`
- `tags`
- `collectionRefs`
- `safety` as `internal-fixture` or `public-safe`
- created/updated metadata

The library is intentionally reference-based. It uses existing spatial media and action ids and does not embed uploads, media blobs, copied geometry, raw source models, signed URLs, or expiring URLs.

Supported piece types:

- `image`
- `video`
- `audio`
- `text`
- `link`
- `product`
- `event`
- `flyer`
- `archive-item`
- `gallery`
- `collection`

The broader model still has `garment`; this pass does not expose it in the internal Piece Library panel because host compatibility for garment-specific behavior remains rack-oriented and outside this source-binding slice.

## What It Does Not Support

- No production upload pipeline.
- No backend persistence.
- No file/blob storage.
- No public route changes.
- No publish flow.
- No auth or tenant changes.
- No commerce, payment, booking, or order behavior.
- No audio/video playback claim.
- No component admission or creative acceptance claim.

## Host Compatibility Matrix

| Host | Accepted piece types | Notes |
|---|---|---|
| `presence.framed-media@1.0.0` / `presence.piece-plane@1.0.0` | image, text, link, archive-item, flyer | Framed/static work proof. |
| `presence.projection-wall@1.0.0` | image, video, gallery, collection | Uses projection/piece-plane binding path. |
| `presence.archive-wall@1.0.0` | archive-item, image, text, flyer, event, link, gallery, collection | Ordered archive rows with fallback. |
| `presence.listening-station@1.0.0` | audio, link, text | Preserves listen/open-link fallback only; no playback claim. |
| `presence.spherical-gallery@1.0.0` | image, video, text, link, gallery, collection | Uses spherical arrangement and semantic fallback. |

Incompatible host/type bindings are rejected before draft mutation, preserving the last valid layout.

## Authoring Flow

The internal arranger now includes a Piece Library panel where an operator can:

- view available internal pieces
- create a new internal piece from title/type/caption/media/action fields
- select a library piece
- inspect selected-host supported piece types
- bind the selected piece into the selected compatible host
- see rejected unsafe/incompatible mutations in diagnostics
- save and reload the browser-local draft

The previous direct fixture-media binding controls remain for continuity, but the Piece Library is the reusable owner-like source path.

## Saved JSON / Payload

Measured sample:

- piece library records: 24
- content bindings: 21
- stored derived `binding-*` placements: 0
- spherical total bindings in measured sample: 20
- generated binding semantic rows: 21
- layout JSON: 24,012 bytes

Saved layouts carry:

- `pieceLibrary`
- `contentBindings`
- `contentArrangement`
- media ids
- action ids

They do not carry raw blobs, `data:` URLs, raw `.glb` / `.gltf` source paths, signed URLs, expiring URLs, or per-piece derived transforms.

## Fallback Behaviour

Semantic fallback rows now include piece type in the description, for example `Piece type: audio.` or `Piece type: video.`. Link-like actions remain available as accessible links:

- `open-link`
- `listen`
- `watch`
- `enquire`

Audio and video pieces degrade honestly to fallback cards and action links when rendering or playback is unavailable. This pass does not implement playback.

## Screenshot

Evidence screenshot:

- `docs/program/evidence/presence-spatial-object-model-shift/screenshots/18-internal-piece-library-binding.png`

The screenshot captures the internal arranger after creating and binding library pieces into Framed Work, Listening Station, and Spherical Gallery, then switching to mobile semantic fallback with the created action links still available.

## Tests Run

Baseline before edits:

- `git status --short --branch`
- `npm run test:spatial` - passed, 145/145
- `npm run test:spatial-assets` - passed, 30/30
- `npx tsc --noEmit` - passed
- `npm run build` - passed with existing Next multiple-lockfile/root warning

Implementation validation:

- `npm run test:spatial` - passed, 148/148
- `npx tsc --noEmit` - passed
- `npx playwright test tests/e2e/presence-spatial-object-model.spec.ts --project=chromium --retries=0 --grep "piece library"` - passed, 1/1 with clean exit
- `PRESENCE_CAPTURE_SPATIAL_EVIDENCE=1` focused Piece Library capture run printed the test as `ok`, wrote the screenshot, then hit the already documented Windows Playwright webServer teardown hang and was interrupted

Final validation is recorded in the task closeout.

## Rollback Notes

Rollback is bounded:

- remove `SpatialPieceLibraryItem` and `pieceLibrary` schema/validation support
- remove `piece-library:` logical refs
- remove Piece Library creation/binding helpers from `arranger.ts`
- remove the internal arranger Piece Library panel
- remove focused model/E2E assertions and this evidence note/screenshot

This returns the binding flow to direct fixture-media refs without touching public/auth/backend/publish behavior.
