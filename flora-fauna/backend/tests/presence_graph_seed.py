import os
from datetime import timedelta

from flask_jwt_extended import create_access_token

from backend_factory import load_create_app


CONTROL_SECRET = "presence-graph-integration-control-secret"
PRESENCE_GRAPH_SCOPES = [
    "presence.node.create",
    "presence.node.read",
    "presence.node.update",
    "presence.analytics.read",
    "presence.nfc.manage",
]


def build_presence_graph_test_app():
    os.environ["FLASK_ENV"] = "testing"
    os.environ["SECRET_KEY"] = "presence-graph-integration-secret"
    os.environ["JWT_SECRET_KEY"] = "presence-graph-integration-jwt-secret"
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
            "PRESENCE_PUBLIC_ORIGIN": "http://public.test",
            "FRONTEND_BASE_URL": "http://public.test",
        }
    )


def graph_auth_headers(app, username, role="participant", *, control=False):
    with app.app_context():
        if control:
            token = create_access_token(
                identity=f"control::{username}",
                additional_claims={
                    "aud": "control",
                    "token_use": "control",
                    "requires_mfa": True,
                    "role": role,
                    "scp": PRESENCE_GRAPH_SCOPES,
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


def seed_presence_graph(app):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import (
        Encounter,
        MoodBoard,
        MoodBoardItem,
        Node,
        ObserverProfile,
        Path,
        PathChoice,
        PathTrace,
        PathWaypoint,
        PassportStamp,
        PresenceNode,
        PresencePass,
        RoomConnection,
        RoomKey,
        User,
    )

    with app.app_context():
        tenant = Node(name="Presence Graph Test Tenant", slug="presence-graph-test-tenant", status="active")
        db.session.add(tenant)
        db.session.flush()

        owner = User(username="graph-owner", pseudonym="Graph Owner", email="graph-owner@example.test", password="hash", role="participant")
        other_owner = User(username="graph-other-owner", pseudonym="Graph Other Owner", email="graph-other@example.test", password="hash", role="participant")
        observer_a_user = User(username="graph-observer-a", pseudonym="Graph Observer A", email="observer-a@example.test", password="hash", role="participant")
        observer_b_user = User(username="graph-observer-b", pseudonym="Graph Observer B", email="observer-b@example.test", password="hash", role="participant")
        admin = User(username="graph-admin", pseudonym="Graph Admin", email="graph-admin@example.test", password="hash", role="platform_admin")
        db.session.add_all([owner, other_owner, observer_a_user, observer_b_user, admin])
        db.session.flush()

        rooms = [
            PresenceNode(
                tenant_id=tenant.id,
                owner_user_id=owner.id,
                slug="graph-test-room",
                display_name="Graph Test Room",
                headline="A deterministic Room for Presence Graph integration.",
                bio="Used to prove RoomKey, Encounter, Observer, Mood Board, Path, and analytics contracts.",
                node_type="artist",
                display_mode="room",
                room_type="artist_studio",
                theme_preset="gallery_white",
                location_label="Sydney",
                status="published",
                visibility="public",
                public_status="public",
            ),
            PresenceNode(
                tenant_id=tenant.id,
                owner_user_id=owner.id,
                slug="graph-related-room",
                display_name="Graph Related Room",
                headline="A nearby fixture Room.",
                node_type="maker",
                display_mode="room",
                room_type="artist_studio",
                theme_preset="warm_material",
                location_label="Sydney",
                status="published",
                visibility="public",
                public_status="public",
            ),
            PresenceNode(
                tenant_id=tenant.id,
                owner_user_id=other_owner.id,
                slug="graph-other-room",
                display_name="Graph Other Room",
                headline="A different owner fixture Room.",
                node_type="consultant",
                display_mode="room",
                room_type="minimal_card",
                theme_preset="clean_light",
                location_label="Melbourne",
                status="published",
                visibility="public",
                public_status="public",
            ),
        ]
        db.session.add_all(rooms)
        db.session.flush()
        room, related_room, other_room = rooms

        observer_a = ObserverProfile(
            user_id=observer_a_user.id,
            alias="graph-observer-a",
            mask_name="Graph Observer A",
            bio_fragment="Collects rooms and paths.",
            status="active",
            visibility="public_mask",
            self_promotion_locked=True,
        )
        observer_b = ObserverProfile(
            user_id=observer_b_user.id,
            alias="graph-observer-b",
            mask_name="Graph Observer B",
            bio_fragment="Keeps private taste maps.",
            status="active",
            visibility="private",
            self_promotion_locked=True,
        )
        db.session.add_all([observer_a, observer_b])
        db.session.flush()

        presence_pass = PresencePass(
            room_id=room.id,
            owner_id=owner.id,
            pass_type="nfc_card",
            label="Graph Test NFC Pass",
            status="active",
            metadata_json={"fixture": "presence-graph-integration"},
        )
        db.session.add(presence_pass)
        db.session.flush()
        room_key = RoomKey(
            room_id=room.id,
            presence_pass_id=presence_pass.id,
            key_type="nfc",
            public_token="graph-test-room-key-token",
            campaign_label="Graph Test NFC Card",
            status="active",
            created_by=owner.id,
            metadata_json={"campaign": "graph-proof"},
        )
        db.session.add(room_key)
        db.session.flush()
        presence_pass.default_room_key_id = room_key.id

        encounter = Encounter(
            room_id=room.id,
            room_key_id=room_key.id,
            visitor_type="guest",
            anonymous_visitor_id="graph-anon-visitor",
            source="nfc",
            context_label="Graph Test NFC Card",
            privacy_level="aggregate_only",
        )
        db.session.add(encounter)
        db.session.flush()

        connection = RoomConnection(
            room_id=room.id,
            observer_id=observer_a.id,
            first_encounter_id=encounter.id,
            status="saved",
        )
        db.session.add(connection)
        db.session.flush()
        db.session.add(PassportStamp(observer_id=observer_a.id, room_id=room.id, encounter_id=encounter.id, stamp_type="entered", label=room.display_name))
        db.session.add(PassportStamp(observer_id=observer_a.id, room_id=room.id, stamp_type="saved", label=room.display_name))

        owner_board = MoodBoard(
            owner_type="room",
            room_id=room.id,
            title="Graph Room Influences",
            description="Public influence board for path generation.",
            visibility="room_public",
            board_type="influences",
            status="active",
        )
        observer_board = MoodBoard(
            owner_type="observer",
            observer_id=observer_a.id,
            title="Graph Observer Saves",
            description="Observer board for path generation.",
            visibility="public",
            board_type="saved_rooms",
            status="active",
        )
        private_board = MoodBoard(
            owner_type="observer",
            observer_id=observer_b.id,
            title="Graph Private Board",
            visibility="private",
            board_type="saved_rooms",
            status="active",
        )
        db.session.add_all([owner_board, observer_board, private_board])
        db.session.flush()
        db.session.add_all(
            [
                MoodBoardItem(mood_board_id=owner_board.id, item_type="room", item_id=related_room.id, title=related_room.display_name, tags_json=["material", "sydney"], position_index=1),
                MoodBoardItem(mood_board_id=observer_board.id, item_type="room", item_id=room.id, title=room.display_name, tags_json=["saved"], position_index=1, added_by_observer_id=observer_a.id),
                MoodBoardItem(mood_board_id=private_board.id, item_type="room", item_id=other_room.id, title=other_room.display_name, tags_json=["private"], position_index=1, added_by_observer_id=observer_b.id),
            ]
        )
        db.session.flush()

        room_path = Path(
            title="Graph Test Path from Room",
            description="Stable local integration path from a Room.",
            path_type="material",
            trailhead_type="room",
            trailhead_id=room.id,
            generated_by="system",
            visibility="public",
            status="active",
            mood_tags_json=["quiet", "material"],
            place_tags_json=["sydney"],
        )
        board_path = Path(
            title="Graph Test Path from Mood Board",
            description="Stable local integration path from a Mood Board.",
            path_type="mood",
            trailhead_type="mood_board",
            trailhead_id=observer_board.id,
            generated_by="system",
            visibility="public",
            status="active",
            mood_tags_json=["saved"],
            place_tags_json=["sydney"],
        )
        db.session.add_all([room_path, board_path])
        db.session.flush()
        w1 = PathWaypoint(path_id=room_path.id, waypoint_type="room", waypoint_id=room.id, title=room.display_name, reason_shown="Trailhead Room from Graph Test NFC Card.", order_index=1, metadata_json={"public_url": f"/presence/{room.slug}"})
        w2 = PathWaypoint(path_id=room_path.id, waypoint_type="mood_board", waypoint_id=owner_board.id, title=owner_board.title, reason_shown="Shared public influence board.", order_index=2, metadata_json={})
        w3 = PathWaypoint(path_id=room_path.id, waypoint_type="room", waypoint_id=related_room.id, title=related_room.display_name, reason_shown="Related room by material and place.", order_index=3, metadata_json={"public_url": f"/presence/{related_room.slug}"})
        bw1 = PathWaypoint(path_id=board_path.id, waypoint_type="mood_board", waypoint_id=observer_board.id, title=observer_board.title, reason_shown="Trailhead Mood Board.", order_index=1, metadata_json={})
        bw2 = PathWaypoint(path_id=board_path.id, waypoint_type="room", waypoint_id=room.id, title=room.display_name, reason_shown="Saved Room anchor.", order_index=2, metadata_json={"public_url": f"/presence/{room.slug}"})
        db.session.add_all([w1, w2, w3, bw1, bw2])
        db.session.flush()
        db.session.add_all(
            [
                PathChoice(path_id=room_path.id, from_waypoint_id=w1.id, label="Follow the mood", direction_type="mood", next_waypoint_id=w2.id),
                PathChoice(path_id=room_path.id, from_waypoint_id=w1.id, label="Surprise me", direction_type="surprise", next_waypoint_id=w3.id),
                PathChoice(path_id=board_path.id, from_waypoint_id=bw1.id, label="More like this", direction_type="mood", next_waypoint_id=bw2.id),
            ]
        )
        db.session.flush()
        db.session.add(PathTrace(observer_id=observer_a.id, path_id=room_path.id, waypoint_id=w1.id, trace_type="view", metadata_json={"fixture": True}))
        db.session.commit()

        return {
            "room_id": room.id,
            "related_room_id": related_room.id,
            "other_room_id": other_room.id,
            "room_slug": room.slug,
            "room_key_token": room_key.public_token,
            "room_key_id": room_key.id,
            "pass_id": presence_pass.id,
            "encounter_id": encounter.id,
            "observer_a_user": observer_a_user.username,
            "observer_b_user": observer_b_user.username,
            "owner": owner.username,
            "other_owner": other_owner.username,
            "admin": admin.username,
            "observer_a_id": observer_a.id,
            "observer_b_id": observer_b.id,
            "owner_board_id": owner_board.id,
            "observer_board_id": observer_board.id,
            "private_board_id": private_board.id,
            "room_path_id": room_path.id,
            "board_path_id": board_path.id,
        }
