import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Circle, Tooltip, useMap } from "react-leaflet";
import { TrendingUp, Wind, AlertTriangle, ShieldCheck, MapPin, Radio } from "lucide-react";

// CARTO Voyager: Clean, modern Google Maps-style light basemap with road hierarchy and visible water bodies
const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTR = '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap contributors';

// Haversine distance in km as client fallback
function calcHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371.0;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 1000) / 1000;
}

// Controller to smoothly focus the map ONLY when target coordinates actually change
function MapFocusController({ targetLocation, zoom = 13 }) {
  const map = useMap();
  const lastPosRef = useRef(null);

  const lat = targetLocation?.[0];
  const lng = targetLocation?.[1];

  useEffect(() => {
    if (lat == null || lng == null) return;

    const prev = lastPosRef.current;
    const hasChanged = !prev || prev[0] !== lat || prev[1] !== lng;

    if (hasChanged) {
      lastPosRef.current = [lat, lng];
      map.flyTo([lat, lng], zoom, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [lat, lng, zoom, map]);

  return null;
}

export default function RiskMap({
  plants = [],
  zones = [],
  spikePlantId,
  selectedCluster,
  selectedMapPlant,
  gisReport,
  onSelectPlant,
}) {
  // Determine the active plant to visualize GIS impact for
  const activePlant = useMemo(() => {
    if (selectedMapPlant) return selectedMapPlant;
    if (spikePlantId) return plants.find((p) => p.id === spikePlantId) || null;
    return null;
  }, [selectedMapPlant, spikePlantId, plants]);

  // Determine center coordinates for the map
  const defaultCenter = useMemo(() => {
    return selectedCluster
      ? [selectedCluster.lat, selectedCluster.lng]
      : [13.15, 80.26];
  }, [selectedCluster?.id, selectedCluster?.lat, selectedCluster?.lng]);

  const focusTarget = useMemo(() => {
    if (activePlant && activePlant.lat && activePlant.lng) {
      return [activePlant.lat, activePlant.lng];
    }
    return defaultCenter;
  }, [activePlant?.id, activePlant?.lat, activePlant?.lng, defaultCenter]);

  // Radius in km and in meters
  const impactRadiusKm = gisReport?.impact_radius_km ?? 5.0;
  const impactRadiusMeters = impactRadiusKm * 1000;

  // Build a lookup map of affected locations from the GIS Agent report (or calculate via Haversine)
  const { affectedLocationMap, affectedCount } = useMemo(() => {
    const map = new Map();
    let count = 0;

    if (!activePlant || !activePlant.lat || !activePlant.lng) {
      return { affectedLocationMap: map, affectedCount: 0 };
    }

    if (gisReport?.nearby_sensitive_locations) {
      // Use exact GIS Agent results
      for (const loc of gisReport.nearby_sensitive_locations) {
        map.set(loc.name, {
          isAffected: true,
          distanceKm: loc.distance_km,
          impactLevel: loc.impact_level,
          locationType: loc.location_type,
          population: loc.estimated_population,
          sensitivityWeight: loc.sensitivity_weight,
        });
        count++;
      }
    } else {
      // Client-side fallback calculation
      for (const z of zones) {
        const dist = calcHaversineKm(activePlant.lat, activePlant.lng, z.lat, z.lng);
        if (dist <= impactRadiusKm) {
          const impactLevel = dist <= 1.0 ? "HIGH" : dist <= 3.0 ? "MEDIUM" : "LOW";
          map.set(z.name, {
            isAffected: true,
            distanceKm: dist,
            impactLevel,
            locationType: z.kind || "Sensitive Zone",
            population: z.estimated_population || null,
            sensitivityWeight: z.sensitivity_weight || 0.7,
          });
          count++;
        }
      }
    }

    return { affectedLocationMap: map, affectedCount: count };
  }, [activePlant, gisReport, zones, impactRadiusKm]);

  // Map key resets only when estate/cluster changes
  const mapKey = selectedCluster ? selectedCluster.id : "default-map";

  return (
    <div className="map-wrap">
      <div className="panel-label" style={{ padding: "16px 16px 0", justifyContent: "space-between" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <TrendingUp size={12} /> GIS Environmental Impact Map
        </span>
        {activePlant && (
          <span className="mono" style={{ fontSize: "10.5px", color: "var(--violet)" }}>
            Focus: {activePlant.name} ({activePlant.id}) · Radius: {impactRadiusKm} km
          </span>
        )}
      </div>

      <div className="map-canvas">
        <MapContainer
          key={mapKey}
          center={defaultCenter}
          zoom={13}
          scrollWheelZoom
          style={{ height: "100%", width: "100%", background: "transparent" }}
          zoomControl={false}
          attributionControl={false}
        >
          <MapFocusController targetLocation={focusTarget} zoom={13} />
          <TileLayer url={TILE_URL} attribution={TILE_ATTR} />

          {/* ========================================================= */}
          {/* LAYER 1: IMPACT ZONE CIRCLES & PULSING RIPPLE OVERLAYS    */}
          {/* ========================================================= */}
          {activePlant && activePlant.lat && activePlant.lng && (
            <>
              {/* Animated outer ripple / radar ring */}
              <Circle
                center={[activePlant.lat, activePlant.lng]}
                radius={impactRadiusMeters * 1.06}
                pathOptions={{
                  color: "var(--red)",
                  fillColor: "var(--red)",
                  fillOpacity: 0.04,
                  weight: 1.5,
                  dashArray: "3 6",
                  className: "gis-impact-pulse-ring",
                }}
                interactive={false}
              />

              {/* Main Translucent Impact Zone */}
              <Circle
                center={[activePlant.lat, activePlant.lng]}
                radius={impactRadiusMeters}
                pathOptions={{
                  color: "var(--red)",
                  fillColor: "var(--red)",
                  fillOpacity: 0.12,
                  weight: 2,
                  dashArray: "6 6",
                  className: "gis-impact-circle",
                }}
              >
                <Tooltip direction="center" opacity={0.9} permanent={false}>
                  <div style={{ textAlign: "center", padding: "2px 4px" }}>
                    <div style={{ fontWeight: "bold", color: "var(--red)" }}>Impact Zone ({impactRadiusKm} km)</div>
                    <div style={{ fontSize: "10px", color: "var(--muted)" }}>
                      Source: {activePlant.name}
                    </div>
                    <div style={{ fontSize: "10px", color: "#fb923c", marginTop: "2px" }}>
                      {affectedCount} Sensitive Location{affectedCount === 1 ? "" : "s"} In Area
                    </div>
                  </div>
                </Tooltip>
              </Circle>
            </>
          )}

          {/* ========================================================= */}
          {/* LAYER 2: UNAFFECTED SENSITIVE LOCATIONS (OUTSIDE ZONE)    */}
          {/* ========================================================= */}
          {zones
            .filter((z) => !affectedLocationMap.has(z.name))
            .map((z) => (
              <CircleMarker
                key={`unaffected-${z.name}`}
                center={[z.lat, z.lng]}
                radius={5}
                pathOptions={{
                  color: "#64748b",
                  fillColor: "#475569",
                  fillOpacity: 0.6,
                  weight: 1,
                }}
              >
                <Tooltip direction="top" offset={[0, -5]} opacity={1}>
                  <div style={{ padding: "2px 4px" }}>
                    <div style={{ fontWeight: 600, color: "#e2e8f0" }}>{z.name}</div>
                    <div style={{ fontSize: "10px", color: "var(--muted)" }}>
                      Type: {z.kind || "Sensitive Zone"}
                    </div>
                    <div style={{ fontSize: "9.5px", color: "#94a3b8", marginTop: "2px" }}>
                      Status: Outside active impact zone
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            ))}

          {/* ========================================================= */}
          {/* LAYER 3: AFFECTED SENSITIVE LOCATIONS (INSIDE ZONE)       */}
          {/* ========================================================= */}
          {zones
            .filter((z) => affectedLocationMap.has(z.name))
            .map((z) => {
              const info = affectedLocationMap.get(z.name);
              const isHigh = info.impactLevel === "HIGH";
              return (
                <CircleMarker
                  key={`affected-${z.name}`}
                  center={[z.lat, z.lng]}
                  radius={isHigh ? 8 : 7}
                  pathOptions={{
                    color: isHigh ? "#ff4d6a" : "#f97316",
                    fillColor: isHigh ? "#ff4d6a" : "#fb923c",
                    fillOpacity: 0.9,
                    weight: 2,
                    className: "affected-marker-pulse",
                  }}
                >
                  <Tooltip direction="top" offset={[0, -7]} opacity={1}>
                    <div style={{ padding: "4px 6px", minWidth: "160px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", fontWeight: "bold", color: "#f97316" }}>
                        <AlertTriangle size={12} /> {z.name}
                      </div>
                      <div style={{ fontSize: "10.5px", color: "var(--text)", marginTop: "2px" }}>
                        Type: {info.locationType}
                      </div>
                      <div style={{ fontSize: "10.5px", color: "var(--violet)", marginTop: "1px" }}>
                        Distance: {info.distanceKm} km from {activePlant?.name || "source"}
                      </div>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: isHigh ? "#ff4d6a" : "#f5a623", marginTop: "2px" }}>
                        Spatial Impact: {info.impactLevel}
                      </div>
                      {info.population && (
                        <div style={{ fontSize: "9.5px", color: "var(--muted)", marginTop: "1px" }}>
                          Est. Population: {info.population.toLocaleString()}
                        </div>
                      )}
                      <div style={{ fontSize: "9px", color: "#f97316", marginTop: "3px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "2px" }}>
                        ● Within {impactRadiusKm} km Impact Zone
                      </div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}

          {/* ========================================================= */}
          {/* LAYER 4: NORMAL PLANTS (NON-SELECTED)                     */}
          {/* ========================================================= */}
          {plants
            .filter((p) => !activePlant || p.id !== activePlant.id)
            .map((p) => {
              const isSpike = p.status === "spike";
              return (
                <CircleMarker
                  key={`plant-${p.id}`}
                  center={[p.lat, p.lng]}
                  radius={7}
                  pathOptions={{
                    color: isSpike ? "#ff4d6a" : "#34d399",
                    fillColor: isSpike ? "#ff4d6a" : "#10b981",
                    fillOpacity: 0.85,
                    weight: 2,
                  }}
                  eventHandlers={{
                    click: () => onSelectPlant?.(p.id),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                    <div style={{ padding: "2px 4px" }}>
                      <div style={{ fontWeight: 600 }}>{p.name} · {p.id}</div>
                      <div style={{ fontSize: "10px", color: "var(--muted)" }}>
                        {p.industryType} · Risk: {p.level.toFixed(0)}%
                      </div>
                      <div style={{ fontSize: "9.5px", color: "var(--violet)", marginTop: "2px" }}>
                        Click to view GIS impact radius
                      </div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}

          {/* ========================================================= */}
          {/* LAYER 5: SELECTED SOURCE PLANT (TOP-MOST LAYER)           */}
          {/* ========================================================= */}
          {activePlant && activePlant.lat && activePlant.lng && (
            <>
              {/* Outer halo ring around source plant */}
              <CircleMarker
                center={[activePlant.lat, activePlant.lng]}
                radius={14}
                pathOptions={{
                  color: "var(--violet)",
                  fillColor: "transparent",
                  weight: 1.5,
                  dashArray: "3 3",
                  className: "source-halo-pulse",
                }}
                interactive={false}
              />

              {/* Main Source Plant Pin */}
              <CircleMarker
                center={[activePlant.lat, activePlant.lng]}
                radius={10}
                pathOptions={{
                  color: "#ffffff",
                  fillColor: activePlant.status === "spike" ? "#ff4d6a" : "#8b7fe8",
                  fillOpacity: 1,
                  weight: 3,
                }}
                eventHandlers={{
                  click: () => onSelectPlant?.(activePlant.id),
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
                  <div style={{ padding: "4px 6px", minWidth: "170px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontWeight: "bold", color: "#fff" }}>
                      <MapPin size={12} color="var(--red)" /> SOURCE PLANT
                    </div>
                    <div style={{ fontWeight: 600, fontSize: "12px", marginTop: "2px", color: "var(--text)" }}>
                      {activePlant.name} ({activePlant.id})
                    </div>
                    <div style={{ fontSize: "10.5px", color: "var(--muted)" }}>
                      Industry: {activePlant.industryType}
                    </div>
                    <div style={{ fontSize: "10.5px", color: activePlant.status === "spike" ? "var(--red)" : "var(--green)", marginTop: "2px" }}>
                      Risk Level: {activePlant.level.toFixed(0)}% ({activePlant.riskSeverity || (activePlant.level > 55 ? "HIGH" : "NOMINAL")})
                    </div>
                    {gisReport?.overall_spatial_impact && (
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--amber)", marginTop: "2px" }}>
                        Spatial Impact: {gisReport.overall_spatial_impact}
                      </div>
                    )}
                    <div style={{ fontSize: "9.5px", color: "var(--violet)", marginTop: "3px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "2px" }}>
                      Impact Radius: {impactRadiusKm} km ({affectedCount} locations inside)
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            </>
          )}
        </MapContainer>

        {/* Ambient wind badge */}
        <div className="wind-arrow mono">
          <Wind size={12} /> NE · 14 km/h
        </div>

        {/* Enhanced Environmental GIS Legend */}
        <div className="legend" style={{ flexDirection: "column", gap: "8px", width: "230px", background: "rgba(19, 16, 24, 0.95)", border: "1px solid var(--hairline)" }}>
          <div style={{ fontWeight: "700", textTransform: "uppercase", fontSize: "9px", letterSpacing: "0.08em", color: "var(--violet)", paddingBottom: "4px", borderBottom: "1px solid var(--hairline)", marginBottom: "4px" }}>
            Map Legend Indicator
          </div>
          
          <div className="legend-item" title="Primary industrial facility being monitored">
            <span className="legend-swatch" style={{ background: "#8b7fe8", border: "1.5px solid #fff", boxShadow: "0 0 8px rgba(139, 127, 232, 0.6)" }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "var(--text)", fontWeight: "600" }}>Selected Plant (Source)</span>
              <span style={{ fontSize: "8.5px", color: "var(--muted)" }}>Target facility under simulation focus</span>
            </div>
          </div>
          
          <div className="legend-item" title="Active plant not currently selected">
            <span className="legend-swatch" style={{ background: "#10b981" }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "var(--text)" }}>Nominal Plants</span>
              <span style={{ fontSize: "8.5px", color: "var(--muted)" }}>Other industrial facilities in cluster</span>
            </div>
          </div>

          <div className="legend-item" title="Sensitive community/ecological point inside the impact zone">
            <span className="legend-swatch" style={{ background: "#ff4d6a", boxShadow: "0 0 6px rgba(255, 77, 106, 0.8)" }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "#ff4d6a", fontWeight: "600" }}>High Impact Receptor</span>
              <span style={{ fontSize: "8.5px", color: "var(--muted)" }}>Sensitive locations within 1km radius</span>
            </div>
          </div>

          <div className="legend-item" title="Sensitive community/ecological point inside the impact zone">
            <span className="legend-swatch" style={{ background: "#fb923c", boxShadow: "0 0 6px rgba(251, 146, 60, 0.8)" }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "#fb923c" }}>Medium Impact Receptor</span>
              <span style={{ fontSize: "8.5px", color: "var(--muted)" }}>Sensitive locations between 1km - 3km</span>
            </div>
          </div>

          <div className="legend-item" title="Sensitive location outside the current impact zone">
            <span className="legend-swatch" style={{ background: "#64748b" }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "var(--text)" }}>Unaffected Location</span>
              <span style={{ fontSize: "8.5px", color: "var(--muted)" }}>Safe (outside active risk radius)</span>
            </div>
          </div>
          
          <div className="legend-item" title="Predicted circular zone of environmental impact">
            <span className="legend-swatch" style={{ background: "rgba(255,77,106,0.12)", border: "1px dashed var(--red)", borderRadius: "3px" }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "var(--text)" }}>Impact Zone Boundary</span>
              <span style={{ fontSize: "8.5px", color: "var(--muted)" }}>{impactRadiusKm} km theoretical dispersion zone</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

