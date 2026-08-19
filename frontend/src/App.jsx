import Header from "./components/Header";
import PlantTelemetry from "./components/PlantTelemetry";
import RiskMap from "./components/RiskMap";
import AgentPipeline from "./components/AgentPipeline";
import LogFeed from "./components/LogFeed";
import MitigationPanel from "./components/MitigationPanel";
import { useClusterGuard } from "./hooks/useClusterGuard";

export default function App() {
  const {
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
    alertActive,
    clusters,
    selectedCluster,
    switchCluster,
    loading,
    error,
    selectedMapPlant,
    gisReport,
    selectPlantOnMap,
  } = useClusterGuard();

  if (loading) {
    return (
      <div className="ops" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="hdr-title" style={{ fontSize: "20px", marginBottom: "10px" }}>ClusterGuard AI</div>
          <div className="mono" style={{ color: "var(--muted)" }}>Connecting to FastAPI backend...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ops" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div style={{ textAlign: "center", color: "var(--red)" }}>
          <div className="hdr-title" style={{ fontSize: "20px", marginBottom: "10px" }}>Backend Connection Error</div>
          <div className="mono">{error}</div>
          <div className="mono" style={{ color: "var(--muted)", marginTop: "10px", fontSize: "12px" }}>Ensure FastAPI server is running on http://localhost:8000</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ops">
      <Header alertActive={alertActive} />

      <div className="grid">
        <PlantTelemetry
          plants={plants}
          phase={phase}
          onSimulate={runSimulation}
          clusters={clusters}
          selectedCluster={selectedCluster}
          switchCluster={switchCluster}
          selectedMapPlantId={selectedMapPlant?.id}
          onSelectPlant={selectPlantOnMap}
        />

        <RiskMap
          plants={plants}
          zones={zones}
          spikePlantId={spikePlantId}
          selectedCluster={selectedCluster}
          selectedMapPlant={selectedMapPlant}
          gisReport={gisReport}
          onSelectPlant={selectPlantOnMap}
        />

        <div className="panel scrollpane">
          <AgentPipeline agentStatus={agentStatus} />
          <LogFeed log={log} onSelectPlant={selectPlantOnMap} plants={plants} />
          {phase === "resolved" && (
            <MitigationPanel mitigations={mitigations} selectedAction={selectedAction} />
          )}
        </div>
      </div>
    </div>
  );
}
