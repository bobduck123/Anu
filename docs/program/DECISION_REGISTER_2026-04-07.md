# Decision Register (2026-04-07)

## Scope
Only unresolved decisions with immediate implementation impact are listed here.

| ID | Title | Decision Statement | Why It Matters | Default Assumption For Now | Owner | Due Date | Blocking Impact If Unresolved | Current Status |
|---|---|---|---|---|---|---|---|---|
| D001 | Control host/domain | Confirm canonical control host/domain for privileged surfaces. | Needed for host gating, cookies, proxy routing, and production proof capture. | Use `ops.maanara.vercel.app` as control host in code, docs, and tests. | Founder + Architecture + Ops | 2026-04-14 | Medium: implementation proceeds; production DNS proof/sign-off delayed. | Open (default active) |
| D002 | Canonical financial source of truth | Decide which service emits canonical public finance disclosure read model. | Backend and impact-service both hold economy-adjacent primitives; public trust needs one disclosure truth. | Backend emits canonical public disclosure read model; impact-service remains computation/approval engine. | Founder + Finance Doctrine + Architecture | 2026-04-21 | High: full M4 sign-off blocked if unresolved. | Open (default active) |
| D003 | Proving-ground node choice | Confirm the first node used for white-label, connector, and isolation proof. | Domain, branding, binding, archive scope, and control proof must center on one node. | Use `au-nsw-sydney` as proving-ground node. | Founder + Product + Architecture | 2026-04-14 | Low: work proceeds; external pilot narrative remains provisional. | Open (default active) |
| D004 | Sponsor disclosure posture | Confirm exact disclosure scope and placement policy for initial sponsor surfaces. | Needed to implement doctrine-compliant sponsor transparency without discovery distortion. | Restrict sponsor disclosure to trust, transparency, and archive-linked modules only. | Founder + Doctrine + Trust/Comms | 2026-04-21 | Medium: sponsor expansion blocked; initial disclosure can proceed. | Open (default active) |
| D005 | Archive/publication sensitivity boundaries | Confirm boundaries for public vs tenant-only vs restricted/culturally sensitive records. | Archive and trust surfaces must avoid policy or cultural boundary breaches. | Public archive includes only explicitly public records; restricted/tenant-only remain non-public pending approval/custodian review. | Founder + Governance + Architecture | 2026-04-17 | High: broad archive publication blocked if unresolved. | Open (default active) |
| D006 | Node binding canonical key | Confirm canonical cross-service node binding key model. | Required for tenant isolation, white-label coherence, and backend↔impact consistency. | Backend `Node.slug` is canonical external key; explicit binding object maps to Falak tenant id/slug. | Architecture + Backend + Impact | 2026-04-17 | Medium: broader node rollout blocked until contract is fixed. | Open (default active) |
| D007 | Threshold naming finalization | Confirm final public naming posture for the threshold ladder. | Needed for route copy consistency and long-term threshold registry stability. | Keep public labels `Public`, `Participant`, `Contributor`, `Steward`, `Operator`; keep code enum `OPEN`, `MEMBER`, `VERIFIED_ACTOR`, `STEWARD`, `OPERATOR`. | Founder + Doctrine + Design | 2026-04-24 | Low: implementation proceeds; naming harmonization waits final decision. | Open (default active) |

## Resolution Rule
1. Decision changes must be updated here before broad implementation fan-out.
2. If a decision changes after merge, affected milestones must include migration or rollback notes.
3. No “to be decided later” work may bypass this register if it affects security, isolation, or public trust posture.
