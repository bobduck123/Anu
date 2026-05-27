# Hosted Smoke Steps

Run after frontend and backend deployment.

## Recovery Baseline

1. Log in once as the controlled owner.
2. Open `/studio/11/editor`.
3. Confirm Studio loads instead of showing `Studio is unavailable` or Owner Access.
4. Inspect the owner/debug diagnostics: private mode must be shown as inactive
   unless its migration and storage checks were deliberately completed.
5. Open Images and confirm either protected upload is proven active or the
   honest public-safe fallback note appears.
6. Upload a harmless non-sensitive test image under fallback mode, or a
   harmless protected image only after private mode verification.
7. Assign it to a draft slot and save.
8. Confirm anonymous `/presence/ggm-christina-goddard` remains unchanged
   before publish.
9. Open authenticated draft preview and confirm the draft image/change.
10. Publish through **Open room to visitors** and confirm public rendering.
11. Restore the original image/copy and publish cleanup.

## Room Entry And Hygiene

12. Open `/room/11/key` anonymously and confirm it redirects into and renders
    the published room.
13. Confirm it does not claim NFC/QR token attribution unless opened through a
    real `/r/[token]` link.
14. Inspect source/rendered HTML on:
    - `/presence/ggm-christina-goddard`
    - `/p/ggm-christina-goddard`
    - a work detail page
    - `/room/11/key`
15. Confirm no internal field names, draft paths, signed draft URLs, tokens,
    private owner metadata or secrets are present.

## V1C Enablement Only If Intended

16. Confirm the media migration is applied.
17. Confirm the protected draft bucket rejects anonymous reads.
18. Configure the verification flag only after that check.
19. Redeploy/restart and repeat upload, preview, publish and cleanup using a
    harmless image before any sensitive content is accepted.
