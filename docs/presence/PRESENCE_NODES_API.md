# Presence Nodes API

## Public API

Base path: `/api/presence`

- `GET /public/:slug`
  - Returns public-safe node payload for `status=published` and `visibility=public|unlisted`.
- `POST /public/:slug/enquiries`
  - Body: `name`, `email`, `phone?`, `message`, `preferred_contact_method?`, `enquiry_type?`, `consent`, `company` honeypot, `form_started_at?`, `source_url?`.
- `GET /public/:slug/vcard`
  - Returns `text/vcard`.
- `GET /public/:slug/qr`
  - Returns `image/svg+xml`.
- `POST /analytics/event`
  - Body: `slug`, `event_type`, `metadata?`, `anonymous_session_id?`.

## Control API

Base path: `/api/control/presence`

- `GET /nodes`
- `POST /nodes`
- `GET /nodes/:id`
- `PATCH /nodes/:id`
- `DELETE /nodes/:id`
- `POST /nodes/:id/publish`
- `POST /nodes/:id/unpublish`
- `POST /nodes/:id/suspend`
- `POST /nodes/:id/archive`
- `GET /nodes/:id/enquiries`
- `PATCH /enquiries/:id`
- `GET /nodes/:id/collections`
- `POST /nodes/:id/collections`
- `PATCH /collections/:id`
- `DELETE /collections/:id`
- `GET /nodes/:id/works`
- `POST /nodes/:id/works`
- `PATCH /works/:id`
- `DELETE /works/:id`
- `GET /templates`
- `POST /templates`
- `PATCH /templates/:id`

Node list filters include `status`, `node_type`, `display_mode`, `tenant_id`, `organisation_id`, `owner_user_id`, and `template_id`.

## Control Proxy

Next.js control pages call:

- `/api/control/core/api/control/presence/...`

The proxy allowlist forwards only approved methods and paths, mints a backend control token server-side, and attaches `X-Control-Plane-Secret` where configured.

## Analytics Event Types

- `node_viewed`
- `link_clicked`
- `enquiry_started`
- `enquiry_submitted`
- `qr_viewed`
- `vcard_downloaded`
- `portfolio_item_clicked`
- `work_clicked`
- `collection_clicked`
- `service_clicked`
- `social_clicked`
