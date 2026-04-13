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
- non-distortion enforcement.

### Required proof
- archive route tests,
- trust report tests,
- sponsor disclosure tests,
- public trust/disclosure screenshots.

### Evidence snapshot (ANU-017/018/019 slice, 2026-04-14)
- backend trust + sponsor slice: `python -m pytest -q tests/test_public_sponsor_disclosures.py tests/test_public_trust.py tests/test_public_connectors.py` (11 passed),
- backend transparency compatibility: `python -m pytest -q tests/test_public_transparency.py` (2 passed),
- frontend trust/sponsor slice: `npx vitest run src/test/transparencyPage.test.tsx src/test/archiveRecordPage.test.tsx src/test/sponsorDisclosurePanel.test.tsx src/test/archivePage.test.tsx` (4 files, 9 tests passed),
- frontend typecheck: `npm run -s typecheck` (pass),
- implementation references:
  - `frontend-next/src/app/(public)/archive/page.tsx`
  - `frontend-next/src/app/(public)/archive/[record]/page.tsx`
  - `frontend-next/src/app/(public)/transparency/page.tsx`
  - `frontend-next/src/components/transparency/SponsorDisclosurePanel.tsx`
  - `frontend-next/src/lib/api/publicSponsorDisclosures.ts`
  - `flora-fauna/backend/app/api/public_trust.py`
  - `flora-fauna/backend/app/api/public_transparency.py`
  - `flora-fauna/backend/app/services/trust_report_service.py`
  - `flora-fauna/backend/app/services/sponsor_disclosure_service.py`

### Remaining for broader M4 closure
- trust center IA route expansion (`ANU-021+`) remains pending.
- sponsor disclosure screenshots/live-capture artifact remains to be attached in release evidence pack.

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
