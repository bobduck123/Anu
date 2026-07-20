# PLANS.md — Execution Plans for Complex Agent Work

## Purpose

Use an ExecPlan for any complex task that cannot be safely completed as a single scoped ticket.

An ExecPlan is a living document that lets a human verify the approach before implementation begins and lets an agent restart from the plan without hidden context.

## When to require an ExecPlan

Use an ExecPlan for:

- L or XL tasks from `TASK_SIZING.md`;
- migrations affecting multiple areas;
- renderer/editor alignment;
- asset upload or persistence;
- self-serve editor milestones;
- route/auth/tenant changes;
- multi-hour refactors;
- major launch page/system work;
- any task with unclear risks.

Do not implement first. Plan first.

## ExecPlan skeleton

```markdown
# ExecPlan: <name>

## Objective

What working outcome will exist when this is done?

## Why now

Why this task matters for Presence launch, revenue, proof, or stability.

## Current state

What is known now. Include relevant files, routes, components, docs, and blockers.

## Non-goals

What this plan explicitly will not do.

## Scope

### In scope

- ...

### Out of scope

- ...

## Risks and blast radius

Classify risk:

- low;
- medium;
- high.

List affected systems.

## Milestones

### Milestone 1 — Research / map

Acceptance criteria:
- ...

Evidence:
- ...

### Milestone 2 — Implementation slice

Acceptance criteria:
- ...

Evidence:
- ...

### Milestone 3 — QA / proof capture

Acceptance criteria:
- ...

Evidence:
- ...

## Files likely involved

- ...

## Tests and validation

Commands:
```bash
npm ci
npm run typecheck
npm run test:e2e
npm run build
```

There is currently no confirmed lint script and no named npm unit-test script. Record those checks as unavailable when relevant; do not invent commands. For local setup, `npm install` is acceptable, and README documents `npm run dev -- --port 3001` as the local development variant.

Manual QA:
- ...

Screenshots:
- ...

## Rollback plan

How to undo safely.

## Human decisions required

- ...

## Progress log

Update as work progresses.

```text
YYYY-MM-DD HH:MM — ...
```

## Final review checklist

- [ ] Acceptance criteria met.
- [ ] Tests run.
- [ ] Manual QA completed.
- [ ] Screenshots captured.
- [ ] Proof/library updated.
- [ ] No unrelated scope.
- [ ] No high-risk boundaries changed without approval.
```

## ExecPlan discipline

- Keep the plan updated.
- Record decisions.
- Split milestones if uncertainty grows.
- Stop before high-risk changes.
- Do not use the plan to justify scope creep.
- The plan must end in a reviewable artefact, not just analysis.
