/*
 * AccesoriosClima — el VESTUARIO de clima dibujado (ruana / sombrero / sudor),
 * species-agnostic. Consume el estado de `ropaDeClima` (creatureClimaCuerpo) y lo
 * pinta sobre la creature: ruana de noche/frío, sombrero + sudor al sol cálido.
 *
 * La creature pasa sus ANCLAS (cabeza, tronco) en unidades de su viewBox; así el
 * mismo componente viste a cualquier bicho sin saber su dibujo. Rubber-hose
 * andino: contorno cálido, ruana con franjas, sombrero aguadeño de paja.
 *
 * `mojado`/`niebla` NO se dibujan acá (la creature ya los cuenta con sus gotas y
 * la opacidad de `cuerpoDeClima`): este módulo es SOLO la ropa que se pone.
 */

import { RH_INK } from './_rubberhose.jsx';
import './climaAccesorios.css';

/* Paleta andina de la ruana (lana natural + franjas tierra/rojo). */
const RUANA = {
  pano: '#7a5a3c',
  franja: '#a83f2e',
  franja2: '#d9b26a',
};
const PAJA = '#e2c079';
const BANDA = '#5a3c22';
const SUDOR = '#bfe6ff';

/**
 * @param {Object} props
 * @param {{ruana?:boolean, sombrero?:boolean, sudor?:boolean}} props.estado  de ropaDeClima.
 * @param {{cx:number, cy:number, r:number}} props.cabeza  ancla/medida de la cabeza.
 * @param {{cx:number, cy:number, rx:number, ry:number}} props.tronco  ancla del tronco.
 * @param {string} [props.ink=RH_INK]
 * @param {boolean} [props.animated=true]  mece la ruana / salta el sudor.
 * @returns {JSX.Element|null}
 */
export function AccesoriosClima({ estado, cabeza, tronco, ink = RH_INK, animated = true }) {
  if (!estado) return null;
  const { ruana, sombrero, sudor } = estado;
  if (!ruana && !sombrero && !sudor) return null;

  const t = tronco || { cx: 0, cy: 0, rx: 8, ry: 5 };
  const h = cabeza || { cx: 0, cy: -6, r: 4 };

  // ── RUANA: poncho sobre el tronco, con abertura de cuello y franjas. ──────
  const ruanaEl = ruana ? (() => {
    const w = t.rx * 1.18;
    const top = t.cy - t.ry * 0.45;
    const hem = t.cy + t.ry * 1.05;
    return (
      <g className={animated ? 'crt-ruana' : undefined}>
        <path
          d={`M${t.cx - w},${top} Q${t.cx},${top - t.ry * 0.7} ${t.cx + w},${top}
              L${t.cx + w * 0.86},${hem} Q${t.cx},${hem + 1.6} ${t.cx - w * 0.86},${hem} Z`}
          fill={RUANA.pano} stroke={ink} strokeWidth="1.1" strokeLinejoin="round"
        />
        {/* franjas horizontales del tejido */}
        <path d={`M${t.cx - w * 0.94},${t.cy + t.ry * 0.2} L${t.cx + w * 0.94},${t.cy + t.ry * 0.2}`}
          stroke={RUANA.franja} strokeWidth="1.1" />
        <path d={`M${t.cx - w * 0.9},${t.cy + t.ry * 0.55} L${t.cx + w * 0.9},${t.cy + t.ry * 0.55}`}
          stroke={RUANA.franja2} strokeWidth="0.7" />
        {/* abertura del cuello (V) */}
        <path d={`M${t.cx - 1.7},${top} L${t.cx},${top + t.ry * 0.5} L${t.cx + 1.7},${top}`}
          fill="none" stroke={ink} strokeWidth="0.9" strokeLinecap="round" />
      </g>
    );
  })() : null;

  // ── SOMBRERO: aguadeño de paja sobre la cabeza. ──────────────────────────
  const sombreroEl = sombrero ? (() => {
    const hy = h.cy - h.r * 0.9;
    return (
      <g>
        <ellipse cx={h.cx} cy={hy} rx={h.r * 1.45} ry={h.r * 0.42} fill={PAJA} stroke={ink} strokeWidth="0.9" />
        <path d={`M${h.cx - h.r * 0.78},${hy} Q${h.cx},${hy - h.r * 1.25} ${h.cx + h.r * 0.78},${hy} Z`}
          fill={PAJA} stroke={ink} strokeWidth="0.9" />
        <path d={`M${h.cx - h.r * 0.72},${hy - h.r * 0.34} Q${h.cx},${hy - h.r * 0.2} ${h.cx + h.r * 0.72},${hy - h.r * 0.34}`}
          fill="none" stroke={BANDA} strokeWidth="1.1" />
      </g>
    );
  })() : null;

  // ── SUDOR: gotitas que saltan de la sien (solo día + sol + calor). ────────
  const sudorEl = sudor ? (
    <g className={animated ? 'crt-sudor' : undefined} fill={SUDOR} stroke={ink} strokeWidth="0.4">
      <path className="crt-gota-sudor"
        d={`M${h.cx + h.r * 0.95},${h.cy - h.r * 0.35} q-0.7,1.2 0,2.2 q0.7,-0.9 0,-2.2 Z`} />
      <path className="crt-gota-sudor" style={{ animationDelay: '-0.6s' }}
        d={`M${h.cx + h.r * 0.55},${h.cy - h.r * 0.75} q-0.6,1 0,1.9 q0.6,-0.8 0,-1.9 Z`} />
    </g>
  ) : null;

  return (
    <g data-accesorios-clima="">
      {ruanaEl}
      {sombreroEl}
      {sudorEl}
    </g>
  );
}

export default AccesoriosClima;
