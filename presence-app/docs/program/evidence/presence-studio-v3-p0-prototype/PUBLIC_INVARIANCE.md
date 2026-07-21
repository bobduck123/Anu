# Public Invariance

Public invariance target:

- `/p/bbbvision` remains served by the existing public route.
- `/presence/bbbvision` remains served by the existing public route.
- Studio V3 local controls are not present on public routes.
- Test-as-visitor removes editor bridge/chrome before rendering the public canvas.
- Browser-local prototype changes do not post draft, preview, publish, rollback, or public payload mutations.
- Anonymous BBB public API payload does not expose `owner_user_id`, Studio V3 source refs, or `preview_expires_at`.

The public invariance spec records the public signature before and after local Studio V3 actions and requires equality.
