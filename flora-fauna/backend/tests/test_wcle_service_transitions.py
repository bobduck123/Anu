import os
from datetime import datetime, timedelta
from unittest.mock import patch

import pytest

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-wcle-transitions-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-wcle-transitions-1234"

from backend_factory import load_create_app  # noqa: E402


def _build_app():
    create_app = load_create_app()
    return create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
        }
    )


def _seed_open_run(app):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import User
    from manara_backend_app.services import wcle_service

    organizer = User(
        username="wcle-organizer",
        pseudonym="WCLE Organizer",
        email="wcle-organizer@example.com",
        password="hash",
        role="organizer",
    )
    participant = User(
        username="wcle-participant",
        pseudonym="WCLE Participant",
        email="wcle-participant@example.com",
        password="hash",
        role="participant",
    )
    db.session.add_all([organizer, participant])
    db.session.flush()

    now = datetime.utcnow()
    run = wcle_service.create_run(
        organizer_user_id=organizer.id,
        title="Weekly groceries run",
        supplier_type="FLEMINGTON",
        run_date=now + timedelta(days=2),
        pledge_deadline=now + timedelta(days=1),
        coordination_fee_cents=150,
    )
    run = wcle_service.open_run(run.id)

    pack = wcle_service.create_pack(
        run_id=run.id,
        name="Base Pack",
        items=[
            {
                "name": "Rice",
                "unit": "kg",
                "qty": 2,
                "retail_unit_price_cents": 320,
                "bulk_unit_price_cents": 250,
                "category": "pantry",
            }
        ],
    )
    db.session.commit()
    return run, pack, participant


def test_create_pledge_is_idempotent_for_retry_with_same_payload():
    app = _build_app()
    from manara_backend_app.models import WCLEPledge
    from manara_backend_app.services import wcle_service

    with app.app_context():
        run, pack, participant = _seed_open_run(app)

        first = wcle_service.create_pledge(run.id, participant.id, pack_id=pack.id)
        second = wcle_service.create_pledge(run.id, participant.id, pack_id=pack.id)

        assert first.id == second.id
        assert second.status == "DRAFT"
        assert WCLEPledge.query.filter_by(run_id=run.id, user_id=participant.id).count() == 1


def test_create_pledge_conflict_is_explicit_and_deterministic():
    app = _build_app()
    from manara_backend_app.services import wcle_service

    with app.app_context():
        run, pack, participant = _seed_open_run(app)
        alt_pack = wcle_service.create_pack(
            run_id=run.id,
            name="Alt Pack",
            items=[
                {
                    "name": "Beans",
                    "unit": "kg",
                    "qty": 1,
                    "retail_unit_price_cents": 400,
                    "bulk_unit_price_cents": 280,
                    "category": "pantry",
                }
            ],
        )

        created = wcle_service.create_pledge(run.id, participant.id, pack_id=pack.id)

        with pytest.raises(wcle_service.WCLEValidationError) as exc:
            wcle_service.create_pledge(run.id, participant.id, pack_id=alt_pack.id)

        assert exc.value.code == "wcle_pledge_exists_conflict"
        assert exc.value.status == 409
        assert exc.value.details["existing_pledge_id"] == created.id
        assert exc.value.details["requested_payload"]["pack_id"] == alt_pack.id


def test_confirm_pledge_is_idempotent():
    app = _build_app()
    from manara_backend_app.services import wcle_service

    with app.app_context():
        run, pack, participant = _seed_open_run(app)
        pledge = wcle_service.create_pledge(run.id, participant.id, pack_id=pack.id)

        first = wcle_service.confirm_pledge(pledge.id)
        second = wcle_service.confirm_pledge(pledge.id)

        assert first.status == "CONFIRMED"
        assert second.status == "CONFIRMED"
        assert first.id == second.id


def test_complete_run_is_retry_safe_and_immutable_after_finalize():
    app = _build_app()
    from manara_backend_app.services import wcle_service

    with app.app_context():
        run, pack, participant = _seed_open_run(app)
        pledge = wcle_service.create_pledge(run.id, participant.id, pack_id=pack.id)
        wcle_service.confirm_pledge(pledge.id)
        wcle_service.close_run(run.id)
        wcle_service.execute_run(run.id)

        with patch("manara_backend_app.services.wcle_service._write_completion_ledger"), patch(
            "manara_backend_app.services.wcle_service._notify_run_event"
        ), patch("manara_backend_app.services.wcle_service._notify_savings"):
            first = wcle_service.complete_run(run.id, bulk_actual_total_cents=520)
            retry = wcle_service.complete_run(run.id, bulk_actual_total_cents=520)

        assert first.status == "COMPLETED"
        assert retry.status == "COMPLETED"
        assert retry.bulk_actual_total_cents == 520

        with pytest.raises(wcle_service.WCLEValidationError) as exc:
            wcle_service.complete_run(run.id, bulk_actual_total_cents=530)

        assert exc.value.code == "wcle_run_completion_immutable"
        assert exc.value.status == 409
        assert exc.value.details["persisted_bulk_actual_total_cents"] == 520
        assert exc.value.details["requested_bulk_actual_total_cents"] == 530


def test_invalid_run_transition_returns_explicit_transition_details():
    app = _build_app()
    from manara_backend_app.services import wcle_service

    with app.app_context():
        run, _, _ = _seed_open_run(app)

        with pytest.raises(wcle_service.WCLEValidationError) as exc:
            wcle_service.execute_run(run.id)

        assert exc.value.code == "wcle_invalid_run_transition"
        assert exc.value.details["action"] == "execute"
        assert exc.value.details["current_status"] == "OPEN"
        assert exc.value.details["allowed_from_statuses"] == ["CLOSED"]
