# Presence Studio V3 Risk Register

**Status:** active from prototype through Milestone 2
**Date:** 2026-07-21
**Overall classification:** high product consequence despite a default-off prototype, because the design sits beside draft/public projection, client content, and renderer behavior

This is a planning register. No mitigation test or runtime command is claimed as run by this specification pass.

## How to use this register

Every implementation task names the risks it owns, adds its test/evidence links, and stops when a control cannot be proven. Closing a risk means the named preventive control, detection test, evidence, and rollback path all exist; “the code looks safe” is not closure.

Related contracts:

- [Milestones](./STUDIO_V3_MILESTONES.md)
- [Acceptance tests](./STUDIO_V3_ACCEPTANCE_TESTS.md)
- [View model and compiler](./STUDIO_V3_VIEW_MODEL_AND_COMPILER.md)
- [Prototype slice](./STUDIO_V3_PROTOTYPE_SLICE.md)
- [Implementation task packets](./STUDIO_V3_SUBAGENT_TASKS.md)

## Scoring

- **Likelihood (L):** 1 rare, 2 unlikely, 3 plausible, 4 likely, 5 expected without control.
- **Impact (I):** 1 cosmetic, 2 local inconvenience, 3 lost work/degraded UX, 4 trust/public-boundary failure, 5 privacy, ownership, production, or irreversible public failure.
- **Score:** L × I. 15–25 critical, 8–14 high, 4–7 medium, 1–3 low.
- **Residual target:** no critical risk may enter a pilot; high risks need explicit no-merge review and human acceptance.

## Register

| ID | Failure mode | L | I | Score | Phase / owner | Required control and evidence | Residual / disposition |
|---|---|---:|---:|---:|---|---|---|
| R-01 | A save, Look, restore, preview, or transformation accidentally writes or publishes when its gate forbids it | 3 | 5 | 15 | all / compiler + security reviewer | P0/P1 expose no server-write or preview-POST action; local M1 keeps runtime Save/server Visitor Preview disabled until the separately approved atomic persistence subgate passes; request-ledger hard fail; canonical/alias public fingerprints; explicit final checklist separate | Target low. Any P0/P1 write, premature M1 Save/server preview, or publish/rollback/hosted mutation is immediate no-merge |
| R-02 | The V3 canvas uses the generic editor renderer while visitor-test/public uses specialized `PresenceStudioV2PublicRoom`, so edits are visually dishonest | 4 | 4 | 16 | prototype / UX shell + interaction | Render the actual public-room component; parity markers for BBB specialization; compare editor canvas to bridge-free in-memory **Test as visitor** while server Visitor Preview is blocked; no generic fallback for supported specialization | Target medium until every specialization has a bridge contract |
| R-03 | Optional selection/editor bridge changes public output or lets native/deferred BBB behavior escape editor interception | 3 | 5 | 15 | P0 / interaction + security reviewer | Optional/default-undefined prop; intercept inside native actionable callbacks before side effects; block direct/window/CTA/internal navigation; cancel pending focus and recheck bridge mode in deferred callbacks; no-ID CTA/link and unsupported chrome return suppress-only results; repeated activation stays suppressed; explicit **Test as visitor**/**Open link**; undefined-path invariance | Target low; revert bridge and retain read-only canvas if any escape or undefined-path difference occurs |
| R-04 | A non-atomic client refetch plus current POST races, targets/creates the wrong draft, or mutates config/media before mismatch is discovered | 5 | 5 | 25 | blocked M1 persistence / compiler + backend/security review | Current flow and post-refetch are non-authoritative; disposable single-writer fixture is characterization only; runtime Save/server Visitor Preview require separately approved atomic expected-existing-draft identity/revision/stable-fingerprint check-and-replace, zero-mutation conflict, and transactional media effects | Residual critical; persistence stays disabled until the atomic server contract passes |
| R-05 | Full V3 metadata, locks, save points, provenance, or private editor state leaks through the current raw public serializer | 4 | 5 | 20 | prototype/M1 / compiler + security reviewer | Never persist full V3 metadata in editable config; inspect only the characterization fixture's serialized POST candidate; scan public payload; browser-local metadata allow-list; future private serializer requires separate work order | Target low for prototype; durable cross-device metadata remains deferred |
| R-06 | Compiler exceeds backend limits or silently truncates content: 256 KiB total, 96 KiB per section, 160 list items/keys, depth 9 | 3 | 4 | 12 | M1 / compiler + shelf | Preflight identical/below stricter limits; boundary fixtures; actionable capacity report; no silent omission; track compiled size by section | Residual medium because future richer media/content needs backend contract cleanup |
| R-07 | Browser-local state/provenance from another base, Room, owner, or schema is applied or used to invent canonical source refs | 4 | 4 | 16 | P1/M1 / look + compiler | Split Presence/Room envelopes under an opaque authenticated-owner partition; require exact schema, scope, complete immutable base identity, and stable persisted-semantic fingerprint; strip only transport-added `url`/`preview_expires_at` on valid private-draft media-ID objects; quarantine/discard any mismatch; clear on logout/account switch; unmatched objects stay `legacy-object:<id>`; no title/URL guessing; `updated_at` is diagnostic only | Target low locally; durable server identity remains a pre-market blocker |
| R-08 | Local storage is unavailable, full, shared across logins, or contains sensitive media/tokens/private data | 3 | 4 | 12 | P1 / look + security reviewer | Minimal schema allowlist; opaque validated-session owner partition; clear prior partition on logout/account switch; disable local persistence when partition cleanup cannot be confirmed; no blobs/base64/tokens/visitor/private payload; quota handling and clear action | Residual medium on shared devices; durable secure persistence is deferred |
| R-09 | Nondeterministic/colliding placement IDs or browser-local provenance is mistaken for durable market identity | 4 | 4 | 16 | P1/M1/pre-market / view-model/compiler | Explicit refs; deterministic Room-scoped IDs; uniqueness/repeat compile; local recovery only from qualified matching envelope; durable server-side placement/source identity required before market launch | Residual high until durable identity/provenance exists server-side |
| R-10 | Placing a Collection silently duplicates, hides, drops, or reorders Pieces | 4 | 4 | 16 | M1 / shelf + compiler | Expand in canonical Collection order; skip/report duplicates; visible Shelf for incompatible items; complete placed/skipped/retained summary; input/output accounting invariant | Target low; no apply if all inputs cannot be accounted for |
| R-11 | Remove-from-Room/Collection is confused with permanent Work deletion, or a partial placement index makes deletion look safer than it is | 3 | 5 | 15 | M1 / shelf + UX | No permanent delete in contextual editor; Library-only destructive action; complete-accounting gate for Collections/Rooms/legacy refs; impact summary and explicit confirmation; cancel and API-negative tests | Target low for fully indexed fixtures; current Works page delete UX and durable placement indexing need separately scoped hardening if inadequate |
| R-12 | A Look, direct edit, or transformation removes the entry/core Room or hides the final required CTA | 3 | 5 | 15 | M1/M2 / compiler + look | Protected invariants before preview/apply/save; reachable CTA and entry Room tests at all widths; visible repair path; no draft write on violation | Target low; configuration of what counts as required needs product-owner confirmation before general rollout |
| R-13 | Named Look layer restore is approximate, leaks a media reference, or a structural save point fails exact BBB return | 4 | 5 | 20 | M1/M2 / look + compiler | Keep named Looks to normalized editable layer values/recommendations and provenance with no locks or placement/order; media only as a validated opaque stable owner-authorised asset ID and omitted when unavailable; use a distinct pre-transform save point for Room/style refs, placements/order/visibility, CTA/navigation, and locks; no URLs/screenshots/blobs/private refs; V3 + compiled fingerprints; independent restore review | Residual medium until metadata has durable backend persistence |
| R-14 | Media types/fields are underspecified, inaccessible, too large, unavailable, or leak private URLs | 4 | 4 | 16 | M1 / shelf + a11y/security | Treat current Work model honestly; validate supported media; keep unsupported item visible; no auto-substitute; alt/transcript/caption requirements; client-side limits never claim server capability | Residual high for rich multimedia; backend/media-contract cleanup is pre-market work |
| R-15 | Inherited V2 pixel transforms break mobile/responsive output | 4 | 4 | 16 | prototype/M1 / interaction + a11y/mobile | Safe zones, discrete sizes, viewport clamping, drag alternatives, 320–1440 matrix, reject unsupported transforms; no claim of normalized spatial model | Residual medium; normalized responsive positioning is required before market/V3.1 |
| R-16 | Touch-first controls, bottom sheet, canvas selection, motion, or Looks are inaccessible | 4 | 4 | 16 | M1 / accessibility/mobile | 44×44 targets, keyboard equivalence, focus return/trap rules, semantic roles/states/live messages, contrast safe fallback, reduced motion, zoom and screen-reader review | Target medium pending independent manual assistive-technology QA |
| R-17 | Actual public-room renderer plus editor overlays causes poor performance, jank, or selection desynchronization | 3 | 3 | 9 | prototype/M1 / UX + interaction | Avoid duplicate renderer trees; stable keys; bounded overlay state; test low-end/mobile interactions; measure render/interaction timing; degrade to controls without decoration | Target medium; add budgets only from measured baseline |
| R-18 | V3 gate is enabled by default, leaks to production, or selects the wrong room | 3 | 5 | 15 | prototype / UX shell + reviewer | Separate V3 env names; explicit enabled flag plus pilot allow-list; production deny-by-default; eligible/ineligible/empty-list tests; configuration evidence | Target low. Revert gate selection file to restore existing editor |
| R-19 | V3 bypasses or weakens current auth, ownership, tenant, or route behavior | 2 | 5 | 10 | all / UX shell + security reviewer | Reuse existing editor route/session/API client; no auth/owner/control-plane changes; wrong-owner/unauthenticated negatives; diff allow-list | Target low; any auth/tenancy change stops the task |
| R-20 | Editor instrumentation, selection metadata, private local state, or operator/debug labels appear in public output | 3 | 5 | 15 | prototype/M1 / interaction + reviewer | Bridge undefined on public routes; public DOM/payload/source scan; no public analytics event from editor; operator/debug UI absent; client-language audit | Target low |
| R-21 | Private GGM content or visual state is copied into fixtures, logs, screenshots, or public claims | 3 | 5 | 15 | M2 / tests/evidence + reviewer | Synthetic abstract GGM-like recipe only; path/content scan; transformed state reviewed locally and never committed as screenshot; BBB before/restored evidence only | Target low; delete/revoke evidence and stop if exposure occurs |
| R-22 | “Radical difference” degrades into a palette swap, fails to exceed the current BBB creativity/originality bar, or makes content unusable | 4 | 3 | 12 | M1/M2 / look + UX | Contract requires atmosphere, structural presentation, treatment, density, motion, navigation, and hierarchy deltas; independent creative rubric against BBB; compiler assertions; Before/After and cancel | Target medium because artistic quality needs human judgment |
| R-23 | Two tabs/sessions overwrite each other or create divergent local save points despite equal/unchanged version numbers | 4 | 5 | 20 | P1/blocked M1 persistence / compiler | Local envelopes compare complete identity plus stable persisted-semantic fingerprint; runtime writes remain disabled until server-enforced atomic expected-existing-draft identity/revision/fingerprint preconditions return zero-mutation conflicts; `updated_at` remains diagnostic | Residual high locally and critical for persistence until the atomic server contract exists |
| R-24 | Preview/apply or Before/After compares the wrong baseline and loses unsaved edits | 3 | 4 | 12 | M1/M2 / look | Immutable staged baseline fingerprint; Apply/Cancel semantics; create save point before transformation; dirty-state assertions; no network call on cancel | Target low |
| R-25 | Existing Work supports image-shaped fields and one `collection_id`, but V3 language promises flexible media and story worlds the backend cannot yet represent | 5 | 3 | 15 | M1/pre-market / content architecture | Capability matrix; adaptive labels without false functionality; prototype only supported fields; clearly defer media type, many-to-many, and ordering cleanup; no hidden backend expansion | Residual high until scoped backend cleanup completes |
| R-26 | V2 renderer objects become mistaken for canonical Works, creating split ownership and lossy edits | 4 | 4 | 16 | prototype/M1 / shelf + compiler | Canonical owner APIs are source of truth; V2 objects are derived placements with source refs; legacy object refs are explicit/read-only until mapped; canonical-edit tests | Target medium while legacy unmapped objects exist |
| R-27 | Specialized BBB/public aliases, route semantics, or renderer eligibility drift while adding V3 | 3 | 5 | 15 | prototype/M1 / UX + reviewer | Do not change public route/gate logic; canonical + alias route fingerprints; legacy/non-pilot negatives; focused review of feature and renderer files | Target low |
| R-28 | New dependencies or a broad architecture layer expand blast radius and delay proof | 3 | 3 | 9 | all / chief implementer + reviewer | Use current React/Next/Playwright stack; no dependency without explicit ticket and rationale; one task/branch/PR; reject drive-by refactors | Target low |
| R-29 | Restore references media or canonical content deleted after the save point and falsely claims success | 3 | 4 | 12 | M2 / look + shelf | Save stable refs, not content copies; preflight refs on restore; unresolved-reference report; block exact-success claim; never recreate deleted Work implicitly | Target medium |
| R-30 | Public/preview equality is asserted from screenshots alone while payload or semantic order changed | 3 | 4 | 12 | all / tests/evidence | Require request, payload, DOM, compiler, and visual oracles; document normalized volatile fields; screenshots are supporting evidence only | Target low |
| R-31 | Fingerprinting either changes on every signed private-media GET or hides an authoritative URL/content change by stripping too broadly | 4 | 5 | 20 | P0/P1/M1 / compiler + security reviewer | Stable persisted-semantic projection removes only owner-GET-added `url` and `preview_expires_at` on valid `private_draft` + valid `media_id` objects inside scene/asset/content; ordinary/public URLs and all other values remain authoritative; positive/negative path fixtures | Target low locally; any broader volatile-field rule is no-merge |
| R-32 | A top-level POST field with `undefined` disappears during JSON serialization, so pre-wire comparison approves a different payload | 4 | 5 | 20 | characterization/blocked M1 persistence / compiler | Serialize and parse the candidate using actual request semantics; require all nine top-level fields after serialization; preserve null/empty distinctions; fixture cannot enable Save | Target low for detection; runtime remains blocked by R-04 |

## Critical control details

### C-01 — persistence safety, exact base, and blocked atomic gate

Gate P0 and Gate P1 perform no server write. Local M1 editing may proceed, but runtime Save and server Visitor Preview remain disabled while this control is blocked.

1. Select and immutably retain the complete loaded server config plus its complete identity: source kind, config `id`, `room_id`, `version`, status, and `schema_version`; record `updated_at` only as diagnostic metadata.
2. Build the ten-field stable persisted-semantic fingerprint projection. Recursively remove only owner-GET transport-added `url` and `preview_expires_at`, only from a valid object with `visibility: "private_draft"` and a valid `media_id`, and only within `scene_config`, `asset_config`, or `content_config`. Ordinary/public URLs and all other fields/key-presence distinctions remain authoritative.
3. Require a concrete compiler-owned path/subtree constant and evidence table covering replacement, deletion, normalization, private-media effects, and unknown-key behavior. No undeclared wildcard/root ownership; unknown paths outside closed owned subtrees are unowned.
4. Build a ten-field logical candidate by injecting unchanged base `schema_version` into the nine-field adapter result; compare every unowned path with the base and fail on any authoritative difference.
5. Project the nine-field wire candidate by intentionally omitting only `schema_version`, then run the same JSON serialization/parse semantics as the request. All nine top-level POST fields must remain present; disappearance through `undefined` is a failure, not an omission allowance.
6. Validate size, depth, list, key, media, CTA, Room, source identity, content accounting, owned deletion, and unowned retention invariants.
7. A disposable local/test single-writer fixture may call the current full-config POST only to characterize replacement/deletion and private-media assignment/orphaning effects. The fixture must prove public invariance, sanitize evidence, and be torn down. It never enables product Save or server Visitor Preview.
8. Record explicitly that current `getPresenceEditor` refetch plus current full-config POST is not atomic and the POST may create a draft. A post-POST refetch can verify the resulting ten-field shape and media effects, but it cannot make the preceding mutation concurrency-safe or roll it back.
9. Runtime persistence requires a separately approved server operation that, in one transaction, checks the expected existing-draft identity, revision, and stable fingerprint, replaces only that exact existing draft, and applies media assignment/orphaning effects.
10. If the expected draft is absent or any identity/revision/fingerprint precondition mismatches, the operation returns conflict with zero config and zero media mutation. It must not create a draft as fallback.
11. Only a passing implementation of that atomic contract may expose M1 Save or server Visitor Preview. Recursive-merge `PATCH` remains forbidden. This docs task authorises no backend implementation.

Local P1 and local M1 proof remain useful and server-write-disabled. Post-refetch is verification evidence only; it is never the atomic precondition.

### C-02 — browser-local prototype schema

Local metadata must be versioned, partitioned by the validated session, and split by responsibility:

```text
opaque authenticated-owner partition key
schema version
complete immutable selected base identity
stable persisted-semantic complete-base-config fingerprint
updated_at (diagnostic only)

Presence envelope:
  Presence/node identity
  validated simple/advanced mode preference
  named Look values/provenance and validated opaque asset IDs
  Presence/global locks, navigation, staging, and save-point index

Room envelope:
  Presence/node and Room identity
  Room locks/overrides
  placement/source provenance and visible shelf state
  Room staging/comparison/save-point fragments
```

It must not contain:

```text
auth/session tokens
raw owner identifiers or owner/visitor records
public/private API payload copies
media blobs, base64, or file contents
GGM content/assets/routes/screenshots
operator/debug state
publish credentials or claimed public status
```

A named Look record contains normalized editable layer values, recommendations/defaults, provenance, and—only when available—a validated opaque stable owner-authorised asset ID. It contains no URL, blob, copied media, private-draft reference, lock state, Room placements, order, visibility, CTA state, or navigation structure. Those structural fields belong only to a separately typed save point used for exact restoration.

Only a complete match across opaque owner partition, schema, Presence/Room scope, complete immutable base identity, and stable persisted-semantic full-base fingerprint may load an envelope or qualify local Work/Collection source provenance. Logout/account switch clears the previous partition; if cleanup cannot be confirmed, local storage is disabled. Any authoritative mismatch is quarantined/discarded; unmatched compiled objects remain `legacy-object:<id>` and title/URL guessing is forbidden. An `updated_at` difference is diagnostic rather than identity authority. Storage failure degrades honestly to in-memory editing and blocks persistence/recovery claims.

### C-03 — actual renderer bridge containment and activation suppression

The bridge is editor-only capability passed by the V3 shell. The complete normative contract is [View model and compiler: Optional editor bridge](./STUDIO_V3_VIEW_MODEL_AND_COMPILER.md#optional-editor-bridge). When absent, public and visitor-test rendering must retain existing props, native callbacks, event behavior, DOM, CSS, analytics, direct/window navigation, pending/deferred focus behavior, focus order, and payload. Public components may expose only the smallest optional selection callback/identifier contract required to select a supported Piece.

When present, interception must occur inside each native actionable callback before visitor behavior is scheduled; a parent/container capture handler alone does not satisfy the contract. First and subsequent pointer/keyboard activation select or remain selected while suppressing direct/window/CTA/internal navigation, lightbox/focus, gallery advance, and media playback. Interception cancels any pending artwork-focus request, and every deferred focus/navigation callback rechecks the live bridge mode immediately before acting. A CTA/link without a stable selectable Piece ID returns the no-ID action-suppressed result; unsupported BBB chrome returns the chrome-suppressed result. Both are suppress-only: neither navigates nor creates a guessed/anonymous selection. True visitor interaction is available only through explicit **Test as visitor**, which removes the bridge/overlay. Destinations open only through explicit, labeled, safe-scheme **Open link**.

If this cannot be achieved without public behavior changes, the fallback is a read-only actual-renderer canvas with controls outside it. A new renderer is not an approved fallback.

### C-04 — complete content accounting

Every placement or transformation emits a summary satisfying:

```text
input source refs = placed refs + duplicate refs + incompatible refs + explicitly rejected refs
```

Each ref appears exactly once in the outcome. “Unsupported” must include a client-readable reason and a visible Shelf location. The operation fails if it cannot account for all inputs.

### C-05 — exact restoration

“Restored” is a gated state, not a toast. It requires equality of normalized V3 state, deterministic IDs/order, locks/overrides, compiled V2 owned paths, retained unowned paths, and semantic/visual preview baselines. Deleted/unavailable media refs produce an incomplete restore report and block the exact-restored claim.

## Privacy and evidence classification

- Studio specs and synthetic fixtures are internal planning material.
- BBB's controlled publication is already recorded and its approved public routes are live. Owner payloads, private draft material, unpublished assets, new test traces, and any evidence beyond the approved public scope remain protected and require separate approval before use.
- GGM remains private and excluded from publication.
- No secrets, auth material, private URLs, visitor data, raw owner payloads, or hosted response bodies belong in screenshots/logs/docs.
- Test traces can contain page/network data. Retain only sanitized local traces; inspect before committing.

## Stop conditions

Stop the current implementation lane and escalate when:

- auth, tenancy, owner binding, public/private guards, production config, deployment, backend schema, public serializer, or publish behavior must change;
- V3 cannot remain default-off and pilot-scoped;
- Gate P0 or P1 requires a server write or preview POST;
- runtime M1 Save or server Visitor Preview is proposed before the separately approved atomic expected-existing-draft identity/revision/stable-fingerprint server contract passes;
- immutable config/draft ID or stable persisted-semantic fingerprint is unavailable/mismatched, `version` is being treated as sufficient authority, or fingerprint projection strips anything beyond transport-added `url`/`preview_expires_at` on valid private-draft media-ID objects in scene/asset/content;
- any of the nine top-level POST fields disappears under actual JSON serialization, or current refetch/POST/post-refetch is represented as atomic;
- the compiler-owned path allowlist is wildcard/implicit, or full replacement/deletion and non-owned retention cannot be proven;
- public output changes with the editor bridge absent;
- native BBB interception cannot block direct/window navigation, cancel and recheck pending focus, or return suppress-only for a no-ID CTA/link or unsupported chrome; first editor activation triggers visitor behavior; or undefined-bridge behavior changes;
- a private GGM or BBB artifact appears in an unapproved evidence path;
- required CTA/core Room/content-accounting invariants cannot be enforced;
- local state/provenance would load without a complete identity match or require heuristic title/URL matching;
- the requested feature requires unsupported media/model semantics;
- a runtime diff lacks rollback, test evidence, or independent review.

## Rollback hierarchy

1. Disable the V3 flag/pilot allow-list and return all rooms to their existing editor.
2. Remove V3 shell selection at the existing editor route; retain V2 renderer/draft/public paths unchanged.
3. Remove the optional editor bridge while preserving the renderer component’s prior public API/behavior.
4. Clear only the explicitly namespaced V3 local records for the affected full identity envelope; never broad-clear browser storage.
5. Revert the single scoped task/PR. Do not use production rollback or publish endpoints for prototype rollback.

Rollback cannot repair exposed private evidence. If exposure occurs, stop, remove the artifact from the review path, notify the human owner, and assess credential/URL rotation or repository-history remediation before continuing.

## Review cadence

- **Per task:** builder maps changed risks to tests/evidence and records remaining residual risk.
- **Gate P0:** independent renderer/activation, minimum Shelf placement, one-Look/lock/named-restore, local-envelope, and public-boundary review with zero writes before P1.
- **Gate P1:** independent style/local-identity review with zero writes before Milestone 1 planning.
- **Write characterization:** separate disposable local/test single-writer compiler/draft review records replacement and private-media effects but never exposes Save.
- **Milestone 1 local editing:** full no-merge review across compiler, public invariance, UX/mobile/accessibility, and privacy with Save/server Visitor Preview disabled.
- **Blocked M1 persistence:** separate approved backend work order and architecture/security review of the atomic expected-existing-draft identity/revision/stable-fingerprint transaction before any runtime Save/server Visitor Preview control exists.
- **Milestone 2:** separate builder and reviewer; human local review of radical difference; exact restore proof; no GGM-like screenshot capture.
- **Before any hosted or wider pilot:** new work order, read-only baseline first, explicit human approval, and updated risk register.
