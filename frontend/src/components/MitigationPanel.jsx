import { Play, CheckCircle2 } from "lucide-react";
import Meter from "./Meter";

export default function MitigationPanel({
  mitigations,
  selectedAction,
  setSelectedAction,
  executed,
  onExecute,
}) {
  if (mitigations.length === 0) return null;

  return (
    <div className="log-feed">
      <div className="panel-label" style={{ marginBottom: 8 }}>
        Mitigation Actions
      </div>
      {mitigations.map((m, i) => (
        <div
          key={m.name}
          className={`action-card ${selectedAction === i ? "picked" : ""}`}
          onClick={() => setSelectedAction(i)}
        >
          <div className="action-name">{m.name}</div>
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
      <button
        className={`exec-btn ${executed ? "done" : ""}`}
        disabled={selectedAction === null || executed}
        onClick={onExecute}
      >
        {executed ? (
          <>
            <CheckCircle2 size={14} /> Action Executed
          </>
        ) : (
          <>
            <Play size={14} /> Execute Action
          </>
        )}
      </button>
    </div>
  );
}
