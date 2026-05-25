# Publish Readiness Fix

## Symptom

The hosted Canvas showed a hero/primary image while its publish action was blocked with:

`Primary artwork or hero image is missing.`

## Failure Path

Canvas renders the GGM room through the shared render model, which can produce a valid visible hero image from the room's effective published/inherited media. Publish readiness inspected raw authored draft asset paths independently, so it could not see the same image.

## Repair

- `buildReadinessReport()` now resolves the candidate draft room using `resolveRenderModel(..., "draft")`.
- For `ggm-faithful-room-v1`, the primary media requirement passes when the resolved draft hero slides or visible works include a valid publishable image.
- For other renderers, the existing conservative authored-media check remains.
- URL safety checks continue to block unsafe authored assets.

## Verified Locally

- A GGM draft with stripped authored media but a resolver-visible canonical hero displays the image and enables `Open room to visitors`.
- A generic room without authored/resolved imagery remains blocked.
- An unsafe image URL remains a critical blocker.

## Operator Meaning

The owner is no longer blocked from publishing a valid image they can already see in their draft room. A genuinely image-less or unsafe room still cannot be opened to visitors.
