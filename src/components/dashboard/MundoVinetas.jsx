/**
 * MundoVinetas — la ilustración propia de cada MUNDO de la finca.
 *
 * Cada viñeta es un LUGAR dibujado a mano en vector (mismo lenguaje que los
 * place-svg de los 4 portales del hero): horizonte + tierra + UN foco propio.
 * Sin <text> con emoji dentro del SVG (Android/iOS viejos los renderizan
 * monocromos o vacíos), sin filtros ni foreignObject (rsvg-safe), sin motor
 * de animación — el movimiento lo pone el CSS (y respeta reduced-motion).
 *
 * Todas comparten viewBox 180×90 y `preserveAspectRatio="xMidYMid slice"` para
 * comportarse como banda de tarjeta y como cabecera de la pantalla de mundo.
 */

const SVG_PROPS = {
    className: 'mf-vineta-svg',
    viewBox: '0 0 180 90',
    preserveAspectRatio: 'xMidYMid slice',
    'aria-hidden': true,
};

/** 🌾 Cultivos y semillas — surcos con milpa joven, sol de mañana. */
function VinetaCultivos() {
    return (
        <svg {...SVG_PROPS}>
            <rect width="180" height="90" fill="#dcedc9" />
            <circle cx="150" cy="18" r="11" fill="#ffe08a" />
            <circle cx="150" cy="18" r="6.5" fill="#fff3c4" />
            <path d="M-4 44 Q46 26 92 40 T184 36 V90 H-4 Z" fill="#9bc172" />
            <path d="M-4 58 Q60 44 120 56 T184 52 V90 H-4 Z" fill="#6fa356" />
            {/* surcos en perspectiva */}
            <g stroke="#4c7a3d" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".55">
                <path d="M18 90 L52 60" /><path d="M56 90 L78 60" />
                <path d="M96 90 L104 60" /><path d="M136 90 L130 60" /><path d="M170 90 L154 60" />
            </g>
            {/* matas de maíz jóvenes */}
            <g stroke="#2f6b3a" strokeWidth="2.6" strokeLinecap="round" fill="none">
                <g><path d="M64 74 v-16" /><path d="M64 66 q-7 -3 -10 -9" /><path d="M64 62 q7 -3 10 -9" /></g>
                <g><path d="M112 70 v-14" /><path d="M112 64 q-6 -3 -9 -8" /><path d="M112 60 q6 -3 9 -8" /></g>
            </g>
            {/* semilla germinando en primer plano */}
            <g transform="translate(30 68)">
                <ellipse cx="0" cy="8" rx="7" ry="4.6" fill="#8a5a38" />
                <path d="M0 6 v-8" stroke="#5a9e4b" strokeWidth="2.4" strokeLinecap="round" fill="none" />
                <path d="M0 -2 q-5 -2 -6 -7" stroke="#5a9e4b" strokeWidth="2.4" strokeLinecap="round" fill="none" />
                <path d="M0 -2 q5 -2 6 -7" stroke="#5a9e4b" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            </g>
        </svg>
    );
}

/** 🌱 El suelo vivo — corte de tierra en capas con raíces y lombriz. */
function VinetaSuelo() {
    return (
        <svg {...SVG_PROPS}>
            <rect width="180" height="90" fill="#f0e2c8" />
            {/* mata arriba del corte */}
            <g stroke="#3f8f4e" strokeWidth="2.6" strokeLinecap="round" fill="none">
                <path d="M92 26 v-12" /><path d="M92 20 q-8 -2 -11 -9" /><path d="M92 17 q8 -2 11 -9" />
            </g>
            {/* capas del suelo */}
            <path d="M0 26 H180 V44 H0 Z" fill="#7a5230" />
            <path d="M0 44 H180 V64 H0 Z" fill="#8a5a38" />
            <path d="M0 64 H180 V90 H0 Z" fill="#a0764a" />
            <path d="M0 26 H180 V30 H0 Z" fill="#4c7a3d" />
            {/* raíces que bajan */}
            <g stroke="#e8d3ae" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".85">
                <path d="M92 28 q-3 10 -10 16 q-5 5 -6 12" />
                <path d="M92 28 q2 12 9 18 q5 5 5 11" />
                <path d="M92 28 q0 14 -2 24" />
            </g>
            {/* piedras y poros */}
            <g fill="#6b4626" opacity=".8">
                <ellipse cx="30" cy="52" rx="4" ry="2.6" /><ellipse cx="150" cy="38" rx="3.4" ry="2.2" />
                <ellipse cx="52" cy="76" rx="4.6" ry="3" /><ellipse cx="128" cy="72" rx="3.6" ry="2.4" />
            </g>
            {/* lombriz feliz (suelo vivo) */}
            <path d="M20 68 q6 -6 12 0 t12 0 t12 0" stroke="#d98a7a" strokeWidth="4.6" strokeLinecap="round" fill="none" />
            <circle cx="57.5" cy="67" r="1.2" fill="#5a2e22" />
        </svg>
    );
}

/** 💧 El agua — quebrada, tanque de cosecha de lluvia y gotas. */
function VinetaAgua() {
    return (
        <svg {...SVG_PROPS}>
            <rect width="180" height="90" fill="#d7ecf3" />
            <path d="M-4 40 Q50 24 100 36 T184 32 V90 H-4 Z" fill="#8fbf80" />
            {/* quebrada que baja en curvas */}
            <path d="M96 30 Q78 46 96 58 T88 90 L118 90 Q104 70 120 58 T112 30 Z" fill="#5ab8d8" />
            <path d="M100 36 Q88 48 100 58 T96 82" stroke="#9fe3ee" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".8" />
            {/* tanque de lluvia con canaleta */}
            <g transform="translate(24 40)">
                <rect x="0" y="10" width="26" height="26" rx="4" fill="#3d7f9e" />
                <rect x="0" y="10" width="26" height="6" rx="3" fill="#2f6b86" />
                <path d="M-8 2 L30 -6" stroke="#8a5a38" strokeWidth="3.4" strokeLinecap="round" />
                <path d="M4 4 q-2 5 2 6" stroke="#9fe3ee" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            </g>
            {/* gotas de lluvia */}
            <g fill="#4e9dc0">
                <path d="M142 16 q4 6 0 9 q-4 -3 0 -9" /><path d="M158 28 q4 6 0 9 q-4 -3 0 -9" />
                <path d="M148 44 q4 6 0 9 q-4 -3 0 -9" />
            </g>
        </svg>
    );
}

/** 🐄 Del corral al abono — montón de compost humeante y carretilla. */
function VinetaAbono() {
    return (
        <svg {...SVG_PROPS}>
            <rect width="180" height="90" fill="#e9ecc9" />
            <path d="M-4 52 Q60 40 120 50 T184 48 V90 H-4 Z" fill="#9bb45a" />
            {/* cerca del corral */}
            <g stroke="#8a5a38" strokeWidth="3" strokeLinecap="round">
                <path d="M18 40 V58" /><path d="M42 38 V56" /><path d="M66 40 V58" />
                <path d="M12 46 H72" /><path d="M12 53 H72" />
            </g>
            {/* montón de compost con vapor */}
            <g transform="translate(112 30)">
                <path d="M-22 34 Q-16 8 4 6 Q26 8 30 34 Z" fill="#6b4626" />
                <path d="M-14 34 Q-8 16 4 14 Q18 16 22 34 Z" fill="#8a5a38" />
                <path d="M-4 10 q-3 -6 1 -9 q4 -3 1 -8" stroke="#f6f2e4" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".85" />
                <path d="M10 12 q-3 -5 1 -8" stroke="#f6f2e4" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity=".7" />
                {/* brote que nace del abono */}
                <path d="M26 30 v-7 m0 0 q-4 -1 -5 -6 m5 6 q4 -1 5 -6" stroke="#3f8f4e" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            </g>
            {/* carretilla */}
            <g transform="translate(42 64)">
                <path d="M0 0 L26 0 L21 10 L5 10 Z" fill="#c2562f" />
                <circle cx="13" cy="15" r="4.6" fill="#4a3527" />
                <circle cx="13" cy="15" r="1.8" fill="#e9ecc9" />
                <path d="M26 0 L34 -4" stroke="#7a5230" strokeWidth="2.8" strokeLinecap="round" />
                <ellipse cx="13" cy="-2" rx="9" ry="3.4" fill="#8a5a38" />
            </g>
        </svg>
    );
}

/** 🐞 Sanidad de la mata — hoja mordida, mariquita aliada y frasco de biopreparado. */
function VinetaSanidad() {
    return (
        <svg {...SVG_PROPS}>
            <rect width="180" height="90" fill="#f6ded1" />
            <path d="M-4 58 Q60 46 120 56 T184 52 V90 H-4 Z" fill="#8fae5f" />
            {/* mata con hoja mordida */}
            <g transform="translate(58 20)">
                <path d="M0 52 V16" stroke="#2f6b3a" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M0 30 Q-16 26 -20 12 Q-4 12 0 24 Z" fill="#5a9e4b" />
                {/* hoja mordida: borde con mordiscos */}
                <path d="M0 22 Q16 18 22 5 Q14 6 12 9 Q11 5 8 7 Q7 3 4 6 Q2 10 0 16 Z" fill="#5a9e4b" />
                <circle cx="16" cy="9" r="2" fill="#f6ded1" />
            </g>
            {/* mariquita (control biológico, la aliada) */}
            <g transform="translate(84 30)">
                <circle cx="0" cy="0" r="6.4" fill="#d94f30" />
                <path d="M0 -6.4 V6.4" stroke="#3a2418" strokeWidth="1.6" />
                <circle cx="0" cy="-6" r="2.6" fill="#3a2418" />
                <circle cx="-2.8" cy="-1" r="1.3" fill="#3a2418" /><circle cx="2.8" cy="1.6" r="1.3" fill="#3a2418" />
            </g>
            {/* frasco de biopreparado con atomizador */}
            <g transform="translate(126 44)">
                <rect x="0" y="8" width="20" height="26" rx="5" fill="#7fb069" />
                <rect x="3" y="14" width="14" height="14" rx="2.5" fill="#f6f2e4" />
                <path d="M6 20 h8 M6 24 h6" stroke="#7a5230" strokeWidth="1.8" strokeLinecap="round" />
                <rect x="4" y="0" width="9" height="8" rx="2" fill="#4c7a3d" />
                <path d="M13 3 h6" stroke="#4c7a3d" strokeWidth="3" strokeLinecap="round" />
                <g stroke="#6fb6d6" strokeWidth="2" strokeLinecap="round" opacity=".9">
                    <path d="M24 1 l4 -2" /><path d="M24 4 l5 0" /><path d="M24 7 l4 2" />
                </g>
            </g>
        </svg>
    );
}

/** ⛅ El clima — loma con nube de lluvia a un lado y sol al otro. */
function VinetaClima() {
    return (
        <svg {...SVG_PROPS}>
            <rect width="180" height="90" fill="#dce9f2" />
            <path d="M-4 60 Q56 40 116 56 T184 50 V90 H-4 Z" fill="#7fa968" />
            {/* sol despejado a la derecha */}
            <circle cx="140" cy="24" r="12" fill="#ffe08a" />
            <circle cx="140" cy="24" r="7" fill="#fff3c4" />
            <g stroke="#ffd24d" strokeWidth="2.6" strokeLinecap="round">
                <path d="M140 6 v-4" /><path d="M158 24 h4" /><path d="M153 11 l3 -3" /><path d="M153 37 l3 3" />
            </g>
            {/* nube con lluvia a la izquierda */}
            <g>
                <ellipse cx="44" cy="26" rx="20" ry="11" fill="#f3f6f4" />
                <ellipse cx="62" cy="30" rx="14" ry="9" fill="#e3ebe9" />
                <ellipse cx="30" cy="31" rx="12" ry="8" fill="#e3ebe9" />
                <g stroke="#4e7d9a" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M32 44 l-3 9" /><path d="M46 46 l-3 9" /><path d="M60 44 l-3 9" />
                </g>
            </g>
            {/* veleta en la loma */}
            <g transform="translate(94 48)" stroke="#7a5230" strokeWidth="2.6" strokeLinecap="round">
                <path d="M0 22 V0" />
                <path d="M0 2 L12 6 L0 10 Z" fill="#c2562f" stroke="none" />
            </g>
        </svg>
    );
}

/** 🐔 Los animales — gallina en primer plano, vaca al fondo, cerca. */
function VinetaAnimales() {
    return (
        <svg {...SVG_PROPS}>
            <rect width="180" height="90" fill="#f3e3cf" />
            <path d="M-4 52 Q60 40 120 50 T184 46 V90 H-4 Z" fill="#9bb45a" />
            {/* cerca */}
            <g stroke="#8a5a38" strokeWidth="2.8" strokeLinecap="round">
                <path d="M112 38 V58" /><path d="M136 36 V56" /><path d="M162 38 V58" />
                <path d="M106 44 H168" /><path d="M106 51 H168" />
            </g>
            {/* vaca al fondo (silueta simple con manchas) */}
            <g transform="translate(126 58)">
                <ellipse cx="0" cy="0" rx="14" ry="8" fill="#f6f2e4" />
                <circle cx="12" cy="-4" r="4.6" fill="#f6f2e4" />
                <ellipse cx="-4" cy="-1" rx="4.6" ry="3.4" fill="#4a3527" />
                <ellipse cx="5" cy="3" rx="3.4" ry="2.4" fill="#4a3527" />
                <g stroke="#e0d6c2" strokeWidth="2.6" strokeLinecap="round">
                    <path d="M-8 7 V14" /><path d="M6 7 V14" />
                </g>
            </g>
            {/* gallina protagonista */}
            <g transform="translate(48 56)">
                <ellipse cx="0" cy="0" rx="15" ry="11" fill="#c2562f" />
                <path d="M-14 -3 Q-22 -1 -24 5 Q-16 7 -11 3 Z" fill="#a8431f" />
                <circle cx="13" cy="-8" r="6.4" fill="#c2562f" />
                <path d="M13 -16 q1.6 -3.4 4 -1.6 q-1 2.4 -4 1.6" fill="#d94f30" />
                <path d="M19 -8 l5 2 l-5 2 Z" fill="#ffd24d" />
                <circle cx="14.5" cy="-9.5" r="1.4" fill="#2c1c12" />
                <g stroke="#ffd24d" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M-4 10 V17" /><path d="M5 10 V17" />
                </g>
                {/* pollito */}
                <circle cx="26" cy="12" r="4.6" fill="#ffd24d" />
                <circle cx="29" cy="9" r="3" fill="#ffd24d" />
                <circle cx="30" cy="8.4" r=".9" fill="#2c1c12" />
            </g>
        </svg>
    );
}

/** 🧺 Mercado y despensa — toldo de plaza, canasta y balanza. */
function VinetaMercado() {
    return (
        <svg {...SVG_PROPS}>
            <rect width="180" height="90" fill="#f7ecd2" />
            <path d="M-4 62 Q60 52 120 60 T184 56 V90 H-4 Z" fill="#c9b06a" opacity=".6" />
            {/* puesto con toldo */}
            <g transform="translate(96 8)">
                <path d="M-8 14 Q26 2 60 14 L56 26 Q26 16 -4 26 Z" fill="#c2562f" />
                <g fill="#f6f2e4">
                    <path d="M2 24 Q6 15 10 13 L14 12 Q10 16 8 25 Z" />
                    <path d="M22 20 Q26 12 30 11 L34 11 Q30 14 28 21 Z" />
                    <path d="M42 21 Q46 13 50 13 L54 14 Q50 17 48 24 Z" />
                </g>
                <rect x="0" y="26" width="4" height="38" fill="#8a5a38" />
                <rect x="48" y="26" width="4" height="38" fill="#8a5a38" />
                <rect x="-4" y="48" width="60" height="10" rx="3" fill="#a0764a" />
                {/* productos sobre la mesa */}
                <circle cx="10" cy="44" r="5" fill="#d94f30" />
                <circle cx="22" cy="44" r="5" fill="#ffd24d" />
                <path d="M34 48 q0 -9 6 -9 q6 0 6 9 Z" fill="#5a9e4b" />
            </g>
            {/* canasta en primer plano */}
            <g transform="translate(30 52)">
                <path d="M-16 0 Q0 -8 16 0 L12 18 Q0 22 -12 18 Z" fill="#caa066" />
                <path d="M-12 4 H12 M-11 10 H11" stroke="#8a5a38" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M-8 -2 Q0 -14 8 -2" stroke="#8a5a38" strokeWidth="2.6" fill="none" strokeLinecap="round" />
                <circle cx="-4" cy="-3" r="4" fill="#d94f30" />
                <circle cx="5" cy="-4" r="4" fill="#5a9e4b" />
            </g>
        </svg>
    );
}

/** 🌳 Diseño de la finca — colinas con árboles en curvas de nivel y casita. */
function VinetaDisenio() {
    return (
        <svg {...SVG_PROPS}>
            <rect width="180" height="90" fill="#d8e9d2" />
            <path d="M-4 46 Q50 22 110 40 T184 34 V90 H-4 Z" fill="#79a35e" />
            <path d="M-4 64 Q70 50 184 60 V90 H-4 Z" fill="#5d8c49" />
            {/* curvas de nivel */}
            <g stroke="#4c7a3d" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".5">
                <path d="M8 56 Q60 44 120 52 T176 48" />
                <path d="M4 72 Q70 60 176 68" />
            </g>
            {/* árboles en línea (cerca viva) */}
            <g>
                <g transform="translate(34 40)"><path d="M0 12 V4" stroke="#7a5230" strokeWidth="2.6" strokeLinecap="round" /><circle cx="0" cy="-2" r="7" fill="#3f8f4e" /><circle cx="-3" cy="-4" r="3" fill="#5a9e4b" /></g>
                <g transform="translate(66 34)"><path d="M0 12 V4" stroke="#7a5230" strokeWidth="2.6" strokeLinecap="round" /><circle cx="0" cy="-2" r="8" fill="#2f6b3a" /><circle cx="-3" cy="-4" r="3.4" fill="#4c8a4a" /></g>
                <g transform="translate(100 38)"><path d="M0 12 V4" stroke="#7a5230" strokeWidth="2.6" strokeLinecap="round" /><circle cx="0" cy="-2" r="7" fill="#3f8f4e" /><circle cx="-3" cy="-4" r="3" fill="#5a9e4b" /></g>
            </g>
            {/* casita entre lo verde */}
            <g transform="translate(134 44)">
                <polygon points="0,0 12,-9 24,0" fill="#c2562f" />
                <rect x="2" y="0" width="20" height="14" fill="#f6efe0" />
                <rect x="9" y="5" width="6" height="9" fill="#7a5230" />
            </g>
            {/* pájaro del monte */}
            <path d="M52 16 q4 -4 8 0 q4 -4 8 0" stroke="#4a3527" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
    );
}

/** Viñeta por id de mundo (fuente única para tarjeta + pantalla de mundo). */
const VINETAS = {
    cultivos: VinetaCultivos,
    suelo: VinetaSuelo,
    agua: VinetaAgua,
    abono: VinetaAbono,
    sanidad: VinetaSanidad,
    clima: VinetaClima,
    animales: VinetaAnimales,
    mercado: VinetaMercado,
    disenio: VinetaDisenio,
};

/**
 * La viñeta ilustrada de un mundo.
 * @param {{ mundoId: string }} props
 */
export default function MundoVineta({ mundoId }) {
    const Vineta = VINETAS[mundoId];
    if (!Vineta) return null;
    return <Vineta />;
}
