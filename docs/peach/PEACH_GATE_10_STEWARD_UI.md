# PEACH Gate 10 Steward UI

Date: 2026-07-31

## Route

Protected steward workspace:

- `/control/peach`

The page lives in `frontend-next/src/app/(control)/control/peach/page.tsx` and uses `PeachStewardWorkspace`.

## Control protection

The route inherits the existing `(control)/control` layout, which restricts control pages to configured control hosts. Data calls use `controlFetchJson` through `/api/control/*`. The control proxy now includes a PEACH allowlist rule for `/api/control/peach/*`.

## Contribution review UI

The workspace lists contributions by review status and displays:

- contribution type
- chosen credit
- contact method
- consent version
- consent level
- visibility preference
- credit preference
- Yield permission
- sensitive flag
- youth flag
- review status
- public display false
- created timestamp

Allowed steward updates:

- `held`
- `accepted_private`
- `rejected`

The UI does not provide a public display toggle and labels public display as disabled/false.

## Consent operation UI

The workspace lists consent operation requests by status, shows operation type, contributor contact/name, request detail, and allows steward status updates to `in_review`, `completed`, or `rejected` with optional note.

## Support intent UI

The workspace lists support intents, support type, field relationship, contact/name, amount intent, status, note, and `paymentTaken: false`.

## Limitations

The UI is a rehearsal cockpit, not a finished operations console. It does not implement exports, email, deletion/redaction automation, bulk actions, uploads, or public release.