import { ShieldCheck, Clock } from "lucide-react";
import { useClock, timeStr } from "../hooks/useClock";

export default function Header({ alertActive }) {
  const now = useClock();

  return (
    <div className="hdr disp">
      <div className="hdr-left">
        <img
          src="/clusterguard-logo.png"
          alt="ClusterGuard AI Logo"
          className="brand-logo"
        />
        <div>
          <div className="hdr-title">ClusterGuard AI</div>
          <div className="hdr-sub mono">Industrial Risk Operations Center</div>
        </div>
      </div>
      <div className="hdr-right">
        <div className="clock mono">
          <Clock size={12} />
          {timeStr(now)} IST
        </div>
        <div className={`status-pill ${alertActive ? "alert" : "normal"}`}>
          <span className={`dot ${alertActive ? "pulse" : ""}`} />
          {alertActive ? "Alert" : "Nominal"}
        </div>
      </div>
    </div>
  );
}
