# Presence Ecosystem QA Acceptance

## Backend Acceptance

- Create, edit, publish, unpublish Presence Nodes.
- Public published nodes visible; draft/unpublished/suspended/archived/private nodes hidden.
- Slug uniqueness enforced.
- Tenant scope, organisation scope, owner access, admin access, and unauthorised blocking covered by tests.
- Enquiry submission and enquiry status update covered.
- Template fetch covered.
- Analytics, vCard, and QR routes covered.
- Owner `/api/presence/owner/*` routes are authenticated and scoped to owned nodes.
- Public work and collection detail endpoints are public-safe and hide unpublished or invisible records.
- Professional contract nodes persist capability, proof items, and procurement profile.
- Tradie nodes persist credentials, NFC tags, relationship ledger, quote, variation, invoice support, and handover foundations.
- NFC hit records anonymous interaction and does not create named contact.
- Quote request creates named connection only after submitted contact details.

## Frontend Acceptance

- Public renderers cover showcase/profile, opportunity, professional contract, artist/gallery, minimal portal, practitioner, tradie, organisation/venue.
- Enquiry form validation and success state covered.
- Quote request validation and success state covered.
- Editor loads existing data and saves node plus collections, works, services, proof, procurement JSON.
- Admin list filters and publish/unpublish controls covered.
- NFC tag manager and relationship ledger render and call control APIs.
- QR/share/vCard controls render.
- Owner app/PWA screens render for dashboard, presence, portfolio, works, collections, enquiries, QR/NFC, analytics, and settings.
- Owner presence profile save calls owner-safe PATCH.
- Owner enquiries render real records and update status through owner API.
- Owner QR/NFC renders scanner QR, canonical URL, source tags, and create-tag flow.
- Owner analytics renders real summary data only.
- Owner settings renders status, visibility, display mode, template, readiness flags, and publish/unpublish.
- Public work and collection detail routes render with metadata-ready payloads.
- Media URL input validates public URLs and shows preview/fallback states.
- Creative pilot template readiness audit covers Minimal Artist Portal, Gallery Wall, Editorial Portfolio, Studio Practice, Practitioner Presence, and Venue / Collective Presence, each with a dedicated public front-end treatment.

## Current Automated Evidence

- Backend focused Presence tests: `tests/test_presence_nodes.py`
- Frontend focused Presence tests: `frontend-next/src/test/presenceNodes.test.tsx`
- Smoke script: `scripts/presence_nodes_smoke.py`

## Manual Pilot Checks

- Create one node per tier and inspect mobile width first.
- Verify SEO metadata on `/p/<slug>` using page source.
- Submit an enquiry and quote request from a fresh browser session.
- Confirm the admin detail screen shows analytics, NFC tags, relationship ledger, quotes, variations, invoice support, handovers.
- Confirm relationship ledger is absent from public API response.
- Confirm owner `/app/*` screens work on a mobile viewport and do not use the staff control host gate.
- Scan `/api/presence/public/<slug>/qr` from a phone and confirm it resolves to `/p/<slug>`.
- Open a public work detail and collection detail page and confirm hidden child records return not found.
- Review `PRESENCE_ECOSYSTEM_TEMPLATE_READINESS.md` before pilot signoff and confirm the selected pilot has real media/copy, not placeholder content.
