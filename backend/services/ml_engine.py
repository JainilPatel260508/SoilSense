"""
services/ml_engine.py — ML inference wrapper for SoilSense.

Wraps the global RandomForest model call and returns the predicted
crop label along with a probability confidence score.
"""

import logging

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def predict(model, averages: dict) -> tuple[str, float | None]:
    """
    Run inference on the 7-feature averages dict.

    Returns:
        (predicted_crop_label, confidence_score)
        confidence_score is a float 0.0–1.0, or None if the model
        does not support predict_proba.
    """
    required_cols = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    input_df = pd.DataFrame([averages])[required_cols]

    predicted_crop: str = model.predict(input_df)[0]

    confidence: float | None = None
    try:
        proba = model.predict_proba(input_df)[0]
        class_labels = list(model.classes_)
        idx = class_labels.index(predicted_crop)
        confidence = round(float(proba[idx]), 4)
    except Exception:
        pass  # Some model configurations don't expose predict_proba

    logger.debug(
        "ML prediction: crop=%s, confidence=%s", predicted_crop, confidence
    )
    return predicted_crop, confidence
