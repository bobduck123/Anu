# Presence ANU Integration Map

Presence is a standalone product frontend backed by ANU-native platform services.
The frontend deploys independently at `https://presence-gilt.vercel.app`, while
identity, ownership, storage, enquiries, notifications, analytics, and public API
boundaries are handled by the ANU backend and database.

Last updated: 2026-05-09

## Status Legend

| Status | Meaning |
|---|---|
| In place | ANU-native integration is implemented. |
| Adapter | Presence-specific adapter exists and is the first candidate for a reusable ANU module. |
| Bridged | Integrated with known gaps documented here. |
| Deferred | Explicit follow-up, not claimed as ready. |

## Current Map

| Domain | Status | Detail |
|---|---|---|
| Frontend | In place | Presence remains a standalone Vercel app and product surface. It must point to the ANU backend and ANU Supabase project. |
| Auth | In place | Supabase JWTs are validated by the ANU backend using the ANU Supabase signing configuration. |
| Owner identity | In place | `presence_owner_identity.resolve_or_provision_presence_owner` maps JWT `sub` to ANU `User.global_subject_id`. First-time users are provisioned as least-privilege `participant` users. |
| Database | In place | Presence rows live in ANU Postgres: `presence_node`, `presence_work`, `presence_collection`, `presence_enquiry`, `presence_connection`, `presence_interaction`, `presence_analytics_event`, `presence_beta_application`, `presence_nfc_tag`, and `presence_template`. |
| Public API | In place | `/api/presence/public/*` is the public read and enquiry surface. Public routes still hide draft, private, suspended, archived, and deleted Presences. |
| Owner API | In place | `/api/presence/owner/*` requires a valid Supabase bearer token and remains owner-scoped. |
| CORS | In place | Backend CORS must allow `https://presence-gilt.vercel.app` plus the existing ANU frontends. Preflight must complete before auth checks. |
| Canonical public URLs | In place | Public page URLs are Presence frontend URLs, for example `https://presence-gilt.vercel.app/p/<slug>`. Backend API URLs stay under `/api/presence/public/*`. |
| Wrong-host redirect | In place | Backend `/p/<slug>` paths redirect to the Presence frontend origin so users do not see backend-host 404s. |
| Upload/media | Adapter | `flora-fauna/backend/app/services/presence_media_storage.py` is currently the first ANU media-adapter candidate. No broader shared ANU upload module was found in this pass. |
| Enquiries | In place | `PresenceEnquiry` is the source-of-truth object. Email is one contact route, not the source of truth. |
| Notifications | Bridged | The basic ANU `Notification(user_id, message, is_read, timestamp)` model is reused to alert owners when an enquiry arrives. Rich notification types and deep links are deferred. |
| Messaging | Deferred | The existing ANU `Message(sender_id, receiver_id, content, timestamp)` model is too basic for anonymous-to-owner threads. Presence does not claim direct messaging yet. |
| Analytics | In place | Enquiry submission still creates `PresenceConnection`, `PresenceInteraction`, and `PresenceAnalyticsEvent` records. |

## Identity Flow

1. A visitor signs in or signs up through the ANU Supabase project.
2. The Presence frontend sends the Supabase access token to ANU backend owner routes.
3. The backend validates the JWT.
4. The backend resolves or provisions a local least-privilege ANU `User`.
5. Owner routes use that local `User.id` for ownership checks.

For public enquiry submission, auth is optional. If a valid bearer token is
present, the backend links the enquiry to `PresenceEnquiry.submitter_user_id`.
If no valid token is present, anonymous enquiry submission still works.

## Enquiry Contract

`PresenceEnquiry` is the internal source of truth. It is not an email-only form.

`email` is nullable. A public enquiry must include:

- `name`
- `message`
- `consent: true`
- `preferred_contact_method`
- at least one valid contact route for the selected method

Allowed contact routes:

- `email`
- `phone`
- `sms`
- `handle`
- `in_studio`
- `any`

Validation rules:

- `email` requires an email address.
- `phone` and `sms` require a phone number.
- `handle` requires a contact handle or website.
- `in_studio` and `any` require at least one of email, phone, or handle.

Successful public enquiry submission creates:

1. `PresenceEnquiry`
2. `PresenceConnection`
3. `PresenceInteraction`
4. `PresenceAnalyticsEvent`
5. an owner `Notification` when the node has an owner

Notification creation is non-critical. A notification failure must not roll back
the enquiry itself.

The public response is intentionally small and does not expose owner private
fields, visitor contact details, or `submitter_user_id`.

## Studio Inbox

The Studio enquiry inbox is the privileged owner surface for enquiry detail. It
shows:

- enquiry type
- status
- preferred contact method
- contact route summary
- email, phone, handle, and source URL when supplied
- ANU member badge when `submitter_user_id` is present
- message preview and full message

Cross-owner access remains denied by the owner API.

## Upload And Media Status

No broader ANU upload module was found during this continuation. The current
Presence implementation uses `presence_media_storage.py` as a narrow backend
adapter.

Current media architecture:

- backend-only Supabase Storage integration
- frontend never receives `SUPABASE_SERVICE_ROLE_KEY`
- JPG, PNG, and WEBP accepted
- SVG and unknown MIME types rejected
- default 8 MB cap
- owner-scoped media paths
- media fields saved back to Presence node, work, or collection records

Required backend env:

```text
PRESENCE_MEDIA_STORAGE_BACKEND=supabase
PRESENCE_MEDIA_BUCKET=presence-media
SUPABASE_URL=<ANU Supabase URL>
SUPABASE_SERVICE_ROLE_KEY=<ANU Supabase service-role key, backend only>
PRESENCE_MEDIA_MAX_BYTES=8388608
```

Future generalisation path: if ANU gains a shared `upload_service` or media
module, fold `presence_media_storage.py` into that module rather than duplicating
storage logic in product modules.

## Deployment Notes

Required migration:

```text
flora-fauna/backend/migrations/versions/20260508_presence_enquiry_submitter_user.sql
```

The migration:

- makes `presence_enquiry.email` nullable
- adds `presence_enquiry.submitter_user_id`
- adds an index for `submitter_user_id`
- links `submitter_user_id` to `user.id`

Deploy order:

1. Deploy backend code.
2. Apply backend migrations.
3. Confirm `/api/presence/public/*` and `/api/presence/owner/*` are available.
4. Redeploy the Presence frontend.

Required backend env:

```text
CORS_ORIGINS=https://presence-gilt.vercel.app,<existing origins>
PRESENCE_PUBLIC_ORIGIN=https://presence-gilt.vercel.app
SUPABASE_JWT_SECRET=<ANU Supabase JWT secret if HS256 is used>
PUBLIC_JWT_SECRET_KEY=<ANU public JWT secret>
CONTROL_JWT_SECRET_KEY=<ANU control JWT secret>
```

Required Presence frontend env:

```text
NEXT_PUBLIC_PRESENCE_API_BASE_URL=https://anu-back-end.vercel.app
NEXT_PUBLIC_API_BASE=https://anu-back-end.vercel.app
NEXT_PUBLIC_PRESENCE_PUBLIC_ORIGIN=https://presence-gilt.vercel.app
NEXT_PUBLIC_SUPABASE_URL=<same ANU Supabase URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANU Supabase anon key>
NEXT_PUBLIC_PRESENCE_ALLOW_SIGNUPS=true
NEXT_PUBLIC_PRESENCE_REQUIRE_EMAIL_VERIFICATION=false
```

The Supabase service-role key must never appear in the Presence frontend.

## Remaining Next Passes

- Build a robust ANU direct messaging/thread model.
- Add richer notification types, links, and source metadata.
- Add a Studio notification feed after notification links exist.
- Port original high-value templates as real data-driven display modes.
- Generalise the Presence media adapter if other ANU modules need uploads.
- Extend hosted smoke coverage for enquiry submission and owner inbox checks.
