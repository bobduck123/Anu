# Presence Studio V2 Public Style Presets S6A Hosted Smoke

Date: 2026-06-09
Scope: Hosted deployment and smoke verification for S6A Public Style Presets + Christina Liquid Gallery.

## Deployment

- Production alias: `https://your-presence.vercel.app`
- Deployment URL: `https://presence-ektpmsott-emadhatu-2110s-projects.vercel.app`
- Deployment ID: `dpl_8Cuyuyq1sgYSpznp6jwTVNbge8Bz`
- Deployed commit: `1e4a570ae95cf154870980cdb43f1c49a91d3796`
- Deployed with: `npx vercel@latest --prod`
- S4A status: parked in `stash@{0}`, not deployed

## Public-Status Gate

Initial hosted smoke found a state mismatch before bbbvision work began:

- Owner editor for Room 11 mounted V2 and showed the S6A style selector.
- Owner preview rendered the V2 public room.
- Anonymous public backend endpoint returned `404 not_found`.
- Production public route fell back to the stale local GGM demo fixture, which still rendered `ggm-faithful-room-v1`.

Read-only owner API check showed:

```txt
Room 11 draft config: presence-studio-v2-room
Room 11 published config: presence-studio-v2-room
Owner node status: unpublished
Owner node public_status: draft
Public endpoint: 404
```

The existing Studio V2 draft publish endpoint returned `200` but did not change node publication status. The existing owner node publish endpoint was then used:

```txt
POST /api/presence/owner/nodes/11/publish
```

Result:

```txt
Node status: published
Node public_status: public
Public endpoint: 200
Public renderer_key: presence-studio-v2-room
```

No content edits, media replacements, draft writes, S4A changes, or bbbvision changes were made.

## Hosted Smoke

Command:

```txt
npx.cmd playwright test presence-studio-v2-public-style-presets-hosted-smoke.spec.ts --project=chromium --workers=1
```

Result:

```txt
1 passed (18.7s)
```

Verified:

- Studio V2 editor mounts on Room 11.
- Public style selector is hosted.
- Gallery P2 and Christina / Liquid Gallery options are visible.
- Owner preview renders clean V2 Gallery P2 output.
- Public `/p/ggm-christina-goddard` renders clean V2 Gallery P2 output.
- Public `/presence/ggm-christina-goddard` renders clean V2 Gallery P2 output.
- Public artwork focus/lightbox opens and Escape closes it.
- Mobile public render remains clean.
- Legacy `/p/hesmaddw` remains outside V2.
- No S6A style selector labels, S5 asset panel labels, editor controls, private config names, auth strings, or owner API paths leak publicly.

## Evidence

Evidence path:

```txt
docs/program/evidence/presence-studio-v2-public-style-presets-s6a-hosted/
```

Captured:

- `01-hosted-studio-style-selector.png`
- `02-hosted-owner-preview-gallery-p2-clean.png`
- `03-hosted-public-gallery-p2-clean.png`
- `04-hosted-public-lightbox-clean.png`
- `05-hosted-presence-alias-clean.png`
- `06-hosted-mobile-gallery-p2-clean.png`
- `07-hosted-legacy-negative.png`

## Verdict

- Hosted S6A editor readiness: ready.
- Hosted owner preview readiness: ready.
- Hosted public output readiness: ready.
- Hosted payload hygiene readiness: ready for this smoke scope.
- Live legacy isolation readiness: ready.
- Controlled operator-led pilot readiness: ready with operator support.
- Public self-serve onboarding readiness: not ready.

S6A can be locked as the hosted style-preset baseline before the bbbvision pilot work starts.
