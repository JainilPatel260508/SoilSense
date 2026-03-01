"""
models.py — MongoDB collection schemas and insert helpers for SoilSense.

Collections:
  - sensor_uploads   Raw CSV upload metadata + computed averages/trends
  - predictions      ML crop prediction results linked to an upload
  - alerts           Threshold breach alerts linked to an upload
"""

import logging
from datetime import datetime, timezone

from bson import ObjectId

from db import get_db

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now() -> datetime:
    """Return current UTC timestamp (timezone-aware)."""
    return datetime.now(tz=timezone.utc)


def _safe_insert(collection_name: str, document: dict):
    """
    Insert a document into the named collection.
    Returns the inserted ObjectId string, or None if DB is unavailable.
    """
    db = get_db()
    if db is None:
        logger.debug("DB unavailable — skipping insert into '%s'.", collection_name)
        return None
    try:
        result = db[collection_name].insert_one(document)
        return str(result.inserted_id)
    except Exception as exc:
        logger.error("Failed to insert into '%s': %s", collection_name, exc)
        return None


# ---------------------------------------------------------------------------
# sensor_uploads
# ---------------------------------------------------------------------------

def insert_upload(
    filename: str,
    row_count: int,
    averages: dict,
    trends: dict,
    farmer_id: str | None = None,
) -> str | None:
    """
    Store metadata about a CSV upload.

    Schema:
        filename      : original file name
        upload_ts     : UTC datetime of upload
        row_count     : number of valid rows in the CSV
        farmer_id     : optional identifier for the uploader
        averages      : dict of {col: mean_value} across recent window
        trends        : dict of {moisture|temperature|nitrogen: trend_str}
    """
    doc = {
        "filename": filename,
        "upload_ts": _now(),
        "row_count": row_count,
        "farmer_id": farmer_id,
        "averages": averages,
        "trends": trends,
    }
    upload_id = _safe_insert("sensor_uploads", doc)
    if upload_id:
        logger.info("Stored upload → sensor_uploads _id=%s", upload_id)
    return upload_id


# ---------------------------------------------------------------------------
# predictions
# ---------------------------------------------------------------------------

def insert_prediction(
    upload_id: str | None,
    predicted_crop: str,
    input_features: dict,
    confidence: float | None = None,
) -> str | None:
    """
    Store an ML prediction result.

    Schema:
        upload_id       : ref to sensor_uploads._id (string)
        predicted_crop  : model output label
        confidence      : optional probability score (0.0–1.0)
        input_features  : dict of the 7 feature averages fed to the model
        timestamp       : UTC datetime
    """
    doc = {
        "upload_id": upload_id,
        "predicted_crop": predicted_crop,
        "confidence": confidence,
        "input_features": input_features,
        "timestamp": _now(),
    }
    pred_id = _safe_insert("predictions", doc)
    if pred_id:
        logger.info("Stored prediction → predictions _id=%s", pred_id)
    return pred_id


# ---------------------------------------------------------------------------
# alerts
# ---------------------------------------------------------------------------

_SEVERITY_MAP = {
    "CRITICAL": "critical",
    "WARNING":  "warning",
    "ACTION":   "warning",
    "SOIL":     "info",
}


def _infer_severity(alert_text: str) -> str:
    for keyword, severity in _SEVERITY_MAP.items():
        if keyword in alert_text.upper():
            return severity
    return "info"


def _infer_alert_type(alert_text: str) -> str:
    text = alert_text.lower()
    if "nitrogen" in text:
        return "low_nitrogen"
    if "phosphorus" in text:
        return "phosphorus_imbalance"
    if "acidic" in text or "alkaline" in text or "ph" in text:
        return "ph_imbalance"
    if "dry" in text or "moisture" in text or "irrigation" in text:
        return "dry_conditions"
    return "general"


def insert_alerts(upload_id: str | None, alert_texts: list[str]) -> list[str]:
    """
    Store one document per alert in the alerts collection.

    Schema (per document):
        upload_id   : ref to sensor_uploads._id
        alert_type  : inferred category string
        severity    : 'critical' | 'warning' | 'info'
        message     : original alert text
        timestamp   : UTC datetime
    """
    inserted_ids = []
    for text in alert_texts:
        doc = {
            "upload_id": upload_id,
            "alert_type": _infer_alert_type(text),
            "severity": _infer_severity(text),
            "message": text,
            "timestamp": _now(),
        }
        alert_id = _safe_insert("alerts", doc)
        if alert_id:
            inserted_ids.append(alert_id)
    if inserted_ids:
        logger.info("Stored %d alert(s) → alerts collection", len(inserted_ids))
    return inserted_ids
