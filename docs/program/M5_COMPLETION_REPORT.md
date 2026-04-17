# M5 Completion Report — Trust and Observatory Surfaces

Date: 2026-04-01
Contract version: `m5.2026-04-01`

## Completed work

1. Implemented trust + observatory protocol manifest (`ANU_OBSERVATORY_MODULES` + rules):
   - trust surfaces (`/transparency`, `/docs`, `/contact`, `/memberships`)
   - subsystem observability (`/flora-fauna`)
   - observatory surfaces (`/governance`, `/admin/runtime-health`, `/organizer`)

2. Added observatory metadata API contract:
   - `GET /api/sdk/observatory-metadata`
   - returns modules, protocol rules, route coverage, and class distribution

3. Upgraded shell metadata contract from M4 to M5:
   - shell metadata now includes `observatory` block with module/rule/coverage evidence

4. Consolidated trust/governance stat blocks into shared labyrinth primitive:
   - added `ObservatoryStatsRail`
   - replaced one-off embedded stat panels in:
     - `/transparency`
     - `/docs`
     - `/governance`

5. Upgraded admin runtime diagnostics into ANU observatory grammar:
   - `admin/runtime-health` now uses ANU hero + metric rails + observatory panels
   - preserves endpoint contract verification semantics (pass/fail/status/latency/payload)

6. Added M5 tests:
   - observatory manifest and API route contracts
   - shell metadata M5 integration
   - shared observatory stats primitive rendering
   - runtime health observatory surface behavior
   - trust/governance/docs route coverage remains green

7. Added M5 CI gate workflow:
   - typecheck + broad M1–M5 contract/surface test matrix

## Artifacts

- `frontend-next/src/ui-system/anu/observatoryManifest.ts`
- `frontend-next/src/app/api/sdk/observatory-metadata/route.ts`
- `frontend-next/src/ui-system/shell/shellMetadata.ts`
- `frontend-next/src/ui-system/realms/labyrinth/ObservatoryStatsRail.tsx`
- `frontend-next/src/app/(public)/transparency/page.tsx`
- `frontend-next/src/app/(public)/docs/page.tsx`
- `frontend-next/src/app/(app)/governance/page.tsx`
- `frontend-next/src/app/(app)/admin/runtime-health/page.tsx`
- `frontend-next/src/test/observatoryManifest.test.ts`
- `frontend-next/src/test/observatoryMetadataApiRoute.test.ts`
- `frontend-next/src/test/observatoryStatsRail.test.tsx`
- `frontend-next/src/test/runtimeHealthPage.test.tsx`
- `frontend-next/src/test/shellMetadataApiRoute.test.ts`
- `.github/workflows/m5-trust-observatory-gates.yml`
- `docs/program/M5_QUEUE.md`

## Validation commands

```bash
cd frontend-next
npm run typecheck
npx vitest run src/test/anuUiLab.test.tsx src/test/anuSurfacePrimitives.test.tsx src/test/primitiveManifest.test.ts src/test/chamberManifest.test.ts src/test/communityManifest.test.ts src/test/observatoryManifest.test.ts src/test/realmRegistryShellMetadata.test.ts src/test/shellMetadataApiRoute.test.ts src/test/shellPrimitivesApiRoute.test.ts src/test/chamberMetadataApiRoute.test.ts src/test/communityCommonsMetadataApiRoute.test.ts src/test/observatoryMetadataApiRoute.test.ts src/test/observatoryStatsRail.test.tsx src/test/transparencyPage.test.tsx src/test/docsPage.test.tsx src/test/governancePage.test.tsx src/test/runtimeHealthPage.test.tsx src/test/communityPage.test.tsx src/test/communityComposerModal.test.tsx src/test/profilePage.test.tsx src/test/teamsView.test.tsx src/test/microcosmDetailPage.test.tsx src/test/joinMicrocosmPage.test.tsx
npm run build
```

## Results summary

- TypeScript typecheck: PASS
- Vitest suite: PASS (23 files, 36 tests)
- Next build: PASS
- M5 route verification in build output includes:
  - `/api/sdk/observatory-metadata`
  - `/api/sdk/community-commons-metadata`
  - `/api/sdk/chamber-metadata`
  - `/api/sdk/shell-metadata`
  - `/api/sdk/shell-primitives`
  - trust + observatory routes (`/transparency`, `/docs`, `/governance`, `/admin/runtime-health`)

## ANU-WL-001 White-Label Foundation (2026-04-14)

### Scope landed
1. Canonical public site manifest contract is now executable in backend schemas/services.
2. Deterministic host-to-site resolution is available through public-safe endpoints.
3. Existing domain-resolution and public-node contracts now carry `site_manifest`.
4. Frontend public shell now consumes manifest data and renders manifest-driven public nav/legal rails.
5. One exemplar tenant configuration path is in place for `mudyin` via canonical manifest defaults/overrides.

### Key implementation references
- `flora-fauna/backend/app/services/public_site_service.py`
- `flora-fauna/backend/app/api/public_sites.py`
- `flora-fauna/backend/app/api/domain_resolution.py`
- `flora-fauna/backend/app/api/public_nodes.py`
- `flora-fauna/backend/app/schemas.py`
- `frontend-next/src/lib/publicSiteManifest.ts`
- `frontend-next/src/ui-system/layout/TenantBrandWrapper.tsx`
- `frontend-next/src/components/public/PublicSiteManifestRail.tsx`
- `frontend-next/src/proxy.ts`

### Validation snapshot
- Backend: `python -m pytest -q tests/test_domain_resolution_contract.py tests/test_node_config_contract.py tests/test_public_site_manifest.py` (15 passed)
- Frontend: `npx vitest run src/test/proxyTenantContract.test.ts src/test/tenantBrandContract.test.tsx src/test/publicSiteManifestRail.test.tsx` (3 files, 7 tests passed)
- Frontend typecheck: `npm run -s typecheck` (pass)

### Deferred
- No CMS/page-builder/plugin runtime is included.
- No per-tenant custom React execution is introduced.
- Advanced white-label content workflows remain backlog work.

## ANU-WL-002 Control-Host Manifest Authoring Slice (2026-04-14)

### Scope landed
1. Added control-host-only manifest authoring API under `/api/control/sites/:node_id/manifest-authoring` with strict control-plane auth/scopes.
2. Added explicit allowlisted update schema (no raw manifest/config blobs).
3. Added dedicated normalization/validation/update service path with audit-safe structured change summary.
4. Added minimal control-host operator form editor for the WL-002 allowlisted subset (no raw JSON textarea, no CMS builder posture).

### Key implementation references
- `flora-fauna/backend/app/services/public_site_authoring_service.py`
- `flora-fauna/backend/app/api/cultural_control.py`
- `flora-fauna/backend/app/security/control_plane.py`
- `flora-fauna/backend/app/schemas.py`
- `frontend-next/src/app/(control)/control/tenants/[nodeId]/manifest/page.tsx`
- `frontend-next/src/lib/api/controlClient.ts`
- `frontend-next/src/app/(control)/control/tenants/page.tsx`

### Validation snapshot
- Backend: `python -m pytest -q tests/test_control_public_site_manifest_authoring.py tests/test_public_site_manifest.py tests/test_domain_resolution_contract.py tests/test_node_config_contract.py` (20 passed)
- Frontend: `npx vitest run src/test/controlManifestAuthoringPage.test.tsx src/test/controlProxyRoute.test.ts src/test/adminTenantsPage.test.tsx` (3 files, 8 tests passed)
- Frontend typecheck: `npm run -s typecheck` (pass)

### Deferred
- No preview/publish workflow beyond direct control-host mutation.
- No domain management UI changes.
- No CMS/page-builder/custom-component execution work.

## ANU-WL-003 Manifest Authoring Optimistic Concurrency Slice (2026-04-14)

### Scope landed
1. Added deterministic authoring-scoped `revision_token` on manifest-authoring GET payloads.
2. PATCH now requires `revision_token` and enforces optimistic concurrency.
3. Stale writes return `409` with `manifest_authoring_revision_conflict` and latest server payload/token.
4. Control UI now submits revision token and handles conflict honestly by loading latest saved state with stale-write messaging.

### Key implementation references
- `flora-fauna/backend/app/services/public_site_authoring_service.py`
- `flora-fauna/backend/app/api/cultural_control.py`
- `flora-fauna/backend/app/schemas.py`
- `flora-fauna/backend/tests/test_control_public_site_manifest_authoring.py`
- `frontend-next/src/lib/api/controlClient.ts`
- `frontend-next/src/app/(control)/control/tenants/[nodeId]/manifest/page.tsx`
- `frontend-next/src/test/controlManifestAuthoringPage.test.tsx`

### Validation snapshot
- Backend: `python -m pytest -q tests/test_control_public_site_manifest_authoring.py tests/test_public_site_manifest.py tests/test_domain_resolution_contract.py tests/test_node_config_contract.py` (pass)
- Frontend: `npx vitest run src/test/controlManifestAuthoringPage.test.tsx src/test/controlProxyRoute.test.ts src/test/adminTenantsPage.test.tsx` (pass)
- Frontend typecheck: `npm run -s typecheck` (pass)

### Deferred
- No merge editor/diff workflow.
- No revision history browser.

## ANU-WL-004 Draft/Publish Separation Slice (2026-04-14)

### Scope landed
1. Manifest authoring PATCH now writes draft state only (`public_site_manifest_draft`) without mutating published public shell immediately.
2. Public host resolution continues serving published manifest state only.
3. Added explicit control-plane publish action to promote current draft to published manifest.
4. Added control-plane preview/published split rendering (draft preview is control-safe; published snapshot remains explicit).
5. Publish action is revision-token guarded and returns honest 409 stale-publish conflicts.

### Key implementation references
- `flora-fauna/backend/app/services/public_site_authoring_service.py`
- `flora-fauna/backend/app/api/cultural_control.py`
- `flora-fauna/backend/app/schemas.py`
- `flora-fauna/backend/tests/test_control_public_site_manifest_authoring.py`
- `frontend-next/src/lib/api/controlClient.ts`
- `frontend-next/src/app/(control)/control/tenants/[nodeId]/manifest/page.tsx`
- `frontend-next/src/test/controlManifestAuthoringPage.test.tsx`

### Validation snapshot
- Backend: `python -m pytest -q tests/test_control_public_site_manifest_authoring.py` (pass)
- Frontend: `npx vitest run src/test/controlManifestAuthoringPage.test.tsx src/test/controlProxyRoute.test.ts src/test/adminTenantsPage.test.tsx` (pass)
- Frontend typecheck: `npm run -s typecheck` (pass)

### Deferred
- No publish workflow engine beyond explicit manual publish action.
- No merge tooling or history browser.
- No CMS/page-builder expansion.

## ANU-WL-005 Published Freshness Metadata Slice (2026-04-14)

### Scope landed
1. Control manifest read contract now includes published-state freshness metadata: `published_at`, `published_by`, and `published_revision_token`.
2. Metadata is sourced only from the publish action path and is server-derived from authenticated control context.
3. Metadata remains stable across draft-only edits and updates only on explicit publish actions.
4. Control manifest UI now shows minimal published-state status with freshness wording (`Live` vs `Draft ahead of live`).

### Key implementation references
- `flora-fauna/backend/app/services/public_site_authoring_service.py`
- `flora-fauna/backend/app/api/cultural_control.py`
- `flora-fauna/backend/tests/test_control_public_site_manifest_authoring.py`
- `frontend-next/src/lib/api/controlClient.ts`
- `frontend-next/src/app/(control)/control/tenants/[nodeId]/manifest/page.tsx`
- `frontend-next/src/test/controlManifestAuthoringPage.test.tsx`

### Validation snapshot
- Backend: `python -m pytest -q tests/test_control_public_site_manifest_authoring.py` (pass)
- Frontend: `npx vitest run src/test/controlManifestAuthoringPage.test.tsx src/test/controlProxyRoute.test.ts src/test/adminTenantsPage.test.tsx` (pass)
- Frontend typecheck: `npm run -s typecheck` (pass)

### Deferred
- No timeline/history browser.
- No approval/workflow engine.
- No CMS/page-builder expansion.

## ANU-WL-007 Authoritative Delegated Scope Issuance Slice (2026-04-14)

### Scope landed
1. Control-token issuance now derives delegated tenant scope from persisted assignment state only.
2. Non-platform control tokens include `node_id` and `managed_node_ids` (for multi-tenant assignments) from authoritative backend records.
3. Runtime scope checks for manifest and control tenant listing now intersect token claims with persisted assignments to prevent forged claim widening.
4. Existing control host/audience/token_use/MFA posture and WL-006 manifest scope behavior remain intact.

### Persisted assignment source of truth
- `User.node_id`
- `NodeConfig.config_json.control_operator_assignments`

### Key implementation references
- `flora-fauna/backend/app/security/control_tenant_scope.py`
- `flora-fauna/backend/app/auth.py`
- `flora-fauna/backend/app/api/cultural_control.py`
- `flora-fauna/backend/app/api/admin_tenants.py`
- `flora-fauna/backend/tests/test_control_token_managed_node_scope.py`

### Validation snapshot
- Backend:
  - `python -m pytest -q tests/test_control_token_managed_node_scope.py tests/test_control_public_site_manifest_authoring.py` (pass)
- Frontend:
  - `npx vitest run src/test/controlManifestAuthoringPage.test.tsx src/test/controlProxyRoute.test.ts src/test/adminTenantsPage.test.tsx` (pass)
  - `npm run -s typecheck` (pass)

### Deferred
- No RBAC redesign.
- No per-action permission matrix.
- No permission-management console.

## ANU-WL-008 Platform-Admin Operator Assignment Management Slice (2026-04-15)

### Scope landed
1. Added a minimal platform-admin-only control API for tenant operator assignment management:
   - `GET /api/control/sites/:node_id/operator-assignments`
   - `POST /api/control/sites/:node_id/operator-assignments`
   - `DELETE /api/control/sites/:node_id/operator-assignments/:username`
2. Assignment state remains persisted in existing `NodeConfig.config_json.control_operator_assignments` with legacy mirrors kept aligned.
3. Username normalization is now server-side canonical in both assignment persistence and scope-resolution matching.
4. Assignment and unassignment operations are idempotent with explicit mutation metadata (`applied`, `idempotent_noop`).
5. Assignment mutations are audit-logged via control audit events.

### Key implementation references
- `flora-fauna/backend/app/api/cultural_control.py`
- `flora-fauna/backend/app/services/control_operator_assignment_service.py`
- `flora-fauna/backend/app/security/control_tenant_scope.py`
- `flora-fauna/backend/app/security/control_plane.py`
- `flora-fauna/backend/tests/test_control_operator_assignments_api.py`
- `flora-fauna/backend/tests/test_control_token_managed_node_scope.py`
- `flora-fauna/backend/tests/test_control_public_site_manifest_authoring.py`

### Validation snapshot
- Backend:
  - `python -m pytest -q -p no:cacheprovider -p no:tmpdir tests/test_control_operator_assignments_api.py tests/test_control_token_managed_node_scope.py tests/test_control_public_site_manifest_authoring.py`
  - Result: `19 passed`.

### Deferred
- No RBAC redesign.
- No permission-management console or role editor UI expansion.
- No per-action permission matrix.

## ANU-WL-009 Control-Host Operator Assignment UI Slice (2026-04-15)

### Scope landed
1. Added a minimal control-host platform-admin assignment panel inside the canonical tenants control route.
2. UI consumes WL-008 endpoints only for read/assign/unassign flows.
3. Assignment panel is hidden for non-platform operators when the backend returns `platform_admin_required`.
4. Idempotent mutation outcomes are shown explicitly (`already assigned`, `not currently assigned`).
5. Username input handling is normalized to lowercase/trim semantics consistent with server behavior.

### Key implementation references
- `frontend-next/src/app/(control)/control/tenants/page.tsx`
- `frontend-next/src/lib/api/controlClient.ts`
- `frontend-next/src/test/adminTenantsPage.test.tsx`

### Validation snapshot
- Frontend:
  - `npx vitest run src/test/adminTenantsPage.test.tsx src/test/controlManifestAuthoringPage.test.tsx`
  - Result: `2 files passed, 10 tests passed`.
  - `npm run -s typecheck`
  - Result: pass.

### Deferred
- No permission-management console expansion.
- No user directory/search/autocomplete.
- No RBAC redesign or per-action permission matrix.

## ANU-WL-010 Control-Host Domain/Publication Operations Slice (2026-04-15)

### Scope landed
1. Added minimal platform-admin-only control API for tenant published domain bindings:
   - `GET /api/control/sites/:node_id/domain-bindings`
   - `PUT /api/control/sites/:node_id/domain-bindings`
2. Added strict domain validation/normalization and explicit conflict rejection for cross-tenant overlap.
3. Preserved published host-resolution compatibility by updating canonical binding state used by `/api/public/sites/resolve`.
4. Added minimal control-host UI in tenant manifest route for reading/updating canonical domains.
5. Domain-management UI is hidden for non-platform operators via explicit backend platform-admin enforcement.

### Key implementation references
- `flora-fauna/backend/app/services/control_site_domain_service.py`
- `flora-fauna/backend/app/api/cultural_control.py`
- `flora-fauna/backend/app/security/control_plane.py`
- `flora-fauna/backend/app/schemas.py`
- `flora-fauna/backend/tests/test_control_site_domain_bindings_api.py`
- `frontend-next/src/lib/api/controlClient.ts`
- `frontend-next/src/app/(control)/control/tenants/[nodeId]/manifest/page.tsx`
- `frontend-next/src/test/controlManifestAuthoringPage.test.tsx`

### Validation snapshot
- Backend:
  - `python -m pytest -q -p no:cacheprovider -p no:tmpdir tests/test_control_site_domain_bindings_api.py tests/test_public_site_manifest.py`
  - Result: `10 passed`.
- Frontend:
  - `npx vitest run src/test/controlManifestAuthoringPage.test.tsx src/test/adminTenantsPage.test.tsx`
  - Result: `2 files passed, 14 tests passed`.
  - `npm run -s typecheck`
  - Result: pass.

### Deferred
- No DNS provider automation.
- No certificate management UI.
- No broad domain-management console.

## ANU-WL-011 Control-Host Publish-Readiness Preflight Slice (2026-04-15)

### Scope landed
1. Added minimal platform-admin-only control readiness endpoint for white-label node launch preflight:
   - `GET /api/control/sites/:node_id/publish-readiness`
2. Added deterministic readiness service checks for:
   - canonical active domain binding present,
   - published manifest present,
   - required legal links present in published manifest,
   - required trust links present in published manifest.
3. Added explicit structured result contract:
   - `ready`
   - `blocking_issues[]`
   - `warnings[]`
   - `checks` summary booleans.
4. Added warning-vs-blocker distinction with non-blocking TLS warning (`domain_tls_not_ready`).
5. Integrated readiness rendering into the control-host tenant manifest page with honest loading/error/blocked guidance.
6. Preserved platform-admin enforcement and control-host boundary posture.

### Key implementation references
- `flora-fauna/backend/app/services/control_site_publish_readiness_service.py`
- `flora-fauna/backend/app/api/cultural_control.py`
- `flora-fauna/backend/app/security/control_plane.py`
- `flora-fauna/backend/tests/test_control_site_publish_readiness_api.py`
- `frontend-next/src/lib/api/controlClient.ts`
- `frontend-next/src/app/(control)/control/tenants/[nodeId]/manifest/page.tsx`
- `frontend-next/src/test/controlManifestAuthoringPage.test.tsx`

### Validation snapshot
- Backend:
  - `python -m pytest -q -p no:cacheprovider -p no:tmpdir tests/test_control_site_publish_readiness_api.py tests/test_control_site_domain_bindings_api.py tests/test_control_public_site_manifest_authoring.py tests/test_public_site_manifest.py`
  - Result: `24 passed`.
- Frontend:
  - `npx vitest run src/test/controlManifestAuthoringPage.test.tsx src/test/adminTenantsPage.test.tsx`
  - Result: `2 files passed, 15 tests passed`.
  - `npm run -s typecheck`
  - Result: pass.

### Deferred
- No DNS/provider automation.
- No TLS/certificate provisioning workflow.
- No publish approval workflow engine; this slice is read-only preflight evaluation.

## ANU-WL-012 Platform-Admin Node Bootstrap Slice (2026-04-15)

### Scope landed
1. Added minimal platform-admin-only bootstrap API:
   - `POST /api/control/sites/bootstrap`
2. Added strict bootstrap validation for a narrow allowlisted payload:
   - `node_name`, optional `node_slug`,
   - `site_name`, optional `site_key`, optional `tagline`,
   - optional `canonical_domains`,
   - optional `operator_usernames`.
3. Added explicit conflict handling:
   - identifier conflicts for `node_slug`/`site_key` (`identifier_conflict`),
   - canonical domain overlap conflicts (`domain_binding_conflict`).
4. Bootstrap now creates a minimal manifest scaffold immediately compatible with WL-002/WL-010/WL-011 flows.
5. Optional initial operator assignments are persisted through the canonical WL-008 assignment path.
6. Added minimal control-host bootstrap UI in tenant control surface (platform-admin-only visibility).

### Key implementation references
- `flora-fauna/backend/app/services/control_site_bootstrap_service.py`
- `flora-fauna/backend/app/api/cultural_control.py`
- `flora-fauna/backend/app/schemas.py`
- `flora-fauna/backend/app/security/control_plane.py`
- `flora-fauna/backend/tests/test_control_site_bootstrap_api.py`
- `frontend-next/src/lib/api/controlClient.ts`
- `frontend-next/src/app/(control)/control/tenants/page.tsx`
- `frontend-next/src/test/adminTenantsPage.test.tsx`

### Validation snapshot
- Backend:
  - `python -m pytest -q -p no:cacheprovider -p no:tmpdir tests/test_control_site_bootstrap_api.py tests/test_control_operator_assignments_api.py tests/test_control_site_domain_bindings_api.py tests/test_control_site_publish_readiness_api.py tests/test_control_public_site_manifest_authoring.py`
  - Result: `33 passed`.
- Frontend:
  - `npx vitest run src/test/adminTenantsPage.test.tsx src/test/controlManifestAuthoringPage.test.tsx`
  - Result: `2 files passed, 18 tests passed`.
  - `npm run -s typecheck`
  - Result: pass.

### Deferred
- No onboarding workflow engine or approvals.
- No CMS/page-builder workflow.
- No DNS/provider automation.
- No RBAC redesign or permission-console expansion.

## ANU-020 Cross-Service Isolation Proof Slice (2026-04-14)

### Scope landed
1. Added backend isolation proof tests for host/domain node resolution and connector node-scoping.
2. Fixed connector multi-tenant slug collisions by making connector/archive/trust journey slugs deterministic and node-scoped.
3. Tightened `/public/connectors` and `/public/journeys/:slug` behavior so unknown explicit `node` overrides return `404` instead of silently falling back.
4. Extended impact-service tenant binding and journey projection tests with explicit tenant-scope assertions.
5. Extended frontend isolation proofs for control-host forwarding precedence, tenant host fallback honesty, and node-scoped flagship journey connector query forwarding.

### Key implementation references
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

### Validation snapshot
- Backend:
  - `python -m pytest -q tests/test_node_isolation.py tests/test_domain_resolution.py tests/test_public_connectors.py tests/test_node_service_binding.py`
  - Result: `15 passed`.
- Impact-service:
  - `npm run -s test:non-db -- tests/falak/falakTenantBinding.test.ts tests/falak/falakService.test.ts`
  - Result: pass (non-db suite green, includes updated Falak binding/projection assertions).
- Frontend:
  - `npx vitest run src/test/tenantBrandContract.test.tsx src/test/controlPlaneHostRouting.test.tsx src/test/flagshipJourney.test.tsx src/test/journeyConnectorsApiRoute.test.ts src/test/journeyConnectorRegistry.test.ts`
  - Result: `5` files passed, `16` tests passed.
  - `npm run -s typecheck`
  - Result: pass.

### Evidence status
- Code-level isolation proof and test-output evidence: complete.
- Host screenshot and flagship journey recording artifacts: pending operational capture in hosted environment.

## ANU-023 Plane-Aware Log Contract Rollout (2026-04-14)

### Scope landed
1. Added canonical plane-log envelope helpers with explicit plane validation (`public`, `control`, `impact`) and sensitive-field redaction safeguards.
2. Rolled backend public/control emission into:
   - `public_archive` / `public_trust` route handlers (`plane=public`)
   - control auth/audit path in `control_plane` (`plane=control`)
3. Rolled frontend emission into:
   - control proxy route (`plane=control`)
   - public archive client degraded/failure paths (`plane=public`)
4. Rolled impact-service emission into Falak telemetry:
   - canonical envelope (`plane=impact`)
   - explicit `falak_execution_plane` context retained.

### Key implementation references
- `flora-fauna/backend/app/security/plane_log.py`
- `flora-fauna/backend/app/api/public_archive.py`
- `flora-fauna/backend/app/api/public_trust.py`
- `flora-fauna/backend/app/security/control_plane.py`
- `frontend-next/src/lib/observability/planeLog.ts`
- `frontend-next/src/app/api/control/[...path]/route.ts`
- `frontend-next/src/lib/api/publicArchive.ts`
- `services/impact-service/src/falak/observability/planeLog.ts`
- `services/impact-service/src/falak/observability/falakTelemetry.ts`
- `services/impact-service/src/falak/domain/types.ts`
- `services/impact-service/src/falak/domain/schemas.ts`

### Validation snapshot
- Backend:
  - `python -m pytest -q -p no:cacheprovider -p no:tmpdir tests/test_plane_log_contract.py tests/test_public_trust.py tests/test_public_archive.py`
  - Result: `13 passed`.
- Frontend:
  - `npx vitest run src/test/controlProxyRoute.test.ts src/test/publicArchiveLogging.test.ts src/test/planeLog.test.ts src/test/archivePage.test.tsx src/test/archiveRecordPage.test.tsx`
  - Result: `5 files passed, 16 tests passed`.
  - `npm run -s typecheck`
  - Result: pass.
- Impact-service:
  - `npm run -s test:non-db -- tests/falak/falakTelemetryPlaneLog.test.ts`
  - Result: pass (non-db suite green).
  - `npm run -s typecheck`
  - Result: pass.

### Deferred
- No observability vendor/platform migration.
- No metrics/tracing platform redesign beyond minimum ANU-023 log envelope contract.

## ANU-024 Milestone Proof Automation Scaffolding (2026-04-14)

### Scope landed
1. Added workflow-safe evidence capture script:
   - `scripts/capture_milestone_evidence.py`
2. Script now emits dual artifacts per bundle:
   - machine-readable `evidence.json`
   - human-readable `evidence.md`
3. Added contract-focused tests for:
   - deterministic bundle generation
   - failed command honesty
   - append-only bundle path behavior
   - non-overwrite of milestone conclusion docs
4. Added explicit spec doc:
   - `docs/program/EVIDENCE_AUTOMATION_SPEC_2026-04-14.md`

### Validation snapshot
- `python -m unittest scripts.tests.test_capture_milestone_evidence -v`
  - Result: 5 tests passed.
- Generated evidence bundle:
  - `docs/program/evidence/anu-024/20260414T041025Z/evidence.json`
  - `docs/program/evidence/anu-024/20260414T041025Z/evidence.md`

### Workflow-safety posture
- Automation captures observations and inferred status only.
- Milestone completion conclusions remain human-authored.
- Existing M0-M5 workflow file names remain unchanged.

### Deferred
- No workflow engine or auto-approval logic.
- No automatic milestone conclusion writing.
- No CI/CD architecture redesign.

## ANU-LAUNCH-001 Release-Candidate Smoke Verification (2026-04-16)

### Scope landed
1. Added a narrow smoke runner for critical public/control/white-label launch paths:
   - `scripts/launch_rc_smoke.py`
2. Added explicit smoke status model per check:
   - `passed`, `failed`, `skipped`
3. Integrated launch smoke into ANU-024 evidence automation as an optional layer:
   - `scripts/capture_milestone_evidence.py --run-launch-smoke`
4. Extended evidence bundle contract with optional smoke artifacts:
   - `launch_smoke.json`
   - `launch_smoke.md`
5. Added focused tests for smoke determinism/honesty and evidence integration:
   - `scripts/tests/test_launch_rc_smoke.py`
   - `scripts/tests/test_capture_milestone_evidence.py`

### Validation snapshot
- `python -m unittest scripts.tests.test_launch_rc_smoke -v`
  - Result: 3 tests passed.
- `python -m unittest scripts.tests.test_capture_milestone_evidence -v`
  - Result: 6 tests passed.
- Generated ANU-LAUNCH-001 evidence bundle:
  - `docs/program/evidence/anu-launch-001/anu-launch-001-rc-smoke/evidence.json`
  - `docs/program/evidence/anu-launch-001/anu-launch-001-rc-smoke/evidence.md`
  - `docs/program/evidence/anu-launch-001/anu-launch-001-rc-smoke/launch_smoke.json`
  - `docs/program/evidence/anu-launch-001/anu-launch-001-rc-smoke/launch_smoke.md`

### Contract posture
- Launch smoke is release-candidate verification only.
- Launch readiness is not auto-claimed by automation (`launch_readiness_claim = null`).
- This slice does not add full browser E2E infrastructure or CI/CD redesign.

## ANU-LAUNCH-002 Hosted Release-Candidate Smoke Evidence Capture (2026-04-16)

### Scope landed
1. Added hosted-environment smoke runner using explicit target inputs:
   - `scripts/launch_rc_hosted_smoke.py`
2. Added hosted smoke evidence integration in the existing ANU-024 bundle script:
   - `scripts/capture_milestone_evidence.py --run-hosted-launch-smoke`
3. Added hosted artifact outputs:
   - `hosted_launch_smoke.json`
   - `hosted_launch_smoke.md`
4. Added explicit operator attachment manifest output:
   - `attachments.json`
   - `attachments/` directory convention for operator-managed screenshot/recording files
5. Added focused tests for hosted smoke determinism/honesty and hosted evidence/attachment integration:
   - `scripts/tests/test_launch_rc_hosted_smoke.py`
   - `scripts/tests/test_capture_milestone_evidence.py`

### Validation snapshot
- `python -m unittest scripts.tests.test_launch_rc_hosted_smoke -v`
  - Result: 3 tests passed.
- `python -m unittest scripts.tests.test_capture_milestone_evidence -v`
  - Result: 7 tests passed.
- Generated ANU-LAUNCH-002 hosted evidence bundle (contract-shape proof run):
  - `docs/program/evidence/anu-launch-002/anu-launch-002-proof/evidence.json`
  - `docs/program/evidence/anu-launch-002/anu-launch-002-proof/evidence.md`
  - `docs/program/evidence/anu-launch-002/anu-launch-002-proof/hosted_launch_smoke.json`
  - `docs/program/evidence/anu-launch-002/anu-launch-002-proof/hosted_launch_smoke.md`
  - `docs/program/evidence/anu-launch-002/anu-launch-002-proof/attachments.json`

### Contract posture
- Hosted smoke preserves explicit `passed`/`failed`/`skipped` semantics.
- Hosted target metadata is captured in evidence payloads.
- Attachment handling is explicit reference capture only (no upload/media processing pipeline).
- Launch readiness remains human-owned (`launch_readiness_claim = null`).

## ANU-LAUNCH-003 Hosted Preflight + Operator Runbook Enforcement (2026-04-16)

### Scope landed
1. Added hosted preflight validator with required-input enforcement:
   - `scripts/launch_rc_hosted_preflight.py`
2. Added explicit preflight status model:
   - `valid`, `invalid`, `missing`, `skipped-by-mode`
3. Wired preflight into hosted evidence path with fail-fast behavior for invalid/missing required inputs:
   - writes `hosted_preflight.json` and `hosted_preflight.md`
   - aborts hosted smoke execution when preflight is not executable
4. Added attachment reference validation artifacts:
   - `attachment_validation.json`
   - `attachment_validation.md`
5. Added minimal operator checklist artifact:
   - `operator_runbook.md`
6. Kept ANU-024/ANU-LAUNCH-001/ANU-LAUNCH-002 contracts backward-compatible.

### Validation snapshot
- `python -m unittest scripts.tests.test_launch_rc_hosted_preflight -v`
  - Result: 5 tests passed.
- `python -m unittest scripts.tests.test_launch_rc_hosted_smoke -v`
  - Result: 3 tests passed.
- `python -m unittest scripts.tests.test_capture_milestone_evidence -v`
  - Result: 8 tests passed.
- `python -m unittest scripts.tests.test_launch_rc_smoke -v`
  - Result: 3 tests passed.
- Generated ANU-LAUNCH-003 hosted evidence bundle (contract-shape proof run):
  - `docs/program/evidence/anu-launch-003/anu-launch-003-proof/evidence.json`
  - `docs/program/evidence/anu-launch-003/anu-launch-003-proof/evidence.md`
  - `docs/program/evidence/anu-launch-003/anu-launch-003-proof/hosted_preflight.json`
  - `docs/program/evidence/anu-launch-003/anu-launch-003-proof/hosted_preflight.md`
  - `docs/program/evidence/anu-launch-003/anu-launch-003-proof/hosted_launch_smoke.json`
  - `docs/program/evidence/anu-launch-003/anu-launch-003-proof/hosted_launch_smoke.md`
  - `docs/program/evidence/anu-launch-003/anu-launch-003-proof/attachments.json`
  - `docs/program/evidence/anu-launch-003/anu-launch-003-proof/attachment_validation.json`
  - `docs/program/evidence/anu-launch-003/anu-launch-003-proof/attachment_validation.md`
  - `docs/program/evidence/anu-launch-003/anu-launch-003-proof/operator_runbook.md`

### Contract posture
- Hosted preflight enforces required input quality before hosted smoke execution.
- Skipped-by-mode control inputs remain explicit when control checks are intentionally disabled.
- Attachment presence/missing state is reported honestly per reference.
- Launch readiness remains human-owned (`launch_readiness_claim = null`).

## ANU-LAUNCH-004 Operator Finalized Hosted Proof Capture Pass (2026-04-16)

### Scope landed
1. Captured a deterministic hosted ANU-LAUNCH-004 bundle against deployed targets with control checks enabled:
   - `docs/program/evidence/anu-launch-004/anu-launch-004-proof/*`
2. Added real screenshot files under bundle `attachments/` and referenced them in `attachments.json`.
3. Regenerated hosted artifacts in-place for the deterministic bundle id using explicit rerun mode:
   - `scripts/capture_milestone_evidence.py --allow-existing-bundle-dir`
4. Preserved evidence contract honesty:
   - `hosted_preflight.summary.valid_for_execution = true`
   - `hosted_launch_smoke.summary` preserves explicit failures
   - `launch_readiness_claim = null`
   - `conclusion = not-set-by-*`

### Validation snapshot
- `python -m unittest scripts.tests.test_launch_rc_hosted_preflight -v`
  - Result: 5 tests passed.
- `python -m unittest scripts.tests.test_launch_rc_hosted_smoke -v`
  - Result: 3 tests passed.
- `python -m unittest scripts.tests.test_capture_milestone_evidence -v`
  - Result: 9 tests passed.
- Generated ANU-LAUNCH-004 hosted evidence bundle (real target input run):
  - `docs/program/evidence/anu-launch-004/anu-launch-004-proof/evidence.json`
  - `docs/program/evidence/anu-launch-004/anu-launch-004-proof/evidence.md`
  - `docs/program/evidence/anu-launch-004/anu-launch-004-proof/hosted_preflight.json`
  - `docs/program/evidence/anu-launch-004/anu-launch-004-proof/hosted_preflight.md`
  - `docs/program/evidence/anu-launch-004/anu-launch-004-proof/hosted_launch_smoke.json`
  - `docs/program/evidence/anu-launch-004/anu-launch-004-proof/hosted_launch_smoke.md`
  - `docs/program/evidence/anu-launch-004/anu-launch-004-proof/attachments.json`
  - `docs/program/evidence/anu-launch-004/anu-launch-004-proof/attachment_validation.json`
  - `docs/program/evidence/anu-launch-004/anu-launch-004-proof/attachment_validation.md`
  - `docs/program/evidence/anu-launch-004/anu-launch-004-proof/operator_runbook.md`

### Contract posture
- Hosted preflight is executable with control checks enabled and no required-input gaps.
- Attachment validation reports real screenshot references as present (`valid=7`, `missing=0`, `invalid=0`).
- Hosted smoke failures are preserved as-is (public endpoints returned 503; control read endpoints returned 422 for provided control header).
- Launch-readiness ownership remains human-only (`launch_readiness_claim = null`).

### ANU-LAUNCH-004A status refresh (2026-04-17)
- Landed narrow rerun hardening for hosted control secret enforcement:
  - `scripts/launch_rc_hosted_smoke.py` now accepts optional `X-Control-Plane-Secret` input (`--control-plane-secret-header` or env).
  - `scripts/capture_milestone_evidence.py` now wires hosted secret-header input through to hosted smoke execution (`--hosted-control-plane-secret-header` or env).
  - `scripts/tests/test_launch_rc_hosted_smoke.py` adds focused coverage that both `Authorization` and `X-Control-Plane-Secret` are attached when configured.
- Focused test verification (post-hardening):
  - `python -m unittest scripts.tests.test_launch_rc_hosted_preflight -v` (5 passed)
  - `python -m unittest scripts.tests.test_launch_rc_hosted_smoke -v` (4 passed)
  - `python -m unittest scripts.tests.test_capture_milestone_evidence -v` (9 passed)
- Hosted rerun execution blocker (external credential dependency):
  - deployed control-token issuance could not be completed from available workspace credentials, so deterministic bundle `docs/program/evidence/anu-launch-004/anu-launch-004-proof/` was not regenerated in this pass.
  - launch-readiness remains unset (`launch_readiness_claim = null`, conclusion not set by automation).

### ANU-LAUNCH-004A bookmark (2026-04-17, blocked until 2026-04-18)
- ANU-LAUNCH-004A rerun is explicitly blocked for the next slice and not executed in ANU-LAUNCH-005.
- Required unblock inputs for tomorrow:
  - valid hosted control auth token,
  - control-plane secret header value if the target deployment enforces it,
  - explicit domain/target verification for the rerun environment.

## ANU-LAUNCH-005 Hosted Public-Route Diagnosis + Resilience Hardening (2026-04-17)

### Scope landed
1. Added narrow hosted public-route diagnosis utility for deployed launch paths:
   - `scripts/launch_rc_hosted_route_diagnosis.py`
2. Added deterministic response classification with explicit categories:
   - `success`, `skipped_not_configured`, `dns`, `transport`, `timeout`, `http_4xx`, `http_5xx`, `invalid_payload`, `http_other`
3. Added response metadata capture for launch diagnosis:
   - request identifier when available (`x-request-id` or `request_id`),
   - HTTP metadata (`content_type`, `content_length`),
   - error metadata (`error_code`, `error_message`),
   - bounded failure response preview.
4. Added honest degraded-state summary for hosted public surface:
   - `public_surface_state.status`,
   - `degraded_reason_categories`,
   - non-coercive annotation (no conversion of failures into readiness claims).
5. Integrated diagnosis artifacts into ANU-024 evidence automation as an additive optional layer:
   - `scripts/capture_milestone_evidence.py --run-hosted-route-diagnosis`
   - `hosted_route_diagnosis.json`
   - `hosted_route_diagnosis.md`
6. Preserved no-auto-readiness posture:
   - `launch_readiness_claim = null`
   - `conclusion = not-set-by-route-diagnosis`

### Validation snapshot
- `python -m unittest scripts.tests.test_launch_rc_hosted_route_diagnosis -v`
  - Result: 3 tests passed.
- `python -m unittest scripts.tests.test_capture_milestone_evidence -v`
  - Result: 10 tests passed.
- `python -m unittest scripts.tests.test_launch_rc_hosted_preflight -v`
  - Result: 5 tests passed.
- `python -m unittest scripts.tests.test_launch_rc_hosted_smoke -v`
  - Result: 4 tests passed.
- Generated ANU-LAUNCH-005 diagnosis evidence bundle:
  - `docs/program/evidence/anu-launch-005/anu-launch-005-proof/evidence.json`
  - `docs/program/evidence/anu-launch-005/anu-launch-005-proof/evidence.md`
  - `docs/program/evidence/anu-launch-005/anu-launch-005-proof/hosted_route_diagnosis.json`
  - `docs/program/evidence/anu-launch-005/anu-launch-005-proof/hosted_route_diagnosis.md`

### Hosted diagnosis outcome snapshot
- Public archive list route: failed (`503`, `http_5xx`, request id captured).
- Public archive record detail route: failed (`503`, `http_5xx`, request id captured).
- Public trust decisions route: failed (`503`, `http_5xx`, request id captured).
- White-label public host resolution route: failed (`503`, `http_5xx`, request id captured).
- Public-surface state is explicitly marked `degraded` with `degraded_reason_categories=["http_5xx"]`.
