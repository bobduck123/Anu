import math


def bayesian_change_point(series, hazard=0.05):
    if not series:
        return {"prob_change": 0.0, "run_length": 0}
    run_length = 0
    prob_change = 0.0
    mean = series[0]
    for i, x in enumerate(series[1:], 1):
        mean = mean + (x - mean) / (i + 1)
        prob_change = hazard * (abs(x - mean) / (abs(mean) + 1e-6))
        run_length += 1
    prob_change = min(1.0, prob_change)
    return {"prob_change": prob_change, "run_length": run_length}
