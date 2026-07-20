# Rollback packet

- Publish execution action: publish-draft
- Rollback executed in this pass: no
- Pre-change state location: `PRE_CHANGE_STATE.md` and `pre-change-route-status.json`
- Pre-change draft fingerprint: ca015dcc8214755f
- Pre-change effective published fingerprint: 71d3b0517debf647
- Pre-change effective published config id: not recorded
- Pre-change effective published version: 2

## Rollback command/endpoint plan

If rollback is required after a publish-draft action, use the existing owner editor rollback endpoint for room `29` with the captured pre-change published config id or version:

- `POST /api/presence/owner/rooms/29/editor/rollback`
- Payload option A: `{ "config_id": <pre-change effective published config id> }`
- Payload option B: `{ "version": <pre-change effective published version> }`

Do not alter slug, title, domain, owner, tenant, auth, analytics, enquiries, media, or unrelated Presence records during rollback.

## Rollback verification routes

- `/p/bbbvision`
- `/presence/bbbvision`
- `/studio/29/editor`
- `/studio/29/editor/preview`
