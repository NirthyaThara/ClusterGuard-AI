# ClusterGuard AI — Frontend ↔ Backend API Contract

This is what `src/data/mockApi.js` currently fakes with `setTimeout`.
Implement these routes in FastAPI reading from the CSVs and the frontend
swap is a find-and-replace in one file — nothing else changes.

Base URL assumed: `http://localhost:8000` (adjust `API_BASE` wherever
you wire up `fetch`/`axios`).

---

## `GET /clusters`

Source: `clusters.csv`

```json
[
  {
    "id": "CL01",
    "name": "Manali Industrial Estate",
    "state": "Tamil Nadu",
    "district": "Chennai",
    "lat": 13.15,
    "lng": 80.26
  }
]
```

## `GET /plants?cluster_id=CL01`

Source: `plants.csv`, filtered by `cluster_id`. `level`/`status` are
live telemetry-derived fields (see below) — join in the latest reading
per plant, or default `level` to the plant's average and `status` to
`"nominal"` if telemetry isn't wired up yet.

```json
[
  {
    "id": "PL01",
    "clusterId": "CL01",
    "name": "Alpha Chemicals",
    "industryType": "Chemical",
    "lat": 13.152,
    "lng": 80.261,
    "capacity": "Large",
    "complianceScore": 0.72,
    "status": "Active",
    "level": 32.4
  }
]
```

Note: `status` here is the plant's operational status (`Active` /
`Maintenance` from `plants.csv`) — don't confuse with the telemetry
alert status (`nominal` / `spike`) the dashboard tracks client-side.

## `GET /sensitive-zones?cluster_id=CL01`

Source: `sensitive_locations.csv`

```json
[
  {
    "id": "SL01",
    "clusterId": "CL01",
    "name": "St. Xavier HS",
    "kind": "School",
    "lat": 13.1533,
    "lng": 80.2622,
    "population": 420,
    "weight": 0.9
  }
]
```

`population` is `null` for non-residential types (Hospital, River,
Farmland) — matches the blank cells in the CSV.

## `GET /telemetry?plant_id=PL01&since=...`

Source: `plant_telemetry.csv`. Used for the trend/anomaly history — not
yet consumed by the current frontend build, but the shape below is
ready whenever a trend chart gets added.

```json
[
  {
    "readingId": 1,
    "plantId": "PL01",
    "timestamp": "2026-08-19T00:00:00",
    "so2Ppm": 41.2,
    "noxPpm": 30.1,
    "pmUgM3": 55.0,
    "coPpm": 12.4,
    "vocPpm": 9.8,
    "isAnomaly": false,
    "dataQualityFlag": "Normal"
  }
]
```

**Heads up:** rows `reading_id 6` and `81` in the current CSV are both
`PL01 @ 2026-08-19T10:00:00` with identical readings but different
`data_quality_flag` ("Normal" vs "Sensor Error"). Worth deciding
whether the API dedupes these or the frontend needs to handle a
conflicting-reading case.

## `GET /regulatory-limits?industry_type=Chemical`

Source: `regulatory_limits.csv`

```json
[
  { "pollutant": "so2_ppm", "limit": 80.0, "unit": "ppm", "source": "TNPCB" },
  { "pollutant": "nox_ppm", "limit": 60.0, "unit": "ppm", "source": "TNPCB" }
]
```

## `GET /mitigation-actions?industry_type=Chemical`

Source: `mitigation_actions.csv`, filtered where `industry_type` is in
the semicolon-delimited `applicable_industry_types` column.

```json
[
  {
    "id": 1,
    "name": "Activate Scrubber",
    "reductionPct": 35,
    "costInr": 60000,
    "productionImpactPct": 3
  }
]
```

## `POST /simulate-spike`

Body: `{ "plantId": "PL02" }`

This is the one route that doesn't map to a CSV — it's the live
agent-pipeline run. Two implementation options:

- **Simple (matches current frontend):** return the full resolved
  result in one response after the pipeline finishes server-side —
  `{ "agentLog": [...], "recommendedActions": [...] }` — and the
  frontend fakes the staggered animation client-side like it does now.
- **Real-time:** stream agent status/log events over a WebSocket or SSE
  as each of the 5 agents actually completes. If you go this route,
  the event names to emit are `agent_status` (`{ agent, status }`) and
  `log` (`{ agent, message }`), matching the handler names already in
  `mockApi.js`'s `runSpikeSimulation`.

Either way, the final payload should look like:

```json
{
  "recommendedActions": [
    { "name": "Activate Scrubber", "reduction": 35, "cost": 30, "production": 3 }
  ],
  "recommendedIndex": 0
}
```

---

## Not yet in the CSVs, needed for the map's wind/plume visual

`RiskMap.jsx` currently hardcodes a wind indicator ("NE · 14 km/h") —
there's no wind speed/direction field in `plant_telemetry.csv` or
anywhere else. If the GIS Impact agent is meant to compute plume drift
direction (per the architecture diagram), that needs a source — either
add wind columns to telemetry or a separate `weather.csv` per cluster.
