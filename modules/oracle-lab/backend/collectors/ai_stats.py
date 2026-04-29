"""ai_stats collector — consume el ai-stats-panel ya desplegado.

Endpoint: http://localhost:9292/api/snapshot
"""
from __future__ import annotations

import os
from typing import Any

import httpx

AI_STATS_URL = os.environ.get("AI_STATS_URL", "http://localhost:9292/api/snapshot")


async def fetch() -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            r = await client.get(AI_STATS_URL)
            if r.status_code == 200:
                payload = r.json()
                return {
                    "status": "ok",
                    "data": {
                        "providers": payload.get("providers", {}),
                        "manual": payload.get("manual", {}),
                        "panel_collected_at": payload.get("collected_at"),
                    },
                }
            return {
                "status": "error",
                "error": f"HTTP {r.status_code} from ai-stats-panel",
            }
        except httpx.HTTPError as exc:
            return {"status": "error", "error": str(exc)}
