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

## Current proof and publication status — 2026-07-21

### GGM

- GGM is the first working proof example.
- It must remain private and will not be launched or published.
- It may support internal migration learning and private proof review only.
- The Studio working-state pass proves a local Room 11-shaped fixture only: draft edit, safe autosave, reload, private preview, and blocked publish affordances. It does not prove hosted owner authentication, the real backend owner mapping, or a system-native GGM migration.

### BBB

- BBB is the approved, system-native published proof.
- Controlled BBB publish execution completed and is recorded in `docs/program/evidence/presence-studio-bbbvision-publish-execution/` at commit `e0ce05c`.
- The canonical and legacy public BBB routes remained live after that action; the later owner-experience overhaul recorded local containment evidence without republishing.
- Any future publish, unpublish, rollback, deployment, or hosted mutation remains a separate, explicitly approved task with fresh evidence and review.

### Studio V3 direction

- Studio V2 remains the proven renderer, composition, private/public projection, draft, preview, and publication engine.
- Studio V3 is the planned replacement client-facing presentation/controller shell over that engine; it is not a second public renderer or backend rewrite.
- The first implementation must be a default-off local/test BBB pilot on the existing editor route, compile safely into the V2 draft model, and make no publish request.
- Prototype-only locks, named Looks, savepoints, comparison state, and local source provenance remain browser-local in separate Presence/Room envelopes under an opaque authenticated-owner partition, scoped to a complete immutable server base identity plus a stable stored-semantic fingerprint until a separate persistence contract is approved. That fingerprint removes only owner-GET-added URL/expiry fields on validated private-draft media references; all other values remain authoritative. Current recursive-merge PATCH is not a safe V3 save path. P0/P1 remain zero-write, and a disposable local/test POST replacement/deletion characterisation cannot enable product saving. Save Draft and server Visitor Preview stay disabled until a separately approved server-side atomic expected-existing-draft precondition checks identity/revision/fingerprint and replaces in one transaction; this specification does not authorize that backend change.
- The planning contract and evidence live in `docs/program/presence-studio-v3/` and `docs/program/evidence/presence-studio-v3-specification/`. Documentation is not proof that Studio V3 is implemented.

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

2026-07-20 — Decision: Keep Studio V2 as the single canonical eligible-room editor and refine it in place.
Reason: The private persistence baseline and local Room 11-shaped proof already establish its owner workflow; another editor path would fragment evidence and behaviour.
Evidence: `docs/program/evidence/presence-studio-working-state/` and the V2 Playwright suite.
Impact: Improve the existing canvas, inspector, Guide, Style DNA, and mobile model rather than creating a parallel Studio.
Next action: Use a separately authorised hosted owner proof before claiming real client self-service.

2026-07-20 — Decision: Limit active Style DNA to renderer-visible fields.
Reason: Aura, display type, and border controls were not truthfully projected by the current V2 renderer contract.
Evidence: Studio source audit and on-brand local browser proof.
Impact: Background, texture, motion, heading weight, object shape, shadow, and accent remain active; unsupported controls are absent rather than presented as functional.
Next action: Add a field only when model, editor, preview, and public renderer all support it.

2026-07-20 — Decision: Use a DOM-first environmental layer for the initial Studio V2 spatial pass.
Reason: Existing Studio state can truthfully drive room/chamber/object focus without a WebGL dependency, new persistence contract, or a second editor.
Evidence: `docs/program/evidence/presence-studio-environmental-engine/` and the focused Chromium suite.
Impact: The environmental layer is decorative, deterministic, reduced-motion-safe, and shared by editor and private preview; semantic content and controls remain DOM-first. This is private local fixture evidence only and does not change GGM containment or prove a system-native migration.
Next action: Require a separately scoped hosted owner-bound proof before connecting this visual slice to a real client record.

2026-07-21 — Decision: Treat BBB publish execution as completed proof while preserving publication as a protected human gate.
Reason: The controlled action and post-change route evidence are committed under `docs/program/evidence/presence-studio-bbbvision-publish-execution/`.
Evidence: Commit `e0ce05c` and the later owner-experience containment evidence.
Impact: Canon must not describe BBB as merely an eventual unpublished candidate; future hosted actions still require separate approval and verification.
Next action: Use BBB as the private Studio V3 pilot target without republishing during prototype work.

2026-07-21 — Decision: Specify Studio V3 as a new client shell over the canonical Studio V2 engine.
Reason: BBB proved the renderer and draft/public lifecycle, while owner review showed the V2 cockpit is not a marketable client editor.
Evidence: `docs/program/presence-studio-v3/` and `docs/program/evidence/presence-studio-v3-specification/`.
Impact: The 2026-07-20 single-editor decision continues to prohibit a parallel engine or permanent route, but does not lock clients to the existing cockpit presentation. V3 enters through the existing editor gate and compiles to V2.
Next action: Implement only the reviewed, default-off prototype slice in a separate branch and work order.
```

## Open questions

Update this section.

```text
- Which real-owner usability session will validate five-second comprehension before expanding beyond the BBB pilot?
- Which backend cleanup slice should land first before market launch: multimedia Works, Collection membership/order, Room placements, or durable V3 state?
- What normalized responsive placement contract should replace prototype pixel transforms before general availability?
- Which offer should be sold first: audit, Lite, or Pro?
- What production/deploy access is available now?
```
