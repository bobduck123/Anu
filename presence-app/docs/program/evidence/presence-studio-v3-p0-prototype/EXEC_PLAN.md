# Execution Plan

1. Add pure Studio V3 source references, model types, compiler, fingerprinting, local envelopes, feature gate, and V2 renderer bridge contract.
2. Mount the prototype only through existing `/studio/[id]/editor` when the local/test BBB gate is enabled.
3. Reuse `PresenceStudioV2PublicRoom` as the live canvas and intercept visitor actions through a synchronous editor bridge.
4. Add local Piece/Collection placement, one visible Look loop, one layer lock, named Look save/alter/restore, and browser-local envelopes.
5. Prove public output invariance and absence of server writes through tests and request-ledger checks.

Explicit exclusions: no `/editor-v3`, no Save Draft runtime, no server Visitor Preview, no publish, no hosted mutation, no backend/auth/tenant changes, no P1/M1 scope.
