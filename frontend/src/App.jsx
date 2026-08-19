import Header from "./components/Header";
import KpiBanner from "./components/KpiBanner";
import RiskDistribution from "./components/RiskDistribution";
import PlantTelemetry from "./components/PlantTelemetry";
import RiskMap from "./components/RiskMap";
import PollutantRiskProfile from "./components/PollutantRiskProfile";
import AgentPipeline from "./components/AgentPipeline";
import LogFeed from "./components/LogFeed";
import MitigationPanel from "./components/MitigationPanel";
import Footer from "./components/Footer";
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
    selectedMapPlant,
    gisReport,
    handleSelectPlant,
  } = useClusterGuard();

  return (
    <div className="ops">
      <Header alertActive={alertActive} />

      <KpiBanner plants={plants} selectedCluster={selectedCluster} />
      <RiskDistribution plants={plants} />

      <div className="grid">
        <PlantTelemetry
          clusters={clusters}
          selectedCluster={selectedCluster}
          onSelectCluster={setSelectedClusterId}
          plants={plants}
          phase={phase}
          onSimulate={runSimulation}
        />

        <div className="center-col">
          <RiskMap
            selectedCluster={selectedCluster}
            plants={plants}
            zones={zones}
            spikePlantId={spikePlantId}
            selectedMapPlant={selectedMapPlant}
            gisReport={gisReport}
            onSelectPlant={handleSelectPlant}
          />
          <PollutantRiskProfile plants={plants} />
          <MitigationPanel mitigations={mitigations} selectedAction={selectedAction} />
        </div>

        <div className="panel scrollpane">
          <AgentPipeline agentStatus={agentStatus} />
          <LogFeed log={log} />
        </div>
      </div>

      <Footer />
    </div>
  );
}
