# Studio V3 M1 independent no-merge review

Review status: FINAL REVIEW COMPLETE — `VERDICT: MERGE`

The independent reviewer must inspect the final working tree and replace the status above with exactly one first-line verdict:

```text
VERDICT: MERGE
VERDICT: MERGE AFTER FIXES
VERDICT: NO MERGE
```

The builder may commit only after required validation passes and the fresh independent review returns exact `VERDICT: MERGE`.

## Required review record

Verdict: `VERDICT: MERGE`

Summary: No owner-flow acceptance, correctness, security, persistence, or public-invariance blocker was confirmed. The five previously reported blockers are fixed; the three-layer adversarial review found only crafted-payload, rare-failure, pre-existing, or manual-verification follow-ups.

Blocking issues: None.

Non-blocking issues: Direct authenticated API callers can craft internally inconsistent private metadata; a storage-success/database-failure upload can leave an unindexed private blob; refreshed URLs for existing inventory assets are not all applied after upload; pre-existing Named Look local validation rejects some backend-supported provenance/media data; a non-Presence motion lock can visually disable the global motion control; and no-op private saves can increment the metadata revision. The approved published-fallback concurrency residuals, camel-case media-key hardening, and manual/WebKit accessibility follow-ups also remain deferred.

Evidence reviewed: Work order; applicable `AGENTS.md` and `.agent` operating documents; six canonical Studio V3 specifications; all 69 frozen paths; the complete evidence pack; source/tests; all 18 screenshots; and blind, edge-case, and acceptance review layers. All five earlier blockers were independently re-traced.

Tests/build/typecheck: Reviewer ran no tests, builds, servers, publish paths, or mutations. It audited the recorded publish-free passes: typecheck; frontend compiler/API 45/45; backend 35 passed with the publish-synchronization test deselected; canonical Chromium 23/23; public eligibility/payload 3/3; named non-publish public Enter 1/1; public payload/adapters 27/27; Python compile; mock syntax; production build; diff hygiene; and screenshot checks. The discarded local-mock publish-fixture run received no evidence credit.

Files changed: Reviewer changed none. Frozen state was 25 tracked modified plus 44 untracked paths (69 total), zero staged, on branch `feat/presence-studio-v3-m1-functional-editing` at HEAD `c33c56913d3e55f65e257b97432abe987f773cf0` with manifest `a0a326661ce8dfd83eb463ccf313b964c1776966e605abcc1612cda784345bf8`.

Unexpected changes: No drift. Four assignment alias filenames were absent, but the canonical work-order equivalents were present and reviewed; this was a review-instruction path discrepancy, not an implementation defect.

Security/privacy risks: No cross-owner media reference, public serialization leak, credential exposure, or unsafe upload path was found. All screenshot hashes/dimensions matched and the PNGs contained no text, EXIF, or ancillary metadata payloads. The private orphan-blob failure mode remains a bounded operational-hardening item.

Auth/tenant/routing risks: No auth weakening, tenant crossover, or public-route change was confirmed. Inventory uploads use the Room owner identity, remain private, and retain platform-admin auditing. Public routes stay outside the private Studio state projection.

Data persistence risks: The published-fallback draft-absence TOCTOU, simultaneous first published-fallback state-row race, pre-existing camel-case media-key hardening, and manual accessibility follow-ups remain non-blocking. Conflict handling, durable Show recovery, cross-layout reconciliation, private media ownership, and metadata scope validation satisfy M1.

UX/mobile/accessibility: The 18 screenshots truthfully cover the required edit, arrangement, visual selection, Library/Collections, save, mobile, visitor-preview, and public-invariance states. The 390px automated flow has no horizontal overflow and retains the bottom bar. WebKit, manual keyboard/screen-reader checks, and final contrast tuning remain follow-ups.

Launch/revenue impact: M1 supplies reviewable functional creator-editing proof with bounded private persistence while keeping publish and canonical public data outside scope.

Rollback notes: Disable the existing frontend/backend hosted-human-test gates and BBB allowlist, then rebuild/restart normally. BBB owner editing falls back to V2 and public routes remain unchanged. No schema migration was introduced; inventory-only uploads remain private `draft_uploaded` records.

Required fixes: None before merge. Human approval remains required to merge; the reviewer performed no merge, deploy, push, publish, or production mutation.

Recommended follow-up: Validate object-edit identity and full effective composition capacity server-side; clean up private storage on media-row transaction failure and refresh all returned asset URLs; repair the Named Look local-envelope mismatch; add WebKit/manual accessibility evidence; and address the two documented persistence concurrency residuals later.

## First frozen-tree review and remediation

First verdict: `VERDICT: MERGE AFTER FIXES`

Frozen tree: branch `feat/presence-studio-v3-m1-functional-editing`; HEAD `c33c56913d3e55f65e257b97432abe987f773cf0`; 69 changed/untracked paths; manifest `53471092a577d88c8d314091e969a4aa37528a49e0cb59f43cad85cce116089f`; zero staged paths.

Blocking issues found:

1. Hidden Pieces could consume bounded Room Style capacity and ordinary compatibility counts.
2. Top-level `layer_values` and nested savepoint layer values/locks could persist missing or foreign scopes.
3. A published private-state expectation could remain writable after an active draft appeared.

Applied fixes:

1. Room remapping now excludes effectively hidden source-safe edits, preserves valid visible residents, reserves valid explicit arrangements deterministically, protects required bounded CTA placement, clears removed composition edits, and restores accounting in original order. A hidden otherwise-eligible placed Piece remains durably `placed` while structural accounting treats it as shelved, so `Show` restores it after structural apply and private-state hydration. Focused unit and fresh-hydration browser regressions pass.
2. Backend validation now checks current and savepoint lock/value scopes against their own Room/object/placement graphs and includes numeric Work/Collection scopes in owner checks. Valid, missing, cross-Room, cross-owner, and zero-mutation route cases pass.
3. Published fallback now conflicts whenever a draft exists, while only a selected draft base is row-locked. No published-row lock was added. The serializer rollback probe now uses the active draft identity.

The first reviewer changed no files and invoked no publish path or publish test.

## Second frozen-tree review and remediation

Second verdict: `VERDICT: MERGE AFTER FIXES`

Frozen tree: branch `feat/presence-studio-v3-m1-functional-editing`; HEAD `c33c56913d3e55f65e257b97432abe987f773cf0`; 69 changed/untracked paths; manifest `2040313d9e5f28568e61fcb9a99c20947525e8e1a10393bb2efc10deb8aafa67`; zero staged paths.

Blocking issues found:

1. Arrange followed by applying a different Room Style retained stale layout-specific object-edit fields, so the backend correctly rejected the private Save with `422`.
2. Valid restored V1 placement-level `visibility: hidden` state was displayed as Hide and could not be made visible through Show because the control only read and wrote the object-edit representation.

Applied fixes:

1. Cross-layout Room Style staging now removes only incompatible arrangement fields (`zoneId`, `order`, `size`, `treatment`, and `featured`) while retaining independent copy, media, and visibility edits. Focused unit and browser coverage proves Arrange → different Room Style → Apply → private Save → cache-independent hydration.
2. Show now recognizes both supported hidden-state representations. For a current source with placement-level hidden state it clears the placement visibility/reason, restores `placed` status, applies a visible overlay when capacity permits, remaps the safe composition, and survives private Save/hydration. Focused unit coverage proves the valid persisted-hidden recovery path.

The second reviewer changed no files and invoked no publish path or publish test. It recorded four non-blocking follow-ups: the published-fallback draft-absence TOCTOU window constrained by the approved draft-row-only lock boundary; a possible unique-row conflict for simultaneous first published-fallback state saves; pre-existing camel-case `mediaId`/`mediaIds` atomic-replacement hardening; and the documented WebKit/manual accessibility matrix.

A new independent reviewer must assess the refreshed frozen tree before any commit.

## M1-specific review checklist

- [x] Actual supported copy/media/placement/presentation edits work and persist only where claimed.
- [x] Direct manipulation clamps/snaps to registered zones, has non-pointer alternatives, and cancels exactly.
- [x] BBB Pieces and canonical Collections are represented truthfully without hidden duplication.
- [x] Upload/Create is either proved safe or honestly disabled with `UPLOAD BACKEND REQUIRED` recorded.
- [x] Bottom-bar choices are visual, contextual, functional, selected clearly, and explain disabled states.
- [x] Look and Room Style previews are visually meaningful and interact predictably.
- [x] Save feedback distinguishes private durability, failure, conflict, memory-only, and disabled states without implying publish.
- [x] No public route, public serializer, publish, canonical Work/media, auth, tenant, or production gate boundary weakened.
- [x] No raw/unsafe media references, secrets, private payloads, or GGM material exist in code, tests, logs, or screenshots.
- [x] Mobile, keyboard, focus, touch-target, and reduced-motion behavior is usable.
- [x] Public invariance and request-ledger evidence is complete.
- [x] Rollback is actionable and does not require public/canonical data mutation.
