import random
from datetime import datetime

from ..models import FeatureFlag, db


def is_enabled(flag_name, user_role=None):
    """Check if a feature flag is enabled, optionally for a specific role."""
    flag = FeatureFlag.query.filter_by(name=flag_name).first()
    if not flag:
        return False
    if not flag.enabled:
        return False
    if flag.allowed_roles and user_role:
        if user_role not in flag.allowed_roles:
            return False
    if flag.rollout_percentage and flag.rollout_percentage < 100.0:
        if random.random() * 100 > flag.rollout_percentage:
            return False
    return True


def require_flag(flag_name):
    """Decorator-style check. Raises ValueError if flag is disabled."""
    if not is_enabled(flag_name):
        raise ValueError(f"Feature '{flag_name}' is not enabled")


def get_all_flags():
    return FeatureFlag.query.order_by(FeatureFlag.name.asc()).all()


def set_flag(name, enabled, description=None, rollout_percentage=0.0, allowed_roles=None, notes=None):
    flag = FeatureFlag.query.filter_by(name=name).first()
    if not flag:
        flag = FeatureFlag(name=name)
        db.session.add(flag)
    flag.enabled = enabled
    if description is not None:
        flag.description = description
    flag.rollout_percentage = rollout_percentage
    flag.allowed_roles = allowed_roles
    flag.notes = notes
    if enabled and not flag.activated_at:
        flag.activated_at = datetime.utcnow()
    db.session.commit()
    return flag


def ensure_default_flags():
    """Create default feature flags for all dormant systems."""
    defaults = [
        ("zkp_verification", "ZKP-ready identity verification", False),
        ("endowment_system", "Endowment shadow structure", False),
        ("energy_offset_calculator", "Energy offset calculator", False),
        ("federation_nodes", "Cross-node federation", False),
        ("cultural_archive", "Cultural archive layer", False),
        ("vendor_marketplace", "Vendor capacity marketplace", False),
        ("equipment_registry", "Equipment & asset registry", False),
        ("infrastructure_registry", "Infrastructure asset registry", False),
        ("trust_score_engine", "Trust score computation engine", True),
        ("crisis_mode", "Crisis mode capability", True),
        ("escrow_system", "Escrow event model", True),
        ("governance_roles", "Governance role framework", True),
        ("sovereignty_enforcement", "Sovereignty floor enforcement", True),
        ("module_review_cycles", "Module review cycle system", True),
        ("audit_export", "Audit export system", True),
        ("capital_heatmap", "Capital intelligence heatmap", False),
        ("treasury_simulator", "Treasury scenario simulator", False),
        ("resilience_index", "Capital resilience index", False),
        ("credential_registry", "Public credential registry", True),
        ("credential_ladder", "Stackable credential ladder", False),
        ("external_recognition", "External credential recognition", False),
        ("civic_credit_engine", "Civic contribution credit engine", False),
        ("influence_decay", "Influence decay engine", False),
        ("transparency_portal", "Public transparency portal", False),
        ("governance_simulations", "Governance simulation engine", False),
        ("asset_participation", "Asset participation records", False),
        ("federation_metrics", "Cross-node metrics", False),
        ("coi_registry", "Conflict of interest registry", False),
        ("organiser_load_index", "Organiser load index", False),
        ("institutional_mode", "Institutional compliance mode", False),
        ("sovereignty_index", "Composite sovereignty index", False),
        ("OIL_COMPETENCY_GRAPH", "Organiser Intelligence Layer: competency graph", False),
        ("OIL_NEEDS_SIGNALS", "Organiser Intelligence Layer: needs signals", False),
        ("OIL_ORGANISER_ANALYTICS", "Organiser Intelligence Layer: organiser analytics", False),
        ("OIL_GUILDS", "Organiser Intelligence Layer: guilds", False),
        ("OIL_COLLISION_DETECTION", "Organiser Intelligence Layer: collision detection", False),
        ("OIL_BURNOUT_INDEX", "Organiser Intelligence Layer: burnout index", False),
        ("OIL_FORMULA_REGISTRY", "Organiser Intelligence Layer: formula registry", False),
        ("OIL_CONSTELLATIONS", "Organiser Intelligence Layer: constellations", False),
        ("TIMEBANK_ENABLED", "Timebank layer", False),
        ("ASSETS_ENABLED", "Community asset registry", False),
        ("INSIGHTS_ENABLED", "Local knowledge commons", False),
        ("MERCHANTS_ENABLED", "Merchant reputation exchange", False),
        ("RISK_POOLS_ENABLED", "Risk mitigation pools", False),
        ("BURNOUT_ENABLED", "Burnout monitoring", False),
        ("CRISIS_SIM_ENABLED", "Crisis simulation", False),
        ("DASHBOARD_ENABLED", "Public impact dashboard", False),
        ("SYNERGY_ENABLED", "Inter-constellation synergy", False),
        ("FEDERATION_NODES_ENABLED", "Silent federation nodes", False),
        ("NODE_IDENTITY_BRIDGE_ENABLED", "Partner identity bridge", False),
        ("BENEFITS_LEDGER_ENABLED", "Benefits ledger", False),
        ("FEDERATION_WIDGETS_ENABLED", "Embedded federation widgets", False),
        ("FEDERATION_SHARING_ENABLED", "DP-safe federation sharing", False),
        ("SYSTEMIC_SHOCK_PREPAREDNESS", "Systemic shock preparedness", False),
        ("EARTH_ENTRY_ENABLED", "Earth entry experience", True),
        ("EARTH_SKY_OVERLAY_ENABLED", "Earth subtle sky overlay", True),
        ("HEAVEN_UNIVERSE_ENABLED", "Heaven universe projection", True),
        ("phase1_wcle_enabled", "Phase 1 Weekly Cost-Lowering Engine", True),
    ]
    for name, description, enabled in defaults:
        existing = FeatureFlag.query.filter_by(name=name).first()
        if not existing:
            flag = FeatureFlag(
                name=name,
                description=description,
                enabled=enabled,
                rollout_percentage=100.0 if enabled else 0.0,
                activated_at=datetime.utcnow() if enabled else None,
            )
            db.session.add(flag)
    db.session.commit()
