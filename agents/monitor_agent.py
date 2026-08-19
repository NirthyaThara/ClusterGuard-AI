"""
agents/monitor_agent.py
=======================
ClusterGuard — Round 1 Monitor Agent

The Monitor Agent is responsible for:
  1. Loading plant data and telemetry from the CSV datasets.
  2. Identifying which plants have abnormal or breaching telemetry.
  3. Calling calculate_risk() from analytics/risk.py for each plant.
  4. Producing structured monitoring/risk events.
  5. Optionally printing a summary to the console (standalone mode).

This is NOT an LLM agent. It is a plain Python service module.
It can be run directly:

    python -m agents.monitor_agent

or imported by other parts of the system:

    from agents.monitor_agent import run_monitor, monitor_plant

Data flow:
    CSV telemetry → Monitor Agent → detect condition → risk.py → risk event

Author: ClusterGuard Team
"""

import sys
import os
from datetime import datetime
from typing import Optional

# ---------------------------------------------------------------------------
# Make the repo root importable regardless of how this script is run
# ---------------------------------------------------------------------------
_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from backend.services.data_loader import (
    load_plants,
    load_telemetry,
    load_regulatory_limits,
    load_mitigation_actions,
    get_latest_telemetry,
)
from analytics.risk import calculate_risk, REGULATED_POLLUTANTS

# ---------------------------------------------------------------------------
# Thresholds for the monitor agent's pre-screening step.
# The agent flags a plant for full risk calculation if ANY regulated
# pollutant is at or above this fraction of its permissible limit.
# ---------------------------------------------------------------------------
MONITOR_SCREEN_THRESHOLD = 0.70  # flag if any pollutant ≥ 70% of limit


# ---------------------------------------------------------------------------
# Severity colours for console output
# ---------------------------------------------------------------------------
_SEVERITY_COLOURS = {
    "LOW": "\033[92m",       # green
    "MEDIUM": "\033[93m",    # yellow
    "HIGH": "\033[91m",      # red
    "CRITICAL": "\033[95m",  # magenta
}
_RESET = "\033[0m"


def _colourise(text: str, severity: str) -> str:
    colour = _SEVERITY_COLOURS.get(severity, "")
    return f"{colour}{text}{_RESET}"


# ---------------------------------------------------------------------------
# Pre-screening: quick check before calling full risk engine
# ---------------------------------------------------------------------------
def _is_plant_flagged(
    telemetry: dict,
    limits_for_industry: dict,
    is_anomaly: bool,
) -> bool:
    """
    Quick pre-screen: should this plant be escalated to full risk calculation?

    Returns True if:
      - Any regulated pollutant is at or above MONITOR_SCREEN_THRESHOLD of
        its permissible limit, OR
      - The reading is flagged as an anomaly.

    This saves computing full risk scores for clearly-safe plants.
    """
    if is_anomaly:
        return True

    for pollutant in REGULATED_POLLUTANTS:
        raw = telemetry.get(pollutant)
        if raw is None:
            continue
        try:
            value = float(raw)
        except (TypeError, ValueError):
            continue

        limit = limits_for_industry.get(pollutant)
        if limit and limit > 0:
            if value / limit >= MONITOR_SCREEN_THRESHOLD:
                return True

    return False


# ---------------------------------------------------------------------------
# Monitor a single plant
# ---------------------------------------------------------------------------
def monitor_plant(
    plant: dict,
    telemetry: dict,
    all_limits: list,
    all_actions: list,
) -> dict:
    """
    Monitor a single plant and return a monitoring event dict.

    Parameters
    ----------
    plant       : dict — plant record from plants.csv
    telemetry   : dict — latest telemetry reading for the plant
    all_limits  : list — all rows from regulatory_limits.csv
    all_actions : list — all rows from mitigation_actions.csv

    Returns
    -------
    dict
        A monitoring event with:
        - plant_id, plant_name, industry_type
        - flagged: bool (did pre-screen trigger full risk?)
        - risk result (from calculate_risk)
        - recommended mitigation actions
        - monitoring_timestamp
    """
    plant_id = plant["plant_id"]
    industry_type = str(plant.get("industry_type", "")).strip()

    # Build limits lookup for this industry
    limits_for_industry: dict[str, float] = {}
    for row in all_limits:
        if str(row.get("industry_type", "")).strip() == industry_type:
            pollutant = str(row.get("pollutant", "")).strip()
            try:
                limits_for_industry[pollutant] = float(row["permissible_limit"])
            except (KeyError, TypeError, ValueError):
                pass

    # Parse anomaly flag
    raw_anomaly = telemetry.get("is_anomaly", False)
    if isinstance(raw_anomaly, str):
        is_anomaly = raw_anomaly.strip().lower() == "true"
    else:
        is_anomaly = bool(raw_anomaly)

    # Pre-screen
    flagged = _is_plant_flagged(telemetry, limits_for_industry, is_anomaly)

    # Always run full risk calculation (pre-screen only controls logging verbosity)
    risk_result = calculate_risk(
        plant=plant,
        telemetry=telemetry,
        regulatory_limits=all_limits,
    )

    # Find applicable mitigation actions
    mitigation = []
    for action in all_actions:
        applicable_str = str(action.get("applicable_industry_types", ""))
        applicable_industries = [s.strip() for s in applicable_str.split(";")]
        if industry_type in applicable_industries:
            mitigation.append(action)

    return {
        "plant_id": plant_id,
        "plant_name": plant.get("plant_name"),
        "industry_type": industry_type,
        "cluster_id": plant.get("cluster_id"),
        "flagged_by_prescreener": flagged,
        "risk_score": risk_result["risk_score"],
        "risk_severity": risk_result["risk_severity"],
        "breached_parameters": risk_result["breached_parameters"],
        "warning_parameters": risk_result["warning_parameters"],
        "anomaly_detected": risk_result["anomaly_detected"],
        "breach_probability": risk_result["breach_probability"],
        "pollutant_details": risk_result["pollutant_details"],
        "telemetry_timestamp": risk_result["telemetry_timestamp"],
        "recommended_mitigation_actions": mitigation,
        "monitoring_timestamp": datetime.now().isoformat(timespec="seconds"),
    }


# ---------------------------------------------------------------------------
# Run the full monitor pass across all plants
# ---------------------------------------------------------------------------
def run_monitor(verbose: bool = True) -> list[dict]:
    """
    Monitor all plants and return a list of monitoring events.

    Parameters
    ----------
    verbose : bool
        If True, print a summary table to stdout.

    Returns
    -------
    list of dict
        One monitoring event per plant (all plants, not just flagged ones).
    """
    plants = load_plants()
    all_limits = load_regulatory_limits()
    all_actions = load_mitigation_actions()

    events = []
    errors = []

    for plant in plants:
        plant_id = plant["plant_id"]
        telemetry = get_latest_telemetry(plant_id)

        if telemetry is None:
            errors.append({"plant_id": plant_id, "error": "No telemetry data found"})
            if verbose:
                print(f"  [SKIP] {plant_id}: no telemetry data")
            continue

        try:
            event = monitor_plant(plant, telemetry, all_limits, all_actions)
            events.append(event)
        except Exception as exc:
            errors.append({"plant_id": plant_id, "error": str(exc)})
            if verbose:
                print(f"  [ERROR] {plant_id}: {exc}")

    if verbose:
        _print_summary(events, errors)

    return events


# ---------------------------------------------------------------------------
# Console output helpers
# ---------------------------------------------------------------------------
def _print_summary(events: list[dict], errors: list[dict]) -> None:
    """Print a formatted monitoring summary to the console."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print()
    print("=" * 72)
    print(f"  ClusterGuard — Monitor Agent Report      {now}")
    print("=" * 72)

    if not events:
        print("  No plants could be evaluated.")
    else:
        header = f"  {'Plant ID':<8} {'Name':<30} {'Score':>6} {'Severity':<10} {'Breaches'}"
        print(header)
        print("  " + "-" * 68)
        for e in sorted(events, key=lambda x: x["risk_score"], reverse=True):
            severity = e["risk_severity"]
            breaches = ", ".join(e["breached_parameters"]) or "none"
            line = (
                f"  {e['plant_id']:<8} "
                f"{str(e['plant_name']):<30} "
                f"{e['risk_score']:>6.1f} "
                f"{severity:<10} "
                f"{breaches}"
            )
            print(_colourise(line, severity))

    if errors:
        print()
        print("  Evaluation errors:")
        for err in errors:
            print(f"    {err['plant_id']}: {err['error']}")

    # Summary counts
    print()
    severity_counts = {}
    for e in events:
        s = e["risk_severity"]
        severity_counts[s] = severity_counts.get(s, 0) + 1

    print("  Severity summary:")
    for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
        count = severity_counts.get(sev, 0)
        if count:
            print(_colourise(f"    {sev:<10}: {count} plant(s)", sev))

    print("=" * 72)
    print()


# ---------------------------------------------------------------------------
# Entrypoint: python -m agents.monitor_agent
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("\nStarting ClusterGuard Monitor Agent (Round 1)...")
    events = run_monitor(verbose=True)

    # Exit with code 1 if any CRITICAL alerts detected
    critical = [e for e in events if e["risk_severity"] == "CRITICAL"]
    if critical:
        print(f"⚠  {len(critical)} CRITICAL alert(s) detected.")
        sys.exit(1)
    else:
        print("✓  Monitor pass complete. No CRITICAL alerts.")
        sys.exit(0)
