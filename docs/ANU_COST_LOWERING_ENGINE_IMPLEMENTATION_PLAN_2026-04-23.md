# Anu Cost-Lowering Engine — Implementation Plan (Post-Audit)

Date: 2026-04-23
Depends on: `docs/ANU_COST_LOWERING_ENGINE_MULTI_ROUND_AUDIT_2026-04-23.md`
Goal: Deliver the agreed balanced core package

## Milestone Objective

Transform the current groceries-anchored cost-lowering flow into a domain-agnostic, trustable, and robust optimization experience while preserving current production utility.

---

## Slice 1 — Core UX foundation + domain-agnostic framing (Highest risk)

### Scope
- Redesign cost-lowering entry/list/detail UI information hierarchy
- Replace groceries-centric framing in core pages with generic optimization language
- Introduce explicit stage model in UI: Objective, Constraints, Options, Compare, Commit

### Primary files
- `frontend-next/src/app/(app)/cost-lowering/page.tsx`
- `frontend-next/src/app/(app)/runs/[id]/page.tsx`
- `frontend-next/src/ui-system/layout/Sidebar.tsx`
- `frontend-next/src/ui-system/layout/pathwayGuidance.ts`
- `frontend-next/src/ui-system/layout/mobileDockModel.ts`

### Acceptance checks
- Key actions discoverable within one viewport on desktop and mobile
- Core terminology no longer hardcoded to groceries in foundational flow
- Recommendation cards expose decision-relevant metadata clearly

---

## Slice 2 — Configurable model surface (High risk)

### Scope
- Introduce reusable scenario input model in frontend state/contracts
- Add support for configurable objective/constraint controls
- Preserve backward compatibility with existing WCLE run payloads

### Primary files
- `frontend-next/src/lib/api/wcleApi.ts`
- `frontend-next/src/app/(app)/cost-lowering/page.tsx`
- `frontend-next/src/app/(app)/runs/[id]/page.tsx`
- (new) domain-agnostic model config module under `frontend-next/src/lib/...`

### Acceptance checks
- User can tune at least: objective preference, budget/constraint boundary, and comparison mode
- Existing run list/detail still load from current backend API without regressions
- Type-safe handling of optional model fields and defaults

---

## Slice 3 — Robustness and state integrity hardening (High risk)

### Scope
- Harden lifecycle validation around run/pledge transitions
- Improve idempotency and retry safety for commit actions
- Upgrade error surfaces to actionable diagnostics

### Primary files
- `flora-fauna/backend/app/api/wcle.py`
- `flora-fauna/backend/app/services/wcle_service.py`
- `frontend-next/src/lib/ui/actionableErrors*`
- `frontend-next/src/app/(app)/runs/[id]/page.tsx`

### Acceptance checks
- Invalid transitions return deterministic, explicit validation errors
- Duplicate commit attempts do not create inconsistent records
- Frontend displays recovery-oriented error guidance for action failures

---

## Slice 4 — Trust/explainability baseline + metrics instrumentation

### Scope
- Add rationale/tradeoff summary components to review stage
- Add confidence/sensitivity placeholders tied to current available data
- Instrument funnel metrics for trust/completion/reliability outcomes

### Primary files
- `frontend-next/src/app/(app)/cost-lowering/page.tsx`
- `frontend-next/src/app/(app)/runs/[id]/page.tsx`
- telemetry or logging surfaces currently used by app shell

### Acceptance checks
- Recommendation view includes “why this option” and tradeoff summary
- Funnel events emitted for key stage transitions and failures
- Baseline dashboard queryable for trust/completion/reliability KPIs

---

## Verification Plan

1. Unit/integration tests for run/pledge lifecycle transitions and invalid-state guards
2. UI verification for desktop + mobile key flows:
   - discover opportunities
   - inspect option
   - configure and commit
   - review post-commit outcomes
3. Error-path verification (network/API and validation failures)
4. Regression check for existing pledges/savings pages

---

## Delivery Notes

- Keep API compatibility during the milestone; avoid forcing backend migration for first release.
- Use feature gating where needed for new model controls.
- Prefer incremental rollout by slice, with visible confidence/quality gains per slice.
