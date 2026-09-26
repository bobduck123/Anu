# ANU-005 — trust-score decision contract for review

**Status:** proposed, not an approved access policy. **Source pin:** `0521c78aed49689c7059f0f5c9812337565f677c`, 26 September 2026. **Gate:** ANU standalone trust. **Size/risk:** M, high blast radius. This tranche maps current behavior and prepares decisions; it changes no score, permission, tenant, vote, or production data.

## Current decision map

| Consumer | Consequence today | Source-backed behavior | Risk / distinction |
| --- | --- | --- | --- |
| Governance role assignment | `POST /api/governance/assign` can grant a named role | [`check_eligibility`](../../flora-fauna/backend/app/services/governance_service.py) checks active certificate count and an existing `TrustScore.governance_eligible` only when a `GovernanceEligibilityLink` exists. No link allows by default; a missing score row also passes the score check. The boolean is based on a fixed 50-point threshold when last computed. | A missing or stale score is treated differently from a low score. The assignment model has a `required_trust_score` field that this check does not read. This is consequential access, not an advisory ranking. |
| Black Swan event and microcosm creation | Non-admin users can pass a crisis-mode creation guard at score 70 | [`mode_guard`](../../flora-fauna/backend/app/security/mode_guard.py) calls `get_trust_score` for non-admin users only in Black Swan mode. Admin roles bypass the threshold. `get_trust_score` computes and commits a row only if none exists; later decisions reuse it without freshness checks. | Creation permission can depend on stale evidence; a request can create a score as a side effect. Normal-mode creation still has its separate route checks. |
| Governance voting weight | A vote calls `compute_governance_weight` | [`credit_engine_service`](../../flora-fauna/backend/app/services/credit_engine_service.py) reads `trust.score`, while [`TrustScore`](../../flora-fauna/backend/app/models.py) has `composite_score` and no `score`. Model introspection confirmed this on the source pin. | A user with a stored trust row can hit an attribute error during voting. Correcting the field alone would change weight policy, so specify missing-score behavior and scaling before release. |
| Competency profile | Score changes calculated proficiency | [`compute_profile`](../../flora-fauna/backend/app/services/competency_scoring_service.py) multiplies proficiency by `composite_score / 100`, with a minimum multiplier of 0.2. | An indirect eligibility/recommendation effect; calculation calls `get_trust_score`, which may write a score. |
| Guild recommendations | Score below a configurable default 40 returns no recommendations | [`recommend_guilds`](../../flora-fauna/backend/app/services/guild_matching_service.py) filters only when a score row exists. | Advisory visibility, not membership authorization. Missing rows pass; stale rows can suppress suggestions. |
| Organiser analytics recalculation | Recomputes and stores a trust score | [`compute_snapshot`](../../flora-fauna/backend/app/services/organiser_analytics_service.py) calls `compute_trust_score` after storing a snapshot. The authenticated [`/recalculate` endpoint](../../flora-fauna/backend/app/api/organiser_analytics.py) accepts a caller-supplied `node_id` for self-recalculation without checking it against the user's node. | A tenant-boundary and provenance issue for the trigger; handle in a separate protected route review. |

[`trust_model_service.py`](../../flora-fauna/backend/app/services/trust_model_service.py) implements a separate posterior over `EventPrimitive` records. The inspected score consumers above read `TrustScore`, not that posterior. The two should not be described as one calibrated decision system.

## Current score inputs and their limits

The current [`compute_trust_score`](../../flora-fauna/backend/app/services/trust_score_service.py) uses completed `Todo` rows, **created** `Event` rows, active certification count, time since the latest completed to-do, and every `Incident` row with `suspended_user_id` set. The event count does not check event date, attendance, completion, or quality. The incident count does not check status, resolution, or adjudication. A resolved incident remains penalized. One hundred points is the contribution cap; 30 is the certification cap; 50 is the incident-penalty cap. The result is stored with a 50-point `governance_eligible` boolean and computation time, but no formula version, input snapshot, decision reason, expiry, reviewer, or appeal state.

The organiser analytics snapshot separately labels an event complete when `attendees >= goal` with `goal > 0`; its query uses **creation date** for the reporting period and does not require the event date to have passed. This proxy is not proof that an event finished. It also counts all linked incidents for `incident_count`.

## Proposed decision contract — requires human governance approval

1. **Separate signals from decisions.** Store a versioned calculation with source references, time window, node, missing-data markers and a computed timestamp. A score is advisory until a named human decision rule explicitly uses it.
2. **Event evidence.** Count creation as an activity signal only. Count completed delivery only after a defined completion record or reviewed evidence; an event scheduled in the future cannot count as completed.
3. **Incident evidence.** Keep allegation/open/investigating records separate from adjudicated findings. An unresolved report must not automatically lower a person's consequential access score. A resolved record needs an explicit outcome and correction path before it can influence a score.
4. **Consequential access.** Define distinct outcomes for score missing, stale, under review, below threshold, and overridden. Do not silently convert any of these into an automatic role grant or denial. Record the human reviewer, reason, duration and affected capability for an override.
5. **Correction and appeal.** Allow a participant to see the reasons and source references relevant to a consequential decision, request correction, and receive a recorded independent review. Do not expose private incident reporter details or other members' data.
6. **Version and replay.** Record formula version and input identifiers for each decision; keep prior decisions and reasons available for audit. A recalculation must not silently rewrite the reason for an earlier access decision.
7. **Tenant boundary.** Authorize the subject and node independently at recalculation and decision endpoints. A supplied `node_id` is not proof of authority over that node.

These are proposed rules, not a conclusion that current members are ineligible or that existing roles should be removed. No existing score or role is changed by this review.

## Bounded implementation packages for approval

| Package | Scope | Decision needed before code changes | Acceptance evidence |
| --- | --- | --- | --- |
| A. Voting-path repair | Fix the nonexistent score attribute and define a valid weight when a trust row is missing, stale or present. | Approve the normalization, cap and missing-score rule because they change governance vote weight. | Synthetic vote fixtures with and without a score; no 500; audit of applied weight. |
| B. Evidence-safe scoring | Version the formula; distinguish created/delivered events and unresolved/adjudicated incidents; record source and freshness. | Approve event completion evidence, incident outcomes, thresholds and retrospective treatment. | Adversarial cases in `ADVERSARIAL_CASES.md`, replayable calculation and privacy review. |
| C. Human review and correction | Add recorded reason, appeal/correction and time-limited override for consequential decisions. | Approve reviewer roles, participant visibility, retention and override authority. | Same-node and cross-node tests, independent-review proof, audit and redaction checks. |
| D. Recalculation boundary | Bind subject and `node_id` to permissioned scope; make writes explicit. | Approve auth/tenant route behavior and migration/rollout plan. | Cross-node denial, self-service allowed path, no unauthorized score/snapshot write. |

**Order:** A is the most immediate runtime defect. B and C define the legitimacy of the score before wider access use. D closes the recalculation boundary. Each package is a separate high-blast-radius branch and review, with human approval before merge/deploy. Do not combine this document branch with implementation.

## Human governance review questions

- Which exact capabilities may a computed score gate, and which must always require a human decision?
- What constitutes verified event delivery and an adjudicated incident outcome?
- Should a missing or stale score defer a role decision, require review, or use another explicit rule?
- Who may correct source evidence and approve a time-limited override, and what may the participant see?
- How should existing role grants, scores and weighted votes be treated when a versioned contract begins?

## Acceptance boundary

ANU-005's mapping, created-versus-completed distinction, unresolved-versus-adjudicated distinction, correction/review/override proposal and adversarial cases are prepared here. **Human governance acceptance remains open.** No score formula, protected permission, tenancy, vote weight or production state is changed in this tranche.
