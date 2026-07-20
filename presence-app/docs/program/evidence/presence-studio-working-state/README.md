# Presence Studio Working-State Evidence

Date: 2026-07-20

## Scope proved

- Studio V2 remains the canonical editor for explicitly eligible V2 rooms; the legacy editor remains compatibility-only and Studio Room remains a separate template workflow.
- Ordinary V2 draft edits use a debounced autosave that never publishes and preserves local changes after a failed autosave.
- Canvas transforms remain explicitly saved after the gesture settles; the save/reload regression verifies drag, scale, and rotation values in the acknowledged draft payload and after reload.
- The private preview uses the existing sanitized V2 public-renderer projection.
- The controlled GGM Room 11-shaped local fixture removes share and publish affordances in both editor and preview. No publish request is made.
- Existing public GGM containment, an unrelated demo, a backend-published room, responsive device controls, and renderer hygiene all remain covered by the targeted suite.

## Validation run

```text
npm run typecheck
npm run test:e2e -- [5 targeted specs] --project=chromium --retries=0 --workers=1
```

Result: typecheck passed; 11/11 Chromium checks passed.

The test server was an isolated local Next process configured only with the repository's existing mock API and test authentication flag. The normal project E2E launcher infers `C:\Dev` as the workspace root because another lockfile exists there, so this focused run used the app-rooted local server instead. This is a harness limitation, not a production result.

## What this does not prove

- No real GGM Candidate A owner session, credential, auth subject, or backend draft was read or changed.
- No hosted owner Studio workflow was exercised.
- No GGM media access, upload/crop persistence, history integration, public release, deployment, or publish workflow was added.
- No fallback was removed beyond the already-deployed contained-GGM public route policy.

GGM remains private working proof. This evidence is not launch evidence and must not be presented as a system-native migration.

## Follow-up gate

Before claiming a real GGM migration, complete a separately authorised hosted owner-bound diagnostic/proof against the controlled backend room. It must show the actual owner scope, draft read/save/reload, authenticated private preview, and continued private/public containment without exposing private data.
