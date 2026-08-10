# PEACH Gate 6 Evidence

Date: 2026-07-30

## Files Created Or Edited

- `.env.example`
- `.gitignore`
- `package.json`
- `package-lock.json`
- `scripts/ensure-data-dir.mjs`
- `scripts/apply-sqlite-migrations.mjs`
- `prisma/migrations/0001_gate6_initial/migration.sql`
- `src/lib/db.ts`
- `src/lib/store.ts`
- `src/lib/auth.ts`
- `src/lib/csrf.ts`
- `src/lib/rateLimit.ts`
- `src/lib/validation.ts`
- `src/lib/actions.ts`
- `src/lib/pilot.ts`
- `src/types/peach.ts`
- `src/app/api/public/contributions/route.ts`
- `src/app/api/public/support/intents/route.ts`
- `src/app/api/public/consent-operations/route.ts`
- `src/app/api/steward/contributions/route.ts`
- `src/app/api/steward/contributions/[id]/review/route.ts`
- `src/app/consent/request/page.tsx`
- `src/app/steward/contributions/page.tsx`
- `src/components/ConsentOperationForm.tsx`
- `src/components/ContributionForm.tsx`
- `src/components/LoginForm.tsx`
- `src/components/SupportIntentForm.tsx`
- `docs/peach/PEACH_INTERNAL_PILOT_GUIDE.md`
- Gate 6 docs.

## Commands Run

```powershell
npm.cmd install @prisma/client
npm.cmd install -D prisma
npm.cmd install @prisma/adapter-better-sqlite3 better-sqlite3
npm.cmd install -D @types/better-sqlite3
npm.cmd uninstall @prisma/client @prisma/adapter-better-sqlite3 prisma
$env:DATABASE_URL="file:C:/Dev/PEACH/peach-gate6.db"; npm.cmd run db:prepare
$env:DATABASE_URL="file:C:/Dev/PEACH/peach-gate6.db"; npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
$env:DATABASE_URL="file:C:/Dev/PEACH/peach-gate6.db"; npm.cmd run build
$env:DATABASE_URL="file:C:/Dev/PEACH/peach-gate6.db"; npm.cmd run typecheck
npm.cmd audit --audit-level=high
```

## Setup Result

Database:

```text
C:\Dev\PEACH\peach-gate6.db
```

Migration result:

```text
PEACH database directory ready: C:/Dev/PEACH
PEACH SQLite database ready: C:/Dev/PEACH/peach-gate6.db
```

Database file verified at 106496 bytes.

## Build And Typecheck

- `npm.cmd run build`: passed.
- `npm.cmd run typecheck`: passed.

## Route And Auth Checks

- Public Field route: `200`.
- Unauthenticated steward page: `307`.
- Unauthenticated steward API: `403`.
- Same-origin missing on mutating support API: `403`.
- Authenticated steward API with bearer token: returned contribution and ConsentRecord data.

## Contribution And Consent Proof

Fresh Gate 6 contribution response:

```json
{
  "contributionId": "contribution-1785412190906",
  "consentRecordId": "consent-1785412190906",
  "consentVersion": "gate6-v1",
  "reviewStatus": "pending_review",
  "publicDisplay": false
}
```

Steward review changed it to:

```json
{
  "reviewStatus": "held"
}
```

Database proof:

```json
{
  "contributions": [
    { "id": "contribution-1785412190906", "reviewStatus": "held" }
  ],
  "consents": [
    {
      "id": "consent-1785412190906",
      "contributionId": "contribution-1785412190906",
      "consentVersion": "gate6-v1",
      "stewardReviewedBy": "Gate 6 API steward"
    }
  ]
}
```

## Public Non-Display Proof

Searching the public Field page for the final contribution body returned:

```text
NOT_FOUND
```

## Support Intent Proof

Support response:

```json
{
  "supportPath": "sponsor_field",
  "status": "manual_enquiry",
  "paymentTaken": false
}
```

No cart, checkout, storefront, product grid, or fake payment success exists.

## Rate Limit Proof

Six support-intent attempts returned:

```text
201,201,201,201,201,429
```

## Consent Operation Proof

Consent operation response:

```json
{
  "consentOperationRequestId": "consent-operation-1785412170068",
  "status": "pending_steward_review",
  "automatedDeletion": false,
  "automatedExport": false
}
```

## Audit Log Proof

Recent audit rows included:

- `support_intent.created`
- `contribution.review_status_changed`
- `consent_record.created`
- `contribution.created`

## Known Stubs

- Hosted Postgres.
- Production identity provider.
- Distributed rate limit store.
- Consent operation status update UI.
- Automated export bundle.
- Email notification.
- Public Commons/Yield publication workflow.

## Blockers

- Dependency audit high advisories remain.
- SQLite private staging is not public production persistence.
- No public launch is implied.
