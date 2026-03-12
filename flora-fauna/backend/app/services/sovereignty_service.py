"""Sovereignty floor enforcement logic.

Hard-coded treasury rules that cannot be overridden via the UI.
Rule changes require governance supermajority vote (scaffolded).
"""
from ..models import SovereigntyConfig, SOVEREIGNTY_DEFAULTS, ImpactPool, db
from .ledger_service import pool_balance


def get_config(node_id, config_key):
    """Get sovereignty config value, falling back to hard-coded defaults."""
    row = SovereigntyConfig.query.filter_by(node_id=node_id, config_key=config_key).first()
    if row:
        return row.config_value
    return SOVEREIGNTY_DEFAULTS.get(config_key)


def ensure_sovereignty_configs(node_id):
    """Seed default sovereignty configs for a node if not present."""
    for key, value in SOVEREIGNTY_DEFAULTS.items():
        existing = SovereigntyConfig.query.filter_by(node_id=node_id, config_key=key).first()
        if not existing:
            config = SovereigntyConfig(
                node_id=node_id,
                config_key=key,
                config_value=value,
                description=f"Default: {key}",
                is_immutable=True,
            )
            db.session.add(config)
    db.session.commit()


def validate_allocation(node_id, pool_slug, amount_cents, total_revenue_cents):
    """Validate that a proposed allocation respects sovereignty floor rules.

    Returns (is_valid, error_message).
    """
    if total_revenue_cents <= 0:
        return False, "Total revenue must be positive"

    allocation_pct = (amount_cents / total_revenue_cents) * 100

    if pool_slug == "sovereignty":
        min_pct = get_config(node_id, "sovereignty_pool_min_pct")
        if allocation_pct < min_pct:
            return False, f"Sovereignty pool allocation {allocation_pct:.1f}% is below minimum {min_pct}%"

    elif pool_slug == "operations":
        max_pct = get_config(node_id, "ops_pool_max_pct")
        if allocation_pct > max_pct:
            return False, f"Operations pool allocation {allocation_pct:.1f}% exceeds maximum {max_pct}%"

    elif pool_slug == "infrastructure":
        min_pct = get_config(node_id, "infrastructure_pool_min_pct")
        if allocation_pct < min_pct:
            return False, f"Infrastructure pool allocation {allocation_pct:.1f}% is below minimum {min_pct}%"

    elif pool_slug == "relief":
        cap_pct = get_config(node_id, "relief_disbursement_cap_pct")
        if allocation_pct > cap_pct:
            return False, f"Relief disbursement {allocation_pct:.1f}% exceeds cap {cap_pct}%"

    return True, None


def compute_auto_split(node_id, total_revenue_cents):
    """Compute the automatic pool split for event revenue based on sovereignty rules.

    Returns a dict of pool_slug -> amount_cents.
    """
    sovereignty_min = get_config(node_id, "sovereignty_pool_min_pct") or 15.0
    ops_max = get_config(node_id, "ops_pool_max_pct") or 30.0
    infra_min = get_config(node_id, "infrastructure_pool_min_pct") or 10.0
    endowment_divert = get_config(node_id, "endowment_auto_divert_pct") or 5.0

    splits = {
        "sovereignty": int(total_revenue_cents * sovereignty_min / 100),
        "infrastructure": int(total_revenue_cents * infra_min / 100),
        "endowment": int(total_revenue_cents * endowment_divert / 100),
    }

    remaining = total_revenue_cents - sum(splits.values())
    ops_amount = int(total_revenue_cents * ops_max / 100)
    splits["operations"] = min(ops_amount, remaining)
    remaining -= splits["operations"]

    # Remainder goes to rotation spotlight
    splits["rotation_spotlight"] = max(0, remaining)

    return splits


def can_change_rule(node_id, config_key, governance_vote_count, total_eligible_voters):
    """Check if a rule change has supermajority (>66% of eligible voters)."""
    if total_eligible_voters == 0:
        return False
    ratio = governance_vote_count / total_eligible_voters
    return ratio > 0.66
