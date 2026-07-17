<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — Presence / Flora-Fauna Hyperdrive Operating Rules

**Purpose:** This repository is being run as a launch machine, not a research playground. Agents are used to compress labour, not to replace judgement. Every task must move us toward shipped Presence proof, paid work, reusable delivery systems, or protected operational stability.

## Operating hierarchy

1. **Presence launch** — flagship product and proof layer.
2. **Existing work harvest** — migrate prior artist/cultural presences into the Presence system.
3. **Revenue support** — Presence Score Audits, Artist Launch Kits, Cultural Org/Funding packs, AI/Data Ops snapshots.
4. **Profiler/FBi proof** — document completed build work into safe, anonymised consulting proof.
5. **Long-term architecture** — ANU/Mudyin/Cultural OS only when it directly supports launch, proof, or paid delivery.

## Core instruction

Do not broaden scope. Do not redesign the cathedral. Close the loop.

For every task, optimise for:

- working output;
- reviewable diff or artefact;
- clear evidence;
- minimal blast radius;
- reusable proof;
- launch velocity.

## Required reading before work

Agents must read the relevant files before acting:

- `.agent/PRESENCE_CANON.md` — current project truth, launch scope, do-not-touch rules.
- `.agent/SUBAGENT_ROUTING.md` — which agent mode should handle which task.
- `.agent/TASK_SIZING.md` — how to classify work and select review level.
- `.agent/NO_MERGE_REVIEW.md` — mandatory merge/review checklist.
- `.agent/PLANS.md` — required format for complex/multi-hour work.
- `.agent/PROOF_LIBRARY.md` — existing delivered work to harvest into product proof.
- `.agent/REVENUE_PIPELINE.md` — offers, leads, and commercial work rules.
- `.agent/SECURITY_AND_PRIVACY.md` — privacy, legal, donor/member data, and client-data restrictions.
- `.agent/DAILY_OPERATOR.md` — daily operating rhythm.

## Absolute non-negotiables

Agents may not, without explicit human approval:

- merge PRs;
- deploy to production;
- change auth, tenant isolation, payments, tax/deductibility logic, or donor/member data;
- send emails or contact clients/stakeholders;
- publish public claims;
- make legal conclusions;
- alter production data;
- delete existing work;
- introduce new architecture during migration tasks;
- change brand/product positioning outside scoped copy work.

## Default delivery rule

Every finished task must include:

```text
Summary:
Files changed:
Commands/tests run:
Manual QA performed:
Screenshots/links if visual:
Risks:
Rollback notes:
Remaining work:
Recommended next task:
```

If a task cannot provide evidence, it is not complete.

## Build and test commands

Package manager: **npm**. `package-lock.json` is the reproducible dependency lockfile.

```bash
# CI / reproducible install
npm ci

# Local install
npm install

# Development
npm run dev

# README local development variant
npm run dev -- --port 3001

# Typecheck
npm run typecheck

# End-to-end tests
npm run test:e2e

# Build
npm run build
```

There is currently no confirmed `lint` script and no named npm unit-test script in `package.json`. Treat both as missing/future work. Do not invent `npm run lint`, `npm test`, or another substitute in plans or handoffs.

If command reality changes, do not guess. Inspect `package.json`, `package-lock.json`, README, and relevant CI configuration, then update this file and the relevant `.agent` docs.

## Checkpoint extraction discipline

- `checkpoint/presence-containment-2026-07-17` at `5c387e60d7df150f7774e562f0a18f3b3da8c1eb` is a local, non-merge checkpoint.
- It preserves an unresolved in-progress bundle, is not production-ready, and is not reviewed for merge.
- Do not push or merge the checkpoint directly.
- Extraction branches must be created from the pre-checkpoint commit `006428cf87fe513044081b6f5250a578d8ecf12b`.
- Restore only the explicitly scoped paths needed for each extraction. Do not use an extraction task to carry unrelated checkpoint files forward.

## Current proof and publication boundaries

- GGM is a private working proof only. It is not public launch material and must not be published.
- BBB is the eventual publish candidate and has client approval for publication, but publishing/deployment remains a separate human-gated task.
- A visual mock, copied frontend, or frontend fallback does not prove a system-native Presence migration.
- This documentation task must not change demo fallback behaviour. Production demo-fallback removal or disablement is deferred until a truthful persisted replacement exists and a separate task scopes and reviews it.
- Public proof must distinguish persisted backend rooms from demo or fallback content.

## Branch and PR rules

- One task = one branch = one PR.
- PR title format: `[presence] <short outcome>`.
- No omnibus PRs.
- No unrelated refactors.
- No drive-by formatting outside changed files.
- Do not combine feature work, cleanup, and architecture changes in one PR.
- If task scope expands, stop and create a follow-up ticket.
- High-blast-radius PRs require the no-merge review checklist before merge.

## Commenting and code style

- Preserve existing project conventions.
- Prefer boring, explicit code.
- Do not introduce a new dependency unless the task explicitly requires it and the reason is documented.
- Avoid clever abstractions in launch-critical work.
- Keep public renderer behaviour stable unless explicitly scoped.

## Migration principle

Existing artist/cultural presences are proof. Migration tasks must preserve the strongest qualities of the existing work and convert them into system-native templates/components.

Do not redesign existing presences from scratch unless the work order explicitly says so.

## Revenue principle

Commercial artefacts should be simple, sellable, and evidence-backed:

- Presence Score Audit;
- Artist Launch Kit;
- Presence Lite/Pro;
- Cultural Org Presence;
- Funding Readiness Pack;
- AI/Data Ops Snapshot.

Agents may draft proposals, audit reports, and outreach. Humans approve and send.

## Definition of done

A task is done only when it produces one or more of:

- merged/reviewable code with evidence;
- live or previewable Presence proof;
- case study/proof-library update;
- client/revenue artefact ready for human approval;
- documented blocker with a next action;
- updated canon that prevents future context loss.
