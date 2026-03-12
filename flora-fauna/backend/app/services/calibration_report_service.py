from ..services.math.hazard_risk_model import brier_score, expected_calibration_error


def calibration_report(preds, labels):
    return {
        "brier_score": brier_score(preds, labels),
        "ece": expected_calibration_error(preds, labels),
    }
