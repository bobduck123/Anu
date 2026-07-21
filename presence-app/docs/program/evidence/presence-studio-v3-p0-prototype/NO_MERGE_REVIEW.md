VERDICT: MERGE

# No-Merge Review

Status: independent review passed after atomic snapshot, trusted-session lifecycle, cross-tab lock, and auth-epoch hardening.

Previous independent review result:

- `VERDICT: NO MERGE`.
- No backend, auth, tenant, control-plane, production deploy, public-route, permanent `/editor-v3`, server-write, GGM, or secret expansion found.
- Blocking issues were bridge invariance/interception, BBB destination navigation, local restore, hidden/unavailable placement leakage, insufficient tests/evidence, anonymous public fixture owner leak, mobile/Test-as-visitor state, and hard-coded named Look creation.

Bounded fixes now applied:

1. Undefined-bridge behavior is restored: Space activation and touch activation are scoped to explicit V3 editor bridge presence.
2. Generic public CTAs, wayfinding anchors, reference links, linked object cards, and nested `View work` controls intercept at capture phase when an editor bridge is present.
3. BBB bridge navigation emits concrete destination chamber IDs, suppresses unresolved chrome, and does not mutate visitor view/hash/history state in bridge-present mode.
4. Browser-local presence/room envelopes are restored after exact schema, owner partition, immutable base identity, and fingerprint validation; memory-only base snapshots do not restore/write localStorage.
5. Hidden/unavailable Pieces are shelved and excluded from public-shaped compiled output; direct duplicates are marked duplicate.
6. Unit and E2E coverage now includes hidden/unavailable/incompatible/duplicate placement, strict local envelope validation, local restore, Test-as-visitor chrome removal/return, anonymous public fixture privacy, broad unexpected-write ledger checks, generic bridge pointer/Enter/Space/Escape, direct Room navigation, and V2 BBB public renderer regression.
7. BBB anonymous public mock fixture no longer includes `owner_user_id`.
8. Named Look save uses owner-entered text.
9. Narrow mobile Home/topbar spacing and named-Look input contrast were corrected; bottom sheet now opens as a focused dialog.
10. Global Playwright V3 env opt-in was removed; Studio V3 specs opt in with browser localStorage, preserving V2 editor eligibility coverage.
11. Metadata-less BBB gallery fallback is scoped to bridge-present editor mode so undefined-bridge public gallery membership remains unchanged.
12. Reduced-motion touchmove preserves the undefined-bridge early return and records drag displacement only when an editor bridge is present.
13. Owner partition is derived only from the existing trusted Supabase browser-session subject and is SHA-256 hashed with deployment scope before storage; it never uses resource/node/Room ownership or the access token.
14. Malformed local envelopes are rejected as whole records, invalid exact keys are removed on restore, and CSS URL-bearing values including `image-set(...)` are rejected.
15. Bottom-sheet Escape stops propagation before closing so renderer/global selection handlers do not clear the selected Piece under the opener.
16. Action bar now includes the P0 `More` action, and the Shelf visibly retains placement rows with status/reason for placed, duplicate, incompatible, and shelved Pieces.
17. Storage cleanup failures fall back to memory-only state instead of fatal Studio errors, and stale async loads cannot prune after unmount/account switch.
18. Same-owner stale base keys for the active Presence are pruned while current-owner keys for other Presences are preserved.
19. Local persistence writes one immutable candidate generation containing the Presence and every Room envelope, validates it, then atomically promotes an active/previous manifest. Restore reads only a complete manifest generation and falls back to the previous complete generation; incomplete, missing, malformed, stale, or cross-partition candidates are quarantined and never partially applied.
20. Local envelopes reject extra copied fields, cross-room placements/locks, non-envelope lock scopes, built-in-ID named Looks, extra base identity fields, arbitrary lock payloads, broader URL-like strings, and unsafe provenance; compiler entry points also reject unsafe lock values and sanitize unsafe named Look names.
21. Existing Supabase auth-state events clear the previous hashed partition before account reload, clear in-memory V3 state on sign-out, and disable local persistence if cleanup/storage confirmation fails.
22. Auth events invalidate any in-flight V3 editor load before cleanup; stale loads cannot restore or persist a previous subject's state after sign-out or account switch.
23. Snapshot retention is bounded to the active and previous complete generations. A failed promotion removes/quarantines its candidate, and a previous-good recovery repairs the manifest before a subsequent write, so it cannot orphan the recovered generation.
24. The last derived hashed partition remains available for logout/account-switch cleanup even if local persistence has already disabled itself; pre-hydration auth events invalidate pending loads and fail closed to memory-only mode.
25. BBB pointer/touch coordinates are normalized against the canvas bounding rectangle, preserving correct hit testing under the mobile V3 topbar offset.
26. `useOwnerNode` now passes the access token and raw session subject from the same trusted session read; a shell initial-session mismatch invalidates the pending load before local restoration. The raw subject remains memory-only and is hashed before storage.
27. Browser-local snapshot cleanup, restore/repair, pruning, and writes require one exclusive opaque owner-scoped browser Web Lock. If that lock or recovery-manifest confirmation is unavailable, the shell disables local persistence before touching local state and continues memory-only.

Current no-merge blockers requiring scope decision or larger redesign:

- The review cycle found stale async-load, cleanup-failure reload, generation-retention, manifest-repair, failed-promotion cleanup, mobile canvas-hit-test, token/subject coherence, and cross-tab ordering issues. They are fixed with unit and browser coverage.

Local checklist:

- No production deploy, merge, or push performed.
- No backend/auth/tenant/payment/donor/member-data files changed.
- No public route files changed.
- No runtime Save Draft or server Visitor Preview enabled.
- Independent review returned `VERDICT: MERGE`; local commit is authorized. No push or deploy is authorized by this work order.

Required follow-up:

- Keep runtime Save/Visitor Preview disabled until the separately approved server contract exists.
