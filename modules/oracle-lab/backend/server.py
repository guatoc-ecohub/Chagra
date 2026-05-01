"""oracle-lab backend — fase 2 con WebSocket pub/sub real-time.

Naming provisional hasta DR-029.

Endpoints:
  GET  /                       → static index.html
  GET  /api/oracle/snapshot    → estado completo (cache 30s)
  GET  /api/oracle/farm/state  → solo finca (Nest Hub lite)
  GET  /api/oracle/timeline    → eventos últimas 24h
  GET  /api/oracle/render/png  → PNG snapshot para bot Telegram (TODO fase 3)
  POST /api/oracle/event       → push manual (operador captura observación)
  WS   /ws/oracle/stream       → push real-time eventos (snapshots + alerts)
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from collectors import collect_all
from render import render_snapshot_png

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

DATA_DIR = Path(os.environ.get("ORACLE_DATA_DIR", "/var/lib/oracle-lab"))
STATIC_DIR = Path(__file__).parent / "static"
REFRESH_INTERVAL_SECONDS = int(os.environ.get("ORACLE_REFRESH_INTERVAL", "30"))


# ----------------------------------------------------------------------
# Pub/sub state — in-memory para MVP. Para Pro multi-instance: Redis pubsub.
# ----------------------------------------------------------------------

class OracleState:
    """Estado compartido del oracle: último snapshot + lista de WS subscribers."""

    def __init__(self):
        self.latest_snapshot: dict[str, Any] | None = None
        self.subscribers: set[asyncio.Queue] = set()
        self._refresh_task: asyncio.Task | None = None

    async def refresh_loop(self):
        """Background task — corre collect_all() cada N segundos y publica."""
        while True:
            try:
                snapshot = await collect_all()
                snapshot["timestamp"] = datetime.now(timezone.utc).isoformat()
                snapshot["status"] = "ok"
                self.latest_snapshot = snapshot
                event = {"type": "snapshot", "payload": snapshot}
                # Fan-out a todos los subscribers
                for queue in list(self.subscribers):
                    try:
                        queue.put_nowait(event)
                    except asyncio.QueueFull:
                        log.warning("Subscriber queue full, dropping event")
            except Exception as exc:
                log.exception("refresh_loop error: %s", exc)
            await asyncio.sleep(REFRESH_INTERVAL_SECONDS)

    async def get_snapshot(self) -> dict[str, Any]:
        """Retorna último snapshot cacheado, o computa uno fresh si no existe."""
        if self.latest_snapshot is None:
            snapshot = await collect_all()
            snapshot["timestamp"] = datetime.now(timezone.utc).isoformat()
            snapshot["status"] = "ok"
            self.latest_snapshot = snapshot
        return self.latest_snapshot

    def subscribe(self) -> asyncio.Queue:
        queue = asyncio.Queue(maxsize=10)
        self.subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue):
        self.subscribers.discard(queue)


state = OracleState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle hook — arranca el refresh loop al inicio, lo cancela al apagar."""
    state._refresh_task = asyncio.create_task(state.refresh_loop())
    log.info("Oracle refresh loop started (interval=%ds)", REFRESH_INTERVAL_SECONDS)
    yield
    if state._refresh_task:
        state._refresh_task.cancel()
        try:
            await state._refresh_task
        except asyncio.CancelledError:
            pass
    log.info("Oracle refresh loop stopped")


app = FastAPI(
    title="Oracle Guatoc (provisional)",
    description="Naming TBD — DR-029 pending. Fase 2: WebSocket real-time.",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)


class ManualEvent(BaseModel):
    type: str
    payload: dict[str, Any]
    source: str = "manual"


# ----------------------------------------------------------------------
# REST endpoints
# ----------------------------------------------------------------------

@app.get("/api/oracle/snapshot")
async def snapshot() -> dict[str, Any]:
    """Snapshot agregado — usa cache del refresh loop (TTL 30s).

    Beneficio vs fetch fresh cada call: si 10 clientes preguntan en 1s,
    no disparamos 10 collect_all en paralelo.
    """
    return await state.get_snapshot()


@app.get("/api/oracle/farm/state")
async def farm_state() -> dict[str, Any]:
    """Vista lite finca (Nest Hub via HA Lovelace card)."""
    snap = await state.get_snapshot()
    providers = snap.get("providers", {})
    return {
        "status": "ok",
        "timestamp": snap.get("timestamp"),
        "weather": providers.get("openmeteo", {}).get("data", {}).get("current"),
        "farm_assets": providers.get("farmos", {}).get("data", {}).get("assets_active", 0),
        "ha_sensors": providers.get("home_assistant", {}).get("data", {}).get("matched_sensors", 0),
    }


@app.get("/api/oracle/timeline")
async def timeline(hours: int = 24) -> dict[str, Any]:
    """Eventos últimas N horas."""
    return {"status": "scaffold", "events": [], "window_hours": hours}


@app.get("/api/oracle/render/png")
async def render_png(width: int = 1200, height: int = 800) -> Any:
    """Render PNG del snapshot actual para bot Telegram + HA picture card.

    Query params:
      width  (default 1200, range 600-2400)
      height (default 800,  range 400-1600)
    """
    from fastapi.responses import Response
    width = max(600, min(width, 2400))
    height = max(400, min(height, 1600))
    snap = await state.get_snapshot()
    png_bytes = render_snapshot_png(snap, width=width, height=height)
    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={"Cache-Control": "max-age=30, public"},
    )


@app.post("/api/oracle/event")
async def push_event(event: ManualEvent) -> dict[str, Any]:
    """Operador empuja evento manual (observación capturada).

    Publica al pub/sub para que clientes WS lo reciban inmediatamente.
    """
    log.info("Manual event: type=%s source=%s", event.type, event.source)
    received_at = datetime.now(timezone.utc).isoformat()
    out_event = {
        "type": "manual_event",
        "payload": {
            "event_type": event.type,
            "data": event.payload,
            "source": event.source,
            "received_at": received_at,
        },
    }
    for queue in list(state.subscribers):
        try:
            queue.put_nowait(out_event)
        except asyncio.QueueFull:
            pass
    return {"ok": True, "received_at": received_at}


# ----------------------------------------------------------------------
# WebSocket stream — pub/sub real-time
# ----------------------------------------------------------------------

@app.websocket("/ws/oracle/stream")
async def stream(ws: WebSocket):
    """WebSocket pub/sub:
    1. Acepta la conexión.
    2. Envía el último snapshot inmediatamente.
    3. Subscribe el cliente a la queue del state.
    4. Loop: drena queue → envía cada event al cliente.
    5. Cleanup al desconectar.
    """
    await ws.accept()
    queue = state.subscribe()
    try:
        # Bootstrap: envía último snapshot al conectar
        if state.latest_snapshot:
            await ws.send_json({"type": "snapshot", "payload": state.latest_snapshot})

        # Pub/sub loop
        while True:
            event = await queue.get()
            await ws.send_json(event)
    except WebSocketDisconnect:
        log.info("WebSocket client disconnected")
    except Exception as exc:
        log.warning("WebSocket error: %s", exc)
    finally:
        state.unsubscribe(queue)


# ----------------------------------------------------------------------
# Static frontend
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
