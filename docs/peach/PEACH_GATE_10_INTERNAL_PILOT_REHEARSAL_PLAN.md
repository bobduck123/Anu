# PEACH Gate 10 Internal Pilot Rehearsal Plan

Date: 2026-07-31

## Participants

Only trusted adult ANU/PEACH internal pilot participants may participate. Do not invite the public, children, young people, or contributors expected to provide sensitive testimony.

## Boundaries

- Adults only
- Non-sensitive material only
- No youth/child collection
- No file uploads
- No real payments
- No public contribution display
- No public Commons/Yield release
- Manual steward review for every contribution, consent operation, and support intent

## Participant script

1. Open `/peach/fields/studying-ourselves`.
2. Read the Field and confirm the public page does not display submitted contributions.
3. Open `/peach/fields/studying-ourselves/contribute`.
4. Submit one adult-only, non-sensitive private contribution.
5. Record the confirmation reference.
6. Do not include sensitive material, youth material, private third-party details, or uploads.

## Consent operation script

1. Open `/peach/consent/request`.
2. Submit one export request using the contribution reference if known.
3. Submit one withdrawal request without expecting automatic deletion.
4. Record confirmation references.
5. Confirm copy states manual steward review and no automatic deletion.

## Support intent script

1. Open `/peach/support`.
2. Submit one support intent with `paymentTaken: false`.
3. Confirm no checkout, cart, payment provider, or fake payment success appears.
4. Record confirmation reference.

## Steward script

1. Open `/control/peach` on a configured control host with a control role.
2. Confirm unauthenticated/direct backend control API access is blocked in backend tests.
3. Load pending contributions and verify no public display toggle exists.
4. Move one contribution to `held`, `accepted_private`, or `rejected`.
5. Load consent operation requests and move one request to `in_review`, `completed`, or `rejected`.
6. Load support intents and verify each shows `paymentTaken: false`.
7. Record audit evidence from backend tests or database inspection.

## Evidence to collect

- Route screenshots or curl status for public and control routes
- Submission reference ids
- Database rows for Contribution, ConsentRecord, ConsentOperationRequest, SupportIntent
- AuditLog rows for creation/review/status changes
- Public API payload proving no contribution bodies and `publicContributionDisplay: false`
- Support payload proving `paymentTaken: false`
- Test outputs

## Go/no-go criteria

Go for internal rehearsal only if focused PEACH tests pass, frontend typecheck passes, public routes return 200, steward route is control-host protected, and no sensitive/youth/payment/public-display path is available.

No-go if any public route displays contribution bodies, payment is taken, public display can be enabled, youth/sensitive material can be accepted, or steward routes are reachable without control-plane authorization.

## Rollback/reset process

For rehearsal databases, remove pilot rows from `peach_contribution_review_event`, `peach_consent_record`, `peach_consent_operation_request`, `peach_support_intent`, and `peach_contribution` in dependency order. Preserve `AuditLog` unless the environment is explicitly disposable.

For code rollback, revert the additive Gate 10 migration and the Gate 10 frontend/backend files. Gate 9 contribution persistence can remain if the rehearsal is paused.

## Public-launch blockers

Public launch remains blocked until public-release consent policy, safeguarding, export/withdrawal operations, support operations, broader ANU suite health, staging migration proof, and publication workflow are complete.