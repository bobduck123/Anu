# GGM Editable Config Mapping

Date: 2026-05-23

Renderer key: `ggm-faithful-room-v1`

This document maps the current GGM faithful renderer into the new editable
Presence config schema. The purpose is not to redesign the public Room. The
purpose is to make the public Room controllable by the owner Studio through a
safe draft/publish/rollback contract.

## Scene Config

### 1. Artwork Field

Editable fields:

- `scene_config.scenes[].id = artwork_field`
- `label`
- `title`
- `subtitle`
- `statement`
- `primary_artwork_slug`
- `hero_sequence`
- `intro_copy`
- `action_labels.primary`
- `action_labels.work_advance`
- `roomkey_provenance_text`

Renderer source today:

- Scene label and order are fixed in `GgmFaithfulRoom.tsx`.
- Hero sequence falls back to `GGM_HERO_SEQUENCE`.
- Copy falls back to `PresenceNode` fields and `GGM_ARTIST`.

Studio contract:

- Owner can reorder hero works and change the title/subtitle/intro/action
  labels without changing renderer code.
- The renderer shell and shader contract remain a locked commissioned shell
  field with reason recorded in `locked_fields.renderer_shell`.

### 2. Work Wall

Editable fields:

- `artwork_order`
- `selected_work_slug`
- `caption_mode`
- `work_detail_behaviour`
- Per-work title, year, medium, dimensions, caption, description, context,
  process, memory, mood tags, image URL, thumbnail URL, sort order.

Renderer source today:

- Work wall uses backend works if present and falls back to `GGM_WORKS`.
- Source ordering and captions are frontend-local fallback data.

Studio contract:

- Studio uses `PresenceWork` plus `content_config.works` and
  `asset_config.artworks` to drive owner-controlled ordering and presentation.

### 3. Practice Studio

Editable fields:

- `about_title`
- `biography`
- `artist_statement`
- `process_notes`
- `studio_fragments`
- `timeline`
- `strands`
- `inspire_cards`
- `note_cards_enabled`

Renderer source today:

- About/practice content falls back to `GGM_ARTIST`, `GGM_STRANDS`, and
  `GGM_INSPIRE`.

Studio contract:

- Owner can edit biography, statement, timeline, strand cards, and inspire
  board content in `content_config.about` and `content_config.practice`.

### 4. Calling Card

Editable fields:

- `contact_title`
- `contact_copy`
- `enquiry_cta`
- `external_links`
- `contact_posture`
- `availability_status`
- `safe_contact_note`

Renderer source today:

- Calling card uses `GgmCallingCard`, `GGM_ARTIST`, and `PublicEnquiryDialog`.

Studio contract:

- Public contact should prefer Presence enquiry capture and public links.
- Private owner/operator emails are never required in public config and are
  redacted if accidentally submitted.

## Motion Config

Editable fields:

- `liquid_style`: `ripple`, `glass`, `dissolve`, `cut`
- `liquid_intensity`: 0..1
- `morph_speed_ms`: 400..2400
- `distortion_scale`: 0..1
- `dither_strength`: 0..1
- `film_grain_strength`: 0..1
- `blur_amount`: 0..1
- `transition_style`
- `scene_transition_duration_ms`
- `parallax_depth`
- `custom_cursor_enabled`
- `heavy_motion_enabled`
- `reduced_motion_fallback`

Renderer source today:

- Defaults live in `GgmMotionContext.tsx`.
- Settings were localStorage-only and not persisted as owner-controlled Room
  config.

Studio contract:

- Owner draft/published config becomes the durable source for these knobs.
- Reduced-motion fallback remains mandatory and should not be removable.

## Style DNA

Editable fields:

- `palette.bg = #f4f4f4`
- `palette.paper = #eceae7`
- `palette.ink = #111111`
- `palette.muted = #6a6a6a`
- `palette.line = rgba(0, 0, 0, 0.12)`
- `palette.accent = #ffffff`
- `background_treatment`
- `frame_treatment`
- `typography.heading_stack`
- `typography.body_stack`
- `typography.heading_weight`
- `typography.heading_tracking`
- `texture_tokens`
- `spacing.scene_padding`
- `spacing.max_width`
- `artwork_treatment`

Renderer source today:

- Palette, paper treatment, typography behavior, and motion atmosphere are
  encoded in CSS and renderer components.

Studio contract:

- Owner can edit safe tokens while the commissioned renderer protects unsafe
  implementation details.

## RoomKey Config

Editable fields:

- `entry_label`
- `provenance_chip_text`
- `guest_entry_copy`
- `invalid_copy`
- `revoked_copy`
- `paused_copy`
- `show_save_to_garden`

Renderer source today:

- RoomKey entry dispatch adds GGM-specific state after token resolution.

Studio contract:

- RoomKey continues to resolve through published public config only.
- Draft config is only available in authenticated owner preview context.

## Asset Config

Editable fields:

- `hero_image`
- `portrait_image`
- `artworks[]`
- `thumbnails[]`
- `texture_assets[]`
- `social_preview`
- `alt_text`
- `visibility`
- `status`

Renderer source today:

- Assets live under `/ggm/works`, `/ggm/thumbs`, and `/ggm/portrait`.
- Source-local filesystem paths are documented in evidence but are not public
  runtime data.

Studio contract:

- Public asset URLs may be relative public asset paths or public `http(s)`
  URLs.
- Local filesystem paths, `file:`, `data:`, localhost, internal hosts, and
  script URLs are rejected.

## Public Redaction

Public API may include:

- `renderer_key`
- published `scene_config`
- safe `style_dna`
- safe `motion_config`
- public `asset_config`
- public `content_config`
- public `enquiry_config`
- published `roomkey_config`

Public API must not include:

- Draft config
- Owner email
- Platform-admin markers
- Internal lifetime entitlement markers
- Local filesystem paths
- Raw secrets or tokens
- Audit metadata
- Auth subject identifiers
- Private notes
- Unpublished assets
- Presence World internals

## Locked Fields

`locked_fields.renderer_shell` is used for the GGM commissioned renderer shell:

Reason:

`Commissioned renderer chrome and shader contract; owner controls content,
asset, style-token, motion-token, RoomKey, and enquiry configuration through
PresenceEditableConfig.`

This preserves the product principle: visible behavior is editable unless it
is explicitly locked with a reason or system-controlled.
