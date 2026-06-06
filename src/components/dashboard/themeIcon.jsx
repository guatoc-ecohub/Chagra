/**
 * themeIcon.jsx — Íconos del tema compartidos entre AgentHero y TopBar
 *
 * Extrae THEME_ICON y iconForTheme de AgentHero.jsx para evitar import
 * circular (TopBar → AgentHero es ruta crítica de bundle).
 *
 * Los 3 SVG son versiones marca de los demos:
 *   - nature: manos + frailejón (Espeletia), acento tierra
 *   - biopunk: anillo eléctrico + A (azadón + rama) + travesaño zigzag
 *   - minimalista: círculo + brote-horqueta monoline, acento verde sobrio
 */

import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// ÍCONOS DEL TEMA — los 3 SVG (versión marca) de los demos.
// ─────────────────────────────────────────────────────────────────────────────
export const THEME_ICON = {
    // Nature — manos + frailejón (Espeletia), acento tierra.
    nature: (
        <svg viewBox="0 0 120 120" fill="none" width="100%" height="100%" aria-hidden="true">
            <path d="M18 100 Q38 78 60 88 Q82 78 102 100" stroke="#a8612f" strokeWidth="9" fill="none" strokeLinecap="round" />
            <line x1="60" y1="88" x2="60" y2="56" stroke="#7a8f4a" strokeWidth="8" strokeLinecap="round" />
            <path d="M60 64 q-16 -3 -20 -13 q15 -2 20 7 z" fill="#9cb06a" />
            <path d="M60 64 q16 -3 20 -13 q-15 -2 -20 7 z" fill="#9cb06a" />
            <g fill="#f5b733">
                <circle cx="60" cy="36" r="8" /><circle cx="72" cy="36" r="8" /><circle cx="48" cy="36" r="8" />
                <circle cx="60" cy="25" r="8" /><circle cx="60" cy="47" r="8" />
            </g>
            <circle cx="60" cy="36" r="6.5" fill="#d9742a" />
        </svg>
    ),
    // Bio-punk — anillo eléctrico + A (azadón + rama) + travesaño zigzag.
    biopunk: (
        <svg viewBox="0 0 120 120" fill="none" width="100%" height="100%" aria-hidden="true">
            <circle cx="60" cy="60" r="50" stroke="#19c79a" strokeWidth="7" />
            <line x1="60" y1="24" x2="34" y2="96" stroke="#f0a060" strokeWidth="9" strokeLinecap="round" />
            <line x1="60" y1="24" x2="86" y2="96" stroke="#3be8a6" strokeWidth="9" strokeLinecap="round" />
            <path d="M44 66 L52 60 L60 66 L68 60 L76 67" stroke="#19c79a" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    // Minimalista — círculo + brote-horqueta monoline, acento verde sobrio.
    minimalista: (
        <svg viewBox="0 0 120 120" fill="none" width="100%" height="100%" aria-hidden="true">
            <circle cx="60" cy="60" r="46" fill="none" stroke="#2b2b2b" strokeWidth="7" />
            <path d="M60 90 V58 M60 58 L44 40 M60 58 L76 40" fill="none" stroke="#2b2b2b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="44" cy="40" r="7" fill="#19a585" /><circle cx="76" cy="40" r="7" fill="#19a585" />
        </svg>
    ),
};

/**
 * Resuelve el ícono efectivo del tema (con fallback para `auto`/desconocidos).
 * `auto` cae al ícono biopunk (su estética base / default de la app).
 *
 * @param {string} theme - 'nature' | 'biopunk' | 'minimalista' | 'auto'
 * @returns {React.ReactNode}
 */
export function iconForTheme(theme) {
    return THEME_ICON[theme] || THEME_ICON.biopunk;
}
