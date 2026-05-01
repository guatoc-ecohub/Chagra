"""render.py — server-side PNG rendering del Oracle snapshot.

Para bot Telegram (sendPhoto) + Home Assistant Lovelace picture card +
modos cinema/proyector que necesitan imagen estática.

Stack: matplotlib backend Agg (no DISPLAY), numpy mínimo.
Output: PNG con paleta oficial Guatoc (cyan #0E92A6 + navy #0a0e14).
"""
from __future__ import annotations

import io
import logging
from datetime import datetime
from typing import Any

import matplotlib

matplotlib.use("Agg")  # Backend non-interactive, no DISPLAY needed
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

log = logging.getLogger(__name__)

# Paleta oficial Guatoc
COLOR_BG = "#0a0e14"
COLOR_PANEL = "#111824"
COLOR_BORDER = "#1a3a4a"
COLOR_FG = "#e6edf3"
COLOR_FG_DIM = "#8b9cab"
COLOR_CYAN = "#0E92A6"
COLOR_CYAN_GLOW = "#4ED4E5"
COLOR_MINT = "#B5D9D2"
COLOR_LIMA = "#7BB541"
COLOR_OK = "#22c55e"
COLOR_WARN = "#f59e0b"
COLOR_ERR = "#ef4444"

WEATHER_EMOJI = {
    0: "Despejado", 1: "Mayormente claro", 2: "Parc. nublado", 3: "Nublado",
    45: "Niebla", 48: "Niebla escarcha",
    51: "Llovizna", 53: "Llovizna", 55: "Llovizna densa",
    61: "Lluvia leve", 63: "Lluvia mod.", 65: "Lluvia fuerte",
    80: "Aguacero", 81: "Aguacero", 82: "Aguacero violento",
    95: "Tormenta",
}


def _status_color(status: str) -> str:
    return {"ok": COLOR_OK, "error": COLOR_ERR, "no_data": COLOR_FG_DIM}.get(
        status, COLOR_FG_DIM
    )


def _safe_get(d: dict, *keys, default=None):
    """Navigation segura por dict anidado."""
    for k in keys:
        if not isinstance(d, dict):
            return default
        d = d.get(k, default)
    return d


def render_snapshot_png(
    snapshot: dict[str, Any],
    width: int = 1200,
    height: int = 800,
    title: str = "Oracle · Guatoc",
) -> bytes:
    """Genera PNG del snapshot. Retorna bytes raw para envío directo.

    Layout 4 cards en grid 2x2:
      [Clima Choachí]   [FarmOS]
      [HA Sensores]     [Sistema/Git]
    """
    dpi = 100
    fig, axes = plt.subplots(
        2, 2,
        figsize=(width / dpi, height / dpi),
        dpi=dpi,
        facecolor=COLOR_BG,
    )
    fig.suptitle(
        title,
        color=COLOR_CYAN,
        fontsize=18,
        fontweight="bold",
        y=0.97,
    )

    # Footer timestamp
    ts = snapshot.get("timestamp", datetime.utcnow().isoformat())
    try:
        ts_human = datetime.fromisoformat(ts.replace("Z", "+00:00")).strftime("%Y-%m-%d %H:%M:%S")
    except (ValueError, AttributeError):
        ts_human = ts
    fig.text(
        0.5, 0.02,
        f"Sincronizado · {ts_human} · Tailscale-only",
        ha="center", color=COLOR_FG_DIM, fontsize=9,
    )

    providers = snapshot.get("providers", {})

    # Card 1: Clima Choachí
    _render_weather_card(axes[0, 0], providers.get("openmeteo", {}))

    # Card 2: FarmOS
    _render_farmos_card(axes[0, 1], providers.get("farmos", {}))

    # Card 3: Home Assistant
    _render_ha_card(axes[1, 0], providers.get("home_assistant", {}))

    # Card 4: Sistema (git_activity + ollama combined)
    _render_system_card(axes[1, 1], providers)

    plt.tight_layout(rect=[0, 0.04, 1, 0.94])

    buf = io.BytesIO()
    fig.savefig(
        buf, format="png", facecolor=COLOR_BG, edgecolor="none",
        bbox_inches="tight", pad_inches=0.3,
    )
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def _setup_card(ax, title: str, status: str = "ok"):
    """Aplica el styling base de una card."""
    ax.set_facecolor(COLOR_PANEL)
    for spine in ax.spines.values():
        spine.set_edgecolor(COLOR_BORDER)
        spine.set_linewidth(1.5)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    # Title bar
    ax.text(
        0.05, 0.92, title.upper(),
        color=COLOR_FG_DIM, fontsize=9, fontweight="bold",
        transform=ax.transAxes, family="monospace",
    )
    # Status badge
    ax.text(
        0.95, 0.92, status,
        color=_status_color(status), fontsize=8, fontweight="bold",
        transform=ax.transAxes, ha="right", family="monospace",
    )


def _render_weather_card(ax, p: dict):
    status = p.get("status", "no_data")
    _setup_card(ax, "Clima Choachí · 1923 msnm", status)
    if status != "ok":
        ax.text(0.5, 0.5, p.get("error", "no data"),
                ha="center", va="center", color=COLOR_FG_DIM, fontsize=10,
                transform=ax.transAxes, wrap=True)
        return
    c = _safe_get(p, "data", "current") or {}
    code = c.get("weather_code", 0)
    code_text = WEATHER_EMOJI.get(code, f"Código {code}")

    ax.text(0.5, 0.75, code_text, ha="center", va="center",
            color=COLOR_MINT, fontsize=14, transform=ax.transAxes)

    # 4 valores en grid 2x2
    cells = [
        (0.20, 0.50, f"{c.get('temperature_c', '—')}°", "Temperatura"),
        (0.60, 0.50, f"{c.get('humidity_pct', '—')}%", "Humedad"),
        (0.20, 0.20, f"{c.get('precipitation_mm', '—')} mm", "Lluvia"),
        (0.60, 0.20, f"{c.get('wind_kmh', '—')} km/h", "Viento"),
    ]
    for x, y, val, label in cells:
        ax.text(x, y, val, ha="left", color=COLOR_CYAN_GLOW,
                fontsize=20, fontweight="bold", transform=ax.transAxes)
        ax.text(x, y - 0.10, label.upper(), ha="left", color=COLOR_FG_DIM,
                fontsize=7, transform=ax.transAxes, family="monospace")


def _render_farmos_card(ax, p: dict):
    status = p.get("status", "no_data")
    _setup_card(ax, "FarmOS · Finca Guatoc", status)
    if status == "no_data":
        reason = _safe_get(p, "data", "reason") or "Token pendiente"
        ax.text(0.5, 0.5, reason, ha="center", va="center",
                color=COLOR_FG_DIM, fontsize=10, transform=ax.transAxes)
        return
    if status != "ok":
        ax.text(0.5, 0.5, p.get("error", "error"),
                ha="center", va="center", color=COLOR_ERR, fontsize=10,
                transform=ax.transAxes)
        return
    d = p.get("data", {})
    ax.text(0.5, 0.65, str(d.get("assets_active", "—")),
            ha="center", va="center", color=COLOR_CYAN_GLOW,
            fontsize=42, fontweight="bold", transform=ax.transAxes)
    ax.text(0.5, 0.50, "ASSETS ACTIVOS", ha="center",
            color=COLOR_FG_DIM, fontsize=9, transform=ax.transAxes,
            family="monospace")
    ax.text(0.5, 0.30, f"Logs últimos 7d: {d.get('logs_7d', '—')}",
            ha="center", color=COLOR_MINT, fontsize=10, transform=ax.transAxes)
    bundles = d.get("assets_by_bundle", {})
    if bundles:
        bundle_text = " · ".join(f"{k}={v}" for k, v in list(bundles.items())[:4])
        ax.text(0.5, 0.18, bundle_text, ha="center",
                color=COLOR_FG_DIM, fontsize=8, transform=ax.transAxes,
                family="monospace")


def _render_ha_card(ax, p: dict):
    status = p.get("status", "no_data")
    _setup_card(ax, "Home Assistant · IoT", status)
    if status == "no_data":
        reason = _safe_get(p, "data", "reason") or "Token HA pendiente"
        ax.text(0.5, 0.5, reason, ha="center", va="center",
                color=COLOR_FG_DIM, fontsize=10, transform=ax.transAxes)
        return
    if status != "ok":
        ax.text(0.5, 0.5, p.get("error", "error"),
                ha="center", va="center", color=COLOR_ERR, fontsize=10,
                transform=ax.transAxes)
        return
    d = p.get("data", {})
    ax.text(0.5, 0.78, str(d.get("matched_sensors", "—")),
            ha="center", va="center", color=COLOR_CYAN_GLOW,
            fontsize=36, fontweight="bold", transform=ax.transAxes)
    ax.text(0.5, 0.66, "SENSORES MATCHED", ha="center",
            color=COLOR_FG_DIM, fontsize=8, transform=ax.transAxes,
            family="monospace")
    sensors = d.get("sensors", [])[:4]
    y = 0.50
    for s in sensors:
        name = s.get("friendly_name") or s.get("entity_id", "?").replace("sensor.", "")
        val = s.get("state", "?")
        unit = s.get("unit", "") or ""
        ax.text(0.05, y, name[:35], color=COLOR_FG_DIM, fontsize=9,
                transform=ax.transAxes, family="monospace")
        ax.text(0.95, y, f"{val} {unit}", color=COLOR_MINT, fontsize=9,
                ha="right", transform=ax.transAxes, family="monospace")
        y -= 0.10


def _render_system_card(ax, providers: dict):
    """Card combinada con git activity + ollama (sistema general)."""
    _setup_card(ax, "Sistema · Git + Ollama", "ok")

    git = providers.get("git_activity", {})
    git_total = _safe_get(git, "data", "total_commits_7d") or 0
    ax.text(0.20, 0.78, str(git_total),
            ha="center", va="center", color=COLOR_LIMA,
            fontsize=32, fontweight="bold", transform=ax.transAxes)
    ax.text(0.20, 0.65, "COMMITS 7D", ha="center",
            color=COLOR_FG_DIM, fontsize=8, transform=ax.transAxes,
            family="monospace")

    # Por repo
    repos = _safe_get(git, "data", "repos") or {}
    y = 0.50
    for name, info in list(repos.items())[:4]:
        count = info.get("commits_7d", 0) if isinstance(info, dict) else 0
        ax.text(0.05, y, name[:18], color=COLOR_FG_DIM, fontsize=8,
                transform=ax.transAxes, family="monospace")
        ax.text(0.42, y, str(count), color=COLOR_MINT, fontsize=8,
                ha="right", transform=ax.transAxes, family="monospace")
        y -= 0.08

    # Ollama side
    ollama = providers.get("ollama", {})
    ollama_loaded = _safe_get(ollama, "data", "loaded_count") or 0
    ollama_total = _safe_get(ollama, "data", "models_total") or 0
    ax.text(0.75, 0.78, str(ollama_loaded),
            ha="center", va="center", color=COLOR_CYAN_GLOW,
            fontsize=32, fontweight="bold", transform=ax.transAxes)
    ax.text(0.75, 0.65, "OLLAMA CARGADOS", ha="center",
            color=COLOR_FG_DIM, fontsize=8, transform=ax.transAxes,
            family="monospace")
    ax.text(0.75, 0.55, f"de {ollama_total} totales", ha="center",
            color=COLOR_FG_DIM, fontsize=7, transform=ax.transAxes,
            family="monospace")

    loaded = _safe_get(ollama, "data", "loaded_now") or []
    y = 0.42
    for m in loaded[:3]:
        name = m.get("name", "?") if isinstance(m, dict) else "?"
        vram = m.get("vram_gb", 0) if isinstance(m, dict) else 0
        ax.text(0.55, y, name[:20], color=COLOR_FG_DIM, fontsize=8,
                transform=ax.transAxes, family="monospace")
        ax.text(0.95, y, f"{vram}GB", color=COLOR_MINT, fontsize=8,
                ha="right", transform=ax.transAxes, family="monospace")
        y -= 0.08
