import requests
import json
import logging

logging.basicConfig(level=logging.INFO)

url = 'http://127.0.0.1:5002/api/analyze_csv'
files = {'file': open('test_sensor_data.csv', 'rb')}

try:
    response = requests.post(url, files=files)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Success! Crop Predicted: {data.get('predicted_crop')}")
        print(f"📊 Yield Score: {data.get('historical_yield_score')}")
        print(f"📅 Planting Window: {data.get('planting_window')}")
        
        print("\n📈 Trends:")
        print(f"  - Moisture: {data.get('trends', {}).get('moisture')}")
        print(f"  - Temp: {data.get('trends', {}).get('temperature')}")
        print(f"  - N: {data.get('trends', {}).get('nitrogen')}")

        print("\n🛑 Active Alerts:")
        for alert in data.get('active_alerts', []):
            print(f"  - {alert}")
            
    else:
        print(f"❌ Error {response.status_code}: {response.text}")
except Exception as e:
    print(f"💥 Request failed: {e}")
