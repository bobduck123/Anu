# Hosted Smoke Preflight

- Contract version: `anu-launch-preflight.v1`
- Generated at (UTC): `2026-04-16T12:00:00+00:00`
- valid_for_execution: `True`
- valid: `3`
- invalid: `0`
- missing: `0`
- skipped_by_mode: `3`

| field | required | status | message | value_preview |
|---|---|---|---|---|
| `public_base_url` | True | valid | configured | `https://example.com` |
| `public_host_for_resolution` | True | valid | configured | `partner.example.com` |
| `archive_record_slug` | True | valid | configured | `sample-record` |
| `control_base_url` | False | skipped-by-mode | control checks disabled by mode | `` |
| `control_site_id` | False | skipped-by-mode | control checks disabled by mode | `` |
| `control_auth_source` | False | skipped-by-mode | control checks disabled by mode | `` |

> Preflight validates hosted proof inputs only; it does not approve launch readiness.
