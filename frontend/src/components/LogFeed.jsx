export default function LogFeed({ log, onSelectPlant, plants = [] }) {
  const handleEntryClick = (entry) => {
    if (!onSelectPlant || !entry.msg) return;
    
    // Check if entry text has plant id like PL01, PL02...
    const match = entry.msg.match(/PL\d+/i);
    if (match) {
      onSelectPlant(match[0].toUpperCase());
      return;
    }
    
    // Or check if it matches plant name
    for (const p of plants) {
      if (entry.msg.includes(p.name)) {
        onSelectPlant(p.id);
        return;
      }
    }
  };

  return (
    <div className="log-feed">
      <div className="panel-label" style={{ marginBottom: 8, justifyContent: "space-between" }}>
        <span>Live Log</span>
        <span style={{ fontSize: "9px", color: "var(--muted)", textTransform: "none" }}>
          (Click event to focus GIS)
        </span>
      </div>
      {log.length === 0 && <div className="log-entry log-m">No activity yet — run a simulation or click a plant.</div>}
      {log.map((l, i) => {
        const hasPlant = l.msg?.match(/PL\d+/i) || plants.some((p) => l.msg?.includes(p.name));
        return (
          <div
            className={`log-entry ${hasPlant ? "clickable-log" : ""}`}
            key={i}
            onClick={() => handleEntryClick(l)}
            style={{ cursor: hasPlant ? "pointer" : "default" }}
            title={hasPlant ? "Click to view GIS impact on map" : undefined}
          >
            <span className="log-t mono">{l.t}</span>
            <span className="log-a">{l.agent}</span>
            <span className="log-m">{l.msg}</span>
          </div>
        );
      })}
    </div>
  );
}

