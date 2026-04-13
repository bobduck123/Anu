# ANU End-State Architecture Spec (2026-04-07)

## Objective
Define the durable target architecture for ANU as a governed Civic OS built on the existing three-service kernel, while keeping the next implementation phase additive and reversible.

## Architectural Principle
ANU is not a single app with some admin screens. It is a multi-plane system with explicit separation between:
- public meaning,
- participant action,
- privileged control,
- economic state,
- archive/memory,
- and node-scoped governance.

The architecture must preserve:
1. public legibility,
2. privileged isolation,
3. tenant integrity,
4. provenance,
5. auditability,
6. graceful degradation.

## Exposure Planes
| Plane | Purpose | Primary Host Family | Allowed Surface Types | Forbidden Surface Types |
|---|---|---|---|---|
| Public | Readable world-facing surfaces | `maanara.vercel.app` + approved node domains | trust, archive, education, community reading, public governance inspection | privileged ops, hidden control actions, undisclosed sponsor influence |
| Participant | Authenticated participation and contribution | same public host family | actions, events, memberships, community participation, node-scoped contribution | privileged platform ops, cross-node control |
| Control | Privileged operator/steward execution | `ops.maanara.vercel.app` by default | node admin, runtime health, moderation, governance execution, finance approvals, control-only diagnostics | public discovery, sponsor placement, casual browsing |

## Service Boundary Model
### 1. `frontend-next`
Owns:
- public and participant route rendering,
- control route rendering under control host only,
- route-purpose registry,
- threshold registry,
- connector rail UI,
- archive and trust surface presentation,
- server-side control proxy.

Must not own:
- canonical control authorization,
- durable trust/economy truth,
- cross-service tenant binding truth,
- privileged browser-to-backend secret handling.

### 2. `flora-fauna/backend`
Owns:
- identity and auth foundations,
- control-plane enforcement for core APIs,
- node registry and domain resolution,
- public node config contract,
- node binding truth,
- connector composition and public connector APIs,
- trust report and archive-facing APIs,
- canonical public finance disclosure read model.

Must not own:
- rich spatial/mapping intelligence,
- frontend route-state rendering,
- direct browser control-session management.

### 3. `services/impact-service`
Owns:
- Falak tenant graph,
- map/event/pool computations,
- impact-side approval/event computation,
- privileged/public separation for Falak routes,
- projection support for connector and economy surfaces where needed.

Must not own:
- canonical public node registry,
- control-host session handling,
- public disclosure truth without backend read-model mediation.

## Node Model
A node is a governed tenant on shared rails, not a skin.

A node comprises:
- `Node` identity in backend,
- one or more `NodeDomain` records,
- a public-safe `NodeConfig`,
- a policy bundle,
- a canonical binding to an impact-service tenant,
- publication scope,
- moderation scope,
- governance scope,
- economy scope,
- archive namespace.

### Canonical binding rule
The external stable key is `Node.slug`.
Backend owns the canonical binding object between:
- backend `Node.slug` / `Node.id`
- impact `FalakTenant` id / slug

This prevents white-labeling from remaining convention-based.

## Shared Data / Contract Layer
The following contracts must become explicit shared truths:

### Tenant and control contracts
- `DomainResolutionResponse`
- `NodePublicConfig`
- `NodeControlConfig`
- `ControlSession`
- `ControlRuntimeHealth`
- `PlaneLogContract`

### Connector contracts
- `JourneyConnector`
- `JourneyTransitionProof`
- `ConnectorRailPayload`

### Trust / economy contracts
- `PublicTrustReport`
- `SponsorDisclosure`
- `PublicFinanceDisclosure`

## Archive / Trust Layer
The archive is not a document dump. It is the canonical institutional memory surface.

Minimum record categories:
- trust reports,
- governance decisions,
- model registry records,
- milestone completion evidence,
- sponsor disclosure records,
- connector transition proofs,
- archive snapshots of public consequence.

Every archive record must carry:
- canonical id,
- visibility class,
- provenance,
- verification timestamp,
- node scope,
- source route or subsystem,
- redaction status,
- last-reviewed metadata.

## Economy Layer
The economy layer is doctrine-governed, not UI-first.

### Backend owns
- canonical public disclosure read model,
- trust-facing disclosure APIs,
- doctrine-backed aggregation.

### Impact-service owns
- computation, approvals, allocation mechanics, revenue/disbursement events.

### Public rule
No sponsor or economy data may alter:
- base discovery ordering,
- archive ordering,
- governance ordering,
- model-registry ordering.

## Control-Plane Architecture
Control is implemented through:
1. dedicated control host,
2. control audience tokens,
3. host-scoped control session,
4. server-side proxy forwarding,
5. allowlisted upstream control routes only,
6. audit/log separation.

Browser clients must never receive control-plane secrets.

## Security Model
1. Public and control audiences are distinct.
2. Control actions require elevated session and MFA posture.
3. Control host is separate from public/custom node hosts.
4. Tenant scoping is enforced in backend and impact-service.
5. Sensitive archive artifacts are role- or node-scoped.
6. Logs must include plane, route family, host, trace id, and node context.
7. No admin surface is accepted as canonical if it remains reachable as a normal public route.

## Graceful Degradation Model
Graceful degradation is not optional. All flagship routes must degrade honestly.

- Celestial/community routes: reduced-motion and utility fallback.
- Earth/action/impact routes: preserve route transitions and actionable state even if rich visuals fail.
- Labyrinth/trust/archive routes: preserve clarity, provenance, and status even if live subsystems are stale.
- Control routes: fail closed on auth/host/session mismatch.

## Implementation Consequences for This Phase
The next phase does **not** build the full end state at once. It establishes the first enforceable foundations:

1. tenant contract repair,
2. control host + control route family,
3. server-side control proxy,
4. backend↔Falak binding,
5. route-purpose registry,
6. threshold registry,
7. connector schema/API/UI rail,
8. archive/trust skeleton,
9. doctrine-backed sponsor disclosure.

## Architectural Anti-Patterns
The following states are architecturally invalid:
- public host with first-class `/admin/*` paths,
- control secrets or privileged upstream URLs exposed in the browser,
- node theming without node binding,
- economy UI without doctrine and disclosure model,
- trust claims without provenance posture,
- route proliferation without route registry entries,
- archive surfaces with no canonical record model.

## Success Condition
The architecture is considered successfully grounded when:
- repo boundaries remain stable,
- public/control separation is enforced,
- node tenancy is explicit rather than inferred,
- connector logic is real code,
- archive and trust become product surfaces,
- next-phase feature work can build on contracts instead of intuition.
