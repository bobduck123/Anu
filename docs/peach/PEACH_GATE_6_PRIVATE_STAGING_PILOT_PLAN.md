# PEACH Gate 6 Private Staging Pilot Plan

Status: ready for private staging rehearsal

## Participants

Allowed:

- trusted adults;
- invited contributors;
- assigned steward;
- test supporters;
- witnesses reviewing clarity.

Not allowed:

- youth or children;
- public visitors;
- anonymous internet traffic;
- sensitive testimony contributors;
- payment testers using real money.

Recommended count: 5 to 12.

## Staging URL Handling

Use localhost or a private staging URL shared only with invited participants. Do not index it, advertise it, or imply public launch.

## Participant Script

Read Field 001 and submit one non-sensitive contribution. Do not submit youth/child material, trauma testimony, legal/medical details, private third-party information, uploads, or anything needing professional support.

## Steward Script

Log in, review pending contributions, inspect ConsentRecord fields, change one review status, verify audit log entry, and confirm public pages do not display contribution bodies.

## Support-Intent Script

Choose membership, one-off support, sponsor access, sponsor Field, or sponsor Yield. Confirm the page states no payment is taken.

## Consent Operation Test

Submit one export or withdrawal request at `/consent/request`. Steward confirms it appears as `pending_steward_review`.

## Evidence To Collect

- Build/typecheck output.
- DB setup output.
- Route status checks.
- Contribution and ConsentRecord ids.
- Steward auth block proof.
- Steward review status change proof.
- Audit log proof.
- Support intent proof with `paymentTaken: false`.
- Consent operation request proof.
- Rate-limit proof.
- Public non-display proof.

## Reset/Rollback

Stop the server, back up or remove `C:\Dev\PEACH\peach-gate6.db`, then rerun:

```powershell
$env:DATABASE_URL="file:C:/Dev/PEACH/peach-gate6.db"
npm.cmd run db:prepare
```

## Go/No-Go

Go if durable records, auth, review, audit, consent request, support intent, rate-limit, and public non-display checks pass.

No-go if contribution bodies appear publicly, sensitive/youth material is collected, payment is implied, audit logs are absent, auth is bypassed, or dependency/security blockers are ignored.

## Boundary

No public launch. No public contribution display. No real payments. No youth/child collection. No highly sensitive testimony.
