import math


def hazard_probability(features, betas):
    linear = betas.get("intercept", 0.0)
    for key, value in features.items():
        linear += betas.get(key, 0.0) * value
    return 1 - math.exp(-math.exp(linear))


def brier_score(preds, labels):
    if not preds:
        return 0.0
    return sum((p - y) ** 2 for p, y in zip(preds, labels)) / len(preds)


def expected_calibration_error(preds, labels, bins=10):
    if not preds:
        return 0.0
    bin_size = 1.0 / bins
    ece = 0.0
    for b in range(bins):
        lower = b * bin_size
        upper = (b + 1) * bin_size
        idx = [i for i, p in enumerate(preds) if lower <= p < upper]
        if not idx:
            continue
        avg_pred = sum(preds[i] for i in idx) / len(idx)
        avg_true = sum(labels[i] for i in idx) / len(idx)
        ece += (len(idx) / len(preds)) * abs(avg_pred - avg_true)
    return ece
