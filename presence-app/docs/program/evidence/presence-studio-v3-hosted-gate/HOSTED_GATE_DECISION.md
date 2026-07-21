# Hosted gate decision

## Decision

Use explicit hosted-human-test gates instead of treating production or preview hosting as implicit permission to run Studio V3.

## Frontend decision

The owner editor route calls `getPresenceStudioV3GateDecision()` after `useOwnerNode()` has returned authenticated owner data.

V3 opens only when:

```text
NEXT_PUBLIC_PRESENCE_STUDIO_V3_HOSTED_HUMAN_TEST=1
NEXT_PUBLIC_PRESENCE_STUDIO_V3_ALLOWED_ROOMS=29,bbbvision
```

and the current Room matches both the allowlisted numeric ID and slug.

Production without the hosted-human-test flag remains V3-off. The existing local/test BBB pilot flag and browser-local opt-in remain available outside production.

## Backend decision

The V3 owner endpoints remain unavailable by default in production, preview, staging, and unknown environments.

They become available only when:

```text
PRESENCE_STUDIO_V3_BACKEND_ENABLED=true
PRESENCE_STUDIO_V3_BACKEND_HOSTED_HUMAN_TEST=true
PRESENCE_STUDIO_V3_BACKEND_PILOT_IDS=29
PRESENCE_STUDIO_V3_BACKEND_PILOT_SLUGS=bbbvision
```

and the current Room matches both allowed ID and slug. Hosted backend environments fail closed if either pilot IDs or pilot slugs are missing.

## Gate report

The owner editor emits a safe developer-readable console report containing only:

- enabled/disabled;
- source;
- reason;
- room ID;
- room slug;
- `NODE_ENV`.

It does not log tokens, session subject, owner ID, email, private state, or config payloads.

## Public route boundary

The V3 shell remains imported only by the owner editor page. Public BBB routes use the public renderer path and never receive V3 editor controls.
