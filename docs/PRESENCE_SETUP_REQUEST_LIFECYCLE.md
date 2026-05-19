# Presence Setup Request Lifecycle

This document defines the backend pipeline from public Presence setup request
to private preview Presence to explicit public publish.

The pipeline is intentionally review-led. Public intake never creates a public
Presence directly.

## Lifecycle States

Setup request `status` values:

- `submitted`
- `reviewing`
- `needs_assets`
- `preview_ready`
- `approved`
- `published`
- `archived`

Setup request `presence_status` values:

- `setup_request`
- `preview`
- `published`
- `archived`

## Public Intake

### `POST /api/presence/setup-requests`

Alias:

### `POST /api/presence/beta/applications`

Auth:

No owner/admin auth required. If a valid public bearer token is supplied, it is
linked server-side, but it is optional.

Purpose:

Creates a submitted setup request only. It does not create, preview, publish, or
assign a public Presence.

Customisation fields are validated against Presence Customisation Manifest v1
and persisted as stable IDs plus a versioned snapshot.

## Operator Review Endpoints

The control-plane compatible routes are:

- `GET /api/presence/admin/setup-requests`
- `GET /api/presence/admin/setup-requests/<id>`
- `PATCH /api/presence/admin/setup-requests/<id>`
- `POST /api/presence/admin/setup-requests/<id>/create-preview`
- `POST /api/presence/admin/setup-requests/<id>/publish`
- `POST /api/presence/admin/setup-requests/<id>/archive`
- `GET /api/presence/admin/presences/<id>/preview`

The same handlers are also available under the existing control namespace:

- `GET /api/control/presence/setup-requests`
- `GET /api/control/presence/setup-requests/<id>`
- `PATCH /api/control/presence/setup-requests/<id>`
- `POST /api/control/presence/setup-requests/<id>/create-preview`
- `POST /api/control/presence/setup-requests/<id>/publish`
- `POST /api/control/presence/setup-requests/<id>/archive`
- `GET /api/control/presence/presences/<id>/preview`

Auth:

All review, preview, publish, and archive routes require control-plane
authentication. They use existing Presence control scopes:

- read/list/detail: `presence.node.read`
- status updates: `presence.node.update`
- preview creation: `presence.node.create`
- publish: `presence.node.publish`
- archive: `presence.node.archive`

Control-plane host, shared secret, MFA claim, token use, role, and grant rules
remain enforced by `control_plane_required`.

## Listing And Review

### `GET /api/presence/admin/setup-requests?status=submitted`

Returns submitted setup requests visible to the authenticated operator.

Platform admins can see all setup requests. Scoped node operators can see setup
requests that already have an associated preview Presence in their managed node
scope.

### `PATCH /api/presence/admin/setup-requests/<id>`

Allowed manual status updates:

- `submitted`
- `reviewing`
- `needs_assets`
- `preview_ready` only after a preview exists
- `approved`
- `archived`

`published` must use the publish action.

Patch payload example:

```json
{
  "status": "reviewing",
  "internal_notes": "Awaiting final image assets.",
  "reason": "Initial review started."
}
```

## Preview Creation

### `POST /api/presence/admin/setup-requests/<id>/create-preview`

Creates or updates a private preview PresenceNode from the stored setup request.

Rules:

- Uses `customisation_snapshot` as the source of truth.
- Does not recalculate from current manifest defaults.
- Generates PresenceDNA and RoomGraph v1 preview data.
- Creates a private draft PresenceNode.
- Sets setup request `status=preview_ready`.
- Sets setup request `presence_status=preview`.
- Assigns a `preview_token`.
- Does not publish the Presence.

If the stored snapshot cannot be safely converted, the request is marked
`needs_assets` and the response is a structured `422 validation_error`.

Preview node public separation:

- `PresenceNode.status = draft`
- `PresenceNode.visibility = private`
- `PresenceNode.public_status = private`

The normal public read route returns `404` until the publish action runs.

## Preview Read

### `GET /api/presence/preview/<preview_token>`

Tokenised private preview read. It returns RoomGraph-ready preview data without
requiring the public Presence to be published.

Response includes:

- `setup_request_id`
- `preview_token`
- `presence_node_id`
- `slug`
- `display_name`
- `archetype`
- `room_world`
- `engagement_dynamic`
- `atmosphere_pack`
- `motion_profile`
- `object_skin_pack`
- `presence_dna`
- `room_graph`
- `schema_version`
- `request_status`
- `presence_status`

Preview tokens are stored on `presence_beta_application.preview_token`.

## Publish

### `POST /api/presence/admin/setup-requests/<id>/publish`

Publishes the private preview Presence after review.

Rules:

- Requires setup request status `preview_ready` or `approved`.
- Requires an associated preview PresenceNode.
- Re-validates the stored customisation snapshot before publishing.
- Sets PresenceNode `status=published`.
- Sets PresenceNode `visibility=public`.
- Sets PresenceNode `public_status=public`.
- Sets setup request `status=published`.
- Sets setup request `presence_status=published`.
- Returns canonical public route metadata.

The public Presence remains compatible with:

- `GET /api/presence/public/<slug>`
- `GET /api/presence/public/<slug>/qr`
- `GET /api/presence/public/<slug>/vcard`

## Archive

### `POST /api/presence/admin/setup-requests/<id>/archive`

Archives the setup request and, by default, archives the associated PresenceNode
without deleting records.

Payload:

```json
{
  "reason": "Pilot ended.",
  "unpublish_presence": true
}
```

Rules:

- Preserves setup request row.
- Preserves associated PresenceNode row.
- Sets setup request `status=archived`.
- Sets setup request `presence_status=archived`.
- When `unpublish_presence` is true, transitions the PresenceNode to archived.

## Audit Behaviour

Lifecycle audit entries are stored in
`presence_beta_application.lifecycle_audit`.

Each entry records:

- `action`
- `previous_status`
- `new_status`
- `actor`
- `note`
- `metadata`
- `created_at`

The public intake route creates the initial `submitted` audit entry. Operator
routes append status, preview, publish, and archive entries.

## Data Model Changes

Migration:

`flora-fauna/backend/migrations/versions/20260520_presence_setup_request_lifecycle_pipeline.sql`

Adds:

- `preview_token`
- `internal_notes`
- `lifecycle_audit`

No destructive migration is required.

## Preview Generation Accuracy

Preview creation uses the stored `customisation_snapshot` first. This protects
old requests from future manifest default changes.

If a stored snapshot becomes unsupported, the backend returns a structured
validation error and marks the request for review instead of silently changing
the user's choices.

## Remaining Gaps

- Operator UI for lifecycle review still needs frontend work.
- Preview tokens are bearer-style URLs and should be shared only with intended
  reviewers or clients.
- The first lifecycle implementation stores audit history on the request row;
  a separate immutable audit table can be added later if needed.
