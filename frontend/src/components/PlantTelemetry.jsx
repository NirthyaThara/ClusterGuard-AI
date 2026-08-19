import { useState } from "react";
import { MapPin, Activity, ChevronDown, Zap, Loader2 } from "lucide-react";
import Meter from "./Meter";
import { ESTATES } from "../data/mockData";

export default function PlantTelemetry({ plants, phase, onSimulate }) {
  const [estate, setEstate] = useState(ESTATES[0]);
  const [estateOpen, setEstateOpen] = useState(false);

  return (
    <div className="panel scrollpane">
      <div className="panel-label">
        <MapPin size={12} /> Industrial Estate
      </div>
      <div className="estate-select" onClick={() => setEstateOpen((o) => !o)}>
        <span>{estate}</span>
        <ChevronDown
          size={14}
          style={{ transform: estateOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}
        />
      </div>
      {estateOpen && (
        <div className="estate-menu">
          {ESTATES.map((e) => (
            <div
              key={e}
              className={`estate-opt ${e === estate ? "sel" : ""}`}
              onClick={() => {
                setEstate(e);
                setEstateOpen(false);
              }}
            >
              {e}
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
              <div className="plant-id mono">{p.id}</div>
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

      <button className="sim-btn" onClick={onSimulate} disabled={phase === "running"}>
        {phase === "running" ? <Loader2 size={14} className="spin" /> : <Zap size={14} />}
        {phase === "running" ? "Simulating…" : "Simulate Spike"}
      </button>
    </div>
  );
}
