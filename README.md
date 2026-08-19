# ClusterGuard

**Round 1 — Rule-Based Industrial Cluster Monitoring & Risk Assessment**

A FastAPI backend that monitors industrial plant telemetry against TNPCB regulatory
limits and surfaces risk assessments for environmental compliance.

---

## Project Structure

```
ClusterGuard-AI/
│
├── data/                          ← Source CSV datasets (DO NOT MODIFY)
│   ├── clusters.csv
│   ├── plants.csv
│   ├── plant_telemetry.csv
│   ├── regulatory_limits.csv
│   ├── sensitive_locations.csv
│   ├── mitigation_actions.csv
│   └── users.csv
│
├── analytics/
│   └── risk.py                    ← Deterministic risk engine (core logic)
│
├── agents/
│   └── monitor_agent.py           ← Monitor Agent (standalone or importable)
│
├── backend/
│   ├── main.py                    ← FastAPI app entry point
│   ├── routes/
│   │   ├── plants.py              ← GET /plants, /plants/{id}
│   │   ├── risk.py                ← GET /risk/{plant_id}
│   │   ├── alerts.py              ← GET /alerts, /alerts/{plant_id}
│   │   └── users.py               ← GET /users/{user_id}/plants
│   └── services/
│       └── data_loader.py         ← Central CSV loading functions
│
├── requirements.txt
└── README.md
```

---

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Run the API server

```bash
uvicorn backend.main:app --reload
```

### 3. Open Swagger UI

```
http://127.0.0.1:8000/docs
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/plants` | All plants |
| GET | `/plants/{plant_id}` | Single plant (404 if not found) |
| GET | `/plants/{plant_id}/nearby-sensitive-locations` | Sensitive locations within radius |
| GET | `/risk/{plant_id}` | Risk assessment for a plant |
| GET | `/alerts` | All HIGH/CRITICAL plants |
| GET | `/alerts/{plant_id}` | Alert status for a specific plant |
| GET | `/users/{user_id}/plants` | Role-based plant visibility |
| GET | `/users` | All users (for testing) |
| GET | `/clusters` | All clusters |
| GET | `/mitigation-actions` | All mitigation actions |

---

## Example API Requests

```bash
# All plants
curl http://127.0.0.1:8000/plants

# Single plant
curl http://127.0.0.1:8000/plants/PL01

# Invalid plant (returns 404)
curl http://127.0.0.1:8000/plants/PL99

# Risk assessment for PL03 (Metal Processing — known high emitter)
curl http://127.0.0.1:8000/risk/PL03

# All active HIGH/CRITICAL alerts
curl http://127.0.0.1:8000/alerts

# Alert status for a specific plant
curl http://127.0.0.1:8000/alerts/PL03

# Plant Operator — sees only their plant (PL01)
curl http://127.0.0.1:8000/users/U001/plants

# Environmental Authority — sees all plants in CL01
curl http://127.0.0.1:8000/users/U007/plants

# Regulator — sees all plants in CL02
curl http://127.0.0.1:8000/users/U011/plants

# Nearby sensitive locations within 2km of PL01
curl "http://127.0.0.1:8000/plants/PL01/nearby-sensitive-locations?radius_km=2"
```

---

## Run the Monitor Agent (standalone)

```bash
python -m agents.monitor_agent
```

This evaluates all plants against their latest telemetry and prints a
colour-coded risk summary to the console.

---

## Risk Engine Summary (`analytics/risk.py`)

The risk engine is **deterministic** and **rule-based**. No ML, no AI.

### Pollutants evaluated
`so2_ppm`, `nox_ppm`, `pm_ug_m3`, `co_ppm`, `voc_ppm`  
(matched against `regulatory_limits.csv` by `industry_type`)

### Scoring

**Per-pollutant (max 15 pts × 5 pollutants = 75 pts)**

| Condition | Points | Status |
|-----------|--------|--------|
| ≤ 70% of limit | 0 | SAFE |
| 70–85% of limit | 5 | WARNING |
| 85–100% of limit | 10 | NEAR_LIMIT |
| 100–120% of limit | 13 | BREACH |
| > 120% of limit | 15 | SEVERE_BREACH |

**Bonus penalties (max 25 pts)**

| Condition | Points |
|-----------|--------|
| `is_anomaly == True` | +10 |
| `compliance_history_score < 0.60` | +10 |
| `compliance_history_score 0.60–0.75` | +5 |
| `data_quality_flag != "Normal"` | +5 |

**Severity**

| Score | Severity |
|-------|----------|
| 0–24 | LOW |
| 25–49 | MEDIUM |
| 50–74 | HIGH |
| 75–100 | CRITICAL |

> `breach_probability = risk_score / 100` — this is a prototype rule-derived
> indicator only. It is NOT a statistically trained probability model.

---

## CSV Relationships

```
clusters.csv
    cluster_id ──────────── plants.csv (cluster_id)
                                 plant_id ────── plant_telemetry.csv (plant_id)
                                 industry_type ─ regulatory_limits.csv (industry_type)
    cluster_id ──────────── sensitive_locations.csv (cluster_id)
    cluster_id ──────────── users.csv (cluster_id)  [authority roles]
                                 plant_id ────── users.csv (plant_id) [operators]

mitigation_actions.csv
    applicable_industry_types ── plants.csv (industry_type)  [semicolon-split]
```

---

## Role-Based Access

| Role | Sees |
|------|------|
| Plant Operator (U001–U006) | Only their assigned plant |
| Environmental Authority (U007–U008) | All plants in their cluster |
| Regulator (U010–U011) | All plants in their cluster |
| Emergency Responder (U009) | All plants in their cluster |

This is a **demonstration** of the intended access model — not a security system.

---

## Known Limitations (Round 1 Scope)

- No real authentication — role access is demonstration only
- Telemetry is always the most recent reading per plant
- Effluent columns (ph, COD, BOD, TSS) are returned as context but not scored
  (no regulatory limits defined for them in the CSV)
- No ML, no database, no cloud infrastructure
