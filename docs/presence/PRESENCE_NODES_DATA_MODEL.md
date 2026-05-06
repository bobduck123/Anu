# Presence Nodes Data Model

Migration:

- `flora-fauna/backend/migrations/versions/20260505_presence_nodes_alpha.sql`

Models:

- `PresenceNode`
- `PresenceNodeSection`
- `PresenceCollection`
- `PresenceWork`
- `PresenceLink`
- `PresenceService`
- `PresencePortfolioItem`
- `PresenceAvailabilityChip`
- `PresenceBusinessFunction`
- `PresenceEnquiry`
- `PresenceTemplate`
- `PresenceAnalyticsEvent`

## Tenancy

- `PresenceNode.tenant_id` references the existing `Node` table.
- `PresenceNode.owner_user_id` references `User`.
- `organisation_id` is nullable and intentionally loose for alpha, ready to bind to a future organisation model.
- Enquiries copy `tenant_id` and `organisation_id` from their source node for durable scoping and filtering.

## Statuses

Node statuses:

- `draft`
- `pending_review`
- `published`
- `unpublished`
- `suspended`
- `archived`

Visibility:

- `public`
- `unlisted`
- `private`
- `admin-only`
- `private_admin_only`

Public route serves only `published` nodes with `visibility=public` or `visibility=unlisted`.

Display modes:

- `profile_card`
- `premium_profile`
- `artist_gallery`
- `minimal_portal`
- `gallery_portal`
- `practitioner_profile`
- `venue_profile`
- `organisation_profile`
- `white_label_network_entry`

Plan/tier values:

- `basic`
- `premium`
- `artist_presence`
- `organisation_venue`
- `white_label_network`

Enquiry statuses:

- `new`
- `read`
- `replied`
- `converted`
- `archived`
- `spam`
- `deleted`

## Artist And Gallery Structure

`PresenceCollection` groups selected works and stores `title`, `description`, `cover_image_url`, `sort_order`, and visibility.

`PresenceWork` stores artwork/project metadata:

- `collection_id`
- `slug`
- `title`
- `year`
- `medium`
- `dimensions`
- `description`
- `image_url`
- `thumbnail_url`
- `gallery_images`
- `external_url`
- `availability_status`
- `price_label`
- `exhibition_history`
- `notes`
- `sort_order`
- `is_visible`

`PresenceNode` carries boutique and future-network fields:

- display/tier: `display_mode`, `plan_type`, `visual_mood`
- visual configuration: `theme_config`, `custom_typography_config`, `custom_spacing_config`
- landing portal: `landing_enabled`, `landing_title`, `landing_subtitle`, `landing_background_url`, `landing_enter_label`
- statements: `practice_statement`, `curatorial_statement`
- readiness: `business_functions_enabled`, `directory_ready`, `map_ready`, `archive_ready`, `marketplace_ready`, `white_label_ready`

`PresenceBusinessFunction` is an alpha feature-flag table for advanced enquiry routing, analytics, services, testimonials, credentials, booking/donation links, team nodes, organisation affiliation, directory/map/archive linkage, and marketplace readiness.

## Seed Data

Run:

```bash
flask seed-presence
```

Or set `ALPHA_SEED=true` in local/dev bootstraps. Seed data creates:

- Mudyin Healing Centre
- Healing practitioner
- Artist/gallery node
- Minimal artist portal node
- Venue/place
- Founder/consultant
