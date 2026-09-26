# ANU-005 adversarial decision cases

Synthetic cases for review and later test implementation. “Current” is derived from the source at `0521c78`; it does not describe live member records. “Proposed” is a review target, not approved policy. Cases deliberately separate calculation, access decision, and human correction.

| ID | Synthetic setup | Current behavior | Proposed decision to test |
| --- | --- | --- | --- |
| T01 — creation gaming | Twenty events created, none delivered; zero completed to-dos; three active certifications; no incident. | Contribution caps at 100; completion multiplier 0.5; no completed-to-do decay factor 0.7; certification 30. Composite is 56, so `governance_eligible=True` even if all events are in the future. | Creation alone cannot establish delivered-event trust or automatic governance eligibility. |
| T02 — open allegation | Same inputs as T01, one open incident linked through `suspended_user_id`. | All linked incidents count; penalty 15 lowers the score from 56 to 41. | Keep unresolved allegation out of the adjudicated penalty; send consequential access to human review if precautionary restriction is needed. |
| T03 — resolved incident | Same as T02, status changed to `resolved` with `resolved_at`. | Still penalized by 15 because status is not filtered. | Require an explicit upheld/dismissed/corrected outcome and preserve the decision reason. |
| T04 — stale record | A stored score of 72 is followed by changed evidence; Black Swan creation is attempted. | `get_trust_score` reuses the row and the 70 threshold can allow creation without recalculation. | Define expiry and a review path; never treat an old score as fresh evidence. |
| T05 — no score row | A role has a `GovernanceEligibilityLink`, certification requirement is met, but no `TrustScore` row exists. | `check_eligibility` passes the trust check because it only rejects an existing ineligible row. | Choose an explicit missing-score outcome and record it; do not silently grant or deny. |
| T06 — no eligibility link | A governance role has no link row. | `check_eligibility` returns eligible immediately. | Decide whether each consequential role needs an explicit approved rule or human review. |
| T07 — voting crash | A voter has a stored `TrustScore` row. | `compute_governance_weight` accesses `trust.score`; the model exposes `composite_score`, so this path raises an attribute error. | A vote must either complete with a documented weight or return a controlled decision state; audit the applied rule. |
| T08 — arbitrary node input | An authenticated organiser asks the analytics recalculation endpoint to calculate their own user ID with a different `node_id`. | The endpoint's self path checks only `user_id` and accepts the caller-supplied node ID, then stores a snapshot and recalculates trust. | Reject or independently authorize cross-node recalculation; write no snapshot or score on denial. |
| T09 — correction | A dismissed or corrected source record follows an earlier denial. | No trust-specific appeal, correction, override or decision-history path was found in the inspected score consumers. | Record correction, reviewer, changed evidence and outcome; preserve prior decision history and notify the affected participant through an approved private channel. |
| T10 — private incident | A participant requests the reasons for a threshold decision involving an incident reported by another person. | Score row stores components but no redacted reason record or participant review state. | Provide a reason and correction path without revealing reporter identity, narrative, or other private details. |
| T11 — node movement | A user or steward changes node after a score is stored. | `TrustScore` is user-global; consumers do not check a score node or source scope. | Decide whether evidence transfers, expires or requires review before affecting a new node's access. |
| T12 — advisory suppression | A user has a stored score of 39 versus no score row; both seek guild recommendations. | The 39 row suppresses all recommendations; the absent row does not. | Document the product rule for missing/stale scores and avoid presenting advisory suppression as a membership prohibition. |

## Execution order after policy approval

1. Run cases T07 and T08 against a disposable database for immediate runtime and tenant-boundary regression.
2. Implement source-evidence fixtures for T01–T06 and T11; use a fixed clock and explicit node IDs.
3. Exercise correction/redaction with two nodes, a participant, reporter and independent reviewer for T09–T10.
4. Check T12 separately as advisory UX, not a permission decision.

No real incident or member record is needed for these fixtures.
