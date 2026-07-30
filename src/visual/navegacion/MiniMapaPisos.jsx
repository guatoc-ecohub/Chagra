/* eslint-disable chagra-i18n/no-hardcoded-spanish */
/*
 * MiniMapaPisos — el zoom MINI de la navegación por pisos térmicos.
 *
 * El minimapa de esquina, SIEMPRE visible y nada invasivo: una montañita con
 * las cuatro bandas de altitud (cálido abajo → páramo y nieve arriba), un
 * punto por mundo en su banda, y el "usted está aquí" latiendo en dorado.
 * Orientación de un vistazo; tocar un punto navega; los dos botones abren
 * los zooms mayores (mapa estratégico y vista global).
 *
 * El dato mundo→piso es el MISMO de los otros dos zooms
 * (`pisosNavegacion.js`): coherencia total entre escalas.
 */
import { useMemo } from 'react';
import { mundosPorBanda, pisoDeMundo, bandaPorId } from './pisosNavegacion.js';

const ANCHO = 132;
const ALTO = 128;

/* La montañita: y de cada banda dentro del triángulo del minimapa. */
const Y_BANDAS = [
  { yTop: 96, yBot: 122 }, // cálido (la falda)
  { yTop: 70, yBot: 96 }, // templado
  { yTop: 46, yBot: 70 }, // frío
  { yTop: 22, yBot: 46 }, // páramo (bajo la nieve)
];

/* Medio-ancho de la montaña a una altura y (triángulo, cima en y=10). */
function semiAnchoEn(y) {
  return ((y - 10) / (122 - 10)) * 56;
}

/**
 * @param {object} props
 * @param {string|null} [props.mundoActual] id del mundo donde está el usuario
 * @param {(mundo: {id:string, destino:{view:string, data?:object}}) => void} [props.onNavigate]
 * @param {() => void} [props.onMapa]    abrir el zoom medio (mapa estratégico)
 * @param {() => void} [props.onGlobal]  abrir el zoom grande (vista global)
 */
export default function MiniMapaPisos({ mundoActual = null, onNavigate, onMapa, onGlobal }) {
  const pisoActual = pisoDeMundo(mundoActual);
  const bandaActual = bandaPorId(pisoActual);

  // Puntos por banda: reparto horizontal determinista dentro de la montañita.
  const puntos = useMemo(() => {
    const out = [];
    mundosPorBanda().forEach(({ banda, mundos }, i) => {
      const zona = Y_BANDAS[i] || Y_BANDAS[Y_BANDAS.length - 1];
      const n = mundos.length;
      mundos.forEach((mundo, j) => {
        const y = zona.yTop + ((j % 2) + 1) * ((zona.yBot - zona.yTop) / 3);
        const semi = semiAnchoEn(y) * 0.8;
        const x = 66 + (n === 1 ? 0 : ((j + 0.5) / n - 0.5) * 2 * semi);
        out.push({ mundo, banda, x, y });
      });
    });
    return out;
  }, []);

  return (
    <div className="navp-mini" aria-label="Minimapa de la finca por pisos térmicos">
      <style>{`
        .navp-mini { position: fixed; right: 14px; bottom: 14px; z-index: 1100; width: 148px;
          background: rgba(18, 24, 19, 0.86); border: 1.5px solid rgba(205, 191, 155, 0.55);
          border-radius: 14px; padding: 8px 8px 9px; color: #f2ead4; backdrop-filter: blur(3px); }
        .navp-mini svg { display: block; margin: 0 auto; }
        .navp-punto { cursor: pointer; }
        .navp-punto:hover circle, .navp-punto:focus-visible circle { stroke: #f2ead4; stroke-width: 1.6; }
        .navp-punto:focus-visible { outline: none; }
        .navp-aqui-lat { animation: navp-late 2s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
        .navp-chip { margin: 4px 2px 6px; text-align: center; font: 600 11px 'Baloo 2', Georgia, serif;
          color: #e8dfc4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .navp-zoom { display: flex; gap: 6px; }
        .navp-zoom button { flex: 1; border: 1px solid rgba(205, 191, 155, 0.5); background: rgba(46, 54, 42, 0.85);
          color: #f2ead4; font: 600 11px 'Baloo 2', Georgia, serif; padding: 5px 2px; border-radius: 8px; cursor: pointer; }
        .navp-zoom button:hover { background: rgba(74, 84, 62, 0.95); }
        @keyframes navp-late { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.7); opacity: 0.35; } }
        @media (prefers-reduced-motion: reduce) { .navp-aqui-lat { animation: none; } }
      `}</style>
      <svg width={ANCHO} height={ALTO} viewBox={`0 0 ${ANCHO} ${ALTO}`}>
        {/* La montañita por bandas (triángulo apilado) + su nieve. */}
        {mundosPorBanda().map(({ banda }, i) => {
          const zona = Y_BANDAS[i] || Y_BANDAS[Y_BANDAS.length - 1];
          const sT = semiAnchoEn(zona.yTop);
          const sB = semiAnchoEn(zona.yBot);
          return (
            <path
              key={banda.id}
              d={`M ${66 - sB} ${zona.yBot} L ${66 - sT} ${zona.yTop} L ${66 + sT} ${zona.yTop} L ${66 + sB} ${zona.yBot} Z`}
              fill={banda.color}
              stroke="rgba(18,24,19,0.5)"
              strokeWidth="1"
              opacity={pisoActual && banda.id !== pisoActual ? 0.62 : 0.98}
            />
          );
        })}
        <path d={`M 66 10 L ${66 - semiAnchoEn(22)} 22 L ${66 + semiAnchoEn(22)} 22 Z`} fill="#f4f8fa" />

        {/* Un punto por mundo, tocable, en su banda. */}
        {puntos.map(({ mundo, x, y }) => {
          const esActual = mundo.id === mundoActual;
          return (
            <g
              key={mundo.id}
              className="navp-punto"
              role="button"
              tabIndex={0}
              aria-label={`Ir a ${mundo.titulo}`}
              onClick={() => onNavigate?.(mundo)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onNavigate?.(mundo);
                }
              }}
            >
              {esActual && <circle cx={x} cy={y} r="7" fill="none" stroke="#e5b54a" strokeWidth="2" className="navp-aqui-lat" />}
              <circle cx={x} cy={y} r={esActual ? 4.4 : 3.4} fill={esActual ? '#e5b54a' : '#f7f0dd'} stroke="rgba(18,24,19,0.6)" strokeWidth="1" >
                <title>{mundo.titulo}</title>
              </circle>
            </g>
          );
        })}
      </svg>
      <div className="navp-chip">
        {bandaActual ? `${bandaActual.nombre} · ${bandaActual.rango}` : 'La finca por pisos'}
      </div>
      <div className="navp-zoom">
        {onMapa && (
          <button type="button" onClick={onMapa} aria-label="Abrir el mapa de la finca">
            🗺️ Mapa
          </button>
        )}
        {onGlobal && (
          <button type="button" onClick={onGlobal} aria-label="Abrir la vista global">
            🏔️ Global
          </button>
        )}
      </div>
    </div>
  );
}
