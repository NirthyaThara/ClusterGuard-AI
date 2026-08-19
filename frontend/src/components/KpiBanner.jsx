import { Factory, AlertTriangle, AlertOctagon, ShieldCheck } from "lucide-react";

export default function KpiBanner({ plants = [], selectedCluster = null }) {
  const totalPlants = plants.length;

  // Operational vs maintenance count
  const maintCount = plants.filter((p) => String(p.status).toLowerCase() === "maintenance").length;
  const activeCount = totalPlants - maintCount;

  // Active risks: plants with elevated telemetry (level > 55% or in spike status)
  const activeRisks = plants.filter((p) => p.status === "spike" || p.level > 55).length;

  // High priority: critical condition (status === "spike" or level >= 80%)
  const highPriority = plants.filter((p) => p.status === "spike" || p.level >= 80).length;

  // Compliance score average (0-1 -> 0-100%)
  const avgCompliance = totalPlants > 0
    ? Math.round(
        (plants.reduce((sum, p) => sum + (p.complianceScore ?? 0.7), 0) / totalPlants) * 100
      )
    : 0;

  const kpis = [
    {
      id: "monitored",
      label: "Monitored Plants",
      value: totalPlants,
      sub: `${activeCount} Active · ${maintCount > 0 ? `${maintCount} Maint` : "0 Offline"}`,
      icon: Factory,
      accent: "var(--violet)",
      bgGlow: "rgba(139, 127, 232, 0.08)",
      borderColor: "rgba(139, 127, 232, 0.25)",
    },
    {
      id: "active-risks",
      label: "Active Risks",
      value: activeRisks,
      sub: activeRisks > 0 ? `${activeRisks} elevated (>55%)` : "All within normal limits",
      icon: AlertTriangle,
      accent: activeRisks > 0 ? "var(--amber)" : "var(--muted)",
      bgGlow: activeRisks > 0 ? "rgba(245, 166, 35, 0.08)" : "transparent",
      borderColor: activeRisks > 0 ? "rgba(245, 166, 35, 0.3)" : "var(--hairline)",
      isAlert: activeRisks > 0,
    },
    {
      id: "high-priority",
      label: "High Priority",
      value: highPriority,
      sub: highPriority > 0 ? `${highPriority} critical breach alert` : "0 critical breaches",
      icon: AlertOctagon,
      accent: highPriority > 0 ? "var(--red)" : "var(--muted)",
      bgGlow: highPriority > 0 ? "rgba(255, 77, 106, 0.12)" : "transparent",
      borderColor: highPriority > 0 ? "rgba(255, 77, 106, 0.4)" : "var(--hairline)",
      isCritical: highPriority > 0,
    },
    {
      id: "compliance",
      label: "Compliance Index",
      value: `${avgCompliance}%`,
      sub: avgCompliance >= 70 ? "Meets TNPCB target (≥70%)" : "Below target threshold",
      icon: ShieldCheck,
      accent: avgCompliance >= 70 ? "var(--green)" : "var(--amber)",
      bgGlow: "rgba(52, 211, 153, 0.06)",
      borderColor: avgCompliance >= 70 ? "rgba(52, 211, 153, 0.25)" : "rgba(245, 166, 35, 0.25)",
    },
  ];

  return (
    <div className="kpi-banner">
      {kpis.map((kpi) => {
        const IconComponent = kpi.icon;
        return (
          <div
            key={kpi.id}
            className={`kpi-card ${kpi.isCritical ? "critical" : ""} ${kpi.isAlert ? "alert" : ""}`}
            style={{
              borderColor: kpi.borderColor,
              background: `linear-gradient(135deg, ${kpi.bgGlow}, var(--panel-raised))`,
            }}
          >
            <div className="kpi-card-top">
              <span className="kpi-label">{kpi.label}</span>
              <div
                className="kpi-icon-wrap"
                style={{ color: kpi.accent, background: `color-mix(in srgb, ${kpi.accent} 15%, transparent)` }}
              >
                <IconComponent size={15} />
              </div>
            </div>
            <div className="kpi-value mono" style={{ color: kpi.accent }}>
              {kpi.value}
            </div>
            <div className="kpi-sub">{kpi.sub}</div>
          </div>
        );
      })}
    </div>
  );
}
