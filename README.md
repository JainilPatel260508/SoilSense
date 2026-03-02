# SoilSense

A Soil Health Dashboard that converts raw sensor logs into actionable agricultural intelligence.


## 1. Problem Statement

### Problem Title
Lack of actionable insights from raw soil sensor data.

### Problem Description
Modern farms use sensors to monitor soil parameters like pH, moisture, nitrogen levels, and temperature. However, raw logs provide limited value without structured analysis. Farmers need interpretation of soil health trends to determine planting windows and manage crop health, avoiding false-positive alerts and missed early signals of degradation.

### Target Users
Farmers, Agronomists, and Agricultural Extension Workers.

### Existing Gaps
- Inability to automatically ingest and analyze time-series soil sensor data.
- Lack of tools tracking long-term soil health trends.
- No automated detection of critical soil parameter threshold breaches.
- Missing correlation between current soil parameters and historical yield data.
- Absence of actionable, data-driven planting recommendations.

## 2. Problem Understanding & Approach

### Root Cause Analysis
Raw sensor data is voluminous and complex. Identifying non-linear relationships (e.g., how pH and moisture affect nutrient availability) is difficult manually, leading to reactive rather than proactive farming practices.

### Solution Strategy
Build a centralized dashboard that processes CSV sensor logs using Machine Learning (Random Forest) to unearth trends, correlate multiple parameters, and generate meaningful alerts and planting recommendations.

## 3. Proposed Solution

### Solution Overview
SoilSense is an intelligent dashboard tailored for agriculture. It ingests sensor data, applies an ML model to determine soil health and suitable crops, and visualizes the findings on an easy-to-read interface.

### Core Idea
Move from raw data to actionable agricultural intelligence using a robust ML model capable of handling non-linear real-world variables.

### Key Features
- **CSV Data Ingestion**: Easy upload of raw sensor logs.
- **Trend Visualization**: Graphical representation of soil parameters over time.
- **Intelligent Alerts**: Detection of threshold breaches without overwhelming the user with false positives.
- **Planting Recommendations**: Suggests optimal yield crops based on current soil conditions.

## 4. System Architecture

### High-Level Flow
Sensor Data (CSV) -> Data Preprocessing -> ML Model Prediction -> Backend Processing -> Visual Dashboard (Frontend)

## 5. Dataset Selected

### Dataset Name
Crop Recommendation Dataset(Kaggle)

### Source
Kaggle

### Data Type
Tabular data containing N, P, K, temperature, humidity, ph, rainfall, and target crop labels.

### Selection Reason
It provides a comprehensive baseline of how different soil parameters correlate with specific crop requirements, ideal for training a recommendation engine.

## 6. Model Selected

### Model Name
Random Forest Classifier

### Selection Reasoning
Handles non-linear relationships between variables (like how pH and Rainfall affect NPK absorption) much better than simple linear models. It is highly resistant to "overfitting," meaning it generalizes well to new, unseen sensor data.

### Alternatives Considered
**Gaussian Naive Bayes**: Secondary option. Fast and effective for smaller datasets, often reaching up to 99% accuracy on standard tabular crop data.

## 7. Technology Stack

- **Frontend**: HTML, CSS, JavaScript (or a simple framework if chosen later)
- **Backend**: Python (Flask/FastAPI or simple script)
- **ML/AI**: Scikit-learn (Python), Pandas, NumPy
- **Data Visualization**: Matplotlib / Chart.js

## 8. Module-wise Development & Deliverables

### Checkpoint 1: Research & Planning
**Deliverables**: Finalized dataset, selected model workflow, and UI sketches.

### Checkpoint 2: Model Training
**Deliverables**: Cleaned dataset, trained Random Forest model, and saved model weights (`.pkl` file).

### Checkpoint 3: Backend & Integration
**Deliverables**: Python script to load data, run predictions, and pass results to the dashboard.

### Checkpoint 4: Frontend Development
**Deliverables**: Basic dashboard to visualize data and display alerts/recommendations. 

## 9. End-to-End Workflow
1. User uploads a CSV file containing recent sensor logs.
2. The system parses the data array and handles missing values.
3. The Random Forest model evaluates the data against trained thresholds.
4. The dashboard updates to show parameter trends, triggers any necessary alerts (e.g., Low Nitrogen), and recommends the best crop for the current season.

## 10. Demo & Links

- **Deployed Link**: https://soil-sense-three.vercel.app/
- **Google Drive Link**:https://drive.google.com/drive/folders/132P1dELqMbG9LacfPhwKVwsYtCeuFAy_?usp=sharing

## 11. Impact
SoilSense transforms farming from a reactive task to a proactive, data-driven science. By accurately interpreting soil health, it prevents soil degradation, optimizes resource application (fertilizers/water), and ultimately improves sustainable crop yields.
