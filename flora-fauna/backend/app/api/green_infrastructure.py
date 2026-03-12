from flask import Blueprint, request, jsonify

from ..extensions import db
from ..models import ImpactPool, Node
from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user
from ..services.node_service import resolve_node
from .utils import ok, error

green_bp = Blueprint("green_infrastructure", __name__, url_prefix="/green")


@green_bp.route("/dashboard", methods=["GET"])
def dashboard():
    """Green infrastructure & energy dashboard summary."""
    node = resolve_node(request.args.get("node"))
    node_id = node.id if node else None
    energy_pool = ImpactPool.query.filter_by(slug="energy", node_id=node_id).first()
    infra_pool = ImpactPool.query.filter_by(slug="infrastructure", node_id=node_id).first()
    return ok({
        "energy": _pool_summary(energy_pool),
        "infrastructure": _pool_summary(infra_pool),
        "projects": _seed_projects(),
        "metrics": {
            "totalSolarKw": 42.5,
            "treesPlanted": 320,
            "communityGardens": 8,
            "bikeLanesKm": 3.2,
            "waterRecycledLiters": 15000,
        },
    })


@green_bp.route("/projects", methods=["GET"])
def list_projects():
    """List green infrastructure projects."""
    return ok({"projects": _seed_projects()})


@green_bp.route("/projects", methods=["POST"])
@alpha_jwt_required()
def create_project():
    """Propose a new green infrastructure project."""
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    data = request.get_json() or {}
    project = {
        "id": "new",
        "name": data.get("name", "Untitled"),
        "description": data.get("description", ""),
        "category": data.get("category", "energy"),
        "status": "proposed",
        "proposedBy": user.pseudonym,
        "fundingGoalCents": data.get("fundingGoalCents", 0),
        "fundedCents": 0,
    }
    return jsonify(project), 201


def _pool_summary(pool):
    if not pool:
        return {"name": "N/A", "balanceCents": 0, "targetCents": 0}
    return {
        "name": pool.name,
        "balanceCents": pool.target_amount_cents or 0,
        "targetCents": pool.target_amount_cents or 0,
    }


def _seed_projects():
    return [
        {"id": "gp1", "name": "Community Solar Array", "description": "Install a 50kW solar array on the community center roof.", "category": "energy", "status": "active", "fundingGoalCents": 250000, "fundedCents": 187000, "participantCount": 34},
        {"id": "gp2", "name": "Rain Garden Network", "description": "Build interconnected rain gardens to manage stormwater runoff.", "category": "water", "status": "active", "fundingGoalCents": 80000, "fundedCents": 45000, "participantCount": 18},
        {"id": "gp3", "name": "Bike Lane Expansion", "description": "Extend protected bike lanes along Main Street corridor.", "category": "transport", "status": "proposed", "fundingGoalCents": 150000, "fundedCents": 0, "participantCount": 52},
        {"id": "gp4", "name": "Street Tree Canopy", "description": "Plant 200 native trees to expand urban canopy coverage.", "category": "green_space", "status": "active", "fundingGoalCents": 60000, "fundedCents": 58000, "participantCount": 45},
        {"id": "gp5", "name": "Community Composting Hub", "description": "Establish a neighborhood composting facility with collection routes.", "category": "waste", "status": "completed", "fundingGoalCents": 35000, "fundedCents": 35000, "participantCount": 67},
    ]
