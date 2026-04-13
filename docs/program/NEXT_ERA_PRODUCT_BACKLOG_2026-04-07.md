# Next Era Product Backlog (First 25 Tickets)

## ANU-001
**Title:** NodeConfig JSON persistence fix
**Why it exists:** `NodeConfig.config_json` write/read behavior in backend admin tenant flow is inconsistent and can persist stringified JSON where object JSON is expected.
**Exact repo location:**
- `flora-fauna/backend/app/api/admin_tenants.py`
- `flora-fauna/backend/app/models.py`
- `flora-fauna/backend/app/schemas.py`
- `flora-fauna/backend/tests/test_node_config_contract.py`
**Implementation notes:**
1. Remove string writes (`json.dumps`) for JSON column writes.
2. Normalize read path for legacy rows if needed.
3. Add regression tests for create/update and response shape.
**Dependencies:** none
**Acceptance criteria:**
1. `config_json` persists as JSON object.
2. Tenant create/update returns object-shaped config.
3. Existing tenant admin flows still pass.
**Evidence required:**
- pytest output
- sample API response showing object `config_json`
**Owner type:** Backend / Platform
**Milestone:** M1

## ANU-002
**Title:** Domain resolution response expansion
**Why it exists:** Frontend tenant middleware and wrapper need stable node identity and branding fields from domain resolution.
**Exact repo location:**
- `flora-fauna/backend/app/api/domain_resolution.py`
- `flora-fauna/backend/app/schemas.py`
- `frontend-next/src/proxy.ts`
**Implementation notes:**
1. Return `node_id`, `node_slug`, `node_name`, `semantic_key`, `white_label`, `brand`.
2. Keep payload public-safe.
3. Version the contract in schema/tests.
**Dependencies:** ANU-001
**Acceptance criteria:**
1. Middleware can set full tenant cookie contract from one response.
2. Response fields are stable and documented.
**Evidence required:**
- response payload sample
- middleware contract test
**Owner type:** Backend + Frontend
**Milestone:** M1

## ANU-003
**Title:** Public node config endpoint
**Why it exists:** Frontend expects node config routes that are not aligned with backend implementation.
**Exact repo location:**
- `flora-fauna/backend/app/api/public_nodes.py`
- `flora-fauna/backend/app/__init__.py`
- `flora-fauna/backend/app/schemas.py`
- `flora-fauna/backend/tests/test_node_config_contract.py`
**Implementation notes:**
1. Add `GET /api/public/nodes/current/config`.
2. Add `GET /api/public/nodes/:slug/config`.
3. Return `NodePublicConfig` only.
**Dependencies:** ANU-001, ANU-002
**Acceptance criteria:**
1. Endpoint returns stable public config.
2. Frontend can resolve node config without fallback hacks.
**Evidence required:**
- pytest output
- endpoint response examples
**Owner type:** Backend
**Milestone:** M1

## ANU-004
**Title:** TenantBrandWrapper refactor to repaired node contract
**Why it exists:** Current frontend expects cookie and endpoint shapes that are not fully produced by middleware/backend contract.
**Exact repo location:**
- `frontend-next/src/proxy.ts`
- `frontend-next/src/ui-system/layout/TenantBrandWrapper.tsx`
- `frontend-next/src/test/tenantBrandContract.test.tsx`
**Implementation notes:**
1. Expand middleware cookie set.
2. Consume public node config endpoint from ANU-003.
3. Remove dependence on non-canonical node config route assumptions.
**Dependencies:** ANU-002, ANU-003
**Acceptance criteria:**
1. Custom-domain node branding and semantics render correctly.
2. Wrapper no longer depends on missing route contracts.
**Evidence required:**
- vitest output
- custom-domain screenshot
**Owner type:** Frontend
**Milestone:** M1

## ANU-005
**Title:** Control route group foundation
**Why it exists:** Operator/admin surfaces must move from public participant plane to dedicated control plane.
**Exact repo location:**
- `frontend-next/src/app/(control)/control/layout.tsx`
- `frontend-next/src/app/(control)/control/tenants/page.tsx`
- `frontend-next/src/app/(control)/control/runtime-health/page.tsx`
- `frontend-next/src/lib/auth/controlSession.ts`
- `frontend-next/src/test/controlPlaneHostRouting.test.tsx`
**Implementation notes:**
1. Add control host gating logic.
2. Add initial control routes for tenants and runtime health.
3. Keep public host deny behavior explicit.
**Dependencies:** ANU-003, ANU-004
**Acceptance criteria:**
1. Control routes render only on control host.
2. Public/custom node hosts reject `/control/*`.
**Evidence required:**
- host-routing test output
- public deny + control allow screenshots
**Owner type:** Frontend + Architecture
**Milestone:** M1

## ANU-006
**Title:** Server-side control proxy
**Why it exists:** Control pages must not make direct browser privileged API calls.
**Exact repo location:**
- `frontend-next/src/app/api/control/[...path]/route.ts`
- `frontend-next/src/lib/api/controlClient.ts`
- `frontend-next/src/lib/auth/controlSession.ts`
- `frontend-next/src/test/controlProxyRoute.test.ts`
**Implementation notes:**
1. Add allowlisted upstream forwarding to core and impact control endpoints.
2. Validate control host + control session before forwarding.
3. Inject auth server-side.
**Dependencies:** ANU-005
**Acceptance criteria:**
1. Control pages use proxy path only.
2. Proxy rejects public-host control access.
3. No arbitrary upstream forwarding.
**Evidence required:**
- control proxy test output
- request flow proof in PR
**Owner type:** Frontend / Platform
**Milestone:** M1

## ANU-007
**Title:** Admin route migration to control plane
**Why it exists:** Existing `/admin/*` surfaces break strict public-vs-privileged separation.
**Exact repo location:**
- `frontend-next/src/app/(app)/admin/**`
- `frontend-next/src/app/(control)/control/**`
- `frontend-next/src/app/(app)/home/**`
**Implementation notes:**
1. Migrate canonical entrypoints from `/admin/*` to `/control/*`.
2. Update home dashboards and role entrypoints.
3. Keep temporary shims control-host-only if needed.
**Dependencies:** ANU-005, ANU-006
**Acceptance criteria:**
1. Operator links target `/control/*`.
2. Public host no longer exposes admin as primary route.
**Evidence required:**
- route/link screenshots
- updated tests for admin-linked pages
**Owner type:** Frontend
**Milestone:** M1

## ANU-008
**Title:** Runtime health migration to control plane
**Why it exists:** Runtime health is an operator concern and must not remain in participant route family.
**Exact repo location:**
- `frontend-next/src/app/(app)/admin/runtime-health/page.tsx`
- `frontend-next/src/app/(control)/control/runtime-health/page.tsx`
- `frontend-next/src/test/runtimeHealthPage.test.tsx`
**Implementation notes:**
1. Rehome runtime-health UI to control route.
2. Move data fetch to control proxy client.
3. Enforce host gating.
**Dependencies:** ANU-005, ANU-006
**Acceptance criteria:**
1. Canonical route is `/control/runtime-health`.
2. Public host access denied.
**Evidence required:**
- route test output
- control host screenshot
**Owner type:** Frontend
**Milestone:** M1

## ANU-009
**Title:** Unified frontend auth/client posture
**Why it exists:** Mixed client auth logic blocks reliable audience separation and control safety.
**Exact repo location:**
- `frontend-next/src/lib/api/client.ts`
- `frontend-next/src/lib/api/impactApi.ts`
- `frontend-next/src/lib/api/floraFaunaApi.ts`
- `frontend-next/src/lib/auth/controlSession.ts`
**Implementation notes:**
1. Standardize auth header generation.
2. Separate public and control session handling.
3. Remove direct local-storage token assumptions.
**Dependencies:** ANU-005, ANU-006
**Acceptance criteria:**
1. All frontend clients use unified auth injection.
2. Control route calls require control session/proxy path.
**Evidence required:**
- client unit tests
- codepath summary in PR
**Owner type:** Frontend / Platform
**Milestone:** M1

## ANU-010
**Title:** Impact control audience enforcement
**Why it exists:** Privileged Falak operations require explicit control-audience enforcement parity with backend control posture.
**Exact repo location:**
- `services/impact-service/src/falak/security/routeGuard.ts`
- `services/impact-service/src/falak/routes/registerFalakRoutes.ts`
- `services/impact-service/src/falak/observability/falakTelemetry.ts`
- `services/impact-service/tests/falak/falakControlPlaneAudience.test.ts`
- `services/impact-service/tests/falak/falakMapRouteGuard.test.ts`
**Implementation notes:**
1. Enforce control audience on privileged Falak routes.
2. Keep public-safe routes unchanged.
3. Record plane context in telemetry.
**Dependencies:** ANU-006, ANU-009
**Acceptance criteria:**
1. Privileged Falak routes reject public tokens.
2. Telemetry includes plane context.
**Evidence required:**
- test output
- route proof summary
**Owner type:** Impact / Platform
**Milestone:** M1

## ANU-011
**Title:** Backend ↔ Falak tenant binding foundation
**Why it exists:** Tenant/node claims require explicit cross-service binding truth.
**Exact repo location:**
- `flora-fauna/backend/app/models.py`
- `flora-fauna/backend/app/services/node_binding_service.py`
- `flora-fauna/backend/tests/test_node_service_binding.py`
- `services/impact-service/prisma/schema.prisma`
- `services/impact-service/tests/falak/falakTenantBinding.test.ts`
**Implementation notes:**
1. Add `NodeServiceBinding`.
2. Bind backend node slug/id to Falak tenant id/slug.
3. Add verification tests.
**Dependencies:** ANU-001, ANU-010
**Acceptance criteria:**
1. Explicit node↔tenant binding exists and is tested.
2. One proving-ground node can be verified across services.
**Evidence required:**
- migration output
- pytest/vitest output
**Owner type:** Backend + Impact
**Milestone:** M2

## M1-CLEANUP-EDUMAPS-LEGACY-TOKEN
**Title:** Remove `educationMaps` legacy local-storage token fallback
**Why it exists:** ANU-009 left one intentionally narrow fallback in `frontend-next/src/lib/api/educationMaps.ts` that should be removed after milestone sign-off.
**Exact repo location:**
- `frontend-next/src/lib/api/educationMaps.ts`
- `frontend-next/src/test/educationMaps.test.ts`
**Implementation notes:**
1. Remove the local-storage `auth_token` fallback path in `educationMaps` auth header resolution.
2. Keep this cleanup limited to `educationMaps` auth posture only.
3. Preserve existing fallback behavior unrelated to auth posture.
**Dependencies:** ANU-009
**Acceptance criteria:**
1. No local-storage token fallback remains in `educationMaps`.
2. `educationMaps` auth tests are updated accordingly.
**Evidence required:**
- test output
**Owner type:** Frontend
**Milestone:** M1 follow-up

## ANU-012
**Title:** Route-purpose registry implementation
**Why it exists:** Route semantics must become executable rather than remaining prose only.
**Exact repo location:**
- `frontend-next/src/ui-system/anu/routePurposeRegistry.ts`
- `frontend-next/src/ui-system/layout/pathwayGuidance.ts`
- `frontend-next/src/test/routePurposeRegistry.test.ts`
**Implementation notes:**
1. Add canonical route metadata.
2. Include plane, realm, thresholds, adjacency, degraded mode.
3. Wire into guidance generation.
**Dependencies:** none
**Acceptance criteria:**
1. Registry exists and covers major routes.
2. Guidance consumes registry entries.
**Evidence required:**
- vitest output
- registry snapshot
**Owner type:** Frontend + Architecture
**Milestone:** M2
**Execution status (2026-04-13):** COMPLETE — executable route canon is implemented, guidance consumers are wired, parity tests are active.

## ANU-013
**Title:** Threshold registry implementation
**Why it exists:** Threshold semantics must be consistent and executable across route surfaces.
**Exact repo location:**
- `frontend-next/src/ui-system/anu/thresholdRegistry.ts`
- `frontend-next/src/lib/tenantSemantics.ts`
- `frontend-next/src/test/thresholdRegistry.test.ts`
**Implementation notes:**
1. Codify threshold mapping.
2. Keep naming stable pending D007.
3. Expose helper APIs for route components.
**Dependencies:** ANU-012
**Acceptance criteria:**
1. Threshold registry consumed by route surfaces.
2. Labeling and semantics are consistent.
**Evidence required:**
- vitest output
- route screenshots with threshold labels
**Owner type:** Frontend + Doctrine
**Milestone:** M2
**Execution status (2026-04-13):** COMPLETE — executable threshold canon is implemented, route/plane/realm lookups are available, and parity tests are active.

## ANU-014
**Title:** Connector schema and service foundation
**Why it exists:** Knowledge-to-action chain needs explicit backend connector entities and service logic.
**Exact repo location:**
- `flora-fauna/backend/app/models.py`
- `flora-fauna/backend/app/services/connector_service.py`
- `flora-fauna/backend/tests/test_journey_transition_proof.py`
**Implementation notes:**
1. Add connector entities and transition proof model.
2. Include threshold and provenance fields.
3. Keep schema small and route-driven.
**Dependencies:** ANU-011, ANU-012, ANU-013
**Acceptance criteria:**
1. Connector records persist and are queryable.
2. Transition proofs are storable and verifiable.
**Evidence required:**
- migration + pytest evidence
**Owner type:** Backend
**Milestone:** M3

## ANU-015
**Title:** Public connector API
**Why it exists:** Frontend needs one stable connector contract to render transitions and provenance.
**Exact repo location:**
- `flora-fauna/backend/app/api/public_connectors.py`
- `flora-fauna/backend/app/services/connector_service.py`
- `flora-fauna/backend/tests/test_connector_public_api.py`
- `flora-fauna/backend/tests/test_connector_provenance.py`
**Implementation notes:**
1. Add `GET /api/public/connectors` and `GET /api/public/journeys/:slug`.
2. Return route target, threshold, provenance, archive handoff references.
**Dependencies:** ANU-014
**Acceptance criteria:**
1. API returns typed connector payloads.
2. Payload includes provenance/trust metadata.
**Evidence required:**
- pytest output
- payload samples
**Owner type:** Backend
**Milestone:** M3

## ANU-016
**Title:** Connector UI rail
**Why it exists:** Connector logic must become reusable UI, not one-off route links.
**Exact repo location:**
- `frontend-next/src/components/connectors/*`
- `frontend-next/src/components/trust/*`
- `frontend-next/src/test/connectorRail.test.tsx`
- `frontend-next/src/test/provenancePanel.test.tsx`
**Implementation notes:**
1. Add connector rail, card, threshold prompt, provenance panel, archive handoff card.
2. Render from connector API payload.
3. Preserve reduced-motion posture.
**Dependencies:** ANU-015
**Acceptance criteria:**
1. UI components render from API data.
2. Provenance and archive handoff are visible.
**Evidence required:**
- vitest output
- route screenshots
**Owner type:** Frontend
**Milestone:** M3

## ANU-017
**Title:** Archive route skeleton
**Why it exists:** Institutional memory needs canonical product routes.
**Exact repo location:**
- `frontend-next/src/app/(public)/archive/page.tsx`
- `frontend-next/src/app/(public)/archive/[record]/page.tsx`
- `frontend-next/src/test/archivePage.test.tsx`
- `frontend-next/src/test/archiveRecordPage.test.tsx`
**Implementation notes:**
1. Add archive index and detail skeleton.
2. Include canonical fields: record id, source route, visibility class, last verified.
3. Preserve trust/degraded honesty posture.
**Dependencies:** ANU-015, ANU-016
**Acceptance criteria:**
1. Archive routes render and deep-link.
2. Detail route displays canonical record skeleton.
**Evidence required:**
- test output
- archive screenshots
**Owner type:** Frontend / Trust
**Milestone:** M4
**Execution status (2026-04-14):** COMPLETE - canonical `/archive` and `/archive/[record]` shells are live with degraded honesty and trust/provenance sections, backed by focused route tests.

## ANU-018
**Title:** Public trust report model/API
**Why it exists:** Trust posture requires canonical backend model and API, not page-local aggregation only.
**Exact repo location:**
- `flora-fauna/backend/app/models.py`
- `flora-fauna/backend/app/api/public_trust.py`
- `flora-fauna/backend/app/services/trust_report_service.py`
- `flora-fauna/backend/tests/test_public_trust.py`
**Implementation notes:**
1. Add trust report model with provenance and archive linkage fields.
2. Add public trust report endpoints.
3. Keep sensitivity boundaries intact.
**Dependencies:** ANU-017
**Acceptance criteria:**
1. Trust report API returns canonical model.
2. Reports link to archive records where applicable.
**Evidence required:**
- pytest output
- response sample
**Owner type:** Backend / Trust
**Milestone:** M4
**Execution status (2026-04-14):** COMPLETE - public trust report list/detail APIs are live with explicit degraded honesty and archive linkage, covered by backend tests.

## ANU-019
**Title:** Sponsor disclosure surface implementation
**Why it exists:** Sponsorship transparency must be visible and doctrine-compliant without ordering distortion.
**Exact repo location:**
- `frontend-next/src/app/(public)/transparency/page.tsx`
- `frontend-next/src/app/(public)/archive/[record]/page.tsx`
- `frontend-next/src/components/transparency/SponsorDisclosurePanel.tsx`
- `frontend-next/src/lib/api/publicSponsorDisclosures.ts`
- `flora-fauna/backend/app/api/public_transparency.py`
- `flora-fauna/backend/app/services/sponsor_disclosure_service.py`
- `flora-fauna/backend/app/models.py`
- `frontend-next/src/test/transparencyPage.test.tsx`
- `frontend-next/src/test/archiveRecordPage.test.tsx`
- `frontend-next/src/test/sponsorDisclosurePanel.test.tsx`
- `flora-fauna/backend/tests/test_public_sponsor_disclosures.py`
**Implementation notes:**
1. Add public-safe disclosure model and `/public/transparency/sponsor-disclosures` list/detail APIs.
2. Render disclosure modules in transparency + archive trust-facing surfaces with explicit labels.
3. Add tests proving sponsor metadata does not overwrite trust-report/archive truth content.
**Dependencies:** ANU-018
**Acceptance criteria:**
1. Sponsor disclosures are visible and queryable.
2. Discovery and archival ordering remain unchanged.
**Evidence required:**
- frontend and backend tests
- UI screenshots
**Owner type:** Frontend + Backend + Doctrine
**Milestone:** M4
**Execution status (2026-04-14):** COMPLETE - sponsor disclosure contract and UI are implemented end-to-end with non-distortion safeguards and focused backend/frontend tests passing.

## ANU-020
**Title:** Isolation proof tests (cross-service)
**Why it exists:** Tenant/node claims require explicit cross-service isolation proof before M5 sign-off.
**Exact repo location:**
- `flora-fauna/backend/tests/test_node_isolation.py`
- `flora-fauna/backend/tests/test_domain_resolution.py`
- `services/impact-service/tests/falak/falakService.test.ts`
- `services/impact-service/tests/falak/falakTenantBinding.test.ts`
- `frontend-next/src/test/tenantBrandContract.test.tsx`
- `frontend-next/src/test/controlPlaneHostRouting.test.tsx`
- `frontend-next/src/test/flagshipJourney.test.tsx`
**Implementation notes:**
1. Verify custom-domain node isolation.
2. Verify control-host isolation.
3. Verify backend↔impact binding consistency.
4. Verify flagship journey stays node-scoped.
**Dependencies:** ANU-004, ANU-010, ANU-011, ANU-016, ANU-017, ANU-018, ANU-019
**Acceptance criteria:**
1. Cross-tenant denials pass in backend and impact tests.
2. Proving-ground node shows coherent public/control behaviour.
**Evidence required:**
- full test outputs
- host screenshots
- flagship journey recording
**Owner type:** Cross-service Platform + Frontend + Impact
**Milestone:** M5

## ANU-021
**Title:** Trust center route foundation
**Why it exists:** Trust surfaces need a canonical landing page rather than only transparency submodules.
**Exact repo location:**
- `frontend-next/src/app/(public)/trust/page.tsx`
- `frontend-next/src/components/trust/*`
- `frontend-next/src/test/trustCenterPage.test.tsx`
**Implementation notes:**
1. Create trust center IA shell.
2. Link trust reports, sponsor disclosures, archive, and governance memory.
3. Keep it public and provenance-heavy.
**Dependencies:** ANU-018, ANU-019
**Acceptance criteria:**
1. Trust center route exists and links canonical trust modules.
2. It does not rely on ad hoc page-local composition.
**Evidence required:**
- test output
- trust center screenshots
**Owner type:** Frontend / Trust
**Milestone:** M4

## ANU-022
**Title:** Decision register publication path
**Why it exists:** Important leadership decisions need public/private publication handling tied to trust/archive posture.
**Exact repo location:**
- `flora-fauna/backend/app/api/public_trust.py`
- `frontend-next/src/app/(public)/archive/[id]/page.tsx`
- `docs/program/DECISION_REGISTER_2026-04-07.md`
**Implementation notes:**
1. Expose public-safe decision summaries where applicable.
2. Keep restricted decisions docs-only until approved.
3. Link public decisions into archive records.
**Dependencies:** ANU-017, ANU-018, D005
**Acceptance criteria:**
1. Public-safe decisions can surface without exposing restricted detail.
2. Archive links are stable.
**Evidence required:**
- payload sample
- archive screenshot
**Owner type:** Backend + Frontend + Architecture
**Milestone:** M4

## ANU-023
**Title:** Plane-aware log contract rollout
**Why it exists:** Observability must distinguish public, participant, and control activity coherently across services.
**Exact repo location:**
- `frontend-next/src/lib/api/controlClient.ts`
- `flora-fauna/backend/app/logging/*`
- `services/impact-service/src/falak/observability/falakTelemetry.ts`
**Implementation notes:**
1. Add `plane`, `route_family`, `host`, and `trace_id` consistently.
2. Ensure control actions log node and actor scope where available.
**Dependencies:** ANU-006, ANU-010
**Acceptance criteria:**
1. Logs in all three services carry the minimum plane log contract.
2. Control actions are traceable.
**Evidence required:**
- sample logs
- operator proof
**Owner type:** Platform + Backend + Impact
**Milestone:** M1

## ANU-024
**Title:** Milestone proof automation scaffolding
**Why it exists:** M1–M5 sign-off should not depend on ad hoc evidence gathering.
**Exact repo location:**
- `docs/program/MILESTONE_ACCEPTANCE_PACK_2026-04-07.md`
- `docs/program/MILESTONE_EVIDENCE_TEMPLATE_2026-04-07.md`
- `.github/workflows/*`
**Implementation notes:**
1. Add repeatable proof checklist structure.
2. Extend existing workflows only where safe.
3. Do not rename M0–M5 workflow files.
**Dependencies:** ANU-001 through ANU-023 as applicable
**Acceptance criteria:**
1. Milestone proof pack can be populated consistently.
2. Workflow references remain stable.
**Evidence required:**
- updated docs
- workflow diff summary
**Owner type:** Platform / Delivery
**Milestone:** M5

## ANU-025
**Title:** M1 PR-group definition and rollout plan
**Why it exists:** The first tranche needs explicit PR grouping to reduce merge chaos and preserve sequencing.
**Exact repo location:**
- `docs/program/PR_GROUP_DEFINITIONS_M1_2026-04-07.md`
- `docs/program/NEXT_ERA_PRODUCT_BACKLOG_2026-04-07.md`
**Implementation notes:**
1. Define first five PR groups, dependency order, touched files, tests, proof, and rollback notes.
**Dependencies:** ANU-001 through ANU-011
**Acceptance criteria:**
1. PR groups are explicit and dependency-correct.
2. First execution slice can be assigned immediately.
**Evidence required:**
- PR group doc
- review sign-off
**Owner type:** Architecture / Delivery
**Milestone:** M5

## ANU-026
**Title:** Remaining frontend legacy token-reader cleanup (post-educationMaps)
**Why it exists:** `educationMaps.ts` now uses canonical participant auth posture, but other legacy `localStorage` token readers still exist and should be removed safely in one narrow follow-up.
**Exact repo location:**
- `frontend-next/src/lib/api.ts`
- `frontend-next/src/lib/calendar/icsExport.ts`
- governance/organizer pages that still read `auth_token` directly
**Implementation notes:**
1. Replace remaining direct token reads with canonical client posture helpers.
2. Preserve existing public-vs-control separation.
3. Do not widen into route migrations or auth provider redesign.
**Dependencies:** ANU-009, ANU-010
**Acceptance criteria:**
1. No direct browser-side `auth_token` reads remain in active frontend codepaths.
2. Tests prove no regression for participant/public flows.
**Evidence required:**
- grep proof for removed direct reads in scoped files
- vitest output for affected clients/routes
**Owner type:** Frontend
**Milestone:** M4
**Execution status (2026-04-14):** COMPLETE — scoped frontend `auth_token` readers were removed in `lib/api.ts`, `icsExport`, and remaining governance/organizer/systemic pages; auth now flows through canonical shared client helpers with focused tests passing.
