from datetime import datetime
import math

from ..models import EventPrimitive
from ..services.model_registry_service import resolve_model_params, log_model_run
from ..services.math.trust_posterior import weighted_beta_posterior
from ..services.posterior_registry_service import update_posterior
from ..services.replay_engine_service import _snapshot_hash


def _weight(event_time, now, decay_lambda):
    dt = (now - event_time).days
    return math.exp(-decay_lambda * dt)


def compute_trust_posterior(user_id, node_id=None):
    params, version = resolve_model_params("trust_beta_model", node_id=node_id)
    alpha0 = params.get("alpha0", 1.0)
    beta0 = params.get("beta0", 1.0)
    decay_lambda = params.get("lambda", 0.01)
    now = datetime.utcnow()

    successes = EventPrimitive.query.filter_by(actor_id=user_id, event_type="success").all()
    failures = EventPrimitive.query.filter_by(actor_id=user_id, event_type="failure").all()
    success_weights = [_weight(e.timestamp, now, decay_lambda) for e in successes]
    failure_weights = [_weight(e.timestamp, now, decay_lambda) for e in failures]
    result = weighted_beta_posterior(success_weights, failure_weights, alpha0=alpha0, beta0=beta0, decay_lambda=decay_lambda)
    existing = None
    from ..models import PosteriorRecord
    existing = PosteriorRecord.query.filter_by(posterior_key="reliability", subject_id=user_id).first()
    prior = existing.params_json if existing else {}
    delta = {
        "alpha": result["alpha"] - float(prior.get("alpha", 0)),
        "beta": result["beta"] - float(prior.get("beta", 0)),
        "lower_bound": result["lower_bound"] - float(prior.get("lower_bound", 0)),
        "decay_lambda": result["decay_lambda"],
    }
    evidence_hash = _snapshot_hash({"success": success_weights, "failure": failure_weights})
    update_posterior(
        model_key="trust_beta_model",
        posterior_key="reliability",
        subject_id=user_id,
        node_id=node_id,
        formula_version=version,
        delta_params=delta,
        evidence_hash=evidence_hash,
        actor_id=None,
    )
    mean = result["alpha"] / max(result["alpha"] + result["beta"], 1e-6)
    log_model_run("trust_beta_model", version, input_hash=f"user:{user_id}", context={"alpha": result["alpha"], "beta": result["beta"], "mean": mean}, output_value=mean)
    return result
