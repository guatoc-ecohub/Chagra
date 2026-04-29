"""oracle-lab backend — placeholder scaffold.

Naming provisional hasta DR-029.

Endpoints:
  GET  /                       → static index.html (cuando frontend exista)
  GET  /api/oracle/snapshot    → estado completo agregado
  GET  /api/oracle/farm/state  → solo finca (Nest Hub lite)
  GET  /api/oracle/timeline    → eventos últimas 24h
  GET  /api/oracle/render/png  → PNG snapshot para bot Telegram
  POST /api/oracle/event       → push manual (operador captura observación)
  WS   /ws/oracle/stream       → push real-time eventos
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from collectors import collect_all
# from render import generate_snapshot_png  # implementar en fase 3

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

DATA_DIR = Path(os.environ.get("ORACLE_DATA_DIR", "/var/lib/oracle-lab"))
STATIC_DIR = Path(__file__).parent / "static"  # MVP vanilla JS — TODO migrar a frontend/dist post identidad final

app = FastAPI(
    title="Oracle Guatoc (provisional)",
    description="Naming TBD — DR-029 pending",
    docs_url=None,
    redoc_url=None,
)


class ManualEvent(BaseModel):
    type: str
    payload: dict[str, Any]
    source: str = "manual"


# ----------------------------------------------------------------------
# REST endpoints (placeholders)
# ----------------------------------------------------------------------

@app.get("/api/oracle/snapshot")
async def snapshot() -> dict[str, Any]:
    """Snapshot agregado en tiempo real desde 3 collectors fase 1.

    Fan-out asyncio: ai_stats + farmos + openmeteo en paralelo,
    cada uno con timeout independiente. Falla aislada por collector.
    """
    payload = await collect_all()
    payload["timestamp"] = datetime.now(timezone.utc).isoformat()
    payload["status"] = "ok"
    return payload


@app.get("/api/oracle/farm/state")
async def farm_state() -> dict[str, Any]:
    """Vista lite finca (Nest Hub via HA Lovelace)."""
    return {
        "status": "scaffold",
        "weather": None,
        "active_alerts": [],
        "next_lunar_window": None,
    }


@app.get("/api/oracle/timeline")
async def timeline(hours: int = 24) -> dict[str, Any]:
    """Eventos últimas N horas."""
    return {"status": "scaffold", "events": [], "window_hours": hours}


@app.get("/api/oracle/render/png")
async def render_png():
    """PNG snapshot para bot Telegram. TODO: matplotlib server-side fase 3."""
    raise HTTPException(501, "Not implemented yet — fase 3")


@app.post("/api/oracle/event")
async def push_event(event: ManualEvent) -> dict[str, Any]:
    """Operador empuja evento manual (observación capturada)."""
    log.info("Manual event: type=%s source=%s", event.type, event.source)
    # TODO: persistir a logs append-only ADR-019
    return {"ok": True, "received_at": datetime.now(timezone.utc).isoformat()}


# ----------------------------------------------------------------------
# WebSocket stream (placeholder)
# ----------------------------------------------------------------------

@app.websocket("/ws/oracle/stream")
async def stream(ws: WebSocket):
    """Push real-time. TODO: pub/sub implementation fase 2."""
    await ws.accept()
    try:
        await ws.send_json({
            "type": "scaffold",
            "message": "WebSocket placeholder — pub/sub stack en fase 2",
        })
        while True:
            # Echo loop hasta que el cliente cierre
            data = await ws.receive_text()
            await ws.send_json({"echo": data})
    except WebSocketDisconnect:
        log.info("WebSocket client disconnected")


# ----------------------------------------------------------------------
# Static frontend (cuando exista)
# ----------------------------------------------------------------------

@app.get("/")
async def index():
    if not (STATIC_DIR / "index.html").exists():
        return JSONResponse({
            "status": "frontend_not_built",
            "api_endpoints": [
                "/api/oracle/snapshot",
                "/api/oracle/farm/state",
                "/api/oracle/timeline",
                "/api/oracle/render/png",
                "/api/oracle/event",
                "/ws/oracle/stream",
            ],
        })
    return FileResponse(STATIC_DIR / "index.html")


if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
