import React from 'react';
import AltitudeBadge from './AltitudeBadge';
import SkyBadge from './common/SkyBadge';
import PestMonitoringWindow from './PestMonitoringWindow';

/**
 * EnvironmentalCard — card colapsable con info ambiental (DR-030 QW2).
 *
 * Reúne los badges que vivían inline en el header del DashboardView
 * (AltitudeBadge + SkyBadge) en una card aparte expandible bajo el TopBar.
 * Razón: la info ambiental (msnm/fase lunar/horas solares) es contexto
 * útil para el agrónomo experto pero ruido para el operador 0-contexto.
 * Progressive disclosure: oculta por default, expand on demand.
 *
 * En ventana de luna nueva ± 3 días renderiza también PestMonitoringWindow
 * (feature C.1 ADR-033 — Yela & Holyoak 1997). Fuera de esa ventana,
 * el componente devuelve null y no aparece — sin polución visual.
 *
 * Refs:
 *   - Decisión UX: deepresearch/chagra-ux/decisions/ux-clarity-2026-05.md (D2)
 *   - Política lunar: ADR-033 Opción C estricta
 */
export default function EnvironmentalCard() {
  return (
    <div className="w-full bg-slate-900/60 border-b border-slate-800">
      <section
        aria-label="Información ambiental: altitud y efemérides"
        className="px-4 py-3 flex flex-wrap items-center gap-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Altitud</span>
          <AltitudeBadge />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Cielo</span>
          <SkyBadge />
        </div>
      </section>
      <PestMonitoringWindow />
    </div>
  );
}
