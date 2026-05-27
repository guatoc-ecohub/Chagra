import React from 'react';

/**
 * AIBetaBadge — pill discreto que marca cualquier respuesta o sugerencia
 * generada por IA dentro de la PWA (chat del agente, identificación por foto,
 * sugerencias del catálogo, etc.).
 *
 * Decisión UX-1 (issue #284): comunicar de forma persistente y sin friccionar
 * la lectura que el contenido proviene de un modelo generativo y debe
 * verificarse antes de actuar sobre el cultivo. NO reemplaza a SourceBadge
 * (que indica si la respuesta fue grounded contra el catálogo); convive con
 * él porque cubre una dimensión distinta — "esto es IA, no oráculo".
 *
 * Diseño:
 *   - Texto 10px-11px, opacidad media para no competir con el contenido.
 *   - Pill gris pálido (slate-500/30) coherente con el design system Chagra.
 *   - Tooltip `title` HTML nativo → mobile-friendly via long-press / tap en
 *     navegadores que lo soportan (iOS Safari ≥16, Chrome móvil).
 *   - aria-label para lectores de pantalla.
 *
 * Props:
 *   - className: clases extra para ajustar margenes desde el call-site.
 *   - title:     override opcional del tooltip por si un call-site necesita
 *                un copy más específico (e.g. "Identificación generativa…").
 */
export default function AIBetaBadge({ className = '', title }) {
  const tooltip = title || 'Respuesta generada por IA — verifica antes de actuar.';
  return (
    <span
      data-testid="ai-beta-badge"
      role="note"
      aria-label={tooltip}
      title={tooltip}
      className={`inline-flex items-center px-1.5 py-0.5 rounded-full bg-slate-500/20 text-slate-400 border border-slate-600/40 text-[10px] font-medium uppercase tracking-wide opacity-80 ${className}`}
    >
      beta
    </span>
  );
}
