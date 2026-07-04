/**
 * themeIcon.jsx — Íconos del tema compartidos entre AgentHero y TopBar
 *
 * Extrae THEME_ICON y iconForTheme de AgentHero.jsx para evitar import
 * circular (TopBar → AgentHero es ruta crítica de bundle).
 *
 * Los 3 SVG son versiones marca de los demos:
 *   - nature: manos + frailejón (Espeletia), acento tierra
 *   - biopunk: la Ⓐ DE HERRAMIENTAS DE CAMPO — iteración RECUPERADA
 *     (Chagra-strategy/ops/icon-explorations/animada-refinada-grunge2.html,
 *     "ANIM-2 Refinada · Forja", 2026-06-06): círculo anarquía + pata
 *     izquierda = AZADÓN (cabeza perpendicular al mango, filo rojo) + pata
 *     derecha = RASTRILLO (travesaño + 5 dientes) + travesaño = MACHETE
 *     (hoja curva + punta). Versión 28px engrosada (legible en cabecera).
 *     Las clases `aforge`/`aforge-fill` activan la animación de forja
 *     one-shot (stroke-dashoffset) definida en index.css.
 *   - minimalista: círculo + brote-horqueta monoline, acento verde sobrio
 *   - verde-vivo: SOL-MANO radial de la finca viva — hojas frondosas que
 *     irradian de un centro solar cálido (identidad Chagra: mano radial +
 *     solar/soberanía). Verde-hoja vivo + sol/ocre cálido. rsvg-safe.
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
    // Bio-punk — la Ⓐ de HERRAMIENTAS DE CAMPO (iteración recuperada,
    // "ANIM-2 Refinada": azadón + rastrillo + machete + círculo anarquía,
    // rojinegro punk). Geometría 1:1 de la exploración del operador; trazos
    // de la versión 28px (engrosados) para que lea a tamaño de marca/botón.
    biopunk: (
        <svg viewBox="0 0 100 108" fill="none" width="100%" height="100%" aria-hidden="true">
            {/* Círculo anarquía */}
            <circle
                className="aforge" cx="50" cy="55" r="41" stroke="#c0392b" strokeWidth="5.5"
                style={{ '--sd': 290 }}
            />
            {/* AZADÓN — pata izquierda: mango + cabeza PERPENDICULAR + filo */}
            <g data-tool="azadon">
                <line
                    className="aforge" x1="28" y1="100" x2="46" y2="22"
                    stroke="#c0392b" strokeWidth="6" strokeLinecap="round"
                    style={{ '--sd': 96, '--fd': '.18s' }}
                />
                <polygon className="aforge-fill" points="34,18 58,24 60,29 36,23" fill="#5a0000" style={{ '--fd': '.26s' }} />
                <path
                    className="aforge" d="M34 18 L58 24 L60 29 L36 23 Z"
                    stroke="#e74c3c" strokeWidth="3" strokeLinejoin="round"
                    style={{ '--sd': 55, '--fd': '.28s' }}
                />
                <line
                    className="aforge" x1="36" y1="23" x2="60" y2="29"
                    stroke="#ff6060" strokeWidth="4" strokeLinecap="round"
                    style={{ '--sd': 32, '--fd': '.34s' }}
                />
            </g>
            {/* RASTRILLO — pata derecha: mango + travesaño + 5 dientes */}
            <g data-tool="rastrillo">
                <line
                    className="aforge" x1="73" y1="100" x2="54" y2="18"
                    stroke="#c0392b" strokeWidth="5.5" strokeLinecap="round"
                    style={{ '--sd': 90, '--fd': '.4s' }}
                />
                <path
                    className="aforge" d="M44 20 C51 17 58 15 65 14"
                    stroke="#e74c3c" strokeWidth="4.5" strokeLinecap="round"
                    style={{ '--sd': 26, '--fd': '.48s' }}
                />
                <line className="aforge" x1="45" y1="20" x2="44" y2="9" stroke="#e74c3c" strokeWidth="3.5" strokeLinecap="round" style={{ '--sd': 14, '--fd': '.52s' }} />
                <line className="aforge" x1="49" y1="19" x2="48.5" y2="8" stroke="#ff6060" strokeWidth="3" strokeLinecap="round" style={{ '--sd': 14, '--fd': '.55s' }} />
                <line className="aforge" x1="53" y1="18" x2="53" y2="7.5" stroke="#e74c3c" strokeWidth="3.5" strokeLinecap="round" style={{ '--sd': 14, '--fd': '.58s' }} />
                <line className="aforge" x1="57" y1="17" x2="57.5" y2="7" stroke="#ff6060" strokeWidth="3" strokeLinecap="round" style={{ '--sd': 14, '--fd': '.61s' }} />
                <line className="aforge" x1="61" y1="16" x2="62" y2="7.5" stroke="#e74c3c" strokeWidth="3.5" strokeLinecap="round" style={{ '--sd': 14, '--fd': '.64s' }} />
            </g>
            {/* MACHETE — travesaño: hoja curva + filo rojo sangre + punta */}
            <g data-tool="machete">
                <path
                    className="aforge-fill"
                    d="M21 62 C36 57 56 58 70 61 C76 62 80 65 83 67 C78 69 64 68 50 66 C36 64 21 68 21 69Z"
                    fill="#4a0a00" style={{ '--fd': '.7s' }}
                />
                <path
                    className="aforge" d="M21 62 C36 57 58 58 70 61 C76 62 81 65 84 67"
                    stroke="#e74c3c" strokeWidth="4" strokeLinecap="round"
                    style={{ '--sd': 85, '--fd': '.74s' }}
                />
                <path className="aforge-fill" d="M81 65 L93 62 L90 69 L80 70Z" fill="#c0392b" style={{ '--fd': '.78s' }} />
            </g>
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
    // Verde Vivo — SOL-MANO radial de la finca viva: hojas frondosas que
    // irradian de un centro solar cálido (mano de Chagra + solar/soberanía).
    // Verde-hoja vivo (#2e8b3d/#3fae54) + sol/ocre cálido (#e0922e/#f2b441).
    'verde-vivo': (
        <svg viewBox="0 0 120 120" fill="none" width="100%" height="100%" aria-hidden="true">
            {/* sol cálido central (centro de la mano radial) */}
            <circle cx="60" cy="60" r="15" fill="#f2b441" />
            <circle cx="60" cy="60" r="9.5" fill="#e0922e" />
            {/* hojas frondosas que irradian del centro — la "mano" de la finca */}
            <g fill="#2e8b3d">
                {/* arriba */}
                <path d="M60 50 C52 38 53 22 60 12 C67 22 68 38 60 50 Z" />
                {/* arriba-derecha */}
                <path d="M68 54 C77 46 91 42 104 44 C97 55 84 62 71 60 Z" />
                {/* abajo-derecha */}
                <path d="M67 67 C78 70 90 80 95 92 C82 92 70 85 63 74 Z" />
                {/* abajo-izquierda */}
                <path d="M53 67 C42 70 30 80 25 92 C38 92 50 85 57 74 Z" />
                {/* arriba-izquierda */}
                <path d="M52 54 C43 46 29 42 16 44 C23 55 36 62 49 60 Z" />
            </g>
            {/* nervaduras vivas (verde claro) sobre las hojas */}
            <g stroke="#bdf38a" strokeWidth="2.4" strokeLinecap="round" opacity="0.85">
                <path d="M60 46 V18" />
                <path d="M70 56 L98 47" />
                <path d="M64 70 L90 88" />
                <path d="M56 70 L30 88" />
                <path d="M50 56 L22 47" />
            </g>
        </svg>
    ),
};

// biopunk2 (split GO-LIVE 2026-07-04) comparte la MARCA biopunk (la misma Ⓐ
// de herramientas de campo): solo difieren en la escena del home finca viva.
THEME_ICON.biopunk2 = THEME_ICON.biopunk;

/**
 * Resuelve el ícono efectivo del tema (con fallback para `auto`/desconocidos).
 * `auto` cae al ícono biopunk (su estética base / default de la app).
 *
 * @param {string} theme - 'nature' | 'biopunk' | 'biopunk2' | 'minimalista' | 'auto'
 * @returns {React.ReactNode}
 */
export function iconForTheme(theme) {
    return THEME_ICON[theme] || THEME_ICON.biopunk;
}
