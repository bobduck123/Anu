# Threshold Language Spec (2026-04-07)

## Purpose
Separate user-facing participation language from code-level access controls while keeping both consistent across routes, APIs, and trust surfaces.

## Two-Layer Model
ANU uses two related but distinct concepts:

1. **Actor labels** — the human language shown in UI and docs.
2. **Access thresholds** — the code-level gates enforced in routes, APIs, and policies.

Both layers must stay mapped, but they are not interchangeable.

## Actor Labels
| Label | Meaning | Typical Context |
|---|---|---|
| Public | read-only or unauthenticated visitor | public routes, trust surfaces, archive |
| Participant | authenticated actor joining routes and taking ordinary civic action | actions, events, community |
| Contributor | authenticated actor creating consequential inputs | claims, stories, commitments, proposals, evidence-bearing content |
| Steward | scoped governance / curation actor | node oversight, review, moderation, governance reading |
| Operator | privileged control-plane actor | runtime, node admin, finance approvals, platform operations |

## Code-Level Access Thresholds
| Enum | Meaning | Typical Enforcement Surface |
|---|---|---|
| `OPEN` | public-readable surface | public routes, archive index, transparency |
| `MEMBER` | authenticated participant surface | actions, events, community participation |
| `VERIFIED_ACTOR` | actor must be verified for consequential input or effect | contribution, claim submission, commitment execution |
| `STEWARD` | node-scoped governance or oversight authority | governance review, moderation, node curation |
| `OPERATOR` | privileged control-plane execution | control routes, runtime health, tenant admin |

## Default Mapping
| Actor Label | Access Threshold |
|---|---|
| Public | `OPEN` |
| Participant | `MEMBER` |
| Contributor | `VERIFIED_ACTOR` |
| Steward | `STEWARD` |
| Operator | `OPERATOR` |

This mapping is the current default and remains in force until superseded in the decision register.

## Display Rules
### Must display threshold language
Display user-facing threshold labels on:
- flagship route headers where consequence matters,
- connector rail prompts,
- archive/trust records involving gated contribution or review,
- governance surfaces explaining who may act.

### Must not over-display threshold language
Do not clutter:
- simple public reading surfaces,
- generic marketing/hero copy,
- internal diagnostic UI where role is already explicit.

## Enforcement Rules
### Frontend
- route shells and registry-driven UI must expose threshold labels where the route contract says they matter,
- transitions should clarify when a user is below threshold.

### Backend
- APIs enforce code-level thresholds,
- trust-facing endpoints may expose threshold metadata,
- node-scoped roles must not be inferred from UI labels alone.

### Impact-service
- privileged Falak operations must align with control or steward thresholds where applicable,
- participant-safe projections must not leak privileged capability.

## Threshold Escalation Semantics
A user may move upward in capability, but the system must never silently imply they already hold a higher threshold.

Required:
- explicit gating,
- explanatory copy,
- fallback route or next-step guidance,
- auditability for privileged threshold use.

## Threshold Failure Behaviour
When a threshold is not met, the route or API must do one of the following:
1. deny with explicit reason,
2. redirect to a next-step flow,
3. present a read-only surface with clear gating explanation.

It must not:
- fail ambiguously,
- silently hide available escalation paths,
- reveal privileged internals.

## Node-Scope Note
Thresholds are global labels but may be scoped to a node.
A `Steward` in one node is not automatically a `Steward` across all nodes.
An `Operator` may be platform-wide or node-scoped depending on control-plane policy.

## Review Rule
If a route’s threshold changes, both of the following must be updated together:
- `docs/THRESHOLD_LANGUAGE_SPEC_2026-04-07.md`
- `frontend-next/src/ui-system/anu/thresholdRegistry.ts`
