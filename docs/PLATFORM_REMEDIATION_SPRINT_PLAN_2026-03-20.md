# Platform Remediation Sprint Plan (Derived from User Satisfaction Audit)

Date: 2026-03-20
Source: `docs/PLATFORM_USER_SATISFACTION_AUDIT_2026-03-20.md`
Planning Horizon: 90+ day strategy with immediate execution starting Sprint 1

## Sprint Architecture

## Sprint 1 — Journey Reliability + Auth Continuity Baseline
Objective:
- Eliminate high-frequency journey breakpoints around sign-in transitions and protected-route continuity.

Primary backlog coverage:
- #1 Journey reliability
- #2 Auth/session trust restoration
- #16 Content clarity and visual salience (auth moments only)

Acceptance focus:
- Deterministic return-to-context behavior from auth prompts.
- Shared auth-link generation contract across major surfaces.
- Protected-route UX consistency for key account-bound WCLE routes.
- Hybrid preview for cost-lowering discovery and run detail.

Status:
- **Implemented locally in this sprint execution** (see Sprint 1 implementation record below).

---

## Sprint 2 — Explore-First Navigation + IA Coherence
Objective:
- Rebuild shell wayfinding so exploration naturally reveals task pathways and role progression.

Primary backlog coverage:
- #3 Explore-first navigation
- #5 Information-density rebalancing
- #17 In-flow contextual discoverability

Expected outcomes:
- Fewer control collisions, clearer route intent, stronger next-action salience.

Status:
- **Implemented locally in this sprint execution** (see Sprint 2 implementation record below).

---

## Sprint 3 — Mobile-First Interaction Foundation
Objective:
- Make mobile the baseline interaction model for core journeys.

Primary backlog coverage:
- #4 Mobile-first interaction baseline
- #6 Runtime responsiveness (mobile-first execution)

Expected outcomes:
- Better touch ergonomics, hierarchy stability, and mobile transition smoothness.

---

## Sprint 4 — Education Progression and Trust Signals
Objective:
- Clarify educational progression and connect insight surfaces to practical outcomes.

Primary backlog coverage:
- #8 Education progression clarity
- #9 Education insight-to-action linkage
- #10 Education confidence signals
- #11 Education fallback fatigue reduction

Expected outcomes:
- Clear “what next,” stronger content confidence, lower fallback fatigue.

---

## Sprint 5 — Cost-Lowering Trust + Journey Coherence
Objective:
- Improve run discovery, pledge confidence, and organizer/member coherence.

Primary backlog coverage:
- #12 Run discovery usability
- #13 Pledge confidence
- #14 Savings layered transparency
- #15 Organizer flow coherence

Expected outcomes:
- Higher conversion from discovery to pledge and better trust in savings outcomes.

---

## Sprint 6 — Performance, Stability, and Value Realization
Objective:
- Stabilize interaction quality at scale and reinforce long-term value perception.

Primary backlog coverage:
- #7 Stability/jank reduction
- #18 Long-term value and progression payoff clarity

Expected outcomes:
- Lower jank/reload risk, stronger operational confidence, clearer value progression.

---

## Sprint 1 Implementation Record (Executed)

### Implemented changes

1. Introduced shared auth return-to contract
- Added: `frontend-next/src/lib/auth/returnTo.ts`
- Provides:
  - `sanitizeReturnTo(...)`
  - `buildAuthHref(...)`
  - `savePendingReturnTo(...)`
  - `readPendingReturnTo(...)`
  - `clearPendingReturnTo(...)`
  - `resolvePostAuthReturnTo(...)`

2. Hardened auth route continuity behavior
- Updated: `frontend-next/src/app/auth/page.tsx`
- Improvements:
  - Safe return-path sanitization
  - Pending return-path persistence via session storage
  - Deterministic post-login redirect resolution
  - Automatic redirect away from `/auth` when already authenticated

3. Standardized auth-link generation on core surfaces
- Updated to use shared helper:
  - `frontend-next/src/app/(app)/community/page.tsx`
  - `frontend-next/src/app/(app)/education/certifications/page.tsx`
  - `frontend-next/src/components/education/hub/EduHubDashboard.tsx`
  - `frontend-next/src/components/education/CurriculumLayerView.tsx`
  - `frontend-next/src/components/education/GovernanceLayerView.tsx`
  - `frontend-next/src/components/education/RegenerationLayerView.tsx`
  - `frontend-next/src/app/(app)/cost-lowering/page.tsx`
  - `frontend-next/src/app/(app)/runs/[id]/page.tsx`
  - `frontend-next/src/app/(app)/organizer/runs/[id]/page.tsx`

4. Added reusable protected-route boundary primitive
- Added: `frontend-next/src/components/auth/ProtectedRouteBoundary.tsx`
- Applied on:
  - `frontend-next/src/app/(app)/pledges/page.tsx`
  - `frontend-next/src/app/(app)/dashboard/savings/page.tsx`

5. Enabled hybrid preview behavior for cost-lowering discovery
- Updated: `frontend-next/src/app/(app)/cost-lowering/page.tsx`
  - Guests can explore runs (preview mode) with clear sign-in CTA for pledge operations.
- Updated: `frontend-next/src/app/(app)/runs/[id]/page.tsx`
  - Guests can inspect run details/packs; pledge action routes to sign-in when needed.

### Verification artifacts

- Type validation: `npm run typecheck`
- Build validation: `npm run build`
- Focused test validation:
  - Existing auth page tests updated
  - New return-to helper tests added

Test files:
- Updated: `frontend-next/src/test/authPage.test.tsx`
- Added: `frontend-next/src/test/authReturnTo.test.ts`

### Sprint 1 completion status

- **Local implementation:** Complete
- **Local validation:** Complete
- **Deployment/push:** follow explicit operator instruction only

---

## Sprint 2 Implementation Record (Executed)

### Implemented changes

1. Introduced shared explore-first guidance model
- Added: `frontend-next/src/ui-system/layout/pathwayGuidance.ts`
- Provides:
  - navigation mode derivation (`explore` / `tasks` / `all`)
  - route-aware next-step guidance bundles

2. Restructured sidebar IA around exploration-to-task flow
- Updated: `frontend-next/src/ui-system/layout/Sidebar.tsx`
- Improvements:
  - nav architecture changed to explicit sections: `Explore`, `Action`, `Trust`, `Admin`
  - explore-first segmented control (`Explore`, `Tasks`, `Full`) in panel header
  - route-aware contextual “next flow” action links within panel
  - preserved universe array and admin visibility constraints

3. Added persistent contextual next-step bar in app shell
- Added: `frontend-next/src/ui-system/layout/PathwayGuideBar.tsx`
- Updated: `frontend-next/src/ui-system/layout/LayoutShell.tsx`
- Improvements:
  - always-visible, low-density “Next flow” guidance beneath system health surface
  - route-aware quick links to reduce wayfinding ambiguity

4. Added sprint-level guidance tests
- Added: `frontend-next/src/test/pathwayGuidance.test.ts`
- Coverage:
  - route-to-mode mapping
  - education flow guidance mapping
  - cost-lowering flow guidance mapping

### Verification artifacts

- Type validation: `npm run typecheck`
- Build validation: `npm run build`
- Focused test validation:
  - `src/test/pathwayGuidance.test.ts`
  - `src/test/authPage.test.tsx`
  - `src/test/authReturnTo.test.ts`
- Browser verification:
  - route-aware `Next flow` bar visibility on education / cost-lowering / events
  - sidebar mode controls and task filtering behavior

### Sprint 2 completion status

- **Local implementation:** Complete
- **Local validation:** Complete
- **Deployment/push:** follow explicit operator instruction only
