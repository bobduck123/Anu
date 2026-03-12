from flask import Blueprint, request, jsonify

from ..extensions import db
from ..models import ImpactPool
from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user
from ..services.node_service import resolve_node
from .utils import ok, error

food_bp = Blueprint("food_sovereignty", __name__, url_prefix="/food")


@food_bp.route("/dashboard", methods=["GET"])
def dashboard():
    """Food sovereignty dashboard summary."""
    node = resolve_node(request.args.get("node"))
    node_id = node.id if node else None
    food_pool = ImpactPool.query.filter_by(slug="food", node_id=node_id).first()
    return ok({
        "pool": _pool_summary(food_pool),
        "programs": _seed_programs(),
        "metrics": {
            "mealsServed": 2450,
            "gardenPlots": 35,
            "familiesSupported": 120,
            "poundsHarvested": 4800,
            "foodPantries": 6,
            "weeklyDistributions": 3,
        },
    })


@food_bp.route("/programs", methods=["GET"])
def list_programs():
    """List food sovereignty programs."""
    return ok({"programs": _seed_programs()})


@food_bp.route("/programs", methods=["POST"])
@alpha_jwt_required()
def create_program():
    """Propose a new food sovereignty program."""
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    data = request.get_json() or {}
    program = {
        "id": "new",
        "name": data.get("name", "Untitled"),
        "description": data.get("description", ""),
        "type": data.get("type", "garden"),
        "status": "proposed",
        "proposedBy": user.pseudonym,
    }
    return jsonify(program), 201


@food_bp.route("/gardens", methods=["GET"])
def list_gardens():
    """List community gardens."""
    return ok({"gardens": [
        {"id": "g1", "name": "Riverside Community Garden", "address": "89 Green Lane", "city": "Riverside", "plots": 20, "availablePlots": 5, "lat": 34.0522, "lng": -118.2437},
        {"id": "g2", "name": "Springfield Urban Farm", "address": "12 Commons Way", "city": "Springfield", "plots": 30, "availablePlots": 8, "lat": 37.7749, "lng": -122.4194},
        {"id": "g3", "name": "Oak Street Herb Garden", "address": "45 Oak Street", "city": "Springfield", "plots": 12, "availablePlots": 2, "lat": 37.7799, "lng": -122.4094},
    ]})


def _pool_summary(pool):
    if not pool:
        return {"name": "N/A", "balanceCents": 0, "targetCents": 0}
    return {
        "name": pool.name,
        "balanceCents": pool.target_amount_cents or 0,
        "targetCents": pool.target_amount_cents or 0,
    }


def _seed_programs():
    return [
        {"id": "fp1", "name": "Weekly Food Distribution", "description": "Partner with local farms to distribute fresh produce every Saturday.", "type": "distribution", "status": "active", "participantCount": 85, "mealsPerWeek": 350},
        {"id": "fp2", "name": "Community Kitchen Collective", "description": "Shared commercial kitchen for community meal prep and canning.", "type": "kitchen", "status": "active", "participantCount": 24, "mealsPerWeek": 150},
        {"id": "fp3", "name": "Seed Library", "description": "Free heirloom seed borrowing program for home and community gardens.", "type": "garden", "status": "active", "participantCount": 120, "mealsPerWeek": 0},
        {"id": "fp4", "name": "School Lunch Partnership", "description": "Supply fresh, locally-grown ingredients to school cafeterias.", "type": "education", "status": "proposed", "participantCount": 0, "mealsPerWeek": 0},
        {"id": "fp5", "name": "Farm-to-Table Cooperative", "description": "Direct purchasing cooperative connecting local farmers with community buyers.", "type": "cooperative", "status": "active", "participantCount": 65, "mealsPerWeek": 0},
    ]
