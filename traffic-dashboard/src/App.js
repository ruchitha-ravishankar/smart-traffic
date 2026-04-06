import { useEffect, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Circle, Popup, Polyline, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const styles = {
  app: { fontFamily: "'Segoe UI', sans-serif", background: "#0f1117", minHeight: "100vh", color: "#ffffff" },
  header: { background: "linear-gradient(135deg, #1a1f2e, #252d3d)", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #2d3748", boxShadow: "0 2px 20px rgba(0,0,0,0.3)" },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  headerTitle: { fontSize: "22px", fontWeight: "700", background: "linear-gradient(135deg, #4facfe, #00f2fe)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  headerSubtitle: { fontSize: "12px", color: "#718096", marginTop: "2px" },
  liveBadge: { background: "#22c55e", color: "white", padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" },
  liveDot: { width: "6px", height: "6px", background: "white", borderRadius: "50%", animation: "pulse 1.5s infinite" },
  main: { padding: "24px 32px" },
  alertBanner: (color) => ({ background: color, color: "white", padding: "14px 20px", borderRadius: "12px", marginBottom: "16px", fontWeight: "600", fontSize: "14px", display: "flex", alignItems: "center", gap: "10px", boxShadow: `0 4px 15px ${color}40` }),
  sectionTitle: { fontSize: "16px", fontWeight: "600", color: "#a0aec0", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "1px" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" },
  statCard: (color) => ({ background: "#1a1f2e", border: `1px solid ${color}40`, borderRadius: "16px", padding: "20px", position: "relative", overflow: "hidden" }),
  statCardAccent: (color) => ({ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: color }),
  statName: { fontSize: "12px", color: "#718096", marginBottom: "8px", fontWeight: "500" },
  statVehicles: { fontSize: "28px", fontWeight: "700", color: "white", marginBottom: "4px" },
  statSpeed: { fontSize: "13px", color: "#a0aec0" },
  statBadge: (color) => ({ display: "inline-block", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: `${color}20`, color: color, marginTop: "8px" }),
  emergencyBtn: (isEmergency) => ({ width: "100%", padding: "8px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "12px", marginTop: "12px", background: isEmergency ? "#ef444420" : "#3b82f620", color: isEmergency ? "#ef4444" : "#3b82f6", transition: "all 0.2s" }),
  routeBox: { background: "#1a1f2e", border: "1px solid #2d3748", borderRadius: "16px", padding: "24px", marginBottom: "28px" },
  routeTitle: { fontSize: "18px", fontWeight: "700", color: "white", marginBottom: "20px" },
  routeControls: { display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", marginBottom: "16px" },
  select: { padding: "12px 16px", borderRadius: "10px", border: "1px solid #2d3748", background: "#252d3d", color: "white", fontSize: "14px", outline: "none", minWidth: "160px" },
  findBtn: { padding: "12px 24px", background: "linear-gradient(135deg, #4facfe, #00f2fe)", color: "#0f1117", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "14px" },
  routeResult: { background: "#252d3d", borderRadius: "12px", padding: "16px", marginTop: "16px" },
  routeStats: { display: "flex", gap: "24px", marginBottom: "16px", flexWrap: "wrap" },
  routeStat: { fontSize: "14px", color: "#a0aec0" },
  routeStatValue: { color: "white", fontWeight: "600" },
  directionItem: { padding: "10px 0", borderBottom: "1px solid #2d3748", fontSize: "13px", color: "#a0aec0", display: "flex", gap: "12px" },
  directionNum: { color: "#4facfe", fontWeight: "600", minWidth: "24px" },
  mapBox: { background: "#1a1f2e", border: "1px solid #2d3748", borderRadius: "16px", overflow: "hidden", marginBottom: "28px" },
  mapHeader: { padding: "16px 20px", borderBottom: "1px solid #2d3748", display: "flex", justifyContent: "space-between", alignItems: "center" },
  mapTitle: { fontSize: "16px", fontWeight: "600", color: "white" },
  mapLegend: { display: "flex", gap: "16px", flexWrap: "wrap" },
  legendItem: (color) => ({ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#a0aec0" }),
  legendDot: (color) => ({ width: "10px", height: "10px", borderRadius: "50%", background: color }),
  tableBox: { background: "#1a1f2e", border: "1px solid #2d3748", borderRadius: "16px", overflow: "hidden" },
  tableHeader: { padding: "16px 20px", borderBottom: "1px solid #2d3748" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "12px 16px", textAlign: "left", fontSize: "11px", color: "#718096", textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid #2d3748" },
  td: { padding: "12px 16px", fontSize: "13px", color: "#a0aec0", borderBottom: "1px solid #1a1f2e" },
};

const congestionColor = (level) => {
  if (level === "high") return "#ef4444";
  if (level === "medium") return "#f59e0b";
  return "#22c55e";
};

function App() {
  const [liveData, setLiveData] = useState({});
  const [history, setHistory] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [accidents, setAccidents] = useState([]);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [routeResult, setRouteResult] = useState(null);
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const live = await axios.get("http://localhost:8000/api/traffic/live");
        const hist = await axios.get("http://localhost:8000/api/traffic/history");
        const emerg = await axios.get("http://localhost:8000/api/emergency");
        const acc = await axios.get("http://localhost:8000/api/accidents");
        setLiveData(live.data);
        setHistory(hist.data.readings);
        setEmergencies(emerg.data.active_emergencies);
        setAccidents(acc.data.accidents);
      } catch (e) {}
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const triggerEmergency = async (id) => {
    await axios.post(`http://localhost:8000/api/emergency/${id}`);
  };

  const clearEmergency = async (id) => {
    await axios.delete(`http://localhost:8000/api/emergency/${id}`);
  };

  const findRoute = async () => {
    const originId = NAME_TO_ID[origin];
    const destId = NAME_TO_ID[destination];
    if (!originId || !destId) { alert("Please select origin and destination!"); return; }
    setLoading(true);
    const res = await axios.get(`http://localhost:8000/api/route/${originId}/${destId}`);
    setRouteResult(res.data);
    const sigRes = await axios.get(`http://localhost:8000/api/signals/${originId}/${destId}`);
    setSignals(sigRes.data.signals);
    setLoading(false);
  };

  const routeCoords = routeResult?.geometry
    ? routeResult.geometry.map(([lng, lat]) => [lat, lng])
    : null;

  const highCongestion = Object.values(liveData).filter(i => i.congestion === "high");

  return (
    <div style={styles.app}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        select option { background: #252d3d; }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={{ fontSize: "28px" }}>🚦</span>
          <div>
            <div style={styles.headerTitle}>Smart Traffic Management System</div>
            <div style={styles.headerSubtitle}>Bengaluru Urban Traffic Control Center</div>
          </div>
        </div>
        <div style={styles.liveBadge}>
          <div style={styles.liveDot}></div>
          LIVE
        </div>
      </div>

      <div style={styles.main}>

        {/* Alerts */}
        {emergencies.length > 0 && (
          <div style={styles.alertBanner("#7c3aed")}>
            🚑 EMERGENCY VEHICLE ACTIVE at {emergencies.map(id => INTERSECTIONS[id]?.name).join(", ")} — All signals GREEN!
          </div>
        )}
        {accidents.length > 0 && (
          <div style={styles.alertBanner("#ea580c")}>
            🚧 ACCIDENT DETECTED at {accidents.map(a => INTERSECTIONS[a.intersection]?.name).join(", ")} — Caution advised!
          </div>
        )}
        {highCongestion.length > 0 && (
          <div style={styles.alertBanner("#dc2626")}>
            🚨 HIGH CONGESTION at {highCongestion.map(i => INTERSECTIONS[i.intersection_id]?.name).join(", ")}
          </div>
        )}

        {/* Live Traffic Cards */}
        <p style={styles.sectionTitle}>Live Traffic Status</p>
        <div style={styles.statsGrid}>
          {Object.values(liveData).map((item) => {
            const isEmergency = emergencies.includes(item.intersection_id);
            const isAccident = accidents.some(a => a.intersection === item.intersection_id);
            const color = isEmergency ? "#7c3aed" : isAccident ? "#ea580c" : congestionColor(item.congestion);
            return (
              <div key={item.intersection_id} style={styles.statCard(color)}>
                <div style={styles.statCardAccent(color)}></div>
                <div style={styles.statName}>{INTERSECTIONS[item.intersection_id]?.name}</div>
                <div style={styles.statVehicles}>{item.vehicle_count}</div>
                <div style={styles.statSpeed}>⚡ {item.average_speed_kmh} km/h</div>
                <div style={styles.statBadge(color)}>
                  {isEmergency ? "🚑 Emergency" : isAccident ? "🚧 Accident" : item.congestion.toUpperCase()}
                </div>
                <button
                  style={styles.emergencyBtn(isEmergency)}
                  onClick={() => isEmergency ? clearEmergency(item.intersection_id) : triggerEmergency(item.intersection_id)}
                >
                  {isEmergency ? "✅ Clear Emergency" : "🚑 Trigger Emergency"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Route Finder */}
        <div style={styles.routeBox}>
          <div style={styles.routeTitle}>🗺️ Smart Route Finder</div>
          <div style={styles.routeControls}>
            <select value={origin} onChange={e => setOrigin(e.target.value)} style={styles.select}>
              <option value="">📍 Select Origin</option>
              {Object.keys(NAME_TO_ID).map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span style={{ color: "#4facfe", fontSize: "20px" }}>→</span>
            <select value={destination} onChange={e => setDestination(e.target.value)} style={styles.select}>
              <option value="">🏁 Select Destination</option>
              {Object.keys(NAME_TO_ID).map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <button onClick={findRoute} style={styles.findBtn} disabled={loading}>
              {loading ? "⏳ Finding..." : "🔍 Find Best Route"}
            </button>
          </div>

          {routeResult && !routeResult.error && (
            <div style={styles.routeResult}>
              <div style={styles.routeStats}>
                <div style={styles.routeStat}>📏 Distance: <span style={styles.routeStatValue}>{routeResult.distance_km} km</span></div>
                <div style={styles.routeStat}>⏱️ Duration: <span style={styles.routeStatValue}>{routeResult.duration_minutes} mins</span></div>
                <div style={styles.routeStat}>🚦 Signals: <span style={styles.routeStatValue}>{signals.length}</span></div>
                {routeResult.blocked_intersections.length > 0 && (
                  <div style={styles.routeStat}>⚠️ Avoiding: <span style={{ color: "#ef4444", fontWeight: "600" }}>{routeResult.blocked_intersections.map(id => INTERSECTIONS[id]?.name).join(", ")}</span></div>
                )}
              </div>
              <div>
                {routeResult.instructions.map((step, i) => (
                  <div key={i} style={styles.directionItem}>
                    <span style={styles.directionNum}>{i + 1}</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Map */}
        <div style={styles.mapBox}>
          <div style={styles.mapHeader}>
            <div style={styles.mapTitle}>🗺️ Live Traffic Map — Bengaluru</div>
            <div style={styles.mapLegend}>
              {[["#22c55e","Low"],["#f59e0b","Medium"],["#ef4444","High"],["#7c3aed","Emergency"],["#ea580c","Accident"],["#FFD700","Signal"]].map(([c,l]) => (
                <div key={l} style={styles.legendItem(c)}>
                  <div style={styles.legendDot(c)}></div>{l}
                </div>
              ))}
            </div>
          </div>
          <MapContainer center={[12.9716, 77.5946]} zoom={12} style={{ height: "450px" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {Object.values(liveData).map((item) => {
              const location = INTERSECTIONS[item.intersection_id];
              if (!location) return null;
              const isEmergency = emergencies.includes(item.intersection_id);
              const isAccident = accidents.some(a => a.intersection === item.intersection_id);
              const color = isEmergency ? "#7c3aed" : isAccident ? "#ea580c" : congestionColor(item.congestion);
              return (
                <Circle key={item.intersection_id} center={[location.lat, location.lng]} radius={300} color={color} fillColor={color} fillOpacity={0.6}>
                  <Popup>
                    <b>{location.name}</b><br />
                    🚗 {item.vehicle_count} vehicles<br />
                    ⚡ {item.average_speed_kmh} km/h<br />
                    ⚠️ {item.congestion}
                  </Popup>
                </Circle>
              );
            })}
            {routeCoords && <Polyline positions={routeCoords} color="#4facfe" weight={5} />}
            {signals.map(s => (
              <Circle key={s.id} center={[s.lat, s.lng]} radius={30} color="#FFD700" fillColor="#FFD700" fillOpacity={1}>
                <Popup>🚦 Traffic Signal</Popup>
              </Circle>
            ))}
            {routeCoords && NAME_TO_ID[origin] && (
              <Marker position={[INTERSECTIONS[NAME_TO_ID[origin]].lat, INTERSECTIONS[NAME_TO_ID[origin]].lng]} icon={greenIcon}>
                <Popup>🟢 Start: {origin}</Popup>
              </Marker>
            )}
            {routeCoords && NAME_TO_ID[destination] && (
              <Marker position={[INTERSECTIONS[NAME_TO_ID[destination]].lat, INTERSECTIONS[NAME_TO_ID[destination]].lng]} icon={redIcon}>
                <Popup>🔴 End: {destination}</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* History Table */}
        <div style={styles.tableBox}>
          <div style={styles.tableHeader}>
            <p style={{ ...styles.sectionTitle, marginBottom: 0 }}>Recent Traffic History</p>
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                {["Intersection", "Vehicles", "Speed", "Congestion", "Timestamp"].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((row, i) => (
                <tr key={i}>
                  <td style={styles.td}>{INTERSECTIONS[row[1]]?.name}</td>
                  <td style={styles.td}>{row[2]}</td>
                  <td style={styles.td}>{row[3]} km/h</td>
                  <td style={{ ...styles.td, color: congestionColor(row[4]), fontWeight: "600" }}>{row[4]?.toUpperCase()}</td>
                  <td style={styles.td}>{row[5]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

export default App;