# Hosted Configuration Readiness

Complete this table against the deployed backend before enabling V1C.

| Check | Current proof status | Required action |
| --- | --- | --- |
| Additive media migration applied | Unknown hosted | Apply `20260526_presence_media_flow_v1c_private_draft.sql` and redeploy |
| Draft bucket configured | Unknown hosted | Configure `PRESENCE_MEDIA_DRAFT_BUCKET` |
| Draft bucket private | Not proven hosted | Verify anonymous read denial with a harmless uploaded object |
| Published media path configured | Existing V1B path previously proven | Reconfirm publish after recovery deploy |
| V1B fallback available | Passed locally | Reconfirm hosted editor and upload |
| V1C private mode active | No hosted claim | Set verification only after all checks pass |

## Required Configuration Names

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (backend only)
- `PRESENCE_MEDIA_BUCKET`
- `PRESENCE_MEDIA_DRAFT_BUCKET`
- `PRESENCE_MEDIA_PRIVATE_DRAFT_VERIFIED`
- Optional operational tuning: `PRESENCE_MEDIA_SIGNED_URL_TTL_SECONDS`,
  `PRESENCE_MEDIA_ORPHAN_MIN_AGE_SECONDS`

No secret values are included in this evidence.

