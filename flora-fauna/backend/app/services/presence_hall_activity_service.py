from __future__ import annotations

from typing import Any

from ..extensions import db
from ..models import HallActivityEvent, HallPortal, HallStall, HallZone, PresenceHall
from .presence_service import PresenceValidationError
from .presence_social_service import clean_str, json_object, validate_choice


HALL_ACTIVITY_EVENT_TYPES = {
    "portal_click",
    "stall_visit",
    "join",
    "leave",
    "observation",
    "path_open",
    "room_enter",
}


def record_hall_activity_event(
    hall: PresenceHall,
    event_type: str,
    *,
    observer=None,
    guest_token: str | None = None,
    room_id: int | None = None,
    portal_id: int | None = None,
    stall_id: int | None = None,
    session_id: int | None = None,
    source: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> HallActivityEvent:
    event_type = validate_choice(event_type, HALL_ACTIVITY_EVENT_TYPES, field="event_type")
    event = HallActivityEvent(
        hall_id=hall.id,
        event_type=event_type,
        observer_id=getattr(observer, "id", None),
        guest_token=clean_str(guest_token, 160),
        room_id=room_id,
        portal_id=portal_id,
        stall_id=stall_id,
        session_id=session_id,
        source=clean_str(source, 80),
        metadata_json=json_object(metadata),
    )
    db.session.add(event)
    db.session.flush()
    return event


def record_portal_click(
    hall: PresenceHall,
    portal_or_zone_id: int,
    *,
    observer=None,
    guest_token: str | None = None,
    source: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> HallActivityEvent:
    portal = HallPortal.query.filter_by(id=portal_or_zone_id, hall_id=hall.id, status="active").first()
    meta = dict(metadata or {})
    portal_id = getattr(portal, "id", None)
    if portal:
        meta.update({"target_type": portal.target_type, "target_id": portal.target_id, "label": portal.label})
    else:
        zone = HallZone.query.filter_by(id=portal_or_zone_id, hall_id=hall.id).first()
        if not zone:
            raise PresenceValidationError("Portal not found.")
        meta.update({"zone_id": zone.id, "zone_type": zone.zone_type, "label": zone.title})
    return record_hall_activity_event(
        hall,
        "portal_click",
        observer=observer,
        guest_token=guest_token,
        portal_id=portal_id,
        source=source or "hall",
        metadata=meta,
    )


def record_stall_visit(
    hall: PresenceHall,
    stall_or_zone_id: int,
    *,
    observer=None,
    guest_token: str | None = None,
    source: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> HallActivityEvent:
    stall = HallStall.query.filter_by(id=stall_or_zone_id, hall_id=hall.id, status="active").first()
    meta = dict(metadata or {})
    room_id = None
    stall_id = getattr(stall, "id", None)
    if stall:
        room_id = stall.room_id
        meta.update({"room_id": stall.room_id})
    else:
        zone = HallZone.query.filter_by(id=stall_or_zone_id, hall_id=hall.id).first()
        if not zone:
            raise PresenceValidationError("Stall not found.")
        linked_stall = HallStall.query.filter_by(hall_id=hall.id, zone_id=zone.id, status="active").first()
        if linked_stall:
            stall_id = linked_stall.id
            room_id = linked_stall.room_id
        meta.update({"zone_id": zone.id, "zone_type": zone.zone_type, "label": zone.title})
    return record_hall_activity_event(
        hall,
        "stall_visit",
        observer=observer,
        guest_token=guest_token,
        room_id=room_id,
        stall_id=stall_id,
        source=source or "hall",
        metadata=meta,
    )


def serialize_hall_activity_event(event: HallActivityEvent) -> dict[str, Any]:
    return {
        "id": event.id,
        "hall_id": event.hall_id,
        "event_type": event.event_type,
        "observer_id": event.observer_id,
        "guest_token": event.guest_token[-6:] if event.guest_token else None,
        "room_id": event.room_id,
        "portal_id": event.portal_id,
        "stall_id": event.stall_id,
        "session_id": event.session_id,
        "source": event.source,
        "created_at": event.created_at.isoformat() if event.created_at else None,
        "metadata": event.metadata_json or {},
    }
