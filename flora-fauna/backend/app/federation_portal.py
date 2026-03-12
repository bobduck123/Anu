from flask import Blueprint, request

from .services.feature_flag_service import is_enabled

community_bp = Blueprint("community_portal", __name__, url_prefix="/community")


@community_bp.route("/", defaults={"path": ""})
@community_bp.route("/<path:path>")
def community_shell(path):
    if not is_enabled("FEDERATION_WIDGETS_ENABLED"):
        return "Community portal disabled", 403
    widget = request.args.get("widget", "benefits")
    token = request.args.get("token", "")
    partner_user_id = request.args.get("partner_user_id", "")
    return f"""
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Community</title>
  <style>body{{margin:0;background:#f7f6f3;}}</style>
</head>
<body>
  <div id="federation-widget"></div>
  <script src="/static/federation-sdk.js"></script>
  <script>
    FederationWidget.mount('#federation-widget', {{
      widget: '{widget}',
      token: '{token}',
      partnerUserId: '{partner_user_id}'
    }});
  </script>
</body>
</html>
"""
