"""
app.py — SoilSense Flask backend (with MongoDB persistence).

Flow:
  Frontend → /api/analyze_csv
    → validate & parse CSV
    → compute averages / trends / alerts via service modules
    → persist to MongoDB (sensor_uploads, predictions, alerts)
    → return structured JSON to frontend (unchanged contract)

MongoDB is optional: if Docker is not running the app degrades
gracefully and continues to serve all requests without persistence.
"""

import io
import logging
import os
import sys

from flask import Flask, jsonify, request
from flask_cors import CORS

# Ensure backend/ is on the path so sibling imports resolve correctly
sys.path.insert(0, os.path.dirname(__file__))

import db as database
import models
from services import alert_engine, csv_processor, history_engine, ml_engine

# ML training imports (kept here so the model trains on startup)
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split

# ---------------------------------------------------------------------------
# Flask app setup
# ---------------------------------------------------------------------------

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Dataset + model globals
# ---------------------------------------------------------------------------

DATASET_DIR   = os.path.join(os.path.dirname(__file__), "data")
DATASET_NAMES = [
    "Crop_recommendation.csv",
    "crop_recommendation.csv",
    "CropRecommendation.csv",
]

rf_model: RandomForestClassifier | None = None
TRAINED_CROP_LABELS: list[str]          = []
FAVOURABLE_RANGES:   dict               = {}

# Ideal care conditions per crop (static reference data)
CROP_REQUIREMENTS = {
    "rice":       {"N": "50–120", "P": "20–50",  "K": "30–50",  "temp": "20–35°C",  "humidity": "60–85%", "ph": "5–7.5",   "rainfall": "150–300 mm", "care": "Keep soil flooded in growth phase; top-dress N at tillering; ensure good drainage."},
    "maize":      {"N": "80–120", "P": "25–50",  "K": "40–80",  "temp": "18–32°C",  "humidity": "50–80%", "ph": "5.5–7",   "rainfall": "50–150 mm",  "care": "Side-dress N at knee-high; avoid waterlogging; adequate P at planting."},
    "chickpea":   {"N": "20–40",  "P": "25–50",  "K": "25–50",  "temp": "15–30°C",  "humidity": "40–70%", "ph": "6–7.5",   "rainfall": "30–80 mm",   "care": "Low N requirement (fixes own); inoculate with rhizobium; avoid excess water."},
    "kidneybeans":{"N": "25–50",  "P": "30–60",  "K": "30–60",  "temp": "18–27°C",  "humidity": "50–75%", "ph": "6–7",     "rainfall": "40–100 mm",  "care": "Inoculate with bean rhizobium; even moisture during flowering; avoid high N."},
    "apple":      {"N": "40–80",  "P": "30–60",  "K": "80–150", "temp": "15–25°C",  "humidity": "50–70%", "ph": "5.5–6.5", "rainfall": "50–120 mm",  "care": "Balanced NPK; mulch to retain moisture; calcium for fruit quality."},
    "orange":     {"N": "60–100", "P": "30–60",  "K": "100–180","temp": "20–32°C",  "humidity": "55–75%", "ph": "5.5–6.5", "rainfall": "60–150 mm",  "care": "Higher K for fruit; micro-nutrients (Zn, Mg); avoid water stress at flowering."},
    "coffee":     {"N": "80–120", "P": "20–40",  "K": "80–120", "temp": "18–24°C",  "humidity": "60–80%", "ph": "5–6",     "rainfall": "150–250 mm", "care": "Shade in hot areas; mulch; avoid frost; balanced N during vegetative growth."},
}

# ---------------------------------------------------------------------------
# ML training (runs at startup)
# ---------------------------------------------------------------------------

def _find_dataset_path() -> str | None:
    for name in DATASET_NAMES:
        for base in [DATASET_DIR, os.path.dirname(__file__)]:
            path = os.path.join(base, name)
            if os.path.isfile(path):
                return path
    return None


def _load_and_prepare_df() -> pd.DataFrame:
    path = _find_dataset_path()
    if not path:
        raise FileNotFoundError(
            "Crop recommendation dataset not found. Download from "
            "https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset "
            f"and place the CSV in: {os.path.abspath(DATASET_DIR)}"
        )
    logger.info("Loading dataset: %s", path)
    df = pd.read_csv(path)

    def norm(name):
        n = str(name).strip().lower()
        if n in ("label", "crop"):   return "label"
        if n == "ph":                return "ph"
        if n in ("n", "p", "k"):     return n.upper()
        if n in ("temperature", "humidity", "rainfall"): return n
        return name

    df = df.rename(columns={c: norm(c) for c in df.columns})
    required = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    missing  = [c for c in required + ["label"] if c not in df.columns]
    if missing:
        raise ValueError(f"Dataset missing columns: {missing}. Found: {list(df.columns)}")
    df = df[required + ["label"]].dropna()
    df["label"] = df["label"].astype(str).str.strip().str.lower()
    return df


def train_model():
    global rf_model, TRAINED_CROP_LABELS, FAVOURABLE_RANGES
    logger.info("Training on Kaggle Crop Recommendation Dataset…")
    df = _load_and_prepare_df()
    feature_cols = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    X, y = df[feature_cols], df["label"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
    rf_model.fit(X_train, y_train)
    acc = accuracy_score(y_test, rf_model.predict(X_test)) * 100
    logger.info("Model trained successfully. Accuracy: %.2f%%", acc)
    TRAINED_CROP_LABELS = sorted(df["label"].unique().tolist())
    FAVOURABLE_RANGES.clear()
    for crop in TRAINED_CROP_LABELS:
        crop_df = df[df["label"] == crop]
        FAVOURABLE_RANGES[crop] = {
            col: [float(crop_df[col].min()), float(crop_df[col].max())]
            for col in feature_cols
        }
    for crop in TRAINED_CROP_LABELS:
        if crop not in CROP_REQUIREMENTS:
            r = FAVOURABLE_RANGES[crop]
            CROP_REQUIREMENTS[crop] = {
                "N":        f"{r['N'][0]:.0f}–{r['N'][1]:.0f}",
                "P":        f"{r['P'][0]:.0f}–{r['P'][1]:.0f}",
                "K":        f"{r['K'][0]:.0f}–{r['K'][1]:.0f}",
                "temp":     f"{r['temperature'][0]:.1f}–{r['temperature'][1]:.1f}°C",
                "humidity": f"{r['humidity'][0]:.0f}–{r['humidity'][1]:.0f}%",
                "ph":       f"{r['ph'][0]:.1f}–{r['ph'][1]:.1f}",
                "rainfall": f"{r['rainfall'][0]:.0f}–{r['rainfall'][1]:.0f} mm",
                "care":     "Use favourable ranges from the table for soil management.",
            }

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "message": "SoilSense Time-Series ML Backend is running."})


@app.route("/api/db_status", methods=["GET"])
def db_status():
    """Check MongoDB connectivity."""
    if database.is_connected():
        db_handle = database.get_db()
        return jsonify({
            "status":  "connected",
            "db":      db_handle.name,
            "message": "MongoDB is connected and operational.",
        })
    return jsonify({
        "status":  "disconnected",
        "message": "MongoDB is not connected. Running in stateless mode.",
    }), 503


@app.route("/api/crop_labels", methods=["GET"])
def crop_labels():
    return jsonify({"crop_labels": TRAINED_CROP_LABELS})


@app.route("/api/analyze_csv", methods=["POST"])
def analyze_csv():
    try:
        # --- 1. Validate file upload ---
        if "file" not in request.files:
            return jsonify({"error": "No file part in the request"}), 400
        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400
        if not file.filename.endswith(".csv"):
            return jsonify({"error": "Only CSV files are allowed"}), 400

        # --- 2. Parse CSV ---
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        df     = pd.read_csv(stream)

        missing_cols = csv_processor.validate_columns(df)
        if missing_cols:
            return jsonify({"error": f"CSV is missing required columns: {', '.join(missing_cols)}"}), 400

        df = df.dropna(subset=csv_processor.REQUIRED_COLS)
        if len(df) == 0:
            return jsonify({"error": "CSV contains no valid rows of data"}), 400

        # --- 3. Compute features ---
        averages = csv_processor.compute_averages(df)
        trends   = csv_processor.compute_trends(df)
        alerts   = alert_engine.generate_alerts(df, averages, trends)
        soil_health      = alert_engine.soil_health_label(alerts)
        yield_score      = csv_processor.compute_yield_score(averages)
        planting_window  = csv_processor.compute_planting_window(averages, trends)
        chart_data       = csv_processor.build_chart_data(df)

        # --- 4. Enrich with historical MongoDB data (context-aware prediction) ---
        farmer_id = request.form.get("farmer_id")  # optional — pass from frontend later
        enriched_averages, historical_context = history_engine.enrich_with_history(
            current_averages=averages,
            farmer_id=farmer_id,
        )

        # --- 5. ML inference (on blended features if history exists, else current only) ---
        predicted_crop, confidence = ml_engine.predict(rf_model, enriched_averages)

        # --- 6. Persist to MongoDB (non-blocking; fails gracefully) ---
        feature_averages = {k: float(v) for k, v in averages.items()}
        upload_id = models.insert_upload(
            filename=file.filename,
            row_count=len(df),
            averages=feature_averages,
            trends=trends,
        )
        models.insert_prediction(
            upload_id=upload_id,
            predicted_crop=predicted_crop,
            input_features={k: float(v) for k, v in enriched_averages.items()},
            confidence=confidence,
        )
        models.insert_alerts(upload_id=upload_id, alert_texts=alerts)

        # --- 7. Build response (same JSON contract + new historical_context field) ---
        crop_reqs = CROP_REQUIREMENTS.get(predicted_crop, {})
        result = {
            "predicted_crop":       predicted_crop,
            "soil_health_status":   soil_health,
            "active_alerts":        alerts,
            "historical_yield_score": yield_score,
            "planting_window":      planting_window,
            "trends":               trends,
            "time_series_data":     chart_data,
            "crop_requirements":    crop_reqs,
            "all_crop_requirements": CROP_REQUIREMENTS,
            "crop_labels":          TRAINED_CROP_LABELS,
            "current_averages":     feature_averages,
            "crop_favourable_ranges": {
                c: {k: [float(x) for x in v] for k, v in ranges.items()}
                for c, ranges in FAVOURABLE_RANGES.items()
            },
            "historical_context":   historical_context,
        }
        return jsonify(result), 200

    except Exception as exc:
        logger.error("Error during CSV analysis: %s", exc)
        return jsonify({"error": "Internal server error during CSV processing"}), 500


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

# Initialize model and database when the module loads (required for Vercel/Serverless)
try:
    if rf_model is None:
        train_model()
        database.init_db()          # Attempt MongoDB connection (non-fatal)
except Exception as e:
    logger.error("Failed to initialize during startup: %s", e)

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5002, debug=False)
