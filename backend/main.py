"""
backend/main.py
===============
ClusterGuard — FastAPI Application Entry Point

Run with:
    uvicorn backend.main:app --reload

Swagger UI:  http://127.0.0.1:8000/docs
ReDoc:       http://127.0.0.1:8000/redoc
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException

from backend.routes import plants, risk, alerts, users, gis
from backend.services.data_loader import (
    load_clusters,
    load_mitigation_actions,
    load_sensitive_locations,
)

# ---------------------------------------------------------------------------
# Application instance
# ---------------------------------------------------------------------------
app = FastAPI(
    title="ClusterGuard API",
    description=(
        "Round 1 — Rule-based industrial cluster monitoring and risk assessment API.\n\n"
        "Data source: CSV files in data/. "
        "Risk engine: deterministic rule-based scoring in analytics/risk.py.\n\n"
        "**Roles**: Plant Operator (own plant only) · "
        "Environmental Authority / Regulator / Emergency Responder (cluster-wide)."
    ),
    version="1.0.0",
    contact={"name": "ClusterGuard Team"},
    license_info={"name": "Internal — Hackathon Round 1"},
)

# ---------------------------------------------------------------------------
# CORS — allow local frontend development
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # React / Next.js dev server
        "http://localhost:5173",   # Vite dev server
        "http://localhost:8080",   # Generic local dev
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Include routers
# ---------------------------------------------------------------------------
app.include_router(plants.router)
app.include_router(risk.router)
app.include_router(alerts.router)
app.include_router(users.router)
app.include_router(gis.router)


# ---------------------------------------------------------------------------
# Root endpoint
# ---------------------------------------------------------------------------
@app.get("/", tags=["Health"], summary="API health check")
def root():
    """
    Health check endpoint.
    Returns a welcome message and links to key resources.
    """
    return {
        "service": "ClusterGuard API",
        "version": "1.0.0",
        "status": "running",
        "round": 1,
        "docs": "http://127.0.0.1:8000/docs",
        "endpoints": {
            "plants": "/plants",
            "risk": "/risk/{plant_id}",
            "alerts": "/alerts",
            "users": "/users/{user_id}/plants",
            "clusters": "/clusters",
            "mitigation_actions": "/mitigation-actions",
            "gis": "/api/gis/{plant_id}",
            "gis_nearby": "/api/gis/{plant_id}/nearby",
        },
    }


# ---------------------------------------------------------------------------
# Clusters endpoint (supplementary)
# ---------------------------------------------------------------------------
@app.get("/clusters", tags=["Clusters"], summary="List all industrial clusters")
def list_clusters():
    """
    Return all cluster records from clusters.csv.

    Clusters group plants geographically.
    Each cluster has a centroid lat/lon and belongs to a state/district.
    """
    try:
        clusters = load_clusters()
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {"count": len(clusters), "clusters": clusters}


# ---------------------------------------------------------------------------
# Mitigation actions endpoint (supplementary)
# ---------------------------------------------------------------------------
@app.get("/mitigation-actions", tags=["Mitigation"], summary="List all mitigation actions")
def list_mitigation_actions():
    """
    Return all mitigation action records from mitigation_actions.csv.

    Each action has:
    - applicable_industry_types (semicolon-delimited)
    - typical_pollution_reduction_pct
    - typical_cost_inr
    - typical_production_impact_pct

    Risk endpoints automatically attach relevant actions to their responses.
    """
    try:
        actions = load_mitigation_actions()
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {"count": len(actions), "mitigation_actions": actions}


# ---------------------------------------------------------------------------
# Sensitive locations endpoint (supplementary)
# ---------------------------------------------------------------------------
@app.get("/sensitive-locations", tags=["Sensitive Locations"], summary="List all sensitive locations")
def list_sensitive_locations(cluster_id: str = None):
    """
    Return all sensitive location records from sensitive_locations.csv.

    Optionally filter by cluster_id query parameter.

    Each location has:
    - location_id, cluster_id, location_type, name
    - latitude, longitude, estimated_population, sensitivity_weight
    """
    try:
        locations = load_sensitive_locations()
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if cluster_id:
        locations = [
            loc for loc in locations
            if str(loc.get("cluster_id", "")).strip() == cluster_id.strip()
        ]

    return {"count": len(locations), "sensitive_locations": locations}
