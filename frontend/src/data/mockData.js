// -----------------------------------------------------------------------
// Static reference data for the ClusterGuard AI demo — sourced directly
// from the team's clusters.csv / plants.csv / sensitive_locations.csv /
// regulatory_limits.csv / mitigation_actions.csv.
//
// Field names here match what the FastAPI backend is expected to return
// (see /API_CONTRACT.md at the project root). Swap the fetch functions in
// mockApi.js for real calls once the backend is live — nothing in these
// shapes needs to change.
// -----------------------------------------------------------------------

export const CLUSTERS = [
  { id: "CL01", name: "Manali Industrial Estate", state: "Tamil Nadu", district: "Chennai", lat: 13.15, lng: 80.26 },
  { id: "CL02", name: "Ambattur Industrial Estate", state: "Tamil Nadu", district: "Chennai", lat: 13.1143, lng: 80.1548 },
];

export const PLANTS = [
  { id: "PL01", clusterId: "CL01", name: "Alpha Chemicals", industryType: "Chemical", lat: 13.152, lng: 80.261, capacity: "Large", complianceScore: 0.72, status: "Active" },
  { id: "PL02", clusterId: "CL01", name: "Bright Dyes & Textiles", industryType: "Textile Dyeing", lat: 13.1487, lng: 80.2635, capacity: "Medium", complianceScore: 0.81, status: "Active" },
  { id: "PL03", clusterId: "CL01", name: "CoreMetal Works", industryType: "Metal Processing", lat: 13.1555, lng: 80.2578, capacity: "Large", complianceScore: 0.55, status: "Active" },
  { id: "PL04", clusterId: "CL01", name: "Delta Pharma Labs", industryType: "Pharma", lat: 13.1502, lng: 80.2661, capacity: "Medium", complianceScore: 0.9, status: "Active" },
  { id: "PL05", clusterId: "CL02", name: "Everest Chemicals", industryType: "Chemical", lat: 13.116, lng: 80.152, capacity: "Medium", complianceScore: 0.63, status: "Active" },
  { id: "PL06", clusterId: "CL02", name: "Falcon Textiles", industryType: "Textile Dyeing", lat: 13.1128, lng: 80.1567, capacity: "Small", complianceScore: 0.77, status: "Active" },
  { id: "PL07", clusterId: "CL02", name: "Granite Metal Industries", industryType: "Metal Processing", lat: 13.1175, lng: 80.1502, capacity: "Large", complianceScore: 0.48, status: "Maintenance" },
  { id: "PL08", clusterId: "CL02", name: "Horizon Pharma", industryType: "Pharma", lat: 13.1109, lng: 80.1589, capacity: "Small", complianceScore: 0.85, status: "Active" },
];

export const SENSITIVE_ZONES = [
  { id: "SL01", clusterId: "CL01", name: "St. Xavier HS", kind: "School", lat: 13.1533, lng: 80.2622, estimated_population: 420, sensitivity_weight: 0.9 },
  { id: "SL02", clusterId: "CL01", name: "Manali General Hospital", kind: "Hospital", lat: 13.1509, lng: 80.2598, estimated_population: null, sensitivity_weight: 1.0 },
  { id: "SL03", clusterId: "CL01", name: "Manali Nagar Colony", kind: "Residential", lat: 13.1541, lng: 80.2589, estimated_population: 3200, sensitivity_weight: 0.7 },
  { id: "SL04", clusterId: "CL01", name: "Kosasthalaiyar River", kind: "River", lat: 13.156, lng: 80.265, estimated_population: null, sensitivity_weight: 0.8 },
  { id: "SL05", clusterId: "CL01", name: "Manali Farm Belt", kind: "Farmland", lat: 13.148, lng: 80.27, estimated_population: null, sensitivity_weight: 0.4 },
  { id: "SL11", clusterId: "CL01", name: "Greenfield Matric School", kind: "School", lat: 13.16, lng: 80.245, estimated_population: 500, sensitivity_weight: 0.9 },
  { id: "SL13", clusterId: "CL01", name: "Riverside Nagar", kind: "Residential", lat: 13.165, lng: 80.255, estimated_population: 4100, sensitivity_weight: 0.7 },
  { id: "SL06", clusterId: "CL02", name: "Ambattur Public School", kind: "School", lat: 13.115, lng: 80.1535, estimated_population: 380, sensitivity_weight: 0.9 },
  { id: "SL07", clusterId: "CL02", name: "Ambattur Community Hospital", kind: "Hospital", lat: 13.1183, lng: 80.151, estimated_population: null, sensitivity_weight: 1.0 },
  { id: "SL08", clusterId: "CL02", name: "Ambattur East Colony", kind: "Residential", lat: 13.114, lng: 80.158, estimated_population: 2800, sensitivity_weight: 0.7 },
  { id: "SL09", clusterId: "CL02", name: "Cooum Tributary", kind: "River", lat: 13.12, lng: 80.16, estimated_population: null, sensitivity_weight: 0.75 },
  { id: "SL10", clusterId: "CL02", name: "Ambattur Farmland", kind: "Farmland", lat: 13.109, lng: 80.145, estimated_population: null, sensitivity_weight: 0.4 },
  { id: "SL12", clusterId: "CL02", name: "St. Luke's Clinic", kind: "Hospital", lat: 13.105, lng: 80.17, estimated_population: null, sensitivity_weight: 1.0 },
  { id: "SL14", clusterId: "CL02", name: "North Belt Farms", kind: "Farmland", lat: 13.1, lng: 80.14, estimated_population: null, sensitivity_weight: 0.4 },
  { id: "SL15", clusterId: "CL02", name: "Ambattur West Colony", kind: "Residential", lat: 13.125, lng: 80.145, estimated_population: 2600, sensitivity_weight: 0.7 },
];

// SO2 permissible limits (ppm) by industry type, TNPCB — used in the
// Risk Prediction agent's log message. Full pollutant × industry_type
// matrix lives in regulatory_limits.csv.
export const SO2_LIMITS_PPM = {
  Chemical: 80.0,
  "Textile Dyeing": 88.0,
  Pharma: 72.0,
  "Metal Processing": 76.0,
};

// Full regulatory limits matrix from regulatory_limits.csv
export const REGULATORY_LIMITS = {
  Chemical: {
    so2_ppm: 80.0,
    nox_ppm: 60.0,
    pm_ug_m3: 100.0,
    co_ppm: 30.0,
    voc_ppm: 40.0,
  },
  "Textile Dyeing": {
    so2_ppm: 88.0,
    nox_ppm: 66.0,
    pm_ug_m3: 110.0,
    co_ppm: 33.0,
    voc_ppm: 44.0,
  },
  Pharma: {
    so2_ppm: 72.0,
    nox_ppm: 54.0,
    pm_ug_m3: 90.0,
    co_ppm: 27.0,
    voc_ppm: 36.0,
  },
  "Metal Processing": {
    so2_ppm: 76.0,
    nox_ppm: 57.0,
    pm_ug_m3: 95.0,
    co_ppm: 28.5,
    voc_ppm: 38.0,
  },
};

// applicableIndustryTypes mirrors the semicolon-delimited column in
// mitigation_actions.csv, split into an array here.
export const MITIGATION_CATALOG = [
  { id: 1, name: "Activate Scrubber", applicableIndustryTypes: ["Chemical", "Metal Processing"], reduction: 35, costInr: 60000, production: 3 },
  { id: 2, name: "Reduce Production Rate 20%", applicableIndustryTypes: ["Chemical", "Textile Dyeing", "Metal Processing", "Pharma"], reduction: 20, costInr: 15000, production: 20 },
  { id: 3, name: "Switch to Low-Sulfur Fuel", applicableIndustryTypes: ["Chemical", "Metal Processing"], reduction: 25, costInr: 80000, production: 1 },
  { id: 4, name: "Increase Effluent Treatment Cycle", applicableIndustryTypes: ["Textile Dyeing", "Pharma"], reduction: 30, costInr: 40000, production: 5 },
  { id: 5, name: "Temporary Partial Shutdown", applicableIndustryTypes: ["Chemical", "Textile Dyeing", "Metal Processing", "Pharma"], reduction: 60, costInr: 200000, production: 60 },
  { id: 6, name: "Install Dust Suppression System", applicableIndustryTypes: ["Metal Processing"], reduction: 28, costInr: 55000, production: 2 },
  { id: 7, name: "Optimize Process Temperature", applicableIndustryTypes: ["Chemical", "Pharma"], reduction: 12, costInr: 8000, production: 4 },
  { id: 8, name: "Schedule Off-Peak Wind Operation", applicableIndustryTypes: ["Chemical", "Textile Dyeing", "Metal Processing", "Pharma"], reduction: 10, costInr: 3000, production: 8 },
];

// Mirrors the 3-agent architecture:
// Agent 1: Risk Prediction Agent (ML telemetry anomaly & forecasting)
// Agent 2: GIS Impact Agent (rule-based geospatial plume mapping)
// Agent 3: Mitigation & Decision Agent (rule-based multi-criteria action ranking)
export const AGENTS = [
  {
    key: "risk",
    label: "Risk Prediction Agent",
    tag: "Agent 1 · ML forecast",
    detail: "Scans telemetry across all plants for threshold breaches and trend forecast.",
  },
  {
    key: "gis",
    label: "GIS Impact Agent",
    tag: "Agent 2 · geospatial plume",
    detail: "Maps plume dispersion against nearby schools, hospitals & water bodies.",
  },
  {
    key: "mitigation",
    label: "Mitigation & Decision Agent",
    tag: "Agent 3 · action scoring",
    detail: "Scores and ranks candidate interventions on reduction, cost & production impact.",
  },
];
