"""
services/history_engine.py — Historical context enrichment for SoilSense.

Queries past sensor_uploads from MongoDB to produce a blended feature
vector that mixes current readings with the farm's historical averages.

Blending weights:
  - current upload : CURRENT_WEIGHT  (default 0.60)
  - historical avg : HISTORY_WEIGHT  (default 0.40)

If fewer than MIN_HISTORY_UPLOADS exist, the prediction falls back to
using only the current CSV data (same as the original behaviour).
"""

import logging

from db import get_db

logger = logging.getLogger(__name__)

FEATURE_COLS      = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
CURRENT_WEIGHT    = 0.60   # weight given to the current upload's averages
HISTORY_WEIGHT    = 0.40   # weight given to historical averages
MIN_HISTORY_UPLOADS = 1    # minimum past uploads needed to apply blending
MAX_HISTORY_LOOKUP  = 5    # how many past uploads to average


def enrich_with_history(
    current_averages: dict,
    farmer_id: str | None = None,
) -> tuple[dict, dict]:
    """
    Blend current averages with historical MongoDB data to produce an
    enriched feature vector for ML inference.

    Args:
        current_averages : dict of {feature: float} from the current upload
        farmer_id        : optional farmer identifier to scope the history lookup

    Returns:
        (enriched_averages, historical_context)

        enriched_averages  : dict of {feature: float} — the blended input to use
        historical_context : dict with metadata about the historical blend, to
                             be passed back to the frontend as extra info
    """
    db = get_db()

    # --- No DB connection: fall back to current-only ---
    if db is None:
        return current_averages, _no_history_context("MongoDB not connected")

    # --- Build query (scope by farmer_id if provided) ---
    query: dict = {}
    if farmer_id:
        query["farmer_id"] = farmer_id

    try:
        past_uploads = list(
            db["sensor_uploads"]
            .find(query, {"averages": 1, "upload_ts": 1, "_id": 0})
            .sort("upload_ts", -1)          # most recent first
            .limit(MAX_HISTORY_LOOKUP)
        )
    except Exception as exc:
        logger.warning("History query failed: %s", exc)
        return current_averages, _no_history_context("DB query error")

    # --- Not enough history: fall back to current-only ---
    if len(past_uploads) < MIN_HISTORY_UPLOADS:
        return current_averages, _no_history_context(
            f"Only {len(past_uploads)} past upload(s) found — need at least {MIN_HISTORY_UPLOADS}"
        )

    # --- Compute historical mean for each feature ---
    historical_means: dict[str, float] = {}
    for col in FEATURE_COLS:
        values = [
            upload["averages"][col]
            for upload in past_uploads
            if "averages" in upload and col in upload["averages"]
        ]
        if values:
            historical_means[col] = sum(values) / len(values)
        else:
            historical_means[col] = current_averages.get(col, 0.0)

    # --- Weighted blend ---
    enriched: dict[str, float] = {}
    for col in FEATURE_COLS:
        current_val  = current_averages.get(col, 0.0)
        historic_val = historical_means.get(col, current_val)
        enriched[col] = round(
            CURRENT_WEIGHT * current_val + HISTORY_WEIGHT * historic_val, 4
        )

    context = {
        "used_history":        True,
        "uploads_used":        len(past_uploads),
        "current_weight_pct":  int(CURRENT_WEIGHT * 100),
        "history_weight_pct":  int(HISTORY_WEIGHT * 100),
        "historical_averages": {k: round(v, 2) for k, v in historical_means.items()},
        "blended_averages":    {k: round(v, 2) for k, v in enriched.items()},
    }

    logger.info(
        "History enrichment applied: %d past upload(s) blended with current data.",
        len(past_uploads),
    )
    return enriched, context


def _no_history_context(reason: str) -> dict:
    """Return a context dict indicating no historical blending was applied."""
    return {
        "used_history": False,
        "reason":       reason,
    }
