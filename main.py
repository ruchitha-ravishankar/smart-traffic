from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import joblib
import numpy as np
import openrouteservice
import overpy
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

INTERSECTIONS = {
    "INT_001": {"lat": 12.9716, "lng": 77.5946, "name": "MG Road"},
    "INT_002": {"lat": 12.9784, "lng": 77.6408, "name": "Indiranagar"},
    "INT_003": {"lat": 12.9352, "lng": 77.6245, "name": "Koramangala"},
    "INT_004": {"lat": 12.9698, "lng": 77.7499, "name": "Whitefield"},
}

ORS_CLIENT = openrouteservice.Client(key=os.getenv("ORS_API_KEY"))

def init_db():
    conn = sqlite3.connect("traffic.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS traffic_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            intersection_id TEXT,
            vehicle_count INTEGER,
            average_speed_kmh INTEGER,
            congestion TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

init_db()

traffic_data = {}
emergency_intersections = set()
accident_alerts = []
model = None

@app.get("/")
def home():
    return {"message": "Smart Traffic System is running!"}

@app.post("/api/traffic/incoming")
def receive_traffic(data: dict):
    traffic_data[data["intersection_id"]] = data
    conn = sqlite3.connect("traffic.db")
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO traffic_readings (intersection_id, vehicle_count, average_speed_kmh, congestion)
        VALUES (?, ?, ?, ?)
    """, (data["intersection_id"], data["vehicle_count"], data["average_speed_kmh"], data["congestion"]))
    conn.commit()
    conn.close()

    if data["vehicle_count"] == 0 and data["average_speed_kmh"] <= 5:
        alert = {
            "intersection": data["intersection_id"],
            "message": f"Possible accident at {data['intersection_id']}!"
        }
        if alert not in accident_alerts:
            accident_alerts.append(alert)
            print(f"🚨 ACCIDENT DETECTED: {data['intersection_id']}")

    print(f"Saved: {data}")
    return {"status": "saved"}

@app.get("/api/traffic/live")
def get_live_traffic():
    return traffic_data

@app.get("/api/traffic/history")
def get_history():
    conn = sqlite3.connect("traffic.db")
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM traffic_readings ORDER BY timestamp DESC LIMIT 20")
    rows = cursor.fetchall()
    conn.close()
    return {"readings": rows}

@app.get("/api/predict/{vehicle_count}/{speed}")
def predict_congestion(vehicle_count: int, speed: int):
    if model is None:
        return {"error": "Model not trained yet"}
    prediction = model.predict([[vehicle_count, speed]])
    return {
        "vehicle_count": vehicle_count,
        "speed_kmh": speed,
        "predicted_congestion": prediction[0]
    }

@app.post("/api/emergency/{intersection_id}")
def trigger_emergency(intersection_id: str):
    emergency_intersections.add(intersection_id)
    print(f"🚑 EMERGENCY: {intersection_id} is now in emergency mode!")
    return {"status": "emergency activated", "intersection": intersection_id}

@app.delete("/api/emergency/{intersection_id}")
def clear_emergency(intersection_id: str):
    emergency_intersections.discard(intersection_id)
    print(f"✅ CLEARED: {intersection_id} emergency cleared")
    return {"status": "emergency cleared", "intersection": intersection_id}

@app.get("/api/emergency")
def get_emergencies():
    return {"active_emergencies": list(emergency_intersections)}

@app.get("/api/accidents")
def get_accidents():
    return {"accidents": accident_alerts}

@app.get("/api/route/{origin}/{destination}")
def suggest_route(origin: str, destination: str):
    blocked = []
    for intersection_id, data in traffic_data.items():
        if data["congestion"] == "high":
            blocked.append(intersection_id)
    for accident in accident_alerts:
        if accident["intersection"] not in blocked:
            blocked.append(accident["intersection"])

    origin_coords = [INTERSECTIONS[origin]["lng"], INTERSECTIONS[origin]["lat"]]
    dest_coords = [INTERSECTIONS[destination]["lng"], INTERSECTIONS[destination]["lat"]]

    try:
        route = ORS_CLIENT.directions(
            coordinates=[origin_coords, dest_coords],
            profile="driving-car",
            format="geojson"
        )
        steps = route["features"][0]["properties"]["segments"][0]["steps"]
        instructions = [step["instruction"] for step in steps]
        geometry = route["features"][0]["geometry"]["coordinates"]
        duration_min = round(route["features"][0]["properties"]["segments"][0]["duration"] / 60)
        distance_km = round(route["features"][0]["properties"]["segments"][0]["distance"] / 1000, 1)

        return {
            "origin": origin,
            "destination": destination,
            "blocked_intersections": blocked,
            "duration_minutes": duration_min,
            "distance_km": distance_km,
            "instructions": instructions,
            "geometry": geometry
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/signals/{origin}/{destination}")
def get_traffic_signals(origin: str, destination: str):
    try:
        origin_coords = INTERSECTIONS[origin]
        dest_coords = INTERSECTIONS[destination]

        min_lat = min(origin_coords["lat"], dest_coords["lat"]) - 0.01
        max_lat = max(origin_coords["lat"], dest_coords["lat"]) + 0.01
        min_lng = min(origin_coords["lng"], dest_coords["lng"]) - 0.01
        max_lng = max(origin_coords["lng"], dest_coords["lng"]) + 0.01

        api = overpy.Overpass()
        result = api.query(f"""
            node["highway"="traffic_signals"]
            ({min_lat},{min_lng},{max_lat},{max_lng});
            out;
        """)

        signals = []
        for node in result.nodes:
            signals.append({
                "lat": float(node.lat),
                "lng": float(node.lon),
                "id": node.id
            })

        return {"signals": signals, "count": len(signals)}

    except Exception as e:
        return {"error": str(e), "signals": []}