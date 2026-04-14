# Node Tenancy Spec (2026-04-07)

## Purpose
Define ANU’s minimum real node model for the next phase so that “white-label” and “node ecology” become enforceable architecture rather than presentation language.

## Definition
A node is a governed tenant operating on shared rails with its own:
- identity,
- domain posture,
- branding,
- governance semantics,
- moderation scope,
- publication scope,
- economy scope,
- archive namespace,
- trust posture.

A node is not merely CSS, theme tokens, or a custom domain.

## Canonical Backend Model
### Required backend entities
- `Node`
- `NodeDomain`
- `NodeConfig`
- `NodeServiceBinding` (new canonical binding entity)

### Required fields for `NodeServiceBinding`
- `id`
- `node_id`
- `node_slug`
- `service_name`
- `service_tenant_id`
- `service_tenant_slug`
- `status`
- `last_verified_at`

## Impact-Service Binding
The impact-service must carry an explicit relation to backend node identity.
This may be implemented through:
- fields on `FalakTenant`, or
- a dedicated binding table.

Minimum externally stable key: `node_slug`.

## Public Node Contract
### Required public node identity contract
`DomainResolutionResponse` must expose:
- `node_id`
- `node_slug`
- `node_name`
- `semantic_key`
- `white_label`
- `brand`

### Required public node config contract
`NodePublicConfig` must be returned from:
- `GET /api/public/nodes/current/config`
- `GET /api/public/nodes/:slug/config`

This contract must be sufficient for frontend branding and public node semantics without guessed fallbacks.

### Required public site manifest contract (ANU-WL-001)
`PublicSiteManifest` is now the canonical white-label public-shell contract carried by domain/node resolution payloads.

Minimum fields:
- `tenant_id`
- `site_key`
- `site_name`
- `tagline`
- `brand_assets` (`logo_url`, `favicon_url`, optional `wordmark_url`)
- `theme_tokens`
- `nav_items`
- `enabled_public_modules`
- `footer_links`
- `legal_links`
- `trust_links`
- `contact`
- `canonical_domains`
- `preview_host`

Public host-resolution contract:
- `GET /api/public/sites/resolve?host=...`
- `GET /api/public/sites/current/manifest`

Required behavior:
1. Host resolution is deterministic (exact host, then wildcard).
2. Unknown hosts fall back to default public manifest with explicit fallback status.
3. Manifest nav/footer links must remain public-safe (no control-plane leakage).

### Required control-host authoring contract (ANU-WL-002)
Control-plane manifest authoring is a separate control-host-only contract and must not expose raw `config_json` editing.

Control-plane endpoint:
- `PATCH /api/control/sites/:node_id/manifest-authoring`
- `GET /api/control/sites/:node_id/manifest-authoring`

Allowlisted editable fields only:
- `site_name`
- `tagline`
- `logo_asset_ref`
- `favicon_asset_ref`
- fixed `theme_tokens` subset (`primary_color`, `secondary_color`, `accent_color`)
- `nav_items` (public-safe route target allowlist only)
- `enabled_modules` (fixed module allowlist only)
- `footer_links`
- `legal_links`
- `trust_links`
- public `contact` metadata

Required behavior:
1. Unknown/disallowed fields are rejected (not silently ignored).
2. Internal/control links are rejected.
3. Canonical domains and preview host remain immutable through this flow.
4. Writes occur through dedicated service normalization and return canonical normalized values.
5. Control-plane writes emit an audit-safe structured change summary.

### Required optimistic concurrency contract (ANU-WL-003)
Manifest authoring mutations must be revision-token protected.

Required behavior:
1. `GET /api/control/sites/:node_id/manifest-authoring` returns a deterministic authoring-scoped `revision_token`.
2. `PATCH /api/control/sites/:node_id/manifest-authoring` must include matching `revision_token`.
3. Stale revision writes are rejected with `409` and machine-readable conflict code.
4. Conflict payload includes latest saved authoring payload and latest `revision_token`.
5. This flow remains narrow (no merge editor, no publish workflow, no persistence redesign).

### Required draft/publish separation contract (ANU-WL-004)
Manifest authoring updates target draft state; public host rendering remains published-state only.

Required behavior:
1. Authoring edits mutate draft manifest state only.
2. Public host resolution and public shell continue serving published manifest only.
3. Control plane provides explicit publish action for promoting draft to published.
4. Publish action requires matching draft revision token and rejects stale publish attempts.
5. Control-plane preview may render draft safely; no CMS workflow expansion.

### Required published-freshness metadata contract (ANU-WL-005)
Control manifest authoring read payload must expose live publish freshness metadata for operator awareness.

Required behavior:
1. `GET /api/control/sites/:node_id/manifest-authoring` includes:
   - `published_at`
   - `published_by`
   - `published_revision_token`
2. Metadata is set only through publish action path (server-derived actor/time), not user-provided fields.
3. Metadata stays stable until a subsequent publish action.
4. Public host rendering contract remains unchanged.

## Control Node Contract
Privileged node administration must move under:
- `/control/tenants`
- other future `/control/nodes/*` surfaces

Control routes are not part of public node identity.

## Branding Rules
1. Branding is node-scoped.
2. Branding must resolve from canonical node contracts, not implied cookies alone.
3. White-label claim is invalid until backend↔impact binding and isolation tests pass.

## Publication Scope
Nodes must define:
- public publication rules,
- steward publication rules,
- restricted publication classes,
- archive visibility classes.

These rules may differ by node, but the host platform must enforce them.

## Moderation Scope
Node moderation must be at least:
- node-scoped by default,
- auditable,
- separable from platform-wide operator actions.

## Economy Scope
A node may carry economy settings and public disclosures, but no node-level economy claim is considered complete until:
- backend canonical disclosure exists,
- sponsor non-distortion rules are enforced,
- node binding is real,
- archive/trust linkage exists.

## Archive Namespace
Archive records must be node-aware.
A record must carry:
- `node_slug`
- `visibility_class`
- `record_type`
- provenance posture
- verification status

## Proving-Ground Node
Default proving-ground node for this phase:
- `au-nsw-sydney`

This remains the active default unless superseded in the decision register.

## Isolation Requirements
### Required proof classes
1. custom-domain isolation,
2. control-host isolation,
3. backend↔impact tenant binding consistency,
4. node-scoped journey and archive behaviour,
5. node-scoped disclosure behaviour.

### Invalid states
The following fail tenancy:
- node branding with no canonical binding,
- cross-node data bleed,
- control routes exposed on custom node domains,
- archive records with missing node scope,
- sponsor/economy context rendered without node context where materially relevant.

## Minimum Required Artifacts for M5
1. node binding model implemented,
2. proving-ground node resolves from domain to backend node to impact tenant,
3. custom-domain proof,
4. cross-tenant denial tests,
5. node-scoped flagship journey proof,
6. node-scoped control-plane proof.
