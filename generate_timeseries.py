import pandas as pd
import numpy as np

# Generate 30 days of data
np.random.seed(1337)
days = 30

# Introduce some linear trends
nitrogen_trend = np.linspace(100, 25, days) # Dropping nitrogen
moisture_trend = np.linspace(80, 30, days)  # Drying out
temperature_trend = np.linspace(22, 28, days) # Warming up

data = {
    'N': nitrogen_trend + np.random.normal(0, 5, days),
    'P': np.random.normal(45, 2, days),
    'K': np.random.normal(35, 2, days),
    'temperature': temperature_trend + np.random.normal(0, 1, days),
    'humidity': moisture_trend + np.random.normal(0, 3, days),
    'ph': np.random.normal(6.5, 0.1, days),
    'rainfall': np.random.normal(5, 5, days).clip(min=0)
}

df = pd.DataFrame(data).round(2)
df.to_csv('test_sensor_data.csv', index=False)
print("Generated test_sensor_data.csv with 30 time-series readings.")
