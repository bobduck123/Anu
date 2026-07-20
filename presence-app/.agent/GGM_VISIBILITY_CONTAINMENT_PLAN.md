# GGM Visibility Containment Plan

## Current status - 2026-07-20

- GGM remains private working proof. It is not launch material.
- The intended backend candidate was manually contained in the controlled database.
- The candidate now has draft/private/private publication state.
- Anonymous backend-gallery pagination no longer returns the candidate.
- The frontend containment patch was deployed to the active Presence production alias on 2026-07-20.
- Hosted no-cache verification passed twice per applicable public route. The production alias serves the containment patch.
- Owner-bound Studio proof is still outstanding.

## Completed containment layers

### Backend database containment

The approved one-record database operation changed only the candidate visibility state. It did not change ownership, tenant scope, slug, content, media, renderer, publication history, enquiries, or analytics.

The anonymous backend gallery was checked after containment, including its available pagination. The candidate was absent. No public-detail endpoint was used because that route can create analytics state.

### Frontend public containment

The local patch uses `lib/presence/publicContainment.ts` as the single policy for publicly contained slugs.

- The contained GGM slug cannot use an anonymous demo-profile fallback after a backend public read misses.
- `/p/[slug]` and the `/presence/[slug]` alias therefore resolve through the existing truthful not-found path when the backend does not return a public GGM node.
- GGM work-detail metadata cannot fall back to fixture content for the contained slug.
- The gallery no longer synthesizes, decorates, labels, or links a GGM card when the backend gallery excludes it.
- The GGM faithful renderer suppresses external public-demo references for the contained slug.
- Other demo profiles retain their existing fallback behaviour.

This policy does not change backend visibility, authentication, tenant scope, owner access, Studio source data, persistence, or deployment configuration.

## Source and asset decision

GGM source code and artistic assets remain in the repository for private migration reference. The bundled `/public/ggm/**` files appear to be already-public artistic material used by existing reference and migration surfaces; this patch does not reclassify them as private media or move them.

Anonymous Presence routes and gallery links are contained, but direct asset paths remain publicly served. Media hardening is a separate task after owner-bound Studio access and a truthful persisted media path are available. Do not delete or move these assets merely to force superficial 404 responses.

The separate external mock-up deployment is also outside this repository task. Its URL may remain in non-public migration source, but no anonymous rendered GGM UI from this patch links to it.

## Local verification

- Policy unit test: passed.
- Typecheck: passed.
- Targeted Chromium Playwright suite: passed.
- Production build: passed.

The browser suite proves the canonical public route, legacy alias, direct GGM work-detail route, default/search/filter gallery views, one unrelated demo fallback, one backend-public room, and an authenticated Studio editor read against the isolated local mock environment.

Evidence is recorded in `docs/program/evidence/presence-ggm-containment-proof/`.

## Remaining gates

1. Human review of this high-blast-radius public-renderer change.
2. Owner access restoration and GET-only owner diagnostic.
3. Owner-bound Studio draft/read/save/reload proof before claiming a system-native GGM migration.
4. A separately scoped media-hardening decision if direct public asset delivery remains unacceptable.

## Hosted containment evidence

Production deployment `presence-92qntt36q-emadhatu-2110s-projects` is Ready and serves the active Presence alias. Two anonymous no-cache requests per route confirmed that the gallery and chooser have no GGM exposure, canonical and legacy GGM routes return stable truthful 404 responses without fallback content, an unrelated demo still works, and a backend-published Presence still works. The anonymous backend gallery remained free of the contained candidate. No backend mutation, control-plane authentication, or intentional analytics-writing public-detail request was used.

## Non-goals retained

- No control-plane repair or use.
- No backend mutation in this frontend task.
- No authentication, tenant, persistence, routing architecture, or deployment-config changes.
- No external mock-up deployment changes.
- No GGM publication or Studio proof claim.
