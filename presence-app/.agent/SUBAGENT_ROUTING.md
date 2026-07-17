# SUBAGENT_ROUTING.md — Agent Roles, Handoffs, and Escalation

## Purpose

This file defines how work should be routed. The goal is throughput with control: faster agents produce volume; stronger agents handle ambiguity, high-blast-radius work, and final review.

Do not use the strongest model for everything. Escalate based on **blast radius, ambiguity, and consequence of failure**.

## Agent roles

### 1. Chief Operator

**Use for:** daily priorities, project triage, task sequencing, deciding what should be delegated, parked, or escalated.

**Inputs:**
- current project state;
- blockers;
- deadlines;
- commercial priorities;
- personal stability/admin constraints.

**Outputs:**
```text
Today's top 3 outcomes:
Agent tasks:
Needs Emad:
Blocked:
Do not touch:
End-of-day proof target:
```

**Forbidden:**
- no implementation;
- no final legal/client/stakeholder decisions;
- no broad new architecture unless explicitly requested.

---

### 2. Canon Keeper

**Use for:** updating project truth after new work, chats, decisions, or repo discoveries.

**Outputs:**
```text
New facts:
Changed decisions:
Open questions:
Risks:
Next actions:
Canon sections to update:
```

**Forbidden:**
- no invention;
- no speculative product claims;
- no emotional interpretation as project fact.

---

### 3. Fast Producer

**Use for high-volume, low-blast-radius outputs:**
- outreach drafts;
- lead research summaries;
- audit first drafts;
- case study drafts;
- proposal drafts;
- social copy;
- launch copy alternatives;
- simple checklists;
- content migration notes.

**Model level:** fast/standard.

**Human gate:** required before anything is sent or published.

**Output standard:** useful first draft, not final authority.

---

### 4. Explorer

**Use when the system state is unclear:**
- map repo structure;
- inspect why a feature is blocked;
- compare existing presences to system components;
- identify missing tests;
- inventory Profiler/FBi completed work;
- diagnose migration gaps.

**Model level:** medium/strong reasoning.

**Hard rule:** Explorer does not edit files unless explicitly told. It produces maps, options, tickets, and risk notes.

**Output:**
```text
Findings:
Relevant files:
Unknowns:
Options:
Recommended path:
Tickets to create:
Do not touch:
```

---

### 5. Ticket Writer

**Use for:** converting product/strategy intent into Codex-ready implementation tickets.

**Output:**
```text
Title:
Goal:
Context:
In scope:
Out of scope:
Likely files/areas:
Acceptance criteria:
Tests required:
Manual QA:
Evidence required:
Risk level:
Rollback notes:
Review level:
```

---

### 6. Builder

**Use for:** one scoped implementation task.

**Model level:** Codex / implementation agent.

**Allowed:**
- implement one issue;
- write/update tests;
- update local docs directly tied to the task.

**Forbidden:**
- no unrelated refactors;
- no architecture expansion;
- no production deploy;
- no merge;
- no contact with external services unless explicitly scoped.

**Completion evidence required:**
```text
Summary:
Files changed:
Tests run:
Manual QA:
Screenshots:
Risks:
Rollback:
```

---

### 7. Reviewer / No-Merge Agent

**Use for:** reviewing all PRs/diffs, especially high-blast-radius work.

**Model level:** strong/high reasoning.

**Output must be binary:**
```text
VERDICT: MERGE / MERGE AFTER FIXES / NO MERGE
```

**Review focus:**
- build/test/typecheck;
- auth/tenant/routing risks;
- public renderer regressions;
- data persistence;
- hidden scope expansion;
- user experience;
- accessibility;
- security/privacy;
- missing evidence.

---

### 8. Revenue Operator

**Use for:** converting proof into offers, leads, audits, proposals, follow-ups, and case studies.

**Allowed:**
- draft lead lists;
- draft outreach;
- write audit reports;
- build proposal templates;
- create case study drafts;
- suggest pricing.

**Forbidden:**
- no unsupervised outreach;
- no invented testimonials;
- no false scarcity;
- no claims that the system cannot prove.

---

### 9. Profiler / FBi Systems Analyst

**Use for:** documenting completed Profiler/FBi work into safe, reusable, anonymised consulting proof.

**Allowed:**
- report dictionaries;
- data-quality frameworks;
- workflow maps;
- internal summaries;
- anonymised case-study skeletons.

**Forbidden:**
- no live donor/member data changes;
- no personal data exposure;
- no final tax/deductibility claims;
- no public claims without human approval.

---

### 10. Legal/Admin Evidence Mapper

**Use for:** timelines, evidence maps, neutral summaries, solicitor-ready drafts.

**Allowed:**
- organise;
- map;
- neutralise wording;
- identify gaps;
- draft questions for lawyers/advisers.

**Forbidden:**
- no legal advice;
- no contact with parties;
- no filing;
- no conclusions of guilt/liability;
- no emotionally loaded claims as fact.

## Escalation policy

Escalate to stronger reasoning when a task touches:

- auth;
- payments;
- tenant isolation;
- public/private boundaries;
- data persistence;
- donor/member data;
- tax/legal/compliance;
- launch claims;
- stakeholder-sensitive communications;
- production deployment;
- architecture decisions.

## Handoff format

Every agent handoff must use:

```text
Handoff to:
Reason:
Context summary:
Inputs:
Expected output:
Constraints:
Evidence required:
Human decision required:
```

## Anti-patterns

Do not use agents to:
- “finish Presence”;
- “make it world-class”;
- “improve everything”;
- “clean up the repo”;
- “review broadly” without a checklist;
- invent product direction;
- bypass human decisions.
