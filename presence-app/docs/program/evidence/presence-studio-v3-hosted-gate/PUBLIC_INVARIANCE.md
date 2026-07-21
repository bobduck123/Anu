# Public invariance

## Claim

The hosted V3 gate changes only owner-editor selection and backend owner V3 endpoint availability. It does not change public routes or public renderer behavior.

## Public routes in scope

```text
/p/bbbvision
/presence/bbbvision
```

## Expected behavior

- Public BBB routes load without `PresenceStudioV3Shell`.
- Public BBB routes do not expose Studio V3 controls.
- Public BBB routes do not receive owner-private V3 state.
- Public BBB routes do not require the hosted V3 env flags.
- No permanent `/editor-v3` route exists.

## Evidence

Focused evidence:

- `presence-studio-v3-public-invariance.spec.ts`: PASS - 2/2 on clean rerun.
- `presence-studio-v2-bbbvision-gallery-parity.spec.ts` plus `presence-studio-v2-bbbvision-eligibility.spec.ts`: PASS - 14/14.
- `npm.cmd run build`: PASS and lists no `/editor-v3` route.

No public route registration or public renderer file was changed by this pass.
