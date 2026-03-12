def apply_dp_threshold(value, min_cohort):
    if value is None:
        return 0
    return value if value >= min_cohort else 0


def add_noise(value, epsilon):
    return value
