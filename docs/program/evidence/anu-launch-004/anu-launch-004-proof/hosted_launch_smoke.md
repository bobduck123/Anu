# Hosted Launch RC Smoke Summary

- Contract version: `anu-launch-smoke-hosted.v1`
- Generated at (UTC): `2026-04-16T10:56:18.983206+00:00`
- public_base_url: `https://anu-back-end.vercel.app`
- control_base_url: `https://anu-back-end.vercel.app`
- control_site_id: `1`
- Total checks: `9`
- Passed: `1`
- Failed: `8`
- Skipped: `0`
- launch_readiness_claim: `None`

| check_id | status | method | path | http_status | message |
|---|---|---|---|---:|---|
| `public_archive_list_route` | failed | GET | `/public/archive/records?page=1&page_size=5` | 503 | Archive summary list temporarily unavailable |
| `public_archive_record_detail_route` | failed | GET | `/public/archive-handoffs/manara-record` | 503 | Archive handoff temporarily unavailable |
| `public_trust_decisions_route` | failed | GET | `/public/trust/decisions?limit=5` | 503 | Decision summary list temporarily unavailable |
| `white_label_public_host_resolution` | failed | GET | `/api/public/sites/resolve?host=maanara.vercel.app` | 503 | Public site resolution temporarily unavailable |
| `control_manifest_authoring_read_path` | failed | GET | `/api/control/sites/1/manifest-authoring` | 422 | http_422 |
| `control_publish_readiness_path` | failed | GET | `/api/control/sites/1/publish-readiness` | 422 | http_422 |
| `control_operator_assignments_api_availability` | failed | GET | `/api/control/sites/1/operator-assignments` | 422 | http_422 |
| `control_domain_bindings_api_availability` | failed | GET | `/api/control/sites/1/domain-bindings` | 422 | http_422 |
| `control_bootstrap_api_availability` | passed | POST | `/api/control/sites/bootstrap` | 422 | http_422 |

> Hosted smoke is a release-candidate evidence layer only; it does not auto-claim launch readiness and does not replace full QA.
