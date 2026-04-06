import time
import random
import requests
import os

API_URL = os.getenv("API_URL", "https://smart-traffic-api-lkis.onrender.com")

intersections = ["INT_001", "INT_002", "INT_003", "INT_004"]

def generate_data(intersection_id):
    congestion = random.choice(["low", "low", "medium", "medium", "high"])
    if congestion == "high":
        vehicle_count = random.randint(51, 80)
        speed = random.randint(10, 19)
    elif congestion == "medium":
        vehicle_count = random.randint(26, 50)
        speed = random.randint(20, 39)
    else:
        vehicle_count = random.randint(0, 25)
        speed = random.randint(40, 80)
    return {
        "intersection_id": intersection_id,
        "vehicle_count": vehicle_count,
        "average_speed_kmh": speed,
        "congestion": congestion
    }

end_time = time.time() + 150
while time.time() < end_time:
    for intersection in intersections:
        data = generate_data(intersection)
        print(f"Sending: {data}")
        try:
            response = requests.post(
                f"{API_URL}/api/traffic/incoming",
                json=data,
                timeout=10
            )
            print(f"Response: {response.status_code}")
        except Exception as e:
            print(f"Error: {e}")
    time.sleep(3)