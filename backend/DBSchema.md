## SoilSense MongoDB Schema

This document describes the effective MongoDB schema used by the SoilSense backend.

Database name is taken from the `MONGO_DB_NAME` environment variable (default: `soilsense`).

---

## Collection: `sensor_uploads`

Stores metadata and aggregated metrics for each uploaded CSV of sensor data.

- **_id**: `ObjectId`
- **filename**: `string`  
  Original CSV file name.
- **upload_ts**: `datetime` (UTC)  
  Timestamp when the CSV was processed.
- **row_count**: `int`  
  Number of valid rows in the CSV after cleaning.
- **farmer_id**: `string | null`  
  Optional identifier for the uploader (currently unused unless provided).
- **averages**: `object` (`{ [key: string]: number }`)  
  Mean values across the recent window for each numeric column, typically:
  - `N`, `P`, `K`
  - `temperature`, `humidity`, `ph`, `rainfall`
  Additional numeric sensor columns may also appear here.
- **trends**: `object` (`{ [key: string]: string }`)  
  Trend labels per parameter, e.g.:
  - `nitrogen`: `"increasing" | "decreasing" | "stable"`
  - `temperature`: `"increasing" | "decreasing" | "stable"`
  - `moisture`: `"increasing" | "decreasing" | "stable"`

Example:

```json
{
  "_id": "665fa0e8c5d5e2c1f3a1b234",
  "filename": "farm_42_june.csv",
  "upload_ts": "2026-03-02T10:15:00Z",
  "row_count": 864,
  "farmer_id": "farmer_42",
  "averages": {
    "N": 78.5,
    "P": 39.2,
    "K": 40.1,
    "temperature": 27.3,
    "humidity": 64.8,
    "ph": 6.4,
    "rainfall": 122.0
  },
  "trends": {
    "nitrogen": "increasing",
    "temperature": "stable",
    "moisture": "decreasing"
  }
}
```

---

## Collection: `predictions`

Stores ML crop recommendation results for each upload.

- **_id**: `ObjectId`
- **upload_id**: `string | null`  
  Stringified reference to the associated `sensor_uploads._id`. May be `null` if the upload could not be stored.
- **predicted_crop**: `string`  
  Crop label predicted by the Random Forest model (e.g. `"rice"`, `"maize"`, `"apple"`).
- **confidence**: `number | null`  
  Optional probability score in the range \[0.0, 1.0\] for `predicted_crop`.
- **input_features**: `object` (`{ [key: string]: number }`)  
  The exact 7 feature averages fed into the model, typically:
  - `N`, `P`, `K`
  - `temperature`, `humidity`, `ph`, `rainfall`
- **timestamp**: `datetime` (UTC)  
  Time when the prediction was stored.

Example:

```json
{
  "_id": "665fa25fc5d5e2c1f3a1b235",
  "upload_id": "665fa0e8c5d5e2c1f3a1b234",
  "predicted_crop": "rice",
  "confidence": 0.87,
  "input_features": {
    "N": 78.5,
    "P": 39.2,
    "K": 40.1,
    "temperature": 27.3,
    "humidity": 64.8,
    "ph": 6.4,
    "rainfall": 122.0
  },
  "timestamp": "2026-03-02T10:15:02Z"
}
```

---

## Collection: `alerts`

Stores soil health alerts generated from threshold checks and trends for each upload.

- **_id**: `ObjectId`
- **upload_id**: `string | null`  
  Stringified reference to the associated `sensor_uploads._id`.
- **alert_type**: `string`  
  Inferred category based on the alert text. Possible values include:
  - `"low_nitrogen"`
  - `"phosphorus_imbalance"`
  - `"ph_imbalance"`
  - `"dry_conditions"`
  - `"general"`
- **severity**: `string`  
  Derived from keywords in the alert message:
  - `"critical"`
  - `"warning"`
  - `"info"`
- **message**: `string`  
  Original human-readable alert text displayed in the UI.
- **timestamp**: `datetime` (UTC)  
  Time when the alert was stored.

Example:

```json
{
  "_id": "665fa2e6c5d5e2c1f3a1b236",
  "upload_id": "665fa0e8c5d5e2c1f3a1b234",
  "alert_type": "low_nitrogen",
  "severity": "warning",
  "message": "ACTION: Nitrogen levels are trending low. Consider side-dressing with a nitrogen-rich fertilizer.",
  "timestamp": "2026-03-02T10:15:05Z"
}
```

---

## Notes

- All collections are created implicitly by MongoDB on first insert.
- If MongoDB is not available (no `MONGO_URI` or connection failure), inserts are skipped gracefully and no documents are written.
- Field sets inside `averages`, `trends`, and `input_features` may grow as additional sensor parameters are introduced, but their structure remains a flat key–value map.
