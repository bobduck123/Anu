# Presence Ecosystem Alpha Spec

**Launch strategy: Creative Portfolio-Led.**

The launch wedge is creative portfolio pages first — artist, gallery, studio, practitioner, organisation, and venue — delivering maximum visual impact with minimal operational complexity. Professional contract and tradie/field-service modules remain as alpha foundations for later expansion.

## Implemented Alpha

- Public canonical route: `/p/<slug>` via Next.js and `/api/presence/public/<slug>` via Flask.
- Public detail routes: `/p/<slug>/works/<workId>` and `/p/<slug>/collections/<collectionId>` via Next.js, backed by public-safe Flask endpoints.
- Owner app/PWA route family: `/app`, `/app/dashboard`, `/app/presence`, `/app/portfolio`, `/app/works`, `/app/collections`, `/app/enquiries`, `/app/qr-nfc`, `/app/analytics`, `/app/settings`.
- Owner API boundary: `/api/presence/owner/*`, authenticated by the participant/Supabase JWT path and scoped to owned nodes or platform admin override.
- Control routes: `/control/presence`, `/control/presence/new`, `/control/presence/<id>`, `/control/presence/<id>/edit`, `/control/presence/<id>/enquiries`, `/control/presence/templates`.
- Core create, edit, publish, unpublish, suspend/archive, public view, enquiry, QR, vCard, share, and analytics flows.
- Artist/gallery support: landing portal, practice statement, curatorial statement, collections, selected works.
- Professional contract support: capability statement, proof ledger, procurement profile, offer cards, deal-intake-ready enquiry *(alpha foundation)*.
- Tradie/field-service support: quote request, licences/credentials, NFC source tracking, relationship ledger, quote/variation/invoice-support/handover foundations *(alpha foundation)*.
- Organisation/venue rendering with gallery, services/programs, enquiry, and directory/map/archive/white-label readiness flags.

## Display Modes

### Portfolio-First (Launch Priority)

- `profile_card` / `showcase`: showcase/start profile with links, enquiry, QR, vCard, SEO.
- `portfolio_presence_kit`: flagship creative portfolio with works, collections, practice/curatorial statements, and enquiry.
- `signature_artist`: cinematic, warm artist presence built around identity, story, selected works, and contact.
- `editorial_portfolio`: clean, text-forward editorial portfolio for photographers, writers, designers, and visual storytellers.
- `studio_practice`: studio-first portfolio for painters, sculptors, and multidisciplinary artists with deep practice and exhibition history.
- `artist_gallery` / `gallery_portal`: gallery microsite with statements, collections, works, contact.
- `minimal_portal`: atmospheric landing portal with Enter gateway into gallery/profile content.
- `practitioner_profile`: service/practice profile with enquiry and availability.
- `premium_profile` / `opportunity_profile`: rich profile with services, sections, portfolio, analytics.
- `venue_profile` / `organisation_profile`: public place/organisation identity with programs/services, gallery, enquiry.
- `white_label_network_entry`: tenant/network-ready public entry.

### Alpha Foundations (Not Launch Priority)

- `professional_contract`: consultant/fractional executive profile with capability, proof ledger, procurement fields.
- `tradie_profile` / `field_service_profile`: trade profile with quote request, proof, licences, NFC, field-service foundations.

## Templates Seeded (17 total)

### Portfolio-First Templates

- **Portfolio Presence Kit** — flagship creative portfolio; `portfolio_presence_kit`; collections, works, statements, enquiry.
- **Signature Artist / Creative Presence** — cinematic artist identity; `signature_artist`; landing portal, selected works, enquiry.
- **Editorial Portfolio** — text-forward editorial; `editorial_portfolio`; portfolio, collections, services, enquiry.
- **Studio Practice** — deep studio/exhibition presence; `studio_practice`; landing portal, collections, exhibition history, enquiry.
- **Gallery-First Artist Presence** — boutique gallery microsite; `artist_gallery`; statements, collections, works.
- **Minimal Artist Portal** — atmospheric entry screen; `minimal_portal`; landing portal, statement, selected works.
- **Creative Portfolio Presence** — visual portfolio for makers and studios; `premium_profile`.
- **Premium Practitioner Profile** — warm practitioner with services, availability, credentials; `practitioner_profile`.
- **Mudyin Practitioner/Affiliate** — Mudyin-ready with cultural care; `practitioner_profile`.
- **Organisation / Cultural Centre Profile** — trust-forward org with mission, programs, gallery; `organisation_profile`.
- **Venue / Place Profile** — place profile for venues and community rooms; `venue_profile`.

### General / Starter Templates

- **Showcase Profile** — starter showcase with links, QR, vCard, SEO; `profile_card`.
- **Basic Profile Card** — polished digital card; `profile_card`.
- **Presence Opportunity Kit** — first paid tier with services, proof, readiness; `opportunity_profile`.

### Alpha Foundation Templates (Not Launch Priority)

- **Professional Contract Presence** — procurement-ready consultant; `professional_contract`.
- **Consultant / Fractional Executive Presence** — executive advisory; `professional_contract`.
- **Tradie / Field Service Presence** — trust-forward trade profile; `tradie_profile`.

## Security Boundaries

Public serializers expose:
- display content (name, bio, statements, services, works, collections, proof items, credentials, portfolio items, links, availability chips)
- public contact fields (public_email, public_phone)
- procurement public summary (business_name, regions, rate label, insurance status, NDA flag, payment terms)

Public serializers **never** expose:
- `connections` / relationship ledger
- `quotes`, `variations`, `invoice_support_records`, `handovers`
- `nfc_tags`
- `procurement_contact_email`, `abn_acn_or_registration`, `compliance_notes`
- `owner_user_id`, `tenant_id` (admin only)
- `organisation_id` (admin only)

## Alpha Limitations

- No native payments, booking engine, accounting sync, CRM automation, or marketplace workflow.
- QR is generated with `qrcode==8.2` as scanner-grade SVG, with a logged non-scanner fallback only if the dependency is unavailable.
- Native media upload is deferred. Alpha uses validated hosted image URLs with preview and fallback handling.
- Invoice support stores external invoice references only.
- Quote/variation/handover records are foundations, not full field-service management.
- Professional and tradie modules are alpha foundations; no deep field-service management in launch.
- Remaining pilot work is real media/copy, final screenshot QA, and hosted smoke once credentials are available.
