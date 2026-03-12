from flask import Blueprint
from .utils import ok


perks_bp = Blueprint("perks", __name__, url_prefix="/perks")


@perks_bp.route("/offers", methods=["GET"])
def list_offers():
    return ok({"offers": []})
