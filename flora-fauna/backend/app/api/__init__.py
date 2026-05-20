from flask import Blueprint

from .memberships import memberships_bp
from .stripe_webhooks import stripe_bp
from .pools import pools_bp
from .ledger import ledger_bp
from .relief import relief_bp
from .consent import consent_bp
from .households import households_bp
from .allocations import allocations_bp
from .credits import credits_bp
from .perks import perks_bp
from .engagement import engagement_bp
from .stories import stories_bp
from .teams import teams_bp
from .packs import packs_bp
from .education import education_bp
from .education_stack import education_stack_bp
from .capital import capital_bp
from .transparency import transparency_bp
from .governance import governance_bp
from .escrow import escrow_bp
from .incidents import incidents_bp
from .crisis import crisis_bp
from .feature_flags import feature_flags_bp
from .privacy import privacy_bp
from .audit_export import audit_export_bp
from .vendors import vendors_bp
from .assets import assets_bp
from .archive import archive_bp
from .federation import federation_bp
from .institutional import institutional_bp
from .formulas import formulas_bp
from .competency import competency_bp
from .needs_signals import needs_bp
from .organiser_analytics import analytics_bp
from .guilds import guilds_bp
from .burnout import burnout_bp
from .collisions import collisions_bp
from .metrics_registry import metrics_bp
from .model_registry import models_bp
from .replay import replay_bp
from .dp import dp_bp
from .math_engine import math_bp
from .sovereignty import sovereignty_bp
from .organizer_load import organizer_load_bp
from .governance_simulations import governance_sim_bp
from .marketplace import marketplace_bp
from .profiles import profiles_bp
from .green_infrastructure import green_bp
from .food_sovereignty import food_bp
from .constellations import constellations_bp
from .systemic import systemic_bp
from .federation_nodes import federation_nodes_bp
from .time_entries import time_entries_bp
from .insights import insights_bp
from .merchants import merchants_bp
from .treasury import treasury_bp
from .burnout_monitor import burnout_monitor_bp
from .crisis_sim import crisis_sim_bp
from .impact import impact_bp
from .synergy import synergy_bp
from .hell import hell_bp
from .wcle import wcle_bp
from .calendar import calendar_bp
from .admin_tenants import admin_tenants_bp
from .cultural_public import cultural_public_bp
from .cultural_control import cultural_control_bp
from .dumb_dumb import dumb_dumb_bp
from .domain_resolution import domain_resolution_bp
from .presence import presence_bp, control_presence_bp
from .presence_owner import presence_owner_bp
from .presence_graph import admin_presence_graph_bp, observer_bp, paths_bp, presence_graph_bp


api_bp = Blueprint("api", __name__, url_prefix="/api")

api_bp.register_blueprint(memberships_bp)
api_bp.register_blueprint(stripe_bp)
api_bp.register_blueprint(pools_bp)
api_bp.register_blueprint(ledger_bp)
api_bp.register_blueprint(relief_bp)
api_bp.register_blueprint(consent_bp)
api_bp.register_blueprint(households_bp)
api_bp.register_blueprint(allocations_bp)
api_bp.register_blueprint(credits_bp)
api_bp.register_blueprint(perks_bp)
api_bp.register_blueprint(engagement_bp)
api_bp.register_blueprint(stories_bp)
api_bp.register_blueprint(teams_bp)
api_bp.register_blueprint(packs_bp)
api_bp.register_blueprint(education_bp)
api_bp.register_blueprint(education_stack_bp)
api_bp.register_blueprint(capital_bp)
api_bp.register_blueprint(transparency_bp)
api_bp.register_blueprint(governance_bp)
api_bp.register_blueprint(escrow_bp)
api_bp.register_blueprint(incidents_bp)
api_bp.register_blueprint(crisis_bp)
api_bp.register_blueprint(feature_flags_bp)
api_bp.register_blueprint(privacy_bp)
api_bp.register_blueprint(audit_export_bp)
api_bp.register_blueprint(vendors_bp)
api_bp.register_blueprint(assets_bp)
api_bp.register_blueprint(archive_bp)
api_bp.register_blueprint(federation_bp)
api_bp.register_blueprint(institutional_bp)
api_bp.register_blueprint(formulas_bp)
api_bp.register_blueprint(competency_bp)
api_bp.register_blueprint(needs_bp)
api_bp.register_blueprint(analytics_bp)
api_bp.register_blueprint(guilds_bp)
api_bp.register_blueprint(burnout_bp)
api_bp.register_blueprint(collisions_bp)
api_bp.register_blueprint(metrics_bp)
api_bp.register_blueprint(models_bp)
api_bp.register_blueprint(replay_bp)
api_bp.register_blueprint(dp_bp)
api_bp.register_blueprint(math_bp)
api_bp.register_blueprint(sovereignty_bp)
api_bp.register_blueprint(organizer_load_bp)
api_bp.register_blueprint(governance_sim_bp)
api_bp.register_blueprint(marketplace_bp)
api_bp.register_blueprint(profiles_bp)
api_bp.register_blueprint(green_bp)
api_bp.register_blueprint(food_bp)
api_bp.register_blueprint(constellations_bp)
api_bp.register_blueprint(systemic_bp)
api_bp.register_blueprint(federation_nodes_bp)
api_bp.register_blueprint(time_entries_bp)
api_bp.register_blueprint(insights_bp)
api_bp.register_blueprint(merchants_bp)
api_bp.register_blueprint(treasury_bp)
api_bp.register_blueprint(burnout_monitor_bp)
api_bp.register_blueprint(crisis_sim_bp)
api_bp.register_blueprint(impact_bp)
api_bp.register_blueprint(synergy_bp)
api_bp.register_blueprint(hell_bp)
api_bp.register_blueprint(wcle_bp)
api_bp.register_blueprint(calendar_bp)
api_bp.register_blueprint(admin_tenants_bp)
api_bp.register_blueprint(cultural_public_bp)
api_bp.register_blueprint(cultural_control_bp)
api_bp.register_blueprint(dumb_dumb_bp)
api_bp.register_blueprint(domain_resolution_bp)
api_bp.register_blueprint(presence_bp)
api_bp.register_blueprint(presence_graph_bp)
api_bp.register_blueprint(control_presence_bp)
api_bp.register_blueprint(presence_owner_bp)
api_bp.register_blueprint(observer_bp)
api_bp.register_blueprint(paths_bp)
api_bp.register_blueprint(admin_presence_graph_bp)
