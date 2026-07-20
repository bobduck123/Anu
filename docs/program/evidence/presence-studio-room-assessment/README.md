# Presence Studio Room Assessment

Date: 2026-05-28
Scope: preview-only assessment of existing local generated/demo/sample room sources against the Studio Room adapter and renderer.

## Summary

This pass expands the Studio Room adapter beyond generic render-model widgets. Existing public-safe commercial and identity content now maps into first-class semantic chambers and objects:

- contact methods,
- services,
- proof/testimonials,
- portal links,
- credentials.

Media embeds remain intentionally deferred until the embed pipeline is stable.

No public routes were changed. Studio Room remains preview-only/internal/dev-gated.

## Sources Assessed

The repo exposes 8 concrete local room fixtures without hosted data:

- 7 demo profile rooms from `presence-app/lib/presence/demo/profiles.ts`
- 1 Presence graph fixture room from `presence-app/tests/fixtures/presenceGraph.json`

All 8 were assessed.

## Before / After Gap Counts

| Semantic area | Before present-but-unmapped | After mapped | After present-but-unmapped | Source absent | Deferred |
| --- | ---: | ---: | ---: | ---: | ---: |
| Contact methods | 7 | 7 | 1 | 0 | 0 |
| Services | 6 | 7 | 0 | 1 | 0 |
| Proof / testimonials | 6 | 7 | 0 | 1 | 0 |
| Links / portal cards | 5 | 4 | 1 | 3 | 0 |
| Credentials | 3 | 3 | 0 | 5 | 0 |
| Media embeds | 1 | 0 | 0 | 7 | 1 |

The remaining contact/link unmapped case is the graph fixture. Its URLs point at localhost, `/studio`, or test/control-plane-style paths, so the adapter blocks them rather than rendering unsafe links.

## Current Aggregate

- Rooms assessed: 8
- Payload hygiene: 8 pass, 0 fail
- Rooms with CTA after adaptation: 8
- Rooms with media after adaptation: 8
- Rooms with focal point: 0
- Validation issues: 0 across adapted rooms
- Public route wiring changed: no
- Hosted/runtime AI additions: no

## Updated Room Coverage

| Room | Studio chambers / objects | Semantic coverage | Remaining gap |
| --- | ---: | --- | --- |
| Mira K. | 6 / 18 | contact, links | media embeds deferred |
| Naoko Sato | 8 / 20 | contact, services, proof, links | none |
| Salt & Grain Studio | 7 / 21 | contact, services, proof | none |
| Dave Carpentry - Bega Valley | 8 / 25 | contact, services, proof, credentials | none |
| Mara Lin | 8 / 22 | contact, services, proof, credentials | none |
| Heron Strategy | 8 / 22 | contact, services, proof, links | none |
| Christina Kerkvliet Goddard | 8 / 21 | contact, services, proof, links | none |
| Mara Vale Test Room | 7 / 17 | services, proof, credentials | unsafe contact/link URLs blocked |

## Public Safety

The adapter only maps public-safe fields. It does not map owner/admin/staff emails, enquiry email, hidden services, hidden links, private credentials, localhost URLs, internal route paths, file URLs, unsafe data URLs, or control-plane links.

Sanitised Studio Room payloads continue to strip editor-only/internal metadata before renderer use.

## Template-Kit Candidates

Strong candidates:

- Naoko Sato: artist/gallery kit.
- Salt & Grain Studio: maker/craft kit.
- Dave Carpentry: local service/trades kit.
- Mara Lin: practitioner kit.
- Heron Strategy: consultant kit.
- Mara Vale Test Room: graph-backed compatibility fixture.

Candidate:

- Christina Kerkvliet Goddard: cultural-community artist / practice archive kit candidate.
- Mira K.: performer/nightlife kit, pending embed strategy.

## Tests Added / Updated

- `presence-app/lib/presence/studio-room/studioRoomSemanticAdapter.test.ts`
- `presence-app/lib/presence/studio-room/studioRoomAssessment.test.ts`

The tests cover semantic mapping, private/internal contact exclusion, URL blocking, renderer handling for new object roles, assessment coverage counts, public payload sanitisation, and production-closed preview gating.

## Results File

Structured output is in:

`docs/program/evidence/presence-studio-room-assessment/results.json`

## Recommendation

Next pass should extract a GGM Cultural-Community Artist TemplateKit from the now-differentiated GGM room, while keeping media embeds deferred until the embed policy is explicit.
