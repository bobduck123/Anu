# Presence Ecosystem App/PWA Spec

## Product Shape

The public website is the output surface: `/p/<slug>` and child portfolio detail pages.

The app/PWA is the owner operating base: `/app/*`. It is mobile-first and scoped to the owner workflow, not the staff control plane.

## Route Map

- `/app` and `/app/dashboard`: current accessible node, status, visibility, display mode, plan, public URL, and quick links.
- `/app/presence`: owner-editable profile identity, bio, profile/cover image URLs, practice statement, and curatorial statement.
- `/app/portfolio`: readiness overview for identity, statements, works, collections, enquiry, and QR.
- `/app/works`: read-only pilot review of selected works with preview, metadata, collection label, visibility, and availability.
- `/app/collections`: read-only pilot review of collections with cover preview, visibility, and work counts.
- `/app/enquiries`: owner inbox with name, contact details, enquiry type, status, message, source context, and status update.
- `/app/qr-nfc`: canonical URL, copy/share/vCard controls, scanner-grade QR image, NFC/source tag list, and create-source-tag flow.
- `/app/analytics`: real analytics summary only: views, enquiries, conversion, top links, top sources, and recent events.
- `/app/settings`: status, visibility, display mode, plan, template, readiness flags, public URL, publish/unpublish, and safe danger-zone note.

## API Boundary

Owner screens use `/api/presence/owner/*`.

Owner APIs are authenticated through the existing participant/Supabase JWT flow. A request is allowed only when the user owns the node or is a platform admin. The owner API does not expose template management, cross-tenant listing, platform admin CRUD, or seed endpoints.

The owner app must not use `/api/control/presence/*` for normal owner workflows.

## PWA

`frontend-next/src/app/manifest.ts` declares:

- `start_url: /app`
- `scope: /app`
- `display: standalone`
- theme/background color `#1e0227`

The alpha uses `/favicon.ico` as the manifest icon. Production app icons are deferred to the broad visual refinement pass.

## Limitations

- Works and collections owner screens are review-first in this pass. Control-plane editors still support create/update/hide.
- Native upload and offline service worker support are deferred.
- Relationship ledger remains admin/control-first. Owner analytics and enquiry source context expose only owner-safe signals.
