# Route Purpose Registry (2026-04-07)

## Registry Contract
Each major route must define:
- route,
- plane,
- realm,
- purpose,
- primary actor,
- key inputs,
- key outputs,
- adjacent routes,
- degraded mode,
- threshold label,
- provenance / trust requirement,
- notes.

No flagship route is valid without this contract.

## Major Routes
| Route | Plane | Realm | Purpose | Primary Actor | Key Inputs | Key Outputs | Adjacent Routes | Degraded Mode | Threshold Label | Provenance / Trust Requirement | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `/community` | participant | celestial | Surface live commons activity and participation pathways | Participant | community feed, microcosm state, tenant semantics, user role | join prompts, activity context, route bridges | `/events`, `/impact`, `/actions`, `/community/microcosms/[id]`, `/universe` | reduced-motion and utility fallback with continuity of core information and exits | Participant (`MEMBER`) | consequential community claims must retain source, freshness, or fallback honesty | existing starfield fallback must remain |
| `/impact` | participant | earth | Show grounded consequence across memberships, actions, pools, care, and outcomes | Contributor | memberships, pools, challenges, care summaries, impact aggregates | outcome reading, care/contribution transitions, evidence handoffs | `/memberships`, `/pools`, `/relief`, `/events`, `/community`, `/transparency` | preserve transitions and explicit degradation notice if feeds are partial | Contributor (`VERIFIED_ACTOR`) | consequential metrics require source grouping and live/fallback clarity | connector-driven bridges should replace hand-authored adjacency over time |
| `/governance/model-registry` | public | labyrinth | Expose model registry for governance legibility and public inspection | Steward (public-readable) | model definitions, version metadata, governance context, verification state | registry visibility, trust/archive transitions | `/governance`, `/transparency`, `/archive`, `/docs` | show stale/partial state explicitly with canonical source pointers | Steward (`STEWARD`) | model claims require status and verification posture | editing remains control-plane only |
| `/education` | public | neutral | Orient people from knowledge context into action pathways | Public | learning modules, map links, journey context, route semantics | transitions into maps, routes, journeys, archive | `/education/maps`, `/universe`, `/actions`, `/events`, `/community`, `/archive` | static navigable shell with explicit fallback honesty | Public (`OPEN`) | consequential educational claims require provenance or explicit limitation note | must never become a dead-end dashboard |
| `/transparency` | public | labyrinth | Public trust and institutional disclosure surface | Public | trust summaries, pool disclosures, sponsor disclosures, health posture | trust reading, disclosure inspection, archive/governance transitions | `/docs`, `/archive`, `/governance/model-registry`, `/impact` | mark unavailable live sections while preserving trust context | Public (`OPEN`) | every displayed claim requires provenance, disclosure, or a degraded honesty marker | first sponsor disclosure anchor surface |
| `/actions` | participant | earth | Move users from understanding into concrete commitments and civic tasks | Participant | action list, identity, node scope, participation history | commitment state, downstream community/impact effects | `/events`, `/community`, `/impact`, `/archive` | preserve action pathway map when live detail is unavailable | Participant (`MEMBER`) | action claims with consequence require source and completion posture | no dead-end action route allowed |
| `/events` | participant | earth | Coordinate participation via gatherings and civic programs | Participant | event feed, schedules, venue info, node scope | attendance, participation transitions, downstream impact linkage | `/community`, `/impact`, `/actions`, `/archive`, `/education` | schedule readability and key transitions must survive degraded state | Participant (`MEMBER`) | event state must show source and freshness posture | `weaving-futures-festival` remains strong flagship candidate |
| `/universe` | public | neutral | Aggregate cross-domain orientation and transition surface | Public | map packets, community traces, domain metadata, featured journeys | route transitions across domains | `/education`, `/community`, `/governance/model-registry`, `/archive` | utility fallback under reduced motion / low power | Public (`OPEN`) | aggregated claims must expose source summaries | connective surface, not governance or operator center of gravity |
| `/archive` | public | labyrinth | Canonical institutional memory with deep-linkable records | Public | trust reports, decisions, source-route metadata, visibility class | verifiable record access, citation, route back-links | `/transparency`, `/governance/model-registry`, `/docs`, source routes | show canonical references and last snapshot time if live index is unavailable | Public (`OPEN`) | records require provenance, visibility, verification metadata, and redaction posture | initial next-era addition |
| `/control/tenants` | control | control | Privileged tenant and node administration | Operator | control session, node/domain/config state, binding status | provision/update/inspect node tenancy | `/control/runtime-health`, `/control/nodes/[id]` | unavailable on public hosts; fail closed on control auth failure | Operator (`OPERATOR`) | every mutation must be audited with actor, scope, target, and result | migration target from `/admin/tenants` |
| `/control/runtime-health` | control | control | Privileged runtime and service health operations surface | Operator | service health checks, runtime contract status, release context | diagnosis, operator follow-up actions | `/control/tenants`, `/transparency` | unavailable on public hosts; may show last known snapshot + timestamp | Operator (`OPERATOR`) | every operational signal must include source and timestamp | migration target from `/admin/runtime-health` |

## Registry Rules
1. No major route ships without this registry entry.
2. No major route may be a dead end.
3. Routes with consequential claims require provenance or explicit degraded honesty.
4. Control routes are not public realm routes and must remain control-host only.
5. This document and the code registry must remain synchronized.
6. If a route’s purpose changes materially, update this registry before implementing broad UI changes.

## Code Canon (M2 execution update — 2026-04-13)
Authoritative implementation file:
- `frontend-next/src/ui-system/anu/routePurposeRegistry.ts`

Verification tests:
- `frontend-next/src/test/routePurposeRegistry.test.ts`
- `frontend-next/src/test/routeMetadataParity.test.ts`
- `frontend-next/src/test/routeCanonDocsSync.test.ts`

Synchronization rule:
- Any route addition/removal in this document must be mirrored in `ROUTE_PURPOSE_REGISTRY` and parity tests in the same change.

## Internal Lab Canon (resolved 2026-04-13)
- Canonical internal lab route: `/lab`
- Legacy alias route: `/sandbox/ui-lab` (`legacy-redirect` compatibility path)

Scope note:
- `/lab` is **not** part of the flagship public/participant/control route-purpose table above.
- `/lab` remains an internal steward lab surface with explicit alias modeling in code.
