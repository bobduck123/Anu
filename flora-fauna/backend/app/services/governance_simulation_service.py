from datetime import datetime

from ..models import (
    GovernanceScenario,
    GovernanceScenarioStep,
    GovernanceScenarioRun,
    CompetencyProfile,
    AuditRecord,
    db,
)


def list_scenarios(active_only=True):
    query = GovernanceScenario.query
    if active_only:
        query = query.filter_by(is_active=True)
    return query.order_by(GovernanceScenario.created_at.desc()).all()


def get_scenario_steps(scenario_id):
    return GovernanceScenarioStep.query.filter_by(scenario_id=scenario_id).order_by(
        GovernanceScenarioStep.sequence.asc()
    ).all()


def _aggregate_impacts(decisions, steps):
    impact = {"treasury_delta_cents": 0, "risk_level": "low", "notes": []}
    for idx, decision in enumerate(decisions or []):
        if idx >= len(steps):
            break
        options = steps[idx].options_json or []
        selected = next((opt for opt in options if opt.get("value") == decision), None)
        if not selected:
            continue
        delta = selected.get("impact", {}).get("treasury_delta_cents", 0)
        impact["treasury_delta_cents"] += int(delta or 0)
        risk = selected.get("impact", {}).get("risk_level")
        if risk:
            impact["risk_level"] = risk
        note = selected.get("impact", {}).get("note")
        if note:
            impact["notes"].append(note)
    return impact


def run_scenario(user_id, scenario_id, decisions):
    scenario = GovernanceScenario.query.get_or_404(scenario_id)
    steps = get_scenario_steps(scenario_id)
    impact = _aggregate_impacts(decisions, steps)
    run = GovernanceScenarioRun(
        scenario_id=scenario.id,
        user_id=user_id,
        decisions_json=decisions,
        simulated_impact_json=impact,
        completed_at=datetime.utcnow(),
    )
    db.session.add(run)

    profile = CompetencyProfile.query.filter_by(user_id=user_id).first()
    if profile:
        matrix = profile.competency_matrix or {}
        matrix["Governance Simulations Completed"] = int(matrix.get("Governance Simulations Completed", 0)) + 1
        profile.competency_matrix = matrix

    db.session.add(AuditRecord(
        actor_id=user_id,
        action="governance_simulation_run",
        entity_type="governance_scenario",
        entity_id=str(scenario.id),
        payload={"impact": impact},
    ))
    db.session.commit()
    return run, impact
