# Media Backend Capability Audit

## Existing Capabilities Found

| Capability | Location | Decision |
| --- | --- | --- |
| Owner node media upload | `presence-app/lib/api/owner.ts`, backend `/api/presence/owner/nodes/{id}/media` | Real, but belongs to legacy node editing fields rather than Canvas draft config. Not surfaced in V1A. |
| Editor asset listing and attach-by-link | editor client and backend presence editor asset routes | Existing advanced workflow; normal Media drawer uses safe listed candidates rather than exposing link mechanics. |
| Nested draft image replacement | Canvas mutations and editor draft save endpoint | Used for V1A image selection and alt text. |
| Public image URL safety validation | `presence-app/lib/editor/assetValidator.ts` and backend editor validation | Preserved. Candidate lists are already constrained through existing Canvas media construction. |

## Upload Decision

Although a node-level file uploader exists, the Canvas Builder's proof depends on edits flowing through its nested draft config and explicit publish. No verified endpoint currently uploads a new image directly into that editor draft contract with the same privacy and publish semantics.

Accordingly:

- V1A does not present device upload as working.
- No backend schema or storage route was changed.
- V1B must introduce or adapt a draft-scoped secure upload path, prove draft privacy, and then wire Media drawer progress and attachment.

## Crop and Focal Point

No proven focal-point field and public renderer parity contract was identified in this pass. Neither crop nor focal point is enabled. V1B requires an agreed nested draft field, renderer support, preview/public parity tests, and safe image processing policy.

