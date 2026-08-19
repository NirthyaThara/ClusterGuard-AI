// -----------------------------------------------------------------------
// Mock "backend". Every function here returns a Promise (or a cancel
// handle for the long-running simulation) so the calling code already
// looks exactly like it would against a real FastAPI service. When the
// backend is ready, replace the bodies with `fetch(...)` calls and leave
// the function signatures untouched — nothing upstream has to change.
// -----------------------------------------------------------------------

import { PLANTS, SENSITIVE_ZONES, AGENTS, MITIGATIONS } from "./mockData";

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export async function fetchPlants() {
  await delay(300);
  return PLANTS.map((p) => ({ ...p, level: p.base, status: "nominal" }));
}

export async function fetchSensitiveZones() {
  await delay(150);
  return SENSITIVE_ZONES;
}

// Ambient jitter so the console feels "live" before anything happens.
// Returns an unsubscribe function.
export function subscribeTelemetry(onTick, { intervalMs = 2200 } = {}) {
  const id = setInterval(() => {
    onTick((prev) =>
      prev.map((p) =>
        p.status === "nominal"
          ? { ...p, level: Math.max(4, p.base + (Math.random() * 6 - 3)) }
          : p
      )
    );
  }, intervalMs);
  return () => clearInterval(id);
}

// Drives the 5-agent pipeline for a demo pollution spike. Fires the
// provided callbacks on a staggered timeline so the UI can animate each
// hand-off. Returns a `cancel()` function to clean up on unmount.
export function runSpikeSimulation(targetPlantId, handlers) {
  const { onPlantSpike, onAgentStatus, onLog, onResolved } = handlers;
  const timeouts = [];
  const target = PLANTS.find((p) => p.id === targetPlantId) ?? PLANTS[1];

  onPlantSpike(target.id, 91);
  onLog("SYSTEM", `Spike injected at ${target.name} (${target.id}).`);

  const steps = [
    () => {
      onAgentStatus("monitor", "active");
      onLog("Monitoring", `Anomaly detected on ${target.name} — SO₂ +186% vs. rolling baseline.`);
    },
    () => {
      onAgentStatus("monitor", "done");
      onAgentStatus("predict", "active");
      onLog("Risk Prediction", "Trend forecast: threshold breach in ~40 min if unchecked.");
    },
    () => {
      onAgentStatus("predict", "done");
      onAgentStatus("gis", "active");
      onLog("GIS Impact", "Plume vector intersects Govt. High School buffer (1.1 km).");
    },
    () => {
      onAgentStatus("gis", "done");
      onAgentStatus("mitigate", "active");
      onLog("Mitigation", "Scoring 3 candidate actions on reduction / cost / production impact.");
    },
    () => {
      onAgentStatus("mitigate", "done");
      onAgentStatus("decide", "active");
      onLog("Decision", "Ranking complete. Awaiting operator confirmation.");
    },
    () => {
      onAgentStatus("decide", "done");
      onLog("Decision", `Recommended: "${MITIGATIONS[0].name}".`);
      onResolved(MITIGATIONS, 0);
    },
  ];

  steps.forEach((fn, i) => {
    timeouts.push(setTimeout(fn, 650 + i * 900));
  });

  return () => timeouts.forEach(clearTimeout);
}

export async function executeAction(actionIndex) {
  await delay(400);
  return { ok: true, action: MITIGATIONS[actionIndex] };
}

export { AGENTS, MITIGATIONS };
