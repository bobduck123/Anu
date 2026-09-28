# PEACH Gate 7 ANU Readiness

Status: ready to begin Gate 8
Date: 2026-07-30

## Completed

Gate 7 completed:

- accepted standalone-to-ANU migration decision;
- imported all PEACH docs from standalone into ANU docs/peach;
- recorded ANU primitive mapping;
- drafted ANU-native data/API target;
- added read-only ANU PEACH Field 001 route;
- added ANU-local Field 001 fixture;
- marked standalone PEACH as historical proof/reference;
- held unsafe production surfaces.

## Implemented In ANU

- /peach frontend route in frontend-next.
- Static Field 001 data fixture in frontend-next/src/data/peach.
- Documentation-first migration record under docs/peach.

## Safe Behavior

The Gate 7 route is read-only. It shows Field 001, Vessels, Gatherings, Tending prompts, support paths, Yield, Return, and migration status. It does not submit, store, publish, sell, upload, or request sensitive material.

## Still Held

- Hosted PEACH database tables.
- ANU-native RLS policies.
- Steward role separation.
- Contribution intake.
- Steward review queue.
- Consent operation completion and export bundles.
- Distributed rate limits.
- Request logging for rejected attempts.
- Email/notification workflows.
- Support/payment integration.
- Public contribution display.
- Public Yield/Return release.
- Youth/sensitive-material policy and workflow.

## Gate 8 Entry Criteria

Gate 8 may begin with:

- production data model design in ANU public schema;
- migration scripts and RLS policies;
- Supabase/Auth role mapping for PEACH stewards;
- private-staging deployment posture;
- durable rate limiting;
- full consent operation workflow;
- steward audit logging;
- safety review for contribution prompts and sensitive-material handling.

## Verification

Passed from C:\Dev\Flora_fauna\frontend-next:

```bash
npm run typecheck
```

## Verdict

VERDICT: ACCEPT GATE 7 ANU MIGRATION / BEGIN GATE 8
