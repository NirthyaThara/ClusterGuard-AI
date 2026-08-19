import { useState } from "react";
import { ShieldCheck } from "lucide-react";

export default function RiskDistribution({ plants = [] }) {
  const [hoveredTier, setHoveredTier] = useState(null);
  const total = plants.length;

  // Exact frontend classification logic
  const lowCount = plants.filter((p) => p.status !== "spike" && p.level < 45).length;
  const mediumCount = plants.filter((p) => p.status !== "spike" && p.level >= 45 && p.level < 65).length;
  const highCount = plants.filter((p) => p.status !== "spike" && p.level >= 65 && p.level < 80).length;
  const criticalCount = plants.filter((p) => p.status === "spike" || p.level >= 80).length;

  const tiers = [
    {
      key: "LOW",
      label: "LOW",
      count: lowCount,
      pct: total > 0 ? Math.round((lowCount / total) * 100) : 0,
      color: "var(--green)",
    },
    {
      key: "MEDIUM",
      label: "MEDIUM",
      count: mediumCount,
      pct: total > 0 ? Math.round((mediumCount / total) * 100) : 0,
      color: "var(--amber)",
    },
    {
      key: "HIGH",
      label: "HIGH",
      count: highCount,
      pct: total > 0 ? Math.round((highCount / total) * 100) : 0,
      color: "#fb923c",
    },
    {
      key: "CRITICAL",
      label: "CRITICAL",
      count: criticalCount,
      pct: total > 0 ? Math.round((criticalCount / total) * 100) : 0,
      color: "var(--red)",
    },
  ];

  // Donut SVG parameters
  const radius = 38;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius; // ~238.76

  // Calculate cumulative stroke offsets for active segments
  let cumulativeLength = 0;
  const nonZeroTiersCount = tiers.filter((t) => t.count > 0).length;
  const gap = nonZeroTiersCount > 1 ? 2.5 : 0;

  const segments = tiers.map((t) => {
    const fraction = total > 0 ? t.count / total : 0;
    const rawLength = fraction * circumference;
    const arcLength = Math.max(0, rawLength - gap);
    const offset = -cumulativeLength;
    cumulativeLength += rawLength;

    return {
      ...t,
      arcLength,
      offset,
    };
  });

  return (
    <div className="risk-dist-wrap">
      <div className="risk-dist-header">
        <div className="risk-dist-title">
          <ShieldCheck size={13} color="var(--violet)" />
          <span>Cluster Risk Distribution</span>
        </div>
      </div>

      <div className="risk-dist-2col">
        {/* Left Column: Donut Chart (~175px) */}
        <div className="donut-chart-col">
          <div className="donut-chart-wrap">
            <svg
              viewBox="0 0 100 100"
              className="donut-svg"
              role="img"
              aria-label="Cluster Risk Donut Chart"
            >
              {/* Background track circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.06)"
                strokeWidth={strokeWidth}
              />

              {/* Segment arcs */}
              {total > 0 &&
                segments.map((seg) => {
                  if (seg.count === 0) return null;
                  const isHovered = hoveredTier === seg.key;
                  const isDimmed = hoveredTier && hoveredTier !== seg.key;

                  return (
                    <circle
                      key={seg.key}
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={isHovered ? strokeWidth + 2.5 : strokeWidth}
                      strokeDasharray={`${seg.arcLength} ${circumference}`}
                      strokeDashoffset={seg.offset}
                      strokeLinecap="round"
                      className="donut-segment"
                      style={{
                        opacity: isDimmed ? 0.35 : 1,
                        transformOrigin: "center",
                        transform: "rotate(-90deg)",
                        transition: "stroke-width 0.2s ease, opacity 0.2s ease",
                      }}
                      onMouseEnter={() => setHoveredTier(seg.key)}
                      onMouseLeave={() => setHoveredTier(null)}
                    >
                      <title>{`${seg.label}: ${seg.count} plant(s) (${seg.pct}%)`}</title>
                    </circle>
                  );
                })}

              {/* Center Summary Text */}
              <g className="donut-center-group">
                <text
                  x="50"
                  y="45"
                  textAnchor="middle"
                  className="donut-center-val mono"
                >
                  {total}
                </text>
                <text
                  x="50"
                  y="57"
                  textAnchor="middle"
                  className="donut-center-lbl"
                >
                  PLANTS
                </text>
                <text
                  x="50"
                  y="66"
                  textAnchor="middle"
                  className="donut-center-sub"
                >
                  ASSESSED
                </text>
              </g>
            </svg>
          </div>
        </div>

        {/* Right Column: Expanded Vertical Risk Breakdown */}
        <div className="donut-legend-col">
          <div className="section-subtitle mono">RISK BREAKDOWN</div>
          <div className="donut-legend-vertical">
            {tiers.map((t) => {
              const isHovered = hoveredTier === t.key;
              const isDimmed = hoveredTier && hoveredTier !== t.key;

              return (
                <div
                  key={t.key}
                  className={`donut-legend-row ${isHovered ? "hovered" : ""} ${isDimmed ? "dimmed" : ""}`}
                  onMouseEnter={() => setHoveredTier(t.key)}
                  onMouseLeave={() => setHoveredTier(null)}
                >
                  <div className="donut-legend-left">
                    <span
                      className="donut-legend-dot"
                      style={{
                        backgroundColor: t.color,
                        boxShadow: isHovered ? `0 0 10px ${t.color}` : "none",
                      }}
                    />
                    <span className="donut-legend-label">{t.label}</span>
                  </div>
                  <div className="donut-legend-right">
                    <span
                      className="donut-legend-count mono"
                      style={{ color: t.count > 0 ? t.color : "var(--muted)" }}
                    >
                      {t.count}
                    </span>
                    <span className="donut-legend-pct mono">{t.pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
