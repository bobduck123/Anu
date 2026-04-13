# M3 Completion Report - Connector Substrate Rollout

Date: 2026-04-14
Contract version: `m3.2026-04-14`

## Completed work

1. Backend connector substrate is now explicit and modular:
   - persistence models in `models.py` (`JourneyConnector`, `JourneyTransitionProof`, `PublicArchiveRecord`, `PublicTrustReport`)
   - canonical service in `app/services/connector_service.py`
   - dedicated connector API surface in `app/api/public_connectors.py`
   - connector payload schemas in `app/schemas.py`

2. Backend public connector APIs are active through the dedicated boundary:
   - `GET /public/connectors`
   - `GET /public/journeys/:slug`
   - `GET /public/archive-handoffs/:slug`
   - `GET /public/trust/reports/:id`

3. Frontend connector SDK route now prefers backend connector payloads and falls back safely:
   - `/api/sdk/journey-connectors` calls backend `/public/connectors`
   - if backend context is unavailable, it returns canonical registry payload with explicit degraded honesty

4. Connector rail UI renders provenance/trust posture and non-dead-end handoffs:
   - next route transitions
   - threshold cue
   - provenance/source/freshness cue
   - degraded honesty cue
   - archive handoff + canonical knowledge source fallback link

5. Impact-service M3 connector projection surface remains passing and aligned:
   - `getJourneyConnectorProjection(...)`
   - `GET /v1/falak/journeys/:journeySlug/connectors`

6. Tiny in-scope auth posture cleanup shipped during M3 implementation:
   - removed `educationMaps.ts` direct `auth_token` legacy fallback
   - maps auth now uses canonical `getParticipantAuthHeaders({ allowLegacyTokenFallback: false })`

## Artifact summary

- `flora-fauna/backend/app/api/public_connectors.py`
- `flora-fauna/backend/app/services/connector_service.py`
- `flora-fauna/backend/app/schemas.py`
- `flora-fauna/backend/app/api/public.py` (connector routes removed from mixed public module)
- `flora-fauna/backend/app/__init__.py` (connector blueprint registration)
- `flora-fauna/backend/tests/test_public_connectors.py`
- `frontend-next/src/app/api/sdk/journey-connectors/route.ts`
- `frontend-next/src/ui-system/anu/journeyConnectorRegistry.ts`
- `frontend-next/src/ui-system/layout/JourneyConnectorRail.tsx`
- `frontend-next/src/test/journeyConnectorsApiRoute.test.ts`
- `frontend-next/src/test/journeyConnectorRail.test.tsx`
- `frontend-next/src/lib/api/educationMaps.ts`
- `frontend-next/src/test/educationMaps.test.ts`

## Validation commands and results

```bash
# backend
cd flora-fauna/backend
python -m pytest -q tests/test_public_connectors.py
python -m pytest -q tests/test_public_transparency.py tests/test_public_community_news.py

# frontend
cd ../../frontend-next
npx vitest run src/test/journeyConnectorRegistry.test.ts src/test/journeyConnectorsApiRoute.test.ts src/test/journeyConnectorRail.test.tsx src/test/educationMaps.test.ts src/test/connectorDocsSync.test.ts
npm run -s typecheck

# impact-service
cd ../services/impact-service
npm run -s test:non-db -- tests/falak/falakService.test.ts
npm run -s typecheck
```

- Backend connector suite: **PASS** (`5 passed`)
- Backend public transparency/news suites: **PASS** (`3 passed`)
- Frontend connector + auth-touch suites: **PASS** (`5 files, 31 tests passed`)
- Frontend typecheck: **PASS**
- Impact-service non-db suite: **PASS** (`17 suites, 58 tests passed`)
- Impact-service typecheck: **PASS**

## Deferred scope

- No expansion into economy implementation.
- No expansion into node rollout.
- No Falak policy engine rewrite.
- No M3 broad archive/trust subsystem expansion beyond connector handoff foundation.
