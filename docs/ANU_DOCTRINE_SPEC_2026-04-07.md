# ANU Doctrine Spec (2026-04-07)

## Purpose
Translate ANU’s world-language into enforceable platform doctrine so that routes, thresholds, trust posture, sponsorship, archive behaviour, and node semantics can be implemented consistently.

This document is normative for the next-era execution window.

## Core Doctrine
ANU is a governed civic-cultural substrate, not a generic software product.

It must therefore behave as:
1. a public-facing world with legible meaning,
2. a participant environment with real consequence,
3. a privileged control plane with hard boundaries,
4. a node-based system whose governance and identity are real,
5. a memory-bearing institution whose claims can be traced.

## Realm Semantics
### Celestial
**Meaning**
- collective atmosphere,
- shared trace,
- orientation toward belonging,
- community sensing.

**Primary route families**
- `/community`
- `/constellations`
- community-adjacent surfaces
- approved node aliases such as `/manara` or `/flora-fauna` where applicable

**Use**
- orient actors into shared civic-cultural movement,
- reveal social trace,
- bridge people toward participation.

**Not for**
- privileged operator execution,
- hidden governance mechanics,
- sponsor-shaped discovery.

### Earth
**Meaning**
- grounded consequence,
- care, labor, action, attendance, resource movement.

**Primary route families**
- `/impact`
- `/actions`
- `/events`
- `/relief`
- economy-adjacent consequence surfaces

**Use**
- turn intention into consequence,
- make labor, care, money, and commitments legible.

**Not for**
- detached dashboard abstraction,
- hidden sponsor weighting,
- ornamental “impact theatre” without source posture.

### Labyrinth
**Meaning**
- governance,
- explanation,
- trust,
- institutional legibility,
- memory.

**Primary route families**
- `/governance/*`
- `/transparency`
- `/docs`
- `/archive`

**Use**
- explain why something exists,
- expose models and decisions,
- hold institutional memory.

**Not for**
- feed-first social mechanics,
- decorative complexity without evidence,
- privileged operations rendered as public theatre.

### Neutral
**Meaning**
- cross-realm connective tissue.

**Primary route families**
- `/education`
- `/universe`
- `/profile`
- route bridges and transition surfaces

**Use**
- orient people across domains,
- bridge knowledge into action.

**Not for**
- becoming the generic dashboard center of gravity.

### Control
**Meaning**
- privileged operator and scoped steward execution outside public world grammar.

**Primary route families**
- `/control/*`
- `/api/control/*`
- `/api/control/falak/*`

**Use**
- node administration,
- runtime diagnosis,
- moderation execution,
- governance execution,
- privileged finance/trust operations.

**Not for**
- public browsing,
- undisclosed influence,
- casual public discovery.

## Actor Meanings
### Public
- unauthenticated or read-only visitor,
- may inspect public trust and archive surfaces,
- no consequential mutation privileges.

### Participant
- authenticated actor who joins and participates in civic routes,
- may attend, join, commit, and contribute where threshold allows.

### Contributor
- authenticated actor producing consequential inputs:
  evidence, stories, claims, commitments, proposals, event content, or record-linked material.

### Steward
- node-level governance and curation actor,
- scoped oversight and review responsibilities,
- may act in participant plane for node-scoped workflows,
- may act in control plane where explicitly permitted.

### Operator
- privileged platform or node operator acting on control plane,
- responsible for administrative, runtime, moderation, or trust operations.

## Threshold Doctrine
Thresholds are not identical to actor labels. Public-facing labels and code-level access thresholds must be aligned but distinguished.

### Public-facing ladder
- Public
- Participant
- Contributor
- Steward
- Operator

### Code-level access ladder
- `OPEN`
- `MEMBER`
- `VERIFIED_ACTOR`
- `STEWARD`
- `OPERATOR`

### Mapping
- Public → `OPEN`
- Participant → `MEMBER`
- Contributor → `VERIFIED_ACTOR`
- Steward → `STEWARD`
- Operator → `OPERATOR`

This mapping is the default until superseded in the decision register.

## Route-Role Semantics
### Public plane
- readable by the public,
- must expose degraded honesty when data is partial or stale,
- may surface trust posture and provenance,
- may not silently imply privileged certainty.

### Participant plane
- primary for participant and contributor action,
- may host node-scoped steward workflows that are not privileged,
- must preserve route adjacency into trust/archive surfaces.

### Control plane
- primary for operator actions and scoped steward privileged execution,
- requires control host + control session + control audience,
- must fail closed on auth or host mismatch.

## Sponsorship Doctrine
1. Sponsorship may support civic work but may not distort truth.
2. Sponsorship must never alter:
   - base discovery ordering,
   - archival ordering,
   - governance ordering,
   - model-registry ordering,
   - connector destination ordering.
3. Sponsor influence must always be explicit and labelled.
4. Sponsor disclosures belong on trust, transparency, and archive-linked surfaces.
5. Hidden sponsor weighting is forbidden.
6. Sponsor metadata must be queryable where materially relevant.
7. Sponsor presence must not suppress degraded honesty or provenance language.

## Archive and Trust Doctrine
1. Archive is canonical institutional memory, not a content dump.
2. Trust surfaces must explain:
   - what is claimed,
   - why it is believed,
   - what evidence supports it,
   - whether sponsor influence exists,
   - what is withheld and why.
3. Consequential claims require provenance posture:
   - source evidence, and/or
   - verification timestamp, and/or
   - explicit degraded honesty statement.
4. Restricted or culturally sensitive data must remain policy-scoped.
5. Public trust posture must be legible even when full records are not public.

## Node Doctrine
1. A node is a governed tenant on shared rails.
2. A node is not just branding or a theme layer.
3. A node must carry:
   - identity,
   - domains,
   - governance semantics,
   - publication scope,
   - moderation scope,
   - economy scope,
   - archive namespace,
   - trust posture,
   - binding to impact tenant identity.
4. White-label readiness is false until node binding and isolation are real.
5. Node-scoped control must remain separate from public node experience.

## Canonical vs Pilot
### Canonical now
- three-service kernel,
- public / participant / control plane distinction,
- route-purpose registry as source of flagship route semantics,
- threshold registry as executable threshold canon,
- sponsor non-distortion rule,
- archive as canonical memory posture.

### Pilot now
- proving-ground node `au-nsw-sydney`,
- first flagship connector journey,
- initial sponsor disclosure placement,
- initial archive record categories,
- initial control-host domain default.

## Forbidden States
The following states are doctrinally invalid:
1. privileged admin functionality as normal public routes,
2. hidden sponsor influence on ordering,
3. route dead ends with no connector path,
4. archive claims without provenance posture,
5. node-branded experience without node binding,
6. public claims of white-label/federation readiness without isolation proof,
7. public trust copy that hides uncertainty when live truth is partial.

## Explicit Implementation Consequences
1. Every flagship route must have a route-purpose registry entry.
2. Every flagship route must expose threshold and degradation posture.
3. Sponsor UI must be isolated from base route ordering logic.
4. Archive and trust records must carry provenance fields.
5. Control actions must never be exposed as standard browser-side public interactions.
6. Node-scoped branding must resolve from canonical node contracts, not guessed cookies or route hacks.
7. Connector substrate must be real code, not only copy or page links.

## Review Rule
Any change that materially alters:
- realm meaning,
- actor/threshold language,
- sponsor rules,
- archive/trust visibility,
- node semantics,
must update this document and the decision register before broad implementation fan-out.
