# GGM Pilot Admin Account Discovery

Date: 2026-05-22

## Existing Account And Auth Model

- App accounts are persisted in `backend/app/models.py` as `User` rows.
- JWTs resolve to `User` by username, email, or `global_subject_id` in the shared auth policy.
- Presence owner routes call `resolve_or_provision_presence_owner()`. A first-time external/Supabase owner can be provisioned as a least-privilege `participant`, but privileged email-only matching is intentionally refused until a stable subject-linked app user exists.
- The existing highest internal admin role used by Presence owner overrides and control-plane permissions is `platform_admin`. Roles are stored in the single persisted `User.role` field rather than in a join table.

## Presence Ownership And Admin Checks

- GGM Room ownership is `PresenceNode.owner_user_id`.
- Owner Studio, Room analytics, Presence Pass, and RoomKey endpoints require either the owning `User.id` or `User.role == "platform_admin"`.
- Control-plane endpoints use `control_plane_required(...)`, a control JWT, configured control hosts, and the shared secret posture for hosted runtimes.
- The existing GGM pilot setup result identifies the tagged pilot Room slug as `ggm-christina-goddard`; the current proof owner is a smoke/onboarding fixture owner that should be replaced by the real pilot owner only through a tagged provisioning operation.

## Billing And Entitlement Surface

- The repo has legacy membership billing tables (`MembershipPlan`, `Subscription`, Stripe webhook events) and a Presence Room `plan_type`.
- The legacy subscription table requires a membership plan and is Stripe-oriented. It is not a safe representation of an internal zero-price lifetime Presence pilot comp.
- No formal user-level Presence plan entitlement table was found for `internal_lifetime_free` or `comped_for_life`.

## Safe Provisioning Model

- Use the existing `platform_admin` role for the account's superuser grant.
- Link the account to the GGM Room by setting the tagged GGM `PresenceNode.owner_user_id`.
- Add an additive Presence-specific entitlement record for an active internal lifetime comp with zero price, no expiry, pilot source/reason metadata, and no Stripe subscription identity.
- Provisioning must be idempotent and must not grant any role from entitlement state.
- Hosted apply must dry-run against the confirmed backend DB first. If `e4hatu@gmail.com` has not yet become a subject-linked app user in the hosted auth flow, the hosted result must remain pending first sign-in or explicit identity binding instead of fabricating an external provider identity.

## Risks And Blockers

- Reassigning the GGM Room owner changes the existing proof owner linkage; the operation needs output evidence and metadata preserving the prior owner ID for rollback.
- A privileged row created from email alone may not satisfy Presence owner identity resolution for an external Supabase token. Hosted verification needs either an existing `global_subject_id` binding or a real signed-in/token-backed account.
- Entitlement schema must be deployed to the hosted DB before hosted comp assignment can be verified.
