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
 * Pulido 2026-07 (semáforo de confianza): comparte la anatomía visual .sello
 * de src/styles/sello-confianza.css con los demás badges del agente — lámpara
 * de color con ícono en negativo + etiqueta. El nivel del semáforo
 * (verde/ámbar/rojo/gris) sale del mismo mapeo de confianza de siempre; la
 * lógica NO cambió, solo la presentación. Los íconos siguen siendo SVG inline
 * (sin lucide) para que el badge no arrastre dependencias en pantallas
 * livianas (SpeciesSelect, demos).
 *
 * Confidence-weighted (#245 E2, 2026-05-28): si recibe `confidence` prop
 * (típicamente `message._grounded?.confidence` del LLM output), cambia
 * el color y el texto para que el usuario sepa qué tan confiable es la
 * respuesta SIN tener que hacer click en ningún lado:
 *   - >= 0.8 (alta confianza): verde + "verificado" + icono check.
 *   - 0.4-0.8 (media): ámbar + "probable" + icono info.
 *   - < 0.4 (baja): rojo + "verifica" + icono warning.
 *   - undefined: gris "beta" (default original — backwards compat).
 *
 * Props:
 *   - className: clases extra para ajustar margenes desde el call-site.
 *   - title:     override opcional del tooltip.
 *   - confidence: número 0..1. Si presente, cambia color/texto al nivel.
 */

function getLevel(confidence) {
    if (typeof confidence !== 'number' || isNaN(confidence)) return 'default';
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.4) return 'mid';
    return 'low';
}

const LEVEL_CONFIG = {
    default: {
        text: 'beta',
        nivel: 'gris',
        defaultTooltip: 'Respuesta generada por IA — verifica antes de actuar.',
        // Chispa IA: forma propia del nivel gris/beta (accesible sin color).
        icon: (
            <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M8 2.5 L9.4 6.6 L13.5 8 L9.4 9.4 L8 13.5 L6.6 9.4 L2.5 8 L6.6 6.6 Z" strokeLinejoin="round" />
            </svg>
        ),
    },
    high: {
        text: 'verificado',
        nivel: 'verde',
        defaultTooltip: 'Alta confianza — respaldado por el catálogo Chagra.',
        // SVG inline check (sin lucide para no inflar bundle del badge)
        icon: (
            <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <path d="M3 8 L7 12 L13 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
    mid: {
        text: 'probable',
        nivel: 'ambar',
        defaultTooltip: 'Confianza media — útil de referencia, contrasta con un técnico.',
        icon: (
            <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="8" cy="8" r="6" />
                <path d="M8 5 L8 9" strokeLinecap="round" />
                <circle cx="8" cy="11.5" r="0.8" fill="currentColor" stroke="none" />
            </svg>
        ),
    },
    low: {
        text: 'verifica',
        nivel: 'rojo',
        defaultTooltip: 'Baja confianza — respuesta generativa sin fuente clara. No actues sin verificar.',
        icon: (
            <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M8 2 L14 13 L2 13 Z" strokeLinejoin="round" />
                <path d="M8 7 L8 10" strokeLinecap="round" />
                <circle cx="8" cy="11.5" r="0.8" fill="currentColor" stroke="none" />
            </svg>
        ),
    },
};

export default function AIBetaBadge({ className = '', title, confidence }) {
    const level = getLevel(confidence);
    const cfg = LEVEL_CONFIG[level];
    const tooltip = title || cfg.defaultTooltip;

    return (
        <span
            data-testid="ai-beta-badge"
            data-confidence-level={level}
            data-nivel={cfg.nivel}
            role="note"
            aria-label={tooltip}
            title={tooltip}
            className={`sello sello-beta rounded-full ${className}`}
        >
            <span className="sello-lampara" aria-hidden="true">{cfg.icon}</span>
            <span className="sello-texto">{cfg.text}</span>
        </span>
    );
}
