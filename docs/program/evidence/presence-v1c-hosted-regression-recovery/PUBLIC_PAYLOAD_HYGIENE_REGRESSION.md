# Public Payload Hygiene Regression

Local browser checks passed for:

- `/p/test-presence-room`
- `/presence/test-presence-room`
- `/room/101/key`

The new numeric-entry backend response includes only a minimal public room
card and canonical public URL. It does not return an editor-shaped nested
configuration object; the page redirects into the existing public renderer.

The tests verify that anonymous HTML after rendering does not contain:

- `editable_config`
- `asset_config`
- `content_config`
- `style_dna`
- `motion_config`
- `draft_config`
- `owner_user_id`
- `auth_subject`
- `platform_admin`
- `internal_lifetime_free`
- `preview_token`
- `bearer`
- `service_role`
- `draft_storage_key`
- `signed_url`
- `preview_expires_at`

Hosted routes must be rechecked after deployment, including the restored
`/room/11/key` page.
