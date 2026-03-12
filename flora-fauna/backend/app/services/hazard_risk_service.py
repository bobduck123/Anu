from ..models import Event
from ..services.math.hazard_risk_model import hazard_probability
from ..services.model_registry_service import resolve_model_params, log_model_run
from ..services.trust_model_service import compute_trust_posterior


def compute_event_hazard(event_id, node_id=None):
    event = Event.query.get_or_404(event_id)
    params, version = resolve_model_params("hazard_risk_model", node_id=node_id)
    betas = params or {"intercept": 0.0}
    trust = compute_trust_posterior(event.user_id, node_id=node_id)
    features = {
        "reliability_lower": trust["lower_bound"],
        "risk_tier": event.min_cert_level or 1,
        "attendance": event.goal or 0,
        "checklist": 1.0 if event.compliance_checklist_complete else 0.0,
    }
    prob = hazard_probability(features, betas)
    log_model_run("hazard_risk_model", version, input_hash=f"event:{event_id}", context={"prob": prob}, output_value=prob)
    return prob
