from __future__ import annotations

import hashlib
import hmac
import json
import re
import time
from copy import deepcopy
from typing import Any
from urllib.parse import urlparse

from flask import current_app

from ..extensions import db
from ..models import PresenceCollection, PresenceEditableConfig, PresenceNode, PresenceWork
from ..time_utils import now_utc


EDITABLE_CONFIG_SCHEMA_VERSION = "presence-editable-config-v1"
EDITABLE_CONFIG_STATUSES = {"draft", "published", "archived"}
EDITABLE_CONFIG_JSON_FIELDS = {
    "scene_config": "scene_config_json",
    "style_dna": "style_dna_json",
    "motion_config": "motion_config_json",
    "asset_config": "asset_config_json",
    "content_config": "content_config_json",
    "roomkey_config": "roomkey_config_json",
    "enquiry_config": "enquiry_config_json",
    "locked_fields": "locked_fields_json",
}
EDITOR_CONFIG_MAX_BYTES = 256 * 1024
EDITOR_SECTION_MAX_BYTES = 96 * 1024
EDITOR_MAX_STRING_LENGTH = 4000
EDITOR_MAX_URL_LENGTH = 700
EDITOR_MAX_LIST_LENGTH = 160
EDITOR_MAX_OBJECT_KEYS = 160
EDITOR_MAX_DEPTH = 9
ATTACHABLE_ASSET_SLOTS = {
    "hero_image",
    "artwork_images",
    "thumbnails",
    "texture_assets",
    "portrait_image",
    "social_preview",
    "attached_assets",
}
ATTACHABLE_ASSET_TYPES = {"image", "thumbnail", "texture"}

_RENDERER_KEY_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,119}$")
_LOCAL_PATH_RE = re.compile(
    r"(^[a-zA-Z]:[\\/])|(^\\\\)|(^file:)|(^/(Users|home|var|etc|tmp|private)/)|(^\.\.?[\\/])",
    re.IGNORECASE,
)
_SCRIPT_RE = re.compile(r"(<\s*script\b)|(\bon[a-z]+\s*=)|(\bjavascript\s*:)|(<\s*iframe\b)|(<\s*object\b)|(<\s*embed\b)", re.IGNORECASE)
_SECRET_KEY_RE = re.compile(r"(password|secret|private_key|access_token|refresh_token|api_key)", re.IGNORECASE)
_PUBLIC_REDACT_KEY_RE = re.compile(
    r"(created_by|updated_by|published_by|owner|platform_admin|internal_lifetime_free|filesystem_path|"
    r"private|secret|token|password|email|auth_subject|audit|draft)",
    re.IGNORECASE,
)
_EMAIL_RE = re.compile(r"[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+")


class PresenceEditorConfigError(ValueError):
    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.details = details or {}


def _json_size(value: Any) -> int:
    try:
        return len(json.dumps(value, ensure_ascii=False, sort_keys=True))
    except (TypeError, ValueError) as exc:
        raise PresenceEditorConfigError("Editable config must be JSON-serialisable.") from exc


def _looks_like_url_key(key: str) -> bool:
    key_l = key.lower()
    return any(part in key_l for part in ("url", "href", "src", "website", "image", "thumb", "asset"))


def _validate_public_or_relative_url(value: str, *, path: str) -> str:
    text = value.strip()
    if len(text) > EDITOR_MAX_URL_LENGTH:
        raise PresenceEditorConfigError(f"{path} exceeds {EDITOR_MAX_URL_LENGTH} characters.")
    if _LOCAL_PATH_RE.search(text):
        raise PresenceEditorConfigError(f"{path} cannot contain a local filesystem path.")
    if text.startswith("//"):
        raise PresenceEditorConfigError(f"{path} must not use a protocol-relative URL.")
    if text.startswith("/"):
        if ".." in text.split("/"):
            raise PresenceEditorConfigError(f"{path} must not traverse directories.")
        return text

    parsed = urlparse(text)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise PresenceEditorConfigError(f"{path} must be a public http(s) URL or a safe public asset path.")
    hostname = (parsed.hostname or "").strip().lower()
    if not hostname or hostname in {"localhost", "127.0.0.1", "0.0.0.0", "::1"}:
        raise PresenceEditorConfigError(f"{path} must not point at localhost.")
    if hostname.endswith(".local") or hostname.endswith(".internal"):
        raise PresenceEditorConfigError(f"{path} must not point at an internal host.")
    return text


def _clean_string(value: str, *, key: str, path: str) -> str:
    text = value.strip()
    if len(text) > EDITOR_MAX_STRING_LENGTH:
        raise PresenceEditorConfigError(f"{path} exceeds {EDITOR_MAX_STRING_LENGTH} characters.")
    if _SCRIPT_RE.search(text):
        raise PresenceEditorConfigError(f"{path} contains unsafe script-like content.")
    if _LOCAL_PATH_RE.search(text):
        raise PresenceEditorConfigError(f"{path} cannot contain a local filesystem path.")
    if text.lower().startswith(("data:", "vbscript:")):
        raise PresenceEditorConfigError(f"{path} cannot contain inline data or script URLs.")
    if _SECRET_KEY_RE.search(key) and text:
        raise PresenceEditorConfigError(f"{path} cannot store raw secrets.")

    parsed = urlparse(text)
    if parsed.scheme and parsed.scheme not in {"http", "https"}:
        raise PresenceEditorConfigError(f"{path} must not use the {parsed.scheme!r} URL scheme.")
    if _looks_like_url_key(key) and (parsed.scheme or text.startswith("/")):
        return _validate_public_or_relative_url(text, path=path)
    return text


def _normalise_json_value(value: Any, *, key: str = "", path: str = "config", depth: int = 0) -> Any:
    if depth > EDITOR_MAX_DEPTH:
        raise PresenceEditorConfigError(f"{path} exceeds maximum nesting depth.")
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        return _clean_string(value, key=key, path=path)
    if isinstance(value, list):
        if len(value) > EDITOR_MAX_LIST_LENGTH:
            raise PresenceEditorConfigError(f"{path} contains too many items.")
        return [
            _normalise_json_value(item, key=key, path=f"{path}[{idx}]", depth=depth + 1)
            for idx, item in enumerate(value)
        ]
    if isinstance(value, dict):
        if len(value) > EDITOR_MAX_OBJECT_KEYS:
            raise PresenceEditorConfigError(f"{path} contains too many fields.")
        cleaned: dict[str, Any] = {}
        for raw_key, raw_value in value.items():
            child_key = str(raw_key or "").strip()
            if not child_key:
                continue
            if len(child_key) > 120:
                raise PresenceEditorConfigError(f"{path} contains an overlong field name.")
            if _SECRET_KEY_RE.search(child_key) and raw_value not in (None, "", [], {}):
                raise PresenceEditorConfigError(f"{path}.{child_key} cannot store raw secrets.")
            cleaned[child_key] = _normalise_json_value(
                raw_value,
                key=child_key,
                path=f"{path}.{child_key}",
                depth=depth + 1,
            )
        return cleaned
    raise PresenceEditorConfigError(f"{path} contains unsupported JSON value.")


def normalise_editor_section(value: Any, *, section: str) -> dict[str, Any]:
    if value in (None, ""):
        return {}
    if not isinstance(value, dict):
        raise PresenceEditorConfigError(f"{section} must be a JSON object.")
    cleaned = _normalise_json_value(value, key=section, path=section)
    if not isinstance(cleaned, dict):
        raise PresenceEditorConfigError(f"{section} must be a JSON object.")
    if _json_size(cleaned) > EDITOR_SECTION_MAX_BYTES:
        raise PresenceEditorConfigError(f"{section} exceeds {EDITOR_SECTION_MAX_BYTES} bytes.")
    return cleaned


def normalise_editor_payload(data: dict[str, Any], *, partial: bool = False) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise PresenceEditorConfigError("Editable config payload must be a JSON object.")
    source = data.get("config") if isinstance(data.get("config"), dict) else data
    payload: dict[str, Any] = {}

    if "renderer_key" in source:
        renderer_key = str(source.get("renderer_key") or "").strip() or None
        if renderer_key and not _RENDERER_KEY_RE.match(renderer_key):
            raise PresenceEditorConfigError("renderer_key contains unsupported characters.")
        payload["renderer_key"] = renderer_key
    elif not partial:
        payload["renderer_key"] = None

    for public_key, attr in EDITABLE_CONFIG_JSON_FIELDS.items():
        if public_key in source:
            payload[attr] = normalise_editor_section(source.get(public_key), section=public_key)
        elif attr in source:
            payload[attr] = normalise_editor_section(source.get(attr), section=public_key)
        elif not partial:
            payload[attr] = {}

    total_obj = {
        "renderer_key": payload.get("renderer_key"),
        **{key: payload.get(attr, {}) for key, attr in EDITABLE_CONFIG_JSON_FIELDS.items()},
    }
    if _json_size(total_obj) > EDITOR_CONFIG_MAX_BYTES:
        raise PresenceEditorConfigError(f"Editable config exceeds {EDITOR_CONFIG_MAX_BYTES} bytes.")
    return payload


def renderer_key_for_room(room: PresenceNode) -> str | None:
    metadata = room.node_metadata if isinstance(room.node_metadata, dict) else {}
    custom = metadata.get("custom_presence") if isinstance(metadata.get("custom_presence"), dict) else {}
    style = custom.get("style_dna") if isinstance(custom.get("style_dna"), dict) else {}
    public_style = custom.get("public_style_dna") if isinstance(custom.get("public_style_dna"), dict) else {}
    for candidate in (
        style.get("renderer_key"),
        public_style.get("renderer_key"),
        custom.get("renderer_key"),
        custom.get("custom_renderer_key"),
        metadata.get("custom_renderer_key"),
        metadata.get("renderer_key"),
    ):
        text = str(candidate or "").strip()
        if text:
            return text[:120]
    return None


def _work_payload(work: PresenceWork) -> dict[str, Any]:
    return {
        "id": work.id,
        "slug": work.slug or str(work.id),
        "title": work.title,
        "year": work.year,
        "medium": work.medium,
        "dimensions": work.dimensions,
        "caption": work.description,
        "description": work.description,
        "image_url": work.image_url,
        "thumbnail_url": work.thumbnail_url,
        "gallery_images": work.gallery_images or [],
        "alt_text": work.title,
        "sort_order": work.sort_order or 0,
        "is_visible": bool(work.is_visible),
    }


def build_default_editable_config(room: PresenceNode) -> dict[str, Any]:
    works = [
        _work_payload(work)
        for work in sorted(room.works, key=lambda row: (row.sort_order or 0, row.id or 0))
        if work.is_visible
    ]
    hero_work = next((work for work in works if work.get("image_url")), works[0] if works else None)
    renderer_key = renderer_key_for_room(room)
    return {
        "renderer_key": renderer_key,
        "scene_config_json": {
            "scenes": [
                {
                    "id": "artwork_field",
                    "label": "Artwork Field",
                    "title": room.hero_title or room.display_name,
                    "subtitle": room.hero_subtitle or room.headline,
                    "primary_artwork_slug": (hero_work or {}).get("slug"),
                    "intro_copy": room.short_bio or room.bio,
                    "action_labels": {
                        "primary": room.primary_cta_label or "Begin a conversation",
                        "work_advance": "Show next artwork",
                    },
                    "roomkey_provenance_text": "Opened via RoomKey",
                },
                {
                    "id": "work_wall",
                    "label": "Work Wall",
                    "artwork_order": [work.get("slug") for work in works],
                    "selected_work_slug": (hero_work or {}).get("slug"),
                    "work_detail_behaviour": "inline_detail_or_route",
                },
                {
                    "id": "practice_studio",
                    "label": "Practice Studio",
                    "about_title": "Practice Studio",
                    "note_cards_enabled": True,
                },
                {
                    "id": "calling_card",
                    "label": "Calling Card",
                    "contact_title": "Calling Card",
                    "enquiry_cta": room.primary_cta_label or "Begin a conversation",
                },
            ]
        },
        "style_dna_json": {
            "palette": {
                "accent": room.accent_color,
                "theme_preset": room.theme_preset,
                "visual_mood": room.visual_mood,
            },
            "typography": room.custom_typography_config or {},
            "spacing": room.custom_spacing_config or {},
            "background_treatment": "renderer_default",
            "artwork_treatment": "renderer_default",
        },
        "motion_config_json": {
            "transition_style": "renderer_default",
            "scene_transition_duration_ms": 800,
            "reduced_motion_fallback": True,
        },
        "asset_config_json": {
            "hero_image": {
                "url": room.hero_image_url or room.cover_image_url or room.profile_image_url,
                "alt_text": room.hero_title or room.display_name,
            },
            "artworks": works,
            "thumbnails": [
                {"slug": work.get("slug"), "url": work.get("thumbnail_url"), "alt_text": work.get("alt_text")}
                for work in works
                if work.get("thumbnail_url")
            ],
            "public_assets_only": True,
        },
        "content_config_json": {
            "display_name": room.display_name,
            "headline": room.headline,
            "hero_title": room.hero_title,
            "hero_subtitle": room.hero_subtitle,
            "about": {
                "short_bio": room.short_bio,
                "bio": room.bio,
                "long_story": room.long_story,
                "practice_statement": room.practice_statement,
                "curatorial_statement": room.curatorial_statement,
            },
            "works": works,
            "contact": {
                "location_label": room.location_label,
                "availability_status": room.availability_status,
                "contact_posture": "enquiry_form",
                "primary_cta_label": room.primary_cta_label,
                "primary_cta_url": room.primary_cta_url,
            },
        },
        "roomkey_config_json": {
            "entry_label": "Opened via RoomKey",
            "provenance_chip_text": "Opened via NFC/QR",
            "guest_entry_copy": "You have entered this Presence Room.",
            "invalid_copy": "This Room Key is not available.",
            "revoked_copy": "This Room Key has been revoked.",
            "show_save_to_garden": True,
        },
        "enquiry_config_json": {
            "cta_label": room.primary_cta_label or "Begin a conversation",
            "copy": "Use the Presence enquiry form to contact the owner.",
            "availability_status": room.availability_status,
            "delivery_posture": "backend_enquiry_capture",
        },
        "locked_fields_json": {},
    }


def _active_config_query(room: PresenceNode, status: str):
    return PresenceEditableConfig.query.filter_by(room_id=room.id, status=status)


def draft_config_for_room(room: PresenceNode) -> PresenceEditableConfig | None:
    return _active_config_query(room, "draft").order_by(PresenceEditableConfig.version.desc()).first()


def published_config_for_room(room: PresenceNode) -> PresenceEditableConfig | None:
    return _active_config_query(room, "published").order_by(PresenceEditableConfig.version.desc()).first()


def _max_version(room: PresenceNode) -> int:
    versions = [int(row.version or 0) for row in PresenceEditableConfig.query.filter_by(room_id=room.id).all()]
    return max(versions, default=0)


def _config_data(config: PresenceEditableConfig | None, room: PresenceNode) -> dict[str, Any]:
    if config is None:
        return build_default_editable_config(room)
    return {
        "renderer_key": config.renderer_key,
        "scene_config_json": deepcopy(config.scene_config_json or {}),
        "style_dna_json": deepcopy(config.style_dna_json or {}),
        "motion_config_json": deepcopy(config.motion_config_json or {}),
        "asset_config_json": deepcopy(config.asset_config_json or {}),
        "content_config_json": deepcopy(config.content_config_json or {}),
        "roomkey_config_json": deepcopy(config.roomkey_config_json or {}),
        "enquiry_config_json": deepcopy(config.enquiry_config_json or {}),
        "locked_fields_json": deepcopy(config.locked_fields_json or {}),
    }


def ensure_draft_config(room: PresenceNode, actor=None) -> tuple[PresenceEditableConfig, bool]:
    draft = draft_config_for_room(room)
    if draft:
        return draft, False

    source = published_config_for_room(room)
    data = _config_data(source, room)
    now = now_utc()
    draft = PresenceEditableConfig(
        room_id=room.id,
        version=_max_version(room) + 1,
        status="draft",
        created_by_user_id=getattr(actor, "id", None),
        updated_by_user_id=getattr(actor, "id", None),
        created_at=now,
        updated_at=now,
        **data,
    )
    db.session.add(draft)
    db.session.flush()
    return draft, True


def _deep_merge(existing: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    merged = deepcopy(existing or {})
    for key, value in (patch or {}).items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def update_draft_config(
    room: PresenceNode,
    actor,
    data: dict[str, Any],
    *,
    partial: bool = False,
) -> tuple[PresenceEditableConfig, bool]:
    draft, created = ensure_draft_config(room, actor)
    payload = normalise_editor_payload(data, partial=partial)
    if "renderer_key" in payload:
        draft.renderer_key = payload["renderer_key"]
    elif not draft.renderer_key:
        draft.renderer_key = renderer_key_for_room(room)

    for _public_key, attr in EDITABLE_CONFIG_JSON_FIELDS.items():
        if attr not in payload:
            continue
        existing = getattr(draft, attr) or {}
        setattr(draft, attr, _deep_merge(existing, payload[attr]) if partial else payload[attr])

    draft.updated_by_user_id = getattr(actor, "id", None)
    draft.updated_at = now_utc()
    return draft, created


def publish_draft_config(room: PresenceNode, actor) -> PresenceEditableConfig:
    draft = draft_config_for_room(room)
    if not draft:
        raise PresenceEditorConfigError("No draft config exists for this Room.")
    published = published_config_for_room(room)
    now = now_utc()
    if published:
        published.status = "archived"
        published.archived_at = now
        published.updated_by_user_id = getattr(actor, "id", None)
        published.updated_at = now
    draft.status = "published"
    draft.published_by_user_id = getattr(actor, "id", None)
    draft.published_at = now
    draft.updated_by_user_id = getattr(actor, "id", None)
    draft.updated_at = now
    return draft


def rollback_published_config(room: PresenceNode, actor, *, version: int | None = None, config_id: int | None = None) -> PresenceEditableConfig:
    query = PresenceEditableConfig.query.filter(
        PresenceEditableConfig.room_id == room.id,
        PresenceEditableConfig.status.in_(["published", "archived"]),
    )
    if config_id is not None:
        query = query.filter(PresenceEditableConfig.id == int(config_id))
    elif version is not None:
        query = query.filter(PresenceEditableConfig.version == int(version))
    else:
        query = query.filter(PresenceEditableConfig.status == "archived")
    target = query.order_by(PresenceEditableConfig.version.desc()).first()
    if not target:
        raise PresenceEditorConfigError("Rollback target config was not found.")

    current = published_config_for_room(room)
    now = now_utc()
    if current:
        current.status = "archived"
        current.archived_at = now
        current.updated_by_user_id = getattr(actor, "id", None)
        current.updated_at = now

    data = _config_data(target, room)
    restored = PresenceEditableConfig(
        room_id=room.id,
        version=_max_version(room) + 1,
        status="published",
        created_by_user_id=getattr(actor, "id", None),
        updated_by_user_id=getattr(actor, "id", None),
        published_by_user_id=getattr(actor, "id", None),
        created_at=now,
        updated_at=now,
        published_at=now,
        **data,
    )
    db.session.add(restored)
    return restored


def history_for_room(room: PresenceNode) -> list[PresenceEditableConfig]:
    return (
        PresenceEditableConfig.query.filter_by(room_id=room.id)
        .order_by(PresenceEditableConfig.version.desc(), PresenceEditableConfig.id.desc())
        .all()
    )


def _public_redact(value: Any) -> Any:
    if isinstance(value, list):
        cleaned_list = []
        for item in value:
            cleaned = _public_redact(item)
            if cleaned in (None, {}, []):
                continue
            if isinstance(cleaned, dict):
                status = str(cleaned.get("status") or cleaned.get("visibility") or "public").lower()
                if status in {"draft", "private", "unpublished", "archived"}:
                    continue
            cleaned_list.append(cleaned)
        return cleaned_list
    if isinstance(value, dict):
        cleaned: dict[str, Any] = {}
        for key, item in value.items():
            key_text = str(key)
            if _PUBLIC_REDACT_KEY_RE.search(key_text):
                continue
            child = _public_redact(item)
            if child in (None, {}, []):
                continue
            cleaned[key_text] = child
        return cleaned
    if isinstance(value, str):
        if _EMAIL_RE.search(value):
            return None
        if _LOCAL_PATH_RE.search(value):
            return None
        if _SCRIPT_RE.search(value):
            return None
        return value
    return value


def serialize_editor_config(config: PresenceEditableConfig | None) -> dict[str, Any] | None:
    if not config:
        return None
    return {
        "id": config.id,
        "room_id": config.room_id,
        "schema_version": EDITABLE_CONFIG_SCHEMA_VERSION,
        "version": config.version,
        "status": config.status,
        "renderer_key": config.renderer_key,
        "scene_config": config.scene_config_json or {},
        "style_dna": config.style_dna_json or {},
        "motion_config": config.motion_config_json or {},
        "asset_config": config.asset_config_json or {},
        "content_config": config.content_config_json or {},
        "roomkey_config": config.roomkey_config_json or {},
        "enquiry_config": config.enquiry_config_json or {},
        "locked_fields": config.locked_fields_json or {},
        "created_by_user_id": config.created_by_user_id,
        "updated_by_user_id": config.updated_by_user_id,
        "published_by_user_id": config.published_by_user_id,
        "created_at": config.created_at.isoformat() if config.created_at else None,
        "updated_at": config.updated_at.isoformat() if config.updated_at else None,
        "published_at": config.published_at.isoformat() if config.published_at else None,
        "archived_at": config.archived_at.isoformat() if config.archived_at else None,
    }


def serialize_public_editable_config(config: PresenceEditableConfig | None, *, preview: bool = False) -> dict[str, Any] | None:
    if not config:
        return None
    safe = {
        "schema_version": EDITABLE_CONFIG_SCHEMA_VERSION,
        "version": config.version,
        "status": "preview" if preview else "published",
        "renderer_key": config.renderer_key,
        "published_at": config.published_at.isoformat() if config.published_at else None,
        "scene_config": config.scene_config_json or {},
        "style_dna": config.style_dna_json or {},
        "motion_config": config.motion_config_json or {},
        "asset_config": config.asset_config_json or {},
        "content_config": config.content_config_json or {},
        "roomkey_config": config.roomkey_config_json or {},
        "enquiry_config": config.enquiry_config_json or {},
        "locked_fields": config.locked_fields_json or {},
    }
    return _public_redact(safe)


def public_config_for_room(room: PresenceNode) -> dict[str, Any] | None:
    return serialize_public_editable_config(published_config_for_room(room))


def preview_payload_for_room(room: PresenceNode, actor) -> dict[str, Any]:
    draft, created = ensure_draft_config(room, actor)
    expires_at = int(time.time()) + 15 * 60
    token_source = f"{room.id}:{draft.id}:{draft.version}:{getattr(actor, 'id', None)}:{expires_at}"
    secret = str(current_app.config.get("SECRET_KEY") or "presence-preview-secret")
    digest = hmac.new(secret.encode("utf-8"), token_source.encode("utf-8"), hashlib.sha256).hexdigest()
    return {
        "created_draft": created,
        "preview": True,
        "expires_at": expires_at,
        "preview_token": f"{expires_at}.{digest}",
        "preview_url": f"/studio/{room.id}/preview?presencePreviewToken={expires_at}.{digest}",
        "editable_config": serialize_public_editable_config(draft, preview=True),
        "draft": serialize_editor_config(draft),
    }


def _asset_from_value(value: Any, *, source: str, slot: str | None = None) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if isinstance(value, str):
        try:
            url = _validate_public_or_relative_url(value, path=f"{source}.{slot or 'url'}")
        except PresenceEditorConfigError:
            return []
        rows.append({"url": url, "source": source, "slot": slot, "asset_type": "image"})
    elif isinstance(value, dict):
        url = value.get("url") or value.get("image_url") or value.get("thumbnail_url") or value.get("src")
        if isinstance(url, str):
            try:
                rows.append(
                    {
                        "url": _validate_public_or_relative_url(url, path=f"{source}.{slot or 'url'}"),
                        "alt_text": value.get("alt_text") or value.get("alt") or value.get("title"),
                        "source": source,
                        "slot": slot,
                        "asset_type": value.get("asset_type") or "image",
                    }
                )
            except PresenceEditorConfigError:
                return []
        else:
            for child_key, child_value in value.items():
                rows.extend(_asset_from_value(child_value, source=source, slot=str(child_key)))
    elif isinstance(value, list):
        for idx, item in enumerate(value):
            rows.extend(_asset_from_value(item, source=source, slot=f"{slot or 'asset'}[{idx}]"))
    return rows


def collect_room_assets(room: PresenceNode) -> list[dict[str, Any]]:
    assets: list[dict[str, Any]] = []
    node_fields = {
        "profile_image": room.profile_image_url,
        "cover_image": room.cover_image_url,
        "hero_image": room.hero_image_url,
        "landing_background": room.landing_background_url,
        "social_preview": room.social_preview_image_url,
    }
    for slot, url in node_fields.items():
        assets.extend(_asset_from_value(url, source="presence_node", slot=slot))
    for work in sorted(room.works, key=lambda row: (row.sort_order or 0, row.id or 0)):
        assets.extend(_asset_from_value(work.image_url, source="presence_work", slot=f"{work.id}.image"))
        assets.extend(_asset_from_value(work.thumbnail_url, source="presence_work", slot=f"{work.id}.thumbnail"))
        assets.extend(_asset_from_value(work.gallery_images or [], source="presence_work", slot=f"{work.id}.gallery"))
    for collection in sorted(room.collections, key=lambda row: (row.sort_order or 0, row.id or 0)):
        if isinstance(collection, PresenceCollection):
            assets.extend(_asset_from_value(collection.cover_image_url, source="presence_collection", slot=f"{collection.id}.cover"))

    for config in (draft_config_for_room(room), published_config_for_room(room)):
        if config:
            assets.extend(_asset_from_value(config.asset_config_json or {}, source=f"editable_config:{config.status}", slot="asset_config"))

    seen: set[str] = set()
    unique_assets: list[dict[str, Any]] = []
    for asset in assets:
        url = asset.get("url")
        if not url or url in seen:
            continue
        seen.add(url)
        unique_assets.append(asset)
    return unique_assets


def attach_asset_to_draft(room: PresenceNode, actor, data: dict[str, Any]) -> PresenceEditableConfig:
    slot = str(data.get("slot") or "attached_assets").strip()
    if slot not in ATTACHABLE_ASSET_SLOTS:
        raise PresenceEditorConfigError("Unsupported asset slot.", details={"slot": sorted(ATTACHABLE_ASSET_SLOTS)})
    asset_type = str(data.get("asset_type") or "image").strip()
    if asset_type not in ATTACHABLE_ASSET_TYPES:
        raise PresenceEditorConfigError("Unsupported asset_type.", details={"asset_type": sorted(ATTACHABLE_ASSET_TYPES)})
    url = _validate_public_or_relative_url(str(data.get("url") or "").strip(), path="asset.url")
    alt_text = _clean_string(str(data.get("alt_text") or data.get("alt") or "").strip(), key="alt_text", path="asset.alt_text") if (data.get("alt_text") or data.get("alt")) else None
    draft, _created = ensure_draft_config(room, actor)
    asset_config = deepcopy(draft.asset_config_json or {})
    asset = {
        "url": url,
        "asset_type": asset_type,
        "alt_text": alt_text,
        "status": "published",
        "visibility": "public",
    }
    existing = asset_config.get(slot)
    if isinstance(existing, list):
        existing.append(asset)
    elif existing:
        asset_config[slot] = [existing, asset]
    else:
        asset_config[slot] = [asset]
    draft.asset_config_json = normalise_editor_section(asset_config, section="asset_config")
    draft.updated_by_user_id = getattr(actor, "id", None)
    draft.updated_at = now_utc()
    return draft
