import React from 'react';
import AltitudeBadge from './AltitudeBadge';
import SkyBadge from './common/SkyBadge';

/**
 * EnvironmentalCard — card colapsable con info ambiental (DR-030 QW2).
 *
 * Reúne los badges que vivían inline en el header del DashboardView
 * (AltitudeBadge + SkyBadge) en una card aparte expandible bajo el TopBar.
 * Razón: la info ambiental (msnm/fase lunar/horas solares) es contexto
 * útil para el agrónomo experto pero ruido para el operador 0-contexto.
 * Progressive disclosure: oculta por default, expand on demand.
 *
 * Refs:
 *   - Decisión: deepresearch/chagra-ux/decisions/ux-clarity-2026-05.md (D2)
 */
export default function EnvironmentalCard() {
  return (
    <section
      aria-label="Información ambiental: altitud y efemérides"
      className="w-full px-4 py-3 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center gap-3"
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
  );
}
