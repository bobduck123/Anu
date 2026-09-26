# ANU pilot QA on the supplied spatial preview — 26 September 2026

**Preview:** `https://anu-front-end-git-feat-spatial-a-23d0c9-emadhatu-2110s-projects.vercel.app/`

**Verdict: HOLD for ANU outcomes.** After the owner completed Vercel sign-in, the preview was accessible in a browser. It serves the legacy action and proof UI and lacks the commitment and steward-review pages. Its Git branch does not contain the ANU implementation under test. No pilot outcome total is accepted from it.

## Observed checks

| Check | Result |
| --- | --- |
| Browser open of preview root | Initially redirected to Vercel login. The owner completed sign-in; the Manara public shell then loaded. No credentials were handled by the agent. |
| Unauthenticated preview root, `/commitments`, `/_core/readiness` | Each returned HTTP 302 to Vercel SSO; underlying app response was not visible. |
| Authenticated browser `/commitments` and `/commitments/review` | Both rendered “Page not found.” |
| Authenticated browser `/actions` | Rendered one action with “1 completions,” “10 pts,” a “Complete action” control and a legacy to-do control. This is the older action presentation, not the verified-outcome pilot. |
| Authenticated browser `/actions/1` | Rendered “Completions 1,” “Action Replay” and “Upload Proof.” The latter is the legacy direct proof path removed from the reconciled pilot UI. A narrow viewport visual inspection confirmed the button is present. No write control was activated. |
| Authenticated browser `/impact` | Rendered “0 completions” with old completion language. This differs from the action board's one completion, but the scope of the two figures was not established, so no equality claim is made. |
| Authenticated browser `/onboarding` | Showed the older interest-selection journey. No selections were submitted. |
| Public core API `/readiness` | HTTP 200 after the database reconnection. |
| Public core API `/api/commitments/actions/1/outcome` | HTTP 404; prior response identified this as route-not-found, not an action-level result. |
| Preview-proxied reviewed-outcome API | The browser client blocked direct navigation to this JSON URL, so no preview-proxy status is claimed. |
| Git source of preview branch | Remote `feat/spatial-authoring-baseline` at `0df0d9197f8d176c43bf880cc6a2f7e6bc3389c9`. OPS-004, ANU-003, ANU-004 and reconciliation commits are not ancestors. No diff from `main` exists under `frontend-next`, `flora-fauna/backend`, or `services/impact-service`. |
| Real participant/steward workflow, reviewed count, point award, legacy exclusion | Not run: the branch lacks these changes and no permissioned ANU test accounts were used. |

**ANU pilot testability score: 1/5.** The host is live and its public action surfaces render, but it does not contain the ANU code required for this pilot. This is not a score for the spatial-authoring feature itself.

## Next test target

Publish the reviewed ANU dependency stack to its own Vercel preview branch, confirm the preview frontend points to a healthy, selected API/database with the three additive migrations applied, and supply permissioned member/steward test access. Then run the confirm → evidence → independent review → verified count/one-time reward sequence, including the historical legacy row check, before considering `main`.

## Delivery fields

- **Summary:** Live browser inspection confirmed the supplied preview is not an ANU pilot test build.
- **Files changed:** This report only.
- **Commands/tests run:** Read-only browser navigation, HTTP GET status checks, `git ls-remote`, branch ancestry and scoped diff checks.
- **Manual QA performed:** After user sign-in, inspected the root, commitments, review, actions, action detail, impact and onboarding pages in the browser. Read-only controls were used; no legacy completion, proof upload or account change was submitted.
- **Screenshots/links if visual:** The browser's narrow-viewport capture of `/actions/1` showed the legacy “Upload Proof” control. No standalone screenshot artifact was saved.
- **Risks:** No participant/steward authenticated flow or database award was tested. The live action and impact figures differed, but their node scopes were not established.
- **Rollback notes:** Revert this documentation commit if superseded. No hosted data or configuration changed.
- **Remaining work:** Run ANU tests on an ANU preview with the code and migrations, plus two test accounts.
- **Recommended next task:** Create and review the ANU preview release stack, then repeat hosted QA there.
