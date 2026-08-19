import { Radio, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { AGENTS } from "../data/mockData";

export default function AgentPipeline({ agentStatus }) {
  return (
    <>
      <div className="panel-label">
        <Radio size={12} /> Agent Pipeline
      </div>
      {AGENTS.map((a, i) => {
        const st = agentStatus[a.key];
        return (
          <div className="agent-row" key={a.key}>
            <div className="agent-rail">
              <div className={`agent-node ${st}`}>
                {st === "done" ? (
                  <CheckCircle2 size={12} color="var(--green)" />
                ) : st === "active" ? (
                  <Loader2 size={12} color="var(--amber)" className="spin" />
                ) : (
                  <Circle size={8} color="var(--hairline)" />
                )}
              </div>
              {i < AGENTS.length - 1 && <div className={`agent-line ${st === "done" ? "done" : ""}`} />}
            </div>
            <div className="agent-body">
              <div className="agent-label">{a.label}</div>
              <div className="agent-tag mono">{a.tag}</div>
              {st === "active" && <div className="agent-detail">{a.detail}</div>}
            </div>
          </div>
        );
      })}
    </>
  );
}
