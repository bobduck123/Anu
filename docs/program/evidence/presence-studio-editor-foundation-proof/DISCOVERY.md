# Presence Studio Editor Foundation Discovery

Date: 2026-05-23

## Scope

This pass inspected the backend and frontend contract surfaces that control
Presence Rooms, with emphasis on GGM and owner-only Studio editing.

Inspected areas:

- Backend Presence models: `PresenceNode`, `PresenceWork`, `PresenceCollection`,
  `PresenceService`, `PresenceEnquiry`, `PresencePass`, `RoomKey`,
  `Encounter`, analytics events, and control audit events.
- Public API: `/api/presence/public/<slug>`, public works/collections,
  enquiry submission, RoomKey resolution.
- Owner APIs: `/api/presence/owner/nodes/*`,
  `/api/presence/owner/rooms/*`, passes, keys, analytics, field notes,
  mood boards, paths.
- Existing Studio/frontend API clients and routes under
  `frontend-next/src/lib/api/presenceOwner.ts`,
  `frontend-next/src/lib/api/presence.ts`, and
  `frontend-next/src/components/presence/*`.
- Asset/media handling via owner media upload and `presence_media_storage.py`.
- Existing metadata/DNA persistence in `PresenceNode.node_metadata`.
- GGM evidence:
  - `docs/program/evidence/presence-ggm-faithful-recreation-proof/`
  - `docs/program/evidence/presence-ggm-hosted-cutover-proof/`
  - `docs/program/evidence/presence-first-pilot-ggm-onboarding-proof/`
  - `docs/program/evidence/presence-e4hatu-auth-repair-proof/`

`presence-ggm-v4-hosted-proof` was not present; the hosted cutover evidence
directory is `presence-ggm-hosted-cutover-proof`.

## Current Data Model

`PresenceNode` is the Room row. It already stores owner linkage, public state,
display mode, room type, theme preset, accent color, typography/spacing config,
profile/cover/hero media URLs, public copy, enquiry routing, landing content,
practice/curatorial statements, public contact fields, SEO, and
`node_metadata`.

`PresenceWork` stores artwork/work rows with title, year, medium, dimensions,
description, image/thumbnail/gallery URLs, sort order, visibility, and notes.
`PresenceCollection`, `PresenceService`, proof/credential/procurement rows,
NFC tags, passes, RoomKeys, encounters, connections, analytics, and enquiries
already exist.

`node_metadata.custom_presence` already carries GGM renderer activation
signals such as `custom_renderer_key`, `renderer_key`, and public style DNA.
The public serializer redacts internal metadata and exposes only whitelisted
custom presence fields.

## What Was Already Editable

Owners could already edit:

- Basic Room fields: display name, headline, bio, hero/copy fields, CTA,
  availability, landing copy, location, SEO, media embeds.
- Presence DNA and metadata, through the owner node PATCH allowlist.
- Images through owner media upload for profile, cover, landing, work image,
  and collection cover slots.
- Works, collections, services, enquiries, NFC tags, passes, RoomKeys,
  analytics, field notes, mood boards, and generated paths.

## What Was Hard-coded or Implicit

For GGM, the public renderer still depended heavily on frontend-local source
modules and component constants:

- GGM artist identity, hero sequence, work inventory, inspire board, strands,
  and contact posture live in `presence-app/lib/presence/ggm/source.ts`.
- Motion defaults for liquid morphology, dither, film grain, blur, parallax,
  custom cursor, and heavy-motion are local React context defaults.
- Scene order and scene labels are fixed in `GgmFaithfulRoom.tsx`.
- Artwork field, work wall, practice studio, calling card, RoomKey chip copy,
  and external source-profile link are mostly renderer code or fallback data.
- The owner Studio did not have a versioned draft/publish/rollback model for
  these renderer-level controls.

## GGM Needs Exposed

The owner Studio needs editable control over:

- Scene structure and order: Artwork Field, Work Wall, Practice Studio,
  Calling Card.
- Scene titles, subtitles, statements, intro copy, action labels, and RoomKey
  provenance copy.
- Artwork inventory, ordering, selected/default work, captions, years,
  materials, dimensions, detail behavior, and visibility posture.
- About/practice biography, artist statement, process notes, timeline/strand
  cards, and optional note cards.
- Calling-card contact copy, enquiry CTA, external links, availability/status,
  and contact posture without exposing private owner/operator emails.
- Palette, paper/ink tokens, frame treatment, typography tokens, texture
  tokens, spacing rhythm, and artwork treatment.
- Liquid transition, morph speed, distortion, dither, film grain, blur,
  parallax, custom cursor, heavy motion, and reduced-motion fallback.
- RoomKey entry label, provenance chip text, guest/invalid/revoked safe copy,
  and Save/Add-to-Garden visibility.
- Public assets, alt text, thumbnails, and texture assets.
- Draft/published state, preview, history, and rollback.

## Existing Metadata Reuse

Safe reuse:

- `PresenceNode.node_metadata.custom_presence` remains the legacy/activation
  bridge for custom renderer metadata.
- Current `PresenceNode` copy/media fields can seed an editor draft.
- `PresenceWork` can seed artwork list, ordering, captions, and image slots.
- Existing RoomKey/Pass tables remain the entry mechanism.
- Existing ControlAuditEvent can audit platform-admin support access.

Not safe as the whole solution:

- `node_metadata` alone cannot represent one active draft, one active
  published config, rollback history, or editor audit metadata without
  destructive or ambiguous updates.
- Public metadata redaction was not enough to support draft/publish isolation.

## New Model/API Support Needed

This pass adds a dedicated additive model:

`PresenceEditableConfig`

It stores one versioned editable config per Room version with status
`draft`, `published`, or `archived`, plus separate JSON sections for scene,
style DNA, motion, assets, content, RoomKey, enquiry, and locked fields.

The owner API surface is added under the existing owner Room route family:

- `GET /api/presence/owner/rooms/<room_id>/editor`
- `GET /api/presence/owner/rooms/<room_id>/editor/draft`
- `POST /api/presence/owner/rooms/<room_id>/editor/draft`
- `PATCH /api/presence/owner/rooms/<room_id>/editor/draft`
- `POST /api/presence/owner/rooms/<room_id>/editor/preview`
- `POST /api/presence/owner/rooms/<room_id>/editor/publish`
- `POST /api/presence/owner/rooms/<room_id>/editor/rollback`
- `GET /api/presence/owner/rooms/<room_id>/editor/history`
- `GET /api/presence/owner/rooms/<room_id>/assets`
- `POST /api/presence/owner/rooms/<room_id>/assets/attach`

The public serializer now emits only the active published editable config.
Draft config, audit metadata, owner identifiers, local paths, raw secrets,
private emails, platform-admin markers, and internal-lifetime flags are
redacted from public responses.
