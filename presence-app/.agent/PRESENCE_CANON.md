# PRESENCE_CANON.md — Current Project Truth

**Status:** Living document. Update after every meaningful project decision, migration, launch milestone, client proof item, or repo discovery.

## One-line thesis

Presence is a cultural identity system for artists, creators, organisations, programs, archives, and campaigns — a more alive digital home than a generic website, link-in-bio, or flat portfolio.

## Current strategic frame

We are not launching from zero.

Existing artist/cultural “presences” have already been created through collaborations, but not yet consolidated into the Presence system. The current launch task is to **harvest, migrate, package, and sell**.

## Current priority

```text
1. Inventory existing delivered presences.
2. Select top 3 proof candidates.
3. Migrate/recreate them inside the Presence system.
4. Capture screenshots and case studies.
5. Launch done-for-you Presence offers.
6. Use paid builds to mature the platform.
```

## Product wedge

Presence should not compete as a generic website builder.

Presence should win as:

- cultural identity infrastructure;
- artist/creator world pages;
- rooms and presences;
- campaign microsites;
- community/cultural archives;
- launch pages with soul;
- proof of identity, story, memory, and legitimacy.

## V1 launch promise

V1 does not need full self-serve SaaS maturity.

V1 must support:

```text
- done-for-you builds;
- artist/cultural demo presences;
- mobile-first public routes;
- reusable templates/archetypes;
- proof/case-study capture;
- paid audit/build funnel.
```

## V1 non-goals

Do not prioritise:

- full marketplace;
- complex multi-tenant economy;
- broad ANU integration;
- advanced permissions;
- automated onboarding for every user type;
- payment system unless required for immediate paid delivery;
- new philosophical architecture;
- large design-system rewrite.

## Launch offers

### Presence Score Audit

Entry diagnostic.

Deliverable:
```text
- score out of 100;
- first impression;
- identity clarity;
- visual memorability;
- story depth;
- trust signals;
- conversion path;
- mobile experience;
- missing proof;
- recommended Presence structure;
- 7-day improvement plan;
- optional build quote.
```

### Presence Lite

For artists/creators.

Deliverable:
```text
- one Presence;
- hero identity;
- bio;
- media/gallery;
- links;
- event/project section;
- mobile polish;
- basic launch copy.
```

### Presence Pro

For launches/campaigns.

Deliverable:
```text
- multi-section/multi-room Presence;
- copy and identity structure;
- media embeds;
- archive/story section;
- launch plan;
- case-study-ready proof.
```

### Cultural Org Presence

For orgs, programs, communities, archives.

Deliverable:
```text
- public-facing program/org presence;
- story/context pages;
- archive/timeline/media;
- donation/member/funding CTAs where appropriate;
- stakeholder-safe copy;
- governance-sensitive structure.
```

## Existing proof to harvest

Maintain the working list in `.agent/PROOF_LIBRARY.md`.

Each existing presence should be evaluated for:

```text
- current URL/location;
- artist/project;
- permission status;
- strongest qualities;
- reusable archetype;
- migration difficulty;
- case study potential;
- screenshots needed;
- public/private sensitivity.
```

## Current proof and publication status — 2026-07-17

### GGM

- GGM is the first working proof example.
- It must remain private and will not be launched or published.
- It may support internal migration learning and private proof review only.
- The Studio working-state pass proves a local Room 11-shaped fixture only: draft edit, safe autosave, reload, private preview, and blocked publish affordances. It does not prove hosted owner authentication, the real backend owner mapping, or a system-native GGM migration.

### BBB

- BBB is the eventual publication candidate.
- The client has confirmed approval to publish.
- Approval does not mean it is already system-native, launch-ready, deployed, or published.
- Publication remains a separate, explicitly approved launch task with evidence and review.

### Studio access requirement

- A client should be able to access their Presence through Studio after authenticated login.
- This is a product requirement, not a claim that the current owner/auth flow is complete.
- Do not alter auth, tenant scope, ownership, or public/private boundaries without a separate approved work order.

### Migration truth

- A visual mock, copied frontend, or frontend fallback is reference material, not proof of migration.
- A migration is system-native only when Presence-owned content is represented in the actual content model and rendered through the intended Presence renderer/route.
- If save/reload is in scope, persistence must be demonstrated; visual parity alone is insufficient.
- This documentation task neither verifies nor changes runtime fallback behaviour. Production demo-fallback removal or disablement is deferred until a truthful persisted replacement exists and a separate task scopes and reviews it.
- Public proof must distinguish persisted backend rooms from demo or fallback content.
- Broad project cleanup is required later, but must be split into scoped work orders and must not expand proof migrations.

## Key product rules

1. **Do not redesign existing proof unless required.**
2. **Do not abstract before migration.**
3. **Do not add features without a proof/client reason.**
4. **Do not let ANU swallow Presence launch.**
5. **Do not let self-serve block done-for-you revenue.**
6. **Every build should create a reusable archetype.**
7. **Every paid/free pilot should become a case study.**

## Sacred boundaries

Agents must not change without explicit approval:

- auth;
- tenant logic;
- public/private route guards;
- payments;
- production deployment;
- data persistence architecture;
- renderer assumptions;
- user ownership semantics;
- client-facing promises.

## Launch proof archetypes

We need at least three:

### 1. Artist Presence

Purpose: show emotion, identity, media, aesthetic distinction.

### 2. Cultural/Community Presence

Purpose: show org/program/story depth.

### 3. Archive/Campaign Presence

Purpose: show timeline, memory, event, cultural record.

## Quality bar

Presence should feel:

- alive;
- specific;
- mobile-native;
- emotionally legible;
- culturally intelligent;
- non-generic;
- fast to understand;
- better than link-in-bio;
- more soulful than a template site.

## Anti-quality

Avoid:

- generic SaaS copy;
- bland portfolio feel;
- over-explaining;
- dead empty sections;
- overdesigned UI that slows launch;
- “world-building” that hides the offer;
- internal terminology that clients do not understand.

## Decision log

```text
2026-07-17 — Decision: Keep GGM as private working proof; do not launch or publish it.
Reason: Human direction.
Evidence: Founder confirmation.
Impact: GGM can support internal proof only and cannot satisfy public launch evidence.
Next action: Use it only for controlled migration learning and private review.

2026-07-17 — Decision: Treat BBB as the eventual publish candidate.
Reason: The client has confirmed approval to publish.
Evidence: Founder confirmation of client approval.
Impact: BBB may enter a separately approved migration and publication loop after system-native proof and review.
Next action: Define the smallest BBB migration work order without changing auth, persistence architecture, or deployment.

2026-07-17 — Decision: Defer production demo-fallback removal or disablement until a truthful persisted replacement exists.
Reason: This documentation task did not verify or change runtime fallback behaviour, and fallback content is not acceptable proof of a real migration.
Evidence: Founder direction.
Impact: Do not use fallback rendering as migration evidence or public-launch readiness; public proof must distinguish persisted backend rooms from demo or fallback content.
Next action: Create a separate fallback-removal work order only after the persisted replacement is ready.
```

## Open questions

Update this section.

```text
- What exact BBB content and assets are approved for the first system-native migration?
- What Studio owner-access path currently exists and what evidence proves client-scoped access?
- What minimum renderer/content-model slice can migrate BBB without introducing new architecture?
- Which offer should be sold first: audit, Lite, or Pro?
- What production/deploy access is available now?
```
