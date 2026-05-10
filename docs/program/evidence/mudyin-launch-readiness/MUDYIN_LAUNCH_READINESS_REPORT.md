# Mudyin Launch Readiness Report

Date: 2026-05-10

## Executive Summary

Status: partially ready.

Recommended first-live mode: hybrid launch - Vercel-hosted Mudyin frontend live at `https://www.mudyin.com`, with simplified general enquiry and booking-request flows. ANU can provide backend health, CORS, and registry/manifest resolution now, but full ANU-backed enquiries/bookings are not proven ready because the live backend reports Mudyin as registry-only with no active tenant node provisioned.

Readiness estimate: 82% for a credible first-live public site, 55% for full ANU-backed live operations.

## Repo Audit

Mudyin frontend: `C:\Dev\Kimi_Agent_Mudyin Digital Platform Blueprint\mudyin-web`

ANU backend: `C:\Dev\Flora_fauna\flora-fauna\backend`

Existing patterns found:

- Next.js frontend with app routes, Prisma, Jest, Playwright, Vercel config, white-label site registry, domain resolver, readiness/control routes.
- Flask ANU backend with public site/domain resolution, registry-only white-label support, CORS configuration, health endpoints, presence enquiry APIs, and control-plane routes separated from public APIs.
- Mudyin domain aliases already existed in ANU CORS defaults and backend white-label registry.

## Frontend Readiness

- Domain config: ready in code for `https://www.mudyin.com`; `mudyin-live.vercel.app` remains only as a deployment alias, not the canonical public URL.
- Env support: added/verified `NEXT_PUBLIC_SITE_SLUG`, `NEXT_PUBLIC_TENANT_KEY`, `NEXT_PUBLIC_API_BASE_URL`, and `NEXT_PUBLIC_PUBLIC_SITE_URL`.
- Visual identity: pass. Literal black/red/yellow flag-coded brand styling was removed from central tokens/classes and public UI treatments. New palette uses deep brown, soft cream, eucalyptus/sage, clay, and restrained muted gold.
- Forms: general enquiry and booking-request forms are accessible, mobile-friendly, consent-gated, honeypot-protected, and post to server-side routes.
- Intake mode: first-live fallback logging is active unless `ANU_PUBLIC_ENQUIRIES_ENDPOINT` and/or `ANU_PUBLIC_BOOKING_REQUEST_ENDPOINT` are explicitly configured.
- Live bookings: disabled. User-facing copy says request only, not confirmed booking.
- Donations: disabled for first launch; donation route now shows a paused notice.

## Backend Readiness

- Health: live backend `/health` returned 200 in smoke test.
- CORS: live backend allowed `https://mudyin.com`, `https://www.mudyin.com`, and `https://mudyin-live.vercel.app` preflights.
- Tenant/domain: live backend resolved `site=mudyin&host=www.mudyin.com`, but as registry-only. The response notes no active tenant node is provisioned yet.
- Enquiry: ANU full public enquiry endpoint for Mudyin is not proven ready. Frontend fallback is safe for first launch.
- Booking request: ANU full public booking-request endpoint is not proven ready. Frontend fallback is safe for first launch.
- Security/control plane: public manifest/domain resolution remains separate from control-plane routes; no backend secrets are exposed to the browser.
- White-label support: backend-only service support is partially ready; domain-bound tenant support needs active tenant/domain provisioning for full production use.

## First-Live Recommendation

Choose: Hybrid launch - frontend live + simplified enquiries/booking requests.

Do not launch as a full ANU-backed booking/enquiry system until ANU has durable public intake storage/email, active Mudyin tenant provisioning, and deployed endpoint tests passing.

## Blockers

Critical blockers for hybrid launch:

- None found in code after build/tests.

Launch blockers before switching DNS:

- Deploy the updated Mudyin frontend to the Vercel project.
- Add `mudyin.com` and `www.mudyin.com` to the Vercel project and configure Cloudflare DNS using Vercel-provided records.
- Retest hosted `/api/enquiries` and `/api/booking-request` after deployment. Current hosted `mudyin-live.vercel.app` returned 307 for those routes because it has not received this build yet.

Blockers for full ANU-backed launch:

- Provision an active Mudyin tenant node/domain binding in ANU, not registry-only fallback.
- Provide stable public ANU enquiry and booking-request endpoints or an approved storage/email integration.
- Add abuse controls around public intake at the durable backend layer.

Hardening items:

- Replace first-live fallback logging with durable storage or email delivery before scaling traffic.
- Add deployed e2e form submission checks after Vercel deploy.
- Address existing frontend lint warning: `src/components/community/CreatePostForm.tsx` unused `userId`.
- Backend tests pass but report SQLAlchemy `Query.get()` deprecation warnings and pytest cache write warnings.

Future enhancements:

- Full booking engine.
- Practitioner directory.
- Production events/workshops content APIs.
- Donations/payments after legal, charity, tax, and payment settings are approved.

## Commands Run

Frontend:

- `cmd /c npm run check:mudyin-theme` - passed.
- `cmd /c npm test -- --runTestsByPath src/lib/__tests__/mudyin-public-launch.test.ts` - 8 passed.
- `cmd /c npm test -- --runInBand` - 75 passed.
- `cmd /c npm run typecheck` - passed.
- `cmd /c npm run lint` - passed with 1 warning in `CreatePostForm.tsx`.
- `cmd /c npm run build` - passed.
- `python -m py_compile scripts\mudyin_launch_readiness_smoke.py` - passed.

Backend:

- `python -m py_compile app\services\public_site_service.py app\services\white_label_site_registry.py app\schemas.py` - passed.
- `python -m pytest tests/test_external_frontend_cors.py tests/test_public_site_manifest.py` - 16 passed.

Smoke:

- First run of `python scripts\mudyin_launch_readiness_smoke.py` failed because sandboxed network access was blocked with WinError 10013.
- Approved network rerun passed frontend health, backend health, CORS, and tenant manifest checks.

## Smoke Evidence

- Frontend URL `https://mudyin-live.vercel.app`: 200.
- Backend `/health`: 200.
- CORS preflight:
  - `https://mudyin.com`: 200, allowed.
  - `https://www.mudyin.com`: 200, allowed.
  - `https://mudyin-live.vercel.app`: 200, allowed.
- Tenant manifest: 200 and resolved for Mudyin, registry-only fallback note present.
- Hosted frontend intake:
  - `/api/enquiries`: unknown, 307 redirect on current hosted deployment.
  - `/api/booking-request`: unknown, 307 redirect on current hosted deployment.

## Modified Files

Key frontend files:

- `.env.example`
- `package.json`
- `docs/deployment/mudyin-domain-vercel-cloudflare.md`
- `scripts/check-mudyin-theme.mjs`
- `scripts/mudyin_launch_readiness_smoke.py`
- `src/lib/mudyin-public-config.ts`
- `src/lib/mudyin-intake.ts`
- `src/lib/white-label/site-registry.ts`
- `src/lib/white-label/env.ts`
- `src/lib/__tests__/mudyin-public-launch.test.ts`
- `src/app/api/enquiries/route.ts`
- `src/app/api/booking-request/route.ts`
- `src/app/api/contact/route.ts`
- `src/components/forms/ContactForm.tsx`
- `src/components/forms/BookingRequestForm.tsx`
- `src/components/forms/DonationForm.tsx`
- `src/app/contact/page.tsx`
- `src/app/donate/page.tsx`
- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/sitemap.ts`
- `src/components/sections/HeroSection.tsx`
- `src/components/sections/ProgramsShowcase.tsx`
- `src/components/sections/CTABand.tsx`
- `src/components/layout/Navigation.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/layout/UserProfileMenu.tsx`
- Public page/theme cleanup across about, programs, events, impact, news, resources, gallery, community, and marketplace pages.

Key backend files:

- `flora-fauna/backend/app/services/white_label_site_registry.py`
- `flora-fauna/backend/app/services/public_site_service.py`
- `flora-fauna/backend/app/schemas.py`
- `flora-fauna/backend/tests/test_external_frontend_cors.py`
- `flora-fauna/backend/tests/test_public_site_manifest.py`

## Final Assessment

Mudyin is ready for a public first-live deployment after the updated frontend is deployed to Vercel and domains are bound. ANU is ready for health, CORS, and registry-only white-label support, but not yet proven ready for durable full enquiries, booking requests, or live bookings.
