from datetime import timedelta

from test_anu_onboarding import _build_app, _headers, _seed


def _seed_actions(app):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Action, User, utcnow

    with app.app_context():
        participant = User.query.filter_by(username="first-member").one()
        outsider = User.query.filter_by(username="second-member").one()
        steward = User(username="first-steward", pseudonym="First Steward", email="steward@example.test", password="hash", node_id=participant.node_id, role="node_admin")
        other_steward = User(username="other-steward", pseudonym="Other Steward", email="other-steward@example.test", password="hash", node_id=outsider.node_id, role="node_admin")
        db.session.add_all([steward, other_steward])
        db.session.flush()
        first = Action(node_id=participant.node_id, title="Community garden", details="Plant local food", action_type="community", end_date=utcnow() + timedelta(days=10), points_assigned=10, user_id=participant.id)
        other = Action(node_id=outsider.node_id, title="Other node garden", details="Other node", action_type="community", end_date=utcnow() + timedelta(days=10), points_assigned=10, user_id=outsider.id)
        db.session.add_all([first, other])
        db.session.commit()
        return first.id, other.id


def test_commitment_lifecycle_review_and_safe_public_projection():
    app = _build_app()
    _seed(app)
    action_id, other_action_id = _seed_actions(app)
    client = app.test_client()
    member = _headers(app)
    steward = _headers(app, "first-steward")
    other_steward = _headers(app, "other-steward")
    outsider = _headers(app, "second-member")
    root = f"/api/commitments/actions/{action_id}"

    assert client.post(root).status_code == 401
    assert client.post(f"/api/commitments/actions/{other_action_id}", headers=member).status_code == 404
    assert client.get(root, headers=member).get_json()["data"] is None
    confirmed = client.post(root, headers=member).get_json()["data"]
    assert confirmed["status"] == "CONFIRMED"
    assert client.post(root, headers=member).get_json()["data"]["id"] == confirmed["id"]
    assert client.get("/api/commitments/mine", headers=member).get_json()["data"][0]["status"] == "CONFIRMED"
    assert app.test_client().get(root, headers=member).get_json()["data"]["id"] == confirmed["id"]

    record_url = f"/api/commitments/{confirmed['id']}"
    assert client.post(f"{record_url}/cancel", headers=outsider).status_code == 404
    assert client.post(f"{record_url}/cancel", headers=member).get_json()["data"]["status"] == "CANCELLED"
    assert client.post(f"{record_url}/cancel", headers=member).get_json()["data"]["status"] == "CANCELLED"
    assert client.post(root, headers=member).get_json()["data"]["id"] == confirmed["id"]
    assert client.post(f"{record_url}/complete", headers=member, json={"evidence_url": "http://unsafe.test"}).status_code == 400
    submitted = client.post(f"{record_url}/complete", headers=member, json={"evidence_url": "https://evidence.example.test/garden", "evidence_note": "Planted two beds"}).get_json()["data"]
    assert submitted["status"] == "PENDING_REVIEW"
    assert client.post(f"{record_url}/complete", headers=member, json={"evidence_url": "https://evidence.example.test/garden"}).get_json()["data"]["status"] == "PENDING_REVIEW"
    assert client.post(f"{record_url}/cancel", headers=member).status_code == 409
    assert client.get(f"{root}/outcome").get_json()["data"] == {"action_id": action_id, "verified_outcomes": 0}
    assert client.get("/api/commitments/review-queue", headers=member).status_code == 403
    queue = client.get("/api/commitments/review-queue", headers=steward).get_json()["data"]
    assert queue[0]["participant_name"] == "First Member"
    assert queue[0]["evidence_url"] == "https://evidence.example.test/garden"
    assert client.get("/api/commitments/review-queue", headers=outsider).status_code == 403
    assert client.get("/api/commitments/review-queue", headers=other_steward).get_json()["data"] == []
    assert client.post(f"{record_url}/review", headers=other_steward, json={"decision": "verify"}).status_code == 404

    assert client.post(f"{record_url}/review", headers=member, json={"decision": "verify"}).status_code == 403
    assert client.post(f"{record_url}/review", headers=steward, json={"decision": "request_changes"}).status_code == 400
    needs_changes = client.post(f"{record_url}/review", headers=steward, json={"decision": "request_changes", "review_note": "Need date in photo"}).get_json()["data"]
    assert needs_changes["status"] == "NEEDS_CHANGES"
    assert client.get(f"{root}/outcome").get_json()["data"]["verified_outcomes"] == 0
    assert client.post(f"{record_url}/complete", headers=member, json={"evidence_url": "https://evidence.example.test/garden-new"}).get_json()["data"]["status"] == "PENDING_REVIEW"
    assert client.post(f"{record_url}/review", headers=steward, json={"decision": "verify"}).get_json()["data"]["status"] == "VERIFIED"
    assert client.post(f"{record_url}/review", headers=steward, json={"decision": "verify"}).get_json()["data"]["status"] == "VERIFIED"
    assert client.post(f"{record_url}/cancel", headers=member).status_code == 409
    assert client.get(f"{root}/outcome").get_json()["data"] == {"action_id": action_id, "verified_outcomes": 1}
    assert client.get(root, headers=member).get_json()["data"]["status"] == "VERIFIED"

    self_record = client.post(root, headers=steward).get_json()["data"]
    self_url = f"/api/commitments/{self_record['id']}"
    client.post(f"{self_url}/complete", headers=steward, json={"evidence_url": "https://evidence.example.test/steward"})
    assert client.post(f"{self_url}/review", headers=steward, json={"decision": "verify"}).status_code == 403

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Action, ActionCommitment, AuditRecord, User
    with app.app_context():
        assert ActionCommitment.query.count() == 2
        assert [row.action for row in AuditRecord.query.filter_by(entity_type="action_commitment").order_by(AuditRecord.id)] == [
            "action_commitment_confirmed", "action_commitment_cancelled", "action_commitment_confirmed",
            "action_commitment_submitted", "action_commitment_changes_requested", "action_commitment_submitted",
            "action_commitment_verified", "action_commitment_confirmed", "action_commitment_submitted",
        ]
        assert db.session.query(ActionCommitment).first().user_id is not None
        participant = User.query.filter_by(username="first-member").one()
        participant.role = "organizer"
        db.session.commit()
    assert client.delete(f"/api/actions/{action_id}", headers=member).status_code == 409
    with app.app_context():
        assert db.session.get(Action, action_id) is not None
