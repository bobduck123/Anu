import os

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-anu-onboarding-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-anu-onboarding-1234"

from flask_jwt_extended import create_access_token  # noqa: E402

from backend_factory import load_create_app  # noqa: E402


def _build_app():
    return load_create_app()(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
        }
    )


def _seed(app):
    from manara_backend_app.extensions import db
    from manara_backend_app.hell_models import MicrocosmProjectionRead
    from manara_backend_app.models import Microcosm, Node, User

    with app.app_context():
        first = Node(name="First", slug="anu-first", status="active", is_default=True)
        second = Node(name="Second", slug="anu-second", status="active")
        db.session.add_all([first, second])
        db.session.flush()
        member = User(username="first-member", pseudonym="First Member", email="first@example.test", password="hash", node_id=first.id)
        other = User(username="second-member", pseudonym="Second Member", email="second@example.test", password="hash", node_id=second.id)
        db.session.add_all([member, other])
        db.session.flush()
        available = Microcosm(name="First Garden", creator_id=member.id, node_id=first.id)
        foreign = Microcosm(name="Second Garden", creator_id=other.id, node_id=second.id)
        proposed = Microcosm(name="Pending Garden", creator_id=member.id, node_id=first.id)
        db.session.add_all([available, foreign, proposed])
        db.session.flush()
        db.session.add_all([
            MicrocosmProjectionRead(microcosm_id=available.id, node_id=first.id, status="ACTIVE"),
            MicrocosmProjectionRead(microcosm_id=foreign.id, node_id=second.id, status="ACTIVE"),
            MicrocosmProjectionRead(microcosm_id=proposed.id, node_id=first.id, status="PROPOSED"),
        ])
        ids = available.id, foreign.id, proposed.id
        db.session.commit()
        return ids


def _headers(app, username="first-member"):
    with app.app_context():
        token = create_access_token(identity=username)
    return {"Authorization": f"Bearer {token}"}


def test_onboarding_requires_account_and_rejects_unavailable_microcosms_without_writes():
    app = _build_app()
    available, foreign, proposed = _seed(app)
    client = app.test_client()
    assert client.get("/api/hell/onboarding").status_code == 401
    headers = _headers(app)
    for microcosm_id in (foreign, proposed):
        response = client.post(
            "/api/hell/onboarding",
            headers=headers,
            json={"interests": ["Community Care"], "microcosm_id": microcosm_id},
        )
        assert response.status_code == 404
    for interests in ([], ["Unapproved"], ["Education", "Education"]):
        response = client.post(
            "/api/hell/onboarding",
            headers=headers,
            json={"interests": interests, "microcosm_id": available},
        )
        assert response.status_code == 400
    state = client.get("/api/hell/onboarding", headers=headers).get_json()["data"]
    assert state["interests"] == []
    assert state["joined_microcosms"] == []
    assert state["complete"] is False
    assert [micro["id"] for micro in state["microcosms"]] == [available]


def test_onboarding_persists_interests_and_membership_across_clients_and_retries():
    app = _build_app()
    available, _, _ = _seed(app)
    first_device = app.test_client()
    headers = _headers(app)
    payload = {"interests": ["Community Care", "Food Systems"], "microcosm_id": available}
    response = first_device.post("/api/hell/onboarding", headers=headers, json=payload)
    assert response.status_code == 200
    state = response.get_json()["data"]
    assert state["interests"] == payload["interests"]
    assert state["joined_microcosms"] == [{"id": available, "name": "First Garden"}]
    assert state["complete"] is True
    assert first_device.post("/api/hell/onboarding", headers=headers, json=payload).status_code == 200

    second_device = app.test_client()
    assert second_device.get("/api/hell/onboarding", headers=headers).get_json()["data"] == state
    from manara_backend_app.extensions import db
    from manara_backend_app.models import microcosm_user

    with app.app_context():
        assert db.session.query(microcosm_user).count() == 1
    assert second_device.get("/api/hell/onboarding", headers=_headers(app, "second-member")).get_json()["data"]["complete"] is False
