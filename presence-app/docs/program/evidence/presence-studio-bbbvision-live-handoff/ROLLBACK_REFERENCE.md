# Rollback reference

Rollback was not executed in this live handoff audit because the post-publish live audit passed.

Rollback source of truth:

- Publish execution evidence: `docs/program/evidence/presence-studio-bbbvision-publish-execution/`
- Rollback packet: `docs/program/evidence/presence-studio-bbbvision-publish-execution/ROLLBACK_PACKET.md`
- Pre-change state: `docs/program/evidence/presence-studio-bbbvision-publish-execution/PRE_CHANGE_STATE.md`
- Pre-change route status: `docs/program/evidence/presence-studio-bbbvision-publish-execution/pre-change-route-status.json`

If rollback is required later, use only the documented rollback endpoint/plan from the publish execution pack and verify:

- `/p/bbbvision`
- `/presence/bbbvision`
- `/studio/29/editor`
- `/studio/29/editor/preview`

Do not alter slug, title, domain, owner, tenant, auth, analytics, enquiries, media, or unrelated Presence records during rollback.
