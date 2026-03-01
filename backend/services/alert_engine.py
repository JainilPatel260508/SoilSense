"""
services/alert_engine.py — Threshold breach detection for SoilSense.

Analyses recent averages and trend data to generate human-readable
alert strings consistent with the existing frontend alert card format.
"""

import pandas as pd


def generate_alerts(
    df: pd.DataFrame,
    averages: dict,
    trends: dict,
    window_size: int = 3,
) -> list[str]:
    """
    Return a list of alert message strings based on soil parameter thresholds.

    Args:
        df          : full cleaned DataFrame from the uploaded CSV
        averages    : pre-computed recent averages dict
        trends      : pre-computed trends dict
        window_size : number of recent rows to evaluate for consecutive checks
    """
    alerts: list[str] = []
    recent_n = df["N"].tail(window_size)

    # --- Nitrogen ---
    if all(n < 30 for n in recent_n):
        alerts.append(
            "CRITICAL: Nitrogen consistently below 30 mg/kg for consecutive readings. "
            "Immediate fertilization required."
        )
    elif averages["N"] < 30:
        alerts.append("WARNING: Low Nitrogen detected in recent readings.")

    # --- Phosphorus ---
    if averages["P"] > 80:
        alerts.append(
            "WARNING: High Phosphorus content detected on average. "
            "Avoid P-based fertilizers."
        )
    elif averages["P"] < 20:
        alerts.append(
            "ACTION REQUIRED: Low Phosphorus average. Root development may be stunted."
        )

    # --- pH ---
    if averages["ph"] < 5.5:
        alerts.append(
            "SOIL HEALTH: Soil is consistently highly acidic. "
            "Consider applying agricultural lime."
        )
    elif averages["ph"] > 7.5:
        alerts.append(
            "SOIL HEALTH: Soil is consistently highly alkaline. "
            "Consider applying sulfur."
        )

    # --- Moisture / Dry conditions ---
    if (
        averages["humidity"] < 40
        and averages["rainfall"] < 50
        and trends["moisture"] == "decreasing"
    ):
        alerts.append(
            "ACTION REQUIRED: Severe dry conditions detected with a downward moisture trend. "
            "Schedule deep irrigation immediately."
        )

    return alerts


def soil_health_label(alerts: list[str]) -> str:
    """Return a high-level soil health string based on alert count."""
    if len(alerts) > 2:
        return "Poor"
    if len(alerts) > 0:
        return "Fair"
    return "Excellent"
