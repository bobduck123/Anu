# PEACH Gate 6 Audit Log

Status: implemented

## Durable Audit Store

Audit events are stored in the SQLite `AuditLog` table.

Fields recorded:

- id
- eventType
- actorType
- actorId
- targetType
- targetId
- metadataJson
- createdAt

## Audited Events

- `contribution.created`
- `consent_record.created`
- `contribution.review_status_changed`
- `support_intent.created`
- `consent_operation.requested`
- `steward.login_succeeded`
- `steward.login_failed`

## Steward Visibility

The steward review page shows recent audit events below the contribution queue and consent operation requests.

## Privacy Considerations

Audit metadata intentionally avoids storing contribution body text. It records status, ids, consent version, support path, and public display state.

## Future Expansion

- Immutable append-only audit store.
- Actor identity tied to real steward accounts.
- Exportable audit reports.
- Audit retention policy.
- Alerts for suspicious abuse/rate-limit patterns.
