# PEACH Gate 5 Evidence

Date: 2026-07-30

## Files Created Or Edited

Configuration and scaffold:

- `.env.example`
- `.gitignore`
- `src/lib/pilot.ts`
- `src/lib/auth.ts`
- `src/lib/actions.ts`
- `src/lib/store.ts`
- `src/types/peach.ts`

Public and steward routes:

- `src/app/fields/studying-ourselves/page.tsx`
- `src/app/fields/studying-ourselves/contribute/page.tsx`
- `src/app/steward/login/page.tsx`
- `src/app/steward/contributions/page.tsx`
- `src/app/api/public/contributions/route.ts`
- `src/app/api/public/support/intents/route.ts`
- `src/app/api/steward/contributions/route.ts`
- `src/app/api/steward/contributions/[id]/review/route.ts`

Components and styles:

- `src/components/ContributionForm.tsx`
- `src/components/SupportIntentForm.tsx`
- `src/app/globals.css`

Gate 5 documentation:

- `docs/peach/PEACH_GATE_5_SECURITY_REVIEW.md`
- `docs/peach/PEACH_INTERNAL_PILOT_GUIDE.md`
- `docs/peach/PEACH_FIELD_001_PILOT_BRIEF.md`
- `docs/peach/PEACH_GATE_5_EVIDENCE.md`
- `docs/peach/PEACH_GATE_5_READINESS.md`

## Commands Run

```powershell
npm.cmd ls next react react-dom typescript @types/node @types/react @types/react-dom --depth=0
npm.cmd audit --audit-level=high
git check-ignore -v .peach-data\probe.json
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:3000/fields/studying-ourselves
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:3000/steward/contributions
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:3000/api/steward/contributions
curl.exe -s http://127.0.0.1:3000/api/public/field/active
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/api/public/contributions
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/api/public/support/intents
Invoke-RestMethod -Method Patch -Uri http://127.0.0.1:3000/api/steward/contributions/contribution-1785410470682/review
```

## Build And Typecheck

- `npm.cmd run typecheck`: passed.
- `npm.cmd run build`: passed.

Build routes included:

- `/`
- `/fields/studying-ourselves`
- `/fields/studying-ourselves/contribute`
- `/commons`
- `/steward/login`
- `/steward/contributions`
- `/steward/fields/studying-ourselves`
- public and steward API routes.

## Audit Summary

`npm.cmd audit --audit-level=high` reports three high severity vulnerabilities:

- `postcss <=8.5.17`
- `sharp <0.35.0`

Both are transitive through `next@15.5.22`. `npm audit fix --force` was not applied because npm proposes a breaking downgrade to `next@9.3.3`.

Internal/local rehearsal remains acceptable only under the non-sensitive trusted-participant limits. Public deployment is blocked.

## Local Run Instructions

```powershell
npm install
Copy-Item .env.example .env.local
$env:PEACH_STEWARD_PASSWORD="replace-with-a-local-pilot-secret"
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

For local development only, if `PEACH_STEWARD_PASSWORD` is unset, the fallback is `peach-local-steward`.

## Security Checks

- `.peach-data/` ignored by git:
  - `git check-ignore -v .peach-data\contributions.json`
  - result: `.gitignore:5:.peach-data/`
- Unauthenticated steward page:
  - `/steward/contributions`
  - result: `307`
- Unauthenticated steward API:
  - `/api/steward/contributions`
  - result: `403`
- Sensitive-material contribution test:
  - result: `400`
- Invalid public-style review status:
  - attempted `accepted_public`
  - result: `400`

## Route Checks

- Public Field route:
  - `/fields/studying-ourselves`
  - result: `200`
- Public Field API:
  - `/api/public/field/active`
  - result: Field data only, no contribution records.

## Contribution Submission Proof

Gate 5 test contribution response:

```json
{
  "contributionId": "contribution-1785410470682",
  "consentRecordId": "consent-1785410470682",
  "consentVersion": "gate5-v1",
  "reviewStatus": "pending_review",
  "publicDisplay": false
}
```

Persisted contribution:

- contributor: `Gate 5 Test Contributor`
- body: `Gate 5 non-sensitive pilot contribution body for privacy verification.`
- review status at creation: `pending_review`
- review status after steward review: `held`
- visibility preference: `private`
- consent level: `private_to_stewards`
- permission for Yield: `false`
- sensitive material flag: `false`

## ConsentRecord Proof

Persisted ConsentRecord:

- id: `consent-1785410470682`
- consent version: `gate5-v1`
- consent level: `private_to_stewards`
- accepted terms: `true`
- steward reviewed at: `2026-07-30T11:21:37.524Z`
- steward reviewed by: `Gate 5 API steward`

Review status and consent level remain separate fields.

## Steward Auth Proof

- Unauthenticated steward page redirected with `307`.
- Unauthenticated steward API returned `403`.
- Authenticated steward API with `x-peach-steward-password: peach-local-steward` returned contribution and ConsentRecord records.

## Steward Review Proof

Authenticated review mutation:

```json
{
  "contribution": {
    "id": "contribution-1785410470682",
    "reviewStatus": "held",
    "sensitiveMaterialFlag": false
  }
}
```

The steward review queue displays:

- contribution type,
- consent level,
- consent version,
- permission for Yield,
- credit preference,
- visibility preference,
- sensitive material flag,
- review status,
- submitted and updated timestamps,
- public display disabled marker.

## Public Non-Display Proof

Search of the public Field route for the fresh test contribution body returned:

```text
NOT_FOUND
```

Public pages do not query `listContributions`, and review statuses do not include a publish state.

## Support Intent Proof

Gate 5 support intent response:

```json
{
  "supportRecord": {
    "id": "support-1785410470718",
    "fieldId": "PEACH-FIELD-001",
    "supportPath": "sponsor_yield",
    "supporterName": "Gate 5 Supporter",
    "contactMethod": "gate5-support@example.test",
    "intendedUse": "archive",
    "fieldRelationship": "Studying Ourselves / Studying Ourselves: A First PEACH Field Report: Editing, design, transcription, publication, archive, and Commons Return.",
    "status": "manual_enquiry"
  },
  "paymentTaken": false
}
```

No cart, checkout, product grid, or fake payment success exists.

## Pilot Reset Process

Stop the dev server, confirm the path is inside the PEACH repo, then remove `.peach-data/`.

```powershell
Remove-Item -LiteralPath .peach-data -Recurse -Force
```

The next app run recreates local JSON files as needed.

## Known Stubs

- Production database.
- Durable steward identity.
- Expiring sessions.
- CSRF protection.
- Rate limiting and bot protection.
- Consent withdrawal/export workflow.
- Steward audit log.
- Upload and media review.
- Payment processing.
- Email notifications.
- Public Commons/Yield publishing workflow.

## Known Blockers

- High severity audit findings remain.
- Local file persistence is not suitable for public or sensitive data.
- Auth is local-only and password-based.
- Public POST routes are not hardened for internet traffic.
- No youth/child or sensitive testimony process exists.
- No public launch is implied.

## Screenshots

Screenshots were not captured for Gate 5. Verification was performed through build output, HTTP route checks, API responses, and persisted local JSON records.
