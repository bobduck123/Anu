# Presence Ecosystem Security

## Public / Control Separation

- Public endpoints live under `/api/presence/public/*` and never expose admin-only fields such as owner IDs, tenant IDs, NFC tags, relationship ledger, quotes, variations, invoice support, or handovers.
- Control endpoints live under `/api/control/presence/*` and require existing control-plane authentication.
- Owner endpoints live under `/api/presence/owner/*`, require participant/Supabase JWT auth, and enforce owned-node access. They do not use the shared control-plane host gate.
- Public Next route `/p/<slug>` renders only published `public` or `unlisted` nodes.
- Public Next detail routes `/p/<slug>/works/<workId>` and `/p/<slug>/collections/<collectionId>` return not found for missing, hidden, unpublished, suspended, archived, private, or cross-node records.
- Draft, unpublished, suspended, archived, private, and missing nodes return not found publicly.

## RBAC Scopes

Presence scopes are registered in `control_plane.py` and `policy.py`:

- `presence.node.create/read/update/delete/publish/suspend/archive`
- `presence.enquiry.read/update`
- `presence.template.manage`
- `presence.analytics.read`
- `presence.organisation.manage`
- `presence.collection.manage`
- `presence.work.manage`
- `presence.service.manage`
- `presence.proof.manage`
- `presence.procurement.manage`
- `presence.nfc.manage`
- `presence.connection.read/update`
- `presence.quote.manage`
- `presence.variation.manage`
- `presence.handover.manage`

## Privacy Rules

- NFC/QR scans create anonymous `presence_interaction` rows and analytics events only.
- Named `presence_connection` records are created only after contact details are submitted or an admin manually creates a connection.
- IP and user agent values are hashed for enquiries.
- Relationship ledger data is admin/control only.
- Owner app screens expose owner-safe enquiry, NFC source tag, and analytics summaries only. They do not expose relationship ledger, quotes, variations, invoice support, or handovers.
- Procurement contact/private compliance fields are not exposed publicly.

## Validation

- Text is cleaned with server-side HTML sanitisation.
- URLs must be public http(s) unless explicitly relative for internal paths.
- Public enquiry/quote forms use honeypot `website` and optional minimum form completion timing.
- Public writes are rate-limited through the existing Flask limiter.
