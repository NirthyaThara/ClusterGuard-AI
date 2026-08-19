import { useState } from "react";
import { MapPin, Activity, ChevronDown, Zap, Loader2 } from "lucide-react";
import Meter from "./Meter";

export default function PlantTelemetry({
<<<<<<< HEAD
  clusters,
  selectedCluster,
  onSelectCluster,
  plants,
  phase,
  onSimulate,
=======
  plants,
  phase,
  onSimulate,
  clusters = [],
  selectedCluster = null,
  switchCluster,
  selectedMapPlantId,
  onSelectPlant,
>>>>>>> c994b808eb86580c0605fe6c05cf37cda9706363
}) {
  const [estateOpen, setEstateOpen] = useState(false);

  const displayName = selectedCluster ? selectedCluster.name : "Loading Estates...";

  return (
    <div className="panel scrollpane">
      <div className="panel-label">
        <MapPin size={12} /> Industrial Estate
      </div>
      <div className="estate-select" onClick={() => setEstateOpen((o) => !o)}>
<<<<<<< HEAD
        <span>{selectedCluster ? selectedCluster.name : "Loading…"}</span>
=======
        <span>{displayName}</span>
>>>>>>> c994b808eb86580c0605fe6c05cf37cda9706363
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
<<<<<<< HEAD
              className={`estate-opt ${c.id === selectedCluster?.id ? "sel" : ""}`}
              onClick={() => {
                onSelectCluster(c.id);
=======
              className={`estate-opt ${selectedCluster && c.id === selectedCluster.id ? "sel" : ""}`}
              onClick={() => {
                switchCluster(c);
>>>>>>> c994b808eb86580c0605fe6c05cf37cda9706363
                setEstateOpen(false);
              }}
            >
              {c.name}
            </div>
          ))}
        </div>
      )}

      <div className="panel-label" style={{ justifyContent: "space-between" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Activity size={12} /> Plant Telemetry
        </span>
        <span style={{ fontSize: "9px", color: "var(--muted)", textTransform: "none" }}>
          (Click plant for GIS)
        </span>
      </div>
<<<<<<< HEAD
      {plants.map((p) => (
        <div key={p.id} className={`plant-card ${p.status === "spike" ? "spike" : ""}`}>
          <div className="plant-top">
            <div>
              <div className="plant-name">{p.name}</div>
              <div className="plant-id mono">{p.id} · {p.industryType}</div>
            </div>
            <div className="plant-val mono" style={{ color: p.status === "spike" ? "var(--red)" : "var(--text)" }}>
              {p.level.toFixed(0)}%
=======
      {plants.map((p) => {
        const isSelected = selectedMapPlantId === p.id;
        return (
          <div
            key={p.id}
            className={`plant-card ${p.status === "spike" ? "spike" : ""} ${isSelected ? "selected" : ""}`}
            onClick={() => onSelectPlant?.(p.id)}
            style={{ cursor: "pointer" }}
            title="Click to view GIS impact radius on map"
          >
            <div className="plant-top">
              <div>
                <div className="plant-name" style={{ color: isSelected ? "var(--violet)" : undefined }}>
                  {p.name}
                </div>
                <div className="plant-id mono">{p.id} · {p.industryType}</div>
              </div>
              <div className="plant-val mono" style={{ color: p.status === "spike" ? "var(--red)" : "var(--text)" }}>
                {p.level.toFixed(0)}%
              </div>
>>>>>>> c994b808eb86580c0605fe6c05cf37cda9706363
            </div>
            <Meter
              value={p.level}
              tone={p.status === "spike" ? "var(--red)" : p.level > 55 ? "var(--amber)" : "var(--green)"}
            />
          </div>
        );
      })}

      <button className="sim-btn" onClick={onSimulate} disabled={phase === "running" || plants.length === 0}>
        {phase === "running" ? <Loader2 size={14} className="spin" /> : <Zap size={14} />}
        {phase === "running" ? "Simulating…" : "Simulate Spike"}
      </button>
    </div>
  );
}

