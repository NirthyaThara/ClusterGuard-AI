import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchClusters,
  fetchPlants,
  fetchSensitiveZones,
  subscribeTelemetry,
  runSpikeSimulation,
} from "../data/mockApi";
import { AGENTS } from "../data/mockData";
import { timeStr } from "./useClock";

const initialAgentStatus = () =>
  Object.fromEntries(AGENTS.map((a) => [a.key, "pending"]));

export function useClusterGuard() {
  const [clusters, setClusters] = useState([]);
  const [selectedClusterId, setSelectedClusterId] = useState(null);
  const [plants, setPlants] = useState([]);
  const [zones, setZones] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle | running | resolved
  const [agentStatus, setAgentStatus] = useState(initialAgentStatus());
  const [log, setLog] = useState([]);
  const [spikePlantId, setSpikePlantId] = useState(null);
  const [mitigations, setMitigations] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);
  const cancelSim = useRef(null);

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

  const pushLog = useCallback((agent, msg) => {
    setLog((prev) => [...prev, { t: timeStr(new Date()), agent, msg }].slice(-40));
  }, []);

  const runSimulation = useCallback(() => {
    cancelSim.current?.();
    const target = plants[1] ?? plants[0];
    if (!target) return;

    setPhase("running");
    setSpikePlantId(target.id);
    setSelectedAction(null);
    setMitigations([]);
    setAgentStatus(initialAgentStatus());
    setLog([]);

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

  useEffect(() => () => cancelSim.current?.(), []);

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
  };
}
