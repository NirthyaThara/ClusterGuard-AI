import Header from "./components/Header";
import PlantTelemetry from "./components/PlantTelemetry";
import RiskMap from "./components/RiskMap";
import AgentPipeline from "./components/AgentPipeline";
import LogFeed from "./components/LogFeed";
import MitigationPanel from "./components/MitigationPanel";
import { useClusterGuard } from "./hooks/useClusterGuard";

export default function App() {
  const {
    plants,
    zones,
    phase,
    agentStatus,
    log,
    spikePlantId,
    mitigations,
    selectedAction,
    runSimulation,
    alertActive,
  } = useClusterGuard();

  return (
    <div className="ops">
      <Header alertActive={alertActive} />

      <div className="grid">
        <PlantTelemetry plants={plants} phase={phase} onSimulate={runSimulation} />

        <RiskMap plants={plants} zones={zones} spikePlantId={spikePlantId} />

        <div className="panel scrollpane">
          <AgentPipeline agentStatus={agentStatus} />
          <LogFeed log={log} />
          {phase === "resolved" && (
            <MitigationPanel mitigations={mitigations} selectedAction={selectedAction} />
          )}
        </div>
      </div>
    </div>
  );
}