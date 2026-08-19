export default function LogFeed({ log }) {
  return (
    <div className="log-feed">
      <div className="panel-label" style={{ marginBottom: 8 }}>
        Live Log
      </div>
      {log.length === 0 && <div className="log-entry log-m">No activity yet — run a simulation.</div>}
      {log.map((l, i) => (
        <div className="log-entry" key={i}>
          <span className="log-t mono">{l.t}</span>
          <span className="log-a">{l.agent}</span>
          <span className="log-m">{l.msg}</span>
        </div>
      ))}
    </div>
  );
}
