import os
from datetime import timedelta

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-peach-gate10-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-peach-gate10-1234"

from flask_jwt_extended import create_access_token  # noqa: E402

from backend_factory import load_create_app  # noqa: E402


CONTROL_SECRET = "peach-control-secret"


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
        }
    )


def _seed_fixture(app):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, User

    with app.app_context():
        node = Node(name="ANU", slug="anu", status="active", is_default=True)
        steward = User(
            username="peach-steward",
            pseudonym="PEACH Steward",
            email="peach-steward@example.com",
            password="hash",
            role="platform_admin",
        )
        db.session.add_all([node, steward])
        db.session.commit()
        return steward.id


def _control_headers(app, *, username="peach-steward", role="platform_admin", secret=CONTROL_SECRET):
    with app.app_context():
        token = create_access_token(
            identity=f"control::{username}",
            additional_claims={
                "aud": "control",
                "token_use": "control",
                "requires_mfa": True,
                "role": role,
                "scp": ["control:*"],
            },
            expires_delta=timedelta(minutes=30),
        )
    return {"Authorization": f"Bearer {token}", "X-Control-Plane-Secret": secret}


def _valid_contribution_payload(**overrides):
    payload = {
        "adultOnly": True,
        "contributionType": "text_reflection",
        "body": "A private Gate 10 rehearsal reflection.",
        "contributorChosenCredit": "Gate 10 Tester",
        "contactMethod": "gate10@example.com",
        "visibilityPreference": "private",
        "creditPreference": "chosen_name",
        "consentLevel": "private_to_stewards",
        "permissionForYield": False,
        "sensitiveMaterialFlag": False,
        "youthMaterialFlag": False,
        "acceptedTerms": True,
    }
    payload.update(overrides)
    return payload


def _submit_contribution(client, **overrides):
    return client.post(
        "/api/peach/fields/studying-ourselves/contributions",
        json=_valid_contribution_payload(**overrides),
        base_url="http://public.test",
    )


def _consent_operation_payload(**overrides):
    payload = {
        "operationType": "export",
        "contributorContact": "gate10@example.com",
        "contributorCreditOrName": "Gate 10 Tester",
        "requestDetail": "Please prepare a manual export of my PEACH pilot contribution record.",
        "adultOnly": True,
        "sensitiveMaterialFlag": False,
        "youthMaterialFlag": False,
        "acceptedTerms": True,
    }
    payload.update(overrides)
    return payload


def _support_intent_payload(**overrides):
    payload = {
        "supportType": "sponsor_field",
        "supporterName": "Gate 10 Supporter",
        "supporterContact": "supporter@example.com",
        "amountIntent": "100",
        "currency": "AUD",
        "note": "Manual follow-up only.",
        "paymentTaken": False,
        "adultOnly": True,
        "sensitiveMaterialFlag": False,
        "youthMaterialFlag": False,
        "acceptedTerms": True,
    }
    payload.update(overrides)
    return payload


def test_consent_operation_requests_submit_persist_and_are_steward_reviewed_with_audit():
    app = _build_app()
    steward_id = _seed_fixture(app)
    client = app.test_client()
    contribution_id = _submit_contribution(client).get_json()["data"]["contribution"]["id"]

    export_response = client.post(
        "/api/peach/consent/request",
        json=_consent_operation_payload(contributionId=contribution_id),
        base_url="http://public.test",
    )
    assert export_response.status_code == 201
    export_payload = export_response.get_json()["data"]["consentOperationRequest"]
    assert export_payload["operationType"] == "export"
    assert export_payload["status"] == "pending_steward_review"
    assert "requestDetail" not in export_payload

    withdrawal_response = client.post(
        "/api/peach/consent/request",
        json=_consent_operation_payload(
            operationType="withdrawal",
            requestDetail="Please steward a withdrawal review. I understand this is manual.",
        ),
        base_url="http://public.test",
    )
    assert withdrawal_response.status_code == 201

    blocked = client.get("/api/control/peach/consent-operations", base_url="http://control.test")
    assert blocked.status_code == 401

    headers = _control_headers(app)
    listed = client.get(
        "/api/control/peach/consent-operations",
        headers=headers,
        base_url="http://control.test",
    )
    assert listed.status_code == 200
    rows = listed.get_json()["data"]["consentOperationRequests"]
    assert len(rows) == 2
    assert rows[0]["requestDetail"].startswith("Please prepare")

    reviewed = client.patch(
        f"/api/control/peach/consent-operations/{export_payload['id']}",
        json={"status": "in_review", "stewardNote": "Identity check required before export bundle."},
        headers=headers,
        base_url="http://control.test",
    )
    assert reviewed.status_code == 200
    reviewed_payload = reviewed.get_json()["data"]["consentOperationRequest"]
    assert reviewed_payload["status"] == "in_review"
    assert reviewed_payload["reviewedBy"] == steward_id

    from manara_backend_app.models import AuditLog, PeachConsentOperationRequest

    with app.app_context():
        requests = PeachConsentOperationRequest.query.order_by(PeachConsentOperationRequest.id.asc()).all()
        assert len(requests) == 2
        assert requests[0].contribution_id == contribution_id
        assert requests[0].status == "in_review"
        assert requests[0].reviewed_by == steward_id
        assert AuditLog.query.filter_by(event="peach.consent_operation.request_created").count() == 2
        assert AuditLog.query.filter_by(event="peach.consent_operation.status_changed").count() == 1
        assert AuditLog.query.filter_by(event="peach.consent_operation.steward_note_changed").count() == 1


def test_support_intent_persists_without_payment_and_is_visible_to_stewards():
    app = _build_app()
    _seed_fixture(app)
    client = app.test_client()

    response = client.post(
        "/api/peach/fields/studying-ourselves/support-intents",
        json=_support_intent_payload(),
        base_url="http://public.test",
    )
    assert response.status_code == 201
    payload = response.get_json()["data"]["supportIntent"]
    assert payload["paymentTaken"] is False
    assert payload["status"] == "manual_enquiry"
    assert "note" not in payload

    payment_attempt = client.post(
        "/api/peach/fields/studying-ourselves/support-intents",
        json=_support_intent_payload(paymentTaken=True),
        base_url="http://public.test",
    )
    assert payment_attempt.status_code == 400
    assert payment_attempt.get_json()["error"]["code"] == "payment_forbidden"

    blocked = client.get("/api/control/peach/support-intents", base_url="http://control.test")
    assert blocked.status_code == 401

    headers = _control_headers(app)
    listed = client.get(
        "/api/control/peach/support-intents",
        headers=headers,
        base_url="http://control.test",
    )
    assert listed.status_code == 200
    rows = listed.get_json()["data"]["supportIntents"]
    assert len(rows) == 1
    assert rows[0]["supportType"] == "sponsor_field"
    assert rows[0]["paymentTaken"] is False
    assert rows[0]["note"] == "Manual follow-up only."

    from manara_backend_app.models import AuditLog, PeachSupportIntent

    with app.app_context():
        intent = PeachSupportIntent.query.one()
        assert intent.payment_taken is False
        assert intent.status == "manual_enquiry"
        audit = AuditLog.query.filter_by(event="peach.support_intent.created").one()
        assert audit.metadata_json["payment_taken"] is False


def test_gate10_public_safety_boundaries_reject_youth_sensitive_and_invalid_operations():
    app = _build_app()
    _seed_fixture(app)
    client = app.test_client()

    sensitive_consent = client.post(
        "/api/peach/consent/request",
        json=_consent_operation_payload(sensitiveMaterialFlag=True),
        base_url="http://public.test",
    )
    assert sensitive_consent.status_code == 400
    assert sensitive_consent.get_json()["error"]["code"] == "sensitive_material_disabled"

    youth_support = client.post(
        "/api/peach/fields/studying-ourselves/support-intents",
        json=_support_intent_payload(youthMaterialFlag=True),
        base_url="http://public.test",
    )
    assert youth_support.status_code == 400
    assert youth_support.get_json()["error"]["code"] == "youth_material_disabled"

    invalid_operation = client.post(
        "/api/peach/consent/request",
        json=_consent_operation_payload(operationType="delete_now"),
        base_url="http://public.test",
    )
    assert invalid_operation.status_code == 400
    assert invalid_operation.get_json()["error"]["code"] == "validation_error"
