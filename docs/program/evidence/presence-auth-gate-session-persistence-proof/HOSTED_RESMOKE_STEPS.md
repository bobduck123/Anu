# Hosted Re-Smoke Steps

Run after deployment at `https://your-presence.vercel.app` using room `11`.

## Session and Route Gate

1. Open a fresh incognito browser context.
2. Log in as the assigned owner exactly once.
3. Open `/studio/11/editor`.
4. Confirm Canvas renders without `?debug=1` and no owner access gate appears.
5. Hard refresh that route.
6. Confirm Canvas still renders.
7. Open `/studio/11/editor?debug=1`.
8. Confirm the same Canvas appears plus diagnostics.
9. Confirm diagnostics state `Debug mode: display-only`, `Auth provider: session ready`, and the expected frontend/backend hosts.
10. Open `/studio/11/editor/preview`.
11. Confirm the private draft preview renders and is labelled not public.
12. Confirm `noindex` is present.

## Anonymous Boundary

1. In a separate anonymous context, open `/studio/11/editor`.
2. Confirm denial and no Room data.
3. Open `/studio/11/editor?debug=1`.
4. Confirm denial and no diagnostics panel.
5. Open `/studio/11/editor/preview`.
6. Confirm denial and no draft content.

## Preserved Lifecycle

1. As owner, save a unique draft marker: `AUTH GATE HOSTED TEST [timestamp]`.
2. Confirm anonymous `/presence/ggm-christina-goddard` does not show the marker before publish.
3. Confirm owner preview shows the marker.
4. Confirm readiness permits opening the visible valid room.
5. Click `Open room to visitors`, observe the confirmation, and confirm.
6. Confirm the anonymous public room now shows the marker.
7. Open `/room/11/key` and confirm it remains safe and published-only.
8. Restore the original public title/copy through a saved draft and explicit publish.
9. Confirm the marker is absent publicly after cleanup.
