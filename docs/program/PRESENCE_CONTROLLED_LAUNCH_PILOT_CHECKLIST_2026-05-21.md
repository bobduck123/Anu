# Presence Controlled Launch Pilot Checklist

Date: 2026-05-21
Updated: 2026-05-22
Mode: selected paid pilots, supervised onboarding, small Presence Room set

## Pilot Posture

- World remains hidden/forming.
- V2/design-lab surfaces remain preview/prototype only.
- Halls are flat V1 zones and sessions. Do not promise realtime spatial presence.
- Observer Masks remain personal/social surfaces. Commercial publishing belongs in a Presence Room.
- Launch smoke fixtures are tagged and are not client records.

## Before A Pilot Starts

| Item | Status | Operator action |
|---|---|---|
| Manual intake path | Ready | Use the hosted public Studio/onboarding path or collect the same intake manually for a supervised pilot. |
| Owner account creation | Ready | Confirm the owner can reach hosted Studio sign-in/sign-up before the onboarding call. |
| Presence Room creation | Ready | Create or review one Room with the owner before sharing its public slug. |
| RoomKey NFC/QR test | Ready | Resolve one tagged test RoomKey/QR path before handing a pilot key to a client. |
| Enquiry/contact path | Controlled | Confirm enquiry routing for the selected Room before enabling it; otherwise state it is not active for that pilot. |
| Owner analytics | Ready | Show the owner Studio analytics surface during onboarding and verify the Room/Hall scope. |
| Hall creation posture | Ready with scope | Use Halls only for supervised pilot fixtures and archive smoke drafts after proof. |
| Observer Mask onboarding | Ready | Verify one Observer can enter Garden/Mask flow without turning it into a business profile. |
| Support process | Ready | Assign a named operator, response channel, and expected response window per pilot. |
| Rollback/disable process | Ready | Use the containment steps below. |
| Incident note | Ready | Use the template below. |
| Known limitations | Ready | Read the limitations below during internal handoff. |
| Pilot package/pricing note | Required per pilot | Record the agreed package, price, included Room/Hall scope, and support owner before charging. |
| First 5 to 10 candidates | Tracking placeholder | Keep a private operator list with candidate, owner, Room slug, onboarding date, and stop condition. |
| No V2 promises | Ready | Keep World and design-lab language preview/forming only. |

## Supervised Onboarding Path

1. Confirm the pilot package note, owner, support contact, and operator.
2. Verify the owner can use hosted Presence auth and Studio.
3. Create or review the pilot Presence Room and public Room slug.
4. Test one public Room entry and one RoomKey/NFC/QR resolve path on phone width.
5. Decide whether enquiry/contact routing is active for that Room. If not, state the disabled path in the pilot note.
6. If the pilot needs a Hall, create only the scoped Hall needed for the pilot and confirm private/public visibility.
7. Verify analytics visibility with the owner.
8. Record launch time, Room/Hall IDs, rollback owner, and support channel.

## Known Limitations

- Controlled launch is not broad self-serve growth.
- World is not public and is not a live map.
- Design-lab V2 Halls/World previews are prototypes, not live multiplayer.
- Halls must not be presented as realtime or spatial multiplayer when the active V1 flow is not that.
- Firefox and WebKit hosted smoke should be added when local Playwright browsers or device coverage are available.
- Monitoring beyond provider logs remains a minimal follow-up if Sentry or an equivalent production error sink is not enabled.

## Rollback And Disable

1. Stop new pilot intake and pause supervised onboarding.
2. Revoke or disable affected RoomKeys/NFC/QR entry paths.
3. Hide or archive affected Room, Hall, Garden, or fixture surfaces with scoped owner/control access.
4. Revert frontend deployment first for UI regressions; revert backend deployment for backend behavior only when DB compatibility is confirmed.
5. For migration/data risk, use the recorded provider backup/restore or point-in-time recovery plan. Do not destructive-reset hosted Postgres.
6. Record the incident, request IDs, deployment IDs, affected pilot, data/privacy check, and follow-up owner.

## Incident Note

```text
Incident date/time UTC:
Pilot / Room / Hall:
Reporter:
Observed route, request id, deployment id:
Impact:
Data/privacy exposure check:
Immediate containment:
Rollback or disable action:
Owner:
Follow-up:
```

## Pilot Candidate Placeholder

| Candidate | Owner | Package/pricing note | Room slug | Hall scope | Onboarding date | Support owner | Stop condition |
|---|---|---|---|---|---|---|---|
| Pilot 01 | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| Pilot 02 | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| Pilot 03 | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| Pilot 04 | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| Pilot 05 | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
