"""
backend/services/data_loader.py
================================
ClusterGuard — Round 1 CSV Data Loading Service

Central place for loading all CSV datasets.
Every other module should import from here — never load CSVs directly
in route handlers.

Usage:
    from backend.services.data_loader import load_plants, load_telemetry, ...

All functions return a list of plain Python dicts so that:
  - They are easy to pass to risk.py (which expects dicts)
  - They are JSON-serialisable for FastAPI responses
  - They have no hidden pandas dependency at call sites
"""

import os
from pathlib import Path
from typing import Optional

import pandas as pd

# ---------------------------------------------------------------------------
# Path resolution — works regardless of cwd
# ---------------------------------------------------------------------------
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_DATA_DIR = _REPO_ROOT / "data"


def _csv_path(filename: str) -> Path:
    return _DATA_DIR / filename


def _load_csv(filename: str, required_columns: Optional[list] = None) -> list[dict]:
    """
    Load a CSV file and return a list of dicts.

    Parameters
    ----------
    filename : str
        The CSV filename (not the full path).
    required_columns : list, optional
        If provided, raises ValueError if any required column is missing.

    Raises
    ------
    FileNotFoundError
        If the CSV file does not exist.
    ValueError
        If required columns are absent or the file is empty.
    """
    path = _csv_path(filename)

    if not path.exists():
        raise FileNotFoundError(
            f"Dataset not found: {path}. "
            "Ensure the data/ directory contains all CSV files."
        )

    df = pd.read_csv(path)

    if df.empty:
        raise ValueError(f"Dataset is empty: {filename}")

    if required_columns:
        missing = [c for c in required_columns if c not in df.columns]
        if missing:
            raise ValueError(
                f"CSV '{filename}' is missing required columns: {missing}. "
                f"Found columns: {list(df.columns)}"
            )

    # Replace NaN with None so dicts are JSON-serialisable
    df = df.where(pd.notnull(df), other=None)

    return df.to_dict(orient="records")


# ---------------------------------------------------------------------------
# Public loader functions
# ---------------------------------------------------------------------------

def load_plants() -> list[dict]:
    """
    Load all plant records from plants.csv.

    Columns: plant_id, cluster_id, plant_name, industry_type,
             latitude, longitude, capacity_category, commissioned_year,
             compliance_history_score, status
    """
    return _load_csv(
        "plants.csv",
        required_columns=["plant_id", "industry_type", "compliance_history_score"],
    )


def load_telemetry() -> list[dict]:
    """
    Load all telemetry readings from plant_telemetry.csv.

    Columns: reading_id, plant_id, timestamp, so2_ppm, nox_ppm, pm_ug_m3,
             co_ppm, voc_ppm, effluent_ph, effluent_cod_mgL, effluent_bod_mgL,
             effluent_tss_mgL, process_temp_c, process_pressure_bar,
             process_flow_m3h, operational_status, is_anomaly, data_quality_flag
    """
    return _load_csv(
        "plant_telemetry.csv",
        required_columns=["plant_id", "timestamp", "is_anomaly"],
    )


def load_regulatory_limits() -> list[dict]:
    """
    Load all regulatory limit records from regulatory_limits.csv.

    Columns: limit_id, pollutant, industry_type, permissible_limit,
             unit, standard_source, effective_from
    """
    return _load_csv(
        "regulatory_limits.csv",
        required_columns=["pollutant", "industry_type", "permissible_limit"],
    )


def load_users() -> list[dict]:
    """
    Load all user records from users.csv.

    Columns: user_id, role, name, cluster_id, plant_id, email
    """
    return _load_csv(
        "users.csv",
        required_columns=["user_id", "role"],
    )


def load_mitigation_actions() -> list[dict]:
    """
    Load all mitigation action records from mitigation_actions.csv.

    Columns: action_id, action_type, applicable_industry_types,
             typical_pollution_reduction_pct, typical_cost_inr,
             typical_production_impact_pct

    Note: applicable_industry_types is semicolon-delimited.
    """
    return _load_csv(
        "mitigation_actions.csv",
        required_columns=["action_id", "action_type", "applicable_industry_types"],
    )


def load_sensitive_locations() -> list[dict]:
    """
    Load all sensitive location records from sensitive_locations.csv.

    Columns: location_id, cluster_id, location_type, name,
             latitude, longitude, estimated_population, sensitivity_weight
    """
    return _load_csv(
        "sensitive_locations.csv",
        required_columns=["location_id", "cluster_id", "latitude", "longitude"],
    )


def load_clusters() -> list[dict]:
    """
    Load all cluster records from clusters.csv.

    Columns: cluster_id, cluster_name, state, district,
             centroid_lat, centroid_lon
    """
    return _load_csv(
        "clusters.csv",
        required_columns=["cluster_id"],
    )


# ---------------------------------------------------------------------------
# Convenience helpers used by route handlers and the monitor agent
# ---------------------------------------------------------------------------

def get_plant_by_id(plant_id: str) -> Optional[dict]:
    """Return a single plant dict or None if not found."""
    plants = load_plants()
    for plant in plants:
        if str(plant.get("plant_id", "")).strip() == plant_id.strip():
            return plant
    return None


def get_latest_telemetry(plant_id: str) -> Optional[dict]:
    """
    Return the most recent telemetry reading for a plant.

    'Most recent' is determined by the `timestamp` column.
    Falls back to the last row if timestamps cannot be parsed.
    """
    telemetry = load_telemetry()
    plant_readings = [
        row for row in telemetry
        if str(row.get("plant_id", "")).strip() == plant_id.strip()
    ]

    if not plant_readings:
        return None

    # Try to sort by timestamp descending
    try:
        plant_readings.sort(key=lambda r: str(r.get("timestamp", "")), reverse=True)
    except Exception:
        pass  # If sort fails, just use the last row

    return plant_readings[0]


def get_regulatory_limits_for_industry(industry_type: str) -> list[dict]:
    """Return all regulatory limit rows for a specific industry type."""
    limits = load_regulatory_limits()
    return [
        row for row in limits
        if str(row.get("industry_type", "")).strip() == industry_type.strip()
    ]
