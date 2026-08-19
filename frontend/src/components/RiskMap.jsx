import { MapContainer, TileLayer, CircleMarker, Circle, Tooltip } from "react-leaflet";
import { TrendingUp, Wind } from "lucide-react";
import { CLUSTER_CENTER } from "../data/mockData";

// Dark basemap so the console reads as one continuous surface, not a
// bright map widget dropped into a dark page.
const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR = '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap contributors';

export default function RiskMap({ plants, zones, spikePlantId }) {
  const spikePlant = plants.find((p) => p.id === spikePlantId);

  return (
    <div className="map-wrap">
      <div className="panel-label" style={{ padding: "16px 16px 0" }}>
        <TrendingUp size={12} /> Cluster Risk Map
      </div>
      <div className="map-canvas">
        <MapContainer
          center={[CLUSTER_CENTER.lat, CLUSTER_CENTER.lng]}
          zoom={13}
          scrollWheelZoom
          style={{ height: "100%", width: "100%", background: "transparent" }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTR} />

          {spikePlant && (
            <Circle
              center={[spikePlant.lat, spikePlant.lng]}
              radius={900}
              pathOptions={{ color: "#ff4d6a", fillColor: "#ff4d6a", fillOpacity: 0.15, dashArray: "4 4" }}
            />
          )}

          {zones.map((z) => (
            <CircleMarker
              key={z.name}
              center={[z.lat, z.lng]}
              radius={5}
              pathOptions={{ color: "#f5a623", fillColor: "#f5a623", fillOpacity: 0.9 }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={1} permanent={false}>
                {z.name}
              </Tooltip>
            </CircleMarker>
          ))}

          {plants.map((p) => (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={p.status === "spike" ? 9 : 7}
              pathOptions={{
                color: p.status === "spike" ? "#ff4d6a" : "#34d399",
                fillColor: p.status === "spike" ? "#ff4d6a" : "#34d399",
                fillOpacity: 0.85,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                {p.name} · {p.id} · {p.level.toFixed(0)}%
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>

        <div className="wind-arrow mono">
          <Wind size={12} /> NE · 14 km/h
        </div>

        <div className="legend">
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: "var(--green)" }} />
            Nominal
          </div>
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: "var(--red)" }} />
            Spike
          </div>
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: "var(--amber)" }} />
            Sensitive zone
          </div>
        </div>
      </div>
    </div>
  );
}
