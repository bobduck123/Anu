import os
from datetime import timedelta

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-presence-gardens-halls-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-presence-gardens-halls-1234"

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
        tenant = Node(name="Garden Hall Tenant", slug="garden-hall-tenant", status="active")
        owner_a = User(username="owner-a", pseudonym="Owner A", email="owner-a@example.com", password="hash", role="participant")
        owner_b = User(username="owner-b", pseudonym="Owner B", email="owner-b@example.com", password="hash", role="participant")
        observer_a = User(username="observer-a", pseudonym="Observer A", email="observer-a@example.com", password="hash", role="participant")
        observer_b = User(username="observer-b", pseudonym="Observer B", email="observer-b@example.com", password="hash", role="participant")
        admin = User(username="platform-admin", pseudonym="Platform Admin", email="platform@example.com", password="hash", role="platform_admin")
        db.session.add_all([tenant, owner_a, owner_b, observer_a, observer_b, admin])
        db.session.flush()
        room_a = PresenceNode(
            tenant_id=tenant.id,
            owner_user_id=owner_a.id,
            slug="garden-hall-room",
            display_name="Garden Hall Room",
            headline="A public Room.",
            bio="A Room used for Garden and Hall tests.",
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
            tenant_id=tenant.id,
            owner_user_id=owner_b.id,
            slug="other-room",
            display_name="Other Room",
            node_type="consultant",
            display_mode="room",
            room_type="minimal_card",
            theme_preset="clean_light",
            status="published",
            visibility="public",
            public_status="public",
        )
        db.session.add_all([room_a, room_b])
        db.session.commit()
        return {"room_a": room_a.id, "room_b": room_b.id}


def test_garden_creation_public_fetch_observations_and_self_promotion_guard():
    app = _build_app()
    _seed(app)
    client = app.test_client()
    headers = _auth_headers(app, "observer-a")

    garden = client.get("/api/observer/garden", headers=headers, base_url="http://public.test")
    assert garden.status_code == 200, garden.get_json()
    data = garden.get_json()["data"]
    assert data["visibility"] == "private"
    assert data["observer_mask"]["alias"] == "observer-a"

    private_public = client.get(f"/api/gardens/{data['slug']}", base_url="http://public.test")
    assert private_public.status_code == 404

    patched = client.patch(
        "/api/observer/garden",
        json={"visibility": "public", "title": "Quiet Garden", "description": "Textures, rooms, traces."},
        headers=headers,
        base_url="http://public.test",
    )
    assert patched.status_code == 200, patched.get_json()
    garden_id = patched.get_json()["data"]["id"]
    public = client.get("/api/gardens/observer-a", base_url="http://public.test")
    assert public.status_code == 200, public.get_json()
    assert public.get_json()["data"]["observer_id"] is None

    observation = client.post(
        "/api/observer/observations",
        json={"body": "A small note from the walk.", "visibility": "garden"},
        headers=headers,
        base_url="http://public.test",
    )
    assert observation.status_code == 201, observation.get_json()
    observation_id = observation.get_json()["data"]["id"]

    spam = client.post(
        "/api/observer/observations",
        json={"body": "Book my services at me@example.com", "visibility": "public"},
        headers=headers,
        base_url="http://public.test",
    )
    assert spam.status_code == 400
    assert spam.get_json()["error"]["details"]["upgrade_required"] is True

    listed = client.get(f"/api/gardens/{garden_id}/observations", base_url="http://public.test")
    assert listed.status_code == 200
    assert [row["id"] for row in listed.get_json()["data"]["items"]] == [observation_id]

    deleted = client.delete(f"/api/observer/observations/{observation_id}", headers=headers, base_url="http://public.test")
    assert deleted.status_code == 200
    listed_after_delete = client.get(f"/api/gardens/{garden_id}/observations", base_url="http://public.test")
    assert listed_after_delete.get_json()["data"]["items"] == []


def test_echo_seed_decay_nurture_prune_compost_and_garden_home_sections():
    app = _build_app()
    ids = _seed(app)
    client = app.test_client()
    a_headers = _auth_headers(app, "observer-a")
    b_headers = _auth_headers(app, "observer-b")

    client.patch("/api/observer/garden", json={"visibility": "public"}, headers=a_headers, base_url="http://public.test")
    source = client.post(
        "/api/observer/observations",
        json={"body": "A source Observation worth echoing.", "visibility": "public", "room_id": ids["room_a"]},
        headers=a_headers,
        base_url="http://public.test",
    )
    assert source.status_code == 201, source.get_json()
    source_id = source.get_json()["data"]["id"]

    echo = client.post(
        f"/api/observer/observations/{source_id}/echo",
        json={"commentary": "Keeping this close."},
        headers=b_headers,
        base_url="http://public.test",
    )
    assert echo.status_code == 201, echo.get_json()
    assert echo.get_json()["data"]["source_attribution"]["id"] == source_id

    seeds = client.get("/api/observer/garden/seeds", headers=b_headers, base_url="http://public.test")
    assert seeds.status_code == 200
    seed_rows = seeds.get_json()["data"]["items"]
    assert any(row["seed_type"] == "observer" for row in seed_rows)
    room_seed = next(row for row in seed_rows if row["seed_type"] == "room")

    with app.app_context():
        from manara_backend_app.extensions import db
        from manara_backend_app.models import GardenSeed
        from manara_backend_app.time_utils import now_utc

        seed = GardenSeed.query.get(room_seed["id"])
        seed.last_shared_space_at = now_utc() - timedelta(days=30)
        seed.half_life_days = 1
        db.session.commit()

    recomputed = client.post("/api/observer/garden/recompute", headers=b_headers, base_url="http://public.test")
    assert recomputed.status_code == 200
    recomputed_seed = next(row for row in recomputed.get_json()["data"]["items"] if row["id"] == room_seed["id"])
    assert recomputed_seed["status"] == "composted"

    nurtured = client.post(
        f"/api/observer/seeds/{room_seed['id']}/nurture",
        json={"nurture_type": "manual_keep_close"},
        headers=b_headers,
        base_url="http://public.test",
    )
    assert nurtured.status_code == 201, nurtured.get_json()
    assert nurtured.get_json()["data"]["seed"]["status"] == "active"

    pruned = client.post(
        f"/api/observer/seeds/{room_seed['id']}/prune",
        json={"prune_type": "block", "reason": "Not for this Garden."},
        headers=b_headers,
        base_url="http://public.test",
    )
    assert pruned.status_code == 201
    assert pruned.get_json()["data"]["seed"]["status"] == "blocked"

    home = client.get("/api/observer/garden/home", headers=b_headers, base_url="http://public.test")
    assert home.status_code == 200, home.get_json()
    sections = home.get_json()["data"]["sections"]
    for key in ["new_growth", "recently_watered", "crossed_paths", "wilting_seeds", "compost"]:
        assert key in sections
    blocked_ids = {row.get("id") for section in sections.values() for row in section if isinstance(row, dict)}
    assert room_seed["id"] not in blocked_ids


def test_shared_space_from_room_hall_path_and_mood_board_creates_seeds():
    app = _build_app()
    ids = _seed(app)
    client = app.test_client()
    headers = _auth_headers(app, "observer-a")

    saved = client.post(f"/api/observer/rooms/{ids['room_a']}/save", headers=headers, base_url="http://public.test")
    assert saved.status_code == 201, saved.get_json()
    room_seeds = client.get("/api/observer/garden/seeds", headers=headers, base_url="http://public.test").get_json()["data"]["items"]
    assert any(row["seed_type"] == "room" and row["seed_id"] == ids["room_a"] for row in room_seeds)

    path = client.post(f"/api/paths/generate/from-room/{ids['room_a']}", base_url="http://public.test")
    assert path.status_code == 201, path.get_json()
    path_id = path.get_json()["data"]["id"]
    walk = client.post(f"/api/observer/paths/{path_id}/walks", headers=headers, base_url="http://public.test")
    assert walk.status_code == 201, walk.get_json()
    path_seeds = client.get("/api/observer/garden/seeds", headers=headers, base_url="http://public.test").get_json()["data"]["items"]
    assert any(row["seed_type"] == "path" and row["seed_id"] == path_id for row in path_seeds)

    hall = client.post(
        "/api/halls",
        json={"title": "Shared Seed Hall", "visibility": "public", "hall_type": "salon"},
        headers=headers,
        base_url="http://public.test",
    )
    assert hall.status_code == 201, hall.get_json()
    hall_id = hall.get_json()["data"]["id"]
    joined = client.post(f"/api/halls/{hall_id}/join", headers=headers, base_url="http://public.test")
    assert joined.status_code == 201, joined.get_json()
    hall_seeds = client.get("/api/observer/garden/seeds", headers=headers, base_url="http://public.test").get_json()["data"]["items"]
    assert any(row["seed_type"] == "hall" and row["seed_id"] == hall_id for row in hall_seeds)

    with app.app_context():
        from manara_backend_app.extensions import db
        from manara_backend_app.models import MoodBoard, ObserverProfile
        from manara_backend_app.services.presence_shared_space_service import derive_shared_space_from_mood_board_overlap

        observer = ObserverProfile.query.filter_by(alias="observer-a").first()
        board = MoodBoard(owner_type="observer", observer_id=observer.id, title="Overlap Board", visibility="private", board_type="mood")
        db.session.add(board)
        db.session.flush()
        derive_shared_space_from_mood_board_overlap(observer, board)
        db.session.commit()
        board_id = board.id

    mood_seeds = client.get("/api/observer/garden/seeds", headers=headers, base_url="http://public.test").get_json()["data"]["items"]
    assert any(row["seed_type"] == "mood_board" and row["seed_id"] == board_id for row in mood_seeds)


def test_hall_owner_permissions_participation_objects_path_analytics_and_moderation():
    app = _build_app()
    ids = _seed(app)
    client = app.test_client()
    owner_headers = _auth_headers(app, "owner-a")
    other_owner_headers = _auth_headers(app, "owner-b")
    observer_headers = _auth_headers(app, "observer-a")
    admin_headers = _auth_headers(app, "platform-admin", role="platform_admin", control=True)

    hall = client.post(
        f"/api/presence/owner/rooms/{ids['room_a']}/halls",
        json={"title": "Market Hall", "visibility": "public", "hall_type": "market_hall", "status": "live"},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert hall.status_code == 201, hall.get_json()
    hall_id = hall.get_json()["data"]["id"]
    forbidden = client.post(
        f"/api/presence/owner/rooms/{ids['room_a']}/halls",
        json={"title": "Wrong owner"},
        headers=other_owner_headers,
        base_url="http://public.test",
    )
    assert forbidden.status_code == 403

    public = client.get("/api/halls", base_url="http://public.test")
    assert public.status_code == 200
    assert any(row["id"] == hall_id for row in public.get_json()["data"]["items"])

    private = client.post(
        f"/api/presence/owner/rooms/{ids['room_a']}/halls",
        json={"title": "Private Hall", "visibility": "private", "hall_type": "salon"},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert private.status_code == 201
    private_read = client.get(f"/api/halls/{private.get_json()['data']['id']}", base_url="http://public.test")
    assert private_read.status_code == 403

    join = client.post(f"/api/halls/{hall_id}/join", headers=observer_headers, base_url="http://public.test")
    assert join.status_code == 201, join.get_json()
    participant_id = join.get_json()["data"]["id"]
    guest = client.post(f"/api/halls/{hall_id}/join", json={"guest_token": "guest-one"}, base_url="http://public.test")
    assert guest.status_code == 201, guest.get_json()

    participants = client.get(f"/api/halls/{hall_id}/participants", base_url="http://public.test")
    assert participants.status_code == 200
    participant = participants.get_json()["data"]["items"][0]
    assert "user_id" not in participant
    assert participant["identity_type"] in {"mask", "guest"}

    observation = client.post(
        f"/api/halls/{hall_id}/observations",
        json={"body": "A Hall Observation.", "visibility": "hall"},
        headers=observer_headers,
        base_url="http://public.test",
    )
    assert observation.status_code == 201, observation.get_json()
    observation_id = observation.get_json()["data"]["id"]

    zone = client.post(
        f"/api/halls/{hall_id}/zones",
        json={"zone_type": "stall", "title": "Main Market"},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert zone.status_code == 201, zone.get_json()
    zone_id = zone.get_json()["data"]["id"]
    portal = client.post(
        f"/api/presence/owner/rooms/{ids['room_a']}/halls/{hall_id}/portals",
        json={"zone_id": zone_id, "target_type": "path", "target_id": 1, "label": "Trailhead"},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert portal.status_code == 201, portal.get_json()
    stall = client.post(
        f"/api/presence/owner/rooms/{ids['room_a']}/halls/{hall_id}/stalls",
        json={"zone_id": zone_id, "room_id": ids["room_a"], "placement_type": "host"},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert stall.status_code == 201, stall.get_json()
    session = client.post(
        f"/api/halls/{hall_id}/sessions",
        json={"title": "Opening", "session_type": "talk", "status": "scheduled"},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert session.status_code == 201, session.get_json()
    transitioned = client.patch(
        f"/api/halls/{hall_id}/sessions/{session.get_json()['data']['id']}",
        json={"status": "live"},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert transitioned.status_code == 200
    assert transitioned.get_json()["data"]["status"] == "live"

    path = client.get(f"/api/paths/from-hall/{hall_id}", base_url="http://public.test")
    assert path.status_code == 200, path.get_json()
    assert path.get_json()["data"]["trailhead_type"] == "hall"

    analytics = client.get(
        f"/api/presence/owner/rooms/{ids['room_a']}/halls/{hall_id}/analytics",
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert analytics.status_code == 200, analytics.get_json()
    assert analytics.get_json()["data"]["entries_count"] >= 2
    assert analytics.get_json()["data"]["observation_counts"]["active"] == 1
    assert analytics.get_json()["data"]["seeds_created_count"] >= 1

    hidden = client.post(
        f"/api/halls/{hall_id}/moderation/actions",
        json={"target_type": "observation", "target_id": observation_id, "action_type": "hide", "reason": "Host hide."},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert hidden.status_code == 201, hidden.get_json()
    hall_observations = client.get(f"/api/halls/{hall_id}/observations", base_url="http://public.test")
    assert hall_observations.get_json()["data"]["items"] == []

    banned = client.post(
        f"/api/halls/{hall_id}/moderation/actions",
        json={"target_type": "participant", "target_id": participant_id, "action_type": "ban", "reason": "Test ban."},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert banned.status_code == 201, banned.get_json()

    report = client.post(
        f"/api/halls/{hall_id}/moderation/actions",
        json={"target_type": "participant", "target_id": participant_id, "action_type": "report", "reason": "Observer report."},
        headers=observer_headers,
        base_url="http://public.test",
    )
    assert report.status_code == 201, report.get_json()
    assert report.get_json()["data"]["flag"]["target_type"] == "hall_participant"

    admin = client.get(f"/api/admin/presence/halls/{hall_id}/analytics", headers=admin_headers, base_url="http://control.test")
    assert admin.status_code == 200, admin.get_json()


def test_frontend_garden_observation_alias_contract_echo_report_and_hidden_source():
    app = _build_app()
    ids = _seed(app)
    client = app.test_client()
    a_headers = _auth_headers(app, "observer-a")
    b_headers = _auth_headers(app, "observer-b")

    made_public = client.patch("/api/garden", json={"visibility": "public"}, headers=a_headers, base_url="http://public.test")
    assert made_public.status_code == 200, made_public.get_json()

    home = client.get("/api/garden/home", headers=a_headers, base_url="http://public.test")
    assert home.status_code == 200, home.get_json()
    home_payload = home.get_json()["data"]
    assert isinstance(home_payload["sections"], list)
    assert {section["id"] for section in home_payload["sections"]} >= {"new_growth", "from_mood_boards", "compost"}

    observation = client.post(
        "/api/observations",
        json={
            "observation_kind": "room",
            "body": "A frontend-shaped Observation.",
            "visibility": "mask_only",
            "source_kind": "room",
            "source_id": ids["room_a"],
        },
        headers=a_headers,
        base_url="http://public.test",
    )
    assert observation.status_code == 201, observation.get_json()
    obs_payload = observation.get_json()["data"]
    assert obs_payload["observation_kind"] == "room"
    assert obs_payload["observer_id"]
    assert obs_payload["author"]["alias"] == "observer-a"
    assert obs_payload["source"]["source_kind"] == "room"

    obs_id = obs_payload["id"]
    listed = client.get("/api/observations/by-mask/observer-a", base_url="http://public.test")
    assert listed.status_code == 200, listed.get_json()
    assert any(row["id"] == obs_id for row in listed.get_json()["data"]["items"])

    echo = client.post(
        f"/api/observations/{obs_id}/echoes",
        json={"message": "Keeping this close."},
        headers=b_headers,
        base_url="http://public.test",
    )
    assert echo.status_code == 201, echo.get_json()
    assert echo.get_json()["data"]["observation_id"] == obs_id
    assert echo.get_json()["data"]["message"] == "Keeping this close."

    blocked_echo = client.post(
        f"/api/observations/{obs_id}/echoes",
        json={"message": "Book my service at me@example.com"},
        headers=b_headers,
        base_url="http://public.test",
    )
    assert blocked_echo.status_code == 400
    assert blocked_echo.get_json()["error"]["details"]["upgrade_required"] is True

    nurture = client.post(f"/api/observations/{obs_id}/nurture", headers=b_headers, base_url="http://public.test")
    assert nurture.status_code == 201, nurture.get_json()
    assert nurture.get_json()["data"]["observation"]["has_nurtured"] is True
    unnurture = client.delete(f"/api/observations/{obs_id}/nurture", headers=b_headers, base_url="http://public.test")
    assert unnurture.status_code == 200, unnurture.get_json()
    assert unnurture.get_json()["data"]["observation"]["has_nurtured"] is False

    report = client.post(f"/api/observations/{obs_id}/report", json={"reason": "contract report"}, headers=b_headers, base_url="http://public.test")
    assert report.status_code == 201, report.get_json()
    assert report.get_json()["data"]["received"] is True

    public_mask = client.get("/api/masks/observer-a", base_url="http://public.test")
    assert public_mask.status_code == 200, public_mask.get_json()
    assert public_mask.get_json()["data"]["observer"]["alias"] == "observer-a"

    deleted = client.delete(f"/api/observations/{obs_id}", headers=a_headers, base_url="http://public.test")
    assert deleted.status_code == 200
    hidden_echo = client.post(f"/api/observations/{obs_id}/echoes", json={}, headers=b_headers, base_url="http://public.test")
    assert hidden_echo.status_code == 400


def test_frontend_hall_alias_contract_and_real_activity_analytics():
    app = _build_app()
    ids = _seed(app)
    client = app.test_client()
    owner_headers = _auth_headers(app, "owner-a")
    observer_headers = _auth_headers(app, "observer-a")

    hall = client.post(
        "/api/presence/owner/halls",
        json={"host_room_id": ids["room_a"], "title": "Frontend Contract Hall", "hall_type": "studio_hall", "visibility": "public", "status": "live"},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert hall.status_code == 201, hall.get_json()
    hall_payload = hall.get_json()["data"]
    hall_id = hall_payload["id"]
    slug = hall_payload["slug"]

    listed = client.get(f"/api/presence/owner/halls?room_id={ids['room_a']}", headers=owner_headers, base_url="http://public.test")
    assert listed.status_code == 200, listed.get_json()
    assert any(row["id"] == hall_id for row in listed.get_json()["data"]["items"])

    zone = client.post(
        f"/api/presence/owner/halls/{hall_id}/zones?room_id={ids['room_a']}",
        json={"zone_kind": "stall", "title": "Pigment Stall", "blurb": "Step into the Stall.", "order_index": 1},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert zone.status_code == 201, zone.get_json()
    zone_payload = zone.get_json()["data"]
    assert zone_payload["zone_kind"] == "stall"
    assert zone_payload["blurb"] == "Step into the Stall."

    portal = client.post(
        f"/api/presence/owner/halls/{hall_id}/portals?room_id={ids['room_a']}",
        json={"zone_id": zone_payload["id"], "label": "Trailhead", "destination_kind": "path", "destination_id": 1},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert portal.status_code == 201, portal.get_json()
    assert portal.get_json()["data"]["destination_kind"] == "path"

    stall = client.post(
        f"/api/presence/owner/halls/{hall_id}/stalls?room_id={ids['room_a']}",
        json={"zone_id": zone_payload["id"], "room_id": ids["room_a"], "short_pitch": "Studio open today."},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert stall.status_code == 201, stall.get_json()
    assert stall.get_json()["data"]["short_pitch"] == "Studio open today."

    public_halls = client.get("/api/halls?status=live&limit=10", base_url="http://public.test")
    assert public_halls.status_code == 200, public_halls.get_json()
    assert public_halls.get_json()["data"]["total"] >= 1
    assert public_halls.get_json()["data"]["live_count"] >= 1

    detail = client.get(f"/api/halls/{slug}", base_url="http://public.test")
    assert detail.status_code == 200, detail.get_json()
    assert detail.get_json()["data"]["participants_count"] == 0

    join = client.post(f"/api/halls/{slug}/join", headers=observer_headers, base_url="http://public.test")
    assert join.status_code == 201, join.get_json()
    assert join.get_json()["data"]["joined"] is True
    assert join.get_json()["data"]["participant"]["mask"]["alias"] == "observer-a"

    participants = client.get(f"/api/halls/{slug}/participants", base_url="http://public.test")
    assert participants.status_code == 200, participants.get_json()
    participant = participants.get_json()["data"]["items"][0]
    assert "user_id" not in participant
    assert participant["alias"] == "observer-a"

    portal_click = client.post(f"/api/halls/{slug}/portals/{portal.get_json()['data']['id']}/click", base_url="http://public.test")
    assert portal_click.status_code == 201, portal_click.get_json()
    stall_visit = client.post(f"/api/halls/{slug}/stalls/{stall.get_json()['data']['id']}/visit", base_url="http://public.test")
    assert stall_visit.status_code == 201, stall_visit.get_json()

    analytics = client.get(f"/api/presence/owner/halls/{hall_id}/analytics?room_id={ids['room_a']}", headers=owner_headers, base_url="http://public.test")
    assert analytics.status_code == 200, analytics.get_json()
    analytics_payload = analytics.get_json()["data"]
    assert analytics_payload["portal_clicks"] == 1
    assert analytics_payload["stall_visits"] == 1
    assert analytics_payload["top_stalls"][0]["room_slug"] == "garden-hall-room"
    assert "observer_id" not in analytics_payload


def test_mood_board_item_seed_contract_reuses_and_nurtures_existing_seed():
    app = _build_app()
    ids = _seed(app)
    client = app.test_client()
    headers = _auth_headers(app, "observer-a")

    board = client.post(
        "/api/observer/mood-boards",
        json={"title": "Seed Loop Board", "visibility": "private", "board_type": "mood"},
        headers=headers,
        base_url="http://public.test",
    )
    assert board.status_code == 201, board.get_json()
    board_id = board.get_json()["data"]["id"]
    item = client.post(
        f"/api/observer/mood-boards/{board_id}/items",
        json={"item_type": "room", "item_id": ids["room_a"], "title": "Room from taste"},
        headers=headers,
        base_url="http://public.test",
    )
    assert item.status_code == 201, item.get_json()
    item_id = item.get_json()["data"]["id"]

    seeded = client.post(f"/api/observer/mood-boards/{board_id}/items/{item_id}/seed", headers=headers, base_url="http://public.test")
    assert seeded.status_code == 201, seeded.get_json()
    seed_payload = seeded.get_json()["data"]["seed"]
    assert seed_payload["seed_type"] == "room"
    assert seed_payload["source_type"] == "mood_board_overlap"

    seeded_again = client.post(f"/api/observer/mood-boards/{board_id}/items/{item_id}/seed", headers=headers, base_url="http://public.test")
    assert seeded_again.status_code == 201, seeded_again.get_json()
    assert seeded_again.get_json()["data"]["seed"]["id"] == seed_payload["id"]
    assert seeded_again.get_json()["data"]["seed"]["last_nurtured_at"] is not None

    home = client.get("/api/garden/home", headers=headers, base_url="http://public.test")
    assert home.status_code == 200, home.get_json()
    from_mood = next(section for section in home.get_json()["data"]["sections"] if section["id"] == "from_mood_boards")
    assert any(seed["id"] == seed_payload["id"] for seed in from_mood["seeds"])
