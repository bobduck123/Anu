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
