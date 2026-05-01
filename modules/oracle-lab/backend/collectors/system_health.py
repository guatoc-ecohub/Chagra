"""system_health collector — load avg + memory + disk del host alpha.

Cálculo local desde /proc y statvfs. Sin red, sin auth.
"""
from __future__ import annotations

import os
import shutil
from typing import Any


def _read_loadavg() -> tuple[float, float, float]:
    try:
        with open("/proc/loadavg") as f:
            parts = f.read().split()
            return float(parts[0]), float(parts[1]), float(parts[2])
    except (FileNotFoundError, IndexError, ValueError):
        return 0.0, 0.0, 0.0


def _read_meminfo() -> dict[str, int]:
    info: dict[str, int] = {}
    try:
        with open("/proc/meminfo") as f:
            for line in f:
                key, val = line.split(":", 1)
                # Values come as "  12345 kB"
                num = int(val.strip().split()[0])
                info[key] = num
    except (FileNotFoundError, IndexError, ValueError):
        pass
    return info


def _disk_usage(path: str) -> dict[str, Any]:
    try:
        usage = shutil.disk_usage(path)
        return {
            "total_gb": round(usage.total / 1e9, 1),
            "used_gb": round(usage.used / 1e9, 1),
            "free_gb": round(usage.free / 1e9, 1),
            "used_pct": round(usage.used / usage.total * 100, 1),
        }
    except FileNotFoundError:
        return {"error": f"path not found: {path}"}


def _cpu_count() -> int:
    try:
        return os.cpu_count() or 1
    except Exception:
        return 1


async def fetch() -> dict[str, Any]:
    load1, load5, load15 = _read_loadavg()
    cpus = _cpu_count()
    mem = _read_meminfo()

    mem_total_kb = mem.get("MemTotal", 0)
    mem_avail_kb = mem.get("MemAvailable", 0)
    mem_used_pct = (
        round((mem_total_kb - mem_avail_kb) / mem_total_kb * 100, 1)
        if mem_total_kb > 0
        else 0.0
    )

    # Disk usage de paths típicos en alpha
    disks = {}
    for label, path in [("root", "/"), ("nix", "/nix"), ("data", "/mnt/fast")]:
        usage = _disk_usage(path)
        if "error" not in usage:
            disks[label] = usage

    return {
        "status": "ok",
        "data": {
            "hostname": os.uname().nodename,
            "cpu_count": cpus,
            "load_avg_1m": load1,
            "load_avg_5m": load5,
            "load_avg_15m": load15,
            "load_pct_1m": round(load1 / cpus * 100, 1) if cpus else 0,
            "memory": {
                "total_gb": round(mem_total_kb / 1024 / 1024, 1),
                "available_gb": round(mem_avail_kb / 1024 / 1024, 1),
                "used_pct": mem_used_pct,
            },
            "disks": disks,
        },
    }
