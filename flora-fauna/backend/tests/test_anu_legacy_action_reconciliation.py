from datetime import timedelta

from test_anu_action_commitments import _seed_actions
from test_anu_onboarding import _build_app, _headers, _seed


def test_node_action_legacy_writes_are_quarantined_and_public_totals_are_reviewed(monkeypatch):
    app = _build_app()
    _seed(app)
    action_id, _ = _seed_actions(app)
    member = _headers(app)
    steward = _headers(app, "first-steward")
    client = app.test_client()

    from manara_backend_app.api import action_commitments
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Action, ActionCommitment, ActionProof, AuditRecord, ImpactCreditTx, Todo, User

    monkeypatch.setattr(action_commitments, "is_enabled", lambda flag: flag == "civic_credit_engine")
    with app.app_context():
        action = db.session.get(Action, action_id)
        node_headers = {"X-Control-Proxy": "anu-006", "X-Node-Id": str(action.node_id)}
        action.completions = 7  # Preserved historical count; never accepted as reviewed proof.
        user = User.query.filter_by(username="first-member").one()
        db.session.add(ActionProof(action_id=action_id, user_id=user.id, proof_url="https://example.test/old-private-proof", verified=True))
        db.session.commit()

    assert client.post(f"/complete_action/{action_id}", headers=member).status_code == 409
    assert client.post(f"/api/actions/{action_id}/proofs", headers=member, json={"proof_url": "https://example.test/proof", "verified": True}).status_code == 409
    assert client.get(f"/api/actions/{action_id}/proofs").status_code == 410
    action_detail = client.get(f"/api/actions/{action_id}").get_json()
    assert action_detail["verified_outcomes"] == action_detail["completions"] == 0
    assert action_detail["legacy_completions"] == 7
    action_list = client.get("/api/actions", headers=node_headers).get_json()
    listed_action = next(item for item in action_list if item["id"] == action_id)
    assert listed_action["verified_outcomes"] == listed_action["completions"] == 0
    assert listed_action["legacy_completions"] == 7
    summary = client.get("/api/engagement/impact-summary", headers=node_headers).get_json()["data"]
    assert summary["actions_completed"] == summary["completions"] == 0
    assert summary["verified_action_points"] == 0
    with app.app_context():
        assert db.session.get(Action, action_id).completions == 7
        assert User.query.filter_by(username="first-member").one().points == 0
        assert Todo.query.filter_by(action_id=action_id).count() == 0
        assert ActionProof.query.filter_by(action_id=action_id).count() == 1
        assert ImpactCreditTx.query.filter_by(source_type="action_complete").count() == 0

    commitment = client.post(f"/api/commitments/actions/{action_id}", headers=member).get_json()["data"]
    record_url = f"/api/commitments/{commitment['id']}"
    assert client.post(f"{record_url}/complete", headers=member, json={"evidence_url": "https://example.test/evidence"}).status_code == 200
    with app.app_context():
        assert User.query.filter_by(username="first-member").one().points == 0
        assert ImpactCreditTx.query.filter_by(source_type="action_commitment_verified").count() == 0

    verified = client.post(f"{record_url}/review", headers=steward, json={"decision": "verify"}).get_json()["data"]
    assert verified["status"] == "VERIFIED"
    assert verified["awarded_points"] == 0  # Existing verified proof is not rewarded twice.
    assert client.post(f"{record_url}/review", headers=steward, json={"decision": "verify"}).get_json()["data"]["awarded_points"] == 0
    assert client.post(f"/complete_action/{action_id}", headers=member).status_code == 409
    assert client.get(f"/api/actions/{action_id}").get_json()["verified_outcomes"] == 1
    reviewed_summary = client.get("/api/engagement/impact-summary", headers=node_headers).get_json()["data"]
    assert reviewed_summary["actions_completed"] == 1
    assert reviewed_summary["verified_action_points"] == 0
    assert client.get(f"/api/commitments/actions/{action_id}/outcome").get_json()["data"]["verified_outcomes"] == 1
    with app.app_context():
        record = db.session.get(ActionCommitment, commitment["id"])
        assert record.points_awarded_at is not None
        assert record.awarded_points == 0
        assert User.query.filter_by(username="first-member").one().points == 0
        assert db.session.get(Action, action_id).completions == 7
        assert ImpactCreditTx.query.filter_by(source_type="action_commitment_verified", reference_id=str(record.id)).count() == 0
        events = AuditRecord.query.filter_by(entity_type="action_commitment", entity_id=str(record.id)).order_by(AuditRecord.id).all()
        assert [event.action for event in events] == ["action_commitment_confirmed", "action_commitment_submitted", "action_commitment_verified"]
        assert events[-1].payload["awarded_points"] == 0


def test_clean_review_awards_once_and_legacy_todo_reward_is_not_repeated(monkeypatch):
    from manara_backend_app.api import action_commitments
    from manara_backend_app.extensions import db
    from manara_backend_app.models import ActionCommitment, ImpactCreditTx, Todo, User

    monkeypatch.setattr(action_commitments, "is_enabled", lambda flag: flag == "civic_credit_engine")
    app = _build_app()
    _seed(app)
    action_id, _ = _seed_actions(app)
    client = app.test_client()
    member = _headers(app)
    steward = _headers(app, "first-steward")

    def verify_once():
        record = client.post(f"/api/commitments/actions/{action_id}", headers=member).get_json()["data"]
        url = f"/api/commitments/{record['id']}"
        client.post(f"{url}/complete", headers=member, json={"evidence_url": "https://example.test/clean"})
        first = client.post(f"{url}/review", headers=steward, json={"decision": "verify"}).get_json()["data"]
        second = client.post(f"{url}/review", headers=steward, json={"decision": "verify"}).get_json()["data"]
        assert first["awarded_points"] == second["awarded_points"]
        return record["id"], first["awarded_points"]

    record_id, awarded = verify_once()
    assert awarded == 10
    with app.app_context():
        user = User.query.filter_by(username="first-member").one()
        assert user.points == 10
        assert ImpactCreditTx.query.filter_by(source_type="action_commitment_verified", reference_id=str(record_id)).count() == 1
        assert db.session.get(ActionCommitment, record_id).points_awarded_at is not None

    # A second action with a historical completed Todo is still reviewable but gets no new award.
    from manara_backend_app.models import Action, utcnow
    with app.app_context():
        user = User.query.filter_by(username="first-member").one()
        second_action = Action(node_id=user.node_id, title="Earlier field work", details="Legacy task", action_type="community", end_date=utcnow() + timedelta(days=10), points_assigned=12, user_id=user.id)
        db.session.add(second_action)
        db.session.flush()
        db.session.add(Todo(title=second_action.title, user_id=user.id, action_id=second_action.id, is_completed=True, completed_at=utcnow()))
        db.session.commit()
        second_id = second_action.id
    second_record = client.post(f"/api/commitments/actions/{second_id}", headers=member).get_json()["data"]
    second_url = f"/api/commitments/{second_record['id']}"
    client.post(f"{second_url}/complete", headers=member, json={"evidence_url": "https://example.test/earlier"})
    assert client.post(f"{second_url}/review", headers=steward, json={"decision": "verify"}).get_json()["data"]["awarded_points"] == 0
    with app.app_context():
        assert User.query.filter_by(username="first-member").one().points == 10
        assert ImpactCreditTx.query.filter_by(source_type="action_commitment_verified").count() == 1


def test_unscoped_legacy_completion_retry_awards_once():
    app = _build_app()
    _seed(app)
    client = app.test_client()
    member = _headers(app)
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Action, User, utcnow
    with app.app_context():
        user = User.query.filter_by(username="first-member").one()
        action = Action(node_id=None, title="Historical action", details="Legacy route", action_type="community", end_date=utcnow() + timedelta(days=10), points_assigned=10, user_id=user.id)
        db.session.add(action)
        db.session.commit()
        action_id = action.id
    first = client.post(f"/complete_action/{action_id}", headers=member)
    second = client.post(f"/complete_action/{action_id}", headers=member)
    assert first.status_code == second.status_code == 200
    assert second.get_json()["alreadyCompleted"] is True
    with app.app_context():
        assert db.session.get(Action, action_id).completions == 1
        assert User.query.filter_by(username="first-member").one().points == 10


def test_node_weekly_action_challenge_ignores_legacy_todo_until_reviewed():
    from types import SimpleNamespace

    from manara_backend_app.api.engagement import progress_for_challenge
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Todo, User, utcnow

    app = _build_app()
    _seed(app)
    action_id, _ = _seed_actions(app)
    client = app.test_client()
    member = _headers(app)
    steward = _headers(app, "first-steward")
    now = utcnow()
    start, end = now - timedelta(days=1), now + timedelta(days=1)
    challenge = SimpleNamespace(challenge_type="complete_actions")

    with app.app_context():
        user = User.query.filter_by(username="first-member").one()
        db.session.add(Todo(title="Old completed action", user_id=user.id, action_id=action_id,
                            is_completed=True, completed_at=now))
        db.session.commit()
        assert progress_for_challenge(challenge, user, start, end) == 0

    record = client.post(f"/api/commitments/actions/{action_id}", headers=member).get_json()["data"]
    url = f"/api/commitments/{record['id']}"
    assert client.post(f"{url}/complete", headers=member, json={"evidence_url": "https://example.test/new"}).status_code == 200
    assert client.post(f"{url}/review", headers=steward, json={"decision": "verify"}).status_code == 200

    with app.app_context():
        user = User.query.filter_by(username="first-member").one()
        assert progress_for_challenge(challenge, user, start, end) == 1
