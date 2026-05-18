# Presence Rooms v1

Presence Rooms v1 is an additive upgrade over Presence Nodes. A Presence Node remains the structured identity record: slug, public profile data, portfolio, links, QR, vCard, SEO metadata, owner Studio editing, enquiry storage, and future map/directory/archive flags. A Presence Room adds a controlled room model and expressive renderer so the public page feels like a shareable digital place rather than a flat profile.

The product line is: Your work deserves more than a profile. Give it a room.

## Room Types

- `minimal_card`: elegant, fast, credible room for consultants, freelancers, tradies, and solo professionals.
- `artist_studio`: visual room for artists, photographers, makers, tattooists, stylists, and designers.
- `practitioner`: warm, trustworthy room for healers, coaches, mentors, facilitators, and wellness workers.
- `performer_music`: media-rich room for DJs, musicians, performers, podcasters, and speakers.
- `organisation`: trust-forward room for community organisations, cultural centres, venues, collectives, programs, and small NGOs.

All room types share one structured model and use conditional sections. Empty optional sections are not rendered.

## Theme Presets

Controlled presets:

- `clean_light`
- `editorial_dark`
- `warm_earth`
- `gallery_white`
- `neon_night`
- `soft_healing`
- `cultural_org`
- `minimal_mono`

`accent_color` accepts a validated hex colour. Presence Rooms do not accept arbitrary custom CSS.

## Data Model

PresenceNode now supports:

- `room_type`, `theme_preset`, `accent_color`
- `public_status`
- `hero_title`, `hero_subtitle`, `hero_image_url`
- `short_bio`, `long_story`
- `enquiry_email`, `availability_status`, `featured_notice`
- `media_embeds`
- `seo_title`, `seo_description`, `social_preview_image_url`

Existing fields continue to carry room content:

- `display_name`, `slug`, `headline`, `bio`, `location_label`
- `primary_cta_label`, `primary_cta_url`
- `services`, `works`, `portfolio_items`, `collections`, `links`
- `proof_items`, `credentials`
- `map_ready`, `directory_ready`, `archive_ready`, `white_label_ready`

PresenceEnquiry now records:

- `source_room_slug`
- `routed_to_email`
- `delivery_status`

Controlled values:

- `room_type`: `minimal_card`, `artist_studio`, `practitioner`, `performer_music`, `organisation`
- `public_status`: `draft`, `private`, `public`

## Public Rendering

The preferred public route is:

- `/presence/[slug]`

The legacy Presence Node route remains supported for backward compatibility:

- `/p/[slug]`

The frontend keeps backward compatibility by rendering the room layer only when `room_type` is set. Legacy Presence Nodes still use the existing `PortfolioRenderer` branches.

Public rendering includes:

- room-type template selection
- controlled theme variables and accent colour
- conditional sections for front door, wall, desk, shelf, noticeboard, portal, and guestbook-style proof
- QR and vCard actions through existing backend endpoints
- share/copy support
- canonical URL metadata pointing to `/presence/[slug]`
- Open Graph metadata
- JSON-LD structured data

Public lookup enforces `public_status` and legacy status/visibility rules. Draft, private, suspended, and archived nodes are not exposed. Unlisted nodes can be direct-slug reachable but remain out of public listings. QR, vCard, share, Open Graph, and JSON-LD URLs use `/presence/[slug]` as canonical.

## Admin Workflow

Authorized owners/admins use the existing Studio route:

- `/studio/[id]/portfolio`

The editor supports:

- room type
- theme preset
- accent colour
- hero title, subtitle, image
- short bio and long story
- featured notice
- availability status
- enquiry inbox
- media embeds as validated JSON
- SEO title, description, and social preview image
- preview link

Publishing remains in:

- `/studio/[id]/settings`

Settings shows publication status, public status, room type, theme, public URL, and enquiry routing destination. Owner edits remain behind existing auth and ownership checks.

## Enquiry Routing

Public room enquiries use the existing endpoint:

- `POST /api/presence/public/<slug>/enquiries`

Required fields:

- `name`
- `message`
- `consent`
- at least the contact route required by `preferred_contact_method`

Supported optional fields include:

- `email`
- `phone`
- `contact_handle`
- `enquiry_type`
- `source_url`
- `source_type`

Spam protection:

- `website` is a honeypot field. Non-empty values are rejected.
- too-fast submissions using `form_started_at` are rejected.

Routing order:

1. room `enquiry_email`
2. node `public_email`
3. owner user email

Delivery status meanings:

- `sent`: email delivery was attempted and reported as sent.
- `logged_fallback`: no mail credentials were configured, so the enquiry was stored, routed destination was recorded, and a safe fallback log was emitted.
- `unrouted`: no valid room, public, or owner email was available; the enquiry remains in Studio but no outbound email route exists.
- `failed`: mail credentials were present, but the send attempt failed; internal error detail is logged server-side only.

If email credentials are configured, the backend sends mail and stores `delivery_status = sent`. If credentials are absent, it stores the enquiry, records `routed_to_email`, marks `delivery_status = logged_fallback`, logs the fallback, and returns a user-safe received response. If delivery fails after configuration, it marks `delivery_status = failed` and returns a user-safe failure message.

Production email env vars:

- `MAIL_SERVER`
- `MAIL_PORT`
- `MAIL_USE_TLS`
- `MAIL_USE_SSL`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- optional `MAIL_SENDER_NAME`

## Demo Seed Rooms

`seed_presence_demo_data()` creates five sales/demo rooms:

- `rooms-independent-artist`: artist studio
- `rooms-healing-practitioner`: practitioner
- `rooms-dj-performer`: performer/music
- `rooms-consultant`: minimal card
- `rooms-community-organisation`: organisation, with map/directory/archive/white-label readiness flags

Run the repo's existing seed command for the backend environment, then visit:

```bash
cd flora-fauna/backend
python -m flask --app app seed-presence
```

For local alpha/dev startup, setting `ALPHA_SEED=true` also seeds these rooms during backend initialization.

Primary demo URLs:

- `/presence/rooms-independent-artist`
- `/presence/rooms-healing-practitioner`
- `/presence/rooms-dj-performer`
- `/presence/rooms-consultant`
- `/presence/rooms-community-organisation`

Legacy URLs remain available:

- `/p/rooms-independent-artist`
- `/p/rooms-healing-practitioner`
- `/p/rooms-dj-performer`
- `/p/rooms-consultant`
- `/p/rooms-community-organisation`

## Tests And Smoke

Backend:

```bash
cd flora-fauna/backend
python -m pytest tests/test_presence_nodes.py -q
```

Frontend:

```bash
cd presence-app
cmd /c npm run typecheck
cmd /c npm run build
```

Smoke:

```bash
python scripts/presence_rooms_v1_smoke.py
```

Set:

- `PRESENCE_ROOMS_SMOKE_API_BASE`: defaults to `http://localhost:5000`
- `PRESENCE_ROOMS_SMOKE_WEB_BASE`: defaults to `http://localhost:3001`
- `PRESENCE_SMOKE_CONTROL_TOKEN`: optional; enables authenticated draft/private fixture checks
- `PRESENCE_SMOKE_CONTROL_SECRET`: optional control-plane shared secret
- `PRESENCE_SMOKE_CONTROL_HOST`: optional Host header for hosted control-plane checks
- `PRESENCE_SMOKE_TENANT_ID`: required only when creating draft/private fixture checks
- `PRESENCE_ROOMS_SMOKE_SKIP_UNAVAILABLE=1`: explicit dependency skip mode for environments where local backend/frontend are unavailable

The smoke script checks:

- all five `/presence/[slug]` demo pages return 200 and contain the expected display names
- legacy `/p/[slug]` still renders for at least one demo room
- public API canonical URLs point to `/presence/[slug]`
- valid enquiries are accepted and return an honest `delivery_status`
- invalid and honeypot submissions are rejected
- draft/private rooms are hidden when optional control auth is provided

## Known Limitations

- Media embed editing is a validated JSON field in Studio, not a visual embed builder.
- Guestbook is curated proof/testimonials only. There are no open public comments.
- There is no drag-and-drop layout builder.
- Room-specific frontend E2E tests are covered by smoke and type/build checks; no separate frontend test runner exists in `presence-app`.
- Production email delivery depends on Flask-Mail credentials being configured.
- Production-like email routing must be verified with real SMTP credentials before open launch.
- Browser visual QA should be repeated against the deployed frontend after environment variables and seed data are confirmed.

## Launch Checklist

- Apply the Presence Rooms migration in production.
- Seed or create the five demo rooms in the target environment.
- Confirm `FRONTEND_BASE_URL` or `PRESENCE_PUBLIC_ORIGIN` points to the production frontend origin.
- Configure production mail env vars and submit a real room enquiry.
- Run backend tests, frontend typecheck/build, and `scripts/presence_rooms_v1_smoke.py`.
- Check `/presence/[slug]`, `/p/[slug]`, QR, vCard, share, Open Graph, and canonical metadata for all five demo rooms.
- Confirm Studio owners can edit room setup, public status, content JSON fields, enquiry inbox, SEO, and preview links.

## Roadmap

- Richer Studio editors for works, proof, credentials, and embeds.
- Template-specific preview thumbnails.
- White-label organisation room presets.
- Optional typed media-kit fields for performers.
- Map/directory/archive surfaces that consume the readiness flags.
- Visual regression coverage for the five room templates.
