# Anu Cost-Lowering Engine Audit (Multi-Round, Multi-Choice)

Date: 2026-04-23
Scope: UX, visual quality, journey flow, and robustness of the cost-lowering engine
Status: Discovery and scope alignment complete; implementation package agreed

## 1) Purpose

Run a comprehensive, multi-round, multi-choice user satisfaction audit to agree exactly what work should be done next for the Anu cost-lowering engine.

---

## 2) Method

- Format: Structured multi-round, multi-choice survey
- Rounds completed: 5
- Coverage pattern:
  - Round 1: broad pain-domain selection
  - Round 2: major drop-off stage + freeform clarifier
  - Round 3: target capability model (future architecture)
  - Round 4: release strategy + success signals
  - Final round: delivery package commitment

---

## 3) Audit Results (User-Selected)

## Round 1 — Primary pain areas
Selected:
- Flow friction
- UI clarity/trust
- Low control/flexibility
- Robustness gaps

## Round 2 — Biggest drop-off stage
Selected:
- Review recommendations

User note:
- Visual aesthetics are poor
- Current experience is rigid and overly groceries-specific
- Priority is core, reusable system structure (not a single run type)

## Round 3 — Required architecture capabilities
Selected:
- Domain-agnostic core
- Configurable model
- Pluggable vertical packs

## Round 4 — Release sequencing + success signals
Release strategy selected:
- Foundation-first UX

Success signals selected:
- Trust score up
- Completion/time up
- Reliability up

## Final selection — Scope commitment
Selected package:
- Balanced core package

---

## 4) Agreed Product Direction

The cost-lowering engine should move from a grocery-specific flow to a domain-agnostic optimization product shell.

Target model:
- Core primitives: constraints, objectives, scenarios, actions
- Configurable dimensions/rules/priorities without code changes per vertical
- Vertical packs layered on top of the same core structure

---

## 5) Agreed Work Package (Execution Scope)

## A. Visual + interaction foundation
- Replace current rigid visual treatment with a cleaner, trust-oriented hierarchy
- Improve readability, state clarity, and interactive affordances
- Establish consistent confidence cues and decision context display

## B. Flow redesign (domain-agnostic journey)
- Restructure journey to: Define objective → Configure constraints → Generate options → Compare tradeoffs → Commit
- Reduce friction at recommendation review and next-action decision points
- Remove groceries-centric framing from primary navigation and copy in the core journey

## C. Configurable model surface
- Enable configurable dimensions and objective weighting
- Support scenario presets and editable constraints
- Ensure model inputs are reusable across vertical packs

## D. Robustness hardening
- Strengthen validation and state-transition integrity
- Improve recoverability for partial failures/retries
- Make apply/commit operations safer and more deterministic
- Improve failure messaging for actionable user recovery

## E. Explainability baseline
- Present recommendation rationale and tradeoff explanation in-review
- Surface confidence/sensitivity indicators suitable for user decisions

---

## 6) Concrete Code Touchpoints (Current System)

Primary frontend pages:
- `frontend-next/src/app/(app)/cost-lowering/page.tsx`
- `frontend-next/src/app/(app)/runs/[id]/page.tsx`
- `frontend-next/src/app/(app)/pledges/page.tsx`
- `frontend-next/src/app/(app)/dashboard/savings/page.tsx`

Primary API client and contracts:
- `frontend-next/src/lib/api/wcleApi.ts`

Primary backend API + engine services:
- `flora-fauna/backend/app/api/wcle.py`
- `flora-fauna/backend/app/services/wcle_service.py`

Shell/navigation surfaces to de-grocery the core pathway:
- `frontend-next/src/ui-system/layout/Sidebar.tsx`
- `frontend-next/src/ui-system/layout/pathwayGuidance.ts`
- `frontend-next/src/ui-system/layout/mobileDockModel.ts`

---

## 7) Risks Observed During Audit (for hardening scope)

- Domain lock-in risk: supplier/run semantics are encoded as product language in core UX
- State-transition brittleness risk: multiple run/pledge statuses with narrow handling paths
- User-trust risk: estimated savings shown without explicit confidence or sensitivity framing
- Recovery risk: action failures can produce generic or low-guidance states

---

## 8) Acceptance Criteria for This Package

1. Users can complete the core journey with fewer ambiguity points and explicit next actions.
2. Recommendation review provides clear “why this” and tradeoff context.
3. Core flow language and controls are domain-agnostic; vertical specifics are modular overlays.
4. Critical lifecycle actions have deterministic behavior, clear guardrails, and actionable errors.
5. Measured improvement in:
   - Trust score
   - Completion time / completion rate
   - Runtime reliability indicators

---

## 9) Out of Scope (explicitly deferred)

- Full platform/SDK-grade extensibility in the immediate milestone
- Big-bang rebuild of every related module in one release

---

## 10) Final Agreement

The agreed next milestone is a balanced core package:
- Foundation-first UX + flow redesign
- Configurable domain-agnostic model surface
- Robustness hardening
- Explainability baseline

This is the committed implementation direction from the multi-round audit.
