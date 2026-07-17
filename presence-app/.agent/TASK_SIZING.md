# TASK_SIZING.md — Classify Work Before Delegating

## Purpose

Task sizing prevents overbuilding, quota waste, and unsafe changes. Every task must be classified before assignment.

Use this formula:

```text
Risk score = complexity + ambiguity + blast radius
```

Blast radius matters more than apparent difficulty.

## Size classes

### XS — 15 to 45 minutes

**Examples:**
- fix typo;
- update copy;
- add one static section;
- create one outreach draft;
- create one case-study skeleton;
- update one markdown checklist.

**Agent:** Fast Producer or Builder.

**Review:** light human review.

**Evidence:** changed file/draft + brief summary.

---

### S — half day or less

**Examples:**
- migrate one content section;
- add a simple component;
- update one template;
- draft a Presence Score Audit;
- create a lead list;
- write one proposal;
- add one test.

**Agent:** Builder / Fast Producer.

**Review:** standard review.

**Evidence:** tests if code; QA notes if visual; human approval if commercial.

---

### M — 1 to 2 days

**Examples:**
- migrate one full existing artist presence into system-native structure;
- implement one editor feature;
- create a reusable template archetype;
- build a report dictionary;
- produce a full funding readiness pack;
- create a mini launch page.

**Agent:** Explorer first if ambiguous, then Builder.

**Review:** No-Merge Review required for code.

**Evidence:** screenshots, test results, QA, case study update.

---

### L — 3 to 5 days

**Examples:**
- self-serve editor workflow;
- public renderer changes;
- asset upload/persistence;
- multi-room template system;
- major Profiler/FBi documentation pack;
- end-to-end client delivery system.

**Agent:** requires ExecPlan from `.agent/PLANS.md`.

**Review:** staged review at each milestone.

**Evidence:** milestone logs, tests, screenshots, rollback plan.

---

### XL — more than 1 week

**Examples:**
- auth overhaul;
- tenant architecture;
- payments;
- full ANU kernel integration;
- complete self-serve platform;
- major CRM/data migration;
- public launch of multi-client system.

**Agent:** do not assign directly. Break into plans and milestones.

**Review:** human approval before each milestone.

**Evidence:** plan, risk review, test strategy, rollout/rollback.

## Blast radius classes

### Low blast radius

Changes are isolated and reversible.

Examples:
- copy;
- internal markdown;
- sandbox demo;
- isolated component;
- case study draft.

### Medium blast radius

Changes affect user-facing flow but not critical infrastructure.

Examples:
- editor UI;
- template rendering;
- mobile layout;
- content persistence in non-critical area;
- launch page.

### High blast radius

Changes can break trust, data, money, identity, or public launch.

Examples:
- auth;
- tenant/public-private boundary;
- routing;
- payments;
- donor/member data;
- tax/deductibility logic;
- legal/admin language;
- production deploy;
- public claims.

High-blast-radius tasks require stronger model review and human approval even if technically simple.

## Routing table

| Complexity | Ambiguity | Blast radius | Route |
|---|---|---|---|
| low | low | low | Fast Producer / Builder |
| low | high | low | Explorer first |
| high | low | low | Builder with clear ticket |
| high | high | low/medium | ExecPlan |
| low | low | high | Strong Reviewer + human |
| any | any | high | Strongest review + human gate |

## Task brief requirement

Every task must include:

```text
Task:
Why now:
Size:
Blast radius:
Agent:
Inputs:
Output:
Acceptance criteria:
Evidence:
Human gate:
```

## Stop conditions

Stop and escalate if:

- task touches files outside scope;
- tests cannot be run;
- assumptions conflict with canon;
- implementation requires new architecture;
- sensitive data appears;
- public claims are unsupported;
- task cannot be completed without human decision.
