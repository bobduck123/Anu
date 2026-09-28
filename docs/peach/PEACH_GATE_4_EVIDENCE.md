# PEACH Gate 4 Evidence

Date: 2026-07-30

## Files Created Or Edited

Application scaffold:

- `.gitignore`
- `package.json`
- `package-lock.json`
- `next.config.mjs`
- `tsconfig.json`
- `next-env.d.ts`

Application code:

- `src/types/peach.ts`
- `src/data/field001.ts`
- `src/lib/store.ts`
- `src/lib/auth.ts`
- `src/lib/actions.ts`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/page.tsx`
- `src/app/fields/studying-ourselves/page.tsx`
- `src/app/fields/studying-ourselves/contribute/page.tsx`
- `src/app/commons/page.tsx`
- `src/app/steward/login/page.tsx`
- `src/app/steward/contributions/page.tsx`
- `src/app/steward/fields/studying-ourselves/page.tsx`
- `src/app/api/public/field/active/route.ts`
- `src/app/api/public/contributions/route.ts`
- `src/app/api/public/support/intents/route.ts`
- `src/app/api/steward/contributions/route.ts`
- `src/app/api/steward/contributions/[id]/review/route.ts`
- `src/components/FieldSections.tsx`
- `src/components/ContributionForm.tsx`
- `src/components/SupportIntentForm.tsx`
- `src/components/LoginForm.tsx`

Gate 4 docs:

- `docs/peach/PEACH_GATE_4_SCAFFOLD_DECISION.md`
- `docs/peach/PEACH_GATE_4_STEWARD_AUTH.md`
- `docs/peach/PEACH_GATE_4_SUPPORT_IMPLEMENTATION.md`
- `docs/peach/PEACH_GATE_4_EVIDENCE.md`
- `docs/peach/PEACH_GATE_4_READINESS.md`

## Commands Run

```powershell
npm install
npm install next@15.5.22
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
curl.exe -i http://127.0.0.1:3000/
curl.exe -i http://127.0.0.1:3000/fields/studying-ourselves
curl.exe -i http://127.0.0.1:3000/commons
curl.exe -i http://127.0.0.1:3000/steward/contributions
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:3000/api/steward/contributions
curl.exe -s -H "x-peach-steward-password: peach-local-steward" http://127.0.0.1:3000/api/steward/contributions
```

## Verification Results

- Typecheck: passed.
- Production build: passed.
- `/`: 200.
- `/fields/studying-ourselves`: 200.
- `/commons`: 200.
- `/steward/contributions` without login: 307 redirect to `/steward/login`.
- `GET /api/steward/contributions` without header: 403.
- `GET /api/steward/contributions` with local steward header: returned contribution and consent records.
- Public Field page search for the test contributor name: not found.

## Contribution Intake Proof

Test contribution response:

```json
{
  "contributionId": "contribution-1785409229857",
  "consentRecordId": "consent-1785409229857",
  "reviewStatus": "pending_review",
  "publicDisplay": false
}
```

Persisted contribution:

- contributor: `Gate 4 Test Contributor`
- review status at creation: `pending_review`
- review status after steward action: `held`
- visibility preference: `private`
- consent level: `private_to_stewards`
- permission for Yield: `false`

Persisted consent:

- consent id: `consent-1785409229857`
- accepted terms: `true`
- consent level: `private_to_stewards`
- steward review fields updated after review action.

## Support Intent Proof

Test support intent response:

```json
{
  "supportRecord": {
    "id": "support-1785409326560",
    "fieldId": "PEACH-FIELD-001",
    "supportPath": "sponsor_access",
    "supporterName": "Gate 4 Supporter",
    "contactMethod": "support@example.test",
    "intendedUse": "access",
    "status": "manual_enquiry"
  },
  "paymentTaken": false
}
```

## Security And Dependency Notes

`npm audit` still reports high severity dependency advisories after upgrading to `next@15.5.22`. The remaining advisories are transitive through `postcss` and `sharp`; npm's automatic fix path suggests an invalid major downgrade to old Next versions, so no forced fix was applied.

This must be reassessed before any public deployment.
