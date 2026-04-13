# Requirements Spec (2026-04-07)

## Functional Requirements
1. The system shall support distinct public, participant, and control exposure planes.
2. The system shall expose a stable public node identity and node config contract.
3. The system shall support a control route family and server-side control proxy.
4. The system shall support a canonical backend↔impact node binding.
5. The system shall provide executable route-purpose and threshold registries.
6. The system shall provide a public connector API and reusable connector UI rail.
7. The system shall expose archive index and archive detail routes.
8. The system shall expose public trust report and sponsor disclosure surfaces.
9. The system shall support node-scoped trust, archive, and disclosure behaviour.

## Non-Functional Requirements
1. Changes shall be additive and reversible.
2. Existing health/readiness contracts shall not be broken.
3. Reduced-motion and fallback posture shall remain intact.
4. M0–M5 workflow files shall remain in place.
5. Cross-service contracts shall be explicit, versionable, and testable.

## Security Requirements
1. Public and control audiences shall be distinct.
2. Control sessions shall be host-scoped and server-validated.
3. No control secret shall reach the browser.
4. Public tokens shall never authorize control routes.
5. Node-scoped authorization shall be enforceable in backend and impact-service.

## Accessibility and Degradation Requirements
1. Flagship routes shall preserve reduced-motion behaviour.
2. Routes shall preserve key information and exits under degraded conditions.
3. Archive and trust routes shall preserve provenance clarity under degraded conditions.
4. Control routes shall fail closed on auth/host/session mismatch.

## Tenant Isolation Requirements
1. Node branding shall resolve from canonical node contracts.
2. Backend and impact-service shall share explicit binding truth.
3. Custom node domains shall not expose control routes.
4. Archive, trust, and sponsor surfaces shall remain node-aware where materially relevant.

## Provenance Requirements
1. Consequential claims shall carry provenance, verification, or degraded honesty posture.
2. Connector payloads shall carry provenance summary.
3. Trust reports and archive records shall expose provenance posture.

## Observability Requirements
1. Logs shall include plane, route family, host, and trace id.
2. Control actions shall be auditable.
3. Milestones shall require operator proof and live proof.

## Rollback Requirements
1. Every sensitive change shall include rollback notes.
2. Control route migration shall not rely on reopening public-host operator exposure.
3. Node binding changes shall be reversible or forward-repairable with explicit record state.
