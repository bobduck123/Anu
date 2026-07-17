# NO_MERGE_REVIEW.md — Mandatory Review Gate

## Purpose

Protect Presence, revenue, data, and reputation from plausible but unsafe agent output.

The reviewer must be separate from the builder wherever possible.

## Verdict format

Every review must start with exactly one verdict:

```text
VERDICT: MERGE
VERDICT: MERGE AFTER FIXES
VERDICT: NO MERGE
```

Do not soften the verdict.

## Required review sections

```text
Verdict:
Summary:
Blocking issues:
Non-blocking issues:
Evidence reviewed:
Tests/build/typecheck:
Files changed:
Unexpected changes:
Security/privacy risks:
Auth/tenant/routing risks:
Data persistence risks:
UX/mobile/accessibility:
Launch/revenue impact:
Rollback notes:
Required fixes:
Recommended follow-up:
```

## Merge blockers

A PR must not merge if any of the following are true:

- build fails;
- typecheck fails;
- relevant tests fail;
- tests were not run and no reason is given;
- unrelated files changed;
- auth/tenant/payment/routing touched without explicit approval;
- production data or secrets are exposed;
- public/private boundaries are unclear;
- mobile path is broken for user-facing work;
- visual changes lack screenshots;
- feature changes lack manual QA;
- agent broadened scope;
- rollback path is unknown for risky work;
- output contradicts `PRESENCE_CANON.md`;
- no evidence is provided.

## High-blast-radius checklist

Apply this when the PR touches or may affect:

- authentication;
- tenancy;
- route guards;
- public renderer;
- persistence;
- uploads;
- payments;
- integrations;
- deployment config;
- donor/member data;
- public launch copy;
- compliance or legal wording.

Checklist:

```text
[ ] Scope is explicitly approved.
[ ] Relevant files are expected.
[ ] No unrelated refactors.
[ ] Sensitive data is not exposed.
[ ] Public/private boundaries are preserved.
[ ] Tests cover core path.
[ ] Manual QA covers happy path and failure path.
[ ] Rollback is clear.
[ ] Human approval is required before merge/deploy.
```

## Presence-specific review

For Presence UI/product work:

```text
[ ] Public route loads.
[ ] Studio/editor route loads.
[ ] Mobile layout is usable.
[ ] Content persists after save/reload if persistence is in scope.
[ ] Existing demo/presence routes are not broken.
[ ] Renderer and editor assumptions still match.
[ ] Existing migrated proof remains intact.
[ ] Screenshot evidence included.
```

## Revenue/content review

For commercial artefacts:

```text
[ ] No invented testimonials.
[ ] No unverified claims.
[ ] No false scarcity.
[ ] Price/scope is clear.
[ ] Client deliverable is specific.
[ ] Human approval required before sending.
[ ] Follow-up action is defined.
```

## Profiler/FBi review

For FBi/Profiler work:

```text
[ ] No live donor/member data exposed.
[ ] No identifiable supporter information in public material.
[ ] No final tax/legal claims without approval.
[ ] Anonymisation is sufficient.
[ ] Board-safe and private-operator notes are separated.
[ ] Source of truth is clear.
```

## Legal/admin review

For legal/admin evidence work:

```text
[ ] Facts separated from inference.
[ ] Disputed facts clearly marked.
[ ] Claims tied to evidence.
[ ] Emotional interpretation removed from factual summary.
[ ] No legal advice presented as final authority.
[ ] Questions for lawyer/adviser separated.
```

## Review tone

Be blunt, not dramatic. The review exists to protect velocity, not to punish the builder.

A clean NO MERGE is a successful system outcome if it prevents rework or public damage.
