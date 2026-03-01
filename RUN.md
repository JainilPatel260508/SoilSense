---

## How to run (fix "No crops loaded")

1. **Start the backend** (from this folder: `SoilSense`):
   ```bash
   cd SoilSense
   python3 backend/app.py
   ```
   Leave this terminal open. You should see: `Model trained successfully...` and the app running on port 5002.

2. **Stop any old backend**  
   If you already had something on port 5002, stop it (Ctrl+C in that terminal) so the new backend with crop labels is the one running.

3. **Serve the frontend** (in a second terminal):
   ```bash
   cd SoilSense
   python3 -m http.server 8081
   ```

4. **Open in browser:** http://localhost:8081  
   Do not open the HTML file directly (file://). Use the URL above so the app can call the backend.

5. **Check backend:** Open http://127.0.0.1:5002/api/crop_labels — you should see JSON with a list of crops. If you see 404, the backend running is old; restart it from step 1.

---

