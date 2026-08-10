# PEACH Gate 5 Security Review

Date: 2026-07-30

Status: acceptable for controlled local/internal rehearsal with trusted adults and non-sensitive test data only. Not acceptable for public deployment.

## Current Dependency Versions

Runtime dependencies:

- `next`: `15.5.22`
- `react`: `19.1.0`
- `react-dom`: `19.1.0`

Development dependencies:

- `typescript`: `5.8.2`
- `@types/node`: `22.13.14`
- `@types/react`: `19.0.12`
- `@types/react-dom`: `19.0.4`

## Audit Findings

`npm audit --audit-level=high` reports three high severity vulnerabilities:

- `postcss <=8.5.17`
  - XSS via unescaped `</style>` in CSS stringify output.
  - Arbitrary file read/information disclosure through attacker-controlled source maps.
  - Path traversal through previous source map auto-loading.
- `sharp <0.35.0`
  - inherited libvips vulnerabilities listed by npm as CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, and CVE-2026-35591.

The advisories are transitive through `next`.

## Local/Internal Pilot Impact

These advisories do not block a controlled local rehearsal if all of the following remain true:

- the app is run on localhost or a trusted internal machine only;
- participants are trusted adults;
- only non-sensitive test material is submitted;
- no public traffic is accepted;
- no uploads are enabled;
- no user-controlled CSS or source maps are processed as a product feature;
- no production image processing pipeline is exposed.

The risk is still real. It is contained only by the pilot boundary, not by a complete fix.

## Public Deployment Impact

These advisories block public deployment until a safe package remediation exists and is verified. PEACH must not launch publicly while high severity advisories remain in the production dependency graph unless a documented security exception is approved by the project owner with compensating controls.

## Why Force Fix Was Not Applied

`npm audit fix --force` currently proposes installing `next@9.3.3`, which is an obsolete and breaking downgrade from the Gate 4 scaffold. That would likely introduce greater framework, compatibility, and security risk than it resolves. Gate 5 therefore does not apply the forced downgrade.

## Safe Remediation Path

- Track Next.js releases and upgrade to the first release that resolves the transitive `postcss` and `sharp` advisories without downgrading the framework.
- Re-run `npm audit --audit-level=high` after the upgrade.
- Re-run `npm.cmd run typecheck` and `npm.cmd run build`.
- Add route-level smoke tests before deployment.
- If the advisories remain unresolved, document a formal exception and compensating controls before any non-local exposure.

## Steward Auth Review

Implemented:

- `/steward/contributions` and `/steward/fields/studying-ourselves` redirect unauthenticated users to `/steward/login`.
- Steward page login uses `PEACH_STEWARD_PASSWORD`.
- Steward API routes require `x-peach-steward-password`.
- The steward review server action now checks authentication inside the action before mutating review status.
- `.env.example` documents the required local steward password variable.

Limitations:

- The password fallback `peach-local-steward` exists for local development only.
- There is no identity provider.
- Sessions do not expire.
- There is no role separation.
- There is no account lockout or rate limit.
- Cookie-backed server actions still need CSRF hardening before public deployment.

## API Protection Review

Implemented:

- Public contribution API returns only ids, review status, consent version, and `publicDisplay: false`.
- Public Field API returns Field data only and does not query contributions.
- Steward listing API requires steward header.
- Steward review API requires steward header.
- Support intent API returns `paymentTaken: false`.

Limitations:

- Public POST routes are not rate limited.
- Input validation is lightweight enum and required-field checking, not schema-library validation.
- No request size limits are implemented beyond framework defaults.
- No bot protection exists.

## File-Backed Persistence Review

Implemented:

- Contributions, consent records, and support records are stored under `.peach-data/`.
- `.peach-data/` is ignored by git.
- Contribution and consent records are written separately but created together by the store helper.

Risks:

- Local JSON is not transactional across process crashes.
- No encryption at rest.
- No concurrent write protection.
- No backup or retention policy.
- No formal deletion/withdrawal workflow.

This is acceptable only for controlled local rehearsal with non-sensitive data.

## Private Contribution Exposure Risk

Current controls:

- Public pages import only `field001` data and do not call `listContributions`.
- Public Field route explicitly marks public contribution display as disabled.
- Contribution intake returns `publicDisplay: false`.
- Review statuses do not include a publish state.
- Steward queue labels every contribution as public display disabled.

Remaining blocker:

- A future Commons/Yield publication workflow must be designed so public display is impossible without explicit consent checks and steward action.

## Required Security Work Before Public Deployment

- Resolve or formally exception high severity dependency audit findings.
- Replace file persistence with a production database.
- Add durable identity and role-based steward auth.
- Add expiring sessions and CSRF protection.
- Add rate limiting and bot protection for public POST routes.
- Add request size limits and stronger schema validation.
- Add consent withdrawal/export workflow.
- Add audit logging for steward actions.
- Add encrypted storage and backup/retention policy.
- Complete legal and safeguarding review before any sensitive or youth-related collection.
