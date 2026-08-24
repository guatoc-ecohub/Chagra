#!/usr/bin/env python3
"""Tailnet-only NOC view for zoe and fleet-ledger.

The server deliberately exposes metrics, not transcript contents. It is a
small standard-library service so it can run beside the existing tools hub
without changing nginx, NixOS, or the public web app.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import threading
import time
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
INDEX = ROOT / "index.html"
BIND_HOST = os.environ.get("FLEET_VIZ_BIND", "100.117.193.102")
PORT = int(os.environ.get("FLEET_VIZ_PORT", "8891"))
ZOE = Path(os.environ.get("ZOE_BIN", str(Path.home() / ".cargo/bin/zoe")))
LEDGER = Path(
    os.environ.get("FLEET_LEDGER_BIN", str(Path.home() / ".local/bin/fleet-ledger"))
)
PROJECTS = Path(
    os.environ.get("CLAUDE_PROJECTS", str(Path.home() / ".claude/projects"))
)

ALLOWED_LANES = {"codex", "glm", "opencode", "deepseek", "claude"}
LANE_ALIASES = {"opencode-g": "opencode"}
LANE_RE = re.compile(
    r"^(?P<name>[?a-z][a-z0-9-]*)\s+(?P<runs>\d+) corridas · "
    r"(?P<hours>[\d.]+)h · (?P<failures>\d+) fallas · "
    r"(?:(?:\$(?P<cost>[\d.]+) \[uso\])|"
    r"(?:salida≈\d+ tok · \[plan/cuota arriba\]))$"
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def run_capture(command: list[str], timeout: float) -> tuple[str, bool]:
    try:
        result = subprocess.run(
            command,
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return "", False
    return result.stdout, result.returncode == 0


def strip_ledger_prefix(line: str) -> str:
    return line.strip().lstrip("║ ").rstrip()


def parse_ledger(output: str) -> dict:
    summary: dict[str, object] = {
        "runs": None,
        "ok": None,
        "failures": None,
        "machine_hours": None,
        "machine_minutes": None,
        "spend_usd": None,
    }
    quotas: list[dict[str, object]] = []
    lanes: dict[str, dict[str, object]] = {}

    for raw_line in output.splitlines():
        line = strip_ledger_prefix(raw_line)
        match = re.match(r"corridas: (\d+)\s+ok: (\d+)\s+fallas: (\d+)$", line)
        if match:
            summary.update(
                runs=int(match.group(1)),
                ok=int(match.group(2)),
                failures=int(match.group(3)),
            )
            continue
        match = re.match(r"tiempo de máquina: (\d+)h (\d+)m$", line)
        if match:
            summary.update(
                machine_hours=int(match.group(1)), machine_minutes=int(match.group(2))
            )
            continue
        match = re.match(r".*GASTO REAL .*: \$([\d.]+)$", line)
        if match:
            summary["spend_usd"] = float(match.group(1))
            continue

        quota_match = re.match(
            r"(?P<name>Codex|Claude|Fable)[^:]*:.*?(?P<used>\d+)%.*?"
            r"(?P<remaining>\d+)% queda(?P<rest>.*)$",
            line,
        )
        if quota_match:
            quotas.append(
                {
                    "name": quota_match.group("name"),
                    "used": int(quota_match.group("used")),
                    "remaining": int(quota_match.group("remaining")),
                    "detail": quota_match.group("rest").strip(" ·"),
                    "measured": True,
                }
            )
            continue
        quota_match = re.match(r"(?P<name>GLM|Gemini): (.*)$", line)
        if quota_match:
            quotas.append(
                {
                    "name": quota_match.group("name"),
                    "used": None,
                    "remaining": None,
                    "detail": "cuota remota no medida",
                    "measured": False,
                }
            )
            continue

        lane_match = LANE_RE.match(line)
        if not lane_match:
            continue
        name = LANE_ALIASES.get(lane_match.group("name"), lane_match.group("name"))
        if name not in ALLOWED_LANES:
            continue
        lane = lanes.setdefault(
            name,
            {"name": name, "runs": 0, "hours": 0.0, "failures": 0, "cost_usd": 0.0},
        )
        lane["runs"] += int(lane_match.group("runs"))
        lane["hours"] += float(lane_match.group("hours"))
        lane["failures"] += int(lane_match.group("failures"))
        if lane_match.group("cost"):
            lane["cost_usd"] += float(lane_match.group("cost"))

    return {
        "updated_at": now_iso(),
        "available": bool(output),
        "summary": summary,
        "quotas": quotas,
        "lanes": sorted(lanes.values(), key=lambda lane: str(lane["name"])),
    }


def ledger_snapshot() -> dict:
    if not LEDGER.is_file():
        return {"updated_at": now_iso(), "available": False, "error": "ledger no disponible"}
    output, completed = run_capture([str(LEDGER)], 18)
    snapshot = parse_ledger(output)
    snapshot["available"] = completed and snapshot["available"]
    if not completed:
        snapshot["error"] = "lectura temporalmente no disponible"
    return snapshot


def latest_session() -> Path | None:
    if not PROJECTS.is_dir():
        return None
    newest: tuple[float, Path] | None = None
    for directory, _, files in os.walk(PROJECTS, followlinks=False):
        for filename in files:
            if not filename.endswith(".jsonl") or filename.startswith("agent-"):
                continue
            path = Path(directory) / filename
            try:
                modified = path.stat().st_mtime
            except OSError:
                continue
            if newest is None or modified > newest[0]:
                newest = (modified, path)
    return newest[1] if newest else None


def parse_zoe(output: str, modified: float | None) -> dict:
    metrics = {
        "agents": 0,
        "tool_calls": 0,
        "queued": 0,
        "file_edits": 0,
        "subagents": 0,
    }
    match = re.search(
        r"(?P<agents>\d+) agent\(s\), (?P<tools>\d+) tool call\(s\) · "
        r"(?P<queued>\d+) queued · (?P<edits>\d+) file edit\(s\)",
        output,
    )
    if match:
        metrics.update(
            agents=int(match.group("agents")),
            tool_calls=int(match.group("tools")),
            queued=int(match.group("queued")),
            file_edits=int(match.group("edits")),
        )
        metrics["subagents"] = max(0, metrics["agents"] - 1)

    live = bool(modified and time.time() - modified < 90)
    return {
        "updated_at": now_iso(),
        "available": bool(output and match),
        "live": live,
        "metrics": metrics,
        "source": "zoe inspect",
    }


def zoe_snapshot() -> dict:
    if not ZOE.is_file():
        return {
            "updated_at": now_iso(),
            "available": False,
            "live": False,
            "metrics": {"agents": 0, "tool_calls": 0, "queued": 0, "file_edits": 0, "subagents": 0},
            "source": "zoe inspect",
        }
    session = latest_session()
    if session is None:
        return parse_zoe("", None)
    output, _ = run_capture([str(ZOE), "inspect", str(session)], 10)
    try:
        modified = session.stat().st_mtime
    except OSError:
        modified = None
    return parse_zoe(output, modified)


class FleetVizHandler(BaseHTTPRequestHandler):
    server_version = "FleetViz/1.0"

    def log_message(self, format: str, *args: object) -> None:
        # Keep access logs free of client addresses and request details.
        return

    def send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        route = urlparse(self.path).path
        if route == "/" or route == "/index.html":
            try:
                body = INDEX.read_bytes()
            except OSError:
                self.send_error(HTTPStatus.INTERNAL_SERVER_ERROR)
                return
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if route == "/healthz":
            self.send_json({"ok": True, "bind": BIND_HOST, "port": PORT})
            return
        if route == "/api/zoe":
            self.send_json(zoe_snapshot())
            return
        if route == "/api/ledger":
            self.send_json(ledger_snapshot())
            return
        self.send_error(HTTPStatus.NOT_FOUND)


def main() -> None:
    httpd = ThreadingHTTPServer((BIND_HOST, PORT), FleetVizHandler)
    print(f"fleet-viz listening on {BIND_HOST}:{PORT}", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
