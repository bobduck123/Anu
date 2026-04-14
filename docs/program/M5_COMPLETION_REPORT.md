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
