# Studio V3 P1 public invariance

Status: PASS; Studio V3 Chromium 10/10, V2 BBB parity/eligibility 14/14, post-review publish-free public Enter rerun 1/1, public-invariance rerun 2/2, and payload/adapters 27/27; formal `MERGE AFTER FIXES` remains recorded; fresh final review pending

## Frozen surfaces

- `/p/bbbvision`
- `/presence/bbbvision`
- `/api/presence/public/bbbvision`
- existing bridge-undefined V2 BBB interactions and focus behavior
- published editable config serialization
- public RoomKey/card payload behavior

P1 Film Strip and experience styling are editor-preview-only behavior inside the shared component. Every P1 experience class/data facet and the Film Strip branch require `editorBridge`. When the bridge is absent, the component deliberately ignores P1 layout/experience tokens and uses the exact pre-P1 shared composition/rendering path. This is proven with an adversarial no-bridge fixture that supplies Film Strip and P1 experience values rather than relying only on current public payloads not containing them.

The no-bridge BBB keyboard path is also restored to its pre-P1 rule: Enter prioritizes the visibly hovered canvas shape. Editor-specific active-index keyboard behavior is bridge-scoped, so it cannot change public hover/focus ownership.

The repaired projection also fails closed for private placement state. A public object or composition entry is emitted only when its placement is `placed`, not hidden, and backed by a current Piece. Unavailable Works are shelved/hidden; explicitly hidden placements remain private through metadata/savepoint restore; Film Strip consumes only accepted composition IDs. These paths cannot reintroduce shelved, unavailable, hidden, unplaced, or duplicate Pieces into visitor output.

## Private-state exclusion

The new V3-private state table/service is not reachable from public serialization. Public responses do not contain any of:

- `presence_studio_v3_state`;
- named Look, lock, savepoint, comparison, compatibility, restore, or placement-provenance fields;
- owner IDs or opaque owner partitions;
- V3 source refs;
- private media IDs or preview references;
- revision/fingerprint concurrency fields.

## Evidence method

1. Capture the canonical and alias BBB routes after P1.
2. Run the existing V2 BBB renderer, layout, eligibility, and public payload hygiene suites with one worker.
3. Run the Studio V3 public-invariance spec, including bridge-free Test as visitor, forced P1-token no-bridge fallback, and request-ledger assertions.
4. Exercise backend public payloads before and after private metadata writes and a local existing-draft replacement test; compare public results and assert no V3-private fields.
5. Record exact commands and counts in `VALIDATION_RECORD.md`.

## Confirmed result

- The Studio V3 Chromium gate passed 10/10. Its public-invariance scenarios compared `/p/bbbvision` before and after the local Studio flow, verified `/presence/bbbvision` returned `200`, confirmed that no Studio V3 shell leaked onto either public route, found no forbidden product write, and proved that no-bridge rendering strips Film Strip/P1 experience behavior even when those tokens are supplied.
- The public API response at `/api/presence/public/bbbvision` excluded owner/private source, preview, and V3 metadata fields in the browser proof. Backend P1 coverage also confirmed private-state exclusion across private metadata writes and existing-draft replacement.
- Existing V2 BBB parity and eligibility passed 14/14, including bridge-undefined interaction behavior, restored hovered-shape Enter priority, keyboard focus ownership, renderer layout, and reduced-motion behavior. After the approval-boundary review, the added public Enter regression was rerun by itself with a direct published BBB Threshold fixture and no save/publish helper; it passed 1/1.
- Public payload hygiene and V2 adapter tests passed 27/27.
- The compiler's 28/28 gate includes unavailable-Work and explicitly hidden-placement regressions that assert absence from both public objects and composition placements after projection/remap/restore.
- Fresh captures `screenshots/14-public-p-bbbvision-unchanged.png` and `screenshots/15-public-presence-bbbvision-unchanged.png` were inspected as part of the evidence set.

No public route mutation, hosted write, deploy, or publish was performed. Any later unexplained public payload, DOM, interaction, instrumentation, focus, or visual drift remains a blocking public-invariance failure.

The scoped public-route inventory and security/private-material checks passed. The draft-row publish synchronization exception has explicit human approval, and the post-review public evidence reruns did not invoke publish. The formal review remains `VERDICT: MERGE AFTER FIXES`; fresh final review is still required.
