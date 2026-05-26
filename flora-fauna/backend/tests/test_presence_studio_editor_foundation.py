import io
import os
from datetime import timedelta
from urllib.parse import urlsplit

import pytest

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-presence-editor-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-presence-editor-1234"

from flask_jwt_extended import create_access_token  # noqa: E402
from werkzeug.datastructures import FileStorage  # noqa: E402

from backend_factory import load_create_app  # noqa: E402


CONTROL_SECRET = "presence-editor-control-secret"


def _build_app():
    create_app = load_create_app()
    return create_app(
        {
            "TESTING": True,
            "FLASK_ENV": "production",
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
            "CONTROL_PLANE_HOSTS": ["control.test"],
            "CONTROL_PLANE_SHARED_SECRET": CONTROL_SECRET,
            "CONTROL_PLANE_ALLOWED_ROLES": ["platform_admin", "node_admin"],
            "CONTROL_REQUIRE_TOKEN_GRANT": False,
            "CONTROL_PLANE_JWT_AUDIENCE": "control",
            "RATELIMIT_ENABLED": False,
        }
    )


def _headers(app, username, role="participant"):
    with app.app_context():
        token = create_access_token(
            identity=username,
            additional_claims={
                "aud": "public",
                "token_use": "public",
                "role": role,
                "username": username,
            },
            expires_delta=timedelta(minutes=30),
        )
    return {"Authorization": f"Bearer {token}"}


def _seed(app):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, PresenceNode, PresenceWork, User

    with app.app_context():
        tenant = Node(name="Presence Editor Tenant", slug="presence-editor-tenant", status="active")
        owner = User(username="ggm-owner", pseudonym="GGM Owner", email="owner@example.com", password="hash", role="participant")
        other = User(username="other-owner", pseudonym="Other Owner", email="other@example.com", password="hash", role="participant")
        admin = User(username="platform-admin", pseudonym="Platform Admin", email="platform@example.com", password="hash", role="platform_admin")
        db.session.add_all([tenant, owner, other, admin])
        db.session.flush()
        room = PresenceNode(
            tenant_id=tenant.id,
            owner_user_id=owner.id,
            slug="ggm-christina-goddard",
            display_name="Christina Kerkvliet Goddard",
            headline="Christina Kerkvliet Goddard - selected watercolour works",
            bio="Australian artist working across memory, colour, and lived landscape.",
            node_type="artist",
            display_mode="artist_gallery",
            room_type="artist_studio",
            theme_preset="gallery_white",
            accent_color="#111111",
            status="published",
            visibility="public",
            public_status="public",
            primary_cta_label="Begin a conversation",
            node_metadata={
                "custom_presence": {
                    "custom_renderer_key": "ggm-faithful-room-v1",
                    "public_style_dna": {"renderer_key": "ggm-faithful-room-v1"},
                }
            },
        )
        plain_room = PresenceNode(
            tenant_id=tenant.id,
            owner_user_id=owner.id,
            slug="plain-presence-room",
            display_name="Plain Presence Room",
            node_type="consultant",
            display_mode="professional_contract",
            status="published",
            visibility="public",
            public_status="public",
        )
        db.session.add_all([room, plain_room])
        db.session.flush()
        db.session.add_all(
            [
                PresenceWork(
                    node_id=room.id,
                    slug="willow-of-port-arthur-2019",
                    title="Willow of Port Arthur",
                    year="2019",
                    medium="Watercolour on paper",
                    dimensions="93 x 104 cm",
                    description="A luminous green canopy.",
                    image_url="/ggm/works/willow-of-port-arthur-2019.webp",
                    thumbnail_url="/ggm/thumbs/willow-of-port-arthur-2019.webp",
                    sort_order=1,
                    is_visible=True,
                ),
                PresenceWork(
                    node_id=room.id,
                    slug="bridle-road-2005",
                    title="Bridle Road",
                    year="2005",
                    medium="Watercolour on paper",
                    dimensions="41 x 61 cm",
                    description="A branching roadway.",
                    image_url="/ggm/works/bridle-road-2005.webp",
                    thumbnail_url="/ggm/thumbs/bridle-road-2005.webp",
                    sort_order=2,
                    is_visible=True,
                ),
            ]
        )
        db.session.commit()
        return {
            "room_id": room.id,
            "plain_room_id": plain_room.id,
            "owner_id": owner.id,
            "other_id": other.id,
            "admin_id": admin.id,
            "room_slug": room.slug,
        }


def _ggm_editor_config(title="Artwork Field"):
    return {
        "renderer_key": "ggm-faithful-room-v1",
        "scene_config": {
            "scenes": [
                {
                    "id": "artwork_field",
                    "label": title,
                    "title": title,
                    "subtitle": "Colour as Memory",
                    "primary_artwork_slug": "willow-of-port-arthur-2019",
                    "action_labels": {"primary": "Begin a conversation"},
                    "roomkey_provenance_text": "Opened via NFC",
                },
                {
                    "id": "work_wall",
                    "label": "Work Wall",
                    "artwork_order": ["willow-of-port-arthur-2019", "bridle-road-2005"],
                    "selected_work_slug": "willow-of-port-arthur-2019",
                },
                {"id": "practice_studio", "label": "Practice Studio"},
                {"id": "calling_card", "label": "Calling Card"},
            ]
        },
        "style_dna": {
            "palette": {"bg": "#f4f4f4", "paper": "#eceae7", "ink": "#111111"},
            "typography": {"heading_stack": "Inter Tight, Helvetica Neue, Arial, sans-serif"},
        },
        "motion_config": {
            "liquid_style": "ripple",
            "liquid_intensity": 0.95,
            "morph_speed_ms": 1100,
            "dither_strength": 0.62,
            "film_grain_strength": 0.42,
            "reduced_motion_fallback": True,
        },
        "asset_config": {
            "hero_image": {"url": "/ggm/works/willow-of-port-arthur-2019.webp", "alt_text": "Willow of Port Arthur"},
            "artworks": [
                {"slug": "willow-of-port-arthur-2019", "url": "/ggm/works/willow-of-port-arthur-2019.webp", "alt_text": "Willow of Port Arthur"},
                {"slug": "bridle-road-2005", "url": "/ggm/works/bridle-road-2005.webp", "alt_text": "Bridle Road"},
            ],
        },
        "content_config": {
            "about": {"biography": "Born in Victoria and raised in South Australia."},
            "contact": {
                "contact_posture": "presence_enquiry_form",
                "email": "owner-private@example.invalid",
                "platform_admin": "do-not-expose",
                "internal_lifetime_free": True,
            },
        },
        "roomkey_config": {
            "entry_label": "Opened via RoomKey",
            "provenance_chip_text": "Opened via NFC/QR",
            "show_save_to_garden": True,
        },
        "enquiry_config": {"cta_label": "Begin a conversation", "delivery_posture": "backend_enquiry_capture"},
        "locked_fields": {
            "renderer_shell": {
                "reason": "Commissioned renderer chrome and shader contract; owner controls content/style tokens through this config.",
            }
        },
    }


def test_owner_editor_read_create_update_preview_publish_public_redaction_and_roomkey():
    app = _build_app()
    ids = _seed(app)
    client = app.test_client()
    owner_headers = _headers(app, "ggm-owner")

    editor = client.get(f"/api/presence/owner/rooms/{ids['room_id']}/editor", headers=owner_headers, base_url="http://public.test")
    assert editor.status_code == 200, editor.get_json()
    assert editor.get_json()["data"]["draft"] is None
    assert editor.get_json()["data"]["suggested_config"]["renderer_key"] == "ggm-faithful-room-v1"

    create = client.post(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/draft",
        json=_ggm_editor_config(),
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert create.status_code == 201, create.get_json()
    draft = create.get_json()["data"]["draft"]
    assert draft["status"] == "draft"
    assert draft["version"] == 1
    assert draft["scene_config"]["scenes"][0]["id"] == "artwork_field"

    patch = client.patch(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/draft",
        json={"motion_config": {"blur_amount": 0.5}},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert patch.status_code == 200, patch.get_json()
    assert patch.get_json()["data"]["draft"]["motion_config"]["blur_amount"] == 0.5
    assert patch.get_json()["data"]["draft"]["motion_config"]["liquid_intensity"] == 0.95

    preview = client.post(f"/api/presence/owner/rooms/{ids['room_id']}/editor/preview", headers=owner_headers, base_url="http://public.test")
    assert preview.status_code == 200, preview.get_json()
    assert preview.get_json()["data"]["preview"] is True
    assert preview.get_json()["data"]["editable_config"]["status"] == "preview"
    assert preview.get_json()["data"]["preview_token"]

    before_publish = client.get(f"/api/presence/public/{ids['room_slug']}", base_url="http://public.test")
    assert before_publish.status_code == 200, before_publish.get_json()
    assert before_publish.get_json()["data"]["editable_config"] is None

    publish = client.post(f"/api/presence/owner/rooms/{ids['room_id']}/editor/publish", headers=owner_headers, base_url="http://public.test")
    assert publish.status_code == 200, publish.get_json()
    public_config = publish.get_json()["data"]["public_config"]
    assert public_config["renderer_key"] == "ggm-faithful-room-v1"
    assert public_config["scene_config"]["scenes"][0]["title"] == "Artwork Field"
    assert "email" not in public_config["content_config"]["contact"]
    assert "platform_admin" not in public_config["content_config"]["contact"]
    assert "internal_lifetime_free" not in public_config["content_config"]["contact"]

    public_room = client.get(f"/api/presence/public/{ids['room_slug']}", base_url="http://public.test")
    assert public_room.status_code == 200, public_room.get_json()
    body = public_room.get_json()["data"]
    assert body["editable_config"]["status"] == "published"
    assert body["editable_config"]["renderer_key"] == "ggm-faithful-room-v1"
    assert body["renderer_key"] == "ggm-faithful-room-v1"
    assert "draft" not in str(body["editable_config"]).lower()
    assert "owner-private@example.invalid" not in str(body)
    assert "platform_admin" not in str(body)
    assert "internal_lifetime_free" not in str(body)

    pass_response = client.post(
        f"/api/presence/owner/rooms/{ids['room_id']}/passes",
        json={"pass_type": "nfc_card", "label": "GGM NFC"},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert pass_response.status_code == 201, pass_response.get_json()
    key_response = client.post(
        f"/api/presence/owner/rooms/{ids['room_id']}/keys",
        json={"key_type": "nfc", "presence_pass_id": pass_response.get_json()["data"]["id"]},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert key_response.status_code == 201, key_response.get_json()
    token = key_response.get_json()["data"]["public_token"]
    resolved = client.get(f"/api/presence/keys/{token}/resolve", base_url="http://public.test")
    assert resolved.status_code == 200, resolved.get_json()
    assert resolved.get_json()["data"]["editable_config"]["roomkey_config"]["entry_label"] == "Opened via RoomKey"
    assert "public_token" not in resolved.get_json()["data"]["room_key"]


def test_draft_is_not_public_publish_history_and_rollback():
    app = _build_app()
    ids = _seed(app)
    client = app.test_client()
    owner_headers = _headers(app, "ggm-owner")

    first = client.post(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/draft",
        json=_ggm_editor_config("Published One"),
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert first.status_code == 201
    assert client.post(f"/api/presence/owner/rooms/{ids['room_id']}/editor/publish", headers=owner_headers, base_url="http://public.test").status_code == 200

    second_draft = client.post(f"/api/presence/owner/rooms/{ids['room_id']}/editor/draft", headers=owner_headers, base_url="http://public.test")
    assert second_draft.status_code == 201
    assert second_draft.get_json()["data"]["draft"]["version"] == 2
    update_second = client.patch(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/draft",
        json={"scene_config": {"scenes": [{"id": "artwork_field", "title": "Draft Two"}]}},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert update_second.status_code == 200
    still_public_one = client.get(f"/api/presence/public/{ids['room_slug']}", base_url="http://public.test")
    assert still_public_one.get_json()["data"]["editable_config"]["scene_config"]["scenes"][0]["title"] == "Published One"

    publish_second = client.post(f"/api/presence/owner/rooms/{ids['room_id']}/editor/publish", headers=owner_headers, base_url="http://public.test")
    assert publish_second.status_code == 200
    assert publish_second.get_json()["data"]["published"]["version"] == 2

    rollback = client.post(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/rollback",
        json={"version": 1},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert rollback.status_code == 200, rollback.get_json()
    assert rollback.get_json()["data"]["published"]["version"] == 3
    assert rollback.get_json()["data"]["public_config"]["scene_config"]["scenes"][0]["title"] == "Published One"

    history = client.get(f"/api/presence/owner/rooms/{ids['room_id']}/editor/history", headers=owner_headers, base_url="http://public.test")
    assert history.status_code == 200
    statuses = [item["status"] for item in history.get_json()["data"]["items"]]
    assert statuses.count("published") == 1
    assert statuses.count("archived") >= 2


def test_non_owner_public_denied_platform_admin_audited_and_plain_room_still_public():
    app = _build_app()
    ids = _seed(app)
    client = app.test_client()
    other_headers = _headers(app, "other-owner")
    admin_headers = _headers(app, "platform-admin", role="platform_admin")

    public_denied = client.post(f"/api/presence/owner/rooms/{ids['room_id']}/editor/draft", json={}, base_url="http://public.test")
    assert public_denied.status_code == 401

    other_denied = client.post(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/draft",
        json={},
        headers=other_headers,
        base_url="http://public.test",
    )
    assert other_denied.status_code == 403

    admin_read = client.get(f"/api/presence/owner/rooms/{ids['room_id']}/editor", headers=admin_headers, base_url="http://public.test")
    assert admin_read.status_code == 200, admin_read.get_json()
    with app.app_context():
        from manara_backend_app.models import ControlAuditEvent

        audit = ControlAuditEvent.query.filter_by(action="presence.editor.read", target_id=str(ids["room_id"])).first()
        assert audit is not None

    plain_public = client.get("/api/presence/public/plain-presence-room", base_url="http://public.test")
    assert plain_public.status_code == 200, plain_public.get_json()
    assert plain_public.get_json()["data"]["editable_config"] is None


def test_invalid_editor_payloads_and_asset_attach_are_guarded():
    app = _build_app()
    ids = _seed(app)
    client = app.test_client()
    owner_headers = _headers(app, "ggm-owner")

    script = client.post(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/draft",
        json={"content_config": {"hero_title": "<script>alert(1)</script>"}},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert script.status_code == 422, script.get_json()

    local_path = client.post(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/draft",
        json={"asset_config": {"hero_image": {"url": "C:\\Dev\\ggm\\assets\\secret.webp"}}},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert local_path.status_code == 422, local_path.get_json()

    bad_url = client.post(
        f"/api/presence/owner/rooms/{ids['room_id']}/assets/attach",
        json={"slot": "hero_image", "asset_type": "image", "url": "file:///tmp/secret.webp"},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert bad_url.status_code == 422

    attach = client.post(
        f"/api/presence/owner/rooms/{ids['room_id']}/assets/attach",
        json={"slot": "hero_image", "asset_type": "image", "url": "/ggm/works/empty-nest-2014.webp", "alt_text": "Empty Nest"},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert attach.status_code == 201, attach.get_json()
    assert any(item["url"] == "/ggm/works/empty-nest-2014.webp" for item in attach.get_json()["data"]["assets"])


def test_editor_image_upload_is_owner_scoped_and_only_visible_after_selected_publish():
    app = _build_app()
    ids = _seed(app)
    client = app.test_client()
    owner_headers = _headers(app, "ggm-owner")
    other_headers = _headers(app, "other-owner")
    png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 24

    anonymous = client.post(
        f"/api/presence/owner/rooms/{ids['room_id']}/assets/upload",
        data={"file": (io.BytesIO(png), "cover.png", "image/png")},
        content_type="multipart/form-data",
        base_url="http://public.test",
    )
    assert anonymous.status_code == 401
    denied = client.post(
        f"/api/presence/owner/rooms/{ids['room_id']}/assets/upload",
        data={"file": (io.BytesIO(png), "cover.png", "image/png")},
        headers=other_headers,
        content_type="multipart/form-data",
        base_url="http://public.test",
    )
    assert denied.status_code == 403

    upload = client.post(
        f"/api/presence/owner/rooms/{ids['room_id']}/assets/upload",
        data={
            "file": (io.BytesIO(png), "cover.png", "image/png"),
            "alt_text": "Uploaded cover image",
            "role": "cover",
        },
        headers=owner_headers,
        content_type="multipart/form-data",
        base_url="http://public.test",
    )
    assert upload.status_code == 201, upload.get_json()
    uploaded = upload.get_json()["data"]["uploaded_asset"]
    assert uploaded["role"] == "cover"
    assert uploaded["mime_type"] == "image/png"
    assert uploaded["url"].startswith("http://public.test/media/uploads/presence/rooms/")
    assert "/images/" in uploaded["url"]
    assert f"/presence/{ids['owner_id']}/{ids['room_id']}/" not in uploaded["url"]
    assert upload.get_json()["data"]["storage_policy"] == "public_unlisted_until_used"

    before = client.get(f"/api/presence/public/{ids['room_slug']}", base_url="http://public.test")
    assert uploaded["url"] not in str(before.get_json())

    patch = client.patch(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/draft",
        json={"asset_config": {"hero_image": {"url": uploaded["url"], "alt_text": "Uploaded cover image"}}},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert patch.status_code == 200, patch.get_json()
    preview = client.post(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/preview",
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert uploaded["url"] in str(preview.get_json()["data"]["editable_config"])
    assert "attached_assets" not in str(preview.get_json()["data"]["editable_config"])

    still_public = client.get(f"/api/presence/public/{ids['room_slug']}", base_url="http://public.test")
    assert uploaded["url"] not in str(still_public.get_json())
    published = client.post(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/publish",
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert published.status_code == 200, published.get_json()
    public_after = client.get(f"/api/presence/public/{ids['room_slug']}", base_url="http://public.test")
    body = str(public_after.get_json()["data"]["editable_config"])
    assert uploaded["url"] in body
    assert "attached_assets" not in body
    assert f"/presence/{ids['owner_id']}/{ids['room_id']}/" not in body


def test_editor_image_upload_policy_blocks_unsafe_types_mismatches_and_oversize_files():
    app = _build_app()
    ids = _seed(app)
    client = app.test_client()
    owner_headers = _headers(app, "ggm-owner")
    endpoint = f"/api/presence/owner/rooms/{ids['room_id']}/assets/upload"

    for filename, mime_type, payload in [
        ("drawing.svg", "image/svg+xml", b"<svg></svg>"),
        ("page.html", "text/html", b"<html></html>"),
        ("document.pdf", "application/pdf", b"%PDF-1.7"),
        ("program.exe", "application/octet-stream", b"MZ"),
    ]:
        rejected = client.post(
            endpoint,
            data={"file": (io.BytesIO(payload), filename, mime_type)},
            headers=owner_headers,
            content_type="multipart/form-data",
            base_url="http://public.test",
        )
        assert rejected.status_code == 422

    bad_role = client.post(
        endpoint,
        data={
            "file": (io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 24), "cover.png", "image/png"),
            "role": "script",
        },
        headers=owner_headers,
        content_type="multipart/form-data",
        base_url="http://public.test",
    )
    assert bad_role.status_code == 422

    mismatch = client.post(
        endpoint,
        data={"file": (io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 24), "photo.jpg", "image/jpeg")},
        headers=owner_headers,
        content_type="multipart/form-data",
        base_url="http://public.test",
    )
    assert mismatch.status_code == 422

    oversized = client.post(
        endpoint,
        data={"file": (io.BytesIO(b"\xff\xd8\xff" + b"\x00" * (8 * 1024 * 1024 + 1)), "large.jpg", "image/jpeg")},
        headers=owner_headers,
        content_type="multipart/form-data",
        base_url="http://public.test",
    )
    assert oversized.status_code in (413, 422)


def test_private_draft_media_is_signed_for_preview_and_promoted_only_on_publish(tmp_path):
    app = _build_app()
    app.config.update(
        PRESENCE_MEDIA_STORAGE_BACKEND="local",
        PRESENCE_MEDIA_PRIVATE_DRAFT_ENABLED=True,
        PRESENCE_MEDIA_PRIVATE_FOLDER=str(tmp_path / "private"),
        UPLOAD_FOLDER=str(tmp_path / "public"),
    )
    ids = _seed(app)
    client = app.test_client()
    owner_headers = _headers(app, "ggm-owner")
    png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 24

    upload = client.post(
        f"/api/presence/owner/rooms/{ids['room_id']}/assets/upload",
        data={"file": (io.BytesIO(png), "private-cover.png", "image/png"), "role": "cover", "alt_text": "Private cover"},
        headers=owner_headers,
        content_type="multipart/form-data",
        base_url="http://public.test",
    )
    assert upload.status_code == 201, upload.get_json()
    uploaded = upload.get_json()["data"]["uploaded_asset"]
    assert upload.get_json()["data"]["storage_policy"] == "private_draft_promoted_on_publish"
    assert uploaded["visibility"] == "private_draft"
    assert "/api/presence/media/private/" in uploaded["url"]
    private_url = urlsplit(uploaded["url"])
    denied = client.get(private_url.path, base_url="http://public.test")
    assert denied.status_code == 403
    readable = client.get(f"{private_url.path}?{private_url.query}", base_url="http://public.test")
    assert readable.status_code == 200
    assert "no-store" in readable.headers["Cache-Control"]

    public_before = str(client.get(f"/api/presence/public/{ids['room_slug']}", base_url="http://public.test").get_json())
    assert "/api/presence/media/private/" not in public_before
    assert uploaded["media_id"] not in public_before

    patch = client.patch(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/draft",
        json={
            "asset_config": {
                "hero_image": {
                    "media_id": uploaded["media_id"],
                    "url": uploaded["url"],
                    "alt_text": "Private cover",
                }
            }
        },
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert patch.status_code == 200, patch.get_json()
    with app.app_context():
        from manara_backend_app.models import PresenceEditableConfig

        raw_draft = PresenceEditableConfig.query.filter_by(room_id=ids["room_id"], status="draft").first()
        raw_hero = raw_draft.asset_config_json["hero_image"]
        assert "url" not in raw_hero
        assert "preview_expires_at" not in raw_hero
    preview = client.post(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/preview",
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert "/api/presence/media/private/" in str(preview.get_json()["data"]["editable_config"])

    published = client.post(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/publish",
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert published.status_code == 200, published.get_json()
    public_after = str(client.get(f"/api/presence/public/{ids['room_slug']}", base_url="http://public.test").get_json())
    assert f"/media/uploads/presence/published/rooms/{ids['room_id']}/{uploaded['media_id']}/display.png" in public_after
    assert "/api/presence/media/private/" not in public_after
    assert "media_id" not in public_after

    with app.app_context():
        from manara_backend_app.models import PresenceMediaAsset

        record = PresenceMediaAsset.query.get(uploaded["media_id"])
        assert record.status == "published"
        assert record.visibility == "public_published"
        assert record.draft_storage_key.startswith("presence/draft/rooms/")
        assert record.published_storage_key.startswith("presence/published/rooms/")


def test_private_unused_media_can_be_cleaned_without_deleting_published_assets(tmp_path):
    app = _build_app()
    app.config.update(
        PRESENCE_MEDIA_STORAGE_BACKEND="local",
        PRESENCE_MEDIA_PRIVATE_DRAFT_ENABLED=True,
        PRESENCE_MEDIA_PRIVATE_FOLDER=str(tmp_path / "private"),
        UPLOAD_FOLDER=str(tmp_path / "public"),
        PRESENCE_MEDIA_ORPHAN_MIN_AGE_SECONDS=0,
    )
    ids = _seed(app)
    client = app.test_client()
    owner_headers = _headers(app, "ggm-owner")
    png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 24
    upload = client.post(
        f"/api/presence/owner/rooms/{ids['room_id']}/assets/upload",
        data={"file": (io.BytesIO(png), "unused.png", "image/png"), "role": "unused"},
        headers=owner_headers,
        content_type="multipart/form-data",
        base_url="http://public.test",
    )
    media_id = upload.get_json()["data"]["uploaded_asset"]["media_id"]
    published = client.post(
        f"/api/presence/owner/rooms/{ids['room_id']}/editor/publish",
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert published.status_code == 200
    cleanup = client.post(
        f"/api/presence/owner/rooms/{ids['room_id']}/assets/cleanup",
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert cleanup.status_code == 200
    assert cleanup.get_json()["data"]["deleted_count"] == 1
    with app.app_context():
        from manara_backend_app.models import PresenceMediaAsset

        record = PresenceMediaAsset.query.get(media_id)
        assert record.status == "deleted"


def test_private_supabase_upload_rejects_a_bucket_that_is_anonymously_readable(monkeypatch):
    app = _build_app()
    app.config.update(
        PRESENCE_MEDIA_STORAGE_BACKEND="supabase",
        SUPABASE_URL="https://storage.test",
        SUPABASE_SERVICE_ROLE_KEY="service-key-for-test-only",
        PRESENCE_MEDIA_DRAFT_BUCKET="presence-private-drafts",
    )
    from manara_backend_app.services import presence_media_storage

    class Response:
        def __init__(self, status_code):
            self.status_code = status_code

    deleted = []
    monkeypatch.setattr(presence_media_storage.requests, "put", lambda *args, **kwargs: Response(201))
    monkeypatch.setattr(presence_media_storage.requests, "get", lambda *args, **kwargs: Response(200))
    monkeypatch.setattr(
        presence_media_storage.requests,
        "delete",
        lambda *args, **kwargs: deleted.append(args[0]) or Response(204),
    )
    file = FileStorage(
        stream=io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 24),
        filename="cover.png",
        content_type="image/png",
    )

    with app.test_request_context(base_url="http://public.test"):
        with pytest.raises(presence_media_storage.PresenceMediaStorageError, match="not private"):
            presence_media_storage.store_presence_draft_image(
                file,
                storage_path="presence/draft/rooms/1/private.png",
            )
    assert deleted
