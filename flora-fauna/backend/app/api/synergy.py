from flask import Blueprint

from ..models import Constellation
from ..services.feature_flag_service import is_enabled
from .utils import ok, error


synergy_bp = Blueprint("synergy", __name__, url_prefix="/synergy")


@synergy_bp.route("/constellations", methods=["GET"])
def constellation_synergies():
    if not is_enabled("SYNERGY_ENABLED") or not is_enabled("OIL_CONSTELLATIONS"):
        return error("disabled", "Synergy disabled", status=403)
    constellations = Constellation.query.filter_by(active=True).all()
    pairs = []
    for i, a in enumerate(constellations):
        for b in constellations[i + 1:]:
            score = 0.0
            if a.domain and b.domain and a.domain == b.domain:
                score += 0.6
            if a.geo_label and b.geo_label and a.geo_label.split(",")[0] == b.geo_label.split(",")[0]:
                score += 0.3
            if score > 0:
                pairs.append({
                    "constellation_a": {"id": a.id, "name": a.name},
                    "constellation_b": {"id": b.id, "name": b.name},
                    "score": round(score, 2),
                })
    return ok({"pairs": pairs})
