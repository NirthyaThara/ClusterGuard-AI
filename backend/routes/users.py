"""
backend/routes/users.py
=======================
ClusterGuard — User / Role-Based Access Routes

Endpoints:
    GET /users/{user_id}/plants   — Plants visible to a user based on their role

Role-based access model (Round 1 — NO real authentication):
    Plant Operator      → has plant_id in users.csv → sees only their plant
    Environmental Authority, Regulator, Emergency Responder
                        → have cluster_id in users.csv → see all plants in
                          that cluster

This is a DEMONSTRATION of the intended access model.
It is NOT a security system.

Government / regulatory roles are mapped to Environmental Authority, Regulator,
and Emergency Responder roles in the users CSV.
"""

from fastapi import APIRouter, HTTPException

from backend.services.data_loader import (
    load_users,
    load_plants,
    get_latest_telemetry,
    load_regulatory_limits,
)
from analytics.risk import calculate_risk

router = APIRouter(prefix="/users", tags=["Users"])

# Roles that have cluster-wide (government/authority) visibility
AUTHORITY_ROLES = {"Environmental Authority", "Regulator", "Emergency Responder"}

# Roles that are plant-level operators
OPERATOR_ROLES = {"Plant Operator"}


def _get_user(user_id: str) -> dict | None:
    """Find a user by user_id."""
    users = load_users()
    for user in users:
        if str(user.get("user_id", "")).strip() == user_id.strip():
            return user
    return None


def _enrich_plant_with_risk(plant: dict, all_limits: list) -> dict:
    """
    Attach a lightweight risk summary to a plant dict.
    Returns the plant as-is with a 'current_risk' key added.
    """
    telemetry = get_latest_telemetry(plant["plant_id"])
    if telemetry is None:
        return {**plant, "current_risk": None}

    try:
        risk = calculate_risk(
            plant=plant,
            telemetry=telemetry,
            regulatory_limits=all_limits,
        )
        summary = {
            "risk_score": risk["risk_score"],
            "risk_severity": risk["risk_severity"],
            "breached_parameters": risk["breached_parameters"],
            "anomaly_detected": risk["anomaly_detected"],
            "telemetry_timestamp": risk["telemetry_timestamp"],
        }
    except Exception as exc:
        summary = {"error": str(exc)}

    return {**plant, "current_risk": summary}


# ---------------------------------------------------------------------------
# GET /users/{user_id}/plants
# ---------------------------------------------------------------------------
@router.get("/{user_id}/plants", summary="Get plants visible to a user")
def get_user_plants(
    user_id: str,
    include_risk: bool = True,
):
    """
    Return the plants that a user is allowed to see, based on their role.

    **Plant Operator** (e.g., U001–U006):
    - Sees only the single plant assigned to them via `plant_id` in users.csv.

    **Environmental Authority / Regulator / Emergency Responder** (e.g., U007–U011):
    - Sees all plants in the cluster assigned to them via `cluster_id`.

    If `include_risk=true` (default), each plant is enriched with a lightweight
    risk summary using the latest telemetry.

    This is a PROTOTYPE demonstrating the intended access control model.
    No authentication tokens are required for Round 1.

    Returns HTTP 404 if the user does not exist.
    Returns HTTP 403 if the user's role does not grant plant access.
    """
    try:
        user = _get_user(user_id)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if user is None:
        raise HTTPException(
            status_code=404,
            detail=f"User '{user_id}' not found.",
        )

    role = str(user.get("role", "")).strip()
    user_plant_id = user.get("plant_id")
    user_cluster_id = user.get("cluster_id")

    try:
        all_plants = load_plants()
        all_limits = load_regulatory_limits() if include_risk else []
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    # --- Determine visible plants by role ---
    if role in OPERATOR_ROLES:
        # Plant Operator: single plant only
        if not user_plant_id:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"User '{user_id}' has role '{role}' but no plant_id assigned "
                    "in users.csv. Cannot determine plant access."
                ),
            )
        visible_plants = [
            p for p in all_plants
            if str(p.get("plant_id", "")).strip() == str(user_plant_id).strip()
        ]

    elif role in AUTHORITY_ROLES:
        # Government / authority role: all plants in assigned cluster
        if not user_cluster_id:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"User '{user_id}' has role '{role}' but no cluster_id assigned "
                    "in users.csv. Cannot determine cluster access."
                ),
            )
        visible_plants = [
            p for p in all_plants
            if str(p.get("cluster_id", "")).strip() == str(user_cluster_id).strip()
        ]

    else:
        raise HTTPException(
            status_code=403,
            detail=(
                f"User '{user_id}' has role '{role}', which does not have "
                "plant-level access configured. "
                f"Known roles with access: {OPERATOR_ROLES | AUTHORITY_ROLES}"
            ),
        )

    # --- Optionally enrich with risk summaries ---
    if include_risk:
        enriched = []
        for plant in visible_plants:
            enriched.append(_enrich_plant_with_risk(plant, all_limits))
        visible_plants = enriched

    return {
        "user_id": user_id,
        "user_name": user.get("name"),
        "role": role,
        "access_scope": (
            f"plant:{user_plant_id}" if role in OPERATOR_ROLES
            else f"cluster:{user_cluster_id}"
        ),
        "plant_count": len(visible_plants),
        "plants": visible_plants,
        "access_note": (
            "PROTOTYPE: Role-based access is demonstrated without authentication. "
            "Do not use this as a security boundary in production."
        ),
    }


# ---------------------------------------------------------------------------
# GET /users — list all users (useful for testing)
# ---------------------------------------------------------------------------
@router.get("/", summary="List all users")
def list_users():
    """
    Return all users from users.csv.
    Useful for discovering user IDs to test role-based access.
    """
    try:
        users = load_users()
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return {"count": len(users), "users": users}
