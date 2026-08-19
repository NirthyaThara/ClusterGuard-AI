import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchClusters,
  fetchPlants,
  fetchSensitiveLocations,
  fetchPlantsWithRisk,
  fetchRisk,
  fetchGis,
} from "../data/api";
import { AGENTS } from "../data/mockData";
import { timeStr } from "./useClock";

const initialAgentStatus = () =>
  Object.fromEntries(AGENTS.map((a) => [a.key, "pending"]));

// How often to re-poll risk data (ms)
const POLL_INTERVAL = 8000;

export function useClusterGuard() {
<<<<<<< HEAD
  const [clusters, setClusters] = useState([]);
  const [selectedClusterId, setSelectedClusterId] = useState(null);
=======
  // --- core state ---
  const [clusters, setClusters] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [allPlants, setAllPlants] = useState([]);
>>>>>>> c994b808eb86580c0605fe6c05cf37cda9706363
  const [plants, setPlants] = useState([]);
  const [zones, setZones] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle | running | resolved
  const [agentStatus, setAgentStatus] = useState(initialAgentStatus());
  const [log, setLog] = useState([]);
  const [spikePlantId, setSpikePlantId] = useState(null);
  const [mitigations, setMitigations] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // GIS map selection state
  const [selectedMapPlant, setSelectedMapPlant] = useState(null); // full plant object
  const [gisReport, setGisReport] = useState(null);              // GIS API response

  const cancelSim = useRef(null);
  const pollRef = useRef(null);

<<<<<<< HEAD
  // initial load — clusters first, then default to the first one
  useEffect(() => {
    fetchClusters().then((cs) => {
      setClusters(cs);
      if (cs.length) setSelectedClusterId(cs[0].id);
    });
  }, []);

  // reload plants/zones whenever the selected cluster changes, and reset
  // any in-flight or resolved simulation since it referenced the old
  // cluster's plants.
  useEffect(() => {
    if (!selectedClusterId) return;
    cancelSim.current?.();
    setPhase("idle");
    setAgentStatus(initialAgentStatus());
    setLog([]);
    setSpikePlantId(null);
    setMitigations([]);
    setSelectedAction(null);

    fetchPlants(selectedClusterId).then(setPlants);
    fetchSensitiveZones(selectedClusterId).then(setZones);
  }, [selectedClusterId]);

  // ambient telemetry jitter
  useEffect(() => {
    if (plants.length === 0) return;
    const unsub = subscribeTelemetry(setPlants);
    return unsub;
  }, [plants.length, selectedClusterId]);
=======
  // --- initial data load ---
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        setLoading(true);
        setError(null);

        const [clustersData, plantsData] = await Promise.all([
          fetchClusters(),
          fetchPlants(),
        ]);

        if (cancelled) return;

        setClusters(clustersData);
        setAllPlants(plantsData);

        // Default to first cluster
        const firstCluster = clustersData[0] ?? null;
        setSelectedCluster(firstCluster);

        // Load sensitive locations for the first cluster
        if (firstCluster) {
          const zonesData = await fetchSensitiveLocations(firstCluster.id);
          if (!cancelled) setZones(zonesData);
        }

        // Filter plants for first cluster & enrich with risk
        const clusterPlants = firstCluster
          ? plantsData.filter((p) => p.clusterId === firstCluster.id)
          : plantsData;

        const enriched = await fetchPlantsWithRisk(clusterPlants);
        if (!cancelled) setPlants(enriched);
      } catch (err) {
        if (!cancelled) setError(err.message);
        console.error("Boot error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    boot();
    return () => { cancelled = true; };
  }, []);

  // --- cluster switching ---
  const switchCluster = useCallback(
    async (cluster) => {
      setSelectedCluster(cluster);
      setPhase("idle");
      setSpikePlantId(null);
      setMitigations([]);
      setSelectedAction(null);
      setAgentStatus(initialAgentStatus());
      setLog([]);
      setSelectedMapPlant(null);
      setGisReport(null);
>>>>>>> c994b808eb86580c0605fe6c05cf37cda9706363

      try {
        const zonesData = await fetchSensitiveLocations(cluster.id);
        setZones(zonesData);

        const clusterPlants = allPlants.filter(
          (p) => p.clusterId === cluster.id
        );
        const enriched = await fetchPlantsWithRisk(clusterPlants);
        setPlants(enriched);
      } catch (err) {
        console.error("Cluster switch error:", err);
      }
    },
    [allPlants]
  );

  // --- select a plant on the map and fetch its GIS report ---
  const selectPlantOnMap = useCallback(async (plantId) => {
    const plant = plants.find((p) => p.id === plantId);
    if (!plant) return;
    setSelectedMapPlant(plant);
    try {
      const report = await fetchGis(plantId);
      setGisReport(report);
    } catch (err) {
      console.error("GIS fetch error:", err);
      setGisReport(null);
    }
  }, [plants]);

  // --- telemetry polling (re-fetch risk scores periodically) ---
  useEffect(() => {
    if (plants.length === 0 || phase === "running") return;

    async function poll() {
      try {
        const enriched = await fetchPlantsWithRisk(
          plants.map((p) => ({
            ...p,
            level: 0,
            status: "nominal",
          }))
        );
        setPlants(enriched);
      } catch {
        // silently skip failed polls
      }
    }

    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [plants.length, phase]);

  // --- log helper ---
  const pushLog = useCallback((agent, msg) => {
    setLog((prev) =>
      [...prev, { t: timeStr(new Date()), agent, msg }].slice(-40)
    );
  }, []);

  // --- Simulate Spike: runs real risk analysis through the agent pipeline ---
  const runSimulation = useCallback(() => {
    cancelSim.current?.();

    // Pick the plant with highest risk score, or the first one
    const sorted = [...plants].sort((a, b) => (b.level ?? 0) - (a.level ?? 0));
    const target = sorted[0];
    if (!target) return;

    // Pause polling during simulation
    clearInterval(pollRef.current);

    setPhase("running");
    setSpikePlantId(target.id);
    setSelectedAction(null);
    setMitigations([]);
    setAgentStatus(initialAgentStatus());
    setLog([]);

<<<<<<< HEAD
    cancelSim.current = runSpikeSimulation(target, {
      onPlantSpike: (id, level) =>
        setPlants((prev) =>
          prev.map((p) => (p.id === id ? { ...p, level, status: "spike" } : p))
        ),
      onAgentStatus: (key, status) =>
        setAgentStatus((s) => ({ ...s, [key]: status })),
      onLog: pushLog,
      onResolved: (options, recommendedIndex) => {
        setMitigations(options);
        setSelectedAction(recommendedIndex);
        setPhase("resolved");
      },
    });
  }, [plants, pushLog]);
=======
    const timeouts = [];
>>>>>>> c994b808eb86580c0605fe6c05cf37cda9706363

    // Fetch real risk data and real GIS data, then animate the pipeline
    Promise.all([fetchRisk(target.id), fetchGis(target.id)])
      .then(([risk, report]) => {
        const breaches = risk.breached_parameters ?? [];
        const warnings = risk.warning_parameters ?? [];
        const severity = risk.risk_severity;
        const score = risk.risk_score;

        // Also focus the map on this plant with its GIS report
        setSelectedMapPlant(target);
        setGisReport(report);

        // Mark the target plant as spiked in the UI
        setPlants((prev) =>
          prev.map((p) =>
            p.id === target.id
              ? { ...p, level: score, status: "spike", riskSeverity: severity }
              : p
          )
        );

        pushLog(
          "SYSTEM",
          `Risk analysis initiated for ${target.name} (${target.id}) — Score: ${score}, Severity: ${severity}`
        );

        const steps = [
          () => {
            setAgentStatus((s) => ({ ...s, monitor: "active" }));
            const breachStr =
              breaches.length > 0
                ? breaches.join(", ")
                : warnings.length > 0
                ? `Warnings on ${warnings.join(", ")}`
                : "All within limits";
            pushLog(
              "Monitoring",
              `Telemetry scan: ${breachStr}. Risk score ${score}/100.`
            );
          },
          () => {
            setAgentStatus((s) => ({ ...s, monitor: "done", predict: "active" }));
            const prob = risk.breach_probability ?? (score / 100);
            pushLog(
              "Risk Prediction",
              `Breach probability: ${(prob * 100).toFixed(0)}%. Severity: ${severity}.`
            );
          },
          () => {
            setAgentStatus((s) => ({ ...s, predict: "done", gis: "active" }));
            pushLog(
              "GIS Impact",
              `Spatial Impact: ${report.overall_spatial_impact}. Affects ${report.total_sensitive_locations} locations (${report.high_impact_locations} HIGH).`
            );
          },
          () => {
            setAgentStatus((s) => ({ ...s, gis: "done", mitigate: "active" }));
            const actions = risk.recommended_mitigation_actions ?? [];
            pushLog(
              "Mitigation",
              `Scoring ${actions.length} candidate actions for ${target.industryType} industry.`
            );
          },
          () => {
            setAgentStatus((s) => ({ ...s, mitigate: "done", decide: "active" }));
            pushLog("Decision", "Ranking complete. Awaiting operator confirmation.");
          },
          () => {
            setAgentStatus((s) => ({ ...s, decide: "done" }));

            // Build mitigation options from real data
            const actions = risk.recommended_mitigation_actions ?? [];
            const mapped = actions.map((a) => ({
              name: a.action_type,
              reduction: a.typical_pollution_reduction_pct,
              cost: Math.round((a.typical_cost_inr / 200000) * 100),
              production: a.typical_production_impact_pct,
              costInr: a.typical_cost_inr,
            }));

            if (mapped.length > 0) {
              // Pick best: highest reduction with lowest production impact
              const bestIdx = mapped.reduce((best, m, i) => {
                const score = m.reduction - m.production * 0.3;
                const bestScore = mapped[best].reduction - mapped[best].production * 0.3;
                return score > bestScore ? i : best;
              }, 0);

              pushLog("Decision", `Recommended: "${mapped[bestIdx].name}".`);
              setMitigations(mapped);
              setSelectedAction(bestIdx);
            } else {
              pushLog("Decision", "No specific mitigation actions available for this industry type.");
              setMitigations([]);
              setSelectedAction(null);
            }

            setPhase("resolved");
          },
        ];

        steps.forEach((fn, i) => {
          timeouts.push(setTimeout(fn, 650 + i * 900));
        });
      })
      .catch((err) => {
        pushLog("SYSTEM", `Error: ${err.message}`);
        setPhase("idle");
      });

    cancelSim.current = () => timeouts.forEach(clearTimeout);
  }, [plants, zones.length, pushLog]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      cancelSim.current?.();
      clearInterval(pollRef.current);
    };
  }, []);

  const selectedCluster = clusters.find((c) => c.id === selectedClusterId) ?? null;

  return {
    clusters,
    selectedCluster,
    setSelectedClusterId,
    plants,
    zones,
    phase,
    agentStatus,
    log,
    spikePlantId,
    mitigations,
    selectedAction,
    runSimulation,
    alertActive: phase !== "idle",
    // cluster support
    clusters,
    selectedCluster,
    switchCluster,
    loading,
    error,
    // GIS map selection
    selectedMapPlant,
    gisReport,
    selectPlantOnMap,
  };
}
