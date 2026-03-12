from flask import Blueprint, request
from marshmallow import ValidationError
from ..security.alpha import alpha_jwt_required

from ..models import UserConsent, db
from ..security.policy import get_current_user
from ..schemas import ConsentUpdateSchema
from .utils import ok, error


consent_bp = Blueprint("consent", __name__, url_prefix="/consent")


@consent_bp.route("", methods=["GET"])
@alpha_jwt_required()
def list_consents():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    consents = UserConsent.query.filter_by(user_id=user.id).all()
    data = {c.consent_type: c.granted for c in consents}
    return ok({"consents": data})


@consent_bp.route("", methods=["POST"])
@alpha_jwt_required()
def update_consent():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    try:
        data = ConsentUpdateSchema().load(payload)
    except ValidationError as exc:
        return error("validation_error", exc.messages, status=400)
    updates = data.get("consents", {})
    if not isinstance(updates, dict):
        return error("validation_error", "consents must be an object", status=400)
    for consent_type, granted in updates.items():
        row = UserConsent.query.filter_by(user_id=user.id, consent_type=consent_type).first()
        if not row:
            row = UserConsent(user_id=user.id, consent_type=consent_type, granted=bool(granted))
            db.session.add(row)
        else:
            row.granted = bool(granted)
    db.session.commit()
    return ok({"consents": updates})
