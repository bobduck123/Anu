# Hosted Launch RC Smoke Summary

- Contract version: `anu-launch-smoke-hosted.v1`
- Generated at (UTC): `2026-04-16T11:05:00+00:00`
- public_base_url: `https://example.com`
- control_base_url: `None`
- control_site_id: `None`
- Total checks: `9`
- Passed: `0`
- Failed: `4`
- Skipped: `5`
- launch_readiness_claim: `None`

| check_id | status | method | path | http_status | message |
|---|---|---|---|---:|---|
| `public_archive_list_route` | failed | GET | `/public/archive/records?page=1&page_size=5` | _n/a_ | request_failed: <urlopen error [WinError 10013] An attempt was made to access a socket in a way forbidden by its access permissions> |
| `public_archive_record_detail_route` | failed | GET | `/public/archive-handoffs/sample-record` | _n/a_ | request_failed: <urlopen error [WinError 10013] An attempt was made to access a socket in a way forbidden by its access permissions> |
| `public_trust_decisions_route` | failed | GET | `/public/trust/decisions?limit=5` | _n/a_ | request_failed: <urlopen error [WinError 10013] An attempt was made to access a socket in a way forbidden by its access permissions> |
| `white_label_public_host_resolution` | failed | GET | `/api/public/sites/resolve?host=partner.example.com` | _n/a_ | request_failed: <urlopen error [WinError 10013] An attempt was made to access a socket in a way forbidden by its access permissions> |
| `control_manifest_authoring_read_path` | skipped | GET | `/api/control/sites/<missing-site-id>/manifest-authoring` | _n/a_ | control checks disabled/not-configured for this run |
| `control_publish_readiness_path` | skipped | GET | `/api/control/sites/<missing-site-id>/publish-readiness` | _n/a_ | control checks disabled/not-configured for this run |
| `control_operator_assignments_api_availability` | skipped | GET | `/api/control/sites/<missing-site-id>/operator-assignments` | _n/a_ | control checks disabled/not-configured for this run |
| `control_domain_bindings_api_availability` | skipped | GET | `/api/control/sites/<missing-site-id>/domain-bindings` | _n/a_ | control checks disabled/not-configured for this run |
| `control_bootstrap_api_availability` | skipped | POST | `/api/control/sites/bootstrap` | _n/a_ | control checks disabled/not-configured for this run |

> Hosted smoke is a release-candidate evidence layer only; it does not auto-claim launch readiness and does not replace full QA.
