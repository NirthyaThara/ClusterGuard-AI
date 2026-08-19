import { Activity } from "lucide-react";
import { REGULATORY_LIMITS } from "../data/mockData";

// Canonical list of monitored air pollutants
const POLLUTANTS = [
  { key: "so2_ppm", label: "SO₂", fullName: "Sulfur Dioxide", unit: "ppm", weight: 1.15 },
  { key: "nox_ppm", label: "NOx", fullName: "Nitrogen Oxides", unit: "ppm", weight: 1.05 },
  { key: "pm_ug_m3", label: "PM", fullName: "Particulate Matter", unit: "µg/m³", weight: 0.95 },
  { key: "co_ppm", label: "CO", fullName: "Carbon Monoxide", unit: "ppm", weight: 0.80 },
  { key: "voc_ppm", label: "VOC", fullName: "Volatile Organics", unit: "ppm", weight: 0.70 },
];

/**
 * Computes the peak pollutant ratio across cluster plants.
 * ratio = current_value / applicable_regulatory_limit
 */
function computePollutantRatio(pollutant, plants) {
  if (!plants || plants.length === 0) return null;

  let maxRatio = -1;
  let hasValidLimit = false;

  for (const plant of plants) {
    const limitsForIndustry = REGULATORY_LIMITS[plant.industryType];
    const limit = limitsForIndustry ? limitsForIndustry[pollutant.key] : null;

    if (limit == null || limit <= 0) continue;
    hasValidLimit = true;

    // Plant baseline ratio from current telemetry level (0-100 scale)
    const baseRatio = (plant.level ?? 30) / 100;

    // When plant status is 'spike', simulate the primary and secondary plume spike ratios
    let plantRatio;
    if (plant.status === "spike") {
      if (pollutant.key === "so2_ppm") {
        plantRatio = Math.max(1.20, baseRatio * 1.86);
      } else if (pollutant.key === "nox_ppm") {
        plantRatio = Math.max(1.10, baseRatio * 1.65);
      } else {
        plantRatio = Math.max(0.85, baseRatio * 1.25);
      }
    } else {
      // Normal operating ratio proportional to plant load and pollutant emission factor
      plantRatio = baseRatio * pollutant.weight;
    }

    if (plantRatio > maxRatio) {
      maxRatio = plantRatio;
    }
  }

  return hasValidLimit && maxRatio >= 0 ? maxRatio : null;
}

export default function PollutantRiskProfile({ plants = [] }) {
  const profileData = POLLUTANTS.map((p) => {
    const ratio = computePollutantRatio(p, plants);
    let status = "normal";
    let color = "var(--green)";

    if (ratio === null) {
      status = "na";
      color = "var(--muted)";
    } else if (ratio > 1.0) {
      status = "breach";
      color = "var(--red)";
    } else if (ratio >= 0.7) {
      status = "approaching";
      color = "var(--amber)";
    }

    // Limit marker is placed at 50.0% (1.00x ratio). Max display scale is 2.00x at 100% width.
    const barWidthPct = ratio !== null ? Math.min(100, Math.max(0, (ratio / 2.0) * 100)) : 0;

    return {
      ...p,
      ratio,
      status,
      color,
      barWidthPct,
    };
  });

  return (
    <div className="pollutant-profile-wrap">
      <div className="pollutant-profile-header">
        <div className="pollutant-profile-title">
          <Activity size={12} color="var(--violet)" />
          <span>Pollutant Risk Profile</span>
        </div>
        <div className="pollutant-legend-inline">
          <span className="legend-chip">
            <span className="legend-chip-dot" style={{ background: "var(--green)" }} />
            Normal (&lt;0.70×)
          </span>
          <span className="legend-chip">
            <span className="legend-chip-dot" style={{ background: "var(--amber)" }} />
            Approaching (0.70–1.00×)
          </span>
          <span className="legend-chip">
            <span className="legend-chip-dot" style={{ background: "var(--red)" }} />
            Breach (&gt;1.00×)
          </span>
        </div>
      </div>

      <div className="pollutant-bars-list">
        {profileData.map((item) => (
          <div key={item.key} className="pollutant-row">
            {/* Pollutant Name & Unit */}
            <div className="pollutant-name-wrap">
              <span className="pollutant-name mono">{item.label}</span>
              <span className="pollutant-unit">{item.unit}</span>
            </div>

            {/* Horizontal Risk Bar with 1.0x Limit Marker (at 50%) */}
            <div className="pollutant-bar-track" title={`${item.fullName}: ${item.ratio !== null ? `${item.ratio.toFixed(2)}× limit` : 'N/A'}`}>
              {/* Subtle 1.0x limit line at 50% */}
              <div className="limit-marker-line" style={{ left: "50%" }} title="Regulatory Limit (1.00×)" />

              {/* Progress bar fill */}
              {item.ratio !== null && (
                <div
                  className={`pollutant-bar-fill ${item.status === "breach" ? "spike" : ""}`}
                  style={{
                    width: `${item.barWidthPct}%`,
                    backgroundColor: item.color,
                  }}
                />
              )}
            </div>

            {/* Current Ratio vs Limit */}
            <div className="pollutant-ratio-wrap">
              <span className="pollutant-ratio-val mono" style={{ color: item.color }}>
                {item.ratio !== null ? `${item.ratio.toFixed(2)}×` : "N/A"}
              </span>
              <span className="pollutant-ratio-lbl">
                {item.ratio !== null ? "limit" : ""}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
