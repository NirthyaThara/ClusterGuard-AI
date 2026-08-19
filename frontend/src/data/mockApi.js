// -----------------------------------------------------------------------
// Mock "backend". Every function here returns a Promise (or a cancel
// handle for the long-running simulation) so the calling code already
// looks exactly like it would against the real FastAPI service described
// in /API_CONTRACT.md. When the backend is ready, replace the bodies
// here with `fetch(...)` calls and leave the function signatures
// untouched — nothing upstream has to change.
// -----------------------------------------------------------------------

import {
  CLUSTERS,
  PLANTS,
  SENSITIVE_ZONES,
  SO2_LIMITS_PPM,
  MITIGATION_CATALOG,
} from "./mockData";

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export async function fetchClusters() {
  await delay(200);
  return CLUSTERS;
}

export async function fetchPlants(clusterId) {
  await delay(300);
  return PLANTS.filter((p) => p.clusterId === clusterId).map((p) => ({
    ...p,
    level: 20 + Math.random() * 20,
    status: "nominal",
  }));
}

export async function fetchSensitiveZones(clusterId) {
  await delay(150);
  return SENSITIVE_ZONES.filter((z) => z.clusterId === clusterId);
}

// Ambient jitter so the console feels "live" before anything happens.
// Returns an unsubscribe function.
export function subscribeTelemetry(onTick, { intervalMs = 2200 } = {}) {
  const id = setInterval(() => {
    onTick((prev) =>
      prev.map((p) =>
        p.status === "nominal"
          ? { ...p, level: Math.max(4, Math.min(60, p.level + (Math.random() * 6 - 3))) }
          : p
      )
    );
  }, intervalMs);
  return () => clearInterval(id);
}

function rankMitigations(industryType) {
  const candidates = MITIGATION_CATALOG.filter((m) =>
    m.applicableIndustryTypes.includes(industryType)
  );
  // Best reduction-per-rupee first, so the "recommended" pick is the one
  // that buys the most pollution reduction for the least disruption.
  const ranked = [...candidates].sort(
    (a, b) => b.reduction / b.costInr - a.reduction / a.costInr
  );
  return ranked.slice(0, 3).map((m) => ({
    id: m.id,
    name: m.name,
    reduction: m.reduction,
    costInr: m.costInr,
    cost: Math.round((m.costInr / 200000) * 100), // normalized 0-100 for the bar
    production: m.production,
  }));
}

// Drives the 5-agent pipeline for a demo pollution spike on the given
// plant. Fires the provided callbacks on a staggered timeline so the UI
// can animate each hand-off. Returns a `cancel()` function.
export function runSpikeSimulation(targetPlant, handlers) {
  const { onPlantSpike, onAgentStatus, onLog, onResolved } = handlers;
  const timeouts = [];
  const limit = SO2_LIMITS_PPM[targetPlant.industryType];
  const nearestZone = SENSITIVE_ZONES.filter((z) => z.clusterId === targetPlant.clusterId).sort(
    (a, b) =>
      Math.hypot(a.lat - targetPlant.lat, a.lng - targetPlant.lng) -
      Math.hypot(b.lat - targetPlant.lat, b.lng - targetPlant.lng)
  )[0];

  onPlantSpike(targetPlant.id, 91);
  onLog("SYSTEM", `Spike injected at ${targetPlant.name} (${targetPlant.id}).`);

  const steps = [
    () => {
      onAgentStatus("risk", "active");
      onLog(
        "Risk Prediction",
        `Anomaly detected on ${targetPlant.name} — SO₂ +186% vs. rolling baseline. Forecast: crosses ${limit ?? "—"} ppm limit in ~40 min.`
      );
    },
    () => {
      onAgentStatus("risk", "done");
      onAgentStatus("gis", "active");
      onLog(
        "GIS Impact",
        nearestZone
          ? `Plume vector intersects ${nearestZone.name} (${nearestZone.kind.toLowerCase()} buffer).`
          : "Plume vector computed — no sensitive zones within buffer."
      );
    },
    () => {
      onAgentStatus("gis", "done");
      onAgentStatus("mitigation", "active");
      onLog(
        "Mitigation & Decision",
        `Scoring candidate actions for ${targetPlant.industryType} plants on reduction, cost & production impact.`
      );
    },
    () => {
      onAgentStatus("mitigation", "done");
      const options = rankMitigations(targetPlant.industryType);
      onLog("Mitigation & Decision", options[0] ? `Recommended: "${options[0].name}".` : "No applicable mitigation found.");
      onResolved(options, options.length ? 0 : null);
    },
  ];

  steps.forEach((fn, i) => {
    timeouts.push(setTimeout(fn, 650 + i * 900));
  });

  return () => timeouts.forEach(clearTimeout);
}
