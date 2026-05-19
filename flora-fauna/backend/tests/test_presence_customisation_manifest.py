import os

os.environ.setdefault("FLASK_ENV", "testing")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-presence-customisation-1234")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-for-presence-customisation-1234")

from backend_factory import load_create_app  # noqa: E402


def _build_app():
    create_app = load_create_app()
    return create_app(
        {
            "TESTING": True,
            "FLASK_ENV": "production",
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
            "CORS_ORIGINS": ["https://your-presence.vercel.app"],
        }
    )


def test_customisation_manifest_endpoint_returns_stable_schema_and_core_options():
    app = _build_app()
    client = app.test_client()

    response = client.get("/api/presence/customisation/manifest", base_url="http://public.test")

    assert response.status_code == 200, response.get_json()
    data = response.get_json()["data"]
    assert data["schema_version"] == "presence-customisation-manifest-v1"
    assert data["roomgraph_schema_version"] == "presence-roomgraph-v1"

    assert {"artist", "dj", "maker", "practitioner", "consultant", "organisation", "local_business"}.issubset(
        {item["id"] for item in data["archetypes"]}
    )
    assert {"rooms-gallery-painter", "rooms-underground-dj", "rooms-material-carpenter"}.issubset(
        {item["id"] for item in data["room_worlds"]}
    )
    assert {"chamber_walk", "orbit_constellation", "object_tableau", "portal_cascade"}.issubset(
        {item["id"] for item in data["engagement_dynamics"]}
    )
    assert {"calm", "cinematic", "kinetic", "minimal", "ritual", "playful"} == {
        item["id"] for item in data["motion_profiles"]
    }


def test_customisation_recommendations_for_archetype_are_frontend_consumable():
    app = _build_app()
    client = app.test_client()

    response = client.get(
        "/api/presence/customisation/recommendations?archetype=artist",
        base_url="http://public.test",
    )

    assert response.status_code == 200, response.get_json()
    data = response.get_json()["data"]
    assert data["schema_version"] == "presence-customisation-manifest-v1"
    assert data["archetype"]["id"] == "artist"
    assert data["recommendations"][0]["room_world"] == "rooms-gallery-painter"
    assert data["recommendations"][0]["engagement_dynamic"] == "chamber_walk"


def test_public_setup_request_stores_versioned_customisation_snapshot():
    app = _build_app()
    client = app.test_client()

    response = client.post(
        "/api/presence/setup-requests",
        json={
            "display_name": "Signal Room",
            "email": "signal@example.com",
            "archetype": "dj",
            "room_world": "rooms-underground-dj",
            "engagement_dynamic": "portal_cascade",
            "motion_profile": "kinetic",
            "object_skin_pack": "signal_tile_pack",
            "atmosphere_pack": "nocturnal_signal",
        },
        base_url="http://public.test",
    )

    assert response.status_code == 201, response.get_json()
    body = response.get_json()["data"]
    assert body["customisation_manifest_version"] == "presence-customisation-manifest-v1"
    assert body["room_world"] == "rooms-underground-dj"
    assert body["engagement_dynamic"] == "portal_cascade"
    assert body["motion_profile"] == "kinetic"
    assert body["object_skin_pack"] == "signal_tile_pack"
    assert body["atmosphere_pack"] == "nocturnal_signal"
    assert body["customisation"]["resolved"]["room_world"] == "rooms-underground-dj"

    from manara_backend_app.extensions import db
    from manara_backend_app.models import PresenceBetaApplication

    with app.app_context():
        row = db.session.query(PresenceBetaApplication).one()
        assert row.room_world == "rooms-underground-dj"
        assert row.engagement_dynamic == "portal_cascade"
        assert row.motion_profile == "kinetic"
        assert row.object_skin_pack == "signal_tile_pack"
        assert row.atmosphere_pack == "nocturnal_signal"
        assert row.customisation_snapshot["schema_version"] == "presence-customisation-snapshot-v1"
        assert row.presence_dna["room_world"] == "rooms-underground-dj"
        assert row.room_graph["roomWorld"] == "rooms-underground-dj"


def test_public_setup_request_rejects_invalid_customisation_combination():
    app = _build_app()
    client = app.test_client()

    response = client.post(
        "/api/presence/setup-requests",
        json={
            "display_name": "Wrong Fit",
            "email": "wrong@example.com",
            "archetype": "dj",
            "room_world": "rooms-material-carpenter",
            "object_skin_pack": "gallery_frame_pack",
        },
        base_url="http://public.test",
    )

    assert response.status_code == 422
    body = response.get_json()
    assert body["ok"] is False
    assert body["error"]["code"] == "validation_error"
    details = body["error"]["details"]
    assert any(item["field"] == "room_world" for item in details["errors"])
    assert details["correction_hints"]


def test_public_setup_request_rejects_archetype_incompatible_dynamic():
    app = _build_app()
    client = app.test_client()

    response = client.post(
        "/api/presence/setup-requests",
        json={
            "display_name": "Overdone Local Room",
            "email": "local@example.com",
            "archetype": "local_business",
            "room_world": "rooms-material-carpenter",
            "engagement_dynamic": "portal_cascade",
        },
        base_url="http://public.test",
    )

    assert response.status_code == 422
    details = response.get_json()["error"]["details"]
    assert any(item["field"] == "engagement_dynamic" for item in details["errors"])
    assert details["snapshot"]["resolved"]["room_world"] == "rooms-material-carpenter"


def test_preview_seed_uses_stored_customisation_snapshot_and_old_requests_default_safely():
    app = _build_app()
    client = app.test_client()

    response = client.post(
        "/api/presence/setup-requests",
        json={
            "display_name": "Gallery Request",
            "email": "gallery@example.com",
            "archetype": "artist",
            "room_world": "rooms-gallery-painter",
        },
        base_url="http://public.test",
    )
    assert response.status_code == 201

    from manara_backend_app.extensions import db
    from manara_backend_app.models import PresenceBetaApplication
    from manara_backend_app.services.presence_customisation_manifest import preview_seed_from_setup_request

    with app.app_context():
        row = db.session.query(PresenceBetaApplication).one()
        row.room_world = "rooms-material-carpenter"
        seed = preview_seed_from_setup_request(row)
        assert seed["needs_review"] is False
        assert seed["selected_room_world"] == "rooms-gallery-painter"
        assert seed["room_graph"]["roomWorld"] == "rooms-gallery-painter"

        old_row = PresenceBetaApplication(display_name="Legacy", email="legacy@example.com")
        old_seed = preview_seed_from_setup_request(old_row)
        assert old_seed["needs_review"] is False
        assert old_seed["selected_room_world"] == "rooms-material-carpenter"
        assert old_seed["customisation_snapshot"]["resolved"]["archetype"] == "local_business"


def test_preview_seed_endpoint_returns_safe_roomgraph_seed():
    app = _build_app()
    client = app.test_client()

    response = client.post(
        "/api/presence/customisation/preview-seed",
        json={"archetype": "maker", "room_world": "rooms-material-carpenter"},
        base_url="http://public.test",
    )

    assert response.status_code == 200, response.get_json()
    seed = response.get_json()["data"]
    assert seed["schema_version"] == "presence-roomgraph-preview-seed-v1"
    assert seed["room_graph"]["schemaVersion"] == "presence-roomgraph-v1"
    assert seed["room_graph"]["roomWorld"] == "rooms-material-carpenter"
    assert seed["presence_dna"]["object_skin_pack"] == "material_studio_pack"
