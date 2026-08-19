// -----------------------------------------------------------------------
// Static reference data that is purely a UI concept (not from backend).
// Everything else now comes from api.js → real FastAPI backend.
// -----------------------------------------------------------------------

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
