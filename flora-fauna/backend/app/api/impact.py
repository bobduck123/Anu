from flask import Blueprint

from ..services.feature_flag_service import is_enabled
from ..api.engagement import impact_summary
from .utils import error


impact_bp = Blueprint("impact", __name__, url_prefix="/impact")


@impact_bp.route("/summary", methods=["GET"])
def public_summary():
    if not is_enabled("DASHBOARD_ENABLED"):
        return error("disabled", "Dashboard disabled", status=403)
    # Reuse engagement summary payload (privacy-safe aggregates)
    return impact_summary()
