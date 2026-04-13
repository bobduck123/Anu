# ANU Next Era Program Charter (2026-04-07)

## Purpose
This charter governs the first execution era after the April 7, 2026 production release.

ANU is no longer in deployment-proof mode. The released kernel is real. The next phase exists to harden the kernel, close cross-service contract drift, formalise doctrine, and establish the first enforceable foundations of a Civic OS.

This charter keeps code, docs, tests, route semantics, and approval discipline aligned while the platform moves from “released system” to “governed substrate”.

## Scope
The following are in scope for this programme window.

1. **Control-plane separation**
   - Create a distinct control host and control route family.
   - Move operator/admin surfaces out of the public participant tree.
   - enforce control audience, MFA posture, auditability, and server-side proxying.

2. **Tenant and node contract repair**
   - Repair `NodeConfig.config_json` persistence and read/write behaviour.
   - Expand domain resolution payloads to carry real node identity and branding.
   - Align `frontend-next/src/proxy.ts` and `TenantBrandWrapper.tsx` to one canonical public node-config contract.

3. **Backend ↔ Falak node binding**
   - Introduce an explicit canonical binding between backend node identity and impact-service tenant identity.
   - Make the proving-ground node verifiable across frontend, backend, and impact-service.

4. **Executable route and threshold canon**
   - Produce and maintain `routePurposeRegistry.ts` and `thresholdRegistry.ts`.
   - Align pathway guidance, route-role semantics, degradation behaviour, and threshold language around those registries.

5. **Connector-first productization**
   - Stand up the first explicit knowledge → action → community → governance → archive connector substrate.
   - Add the first reusable connector DTOs, APIs, UI rail, and archive handoff.

6. **Trust and archive foundation**
   - Add a canonical archive skeleton and public trust report model/API.
   - Add sponsor disclosure surfaces under explicit non-distortion rules.

7. **Milestone proof discipline**
   - Extend current release discipline into M1–M5 acceptance packs, evidence templates, and PR-grouped execution.

## Non-Scope
The following are explicitly out of scope for this programme window.

1. Broad federation rollout.
2. Multi-node rollout beyond the proving-ground node.
3. Mobile app development.
4. Service rewrites or architecture replacement.
5. Renaming or replacing the existing `.github/workflows/m0-*` through `m5-*` files.
6. Broad economy or payment expansion ahead of doctrine, approvals, audit trails, and disclosure posture.
7. Reopening launch mechanics already evidenced in the April 7 release materials.
8. Generic UX polish unconnected to route contracts, control-plane separation, or connector logic.

## Source-of-Truth Rules
### 1. Immutable release baseline
The following remain immutable release-era evidence:
- `docs/program/PROD_GO_LIVE_EVIDENCE_2026-04-07.md`
- `docs/program/GO_LIVE_CHECKLIST.md`
- `docs/program/COMPREHENSIVE_RELEASE_REALM_TODO_2026-04-07.md`

These are baseline evidence, not forward-planning documents.

### 2. Operative next-era docs
The following documents become operative truth for this phase:
- `docs/program/NEXT_ERA_PROGRAM_CHARTER_2026-04-07.md`
- `docs/END_STATE_ARCHITECTURE_SPEC_2026-04-07.md`
- `docs/CONTROL_PLANE_SEPARATION_SPEC_2026-04-07.md`
- `docs/ANU_DOCTRINE_SPEC_2026-04-07.md`
- `docs/ROUTE_PURPOSE_REGISTRY_2026-04-07.md`
- `docs/THRESHOLD_LANGUAGE_SPEC_2026-04-07.md`
- `docs/CONNECTOR_ARCHITECTURE_SPEC_2026-04-07.md`
- `docs/CIVIC_ECONOMY_DOCTRINE_2026-04-07.md`
- `docs/NODE_TENANCY_SPEC_2026-04-07.md`
- `docs/TRUST_ARCHIVE_SPEC_2026-04-07.md`
- `docs/REQUIREMENTS_SPEC_2026-04-07.md`
- `docs/program/MILESTONE_ACCEPTANCE_PACK_2026-04-07.md`
- `docs/program/MILESTONE_EVIDENCE_TEMPLATE_2026-04-07.md`
- `docs/program/DECISION_REGISTER_2026-04-07.md`
- `docs/program/NEXT_12_WEEK_EXECUTION_PLAN_2026-04-07.md`
- `docs/program/NEXT_ERA_PRODUCT_BACKLOG_2026-04-07.md`
- `docs/program/MILESTONE_ACCEPTANCE_TEMPLATES_2026-04-07.md`
- `docs/program/PR_GROUP_DEFINITIONS_M1_2026-04-07.md`

### 3. Executable registry alignment
When a concept is both documented and encoded, the doc and code must remain synchronized. The first mandatory executable registry files are:
- `frontend-next/src/ui-system/anu/routePurposeRegistry.ts`
- `frontend-next/src/ui-system/anu/thresholdRegistry.ts`

### 4. Unresolved decisions
Any unresolved leadership or architecture decision must:
1. be recorded in the decision register,
2. carry a default assumption,
3. carry an owner and due date,
4. proceed under the default unless correctness, safety, or tenant isolation would be violated.

## Service Ownership
| Area | Responsibility | Primary Owner Type | Mandatory Review Partners |
|---|---|---|---|
| `frontend-next` | Public/participant/control route surfaces, control proxy client, route/threshold registries, connector UI, archive shell | Frontend Engineering | Architecture, Ops, Design |
| `flora-fauna/backend` | Auth/control enforcement, domain resolution, node config, node binding, public connector APIs, trust/report APIs, archive/publication rules | Backend Engineering | Architecture, Ops, Doctrine |
| `services/impact-service` | Falak route guards, privileged/public route posture, tenant binding fields, map/event/pool projections, approval/event computation | Impact Engineering | Architecture, Ops |
| `docs/` and `docs/program/` | Doctrine, route contracts, decisions, plan, backlog, milestone acceptance/evidence packs | Architecture / Delivery | Founders, Ops, Design |
| `.github/workflows` | Keep M0–M5 stable while extending proof coverage | Platform Engineering | Architecture, Ops |

## Milestone Map (M1–M5)
| Milestone | Core Outcome |
|---|---|
| **M1** | Operational statehood: tenant contract repaired, control-plane route foundation in place, initial control proxy posture live |
| **M2** | Route and threshold canon: executable registries, route-role semantics, degradation rules, threshold copy consistency |
| **M3** | Connector substrate: backend connector model/API plus first frontend connector rail and flagship journey wiring |
| **M4** | Trust and archive foundation: canonical archive skeleton, trust reports, sponsor disclosure, non-distortion enforcement |
| **M5** | Node proof: backend↔Falak binding, proving-ground node isolation proof, node-scoped public/control behaviour evidenced |

## Sequencing Rules
1. Repair tenant and node contracts before expanding node-facing experience.
2. Separate the control plane before adding new admin/operator capability.
3. Establish backend↔Falak binding before claiming white-label readiness.
4. Build connectors before adding standalone route breadth.
5. Keep economy-facing work behind doctrine, approval, and disclosure constraints.
6. Extend the current M0–M5 workflow posture; do not rename the workflows.
7. Prefer reversible steps with explicit rollback notes.
8. Route semantics may not be treated as “design only”; every flagship route must resolve to a code registry entry.

## Frozen Areas
The following are frozen unless explicitly reopened by architecture and founder approval:
1. New major route families outside the route-purpose registry.
2. New admin/operator functionality on the public participant plane.
3. Multi-node rollout beyond the proving-ground node.
4. Sponsor-influenced discovery, archival, governance, or model-ordering logic.
5. Broad economy feature expansion before doctrine closure.
6. Kernel-level architecture rewrites.
7. Renaming the existing M0–M5 workflow files.

## Pilot-Only Areas
1. Proving-ground public node: `au-nsw-sydney`.
2. Initial control host default: `ops.maanara.vercel.app`.
3. First flagship connector journey seeded from current education/map/community/governance surfaces.
4. Initial sponsor disclosure limited to trust/transparency/archive-linked modules.
5. Archive initial scope limited to canonical skeleton records, trust reports, and linked governance memory.

## Approval Model
### Standard changes
Require:
- service owner review,
- architecture review for any shared contract, schema, or route impact.

### Sensitive changes
The following are sensitive:
- control-plane/auth/session changes,
- tenant isolation / node binding changes,
- archive visibility / redaction rules,
- sponsor/economy/trust doctrine changes,
- governance or publication sensitivity changes.

Sensitive changes require:
- service owner review,
- architecture review,
- operations review,
- doctrine review,
- founder sign-off when user-visible rules materially change.

## Evidence Model
Every milestone and every sensitive PR requires all of the following:
1. code artifact,
2. documentation update,
3. test evidence,
4. live proof,
5. operator proof where applicable,
6. rollback note,
7. unresolved-risk note if anything remains open.

No subsystem is accepted on implementation alone.

## Exit Rule
This programme window is complete only when:
- M1–M5 acceptance criteria have evidence attached,
- the proving-ground node is real and isolated,
- control-plane separation is enforceable rather than aspirational,
- connector logic exists as code and not just route adjacency language,
- trust/archive and sponsor disclosure have canonical surfaces,
- the next phase can build from contracts rather than from implied intent.
