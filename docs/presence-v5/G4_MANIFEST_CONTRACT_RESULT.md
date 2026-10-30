# V5 Gate 4 candidate: Presence experience manifest v1

## Scope

`app/services/presence_experience_manifest.py` defines a strict Marshmallow contract for a **published** Presence experience. It has no route, database write, publication action or scene-code loader. The [Sydney rail fixture](fixtures/sydney-rail-manifest-v1.json) uses synthetic IDs and a non-existent `.example.test` asset; it is a validation example, not a public experience.

This contract is distinct from the existing Studio customisation manifest, which lists authoring options. It also does not replace `PresenceEditableConfig`. The `publication.config_version` and `publication.published_at` fields are intended to match an actual published `PresenceEditableConfig` row for `experience.room_id`. That match must be checked by the future publisher against the database; a payload cannot establish it by itself.

## Required manifest sections

| Section | Contract |
| --- | --- |
| `schema_version` | Exact `presence-experience-manifest-v1` identifier. Unknown fields are rejected. |
| `experience` | Presence room ID, slug, owner tenant ID and type. |
| `publication` | Published status, source config version, timestamp with offset, and SHA-256 digest. |
| `scene` | Trusted module **identifier** and version, compatible runtime range, module-specific parameter schema ID and parameters. There is no executable URL or code field. |
| `assets` | Version, HTTPS URI, media type, byte size, SHA-256 and semantic role. Fallback asset must exist. |
| `bindings` | Canonical Falak tenant and node references, typed public discovery kind, snapshot or explicitly declared approved-live mode, and bounded cache TTL. V1 allows one Falak tenant per manifest. No arbitrary query or private endpoint. |
| `navigation` | Declared scenes, initial scene and interaction-triggered transitions with referential checks. |
| `interactions` and `initial_state` | Named non-authoritative events and transient/session/preference scopes; selected line and station IDs and initial scene. Generic SMAC vote actions are excluded. |
| `performance` and `fallbacks` | Bounded render budgets, reduced-motion mode and static no-WebGL asset. |

The digest is SHA-256 over UTF-8 JSON with sorted keys, compact separators and `publication.content_sha256` omitted. It detects changes to the manifest payload after versioning; it is not a signature or an authorisation decision. Non-empty scene parameters require a validator supplied by the trusted module registry.

## Falak binding mapping

| Binding kind | Selection | Public read contract |
| --- | --- | --- |
| `falak.transport.network` | Fixed network node ID | `GET /v1/falak/transport/networks` and network lines |
| `falak.transport.line_patterns` | `selected_line_id` | `GET /v1/falak/transport/lines/:lineId/patterns` |
| `falak.transport.station_discovery` | `selected_station_id` | `GET /v1/falak/transport/stations/:stationId/discovery` |
| `falak.canonical.entity` | Fixed canonical node ID | Future published Presence entity binding; no URL resolution implemented here |

`snapshot` means the future publisher must include only approved public data in an immutable snapshot. `approved_live` requires an `approval_ref` in the contract, but this validator does **not** verify that reference. The future publisher must verify the approval, Falak tenant mapping, public-only query, scene module registry entry, runtime compatibility, asset origin/integrity, and published config identity before storing or serving a manifest. A runtime must resolve module IDs through a trusted build registry, never execute code supplied by this payload.

## Evidence and remaining work

`python -m pytest tests/test_presence_experience_manifest_contract.py -q` passed 15 contract tests, including digest tampering, unknown data, module path, insecure asset URL, wrong binding selector, mixed Falak tenants, missing approval reference, invalid runtime range, navigation references and domain-action rejection. The fixture validates with the same contract. No existing route or renderer behavior changed.

The experience registry, immutable storage, public/owner endpoints, approval checks, module registry, asset origin policy, actual session persistence, integration with the existing Presence publish/rollback lifecycle, hosted proof and frontend compatibility harness remain future scoped work. This contract alone does not advance V3.4 Gate 7 or Gate 9.
