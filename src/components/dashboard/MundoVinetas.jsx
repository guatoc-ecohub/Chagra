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

/** ☕ El café — ladera de cafetal, rama con cerezas maduras y sol de montaña. */
function VinetaCafe() {
    return (
        <svg {...SVG_PROPS}>
            <rect width="180" height="90" fill="#efe0cf" />
            {/* montañas del eje cafetero al fondo */}
            <path d="M-4 46 L38 20 L82 46 Z" fill="#c3a888" opacity=".7" />
            <path d="M64 48 L116 16 L170 48 Z" fill="#b0916e" opacity=".75" />
            {/* sol suave de mañana */}
            <circle cx="150" cy="20" r="10" fill="#ffe6b0" />
            {/* laderas del cafetal */}
            <path d="M-4 46 Q60 34 120 46 T184 42 V90 H-4 Z" fill="#6f9a52" />
            <path d="M-4 62 Q70 50 184 60 V90 H-4 Z" fill="#547e3c" />
            {/* hileras de cafetos en curva de nivel (matas redondas en fila) */}
            <g fill="#3f7a3a">
                <circle cx="22" cy="58" r="6" /><circle cx="46" cy="55" r="6" /><circle cx="70" cy="57" r="6" />
                <circle cx="130" cy="54" r="6" /><circle cx="154" cy="57" r="6" />
            </g>
            <g fill="#4c8a44" opacity=".85">
                <circle cx="22" cy="56" r="3" /><circle cx="46" cy="53" r="3" /><circle cx="70" cy="55" r="3" />
                <circle cx="130" cy="52" r="3" /><circle cx="154" cy="55" r="3" />
            </g>
            {/* rama de café protagonista en primer plano, con cerezas maduras */}
            <g transform="translate(96 58)">
                <path d="M-42 28 Q-8 10 34 3" stroke="#7a5230" strokeWidth="3.4" strokeLinecap="round" fill="none" />
                {/* hojas lanceoladas */}
                <path d="M-20 17 Q-28 9 -24 -2 Q-13 4 -16 15 Z" fill="#2f6b3a" />
                <path d="M0 9 Q-6 -1 0 -10 Q9 -2 5 9 Z" fill="#2f6b3a" />
                <path d="M20 5 Q16 -5 25 -10 Q31 -1 25 6 Z" fill="#3f8f4e" />
                {/* cerezas de café (rojas) agrupadas en el nudo, como en la mata real */}
                <g>
                    <circle cx="-26" cy="19" r="3.4" fill="#c8321f" /><circle cx="-19" cy="21" r="3.4" fill="#d94f30" />
                    <circle cx="-5" cy="11" r="3.4" fill="#d94f30" /><circle cx="2" cy="13" r="3.4" fill="#c8321f" />
                    <circle cx="16" cy="6" r="3.2" fill="#d94f30" /><circle cx="23" cy="8" r="3.2" fill="#c8321f" />
                    <circle cx="31" cy="4" r="3" fill="#e06a48" />
                </g>
            </g>
        </svg>
    );
}

/** 🥑 El aguacate — árbol cargado en la loma y un aguacate partido con su pepa. */
function VinetaAguacate() {
    return (
        <svg {...SVG_PROPS}>
            <rect width="180" height="90" fill="#e4efd0" />
            {/* montaña fría-moderada al fondo (piso del Hass) */}
            <path d="M-4 44 L40 18 L86 44 Z" fill="#a9c58f" opacity=".7" />
            <path d="M60 46 L112 16 L168 46 Z" fill="#93b578" opacity=".75" />
            {/* sol suave de montaña */}
            <circle cx="150" cy="20" r="10" fill="#eef3c4" />
            {/* laderas */}
            <path d="M-4 46 Q60 34 120 46 T184 42 V90 H-4 Z" fill="#7a9e4a" />
            <path d="M-4 62 Q70 50 184 60 V90 H-4 Z" fill="#5b7f2a" />
            {/* árbol de aguacate cargado (copa redonda, tronco, frutos colgando) */}
            <g transform="translate(58 24)">
                <path d="M0 40 V18" stroke="#7a5230" strokeWidth="4" strokeLinecap="round" fill="none" />
                <path d="M0 30 q-9 -2 -13 -8 M0 26 q9 -2 13 -9" stroke="#7a5230" strokeWidth="2.6" strokeLinecap="round" fill="none" />
                <circle cx="0" cy="6" r="17" fill="#2f6b3a" />
                <circle cx="-9" cy="0" r="9" fill="#3f8f4e" />
                <circle cx="9" cy="2" r="9" fill="#3f8f4e" />
                <circle cx="0" cy="-6" r="8" fill="#4c8a44" />
                {/* aguacates colgando (verde oscuro, forma de pera) */}
                <g fill="#3a5a1f">
                    <path d="M-8 12 q-3.4 0 -3.4 4 q0 4.6 3.4 5.6 q3.4 -1 3.4 -5.6 q0 -4 -3.4 -4 Z" />
                    <path d="M7 10 q-3 0 -3 3.6 q0 4.2 3 5 q3 -0.8 3 -5 q0 -3.6 -3 -3.6 Z" />
                    <path d="M0 16 q-2.6 0 -2.6 3.2 q0 3.6 2.6 4.4 q2.6 -0.8 2.6 -4.4 q0 -3.2 -2.6 -3.2 Z" />
                </g>
            </g>
            {/* aguacate partido en primer plano: mitad con pepa grande */}
            <g transform="translate(120 60)">
                <ellipse cx="0" cy="16" rx="20" ry="5" fill="#3a5219" opacity=".45" />
                {/* cáscara (forma de pera, verde-morado del Hass) */}
                <path d="M0 -20 q-15 4 -15 20 q0 15 15 16 q15 -1 15 -16 q0 -16 -15 -20 Z" fill="#40662a" />
                {/* pulpa */}
                <path d="M0 -14 q-10 3 -10 14 q0 10 10 11 q10 -1 10 -11 q0 -11 -10 -14 Z" fill="#c7d96a" />
                {/* aro más maduro junto a la pepa */}
                <path d="M0 -9 q-6 2 -6 9 q0 6 6 6.6 q6 -0.6 6 -6.6 q0 -7 -6 -9 Z" fill="#e2d98f" />
                {/* pepa grande */}
                <ellipse cx="0" cy="1" rx="5.4" ry="6.4" fill="#8a5a2f" />
                <ellipse cx="-1.4" cy="-1" rx="1.8" ry="2.4" fill="#a9702f" opacity=".8" />
            </g>
        </svg>
    );
}

/** 🥮 La caña y la panela — cañaveral, trapiche y bloque de panela al sol. */
function VinetaCana() {
    return (
        <svg {...SVG_PROPS}>
            <rect width="180" height="90" fill="#f3e3c2" />
            {/* sol de tierra caliente */}
            <circle cx="150" cy="20" r="10" fill="#ffd98a" />
            {/* loma del cañaveral */}
            <path d="M-4 50 Q60 38 120 48 T184 44 V90 H-4 Z" fill="#8fae4e" />
            <path d="M-4 64 Q70 52 184 60 V90 H-4 Z" fill="#6f9138" />
            {/* cañaveral: tallos altos con penachos (a la izquierda) */}
            <g stroke="#c9a24a" strokeWidth="2.6" strokeLinecap="round" fill="none">
                <path d="M20 66 V26" /><path d="M30 66 V22" /><path d="M40 66 V28" /><path d="M50 66 V24" />
            </g>
            {/* nudos de la caña */}
            <g stroke="#a7802f" strokeWidth="2.6" strokeLinecap="round">
                <path d="M19 40 h2.6" /><path d="M19 52 h2.6" /><path d="M29 38 h2.6" /><path d="M29 50 h2.6" />
                <path d="M39 42 h2.6" /><path d="M49 40 h2.6" />
            </g>
            {/* penachos (flecha de la caña) */}
            <g stroke="#e6d29a" strokeWidth="2" strokeLinecap="round" fill="none">
                <path d="M20 26 q-4 -6 -8 -8" /><path d="M20 26 q4 -6 9 -7" />
                <path d="M30 22 q-4 -6 -8 -8" /><path d="M30 22 q4 -6 9 -7" />
                <path d="M40 28 q-4 -6 -8 -8" /><path d="M50 24 q4 -6 9 -7" />
            </g>
            {/* la panela: bloque redondo (dos tapas) en primer plano derecha */}
            <g transform="translate(120 58)">
                <ellipse cx="0" cy="8" rx="20" ry="5" fill="#6b3f16" opacity=".5" />
                {/* bloque de panela en bloque */}
                <path d="M-18 6 L18 6 L14 -8 L-14 -8 Z" fill="#a9691f" />
                <path d="M-14 -8 L14 -8 L12 -14 L-12 -14 Z" fill="#c07d2a" />
                <path d="M-18 6 L-14 -8 L-12 -14" stroke="#8a5316" strokeWidth="1.4" fill="none" />
                {/* panela redonda encima */}
                <ellipse cx="6" cy="-15" rx="9" ry="3.4" fill="#b5772a" />
                <ellipse cx="6" cy="-16.5" rx="9" ry="3.4" fill="#c98b3a" />
            </g>
            {/* humito de la hornilla */}
            <path d="M92 40 q-3 -6 1 -9 q4 -3 1 -8" stroke="#efe6cf" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity=".8" />
        </svg>
    );
}

/** 🍊 Los cítricos — arbolito cargado de naranjas al sol de tierra caliente. */
function VinetaCitricos() {
    return (
        <svg {...SVG_PROPS}>
            <rect width="180" height="90" fill="#f7e6c8" />
            {/* sol fuerte de tierra caliente */}
            <circle cx="150" cy="20" r="11" fill="#ffd98a" />
            <circle cx="150" cy="20" r="6.5" fill="#fff0c4" />
            {/* loma del huerto cítrico */}
            <path d="M-4 52 Q60 40 120 50 T184 46 V90 H-4 Z" fill="#8fae4e" />
            <path d="M-4 66 Q70 54 184 62 V90 H-4 Z" fill="#6f9138" />
            {/* hileras de arbolitos cítricos al fondo (copas redondas con fruta) */}
            <g>
                <g><circle cx="24" cy="52" r="7" fill="#3f7a3a" /><circle cx="22" cy="50" r="1.6" fill="#f6a11f" /><circle cx="27" cy="54" r="1.6" fill="#f6a11f" /></g>
                <g><circle cx="128" cy="50" r="7" fill="#3f7a3a" /><circle cx="126" cy="48" r="1.6" fill="#f6a11f" /><circle cx="131" cy="52" r="1.6" fill="#f6a11f" /></g>
                <g><circle cx="152" cy="53" r="6" fill="#4c8a44" /><circle cx="151" cy="51" r="1.5" fill="#f6a11f" /></g>
            </g>
            {/* árbol cítrico protagonista, cargado de naranjas */}
            <g transform="translate(78 40)">
                {/* tronco */}
                <path d="M0 40 V22" stroke="#7a5230" strokeWidth="4.4" strokeLinecap="round" />
                <path d="M0 30 q-8 -2 -12 -8 M0 26 q8 -2 12 -8" stroke="#7a5230" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                {/* copa densa */}
                <circle cx="0" cy="6" r="22" fill="#2f6b3a" />
                <circle cx="-13" cy="2" r="12" fill="#3f8f4e" />
                <circle cx="13" cy="4" r="12" fill="#3f8f4e" />
                <circle cx="0" cy="-8" r="12" fill="#4c8a44" />
                {/* naranjas repartidas en la copa */}
                <g>
                    <circle cx="-12" cy="4" r="3.6" fill="#f6931f" /><circle cx="-13.5" cy="2.5" r="1" fill="#ffc65c" />
                    <circle cx="2" cy="10" r="3.8" fill="#ef8317" /><circle cx="0.5" cy="8.5" r="1" fill="#ffc65c" />
                    <circle cx="12" cy="6" r="3.6" fill="#f6931f" /><circle cx="10.5" cy="4.5" r="1" fill="#ffc65c" />
                    <circle cx="-4" cy="-6" r="3.4" fill="#ef8317" /><circle cx="-5.2" cy="-7.2" r=".9" fill="#ffc65c" />
                    <circle cx="8" cy="-4" r="3.2" fill="#f6931f" />
                    <circle cx="-16" cy="-4" r="3" fill="#ef8317" />
                </g>
                {/* azahar (florecita blanca del cítrico) */}
                <g fill="#fbfaf3">
                    <circle cx="16" cy="-8" r="1.5" /><circle cx="-9" cy="-12" r="1.5" />
                </g>
            </g>
        </svg>
    );
}

/** 🌿 La botica campesina — repisa con frascos de hierbas, mortero y mata en flor. */
function VinetaBotica() {
    return (
        <svg {...SVG_PROPS}>
            <rect width="180" height="90" fill="#dcecd0" />
            {/* pared cálida de la cocina/despensa */}
            <path d="M0 0 H180 V58 H0 Z" fill="#e7efd8" />
            {/* repisa de madera con los frascos de la botica */}
            <rect x="86" y="30" width="94" height="6" rx="1.5" fill="#a0764a" />
            <rect x="86" y="36" width="94" height="2.4" fill="#7a5230" opacity=".6" />
            {/* frascos de hierbas secas sobre la repisa */}
            <g>
                {/* frasco 1 — flores anaranjadas (caléndula) */}
                <rect x="96" y="14" width="14" height="16" rx="2.5" fill="#cfe2f0" opacity=".85" />
                <rect x="98" y="10" width="10" height="5" rx="1.5" fill="#8a5a38" />
                <g fill="#e8912f"><circle cx="100" cy="24" r="2.2" /><circle cx="105" cy="21" r="2.2" /><circle cx="104" cy="26" r="2" /></g>
                {/* frasco 2 — hoja verde (toronjil/cidrón) */}
                <rect x="118" y="12" width="14" height="18" rx="2.5" fill="#d6ecd0" opacity=".85" />
                <rect x="120" y="8" width="10" height="5" rx="1.5" fill="#4c7a3d" />
                <g stroke="#3f8f4e" strokeWidth="1.8" strokeLinecap="round" fill="none"><path d="M122 26 q2 -8 4 -11" /><path d="M127 26 q0 -7 2 -10" /></g>
                {/* frasco 3 — flor blanca (saúco/manzanilla) */}
                <rect x="140" y="15" width="14" height="15" rx="2.5" fill="#eef3ea" opacity=".85" />
                <rect x="142" y="11" width="10" height="5" rx="1.5" fill="#8a5a38" />
                <g fill="#f6f2e4"><circle cx="145" cy="24" r="2" /><circle cx="149" cy="22" r="2" /><circle cx="150" cy="26" r="1.8" /></g>
                <circle cx="147.5" cy="23.5" r="1.2" fill="#e8c04a" />
            </g>
            {/* mortero y mano de moler (machacar la hierba) */}
            <g transform="translate(120 44)">
                <path d="M-12 0 Q0 16 12 0 Z" fill="#9a8a72" />
                <path d="M-12 0 Q0 6 12 0" stroke="#6b5c48" strokeWidth="1.6" fill="none" />
                <ellipse cx="0" cy="0" rx="12" ry="3.2" fill="#b7a992" />
                <path d="M6 -2 L14 -14" stroke="#7a5230" strokeWidth="3.4" strokeLinecap="round" />
            </g>
            {/* mata medicinal en flor en primer plano (caléndula) a la izquierda */}
            <path d="M-4 52 Q30 44 62 52 V90 H-4 Z" fill="#8fae5f" />
            <g transform="translate(34 40)">
                <path d="M0 34 V6" stroke="#3f7d3f" strokeWidth="3" strokeLinecap="round" fill="none" />
                {/* hojas */}
                <path d="M0 22 Q-12 20 -16 9 Q-4 9 0 18 Z" fill="#4c8a44" />
                <path d="M0 16 Q12 14 16 3 Q4 3 0 12 Z" fill="#3f8f4e" />
                {/* flor anaranjada radiada */}
                <g transform="translate(0 4)">
                    <g fill="#e8912f">
                        <ellipse cx="0" cy="-9" rx="2" ry="4.5" />
                        <ellipse cx="9" cy="0" rx="4.5" ry="2" />
                        <ellipse cx="-9" cy="0" rx="4.5" ry="2" />
                        <ellipse cx="0" cy="9" rx="2" ry="4.5" />
                        <ellipse cx="6.4" cy="-6.4" rx="4" ry="2" transform="rotate(45 6.4 -6.4)" />
                        <ellipse cx="-6.4" cy="-6.4" rx="4" ry="2" transform="rotate(-45 -6.4 -6.4)" />
                        <ellipse cx="6.4" cy="6.4" rx="4" ry="2" transform="rotate(-45 6.4 6.4)" />
                        <ellipse cx="-6.4" cy="6.4" rx="4" ry="2" transform="rotate(45 -6.4 6.4)" />
                    </g>
                    <circle cx="0" cy="0" r="4" fill="#a85b1f" />
                </g>
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

/** 🥭 El mango — árbol grande de tierra caliente, cargado de mangos, sol fuerte. */
function VinetaMango() {
    return (
        <svg {...SVG_PROPS}>
            <rect width="180" height="90" fill="#f7e6c9" />
            {/* sol fuerte de tierra caliente */}
            <circle cx="150" cy="20" r="12" fill="#ffcf6b" />
            <circle cx="150" cy="20" r="7" fill="#ffe3a0" />
            {/* loma cálida */}
            <path d="M-4 54 Q60 44 120 52 T184 48 V90 H-4 Z" fill="#a9b95a" />
            <path d="M-4 66 Q70 56 184 62 V90 H-4 Z" fill="#7f9a3e" />
            {/* tronco del árbol de mango */}
            <path d="M56 78 L56 46 M56 60 q-8 -3 -13 -10 M56 54 q9 -3 14 -11" stroke="#7a5230" strokeWidth="4.6" strokeLinecap="round" fill="none" />
            {/* copa densa y redonda del mango (varios lóbulos de fronda) */}
            <g fill="#2f6b3a">
                <circle cx="40" cy="34" r="18" />
                <circle cx="64" cy="28" r="20" />
                <circle cx="82" cy="40" r="16" />
                <circle cx="52" cy="46" r="16" />
            </g>
            <g fill="#3f8f4e" opacity=".9">
                <circle cx="46" cy="30" r="10" />
                <circle cx="70" cy="34" r="10" />
                <circle cx="60" cy="24" r="8" />
            </g>
            {/* mangos colgando en la copa (amarillo-naranja con cachete rojizo) */}
            <g>
                <ellipse cx="38" cy="44" rx="4" ry="5.4" fill="#f0a52e" transform="rotate(12 38 44)" />
                <ellipse cx="56" cy="48" rx="4" ry="5.4" fill="#ec9a26" transform="rotate(-8 56 48)" />
                <ellipse cx="72" cy="46" rx="4" ry="5.4" fill="#f0a52e" transform="rotate(10 72 46)" />
                <ellipse cx="48" cy="38" rx="3.6" ry="4.8" fill="#ef8f24" transform="rotate(-6 48 38)" />
                <ellipse cx="66" cy="38" rx="3.6" ry="4.8" fill="#f2ab34" transform="rotate(8 66 38)" />
            </g>
            {/* cachete rojizo del mango protagonista en primer plano */}
            <g transform="translate(126 60)">
                <ellipse cx="0" cy="10" rx="16" ry="4" fill="#6b3f16" opacity=".4" />
                <ellipse cx="0" cy="0" rx="12" ry="9" fill="#f0a52e" />
                <path d="M-11 -2 Q-4 -10 8 -8 Q2 -2 -2 2 Z" fill="#e2582a" opacity=".85" />
                <path d="M0 -9 q2 -4 -1 -6" stroke="#6b8a2f" strokeWidth="2" strokeLinecap="round" fill="none" />
            </g>
        </svg>
    );
}

/** 🌱 Semillero y vivero — túnel de media-sombra, bandeja germinadora y plántulas. */
function VinetaSemillero() {
    return (
        <svg {...SVG_PROPS}>
            <rect width="180" height="90" fill="#e6f0cf" />
            {/* sol tibio de mañana */}
            <circle cx="152" cy="20" r="10" fill="#ffe8a6" />
            <circle cx="152" cy="20" r="6" fill="#fff4cf" />
            {/* piso del vivero */}
            <path d="M-4 60 Q60 52 120 58 T184 54 V90 H-4 Z" fill="#b7c98a" />
            <path d="M-4 72 Q70 64 184 70 V90 H-4 Z" fill="#8ea85e" />
            {/* el túnel de media-sombra: arco traslúcido + costillas */}
            <path d="M22 74 A46 40 0 0 1 114 74 Z" fill="#c7e0a0" opacity=".55" />
            <g stroke="#8a6a44" strokeWidth="3" fill="none" strokeLinecap="round">
                <path d="M22 74 A46 40 0 0 1 114 74" />
                <path d="M40 74 A28 34 0 0 1 96 74" opacity=".8" />
                <path d="M56 74 A12 30 0 0 1 80 74" opacity=".6" />
            </g>
            {/* la bandeja germinadora con brotes por etapa */}
            <rect x="42" y="66" width="52" height="10" rx="2" fill="#5a4326" />
            <rect x="44" y="64" width="48" height="4" fill="#3a2c1c" />
            <g stroke="#3f8f4e" strokeWidth="2.4" strokeLinecap="round" fill="none">
                <path d="M50 64 v-4" /><path d="M58 64 v-6" /><path d="M66 64 v-8" />
                <path d="M74 64 v-9 M74 61 q4 -1 5 -4" /><path d="M84 64 v-10 M84 60 q-4 -1 -5 -4 M84 58 q4 -1 5 -4" />
            </g>
            {/* la bolsa del repique en primer plano (plántula ya crecida) */}
            <g transform="translate(140 62)">
                <path d="M-9 16 L-7 2 L7 2 L9 16 Z" fill="#2a2622" />
                <path d="M0 2 v-14" stroke="#5a6a2e" strokeWidth="2.6" strokeLinecap="round" fill="none" />
                <path d="M0 -6 q-6 -2 -8 -8" stroke="#3f8f4e" strokeWidth="2.6" strokeLinecap="round" fill="none" />
                <path d="M0 -9 q6 -2 8 -8" stroke="#3f8f4e" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            </g>
        </svg>
    );
}

/** Viñeta por id de mundo (fuente única para tarjeta + pantalla de mundo). */
/* 🍄 La red del suelo — corte de tierra honda con la red de micelio
   bioluminiscente enlazando raíces, y pulsos de nutrientes en los hilos. */
function VinetaMicorrizas() {
    return (
        <svg {...SVG_PROPS}>
            {/* tierra honda: degradado por bandas oscuras */}
            <rect width="180" height="90" fill="#160f0a" />
            <path d="M0 0 H180 V16 H0 Z" fill="#28331f" />
            <path d="M0 16 H180 V40 H0 Z" fill="#1d150d" />
            <path d="M0 40 H180 V90 H0 Z" fill="#120c08" />
            {/* dos matas asomando arriba (las que se conectan) */}
            <g stroke="#8fbf55" strokeWidth="2.6" strokeLinecap="round" fill="none">
                <path d="M52 16 v-10" /><path d="M52 10 q-6 -1 -9 -6" /><path d="M52 8 q6 -1 9 -6" />
                <path d="M126 16 v-8" /><path d="M126 11 q6 -1 9 -5" />
            </g>
            {/* raíces que bajan */}
            <g stroke="#c8a878" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity=".9">
                <path d="M52 18 q-4 14 -12 24 q-4 6 -5 14" />
                <path d="M52 18 q3 16 10 26" />
                <path d="M126 18 q4 14 12 22" />
                <path d="M126 18 q-3 16 -9 26" />
            </g>
            {/* la RED de micelio: hilos turquesa que enlazan las raíces */}
            <g stroke="#37d6b0" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".92">
                <path d="M40 56 q22 -10 44 4 q20 12 44 -2" />
                <path d="M35 44 q30 14 60 6 q28 -8 50 8" />
                <path d="M55 70 q26 8 52 -4" />
                <path d="M84 60 q-10 -18 6 -30" />
            </g>
            {/* el PUENTE claro entre las dos matas (el reparto) */}
            <path d="M60 40 q30 20 66 -2" stroke="#7ef0c8" strokeWidth="2.2" fill="none" opacity=".95" />
            {/* nodos del micelio (uniones) */}
            <g fill="#9df5da">
                <circle cx="40" cy="56" r="2.4" /><circle cx="84" cy="60" r="2.6" />
                <circle cx="128" cy="58" r="2.4" /><circle cx="95" cy="47" r="2.2" />
            </g>
            {/* arbúsculos cálidos en las puntas de raíz (intercambio) */}
            <g fill="#ffd27a">
                <circle cx="35" cy="56" r="2.6" /><circle cx="62" cy="58" r="2.4" /><circle cx="141" cy="62" r="2.6" />
            </g>
            {/* pulsos de nutrientes corriendo por los hilos */}
            <circle cx="72" cy="53" r="2" fill="#ffc766" />
            <circle cx="110" cy="52" r="1.8" fill="#8ef06a" />
            <circle cx="93" cy="30" r="1.6" fill="#8fd4ff" />
        </svg>
    );
}

const VINETAS = {
    micorrizas: VinetaMicorrizas,
    cultivos: VinetaCultivos,
    cafe: VinetaCafe,
    aguacate: VinetaAguacate,
    cana: VinetaCana,
    mango: VinetaMango,
    citricos: VinetaCitricos,
    botica: VinetaBotica,
    suelo: VinetaSuelo,
    agua: VinetaAgua,
    abono: VinetaAbono,
    sanidad: VinetaSanidad,
    clima: VinetaClima,
    animales: VinetaAnimales,
    mercado: VinetaMercado,
    disenio: VinetaDisenio,
    semillero: VinetaSemillero,
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
