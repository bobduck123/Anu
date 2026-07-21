# Hosted Studio V3 environment variables

## Frontend Vercel variables

These are build-time variables. Set them in Vercel and redeploy the frontend.

```env
NEXT_PUBLIC_API_BASE=https://<presence-backend-host>
NEXT_PUBLIC_SUPABASE_URL=https://<supabase-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-or-publishable-key>

NEXT_PUBLIC_PRESENCE_STUDIO_V2=1
NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS=29,bbbvision

NEXT_PUBLIC_PRESENCE_STUDIO_V3_HOSTED_HUMAN_TEST=1
NEXT_PUBLIC_PRESENCE_STUDIO_V3_ALLOWED_ROOMS=29,bbbvision
```

Optional local/test-only legacy pilot flag:

```env
NEXT_PUBLIC_PRESENCE_STUDIO_V3_BBB_PILOT=1
```

Do not rely on the legacy pilot flag for hosted production. The hosted gate is `NEXT_PUBLIC_PRESENCE_STUDIO_V3_HOSTED_HUMAN_TEST`.

## Backend runtime variables

These are backend runtime variables. They are required only if hosted V3 durable private-state save or V3 atomic draft replacement should be available.

```env
PRESENCE_STUDIO_V3_BACKEND_ENABLED=true
PRESENCE_STUDIO_V3_BACKEND_HOSTED_HUMAN_TEST=true
PRESENCE_STUDIO_V3_BACKEND_PILOT_IDS=29
PRESENCE_STUDIO_V3_BACKEND_PILOT_SLUGS=bbbvision
```

The backend also still requires the existing production/runtime configuration already used by the app, including database URL, CORS origins, auth/JWT secrets, control-plane hosts/shared secret, and Stripe secret where production config enforces it. This gate does not introduce new backend secrets.

## Allowlist

Initial allowlist:

```text
Room ID: 29
Slug: bbbvision
```

Wildcard tokens such as `*` and `all` are ignored. Hosted V3 requires both the current Room ID and current slug to match the allowlist. Non-allowlisted rooms stay on V2 or the legacy editor path.

## SQL migration requirement

Opening Studio V3 does not require the SQL migration. If the migration has not been applied, the editor can still open and operate with browser-local state.

Durable private-state save requires:

- the P1 migration applied;
- backend V3 hosted gate enabled;
- backend API URL reachable from the frontend;
- authenticated owner access.

Migration file:

```text
flora-fauna/backend/migrations/versions/20260721_presence_studio_v3_p1_foundation.sql
```

If the migration is missing, `/editor/v3/state` returns unavailable and the V3 shell disables durable private-state save safely.
