/* eslint-disable chagra-i18n/no-hardcoded-spanish */
/*
 * MapaEstrategicoPisos — el zoom MEDIO de la navegación por pisos térmicos.
 *
 * EL MAPA ESTRATÉGICO tipo Age of Empires: la finca-valle vista desde arriba
 * en 3/4, como un tablero de campaña — CUATRO TERRAZAS isométricas apiladas
 * (cálido, la más ancha, abajo; páramo, la más alta, arriba) y TODOS los
 * mundos como FICHAS clicables sobre su terraza. Marco de pergamino, rosa de
 * los vientos, niebla en los bordes: el "mapa del mundo" navegable.
 *
 * La quebrada baja de terraza en terraza desde el páramo (donde nace el agua,
 * la Chorrera de la vista global) hasta el valle: el mismo relato del agua en
 * los tres zooms.
 *
 * El dato mundo→piso NO vive aquí: se lee de `pisosNavegacion.js`, el mismo
 * que leen el minimapa y la vista global (coherencia total). Tocar una ficha
 * navega a la pantalla real del mundo.
 */
import { useEffect, useMemo } from 'react';
import { mundosPorBanda } from './pisosNavegacion.js';
import { GlifoEnt } from './glifosNavegacion.jsx';

const ANCHO = 1240;
const ALTO = 860;
const CX = ANCHO / 2 + 60; // el tablero respira a la derecha del rótulo de pisos

/*
 * Las terrazas, de abajo (cálido, ancha) a arriba (páramo, angosta). El orden
 * visual sale del índice de banda; aquí solo vive la geometría del tablero.
 *   semiAncho — mitad del ancho del rombo isométrico.
 *   cy        — centro vertical del rombo.
 */
const TERRAZAS = [
  { semiAncho: 470, cy: 640 }, // cálido
  { semiAncho: 375, cy: 486 }, // templado
  { semiAncho: 285, cy: 356 }, // frío
  { semiAncho: 200, cy: 246 }, // páramo
];
const PROFUNDIDAD = 30; // el grosor extruido del borde de cada terraza

/* Aclara u oscurece un color hex (factor >1 aclara, <1 oscurece). */
function tono(hex, factor) {
  const n = parseInt(hex.slice(1), 16);
  const canal = (v) => Math.max(0, Math.min(255, Math.round(v * factor)));
  const r = canal((n >> 16) & 255);
  const g = canal((n >> 8) & 255);
  const b = canal(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/* El rombo isométrico de una terraza (cara superior). */
function rombo(cx, cy, semiAncho, semiAlto) {
  return `M ${cx - semiAncho} ${cy} L ${cx} ${cy - semiAlto} L ${cx + semiAncho} ${cy} L ${cx} ${cy + semiAlto} Z`;
}

/* Una ficha de mundo: token de tablero clicable (emoji + rótulo). */
function FichaMundo({ mundo, x, y, color, actual, onNavigate }) {
  const activar = () => onNavigate?.(mundo);
  return (
    <g
      className="navm-ficha"
      transform={`translate(${x} ${y})`}
      role="button"
      tabIndex={0}
      aria-label={`Ir a ${mundo.titulo}`}
      onClick={activar}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activar();
        }
      }}
    >
      {actual && <circle r="37" fill="none" stroke="#e5b54a" strokeWidth="3.5" className="navm-aqui" />}
      <ellipse cx="0" cy="24" rx="22" ry="7" fill="#1c2418" opacity="0.35" />
      <circle r="27" fill="#f7f0dd" stroke={tono(color, 0.72)} strokeWidth="3" />
      <circle r="22" fill={tono(color, 1.35)} opacity="0.35" />
      <text y="8" textAnchor="middle" fontSize="24" aria-hidden="true">
        {mundo.emoji}
      </text>
      <text
        y="47"
        textAnchor="middle"
        fontSize="14"
        fontWeight="600"
        fontFamily="Georgia, 'Times New Roman', serif"
        fill="#241f14"
        stroke="#efe6cd"
        strokeWidth="4"
        paintOrder="stroke"
      >
        {mundo.titulo}
      </text>
      {actual && (
        <text
          y="-40"
          textAnchor="middle"
          fontSize="13"
          fontFamily="Georgia, 'Times New Roman', serif"
          fill="#8a6a1f"
          stroke="#f7f0dd"
          strokeWidth="4"
          paintOrder="stroke"
        >
          ★ Usted está aquí
        </text>
      )}
    </g>
  );
}

/**
 * @param {object} props
 * @param {string|null} [props.mundoActual] id del mundo donde está el usuario
 * @param {(mundo: {id:string, destino:{view:string, data?:object}}) => void} [props.onNavigate]
 * @param {() => void} [props.onCerrar]  volver al minimapa
 * @param {() => void} [props.onGlobal]  saltar al zoom grande (vista global)
 */
export default function MapaEstrategicoPisos({ mundoActual = null, onNavigate, onCerrar, onGlobal }) {
  // Fichas por terraza: reparto horizontal determinista dentro del rombo.
  const tablero = useMemo(() => {
    const grupos = mundosPorBanda();
    return grupos.map(({ banda, mundos }, i) => {
      const terraza = TERRAZAS[i] || TERRAZAS[TERRAZAS.length - 1];
      const semiAlto = terraza.semiAncho * 0.34;
      const fichas = mundos.map((mundo, j) => {
        const n = mundos.length;
        // Dos filas si hay muchas fichas, para no salirse del rombo.
        const dosFilas = n > 4;
        const fila = dosFilas ? j % 2 : 0;
        const enFila = dosFilas ? Math.ceil(n / 2) : n;
        const idx = dosFilas ? Math.floor(j / 2) : j;
        const margen = 0.72 - fila * 0.16;
        const x = terraza.cy === TERRAZAS[0].cy && n === 1
          ? CX
          : CX + ((idx + 0.5) / enFila - 0.5) * 2 * terraza.semiAncho * margen;
        const y = terraza.cy + (fila === 0 ? -semiAlto * 0.22 : semiAlto * 0.38);
        return { mundo, x, y };
      });
      return { banda, terraza, semiAlto, fichas };
    });
  }, []);

  // ESC vuelve al minimapa.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCerrar?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCerrar]);

  return (
    <div className="navm-mapa" role="dialog" aria-label="Mapa estratégico de la finca por pisos térmicos">
      <style>{`
        .navm-mapa { position: fixed; inset: 0; z-index: 1200; background: #171d14;
          display: flex; align-items: center; justify-content: center; }
        .navm-mapa svg { display: block; width: min(100vw, 143vh); height: auto; max-height: 100vh; }
        .navm-ficha { cursor: pointer; }
        .navm-ficha:hover circle:nth-of-type(1), .navm-ficha:focus-visible circle:nth-of-type(1) { stroke-width: 5; }
        .navm-ficha:focus-visible { outline: none; }
        .navm-aqui { animation: navm-pulso 2.4s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
        .navm-botones { position: absolute; top: 14px; right: 14px; display: flex; gap: 8px; }
        .navm-boton { border: 1.5px solid #cdbf9b; background: rgba(26, 32, 27, 0.82); color: #f2ead4;
          font: 600 14px 'Baloo 2', Georgia, serif; padding: 8px 14px; border-radius: 999px; cursor: pointer; }
        .navm-boton:hover { background: rgba(58, 66, 52, 0.92); }
        @keyframes navm-pulso { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.55; } }
        @media (prefers-reduced-motion: reduce) { .navm-aqui { animation: none; } }
      `}</style>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="navm-vineta" cx="0.5" cy="0.5" r="0.72">
            <stop offset="0.62" stopColor="#000000" stopOpacity="0" />
            <stop offset="1" stopColor="#0c110b" stopOpacity="0.85" />
          </radialGradient>
        </defs>

        {/* El pergamino del tablero. */}
        <rect x="10" y="10" width={ANCHO - 20} height={ALTO - 20} rx="14" fill="#e9dcbb" />
        <rect x="22" y="22" width={ANCHO - 44} height={ALTO - 44} rx="10" fill="none" stroke="#8a734a" strokeWidth="2.5" />
        <rect x="30" y="30" width={ANCHO - 60} height={ALTO - 60} rx="8" fill="none" stroke="#8a734a" strokeWidth="1" opacity="0.6" />

        {/* ── LAS TERRAZAS, de la cima (atrás) al valle (adelante) ── */}
        {[...tablero].reverse().map(({ banda, terraza, semiAlto }) => (
          <g key={banda.id}>
            {/* El borde extruido (la ladera de la terraza). */}
            <path
              d={`M ${CX - terraza.semiAncho} ${terraza.cy} L ${CX} ${terraza.cy + semiAlto} L ${CX} ${terraza.cy + semiAlto + PROFUNDIDAD} L ${CX - terraza.semiAncho} ${terraza.cy + PROFUNDIDAD} Z`}
              fill={tono(banda.color, 0.62)}
            />
            <path
              d={`M ${CX + terraza.semiAncho} ${terraza.cy} L ${CX} ${terraza.cy + semiAlto} L ${CX} ${terraza.cy + semiAlto + PROFUNDIDAD} L ${CX + terraza.semiAncho} ${terraza.cy + PROFUNDIDAD} Z`}
              fill={tono(banda.color, 0.5)}
            />
            {/* La cara superior: el piso térmico. */}
            <path d={rombo(CX, terraza.cy, terraza.semiAncho, semiAlto)} fill={tono(banda.color, 1.12)} stroke={tono(banda.color, 0.6)} strokeWidth="2" />
            <path d={rombo(CX, terraza.cy, terraza.semiAncho * 0.94, semiAlto * 0.94)} fill="none" stroke={tono(banda.color, 1.4)} strokeWidth="1.2" opacity="0.7" />
            {/* La placa del piso, al borde izquierdo del tablero. */}
            <g fontFamily="Georgia, 'Times New Roman', serif">
              <rect x="44" y={terraza.cy - 34} width="178" height="64" rx="6" fill="#f4ecd4" stroke="#8a734a" strokeWidth="1.4" />
              <rect x="52" y={terraza.cy - 26} width="10" height="48" rx="3" fill={banda.color} />
              <text x="70" y={terraza.cy - 8} fontSize="17" fontWeight="bold" letterSpacing="1" fill="#2c2a1e">
                {banda.nombre.toUpperCase()}
              </text>
              <text x="70" y={terraza.cy + 12} fontSize="12.5" fontStyle="italic" fill="#4a4633">
                {banda.rango} · {banda.emojiCultivo}
              </text>
              <text x="70" y={terraza.cy + 26} fontSize="11.5" fontStyle="italic" fill="#6a6146">
                guardián: {banda.entNombre}
              </text>
              <line x1="222" y1={terraza.cy} x2={CX - terraza.semiAncho + 14} y2={terraza.cy} stroke="#8a734a" strokeWidth="1" strokeDasharray="4 4" opacity="0.7" />
            </g>
            {/* El Ent guardián plantado en la esquina de su terraza. */}
            <g transform={`translate(${CX - terraza.semiAncho * 0.58} ${terraza.cy - semiAlto * 0.3}) scale(1.15)`} aria-hidden="true">
              <GlifoEnt entId={banda.entId} color={tono(banda.color, 0.8)} />
            </g>
          </g>
        ))}

        {/* La quebrada que baja de la cima al valle, terraza por terraza. */}
        <path
          d={`M ${CX + 30} ${TERRAZAS[3].cy - 20} C ${CX + 90} ${TERRAZAS[3].cy + 60} ${CX - 60} ${TERRAZAS[2].cy} ${CX + 40} ${TERRAZAS[2].cy + 50} C ${CX + 120} ${TERRAZAS[2].cy + 100} ${CX - 40} ${TERRAZAS[1].cy + 30} ${CX + 50} ${TERRAZAS[1].cy + 80} C ${CX + 110} ${TERRAZAS[1].cy + 116} ${CX - 30} ${TERRAZAS[0].cy} ${CX + 30} ${TERRAZAS[0].cy + 60}`}
          stroke="#7fb3c0"
          strokeWidth="6"
          fill="none"
          opacity="0.55"
          strokeLinecap="round"
        />

        {/* ── LAS FICHAS: cada mundo sobre su terraza (mismo dato en los 3 zooms) ── */}
        {tablero.map(({ banda, fichas }) =>
          fichas.map(({ mundo, x, y }) => (
            <FichaMundo
              key={mundo.id}
              mundo={mundo}
              x={x}
              y={y}
              color={banda.color}
              actual={mundo.id === mundoActual}
              onNavigate={onNavigate}
            />
          )),
        )}

        {/* La rosa de los vientos y el rótulo del tablero. */}
        <g transform="translate(92 760)" fontFamily="Georgia, 'Times New Roman', serif" aria-hidden="true">
          <circle r="34" fill="#f4ecd4" stroke="#8a734a" strokeWidth="1.6" />
          <path d="M 0 -26 L 6 0 L 0 26 L -6 0 Z" fill="#8a734a" />
          <path d="M -26 0 L 0 -5 L 26 0 L 0 5 Z" fill="#bfa76b" />
          <text y="-38" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#2c2a1e">N</text>
          <text y="16" textAnchor="middle" fontSize="12" fill="#2c2a1e">⛰️</text>
        </g>
        <g fontFamily="Georgia, 'Times New Roman', serif">
          <rect x={ANCHO / 2 - 250} y="38" width="500" height="62" rx="6" fill="#f4ecd4" stroke="#8a734a" strokeWidth="1.6" />
          <text x={ANCHO / 2} y="65" textAnchor="middle" fontSize="22" fontWeight="bold" letterSpacing="2" fill="#2c2a1e">
            MAPA DE LA FINCA
          </text>
          <text x={ANCHO / 2} y="88" textAnchor="middle" fontSize="13.5" fontStyle="italic" fill="#4a4633">
            las terrazas de los pisos térmicos — toque una ficha para entrar
          </text>
        </g>

        {/* Niebla de guerra en los bordes, como manda el género. */}
        <rect x="10" y="10" width={ANCHO - 20} height={ALTO - 20} rx="14" fill="url(#navm-vineta)" pointerEvents="none" />
      </svg>

      <div className="navm-botones">
        {onGlobal && (
          <button type="button" className="navm-boton" onClick={onGlobal} aria-label="Abrir la vista global">
            🏔️ Vista global
          </button>
        )}
        {onCerrar && (
          <button type="button" className="navm-boton" onClick={onCerrar} aria-label="Cerrar el mapa">
            ✕ Cerrar
          </button>
        )}
      </div>
    </div>
  );
}
