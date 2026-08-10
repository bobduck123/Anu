# PEACH Gate 8 Readiness

Status: ready to begin Gate 9
Date: 2026-07-30

## What Gate 8 Completed

Gate 8 completed the ANU-native PEACH foundation at the read-model/API-contract level:

- inspected ANU frontend, backend, database, tenant, auth, control-plane, and Presence public/private architecture;
- documented architecture findings;
- finalized Phase 1 data model decisions;
- defined public, steward/control, contribution/consent, and support contracts;
- moved Field 001 into typed ANU PEACH read-model code;
- added read-only PEACH API route handlers;
- added a Field detail route;
- kept `/peach` working from the shared read path;
- kept contribution intake, public contribution display, payments, uploads, youth/sensitive-material workflows, and public Commons release disabled.

## ANU-Native Status

PEACH is now ANU-native enough for the next build gate at the frontend/read-contract layer. It is not yet fully ANU-native in persistence because the core Flask models, SQL migrations, steward auth, consent operations, and audit events are deferred.

Current state:

- ANU-native read model: implemented.
- Public read route handlers: implemented.
- Field detail route: implemented.
- Backend persistence: deferred.
- Contribution/ConsentRecord persistence: deferred.
- Steward review: deferred.
- SupportIntent persistence: deferred.

## What Remains Blocked

- Durable PEACH tables in ANU public/core schema.
- Flask API module and registration for PEACH.
- Node-scoped authorization for PEACH stewards.
- Control-plane or owner-scoped steward route design.
- Distributed/shared rate limits for public mutations.
- AuditLog event taxonomy and writes.
- Consent withdrawal/export workflow.
- Private staging deployment allowlist.
- Legal/safeguarding policy for youth or sensitive material.

## Recommended Gate 9 Focus

Gate 9 should be: ANU-native contribution/consent implementation plus steward-control foundation.

Recommended order:

1. Add PEACH Phase 1 backend schema/migration for Field, Vessel, Gathering, TendingPrompt, Contribution, ConsentRecord, SupportIntent, CommonsEntry, StewardAssignment, and consent operation requests.
2. Add read-only Flask public PEACH API and migrate frontend read handlers to consume core backend when available.
3. Add public Contribution submission only if it creates durable Contribution + ConsentRecord, defaults to pending review, rejects youth/sensitive material while disabled, records audit events, and never exposes bodies publicly.
4. Add protected steward review through an ANU owner/control-plane pattern.
5. Keep support as `paymentTaken: false` SupportIntent only.

## Public Deployment Blockers

- PEACH routes are noindex/private-staging posture.
- Contribution/consent persistence is not implemented.
- Steward review is not implemented.
- Consent operation completion/export is not implemented.
- No private staging rehearsal has run on hosted ANU infrastructure.
- Youth/sensitive-material policy and workflow are not implemented.
- Public Commons/Yield release workflow is not implemented.
- Support intents are not durable and no payment boundary has been production-reviewed.

## Verification

Passed:

```bash
npm run typecheck
curl.exe -I http://localhost:3328/peach
curl.exe -I http://localhost:3328/peach/fields/studying-ourselves
curl.exe -s http://localhost:3328/api/peach/fields/active
```

The API proof showed `publicContributionDisplay: false`, disabled intake, no youth/sensitive collection, and `paymentTaken: false` support options.

## Verdict

VERDICT: ACCEPT GATE 8 / BEGIN GATE 9
