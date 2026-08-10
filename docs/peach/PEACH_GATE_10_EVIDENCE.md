# PEACH Gate 10 Evidence

Date: 2026-07-31

## Files created or edited

Backend/API:

- `flora-fauna/backend/app/api/peach.py`
- `flora-fauna/backend/app/models.py`
- `flora-fauna/backend/migrations/versions/20260731_peach_gate10_consent_ops_support_intents.sql`
- `flora-fauna/backend/tests/test_peach_gate10.py`

Frontend:

- `frontend-next/src/lib/api/peach.ts`
- `frontend-next/src/components/peach/PeachConsentRequestForm.tsx`
- `frontend-next/src/components/peach/PeachSupportIntentForm.tsx`
- `frontend-next/src/components/peach/PeachStewardWorkspace.tsx`
- `frontend-next/src/app/(app)/peach/consent/request/page.tsx`
- `frontend-next/src/app/(app)/peach/support/page.tsx`
- `frontend-next/src/app/(control)/control/peach/page.tsx`
- `frontend-next/src/app/(control)/control/layout.tsx`
- `frontend-next/src/app/api/control/[...path]/route.ts`
- `frontend-next/src/components/peach/PeachFieldView.tsx`
- `frontend-next/src/lib/peach/catalog.ts`

Docs:

- `docs/peach/PEACH_GATE_10_ARCHITECTURE_DECISION.md`
- `docs/peach/PEACH_GATE_10_CONSENT_OPERATIONS.md`
- `docs/peach/PEACH_GATE_10_SUPPORT_INTENTS.md`
- `docs/peach/PEACH_GATE_10_STEWARD_UI.md`
- `docs/peach/PEACH_GATE_10_REPO_HEALTH_NOTE.md`
- `docs/peach/PEACH_GATE_10_INTERNAL_PILOT_REHEARSAL_PLAN.md`
- `docs/peach/PEACH_GATE_10_EVIDENCE.md`
- `docs/peach/PEACH_GATE_10_READINESS.md`

## Commands and results

Backend focused PEACH tests:

```powershell
cd C:\Dev\Flora_fauna\flora-fauna\backend
python -m pytest tests\test_peach_gate9.py tests\test_peach_gate10.py -q
```

Result: `7 passed in 4.47s`.

Frontend typecheck:

```powershell
cd C:\Dev\Flora_fauna\frontend-next
npm run typecheck
```

Result: passed with `tsc --noEmit`.

Control proxy targeted test:

```powershell
cd C:\Dev\Flora_fauna\frontend-next
npm run test -- src\test\controlProxyRoute.test.ts --run
```

Result: `1 passed`, `5 tests passed`.

Local route proof with Next dev server on port 3330:

- `/peach` -> `HTTP/1.1 200 OK`
- `/peach/fields/studying-ourselves` -> `HTTP/1.1 200 OK`
- `/peach/fields/studying-ourselves/contribute` -> `HTTP/1.1 200 OK`
- `/peach/consent/request` -> `HTTP/1.1 200 OK`
- `/peach/support` -> `HTTP/1.1 200 OK`
- `/control/peach` -> `HTTP/1.1 200 OK` on local control-allowed host

Public active-field API proof:

`/api/peach/fields/active` returns `publicContributionDisplay: false`, `sensitiveMaterialCollection: false`, `youthMaterialCollection: false`, support options with `paymentTaken: false`, and no submitted contribution bodies.

## Backend proof

The focused tests prove:

- contribution submission still works;
- Contribution persists as private/pending review;
- ConsentRecord persists separately;
- unauthenticated steward APIs block;
- authenticated steward can list and review contributions;
- review mutation is audited;
- export consent operation request persists;
- withdrawal consent operation request persists;
- steward can list/update consent operation requests;
- consent operation request creation/status/note changes are audited;
- support intent persists with `payment_taken = false`;
- support intent with `paymentTaken: true` is rejected;
- steward can list support intents;
- sensitive/youth payloads remain rejected.

## Migration/schema proof

`AUTO_CREATE_ALL` schema setup passed through focused backend tests. Gate 10 also adds an additive SQL migration for `peach_consent_operation_request` and `peach_support_intent`.

## Anti-pattern scan

Scan command checked PEACH backend/frontend implementation paths for payment/public-display/storefront/cart/bookstore/product-grid drift.

Expected hits only:

- `tests/test_peach_gate9.py` posts `reviewStatus: "published"` to prove public-approved status is rejected.
- `PeachFieldView.tsx` and `PeachSupportIntentForm.tsx` include guardrail copy saying real payments/checkout/cart/product grid are not implemented.

No PEACH implementation introduced checkout, cart, real payment, product grid, public contribution display, social feed, or bookstore-first behavior.

## Broader repo health

The broader backend suite remains documented as not green from Gate 9: `3 failed, 334 passed, 5 errors`, all outside the new PEACH Gate 9/10 focused tests.