"""openmeteo collector — clima Choachí en tiempo real + forecast 7 días.

Coordenadas Choachí: 4.527°N, -73.923°E (~1923 msnm)
Free tier, no requiere auth.
"""
from __future__ import annotations

from typing import Any

import httpx

CHOACHI_LAT = 4.527
CHOACHI_LON = -73.923
CHOACHI_ELEVATION = 1923

API_URL = "https://api.open-meteo.com/v1/forecast"


async def fetch() -> dict[str, Any]:
    params = {
        "latitude": CHOACHI_LAT,
        "longitude": CHOACHI_LON,
        "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code,cloud_cover",
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max",
        "timezone": "America/Bogota",
        "forecast_days": 7,
    }

    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            r = await client.get(API_URL, params=params)
            r.raise_for_status()
            data = r.json()
            current = data.get("current", {})
            daily = data.get("daily", {})
            return {
                "status": "ok",
                "data": {
                    "location": "Choachí (Cundinamarca, ~1923 msnm)",
                    "current": {
                        "temperature_c": current.get("temperature_2m"),
                        "humidity_pct": current.get("relative_humidity_2m"),
                        "precipitation_mm": current.get("precipitation"),
                        "wind_kmh": current.get("wind_speed_10m"),
                        "weather_code": current.get("weather_code"),
                        "cloud_cover_pct": current.get("cloud_cover"),
                        "time": current.get("time"),
                    },
                    "daily_forecast": {
                        "dates": daily.get("time", []),
                        "temp_max_c": daily.get("temperature_2m_max", []),
                        "temp_min_c": daily.get("temperature_2m_min", []),
                        "precipitation_mm": daily.get("precipitation_sum", []),
                        "uv_index_max": daily.get("uv_index_max", []),
                    },
                },
            }
        except httpx.HTTPError as exc:
            return {"status": "error", "error": str(exc)}
