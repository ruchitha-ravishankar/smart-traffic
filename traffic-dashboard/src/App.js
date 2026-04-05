import { useEffect, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Circle, Popup, Polyline, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API = "https://smart-traffic-4nc8.onrender.com";

const INTERSECTIONS = {
  INT_001: { lat: 12.9716, lng: 77.5946, name: "MG Road" },
  INT_002: { lat: 12.9784, lng: 77.6408, name: "Indiranagar" },
  INT_003: { lat: 12.9352, lng: 77.6245, name: "Koramangala" },
  INT_004: { lat: 12.9698, lng: 77.7499, name: "Whitefield" },
};

const NAME_TO_ID = {
  "MG Road": "INT_001",
  "Indiranagar": "INT_002",
  "Koramangala": "INT_003",
  "Whitefield": "INT_004",
};

const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function App() {
  const [liveData, setLiveData] = useState({});
  const [history, setHistory] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [accidents, setAccidents] = useState([]);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [routeResult, setRouteResult] = useState(null);
  const [signals, setSignals] = useState([]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const live = await axios.get(`${API}/api/traffic/live`);
        const hist = await axios.get(`${API}/api/traffic/history`);
        const emerg = await axios.get(`${API}/api/emergency`);
        const acc = await axios.get(`${API}/api/accidents`);
        setLiveData(live.data);
        setHistory(hist.data.readings);
        setEmergencies(emerg.data.active_emergencies);
        setAccidents(acc.data.accidents);
      } catch (err) {
        console.log("API error:", err);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const congestionColor = (level) => {
    if (level === "high") return "#ff4444";
    if (level === "medium") return "#ffaa00";
    return "#00cc44";
  };

  const highCongestion = Object.values(liveData).filter(
    (item) => item.congestion === "high"
  );

  const triggerEmergency = async (id) => {
    await axios.post(`${API}/api/emergency/${id}`);
  };

  const clearEmergency = async (id) => {
    await axios.delete(`${API}/api/emergency/${id}`);
  };

  const findRoute = async () => {
    const originId = NAME_TO_ID[origin];
    const destId = NAME_TO_ID[destination];
    if (!originId || !destId) {
      alert("Please select valid origin and destination!");
      return;
    }
    const res = await axios.get(`${API}/api/route/${originId}/${destId}`);
    setRouteResult(res.data);
    const sigRes = await axios.get(`${API}/api/signals/${originId}/${destId}`);
    setSignals(sigRes.data.signals);
  };

  const routeCoords = routeResult?.geometry
    ? routeResult.geometry.map(([lng, lat]) => [lat, lng])
    : null;

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>🚦 Smart Traffic Dashboard — Bengaluru</h1>

      {emergencies.length > 0 && (
        <div style={{
          background: "#7b2ff7", color: "white",
          padding: "12px 20px", borderRadius: "8px",
          marginBottom: "16px", fontWeight: "bold", fontSize: "16px"
        }}>
          🚑 EMERGENCY VEHICLE ACTIVE at{" "}
          {emergencies.map(id => INTERSECTIONS[id]?.name).join(", ")}
          — All signals GREEN!
        </div>
      )}

      {accidents.length > 0 && (
        <div style={{
          background: "#ff6600", color: "white",
          padding: "12px 20px", borderRadius: "8px",
          marginBottom: "16px", fontWeight: "bold", fontSize: "16px"
        }}>
          🚧 ACCIDENT DETECTED at{" "}
          {accidents.map(a => INTERSECTIONS[a.intersection]?.name).join(", ")}!
          — Caution advised!
        </div>
      )}

      {highCongestion.length > 0 && (
        <div style={{
          background: "#ff4444", color: "white",
          padding: "12px 20px", borderRadius: "8px",
          marginBottom: "16px", fontWeight: "bold", fontSize: "16px"
        }}>
          🚨 ALERT: High congestion at{" "}
          {highCongestion.map(i => INTERSECTIONS[i.intersection_id]?.name).join(", ")}!
        </div>
      )}

      <div style={{
        background: "#f8f8f8", padding: "20px",
        borderRadius: "12px", marginBottom: "24px",
        border: "1px solid #ddd"
      }}>
        <h2 style={{ marginTop: 0 }}>🗺️ Smart Route Finder</h2>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={origin}
            onChange={e => setOrigin(e.target.value)}
            style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px" }}
          >
            <option value="">Select Origin</option>
            {Object.keys(NAME_TO_ID).map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <span style={{ fontSize: "20px" }}>→</span>
          <select
            value={destination}
            onChange={e => setDestination(e.target.value)}
            style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px" }}
          >
            <option value="">Select Destination</option>
            {Object.keys(NAME_TO_ID).map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <button
            onClick={findRoute}
            style={{
              padding: "10px 20px", background: "#0066ff",
              color: "white", border: "none", borderRadius: "8px",
              cursor: "pointer", fontWeight: "bold", fontSize: "14px"
            }}
          >
            🔍 Find Best Route
          </button>
        </div>

        {routeResult && !routeResult.error && (
          <div style={{ marginTop: "16px" }}>
            <div style={{
              padding: "12px", borderRadius: "8px",
              background: "#f0fff0", border: "1px solid #ccffcc",
              marginBottom: "8px"
            }}>
              <p><b>⭐ Best Route:</b> {origin} → {destination}</p>
              <p>📏 Distance: {routeResult.distance_km} km</p>
              <p>⏱️ Duration: {routeResult.duration_minutes} minutes</p>
              <p>🚦 Traffic signals on route: {signals.length}</p>
              {routeResult.blocked_intersections.length > 0 && (
                <p style={{ color: "#cc0000" }}>⚠️ Avoiding: {routeResult.blocked_intersections.map(id => INTERSECTIONS[id]?.name).join(", ")}</p>
              )}
            </div>
            <h3>Turn by turn directions:</h3>
            {routeResult.instructions.map((step, i) => (
              <div key={i} style={{
                padding: "8px 12px", borderBottom: "1px solid #eee",
                fontSize: "14px"
              }}>
                {i + 1}. {step}
              </div>
            ))}
          </div>
        )}
      </div>

      <h2>Live Map</h2>
      <MapContainer
        center={[12.9716, 77.5946]}
        zoom={12}
        style={{ height: "400px", borderRadius: "12px", marginBottom: "24px" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {Object.values(liveData).map((item) => {
          const location = INTERSECTIONS[item.intersection_id];
          if (!location) return null;
          const isEmergency = emergencies.includes(item.intersection_id);
          const isAccident = accidents.some(a => a.intersection === item.intersection_id);
          return (
            <Circle
              key={item.intersection_id}
              center={[location.lat, location.lng]}
              radius={300}
              color={isEmergency ? "#7b2ff7" : isAccident ? "#ff6600" : congestionColor(item.congestion)}
              fillColor={isEmergency ? "#7b2ff7" : isAccident ? "#ff6600" : congestionColor(item.congestion)}
              fillOpacity={0.6}
            >
              <Popup>
                <b>{location.name}</b><br />
                {isEmergency && <b>🚑 EMERGENCY MODE<br /></b>}
                {isAccident && <b>🚧 ACCIDENT REPORTED<br /></b>}
                🚗 {item.vehicle_count} vehicles<br />
                ⚡ {item.average_speed_kmh} km/h<br />
                ⚠️ {item.congestion} congestion
              </Popup>
            </Circle>
          );
        })}
        {routeCoords && (
          <Polyline positions={routeCoords} color="#0066ff" weight={5} />
        )}
        {signals.map((signal) => (
          <Circle
            key={signal.id}
            center={[signal.lat, signal.lng]}
            radius={30}
            color="#FFD700"
            fillColor="#FFD700"
            fillOpacity={1}
          >
            <Popup>🚦 Traffic Signal</Popup>
          </Circle>
        ))}
        {routeCoords && NAME_TO_ID[origin] && (
          <Marker
            position={[INTERSECTIONS[NAME_TO_ID[origin]].lat, INTERSECTIONS[NAME_TO_ID[origin]].lng]}
            icon={greenIcon}
          >
            <Popup>🟢 Start: {origin}</Popup>
          </Marker>
        )}
        {routeCoords && NAME_TO_ID[destination] && (
          <Marker
            position={[INTERSECTIONS[NAME_TO_ID[destination]].lat, INTERSECTIONS[NAME_TO_ID[destination]].lng]}
            icon={redIcon}
          >
            <Popup>🔴 End: {destination}</Popup>
          </Marker>
        )}
      </MapContainer>

      <h2>Live Traffic</h2>
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
        {Object.values(liveData).map((item) => {
          const isEmergency = emergencies.includes(item.intersection_id);
          const isAccident = accidents.some(a => a.intersection === item.intersection_id);
          return (
            <div key={item.intersection_id} style={{
              background: isEmergency ? "#7b2ff7" : isAccident ? "#ff6600" : congestionColor(item.congestion),
              padding: "20px", borderRadius: "12px",
              color: "white", minWidth: "160px"
            }}>
              <h3>{INTERSECTIONS[item.intersection_id]?.name}</h3>
              {isEmergency && <p>🚑 EMERGENCY MODE</p>}
              {isAccident && <p>🚧 ACCIDENT REPORTED</p>}
              <p>🚗 {item.vehicle_count} vehicles</p>
              <p>⚡ {item.average_speed_kmh} km/h</p>
              <p>⚠️ {item.congestion}</p>
              {isEmergency ? (
                <button onClick={() => clearEmergency(item.intersection_id)} style={{
                  background: "white", color: "#7b2ff7",
                  border: "none", padding: "8px 12px",
                  borderRadius: "6px", cursor: "pointer",
                  fontWeight: "bold", width: "100%"
                }}>✅ Clear Emergency</button>
              ) : (
                <button onClick={() => triggerEmergency(item.intersection_id)} style={{
                  background: "white", color: "#333",
                  border: "none", padding: "8px 12px",
                  borderRadius: "6px", cursor: "pointer",
                  fontWeight: "bold", width: "100%"
                }}>🚑 Emergency</button>
              )}
            </div>
          );
        })}
      </div>

      <h2>Recent History</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th style={{ padding: "8px", textAlign: "left" }}>Intersection</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Vehicles</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Speed</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Congestion</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Time</th>
          </tr>
        </thead>
        <tbody>
          {history.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "8px" }}>{INTERSECTIONS[row[1]]?.name}</td>
              <td style={{ padding: "8px" }}>{row[2]}</td>
              <td style={{ padding: "8px" }}>{row[3]}</td>
              <td style={{ padding: "8px", color: congestionColor(row[4]) }}>{row[4]}</td>
              <td style={{ padding: "8px" }}>{row[5]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;