# Hosted Public Route Diagnosis

- Contract version: `anu-launch-hosted-route-diagnosis.v1`
- Generated at (UTC): `2026-04-16T22:20:10.201621+00:00`
- public_base_url: `https://anu-back-end.vercel.app`
- public_host_for_resolution: `maanara.vercel.app`
- archive_record_slug: `manara-record`
- Total checks: `4`
- Passed: `0`
- Failed: `4`
- Skipped: `0`

## Outcome Categories

- dns: `0`
- transport: `0`
- timeout: `0`
- http_4xx: `0`
- http_5xx: `4`
- invalid_payload: `0`
- http_other: `0`
- success: `0`
- skipped_not_configured: `0`

## Public Surface State

- status: `degraded`
- degraded_reason_categories: `["http_5xx"]`
- annotation: Public route failures are reported as observed with no coercion.

| check_id | status | outcome_category | http_status | request_id | message |
|---|---|---|---:|---|---|
| `public_archive_list_route` | failed | http_5xx | 503 | `a8678088-ad60-433c-af56-ceffd3f0c10e` | Archive summary list temporarily unavailable |
| `public_archive_record_detail_route` | failed | http_5xx | 503 | `e0a03dc6-9b74-4000-b11b-6ae11fd21f40` | Archive handoff temporarily unavailable |
| `public_trust_decisions_route` | failed | http_5xx | 503 | `5e20d67a-99ce-4a8e-8d16-71ae595efe67` | Decision summary list temporarily unavailable |
| `white_label_public_host_resolution` | failed | http_5xx | 503 | `1c5b2ad2-b19a-4caf-acc0-778e67d844f3` | Public site resolution temporarily unavailable |

> Diagnosis captures hosted route behavior as observed. It does not auto-approve launch readiness.
