import { useState } from "react";
import { MapPin, Activity, ChevronDown, Zap, Loader2 } from "lucide-react";
import Meter from "./Meter";

export default function PlantTelemetry({
  clusters,
  selectedCluster,
  onSelectCluster,
  plants,
  phase,
  onSimulate,
}) {
  const [estateOpen, setEstateOpen] = useState(false);

  return (
    <div className="panel scrollpane">
      <div className="panel-label">
        <MapPin size={12} /> Industrial Estate
      </div>
      <div className="estate-select" onClick={() => setEstateOpen((o) => !o)}>
        <span>{selectedCluster ? selectedCluster.name : "Loading…"}</span>
        <ChevronDown
          size={14}
          style={{ transform: estateOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}
        />
      </div>
      {estateOpen && (
        <div className="estate-menu">
          {clusters.map((c) => (
            <div
              key={c.id}
              className={`estate-opt ${c.id === selectedCluster?.id ? "sel" : ""}`}
              onClick={() => {
                onSelectCluster(c.id);
                setEstateOpen(false);
              }}
            >
              {c.name}
            </div>
          ))}
        </div>
      )}

      <div className="panel-label">
        <Activity size={12} /> Plant Telemetry
      </div>
      {plants.map((p) => (
        <div key={p.id} className={`plant-card ${p.status === "spike" ? "spike" : ""}`}>
          <div className="plant-top">
            <div>
              <div className="plant-name">{p.name}</div>
              <div className="plant-id mono">{p.id} · {p.industryType}</div>
            </div>
            <div className="plant-val mono" style={{ color: p.status === "spike" ? "var(--red)" : "var(--text)" }}>
              {p.level.toFixed(0)}%
            </div>
          </div>
          <Meter
            value={p.level}
            tone={p.status === "spike" ? "var(--red)" : p.level > 55 ? "var(--amber)" : "var(--green)"}
          />
        </div>
      ))}

      <button className="sim-btn" onClick={onSimulate} disabled={phase === "running" || plants.length === 0}>
        {phase === "running" ? <Loader2 size={14} className="spin" /> : <Zap size={14} />}
        {phase === "running" ? "Simulating…" : "Simulate Spike"}
      </button>
    </div>
  );
}
