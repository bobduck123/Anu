from ..services.math.hazard_risk_model import brier_score, expected_calibration_error


def backtest_predictions(preds, labels):
    return {
        "brier": brier_score(preds, labels),
        "ece": expected_calibration_error(preds, labels),
    }
