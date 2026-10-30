# ExecPlan: Presence experience manifest v1 contract

## Gate

Presence V3.4 Gate 7 public-execution contract work. This is an internal V5 Gate 4 candidate, not Gate 7 acceptance.

## Objective

Define a validated, versioned manifest that a trusted scene runtime can consume while referencing public Falak data by canonical identity.

## Current state

Flask Presence already has `PresenceNode` and versioned `PresenceEditableConfig` rows with explicit published and archived states. The existing Studio customisation manifest is a design-options catalogue, not an experience runtime manifest. Falak now has published-only transport discovery routes on the preceding branch.

## Scope and risk

Add a pure contract validator, example fixture, focused tests and frontend integration notes. Include trusted module identifiers, compatibility, assets, content bindings, navigation, interaction state, performance, fallbacks and published snapshot identity. No database migration, route, publish action, scene execution, asset upload or mutable live state. Risk is medium: a permissive contract could later enable draft-data or untrusted-module exposure.

## Milestones

1. Define strict v1 fields and cross-field validation, including a digest over the canonical JSON payload.
2. Demonstrate a Sydney rail manifest referencing the Falak discovery contract without embedding private data or executable code.
3. Test valid and invalid manifests; document where future publish-time and runtime authorisation must be enforced.

## Rollback

Remove the contract module, fixture, tests and docs. No persisted data or existing runtime behaviour changes.
