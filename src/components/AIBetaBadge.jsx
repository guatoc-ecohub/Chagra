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
 * Confidence-weighted (#245 E2, 2026-05-28): si recibe `confidence` prop
 * (típicamente `message._grounded?.confidence` del LLM output), cambia
 * el color y el texto para que el usuario sepa qué tan confiable es la
 * respuesta SIN tener que hacer click en ningún lado:
 *   - >= 0.8 (alta confianza): verde + "verificado" + icono check.
 *   - 0.4-0.8 (media): ámbar + "probable" + icono info.
 *   - < 0.4 (baja): rojo + "verifica" + icono warning.
 *   - undefined: gris "beta" (default original — backwards compat).
 *
 * Operator 2026-05-28 03:50 COT: "no hiciste preguntas grandes supongo no
 * tienes asi que dame señal cuando puedas confirmar que vas a tener de sobra
 * para 10 horas de autopiloto extremo ya sabes q mejorar asi que adelante" —
 * confidence badges son la mejora más visible para que Free distinga
 * respuestas grounded vs generativas sin tener que abrir tooltip.
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
        classes: 'bg-slate-500/20 text-slate-400 border-slate-600/40',
        defaultTooltip: 'Respuesta generada por IA — verifica antes de actuar.',
        icon: null,
    },
    high: {
        text: 'verificado',
        classes: 'bg-emerald-500/20 text-emerald-300 border-emerald-600/40',
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
        classes: 'bg-amber-500/20 text-amber-300 border-amber-600/40',
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
        classes: 'bg-rose-500/20 text-rose-300 border-rose-600/40',
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
            role="note"
            aria-label={tooltip}
            title={tooltip}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-medium uppercase tracking-wide opacity-90 ${cfg.classes} ${className}`}
        >
            {cfg.icon}
            {cfg.text}
        </span>
    );
}
