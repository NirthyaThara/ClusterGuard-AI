"""
ClusterGuard AI - FastAPI backend (Member 3's app)

Exposes the GIS Agent (gis_agent.py) via REST endpoints.
This file is intentionally minimal for Round 1/GIS integration -
merge into your existing main.py rather than replacing it if you
already have other routes (risk, plants list, /analyze, etc).
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

import gis_agent

app = FastAPI(title="ClusterGuard AI - Backend")

# CORS: allow the React frontend (adjust origins to match your dev server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ClusterGuard AI backend running", "gis_agent": "active"}


@app.get("/gis/{plant_id}")
def get_gis_impact(plant_id: str, radius_km: float = Query(default=5, gt=0, le=50)):
    """
    Full GIS impact assessment for a plant: nearby sensitive locations,
    counts, and overall spatial impact rating.

    Example: GET /gis/PL01
    Example with custom radius: GET /gis/PL01?radius_km=3
    """
    try:
        return gis_agent.assess_plant_gis_impact(plant_id, radius_km=radius_km)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/gis/{plant_id}/nearby")
def get_nearby_locations(plant_id: str, radius_km: float = Query(default=5, gt=0, le=50)):
    """
    Just the list of nearby sensitive locations (lighter response than
    the full /gis/{plant_id} assessment) - useful if the frontend only
    needs to plot markers on the map without the aggregated summary.

    Example: GET /gis/PL01/nearby?radius_km=2
    """
    try:
        return {
            "plant_id": plant_id,
            "radius_km": radius_km,
            "nearby_sensitive_locations": gis_agent.get_nearby_sensitive_locations(plant_id, radius_km),
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
