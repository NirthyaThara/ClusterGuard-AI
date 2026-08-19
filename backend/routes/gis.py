"""
backend/routes/gis.py
=====================
ClusterGuard — GIS Agent API Routes

Endpoints:
    GET /api/gis/{plant_id}          — Full GIS impact assessment for a plant
    GET /api/gis/{plant_id}/nearby   — Lightweight: just the nearby locations list

Architecture:
    FastAPI route -> agents/gis_agent.assess_plant_gis_impact() -> CSV datasets

The GIS Agent (agents/gis_agent.py) owns ALL geospatial logic:
  - Data loading (plants.csv, sensitive_locations.csv)
  - Haversine distance calculation
  - Sensitivity-weighted impact classification (HIGH / MEDIUM / LOW)
  - Overall spatial impact aggregation

This route does NOTHING except:
  1. Validate the HTTP request.
  2. Call the GIS Agent.
  3. Return the result or a structured error.

Future Decision + Mitigation Agent should consume the JSON produced here directly.
"""

from fastapi import APIRouter, HTTPException, Query

# Import the GIS Agent.  agents/ is a sibling of backend/ at the repo root,
# and the repo root is on sys.path when running: uvicorn backend.main:app
from agents import gis_agent

router = APIRouter(prefix="/api/gis", tags=["GIS"])


# ---------------------------------------------------------------------------
# GET /api/gis/{plant_id}
# ---------------------------------------------------------------------------
@router.get(
    "/{plant_id}",
    summary="Full GIS impact assessment for a plant",
    response_description=(
        "Structured GIS report: plant location, nearby sensitive locations with "
        "distances and impact levels, and an overall spatial impact rating."
    ),
)
def get_gis_impact(
    plant_id: str,
    radius_km: float = Query(
        default=5.0,
        gt=0,
        le=50,
        description="Impact radius in kilometres (default 5 km, max 50 km).",
    ),
):
    """
    Run a full GIS spatial impact assessment for the given plant.

    Steps performed by the GIS Agent:
    1. Locate the plant in plants.csv (lat/lon).
    2. Load all sensitive locations from sensitive_locations.csv.
    3. Calculate Haversine distance from the plant to each location.
    4. Classify each nearby location as HIGH / MEDIUM / LOW impact.
    5. Aggregate an overall spatial impact rating.

    Returns HTTP 404 if plant_id is not found.
    Returns HTTP 500 if a dataset cannot be loaded.

    The returned JSON is designed to be consumed directly by a future
    Decision + Mitigation Agent without additional transformation.

    Example:
        GET /api/gis/PL01
        GET /api/gis/PL01?radius_km=3
    """
    try:
        result = gis_agent.assess_plant_gis_impact(plant_id, radius_km=radius_km)
        return result

    except ValueError as exc:
        error_msg = str(exc)
        if "not found" in error_msg.lower():
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "Plant not found",
                    "plant_id": plant_id,
                    "message": error_msg,
                    "hint": "Use GET /plants to see valid plant IDs.",
                },
            )
        raise HTTPException(
            status_code=422,
            detail={
                "error": "Invalid input",
                "plant_id": plant_id,
                "message": error_msg,
            },
        )

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Dataset not found",
                "message": str(exc),
            },
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "GIS assessment failed",
                "plant_id": plant_id,
                "message": str(exc),
            },
        )


# ---------------------------------------------------------------------------
# GET /api/gis/{plant_id}/nearby
# ---------------------------------------------------------------------------
@router.get(
    "/{plant_id}/nearby",
    summary="Nearby sensitive locations for a plant (lightweight)",
    response_description=(
        "List of sensitive locations within radius_km, sorted by distance. "
        "Lighter than the full assessment — useful for map marker rendering."
    ),
)
def get_nearby_locations(
    plant_id: str,
    radius_km: float = Query(
        default=5.0,
        gt=0,
        le=50,
        description="Search radius in kilometres (default 5 km, max 50 km).",
    ),
):
    """
    Return only the list of sensitive locations within radius_km of the plant.

    This is a lighter alternative to GET /api/gis/{plant_id} — it skips the
    aggregation step and returns just the proximity data, which is useful when
    the frontend only needs to render map markers.

    Returns HTTP 404 if plant_id is not found.

    Example:
        GET /api/gis/PL01/nearby
        GET /api/gis/PL01/nearby?radius_km=2
    """
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
        status = 404 if "not found" in error_msg.lower() else 422
        raise HTTPException(
            status_code=status,
            detail={
                "error": "Plant not found" if status == 404 else "Invalid input",
                "plant_id": plant_id,
                "message": error_msg,
            },
        )

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=500,
            detail={"error": "Dataset not found", "message": str(exc)},
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={"error": "GIS lookup failed", "plant_id": plant_id, "message": str(exc)},
        )
