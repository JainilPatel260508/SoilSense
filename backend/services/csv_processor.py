"""
services/csv_processor.py — CSV ingestion and feature computation for SoilSense.

Responsibilities:
  - Validate required columns
  - Compute per-column averages over a recent window
  - Compute trend slopes (increasing / decreasing / stable)
  - Build chart-ready time-series arrays
"""

import numpy as np
import pandas as pd

REQUIRED_COLS = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
WINDOW_SIZE = 3   # rows used for "recent" averages and trend calculation
CHART_ROWS  = 14  # max rows returned to frontend charts


def validate_columns(df: pd.DataFrame) -> list[str]:
    """Return a list of missing required column names (empty = all present)."""
    return [c for c in REQUIRED_COLS if c not in df.columns]


def compute_averages(df: pd.DataFrame) -> dict:
    """Return mean of each feature column over the recent window."""
    window = min(len(df), WINDOW_SIZE)
    return df.tail(window)[REQUIRED_COLS].mean().to_dict()


def calculate_trend(series: pd.Series) -> str:
    """Return 'increasing', 'decreasing', or 'stable' for a numeric series."""
    if len(series) < 2:
        return "stable"
    x = np.arange(len(series))
    slope = np.polyfit(x, series.values, 1)[0]
    if slope > 0.5:
        return "increasing"
    if slope < -0.5:
        return "decreasing"
    return "stable"


def compute_trends(df: pd.DataFrame) -> dict:
    """Return trend strings for moisture, temperature, and nitrogen."""
    return {
        "moisture":    calculate_trend(df["humidity"]),
        "temperature": calculate_trend(df["temperature"]),
        "nitrogen":    calculate_trend(df["N"]),
    }


def build_chart_data(df: pd.DataFrame) -> dict:
    """Return chart-ready arrays (up to CHART_ROWS rows)."""
    chart_df = df.tail(CHART_ROWS).round(1)
    return {
        "labels":      [f"Day {i + 1}" for i in range(len(chart_df))],
        "N":           chart_df["N"].tolist(),
        "P":           chart_df["P"].tolist(),
        "K":           chart_df["K"].tolist(),
        "temperature": chart_df["temperature"].tolist(),
        "humidity":    chart_df["humidity"].tolist(),
        "ph":          chart_df["ph"].tolist(),
        "rainfall":    chart_df["rainfall"].tolist(),
    }


def compute_yield_score(averages: dict) -> int:
    """Synthetic yield score based on proximity to benchmark values."""
    n_score       = max(0, 100 - abs(averages["N"]        - 80))
    p_score       = max(0, 100 - abs(averages["P"]        - 50))
    k_score       = max(0, 100 - abs(averages["K"]        - 50))
    moisture_score = max(0, 100 - abs(averages["humidity"] - 65))
    return int((n_score + p_score + k_score + moisture_score) / 4)


def compute_planting_window(averages: dict, trends: dict) -> str:
    """Return a planting recommendation string."""
    if trends["temperature"] == "increasing" and trends["moisture"] == "decreasing":
        return "Wait 7-10 days. Moisture is dropping while temperatures rise."
    if averages["humidity"] > 60 and averages["temperature"] > 20:
        return "Optimal Planting Window: Now. Soil conditions are ripe."
    return "Plant within 3-5 days after a light irrigation cycle."
