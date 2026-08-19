import { Star, ShieldCheck } from "lucide-react";
import { MITIGATION_CATALOG } from "../data/mockData";

function formatInr(val) {
  if (val == null || isNaN(val)) return "₹0";
  return "₹" + Number(val).toLocaleString("en-IN");
}

function getCostInr(m) {
  if (m.costInr != null) return m.costInr;
  const item = MITIGATION_CATALOG.find((c) => c.name === m.name || c.id === m.id);
  return item ? item.costInr : 0;
}

function getReduction(m) {
  if (m.reduction != null) return m.reduction;
  const item = MITIGATION_CATALOG.find((c) => c.name === m.name || c.id === m.id);
  return item ? item.reduction : 0;
}

function getProduction(m) {
  if (m.production != null) return m.production;
  const item = MITIGATION_CATALOG.find((c) => c.name === m.name || c.id === m.id);
  return item ? item.production : 0;
}

export default function MitigationPanel({ mitigations = [], selectedAction = 0 }) {
  return (
    <div className="mitigation-panel-wrap">
      <div className="mitigation-panel-header">
        <div className="mitigation-panel-title">
          <ShieldCheck size={13} color="var(--violet)" />
          <span>RECOMMENDED MITIGATION ACTIONS</span>
        </div>
        {mitigations.length > 0 && (
          <span className="mitigation-count-badge mono">
            {mitigations.length} ACTIONS EVALUATED
          </span>
        )}
      </div>

      {mitigations.length > 0 ? (
        <div className="mitigation-cards-grid">
          {mitigations.map((m, i) => {
            const isRecommended = i === selectedAction;
            const reductionVal = getReduction(m);
            const costInrVal = getCostInr(m);
            const prodImpactVal = getProduction(m);

            return (
              <div
                key={m.name || i}
                className={`action-card ${isRecommended ? "picked" : ""}`}
              >
                <div className="action-name-row">
                  <div className="action-name">{m.name}</div>
                  {isRecommended && (
                    <span className="action-badge">
                      <Star size={10} /> Recommended
                    </span>
                  )}
                </div>

                <div className="action-metrics-row">
                  <div className="action-stat">
                    <span className="action-stat-label mono">REDUCTION</span>
                    <span className="action-stat-val mono" style={{ color: "var(--green)" }}>
                      {reductionVal}%
                    </span>
                  </div>
                  <div className="action-stat">
                    <span className="action-stat-label mono">COST</span>
                    <span className="action-stat-val mono" style={{ color: "var(--amber)" }}>
                      {formatInr(costInrVal)}
                    </span>
                  </div>
                  <div className="action-stat">
                    <span className="action-stat-label mono">PROD. IMPACT</span>
                    <span className="action-stat-val mono">
                      {prodImpactVal}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mitigation-idle-placeholder">
          <span className="mono">
            Awaiting risk detection or simulation trigger to score and rank mitigation actions for this cluster.
          </span>
        </div>
      )}
    </div>
  );
}
