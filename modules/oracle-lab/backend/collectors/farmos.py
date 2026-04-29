"""farmos collector — OAuth2 password grant + JSON:API discovery.

FarmOS Drupal expone JSON:API con paths por bundle:
  /api/asset/{bundle}: animal, compost, equipment, group, land, plant, sensor, structure, water
  /api/log/{bundle}:   activity, harvest, input, observation, etc.

El collector hace discovery del index `/api` y suma counts across bundles.
Cachea el bearer OAuth2 token en memoria del proceso hasta que expire.

Env vars (vía EnvironmentFile SOPS):
  FARMOS_BASE
  FARMOS_CLIENT_ID
  FARMOS_CLIENT_SECRET
  FARMOS_USERNAME
  FARMOS_PASSWORD
"""
from __future__ import annotations

import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

FARMOS_BASE = os.environ.get("FARMOS_BASE", "http://localhost:8081").rstrip("/")
FARMOS_CLIENT_ID = os.environ.get("FARMOS_CLIENT_ID", "")
FARMOS_CLIENT_SECRET = os.environ.get("FARMOS_CLIENT_SECRET", "")
FARMOS_USERNAME = os.environ.get("FARMOS_USERNAME", "")
FARMOS_PASSWORD = os.environ.get("FARMOS_PASSWORD", "")

_token_cache: dict[str, Any] = {"token": None, "expires_at": 0}


async def _get_bearer_token(client: httpx.AsyncClient) -> str | None:
    now = time.time()
    if _token_cache["token"] and _token_cache["expires_at"] > now + 60:
        return _token_cache["token"]
    if not all([FARMOS_CLIENT_ID, FARMOS_CLIENT_SECRET, FARMOS_USERNAME, FARMOS_PASSWORD]):
        return None
    r = await client.post(
        f"{FARMOS_BASE}/oauth/token",
        data={
            "grant_type": "password",
            "client_id": FARMOS_CLIENT_ID,
            "client_secret": FARMOS_CLIENT_SECRET,
            "username": FARMOS_USERNAME,
            "password": FARMOS_PASSWORD,
            "scope": "farm_manager",
        },
    )
    r.raise_for_status()
    payload = r.json()
    _token_cache["token"] = payload.get("access_token")
    _token_cache["expires_at"] = now + int(payload.get("expires_in", 3600))
    return _token_cache["token"]


async def _discover_endpoints(client: httpx.AsyncClient, headers: dict) -> dict[str, list[str]]:
    """Lista bundles disponibles consultando /api index JSON:API."""
    r = await client.get(f"{FARMOS_BASE}/api", headers=headers)
    r.raise_for_status()
    links = r.json().get("links", {})
    assets, logs = [], []
    for key, val in links.items():
        href = val.get("href", "")
        path = href.replace(FARMOS_BASE, "")
        if key.startswith("asset--"):
            assets.append(path)
        elif key.startswith("log--"):
            logs.append(path)
    return {"assets": assets, "logs": logs}


async def fetch() -> dict[str, Any]:
    if not FARMOS_CLIENT_ID:
        return {
            "status": "no_data",
            "data": {"reason": "FARMOS_CLIENT_ID not configured"},
        }

    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    out: dict[str, Any] = {"status": "ok", "data": {}}

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            token = await _get_bearer_token(client)
            if not token:
                return {"status": "error", "error": "OAuth2 token grant failed"}

            headers = {
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.api+json",
            }

            endpoints = await _discover_endpoints(client, headers)
            out["data"]["bundles_discovered"] = {
                "assets": len(endpoints["assets"]),
                "logs": len(endpoints["logs"]),
            }

            # Sum assets activos across all bundles
            total_assets = 0
            assets_by_bundle: dict[str, int] = {}
            for path in endpoints["assets"]:
                try:
                    r = await client.get(
                        f"{FARMOS_BASE}{path}",
                        headers=headers,
                        params={"filter[status]": "active", "page[limit]": 1},
                    )
                    if r.status_code == 200:
                        count = r.json().get("meta", {}).get("count", 0)
                        bundle = path.rsplit("/", 1)[-1]
                        if count > 0:
                            assets_by_bundle[bundle] = count
                            total_assets += count
                except httpx.HTTPError:
                    pass
            out["data"]["assets_active"] = total_assets
            out["data"]["assets_by_bundle"] = assets_by_bundle

            # Sum logs últimos 7d across all bundles
            total_logs = 0
            for path in endpoints["logs"]:
                try:
                    r = await client.get(
                        f"{FARMOS_BASE}{path}",
                        headers=headers,
                        params={
                            "filter[timestamp][operator]": ">=",
                            "filter[timestamp][value]": seven_days_ago,
                            "page[limit]": 1,
                        },
                    )
                    if r.status_code == 200:
                        total_logs += r.json().get("meta", {}).get("count", 0)
                except httpx.HTTPError:
                    pass
            out["data"]["logs_7d"] = total_logs

        except httpx.HTTPError as exc:
            return {"status": "error", "error": f"FarmOS API: {exc}"}

    return out
