/*
 * GemeloValle2D — el GEMELO 2D DE PRIMERA CLASE del valle (spec 20).
 *
 * Para gama baja, "menos movimiento" o cuando el 3D no carga: NO un modo
 * degradado triste, sino una LÁMINA pintada por capas (SVG+CSS, estética
 * rubber-hose andina) equivalente a la escena del valle 3D. Los mismos
 * sí-o-sí del valle: los mundos como LUGARES navegables (aquí, viñetas
 * dibujadas — maíz que se mece, cafetal con granos, corral con gallina,
 * frailejones en el filo del páramo, veleta que gira), la cosa del día que
 * brilla, Angelita como compañera que vuela al lugar tocado, y el clima que
 * tiñe toda la escena (5 pieles: dorada/soleado/niebla/lluvia/noche).
 *
 * Rendimiento gama baja: cero WebGL/three; solo se animan transform/opacity;
 * `reducedMotion` congela TODO a un fotograma digno (CSS lo apaga en bloque).
 *
 * CONTRATO — las MISMAS props que `Valle3D` (src/mockups/valle/Valle3D.jsx):
 *   { clima, focoId, animo, energia, reducedMotion, onEntrar, onAlerta }
 * más los DATOS por props (con default en el registro real, como el 3D):
 *   mundos  — lugares/hotspots [{ id, pos:[x,y,z], escala, tipo, titulo,
 *             emoji, lema, tinte:[fuerte,suave] }] (default MUNDOS_VALLE)
 *   alerta  — la cosa del día { anclaMundo, titulo, detalle } (default COSA_DEL_DIA)
 *   climas  — paletas de cielo por clima (default CLIMAS)
 *
 * CABLEO (para el integrador; este archivo NO toca nada existente):
 *   A. Espejo del framework: en `Mundo2D.jsx`, apuntar `MAPA_2D.valle2d` a
 *      `GemeloValleEscena` (export nombrado; mismo contrato que MundoValle2D).
 *   B. Directo: montar `<GemeloValle2D clima focoId animo energia
 *      reducedMotion onEntrar onAlerta />` donde hoy se monta Valle2DFallback.
 */
import { MUNDOS_VALLE, COSA_DEL_DIA, CLIMAS } from '../../mockups/valle/valleData';
import { AbejaAngelita } from '../creatures/AbejaAngelita.jsx';
import './GemeloValle2D.css';

/* ── Proyección: mismas coordenadas [x,z] del valle 3D, aplanadas a la lámina
      (viewBox 480×360). El gemelo conserva la GEOGRAFÍA del 3D: quien pasa de
      un equipo a otro encuentra cada lugar donde lo dejó. ── */
const VB_W = 480;
const VB_H = 360;
function iso(x, z) {
  // (Escala al día con el VALLE GRANDE del rediseño 2026-07: los lugares
  //  viven en x ∈ [-8.6, 8.6], z ∈ [-9.4, 9.6].)
  return { cx: 240 + (x - z) * 12, cy: 200 + (x + z) * 8 };
}
function pct(x, z) {
  const { cx, cy } = iso(x, z);
  return { left: (cx / VB_W) * 100, top: (cy / VB_H) * 100 };
}
const clampPct = (v) => Math.min(92, Math.max(8, v));

/* Altura visual (unidades de lámina) de cada viñeta, para colgar el letrero
   justo encima del dibujo y posar a la abeja sin taparlo. */
const ALTO_ARTE = {
  milpa: 40, cafetal: 24, era: 20, quebrada: 20, corral: 32,
  huerta: 18, bosque: 40, veleta: 34,
};

/* ── Tierras por clima: la piel del valle (el cielo sale de CLIMAS). ── */
const TIERRA = {
  dorada: {
    lejos: '#cfa176', loma: '#a3a05a', piso: '#8c9a50', hondo: '#79894a',
    parche: '#a8b064', agua: '#6fb3c4', camino: '#c09263', nube: '#ffe9c4',
  },
  soleado: {
    lejos: '#a9c6bd', loma: '#7fae5e', piso: '#619c4c', hondo: '#4f8a40',
    parche: '#74aa58', agua: '#57aec9', camino: '#b5895a', nube: '#ffffff',
  },
  niebla: {
    lejos: '#b6c3c6', loma: '#84987c', piso: '#6e8a68', hondo: '#5c7a5a',
    parche: '#7d967b', agua: '#8fb4bd', camino: '#a08a70', nube: '#e8eef0',
  },
  lluvia: {
    lejos: '#77878e', loma: '#5c7f52', piso: '#4c7045', hondo: '#3f613c',
    parche: '#57804f', agua: '#7fa9bd', camino: '#8a7154', nube: '#aab6bc',
  },
  noche: {
    lejos: '#2c3b58', loma: '#28503c', piso: '#1f4230', hondo: '#183726',
    parche: '#25493a', agua: '#2e5a80', camino: '#4a5870', nube: '#243654',
  },
};

/* ── Frailejón: la planta-firma del páramo, en rubber-hose (tronco lanudo +
      roseta de pétalos). Vive en el filo de la cordillera. ── */
function Frailejon({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M-2.4,0 L-1.7,-9.5 L1.7,-9.5 L2.4,0 Z" fill="#8a7a58" />
      <g className="gv-mece" style={{ '--gvd': `${(x % 5) * 0.4}s` }}>
        {[0, 45, 90, 135].map((a) => (
          <ellipse key={a} rx="1.8" ry="5.6" fill="#aebf7e"
            transform={`translate(0,-12) rotate(${a})`} />
        ))}
        <circle cy="-12" r="2.3" fill="#d9c96b" />
      </g>
    </g>
  );
}

/* ── Nube rechoncha (rubber-hose: puras curvas) que deriva despacio. ── */
function Nube({ x, y, s = 1, color, opacidad, dur = '26s' }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`} opacity={opacidad}>
      <g className="gv-nube" style={{ '--gvdur': dur }}>
        <ellipse rx="17" ry="6.5" fill={color} />
        <ellipse cx="-10" cy="2" rx="9" ry="5" fill={color} />
        <ellipse cx="11" cy="2" rx="10" ry="5.5" fill={color} />
        <ellipse cx="2" cy="-4" rx="9" ry="5" fill={color} />
      </g>
    </g>
  );
}

/* ── El arte de cada lugar: viñetas rubber-hose por `tipo` (el gemelo del
      LandmarkGeom del 3D). Coordenadas locales: el piso es y=0. ── */
function ArteLugar({ tipo, tinte, deNoche }) {
  const [fuerte, suave] = tinte;
  switch (tipo) {
    case 'milpa': // matas de maíz con penacho, cada una con su vaivén
      return (
        <g>
          {[[-13, 30], [-6, 34], [0, 39], [7, 33], [13, 28]].map(([dx, h], i) => (
            <g key={i} transform={`translate(${dx},0)`}>
              <g className="gv-mece" style={{ '--gvd': `${i * 0.6}s` }}>
                <path d={`M0,0 C2,${-h * 0.45} -2,${-h * 0.75} 0,${-h}`}
                  fill="none" stroke={fuerte} strokeWidth="2.6" strokeLinecap="round" />
                <path d={`M0,${-h * 0.42} C-6,${-h * 0.52} -10,${-h * 0.42} -12,${-h * 0.3}`}
                  fill="none" stroke={fuerte} strokeWidth="2.2" strokeLinecap="round" />
                <path d={`M0,${-h * 0.62} C6,${-h * 0.7} 10,${-h * 0.62} 12,${-h * 0.5}`}
                  fill="none" stroke={fuerte} strokeWidth="2.2" strokeLinecap="round" />
                <path d={`M0,${-h} l-3.2,-6 M0,${-h} l0,-7 M0,${-h} l3.2,-6`}
                  fill="none" stroke="#e7c96b" strokeWidth="1.8" strokeLinecap="round" />
              </g>
            </g>
          ))}
        </g>
      );
    case 'cafetal': // arbustos redondos con granos rojos sobre su terraza
      return (
        <g>
          <path d="M-26,2 Q0,8 26,2" fill="none" stroke={suave}
            strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          {[[-16, 7], [0, 9.5], [16, 7]].map(([dx, r], i) => (
            <g key={i} className="gv-mece" style={{ '--gvd': `${0.4 + i * 0.8}s`, '--gvdur': '6s' }}>
              <path d={`M${dx},0 L${dx},${-r - 3}`} stroke="#5a4327"
                strokeWidth="2" strokeLinecap="round" />
              <circle cx={dx} cy={-r - 5} r={r} fill={fuerte} />
              <circle cx={dx - r * 0.32} cy={-r - 5 - r * 0.32} r={r * 0.45}
                fill={suave} opacity="0.35" />
              <circle cx={dx + r * 0.42} cy={-r - 3.4} r="1.7" fill="#c94f3a" />
              <circle cx={dx - r * 0.46} cy={-r - 6.6} r="1.7" fill="#c94f3a" />
              <circle cx={dx + r * 0.1} cy={-r - 8.4} r="1.5" fill="#c94f3a" />
            </g>
          ))}
        </g>
      );
    case 'era': // eras del semillero, con maticas recién asomadas
      return (
        <g>
          {[-13, -6.5, 0].map((dy, i) => (
            <g key={i}>
              <rect x={-19 + i * 2} y={dy - 6} width="38" height="7" rx="3.5" fill="#5a3d28" />
              <rect x={-17 + i * 2} y={dy - 6} width="34" height="2.8" rx="1.4" fill="#7a5638" />
              {[-10, 0, 10].map((sx) => (
                <path key={sx}
                  d={`M${sx + i * 2},${dy - 6} l-2.6,-4.2 M${sx + i * 2},${dy - 6} l2.6,-4.2`}
                  fill="none" stroke={fuerte} strokeWidth="1.7" strokeLinecap="round" />
              ))}
            </g>
          ))}
        </g>
      );
    case 'quebrada': // el nacimiento: charca con brillo y juncos
      return (
        <g>
          <ellipse cy="-2" rx="16" ry="5.8" fill="#3a86a8" />
          <ellipse cx="-4" cy="-3" rx="6.5" ry="2" fill="#ffffff" opacity="0.35" />
          {[[-11, 13], [-3, 16], [9, 12]].map(([dx, h], i) => (
            <g key={i} className="gv-mece" style={{ '--gvd': `${i * 0.7}s`, '--gvdur': '5s' }}>
              <path d={`M${dx},-3 L${dx},${-h}`} stroke="#4e7d3f"
                strokeWidth="2" strokeLinecap="round" />
              <ellipse cx={dx} cy={-h - 2.5} rx="1.7" ry="3.6" fill="#7a5a34" />
            </g>
          ))}
          <path className="gv-titila" d="M11,-8 l0,4 M9,-6 l4,0" stroke="#ffffff"
            strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />
        </g>
      );
    case 'corral': // la casita de techo curvo, la cerca y una gallina
      return (
        <g>
          {[17, 23, 29].map((px) => (
            <path key={px} d={`M${px},0 L${px},-9`} stroke="#8a6a44"
              strokeWidth="2.4" strokeLinecap="round" />
          ))}
          <path d="M14,-6 L32,-6" stroke="#8a6a44" strokeWidth="2" strokeLinecap="round" />
          <rect x="-16" y="-16" width="30" height="16" rx="2" fill={suave} />
          <path d="M-21,-15 Q-1,-30 19,-15 Z" fill={fuerte} />
          <rect x="-10" y="-9" width="6" height="9" rx="1.6" fill="#7a5236" />
          <rect x="3" y="-11.5" width="6.5" height="5.5" rx="1.2"
            fill={deNoche ? '#ffd98a' : '#8a6a4c'} />
          <g className="gv-mece" style={{ '--gvdur': '3.6s' }}>
            <ellipse cx="24" cy="-3.2" rx="4" ry="3.2" fill="#efe3cd" />
            <circle cx="27.5" cy="-6.8" r="2" fill="#efe3cd" />
            <path d="M27,-8.9 q0.6,-1.7 1.5,-0.3" fill="none" stroke="#c94f3a"
              strokeWidth="1.3" strokeLinecap="round" />
            <path d="M29.4,-6.6 l1.9,0.7" stroke="#d9903a" strokeWidth="1.4"
              strokeLinecap="round" />
          </g>
        </g>
      );
    case 'huerta': // camas elevadas con sus matas en fila
      return (
        <g>
          {[-11, 11].map((dx, i) => (
            <g key={i}>
              <rect x={dx - 10} y="-7" width="20" height="7" rx="3" fill="#6b4a30" />
              {[-6, 0, 6].map((sx) => (
                <g key={sx} className="gv-mece" style={{ '--gvd': `${(i * 3 + sx) * 0.1 + 1}s`, '--gvdur': '5.4s' }}>
                  <circle cx={dx + sx} cy="-9.5" r="2.7" fill={fuerte} />
                  <circle cx={dx + sx - 0.9} cy="-10.4" r="1.1" fill={suave} opacity="0.5" />
                </g>
              ))}
            </g>
          ))}
        </g>
      );
    case 'bosque': // arboleda: troncos curvos y copas en racimo
      return (
        <g>
          {[[-14, 28], [1, 38], [14, 24]].map(([dx, h], i) => (
            <g key={i}>
              <path d={`M${dx},0 C${dx + 1.5},${-h * 0.35} ${dx - 1.5},${-h * 0.5} ${dx},${-h * 0.6}`}
                fill="none" stroke="#6b4a2e" strokeWidth="3" strokeLinecap="round" />
              <g className="gv-mece" style={{ '--gvd': `${i * 0.9}s`, '--gvdur': '7s' }}>
                <circle cx={dx - 4.5} cy={-h * 0.62} r={h * 0.22} fill={fuerte} />
                <circle cx={dx + 4.5} cy={-h * 0.64} r={h * 0.24} fill={fuerte} />
                <circle cx={dx} cy={-h * 0.78} r={h * 0.28} fill={fuerte} />
                <circle cx={dx - 2} cy={-h * 0.86} r={h * 0.13} fill={suave} opacity="0.45" />
              </g>
            </g>
          ))}
        </g>
      );
    case 'veleta': // la veleta del filo, cabeceando con el viento
      return (
        <g>
          <path d="M0,0 L0,-27" stroke="#7c6a4c" strokeWidth="2.6" strokeLinecap="round" />
          <g transform="translate(0,-27)">
            <g className="gv-gira">
              <path d="M-11,0 L11,0" stroke={fuerte} strokeWidth="2.4" strokeLinecap="round" />
              <path d="M11,0 l-4.5,-3.2 M11,0 l-4.5,3.2" fill="none" stroke={fuerte}
                strokeWidth="2.4" strokeLinecap="round" />
              <path d="M-11,-3.6 L-15.5,0 L-11,3.6 Z" fill={fuerte} />
            </g>
          </g>
          <circle cy="-27" r="2" fill="#5a4a30" />
        </g>
      );
    default: // mojón con banderita del tinte del mundo
      return (
        <g>
          <path d="M-7,0 Q-8,-9 0,-10 Q8,-9 7,0 Z" fill="#9a8a6a" />
          <path d="M0,-10 L0,-22" stroke="#7c6a4c" strokeWidth="2" strokeLinecap="round" />
          <path d="M0,-22 L10,-18.5 L0,-15 Z" fill={fuerte} />
        </g>
      );
  }
}

/* ── Estrellas fijas del páramo (solo de noche): titilan por turnos. ── */
const ESTRELLAS = [
  [36, 30], [82, 18], [128, 44], [172, 22], [214, 38], [258, 14],
  [300, 34], [346, 20], [392, 42], [436, 26], [456, 54], [110, 62],
];

export default function GemeloValle2D({
  clima = 'soleado',
  focoId = null,
  animo = 'sereno',
  energia = 1,
  reducedMotion = false,
  mundos = MUNDOS_VALLE,
  alerta = COSA_DEL_DIA,
  climas = CLIMAS,
  onEntrar,
  onAlerta,
}) {
  const c = climas[clima] || climas.soleado || Object.values(climas)[0];
  const t = TIERRA[clima] || TIERRA.soleado;
  const deNoche = clima === 'noche';
  const conSol = clima === 'dorada' || clima === 'soleado';

  // Painter's order: de atrás (arriba) hacia adelante (abajo).
  const orden = [...mundos].sort((a, b) => iso(a.pos[0], a.pos[2]).cy - iso(b.pos[0], b.pos[2]).cy);

  const ancla = alerta ? mundos.find((m) => m.id === alerta.anclaMundo) : null;
  const foco = focoId ? mundos.find((m) => m.id === focoId) : null;
  const camPos = foco ? pct(foco.pos[0], foco.pos[2]) : { left: 50, top: 50 };
  const abejaPos = foco
    ? { left: pct(foco.pos[0], foco.pos[2]).left, top: pct(foco.pos[0], foco.pos[2]).top - ((ALTO_ARTE[foco.tipo] || 24) / VB_H) * 100 - 3 }
    : { left: 52, top: 42 };

  return (
    <div
      className="gemelo-valle"
      data-clima={clima}
      data-quieto={reducedMotion ? 'si' : 'no'}
      data-entrando={foco ? 'si' : 'no'}
    >
      {/* cámara-lámina: al tocar un mundo, la lámina se ACERCA hacia él */}
      <div
        className="gemelo-valle__cam"
        style={{
          transformOrigin: `${camPos.left}% ${camPos.top}%`,
          transform: foco ? 'scale(1.45)' : 'scale(1)',
        }}
      >
        {/* lienzo con la razón exacta del viewBox: los botones (en %) quedan
            SIEMPRE alineados con el dibujo, recorte tipo cover sin deformar */}
        <div className="gemelo-valle__lienzo">
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="gemelo-valle__svg"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="El valle de su finca, pintado a mano. Toque un lugar para viajar hasta él."
          >
            <defs>
              <linearGradient id="gv-cielo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={c.cielo[0]} />
                <stop offset="1" stopColor={c.cielo[1]} />
              </linearGradient>
            </defs>

            {/* cielo + astro */}
            <rect width={VB_W} height={VB_H} fill="url(#gv-cielo)" />
            {conSol && (
              <g className="gv-alza">
                <circle cx="394" cy={clima === 'dorada' ? 84 : 60} r={clima === 'dorada' ? 30 : 19}
                  fill={clima === 'dorada' ? '#ffcf7e' : '#fff2c9'} />
                <circle cx="394" cy={clima === 'dorada' ? 84 : 60} r={clima === 'dorada' ? 44 : 30}
                  fill={clima === 'dorada' ? '#ffcf7e' : '#fff2c9'} opacity="0.28" />
              </g>
            )}
            {deNoche && (
              <g className="gv-alza">
                <circle cx="396" cy="58" r="16" fill="#e8f0ff" />
                <circle cx="402" cy="53" r="13.5" fill={c.cielo[0]} />
                {ESTRELLAS.map(([sx, sy], i) => (
                  <circle key={i} cx={sx} cy={sy} r={i % 3 === 0 ? 1.6 : 1.1} fill="#dfeaff"
                    className="gv-titila" style={{ '--gvd': `${(i % 5) * 0.7}s` }} />
                ))}
              </g>
            )}

            {/* nubes rechonchas */}
            <Nube x={92} y={54} s={1.05} color={t.nube} opacidad={deNoche ? 0.14 : 0.85} dur="34s" />
            <Nube x={318} y={36} s={0.8} color={t.nube} opacidad={deNoche ? 0.1 : 0.7} dur="26s" />
            <Nube x={206} y={82} s={0.55} color={t.nube} opacidad={deNoche ? 0.08 : 0.55} dur="21s" />

            {/* cordillera del páramo */}
            <g className="gv-alza" style={{ '--gvd': '0.08s' }}>
              <path
                d="M0,158 C28,128 52,102 84,104 C112,106 128,132 156,130 C186,128 204,92 232,74 C248,64 260,60 272,64 C296,72 306,96 330,104 C356,113 372,94 398,96 C426,98 452,128 480,124 L480,360 L0,360 Z"
                fill={t.lejos} opacity="0.95"
              />
            </g>

            {/* loma media con sus terrazas */}
            <g className="gv-alza" style={{ '--gvd': '0.16s' }}>
              <path
                d="M0,150 C36,126 74,116 118,120 C152,123 176,134 212,142 C258,152 300,144 344,150 C398,158 444,170 480,164 L480,360 L0,360 Z"
                fill={t.loma}
              />
              <path d="M20,152 C60,141 102,135 146,139" fill="none"
                stroke="#1e2a12" strokeWidth="2" strokeLinecap="round" opacity="0.12" />
              <path d="M14,164 C58,153 108,147 158,152" fill="none"
                stroke="#1e2a12" strokeWidth="2" strokeLinecap="round" opacity="0.1" />
              <path d="M338,158 C382,152 430,158 470,166" fill="none"
                stroke="#1e2a12" strokeWidth="2" strokeLinecap="round" opacity="0.1" />
            </g>

            {/* frailejones en el filo (la firma del páramo) */}
            <g className="gv-alza" style={{ '--gvd': '0.22s' }}>
              <Frailejon x={206} y={118} s={0.9} />
              <Frailejon x={238} y={110} s={1.05} />
              <Frailejon x={308} y={122} s={0.85} />
              <Frailejon x={344} y={130} s={0.7} />
            </g>

            {/* piso del valle: parcelas cosidas como colcha */}
            <g className="gv-alza" style={{ '--gvd': '0.26s' }}>
              <path
                d="M0,214 C48,196 96,186 152,190 C210,194 244,208 300,206 C352,204 420,190 480,200 L480,360 L0,360 Z"
                fill={t.piso}
              />
              <rect x="58" y="196" width="72" height="24" rx="9" fill={t.parche}
                opacity="0.85" transform="rotate(-4 94 208)" />
              <rect x="188" y="214" width="60" height="21" rx="8" fill={t.hondo}
                opacity="0.6" transform="rotate(3 218 224)" />
              <rect x="330" y="232" width="66" height="23" rx="9" fill={t.parche}
                opacity="0.7" transform="rotate(-2 363 243)" />
              <path
                d="M0,300 C80,284 160,290 240,296 C320,302 400,290 480,296 L480,360 L0,360 Z"
                fill={t.hondo} opacity="0.9"
              />
            </g>

            {/* la quebrada baja del nacimiento, con sus destellos */}
            <g className="gv-alza" style={{ '--gvd': '0.32s' }}>
              <path
                d="M292,196 C288,214 302,228 296,246 C288,268 310,286 304,308 C300,326 314,342 322,360"
                fill="none" stroke={t.agua} strokeWidth="11" strokeLinecap="round" opacity="0.9"
              />
              <path
                d="M292,196 C288,214 302,228 296,246 C288,268 310,286 304,308 C300,326 314,342 322,360"
                fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round"
                strokeDasharray="9 27" opacity="0.3"
              />
              <circle cx="297" cy="238" r="2" fill="#ffffff" opacity="0.7"
                className="gv-titila" />
              <circle cx="306" cy="298" r="1.8" fill="#ffffff" opacity="0.6"
                className="gv-titila" style={{ '--gvd': '1.4s' }} />
            </g>

            {/* el camino de piedritas: de la casa hacia el frente */}
            <path className="gv-alza" style={{ '--gvd': '0.36s' }}
              d="M167,134 C180,160 150,190 170,214 C190,238 226,252 238,282 C248,306 240,332 246,358"
              fill="none" stroke={t.camino} strokeWidth="6" strokeLinecap="round"
              strokeDasharray="0.5 11" opacity="0.9"
            />

            {/* los MUNDOS como viñetas dibujadas, de atrás hacia adelante */}
            <g className="gemelo-valle__lugares">
              {orden.map((m, i) => {
                const { cx, cy } = iso(m.pos[0], m.pos[2]);
                const s = m.escala || 1;
                return (
                  <g key={m.id} transform={`translate(${cx},${cy}) scale(${s})`}>
                    <g className="gv-pop" style={{ '--gvd': `${0.4 + i * 0.07}s` }}>
                      <ellipse cy="1.5" rx="20" ry="4" fill="#141d0a" opacity="0.16" />
                      <ArteLugar tipo={m.tipo} tinte={m.tinte} deNoche={deNoche} />
                    </g>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* letreros de vereda: los mismos hotspots navegables del 3D */}
          <div className="gemelo-valle__capa">
            {orden.map((m) => {
              const p = pct(m.pos[0], m.pos[2]);
              const alto = (ALTO_ARTE[m.tipo] || 24) * (m.escala || 1);
              const activo = focoId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`gv-poi${activo ? ' gv-poi--activo' : ''}`}
                  style={{
                    left: `${clampPct(p.left)}%`,
                    top: `${clampPct(p.top - (alto / VB_H) * 100 - 1.5)}%`,
                    '--poi-tinte': m.tinte[0],
                  }}
                  onClick={() => onEntrar?.(m.id)}
                  aria-label={`Viajar al mundo ${m.titulo}. ${m.lema}`}
                >
                  <span className="gv-poi__medalla" aria-hidden="true">{m.emoji}</span>
                  <span className="gv-poi__nombre">{m.titulo}</span>
                </button>
              );
            })}

            {/* la cosa del día: UN solo destello, anclado a su lugar */}
            {ancla && (() => {
              const p = pct(ancla.pos[0], ancla.pos[2]);
              return (
                <button
                  type="button"
                  className="gv-alerta"
                  style={{
                    left: `${clampPct(p.left)}%`,
                    top: `${clampPct(p.top - 14)}%`,
                  }}
                  onClick={() => onAlerta?.()}
                  aria-label={`Alerta del día: ${alerta.titulo}. ${alerta.detalle || ''}`}
                >
                  <span aria-hidden="true">⚠️</span> {alerta.titulo}
                </button>
              );
            })()}

            {/* Angelita, la compañera: ronda el valle y vuela al lugar tocado */}
            <div
              className="gv-abeja"
              style={{ left: `${abejaPos.left}%`, top: `${abejaPos.top}%` }}
              aria-hidden="true"
            >
              <div className="gv-abeja__bob">
                <AbejaAngelita
                  size={foco ? 38 : 40 + Math.round(energia * 12)}
                  animo={animo}
                  energia={energia}
                  animated={!reducedMotion}
                />
              </div>
            </div>

            {/* luciérnagas del páramo (solo de noche, solo con movimiento) */}
            {deNoche && !reducedMotion && (
              <>
                <span className="gv-luciernaga" style={{ left: '30%', top: '58%', '--gvd': '0s' }} />
                <span className="gv-luciernaga" style={{ left: '66%', top: '64%', '--gvd': '1.3s' }} />
                <span className="gv-luciernaga" style={{ left: '48%', top: '72%', '--gvd': '2.2s' }} />
              </>
            )}
          </div>
        </div>

        {/* clima vivo: lluvia que cae / bancos de niebla que cruzan */}
        {clima === 'lluvia' && <div className="gv-lluvia" aria-hidden="true" />}
        {clima === 'niebla' && (
          <div className="gv-niebla" aria-hidden="true">
            <span className="gv-niebla__banco" />
            <span className="gv-niebla__banco gv-niebla__banco--b" />
          </div>
        )}
      </div>

      {/* el velo de luz: el clima tiñe la lámina entera */}
      <div className="gemelo-valle__velo" aria-hidden="true" />
    </div>
  );
}

/*
 * GemeloValleEscena — ADAPTADOR con el contrato del framework de mundos
 * (idéntico a MundoValle2D/EscenaValle): { params, entrada, reducedMotion,
 * onHotspot, animo, energia }. Listo para colgarse en `MAPA_2D.valle2d`
 * (Mundo2D.jsx) sin tocar nada más.
 */
export function GemeloValleEscena({
  params, entrada, reducedMotion = false, onHotspot, animo = 'sereno', energia = 1,
}) {
  const clima = params?.clima || entrada?.clima || 'soleado';
  return (
    <GemeloValle2D
      clima={clima}
      focoId={null}
      animo={animo}
      energia={energia}
      reducedMotion={reducedMotion}
      onEntrar={(id) => onHotspot?.('mundo', { mundoId: id })}
      onAlerta={() => onHotspot?.(entrada?.alertaView || 'hoy_finca')}
    />
  );
}
