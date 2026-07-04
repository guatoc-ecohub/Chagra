/**
 * SanidadSintomaVinetas — ilustraciones PROPIAS de cada síntoma folk.
 *
 * Mismo lenguaje vector que MundoVinetas: dibujo a mano, viewBox único
 * (0 0 100 100), sin <text>/emoji dentro del SVG (Android/iOS viejos los
 * rompen), sin filtros ni foreignObject (rsvg-safe), sin motor de animación
 * (el movimiento, si lo hay, vive en el CSS y respeta reduced-motion).
 *
 * Cada viñeta pinta EL SÍNTOMA sobre una hoja/planta, para que el campesino
 * reconozca "eso se parece a lo mío" sin leer.
 */

const P = {
    className: 'san-vineta-svg',
    viewBox: '0 0 100 100',
    'aria-hidden': true,
};

/** Hoja base reutilizable (verde sana), centrada. */
function HojaBase({ fill = '#5a9e4b', stroke = '#2f6b3a' }) {
    return (
        <g>
            <path
                d="M50 88 C20 78 14 40 30 20 C50 6 74 16 82 34 C90 58 74 82 50 88 Z"
                fill={fill}
                stroke={stroke}
                strokeWidth="2.5"
            />
            {/* nervadura central + laterales */}
            <path d="M50 86 C48 60 50 36 56 20" stroke={stroke} strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <path d="M50 70 L34 58 M51 58 L36 44 M53 46 L40 34 M55 34 L46 26" stroke={stroke} strokeWidth="1.4" fill="none" opacity=".55" strokeLinecap="round" />
            <path d="M50 70 L70 60 M51 58 L72 48 M53 46 L70 38" stroke={stroke} strokeWidth="1.4" fill="none" opacity=".55" strokeLinecap="round" />
        </g>
    );
}

/** 💧 Gota / lancha — manchas húmedas pardas que se extienden. */
function VManchaHumeda() {
    return (
        <svg {...P}>
            <rect width="100" height="100" fill="#f6ded1" />
            <HojaBase />
            <g fill="#6b4626" opacity=".82">
                <path d="M40 46 q10 -6 18 2 q4 10 -6 15 q-14 3 -16 -8 q0 -6 4 -9 Z" />
                <ellipse cx="66" cy="66" rx="9" ry="7" />
                <ellipse cx="34" cy="66" rx="5.5" ry="4.5" />
            </g>
            {/* vellito blanco del envés */}
            <g stroke="#f6f2e4" strokeWidth="1.6" strokeLinecap="round" opacity=".8">
                <path d="M48 52 v5" /><path d="M52 52 v5" /><path d="M56 54 v5" />
            </g>
        </svg>
    );
}

/** 🎯 Mancha con ojo — círculos con centro claro (ojo de gallo, mancha de hierro). */
function VManchaOjo() {
    return (
        <svg {...P}>
            <rect width="100" height="100" fill="#f6ded1" />
            <HojaBase />
            <g>
                <circle cx="46" cy="48" r="11" fill="#7a3b2a" />
                <circle cx="46" cy="48" r="6" fill="#efe6d0" />
                <circle cx="46" cy="48" r="6" fill="none" stroke="#a8431f" strokeWidth="2" />
                <circle cx="64" cy="64" r="7" fill="#7a3b2a" />
                <circle cx="64" cy="64" r="3.5" fill="#efe6d0" />
                <circle cx="34" cy="66" r="5" fill="#7a3b2a" />
                <circle cx="34" cy="66" r="2.4" fill="#efe6d0" />
            </g>
        </svg>
    );
}

/** 🟠 Polvillo amarillo — roya: polvo naranja en el envés. */
function VPolvoAmarillo() {
    return (
        <svg {...P}>
            <rect width="100" height="100" fill="#f6ded1" />
            <HojaBase fill="#6fae54" />
            <g fill="#e8901f">
                <ellipse cx="44" cy="50" rx="10" ry="7.5" opacity=".85" />
                <ellipse cx="62" cy="62" rx="7" ry="5.5" opacity=".8" />
                <ellipse cx="36" cy="64" rx="5" ry="4" opacity=".8" />
            </g>
            {/* granitos de polvo */}
            <g fill="#f4b64d">
                <circle cx="40" cy="47" r="1.4" /><circle cx="47" cy="52" r="1.4" /><circle cx="44" cy="45" r="1.2" />
                <circle cx="61" cy="60" r="1.3" /><circle cx="64" cy="64" r="1.2" /><circle cx="35" cy="63" r="1.2" />
            </g>
        </svg>
    );
}

/** ⚪ Polvillo blanco — oídio: polvo blanco como talco en el haz. */
function VPolvoBlanco() {
    return (
        <svg {...P}>
            <rect width="100" height="100" fill="#f6ded1" />
            <HojaBase fill="#4c8a4a" />
            <g fill="#fbfaf4" opacity=".92">
                <ellipse cx="46" cy="48" rx="13" ry="9" />
                <ellipse cx="62" cy="62" rx="8" ry="6" />
                <ellipse cx="34" cy="64" rx="6" ry="4.5" />
            </g>
            <g fill="#e7e3d2">
                <circle cx="40" cy="45" r="1.3" /><circle cx="52" cy="50" r="1.3" /><circle cx="60" cy="60" r="1.2" />
            </g>
        </svg>
    );
}

/** 🥄 Hoja enrollada — cuchara del tomate (geminivirus). */
function VHojaEnrollada() {
    return (
        <svg {...P}>
            <rect width="100" height="100" fill="#f6ded1" />
            {/* hoja enroscada hacia arriba, amarillenta */}
            <path
                d="M50 88 C30 80 22 52 30 32 C40 40 44 30 40 22 C58 24 74 34 78 52 C60 46 58 60 66 70 C58 80 54 84 50 88 Z"
                fill="#c9c257"
                stroke="#8a7f2e"
                strokeWidth="2.5"
            />
            <path d="M50 84 C46 62 48 42 52 30" stroke="#8a7f2e" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* borde enrollado */}
            <path d="M40 22 q-8 6 -6 14" stroke="#8a7f2e" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M66 70 q8 -4 8 -12" stroke="#8a7f2e" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
    );
}

/** 🐛 Hoja mordida — daño de masticador (cogollero, gusanos). */
function VHojaMordida() {
    return (
        <svg {...P}>
            <rect width="100" height="100" fill="#f6ded1" />
            {/* hoja con mordiscos en el borde y huecos */}
            <path
                d="M50 88 C22 78 16 42 30 22 C42 12 54 14 60 20 Q54 24 58 30 Q66 26 70 32 C82 46 76 78 50 88 Z"
                fill="#5a9e4b"
                stroke="#2f6b3a"
                strokeWidth="2.5"
            />
            <path d="M50 86 C48 60 50 36 56 22" stroke="#2f6b3a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            {/* huecos comidos */}
            <g fill="#f6ded1">
                <circle cx="40" cy="52" r="5" /><circle cx="52" cy="64" r="4" /><circle cx="46" cy="44" r="3" />
            </g>
            {/* la oruga */}
            <g transform="translate(58 58)">
                <path d="M0 0 q5 -6 10 0 t10 0" stroke="#7fa93f" strokeWidth="6" strokeLinecap="round" fill="none" />
                <circle cx="21" cy="-1" r="3.4" fill="#5e7d2b" />
                <circle cx="22" cy="-2" r=".8" fill="#2c1c12" />
            </g>
        </svg>
    );
}

/** 🔩 Fruto barrenado — broca / monilia / polilla (fruto con hueco/podrido). */
function VFrutoBroca() {
    return (
        <svg {...P}>
            <rect width="100" height="100" fill="#f6ded1" />
            {/* grano/fruto */}
            <ellipse cx="50" cy="54" rx="26" ry="30" fill="#b23b2a" stroke="#7a2417" strokeWidth="2.5" />
            <path d="M50 26 q-6 -8 2 -14" stroke="#4c7a3d" strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* huequito de la broca + galería */}
            <circle cx="50" cy="70" r="4.6" fill="#2c1c12" />
            <path d="M50 70 q-4 -10 0 -20 q4 -6 0 -14" stroke="#2c1c12" strokeWidth="2" fill="none" opacity=".7" strokeLinecap="round" />
            {/* brillo */}
            <ellipse cx="40" cy="42" rx="6" ry="9" fill="#d9614d" opacity=".7" />
        </svg>
    );
}

/** 🪱 Raíz con nudos — nematodo (Meloidogyne) / gusano de suelo. */
function VRaizNudo() {
    return (
        <svg {...P}>
            <rect width="100" height="100" fill="#f0e2c8" />
            {/* suelo */}
            <path d="M0 34 H100 V38 H0 Z" fill="#7a5230" />
            {/* tallito */}
            <path d="M50 34 v-14" stroke="#5a9e4b" strokeWidth="3" strokeLinecap="round" />
            <path d="M50 24 q-8 -2 -11 -9 M50 22 q8 -2 11 -9" stroke="#5a9e4b" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            {/* raíz con nudos/agallas */}
            <g stroke="#c9a24a" strokeWidth="3" fill="none" strokeLinecap="round">
                <path d="M50 38 q-4 10 -12 16 q-4 4 -5 12" />
                <path d="M50 38 q4 12 12 17 q4 4 5 11" />
                <path d="M50 38 v22" />
            </g>
            <g fill="#e0b85a" stroke="#a8792f" strokeWidth="1.4">
                <circle cx="38" cy="66" r="5" /><circle cx="45" cy="60" r="4" />
                <circle cx="62" cy="66" r="5.5" /><circle cx="56" cy="58" r="4" />
                <circle cx="50" cy="72" r="4.6" />
            </g>
        </svg>
    );
}

/** 🥀 Marchita — planta caída (marchitez vascular, moko, damping-off). */
function VMarchita() {
    return (
        <svg {...P}>
            <rect width="100" height="100" fill="#f6ded1" />
            <path d="M0 78 H100 V82 H0 Z" fill="#8a5a38" />
            {/* tallo doblado */}
            <path d="M46 78 C46 56 44 44 58 34 C66 28 70 32 66 40" stroke="#8a7f4a" strokeWidth="4" fill="none" strokeLinecap="round" />
            {/* hojas caídas */}
            <path d="M50 54 q-14 2 -20 12 q10 4 20 -4 Z" fill="#b9a94e" stroke="#8a7f2e" strokeWidth="1.8" />
            <path d="M58 44 q12 -2 18 8 q-10 4 -18 -2 Z" fill="#b9a94e" stroke="#8a7f2e" strokeWidth="1.8" />
            <path d="M62 38 q-10 6 -8 16" stroke="#8a7f2e" strokeWidth="1.6" fill="none" opacity=".6" />
        </svg>
    );
}

/** 🍌 Hoja con rayas — sigatoka del plátano. */
function VHojaRaya() {
    return (
        <svg {...P}>
            <rect width="100" height="100" fill="#f6ded1" />
            {/* hoja alargada de plátano */}
            <path d="M50 92 C40 60 40 30 52 10 C64 30 64 60 54 92 Z" fill="#5a9e4b" stroke="#2f6b3a" strokeWidth="2.5" />
            <path d="M52 90 V14" stroke="#2f6b3a" strokeWidth="2.4" strokeLinecap="round" />
            {/* rayas negras que corren */}
            <g stroke="#2c2418" strokeWidth="2.6" strokeLinecap="round" opacity=".85">
                <path d="M52 34 l-8 6" /><path d="M52 46 l8 6" /><path d="M52 56 l-9 6" />
                <path d="M52 66 l8 5" /><path d="M52 76 l-7 5" />
            </g>
            <g fill="#6b5a1e" opacity=".7">
                <ellipse cx="44" cy="42" rx="4" ry="1.6" transform="rotate(35 44 42)" />
                <ellipse cx="60" cy="52" rx="4" ry="1.6" transform="rotate(-35 60 52)" />
            </g>
        </svg>
    );
}

/** ⬛ Hoja negra — negrilla / fumagina (hollín sobre melaza). */
function VHojaNegra() {
    return (
        <svg {...P}>
            <rect width="100" height="100" fill="#f6ded1" />
            <HojaBase />
            {/* capa negra de hollín */}
            <path d="M36 34 q18 -6 30 6 q6 16 -6 28 q-22 8 -30 -6 q-4 -18 6 -28 Z" fill="#2c2a24" opacity=".82" />
            <g fill="#4a4740" opacity=".8">
                <circle cx="60" cy="40" r="3" /><circle cx="40" cy="60" r="2.6" /><circle cx="52" cy="66" r="2.4" />
            </g>
            {/* el insecto chupador que la causa (pulgón) */}
            <g transform="translate(72 30)">
                <ellipse cx="0" cy="0" rx="5" ry="4" fill="#7fa93f" stroke="#4c6a22" strokeWidth="1.2" />
                <path d="M-4 3 l-3 3 M4 3 l3 3 M-3 -3 l-3 -3 M3 -3 l3 -3" stroke="#4c6a22" strokeWidth="1" strokeLinecap="round" />
            </g>
        </svg>
    );
}

/** 🟡 Hoja amarilla — amarillamiento (entrada ambigua). */
function VHojaAmarilla() {
    return (
        <svg {...P}>
            <rect width="100" height="100" fill="#f6ded1" />
            {/* media hoja verde, media amarilla — la ambigüedad dibujada */}
            <path d="M50 88 C20 78 14 40 30 20 C50 6 74 16 82 34 C90 58 74 82 50 88 Z" fill="#d8cf5b" stroke="#8a7f2e" strokeWidth="2.5" />
            <path d="M50 88 C20 78 14 40 30 20 C43 11 50 12 50 12 L50 88 Z" fill="#6fae54" />
            {/* venas que quedan verdes (pista Fe) */}
            <path d="M50 86 C48 60 50 36 56 20" stroke="#3f7d3a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <path d="M52 60 L66 52 M53 48 L67 42 M54 38 L64 32" stroke="#3f7d3a" strokeWidth="1.5" fill="none" opacity=".7" strokeLinecap="round" />
            <path d="M60 74 q0 8 -4 12" stroke="#8a7f2e" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".7" />
        </svg>
    );
}

const VINETAS = {
    manchaHumeda: VManchaHumeda,
    manchaOjo: VManchaOjo,
    polvoAmarillo: VPolvoAmarillo,
    polvoBlanco: VPolvoBlanco,
    hojaEnrollada: VHojaEnrollada,
    hojaMordida: VHojaMordida,
    frutoBroca: VFrutoBroca,
    raizNudo: VRaizNudo,
    marchita: VMarchita,
    hojaRaya: VHojaRaya,
    hojaNegra: VHojaNegra,
    hojaAmarilla: VHojaAmarilla,
};

/**
 * La ilustración de un síntoma por su clave `vineta`.
 * @param {{ nombre: string }} props
 */
export default function SanidadSintomaVineta({ nombre }) {
    const V = VINETAS[nombre] || VManchaOjo;
    return <V />;
}
