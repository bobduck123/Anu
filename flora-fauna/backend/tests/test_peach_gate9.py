import os
from datetime import timedelta

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-peach-gate9-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-peach-gate9-1234"

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


def _valid_payload(**overrides):
    payload = {
        "adultOnly": True,
        "contributionType": "text_reflection",
        "body": "A private Gate 9 reflection about what the community learns by studying itself.",
        "contributorChosenCredit": "Gate 9 Tester",
        "contactMethod": "gate9@example.com",
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


def _submit_valid(client, **overrides):
    return client.post(
        "/api/peach/fields/studying-ourselves/contributions",
        json=_valid_payload(**overrides),
        base_url="http://public.test",
    )


def test_contribution_submission_creates_private_pending_contribution_and_explicit_consent_record():
    app = _build_app()
    _seed_fixture(app)
    client = app.test_client()

    response = _submit_valid(client)

    assert response.status_code == 201
    payload = response.get_json()["data"]
    assert payload["contribution"]["reviewStatus"] == "pending_review"
    assert payload["contribution"]["publicDisplay"] is False
    assert "body" not in payload["contribution"]
    assert "bodyText" not in payload["contribution"]

    from manara_backend_app.models import AuditLog, PeachConsentRecord, PeachContribution

    with app.app_context():
        contribution = PeachContribution.query.one()
        consent = PeachConsentRecord.query.filter_by(contribution_id=contribution.id).one()
        audit = AuditLog.query.filter_by(event="peach.contribution.created").one()

        assert contribution.field_slug == "studying-ourselves"
        assert contribution.review_status == "pending_review"
        assert contribution.public_display is False
        assert contribution.body_text.startswith("A private Gate 9 reflection")
        assert consent.consent_version == "gate9-v1"
        assert consent.consent_level == "private_to_stewards"
        assert consent.permission_for_yield is False
        assert consent.accepted_terms is True
        assert audit.entity_id == str(contribution.id)
        assert audit.metadata_json["public_display"] is False


def test_invalid_enum_and_sensitive_or_youth_payloads_are_rejected():
    app = _build_app()
    _seed_fixture(app)
    client = app.test_client()

    invalid = _submit_valid(client, contributionType="social_post")
    assert invalid.status_code == 400
    assert invalid.get_json()["error"]["code"] == "validation_error"

    sensitive = _submit_valid(client, sensitiveMaterialFlag=True)
    assert sensitive.status_code == 400
    assert sensitive.get_json()["error"]["code"] == "sensitive_material_disabled"

    youth = _submit_valid(client, youthMaterialFlag=True)
    assert youth.status_code == 400
    assert youth.get_json()["error"]["code"] == "youth_material_disabled"


def test_steward_review_requires_control_auth_and_updates_status_with_audit_event():
    app = _build_app()
    steward_id = _seed_fixture(app)
    client = app.test_client()
    submit_response = _submit_valid(client)
    contribution_id = submit_response.get_json()["data"]["contribution"]["id"]

    blocked = client.get(
        "/api/control/peach/contributions",
        base_url="http://control.test",
    )
    assert blocked.status_code == 401

    headers = _control_headers(app)
    listed = client.get(
        "/api/control/peach/contributions",
        headers=headers,
        base_url="http://control.test",
    )
    assert listed.status_code == 200
    listed_payload = listed.get_json()["data"]
    assert len(listed_payload["contributions"]) == 1
    assert "bodyText" not in listed_payload["contributions"][0]
    assert listed_payload["contributions"][0]["consentRecord"]["consentVersion"] == "gate9-v1"

    detail = client.get(
        f"/api/control/peach/contributions/{contribution_id}",
        headers=headers,
        base_url="http://control.test",
    )
    assert detail.status_code == 200
    assert "bodyText" in detail.get_json()["data"]["contribution"]

    review = client.patch(
        f"/api/control/peach/contributions/{contribution_id}/review",
        json={"reviewStatus": "held", "stewardNote": "Needs follow-up before any use."},
        headers=headers,
        base_url="http://control.test",
    )
    assert review.status_code == 200
    reviewed = review.get_json()["data"]["contribution"]
    assert reviewed["reviewStatus"] == "held"
    assert reviewed["publicDisplay"] is False
    assert reviewed["consentRecord"]["stewardReviewedBy"] == steward_id

    from manara_backend_app.extensions import db
    from manara_backend_app.models import AuditLog, PeachContribution, PeachContributionReviewEvent

    with app.app_context():
        contribution = db.session.get(PeachContribution, contribution_id)
        event = PeachContributionReviewEvent.query.filter_by(contribution_id=contribution_id).one()
        audit = AuditLog.query.filter_by(event="peach.contribution.review_status_changed").one()

        assert contribution.review_status == "held"
        assert contribution.public_display is False
        assert event.previous_status == "pending_review"
        assert event.new_status == "held"
        assert audit.actor_id == steward_id
        assert audit.metadata_json["new_status"] == "held"
        assert audit.metadata_json["public_display"] is False


def test_review_cannot_enable_public_display_or_public_approved_status():
    app = _build_app()
    _seed_fixture(app)
    client = app.test_client()
    contribution_id = _submit_valid(client).get_json()["data"]["contribution"]["id"]
    headers = _control_headers(app)

    public_status = client.patch(
        f"/api/control/peach/contributions/{contribution_id}/review",
        json={"reviewStatus": "published"},
        headers=headers,
        base_url="http://control.test",
    )
    assert public_status.status_code == 400

    public_display = client.patch(
        f"/api/control/peach/contributions/{contribution_id}/review",
        json={"reviewStatus": "accepted_private", "publicDisplay": True},
        headers=headers,
        base_url="http://control.test",
    )
    assert public_display.status_code == 400
    assert public_display.get_json()["error"]["code"] == "public_display_forbidden"


