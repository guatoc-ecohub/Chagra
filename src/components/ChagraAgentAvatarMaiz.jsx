import React from 'react';

/**
 * ChagraAgentAvatarMaiz — planta de maíz como avatar IA alternativo.
 *
 * Operator decisión 2026-05-27: dar opción al usuario en Personalización
 * para cambiar el colibrí por una planta de maíz. Mismo set de props,
 * mismos estados, mismo viewBox 200x200 para drop-in replacement.
 *
 * Composición:
 *   - Tierra/suelo en la base.
 *   - Tallo central vertical con nudos visibles.
 *   - 4 hojas largas alternadas (2 a cada lado) en V invertida amplia.
 *   - Mazorca lateral derecha con barbas (estigmas) doradas asomando.
 *   - Espiga apical (panocha) en la copa con flores masculinas.
 *
 * Estados:
 *   - `idle`: brisa suave, hojas oscilan ~2.5s
 *   - `thinking`: barbas de la mazorca ondulan ~0.8s (polinización pensativa)
 *   - `speaking`: hojas oscilan ~0.8s + panocha vibra (planta hablando con el viento)
 *   - `listening`: planta se inclina lateralmente, barbas erguidas
 *
 * Mismas props que ChagraAgentAvatarColibri (drop-in compatible).
 */

const STATE_LABEL = {
    idle: 'Chagra IA',
    thinking: 'Chagra IA · pensando',
    speaking: 'Chagra IA · hablando',
    listening: 'Chagra IA · escuchando',
};

const STATE_TONE_TEXT = {
    idle: 'text-emerald-300',
    thinking: 'text-amber-200',
    speaking: 'text-cyan-200',
    listening: 'text-fuchsia-200',
};

export default function ChagraAgentAvatarMaiz({
    state = 'idle',
    size = 56,
    withLabel = false,
    onClick = undefined,
    onDoubleClick = undefined,
    glow = false,
    className = '',
    ariaLabel,
}) {
    const tone = STATE_TONE_TEXT[state] || STATE_TONE_TEXT.idle;
    const label = STATE_LABEL[state] || STATE_LABEL.idle;
    const interactive = typeof onClick === 'function' || typeof onDoubleClick === 'function';
    const uid = React.useId();

    const content = (
        <div className={`relative inline-flex items-center justify-center ${className}`}>
            <svg
                viewBox="0 0 200 200"
                width={size}
                height={size}
                className={`chagra-agent-avatar chagra-maiz chagra-state-${state}${glow ? ' chagra-glow' : ''}`}
                role="img"
                aria-label={ariaLabel || label}
            >
                <defs>
                    {/* Hojas del maíz: verde lima → verde profundo */}
                    <linearGradient id={`hoja-maiz-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#a3e635" />
                        <stop offset="50%" stopColor="#65a30d" />
                        <stop offset="100%" stopColor="#3f6212" />
                    </linearGradient>
                    {/* Tallo: verde claro a marrón en la base */}
                    <linearGradient id={`tallo-maiz-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#84cc16" />
                        <stop offset="70%" stopColor="#65a30d" />
                        <stop offset="100%" stopColor="#52525b" />
                    </linearGradient>
                    {/* Mazorca: amarillo dorado con depth */}
                    <linearGradient id={`mazorca-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="50%" stopColor="#facc15" />
                        <stop offset="100%" stopColor="#a16207" />
                    </linearGradient>
                    {/* Barbas/estigmas: dorado claro */}
                    <linearGradient id={`barbas-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#dc2626" />
                    </linearGradient>
                    {/* Panocha (espiga apical) — dorado pálido */}
                    <linearGradient id={`panocha-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fef9c3" />
                        <stop offset="100%" stopColor="#a3a3a3" />
                    </linearGradient>
                    {/* Glow sutil bajo la planta */}
                    <radialGradient id={`glow-maiz-${uid}`} cx="50%" cy="80%" r="50%">
                        <stop offset="0%" stopColor="#84cc16" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#84cc16" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* Halo de fondo */}
                <circle cx="100" cy="120" r="92" fill={`url(#glow-maiz-${uid})`} className="chagra-halo" />

                {/* SUELO con surco */}
                <ellipse cx="100" cy="180" rx="50" ry="8" fill="#78350f" opacity="0.6" />
                <ellipse cx="100" cy="180" rx="40" ry="4" fill="#451a03" opacity="0.5" />

                {/* PLANTA — todo el grupo se inclina en estado listening */}
                <g className="chagra-planta-maiz" style={{ transformOrigin: '100px 180px' }}>
                    {/* TALLO central con nudos */}
                    <path
                        d="M 100 178 Q 99 130 100 80 Q 101 50 100 28"
                        fill="none"
                        stroke={`url(#tallo-maiz-${uid})`}
                        strokeWidth="4.5"
                        strokeLinecap="round"
                    />
                    {/* Nudos del tallo (~3) */}
                    <ellipse cx="100" cy="150" rx="3.2" ry="1.5" fill="#3f6212" />
                    <ellipse cx="100" cy="110" rx="3" ry="1.4" fill="#3f6212" />
                    <ellipse cx="100" cy="75" rx="2.8" ry="1.3" fill="#3f6212" />

                    {/* HOJA inferior IZQ */}
                    <g className="chagra-hoja chagra-hoja-1" style={{ transformOrigin: '100px 150px' }}>
                        <path
                            d="M 100 150
                               Q 70 145 35 155
                               Q 50 162 70 158
                               Q 88 156 100 152 Z"
                            fill={`url(#hoja-maiz-${uid})`}
                        />
                        <path
                            d="M 100 150 Q 80 152 50 156"
                            fill="none"
                            stroke="#365314"
                            strokeWidth="0.7"
                            opacity="0.65"
                        />
                    </g>
                    {/* HOJA inferior DER */}
                    <g className="chagra-hoja chagra-hoja-2" style={{ transformOrigin: '100px 145px' }}>
                        <path
                            d="M 100 145
                               Q 130 140 165 150
                               Q 150 158 130 154
                               Q 112 151 100 148 Z"
                            fill={`url(#hoja-maiz-${uid})`}
                        />
                        <path
                            d="M 100 145 Q 120 147 150 151"
                            fill="none"
                            stroke="#365314"
                            strokeWidth="0.7"
                            opacity="0.65"
                        />
                    </g>
                    {/* HOJA media IZQ */}
                    <g className="chagra-hoja chagra-hoja-3" style={{ transformOrigin: '100px 105px' }}>
                        <path
                            d="M 100 105
                               Q 75 95 45 100
                               Q 58 110 78 108
                               Q 90 107 100 108 Z"
                            fill={`url(#hoja-maiz-${uid})`}
                            opacity="0.95"
                        />
                        <path
                            d="M 100 105 Q 82 102 55 102"
                            fill="none"
                            stroke="#365314"
                            strokeWidth="0.6"
                            opacity="0.6"
                        />
                    </g>
                    {/* HOJA media DER */}
                    <g className="chagra-hoja chagra-hoja-4" style={{ transformOrigin: '100px 100px' }}>
                        <path
                            d="M 100 100
                               Q 125 90 155 95
                               Q 142 105 122 103
                               Q 110 102 100 103 Z"
                            fill={`url(#hoja-maiz-${uid})`}
                            opacity="0.95"
                        />
                        <path
                            d="M 100 100 Q 118 97 145 97"
                            fill="none"
                            stroke="#365314"
                            strokeWidth="0.6"
                            opacity="0.6"
                        />
                    </g>

                    {/* MAZORCA lateral derecha (sale del nudo a 110) */}
                    <g className="chagra-mazorca" transform="translate(112 110)">
                        {/* envoltura/hojas que envuelven */}
                        <path
                            d="M -2 -2 Q 8 -3 18 0 Q 22 10 20 22 Q 12 30 0 28 Q -6 14 -2 -2 Z"
                            fill={`url(#hoja-maiz-${uid})`}
                            opacity="0.85"
                        />
                        {/* mazorca dorada visible */}
                        <ellipse cx="9" cy="10" rx="6" ry="14" fill={`url(#mazorca-${uid})`} />
                        {/* granos puntos en la mazorca */}
                        <circle cx="6" cy="6" r="1.2" fill="#a16207" opacity="0.6" />
                        <circle cx="11" cy="8" r="1.2" fill="#a16207" opacity="0.6" />
                        <circle cx="7" cy="11" r="1.2" fill="#a16207" opacity="0.6" />
                        <circle cx="12" cy="13" r="1.2" fill="#a16207" opacity="0.6" />
                        <circle cx="8" cy="16" r="1.2" fill="#a16207" opacity="0.6" />
                        <circle cx="13" cy="18" r="1.2" fill="#a16207" opacity="0.6" />
                        {/* BARBAS / cabello — estigmas que asoman arriba */}
                        <g className="chagra-barbas">
                            <path
                                d="M 6 -2 Q 4 -10 0 -16"
                                fill="none"
                                stroke={`url(#barbas-${uid})`}
                                strokeWidth="1.2"
                                strokeLinecap="round"
                            />
                            <path
                                d="M 9 -3 Q 9 -12 7 -20"
                                fill="none"
                                stroke={`url(#barbas-${uid})`}
                                strokeWidth="1.2"
                                strokeLinecap="round"
                            />
                            <path
                                d="M 12 -2 Q 14 -10 16 -18"
                                fill="none"
                                stroke={`url(#barbas-${uid})`}
                                strokeWidth="1.2"
                                strokeLinecap="round"
                            />
                            <path
                                d="M 14 -1 Q 18 -8 22 -14"
                                fill="none"
                                stroke={`url(#barbas-${uid})`}
                                strokeWidth="1"
                                strokeLinecap="round"
                                opacity="0.85"
                            />
                        </g>
                    </g>

                    {/* PANOCHA (espiga apical) en la copa */}
                    <g className="chagra-panocha" style={{ transformOrigin: '100px 28px' }}>
                        {/* eje central */}
                        <path
                            d="M 100 30 L 100 12"
                            stroke={`url(#panocha-${uid})`}
                            strokeWidth="2.2"
                            strokeLinecap="round"
                        />
                        {/* ramificaciones laterales (flores masculinas) */}
                        <path d="M 100 24 Q 92 20 88 14" fill="none" stroke={`url(#panocha-${uid})`} strokeWidth="1.2" strokeLinecap="round" />
                        <path d="M 100 22 Q 108 18 112 12" fill="none" stroke={`url(#panocha-${uid})`} strokeWidth="1.2" strokeLinecap="round" />
                        <path d="M 100 20 Q 95 14 92 8" fill="none" stroke={`url(#panocha-${uid})`} strokeWidth="1" strokeLinecap="round" />
                        <path d="M 100 18 Q 105 12 108 6" fill="none" stroke={`url(#panocha-${uid})`} strokeWidth="1" strokeLinecap="round" />
                        {/* polen/anteras */}
                        <circle cx="88" cy="14" r="1.3" fill="#facc15" />
                        <circle cx="112" cy="12" r="1.3" fill="#facc15" />
                        <circle cx="92" cy="8" r="1.1" fill="#fde68a" />
                        <circle cx="108" cy="6" r="1.1" fill="#fde68a" />
                        <circle cx="100" cy="11" r="1.4" fill="#fbbf24" />
                    </g>
                </g>

                <style>{`
                    .chagra-agent-avatar.chagra-maiz { display: block; }
                    .chagra-maiz .chagra-halo { animation: chagra-halo-pulse 4s ease-in-out infinite; }
                    @keyframes chagra-halo-pulse {
                        0%, 100% { opacity: 0.55; transform-origin: 100px 120px; transform: scale(1); }
                        50% { opacity: 0.85; transform: scale(1.03); }
                    }

                    /* IDLE — brisa suave en hojas */
                    .chagra-maiz.chagra-state-idle .chagra-hoja-1,
                    .chagra-maiz.chagra-state-idle .chagra-hoja-3 {
                        animation: chagra-hoja-sway-l 2.5s ease-in-out infinite;
                    }
                    .chagra-maiz.chagra-state-idle .chagra-hoja-2,
                    .chagra-maiz.chagra-state-idle .chagra-hoja-4 {
                        animation: chagra-hoja-sway-r 2.5s ease-in-out infinite;
                    }
                    @keyframes chagra-hoja-sway-l {
                        0%, 100% { transform: rotate(0deg); }
                        50% { transform: rotate(-2.5deg); }
                    }
                    @keyframes chagra-hoja-sway-r {
                        0%, 100% { transform: rotate(0deg); }
                        50% { transform: rotate(2.5deg); }
                    }

                    /* THINKING — barbas ondulando + planta atenta */
                    .chagra-maiz.chagra-state-thinking .chagra-barbas {
                        animation: chagra-barbas-wiggle 0.8s ease-in-out infinite;
                        transform-origin: 8px -2px;
                    }
                    @keyframes chagra-barbas-wiggle {
                        0%, 100% { transform: rotate(0deg); }
                        25% { transform: rotate(8deg); }
                        75% { transform: rotate(-8deg); }
                    }
                    .chagra-maiz.chagra-state-thinking .chagra-hoja-1,
                    .chagra-maiz.chagra-state-thinking .chagra-hoja-2,
                    .chagra-maiz.chagra-state-thinking .chagra-hoja-3,
                    .chagra-maiz.chagra-state-thinking .chagra-hoja-4 {
                        animation: chagra-hoja-think 1.2s ease-in-out infinite;
                    }
                    @keyframes chagra-hoja-think {
                        0%, 100% { transform: rotate(0deg); }
                        50% { transform: rotate(1.5deg); }
                    }

                    /* SPEAKING — hojas oscilan rápido + panocha vibra */
                    .chagra-maiz.chagra-state-speaking .chagra-hoja-1,
                    .chagra-maiz.chagra-state-speaking .chagra-hoja-3 {
                        animation: chagra-hoja-sway-l 0.8s ease-in-out infinite;
                    }
                    .chagra-maiz.chagra-state-speaking .chagra-hoja-2,
                    .chagra-maiz.chagra-state-speaking .chagra-hoja-4 {
                        animation: chagra-hoja-sway-r 0.8s ease-in-out infinite;
                    }
                    .chagra-maiz.chagra-state-speaking .chagra-panocha {
                        animation: chagra-panocha-vibrate 0.25s linear infinite;
                    }
                    @keyframes chagra-panocha-vibrate {
                        0%, 100% { transform: translate(0, 0); }
                        25% { transform: translate(-0.5px, 0); }
                        75% { transform: translate(0.5px, 0); }
                    }

                    /* LISTENING — planta inclinada lateralmente, barbas erguidas */
                    .chagra-maiz.chagra-state-listening .chagra-planta-maiz {
                        animation: chagra-planta-lean 3s ease-in-out infinite;
                    }
                    @keyframes chagra-planta-lean {
                        0%, 100% { transform: rotate(0deg); }
                        50% { transform: rotate(-3deg); }
                    }

                    /* Glow override cuando glow=true (respuesta lista) */
                    .chagra-maiz.chagra-glow .chagra-halo {
                        animation: chagra-glow-amber 1.5s ease-in-out infinite;
                    }
                    @keyframes chagra-glow-amber {
                        0%, 100% { filter: drop-shadow(0 0 4px #fbbf24); }
                        50% { filter: drop-shadow(0 0 12px #fbbf24); }
                    }

                    /* Reduced motion */
                    @media (prefers-reduced-motion: reduce) {
                        .chagra-agent-avatar.chagra-maiz * {
                            animation: none !important;
                        }
                        .chagra-agent-avatar.chagra-maiz.chagra-glow .chagra-halo {
                            animation: none !important;
                            filter: drop-shadow(0 0 6px #fbbf24);
                        }
                    }
                `}</style>
            </svg>
            {withLabel && (
                <span className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-medium whitespace-nowrap ${tone}`}>
                    {label}
                </span>
            )}
        </div>
    );

    if (interactive) {
        return (
            <button
                type="button"
                onClick={onClick}
                onDoubleClick={onDoubleClick}
                className="bg-transparent border-none p-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-full"
                aria-label={ariaLabel || label}
            >
                {content}
            </button>
        );
    }
    return content;
}
