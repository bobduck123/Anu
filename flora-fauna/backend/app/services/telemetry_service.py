from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from ..extensions import db
from ..hell_models import TelemetryEvent


SCHEMA_VERSION = "1.0.0"


@dataclass(frozen=True)
class EventSchemaRule:
    required: dict[str, str]
    optional: dict[str, str] | None = None


EVENT_SCHEMA_RULES: dict[str, EventSchemaRule] = {
    "NEED_CREATED_DRAFT": EventSchemaRule(
        required={"status": "str", "category": "str", "severity": "str", "requested_units": "int", "sensitive": "bool"},
        optional={"microcosm_id": "int"},
    ),
    "NEED_SUBMITTED": EventSchemaRule(required={"status": "str"}),
    "NEED_STATUS_CHANGED": EventSchemaRule(required={"from_state": "str", "to_state": "str"}),
    "NEED_VERIFICATION_VOUCHED": EventSchemaRule(required={"need_id": "int", "vote": "str", "voter_role": "str"}),
    "NEED_VERIFICATION_REVOKED": EventSchemaRule(required={"need_id": "int", "vote": "str"}),
    "NEED_VERIFIED": EventSchemaRule(required={"status": "str", "quorum_met": "bool"}),
    "NEED_ROUTING_ACTIVATED": EventSchemaRule(required={"status": "str"}),
    "NEED_ROUTING_THROTTLED": EventSchemaRule(required={"status": "str", "queue_position": "int", "capacity": "int"}),
    "NEED_MATCHED": EventSchemaRule(required={"offer_id": "int", "score": "number"}),
    "NEED_PARTIALLY_FULFILLED": EventSchemaRule(required={"fulfilled_units": "int", "requested_units": "int"}),
    "NEED_FULFILLED_PENDING_PROOF": EventSchemaRule(required={"fulfilled_units": "int", "requested_units": "int"}),
    "NEED_FULFILLMENT_CONFIRMED": EventSchemaRule(required={"proof_ref": "str"}),
    "NEED_CLOSED_FULFILLED": EventSchemaRule(required={"status": "str", "closed_at": "datetime"}),
    "OFFER_CREATED_PROPOSED": EventSchemaRule(
        required={"status": "str", "category": "str", "contribution_type": "str", "capacity_units": "int"},
        optional={"microcosm_id": "int"},
    ),
    "OFFER_MATCHED_TO_NEED": EventSchemaRule(required={"status": "str", "need_id": "int", "score": "number"}),
    "OFFER_ACCEPTED": EventSchemaRule(required={"status": "str", "need_id": "int"}),
    "OFFER_IN_PROGRESS": EventSchemaRule(required={"status": "str"}),
    "OFFER_DELIVERED_PENDING_CONFIRMATION": EventSchemaRule(required={"status": "str", "proof_ref": "str"}),
    "OFFER_CONFIRMED": EventSchemaRule(required={"status": "str", "contribution_type": "str", "impact_credits_delta": "number"}),
    "CONTRIBUTION_CONFIRMED": EventSchemaRule(
        required={
            "offer_id": "int",
            "need_id": "int",
            "contribution_type": "str",
            "units": "number",
            "impact_credits_delta": "number",
            "trust_delta": "number",
        }
    ),
    "MICROCOSM_STATE_CHANGED": EventSchemaRule(required={"from_state": "str", "to_state": "str", "microcosm_id": "int"}),
    "TREASURY_STATE_CHANGED": EventSchemaRule(required={"from_state": "str", "to_state": "str", "amount_cents": "int"}),
    "INCIDENT_STATE_CHANGED": EventSchemaRule(required={"from_state": "str", "to_state": "str", "incident_id": "int"}),
    "PROJECTOR_REBUILT": EventSchemaRule(required={"projector": "str", "version": "str", "last_event_id": "int"}),
    "DUMB_DUMB_FRONTPAGE_VIEW": EventSchemaRule(required={"surface": "str"}),
    "DUMB_DUMB_LIST_VIEW": EventSchemaRule(required={"list_slug": "str"}),
    "DUMB_DUMB_ITEM_CLICK": EventSchemaRule(required={"item_id": "int", "list_slug": "str"}),
    "DUMB_DUMB_CHECKOUT_STARTED": EventSchemaRule(required={"item_id": "int", "list_slug": "str", "destination_pool_id": "int"}),
    "DUMB_DUMB_PURCHASE_COMPLETED": EventSchemaRule(
        required={"purchase_id": "int", "item_id": "int", "destination_pool_id": "int", "amount_cents": "int"}
    ),
    "DUMB_DUMB_CREATOR_ITEM_CREATED": EventSchemaRule(required={"item_id": "int", "list_id": "int"}),
}


def _matches_type(value: Any, expected: str) -> bool:
    if expected == "str":
        return isinstance(value, str)
    if expected == "int":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "float":
        return isinstance(value, float)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if expected == "bool":
        return isinstance(value, bool)
    if expected == "dict":
        return isinstance(value, dict)
    if expected == "list":
        return isinstance(value, list)
    if expected == "datetime":
        return isinstance(value, (datetime, str))
    return False


def validate_event_props(event_type: str, props_json: dict[str, Any]) -> None:
    if event_type not in EVENT_SCHEMA_RULES:
        raise ValueError(f"Unsupported event_type for strict telemetry validation: {event_type}")
    rule = EVENT_SCHEMA_RULES[event_type]

    for key, expected_type in rule.required.items():
        if key not in props_json:
            raise ValueError(f"Event {event_type} missing required property: {key}")
        if not _matches_type(props_json[key], expected_type):
            raise ValueError(f"Event {event_type} property {key} must be {expected_type}")

    if rule.optional:
        for key, expected_type in rule.optional.items():
            if key in props_json and props_json[key] is not None and not _matches_type(props_json[key], expected_type):
                raise ValueError(f"Event {event_type} optional property {key} must be {expected_type}")


def _canonical_event_hash(event_payload: dict[str, Any]) -> str:
    normalized = json.dumps(event_payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def emit_telemetry_event(
    *,
    actor_id: int | None,
    entity_type: str,
    entity_id: str,
    event_type: str,
    props_json: dict[str, Any] | None,
    node_id: int | None,
    consent_flags: dict[str, Any] | None = None,
    signature: str | None = None,
    schema_version: str = SCHEMA_VERSION,
    strict: bool = True,
) -> TelemetryEvent:
    props = props_json or {}
    if strict:
        validate_event_props(event_type, props)
    event_payload = {
        "actor_id": actor_id,
        "entity_type": entity_type,
        "entity_id": str(entity_id),
        "event_type": event_type,
        "props_json": props,
        "node_id": node_id,
        "consent_flags": consent_flags or {},
        "schema_version": schema_version,
    }
    evidence_hash = _canonical_event_hash(event_payload)
    event = TelemetryEvent(
        actor_id=actor_id,
        entity_type=entity_type,
        entity_id=str(entity_id),
        event_type=event_type,
        props_json=props,
        node_id=node_id,
        consent_flags=consent_flags or {},
        signature=signature,
        evidence_hash=evidence_hash,
        schema_version=schema_version,
    )
    db.session.add(event)
    db.session.flush()
    return event


def list_events(
    *,
    node_id: int | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    event_types: list[str] | None = None,
) -> list[TelemetryEvent]:
    query = TelemetryEvent.query
    if node_id is not None:
        query = query.filter_by(node_id=node_id)
    if entity_type:
        query = query.filter_by(entity_type=entity_type)
    if entity_id:
        query = query.filter_by(entity_id=str(entity_id))
    if event_types:
        query = query.filter(TelemetryEvent.event_type.in_(event_types))
    return query.order_by(TelemetryEvent.id.asc()).all()
