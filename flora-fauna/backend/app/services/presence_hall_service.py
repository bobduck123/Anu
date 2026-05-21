from __future__ import annotations

import secrets
from datetime import datetime
from typing import Any

from ..extensions import db
from ..models import (
    HallParticipant,
    HallPortal,
    HallSession,
    HallStall,
    HallZone,
    HallActivityEvent,
    PresenceHall,
    PresenceNode,
)
from ..time_utils import now_utc
from .presence_service import PresenceValidationError, normalize_slug, serialize_public_card
from .presence_social_service import clean_str, clean_text, json_object, serialize_observer_profile, validate_choice, validate_public_url
from .presence_upgrade_guard_service import validate_observer_no_self_promotion


HALL_HOST_TYPES = {"room", "observer", "organisation", "admin"}
HALL_TYPES = {"town_hall", "market_hall", "studio_hall", "listening_hall", "learning_hall", "salon", "lobby", "guild_hall", "afterparty", "custom"}
HALL_VISIBILITIES = {"public", "unlisted", "invite_only", "private"}
HALL_STATUSES = {"draft", "scheduled", "live", "ended", "archived", "suspended"}
SESSION_TYPES = {"workshop", "listening", "market", "talk", "qna", "coworking", "meeting", "social", "custom"}
SESSION_STATUSES = {"scheduled", "live", "ended", "cancelled"}
PARTICIPANT_ROLES = {"host", "cohost", "moderator", "speaker", "stall_owner", "participant", "guest"}
PARTICIPANT_STATUSES = {"joined", "present", "away", "left", "removed", "banned"}
ZONE_TYPES = {"table", "stage", "stall", "noticeboard", "lobby", "portal", "quiet_area", "custom"}
ZONE_STATUSES = {"active", "hidden", "archived"}
PORTAL_TARGET_TYPES = {"room", "garden", "path", "mood_board", "hall", "external", "enquiry"}
PORTAL_STATUSES = {"active", "hidden"}
STALL_PLACEMENTS = {"standard", "featured", "sponsor", "host", "editorial"}
STALL_STATUSES = {"active", "hidden", "removed"}


def create_hall(data: dict[str, Any], *, host_type: str = "observer", host_room=None, host_observer=None, actor_user=None) -> PresenceHall:
    host_type = validate_choice(data.get("host_type") or host_type, HALL_HOST_TYPES, field="host_type")
    title = clean_str(data.get("title"), 180)
    if not title:
        raise PresenceValidationError("title is required.")
    description = clean_text(data.get("description"), 2000)
    rules_text = clean_text(data.get("rules_text"), 2000)
    if host_type == "observer":
        if not host_observer:
            raise PresenceValidationError("host Observer is required.")
        validate_observer_no_self_promotion(title, description, rules_text, field="Hall")
    if host_type == "room" and not host_room:
        raise PresenceValidationError("host Room is required.")
    slug = _unique_hall_slug(data.get("slug") or title)
    hall = PresenceHall(
        host_type=host_type,
        host_room_id=getattr(host_room, "id", None),
        host_observer_id=getattr(host_observer, "id", None),
        title=title,
        slug=slug,
        description=description,
        hall_type=validate_choice(data.get("hall_type"), HALL_TYPES, field="hall_type", default="custom"),
        visibility=validate_choice(data.get("visibility"), HALL_VISIBILITIES, field="visibility", default="public"),
        status=validate_choice(data.get("status"), HALL_STATUSES, field="status", default="scheduled"),
        capacity=_positive_int_or_none(data.get("capacity")),
        starts_at=_date_or_none(data.get("starts_at")),
        ends_at=_date_or_none(data.get("ends_at")),
        theme_key=clean_str(data.get("theme_key"), 80),
        rules_text=rules_text,
        attached_room_id=_positive_int_or_none(data.get("attached_room_id")) or getattr(host_room, "id", None),
        attached_path_id=_positive_int_or_none(data.get("attached_path_id")),
        attached_mood_board_id=_positive_int_or_none(data.get("attached_mood_board_id")),
        metadata_json=json_object(data.get("metadata") or data.get("metadata_json")),
    )
    db.session.add(hall)
    db.session.flush()
    if host_observer:
        join_hall(hall, observer=host_observer, data={"role": "host"}, record_shared_space=False)
    return hall


def update_hall(hall: PresenceHall, data: dict[str, Any]) -> PresenceHall:
    title = clean_str(data.get("title"), 180) if "title" in data else hall.title
    description = clean_text(data.get("description"), 2000) if "description" in data else hall.description
    rules_text = clean_text(data.get("rules_text"), 2000) if "rules_text" in data else hall.rules_text
    if hall.host_type == "observer":
        validate_observer_no_self_promotion(title, description, rules_text, field="Hall")
    if "title" in data:
        hall.title = title or hall.title
    if "slug" in data:
        hall.slug = _unique_hall_slug(data.get("slug") or hall.title, current_hall_id=hall.id)
    if "description" in data:
        hall.description = description
    if "hall_type" in data:
        hall.hall_type = validate_choice(data.get("hall_type"), HALL_TYPES, field="hall_type")
    if "visibility" in data:
        hall.visibility = validate_choice(data.get("visibility"), HALL_VISIBILITIES, field="visibility")
    if "status" in data:
        hall.status = validate_choice(data.get("status"), HALL_STATUSES, field="status")
    if "capacity" in data:
        hall.capacity = _positive_int_or_none(data.get("capacity"))
    if "starts_at" in data:
        hall.starts_at = _date_or_none(data.get("starts_at"))
    if "ends_at" in data:
        hall.ends_at = _date_or_none(data.get("ends_at"))
    if "theme_key" in data:
        hall.theme_key = clean_str(data.get("theme_key"), 80)
    if "rules_text" in data:
        hall.rules_text = rules_text
    if "attached_room_id" in data:
        hall.attached_room_id = _positive_int_or_none(data.get("attached_room_id"))
    if "attached_path_id" in data:
        hall.attached_path_id = _positive_int_or_none(data.get("attached_path_id"))
    if "attached_mood_board_id" in data:
        hall.attached_mood_board_id = _positive_int_or_none(data.get("attached_mood_board_id"))
    if "metadata" in data or "metadata_json" in data:
        hall.metadata_json = json_object(data.get("metadata") or data.get("metadata_json"))
    return hall


def get_hall(hall_id_or_slug: str | int) -> PresenceHall | None:
    try:
        hall_id = int(hall_id_or_slug)
    except (TypeError, ValueError):
        hall_id = None
    if hall_id:
        return PresenceHall.query.get(hall_id)
    slug = clean_str(hall_id_or_slug, 180)
    return PresenceHall.query.filter_by(slug=slug).first() if slug else None


def list_public_halls(*, limit: int = 50) -> list[PresenceHall]:
    return (
        PresenceHall.query.filter(
            PresenceHall.visibility.in_(["public", "unlisted"]),
            PresenceHall.status.in_(["scheduled", "live", "ended"]),
        )
        .order_by(PresenceHall.starts_at.desc().nullslast(), PresenceHall.created_at.desc())
        .limit(max(1, min(limit, 100)))
        .all()
    )


def list_room_halls(room, *, include_archived: bool = True) -> list[PresenceHall]:
    query = PresenceHall.query.filter_by(host_room_id=room.id)
    if not include_archived:
        query = query.filter(PresenceHall.status != "archived")
    return query.order_by(PresenceHall.created_at.desc(), PresenceHall.id.desc()).all()


def join_hall(
    hall: PresenceHall,
    *,
    observer=None,
    guest_token: str | None = None,
    room=None,
    data: dict[str, Any] | None = None,
    record_shared_space: bool = True,
) -> HallParticipant:
    payload = data or {}
    if hall.status in {"ended", "archived", "suspended"}:
        raise PresenceValidationError("Hall is not open for joining.")
    if not observer and hall.visibility not in {"public", "unlisted"}:
        raise PresenceValidationError("Guest entry is not available for this Hall.")
    if hall.capacity and _present_count(hall) >= hall.capacity:
        raise PresenceValidationError("Hall is at capacity.")
    role = validate_choice(payload.get("role"), PARTICIPANT_ROLES, field="role", default="participant" if observer else "guest")
    if observer and hall.host_observer_id == observer.id:
        role = "host"
    if room and hall.host_room_id == room.id:
        role = "host"
    guest = clean_str(guest_token or payload.get("guest_token"), 160)
    if not observer and not guest:
        guest = secrets.token_urlsafe(18)
    query = HallParticipant.query.filter_by(hall_id=hall.id, session_id=_positive_int_or_none(payload.get("session_id")))
    if observer:
        query = query.filter_by(observer_id=observer.id)
    elif guest:
        query = query.filter_by(guest_token=guest)
    participant = query.order_by(HallParticipant.id.desc()).first()
    now = now_utc()
    if participant and participant.status == "banned":
        raise PresenceValidationError("Participant is banned from this Hall.")
    if not participant:
        participant = HallParticipant(
            hall_id=hall.id,
            session_id=_positive_int_or_none(payload.get("session_id")),
            observer_id=getattr(observer, "id", None),
            guest_token=guest,
            room_id=getattr(room, "id", None) or _positive_int_or_none(payload.get("room_id")),
            role=role,
            status="joined",
            joined_at=now,
            last_seen_at=now,
            metadata_json=json_object(payload.get("metadata") or payload.get("metadata_json")),
        )
        db.session.add(participant)
        db.session.flush()
    else:
        participant.role = role if role != "participant" else participant.role
        participant.status = "present"
        participant.left_at = None
        participant.last_seen_at = now
    if record_shared_space and observer:
        from .presence_shared_space_service import derive_shared_space_from_hall_join

        derive_shared_space_from_hall_join(participant)
    return participant


def leave_hall(hall: PresenceHall, *, observer=None, guest_token: str | None = None) -> HallParticipant:
    query = HallParticipant.query.filter_by(hall_id=hall.id)
    if observer:
        query = query.filter_by(observer_id=observer.id)
    else:
        query = query.filter_by(guest_token=guest_token)
    participant = query.order_by(HallParticipant.id.desc()).first()
    if not participant:
        raise PresenceValidationError("Participant not found.")
    participant.status = "left"
    participant.left_at = now_utc()
    participant.last_seen_at = participant.left_at
    return participant


def add_zone(hall: PresenceHall, data: dict[str, Any]) -> HallZone:
    title = clean_str(data.get("title"), 180)
    if not title:
        raise PresenceValidationError("title is required.")
    zone = HallZone(
        hall_id=hall.id,
        zone_type=validate_choice(data.get("zone_type"), ZONE_TYPES, field="zone_type", default="custom"),
        title=title,
        description=clean_text(data.get("description"), 1000),
        position_json=json_object(data.get("position") or data.get("position_json")) if (data.get("position") or data.get("position_json")) else None,
        capacity=_positive_int_or_none(data.get("capacity")),
        status=validate_choice(data.get("status"), ZONE_STATUSES, field="status", default="active"),
        metadata_json=json_object(data.get("metadata") or data.get("metadata_json")),
    )
    db.session.add(zone)
    return zone


def update_zone(zone: HallZone, data: dict[str, Any]) -> HallZone:
    if "zone_type" in data:
        zone.zone_type = validate_choice(data.get("zone_type"), ZONE_TYPES, field="zone_type")
    if "title" in data:
        zone.title = clean_str(data.get("title"), 180) or zone.title
    if "description" in data:
        zone.description = clean_text(data.get("description"), 1000)
    if "position" in data or "position_json" in data:
        zone.position_json = json_object(data.get("position") or data.get("position_json"))
    if "capacity" in data:
        zone.capacity = _positive_int_or_none(data.get("capacity"))
    if "status" in data:
        zone.status = validate_choice(data.get("status"), ZONE_STATUSES, field="status")
    if "metadata" in data or "metadata_json" in data:
        zone.metadata_json = {**(zone.metadata_json or {}), **json_object(data.get("metadata") or data.get("metadata_json"))}
    return zone


def add_portal(hall: PresenceHall, data: dict[str, Any]) -> HallPortal:
    target_type = validate_choice(data.get("target_type"), PORTAL_TARGET_TYPES, field="target_type")
    external_url = validate_public_url(data.get("external_url")) if target_type == "external" or data.get("external_url") else None
    if target_type == "external" and not external_url:
        raise PresenceValidationError("external_url is required for external portals.")
    label = clean_str(data.get("label"), 160)
    if not label:
        raise PresenceValidationError("label is required.")
    zone_id = _positive_int_or_none(data.get("zone_id"))
    _require_zone_in_hall(hall, zone_id)
    portal = HallPortal(
        hall_id=hall.id,
        zone_id=zone_id,
        target_type=target_type,
        target_id=_positive_int_or_none(data.get("target_id")),
        external_url=external_url,
        label=label,
        description=clean_text(data.get("description"), 1000),
        status=validate_choice(data.get("status"), PORTAL_STATUSES, field="status", default="active"),
        metadata_json=json_object(data.get("metadata") or data.get("metadata_json")),
    )
    db.session.add(portal)
    return portal


def update_portal(portal: HallPortal, data: dict[str, Any]) -> HallPortal:
    if "target_type" in data:
        portal.target_type = validate_choice(data.get("target_type"), PORTAL_TARGET_TYPES, field="target_type")
    if "target_id" in data:
        portal.target_id = _positive_int_or_none(data.get("target_id"))
    if "external_url" in data:
        portal.external_url = validate_public_url(data.get("external_url")) if data.get("external_url") else None
    if "label" in data:
        portal.label = clean_str(data.get("label"), 160) or portal.label
    if "description" in data:
        portal.description = clean_text(data.get("description"), 1000)
    if "status" in data:
        portal.status = validate_choice(data.get("status"), PORTAL_STATUSES, field="status")
    if "metadata" in data or "metadata_json" in data:
        portal.metadata_json = json_object(data.get("metadata") or data.get("metadata_json"))
    return portal


def add_stall(hall: PresenceHall, data: dict[str, Any], *, room=None) -> HallStall:
    room_id = getattr(room, "id", None) or _positive_int_or_none(data.get("room_id"))
    if not room_id:
        raise PresenceValidationError("room_id is required.")
    if not PresenceNode.query.get(room_id):
        raise PresenceValidationError("Room not found.")
    zone_id = _positive_int_or_none(data.get("zone_id"))
    _require_zone_in_hall(hall, zone_id)
    existing = HallStall.query.filter_by(hall_id=hall.id, room_id=room_id).first()
    if existing:
        return update_stall(existing, data)
    stall = HallStall(
        hall_id=hall.id,
        zone_id=zone_id,
        room_id=room_id,
        placement_type=validate_choice(data.get("placement_type"), STALL_PLACEMENTS, field="placement_type", default="standard"),
        status=validate_choice(data.get("status"), STALL_STATUSES, field="status", default="active"),
        metadata_json=json_object(data.get("metadata") or data.get("metadata_json")),
    )
    db.session.add(stall)
    return stall


def update_stall(stall: HallStall, data: dict[str, Any]) -> HallStall:
    if "zone_id" in data:
        _require_zone_in_hall(stall.hall, _positive_int_or_none(data.get("zone_id")))
        stall.zone_id = _positive_int_or_none(data.get("zone_id"))
    if "placement_type" in data:
        stall.placement_type = validate_choice(data.get("placement_type"), STALL_PLACEMENTS, field="placement_type")
    if "status" in data:
        stall.status = validate_choice(data.get("status"), STALL_STATUSES, field="status")
    if "metadata" in data or "metadata_json" in data:
        stall.metadata_json = json_object(data.get("metadata") or data.get("metadata_json"))
    return stall


def create_session(hall: PresenceHall, data: dict[str, Any]) -> HallSession:
    title = clean_str(data.get("title"), 180)
    starts_at = _date_or_none(data.get("starts_at")) or hall.starts_at or now_utc()
    if not title:
        raise PresenceValidationError("title is required.")
    session = HallSession(
        hall_id=hall.id,
        title=title,
        description=clean_text(data.get("description"), 1000),
        session_type=validate_choice(data.get("session_type"), SESSION_TYPES, field="session_type", default="custom"),
        status=validate_choice(data.get("status"), SESSION_STATUSES, field="status", default="scheduled"),
        starts_at=starts_at,
        ends_at=_date_or_none(data.get("ends_at")),
        metadata_json=json_object(data.get("metadata") or data.get("metadata_json")),
    )
    db.session.add(session)
    return session


def transition_session_status(session: HallSession, data: dict[str, Any]) -> HallSession:
    session.status = validate_choice(data.get("status"), SESSION_STATUSES, field="status", default=session.status)
    if "ends_at" in data:
        session.ends_at = _date_or_none(data.get("ends_at"))
    if session.status == "ended" and not session.ends_at:
        session.ends_at = now_utc()
    if "metadata" in data or "metadata_json" in data:
        session.metadata_json = json_object(data.get("metadata") or data.get("metadata_json"))
    return session


def serialize_hall(hall: PresenceHall, *, include_children: bool = False) -> dict[str, Any]:
    metadata = hall.metadata_json or {}
    payload = {
        "id": hall.id,
        "host_type": hall.host_type,
        "host_room_id": hall.host_room_id,
        "host_observer_id": hall.host_observer_id,
        "title": hall.title,
        "slug": hall.slug,
        "description": hall.description,
        "hall_type": hall.hall_type,
        "visibility": hall.visibility,
        "status": hall.status,
        "capacity": hall.capacity,
        "starts_at": hall.starts_at.isoformat() if hall.starts_at else None,
        "ends_at": hall.ends_at.isoformat() if hall.ends_at else None,
        "theme_key": hall.theme_key,
        "rules_text": hall.rules_text,
        "rules": hall.rules_text,
        "attached_room_id": hall.attached_room_id,
        "attached_path_id": hall.attached_path_id,
        "attached_mood_board_id": hall.attached_mood_board_id,
        "metadata": metadata,
        "host_room": serialize_public_card(hall.host_room) if hall.host_room else None,
        "host_room_slug": getattr(hall.host_room, "slug", None),
        "host_room_display_name": getattr(hall.host_room, "display_name", None),
        "host_mask": serialize_observer_profile(hall.host_observer, private=False) if hall.host_observer else None,
        "host_mask_id": hall.host_observer_id,
        "host_mask_alias": getattr(hall.host_observer, "alias", None),
        "participant_count": _present_count(hall),
        "participants_count": _present_count(hall),
        "observations_count": len([row for row in hall.observations if row.status == "active"]),
        "cover_image_url": metadata.get("cover_image_url"),
        "created_at": hall.created_at.isoformat() if hall.created_at else None,
        "updated_at": hall.updated_at.isoformat() if hall.updated_at else None,
        "copy": "Halls are shared gathering spaces. Public identity is Mask or Room; private identity stays accountable server-side.",
    }
    if include_children:
        payload["zones"] = [serialize_zone(row) for row in sorted(hall.zones, key=lambda row: row.id or 0)]
        payload["portals"] = [serialize_portal(row) for row in sorted(hall.portals, key=lambda row: row.id or 0)]
        payload["stalls"] = [serialize_stall(row) for row in sorted(hall.stalls, key=lambda row: row.id or 0)]
        payload["sessions"] = [serialize_session(row) for row in sorted(hall.sessions, key=lambda row: row.starts_at or now_utc())]
    return payload


def serialize_participant(participant: HallParticipant) -> dict[str, Any]:
    payload = {
        "id": participant.id,
        "hall_id": participant.hall_id,
        "session_id": participant.session_id,
        "observer_id": participant.observer_id,
        "role": participant.role,
        "status": participant.status,
        "joined_at": participant.joined_at.isoformat() if participant.joined_at else None,
        "last_seen_at": participant.last_seen_at.isoformat() if participant.last_seen_at else None,
        "left_at": participant.left_at.isoformat() if participant.left_at else None,
        "metadata": participant.metadata_json or {},
        "current_zone_id": (participant.metadata_json or {}).get("current_zone_id"),
    }
    if participant.observer:
        payload["identity_type"] = "mask"
        payload["mask"] = serialize_observer_profile(participant.observer, private=False)
        payload["alias"] = participant.observer.alias
        payload["mask_name"] = participant.observer.mask_name
        payload["avatar_key"] = participant.observer.avatar_key
    elif participant.room:
        payload["identity_type"] = "room"
        payload["room"] = serialize_public_card(participant.room)
    else:
        payload["identity_type"] = "guest"
        payload["guest_token"] = participant.guest_token[-6:] if participant.guest_token else None
    return payload


def serialize_zone(zone: HallZone) -> dict[str, Any]:
    metadata = zone.metadata_json or {}
    return {
        "id": zone.id,
        "hall_id": zone.hall_id,
        "zone_type": zone.zone_type,
        "zone_kind": zone.zone_type,
        "title": zone.title,
        "description": zone.description,
        "blurb": zone.description,
        "position": zone.position_json or {},
        "capacity": zone.capacity,
        "status": zone.status,
        "participants_here": metadata.get("participants_here"),
        "order_index": metadata.get("order_index"),
        "links_to_kind": metadata.get("links_to_kind"),
        "links_to_id": metadata.get("links_to_id"),
        "links_to_slug": metadata.get("links_to_slug"),
        "links_to_label": metadata.get("links_to_label"),
        "metadata": metadata,
        "created_at": zone.created_at.isoformat() if zone.created_at else None,
        "updated_at": zone.updated_at.isoformat() if zone.updated_at else None,
    }


def serialize_portal(portal: HallPortal) -> dict[str, Any]:
    metadata = portal.metadata_json or {}
    return {
        "id": portal.id,
        "hall_id": portal.hall_id,
        "zone_id": portal.zone_id,
        "target_type": portal.target_type,
        "target_id": portal.target_id,
        "external_url": portal.external_url,
        "label": portal.label,
        "description": portal.description,
        "status": portal.status,
        "destination_kind": portal.target_type,
        "destination_id": portal.target_id,
        "destination_slug": metadata.get("destination_slug") or metadata.get("target_slug"),
        "metadata": metadata,
        "created_at": portal.created_at.isoformat() if portal.created_at else None,
        "updated_at": portal.updated_at.isoformat() if portal.updated_at else None,
    }


def serialize_stall(stall: HallStall) -> dict[str, Any]:
    metadata = stall.metadata_json or {}
    room = stall.room
    return {
        "id": stall.id,
        "hall_id": stall.hall_id,
        "zone_id": stall.zone_id,
        "room_id": stall.room_id,
        "room": serialize_public_card(room) if room else None,
        "room_slug": getattr(room, "slug", None),
        "room_display_name": getattr(room, "display_name", None),
        "short_pitch": metadata.get("short_pitch"),
        "visit_count": HallActivityEvent.query.filter_by(hall_id=stall.hall_id, stall_id=stall.id, event_type="stall_visit").count(),
        "placement_type": stall.placement_type,
        "status": stall.status,
        "metadata": metadata,
        "created_at": stall.created_at.isoformat() if stall.created_at else None,
        "updated_at": stall.updated_at.isoformat() if stall.updated_at else None,
    }


def serialize_session(session: HallSession) -> dict[str, Any]:
    metadata = session.metadata_json or {}
    return {
        "id": session.id,
        "hall_id": session.hall_id,
        "title": session.title,
        "description": session.description,
        "session_type": session.session_type,
        "status": session.status,
        "starts_at": session.starts_at.isoformat() if session.starts_at else None,
        "ends_at": session.ends_at.isoformat() if session.ends_at else None,
        "host_label": metadata.get("host_label"),
        "metadata": metadata,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "updated_at": session.updated_at.isoformat() if session.updated_at else None,
    }


def _unique_hall_slug(value: Any, *, current_hall_id: int | None = None) -> str:
    base = normalize_slug(value, fallback="hall")[:160]
    candidate = base
    suffix = 2
    while True:
        query = PresenceHall.query.filter_by(slug=candidate)
        if current_hall_id:
            query = query.filter(PresenceHall.id != current_hall_id)
        if not query.first():
            return candidate
        suffix_text = f"-{suffix}"
        candidate = f"{base[: 180 - len(suffix_text)]}{suffix_text}"
        suffix += 1


def _present_count(hall: PresenceHall) -> int:
    return HallParticipant.query.filter_by(hall_id=hall.id).filter(HallParticipant.status.in_(["joined", "present", "away"])).count()


def _require_zone_in_hall(hall: PresenceHall, zone_id: int | None) -> None:
    if not zone_id:
        return
    zone = HallZone.query.get(zone_id)
    if not zone or zone.hall_id != hall.id:
        raise PresenceValidationError("Hall Zone not found for this Hall.")


def _positive_int_or_none(value: Any) -> int | None:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def _date_or_none(value: Any):
    if not value:
        return None
    if isinstance(value, datetime):
        return value.replace(tzinfo=None)
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        raise PresenceValidationError("Date fields must be ISO-8601 timestamps.")
