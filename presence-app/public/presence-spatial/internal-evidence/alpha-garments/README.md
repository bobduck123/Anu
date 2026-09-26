# Synthetic alpha-masked garment test artwork

**Internal evidence media. Not product artwork, and not Mobstar creative.**

Every file here is generated procedurally by
`scripts/generate-alpha-garment-test-media.mjs` — flat analytic shapes on a fully
transparent background, with a baked `TEST` wordmark and an `F`/`B` face letter.

They exist to prove one rendering property: the artwork alpha channel, not the
carrier plane, defines the visible garment silhouette.

No photography, no brand marks, no licensed material, no product facts.
Regenerate with:

    node scripts/generate-alpha-garment-test-media.mjs
