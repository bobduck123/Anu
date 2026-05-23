# GGM Hosted Cutover GO / NO-GO

Date: 2026-05-23

## Decision

`NO-GO` for supervised GGM first pilot launch at the end of this pass.

## Gates passed

- Hosted GGM Room `11` carries explicit `ggm-faithful-room-v1` metadata.
- Hosted frontend production alias renders the faithful GGM public Room.
- Hosted GGM work detail and gallery first-pilot card render.
- Real hosted GGM RoomKey resolves into the faithful Room on desktop and
  mobile and increments owner aggregate analytics.
- Invalid and revoked RoomKeys fail safely.
- Hosted current-owner API proof covers Studio node, analytics, and RoomKey
  owner endpoints.
- Public GGM response redacts email, admin role, lifetime entitlement, local
  paths, and the internal pilot admin provisioning block.
- Non-GGM Room regression and World forming checks pass.
- Enquiry capture-only posture is explicit and safe enquiry capture passes.

## Blockers

1. Run a clean hosted browser owner-auth proof for `e4hatu@gmail.com` through
   Studio, analytics, passes, public Room, return-to-Studio, and logout.
2. Complete owner/operator visual sign-off using the hosted screenshot pack and
   real hosted RoomKey route.
3. Commit and push the local backend redaction, smoke-helper, evidence, and
   mobile RoomKey spacing hotfix so future Git-triggered deploys preserve this
   production state.

## Launch-start path after blockers

1. Complete the owner browser proof and update `OWNER_AUTH_SMOKE.md`.
2. Tick the sign-off pack and record the reviewer/date.
3. Commit/push the cutover patches, let Vercel deploy the committed tree, and
   re-run the hosted first-pilot Playwright suite plus RoomKey smoke.
4. Share only the canonical public Room and redacted RoomKey asset with the
   supervised first pilot operator.
