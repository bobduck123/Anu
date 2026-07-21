# ExecPlan: Presence Studio V3 hosted gate

## Objective

Enable the hosted owner editor to open Studio V3 for BBB human testing while keeping V3 default-off, owner-editor-only, allowlisted, and public-route inert.

## Current state

- P1 complete at `5f33f353cc8266ad13b315a423b1789f8bd3611b`.
- V3 frontend shell exists at `presence-app/components/presence-studio-v3/PresenceStudioV3Shell.tsx`.
- Existing owner editor route is `presence-app/app/(studio)/studio/[id]/editor/page.tsx`.
- Existing V3 selector is `presence-app/lib/presence/studio-v3/feature.ts`.
- Backend V3 owner routes are in `flora-fauna/backend/app/api/presence_graph.py`.

## Non-goals

- No public renderer change.
- No public route change.
- No permanent `/editor-v3` route.
- No auth, tenant, publish, payment, or control-plane weakening.
- No hosted deploy, hosted migration, hosted smoke, hosted write, or publish.
- No GGM/private client exposure.

## Risk and blast radius

Risk: high, because the task touches editor routing/gating and backend owner endpoint availability.

Mitigation:

- Keep the change restricted to explicit V3 gates.
- Preserve the existing owner-node auth boundary.
- Require env flags and concrete BBB allowlists.
- Keep public route invariance covered by existing focused Playwright specs.

## Milestones

### 1. Diagnose

Confirm route, selector, env reads, production hard-block, BBB eligibility, backend dependency, migration dependency, and auth/session boundary.

### 2. Implement

Add explicit hosted-human-test frontend and backend gate flags with non-wildcard BBB allowlists.

### 3. Test

Add pure gate unit tests and update focused backend gate tests. Run frontend typecheck/build, V3/V2/public invariance Playwright gates, backend tests, Python compilation, and diff check.

### 4. Review

Run independent no-merge review. Commit only after exact `VERDICT: MERGE`.

## Rollback

Unset the hosted-human-test V3 flags, redeploy frontend for `NEXT_PUBLIC_*` changes, and the BBB owner editor returns to the V2 fallback. No server rollback is required for gate disablement.
