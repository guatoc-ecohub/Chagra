"""openmeteo collector — clima Guatoc/Vereda El Curí en tiempo real + forecast 7d.

Coordenadas Guatoc (Vereda El Curí, Choachí, Cundinamarca):
  4.5306°N, -73.9247°E, ~2520 msnm

NOTA: las coords + altitud apuntan a la finca (vereda El Curí) NO al casco
urbano de Choachí (~1923 msnm). Esto preserva congruencia con Chagra
(VITE_FARM_LAT/LON/ALTITUD) y evita reportar el clima/altitud de un punto
~5 km y 600 m abajo de donde realmente está el invernadero.

Free tier, no requiere auth.
"""
from __future__ import annotations

from typing import Any

import httpx

GUATOC_LAT = 4.5306
GUATOC_LON = -73.9247
GUATOC_ELEVATION = 2520
LOCATION_LABEL = "Guatoc · Vereda El Curí, Choachí (Cundinamarca) · 2520 msnm"

API_URL = "https://api.open-meteo.com/v1/forecast"


async def fetch() -> dict[str, Any]:
    params = {
        "latitude": GUATOC_LAT,
        "longitude": GUATOC_LON,
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
                    "location": LOCATION_LABEL,
                    "municipio": "Choachí",
                    "vereda": "El Curí",
                    "departamento": "Cundinamarca",
                    "elevation_m": GUATOC_ELEVATION,
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
