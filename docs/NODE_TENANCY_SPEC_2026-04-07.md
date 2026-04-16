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

### Required delegated scope issuance contract (ANU-WL-007)
Control-token tenant scope claims for delegated operators must be derived from persisted assignment state.

Persisted assignment source of truth:
1. `User.node_id` (primary tenant assignment)
2. `NodeConfig.config_json.control_operator_assignments` (tenant-level delegated assignment list)

Required behavior:
1. `POST /auth/control-token` for non-platform operators derives `node_id`/`managed_node_ids` from persisted assignment state only.
2. Request payload fields such as `managed_node_ids` do not widen token scope.
3. Platform admin behavior remains global and unchanged.
4. Manifest scope checks continue honoring control claims while rejecting cross-tenant access outside persisted assignments.

### Required operator-assignment management contract (ANU-WL-008)
Persisted delegated assignments must be operable through a narrow platform-admin control API without RBAC redesign.

Control-plane endpoints:
- `GET /api/control/sites/:node_id/operator-assignments`
- `POST /api/control/sites/:node_id/operator-assignments`
- `DELETE /api/control/sites/:node_id/operator-assignments/:username`

Required behavior:
1. Only `platform_admin` may mutate tenant operator assignments.
2. Assignment persistence remains in `NodeConfig.config_json.control_operator_assignments`.
3. Operator usernames are normalized server-side before comparison/persistence.
4. Assign and unassign operations are idempotent with explicit mutation result fields.
5. Control-token issuance and runtime tenant-scope enforcement continue reading the same persisted source of truth.
6. Assignment mutations are audit-logged with safe structured mutation metadata.

### Required control-host operator-assignment UI contract (ANU-WL-009)
Operator assignment management must be operationally usable through a narrow platform-admin control surface without expanding into a permission console.

Control-host UI behavior:
1. Render assignment-management controls only when WL-008 assignment endpoints allow platform-admin access.
2. Support only:
   - reading current assignments,
   - assigning one username,
   - unassigning one username.
3. Use WL-008 endpoints only; no direct config JSON editing.
4. Preserve idempotent semantics visibly (`already assigned` / `not currently assigned`).
5. Normalize displayed and submitted usernames consistently with server-side normalization.
6. Hide assignment-management UI for non-platform operators.
7. Surface backend validation and availability errors honestly.

### Required control-host published-domain operations contract (ANU-WL-010)
White-label launchability requires a narrow platform-admin control path for published host/domain bindings.

Control-plane endpoint contract:
- `GET /api/control/sites/:node_id/domain-bindings`
- `PUT /api/control/sites/:node_id/domain-bindings`

Required behavior:
1. Only `platform_admin` can read or mutate this path.
2. Payload supports reading and updating canonical published domain bindings only.
3. Domain inputs are normalized server-side and validated as hostnames.
4. Invalid domain values are rejected explicitly (`validation_error`).
5. Domain overlap across different tenant nodes is rejected explicitly (`domain_binding_conflict`).
6. Public host resolution must consume updated published binding state.
7. Unknown-host fallback posture remains explicit and unchanged.
8. Scope remains narrow: no DNS automation, no certificate UI, no broad domain-management console.

### Required control-host publish-readiness preflight contract (ANU-WL-011)
White-label launchability requires an explicit preflight readiness check before public publish operations.

Control-plane endpoint contract:
- `GET /api/control/sites/:node_id/publish-readiness`

Required behavior:
1. Only `platform_admin` can access this path.
2. Readiness evaluation is deterministic and narrow.
3. Response returns explicit structured fields:
   - `ready` (`boolean`)
   - `blocking_issues[]`
   - `warnings[]`
4. Blocking checks must include:
   - canonical domain binding present,
   - published manifest present,
   - required legal links present in published state,
   - required trust links present in published state.
5. Warning checks remain non-blocking and explicit (for example `tls_ready=false` on a canonical domain).
6. Control-host manifest UI renders blocking issues and warnings separately with honest operator guidance.
7. Scope remains narrow: no DNS/provider automation, no certificate provisioning UI, no workflow-engine expansion.

### Required control-host node bootstrap contract (ANU-WL-012)
White-label onboarding requires a narrow platform-admin bootstrap path for creating a new tenant node with a minimal launch scaffold.

Control-plane endpoint contract:
- `POST /api/control/sites/bootstrap`

Required behavior:
1. Only `platform_admin` may access this path.
2. Payload accepts only the minimum bootstrap fields:
   - node identity (`node_name`, optional `node_slug`),
   - initial manifest identity (`site_name`, optional `site_key`, optional `tagline`),
   - optional `canonical_domains`,
   - optional `operator_usernames`.
3. Unknown fields are rejected through schema validation.
4. Identifier conflicts (`node_slug`, `site_key`) are rejected explicitly (`identifier_conflict`).
5. Domain overlap conflicts are rejected explicitly (`domain_binding_conflict`).
6. Bootstrap writes are audit-safe and include structured mutation metadata.
7. Created nodes are immediately compatible with existing WL flows:
   - manifest authoring,
   - domain binding management,
   - operator assignment management,
   - publish-readiness checks,
   - public site resolution once published.
8. Scope remains narrow: no workflow engine, no CMS/page-builder expansion, no DNS/provider automation, no RBAC redesign.

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
