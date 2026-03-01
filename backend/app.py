import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import io

# Path to Kaggle Crop Recommendation Dataset (download from https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset)
DATASET_DIR = os.path.join(os.path.dirname(__file__), "data")
DATASET_NAMES = ["Crop_recommendation.csv", "crop_recommendation.csv", "CropRecommendation.csv"]

app = Flask(__name__)
# Enable CORS so the local frontend can make requests to this backend
CORS(app)

logging.basicConfig(level=logging.INFO)

# Global variables to hold the trained model and data-derived ranges
rf_model = None
TRAINED_CROP_LABELS = []
FAVOURABLE_RANGES = {}  # per-crop numeric min/max from training data (for current vs ideal)

# Ideal conditions and care summary per crop (for "what this crop needs")
CROP_REQUIREMENTS = {
    "rice": {"N": "50–120", "P": "20–50", "K": "30–50", "temp": "20–35°C", "humidity": "60–85%", "ph": "5–7.5", "rainfall": "150–300 mm", "care": "Keep soil flooded in growth phase; top-dress N at tillering; ensure good drainage."},
    "maize": {"N": "80–120", "P": "25–50", "K": "40–80", "temp": "18–32°C", "humidity": "50–80%", "ph": "5.5–7", "rainfall": "50–150 mm", "care": "Side-dress N at knee-high; avoid waterlogging; adequate P at planting."},
    "chickpea": {"N": "20–40", "P": "25–50", "K": "25–50", "temp": "15–30°C", "humidity": "40–70%", "ph": "6–7.5", "rainfall": "30–80 mm", "care": "Low N requirement (fixes own); inoculate with rhizobium; avoid excess water."},
    "kidneybeans": {"N": "25–50", "P": "30–60", "K": "30–60", "temp": "18–27°C", "humidity": "50–75%", "ph": "6–7", "rainfall": "40–100 mm", "care": "Inoculate with bean rhizobium; even moisture during flowering; avoid high N."},
    "apple": {"N": "40–80", "P": "30–60", "K": "80–150", "temp": "15–25°C", "humidity": "50–70%", "ph": "5.5–6.5", "rainfall": "50–120 mm", "care": "Balanced NPK; mulch to retain moisture; calcium for fruit quality."},
    "orange": {"N": "60–100", "P": "30–60", "K": "100–180", "temp": "20–32°C", "humidity": "55–75%", "ph": "5.5–6.5", "rainfall": "60–150 mm", "care": "Higher K for fruit; micro-nutrients (Zn, Mg); avoid water stress at flowering."},
    "coffee": {"N": "80–120", "P": "20–40", "K": "80–120", "temp": "18–24°C", "humidity": "60–80%", "ph": "5–6", "rainfall": "150–250 mm", "care": "Shade in hot areas; mulch; avoid frost; balanced N during vegetative growth."},
}

def _find_dataset_path():
    """Locate the Kaggle crop recommendation CSV in backend/data/ or backend/."""
    for name in DATASET_NAMES:
        for base in [DATASET_DIR, os.path.dirname(__file__)]:
            path = os.path.join(base, name)
            if os.path.isfile(path):
                return path
    return None


def _load_and_prepare_df():
    """Load CSV and return DataFrame with columns N, P, K, temperature, humidity, ph, rainfall, label."""
    path = _find_dataset_path()
    if not path:
        raise FileNotFoundError(
            "Crop recommendation dataset not found. Download from "
            "https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset "
            f"and place the CSV in: {os.path.abspath(DATASET_DIR)}"
        )
    logging.info("Loading dataset: %s", path)
    df = pd.read_csv(path)

    # Normalize column names to match expected: N, P, K, temperature, humidity, ph, rainfall, label
    def norm(name):
        n = str(name).strip().lower()
        if n in ("label", "crop"):
            return "label"
        if n == "ph":
            return "ph"
        if n in ("n", "p", "k"):
            return n.upper()
        if n in ("temperature", "humidity", "rainfall"):
            return n
        return name

    df = df.rename(columns={c: norm(c) for c in df.columns})

    required = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    missing = [c for c in required + ["label"] if c not in df.columns]
    if missing:
        raise ValueError(f"Dataset missing required columns: {missing}. Found: {list(df.columns)}")

    df = df[required + ["label"]].dropna()
    df["label"] = df["label"].astype(str).str.strip().str.lower()
    return df


def train_model():
    """Train RandomForest on the Kaggle Crop Recommendation Dataset; derive crop labels and favourable ranges."""
    global rf_model, TRAINED_CROP_LABELS, FAVOURABLE_RANGES
    logging.info("Training on Kaggle Crop Recommendation Dataset...")

    df = _load_and_prepare_df()
    feature_cols = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    X = df[feature_cols]
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
    rf_model.fit(X_train, y_train)

    predictions = rf_model.predict(X_test)
    acc = accuracy_score(y_test, predictions) * 100
    logging.info("Model trained successfully. Accuracy: %.2f%%", acc)

    TRAINED_CROP_LABELS = sorted(df["label"].unique().tolist())
    FAVOURABLE_RANGES.clear()
    for crop in TRAINED_CROP_LABELS:
        crop_df = df[df["label"] == crop]
        FAVOURABLE_RANGES[crop] = {
            col: [float(crop_df[col].min()), float(crop_df[col].max())]
            for col in feature_cols
        }

    # Ensure CROP_REQUIREMENTS has an entry for every trained crop (for display)
    for crop in TRAINED_CROP_LABELS:
        if crop not in CROP_REQUIREMENTS and crop in FAVOURABLE_RANGES:
            r = FAVOURABLE_RANGES[crop]
            CROP_REQUIREMENTS[crop] = {
                "N": f"{r['N'][0]:.0f}–{r['N'][1]:.0f}",
                "P": f"{r['P'][0]:.0f}–{r['P'][1]:.0f}",
                "K": f"{r['K'][0]:.0f}–{r['K'][1]:.0f}",
                "temp": f"{r['temperature'][0]:.1f}–{r['temperature'][1]:.1f}°C",
                "humidity": f"{r['humidity'][0]:.0f}–{r['humidity'][1]:.0f}%",
                "ph": f"{r['ph'][0]:.1f}–{r['ph'][1]:.1f}",
                "rainfall": f"{r['rainfall'][0]:.0f}–{r['rainfall'][1]:.0f} mm",
                "care": "Use favourable ranges from the table for soil management.",
            }

def analyze_time_series_data(df, model):
    """
    Takes a time-series DataFrame of sensor logs, analyzes trends, 
    predicts the best crop based on latest averages, and calculates planting windows.
    """
    alerts = []
    
    # Check if we have enough data points, default to checking last 3-7 days if possible
    window_size = min(len(df), 3)
    
    # 1. Calculate the recent averages for prediction
    recent_averages = df.tail(window_size).mean().to_dict()
    
    # Format for model input (ensure correct column order)
    required_cols = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
    input_df = pd.DataFrame([recent_averages])[required_cols]
    
    predicted_crop = model.predict(input_df)[0]
    
    # 2. Time-Series Trend Analysis (Slopes)
    def calculate_trend(series):
        if len(series) < 2: return "stable"
        x = np.arange(len(series))
        slope = np.polyfit(x, series.values, 1)[0]
        if slope > 0.5: return "increasing"
        if slope < -0.5: return "decreasing"
        return "stable"
        
    moisture_trend = calculate_trend(df['humidity'])
    temp_trend = calculate_trend(df['temperature'])
    n_trend = calculate_trend(df['N'])

    # 3. Threshold Breaches over time
    recent_n = df['N'].tail(window_size)
    if all(n < 30 for n in recent_n):
        alerts.append("CRITICAL: Nitrogen consistently below 30 mg/kg for consecutive readings. Immediate fertilization required.")
    elif recent_averages['N'] < 30:
         alerts.append("WARNING: Low Nitrogen detected in recent readings.")
         
    if recent_averages['P'] > 80:
        alerts.append("WARNING: High Phosphorus content detected on average. Avoid P-based fertilizers.")
    elif recent_averages['P'] < 20:
        alerts.append("ACTION REQUIRED: Low Phosphorus average. Root development may be stunted.")

    if recent_averages['ph'] < 5.5:
        alerts.append("SOIL HEALTH: Soil is consistently highly acidic. Consider applying agricultural lime.")
    elif recent_averages['ph'] > 7.5:
        alerts.append("SOIL HEALTH: Soil is consistently highly alkaline. Consider applying sulfur.")

    if recent_averages['humidity'] < 40 and recent_averages['rainfall'] < 50 and moisture_trend == 'decreasing':
        alerts.append("ACTION REQUIRED: Severe dry conditions detected with a downward moisture trend. Schedule deep irrigation immediately.")

    # 4. Yield Correlation (Synthetic Model)
    # We estimate a yield score based on how close the recent averages are to a "perfect" 100 benchmark (for demo purposes)
    # In reality, this would look up historical yield datasets for the predicted crop
    n_score = max(0, 100 - abs(recent_averages['N'] - 80)) # Assume 80 is ideal
    p_score = max(0, 100 - abs(recent_averages['P'] - 50)) # Assume 50 is ideal 
    k_score = max(0, 100 - abs(recent_averages['K'] - 50)) # Assume 50 is ideal
    moisture_score = max(0, 100 - abs(recent_averages['humidity'] - 65))
    
    historical_yield_score = int((n_score + p_score + k_score + moisture_score) / 4)
    
    # 5. Planting Recommendation Window
    planting_window = ""
    # Simple logic based on temp and moisture trends
    if temp_trend == "increasing" and moisture_trend == "decreasing":
         planting_window = "Wait 7-10 days. Moisture is dropping while temperatures rise."
    elif recent_averages['humidity'] > 60 and recent_averages['temperature'] > 20:
         planting_window = "Optimal Planting Window: Now. Soil conditions are ripe."
    else:
         planting_window = "Plant within 3-5 days after a light irrigation cycle."

    soil_health = "Poor" if len(alerts) > 2 else "Fair" if len(alerts) > 0 else "Excellent"

    # Prepare historical data for charting (e.g., last 14 records max)
    chart_data_df = df.tail(14).round(1)
    
    # Extract arrays for the frontend charts
    time_series_data = {
        'labels': [f"Day {i+1}" for i in range(len(chart_data_df))],
        'N': chart_data_df['N'].tolist(),
        'P': chart_data_df['P'].tolist(),
        'K': chart_data_df['K'].tolist(),
        'temperature': chart_data_df['temperature'].tolist(),
        'humidity': chart_data_df['humidity'].tolist(),
        'ph': chart_data_df['ph'].tolist(),
        'rainfall': chart_data_df['rainfall'].tolist()
    }

    crop_reqs = CROP_REQUIREMENTS.get(predicted_crop, {})

    return {
        "predicted_crop": predicted_crop,
        "soil_health_status": soil_health,
        "active_alerts": alerts,
        "historical_yield_score": historical_yield_score,
        "planting_window": planting_window,
        "trends": {
            "moisture": moisture_trend,
            "temperature": temp_trend,
            "nitrogen": n_trend
        },
        "time_series_data": time_series_data,
        "crop_requirements": crop_reqs,
        "all_crop_requirements": CROP_REQUIREMENTS,
        "crop_labels": TRAINED_CROP_LABELS,
        "current_averages": {k: float(v) for k, v in recent_averages.items()},
        "crop_favourable_ranges": {c: {k: [float(x) for x in v] for k, v in ranges.items()} for c, ranges in FAVOURABLE_RANGES.items()},
    }

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "message": "SoilSense Time-Series ML Backend is running."})


@app.route("/api/crop_labels", methods=["GET"])
def crop_labels():
    """Return list of crop labels the model was trained on (for dropdowns)."""
    return jsonify({"crop_labels": TRAINED_CROP_LABELS})

@app.route("/api/analyze_csv", methods=["POST"])
def analyze_csv():
    try:
        if 'file' not in request.files:
             return jsonify({"error": "No file part in the request"}), 400
             
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
            
        if not file.filename.endswith('.csv'):
             return jsonify({"error": "Only CSV files are allowed"}), 400
             
        # Read the CSV into a pandas DataFrame
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        df = pd.read_csv(stream)
        
        # Verify required columns exist
        required_cols = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
        missing_cols = [col for col in required_cols if col not in df.columns]
        
        if missing_cols:
             return jsonify({"error": f"CSV is missing required columns: {', '.join(missing_cols)}"}), 400
        
        # Drop rows with NaN in required columns
        df = df.dropna(subset=required_cols)
        
        if len(df) == 0:
            return jsonify({"error": "CSV contains no valid rows of data"}), 400
             
        # Run time-series inference
        result = analyze_time_series_data(df, rf_model)
        return jsonify(result), 200
        
    except Exception as e:
        logging.error(f"Error during CSV analysis: {str(e)}")
        return jsonify({"error": "Internal server error during CSV processing"}), 500

if __name__ == "__main__":
    train_model()
    # Run the server on localhost port 5001
    app.run(host="127.0.0.1", port=5001, debug=False)
