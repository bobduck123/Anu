# Milestone Acceptance Pack (2026-04-07)

## Acceptance Rule
No milestone is accepted on code alone.
Each milestone requires:
- updated docs,
- passing tests,
- live proof,
- operator proof where relevant,
- rollback notes,
- unresolved-risk note.

## M1 - Operational Statehood
### Required outcomes
- tenant contract repaired,
- control route foundation live,
- control proxy posture defined,
- initial control host gating enforced.

### Required proof
- node config contract tests,
- control host routing tests,
- control proxy tests,
- public deny / control allow screenshots,
- rollback notes for route migration.

## M2 - Route and Threshold Canon
### Required outcomes
- route-purpose registry complete,
- threshold registry complete,
- route guidance consuming registries,
- threshold semantics visible on flagship surfaces,
- internal lab canon resolved and explicit (`/lab` canonical, `/sandbox/ui-lab` legacy alias).

### Required proof
- registry tests,
- manifest/registry parity tests,
- alias/canonical route tests,
- route screenshots showing threshold semantics,
- doc-code alignment confirmation.

## M3 - Connector Substrate
### Required outcomes
- connector model and service,
- public connector API,
- connector rail UI,
- first flagship journey wired.

### Required proof
- connector persistence tests,
- public connector API tests,
- connector UI tests,
- one end-to-end journey proof.

### Evidence snapshot (2026-04-14)
- backend connector suite: `python -m pytest -q tests/test_public_connectors.py` (5 passed),
- backend transparency/news suites: `python -m pytest -q tests/test_public_transparency.py tests/test_public_community_news.py` (3 passed),
- frontend connector/auth-touch suite: `npx vitest run src/test/journeyConnectorRegistry.test.ts src/test/journeyConnectorsApiRoute.test.ts src/test/journeyConnectorRail.test.tsx src/test/educationMaps.test.ts src/test/connectorDocsSync.test.ts` (5 files, 31 tests passed),
- impact-service Falak non-db suite: `npm run -s test:non-db -- tests/falak/falakService.test.ts` (17 suites, 58 tests passed).

## M4 - Trust and Archive Foundation
### Required outcomes
- archive skeleton routes,
- public trust report model/API,
- sponsor disclosure surface,
- non-distortion enforcement,
- canonical archive index summary feed,
- deterministic archive pagination contract + UI controls,
- minimal public-safe archive query refinement.

### Required proof
- archive route tests,
- trust report tests,
- sponsor disclosure tests,
- public trust/disclosure screenshots.

### Evidence snapshot (ANU-017/018/019/021 slice, 2026-04-14)
- backend trust + sponsor + transparency slice: `python -m pytest -q tests/test_public_sponsor_disclosures.py tests/test_public_trust.py tests/test_public_connectors.py tests/test_public_transparency.py` (13 passed),
- frontend trust-center slice: `npx vitest run src/test/trustCenterPage.test.tsx src/test/transparencyPage.test.tsx src/test/archiveRecordPage.test.tsx src/test/sponsorDisclosurePanel.test.tsx src/test/archivePage.test.tsx` (5 files, 12 tests passed),
- frontend typecheck: `npm run -s typecheck` (pass),
- migration artifact:
  - `flora-fauna/backend/migrations/versions/20260414_public_sponsor_disclosure.sql`,
- implementation references:
  - `frontend-next/src/app/(public)/archive/page.tsx`
  - `frontend-next/src/app/(public)/archive/[record]/page.tsx`
  - `frontend-next/src/app/(public)/transparency/page.tsx`
  - `frontend-next/src/app/(public)/trust/page.tsx`
  - `frontend-next/src/components/trust/TrustCenterShell.tsx`
  - `frontend-next/src/components/transparency/SponsorDisclosurePanel.tsx`
  - `frontend-next/src/lib/api/publicSponsorDisclosures.ts`
  - `flora-fauna/backend/app/api/public_trust.py`
  - `flora-fauna/backend/app/api/public_transparency.py`
  - `flora-fauna/backend/app/services/trust_report_service.py`
  - `flora-fauna/backend/app/services/sponsor_disclosure_service.py`

### Evidence snapshot (archive index + canonical summary feed slice, 2026-04-14)
- backend archive summary slice: `python -m pytest -q tests/test_public_archive.py tests/test_public_trust.py tests/test_public_sponsor_disclosures.py` (9 passed),
- frontend archive index slice: `npx vitest run src/test/archivePage.test.tsx src/test/archiveRecordPage.test.tsx` (2 files, 6 tests passed),
- frontend typecheck: `npm run -s typecheck` (pass),
- implementation references:
  - `flora-fauna/backend/app/api/public_archive.py`
  - `flora-fauna/backend/app/services/archive_service.py`
  - `flora-fauna/backend/tests/test_public_archive.py`
  - `flora-fauna/backend/app/schemas.py`
  - `frontend-next/src/lib/api/publicArchive.ts`
  - `frontend-next/src/app/(public)/archive/page.tsx`
  - `frontend-next/src/components/archive/ArchiveShell.tsx`
  - `frontend-next/src/test/archivePage.test.tsx`

### Evidence snapshot (ANU-027 deterministic pagination follow-up, 2026-04-14)
- backend archive pagination slice: `python -m pytest -q tests/test_public_archive.py tests/test_public_trust.py tests/test_public_sponsor_disclosures.py` (10 passed),
- frontend archive pagination slice: `npx vitest run src/test/archivePage.test.tsx src/test/archiveRecordPage.test.tsx` (2 files, 7 tests passed),
- frontend typecheck: `npm run -s typecheck` (pass),
- implementation references:
  - `flora-fauna/backend/app/services/archive_service.py`
  - `flora-fauna/backend/app/api/public_archive.py`
  - `flora-fauna/backend/app/schemas.py`
  - `flora-fauna/backend/tests/test_public_archive.py`
  - `frontend-next/src/lib/api/publicArchive.ts`
  - `frontend-next/src/app/(public)/archive/page.tsx`
  - `frontend-next/src/components/archive/ArchiveShell.tsx`
  - `frontend-next/src/test/archivePage.test.tsx`

### Evidence snapshot (ANU-028 title-prefix refinement, 2026-04-14)
- backend archive refinement slice: `python -m pytest -q tests/test_public_archive.py tests/test_public_trust.py tests/test_public_sponsor_disclosures.py` (11 passed),
- frontend archive refinement slice: `npx vitest run src/test/archivePage.test.tsx src/test/archiveRecordPage.test.tsx` (2 files, 7 tests passed),
- frontend typecheck: `npm run -s typecheck` (pass),
- implementation references:
  - `flora-fauna/backend/app/services/archive_service.py`
  - `flora-fauna/backend/app/api/public_archive.py`
  - `flora-fauna/backend/app/schemas.py`
  - `flora-fauna/backend/tests/test_public_archive.py`
  - `frontend-next/src/lib/api/publicArchive.ts`
  - `frontend-next/src/app/(public)/archive/page.tsx`
  - `frontend-next/src/components/archive/ArchiveShell.tsx`
  - `frontend-next/src/test/archivePage.test.tsx`

### Evidence snapshot (ANU-029 query-normalization guardrail hardening, 2026-04-16)
- backend guardrail slice:
  - `python -m pytest -q tests/test_public_archive.py` (8 passed),
- frontend guardrail slice:
  - `npx vitest run src/test/archivePage.test.tsx` (1 file, 6 tests passed),
- implementation references:
  - `flora-fauna/backend/app/services/archive_service.py`
  - `flora-fauna/backend/app/api/public_archive.py`
  - `flora-fauna/backend/tests/test_public_archive.py`
  - `frontend-next/src/lib/api/publicArchive.ts`
  - `frontend-next/src/app/(public)/archive/page.tsx`
  - `frontend-next/src/test/archivePage.test.tsx`
- request/response guardrail example:
```http
GET /public/archive/records?title_prefix=%20%20Alpha%20%20%20Trust%20%20&page=1&page_size=5
```
```json
{
  "data": {
    "applied_title_prefix_filter": "Alpha Trust",
    "applied_filters": {
      "title_prefix": "Alpha Trust"
    }
  }
}
```

### Evidence snapshot (ANU-022 decision register publication path, 2026-04-14)
- backend decision publication slice:
  - `python -m pytest -q -p no:cacheprovider -p no:tmpdir tests/test_public_decisions.py tests/test_public_archive.py tests/test_public_trust.py` (12 passed in sandbox run),
- frontend decision-link archive slice:
  - `npx vitest run src/test/archivePage.test.tsx src/test/archiveRecordPage.test.tsx` (2 files, 7 tests passed),
- frontend typecheck:
  - `npm run -s typecheck` (pass),
- implementation references:
  - `flora-fauna/backend/app/services/decision_register_service.py`
  - `flora-fauna/backend/app/api/public_trust.py`
  - `flora-fauna/backend/app/services/archive_service.py`
  - `flora-fauna/backend/app/schemas.py`
  - `flora-fauna/backend/tests/test_public_decisions.py`
  - `frontend-next/src/lib/api/publicTrust.ts`
  - `frontend-next/src/components/archive/ArchiveRecordShell.tsx`
  - `frontend-next/src/components/archive/ArchiveShell.tsx`
  - `frontend-next/src/app/(public)/archive/[record]/page.tsx`
  - `frontend-next/src/test/archiveRecordPage.test.tsx`

### Remaining for broader M4 closure
- trust-center expansion beyond foundation IA remains pending (`ANU-022+` scope).
- sponsor disclosure rendering proof captured; additional optional captures can still be attached for release packaging.

## M5 - Node Proof
### Required outcomes
- backend-Falak binding live,
- proving-ground node coherent across services,
- cross-tenant isolation proof,
- node-scoped public/control behaviour evidenced.

### Required proof
- node binding tests,
- cross-tenant denial tests,
- public host vs control host proof,
- node-scoped flagship journey proof.

### Evidence snapshot (ANU-WL-001 white-label public foundation, 2026-04-14)
- backend host-resolution + manifest contract:
  - `python -m pytest -q tests/test_domain_resolution_contract.py tests/test_node_config_contract.py tests/test_public_site_manifest.py` (15 passed),
- frontend host-aware manifest consumption + public shell:
  - `npx vitest run src/test/proxyTenantContract.test.ts src/test/tenantBrandContract.test.tsx src/test/publicSiteManifestRail.test.tsx` (3 files, 7 tests passed),
- frontend typecheck:
  - `npm run -s typecheck` (pass),
- implementation references:
  - `flora-fauna/backend/app/services/public_site_service.py`
  - `flora-fauna/backend/app/api/public_sites.py`
  - `flora-fauna/backend/app/api/domain_resolution.py`
  - `flora-fauna/backend/app/api/public_nodes.py`
  - `flora-fauna/backend/tests/test_public_site_manifest.py`
  - `frontend-next/src/lib/publicSiteManifest.ts`
  - `frontend-next/src/ui-system/layout/TenantBrandWrapper.tsx`
  - `frontend-next/src/components/public/PublicSiteManifestRail.tsx`
  - `frontend-next/src/proxy.ts`
  - `frontend-next/src/test/proxyTenantContract.test.ts`
  - `frontend-next/src/test/tenantBrandContract.test.tsx`
  - `frontend-next/src/test/publicSiteManifestRail.test.tsx`

### Evidence snapshot (ANU-WL-002 control-host manifest authoring, 2026-04-14)
- backend control-plane authoring + validation/immutability contract:
  - `python -m pytest -q tests/test_control_public_site_manifest_authoring.py tests/test_public_site_manifest.py tests/test_domain_resolution_contract.py tests/test_node_config_contract.py` (20 passed),
- frontend control-host editor rendering + validation honesty:
  - `npx vitest run src/test/controlManifestAuthoringPage.test.tsx src/test/controlProxyRoute.test.ts src/test/adminTenantsPage.test.tsx` (3 files, 8 tests passed),
- frontend typecheck:
  - `npm run -s typecheck` (pass),
- implementation references:
  - `flora-fauna/backend/app/services/public_site_authoring_service.py`
  - `flora-fauna/backend/app/api/cultural_control.py`
  - `flora-fauna/backend/app/security/control_plane.py`
  - `flora-fauna/backend/app/schemas.py`
  - `flora-fauna/backend/tests/test_control_public_site_manifest_authoring.py`
  - `frontend-next/src/app/(control)/control/tenants/[nodeId]/manifest/page.tsx`
  - `frontend-next/src/lib/api/controlClient.ts`
  - `frontend-next/src/app/(control)/control/tenants/page.tsx`
  - `frontend-next/src/test/controlManifestAuthoringPage.test.tsx`

### Evidence snapshot (ANU-WL-003 optimistic concurrency for manifest authoring, 2026-04-14)
- backend revision-token concurrency contract:
  - `python -m pytest -q tests/test_control_public_site_manifest_authoring.py tests/test_public_site_manifest.py tests/test_domain_resolution_contract.py tests/test_node_config_contract.py` (pass),
- frontend stale-write conflict messaging:
  - `npx vitest run src/test/controlManifestAuthoringPage.test.tsx src/test/controlProxyRoute.test.ts src/test/adminTenantsPage.test.tsx` (pass),
- frontend typecheck:
  - `npm run -s typecheck` (pass),
- implementation references:
  - `flora-fauna/backend/app/services/public_site_authoring_service.py`
  - `flora-fauna/backend/app/api/cultural_control.py`
  - `flora-fauna/backend/app/schemas.py`
  - `flora-fauna/backend/tests/test_control_public_site_manifest_authoring.py`
  - `frontend-next/src/lib/api/controlClient.ts`
  - `frontend-next/src/app/(control)/control/tenants/[nodeId]/manifest/page.tsx`
  - `frontend-next/src/test/controlManifestAuthoringPage.test.tsx`

### Evidence snapshot (ANU-WL-004 draft/publish separation for manifests, 2026-04-14)
- backend draft-vs-published + explicit publish contract:
  - `python -m pytest -q tests/test_control_public_site_manifest_authoring.py` (pass),
- frontend draft preview + explicit publish action + stale publish honesty:
  - `npx vitest run src/test/controlManifestAuthoringPage.test.tsx src/test/controlProxyRoute.test.ts src/test/adminTenantsPage.test.tsx` (pass),
- frontend typecheck:
  - `npm run -s typecheck` (pass),
- implementation references:
  - `flora-fauna/backend/app/services/public_site_authoring_service.py`
  - `flora-fauna/backend/app/api/cultural_control.py`
  - `flora-fauna/backend/app/schemas.py`
  - `flora-fauna/backend/tests/test_control_public_site_manifest_authoring.py`
  - `frontend-next/src/lib/api/controlClient.ts`
  - `frontend-next/src/app/(control)/control/tenants/[nodeId]/manifest/page.tsx`
  - `frontend-next/src/test/controlManifestAuthoringPage.test.tsx`

### Evidence snapshot (ANU-WL-005 published-state freshness metadata, 2026-04-14)
- backend published metadata contract:
  - `python -m pytest -q tests/test_control_public_site_manifest_authoring.py` (pass),
- frontend live-status/freshness rendering:
  - `npx vitest run src/test/controlManifestAuthoringPage.test.tsx src/test/controlProxyRoute.test.ts src/test/adminTenantsPage.test.tsx` (pass),
- frontend typecheck:
  - `npm run -s typecheck` (pass),
- implementation references:
  - `flora-fauna/backend/app/services/public_site_authoring_service.py`
  - `flora-fauna/backend/app/api/cultural_control.py`
  - `flora-fauna/backend/tests/test_control_public_site_manifest_authoring.py`
  - `frontend-next/src/lib/api/controlClient.ts`
  - `frontend-next/src/app/(control)/control/tenants/[nodeId]/manifest/page.tsx`
  - `frontend-next/src/test/controlManifestAuthoringPage.test.tsx`

### Evidence snapshot (ANU-WL-007 authoritative delegated scope issuance, 2026-04-14)
- backend token issuance + delegated scope enforcement:
  - `python -m pytest -q tests/test_control_token_managed_node_scope.py tests/test_control_public_site_manifest_authoring.py` (pass),
- frontend scoped tenant/action visibility contract:
  - `npx vitest run src/test/controlManifestAuthoringPage.test.tsx src/test/controlProxyRoute.test.ts src/test/adminTenantsPage.test.tsx` (pass),
- frontend typecheck:
  - `npm run -s typecheck` (pass),
- implementation references:
  - `flora-fauna/backend/app/security/control_tenant_scope.py`
  - `flora-fauna/backend/app/auth.py`
  - `flora-fauna/backend/app/api/cultural_control.py`
  - `flora-fauna/backend/app/api/admin_tenants.py`
  - `flora-fauna/backend/tests/test_control_token_managed_node_scope.py`

### Evidence snapshot (ANU-WL-008 platform-admin assignment management, 2026-04-15)
- backend assignment-management + scope compatibility suite:
  - `python -m pytest -q -p no:cacheprovider -p no:tmpdir tests/test_control_operator_assignments_api.py tests/test_control_token_managed_node_scope.py tests/test_control_public_site_manifest_authoring.py` (19 passed),
- implementation references:
  - `flora-fauna/backend/app/api/cultural_control.py`
  - `flora-fauna/backend/app/services/control_operator_assignment_service.py`
  - `flora-fauna/backend/app/security/control_tenant_scope.py`
  - `flora-fauna/backend/app/security/control_plane.py`
  - `flora-fauna/backend/tests/test_control_operator_assignments_api.py`
- scope note:
  - assignment storage remains in `NodeConfig.config_json.control_operator_assignments`; WL-007 token issuance and runtime scope intersection continue to use persisted assignment state.

### Evidence snapshot (ANU-WL-009 control-host assignment UI, 2026-04-15)
- frontend control-host assignment-management UI suite:
  - `npx vitest run src/test/adminTenantsPage.test.tsx src/test/controlManifestAuthoringPage.test.tsx` (2 files, 10 tests passed),
  - `npm run -s typecheck` (pass),
- implementation references:
  - `frontend-next/src/app/(control)/control/tenants/page.tsx`
  - `frontend-next/src/lib/api/controlClient.ts`
  - `frontend-next/src/test/adminTenantsPage.test.tsx`
- scope note:
  - UI consumes WL-008 assignment endpoints only and remains hidden for non-platform operators (`platform_admin_required` response path).

### Evidence snapshot (ANU-WL-010 control-host domain/publication ops, 2026-04-15)
- backend domain-binding + host-resolution compatibility suite:
  - `python -m pytest -q -p no:cacheprovider -p no:tmpdir tests/test_control_site_domain_bindings_api.py tests/test_public_site_manifest.py` (10 passed),
- frontend control-host domain-binding UI suite:
  - `npx vitest run src/test/controlManifestAuthoringPage.test.tsx src/test/adminTenantsPage.test.tsx` (2 files, 14 tests passed),
  - `npm run -s typecheck` (pass),
- implementation references:
  - `flora-fauna/backend/app/services/control_site_domain_service.py`
  - `flora-fauna/backend/app/api/cultural_control.py`
  - `flora-fauna/backend/app/security/control_plane.py`
  - `flora-fauna/backend/app/schemas.py`
  - `flora-fauna/backend/tests/test_control_site_domain_bindings_api.py`
  - `frontend-next/src/lib/api/controlClient.ts`
  - `frontend-next/src/app/(control)/control/tenants/[nodeId]/manifest/page.tsx`
  - `frontend-next/src/test/controlManifestAuthoringPage.test.tsx`
- scope note:
  - Domain bindings remain a narrow platform-admin control slice (no DNS automation, no certificate UI, no broad domain console).

### Evidence snapshot (ANU-WL-011 control-host publish-readiness preflight, 2026-04-15)
- backend publish-readiness + domain/manifest compatibility suite:
  - `python -m pytest -q -p no:cacheprovider -p no:tmpdir tests/test_control_site_publish_readiness_api.py tests/test_control_site_domain_bindings_api.py tests/test_control_public_site_manifest_authoring.py tests/test_public_site_manifest.py` (24 passed),
- frontend control-host manifest readiness rendering suite:
  - `npx vitest run src/test/controlManifestAuthoringPage.test.tsx src/test/adminTenantsPage.test.tsx` (2 files, 15 tests passed),
  - `npm run -s typecheck` (pass),
- implementation references:
  - `flora-fauna/backend/app/services/control_site_publish_readiness_service.py`
  - `flora-fauna/backend/app/api/cultural_control.py`
  - `flora-fauna/backend/tests/test_control_site_publish_readiness_api.py`
  - `frontend-next/src/lib/api/controlClient.ts`
  - `frontend-next/src/app/(control)/control/tenants/[nodeId]/manifest/page.tsx`
  - `frontend-next/src/test/controlManifestAuthoringPage.test.tsx`
- scope note:
  - Readiness is a narrow deterministic preflight contract (`ready`, `blocking_issues`, `warnings`) and does not add DNS/provider automation or workflow-engine approvals.

### Evidence snapshot (ANU-WL-012 platform-admin node bootstrap, 2026-04-15)
- backend bootstrap + compatibility suite:
  - `python -m pytest -q -p no:cacheprovider -p no:tmpdir tests/test_control_site_bootstrap_api.py tests/test_control_operator_assignments_api.py tests/test_control_site_domain_bindings_api.py tests/test_control_site_publish_readiness_api.py tests/test_control_public_site_manifest_authoring.py` (33 passed),
- frontend control-host bootstrap UI suite:
  - `npx vitest run src/test/adminTenantsPage.test.tsx src/test/controlManifestAuthoringPage.test.tsx` (2 files, 18 tests passed),
  - `npm run -s typecheck` (pass),
- implementation references:
  - `flora-fauna/backend/app/services/control_site_bootstrap_service.py`
  - `flora-fauna/backend/app/api/cultural_control.py`
  - `flora-fauna/backend/app/schemas.py`
  - `flora-fauna/backend/app/security/control_plane.py`
  - `flora-fauna/backend/tests/test_control_site_bootstrap_api.py`
  - `frontend-next/src/lib/api/controlClient.ts`
  - `frontend-next/src/app/(control)/control/tenants/page.tsx`
  - `frontend-next/src/test/adminTenantsPage.test.tsx`
- scope note:
  - Bootstrap remains a narrow platform-admin control slice with deterministic validation/conflict behavior and no workflow engine, CMS, RBAC redesign, or DNS automation.

### Evidence snapshot (ANU-020 cross-service isolation proof, 2026-04-14)
- backend cross-service/node isolation proof suite:
  - `python -m pytest -q tests/test_node_isolation.py tests/test_domain_resolution.py tests/test_public_connectors.py tests/test_node_service_binding.py` (15 passed),
- impact-service tenant binding + journey node-scope proof suite:
  - `npm run -s test:non-db -- tests/falak/falakTenantBinding.test.ts tests/falak/falakService.test.ts` (pass),
- frontend control-host/tenant-brand/flagship-journey proof suite:
  - `npx vitest run src/test/tenantBrandContract.test.tsx src/test/controlPlaneHostRouting.test.tsx src/test/flagshipJourney.test.tsx src/test/journeyConnectorsApiRoute.test.ts src/test/journeyConnectorRegistry.test.ts` (5 files, 16 tests passed),
- frontend typecheck:
  - `npm run -s typecheck` (pass),
- implementation references:
  - `flora-fauna/backend/app/services/connector_service.py`
  - `flora-fauna/backend/app/api/public_connectors.py`
  - `flora-fauna/backend/tests/test_node_isolation.py`
  - `flora-fauna/backend/tests/test_domain_resolution.py`
  - `services/impact-service/tests/falak/falakTenantBinding.test.ts`
  - `services/impact-service/tests/falak/falakService.test.ts`
  - `frontend-next/src/app/api/sdk/journey-connectors/route.ts`
  - `frontend-next/src/ui-system/anu/journeyConnectorRegistry.ts`
  - `frontend-next/src/ui-system/layout/JourneyConnectorRail.tsx`
  - `frontend-next/src/test/flagshipJourney.test.tsx`
  - `frontend-next/src/test/controlPlaneHostRouting.test.tsx`
  - `frontend-next/src/test/tenantBrandContract.test.tsx`

### Evidence snapshot (ANU-023 plane-aware log contract rollout, 2026-04-14)
- backend public/control plane-log contract suite:
  - `python -m pytest -q -p no:cacheprovider -p no:tmpdir tests/test_plane_log_contract.py tests/test_public_trust.py tests/test_public_archive.py` (13 passed),
- frontend public/control plane-log suite:
  - `npx vitest run src/test/controlProxyRoute.test.ts src/test/publicArchiveLogging.test.ts src/test/planeLog.test.ts src/test/archivePage.test.tsx src/test/archiveRecordPage.test.tsx` (5 files, 16 tests passed),
  - `npm run -s typecheck` (pass),
- impact-service impact-plane telemetry suite:
  - `npm run -s test:non-db -- tests/falak/falakTelemetryPlaneLog.test.ts` (pass, non-db suite green),
  - `npm run -s typecheck` (pass),
- implementation references:
  - `flora-fauna/backend/app/security/plane_log.py`
  - `flora-fauna/backend/app/api/public_archive.py`
  - `flora-fauna/backend/app/api/public_trust.py`
  - `flora-fauna/backend/app/security/control_plane.py`
  - `frontend-next/src/lib/observability/planeLog.ts`
  - `frontend-next/src/app/api/control/[...path]/route.ts`
  - `frontend-next/src/lib/api/publicArchive.ts`
  - `services/impact-service/src/falak/observability/planeLog.ts`
  - `services/impact-service/src/falak/observability/falakTelemetry.ts`
  - `services/impact-service/tests/falak/falakTelemetryPlaneLog.test.ts`

### Evidence snapshot (ANU-024 milestone proof automation scaffolding, 2026-04-14)
- scaffold contract tests:
  - `python -m unittest scripts.tests.test_capture_milestone_evidence -v` (5 tests passed),
- generated artifact bundle:
  - `docs/program/evidence/anu-024/20260414T041025Z/evidence.json`
  - `docs/program/evidence/anu-024/20260414T041025Z/evidence.md`
- implementation references:
  - `scripts/capture_milestone_evidence.py`
  - `scripts/tests/test_capture_milestone_evidence.py`
  - `docs/program/EVIDENCE_AUTOMATION_SPEC_2026-04-14.md`
- workflow safety note:
  - automation captures observed results and inferred status only; milestone acceptance conclusions remain human-authored.

### Remaining M5 evidence items
- hosted screenshot artifact for public-host vs control-host isolation (`/control/*`) is still operational-evidence pending.
- hosted recording artifact for flagship journey walk-through is still operational-evidence pending.



