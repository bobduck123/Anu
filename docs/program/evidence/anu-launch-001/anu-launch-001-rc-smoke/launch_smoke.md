# Launch RC Smoke Summary

- Contract version: `anu-launch-smoke.v1`
- Generated at (UTC): `2026-04-16T09:05:00+00:00`
- Total checks: `9`
- Passed: `9`
- Failed: `0`
- Skipped: `0`
- launch_readiness_claim: `None`

| check_id | status | method | path | http_status | message |
|---|---|---|---|---:|---|
| `public_archive_list_route` | passed | GET | `/public/archive/records?page=1&page_size=5` | 200 | ok |
| `public_archive_record_detail_route` | passed | GET | `/public/archive-handoffs/launch-smoke-archive-record` | 200 | ok |
| `public_trust_decisions_route` | passed | GET | `/public/trust/decisions?limit=5` | 200 | ok |
| `white_label_public_host_resolution` | passed | GET | `/api/public/sites/resolve?host=launch-smoke.example.com` | 200 | resolved |
| `control_manifest_authoring_read_path` | passed | GET | `/api/control/sites/2/manifest-authoring` | 200 | ok |
| `control_publish_readiness_path` | passed | GET | `/api/control/sites/2/publish-readiness` | 200 | ok |
| `control_operator_assignments_api_availability` | passed | GET | `/api/control/sites/2/operator-assignments` | 200 | ok |
| `control_domain_bindings_api_availability` | passed | GET | `/api/control/sites/2/domain-bindings` | 200 | ok |
| `control_bootstrap_api_availability` | passed | POST | `/api/control/sites/bootstrap` | 201 | ok |

> This is a release-candidate smoke layer only; it does not auto-claim launch readiness and does not replace full QA.
