"""
backend/routes/gis.py
=====================
ClusterGuard – GIS Agent API Routes

Endpoints:
    GET /gis/{plant_id}          – Full GIS impact assessment for a plant
    GET /api/gis/{plant_id}      – Compatibility endpoint (frontend)
    GET /gis/{plant_id}/nearby   – Lightweight: just the nearby locations list
    GET /api/gis/{plant_id}/nearby - Compatibility endpoint (frontend)
"""

import csv
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from agents import gis_agent

router = APIRouter(tags=["GIS"])

# ---------------------------------------------------------------------------
# GET /gis/{plant_id} and GET /api/gis/{plant_id}
# ---------------------------------------------------------------------------
@router.get(
    "/gis/{plant_id}",
    summary="Full GIS impact assessment for a plant",
    response_description="Structured GIS report: plant location, nearby sensitive locations with distances and impact levels, and overall spatial impact rating."
)
@router.get(
    "/api/gis/{plant_id}",
    summary="Full GIS impact assessment for a plant (compatibility)",
    response_description="Structured GIS report: plant location, nearby sensitive locations with distances and impact levels, and overall spatial impact rating.",
    include_in_schema=False
)
def get_gis_impact(
    plant_id: str,
    radius_km: float = Query(
        default=5.0,
        description="Impact radius in kilometres (default 5 km, max 50 km).",
    ),
):
    """
    Run a full GIS spatial impact assessment for the given plant.
    """
    # Robust radius validation
    if radius_km <= 0 or radius_km > 50:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Invalid Radius",
                "message": f"Radius value {radius_km} must be greater than 0 and less than or equal to 50."
            }
        )

    try:
        result = gis_agent.assess_plant_gis_impact(plant_id, radius_km=radius_km)
        return result

    except ValueError as exc:
        error_msg = str(exc)
        if "not found" in error_msg.lower():
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "Plant Not Found",
                    "plant_id": plant_id,
                    "message": error_msg,
                    "hint": "Use GET /plants to see valid plant IDs."
                }
            )
        # If ValueError occurs but not "not found", it might be a data parsing error
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Dataset Malformed",
                "message": f"CSV dataset contains invalid numeric values: {error_msg}"
            }
        )

    except KeyError as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Dataset Malformed",
                "message": f"CSV dataset is missing required column: {str(exc)}"
            }
        )

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Dataset Missing",
                "message": "One or more required CSV datasets could not be found on the server."
            }
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal Server Error",
                "message": f"An unexpected error occurred during the GIS calculation: {str(exc)}"
            }
        )


# ---------------------------------------------------------------------------
# GET /gis/{plant_id}/nearby and GET /api/gis/{plant_id}/nearby
# ---------------------------------------------------------------------------
@router.get(
    "/gis/{plant_id}/nearby",
    summary="Nearby sensitive locations for a plant (lightweight)",
    response_description="List of sensitive locations within radius_km, sorted by distance."
)
@router.get(
    "/api/gis/{plant_id}/nearby",
    summary="Nearby sensitive locations for a plant (compatibility)",
    response_description="List of sensitive locations within radius_km, sorted by distance.",
    include_in_schema=False
)
def get_nearby_locations(
    plant_id: str,
    radius_km: float = Query(
        default=5.0,
        description="Search radius in kilometres (default 5 km, max 50 km).",
    ),
):
    """
    Return only the list of sensitive locations within radius_km of the plant.
    """
    # Robust radius validation
    if radius_km <= 0 or radius_km > 50:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Invalid Radius",
                "message": f"Radius value {radius_km} must be greater than 0 and less than or equal to 50."
            }
        )

    try:
        nearby = gis_agent.get_nearby_sensitive_locations(plant_id, radius_km=radius_km)
        return {
            "plant_id": plant_id,
            "radius_km": radius_km,
            "total_sensitive_locations": len(nearby),
            "nearby_sensitive_locations": nearby,
        }

    except ValueError as exc:
        error_msg = str(exc)
        if "not found" in error_msg.lower():
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "Plant Not Found",
                    "plant_id": plant_id,
                    "message": error_msg,
                    "hint": "Use GET /plants to see valid plant IDs."
                }
            )
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Dataset Malformed",
                "message": f"CSV dataset contains invalid numeric values: {error_msg}"
            }
        )

    except KeyError as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Dataset Malformed",
                "message": f"CSV dataset is missing required column: {str(exc)}"
            }
        )

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Dataset Missing",
                "message": "One or more required CSV datasets could not be found on the server."
            }
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal Server Error",
                "message": f"An unexpected error occurred during the GIS calculation: {str(exc)}"
            }
        )
