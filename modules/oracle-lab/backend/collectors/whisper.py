"""whisper collector — speaches container (whisperOpenai) en :10302.

Health + lista de modelos cargados. Métricas Prometheus si está activo
el endpoint /metrics.
"""
from __future__ import annotations

import os
import re
from typing import Any

import httpx

SPEACHES_BASE = os.environ.get("SPEACHES_HOST", "http://localhost:10302").rstrip("/")


async def fetch() -> dict[str, Any]:
    out: dict[str, Any] = {"status": "ok", "data": {}}

    async with httpx.AsyncClient(timeout=5.0) as client:
        # Health
        try:
            r = await client.get(f"{SPEACHES_BASE}/health")
            out["data"]["healthy"] = r.status_code == 200
        except httpx.HTTPError:
            out["data"]["healthy"] = False

        # Modelos disponibles (OpenAI compat)
        try:
            r = await client.get(f"{SPEACHES_BASE}/v1/models")
            if r.status_code == 200:
                out["data"]["models"] = [m["id"] for m in r.json().get("data", [])][:10]
            else:
                out["data"]["models"] = []
        except httpx.HTTPError as exc:
            out["data"]["models_error"] = str(exc)

        # Prometheus metrics si están expuestas
        try:
            r = await client.get(f"{SPEACHES_BASE}/metrics")
            if r.status_code == 200:
                text = r.text
                duration = re.search(
                    r"transcription_audio_duration_seconds_total\s+([\d.eE+-]+)",
                    text,
                )
                count = re.search(
                    r"transcription_duration_seconds_count\s+([\d.eE+-]+)",
                    text,
                )
                out["data"]["audio_seconds_total"] = float(duration.group(1)) if duration else 0
                out["data"]["transcription_count"] = int(float(count.group(1))) if count else 0
                if duration and count and float(count.group(1)) > 0:
                    out["data"]["hours_transcribed"] = round(
                        float(duration.group(1)) / 3600, 2
                    )
        except httpx.HTTPError:
            pass

    return out
