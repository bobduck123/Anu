# PEACH Docs Imported From Standalone

Status: imported
Date: 2026-07-30
Source: C:\Dev\PEACH\docs\peach
Destination: C:\Dev\Flora_fauna\docs\peach

## Import Rule

All PEACH_*.md files from the standalone proof repository were copied into ANU docs/peach so ANU carries the accepted Gate 0-6 record forward. The standalone repo remains reference material, but future PEACH decisions should be made in the ANU repo.

## Minimum Accepted Documents Preserved

- PEACH_CANON.md
- PEACH_GLOSSARY.md
- PEACH_ANTI_PATTERNS.md
- PEACH_PHASE_1_SCOPE.md
- PEACH_FIELD_V1_SPEC.md
- PEACH_DATA_MODEL_V1_SPEC.md
- PEACH_PHASE_1_API_CONTRACTS.md
- PEACH_PHASE_1_SCHEMA_IMPLEMENTATION_PLAN.md
- PEACH_GATE_6_READINESS.md

## Gate 6 Safety Documents Preserved

- PEACH_GATE_6_ABUSE_PROTECTION.md
- PEACH_GATE_6_AUDIT_LOG.md
- PEACH_GATE_6_AUTH_DECISION.md
- PEACH_GATE_6_CONSENT_OPERATIONS.md
- PEACH_GATE_6_DEPENDENCY_REVIEW.md
- PEACH_GATE_6_EVIDENCE.md
- PEACH_GATE_6_PERSISTENCE_DECISION.md
- PEACH_GATE_6_PRIVATE_STAGING_PILOT_PLAN.md
- PEACH_GATE_6_READINESS.md

## Ownership Change

The imported documents are not a signal that the standalone app remains production-bound. They are ANU migration inputs. ANU-native specs in this folder supersede standalone implementation details when there is a conflict.

## Notes

The standalone docs still mention local SQLite and private staging scaffolds. Those statements remain historically accurate for Gate 6 but are not ANU production architecture.
