# Studio V3 M1 public invariance

Status: PASS for the scoped publish-free invariance gate; independent no-merge review pending
Baseline commit: `c33c56913d3e55f65e257b97432abe987f773cf0`
Public routes: `/p/bbbvision`, `/presence/bbbvision`

## Result

M1 owner edits remain owner-private V3 metadata or local editor preview state in the final scoped gate. The implementation review found no intentional public route, public serializer, public navigation, eligibility-default, hosted-gate-default, or published-BBB mutation. The shared V2 room renderer gained one optional `inMemoryVisualPreview` input so bridge-free **Test as visitor** can retain the edited visual state; its default is `false`, and public callers omit it. Public-route and payload results come from the publish-free commands recorded in `VALIDATION_RECORD.md`.

The only new media write is a deliberately requested, capability-gated inventory upload. It creates an owner/Room-scoped private `draft_uploaded` media record and returns stable identity. It does not attach to or replace the draft, create/update a canonical Work, mutate published config, or expose a public URL through V3 metadata.

## Proof checklist

- [x] Final changed-file inventory and the shared renderer's default-off public call sites were rechecked.
- [x] Private edit/save flows emit only the permitted inventory POST and owner-private V3 state PUT.
- [x] The request ledger rejects draft, preview, publish, rollback, canonical CRUD, and public mutation writes.
- [x] Publish-free eligibility and payload Chromium specs pass 3/3 with one worker and zero retries.
- [x] The named publish-free gallery public-Enter Chromium test passes 1/1; the full publish-fixture spec is not claimed.
- [x] Public payload and Studio V2 adapter tests pass 27/27.
- [x] Both V3 public-invariance Chromium scenarios pass within the 23/23 canonical suite.
- [x] Test as visitor contains no owner editor chrome, request data, or raw private metadata.
- [x] Hidden/unavailable Pieces and compatibility-only grouping are excluded from public-shaped output.
- [x] Screenshots 16-18 were recaptured, decoded, independently hashed, and visually inspected against the sanitized BBB fixture.

## Route comparison

The V3 public-invariance spec visits each public route separately and compares its normalized DOM signature and public payload before and after private M1 edits. Both comparisons pass. Screenshots 17 and 18 were captured and hashed independently; they are byte-identical because both aliases render the same unchanged canonical entry state. Pixel equality is not used as route-identity proof: route-specific browser assertions and normalized DOM/payload comparisons provide that proof.

## Executed evidence

- Canonical V3 Chromium: 23/23 passed, including both public-invariance scenarios.
- Publish-free public eligibility/payload Chromium: 3/3 passed.
- Named publish-free gallery public-Enter Chromium: 1/1 passed.
- Public payload/adapters unit tests: 27/27 passed.
- Focused non-publish backend: 35 passed, 1 publish-synchronization source test deselected.
- Product request ledger: zero forbidden writes in the canonical evidence run.

An earlier command that accidentally reached a local mock publish handler is excluded and receives no evidence credit. It caused no hosted/production mutation and is documented in `VALIDATION_RECORD.md`.

Exact commands are in `VALIDATION_RECORD.md`; permitted and forbidden request shapes are in `REQUEST_LEDGER.md`.
