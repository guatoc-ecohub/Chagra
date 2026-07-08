import './clima-vivo.css';

/**
 * ClimaIconoVivo — iconografía SVG animada del módulo de clima.
 *
 * Reemplaza los íconos estáticos de lucide en el pronóstico por SVG inline
 * con capas que "respiran": rayos del sol girando lento, nubes que vagan
 * 1-2 px, gotas de lluvia cayendo en bucle, bandas de niebla que van y
 * vienen. Todo con `transform`/`opacity` (GPU-friendly, cero repaints) y con
 * `prefers-reduced-motion: reduce` → estático legible (clima-vivo.css).
 *
 * Restricción de bundle (24.9/25 MB): CERO assets nuevos — cada ícono son
 * ~10 líneas de path inline, mismo lenguaje visual stroke de lucide
 * (viewBox 24, stroke currentColor, cap redondo) para no desentonar con el
 * resto del dashboard.
 *
 * Las condiciones son EXACTAMENTE las de skyConditionService (despejado |
 * parcial | nublado | niebla | lluvia) — este componente no reinterpreta el
 * dato, solo lo pinta. Condición desconocida → cae a `parcial` (mismo
 * fallback que tenía el mapa CONDITION_ICONS de ClimaStrip).
 *
 * `frost` agrega un copo pequeño en la esquina: SOLO para días con mínima
 * pronosticada ≤ 0 °C (helada REAL — no confundir con el umbral de
 * vigilancia por piso térmico, que es aviso, no helada).
 *
 * Decorativo: `aria-hidden` siempre — la celda/tarjeta que lo usa pone el
 * `title`/`aria-label` con el texto honesto de la condición.
 */

/** Path de nube estilo lucide (compartido por parcial/nublado/niebla/lluvia). */
const NUBE = 'M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z';

/** Copo de esquina para días de helada real (mínima ≤ 0 °C). */
function CopoBadge() {
    return (
        <g className="cv-anim cv-copo text-cyan-300" strokeWidth="1.4" aria-hidden="true">
            <line x1="19" y1="2.2" x2="19" y2="8.2" />
            <line x1="16.4" y1="3.7" x2="21.6" y2="6.7" />
            <line x1="16.4" y1="6.7" x2="21.6" y2="3.7" />
        </g>
    );
}

const ICONOS = {
    despejado: () => (
        <>
            <g className="cv-anim cv-rayos" opacity="0.9">
                <line x1="12" y1="2.2" x2="12" y2="4.6" />
                <line x1="12" y1="19.4" x2="12" y2="21.8" />
                <line x1="2.2" y1="12" x2="4.6" y2="12" />
                <line x1="19.4" y1="12" x2="21.8" y2="12" />
                <line x1="5.1" y1="5.1" x2="6.8" y2="6.8" />
                <line x1="17.2" y1="17.2" x2="18.9" y2="18.9" />
                <line x1="5.1" y1="18.9" x2="6.8" y2="17.2" />
                <line x1="17.2" y1="6.8" x2="18.9" y2="5.1" />
            </g>
            <circle className="cv-anim cv-sol" cx="12" cy="12" r="4.6" />
        </>
    ),
    parcial: () => (
        <>
            {/* Sol arriba-izquierda, nube abajo-derecha: sin solaparse no hace
                falta rellenar la nube (el fondo varía por tema). */}
            <g className="cv-anim cv-sol" opacity="0.95">
                <circle cx="7.5" cy="7" r="2.8" />
                <line x1="7.5" y1="1.8" x2="7.5" y2="3.3" />
                <line x1="1.8" y1="7" x2="3.3" y2="7" />
                <line x1="3.4" y1="2.9" x2="4.5" y2="4" />
                <line x1="10.5" y1="4" x2="11.6" y2="2.9" />
            </g>
            <g transform="translate(4.5 5.5) scale(0.78)">
                <g className="cv-anim cv-nube">
                    <path d={NUBE} />
                </g>
            </g>
        </>
    ),
    nublado: () => (
        <>
            <g transform="translate(5 -1.5) scale(0.62)" opacity="0.45">
                <g className="cv-anim cv-nube-lenta">
                    <path d={NUBE} />
                </g>
            </g>
            <g transform="translate(0.5 2) scale(0.88)">
                <g className="cv-anim cv-nube">
                    <path d={NUBE} />
                </g>
            </g>
        </>
    ),
    niebla: () => (
        <>
            <g transform="translate(1 -1.5) scale(0.82)">
                <g className="cv-anim cv-nube">
                    <path d={NUBE} />
                </g>
            </g>
            <line className="cv-anim cv-niebla-1" x1="5" y1="18.5" x2="17" y2="18.5" />
            <line className="cv-anim cv-niebla-2" x1="8" y1="21.5" x2="19" y2="21.5" />
        </>
    ),
    lluvia: () => (
        <>
            <g transform="translate(1 -2) scale(0.86)">
                <g className="cv-anim cv-nube">
                    <path d={NUBE} />
                </g>
            </g>
            {/* Opacidad base en el markup: con reduced-motion (animation: none)
                las gotas quedan visibles estáticas, no invisibles. */}
            <g className="text-sky-400" strokeWidth="1.8">
                <line className="cv-anim cv-gota" opacity="0.9" x1="8" y1="17.5" x2="7.4" y2="19.5" />
                <line className="cv-anim cv-gota cv-gota-2" opacity="0.9" x1="12.2" y1="18.5" x2="11.6" y2="20.5" />
                <line className="cv-anim cv-gota cv-gota-3" opacity="0.9" x1="16.2" y1="17.5" x2="15.6" y2="19.5" />
            </g>
        </>
    ),
};

/**
 * @param {object} props
 * @param {'despejado'|'parcial'|'nublado'|'niebla'|'lluvia'|string|null} [props.condition]
 *   Condición de skyConditionService. Desconocida/null → `parcial`.
 * @param {number} [props.size] Lado en px (default 22, como lucide en el strip).
 * @param {string} [props.className] Clases de color/layout (p. ej. `text-amber-300`).
 * @param {boolean} [props.frost] Copo de helada REAL (mínima ≤ 0 °C) en la esquina.
 */
export default function ClimaIconoVivo({ condition = 'parcial', size = 22, className = '', frost = false }) {
    const Capas = ICONOS[condition] || ICONOS.parcial;
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
            data-testid="clima-icono-vivo"
            data-condition-icon={ICONOS[condition] ? condition : 'parcial'}
        >
            <Capas />
            {frost && <CopoBadge />}
        </svg>
    );
}
