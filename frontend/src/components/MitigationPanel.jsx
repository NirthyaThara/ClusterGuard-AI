import { Star } from "lucide-react";
import Meter from "./Meter";

export default function MitigationPanel({ mitigations, selectedAction }) {
  if (mitigations.length === 0) return null;

  return (
    <div className="log-feed">
      <div className="panel-label" style={{ marginBottom: 8 }}>
        Mitigation Actions
      </div>
      {mitigations.map((m, i) => (
        <div key={m.name} className={`action-card ${i === selectedAction ? "picked" : ""}`}>
          <div className="action-name-row">
            <div className="action-name">{m.name}</div>
            {i === selectedAction && (
              <span className="action-badge">
                <Star size={10} /> Recommended
              </span>
            )}
          </div>
          <div className="action-metric">
            <span className="action-metric-label mono">Reduce</span>
            <Meter value={m.reduction} tone="var(--green)" />
          </div>
          <div className="action-metric">
            <span className="action-metric-label mono">Cost</span>
            <Meter value={m.cost} tone="var(--amber)" />
          </div>
          <div className="action-metric">
            <span className="action-metric-label mono">Prod. hit</span>
            <Meter value={m.production} tone="var(--red)" />
          </div>
        </div>
      ))}
    </div>
  );
}