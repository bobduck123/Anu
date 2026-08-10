# PEACH Gate 10 Readiness

Date: 2026-07-31

## Implemented

Gate 10 makes PEACH usable for a controlled ANU internal pilot rehearsal.

Implemented:

- Durable consent export/withdrawal operation requests
- Durable non-payment SupportIntent persistence
- Protected PEACH steward workspace at `/control/peach`
- Protected steward API for contribution review, consent operation review, and support intent listing
- Public participant routes for consent requests and support intents
- Control proxy allowlist for PEACH control APIs
- Internal pilot rehearsal runbook and repo health note

## Internal pilot rehearsal readiness

A controlled internal pilot rehearsal can begin inside ANU if it stays within the Gate 10 boundaries:

- trusted adults only;
- non-sensitive material only;
- no youth/child material;
- no uploads;
- no payments;
- no public contribution display;
- steward review for contribution, consent, and support workflows.

The focused PEACH backend tests, frontend typecheck, control proxy test, and local route checks pass.

## Still unsafe or held

- Public contribution display
- Public Commons/Yield release
- Real payments, checkout, cart, product grid
- Automated export bundle generation
- Automated withdrawal/deletion/redaction
- File uploads
- Youth/child collection
- Sensitive testimony collection
- Email automation
- Presence integration
- Finished operations console beyond rehearsal UI

## Private staging blockers

Before private staging beyond local rehearsal, apply both Gate 9 and Gate 10 migrations to a staging database, configure control-plane secrets/token minting, verify control-host routing, and run the pilot smoke script against staging.

## Public deployment blockers

Public deployment remains blocked by broader ANU backend suite health, incomplete safeguarding and consent operation automation, no public-release policy, no Commons/Yield publication flow, and no payment policy/implementation approval.

## Recommended Gate 11 focus

Gate 11 should run a real private staging rehearsal:

- apply migrations to staging;
- seed Field 001 rehearsal data;
- execute participant, consent, support, and steward scripts end to end;
- capture screenshots/database/audit evidence;
- add minimal export/withdrawal handling rules;
- triage the broader Presence suite failures before any public release path.

## Readiness verdict

Gate 10 meets the pass conditions for internal rehearsal: consent operation requests exist, SupportIntent persistence exists, protected steward workflow exists, public display remains disabled, support remains non-payment, sensitive/youth collection remains rejected, focused PEACH tests pass, wider repo health is documented, and the internal pilot rehearsal plan exists.