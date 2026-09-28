# PEACH Gate 3 Scaffold Decision

## Repo Inspection Summary

Inspection on 2026-07-30 found:

- Repository root contains `.git`, `docs/`, and now a minimal `site/` first slice.
- Before Gate 3 there was no application scaffold.
- No `package.json`, framework config, routing tree, database schema, auth setup, storage config, deployment config, or app source existed.
- Existing PEACH work was documentation-only in `docs/peach/`.

## Chosen App/Framework Direction

Gate 3 starts with a zero-dependency static slice under `site/`.

Reason:

- The repo has no app framework yet.
- Gate 3 asks for the smallest useful implementation slice, not full UI or infrastructure.
- A static slice can prove the first active Field read experience immediately.
- Contribution can be protected behind a consent-first, review-pending local prototype without pretending production intake is live.
- This avoids premature database, auth, payment, and deployment decisions.

Recommended Gate 4 direction:

- Promote the slice into a TypeScript full-stack app, preferably Next.js or the existing ANU/Presence framework if one is supplied.
- Add Postgres or equivalent structured storage.
- Add role-based steward/admin auth.
- Add private object storage for contribution files.
- Add server-side contribution and ConsentRecord writes.
- Add audit logging from the start.

## Folder Structure

```text
docs/peach/
  PEACH_GATE_3_SCAFFOLD_DECISION.md
  PEACH_PHASE_1_API_CONTRACTS.md
  PEACH_PHASE_1_SCHEMA_IMPLEMENTATION_PLAN.md
  PEACH_GATE_3_EVIDENCE.md

site/
  index.html
  assets/
    styles.css
    peach.js
  data/
    field-001.js
  fields/
    studying-ourselves/
      index.html
      contribute/
        index.html
  commons/
    index.html
```

## Implementation Assumptions

- `site/` is a static first slice, not the final production architecture.
- Field 001 is represented from shared static seed data in `site/data/field-001.js`.
- Public pages render the active Field, Commons placeholder, and contribution submission surface.
- Contribution submission writes to browser `localStorage` only and marks submissions `pending_review`.
- No submitted Contribution is displayed publicly.
- Steward/admin routes are documented and shown as not-yet-live placeholders, not implemented as insecure public admin tools.
- Support paths are displayed as manual/external placeholders with values-aligned language.

## Intentionally Deferred

- Full framework scaffold.
- Database migrations.
- Server-side API implementation.
- Authentication and steward roles.
- File uploads.
- Email/update automation.
- Payment provider integration.
- Native support checkout.
- Public Contribution display.
- Youth/child contribution flows.
- Presence integration.
- Multi-Orchard support.

## Risks

- Static `localStorage` contribution capture is only a prototype and must not be used for real public collection.
- Without a server, support metadata and audit logs are not durable.
- Admin/steward workflow remains documentation-only until Gate 4.
- A framework decision is still required before production implementation.
- The static design must not become the final UI without a product/design pass.

## Decision

Gate 3 uses a minimal static scaffold to pass B1-B3 shape and prove the active Field read experience. Gate 4 should replace or wrap this slice with the chosen full-stack implementation.

