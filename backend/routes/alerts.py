"""
backend/routes/alerts.py
========================
ClusterGuard — Alert API Routes

Endpoints:
    GET /alerts                — All plants currently at HIGH or CRITICAL risk
    GET /alerts/{plant_id}     — Alert/risk status for a specific plant

Alert definition: risk_severity in {"HIGH", "CRITICAL"}
"""

from fastapi import APIRouter, HTTPException

from backend.services.data_loader import (
    load_plants,
    get_plant_by_id,
    get_latest_telemetry,
    load_regulatory_limits,
    load_mitigation_actions,
)
from analytics.risk import calculate_risk

router = APIRouter(prefix="/alerts", tags=["Alerts"])

ALERT_SEVERITIES = {"HIGH", "CRITICAL"}


def _build_alert(plant: dict, all_limits: list, all_actions: list) -> dict | None:
    """
    Evaluate a plant and return a summarised alert dict if the risk is HIGH/CRITICAL.
    Returns None if risk is LOW/MEDIUM or telemetry is unavailable.
    """
    plant_id = plant["plant_id"]

    telemetry = get_latest_telemetry(plant_id)
    if telemetry is None:
        return None  # No data → can't assess

    risk = calculate_risk(
        plant=plant,
        telemetry=telemetry,
        regulatory_limits=all_limits,
    )

    if risk["risk_severity"] not in ALERT_SEVERITIES:
        return None

    # Attach applicable mitigation actions
    industry_type = plant.get("industry_type", "")
    mitigation = []
    for action in all_actions:
        applicable_str = str(action.get("applicable_industry_types", ""))
        applicable_industries = [s.strip() for s in applicable_str.split(";")]
        if industry_type.strip() in applicable_industries:
            mitigation.append(action)

    return {
        "plant_id": risk["plant_id"],
        "plant_name": risk["plant_name"],
        "industry_type": risk["industry_type"],
        "cluster_id": plant.get("cluster_id"),
        "risk_score": risk["risk_score"],
        "risk_severity": risk["risk_severity"],
        "breached_parameters": risk["breached_parameters"],
        "warning_parameters": risk["warning_parameters"],
        "anomaly_detected": risk["anomaly_detected"],
        "breach_probability": risk["breach_probability"],
        "telemetry_timestamp": risk["telemetry_timestamp"],
        "evaluated_at": risk["evaluated_at"],
        "recommended_mitigation_actions": mitigation,
    }


# ---------------------------------------------------------------------------
# GET /alerts
# ---------------------------------------------------------------------------
@router.get("/", summary="List all active HIGH/CRITICAL alerts")
def list_alerts():
    """
    Evaluate all plants and return those currently at HIGH or CRITICAL risk.

    Each alert includes the plant details, risk score, breached parameters,
    and recommended mitigation actions from mitigation_actions.csv.

    This evaluates every plant's latest telemetry in real time.
    Plants with no telemetry data are silently skipped.
    """
    try:
        plants = load_plants()
        all_limits = load_regulatory_limits()
        all_actions = load_mitigation_actions()
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    alerts = []
    for plant in plants:
        try:
            alert = _build_alert(plant, all_limits, all_actions)
            if alert is not None:
                alerts.append(alert)
        except Exception as exc:
            # Don't let one bad plant crash the whole alerts list
            alerts.append({
                "plant_id": plant.get("plant_id"),
                "error": f"Failed to evaluate: {exc}",
            })

    # Sort by risk_score descending (most critical first)
    alerts.sort(
        key=lambda a: a.get("risk_score", 0),
        reverse=True,
    )

    return {
        "active_alert_count": len(alerts),
        "alert_severities_included": list(ALERT_SEVERITIES),
        "alerts": alerts,
    }


# ---------------------------------------------------------------------------
# GET /alerts/{plant_id}
# ---------------------------------------------------------------------------
@router.get("/{plant_id}", summary="Get alert status for a specific plant")
def get_plant_alert(plant_id: str):
    """
    Return the current risk/alert status for a specific plant.

    Returns the full risk evaluation regardless of severity, so you can
    see whether the plant is currently LOW, MEDIUM, HIGH, or CRITICAL.

    Returns HTTP 404 if the plant does not exist.
    Returns HTTP 422 if telemetry data is missing.
    """
    try:
        plant = get_plant_by_id(plant_id)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if plant is None:
        raise HTTPException(
            status_code=404,
            detail=f"Plant '{plant_id}' not found. Check /plants for valid IDs.",
        )

    telemetry = get_latest_telemetry(plant_id)
    if telemetry is None:
        raise HTTPException(
            status_code=422,
            detail=(
                f"No telemetry data available for plant '{plant_id}'. "
                "Cannot determine alert status."
            ),
        )

    try:
        all_limits = load_regulatory_limits()
        all_actions = load_mitigation_actions()
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    risk = calculate_risk(
        plant=plant,
        telemetry=telemetry,
        regulatory_limits=all_limits,
    )

    industry_type = plant.get("industry_type", "")
    mitigation = []
    for action in all_actions:
        applicable_str = str(action.get("applicable_industry_types", ""))
        applicable_industries = [s.strip() for s in applicable_str.split(";")]
        if industry_type.strip() in applicable_industries:
            mitigation.append(action)

    is_active_alert = risk["risk_severity"] in ALERT_SEVERITIES

    return {
        **risk,
        "is_active_alert": is_active_alert,
        "cluster_id": plant.get("cluster_id"),
        "recommended_mitigation_actions": mitigation,
    }
