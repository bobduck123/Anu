from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlparse

from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import (
    Encounter,
    FieldNote,
    ModerationFlag,
    MoodBoard,
    MoodBoardItem,
    ObserverProfile,
    PassportStamp,
    PresenceNode,
    RoomConnection,
    Signal,
    User,
)
from ..time_utils import now_utc
from .presence_service import PresenceValidationError, public_url_for_node, serialize_public_card


OBSERVER_VISIBILITIES = {"public_mask", "private", "limited"}
OBSERVER_STATUSES = {"active", "suspended", "deleted"}
ROOM_CONNECTION_STATUSES = {"entered", "saved", "followed", "crossed_paths", "revealed", "enquired", "blocked"}
PASSPORT_STAMP_TYPES = {"entered", "saved", "noted", "crossed_paths", "returned", "followed_path", "enquired"}
MOOD_BOARD_OWNER_TYPES = {"observer", "room"}
MOOD_BOARD_VISIBILITIES = {"private", "public", "room_public", "unlisted"}
MOOD_BOARD_TYPES = {"general", "influences", "saved_rooms", "event", "place", "material", "sound", "mood", "editorial"}
MOOD_BOARD_ITEM_TYPES = {"room", "field_note", "external_link", "image", "reference", "event", "place", "work", "tag", "text"}
FIELD_NOTE_VISIBILITIES = {"public", "room_owner_only", "private"}
FIELD_NOTE_STATUSES = {"active", "hidden", "flagged", "removed"}
MODERATION_STATES = {"clean", "pending", "flagged", "actioned"}
SIGNAL_TARGET_TYPES = {"room", "field_note", "mood_board", "path", "mood_board_item"}
SIGNAL_TYPES = {"resonated", "saved_for_later", "would_book", "inspiring", "want_to_visit", "useful", "beautiful", "important"}
MODERATION_STATUSES = {"open", "reviewing", "actioned", "dismissed"}

_ALIAS_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{2,39}$")
_EMAIL_RE = re.compile(r"[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}")
_PHONE_RE = re.compile(r"(?:\+?\d[\s().-]*){8,}")
_URL_RE = re.compile(r"https?://|www\.|\.com\b|\.net\b|\.org\b|\.au\b", re.IGNORECASE)
_PROMO_RE = re.compile(
    r"\b(book|booking|commission|hire me|contact me|dm me|services|available for|rates|portfolio|shop|subscribe)\b",
    re.IGNORECASE,
)
_PROTECTED_ALIASES = {"admin", "presence", "support", "root", "owner", "moderator", "room", "rooms", "world"}


def clean_str(value: Any, max_len: int) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text[:max_len]


def clean_text(value: Any, max_len: int = 2000) -> str | None:
    text = clean_str(value, max_len)
    if not text:
        return None
    return re.sub(r"\s+", " ", text).strip()


def json_object(value: Any) -> dict:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise PresenceValidationError("metadata must be an object.")
    return value


def json_list(value: Any) -> list:
    if value is None:
        return []
    if not isinstance(value, list):
        raise PresenceValidationError("tags must be a list.")
    return value


def validate_choice(value: Any, allowed: set[str], *, field: str, default: str | None = None) -> str:
    text = clean_str(value, 80) or default
    if not text or text not in allowed:
        raise PresenceValidationError(f"Unsupported {field}.", details={field: sorted(allowed)})
    return text


def validate_public_url(value: Any, *, field: str = "external_url") -> str | None:
    url = clean_str(value, 700)
    if not url:
        return None
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise PresenceValidationError(f"{field} must be a public http(s) URL.")
    return url


def validate_no_self_promotion(text: str | None, *, field: str = "content") -> None:
    if not text:
        return
    if _EMAIL_RE.search(text) or _PHONE_RE.search(text) or _URL_RE.search(text) or _PROMO_RE.search(text):
        raise PresenceValidationError(
            f"{field} cannot include contact details, promotional links, booking prompts, or service advertising."
        )


def validate_observer_alias(alias: Any) -> str:
    text = clean_str(alias, 80)
    if not text:
        raise PresenceValidationError("alias is required.")
    alias_norm = text.lower()
    if not _ALIAS_RE.match(alias_norm):
        raise PresenceValidationError("alias must be 3-40 characters using lowercase letters, numbers, hyphen, or underscore.")
    if alias_norm in _PROTECTED_ALIASES:
        raise PresenceValidationError("alias is reserved.")
    room = PresenceNode.query.filter(db.func.lower(PresenceNode.display_name) == alias_norm).first()
    if room:
        raise PresenceValidationError("alias cannot impersonate an existing Room.")
    return alias_norm


def get_or_create_observer_for_user(user: User, data: dict[str, Any] | None = None) -> ObserverProfile:
    existing = ObserverProfile.query.filter_by(user_id=user.id).first()
    if existing:
        return existing
    payload = data or {}
    seed_alias = payload.get("alias") or getattr(user, "username", None) or f"observer-{user.id}"
    alias = validate_observer_alias(seed_alias)
    suffix = 2
    base_alias = alias[:34]
    while ObserverProfile.query.filter_by(alias=alias).first():
        alias = f"{base_alias}-{suffix}"
        suffix += 1
    bio = clean_text(payload.get("bio_fragment"), 500)
    validate_no_self_promotion(bio, field="bio_fragment")
    profile = ObserverProfile(
        user_id=user.id,
        alias=alias,
        mask_name=clean_str(payload.get("mask_name") or getattr(user, "pseudonym", None), 120),
        avatar_key=clean_str(payload.get("avatar_key"), 120),
        bio_fragment=bio,
        visibility=validate_choice(payload.get("visibility"), OBSERVER_VISIBILITIES, field="visibility", default="public_mask"),
        self_promotion_locked=True,
    )
    db.session.add(profile)
    try:
        db.session.flush()
    except IntegrityError as exc:
        raise PresenceValidationError("Observer alias is already in use.") from exc
    return profile


def update_observer_profile(profile: ObserverProfile, data: dict[str, Any]) -> ObserverProfile:
    if "alias" in data and data.get("alias") != profile.alias:
        alias = validate_observer_alias(data.get("alias"))
        if ObserverProfile.query.filter(ObserverProfile.id != profile.id, ObserverProfile.alias == alias).first():
            raise PresenceValidationError("Observer alias is already in use.")
        profile.alias = alias
    if "mask_name" in data:
        profile.mask_name = clean_str(data.get("mask_name"), 120)
    if "avatar_key" in data:
        profile.avatar_key = clean_str(data.get("avatar_key"), 120)
    if "bio_fragment" in data:
        bio = clean_text(data.get("bio_fragment"), 500)
        validate_no_self_promotion(bio, field="bio_fragment")
        profile.bio_fragment = bio
    if "visibility" in data:
        profile.visibility = validate_choice(data.get("visibility"), OBSERVER_VISIBILITIES, field="visibility")
    return profile


def serialize_observer_profile(profile: ObserverProfile, *, private: bool = False) -> dict[str, Any]:
    payload = {
        "id": profile.id,
        "alias": profile.alias,
        "mask_name": profile.mask_name,
        "avatar_key": profile.avatar_key,
        "bio_fragment": profile.bio_fragment,
        "status": profile.status,
        "visibility": profile.visibility,
        "self_promotion_locked": bool(profile.self_promotion_locked),
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
        "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
        "copy": "Observer mode is for moving through Rooms. To appear publicly as yourself, your business, your practice, or your project, create a Presence Room.",
    }
    if private:
        payload["user_id"] = profile.user_id
    return payload


def passport_stamp(
    observer: ObserverProfile,
    stamp_type: str,
    *,
    room: PresenceNode | None = None,
    encounter: Encounter | None = None,
    path_id: int | None = None,
    label: str | None = None,
    metadata: dict | None = None,
) -> PassportStamp:
    stamp_type = validate_choice(stamp_type, PASSPORT_STAMP_TYPES, field="stamp_type")
    recent = PassportStamp.query.filter_by(
        observer_id=observer.id,
        room_id=getattr(room, "id", None),
        path_id=path_id,
        stamp_type=stamp_type,
    ).order_by(PassportStamp.created_at.desc()).first()
    if recent and recent.created_at and (now_utc() - recent.created_at).total_seconds() < 120:
        return recent
    stamp = PassportStamp(
        observer_id=observer.id,
        room_id=getattr(room, "id", None),
        encounter_id=getattr(encounter, "id", None),
        path_id=path_id,
        stamp_type=stamp_type,
        label=clean_str(label, 180),
        metadata_json=json_object(metadata),
    )
    db.session.add(stamp)
    return stamp


def upsert_room_connection(
    observer: ObserverProfile,
    room: PresenceNode,
    *,
    status: str,
    first_encounter: Encounter | None = None,
    metadata: dict | None = None,
) -> RoomConnection:
    status = validate_choice(status, ROOM_CONNECTION_STATUSES, field="status")
    row = RoomConnection.query.filter_by(observer_id=observer.id, room_id=room.id).first()
    now = now_utc()
    if not row:
        row = RoomConnection(
            observer_id=observer.id,
            room_id=room.id,
            first_encounter_id=getattr(first_encounter, "id", None),
            status=status,
            metadata_json=json_object(metadata),
            created_at=now,
        )
        db.session.add(row)
    row.status = _stronger_connection_status(row.status, status)
    row.last_interaction_at = now
    if status == "saved" and row.saved_at is None:
        row.saved_at = now
    if status == "followed" and row.followed_at is None:
        row.followed_at = now
    if status == "revealed" and row.revealed_at is None:
        row.revealed_at = now
    if first_encounter and not row.first_encounter_id:
        row.first_encounter_id = first_encounter.id
    return row


def _stronger_connection_status(current: str | None, requested: str) -> str:
    rank = {"entered": 1, "crossed_paths": 2, "saved": 3, "followed": 4, "enquired": 5, "revealed": 6, "blocked": 7}
    if not current:
        return requested
    return requested if rank.get(requested, 0) >= rank.get(current, 0) else current


def save_room(observer: ObserverProfile, room: PresenceNode) -> RoomConnection:
    row = upsert_room_connection(observer, room, status="saved")
    passport_stamp(observer, "saved", room=room, label=room.display_name, metadata={"connection_id": row.id})
    return row


def follow_room(observer: ObserverProfile, room: PresenceNode) -> RoomConnection:
    row = upsert_room_connection(observer, room, status="followed")
    passport_stamp(observer, "followed_path", room=room, label=f"Followed {room.display_name}", metadata={"connection_id": row.id})
    return row


def reveal_connection(observer: ObserverProfile, room: PresenceNode) -> RoomConnection:
    row = upsert_room_connection(observer, room, status="revealed")
    return row


def list_passport(observer: ObserverProfile) -> list[PassportStamp]:
    return PassportStamp.query.filter_by(observer_id=observer.id).order_by(PassportStamp.created_at.desc(), PassportStamp.id.desc()).all()


def serialize_passport_stamp(stamp: PassportStamp) -> dict[str, Any]:
    return {
        "id": stamp.id,
        "observer_id": stamp.observer_id,
        "room_id": stamp.room_id,
        "encounter_id": stamp.encounter_id,
        "path_id": stamp.path_id,
        "stamp_type": stamp.stamp_type,
        "label": stamp.label,
        "metadata": stamp.metadata_json or {},
        "created_at": stamp.created_at.isoformat() if stamp.created_at else None,
    }


def serialize_room_connection(row: RoomConnection, *, owner_view: bool = False) -> dict[str, Any]:
    payload = {
        "id": row.id,
        "room_id": row.room_id,
        "observer_id": row.observer_id if owner_view and row.status == "revealed" else None,
        "status": row.status,
        "saved_at": row.saved_at.isoformat() if row.saved_at else None,
        "followed_at": row.followed_at.isoformat() if row.followed_at else None,
        "revealed_at": row.revealed_at.isoformat() if row.revealed_at else None,
        "last_interaction_at": row.last_interaction_at.isoformat() if row.last_interaction_at else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "metadata": row.metadata_json or {},
    }
    if row.room:
        payload["room"] = serialize_public_card(row.room)
    return payload


def create_mood_board(owner_type: str, data: dict[str, Any], *, observer: ObserverProfile | None = None, room: PresenceNode | None = None) -> MoodBoard:
    owner_type = validate_choice(owner_type, MOOD_BOARD_OWNER_TYPES, field="owner_type")
    title = clean_str(data.get("title"), 180)
    if not title:
        raise PresenceValidationError("title is required.")
    if owner_type == "observer" and not observer:
        raise PresenceValidationError("observer owner is required.")
    if owner_type == "room" and not room:
        raise PresenceValidationError("room owner is required.")
    board = MoodBoard(
        owner_type=owner_type,
        observer_id=getattr(observer, "id", None),
        room_id=getattr(room, "id", None),
        title=title,
        description=clean_text(data.get("description"), 1000),
        visibility=validate_choice(data.get("visibility"), MOOD_BOARD_VISIBILITIES, field="visibility", default="private" if owner_type == "observer" else "room_public"),
        board_type=validate_choice(data.get("board_type"), MOOD_BOARD_TYPES, field="board_type", default="general"),
        status="active",
    )
    db.session.add(board)
    return board


def update_mood_board(board: MoodBoard, data: dict[str, Any]) -> MoodBoard:
    if "title" in data:
        board.title = clean_str(data.get("title"), 180) or board.title
    if "description" in data:
        board.description = clean_text(data.get("description"), 1000)
    if "visibility" in data:
        board.visibility = validate_choice(data.get("visibility"), MOOD_BOARD_VISIBILITIES, field="visibility")
    if "board_type" in data:
        board.board_type = validate_choice(data.get("board_type"), MOOD_BOARD_TYPES, field="board_type")
    if "status" in data:
        board.status = validate_choice(data.get("status"), {"active", "archived"}, field="status")
    return board


def add_mood_board_item(board: MoodBoard, data: dict[str, Any], *, observer: ObserverProfile | None = None) -> MoodBoardItem:
    item_type = validate_choice(data.get("item_type"), MOOD_BOARD_ITEM_TYPES, field="item_type")
    item_id = _int_or_none(data.get("item_id"))
    if item_type == "room":
        if not item_id:
            raise PresenceValidationError("item_id is required for room items.")
        room = PresenceNode.query.get(item_id)
        if not room:
            raise PresenceValidationError("Room item not found.")
    external_url = validate_public_url(data.get("external_url")) if item_type in {"external_link", "image", "reference"} else clean_str(data.get("external_url"), 700)
    item = MoodBoardItem(
        mood_board_id=board.id,
        item_type=item_type,
        item_id=item_id,
        external_url=external_url,
        title=clean_str(data.get("title"), 180),
        description=clean_text(data.get("description"), 1000),
        image_url=validate_public_url(data.get("image_url"), field="image_url") if data.get("image_url") else None,
        tags_json=json_list(data.get("tags") or data.get("tags_json")),
        position_index=_int_or_none(data.get("position_index")),
        source_context=clean_str(data.get("source_context"), 240),
        added_by_observer_id=getattr(observer, "id", None),
    )
    db.session.add(item)
    return item


def serialize_mood_board(board: MoodBoard, *, include_items: bool = False) -> dict[str, Any]:
    payload = {
        "id": board.id,
        "owner_type": board.owner_type,
        "observer_id": board.observer_id,
        "room_id": board.room_id,
        "title": board.title,
        "description": board.description,
        "visibility": board.visibility,
        "board_type": board.board_type,
        "cover_item_id": board.cover_item_id,
        "status": board.status,
        "created_at": board.created_at.isoformat() if board.created_at else None,
        "updated_at": board.updated_at.isoformat() if board.updated_at else None,
    }
    if include_items:
        payload["items"] = [serialize_mood_board_item(item) for item in sorted(board.items, key=lambda item: (item.position_index or 0, item.id or 0))]
    return payload


def serialize_mood_board_item(item: MoodBoardItem) -> dict[str, Any]:
    return {
        "id": item.id,
        "mood_board_id": item.mood_board_id,
        "item_type": item.item_type,
        "item_id": item.item_id,
        "external_url": item.external_url,
        "title": item.title,
        "description": item.description,
        "image_url": item.image_url,
        "tags": item.tags_json or [],
        "position_index": item.position_index,
        "source_context": item.source_context,
        "added_by_observer_id": item.added_by_observer_id,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def create_field_note(observer: ObserverProfile, data: dict[str, Any]) -> FieldNote:
    body = clean_text(data.get("body"), 2000)
    if not body:
        raise PresenceValidationError("body is required.")
    validate_no_self_promotion(body, field="Field Note")
    note = FieldNote(
        author_observer_id=observer.id,
        room_id=_int_or_none(data.get("room_id")),
        path_id=_int_or_none(data.get("path_id")),
        encounter_id=_int_or_none(data.get("encounter_id")),
        mood_board_id=_int_or_none(data.get("mood_board_id")),
        body=body,
        visibility=validate_choice(data.get("visibility"), FIELD_NOTE_VISIBILITIES, field="visibility", default="public"),
        status="active",
        moderation_state="clean",
    )
    if not any([note.room_id, note.path_id, note.encounter_id, note.mood_board_id]):
        raise PresenceValidationError("Field Note must target a Room, Path, Encounter, or Mood Board.")
    db.session.add(note)
    if note.room_id:
        passport_stamp(observer, "noted", room=PresenceNode.query.get(note.room_id), label="Field Note", metadata={"note_target": "room"})
    return note


def hide_field_note(note: FieldNote) -> FieldNote:
    note.status = "hidden"
    note.moderation_state = "actioned"
    return note


def serialize_field_note(note: FieldNote, *, include_body: bool = True) -> dict[str, Any]:
    return {
        "id": note.id,
        "author_observer_id": note.author_observer_id,
        "room_id": note.room_id,
        "path_id": note.path_id,
        "encounter_id": note.encounter_id,
        "mood_board_id": note.mood_board_id,
        "body": note.body if include_body else None,
        "visibility": note.visibility,
        "status": note.status,
        "moderation_state": note.moderation_state,
        "created_at": note.created_at.isoformat() if note.created_at else None,
        "updated_at": note.updated_at.isoformat() if note.updated_at else None,
    }


def add_signal(observer: ObserverProfile, data: dict[str, Any]) -> Signal:
    target_type = validate_choice(data.get("target_type"), SIGNAL_TARGET_TYPES, field="target_type")
    signal_type = validate_choice(data.get("signal_type"), SIGNAL_TYPES, field="signal_type")
    target_id = _int_or_none(data.get("target_id"))
    if not target_id:
        raise PresenceValidationError("target_id is required.")
    existing = Signal.query.filter_by(
        observer_id=observer.id,
        target_type=target_type,
        target_id=target_id,
        signal_type=signal_type,
    ).first()
    if existing:
        return existing
    signal = Signal(observer_id=observer.id, target_type=target_type, target_id=target_id, signal_type=signal_type)
    db.session.add(signal)
    return signal


def serialize_signal(signal: Signal) -> dict[str, Any]:
    return {
        "id": signal.id,
        "observer_id": signal.observer_id,
        "target_type": signal.target_type,
        "target_id": signal.target_id,
        "signal_type": signal.signal_type,
        "created_at": signal.created_at.isoformat() if signal.created_at else None,
    }


def create_moderation_flag(data: dict[str, Any], *, reporter_user: User | None = None, reporter_observer: ObserverProfile | None = None) -> ModerationFlag:
    target_type = clean_str(data.get("target_type"), 40)
    target_id = _int_or_none(data.get("target_id"))
    reason = clean_text(data.get("reason"), 1000)
    if not target_type or not target_id or not reason:
        raise PresenceValidationError("target_type, target_id, and reason are required.")
    flag = ModerationFlag(
        reporter_user_id=getattr(reporter_user, "id", None),
        reporter_observer_id=getattr(reporter_observer, "id", None),
        target_type=target_type,
        target_id=target_id,
        reason=reason,
        status="open",
    )
    db.session.add(flag)
    if target_type == "field_note":
        note = FieldNote.query.get(target_id)
        if note and note.moderation_state == "clean":
            note.moderation_state = "flagged"
            note.status = "flagged"
    return flag


def action_moderation_flag(flag: ModerationFlag, data: dict[str, Any]) -> ModerationFlag:
    flag.status = validate_choice(data.get("status"), MODERATION_STATUSES, field="status", default=flag.status)
    if "admin_notes" in data:
        flag.admin_notes = clean_text(data.get("admin_notes"), 1000)
    if flag.target_type == "field_note" and flag.status == "actioned":
        note = FieldNote.query.get(flag.target_id)
        if note:
            note.moderation_state = "actioned"
            if data.get("hide_target", True):
                note.status = "hidden"
    return flag


def serialize_moderation_flag(flag: ModerationFlag) -> dict[str, Any]:
    return {
        "id": flag.id,
        "reporter_user_id": flag.reporter_user_id,
        "reporter_observer_id": flag.reporter_observer_id,
        "target_type": flag.target_type,
        "target_id": flag.target_id,
        "reason": flag.reason,
        "status": flag.status,
        "admin_notes": flag.admin_notes,
        "created_at": flag.created_at.isoformat() if flag.created_at else None,
        "updated_at": flag.updated_at.isoformat() if flag.updated_at else None,
    }


def summarise_signals_for_room(room: PresenceNode) -> dict[str, int]:
    rows = Signal.query.filter_by(target_type="room", target_id=room.id).all()
    counts: dict[str, int] = {}
    for row in rows:
        counts[row.signal_type] = counts.get(row.signal_type, 0) + 1
    return counts


def _int_or_none(value: Any) -> int | None:
    try:
        return int(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None

