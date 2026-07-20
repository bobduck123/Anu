# PROOF_LIBRARY.md — Existing Delivery, Case Studies, and Migration Queue

## Purpose

This file prevents existing work from being lost. It converts delivered fragments into proof, templates, case studies, and revenue assets.

## Proof inventory table

| ID | Project / Presence | Type | Public status | Permission status | Migration status | Required next proof | Current risk | Next action | Launch archetype / offer |
|---|---|---|---|---|---|---|---|---|---|
| P001 | GGM | Artist / private working proof | Visibility-risk blocked: a GGM-like backend record is public-gallery listed; GGM must remain private | Private proof only; public screenshots and case study are not approved | Not system-native yet | Backend containment, owner-access restoration, frontend fallback handling, then owner-bound Studio private draft | A frontend fallback or visual copy must not be treated as real migration evidence; backend containment alone does not remove the GGM-specific frontend fallback | [GGM containment plan](./GGM_VISIBILITY_CONTAINMENT_PLAN.md), then a separately approved containment operation and GET-only owner diagnostic | Artist Presence / Presence Lite |
| P002 | BBB Vision | Artist/visual project or cultural/client project | Approved for eventual publication; not yet public Presence proof | Eventual publish approved; system-native migration remains unproven | Intake/source map required | Source-to-Presence field map and system-native private/staging proof | A static mock, style preset, or screenshot is insufficient to claim Presence migration | BBB migration intake/content-source map after the cleanup boundary | Artist Presence or Cultural/Community Presence / Presence Lite or Presence Pro |
| P003 | Generic demo profiles | Demo fixtures | Demo/fallback only | Not client proof | Not proof | Replace or clearly label with persisted backend rooms | Demos can make the product look more complete than it is | Defer production fallback policy until a truthful persisted replacement exists | Demo fixture only; no commercial offer claim |

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

## Screenshot checklist

For approved public proof items, capture:

- desktop hero;
- mobile hero;
- key section;
- media/gallery;
- CTA/footer;
- before/after if available.

Private proof must not include screenshots in this library or any public-facing proof pack. Keep private review material out of this repository unless a separately scoped, privacy-reviewed task explicitly permits it.

## Proof rules

- Do not invent metrics.
- Do not imply endorsement without permission.
- Do not expose private client/stakeholder details.
- Anonymise sensitive work when needed.
- Every screenshot should have a purpose.
- Every case study should point to an offer.
- GGM remains private working proof and must not be published or treated as public launch material.
- BBB approval permits a future publication task; it does not prove migration, readiness, deployment, or publication.
- A frontend fallback or visual copy does not count as a system-native migration.
- Public proof must distinguish persisted backend rooms from demo or fallback content.
- A route rendering visually is not enough proof.
- System-native proof requires backend persistence, owner scope, draft save/reload, authenticated preview, and correct public/private visibility.
- Private proof must not include screenshots, private URLs, account IDs, auth subjects, or client-private material.
- Every proof item must map to a commercial offer or launch archetype; demo fixtures must be marked as having no commercial proof value.
