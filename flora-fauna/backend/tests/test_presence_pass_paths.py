import os
from datetime import timedelta

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-presence-pass-paths-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-presence-pass-paths-1234"

from flask_jwt_extended import create_access_token  # noqa: E402

from backend_factory import load_create_app  # noqa: E402


CONTROL_SECRET = "presence-control-secret"
PRESENCE_SCOPES = [
    "presence.node.create",
    "presence.node.read",
    "presence.node.update",
    "presence.analytics.read",
    "presence.nfc.manage",
]


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


def _auth_headers(app, username, role="participant", *, control=False):
    with app.app_context():
        if control:
            token = create_access_token(
                identity=f"control::{username}",
                additional_claims={
                    "aud": "control",
                    "token_use": "control",
                    "requires_mfa": True,
                    "role": role,
                    "scp": PRESENCE_SCOPES,
                },
                expires_delta=timedelta(minutes=30),
            )
            return {"Authorization": f"Bearer {token}", "X-Control-Plane-Secret": CONTROL_SECRET}
        token = create_access_token(
            identity=username,
            additional_claims={"aud": "public", "token_use": "public", "role": role, "username": username},
            expires_delta=timedelta(minutes=30),
        )
        return {"Authorization": f"Bearer {token}"}


def _seed(app):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, PresenceNode, User

    with app.app_context():
        tenant_a = Node(name="Presence Tenant A", slug="presence-tenant-a", status="active")
        tenant_b = Node(name="Presence Tenant B", slug="presence-tenant-b", status="active")
        owner_a = User(username="owner-a", pseudonym="Owner A", email="owner-a@example.com", password="hash", role="participant")
        owner_b = User(username="owner-b", pseudonym="Owner B", email="owner-b@example.com", password="hash", role="participant")
        observer = User(username="observer-a", pseudonym="Observer A", email="observer-a@example.com", password="hash", role="participant")
        admin = User(username="platform-admin", pseudonym="Platform Admin", email="platform@example.com", password="hash", role="platform_admin")
        db.session.add_all([tenant_a, tenant_b, owner_a, owner_b, observer, admin])
        db.session.flush()
        room_a = PresenceNode(
            tenant_id=tenant_a.id,
            owner_user_id=owner_a.id,
            slug="pass-path-room",
            display_name="Pass Path Room",
            headline="A public Room.",
            bio="A Room used for pass and path tests.",
            node_type="artist",
            display_mode="room",
            room_type="artist_studio",
            theme_preset="gallery_white",
            location_label="Sydney",
            status="published",
            visibility="public",
            public_status="public",
        )
        room_related = PresenceNode(
            tenant_id=tenant_a.id,
            owner_user_id=owner_a.id,
            slug="related-room",
            display_name="Related Room",
            node_type="artist",
            display_mode="room",
            room_type="artist_studio",
            theme_preset="gallery_white",
            location_label="Sydney",
            status="published",
            visibility="public",
            public_status="public",
        )
        room_b = PresenceNode(
            tenant_id=tenant_b.id,
            owner_user_id=owner_b.id,
            slug="other-owner-room",
            display_name="Other Owner Room",
            node_type="consultant",
            display_mode="room",
            room_type="minimal_card",
            theme_preset="clean_light",
            status="published",
            visibility="public",
            public_status="public",
        )
        db.session.add_all([room_a, room_related, room_b])
        db.session.commit()
        return {
            "room_a": room_a.id,
            "room_related": room_related.id,
            "room_b": room_b.id,
            "owner_a": owner_a.id,
            "owner_b": owner_b.id,
            "observer": observer.id,
        }


def test_room_key_active_paused_revoked_and_guest_encounter_capture():
    app = _build_app()
    ids = _seed(app)
    client = app.test_client()
    owner_headers = _auth_headers(app, "owner-a")

    pass_response = client.post(
        f"/api/presence/owner/rooms/{ids['room_a']}/passes",
        json={"pass_type": "nfc_card", "label": "Launch NFC"},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert pass_response.status_code == 201, pass_response.get_json()
    pass_id = pass_response.get_json()["data"]["id"]

    key_response = client.post(
        f"/api/presence/owner/rooms/{ids['room_a']}/keys",
        json={"key_type": "nfc", "presence_pass_id": pass_id, "campaign_label": "May preview"},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert key_response.status_code == 201, key_response.get_json()
    token = key_response.get_json()["data"]["public_token"]

    resolved = client.get(f"/api/presence/keys/{token}/resolve", base_url="http://public.test")
    assert resolved.status_code == 200, resolved.get_json()
    data = resolved.get_json()["data"]
    assert data["message"] == "Youve entered this Room."
    assert data["encounter"]["source"] == "nfc"
    assert "ip_hash" not in data["encounter"]

    paused = client.patch(
        f"/api/presence/owner/rooms/{ids['room_a']}/keys/{key_response.get_json()['data']['id']}",
        json={"status": "paused"},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert paused.status_code == 200
    paused_resolve = client.get(f"/api/presence/keys/{token}/resolve", base_url="http://public.test")
    assert paused_resolve.status_code == 423

    revoked = client.patch(
        f"/api/presence/owner/rooms/{ids['room_a']}/keys/{key_response.get_json()['data']['id']}",
        json={"status": "revoked"},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert revoked.status_code == 200
    revoked_resolve = client.get(f"/api/presence/keys/{token}/resolve", base_url="http://public.test")
    assert revoked_resolve.status_code == 410
    unknown = client.get("/api/presence/keys/not-a-key/resolve", base_url="http://public.test")
    assert unknown.status_code == 404


def test_observer_profile_save_passport_field_notes_signals_and_mood_boards():
    app = _build_app()
    ids = _seed(app)
    client = app.test_client()
    headers = _auth_headers(app, "observer-a")

    profile = client.post(
        "/api/observer/profile",
        json={"alias": "quiet-walker", "bio_fragment": "I collect textures and traces."},
        headers=headers,
        base_url="http://public.test",
    )
    assert profile.status_code == 201, profile.get_json()
    duplicate = client.patch(
        "/api/observer/profile",
        json={"bio_fragment": "Book me at http://example.com"},
        headers=headers,
        base_url="http://public.test",
    )
    assert duplicate.status_code == 400

    saved = client.post(f"/api/observer/rooms/{ids['room_a']}/save", headers=headers, base_url="http://public.test")
    assert saved.status_code == 201, saved.get_json()
    saved_again = client.post(f"/api/observer/rooms/{ids['room_a']}/save", headers=headers, base_url="http://public.test")
    assert saved_again.status_code == 201
    assert saved_again.get_json()["data"]["connection"]["id"] == saved.get_json()["data"]["connection"]["id"]

    passport = client.get("/api/observer/passport", headers=headers, base_url="http://public.test")
    assert passport.status_code == 200
    assert passport.get_json()["data"]["items"][0]["stamp_type"] == "saved"

    board = client.post(
        "/api/observer/mood-boards",
        json={"title": "Materials", "visibility": "private", "board_type": "material"},
        headers=headers,
        base_url="http://public.test",
    )
    assert board.status_code == 201, board.get_json()
    board_id = board.get_json()["data"]["id"]
    item = client.post(
        f"/api/observer/mood-boards/{board_id}/items",
        json={"item_type": "room", "item_id": ids["room_a"], "title": "Anchor Room"},
        headers=headers,
        base_url="http://public.test",
    )
    assert item.status_code == 201, item.get_json()

    note = client.post(
        "/api/observer/field-notes",
        json={"room_id": ids["room_a"], "body": "Warm timber and a quiet wall.", "visibility": "public"},
        headers=headers,
        base_url="http://public.test",
    )
    assert note.status_code == 201, note.get_json()
    spam = client.post(
        "/api/observer/field-notes",
        json={"room_id": ids["room_a"], "body": "Book my services at me@example.com", "visibility": "public"},
        headers=headers,
        base_url="http://public.test",
    )
    assert spam.status_code == 400

    signal = client.post(
        "/api/observer/signals",
        json={"target_type": "room", "target_id": ids["room_a"], "signal_type": "beautiful"},
        headers=headers,
        base_url="http://public.test",
    )
    assert signal.status_code == 201
    signal_again = client.post(
        "/api/observer/signals",
        json={"target_type": "room", "target_id": ids["room_a"], "signal_type": "beautiful"},
        headers=headers,
        base_url="http://public.test",
    )
    assert signal_again.get_json()["data"]["id"] == signal.get_json()["data"]["id"]


def test_owner_analytics_and_cross_owner_denial():
    app = _build_app()
    ids = _seed(app)
    client = app.test_client()
    owner_headers = _auth_headers(app, "owner-a")
    other_headers = _auth_headers(app, "owner-b")
    observer_headers = _auth_headers(app, "observer-a")

    client.post(f"/api/observer/rooms/{ids['room_a']}/save", headers=observer_headers, base_url="http://public.test")
    analytics = client.get(f"/api/presence/owner/rooms/{ids['room_a']}/analytics", headers=owner_headers, base_url="http://public.test")
    assert analytics.status_code == 200, analytics.get_json()
    assert analytics.get_json()["data"]["saved_rooms_count"] == 1

    forbidden = client.get(f"/api/presence/owner/rooms/{ids['room_a']}/analytics", headers=other_headers, base_url="http://public.test")
    assert forbidden.status_code == 403

    board = client.post(
        f"/api/presence/owner/rooms/{ids['room_a']}/mood-boards",
        json={"title": "Influences", "board_type": "influences", "visibility": "room_public"},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert board.status_code == 201, board.get_json()
    blocked_board = client.post(
        f"/api/presence/owner/rooms/{ids['room_a']}/mood-boards",
        json={"title": "Not mine"},
        headers=other_headers,
        base_url="http://public.test",
    )
    assert blocked_board.status_code == 403


def test_path_generation_from_room_and_mood_board_hides_private_boards():
    app = _build_app()
    ids = _seed(app)
    client = app.test_client()
    owner_headers = _auth_headers(app, "owner-a")
    observer_headers = _auth_headers(app, "observer-a")

    public_board = client.post(
        f"/api/presence/owner/rooms/{ids['room_a']}/mood-boards",
        json={"title": "Studio references", "visibility": "room_public", "board_type": "influences"},
        headers=owner_headers,
        base_url="http://public.test",
    )
    board_id = public_board.get_json()["data"]["id"]
    private_board = client.post(
        "/api/observer/mood-boards",
        json={"title": "Private saves", "visibility": "private"},
        headers=observer_headers,
        base_url="http://public.test",
    )
    assert private_board.status_code == 201

    generated = client.post(f"/api/paths/generate/from-room/{ids['room_a']}", base_url="http://public.test")
    assert generated.status_code == 201, generated.get_json()
    path = generated.get_json()["data"]
    assert len(path["waypoints"]) >= 2
    assert path["choices"]
    assert all(wp["reason_shown"] for wp in path["waypoints"])
    assert private_board.get_json()["data"]["id"] not in [wp["waypoint_id"] for wp in path["waypoints"] if wp["waypoint_type"] == "mood_board"]

    board_path = client.post(f"/api/paths/generate/from-mood-board/{board_id}", base_url="http://public.test")
    assert board_path.status_code == 201, board_path.get_json()
    assert board_path.get_json()["data"]["trailhead_type"] == "mood_board"

    walk = client.post(f"/api/observer/paths/{path['id']}/walks", headers=observer_headers, base_url="http://public.test")
    assert walk.status_code == 201
    trace = client.post(
        f"/api/observer/paths/{path['id']}/traces",
        json={"trace_type": "view", "waypoint_id": path["waypoints"][0]["id"]},
        headers=observer_headers,
        base_url="http://public.test",
    )
    assert trace.status_code == 201
    choice = client.post(
        f"/api/observer/paths/{path['id']}/choose",
        json={"choice_id": path["choices"][0]["id"]},
        headers=observer_headers,
        base_url="http://public.test",
    )
    assert choice.status_code == 201


def test_field_note_hide_report_world_readiness_and_public_presence_regression():
    app = _build_app()
    ids = _seed(app)
    client = app.test_client()
    owner_headers = _auth_headers(app, "owner-a")
    other_headers = _auth_headers(app, "owner-b")
    observer_headers = _auth_headers(app, "observer-a")
    control_headers = _auth_headers(app, "platform-admin", role="platform_admin", control=True)

    note = client.post(
        "/api/observer/field-notes",
        json={"room_id": ids["room_a"], "body": "A calm signal on the wall.", "visibility": "public"},
        headers=observer_headers,
        base_url="http://public.test",
    )
    note_id = note.get_json()["data"]["id"]
    blocked_hide = client.post(
        f"/api/presence/owner/rooms/{ids['room_a']}/field-notes/{note_id}/hide",
        headers=other_headers,
        base_url="http://public.test",
    )
    assert blocked_hide.status_code == 403
    hidden = client.post(
        f"/api/presence/owner/rooms/{ids['room_a']}/field-notes/{note_id}/hide",
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert hidden.status_code == 200
    assert hidden.get_json()["data"]["status"] == "hidden"

    report = client.post(
        f"/api/observer/field-notes/{note_id}/report",
        json={"reason": "Testing report flow."},
        headers=observer_headers,
        base_url="http://public.test",
    )
    assert report.status_code == 201

    readiness = client.post(
        "/api/admin/presence/world-readiness/recompute",
        headers=control_headers,
        base_url="http://control.test",
    )
    assert readiness.status_code == 201, readiness.get_json()
    data = readiness.get_json()["data"]
    assert data["status"] in {"hidden", "forming", "preview", "ready"}
    public_status = client.get("/api/admin/presence/world-readiness", headers=control_headers, base_url="http://control.test")
    assert public_status.status_code == 200
    assert "Rooms will open into a shared map" in public_status.get_json()["data"]["message"]

    public_room = client.get("/api/presence/public/pass-path-room", base_url="http://public.test")
    assert public_room.status_code == 200, public_room.get_json()
    qr = client.get("/api/presence/public/pass-path-room/qr", base_url="http://public.test")
    assert qr.status_code == 200
    vcard = client.get("/api/presence/public/pass-path-room/vcard", base_url="http://public.test")
    assert vcard.status_code == 200

