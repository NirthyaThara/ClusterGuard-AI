// -----------------------------------------------------------------------
// Static reference data for the ClusterGuard AI demo.
// Swap this file's exports for real API responses once the backend
// (FastAPI, per the tech stack) is live — every field name here maps
// 1:1 to what the components expect, so nothing else needs to change.
// -----------------------------------------------------------------------

export const ESTATES = [
  "SIPCOT — Manali Cluster",
  "SIPCOT — Cuddalore Zone",
  "SIPCOT — Ranipet Zone",
];

// Roughly the Manali industrial belt, Chennai — used to center the map.
export const CLUSTER_CENTER = { lat: 13.215, lng: 80.298 };

export const PLANTS = [
  { id: "PLT-01", name: "Coromandel Chem", lat: 13.213, lng: 80.279, base: 32 },
  { id: "PLT-02", name: "Tuticorin Alloys", lat: 13.225, lng: 80.291, base: 41 },
  { id: "PLT-03", name: "Manali Petro", lat: 13.203, lng: 80.301, base: 28 },
  { id: "PLT-04", name: "Ennore Fert", lat: 13.234, lng: 80.305, base: 36 },
  { id: "PLT-05", name: "Vedanta Proc.", lat: 13.195, lng: 80.315, base: 45 },
];

export const SENSITIVE_ZONES = [
  { name: "Govt. High School", lat: 13.222, lng: 80.298, kind: "school" },
  { name: "Community Hospital", lat: 13.208, lng: 80.288, kind: "hospital" },
  { name: "Kosasthalaiyar River", lat: 13.230, lng: 80.310, kind: "water" },
];

// Mirrors the 5-agent pipeline from the architecture diagram.
export const AGENTS = [
  {
    key: "monitor",
    label: "Pollution Monitoring",
    tag: "ML · anomaly detection",
    detail: "Scans telemetry across all plants for deviations from baseline.",
  },
  {
    key: "predict",
    label: "Risk Prediction",
    tag: "ML · trend forecast",
    detail: "Forecasts whether the trend breaches the regulatory threshold.",
  },
  {
    key: "gis",
    label: "GIS Impact",
    tag: "rule-based · geospatial",
    detail: "Maps plume spread against schools, hospitals & water bodies.",
  },
  {
    key: "mitigate",
    label: "Mitigation",
    tag: "rule-based · scoring",
    detail: "Scores candidate actions on reduction, cost & production impact.",
  },
  {
    key: "decide",
    label: "Decision & Coordination",
    tag: "rule-based · multi-criteria",
    detail: "Selects the best action and routes it to the dashboard.",
  },
];

export const MITIGATIONS = [
  { name: "Throttle PLT-02 scrubber line", reduction: 78, cost: 22, production: 18 },
  { name: "Divert effluent to backup stack", reduction: 61, cost: 35, production: 8 },
  { name: "Full shutdown — PLT-02 Unit B", reduction: 96, cost: 84, production: 92 },
];
