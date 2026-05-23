from __future__ import annotations

import hashlib
import secrets
from typing import Any

from flask import current_app, request

from ..extensions import db
from ..models import Encounter, PresenceNode, PresencePass, RoomKey
from ..time_utils import now_utc
from .presence_editor_config import public_config_for_room
from .presence_service import PresenceValidationError, public_url_for_node, serialize_public_card


PASS_TYPES = {"phone", "nfc_card", "qr", "wallet", "badge", "sticker", "poster", "short_link"}
PASS_STATUSES = {"active", "paused", "revoked"}
KEY_TYPES = {"nfc", "qr", "short_link", "wallet", "badge", "sticker", "poster", "direct"}
KEY_STATUSES = {"active", "paused", "revoked"}
ENCOUNTER_SOURCES = {"nfc", "qr", "direct", "event", "poster", "wallet", "share", "short_link", "unknown", "badge", "sticker"}
VISITOR_TYPES = {"guest", "observer", "room_owner", "unknown"}
PRIVACY_LEVELS = {"aggregate_only", "observer_known", "revealed"}


def clean_str(value: Any, max_len: int) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text[:max_len]


def validate_choice(value: Any, allowed: set[str], *, field: str, default: str | None = None) -> str:
    text = clean_str(value, 80) or default
    if not text or text not in allowed:
        raise PresenceValidationError(f"Unsupported {field}.", details={field: sorted(allowed)})
    return text


def _json_object(value: Any) -> dict | None:
    if value is None:
        return None
    if not isinstance(value, dict):
        raise PresenceValidationError("metadata must be an object.")
    return value


def _new_room_key_token() -> str:
    while True:
        token = secrets.token_urlsafe(24)
        if not RoomKey.query.filter_by(public_token=token).first():
            return token


def hash_privacy_metadata(value: str | None) -> str | None:
    text = clean_str(value, 700)
    if not text:
        return None
    secret = str(current_app.config.get("SECRET_KEY") or "presence-dev-secret")
    return hashlib.sha256(f"{secret}:{text}".encode("utf-8")).hexdigest()


def create_pass(room: PresenceNode, owner, data: dict[str, Any]) -> PresencePass:
    pass_type = validate_choice(data.get("pass_type"), PASS_TYPES, field="pass_type", default="qr")
    status = validate_choice(data.get("status"), PASS_STATUSES, field="status", default="active")
    label = clean_str(data.get("label"), 160) or f"{pass_type.replace('_', ' ').title()} Presence Pass"
    row = PresencePass(
        room_id=room.id,
        owner_id=getattr(owner, "id", None),
        pass_type=pass_type,
        label=label,
        status=status,
        metadata_json=_json_object(data.get("metadata") or data.get("metadata_json")),
    )
    db.session.add(row)
    return row


def list_room_passes(room: PresenceNode) -> list[PresencePass]:
    return PresencePass.query.filter_by(room_id=room.id).order_by(PresencePass.created_at.desc(), PresencePass.id.desc()).all()


def update_pass_status(row: PresencePass, data: dict[str, Any]) -> PresencePass:
    if "status" in data:
        row.status = validate_choice(data.get("status"), PASS_STATUSES, field="status")
    if "label" in data:
        row.label = clean_str(data.get("label"), 160) or row.label
    if "metadata" in data or "metadata_json" in data:
        row.metadata_json = _json_object(data.get("metadata") or data.get("metadata_json"))
    return row


def create_room_key(room: PresenceNode, owner, data: dict[str, Any], *, presence_pass: PresencePass | None = None) -> RoomKey:
    key_type = validate_choice(data.get("key_type"), KEY_TYPES, field="key_type", default="direct")
    status = validate_choice(data.get("status"), KEY_STATUSES, field="status", default="active")
    pass_id = getattr(presence_pass, "id", None)
    if pass_id is None and data.get("presence_pass_id"):
        try:
            pass_id = int(data.get("presence_pass_id"))
        except (TypeError, ValueError):
            raise PresenceValidationError("presence_pass_id must be an integer.")
        found = PresencePass.query.get(pass_id)
        if not found or found.room_id != room.id:
            raise PresenceValidationError("Presence Pass not found for this Room.")
    row = RoomKey(
        room_id=room.id,
        presence_pass_id=pass_id,
        key_type=key_type,
        public_token=_new_room_key_token(),
        campaign_label=clean_str(data.get("campaign_label"), 160),
        physical_batch_id=clean_str(data.get("physical_batch_id"), 120),
        status=status,
        created_by=getattr(owner, "id", None),
        metadata_json=_json_object(data.get("metadata") or data.get("metadata_json")),
    )
    db.session.add(row)
    return row


def update_room_key(row: RoomKey, data: dict[str, Any]) -> RoomKey:
    if "status" in data:
        row.status = validate_choice(data.get("status"), KEY_STATUSES, field="status")
    if "campaign_label" in data:
        row.campaign_label = clean_str(data.get("campaign_label"), 160)
    if "physical_batch_id" in data:
        row.physical_batch_id = clean_str(data.get("physical_batch_id"), 120)
    if "metadata" in data or "metadata_json" in data:
        row.metadata_json = _json_object(data.get("metadata") or data.get("metadata_json"))
    return row


def revoke_room_key(row: RoomKey) -> RoomKey:
    row.status = "revoked"
    row.updated_at = now_utc()
    return row


def resolve_room_key(public_token: str) -> RoomKey | None:
    token = clean_str(public_token, 180)
    if not token:
        return None
    return RoomKey.query.filter_by(public_token=token).first()


def capture_encounter(
    room: PresenceNode,
    data: dict[str, Any] | None = None,
    *,
    room_key: RoomKey | None = None,
    observer=None,
) -> Encounter:
    payload = data or {}
    source = validate_choice(payload.get("source") or getattr(room_key, "key_type", None), ENCOUNTER_SOURCES, field="source", default="unknown")
    visitor_type = "observer" if observer else validate_choice(payload.get("visitor_type"), VISITOR_TYPES, field="visitor_type", default="guest")
    privacy_level = "observer_known" if observer else "aggregate_only"
    if payload.get("privacy_level"):
        privacy_level = validate_choice(payload.get("privacy_level"), PRIVACY_LEVELS, field="privacy_level")
        if privacy_level == "revealed" and not observer:
            privacy_level = "aggregate_only"
    row = Encounter(
        room_id=room.id,
        room_key_id=getattr(room_key, "id", None),
        visitor_type=visitor_type,
        observer_id=getattr(observer, "id", None),
        anonymous_visitor_id=clean_str(payload.get("anonymous_visitor_id"), 120),
        source=source,
        context_label=clean_str(payload.get("context_label") or getattr(room_key, "campaign_label", None), 160),
        location_id=_int_or_none(payload.get("location_id")),
        event_id=_int_or_none(payload.get("event_id")),
        referrer=clean_str(payload.get("referrer") or request.referrer, 700),
        user_agent_hash=hash_privacy_metadata(request.headers.get("User-Agent")),
        ip_hash=hash_privacy_metadata(request.headers.get("X-Forwarded-For") or request.remote_addr),
        privacy_level=privacy_level,
    )
    db.session.add(row)
    return row


def _int_or_none(value: Any) -> int | None:
    try:
        return int(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None


def room_key_entry_payload(room: PresenceNode, room_key: RoomKey | None, encounter: Encounter | None = None) -> dict[str, Any]:
    return {
        "message": "Youve entered this Room.",
        "room": serialize_public_card(room),
        "public_url": public_url_for_node(room),
        "editable_config": public_config_for_room(room),
        "room_key": serialize_room_key(room_key, include_token=False) if room_key else None,
        "encounter": serialize_encounter(encounter) if encounter else None,
        "available_actions": ["save", "follow", "field_note", "mood_board", "enquiry"],
        "observer_upgrade": "Observer mode is for moving through Rooms. To appear publicly as yourself, your business, your practice, or your project, create a Presence Room.",
    }


def serialize_pass(row: PresencePass, *, include_keys: bool = False) -> dict[str, Any]:
    payload = {
        "id": row.id,
        "room_id": row.room_id,
        "owner_id": row.owner_id,
        "pass_type": row.pass_type,
        "label": row.label,
        "status": row.status,
        "default_room_key_id": row.default_room_key_id,
        "metadata": row.metadata_json or {},
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "copy": "Your Presence Pass opens your Room from NFC, QR, wallet, badge, sticker, poster, or direct share.",
    }
    if include_keys:
        payload["room_keys"] = [serialize_room_key(item) for item in sorted(row.room_keys, key=lambda item: item.id or 0)]
    return payload


def serialize_room_key(row: RoomKey | None, *, include_token: bool = True) -> dict[str, Any] | None:
    if row is None:
        return None
    payload = {
        "id": row.id,
        "room_id": row.room_id,
        "presence_pass_id": row.presence_pass_id,
        "key_type": row.key_type,
        "campaign_label": row.campaign_label,
        "physical_batch_id": row.physical_batch_id,
        "status": row.status,
        "metadata": row.metadata_json or {},
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }
    if include_token:
        payload["public_token"] = row.public_token
    return payload


def serialize_encounter(row: Encounter | None, *, owner_view: bool = False) -> dict[str, Any] | None:
    if row is None:
        return None
    payload = {
        "id": row.id,
        "room_id": row.room_id,
        "room_key_id": row.room_key_id,
        "visitor_type": row.visitor_type,
        "source": row.source,
        "context_label": row.context_label,
        "privacy_level": row.privacy_level,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }
    if owner_view:
        payload.update(
            {
                "anonymous_visitor_id": row.anonymous_visitor_id,
                "observer_known": row.privacy_level in {"observer_known", "revealed"},
                "observer_id": row.observer_id if row.privacy_level == "revealed" else None,
            }
        )
    return payload
