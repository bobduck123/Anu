# PROOF_LIBRARY.md - Existing Delivery, Case Studies, and Migration Queue

## Proof inventory table

| ID | Project / Presence | Type | Public status | Permission status | Migration status | Required next proof | Current risk | Next action | Launch archetype / offer |
|---|---|---|---|---|---|---|---|---|---|
| P001 | GGM | Artist / private working proof | Backend and hosted frontend contained; not public launch material | Private proof only; no public case study or screenshots | Local Room 11-shaped Studio fixture proved; not system-native proof | Hosted owner access restoration and owner-bound Studio proof | Direct bundled asset URLs remain public and the external mock-up is separately controlled; fixture proof and containment do not prove migration | Review `GGM_VISIBILITY_CONTAINMENT_PLAN.md`, then complete the separately scoped hosted owner diagnostic | Artist Presence / Presence Lite |
| P002 | BBB Vision | Artist/visual or cultural/client project | Eventual publication approved; not yet public Presence proof | Publication approval confirmed; system-native migration remains unproven | Intake/source map required | Source-to-Presence field map and system-native private/staging proof | A static mock, style preset, or screenshot is insufficient to claim Presence migration | BBB migration intake/content-source map after the cleanup boundary | Artist Presence or Cultural/Community Presence / Presence Lite or Presence Pro |
| P003 | Generic demo profiles | Demo fixtures | Demo/fallback only | Not client proof | Not proof | Replace or clearly label with persisted backend rooms | Demos can make the product look more complete than it is | Defer broad fallback policy until a truthful persisted replacement exists | Demo fixture only; no commercial proof claim |

## Evaluation rubric

Score each existing proof item out of 10:

```text
Identity clarity:
Visual memorability:
Story depth:
Cultural specificity:
Mobile quality:
Reusable archetype:
Public showability:
Migration ease:
Revenue relevance:
```

## Migration status

```text
Not reviewed
Reviewed
Needs permission
Ready to migrate
Migration planned
In migration
Migrated
QA complete
Case study drafted
Published proof
```

## Case study template

```markdown
# Case Study: <Project>

## Before

What existed before.

## Problem

What was weak, missing, unclear, or under-signalled.

## What we built

Describe the presence.

## Why it works

Identity, story, design, conversion, memory, trust.

## Screenshots

- Hero:
- Mobile:
- Detail section:
- Archive/media:

## Reusable archetype

What template/component pattern this becomes.

## Commercial relevance

Which offer this supports:
- Presence Audit
- Presence Lite
- Presence Pro
- Cultural Org Presence
- Funding Readiness
- AI/Data Ops

## Permission / sensitivity

What can be shown publicly.

## Next action

...
```

## Proof rules

- Do not invent metrics or imply endorsement without permission.
- Do not expose private client, account, credential, or stakeholder data.
- GGM remains private working proof and must not be published or treated as public launch material.
- GGM public containment is hosted-verified: the contained record is absent from the backend gallery and anonymous GGM frontend routes return truthful not-found responses without fallback content. This does not prove owner-bound Studio migration, persistence, or launch readiness.
- GGM's local Studio evidence uses a controlled Room 11-shaped mock fixture. It proves private draft edit/autosave/reload/preview behavior and that GGM-specific publish/share affordances are unavailable; it is not evidence about the real hosted owner, credentials, backend record, or media access.
- BBB approval permits a future publication task; it does not prove migration, readiness, deployment, or publication.
- A frontend fallback or visual copy does not count as a system-native migration.
- Public proof must distinguish persisted backend rooms from demo or fallback content.
- System-native proof requires backend persistence, owner scope, draft save/reload, authenticated preview, and correct public/private visibility.
- Demo fixtures have no commercial proof value unless separately persisted and verified.
