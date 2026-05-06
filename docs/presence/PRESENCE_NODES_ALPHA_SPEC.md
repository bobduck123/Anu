# Presence Nodes Alpha Spec

## Purpose

Presence Nodes are premium, mobile-first public network objects for digital business cards, portfolios, service discovery, and structured enquiry capture. The alpha implements the foundation inside the existing ANU / Flora_fauna platform without adding marketplace, booking, payment, or directory complexity.

## Implemented Surfaces

- Public canonical route: `/p/<slug>`
- Public backend API: `/api/presence/public/<slug>`
- Control backend API: `/api/control/presence/*`
- Control frontend routes:
  - `/control/presence`
  - `/control/presence/new`
  - `/control/presence/:id`
  - `/control/presence/:id/edit`
  - `/control/presence/:id/enquiries`
  - `/control/presence/templates`
  - `/control/organisations/:id/presence`

## Alpha Capabilities

- Admin/control users can create, edit, publish, unpublish, suspend, archive, and list Presence Nodes.
- Published public and unlisted nodes render at `/p/<slug>`.
- Draft, unpublished, suspended, archived, private, private-admin-only, and admin-only nodes return not found publicly.
- Public visitors can submit structured enquiries with validation, consent, honeypot, and rate limiting.
- Control users can view enquiries and update enquiry status.
- Nodes include templates, display modes, links, services, portfolio items, selected works, collections, availability chips, practice and curatorial statements, profile media, organisation badge, location/service area, share, vCard, QR display, metadata, and lightweight analytics.
- The public renderer switches by `display_mode`: `profile_card`, `premium_profile`, `practitioner_profile`, `artist_gallery`, `minimal_portal`, `gallery_portal`, `venue_profile`, `organisation_profile`, and `white_label_network_entry`.
- Artist and portal display modes render as boutique gallery/microsite pages with sparse editorial layout, selected works, collections, and statement sections.
- Control editing supports portal settings, statements, readiness flags, selected works, collections, and JSON-backed business function toggles.
- Tenant isolation uses the existing `Node` model as the tenancy boundary.

## Templates And Tiers

Seeded alpha templates:

- Basic Profile Card
- Premium Practitioner Profile
- Minimal Artist Portal
- Gallery-First Artist Presence
- Creative Portfolio Presence
- Organisation / Cultural Centre Profile
- Venue / Place Profile
- Mudyin Practitioner/Affiliate

Supported tier values:

- `basic`
- `premium`
- `artist_presence`
- `organisation_venue`
- `white_label_network`

Readiness flags on each node prepare future directory, map, archive, marketplace, and white-label routing without building those full systems in alpha.

## Known Alpha Limits

- `organisation_id` currently maps to the same numeric namespace as tenant `Node` IDs until a dedicated organisation model lands.
- QR output is backend-generated SVG for alpha display; before broad public launch, replace it with a standards-compliant QR encoder dependency and scanner acceptance proof.
- No payments, bookings, directory ranking, map placement, or marketplace workflow is included.
