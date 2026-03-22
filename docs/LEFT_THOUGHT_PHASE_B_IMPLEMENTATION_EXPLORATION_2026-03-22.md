# Left Thought Graph → ANU Universe
## Phase B Exploration (Live Map Persistence via Falak Maps Service)

Date: 2026-03-22
Owner: ANU / Falak Maps integration track
Status: Exploration + implementation-ready blueprint

---

## 1) What Phase B means

**Phase A (done):** Left Thought Graph is available as a **bundled frontend fallback map** (`left-thought-graph-atlas`) and renders through the shared Universe viewer/scene/explainer path.

**Phase B target:** Move Left Thought Graph from frontend fallback-only into the **live Falak Maps persistence path** so it is:

- stored in the maps database,
- retrievable through `/v1/education/maps/:topicKey`,
- manageable with existing admin edit/status/layout endpoints,
- available without relying on bundled fallback assets.

---

## 2) Current backend architecture relevant to Phase B

Key files already in place:

- Route registration:
  - `services/impact-service/src/maps/routes/registerMapRoutes.ts`
- Service layer:
  - `services/impact-service/src/maps/services/falakMapService.ts`
- Compile + persist pipeline:
  - `services/impact-service/src/maps/compiler/autopilot.ts`
  - `services/impact-service/src/maps/repositories/prismaFalakMapRepository.ts`
- Mock-seed discovery for deterministic compile:
  - `services/impact-service/src/maps/compiler/mockSeeds.ts`

Important observation:

- `compileMapDraft()` in `autopilot.ts` already calls `findMockSeed(topicKey)`.
- If a seed exists, compiler uses that deterministic corpus and persists it with normal map lifecycle.

This gives a straightforward Phase B path with minimal risk.

---

## 3) Recommended Phase B implementation path

## B1 (recommended): Add Left Thought as a compiler seed corpus

### Why this is best

- Reuses existing service contracts (`POST /v1/education/maps/resolve`)
- No new privileged import endpoint required
- Keeps same QA/debug semantics as existing seed topics
- Supports future recompute/versioning through existing map lifecycle

### Implementation steps

1. **Add source JSON to impact-service**
   - New file candidate:
     - `services/impact-service/src/maps/compiler/data/leftThoughtGraph.json`

2. **Create transformer in impact-service compiler layer**
   - New file candidate:
     - `services/impact-service/src/maps/compiler/leftThoughtSeed.ts`
   - Responsibilities:
     - ingest graph nodes/links,
     - map to `SeedCorpus` entities,
     - preserve relation semantics in evidence,
     - preserve source URLs,
     - attach SEP source links/search where missing.

3. **Register seed in `mockSeeds.ts`**
   - Add `topicKey: 'left-thought-graph-atlas'` entry
   - Export via `findMockSeed` path

4. **Compile/persist using existing API**
   - Call:
     - `POST /v1/education/maps/resolve`
     - body: `{ "topic": "left-thought-graph-atlas", "mode": "curated_refine" }`

5. **Publish status**
   - If needed, set status via:
     - `PATCH /v1/education/maps/:topicKey/status`

6. **UI behavior**
   - Universe page will then load live map from API.
   - Fallback only used if service unavailable.

---

## 4) Data mapping contract for Phase B seed

Use the same semantics proven in Phase A+:

- Node types:
  - `thinker`, `topic`, `work`
- Relation mapping:
  - `influenced`, `founded`, `foundational*` → `influences`
  - `developed`, `extended` → `extends`
  - `associated_with` → `co_occurs_with`
  - `authored_by` → `derived_from`
  - `foundational_text`, `key_text` → `belongs_to`
  - `related_text` → `similar_to`
- Axes:
  - x: historical→contemporary
  - y: canonical→plural
  - z: formal→civic
- Sources:
  - preserve original resources,
  - ensure SEP linkage per node (direct entry or SEP search URL)

---

## 5) Verification checklist for Phase B rollout

1. **Compile succeeds**
   - Resolve endpoint returns `{ map, jobCreated: true }`
2. **Map load succeeds**
   - `GET /v1/education/maps/left-thought-graph-atlas` returns resource
3. **Scale parity**
   - node count = 79
   - edge count = 126
4. **SEP coverage parity**
   - all nodes include at least one `plato.stanford.edu` source
5. **Universe render parity**
   - topic selectable in `/universe`
   - stars/constellations/explainer all functional
6. **Fallback behavior retained**
   - if live map unavailable, frontend fallback still works

---

## 6) Risks and mitigation

- **Risk:** seed transform divergence between frontend fallback and backend compiler
  - Mitigation: share a single mapping spec doc + parity tests for counts and relation classes.

- **Risk:** route guard prevents compile in some hosted contexts
  - Mitigation: execute resolve under privileged actor + known tenant (`X-Tenant-Id` configured path).

- **Risk:** regressions in source-link density
  - Mitigation: add backend test asserting SEP-linked source count for topic.

---

## 7) Optional B2 enhancement (after B1)

Add an **admin import endpoint** that accepts an explicit graph payload and persists directly (bypassing compiler profiling), useful for curatorial imports beyond mock seeds.

This is more flexible but higher governance risk (payload validation, auth, replay controls). Recommended only after B1 is stable.

---

## 8) Practical next action sequence

1. Implement `leftThoughtSeed.ts` in impact-service compiler.
2. Register seed in `mockSeeds.ts`.
3. Trigger resolve for `left-thought-graph-atlas` in staging tenant.
4. Compare live map with Phase A+ fallback using parity script/tests.
5. Mark published and monitor in Universe page.

---

## 9) Definition of done for Phase B

- Left Thought Graph is retrievable as a persisted Falak map via live API,
- appears in universe domain selector without fallback dependency,
- preserves node/edge/source parity with Phase A+,
- remains editable through existing admin map endpoints.
