# Studio V3 M1 test matrix

Status: scoped publish-free gate passes; partial/deferred normative rows remain explicit

Statuses below describe the implemented coverage breadth exercised by the final scoped gate. `PARTIAL`, `DEFERRED`, and `NOT RUN` remain limits even where all selected commands pass.

| Area | Required coverage | Mapped evidence | Scope status |
|---|---|---|---|
| Copy editing | Immediate supported-field compilation, exact cancel, private persistence/reload | Compiler/API tests; canonical V3 desktop flow with fresh-context durable reload | PASS |
| Existing media selection | Stable authorized source ref only; no raw URL/blob; immediate canvas result | Compiler/state validation; image-replacement browser flow | PASS |
| Placement/reorder | Earlier/later, feature, hide/show/unplace, registered zones, invalid-token rejection, legacy placement-level hidden recovery | Compiler tests; desktop drag/tap/keyboard flow; metadata save/reload regression | PASS |
| Per-Piece appearance | Registered stepped size and zone-supported treatment | Compiler and desktop arrange flow | PASS |
| Direct manipulation | Selected-Piece drop to registered zone cards, custom Studio drag provenance, invalid-drop no-op, keyboard/tap/mobile alternatives, exact cancel; no freeform nearest-zone snap/clamp | Canonical desktop and mobile Chromium specs | PARTIAL - bounded zone-card flow implemented; freeform canvas behavior is outside M1 |
| Visual tokens | Background, treatment, typography/CTA, motion, locks, reduced motion | Compiler/state tests; visual-controls and mobile specs | PASS |
| Room Styles | Three visibly different structures, preview before Apply, exact Cancel, accepted state, cross-layout arrangement reconciliation | Visual-control and Arrange → Apply → Save → fresh-hydration browser flows; screenshots 7-8 | PASS |
| Library truthfulness | All loaded BBB Pieces, canonical Collections, no duplicate source, inspect/place/unplace | Library browser flow; compiler fixtures; screenshots 9-10 | PASS |
| Upload/Create boundary | Protected private inventory upload; stable media ID; canonical Create Work honestly disabled | Backend upload/public-exclusion tests; canonical upload browser flow; request ledger; screenshot 11 | PASS |
| Save feedback | Saving, success, failure, conflict, memory-only, disabled, retry/reload, unpublished wording | API tests; save-state browser flow; screenshots 12-13 | PASS |
| Private metadata safety | Bounds/types, stable refs, URL/blob/token/code rejection, ownership/cross-Room rejection | 45/45 frontend compiler/API tests; focused backend 35 passed/1 publish-source test deselected; context-aware mock boundary test | PASS |
| Editor bridge | Selection/drag cannot fire visitor action | Canonical V3 desktop flow and zero-write request ledger | PASS |
| Mobile/accessibility | 44px Chromium targets, focus, keyboard/tap, labels, Escape, reduced motion, no overflow at 390x844 | Two 390x844 mobile Chromium scenarios; screenshots 14-15 | PARTIAL - wider prescribed matrix and screen reader not run |
| Public invariance | Both BBB routes, payload/adapters, eligibility and named public-Enter behavior unchanged without a publish fixture | Canonical V3 public specs; 3/3 publish-free eligibility/payload specs; 1/1 named publish-free gallery public-Enter test; 27/27 public unit tests; screenshots 16-18 | PASS |
| Production integrity | Type and bundle integrity | `npm.cmd run typecheck`; `npm.cmd run build` | PASS |
| Crop/focal | Honest disabled state; no persistence/renderer contract exists | Piece editor UI and traceability | DEFERRED |
| Advanced Creative | Honest disabled state; no fake depth/transform controls | Home mode UI and traceability | DEFERRED |
| Canonical Library mutation | Create/edit/delete/membership/reorder do not use presentation overrides | Disabled UI, request ledger, follow-up contract | DEFERRED |
| Moderated comprehension/creative review | Requires human observation outside automated code evidence | `MANUAL_QA.md` | NOT RUN |

Exact commands, counts, warnings, and working directories are recorded in `VALIDATION_RECORD.md`. Per-ID status is in `ACCEPTANCE_TRACEABILITY.md`.
