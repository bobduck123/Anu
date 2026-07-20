# Supabase Auth Redirect Configuration

Date: 2026-05-22

## Presence Redirect Contract

Presence auth links must target the hosted Presence frontend before they reach
Supabase email delivery:

| Flow | Auth option | Presence route |
|---|---|---|
| Signup confirmation | `emailRedirectTo` | `/auth/callback` |
| Signup email resend | `emailRedirectTo` | `/auth/callback` |
| Password recovery | `redirectTo` | `/auth/update-password` |

The frontend builds these URLs with `getSiteUrl()`:

1. `NEXT_PUBLIC_SITE_URL`
2. `NEXT_PUBLIC_VERCEL_URL`
3. `http://localhost:3000` for local development only

Set an explicit production `NEXT_PUBLIC_SITE_URL` in Vercel so production
emails do not depend on preview deployment URL inference.

## Vercel Environment

Production:

```text
NEXT_PUBLIC_SITE_URL=https://your-presence.vercel.app
```

Keep the existing public Supabase variables configured for the same deployment:

```text
NEXT_PUBLIC_SUPABASE_URL=<Supabase project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase public anon or publishable key>
```

`NEXT_PUBLIC_*` variables are build-time frontend inputs. Redeploy the Presence
frontend after changing them.

## Supabase Dashboard

Open `Auth` -> `URL Configuration`.

Set `Site URL` to the canonical hosted frontend origin:

```text
https://your-presence.vercel.app
```

Add exact production `Redirect URLs`:

```text
https://your-presence.vercel.app/auth/callback
https://your-presence.vercel.app/auth/update-password
```

Add localhost redirect URLs only for local auth testing:

```text
http://localhost:3000/auth/callback
http://localhost:3000/auth/update-password
```

Add Vercel preview redirects only when preview auth emails are intentionally
enabled. Prefer exact production paths for controlled launch.

## Email Templates

Open `Auth` -> `Email Templates` and inspect at least:

- Confirm signup
- Magic link or OTP email if enabled
- Reset password

Requirements:

1. Do not hard-code `localhost` in any template.
2. Templates that rely on Supabase-generated verification links can use
   `{{ .ConfirmationURL }}`.
3. Custom templates that compose a redirect destination must use
   `{{ .RedirectTo }}` for the auth call redirect target instead of forcing
   `{{ .SiteURL }}`.
4. If a template uses `{{ .SiteURL }}`, verify the Dashboard `Site URL` above
   is the hosted Presence frontend and that the template does not discard the
   route-specific redirect target.

## Verification Checklist

1. Redeploy the Presence frontend with `NEXT_PUBLIC_SITE_URL` set.
2. Trigger a signup confirmation or resend email and confirm it returns through
   `/auth/callback`.
3. Trigger a forgot-password email and confirm it opens
   `/auth/update-password`.
4. Confirm Supabase Dashboard `Site URL`, redirect allow list, and email
   templates do not contain an unintended localhost target.
