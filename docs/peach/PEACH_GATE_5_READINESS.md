# PEACH Gate 5 Readiness

Status: ready for controlled local/internal pilot rehearsal only

## Completed

Gate 5 hardened the Phase 1 scaffold for internal rehearsal:

- added `.env.example` with steward password configuration;
- confirmed `.peach-data/` is ignored by git;
- upgraded contribution consent version to `gate5-v1`;
- added validated pilot option lists for contribution, consent, visibility, review, and support paths;
- blocked sensitive-material submissions in the internal pilot intake path;
- added auth checks inside the steward review server action;
- kept steward API routes protected by header;
- added public and form copy stating no public launch, no youth/child material, no sensitive testimony, and no public display;
- added support copy stating no payment, no checkout, no cart, and no fake payment success;
- recorded support intent Field/Yield relationship;
- improved steward review queue with status filters, sensitive flag, consent version, timestamps, and public-display-disabled marker;
- created security review, internal pilot guide, Field 001 pilot brief, and evidence record.

## Internal Pilot Safety

Internal pilot rehearsal is safe only within these limits:

- local or trusted internal machine;
- trusted adult participants;
- 5 to 12 participants;
- non-sensitive test material only;
- no youth or child contributions;
- no highly sensitive testimony;
- no real payments;
- no uploads;
- no public contribution display;
- no public launch.

## Public Deployment Blockers

- High severity dependency audit findings remain through Next transitive `postcss` and `sharp`.
- File-backed persistence must be replaced with a production database.
- Steward auth must be replaced with durable identity and expiring sessions.
- CSRF protection is required for cookie-backed mutations.
- Public POST routes need rate limiting and bot protection.
- Stronger schema validation and request size limits are required.
- Consent withdrawal/export workflow is required.
- Audit logging is required for steward actions.
- Upload, media, youth, and sensitive-material handling are intentionally not implemented.
- Payment processing is intentionally not implemented.
- Legal and safeguarding review must be completed before broader collection.

## Security And Dependency Status

The app builds and typechecks. `npm audit --audit-level=high` still reports three high severity vulnerabilities through `postcss` and `sharp`. `npm audit fix --force` was not applied because it proposes an obsolete breaking downgrade to `next@9.3.3`.

This does not block local/internal rehearsal under the stated limits. It blocks public deployment.

## Consent And Privacy Status

Contribution and ConsentRecord handling is adequate for non-sensitive rehearsal:

- each contribution creates a ConsentRecord;
- consent version is recorded;
- review status remains separate from consent level;
- public routes do not query raw contributions;
- review status changes do not publish material.

This is not yet adequate for public or sensitive collection because withdrawal, export, audit, retention, and legal workflows remain incomplete.

## Support And Payment Status

Support is metadata-only:

- membership,
- one-off support,
- sponsor access,
- sponsor Field,
- sponsor Yield.

No payment is taken. There is no cart, checkout, product grid, or payment success state.

## Recommended Gate 6 Focus

Gate 6 should harden the same narrow pilot path rather than expanding scope:

- production database and migrations;
- durable steward auth and session expiry;
- CSRF/rate limit/bot protection;
- schema validation and route smoke tests;
- consent withdrawal/export workflow;
- steward audit log;
- dependency remediation;
- deployment configuration for a private staging environment;
- documented go/no-go checklist after a real internal rehearsal.

## Verdict

VERDICT: ACCEPT GATE 5 / BEGIN GATE 6
