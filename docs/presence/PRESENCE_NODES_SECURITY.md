# Presence Nodes Security

## Public/Control Separation

Public routes live under `/api/presence/public/*` and `/p/<slug>`. Control routes live under `/api/control/presence/*` and are accessed by the existing control-host proxy only.

## RBAC And Scopes

Control scopes added:

- `presence.node.create`
- `presence.node.read`
- `presence.node.update`
- `presence.node.delete`
- `presence.node.publish`
- `presence.node.suspend`
- `presence.node.archive`
- `presence.enquiry.read`
- `presence.enquiry.update`
- `presence.template.manage`
- `presence.analytics.read`
- `presence.organisation.manage`
- `presence.collection.manage`
- `presence.work.manage`

These are mapped into the existing control token scope matrix and role permission registry.

## Tenant Boundaries

- Platform admins can access all Presence Nodes.
- Node-scoped control operators can access nodes where `tenant_id` is in their effective managed node IDs.
- Node owners can access their own nodes where owner matching is allowed.
- Public serializers omit owner user IDs, tenant internals, IP hashes, user-agent hashes, and control audit data.

## Write Safety

- Write payloads are validated server-side.
- URLs must be public `http(s)` URLs unless explicitly permitted as local public paths for enquiry `source_url`.
- Text and basic rich text are sanitized with `bleach`.
- Public enquiries require consent and are rate limited.
- Honeypot field: `company`.
- Optional minimum form timing: `form_started_at`.
- Public enquiry metadata stores hashed IP and user-agent only.
- Control mutations emit `ControlAuditEvent` records.

## Error Handling

Public not-found is used for missing, draft, unpublished, suspended, archived, private, private-admin-only, and admin-only nodes. Public APIs do not expose privileged state reasons. Published unlisted nodes are accessible only by direct slug and are ready for future tenant-domain mounting.
