# ANU-004 ExecPlan — one commitment-to-outcome pilot

## Objective

A participant confirms one node-scoped action, may cancel, submits an HTTPS evidence link after doing it, receives an explicit steward decision, and can return to the durable status. Public action outcome data counts verified completions without exposing the actor or evidence URL.

## Scope and source state

This isolated branch starts at ANU-003 commit `80389e6`, which itself starts at the reviewed but unmerged OPS-004 source. Existing `Todo`, `/complete_action`, and `ActionProof` routes represent older participation paths. They do not contain a steward decision state and are not used for this pilot. The action detail page previously offered a direct proof upload, so this branch removes that shortcut from the pilot screen.

## Implementation

1. Add a private action commitment record with action, participant, node and reviewer references; add a nullable-free additive table migration without running it.
2. Add authenticated, node-scoped confirmation, cancellation, evidence submission and steward review endpoints. Use existing audit records for each successful transition.
3. Add a public projection with only action ID and verified count.
4. Link the action board, action detail, participant history and steward queue to the workflow.
5. Verify invalid transitions, cross-node access, independent review, retry, reload and public redaction with synthetic tests and browser QA.

## Risk boundary

No live migration, merge, deploy, real account write or public claim. The older completion and proof APIs remain available for existing consumers and can still record legacy totals. The new verified count does not use those values. A release plan must resolve legacy metrics and point awards before a hosted pilot treats all completion totals as equivalent.

## Rollback

Revert the ANU-004 commit. Leave the unused additive table in place until a reviewed schema rollback. No production data was changed.
