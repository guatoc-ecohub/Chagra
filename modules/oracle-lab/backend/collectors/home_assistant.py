"""home_assistant collector — sensores IoT críticos finca Guatoc.

Consume Home Assistant REST API para obtener estado de sensores
seleccionados (temp/hum interior+exterior, suelo, energía solar, etc.).

Env vars:
  HA_BASE_URL       (default http://localhost:8123)
  HA_LONG_LIVED_TOKEN  (long-lived access token de HA)
  HA_SENSOR_FILTER  (opcional, regex de entity_id a incluir)
"""
from __future__ import annotations

import os
import re
from typing import Any

import httpx

HA_BASE = os.environ.get("HA_BASE_URL", "http://localhost:8123").rstrip("/")
HA_TOKEN = os.environ.get("HA_LONG_LIVED_TOKEN", "").strip()
HA_FILTER = os.environ.get(
    "HA_SENSOR_FILTER",
    # Sensores agronómicos reales en Guatoc (2026-04-30):
    #   matera_cocina_*       (invernadero Zona A, Zigbee)
    #   hobeian_zg_303z_*     (matera tabaco, Zigbee)
    # Pendientes hardware (blocker queue/001): dome_*, airgradient_*, deye_*, byd_*.
    # Excluimos uptime monitors (farmos_v2, grafana_dashboards, etc) que matchean
    # "temperature"/"humidity" por accidente al filtrar genérico.
    r"^sensor\.(matera|hobeian|airgradient|deye|byd|dome|invernadero|suelo|solar|energia|co2|pm25)",
)


async def fetch() -> dict[str, Any]:
    if not HA_TOKEN:
        return {
            "status": "no_data",
            "data": {"reason": "HA_LONG_LIVED_TOKEN not configured"},
        }

    headers = {"Authorization": f"Bearer {HA_TOKEN}", "Accept": "application/json"}
    pattern = re.compile(HA_FILTER, re.IGNORECASE)
    out: dict[str, Any] = {"status": "ok", "data": {}}

    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            r = await client.get(f"{HA_BASE}/api/states", headers=headers)
            r.raise_for_status()
            states = r.json()
            filtered = [s for s in states if pattern.match(s.get("entity_id", ""))]
            out["data"]["total_entities"] = len(states)
            out["data"]["matched_sensors"] = len(filtered)
            out["data"]["sensors"] = [
                {
                    "entity_id": s["entity_id"],
                    "state": s.get("state"),
                    "unit": s.get("attributes", {}).get("unit_of_measurement"),
                    "friendly_name": s.get("attributes", {}).get("friendly_name"),
                    "last_changed": s.get("last_changed"),
                }
                for s in filtered[:20]  # cap a 20 para no saturar UI
            ]
        except httpx.HTTPError as exc:
            return {"status": "error", "error": f"HA API: {exc}"}

    return out
