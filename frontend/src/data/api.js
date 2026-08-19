// -----------------------------------------------------------------------
// Real API service layer — calls the FastAPI backend at localhost:8000.
// Every function returns a Promise so the calling code stays clean.
// -----------------------------------------------------------------------

import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 10000,
});

// -----------------------------------------------------------------------
// Clusters
// -----------------------------------------------------------------------
export async function fetchClusters() {
  const { data } = await api.get("/clusters");
  return (data.clusters ?? []).map((c) => ({
    id: c.cluster_id,
    name: c.cluster_name,
    state: c.state,
    district: c.district,
    lat: c.centroid_lat,
    lng: c.centroid_lon,
  }));
}

// -----------------------------------------------------------------------
// Plants — normalised to the shape the UI components already expect
// -----------------------------------------------------------------------
export async function fetchPlants() {
  const { data } = await api.get("/plants");
  return (data.plants ?? []).map((p) => ({
    id: p.plant_id,
    name: p.plant_name,
    lat: p.latitude,
    lng: p.longitude,
    industryType: p.industry_type,
    clusterId: p.cluster_id,
    capacityCategory: p.capacity_category,
    complianceScore: p.compliance_history_score,
    plantStatus: p.status, // Active | Maintenance
    level: 0,              // will be filled by risk data
    status: "nominal",     // will be updated by risk
  }));
}

// -----------------------------------------------------------------------
// Sensitive locations
// -----------------------------------------------------------------------
export async function fetchSensitiveLocations(clusterId) {
  const params = clusterId ? { cluster_id: clusterId } : {};
  const { data } = await api.get("/sensitive-locations", { params });
  return (data.sensitive_locations ?? []).map((s) => ({
    name: s.name,
    lat: s.latitude,
    lng: s.longitude,
    kind: s.location_type,
    clusterId: s.cluster_id,
  }));
}

// -----------------------------------------------------------------------
// Risk assessment for a single plant
// -----------------------------------------------------------------------
export async function fetchRisk(plantId) {
  const { data } = await api.get(`/risk/${plantId}`);
  return data;
}

// -----------------------------------------------------------------------
// GIS spatial assessment for a single plant
// -----------------------------------------------------------------------
export async function fetchGis(plantId) {
  const { data } = await api.get(`/api/gis/${plantId}`);
  return data;
}

// -----------------------------------------------------------------------
// All active alerts (HIGH / CRITICAL)
// -----------------------------------------------------------------------
export async function fetchAlerts() {
  const { data } = await api.get("/alerts");
  return data;
}

// -----------------------------------------------------------------------
// All mitigation actions
// -----------------------------------------------------------------------
export async function fetchMitigationActions() {
  const { data } = await api.get("/mitigation-actions");
  return (data.mitigation_actions ?? []).map((a) => ({
    name: a.action_type,
    reduction: a.typical_pollution_reduction_pct,
    cost: Math.round((a.typical_cost_inr / 200000) * 100), // normalise to 0-100 for meter
    production: a.typical_production_impact_pct,
    costInr: a.typical_cost_inr,
    applicableTypes: a.applicable_industry_types,
  }));
}

// -----------------------------------------------------------------------
// Fetch risk for all plants and merge into plant objects
// Returns plants with updated level + status fields
// -----------------------------------------------------------------------
export async function fetchPlantsWithRisk(plants) {
  const results = await Promise.allSettled(
    plants.map((p) => fetchRisk(p.id))
  );

  return plants.map((p, i) => {
    const result = results[i];
    if (result.status === "fulfilled") {
      const risk = result.value;
      const severity = risk.risk_severity;
      return {
        ...p,
        level: risk.risk_score,
        status:
          severity === "HIGH" || severity === "CRITICAL" ? "spike" : "nominal",
        riskSeverity: severity,
        breachedParams: risk.breached_parameters,
        warningParams: risk.warning_parameters,
        anomalyDetected: risk.anomaly_detected,
        breachProbability: risk.breach_probability,
        pollutantDetails: risk.pollutant_details,
        mitigationActions: risk.recommended_mitigation_actions ?? [],
      };
    }
    return { ...p, level: 0, status: "nominal" };
  });
}
