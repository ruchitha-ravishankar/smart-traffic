import sqlite3
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import joblib

def load_data():
    conn = sqlite3.connect("traffic.db")
    df = pd.read_sql_query("SELECT * FROM traffic_readings", conn)
    conn.close()
    return df

df = load_data()
print(f"Total readings in database: {len(df)}")

X = df[["vehicle_count", "average_speed_kmh"]]
y = df["congestion"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

model = RandomForestClassifier(n_estimators=100)
model.fit(X_train, y_train)

predictions = model.predict(X_test)
accuracy = accuracy_score(y_test, predictions)
print(f"Model accuracy: {accuracy * 100:.2f}%")

joblib.dump(model, "congestion_model.pkl")
print("Model saved as congestion_model.pkl!")