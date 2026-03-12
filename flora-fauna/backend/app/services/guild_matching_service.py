from ..models import Guild, GuildMembership, OrganiserCompetencyProfile, NeedsSignal, TrustScore
from ..services.formula_registry_service import resolve_params, log_run


def _default_params():
    return {
        "max_recommendations": 5,
        "min_trust_score": 40,
        "anti_capture_cap": 2,
        "needs_weight": 1.5,
        "competency_weight": 1.0,
    }


def recommend_guilds(user_id, node_id, actor_id=None):
    params, version = resolve_params("guild_matching_v1", node_id=node_id)
    cfg = {**_default_params(), **(params or {})}

    trust = TrustScore.query.filter_by(user_id=user_id).first()
    if trust and trust.composite_score < cfg["min_trust_score"]:
        return []

    member_counts = {
        g.id: GuildMembership.query.filter_by(guild_id=g.id, left_at=None).count()
        for g in Guild.query.filter_by(node_id=node_id, active=True).all()
    }
    needs = NeedsSignal.query.filter_by(node_id=node_id).all()

    recommendations = []
    for guild_id, count in member_counts.items():
        if count >= cfg["anti_capture_cap"]:
            continue
        score = 0.0
        score += cfg["needs_weight"] * len(needs)
        profile = OrganiserCompetencyProfile.query.filter_by(user_id=user_id, node_id=node_id).first()
        score += cfg["competency_weight"] * (profile.proficiency_level if profile else 0.0)
        recommendations.append({"guild_id": guild_id, "score": score, "reasons": ["needs_alignment"]})

    recommendations = sorted(recommendations, key=lambda r: r["score"], reverse=True)[: cfg["max_recommendations"]]
    log_run("guild_matching_v1", version, {"user_id": user_id, "node_id": node_id}, actor_id)
    return recommendations
