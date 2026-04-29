"""Collectors orquestador para Oracle Guatoc.

Cada collector implementa async fetch() -> dict con shape canónico:
  {
    "status": "ok" | "error" | "no_data" | "stale",
    "data": {...},
    "fetched_at": ISO 8601,
    "source": "<name>",
    "error"?: "<msg si status=error>"
  }
"""
from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any

from . import ai_stats, farmos, openmeteo

log = logging.getLogger(__name__)

# ai_stats deshabilitado por default hasta que ai-stats-panel.service se
# importe en alpha config (PR pendiente). Activar con
# ENABLE_AI_STATS_COLLECTOR=1 cuando esté arriba.
COLLECTORS = {
    "farmos": farmos.fetch,
    "openmeteo": openmeteo.fetch,
}
if os.environ.get("ENABLE_AI_STATS_COLLECTOR", "0") == "1":
    COLLECTORS["ai_stats"] = ai_stats.fetch


async def collect_all() -> dict[str, Any]:
    """Run all collectors in parallel with per-collector timeout protection.

    A failing collector does NOT poison the snapshot — its slot just shows
    status=error with the message.
    """
    async def _safe(name: str, fn) -> tuple[str, dict[str, Any]]:
        try:
            result = await asyncio.wait_for(fn(), timeout=10.0)
            if "fetched_at" not in result:
                result["fetched_at"] = datetime.now(timezone.utc).isoformat()
            if "source" not in result:
                result["source"] = name
            return name, result
        except asyncio.TimeoutError:
            return name, {
                "status": "error",
                "error": f"Timeout >10s for {name}",
                "source": name,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as exc:
            log.warning("Collector %s failed: %s", name, exc, exc_info=True)
            return name, {
                "status": "error",
                "error": str(exc),
                "source": name,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            }

    results = await asyncio.gather(*(_safe(name, fn) for name, fn in COLLECTORS.items()))
    return {"providers": dict(results)}
