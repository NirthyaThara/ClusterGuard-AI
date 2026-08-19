"""
ClusterGuard AI - GIS Agent (Agent 3 in the PPT's 5-agent pipeline)

Purpose: determine the spatial/environmental impact of an industrial plant
by finding nearby sensitive locations (schools, hospitals, residential
areas, rivers, farmland) and classifying proximity-based impact.

This agent performs deterministic geospatial calculations - no ML, no LLM.
It answers: "if this plant has a risk event, what's geographically close
enough to potentially be affected?"

Data source: CSV files (data/plants.csv, data/sensitive_locations.csv)
matching the field names in ClusterGuard_AI_Schema_Reduction_v2.md.

IMPORTANT: this agent determines spatial PROXIMITY, not actual pollution
reach. The impact_radius_km is an estimated/prototype impact zone, not a
scientific dispersion model.
"""
import csv
import math
import os
from pathlib import Path

# gis_agent.py lives in agents/; the CSV datasets live in the sibling data/ dir.
# Using pathlib so the path is correct regardless of the cwd when uvicorn runs.
_REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = str(_REPO_ROOT / "data")
PLANTS_CSV = os.path.join(DATA_DIR, "plants.csv")
LOCATIONS_CSV = os.path.join(DATA_DIR, "sensitive_locations.csv")

DEFAULT_IMPACT_RADIUS_KM = 5


# ---------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------

def _load_plants():
    """Load plants.csv into a dict keyed by plant_id."""
    plants = {}
    with open(PLANTS_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            row["latitude"] = float(row["latitude"])
            row["longitude"] = float(row["longitude"])
            plants[row["plant_id"]] = row
    return plants


def _load_sensitive_locations():
    """Load sensitive_locations.csv into a list of dicts."""
    locations = []
    with open(LOCATIONS_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            row["latitude"] = float(row["latitude"])
            row["longitude"] = float(row["longitude"])
            row["sensitivity_weight"] = float(row["sensitivity_weight"])
            # estimated_population is blank for Rivers/Farmland - keep as None
            pop = row.get("estimated_population", "")
            row["estimated_population"] = int(pop) if pop else None
            locations.append(row)
    return locations


# ---------------------------------------------------------------------
# 1. Distance calculation (Haversine formula)
# ---------------------------------------------------------------------

def calculate_distance(plant_lat, plant_lon, location_lat, location_lon):
    """
    Real geographic distance in kilometers using the Haversine formula.
    This is the standard great-circle distance calc used by GIS libraries
    for lat/lon points - no external dependency needed for this precision.
    """
    R = 6371.0  # Earth's radius in km

    lat1, lon1, lat2, lon2 = map(math.radians, [plant_lat, plant_lon, location_lat, location_lon])
    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))

    return round(R * c, 3)


# ---------------------------------------------------------------------
# 2 & 3. Nearby location detection + spatial impact classification
# ---------------------------------------------------------------------

def _classify_impact_level(distance_km, sensitivity_weight, estimated_population):
    """
    Rule-based, explainable impact classification. Combines:
    - proximity (closer = higher impact) - weighted 60%
    - sensitivity_weight of the location type (hospital > school > residential
      > river > farmland) - weighted 40%
    - population adds a small bonus only when the location is close, so a
      large population far away can't outweigh actual proximity

    This is intentionally simple and transparent for a prototype - not a
    scientific dispersion model. Judges should be told this is rule-based.

    NOTE: population data is missing for Hospital/River/Farmland in our
    dataset (schools/residential areas have it). The formula is designed so
    a highly sensitive, close location (e.g. a hospital 200m away) is
    correctly flagged HIGH even with no population figure - sensitivity
    and proximity alone are enough to cross the HIGH threshold.
    """
    # proximity tiers per the brief: <=1km high, 1-3km medium, >3km(but in radius) low
    if distance_km <= 1:
        proximity_tier = 1.0
    elif distance_km <= 3:
        proximity_tier = 0.6
    else:
        proximity_tier = 0.3

    score = proximity_tier * 0.6 + sensitivity_weight * 0.4

    # small population bonus, only relevant when already close (<=1km),
    # so it can nudge a borderline case but never single-handedly cause HIGH
    if estimated_population and distance_km <= 1:
        score += min(estimated_population / 5000, 1.0) * 0.15

    if score >= 0.75:
        return "HIGH"
    elif score >= 0.45:
        return "MEDIUM"
    else:
        return "LOW"


def get_nearby_sensitive_locations(plant_id, radius_km=DEFAULT_IMPACT_RADIUS_KM):
    """
    Find all sensitive locations within radius_km of the given plant,
    with distance, type, population, sensitivity, and impact classification
    for each. Returns a list sorted by distance (closest first).

    Raises ValueError if plant_id doesn't exist.
    """
    plants = _load_plants()
    if plant_id not in plants:
        raise ValueError(f"Plant '{plant_id}' not found")

    plant = plants[plant_id]
    all_locations = _load_sensitive_locations()

    nearby = []
    for loc in all_locations:
        dist = calculate_distance(
            plant["latitude"], plant["longitude"],
            loc["latitude"], loc["longitude"]
        )
        if dist <= radius_km:
            impact_level = _classify_impact_level(
                dist, loc["sensitivity_weight"], loc["estimated_population"]
            )
            nearby.append({
                "location_id": loc["location_id"],
                "name": loc["name"],
                "location_type": loc["location_type"],
                "distance_km": dist,
                "estimated_population": loc["estimated_population"],
                "sensitivity_weight": loc["sensitivity_weight"],
                "impact_level": impact_level,
            })

    nearby.sort(key=lambda x: x["distance_km"])
    return nearby


# ---------------------------------------------------------------------
# 4. Overall plant GIS impact (aggregation)
# ---------------------------------------------------------------------

def assess_plant_gis_impact(plant_id, radius_km=DEFAULT_IMPACT_RADIUS_KM):
    """
    Full GIS impact assessment for a plant: plant location, all nearby
    sensitive locations, counts, and an overall spatial impact rating.

    This is the main function the FastAPI route (and later the Monitor
    Agent / risk pipeline) should call.
    """
    plants = _load_plants()
    if plant_id not in plants:
        raise ValueError(f"Plant '{plant_id}' not found")

    plant = plants[plant_id]
    nearby = get_nearby_sensitive_locations(plant_id, radius_km)

    high_count = sum(1 for loc in nearby if loc["impact_level"] == "HIGH")
    medium_count = sum(1 for loc in nearby if loc["impact_level"] == "MEDIUM")

    if high_count > 0:
        overall = "HIGH"
    elif medium_count > 0:
        overall = "MEDIUM"
    elif len(nearby) > 0:
        overall = "LOW"
    else:
        overall = "NONE"  # no sensitive locations within radius at all

    location_type_breakdown = {}
    for loc in nearby:
        location_type_breakdown[loc["location_type"]] = location_type_breakdown.get(loc["location_type"], 0) + 1

    return {
        "plant_id": plant_id,
        "plant_name": plant["plant_name"],
        "plant_location": {
            "latitude": plant["latitude"],
            "longitude": plant["longitude"],
        },
        "impact_radius_km": radius_km,
        "nearby_sensitive_locations": nearby,
        "total_sensitive_locations": len(nearby),
        "high_impact_locations": high_count,
        "medium_impact_locations": medium_count,
        "location_type_breakdown": location_type_breakdown,
        "overall_spatial_impact": overall,
    }
