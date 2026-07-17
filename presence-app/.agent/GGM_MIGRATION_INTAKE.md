# GGM Migration Intake and Source Map

## Status

- GGM is private working proof.
- GGM is not public launch material.
- GGM is not system-native yet.
- Frontend fallback, static visual copy, or renderer-only evidence does not satisfy migration.
- Required proof is an owner-bound Studio private draft proof.

This intake records source availability and a proposed target map only. It does not prove that a backend PresenceNode, owner assignment, private draft, asset persistence, or authenticated preview currently exists.

## Source inventory

| Path | File type | Purpose | Fields/entities found | Privacy sensitivity | Usable for migration |
|---|---|---|---|---|---|
| `C:\Dev\ggm\data\artist.json` | JSON | Artist identity and editorial source | Artist name, subtitle, location, hero and about copy, statement, influences, timeline, `contact.email`, `contact.website`, reference link | Class B. Contact and reference fields are `[redacted private contact field]` / private-link material. | Yes, subject to private-use approval and copy review. Do not copy contact or reference values into public material. |
| `C:\Dev\ggm\data\works.json` | JSON | Work catalogue source | 8 work records; each has internal ID/slug, title/year/medium/dimensions, full-image and thumbnail references, alt text, editorial fields, and mood tags | Class B. Media references and work metadata must remain private until a separate approval confirms their use. | Yes, as a metadata map. Media existence, rights, upload path, and persistence are unverified. |
| `C:\Dev\Flora_fauna\presence-app\lib\presence\ggm\source.ts` | TypeScript | Existing renderer-side GGM reference model | Static artist/work constants, work lookup, featured/hero/portrait/inspiration/strand helpers | Class B. It is an existing application-side reference, not source-of-truth migration evidence. | Reference only. It must not be used to claim a persisted Presence migration. |

Read-only route/API inspection also found Studio routes at `/studio`, `/studio/[id]/editor`, and `/studio/[id]/editor/preview`; owner, editor, and public client modules expose node/work, editor-draft, preview, and public-read operations. Their runtime behaviour and owner scoping are not verified by this intake.

## Content model map

| Source | Target Presence field/concept | Confidence | Gap / decision needed |
|---|---|---|---|
| No backend record inspected | `PresenceNode` | Low | Read-only diagnostic must determine whether a GGM node already exists, its private/public state, and whether it is correctly owner-bound. |
| Artist JSON plus work JSON | `PresenceEditableConfig` | Medium | Map editorial copy, visual choices, and ordered work references into the actual editor schema without copying static renderer defaults wholesale. |
| No owner data in the inspected source JSON | Owner identity | Low | Emad must provide controlled, private pilot-admin/owner access for a diagnostic; do not record an account ID or auth subject here. |
| Work-level `id` and `slug` | Work internal identifier / work slug | High | These identify individual works only. The room-level slug/internal ID must be confirmed from the backend rather than inferred. |
| Existing GGM renderer-side model | Renderer key / Artist Presence archetype | Medium | Artist Presence is the intended archetype; the actual persisted renderer key and compatibility must be confirmed. A renderer-only room is not proof. |
| Artist JSON identity fields | Artist identity | High | Confirm the exact private draft display fields and whether location is safe for the private proof. |
| Hero/about/statement fields | Bio / statement | High | Editorial selection and approval are needed; no contact or private-link content should be copied by default. |
| Eight work records | Works | High | Preserve record order only after editorial confirmation; verify backend work schema and legacy-media requirements. |
| Mood tags and editorial grouping possibilities | Collections | Low | No explicit collection entity exists in the source JSON. Decide whether one collection is needed or whether works remain a flat list. |
| `image`, `thumb`, and `alt` fields | Media assets | Medium | Do not open assets in this task. Confirm rights, file availability, canonical upload flow, and persisted asset IDs later. |
| Contact website and reference-link fields | Links | Low | Values are excluded. Emad must decide which links, if any, are safe for private draft use. |
| No explicit CTA field | CTA | Low | Define one truthful private-draft CTA or intentionally omit CTA; do not infer from contact data. |
| Artist identity and approved public-safe copy | SEO / public metadata | Low | Not needed for private proof. Any future public metadata requires a separate approval and publication gate. |
| Migration diagnostic and private proof capture | Proof items | Low | Proof must be created after persistence, owner scope, and visibility are demonstrated; static visual evidence is insufficient. |
| No visibility/auth data in external source | Draft/private visibility and authenticated preview | Low | Must be demonstrated through the approved Studio boundary; do not infer from routes or static source. |

## Works and asset manifest

The source catalogue contains eight records. Neutral labels are used here because this private intake does not establish which titles/details are approved for reuse.

| Work | Source file/path reference | Media requirement | Target Presence structure | Privacy risk | Migration confidence |
|---|---|---|---|---|---|
| Source Work 01 | `C:\Dev\ggm\data\works.json` record 1 | Full image, thumbnail, alt text; rights and persistence unverified | Ordered `Work` item with media relation | Class B media and metadata | Medium |
| Source Work 02 | `C:\Dev\ggm\data\works.json` record 2 | Full image, thumbnail, alt text; rights and persistence unverified | Ordered `Work` item with media relation | Class B media and metadata | Medium |
| Source Work 03 | `C:\Dev\ggm\data\works.json` record 3 | Full image, thumbnail, alt text; rights and persistence unverified | Ordered `Work` item with media relation | Class B media and metadata | Medium |
| Source Work 04 | `C:\Dev\ggm\data\works.json` record 4 | Full image, thumbnail, alt text; rights and persistence unverified | Ordered `Work` item with media relation | Class B media and metadata | Medium |
| Source Work 05 | `C:\Dev\ggm\data\works.json` record 5 | Full image, thumbnail, alt text; rights and persistence unverified | Ordered `Work` item with media relation | Class B media and metadata | Medium |
| Source Work 06 | `C:\Dev\ggm\data\works.json` record 6 | Full image, thumbnail, alt text; rights and persistence unverified | Ordered `Work` item with media relation | Class B media and metadata | Medium |
| Source Work 07 | `C:\Dev\ggm\data\works.json` record 7 | Full image, thumbnail, alt text; rights and persistence unverified | Ordered `Work` item with media relation | Class B media and metadata | Medium |
| Source Work 08 | `C:\Dev\ggm\data\works.json` record 8 | Full image, thumbnail, alt text; rights and persistence unverified | Ordered `Work` item with media relation | Class B media and metadata | Medium |

## Required owner-bound private proof path

Required state, not verified by this task:

```text
Supabase client login
-> backend owner identity resolves
-> assigned PresenceNode appears at /studio
-> client opens /studio/[id]/editor
-> private draft persists through save/reload
-> authenticated preview works
-> no public /p/[slug] or gallery exposure until explicitly published
```

### Evidence needed

- A redacted, read-only diagnostic showing whether a GGM PresenceNode and owner assignment exist.
- Private proof that the owner sees only their assigned node at `/studio`.
- Private draft save/reload evidence showing the mapped artist copy and a controlled work set persisted by the backend.
- Authenticated preview evidence from `/studio/[id]/editor/preview`.
- Negative checks: unauthenticated Studio access is rejected; another owner cannot read or edit the node; the private draft is absent from `/p/[slug]`, public presence listings, and gallery surfaces before publication.
- A redacted media manifest that proves persisted asset references without embedding screenshots, URLs, account IDs, auth subjects, or client-private content in this repository.

### Routes/APIs likely involved

- Studio routes: `/studio`, `/studio/[id]/editor`, and `/studio/[id]/editor/preview`.
- Owner client operations for node/work reads and updates.
- Editor client operations for draft creation/read/patch, history, asset attachment/upload, preview, and publish controls.
- Public client operations only for negative visibility checks; this task must not publish or call public-enquiry flows.

### Environment inputs needed from Emad

- Controlled staging frontend and backend references, supplied through a private channel and not written into this repository.
- A permitted pilot-admin or client-owner login path and confirmation of the intended owner role.
- Confirmation whether a GGM PresenceNode already exists or is authorised for later private provisioning.
- Approval of which artist copy, contact/link fields, and works may appear in a private draft.
- Confirmation whether media must use the legacy backend media flow or whether the Studio V2 blob-preview flow is permitted for persisted assets.

### What must remain private

- Source JSON values other than approved, future public-safe copy.
- Images, screenshots, media URLs, staging URLs, account IDs, auth subjects, emails, and tokens.
- Owner-access evidence and unpublished draft data.

### Negative checks required

- No unauthenticated Studio/editor/preview access.
- No cross-owner access by direct route manipulation.
- No public `/p/[slug]`, gallery, or listing exposure before explicit publication.
- No frontend fallback, mock, or static renderer copy presented as persisted migration evidence.

## Gaps and decisions required

1. Provide controlled staging frontend/backend references for the read-only diagnostic; keep values out of docs and commits.
2. Provide permitted owner identity or pilot-admin access and confirm the intended GGM owner relationship.
3. Decide whether the source copy, contact fields, and reference links are safe to use in a private draft; the current intake excludes their values.
4. Decide whether the media path must use legacy backend media persistence or whether Studio V2 blob-preview assets are acceptable only as an interim preview.
5. Confirm whether a backend GGM `PresenceNode` already exists, or authorise a later, separately scoped private provisioning task if it does not.
6. Confirm whether the eight source works remain a flat sequence or need an explicit collection before migration.

## Next work orders

### 1. Read-only GGM owner-bound backend/Studio diagnostic

- Task size: S
- Blast radius: High
- Route: Explorer with human gate
- Acceptance criteria: Determines, using authorised read-only access, whether the GGM node, owner assignment, private draft, preview boundary, and public visibility state exist; all outputs are redacted.
- Evidence required: Redacted diagnostic result, route/status matrix, and explicit unknowns; no screenshots or private identifiers committed.
- Human decision required: Provide controlled endpoints and authorised owner/pilot-admin access.

### 2. Private GGM draft provisioning and migration

- Task size: M
- Blast radius: High
- Route: Builder, then Reviewer and human gate
- Acceptance criteria: Only if diagnostic confirms an absent or unusable room and Emad authorises it, creates or updates one private owner-bound draft with a limited approved content set, save/reload persistence, and no public exposure.
- Evidence required: Redacted backend persistence proof, owner-scope negative check, authenticated preview proof, and a rollback note.
- Human decision required: Authorise provisioning, copy/work selection, and asset flow.

### 3. Private Studio proof capture

- Task size: XS
- Blast radius: Medium
- Route: Explorer / Fast Producer with human gate
- Acceptance criteria: Captures a privacy-reviewed, private-only evidence pack for the owner-bound draft after the system-native proof gate is satisfied; nothing is added to the public proof library.
- Evidence required: Private evidence location confirmed by Emad, redacted capture manifest, and checks that no public claim or public route was created.
- Human decision required: Approve private evidence storage and reviewers.

### 4. GGM media persistence decision and import plan

- Task size: S
- Blast radius: Medium
- Route: Explorer, then Ticket Writer
- Acceptance criteria: States the one approved asset path, required metadata, validation, rollback, and whether an import is needed; does not upload or alter media.
- Evidence required: Media field-to-target map, rights/availability checklist, and scoped follow-up ticket.
- Human decision required: Choose legacy backend media flow versus a permitted persisted Studio flow.

### 5. GGM public publish gate (explicitly deferred)

- Task size: XS
- Blast radius: High
- Route: Chief Operator with human decision
- Acceptance criteria: Remains deferred; no release, deployment, public route, case study, or public screenshot is authorised by this intake.
- Evidence required: Written human approval, completed private system-native proof, and a separate reviewed publication work order before any action.
- Human decision required: Explicit future authorisation to reconsider publication.
