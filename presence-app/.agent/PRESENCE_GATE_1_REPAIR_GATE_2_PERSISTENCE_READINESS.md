# Presence Gate 1 Repair / Gate 2 Persistence-Readiness

Date: 2026-07-27
Target app: `C:\Dev\Flora_fauna\presence-app`
Backend inspected: `C:\Dev\Flora_fauna\flora-fauna\backend`

## Boundary

This is a local-only auth/backend save investigation. It is not Gate 1 acceptance, not a launch route, not a publish route, and not production persistence approval.

## Findings

- Local app auth was blocked because `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` were present but empty in `.env.local`.
- Superseded on 2026-07-28: browser-readable `NEXT_PUBLIC_E2E_AUTH_TOKEN` support was removed from the normal client auth path. Local E2E proofs now inject the owner token at Playwright runtime from non-public process env only.
- The real local backend and local Postgres contract database boot successfully for room `1` / slug `presence-contract-room`.
- Owner node reads initially failed with Postgres JSON grouping error in analytics summary. Backend owner reads now return `200`.
- Existing editor draft save was verified through the browser: a title edit triggered `PATCH /api/presence/owner/rooms/1/editor/draft`, persisted as draft revision `3`, then the visible title was restored to `Presence Contract Room`.
- V3 private-state API was verified through the owner-only backend path before the browser pass: `PUT /api/presence/owner/rooms/1/editor/v3/state` persisted metadata revision `1`.
- The V3 frontend gate was not opening locally because the browser bundle read public env vars through dynamic keys. The gate now reads direct `NEXT_PUBLIC_*` names.
- After the V2 draft write, the V3 shell correctly detected a stale private-state base and disabled `Save private state`.
- The backend rejects silent V3 rebase with `studio_v3_state_conflict` / `stored_base.revision`; this is the correct safe posture.

## Evidence

- Local backend: `http://127.0.0.1:5000`
- Local frontend: `http://localhost:3000/studio/1/editor`
- Browser-visible auth flow: sign-in opens, redirects to editor, and uses the local owner backend token.
- Backend logs observed:
  - `GET /api/presence/owner/nodes/1` -> `200`
  - `GET /api/presence/owner/rooms/1/editor` -> `200`
  - `PATCH /api/presence/owner/rooms/1/editor/draft` -> `200`
  - `GET /api/presence/owner/rooms/1/editor/v3/state` -> `200`
- Draft readback after restore:
  - draft id `1`
  - status `draft`
  - revision `3`
  - `scene_config.scenes[0].title` = `Presence Contract Room`

## Readiness Gap

At investigation time, Gate 2 needed an explicit reviewed V3 base rebase or clear-state path before browser private-state save could continue after the underlying draft base changed. The current stale-base guard prevented unsafe overwrite, and the later accepted Gate 1 repair added only a local/dev clear-state recovery, not final persistence architecture.

## Next Slice

Design and implement a local-only reviewed V3 stale-base recovery flow:

- show old base versus current base;
- preserve existing private metadata;
- require explicit owner action to rebase or clear;
- keep visitor/public output unchanged;
- cover backend conflict tests and browser recovery proof.

## 2026-07-27 Repair Update

- Added owner-only `DELETE /api/presence/owner/rooms/:roomId/editor/v3/state` to clear only room-scoped owner-private V3 metadata.
- Wired the conflict action label from `Reload latest` to `Clear stale private state`; the UI now tells the owner that clearing does not publish or change the visitor site.
- Confirmed the backend still rejects silent stale-base rebase.
- Confirmed after clear/reload the editor exits conflict, enables `Save private state`, and a browser save reaches `Saved privately`.
- Kept server visitor preview disabled as `Server preview deferred`.
- Added explicit UI notices for local room `1`: no canonical owner Works are loaded; renderer-backed Room-native base material is being shown; ancestor style inheritance is not implemented in this repair slice.
- Evidence packet: `docs/program/evidence/presence-gate1-repair-gate2-readiness-20260727/README.md`.

Recommendation: Accepted after fixes. Human smoke later confirmed the clear-button click path in the local browser; remaining canonical Works migration, style inheritance, publish, and final rebase UX are Gate 2+ scope.
