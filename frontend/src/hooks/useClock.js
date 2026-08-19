import { useEffect, useState } from "react";

export function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function timeStr(d) {
  return d.toLocaleTimeString("en-GB", { hour12: false });
}
