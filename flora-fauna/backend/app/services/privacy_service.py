"""Privacy service for data export, account deletion, and consent management.

Implements privacy-by-design requirements:
- Data export request
- Account deletion workflow
- Encrypted sensitive storage
- Access logging for sensitive reads
"""
from datetime import datetime
import json

from ..models import (
    DataExportRequest, AccountDeletionRequest, UserConsent,
    User, AuditLog, db,
)
from ..security.audit import audit, audit_read


def request_data_export(user_id):
    """Create a data export request."""
    pending = DataExportRequest.query.filter_by(user_id=user_id, status="pending").first()
    if pending:
        return pending

    req = DataExportRequest(user_id=user_id, status="pending")
    db.session.add(req)
    audit("data_export_requested", actor_id=user_id, entity_type="user", entity_id=user_id)
    db.session.commit()
    return req


def process_data_export(request_id):
    """Process a data export request (generates export data)."""
    req = DataExportRequest.query.get(request_id)
    if not req:
        raise ValueError("Export request not found")

    user = User.query.get(req.user_id)
    if not user:
        req.status = "failed"
        db.session.commit()
        raise ValueError("User not found")

    req.status = "processing"
    db.session.commit()

    # Collect user data (minimal PII)
    export_data = {
        "user": {
            "id": user.id,
            "username": user.username,
            "pseudonym": user.pseudonym,
            "email": user.email,
            "role": user.role,
            "created_at": str(user.node_id),
        },
        "consents": _get_consents(user.id),
        "exported_at": datetime.utcnow().isoformat(),
    }

    # Log sensitive read
    audit_read("user", user.id, actor_id=user.id, metadata={"action": "data_export"})

    req.status = "completed"
    req.completed_at = datetime.utcnow()
    req.export_url = f"/api/privacy/exports/{req.id}/download"
    db.session.commit()
    return req, export_data


def request_account_deletion(user_id, reason=None):
    """Create an account deletion request."""
    pending = AccountDeletionRequest.query.filter_by(user_id=user_id, status="pending").first()
    if pending:
        return pending

    req = AccountDeletionRequest(user_id=user_id, reason=reason, status="pending")
    db.session.add(req)
    audit("account_deletion_requested", actor_id=user_id, entity_type="user", entity_id=user_id)
    db.session.commit()
    return req


def confirm_account_deletion(request_id):
    """Confirm account deletion (user must re-confirm)."""
    req = AccountDeletionRequest.query.get(request_id)
    if not req or req.status != "pending":
        raise ValueError("Invalid deletion request")

    req.status = "confirmed"
    req.confirmed_at = datetime.utcnow()
    db.session.commit()
    return req


def process_account_deletion(request_id):
    """Process account deletion: anonymize user data."""
    req = AccountDeletionRequest.query.get(request_id)
    if not req or req.status != "confirmed":
        raise ValueError("Deletion request must be confirmed first")

    user = User.query.get(req.user_id)
    if not user:
        req.status = "completed"
        req.completed_at = datetime.utcnow()
        db.session.commit()
        return req

    # Anonymize PII (keep pseudonym for public records)
    user.email = f"deleted_{user.id}@deleted.local"
    user.username = f"deleted_user_{user.id}"
    user.password = "DELETED"
    user.encrypted_identity_ref = None

    req.status = "completed"
    req.completed_at = datetime.utcnow()

    audit("account_deleted", actor_id=req.user_id, entity_type="user", entity_id=req.user_id)
    db.session.commit()
    return req


def _get_consents(user_id):
    consents = UserConsent.query.filter_by(user_id=user_id).all()
    return {c.consent_type: c.granted for c in consents}
