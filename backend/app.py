import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import io

app = Flask(__name__)
# Enable CORS so the local frontend can make requests to this backend
CORS(app)

logging.basicConfig(level=logging.INFO)

# Global variables to hold the trained model
rf_model = None

def train_model():
    """Trains the RandomForest model using synthetic data on startup."""
    global rf_model
    logging.info("Training ML model using synthetic data...")
    # ==========================================
    # DATA PREPARATION
    # ==========================================
    np.random.seed(42)
    data_size = 500
    df = pd.DataFrame({
        'N': np.random.randint(0, 140, data_size),
        'P': np.random.randint(5, 145, data_size),
        'K': np.random.randint(5, 205, data_size),
        'temperature': np.random.uniform(10.0, 40.0, data_size),
        'humidity': np.random.uniform(15.0, 95.0, data_size),
        'ph': np.random.uniform(3.5, 9.5, data_size),
        'rainfall': np.random.uniform(20.0, 300.0, data_size),
        'label': np.random.choice(['rice', 'maize', 'chickpea', 'kidneybeans', 'apple', 'orange', 'coffee'], data_size)
    })

    # ==========================================
    # MODEL TRAINING
    # ==========================================
    X = df[['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']]
    y = df['label']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
    rf_model.fit(X_train, y_train)

    predictions = rf_model.predict(X_test)
    acc = accuracy_score(y_test, predictions) * 100
    logging.info(f"Model trained successfully. Accuracy: {acc:.2f}%")

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
        "time_series_data": time_series_data
    }

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "message": "SoilSense Time-Series ML Backend is running."})

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
