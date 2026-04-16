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
**Execution status (2026-04-14):** COMPLETE - canonical `/archive` and `/archive/[record]` are live, and `/archive` now consumes canonical backend archive summary records (`/public/archive/records`) with type-filter IA, trust/provenance/freshness cues, degraded/empty honesty, and focused route tests.

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
- `flora-fauna/backend/migrations/versions/20260414_public_sponsor_disclosure.sql`
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
**Execution status (2026-04-14):** COMPLETE - sponsor disclosure contract and UI are implemented end-to-end with non-distortion safeguards, DB migration script is landed, focused backend/frontend tests pass, and sponsor rendering proof has been captured.

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
**Execution status (2026-04-14):** COMPLETE - cross-service isolation proof suite is now explicit in backend/frontend/impact tests, control-host and host-resolution isolation assertions are in place, and flagship journey payloads are node-scoped with deterministic tenant-safe slugs.

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
**Execution status (2026-04-14):** COMPLETE - `/trust` foundation route is live with separated trust/disclosure/archive IA sections and degraded-honesty behavior, covered by focused tests.

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
**Execution status (2026-04-14):** COMPLETE - public-safe decision summaries are now exposed via `/public/trust/decisions`, restricted decisions remain docs-only unless archive-linked for publication, and archive routes now carry stable decision summary links.

## ANU-023
**Title:** Plane-aware log contract rollout
**Why it exists:** Observability must distinguish public-plane, control-plane, and impact-plane activity coherently across services.
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
**Execution status (2026-04-14):** COMPLETE - canonical plane-log envelopes are now emitted across scoped backend public/control paths, frontend public/control paths, and impact Falak telemetry with explicit plane validation, request/correlation IDs where available, and sensitive-field redaction.

## ANU-024
**Title:** Milestone proof automation scaffolding
**Why it exists:** M1-M5 sign-off should not depend on ad hoc evidence gathering.
**Exact repo location:**
- `scripts/capture_milestone_evidence.py`
- `scripts/tests/test_capture_milestone_evidence.py`
- `docs/program/EVIDENCE_AUTOMATION_SPEC_2026-04-14.md`
- `docs/program/MILESTONE_ACCEPTANCE_PACK_2026-04-07.md`
- `docs/program/M5_COMPLETION_REPORT.md`
- `docs/program/evidence/anu-024/*`
**Implementation notes:**
1. Add a workflow-safe evidence capture script that writes timestamp/build-id-distinguished bundles.
2. Emit both `evidence.json` and `evidence.md` with explicit observed/inferred/human narrative separation.
3. Keep milestone completion conclusions human-authored and out of automation scope.
4. Do not rename M0-M5 workflow files.
**Dependencies:** ANU-001 through ANU-023 as applicable
**Acceptance criteria:**
1. Milestone proof pack can be populated consistently.
2. Workflow references remain stable.
**Evidence required:**
- focused test output for evidence capture contract
- one generated ANU-024 evidence bundle path
**Owner type:** Platform / Delivery
**Milestone:** M5
**Execution status (2026-04-14):** COMPLETE - evidence automation scaffold is live via `scripts/capture_milestone_evidence.py`, focused contract tests are passing, and ANU-024 bundle artifacts are generated under `docs/program/evidence/anu-024/` without auto-writing milestone conclusions.

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

## ANU-027
**Title:** Archive index pagination + minimal query refinement
**Why it exists:** `/archive` now has a canonical summary feed and type IA, but larger public memory volumes need lightweight pagination and query refinement without widening into full search ingestion.
**Exact repo location:**
- `flora-fauna/backend/app/api/public_archive.py`
- `flora-fauna/backend/app/services/archive_service.py`
- `frontend-next/src/lib/api/publicArchive.ts`
- `frontend-next/src/app/(public)/archive/page.tsx`
- `frontend-next/src/components/archive/ArchiveShell.tsx`
**Implementation notes:**
1. Add offset/cursor pagination contract for archive summaries.
2. Keep type filter semantics stable.
3. Add one minimal query refinement control (e.g., title prefix) only if public-safe and cheap.
**Dependencies:** ANU-017, ANU-018, ANU-021
**Acceptance criteria:**
1. Archive index can paginate deterministically.
2. Non-distortion posture remains intact.
3. No widening into full-text ingestion/search platform.
**Evidence required:**
- backend/frontend test output
- one archive pagination proof capture
**Owner type:** Backend + Frontend
**Milestone:** M5
**Execution status (2026-04-14):** COMPLETE (pagination scope) - `/public/archive/records` now uses deterministic offset pagination with explicit ordering (`updated_at desc`, `id desc`) and pagination metadata; `/archive` now supports previous/next controls that preserve active filters.

## ANU-028
**Title:** Archive minimal query refinement (post-pagination)
**Why it exists:** ANU-027 delivered deterministic pagination; lightweight query refinement beyond type filters is still deferred.
**Exact repo location:**
- `flora-fauna/backend/app/api/public_archive.py`
- `flora-fauna/backend/app/services/archive_service.py`
- `frontend-next/src/lib/api/publicArchive.ts`
- `frontend-next/src/app/(public)/archive/page.tsx`
- `frontend-next/src/components/archive/ArchiveShell.tsx`
**Implementation notes:**
1. Add one narrow public-safe query input (for example, title prefix).
2. Keep deterministic pagination ordering unchanged.
3. Do not widen into full-text search or ingestion orchestration.
**Dependencies:** ANU-027
**Acceptance criteria:**
1. Query refinement and pagination coexist deterministically.
2. Non-distortion posture remains intact.
3. Degraded/empty honesty remains explicit.
**Evidence required:**
- backend/frontend test output
- one query + pagination response example
**Owner type:** Backend + Frontend
**Milestone:** M5
**Execution status (2026-04-14):** COMPLETE - `title_prefix` query refinement is implemented end-to-end with case-insensitive prefix-only matching, deterministic pagination coexistence, canonical applied filter echoes (`applied_record_type_filter`, `applied_title_prefix_filter`), minimal `/archive` input wiring, and focused tests.

## ANU-029
**Title:** Archive query-normalization and guardrail hardening
**Why it exists:** ANU-028 added title-prefix refinement; additional guardrails (length caps/normalization telemetry) can be added without widening into search platform work.
**Exact repo location:**
- `flora-fauna/backend/app/api/public_archive.py`
- `flora-fauna/backend/app/services/archive_service.py`
- `frontend-next/src/lib/api/publicArchive.ts`
- `frontend-next/src/app/(public)/archive/page.tsx`
**Implementation notes:**
1. Add narrow title-prefix input constraints (length and whitespace normalization policy).
2. Keep deterministic ordering and pagination contract unchanged.
3. Do not add multi-field search, ranking, or fuzzy logic.
**Dependencies:** ANU-028
**Acceptance criteria:**
1. Prefix guardrails are explicit and tested.
2. Existing archive pagination/filter behavior remains stable.
**Evidence required:**
- backend/frontend test output
- one request/response example showing guardrail behavior
**Owner type:** Backend + Frontend
**Milestone:** M5
**Execution status (2026-04-16):** COMPLETE - title-prefix guardrails are now explicit and enforced end-to-end (whitespace normalization + 80-char cap), with deterministic pagination/filter behavior unchanged, focused backend/frontend tests, and docs/evidence updates.

## ANU-WL-001
**Title:** Platform-hosted white-label public front-end foundation (Mudyin exemplar)
**Why it exists:** Partner-branded public hosting needs one canonical host-resolution and site-manifest substrate without frontend forking or tenant code injection.
**Exact repo location:**
- `flora-fauna/backend/app/services/public_site_service.py`
- `flora-fauna/backend/app/api/public_sites.py`
- `flora-fauna/backend/app/api/domain_resolution.py`
- `flora-fauna/backend/app/api/public_nodes.py`
- `flora-fauna/backend/app/schemas.py`
- `frontend-next/src/lib/publicSiteManifest.ts`
- `frontend-next/src/ui-system/layout/TenantBrandWrapper.tsx`
- `frontend-next/src/components/public/PublicSiteManifestRail.tsx`
- `frontend-next/src/proxy.ts`
- tests under backend/frontend for host resolution + manifest rendering
**Implementation notes:**
1. Canonical `PublicSiteManifest` contract is defined and enforced.
2. Deterministic host resolution is executable (`/api/public/sites/resolve`).
3. Existing domain/node contracts now include `site_manifest`.
4. Public shell rendering is manifest-driven with public-safe nav/link sanitization.
5. Unknown hosts fall back with explicit resolution posture.
**Dependencies:** ANU-001, ANU-002, ANU-003, ANU-004
**Acceptance criteria:**
1. Host resolves deterministically to tenant/site manifest.
2. Unknown host fallback is explicit and safe.
3. Public shell consumes manifest branding/nav/legal data.
4. No control-plane links leak into public shell nav/footer.
**Evidence required:**
- backend + frontend test output
- one host-resolution payload example
- one public-shell rendering proof
**Owner type:** Backend + Frontend + Platform
**Milestone:** M5
**Execution status (2026-04-14):** COMPLETE - canonical host-based public site manifest substrate is live, Mudyin exemplar manifest path is in place, and focused host-resolution/isolation/rendering tests pass.

## ANU-WL-002
**Title:** White-label manifest admin authoring path (control-plane scoped)
**Why it exists:** ANU-WL-001 established runtime contracts, but steward/operator authoring UX for safe manifest updates is still manual.
**Exact repo location:**
- `flora-fauna/backend/app/services/public_site_authoring_service.py`
- `flora-fauna/backend/app/api/cultural_control.py`
- `flora-fauna/backend/app/security/control_plane.py`
- `flora-fauna/backend/app/schemas.py`
- `flora-fauna/backend/tests/test_control_public_site_manifest_authoring.py`
- `frontend-next/src/app/(control)/control/tenants/[nodeId]/manifest/page.tsx`
- `frontend-next/src/lib/api/controlClient.ts`
- `frontend-next/src/app/(control)/control/tenants/page.tsx`
- `frontend-next/src/test/controlManifestAuthoringPage.test.tsx`
**Implementation notes:**
1. Add control-host-only authoring flow for `public_site_manifest` fields.
2. Keep allowlisted public-safe fields only.
3. Preserve control proxy + audit posture.
**Dependencies:** ANU-WL-001
**Acceptance criteria:**
1. Operators can edit manifest fields via control-plane flow.
2. Changes propagate to public shell without code changes.
**Evidence required:**
- control-host test output
- manifest update proof
**Owner type:** Frontend + Backend + Platform
**Milestone:** M5+
**Execution status (2026-04-14):** COMPLETE - control-host-only manifest authoring endpoint and UI are live with strict allowlist validation, normalization, immutable read-only field protection, audit-safe change records, and focused backend/frontend tests passing.

## ANU-WL-003
**Title:** Optimistic concurrency for control manifest authoring
**Why it exists:** WL-002 allows safe authoring updates, but stale operator forms can still overwrite newer saved state without revision checks.
**Exact repo location:**
- `flora-fauna/backend/app/services/public_site_authoring_service.py`
- `flora-fauna/backend/app/api/cultural_control.py`
- `flora-fauna/backend/app/schemas.py`
- `flora-fauna/backend/tests/test_control_public_site_manifest_authoring.py`
- `frontend-next/src/lib/api/controlClient.ts`
- `frontend-next/src/app/(control)/control/tenants/[nodeId]/manifest/page.tsx`
- `frontend-next/src/test/controlManifestAuthoringPage.test.tsx`
**Implementation notes:**
1. GET returns deterministic authoring-scoped `revision_token`.
2. PATCH requires matching `revision_token` and rejects stale writes with `409`.
3. Conflict responses include machine code + latest payload + latest token.
4. UI submits revision token and handles stale-write conflicts honestly (no false save success).
**Dependencies:** ANU-WL-002
**Acceptance criteria:**
1. Matching revision token updates succeed.
2. Stale revisions return `409` with latest payload/token.
3. Operator UI surfaces stale-write state and refreshes to latest saved values.
**Evidence required:**
- backend + frontend focused test output
- conflict response payload example
**Owner type:** Frontend + Backend + Platform
**Milestone:** M5+
**Execution status (2026-04-14):** COMPLETE - manifest authoring now enforces deterministic revision-token optimistic concurrency with conflict-safe UI messaging and focused tests.

## ANU-WL-004
**Title:** Draft/publish separation for public site manifests
**Why it exists:** WL-003 protects draft writes from stale edits, but draft edits still need explicit publish intent before affecting live public shell rendering.
**Exact repo location:**
- `flora-fauna/backend/app/services/public_site_authoring_service.py`
- `flora-fauna/backend/app/api/cultural_control.py`
- `flora-fauna/backend/app/schemas.py`
- `flora-fauna/backend/tests/test_control_public_site_manifest_authoring.py`
- `frontend-next/src/lib/api/controlClient.ts`
- `frontend-next/src/app/(control)/control/tenants/[nodeId]/manifest/page.tsx`
- `frontend-next/src/test/controlManifestAuthoringPage.test.tsx`
**Implementation notes:**
1. Authoring PATCH writes draft state only.
2. Public host resolution continues to read published state only.
3. Add explicit publish endpoint and control UI publish action.
4. Keep publish guarded by draft revision token; reject stale publish attempts honestly.
5. Expose draft preview vs published snapshot in control plane only.
**Dependencies:** ANU-WL-003
**Acceptance criteria:**
1. Draft edits do not mutate live public shell until publish.
2. Publish updates live shell only on explicit action.
3. Stale publish conflicts return honest `409` details.
4. UI stays minimal: edit draft, preview draft, publish draft.
**Evidence required:**
- backend + frontend focused tests
- one draft-vs-published behavior proof
**Owner type:** Frontend + Backend + Platform
**Milestone:** M5+
**Execution status (2026-04-14):** COMPLETE - draft/published split is live with explicit publish action, preview-safe control rendering, stale-publish guards, and focused tests.

## ANU-WL-005
**Title:** Published-state freshness metadata for control manifest authoring
**Why it exists:** WL-004 separates draft/published state, but operators still need immediate visibility of what is live, when it was published, and by whom.
**Exact repo location:**
- `flora-fauna/backend/app/services/public_site_authoring_service.py`
- `flora-fauna/backend/app/api/cultural_control.py`
- `flora-fauna/backend/tests/test_control_public_site_manifest_authoring.py`
- `frontend-next/src/lib/api/controlClient.ts`
- `frontend-next/src/app/(control)/control/tenants/[nodeId]/manifest/page.tsx`
- `frontend-next/src/test/controlManifestAuthoringPage.test.tsx`
**Implementation notes:**
1. Extend control read payload with `published_at`, `published_by`, and `published_revision_token`.
2. Source metadata only from explicit publish path (server-derived actor/time).
3. Keep metadata stable across draft edits until next publish.
4. Add minimal operator status block showing `Live` vs `Draft ahead of live`.
**Dependencies:** ANU-WL-004
**Acceptance criteria:**
1. Publish metadata appears after publish and remains stable until republish.
2. UI renders live status honestly and distinguishes in-sync vs draft-ahead states.
3. Existing publish and stale conflict behavior remains intact.
**Evidence required:**
- focused backend/frontend tests
- one control UI freshness status proof
**Owner type:** Frontend + Backend + Platform
**Milestone:** M5+
**Execution status (2026-04-14):** COMPLETE - control manifest payload now includes last-publish metadata and UI freshness cues with focused tests passing.

## ANU-WL-007
**Title:** Authoritative delegated tenant scope claims at control-token issuance
**Why it exists:** WL-006 introduced tenant-scoped enforcement, but delegated multi-tenant operators need claims minted from persisted assignment state rather than caller-provided payloads.
**Exact repo location:**
- `flora-fauna/backend/app/security/control_tenant_scope.py`
- `flora-fauna/backend/app/auth.py`
- `flora-fauna/backend/app/api/cultural_control.py`
- `flora-fauna/backend/app/api/admin_tenants.py`
- `flora-fauna/backend/tests/test_control_token_managed_node_scope.py`
- `flora-fauna/backend/tests/test_control_public_site_manifest_authoring.py`
**Implementation notes:**
1. Resolve delegated operator assignments from persisted backend state (`User.node_id` + `NodeConfig` assignment metadata).
2. Mint non-platform control tokens with authoritative `node_id` and `managed_node_ids` (for multi-tenant assignments).
3. Ignore incoming `managed_node_ids` payload attempts during token issuance.
4. Intersect runtime claim scope with persisted assignments to reject forged widening.
**Dependencies:** ANU-WL-006
**Acceptance criteria:**
1. Single-tenant delegated operators receive one authorized tenant scope.
2. Multi-tenant delegated operators receive exactly assigned `managed_node_ids`.
3. Unassigned tenant access remains forbidden.
4. Platform admin remains global.
5. Forged/absent managed-node claims do not widen access.
**Evidence required:**
- focused backend tests proving issued claims and downstream scope behavior
- focused frontend control visibility regression pass
**Owner type:** Backend + Platform
**Milestone:** M5+
**Execution status (2026-04-14):** COMPLETE - control-token issuance now emits authoritative delegated tenant claims from persisted assignments with forged-claim widening blocked by runtime intersection.

## ANU-WL-008
**Title:** Platform-admin operator assignment management API
**Why it exists:** WL-007 established persisted delegated assignment as source of truth, but platform admins still needed a narrow operational control path to assign and unassign tenant operators without RBAC redesign.
**Exact repo location:**
- `flora-fauna/backend/app/api/cultural_control.py`
- `flora-fauna/backend/app/services/control_operator_assignment_service.py`
- `flora-fauna/backend/app/security/control_tenant_scope.py`
- `flora-fauna/backend/app/security/control_plane.py`
- `flora-fauna/backend/tests/test_control_operator_assignments_api.py`
- `flora-fauna/backend/tests/test_control_token_managed_node_scope.py`
- `flora-fauna/backend/tests/test_control_public_site_manifest_authoring.py`
**Implementation notes:**
1. Add platform-admin-only control endpoints for assignment read/assign/unassign under `/api/control/sites/:node_id/operator-assignments`.
2. Persist assignment updates in `NodeConfig.config_json.control_operator_assignments` and keep legacy mirrors aligned.
3. Normalize operator usernames server-side before comparison/persistence.
4. Keep assignment/unassignment idempotent with explicit mutation metadata (`applied`, `idempotent_noop`).
5. Preserve WL-007 token issuance and runtime scope intersection behavior against the same persisted assignment source of truth.
**Dependencies:** ANU-WL-007
**Acceptance criteria:**
1. Platform admin can read, assign, and unassign tenant operator usernames.
2. Duplicate assignment and repeated unassignment are idempotent and explicit.
3. Non-platform operators cannot mutate assignments.
4. Token issuance and runtime scope enforcement stay consistent after assignment changes.
**Evidence required:**
- focused backend API + scope compatibility test output
- one assignment mutation payload example showing normalization and idempotent flags
**Owner type:** Backend + Platform
**Milestone:** M5+
**Execution status (2026-04-15):** COMPLETE - platform-admin assignment management API is live with normalized/idempotent behavior, audit-safe mutation logging, and WL-007 compatibility verified in focused tests.

## ANU-WL-009
**Title:** Control-host operator assignment management UI
**Why it exists:** WL-008 made delegated assignment operable at API level, but platform admins still need a narrow control-host UI to read/assign/unassign without broad permission-console expansion.
**Exact repo location:**
- `frontend-next/src/app/(control)/control/tenants/page.tsx`
- `frontend-next/src/lib/api/controlClient.ts`
- `frontend-next/src/test/adminTenantsPage.test.tsx`
**Implementation notes:**
1. Add a minimal platform-admin assignment panel in `/control/tenants`.
2. Use WL-008 endpoints only for list/assign/unassign operations.
3. Hide panel for non-platform operators (`platform_admin_required` path).
4. Keep idempotent outcomes explicit and honest.
5. Keep username handling normalized in line with server behavior.
**Dependencies:** ANU-WL-008
**Acceptance criteria:**
1. Platform admin can load assignments and perform assign/unassign from control host UI.
2. Non-platform operators do not get assignment-management UI.
3. Duplicate assign/unassign no-op states are rendered honestly.
4. Error states are surfaced honestly without control-plane leakage.
**Evidence required:**
- focused frontend test output
- typecheck output
**Owner type:** Frontend + Platform
**Milestone:** M5+
**Execution status (2026-04-15):** COMPLETE - minimal control-host assignment UI is live, integrated with WL-008 endpoints, and covered by focused frontend tests for platform-admin visibility, idempotent messaging, and honest error states.

## ANU-WL-010
**Title:** Minimal control-host domain/publication ops for white-label nodes
**Why it exists:** WL-001 through WL-009 established manifest/runtime and delegated operator rails, but white-label launchability still required an operable platform-admin path to update canonical published domain bindings.
**Exact repo location:**
- `flora-fauna/backend/app/services/control_site_domain_service.py`
- `flora-fauna/backend/app/api/cultural_control.py`
- `flora-fauna/backend/app/security/control_plane.py`
- `flora-fauna/backend/app/schemas.py`
- `flora-fauna/backend/tests/test_control_site_domain_bindings_api.py`
- `frontend-next/src/lib/api/controlClient.ts`
- `frontend-next/src/app/(control)/control/tenants/[nodeId]/manifest/page.tsx`
- `frontend-next/src/test/controlManifestAuthoringPage.test.tsx`
**Implementation notes:**
1. Add platform-admin-only control endpoints for domain binding read/update under `/api/control/sites/:node_id/domain-bindings`.
2. Validate and normalize domain values server-side.
3. Reject cross-tenant overlap with explicit conflict responses.
4. Keep unknown-host fallback posture unchanged.
5. Add minimal control-host UI fields for reading/updating canonical domains only.
**Dependencies:** ANU-WL-001, ANU-WL-008, ANU-WL-009
**Acceptance criteria:**
1. Platform admin can read and update canonical domain bindings.
2. Invalid domain input is rejected honestly.
3. Duplicate/conflicting domain assignment is rejected explicitly.
4. Host resolution reflects updated binding state.
5. Non-platform operators cannot use domain-management path.
**Evidence required:**
- focused backend/frontend tests
- typecheck output
**Owner type:** Backend + Frontend + Platform
**Milestone:** M5+
**Execution status (2026-04-15):** COMPLETE - minimal platform-admin domain/publication ops are live end-to-end with strict validation/conflict handling, host-resolution compatibility, and focused backend/frontend test coverage.

## ANU-WL-011
**Title:** Minimal control-host publish-readiness preflight for white-label nodes
**Why it exists:** WL-001 through WL-010 established manifest/domain/operator rails, but operators still needed an explicit deterministic launch-readiness check to prevent obviously incomplete public launches.
**Exact repo location:**
- `flora-fauna/backend/app/services/control_site_publish_readiness_service.py`
- `flora-fauna/backend/app/api/cultural_control.py`
- `flora-fauna/backend/app/security/control_plane.py`
- `flora-fauna/backend/tests/test_control_site_publish_readiness_api.py`
- `frontend-next/src/lib/api/controlClient.ts`
- `frontend-next/src/app/(control)/control/tenants/[nodeId]/manifest/page.tsx`
- `frontend-next/src/test/controlManifestAuthoringPage.test.tsx`
**Implementation notes:**
1. Add platform-admin-only readiness endpoint at `/api/control/sites/:node_id/publish-readiness`.
2. Evaluate required preflight state deterministically:
   - canonical domain binding present,
   - published manifest present,
   - required trust/legal links present in published manifest.
3. Return structured readiness payload with `ready`, `blocking_issues`, and `warnings`.
4. Keep warning-only signals non-blocking (for example `tls_ready=false`).
5. Render readiness panel in control-host manifest page with honest blocked/warning/operator guidance.
**Dependencies:** ANU-WL-001, ANU-WL-004, ANU-WL-010
**Acceptance criteria:**
1. `ready=true` when required published state is complete.
2. Missing domain, manifest, or required trust/legal links produce explicit blocking issues.
3. Warning vs blocker semantics are represented honestly.
4. Control-host/platform-admin enforcement remains intact.
5. Control UI renders readiness state clearly/truthfully.
**Evidence required:**
- focused backend/frontend tests
- typecheck output
**Owner type:** Backend + Frontend + Platform
**Milestone:** M5+
**Execution status (2026-04-15):** COMPLETE - minimal publish-readiness preflight is live end-to-end with deterministic checks, explicit blocker/warning contract, platform-admin enforcement, control-host UI integration, and focused backend/frontend test coverage.

## ANU-WL-012
**Title:** Minimal platform-admin white-label node bootstrap flow
**Why it exists:** WL-001 through WL-011 established manifest/domain/operator/readiness rails, but platform admins still needed a narrow operable path to bootstrap new partner nodes with a minimal launch scaffold.
**Exact repo location:**
- `flora-fauna/backend/app/services/control_site_bootstrap_service.py`
- `flora-fauna/backend/app/api/cultural_control.py`
- `flora-fauna/backend/app/schemas.py`
- `flora-fauna/backend/app/security/control_plane.py`
- `flora-fauna/backend/tests/test_control_site_bootstrap_api.py`
- `frontend-next/src/lib/api/controlClient.ts`
- `frontend-next/src/app/(control)/control/tenants/page.tsx`
- `frontend-next/src/test/adminTenantsPage.test.tsx`
**Implementation notes:**
1. Add platform-admin-only bootstrap endpoint at `/api/control/sites/bootstrap`.
2. Accept only minimal bootstrap payload fields for node identity, initial manifest scaffold, optional canonical domains, and optional initial operator usernames.
3. Reject identifier conflicts and domain overlaps explicitly.
4. Persist optional operator assignments through canonical WL-008 assignment path.
5. Keep node bootstrap immediately compatible with manifest/domain/assignment/readiness flows.
6. Provide minimal control-host form (no wizard, no bulk import, no permission-console expansion).
**Dependencies:** ANU-WL-008, ANU-WL-010, ANU-WL-011
**Acceptance criteria:**
1. Platform admin can create node with minimal valid bootstrap payload.
2. Duplicate/conflicting node identity is rejected.
3. Duplicate/conflicting canonical domain is rejected.
4. Optional initial operator assignments persist correctly.
5. New node works with existing manifest/domain/publish-readiness flows.
6. Non-platform operators cannot access bootstrap path.
**Evidence required:**
- focused backend/frontend test output
- typecheck output
**Owner type:** Backend + Frontend + Platform
**Milestone:** M5+
**Execution status (2026-04-15):** COMPLETE - minimal platform-admin node bootstrap is live end-to-end with strict allowlisted payload validation, explicit conflict handling, immediate WL flow compatibility, and focused backend/frontend test coverage.

