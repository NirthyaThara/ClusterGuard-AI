import { useCallback, useEffect, useRef, useState } from "react";
import {
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
  const [plants, setPlants] = useState([]);
  const [zones, setZones] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle | running | resolved
  const [agentStatus, setAgentStatus] = useState(initialAgentStatus());
  const [log, setLog] = useState([]);
  const [spikePlantId, setSpikePlantId] = useState(null);
  const [mitigations, setMitigations] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);
  const cancelSim = useRef(null);

  // initial load
  useEffect(() => {
    fetchPlants().then(setPlants);
    fetchSensitiveZones().then(setZones);
  }, []);

  // ambient telemetry jitter
  useEffect(() => {
    if (plants.length === 0) return;
    const unsub = subscribeTelemetry(setPlants);
    return unsub;
  }, [plants.length]);

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

    cancelSim.current = runSpikeSimulation(target.id, {
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

  return {
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