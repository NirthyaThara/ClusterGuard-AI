"""
backend/routes/plants.py
========================
ClusterGuard — Plant API Routes

Endpoints:
    GET /plants                                    — All plants
    GET /plants/{plant_id}                         — Single plant (404 if not found)
    GET /plants/{plant_id}/nearby-sensitive-locations — Nearby sensitive locations
"""

import math
from fastapi import APIRouter, HTTPException, Query

from backend.services.data_loader import (
    load_plants,
    load_sensitive_locations,
    get_plant_by_id,
)

router = APIRouter(prefix="/plants", tags=["Plants"])


# ---------------------------------------------------------------------------
# Haversine distance helper (returns distance in kilometres)
# ---------------------------------------------------------------------------
def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two lat/lon points (km)."""
    R = 6371.0  # Earth radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ---------------------------------------------------------------------------
# GET /plants
# ---------------------------------------------------------------------------
@router.get("/", summary="List all plants")
def list_plants():
    """
    Return all plants from plants.csv.

    Each plant record includes: plant_id, cluster_id, plant_name,
    industry_type, latitude, longitude, capacity_category,
    commissioned_year, compliance_history_score, status.
    """
    try:
        plants = load_plants()
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return {"count": len(plants), "plants": plants}


# ---------------------------------------------------------------------------
# GET /plants/{plant_id}
# ---------------------------------------------------------------------------
@router.get("/{plant_id}", summary="Get a single plant by ID")
def get_plant(plant_id: str):
    """
    Return a single plant by plant_id.

    Returns HTTP 404 if the plant does not exist.
    """
    try:
        plant = get_plant_by_id(plant_id)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if plant is None:
        raise HTTPException(
            status_code=404,
            detail=f"Plant '{plant_id}' not found. "
                   "Check /plants for valid plant IDs.",
        )

    return plant


# ---------------------------------------------------------------------------
# GET /plants/{plant_id}/nearby-sensitive-locations
# ---------------------------------------------------------------------------
@router.get(
    "/{plant_id}/nearby-sensitive-locations",
    summary="Find sensitive locations near a plant",
)
def nearby_sensitive_locations(
    plant_id: str,
    radius_km: float = Query(
        default=5.0,
        ge=0.1,
        le=50.0,
        description="Search radius in kilometres (0.1 – 50). Default: 5 km.",
    ),
):
    """
    Return sensitive locations (schools, hospitals, residential areas, rivers,
    farmland) within `radius_km` kilometres of the plant.

    Distance is calculated using the Haversine formula from the plant's
    latitude/longitude to each sensitive location's coordinates.

    This is a simple CSV-based proximity check — no PostGIS required.
    """
    # Resolve the plant
    try:
        plant = get_plant_by_id(plant_id)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if plant is None:
        raise HTTPException(
            status_code=404,
            detail=f"Plant '{plant_id}' not found.",
        )

    plant_lat = plant.get("latitude")
    plant_lon = plant.get("longitude")

    if plant_lat is None or plant_lon is None:
        raise HTTPException(
            status_code=422,
            detail=f"Plant '{plant_id}' does not have latitude/longitude data.",
        )

    try:
        plant_lat = float(plant_lat)
        plant_lon = float(plant_lon)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=422,
            detail=f"Plant '{plant_id}' has invalid latitude/longitude values.",
        )

    # Load sensitive locations
    try:
        locations = load_sensitive_locations()
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    # Filter by distance
    nearby = []
    for loc in locations:
        try:
            loc_lat = float(loc["latitude"])
            loc_lon = float(loc["longitude"])
        except (TypeError, ValueError, KeyError):
            continue  # Skip locations with invalid coords

        distance_km = _haversine_km(plant_lat, plant_lon, loc_lat, loc_lon)

        if distance_km <= radius_km:
            nearby.append({
                **loc,
                "distance_km": round(distance_km, 3),
            })

    # Sort nearest first
    nearby.sort(key=lambda x: x["distance_km"])

    return {
        "plant_id": plant_id,
        "plant_name": plant.get("plant_name"),
        "plant_lat": plant_lat,
        "plant_lon": plant_lon,
        "radius_km": radius_km,
        "count": len(nearby),
        "nearby_sensitive_locations": nearby,
    }
