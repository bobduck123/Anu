import json
from pathlib import Path

from presence_graph_seed import build_presence_graph_test_app, graph_auth_headers, seed_presence_graph


REPO_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_FIXTURE = REPO_ROOT / "presence-app" / "tests" / "fixtures" / "presenceGraph.json"


def _data(response):
    payload = response.get_json()
    assert payload and payload.get("ok") is True, payload
    return payload["data"]


def _error(response):
    payload = response.get_json()
    assert payload, payload
    if "msg" in payload:
        return {"code": "jwt_error", "message": payload["msg"]}
    assert payload.get("ok") is False, payload
    return payload["error"]


def _require_keys(payload, keys):
    missing = [key for key in keys if key not in payload]
    assert not missing, f"Missing keys {missing} from {payload}"


def test_presence_graph_local_integration_flow_and_contract_shapes():
    app = build_presence_graph_test_app()
    ids = seed_presence_graph(app)
    client = app.test_client()
    observer_headers = graph_auth_headers(app, ids["observer_a_user"])
    owner_headers = graph_auth_headers(app, ids["owner"])
    control_headers = graph_auth_headers(app, ids["admin"], role="platform_admin", control=True)

    resolved = client.get(f"/api/presence/keys/{ids['room_key_token']}/resolve", base_url="http://public.test")
    assert resolved.status_code == 200, resolved.get_json()
    resolved_data = _data(resolved)
    _require_keys(resolved_data, ["message", "room", "public_url", "room_key", "encounter", "available_actions", "observer_upgrade"])
    assert resolved_data["room_key"]["campaign_label"] == "Graph Test NFC Card"
    assert resolved_data["encounter"]["source"] == "nfc"
    assert resolved_data["encounter"]["context_label"] == "Graph Test NFC Card"

    encounter = client.post(
        f"/api/presence/rooms/{ids['room_id']}/encounters",
        json={
            "room_key_token": ids["room_key_token"],
            "source": "nfc",
            "context_label": "Graph Test NFC Card",
            "anonymous_visitor_id": "graph-anon-visitor-2",
        },
        base_url="http://public.test",
    )
    assert encounter.status_code == 201, encounter.get_json()
    encounter_data = _data(encounter)
    _require_keys(encounter_data, ["encounter", "room_id", "available_actions"])
    assert encounter_data["encounter"]["room_key_id"] == ids["room_key_id"]
    assert encounter_data["encounter"]["source"] == "nfc"

    passport = client.get("/api/observer/passport", headers=observer_headers, base_url="http://public.test")
    assert passport.status_code == 200, passport.get_json()
    passport_data = _data(passport)
    assert {item["stamp_type"] for item in passport_data["items"]} >= {"entered", "saved"}

    boards = client.get("/api/observer/mood-boards", headers=observer_headers, base_url="http://public.test")
    assert boards.status_code == 200, boards.get_json()
    boards_data = _data(boards)
    assert any(board["id"] == ids["observer_board_id"] for board in boards_data["items"])

    added = client.post(
        f"/api/observer/mood-boards/{ids['observer_board_id']}/items",
        json={"item_type": "room", "item_id": ids["related_room_id"], "title": "Added Related Room", "source_context": "integration proof"},
        headers=observer_headers,
        base_url="http://public.test",
    )
    assert added.status_code == 201, added.get_json()
    added_data = _data(added)
    assert added_data["item_type"] == "room"
    assert added_data["item_id"] == ids["related_room_id"]

    room_path = client.get(f"/api/paths/from-room/{ids['room_id']}", base_url="http://public.test")
    assert room_path.status_code == 200, room_path.get_json()
    room_path_data = _data(room_path)
    _assert_path_shape(room_path_data)
    assert room_path_data["trailhead_type"] == "room"

    walk = client.post(
        f"/api/observer/paths/{room_path_data['id']}/walks",
        json={"saved": True, "metadata": {"source": "integration-proof"}},
        headers=observer_headers,
        base_url="http://public.test",
    )
    assert walk.status_code == 201, walk.get_json()
    walk_data = _data(walk)
    assert walk_data["path_id"] == room_path_data["id"]
    assert walk_data["saved"] is True

    trace = client.post(
        f"/api/observer/paths/{room_path_data['id']}/traces",
        json={"trace_type": "enter_room", "waypoint_id": room_path_data["waypoints"][0]["id"], "metadata": {"source": "integration-proof"}},
        headers=observer_headers,
        base_url="http://public.test",
    )
    assert trace.status_code == 201, trace.get_json()
    trace_data = _data(trace)
    assert trace_data["trace_type"] == "enter_room"

    choice = client.post(
        f"/api/observer/paths/{room_path_data['id']}/choose",
        json={"choice_id": room_path_data["choices"][0]["id"]},
        headers=observer_headers,
        base_url="http://public.test",
    )
    assert choice.status_code == 201, choice.get_json()
    choice_data = _data(choice)
    assert choice_data["trace_type"] == "fork_chosen"

    board_path = client.get(f"/api/paths/from-mood-board/{ids['observer_board_id']}", base_url="http://public.test")
    assert board_path.status_code == 200, board_path.get_json()
    board_path_data = _data(board_path)
    _assert_path_shape(board_path_data)
    assert board_path_data["trailhead_type"] == "mood_board"

    passes = client.get(f"/api/presence/owner/rooms/{ids['room_id']}/passes", headers=owner_headers, base_url="http://public.test")
    assert passes.status_code == 200, passes.get_json()
    passes_data = _data(passes)
    assert passes_data["items"][0]["room_keys"][0]["public_token"] == ids["room_key_token"]

    analytics = client.get(f"/api/presence/owner/rooms/{ids['room_id']}/analytics", headers=owner_headers, base_url="http://public.test")
    assert analytics.status_code == 200, analytics.get_json()
    analytics_data = _data(analytics)
    _require_keys(analytics_data, ["encounters_count", "saved_rooms_count", "field_notes_count", "path_activity_count", "room_key_performance"])
    assert analytics_data["encounters_count"] >= 2
    assert analytics_data["saved_rooms_count"] >= 1
    assert analytics_data["room_key_performance"][0]["campaign_label"] == "Graph Test NFC Card"

    world = client.get("/api/admin/presence/world-readiness", headers=control_headers, base_url="http://control.test")
    assert world.status_code == 200, world.get_json()
    world_data = _data(world)
    assert world_data["status"] in {"hidden", "forming", "preview", "ready"}
    assert "Rooms will open into a shared map" in world_data["message"]


def test_presence_graph_auth_boundaries_are_intact():
    app = build_presence_graph_test_app()
    ids = seed_presence_graph(app)
    client = app.test_client()
    owner_headers = graph_auth_headers(app, ids["owner"])
    other_owner_headers = graph_auth_headers(app, ids["other_owner"])

    unauth_passport = client.get("/api/observer/passport", base_url="http://public.test")
    assert unauth_passport.status_code == 401
    assert _error(unauth_passport)["code"] in {"unauthorized", "auth_required", "jwt_error"}

    unauth_analytics = client.get(f"/api/presence/owner/rooms/{ids['room_id']}/analytics", base_url="http://public.test")
    assert unauth_analytics.status_code == 401

    forbidden_analytics = client.get(f"/api/presence/owner/rooms/{ids['room_id']}/analytics", headers=other_owner_headers, base_url="http://public.test")
    assert forbidden_analytics.status_code == 403

    owned_analytics = client.get(f"/api/presence/owner/rooms/{ids['room_id']}/analytics", headers=owner_headers, base_url="http://public.test")
    assert owned_analytics.status_code == 200


def test_presence_graph_frontend_mock_fixture_matches_backend_contract_shape():
    app = build_presence_graph_test_app()
    ids = seed_presence_graph(app)
    client = app.test_client()
    observer_headers = graph_auth_headers(app, ids["observer_a_user"])
    owner_headers = graph_auth_headers(app, ids["owner"])
    fixture = json.loads(FRONTEND_FIXTURE.read_text(encoding="utf-8"))

    backend_resolve = _data(client.get(f"/api/presence/keys/{ids['room_key_token']}/resolve", base_url="http://public.test"))
    backend_path = _data(client.get(f"/api/paths/from-room/{ids['room_id']}", base_url="http://public.test"))
    backend_board = _data(client.get(f"/api/observer/mood-boards/{ids['observer_board_id']}", headers=observer_headers, base_url="http://public.test"))
    backend_analytics = _data(client.get(f"/api/presence/owner/rooms/{ids['room_id']}/analytics", headers=owner_headers, base_url="http://public.test"))

    _assert_critical_shape(fixture["room"], backend_resolve["room"], "room", [
        "id",
        "slug",
        "display_name",
        "headline",
        "node_type",
        "display_mode",
        "room_type",
        "theme_preset",
        "plan_type",
        "profile_image_url",
        "cover_image_url",
        "hero_image_url",
        "location_label",
        "public_url",
    ])
    _assert_critical_shape(fixture["roomKey"], backend_resolve["room_key"], "roomKey", [
        "id",
        "room_id",
        "presence_pass_id",
        "key_type",
        "campaign_label",
        "status",
        "metadata",
    ])
    assert "public_token" not in backend_resolve["room_key"], "public resolve must not leak RoomKey token back in payload"
    _assert_critical_shape(fixture["encounter"], backend_resolve["encounter"], "encounter", [
        "id",
        "room_id",
        "room_key_id",
        "visitor_type",
        "source",
        "context_label",
        "privacy_level",
        "created_at",
    ])
    _assert_critical_shape(fixture["path"], backend_path, "path", [
        "id",
        "title",
        "path_type",
        "trailhead_type",
        "trailhead_id",
        "generated_by",
        "visibility",
        "status",
        "waypoints",
        "choices",
    ])
    _assert_critical_shape(fixture["moodBoardWithRoom"], backend_board, "moodBoardWithRoom", [
        "id",
        "owner_type",
        "observer_id",
        "title",
        "description",
        "visibility",
        "board_type",
        "status",
        "items",
    ])
    _assert_critical_shape(fixture["analytics"]["graph"], backend_analytics, "analytics.graph", [
        "room_id",
        "slug",
        "encounters_count",
        "saved_rooms_count",
        "field_notes_count",
        "path_activity_count",
        "signals",
        "room_key_performance",
    ])


def _assert_path_shape(payload):
    _require_keys(payload, ["id", "title", "trailhead_type", "trailhead_id", "waypoints", "choices"])
    assert len(payload["waypoints"]) >= 2
    assert payload["choices"]
    assert all("reason_shown" in waypoint for waypoint in payload["waypoints"])
    assert all("label" in choice and "direction_type" in choice for choice in payload["choices"])


def _assert_critical_shape(expected, actual, label, keys):
    assert isinstance(expected, dict), label
    assert isinstance(actual, dict), label
    for key in keys:
        assert key in expected, f"{label}.{key} missing in frontend mock fixture"
        assert key in actual, f"{label}.{key} missing in backend payload"
    if "waypoints" in keys:
        assert isinstance(expected["waypoints"], list) and expected["waypoints"], "fixture path needs waypoint coverage"
        assert isinstance(actual["waypoints"], list) and actual["waypoints"], "backend path needs waypoint coverage"
        _assert_critical_shape(expected["waypoints"][0], actual["waypoints"][0], f"{label}.waypoints[]", [
            "id",
            "path_id",
            "waypoint_type",
            "title",
            "reason_shown",
            "order_index",
            "metadata",
        ])
    if "choices" in keys:
        assert isinstance(expected["choices"], list) and expected["choices"], "fixture path needs choice coverage"
        assert isinstance(actual["choices"], list) and actual["choices"], "backend path needs choice coverage"
        _assert_critical_shape(expected["choices"][0], actual["choices"][0], f"{label}.choices[]", [
            "id",
            "path_id",
            "from_waypoint_id",
            "label",
            "direction_type",
            "metadata",
        ])
    if "items" in keys:
        assert isinstance(expected["items"], list), "fixture board items should be a list"
        assert isinstance(actual["items"], list), "backend board items should be a list"
        if expected["items"] and actual["items"]:
            _assert_critical_shape(expected["items"][0], actual["items"][0], f"{label}.items[]", [
                "id",
                "mood_board_id",
                "item_type",
                "item_id",
                "title",
                "source_context",
                "created_at",
            ])


def _assert_shape_subset(expected, actual, label):
    assert isinstance(expected, dict), label
    assert isinstance(actual, dict), label
    for key, value in expected.items():
        assert key in actual, f"{label}.{key} missing in backend payload"
        if isinstance(value, dict) and isinstance(actual[key], dict):
            _assert_shape_subset(value, actual[key], f"{label}.{key}")
        elif isinstance(value, list) and value and isinstance(value[0], dict):
            assert isinstance(actual[key], list), f"{label}.{key} should be a list"
            if actual[key]:
                _assert_shape_subset(value[0], actual[key][0], f"{label}.{key}[]")
