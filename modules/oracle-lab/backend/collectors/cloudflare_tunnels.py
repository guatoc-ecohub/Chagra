"""cloudflare_tunnels collector — uptime + métricas básicas tunnels.

Cloudflared NO expone /metrics por default. Si el endpoint no responde,
reporta status=no_data graceful con instrucción de cómo activar.

Para activar metrics, agregar al config cloudflared NixOS:
  services.cloudflared.tunnels."<name>".metrics = "127.0.0.1:2000";

O en /etc/cloudflared/config.yml:
  metrics: 127.0.0.1:2000

Después restart cloudflared.
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
    metrics_accessible = False
    async with httpx.AsyncClient(timeout=3.0) as client:
        try:
            r = await client.get(METRICS_URL)
            if r.status_code == 200:
                metrics_accessible = True
                text = r.text
                ha_conns = re.search(r"cloudflared_tunnel_ha_connections\s+([\d.eE+-]+)", text)
                req_total = re.search(r"cloudflared_tunnel_request_count\s+([\d.eE+-]+)", text)
                resp_5xx = re.search(r'cloudflared_tunnel_response_by_code\{status_code="5\d{2}"\}\s+([\d.eE+-]+)', text)
                out["data"]["ha_connections"] = int(float(ha_conns.group(1))) if ha_conns else 0
                out["data"]["requests_total"] = int(float(req_total.group(1))) if req_total else 0
                out["data"]["responses_5xx"] = int(float(resp_5xx.group(1))) if resp_5xx else 0
        except httpx.HTTPError:
            pass

    if not metrics_accessible:
        # No reportar como error — el cloudflared funciona aunque no exponga
        # metrics. Solo marcar no_data con hint operacional.
        out["status"] = "no_data"
        out["data"]["reason"] = (
            "Metrics endpoint no expuesto. Para activar agregá "
            "metrics = \"127.0.0.1:2000\" al config cloudflared y reiniciá. "
            "El tunnel sigue funcionando sin esto."
        )

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
        if cf_units:
            out["data"]["systemd_tunnels"] = cf_units
            # Si systemd reporta tunnels activos pero no metrics, status=ok parcial
            if not metrics_accessible:
                out["status"] = "ok"
                out["data"]["metrics_pending"] = True
    except (asyncio.TimeoutError, FileNotFoundError):
        pass

    return out
