# Rollback Notes

Rollback is code-only:

1. Remove the Studio V3 route branch in `app/(studio)/studio/[id]/editor/page.tsx`.
2. Remove `components/presence-studio-v3/`.
3. Remove `lib/presence/studio-v3/`.
4. Revert optional `editorBridge` props from V2 public renderer components.
5. Remove focused Studio V3 P0 tests and this evidence folder.

Runtime kill switch:

- Do not set `NEXT_PUBLIC_PRESENCE_STUDIO_V3_BBB_PILOT=1`.
- Clear browser localStorage key `presence-studio-v3:bbb-pilot`.

Production remains off by code guard even if the env flag is accidentally set.
