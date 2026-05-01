"""lunar collector — fase actual + próxima ventana siembra (sin API).

Cálculo local sin red: fórmula astronómica clásica (Conway algorithm
para Julian Date → fase lunar).

Tradicional agricultura biodinámica (Steiner) sugiere ventanas:
  - Luna creciente (waxing): siembra de plantas que crecen sobre suelo
  - Luna menguante (waning): siembra de raíces, transplante, compost
  - Luna nueva: descanso, planificación
  - Luna llena: cosecha, biopreparados con máxima vitalidad

Este collector NO opina sobre la cientificidad de la creencia — solo
provee la información para que el operador decida.
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from typing import Any

# Lunar synodic month en días
SYNODIC_MONTH = 29.53058867
# Reference: 2000-01-06 18:14 UTC = Luna nueva conocida
KNOWN_NEW_MOON = datetime(2000, 1, 6, 18, 14, tzinfo=timezone.utc)


def _moon_age_days(when: datetime) -> float:
    """Días desde la última luna nueva (0 a SYNODIC_MONTH)."""
    delta = (when - KNOWN_NEW_MOON).total_seconds() / 86400.0
    return delta % SYNODIC_MONTH


def _phase_name(age_days: float) -> str:
    """Nombre de la fase basado en edad lunar."""
    if age_days < 1.0:
        return "Luna nueva"
    if age_days < 7.4:
        return "Creciente cóncava"
    if age_days < 8.4:
        return "Cuarto creciente"
    if age_days < 14.0:
        return "Creciente convexa (gibosa)"
    if age_days < 15.5:
        return "Luna llena"
    if age_days < 21.5:
        return "Menguante convexa (gibosa)"
    if age_days < 22.5:
        return "Cuarto menguante"
    return "Menguante cóncava"


def _illumination_pct(age_days: float) -> float:
    """% iluminada de la cara visible."""
    angle = 2 * math.pi * age_days / SYNODIC_MONTH
    return round((1 - math.cos(angle)) / 2 * 100, 1)


def _next_new_moon(when: datetime, age: float) -> datetime:
    days_until = SYNODIC_MONTH - age
    return when + timedelta(days=days_until)


def _next_full_moon(when: datetime, age: float) -> datetime:
    half = SYNODIC_MONTH / 2
    if age < half:
        days_until = half - age
    else:
        days_until = SYNODIC_MONTH - age + half
    return when + timedelta(days=days_until)


def _planting_recommendation(phase: str) -> str:
    """Recomendación tradicional biodinámica (no científicamente validada)."""
    if "creciente" in phase.lower() and "menguante" not in phase.lower():
        return "Sembrar especies que producen sobre el suelo (frutos, hojas)"
    if "menguante" in phase.lower():
        return "Sembrar raíces, transplantar, hacer compost, podar"
    if "nueva" in phase.lower():
        return "Descanso del suelo. Día propicio para planificación"
    if "llena" in phase.lower():
        return "Cosecha óptima. Biopreparados con máxima vitalidad"
    return "Ventana neutra"


async def fetch() -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    age = _moon_age_days(now)
    phase = _phase_name(age)
    illum = _illumination_pct(age)
    next_new = _next_new_moon(now, age)
    next_full = _next_full_moon(now, age)
    return {
        "status": "ok",
        "data": {
            "phase": phase,
            "age_days": round(age, 1),
            "illumination_pct": illum,
            "next_new_moon": next_new.isoformat(),
            "next_full_moon": next_full.isoformat(),
            "days_until_new": round((next_new - now).total_seconds() / 86400.0, 1),
            "days_until_full": round((next_full - now).total_seconds() / 86400.0, 1),
            "recommendation": _planting_recommendation(phase),
            "tradition_note": (
                "Recomendaciones biodinámicas (Steiner). NO son ciencia "
                "agronómica validada — provistas como referencia cultural."
            ),
        },
    }
