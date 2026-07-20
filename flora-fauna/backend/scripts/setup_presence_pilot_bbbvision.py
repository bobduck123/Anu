from __future__ import annotations

import argparse
import ast
import hashlib
import json
import os
import re
import sys
from copy import deepcopy
from datetime import timedelta
from pathlib import Path
from typing import Any
from urllib.parse import quote

from sqlalchemy import func, inspect, or_, text
from sqlalchemy.engine import make_url


BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parents[1]
DEFAULT_BACKEND_ENV = BACKEND_ROOT / ".env.presence-controlled-launch.backend-production.local"
EVIDENCE_ROOT = REPO_ROOT / "presence-app/docs/program/evidence/presence-studio-v2-bbbvision-hosted-migration"
DEFAULT_OUTPUT = EVIDENCE_ROOT / "bbbvision_setup_result.json"
DEFAULT_BACKUP_DIR = EVIDENCE_ROOT / "backup"
TARGET_EMAIL = "e4hatu@gmail.com"
TARGET_SLUG = "bbbvision"
TARGET_TITLE = "bbb.vision"
TARGET_PUBLIC_STYLE = "bbbvision-threshold-gallery"
RENDERER_KEY = "presence-studio-v2-room"
SCHEMA_VERSION = "presence-studio-v2-v1"
CREATED_BY = "setup_presence_pilot_bbbvision"
REQUIRED_TABLES = {"node", "user", "presence_node", "presence_editable_config"}
LIKELY_SLUGS = ("bbbvision", "bbb-vision", "bbb.vision", "bbb")

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from scripts.provision_presence_pilot_admin import (  # noqa: E402
    _build_app,
    _database_url,
    _load_env_file,
)


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _clean_email(value: str) -> str:
    email = str(value or "").strip().lower()
    if "@" not in email or len(email) > 150:
        raise RuntimeError("A valid owner email is required.")
    return email


def _subject_fingerprint(value: Any) -> str | None:
    text = str(value or "").strip()
    if not text:
        return None
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:12]


def _redact_email(value: str | None) -> str | None:
    email = str(value or "").strip().lower()
    if "@" not in email:
        return None
    local, domain = email.split("@", 1)
    return f"{local[:2]}***@{domain}"


def _assert_schema(app) -> dict[str, Any]:
    with app.app_context():
        from manara_backend_app.extensions import db

        present = set(inspect(db.engine).get_table_names())
        missing = sorted(REQUIRED_TABLES - present)
        if missing:
            raise RuntimeError(f"bbbvision hosted setup schema is incomplete: {missing}")
        return {"required_tables_present": sorted(REQUIRED_TABLES)}


def _auth_user_rows(email: str) -> list[dict[str, Any]]:
    from manara_backend_app.extensions import db

    rows = db.session.execute(
        text(
            """
        select
          id::text as id,
          email,
          email_confirmed_at is not null as email_confirmed,
          banned_until,
          deleted_at
        from auth.users
        where lower(email) = :email
        order by created_at asc
        """
        ),
        {"email": email},
    ).mappings()
    return [dict(row) for row in rows]


def _identity_rows(subjects: list[str]) -> list[dict[str, Any]]:
    from manara_backend_app.extensions import db

    if not subjects:
        return []
    rows = db.session.execute(
        text(
            """
        select user_id::text as user_id, provider
        from auth.identities
        where user_id::text = any(:subjects)
        order by user_id asc, provider asc
        """
        ),
        {"subjects": subjects},
    ).mappings()
    return [dict(row) for row in rows]


def _owner_account(email: str) -> dict[str, Any]:
    from manara_backend_app.models import User

    users = User.query.filter(func.lower(User.email) == email).order_by(User.id.asc()).all()
    auth_rows = _auth_user_rows(email)
    if len(users) > 1:
        raise RuntimeError(f"Multiple Presence app users exist for {email}; stop before mutation.")
    if len(auth_rows) > 1:
        raise RuntimeError(f"Multiple Supabase auth users exist for {email}; stop before mutation.")
    auth = auth_rows[0] if auth_rows else None
    identities = _identity_rows([auth["id"]]) if auth else []
    user = users[0] if users else None
    return {
        "exists": bool(user and auth),
        "app_user": user,
        "auth_subject": auth.get("id") if auth else None,
        "summary": {
            "email_redacted": _redact_email(email),
            "presence_app_user_exists": bool(user),
            "presence_app_user_id": getattr(user, "id", None),
            "presence_role": getattr(user, "role", None),
            "presence_user_active": bool(user and not user.is_suspended),
            "stored_subject_fingerprint": _subject_fingerprint(getattr(user, "global_subject_id", None)),
            "supabase_auth_user_exists": bool(auth),
            "supabase_email_confirmed": bool(auth and auth.get("email_confirmed")),
            "supabase_subject_fingerprint": _subject_fingerprint(auth.get("id") if auth else None),
            "supabase_subject_matches_presence": bool(
                user and auth and user.global_subject_id == auth.get("id")
            ),
            "supabase_providers": [row.get("provider") for row in identities],
            "secret_values_printed": False,
            "tokens_printed": False,
        },
    }


def _find_bbbvision_rooms() -> list[Any]:
    from manara_backend_app.models import PresenceNode

    slug_filters = [func.lower(PresenceNode.slug) == slug for slug in LIKELY_SLUGS]
    title_filters = [
        func.lower(PresenceNode.display_name).in_(LIKELY_SLUGS),
        func.lower(PresenceNode.display_name).like("%bbb%"),
        func.lower(PresenceNode.headline).like("%bbb%"),
    ]
    return (
        PresenceNode.query.filter(or_(*(slug_filters + title_filters)))
        .order_by(PresenceNode.id.asc())
        .all()
    )


def _safe_model_dict(row: Any) -> dict[str, Any]:
    if not row:
        return {}
    payload: dict[str, Any] = {}
    for column in row.__table__.columns:
        value = getattr(row, column.name)
        if hasattr(value, "isoformat"):
            value = value.isoformat()
        payload[column.name] = value
    return payload


def _backup_room(room: Any) -> dict[str, Any]:
    from manara_backend_app.services.presence_editor_config import (
        draft_config_for_room,
        history_for_room,
        published_config_for_room,
        serialize_editor_config,
    )
    from manara_backend_app.services.presence_service import (
        serialize_collection,
        serialize_presence_node,
        serialize_service,
        serialize_work,
    )

    return {
        "room": serialize_presence_node(room, public=False, include_admin=True, include_children=True),
        "raw_room": _safe_model_dict(room),
        "draft": serialize_editor_config(draft_config_for_room(room)),
        "published": serialize_editor_config(published_config_for_room(room)),
        "history": [serialize_editor_config(row) for row in history_for_room(room)],
        "works": [serialize_work(row) for row in sorted(room.works, key=lambda item: (item.sort_order or 0, item.id or 0))],
        "collections": [
            serialize_collection(row, include_admin=True)
            for row in sorted(room.collections, key=lambda item: (item.sort_order or 0, item.id or 0))
        ],
        "services": [serialize_service(row) for row in sorted(room.services, key=lambda item: (item.sort_order or 0, item.id or 0))],
    }


def _backup_existing_rooms(rooms: list[Any], backup_dir: Path) -> dict[str, Any]:
    backup_dir.mkdir(parents=True, exist_ok=True)
    if not rooms:
        payload = {
            "status": "no_prior_bbbvision_room",
            "searched_slugs": list(LIKELY_SLUGS),
            "searched_titles": ["bbbvision", "bbb-vision", "bbb.vision", "bbb"],
        }
        _write_json(backup_dir / "no_prior_bbbvision_room.json", payload)
        return {"backup_dir": str(backup_dir), "files": ["no_prior_bbbvision_room.json"], "room_count": 0}

    files: list[str] = []
    for room in rooms:
        file_name = f"room-{room.id}-{room.slug}-backup.json"
        _write_json(backup_dir / file_name, _backup_room(room))
        files.append(file_name)
    manifest = {
        "status": "existing_bbbvision_room_backup",
        "room_count": len(rooms),
        "rooms": [{"id": room.id, "slug": room.slug, "title": room.display_name} for room in rooms],
        "files": files,
    }
    _write_json(backup_dir / "backup_manifest.json", manifest)
    files.append("backup_manifest.json")
    return {"backup_dir": str(backup_dir), "files": files, "room_count": len(rooms)}


def _safe_slug(value: str, fallback: str, max_len: int = 180) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return (slug[:max_len].strip("-") or fallback)[:max_len]


def _get_or_create_tenant(environment: str):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node

    tenant = Node.query.filter_by(slug="presence-bbbvision-pilot").first()
    created = False
    if not tenant:
        tenant = Node(slug="presence-bbbvision-pilot", name="Presence bbbvision Pilot", status="active")
        db.session.add(tenant)
        db.session.flush()
        created = True
    return tenant, created


def _room_metadata(existing: dict[str, Any] | None, environment: str, owner_user_id: int) -> dict[str, Any]:
    public_safe_existing = dict(existing or {})
    public_safe_existing.pop("owner_user_id", None)
    return {
        **public_safe_existing,
        "controlled_launch_pilot": True,
        "pilot_code": "bbbvision",
        "pilot_stage": "hosted_studio_v2_migration",
        "environment": environment,
        "created_by": CREATED_BY,
        "public_style_preset": TARGET_PUBLIC_STYLE,
        "source": {
            "kind": "local_source_assets",
            "reference": "bbb-vision-site workspace source inspected during migration",
            "asset_url_origin": "https://bbbvision.vercel.app",
        },
    }


def _public_asset_url(relative_path: str) -> str:
    return "https://bbbvision.vercel.app/" + quote(relative_path.replace("\\", "/"), safe="/")


LANDING_ASSETS = [
    ("bbb-landing-sparkle", "Sparkle", "assets/landing-slider-shots/sparkle.JPG"),
    ("bbb-landing-akka", "Akka", "assets/landing-slider-shots/akka.JPG"),
    ("bbb-landing-ballerina", "Ballerina", "assets/landing-slider-shots/ballerina.JPG"),
    ("bbb-landing-ballerina-1", "Ballerina I", "assets/landing-slider-shots/ballerina (1).JPG"),
    ("bbb-landing-ballerina-2", "Ballerina II", "assets/landing-slider-shots/ballerina (2).JPG"),
    ("bbb-landing-cd", "CD", "assets/landing-slider-shots/CD.JPG"),
    ("bbb-landing-fashion-week", "Fashion Week", "assets/landing-slider-shots/fashion week_.JPG"),
    ("bbb-landing-liv-e", "Liv.e", "assets/landing-slider-shots/Liv.e.JPG"),
    ("bbb-landing-mk-gee", "mk.gee", "assets/landing-slider-shots/mk.gee.JPG"),
    ("bbb-landing-tems", "Tems", "assets/landing-slider-shots/tems.JPG"),
]

GALLERY_ASSETS = [
    ("bbb-gallery-klien", "Klien", "assets/benny/klien.JPG"),
    ("bbb-gallery-klein", "Klein", "assets/benny/klein.JPG"),
    ("bbb-gallery-kelela", "Kelela", "assets/benny/kelela.JPG"),
    ("bbb-gallery-kelela-1", "Kelela I", "assets/benny/kelela (1).JPG"),
    ("bbb-gallery-little-simz", "Little Simz", "assets/benny/little simz.JPG"),
    ("bbb-gallery-niecy-blues", "Niecy Blues", "assets/benny/Niecy Blues.JPG"),
    ("bbb-gallery-sparkle", "Sparkle", "assets/benny/sparkle.JPG"),
    ("bbb-gallery-tems", "Tems", "assets/benny/tems.JPG"),
    ("bbb-gallery-tems-1", "Tems I", "assets/benny/tems (1).JPG"),
    ("bbb-gallery-yves-tumor", "Yves Tumor", "assets/benny/yves tumor.JPG"),
]


def _object_state(chamber_id: str, z_index: int) -> dict[str, Any]:
    return {
        "chamberId": chamber_id,
        "visibility": {"public": True, "mobile": True},
        "transform": {"x": 0, "y": 0, "scale": 1, "rotation": 0, "zIndex": z_index},
        "locked": False,
        "pinned": False,
    }


def _image_object(item: tuple[str, str, str], chamber: str, source_label: str) -> dict[str, Any]:
    object_id, title, relative_path = item
    return {
        "id": object_id,
        "type": "image",
        "role": "work",
        "title": title,
        "meta": source_label,
        "detail": f"Source asset from the local bbb.vision {source_label.lower()} set.",
        "image": {"src": _public_asset_url(relative_path), "alt": f"bbb.vision {title}"},
    }


def _bbbvision_editor_payload(room_id: int) -> dict[str, Any]:
    threshold_objects = [_image_object(item, "threshold", "Threshold sequence") for item in LANDING_ASSETS]
    gallery_objects = [_image_object(item, "gallery", "Gallery field") for item in GALLERY_ASSETS]
    cta_object = {
        "id": "bbb-enter-action",
        "type": "cta",
        "role": "cta",
        "title": "Enter",
        "meta": "Public route action",
    }
    note_object = {
        "id": "bbb-practice-note",
        "type": "text",
        "role": "statement",
        "title": "Image-first threshold gallery",
        "detail": "bbb.vision opens through a full-screen image threshold, then moves into a black gallery field of selected source images.",
    }
    objects = [*threshold_objects, cta_object, *gallery_objects, note_object]
    object_state: dict[str, Any] = {}
    z_index = 1
    for object_id, _title, _path in LANDING_ASSETS:
        object_state[object_id] = _object_state("threshold", z_index)
        z_index += 1
    object_state[cta_object["id"]] = _object_state("threshold", z_index)
    z_index += 1
    for object_id, _title, _path in GALLERY_ASSETS:
        object_state[object_id] = _object_state("gallery", z_index)
        z_index += 1
    object_state[note_object["id"]] = _object_state("practice", z_index)

    assets = [
        {"objectId": object["id"], "src": object["image"]["src"], "alt": object["image"]["alt"]}
        for object in [*threshold_objects, *gallery_objects]
    ]
    return {
        "renderer_key": RENDERER_KEY,
        "scene_config": {
            "studio_v2": {
                "schemaVersion": SCHEMA_VERSION,
                "worldId": "gallery",
                "chambers": [
                    {"id": "threshold", "label": "Threshold", "objectIds": [item[0] for item in LANDING_ASSETS] + [cta_object["id"]]},
                    {"id": "gallery", "label": "Gallery Field", "objectIds": [item[0] for item in GALLERY_ASSETS]},
                    {"id": "practice", "label": "Practice", "objectIds": [note_object["id"]]},
                ],
                "objectState": object_state,
                "mobileRecovery": {
                    "transformsSuspendedOnMobile": True,
                    "strategy": "suspend-mobile-transforms",
                },
            }
        },
        "style_dna": {
            "studio_v2": {
                "schemaVersion": SCHEMA_VERSION,
                "publicStylePreset": TARGET_PUBLIC_STYLE,
                "skin": {
                    "background": "#000000",
                    "texture": "none",
                    "auraIntensity": 0.32,
                    "motionIntensity": "gentle",
                    "displayFont": "serif",
                    "headingWeight": 500,
                    "objectRadius": 2,
                    "borderStyle": "hairline",
                    "shadowDepth": 0.42,
                    "accentColor": "#ffd84d",
                },
            }
        },
        "motion_config": {"studio_v2": {"motionIntensity": "gentle", "auraIntensity": 0.32}},
        "asset_config": {"studio_v2": {"assets": assets}},
        "content_config": {
            "studio_v2": {
                "schemaVersion": SCHEMA_VERSION,
                "roomId": str(room_id),
                "slug": TARGET_SLUG,
                "title": TARGET_TITLE,
                "tagline": "Image-first threshold gallery from the bbb.vision source archive.",
                "objects": objects,
                "moodboardRefs": [],
                "traces": {"enabled": False, "demo": False, "disclosure": "No public traces are enabled."},
                "cta": {"label": "Enter"},
            }
        },
        "roomkey_config": {"studio_v2": {"portals": [{"objectId": cta_object["id"], "label": "Enter"}]}},
        "enquiry_config": {"studio_v2": {"primaryCta": {"label": "Enter"}}},
        "locked_fields": {},
    }


def _create_or_update_room(owner: Any, environment: str, existing_room: Any | None):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import PresenceNode
    from manara_backend_app.services.presence_service import create_presence_node, publish_presence_node, update_presence_node

    tenant, tenant_created = _get_or_create_tenant(environment)
    room_created = False
    if existing_room:
        room = existing_room
        update_presence_node(
            room,
            {
                "slug": TARGET_SLUG,
                "display_name": TARGET_TITLE,
                "headline": "Image-first threshold gallery from the bbb.vision source archive.",
                "bio": "A controlled Presence Studio V2 migration of bbb.vision source imagery into an editable public room.",
                "node_type": "creative",
                "display_mode": "artist_gallery",
                "room_type": "artist_studio",
                "theme_preset": "minimal_mono",
                "visual_mood": "black-threshold-gallery",
                "accent_color": "#ffd84d",
                "plan_type": "artist_presence",
                "status": "published",
                "visibility": "public",
                "public_status": "public",
                "landing_enabled": True,
                "landing_title": TARGET_TITLE,
                "landing_subtitle": "Image-first threshold gallery.",
                "landing_enter_label": "Enter",
                "primary_cta_label": "Enter",
                "business_functions_enabled": False,
                "directory_ready": True,
                "archive_ready": True,
                "tenant_id": tenant.id,
                "organisation_id": tenant.id,
                "metadata": _room_metadata(room.node_metadata, environment, owner.id),
            },
        )
        room.owner_user_id = owner.id
    else:
        room = create_presence_node(
            {
                "slug": TARGET_SLUG,
                "display_name": TARGET_TITLE,
                "headline": "Image-first threshold gallery from the bbb.vision source archive.",
                "bio": "A controlled Presence Studio V2 migration of bbb.vision source imagery into an editable public room.",
                "node_type": "creative",
                "display_mode": "artist_gallery",
                "room_type": "artist_studio",
                "theme_preset": "minimal_mono",
                "visual_mood": "black-threshold-gallery",
                "accent_color": "#ffd84d",
                "plan_type": "artist_presence",
                "status": "published",
                "visibility": "public",
                "public_status": "public",
                "landing_enabled": True,
                "landing_title": TARGET_TITLE,
                "landing_subtitle": "Image-first threshold gallery.",
                "landing_enter_label": "Enter",
                "primary_cta_label": "Enter",
                "business_functions_enabled": False,
                "directory_ready": True,
                "archive_ready": True,
                "tenant_id": tenant.id,
                "organisation_id": tenant.id,
                "metadata": _room_metadata({}, environment, owner.id),
            },
            actor=owner,
        )
        room_created = True
    db.session.flush()
    publish_presence_node(room)
    db.session.flush()
    return room, {"tenant_created": tenant_created, "room_created": room_created}


def _supabase_headers(app, subject: str, email: str) -> dict[str, str]:
    from flask_jwt_extended import create_access_token

    with app.app_context():
        token = create_access_token(
            identity=subject,
            additional_claims={
                "aud": "public",
                "token_use": "public",
                "requires_mfa": False,
                "role": "authenticated",
                "email": email,
                "user_metadata": {"display_name": TARGET_TITLE},
                "app_metadata": {"provider": "email"},
            },
            expires_delta=timedelta(minutes=10),
        )
    return {"Authorization": f"Bearer {token}"}


def _seed_through_owner_editor_api(app, *, email: str, auth_subject: str, room_id: int) -> dict[str, Any]:
    client = app.test_client()
    headers = _supabase_headers(app, auth_subject, email)
    public_origin = "https://public.test"
    payload = _bbbvision_editor_payload(room_id)

    overview_before = client.get(f"/api/presence/owner/rooms/{room_id}/editor", headers=headers, base_url=public_origin)
    if overview_before.status_code >= 400:
        raise RuntimeError(f"Owner editor overview failed before seed: {overview_before.status_code}")

    save = client.post(
        f"/api/presence/owner/rooms/{room_id}/editor/draft",
        headers=headers,
        json=payload,
        base_url=public_origin,
    )
    if save.status_code >= 400:
        raise RuntimeError(f"Owner editor draft save failed: {save.status_code} {save.get_data(as_text=True)[:500]}")

    preview = client.post(
        f"/api/presence/owner/rooms/{room_id}/editor/preview",
        headers=headers,
        base_url=public_origin,
    )
    if preview.status_code >= 400:
        raise RuntimeError(f"Owner editor preview failed: {preview.status_code} {preview.get_data(as_text=True)[:500]}")

    publish = client.post(
        f"/api/presence/owner/rooms/{room_id}/editor/publish",
        headers=headers,
        base_url=public_origin,
    )
    if publish.status_code >= 400:
        raise RuntimeError(f"Owner editor publish failed: {publish.status_code} {publish.get_data(as_text=True)[:500]}")

    overview_after = client.get(f"/api/presence/owner/rooms/{room_id}/editor", headers=headers, base_url=public_origin)
    if overview_after.status_code >= 400:
        raise RuntimeError(f"Owner editor overview failed after seed: {overview_after.status_code}")
    assets = client.get(f"/api/presence/owner/rooms/{room_id}/assets", headers=headers, base_url=public_origin)
    if assets.status_code >= 400:
        raise RuntimeError(f"Owner assets panel API failed after seed: {assets.status_code}")

    return {
        "overview_before_status": overview_before.status_code,
        "draft_save_status": save.status_code,
        "preview_status": preview.status_code,
        "publish_status": publish.status_code,
        "overview_after_status": overview_after.status_code,
        "assets_status": assets.status_code,
        "draft_version": ((save.get_json(silent=True) or {}).get("data") or {}).get("draft", {}).get("version"),
        "published_version": ((publish.get_json(silent=True) or {}).get("data") or {}).get("published", {}).get("version"),
        "asset_count": len((((assets.get_json(silent=True) or {}).get("data") or {}).get("items") or [])),
    }


def _public_api_checks(app, slug: str) -> dict[str, Any]:
    client = app.test_client()
    public_origin = "https://public.test"
    public_room = client.get(f"/api/presence/public/{slug}", base_url=public_origin)
    payload = public_room.get_json(silent=True) or {}
    text = json.dumps(payload, sort_keys=True)
    return {
        "public_api_status": public_room.status_code,
        "public_api_ok": 200 <= public_room.status_code < 300,
        "public_api_has_bbbvision_style": TARGET_PUBLIC_STYLE in text,
        "public_api_has_renderer": RENDERER_KEY in text,
        "public_api_forbidden_terms_absent": not any(
            term.lower() in text.lower()
            for term in ("owner_user_id", "platform_admin", "service_role", "bearer ", "access_token", "refresh_token")
        ),
    }


def _select_existing_room(rooms: list[Any]) -> tuple[Any | None, str]:
    if not rooms:
        return None, "create_new"
    exact = [room for room in rooms if str(room.slug or "").lower() == TARGET_SLUG]
    if exact:
        return exact[0], "convert_existing_exact_slug"
    strong = [
        room
        for room in rooms
        if str(room.slug or "").lower() in {"bbb-vision", "bbb.vision"}
        or str(room.display_name or "").lower() in {"bbbvision", "bbb-vision", "bbb.vision"}
    ]
    if len(strong) == 1:
        return strong[0], "convert_existing_strong_match"
    raise RuntimeError(
        "Multiple or weak bbbvision-related rooms were found; stop before mutation and choose manually."
    )


def _dry_run(app, args: argparse.Namespace) -> dict[str, Any]:
    with app.app_context():
        owner = _owner_account(_clean_email(args.email))
        rooms = _find_bbbvision_rooms()
        selected, plan = _select_existing_room(rooms) if len(rooms) <= 1 else (None, "ambiguous_multiple_matches")
        return {
            "mode": "dry_run",
            "environment": args.environment,
            "owner": owner["summary"],
            "hosted_account_action_required": (
                None
                if owner["exists"]
                else "Create/sign in the external Supabase account and bind a Presence app user before applying hosted mutation."
            ),
            "search": {
                "slugs": list(LIKELY_SLUGS),
                "matches": [{"id": room.id, "slug": room.slug, "title": room.display_name} for room in rooms],
                "selected_room_id": getattr(selected, "id", None),
                "plan": plan,
            },
            "would_seed": {
                "slug": TARGET_SLUG,
                "title": TARGET_TITLE,
                "public_style_preset": TARGET_PUBLIC_STYLE,
                "threshold_assets": len(LANDING_ASSETS),
                "gallery_assets": len(GALLERY_ASSETS),
                "text_story_objects": 1,
                "cta_objects": 1,
                "asset_url_origin": "https://bbbvision.vercel.app",
            },
            "secret_values_printed": False,
            "tokens_printed": False,
        }


def _apply(app, args: argparse.Namespace) -> dict[str, Any]:
    from manara_backend_app.extensions import db

    email = _clean_email(args.email)
    with app.app_context():
        owner = _owner_account(email)
        if not owner["exists"]:
            return {
                "mode": "apply",
                "environment": args.environment,
                "status": "blocked_missing_hosted_account",
                "owner": owner["summary"],
                "mutated": False,
                "hosted_account_action_required": (
                    "Create/sign in the external Supabase account and bind a Presence app user before applying hosted mutation."
                ),
                "secret_values_printed": False,
                "tokens_printed": False,
            }
        if not owner["summary"]["supabase_subject_matches_presence"]:
            return {
                "mode": "apply",
                "environment": args.environment,
                "status": "blocked_subject_mismatch",
                "owner": owner["summary"],
                "mutated": False,
                "hosted_account_action_required": "Repair Presence app user global_subject_id binding before hosted mutation.",
                "secret_values_printed": False,
                "tokens_printed": False,
            }

        rooms = _find_bbbvision_rooms()
        existing_room, assignment_plan = _select_existing_room(rooms)
        backup = _backup_existing_rooms(rooms, args.backup_dir)
        room, creation = _create_or_update_room(owner["app_user"], args.environment, existing_room)
        db.session.commit()

        editor_result = _seed_through_owner_editor_api(
            app,
            email=email,
            auth_subject=str(owner["auth_subject"]),
            room_id=room.id,
        )
        public_checks = _public_api_checks(app, room.slug)
        result = {
            "mode": "apply",
            "environment": args.environment,
            "status": "applied",
            "mutated": True,
            "owner": owner["summary"],
            "assignment_plan": assignment_plan,
            "creation": creation,
            "room": {
                "id": room.id,
                "slug": room.slug,
                "title": room.display_name,
                "owner_user_id": room.owner_user_id,
                "status": room.status,
                "visibility": room.visibility,
                "public_status": room.public_status,
            },
            "backup": backup,
            "seed": {
                "method": "owner_editor_api_via_existing_supabase_subject",
                "renderer_key": RENDERER_KEY,
                "public_style_preset": TARGET_PUBLIC_STYLE,
                "threshold_assets": len(LANDING_ASSETS),
                "gallery_assets": len(GALLERY_ASSETS),
                "text_story_objects": 1,
                "cta_objects": 1,
                "asset_url_origin": "https://bbbvision.vercel.app",
                "source_local_path": "C:/Dev/bbb-vision-site",
                "editor_api": editor_result,
            },
            "public_api_checks": public_checks,
            "rollback": {
                "backup_dir": str(args.backup_dir),
                "created_new_room": bool(creation["room_created"]),
                "recommended_path": (
                    "archive or unpublish the created bbbvision room"
                    if creation["room_created"]
                    else "restore the backed-up room fields and editable config versions"
                ),
            },
            "secret_values_printed": False,
            "tokens_printed": False,
        }
        _write_json(args.backup_dir / "seeded_bbbvision_payload_summary.json", {
            "room_id": room.id,
            "slug": room.slug,
            "source_assets": {
                "landing": [
                    {"id": item[0], "title": item[1], "local_path": f"C:/Dev/bbb-vision-site/{item[2]}", "public_url": _public_asset_url(item[2])}
                    for item in LANDING_ASSETS
                ],
                "gallery": [
                    {"id": item[0], "title": item[1], "local_path": f"C:/Dev/bbb-vision-site/{item[2]}", "public_url": _public_asset_url(item[2])}
                    for item in GALLERY_ASSETS
                ],
            },
            "public_style_preset": TARGET_PUBLIC_STYLE,
            "renderer_key": RENDERER_KEY,
        })
        return result


def _args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create/assign and seed hosted bbbvision Presence Studio V2 room.")
    parser.add_argument("--email", default=TARGET_EMAIL)
    parser.add_argument("--environment", choices=("local", "hosted_controlled_launch"), default="local")
    parser.add_argument("--backend-env-file", type=Path, default=DEFAULT_BACKEND_ENV)
    parser.add_argument("--output-json", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--backup-dir", type=Path, default=DEFAULT_BACKUP_DIR)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--apply", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _args(argv)
    if args.environment == "hosted_controlled_launch":
        _load_env_file(args.backend_env_file)
    app = _build_app(_database_url(args.environment))
    schema = _assert_schema(app)
    operation = _apply(app, args) if args.apply else _dry_run(app, args)
    result = {"schema": schema, "operation": operation, "secret_values_printed": False, "tokens_printed": False}
    _write_json(args.output_json, result)
    print(json.dumps({"output_json": str(args.output_json), **result}, indent=2, sort_keys=True))
    return 0 if operation.get("status") not in {"blocked_missing_hosted_account", "blocked_subject_mismatch"} else 1


if __name__ == "__main__":
    raise SystemExit(main())
