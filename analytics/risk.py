"""
analytics/risk.py
=================
ClusterGuard — Round 1 Rule-Based Risk Engine

This is a DETERMINISTIC, EXPLAINABLE risk calculator.
It uses NO machine learning, NO AI, and NO external APIs.

Core idea:
  - Compare current telemetry pollutant readings against industry-specific
    regulatory limits from TNPCB (regulatory_limits.csv).
  - Award risk points per pollutant based on how far the reading exceeds
    (or approaches) its permissible limit.
  - Add bonus penalty points for anomalies, poor compliance history, and
    bad sensor data quality.
  - Cap total score at 100 and map to a severity label.

Author: ClusterGuard Team
"""

from datetime import datetime
from typing import Optional


# ---------------------------------------------------------------------------
# POLLUTANTS THAT HAVE REGULATORY LIMITS IN regulatory_limits.csv
# These exact strings are used as column names in plant_telemetry.csv
# AND as the `pollutant` field in regulatory_limits.csv.
# ---------------------------------------------------------------------------
REGULATED_POLLUTANTS = ["so2_ppm", "nox_ppm", "pm_ug_m3", "co_ppm", "voc_ppm"]


# ---------------------------------------------------------------------------
# SEVERITY THRESHOLDS
# Map a numeric risk score (0–100) to a named severity level.
# ---------------------------------------------------------------------------
def _score_to_severity(score: float) -> str:
    """Convert a numeric risk score to a severity label."""
    if score >= 75:
        return "CRITICAL"
    elif score >= 50:
        return "HIGH"
    elif score >= 25:
        return "MEDIUM"
    else:
        return "LOW"


# ---------------------------------------------------------------------------
# PER-POLLUTANT SCORING
# Each pollutant can contribute a maximum of 15 points.
# 5 pollutants × 15 points each = 75 points maximum from emissions alone.
# ---------------------------------------------------------------------------
def _score_pollutant(value: float, limit: float) -> tuple[float, str]:
    """
    Score a single pollutant reading against its permissible limit.

    Returns:
        (points, status_label)

    Scoring rules:
        Value ≤ 70% of limit     → 0 pts  — SAFE
        70% < Value ≤ 85% limit  → 5 pts  — WARNING  (approaching limit)
        85% < Value ≤ 100% limit → 10 pts — NEAR_LIMIT
        100% < Value ≤ 120% limit→ 13 pts — BREACH
        Value > 120% of limit    → 15 pts — SEVERE_BREACH
    """
    if limit <= 0:
        # Avoid division by zero; treat as unknown / no limit
        return 0.0, "NO_LIMIT"

    ratio = value / limit

    if ratio <= 0.70:
        return 0.0, "SAFE"
    elif ratio <= 0.85:
        return 5.0, "WARNING"
    elif ratio <= 1.00:
        return 10.0, "NEAR_LIMIT"
    elif ratio <= 1.20:
        return 13.0, "BREACH"
    else:
        return 15.0, "SEVERE_BREACH"


# ---------------------------------------------------------------------------
# BONUS PENALTY SCORING (max 25 bonus points)
# These represent contextual risk factors beyond raw pollutant levels.
# ---------------------------------------------------------------------------
def _score_bonus_penalties(
    is_anomaly: bool,
    compliance_history_score: Optional[float],
    data_quality_flag: Optional[str],
) -> tuple[float, dict]:
    """
    Calculate bonus penalty points from contextual risk factors.

    Returns:
        (total_bonus_points, breakdown_dict)
    """
    bonus = 0.0
    breakdown = {}

    # --- Anomaly flag (sensor/process-level abnormality detected) ---
    if is_anomaly:
        bonus += 10.0
        breakdown["anomaly"] = 10.0

    # --- Compliance history score (0–1, higher = better track record) ---
    # A plant with a poor compliance history is more likely to be a real risk.
    if compliance_history_score is not None:
        if compliance_history_score < 0.60:
            bonus += 10.0
            breakdown["poor_compliance"] = 10.0
        elif compliance_history_score < 0.75:
            bonus += 5.0
            breakdown["moderate_compliance"] = 5.0

    # --- Data quality flag ---
    # Sensor errors or missing data reduce confidence and add uncertainty risk.
    if data_quality_flag and data_quality_flag.strip().lower() != "normal":
        bonus += 5.0
        breakdown["data_quality"] = 5.0

    return bonus, breakdown


# ---------------------------------------------------------------------------
# MAIN RISK CALCULATION FUNCTION
# ---------------------------------------------------------------------------
def calculate_risk(
    plant: dict,
    telemetry: dict,
    regulatory_limits: list,
) -> dict:
    """
    Calculate a risk score for a plant based on its latest telemetry reading
    and applicable regulatory limits.

    Parameters
    ----------
    plant : dict
        A row from plants.csv as a dict. Must contain at minimum:
          - plant_id, plant_name, industry_type, compliance_history_score

    telemetry : dict
        A single telemetry reading row from plant_telemetry.csv as a dict.
        Must contain the REGULATED_POLLUTANTS columns plus:
          - timestamp, is_anomaly, data_quality_flag

    regulatory_limits : list of dict
        All rows from regulatory_limits.csv as a list of dicts.
        Each dict has: pollutant, industry_type, permissible_limit

    Returns
    -------
    dict
        A structured risk event with score, severity, breached parameters,
        warning parameters, pollutant details, and metadata.

    Notes
    -----
    - `breach_probability` is derived directly from risk_score / 100.
      It is a PROTOTYPE rule-derived indicator, NOT a statistically
      trained probability. Do not treat it as a scientific probability.
    - The risk engine only evaluates pollutants that have a defined limit
      in regulatory_limits.csv for this plant's industry_type.
    """

    plant_id = plant.get("plant_id", "UNKNOWN")
    plant_name = plant.get("plant_name", "Unknown Plant")
    industry_type = plant.get("industry_type", "Unknown")
    compliance_score = plant.get("compliance_history_score")

    # Convert compliance_score to float if it came in as a string
    try:
        compliance_score = float(compliance_score) if compliance_score is not None else None
    except (TypeError, ValueError):
        compliance_score = None

    # --- Build a lookup: pollutant → permissible_limit for this industry ---
    limits_for_industry: dict[str, float] = {}
    for row in regulatory_limits:
        if str(row.get("industry_type", "")).strip() == industry_type.strip():
            pollutant = str(row.get("pollutant", "")).strip()
            try:
                limit_val = float(row["permissible_limit"])
            except (KeyError, TypeError, ValueError):
                continue
            limits_for_industry[pollutant] = limit_val

    # --- Read anomaly and data quality flags from telemetry ---
    raw_anomaly = telemetry.get("is_anomaly", False)
    if isinstance(raw_anomaly, str):
        is_anomaly = raw_anomaly.strip().lower() == "true"
    else:
        is_anomaly = bool(raw_anomaly)

    data_quality_flag = str(telemetry.get("data_quality_flag", "Normal")).strip()
    timestamp = str(telemetry.get("timestamp", ""))

    # --- Score each regulated pollutant ---
    total_emission_points = 0.0
    breached_parameters: list[str] = []
    warning_parameters: list[str] = []
    pollutant_details: dict = {}
    missing_limits: list[str] = []

    for pollutant in REGULATED_POLLUTANTS:
        raw_value = telemetry.get(pollutant)

        # Skip if the reading is missing / NaN
        if raw_value is None or (isinstance(raw_value, float) and str(raw_value) == "nan"):
            pollutant_details[pollutant] = {
                "value": None,
                "limit": limits_for_industry.get(pollutant),
                "ratio": None,
                "status": "NO_DATA",
                "points": 0.0,
            }
            continue

        try:
            value = float(raw_value)
        except (TypeError, ValueError):
            pollutant_details[pollutant] = {
                "value": raw_value,
                "limit": limits_for_industry.get(pollutant),
                "ratio": None,
                "status": "INVALID_DATA",
                "points": 0.0,
            }
            continue

        if pollutant not in limits_for_industry:
            # No limit defined for this industry — record as context
            pollutant_details[pollutant] = {
                "value": value,
                "limit": None,
                "ratio": None,
                "status": "NO_LIMIT_DEFINED",
                "points": 0.0,
            }
            missing_limits.append(pollutant)
            continue

        limit = limits_for_industry[pollutant]
        points, status = _score_pollutant(value, limit)
        ratio = round(value / limit, 4) if limit > 0 else None

        pollutant_details[pollutant] = {
            "value": value,
            "limit": limit,
            "ratio": ratio,
            "status": status,
            "points": points,
        }

        total_emission_points += points

        if status in ("BREACH", "SEVERE_BREACH"):
            breached_parameters.append(pollutant)
        elif status in ("WARNING", "NEAR_LIMIT"):
            warning_parameters.append(pollutant)

    # --- Score bonus penalty factors ---
    bonus_points, bonus_breakdown = _score_bonus_penalties(
        is_anomaly=is_anomaly,
        compliance_history_score=compliance_score,
        data_quality_flag=data_quality_flag,
    )

    # --- Combine and cap at 100 ---
    raw_score = total_emission_points + bonus_points
    risk_score = min(100.0, raw_score)
    risk_score = round(risk_score, 2)

    # --- Severity label ---
    risk_severity = _score_to_severity(risk_score)

    # --- breach_probability: prototype rule-derived indicator, not a model ---
    breach_probability = round(risk_score / 100.0, 4)

    return {
        "plant_id": plant_id,
        "plant_name": plant_name,
        "industry_type": industry_type,
        "risk_score": risk_score,
        "risk_severity": risk_severity,
        "breached_parameters": breached_parameters,
        "warning_parameters": warning_parameters,
        "anomaly_detected": is_anomaly,
        "data_quality_flag": data_quality_flag,
        "breach_probability": breach_probability,
        # Prototype note: breach_probability = risk_score / 100.
        # This is a rule-derived indicator only, not a trained probability.
        "compliance_history_score": compliance_score,
        "pollutant_details": pollutant_details,
        "bonus_breakdown": bonus_breakdown,
        "limits_used": limits_for_industry,
        "missing_limits": missing_limits,
        "telemetry_timestamp": timestamp,
        "evaluated_at": datetime.now().isoformat(timespec="seconds"),
    }
