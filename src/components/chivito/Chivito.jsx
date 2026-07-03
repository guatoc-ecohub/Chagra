import { useId, useState } from 'react';
import './chivito.css';

/**
 * Chivito — el CHIVITO DE PÁRAMO (Oxypogon guerinii, "barbudito paramuno")
 * dibujado 100% en SVG/CSS. Cero assets, cero red, offline-first, gama baja.
 * Reemplazo del colibrí en las tres piezas del ave insignia.
 *
 * Fiel a la foto real del ave:
 *   - Cresta erguida, puntiaguda, blanco-crema con base oscura.
 *   - Cara: capucha marrón oscuro + máscara negra + raya de mejilla clara.
 *   - BARBA ICÓNICA: larga y puntiaguda, iridiscente VERDE arriba → VIOLETA/
 *     PÚRPURA en la punta (lo que hace único al chivito).
 *   - Cuerpo compacto oliva-marrón, vientre pálido, cola larga oscura con
 *     puntas claras, pico corto y recto negro.
 *
 * DISEÑO DEFINITIVO (el operador eligió el mockup B en el A/B de chagra-dev):
 * detallado / rico — gradientes, barba iridiscente con destello animado,
 * plumas, moteado, sombras. El mockup A (plano) fue retirado.
 *
 * Piezas exportadas:
 *   - ChivitoAve       → sólo el ave (perfil, mirando a la derecha).
 *   - ChivitoEscena    → el ave libando la flor amarilla del frailejón (HOME).
 *   - ChivitoBoton     → el ave como icono del botón enviar/hablar del agente.
 *   - ChivitoCruza     → el ave cruzando aleteando (TRANSICIÓN home→agente).
 *
 * Español colombiano (usted), NUNCA voseo argentino.
 */

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

// ID único y estable para los <defs> del SVG (varios chivitos coexisten en la
// página — home, botón, FAB — así que cada uno necesita ids de gradiente
// propios). `useId` es puro (no hay side-effects en render); se limpian los
// ':' para que sirvan como fragmento en `fill="url(#...)"`.
function useUid(prefix) {
  return `${prefix}-${useId().replace(/:/g, '')}`;
}

/* ══════════════════════════════════════════════════════════════════════════
 *  EL CHIVITO — detallado / rico (gradientes, iridiscencia animada, plumas,
 *  sombras). Perfil mirando a la derecha.
 * ════════════════════════════════════════════════════════════════════════ */
function ChivitoSVG({ id }) {
  const g = (s) => `${id}-${s}`;
  return (
    <svg viewBox="0 0 140 132" className="chiv-svg" aria-hidden="true">
      <defs>
        {/* plumaje del cuerpo: oliva cálido → marrón */}
        <linearGradient id={g('cuerpo')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9c8452" />
          <stop offset="52%" stopColor="#7c6238" />
          <stop offset="100%" stopColor="#5c4526" />
        </linearGradient>
        <linearGradient id={g('vientre')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e6dcc2" />
          <stop offset="100%" stopColor="#c3b590" />
        </linearGradient>
        <linearGradient id={g('ala')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6f5533" />
          <stop offset="100%" stopColor="#3f2d18" />
        </linearGradient>
        <linearGradient id={g('cola')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5a4529" />
          <stop offset="100%" stopColor="#2f2213" />
        </linearGradient>
        <linearGradient id={g('capucha')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a4023" />
          <stop offset="100%" stopColor="#33240f" />
        </linearGradient>
        <linearGradient id={g('cresta')} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#c7b485" />
          <stop offset="45%" stopColor="#f2ead6" />
          <stop offset="100%" stopColor="#fffdf6" />
        </linearGradient>
        {/* BARBA iridiscente: verde esmeralda → violeta/púrpura en la punta */}
        <linearGradient id={g('barba')} x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0" stopColor="#2fe08a" />
          <stop offset="34%" stopColor="#12b866" />
          <stop offset="62%" stopColor="#2a8fbf" />
          <stop offset="82%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id={g('barba-brillo')} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#a7ffd6" />
          <stop offset="100%" stopColor="#e9c9ff" />
        </linearGradient>
        <radialGradient id={g('ojo')} cx="42%" cy="38%" r="60%">
          <stop offset="0" stopColor="#4a3a2a" />
          <stop offset="100%" stopColor="#0c0703" />
        </radialGradient>
      </defs>

      {/* COLA larga con gradiente + puntas blancas (rectrices externas) */}
      <g>
        <path d="M50 74 L8 110 L18 112 L13 121 L28 113 L28 122 L44 104 L60 84 Z" fill={`url(#${g('cola')})`} />
        <path d="M8 110 L18 112 L14 118 Z" fill="#f3ecda" />
        <path d="M24 118 L28 113 L28 122 Z" fill="#f3ecda" />
        {/* nervaduras de las rectrices */}
        <g stroke="#241a0f" strokeWidth="0.5" opacity="0.4" fill="none">
          <path d="M52 78 L20 106" /><path d="M56 82 L30 108" />
        </g>
      </g>

      {/* ALA trasera batiendo */}
      <g className="chiv-ala-tras">
        <path d="M74 55 Q46 37 26 52 Q48 70 78 62 Z" fill={`url(#${g('ala')})`} opacity="0.9" />
      </g>

      {/* CUERPO con gradiente + moteado de plumas */}
      <ellipse cx="66" cy="70" rx="28" ry="21" fill={`url(#${g('cuerpo')})`} transform="rotate(-12 66 70)" />
      {/* vientre pálido afelpado */}
      <path d="M44 80 Q60 100 90 84 Q76 72 52 72 Z" fill={`url(#${g('vientre')})`} opacity="0.95" />
      {/* moteado del pecho (pintitas claras y oscuras) */}
      <g className="chiv-moteado">
        <g fill="#efe4c8" opacity="0.6">
          <circle cx="58" cy="74" r="1.4" /><circle cx="66" cy="78" r="1.2" />
          <circle cx="74" cy="74" r="1.3" /><circle cx="62" cy="70" r="1.1" />
          <circle cx="70" cy="82" r="1.1" /><circle cx="54" cy="70" r="1.0" />
        </g>
        <g fill="#4a3820" opacity="0.4">
          <circle cx="61" cy="76" r="0.8" /><circle cx="69" cy="76" r="0.8" />
          <circle cx="65" cy="82" r="0.7" /><circle cx="73" cy="80" r="0.7" />
        </g>
      </g>

      {/* CABEZA */}
      <circle cx="98" cy="46" r="16.5" fill={`url(#${g('cuerpo')})`} />
      {/* capucha marrón oscuro */}
      <path d="M84 44 Q98 24 113 43 Q106 31 98 30 Q90 31 84 44 Z" fill={`url(#${g('capucha')})`} />
      {/* máscara negra alrededor del ojo */}
      <path d="M91 39 Q101 34 111 44 Q104 51 93 50 Q90 44 91 39 Z" fill="#1a120a" />
      {/* raya de mejilla clara, difusa */}
      <path d="M89 53 Q101 58 113 52 Q102 62 89 58 Z" fill="#f1e9d6" opacity="0.95" />
      {/* pómulo con leve rubor cálido */}
      <ellipse cx="93" cy="53" rx="4" ry="2.4" fill="#d9b98c" opacity="0.5" />

      {/* CRESTA fina, puntiaguda, crema con base oscura (varias plumas) */}
      <g className="chiv-cresta">
        <path d="M88 33 Q98 27 108 33 L106 41 L90 41 Z" fill="#33240f" />
        <path d="M90 37 Q87 21 86 9 Q92 21 94 37 Z" fill={`url(#${g('cresta')})`} stroke="#a08a5c" strokeWidth="0.5" />
        <path d="M95 37 Q95 18 96 6 Q100 18 100 37 Z" fill={`url(#${g('cresta')})`} stroke="#a08a5c" strokeWidth="0.5" />
        <path d="M100 37 Q102 20 106 10 Q106 22 105 38 Z" fill={`url(#${g('cresta')})`} stroke="#a08a5c" strokeWidth="0.5" />
        <path d="M104 38 Q108 24 113 17 Q112 27 108 39 Z" fill={`url(#${g('cresta')})`} stroke="#a08a5c" strokeWidth="0.5" />
      </g>

      {/* PICO corto y recto negro, con brillo */}
      <path d="M113 48 L131 50" fill="none" stroke="#160e06" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M115 47 L128 49" fill="none" stroke="#5a4a38" strokeWidth="0.7" strokeLinecap="round" opacity="0.6" />

      {/* OJO con catchlight */}
      <circle cx="101" cy="45" r="2.7" fill={`url(#${g('ojo')})`} />
      <circle cx="100" cy="44" r="0.9" fill="#fff" opacity="0.95" />

      {/* BARBA ICÓNICA iridiscente verde→violeta, larga y puntiaguda, con
          barbas finas y una franja de brillo animada (destello metálico). */}
      <g>
        <path d="M95 54 Q101 56 105 55 L101 84 Q98 88 96 82 Z" fill={`url(#${g('barba')})`} />
        {/* barbas finas de la barba */}
        <g stroke="#0d5a3a" strokeWidth="0.4" opacity="0.5" fill="none">
          <path d="M98 58 L100 60" /><path d="M99 64 L101 66" /><path d="M99 70 L100 72" />
        </g>
        {/* brillo iridiscente que desciende (animado) */}
        <path className="chiv-barba-brillo" d="M97 56 Q100 57 102 56 L100 80 Q98 82 97 79 Z"
              fill={`url(#${g('barba-brillo')})`} opacity="0" />
      </g>

      {/* ALA frontal batiendo, con primarias marcadas */}
      <g className="chiv-ala-fron">
        <path d="M78 52 Q48 32 24 50 Q50 70 84 60 Z" fill={`url(#${g('ala')})`} />
        <g stroke="#2c1e10" strokeWidth="0.6" opacity="0.5" fill="none">
          <path d="M72 52 Q52 44 30 46" /><path d="M70 56 Q50 50 30 51" /><path d="M68 59 Q50 56 32 56" />
        </g>
      </g>

      {/* patas */}
      <path d="M66 90 L63 99 M75 89 L75 98" stroke="#221708" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * ChivitoAve — sólo el ave. `flap` activa el aleteo/vida (respeta
 * reduced-motion vía CSS). `size` = ancho en px.
 */
export function ChivitoAve({ size = 120, flap = true, className = '', ariaLabel }) {
  const id = useUid('chiv');
  return (
    <span
      className={`chivito ${flap ? 'is-flap' : ''} ${className}`.trim()}
      style={{ width: size }}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel || undefined}
      aria-hidden={ariaLabel ? undefined : 'true'}
    >
      <ChivitoSVG id={id} />
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 *  FRAILEJÓN — roseta plateada afelpada (Espeletia) + racimo de flores
 *  amarillas. La simbiosis real del páramo: el chivito liba esta flor.
 * ════════════════════════════════════════════════════════════════════════ */
function FrailejonSVG({ id }) {
  const g = (s) => `${id}-${s}`;
  return (
    <svg viewBox="0 0 150 150" className="chiv-frailejon-svg" aria-hidden="true" width="100%">
      <defs>
        <linearGradient id={g('hoja')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8d2b4" />
          <stop offset="100%" stopColor="#8ea07a" />
        </linearGradient>
        <radialGradient id={g('flor')} cx="42%" cy="38%" r="62%">
          <stop offset="0" stopColor="#ffe17a" />
          <stop offset="70%" stopColor="#f4c430" />
          <stop offset="100%" stopColor="#d59f18" />
        </radialGradient>
      </defs>

      {/* ROSETA de hojas plateadas afelpadas, radiando desde el centro-abajo */}
      <g>
        {[
          { r: -52, s: 1.0 }, { r: -34, s: 1.08 }, { r: -16, s: 1.12 },
          { r: 0, s: 1.14 }, { r: 16, s: 1.12 }, { r: 34, s: 1.08 }, { r: 52, s: 1.0 },
        ].map((leaf, i) => (
          <g key={i} transform={`translate(75 128) rotate(${leaf.r}) scale(${leaf.s})`}>
            <path
              d="M0 0 Q-11 -46 0 -92 Q11 -46 0 0 Z"
              fill={`url(#${g('hoja')})`}
              stroke="#7d8e68"
              strokeWidth="1"
            />
            {/* nervadura central */}
            <path d="M0 -4 L0 -86" stroke="#7d8e68" strokeWidth="0.8" opacity="0.6" fill="none" />
            {/* pelusa afelpada (líneas finas) */}
            <g stroke="#e4ecd6" strokeWidth="0.5" opacity="0.55" fill="none">
              <path d="M0 -20 L-5 -30" /><path d="M0 -40 L-5 -50" /><path d="M0 -60 L-5 -68" />
              <path d="M0 -30 L5 -40" /><path d="M0 -50 L5 -58" />
            </g>
          </g>
        ))}
      </g>

      {/* tallo floral que se alza de la roseta */}
      <path d="M75 60 Q78 40 88 30" fill="none" stroke="#8a9a6f" strokeWidth="3" strokeLinecap="round" />

      {/* RACIMO de flores amarillas del frailejón (varios capítulos) */}
      <g>
        {[[88, 28, 11], [74, 34, 9], [100, 36, 8.5], [86, 44, 7.5], [96, 24, 7]].map(([cx, cy, r], i) => (
          <g key={i}>
            {/* pétalos radiales (rayos del capítulo) */}
            {Array.from({ length: 12 }).map((_, k) => {
              const a = (k / 12) * Math.PI * 2;
              return (
                <line
                  key={k}
                  x1={cx} y1={cy}
                  x2={cx + Math.cos(a) * (r + 3)} y2={cy + Math.sin(a) * (r + 3)}
                  stroke="#f4c430" strokeWidth="1.6" strokeLinecap="round"
                />
              );
            })}
            <circle cx={cx} cy={cy} r={r} fill={`url(#${g('flor')})`} />
            {/* disco central */}
            <circle cx={cx} cy={cy} r={r * 0.5} fill="#c98f14" opacity="0.9" />
          </g>
        ))}
      </g>
    </svg>
  );
}

/**
 * ChivitoEscena — HERO del home: el chivito tomando néctar de la flor amarilla
 * del frailejón (roseta plateada + flores amarillas). La simbiosis real del
 * páramo.
 *
 * Composición: el ave ocupa el 55% del ancho de la escena (integrada, ni
 * gigante ni perdida) y va posicionada (CSS `.chiv-ave-wrap`) de modo que la
 * punta del pico quede sobre el racimo de flores. El vuelo estacionario
 * (`chiv-sip`) la acerca y retira de la flor con una pausa al libar. Respeta
 * prefers-reduced-motion.
 */
export function ChivitoEscena({ size = 200, ariaLabel = 'Chivito de páramo tomando néctar de la flor del frailejón' }) {
  const id = useUid('chiv-esc');
  return (
    <span
      className="chiv-escena"
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel}
    >
      <span className="chiv-frailejon-wrap" style={{ width: size, height: size, display: 'block' }}>
        <FrailejonSVG id={id} />
      </span>
      <span className="chiv-ave-wrap">
        <ChivitoAve size={Math.round(size * 0.55)} flap ariaLabel={undefined} />
      </span>
    </span>
  );
}

/**
 * ChivitoBoton — el chivito ES el icono del botón enviar/hablar del agente.
 * Encuadre compacto (cabeza + barba + cuerpo) centrado en el botón circular.
 * `state` 'thinking'|'speaking' inclina al ave como para libar.
 */
export function ChivitoBoton({ size = 38, state = 'idle', ariaLabel = 'Enviar al agente' }) {
  const active = state === 'thinking' || state === 'speaking';
  return (
    <span className={`chiv-boton ${active ? 'is-active' : ''}`} role="img" aria-label={ariaLabel}>
      <ChivitoAve size={size} flap ariaLabel={undefined} />
    </span>
  );
}

/**
 * ChivitoCruza — TRANSICIÓN home→agente: el chivito cruza aleteando en arco,
 * UNA pasada. Respeta reduced-motion (sin cruce; el padre acorta la transición).
 */
export function ChivitoCruza({ size = 170, className = '' }) {
  const [reduce] = useState(() => prefersReducedMotion());
  return (
    <span className={`chiv-cruza ${className}`.trim()} style={{ width: size }} aria-hidden="true">
      <ChivitoAve size={size} flap={!reduce} ariaLabel={undefined} />
    </span>
  );
}

export default ChivitoAve;
