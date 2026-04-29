"""ollama collector — modelos cargados + queries activas en alpha.

Endpoint local NixOS service: http://localhost:11434
"""
from __future__ import annotations

import os
from typing import Any

import httpx

OLLAMA_BASE = os.environ.get("OLLAMA_HOST", "http://localhost:11434").rstrip("/")


async def fetch() -> dict[str, Any]:
    out: dict[str, Any] = {"status": "ok", "data": {}}

    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            # Modelos disponibles
            r_tags = await client.get(f"{OLLAMA_BASE}/api/tags")
            r_tags.raise_for_status()
            models = r_tags.json().get("models", [])
            out["data"]["models_total"] = len(models)
            out["data"]["models"] = [
                {
                    "name": m.get("name"),
                    "size_gb": round(m.get("size", 0) / 1e9, 2),
                    "modified": m.get("modified_at"),
                }
                for m in models[:10]
            ]

            # Modelos cargados ahora en RAM/VRAM
            try:
                r_ps = await client.get(f"{OLLAMA_BASE}/api/ps")
                r_ps.raise_for_status()
                loaded = r_ps.json().get("models", [])
                out["data"]["loaded_now"] = [
                    {
                        "name": m.get("name"),
                        "vram_gb": round(m.get("size_vram", 0) / 1e9, 2),
                        "expires_at": m.get("expires_at"),
                    }
                    for m in loaded
                ]
                out["data"]["loaded_count"] = len(loaded)
            except httpx.HTTPError:
                out["data"]["loaded_count"] = 0
                out["data"]["loaded_now"] = []
        except httpx.HTTPError as exc:
            return {"status": "error", "error": f"Ollama: {exc}"}

    return out
