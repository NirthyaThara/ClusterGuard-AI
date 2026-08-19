"""
backend/routes/risk.py
======================
ClusterGuard — Risk Assessment API Routes

Endpoints:
    GET /risk/{plant_id}   — Run calculate_risk() for a plant and return result

IMPORTANT: Risk calculation logic lives entirely in analytics/risk.py.
This route only orchestrates data fetching and calls calculate_risk().
"""

from fastapi import APIRouter, HTTPException

from backend.services.data_loader import (
    get_plant_by_id,
    get_latest_telemetry,
    load_regulatory_limits,
    load_mitigation_actions,
)
from analytics.risk import calculate_risk

router = APIRouter(prefix="/risk", tags=["Risk"])


# ---------------------------------------------------------------------------
# GET /risk/{plant_id}
# ---------------------------------------------------------------------------
@router.get("/{plant_id}", summary="Calculate risk for a plant")
def get_risk(plant_id: str):
    """
    Calculate and return the current risk assessment for a plant.

    Steps:
    1. Look up the plant in plants.csv.
    2. Find the plant's latest telemetry reading.
    3. Find applicable regulatory limits for the plant's industry type.
    4. Call `calculate_risk()` from analytics/risk.py.
    5. Append relevant mitigation actions for the industry.
    6. Return the structured risk result.

    Returns HTTP 404 if plant not found.
    Returns HTTP 422 if telemetry or regulatory limits are missing.
    """

    # --- 1. Resolve plant ---
    try:
        plant = get_plant_by_id(plant_id)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if plant is None:
        raise HTTPException(
            status_code=404,
            detail=f"Plant '{plant_id}' not found. Check /plants for valid IDs.",
        )

    # --- 2. Get latest telemetry ---
    try:
        telemetry = get_latest_telemetry(plant_id)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if telemetry is None:
        raise HTTPException(
            status_code=422,
            detail=(
                f"No telemetry data found for plant '{plant_id}'. "
                "Cannot calculate risk without sensor readings."
            ),
        )

    # --- 3. Load regulatory limits ---
    try:
        all_limits = load_regulatory_limits()
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    industry_type = plant.get("industry_type", "")
    limits_for_plant = [
        row for row in all_limits
        if str(row.get("industry_type", "")).strip() == industry_type.strip()
    ]

    if not limits_for_plant:
        raise HTTPException(
            status_code=422,
            detail=(
                f"No regulatory limits found for industry type '{industry_type}' "
                f"(plant '{plant_id}'). Cannot calculate risk."
            ),
        )

    # --- 4. Calculate risk ---
    risk_result = calculate_risk(
        plant=plant,
        telemetry=telemetry,
        regulatory_limits=all_limits,
    )

    # --- 5. Append relevant mitigation actions ---
    try:
        all_actions = load_mitigation_actions()
        mitigation = []
        for action in all_actions:
            applicable_str = str(action.get("applicable_industry_types", ""))
            applicable_industries = [s.strip() for s in applicable_str.split(";")]
            if industry_type.strip() in applicable_industries:
                mitigation.append(action)
        risk_result["recommended_mitigation_actions"] = mitigation
    except Exception:
        # Mitigation actions are optional; don't fail the request if they can't load
        risk_result["recommended_mitigation_actions"] = []

    return risk_result
