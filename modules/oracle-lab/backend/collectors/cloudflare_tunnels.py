"""cloudflare_tunnels collector — uptime + métricas básicas tunnels.

Lee /etc/cloudflared/config.yml o systemd unit info para listar tunnels
activos. Para métricas reales por tunnel, consulta cloudflared metrics
endpoint local (usualmente :2000).
"""
from __future__ import annotations

import asyncio
import os
import re
from typing import Any

import httpx

METRICS_URL = os.environ.get("CLOUDFLARED_METRICS", "http://localhost:2000/metrics")


async def fetch() -> dict[str, Any]:
    out: dict[str, Any] = {"status": "ok", "data": {}}

    # Cloudflared metrics endpoint (Prometheus format)
    async with httpx.AsyncClient(timeout=4.0) as client:
        try:
            r = await client.get(METRICS_URL)
            if r.status_code == 200:
                text = r.text
                ha_conns = re.search(r"cloudflared_tunnel_ha_connections\s+([\d.eE+-]+)", text)
                req_total = re.search(r"cloudflared_tunnel_request_count\s+([\d.eE+-]+)", text)
                resp_5xx = re.search(r'cloudflared_tunnel_response_by_code\{status_code="5\d{2}"\}\s+([\d.eE+-]+)', text)
                out["data"]["ha_connections"] = int(float(ha_conns.group(1))) if ha_conns else 0
                out["data"]["requests_total"] = int(float(req_total.group(1))) if req_total else 0
                out["data"]["responses_5xx"] = int(float(resp_5xx.group(1))) if resp_5xx else 0
            else:
                out["status"] = "no_data"
                out["data"]["reason"] = f"cloudflared metrics HTTP {r.status_code}"
        except httpx.HTTPError as exc:
            out["status"] = "no_data"
            out["data"]["reason"] = f"cloudflared metrics no accesible (esperado si tunnel down): {exc}"

    # Lista tunnels desde systemd (mejor effort, sin auth)
    try:
        proc = await asyncio.create_subprocess_exec(
            "systemctl", "list-units", "--type=service", "--state=running", "--no-legend",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=3.0)
        cf_units = [
            line.split()[0] for line in stdout.decode().splitlines()
            if "cloudflared" in line
        ]
        out["data"]["systemd_tunnels"] = cf_units
    except (asyncio.TimeoutError, FileNotFoundError):
        pass

    return out
