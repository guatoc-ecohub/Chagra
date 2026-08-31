import { useId } from 'react';
import './creatures.css';
import './tintaChivitoLuciernaga.css';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, RH_INK, RH_BOCA } from './_rubberhose.jsx';
import { CHIVITO_SLUG, CHIVITO_NOMBRE } from './chivitoIdentidad.js';
import { cuerpoDeClima } from './creatureClimaCuerpo.js';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';

/* EL CHIVITO DE PÁRAMO — Oxypogon guerinii, el colibrí crestado y barbado del
   frailejonal: EL QUE ESCRIBE EL PÁRAMO. TINTA NUEVA dibujada a mano
   (2026-08-31, bases aprobadas por el operador en
   `public/valle/compai/laminas/chivito-normal.png` / `chivito-punk.png`):
   línea limpia + planos de color verde-dominante — la lámina es la REFERENCIA
   DE IDENTIDAD, no un calco. Cero vtracer, cero trazado.

   Hermano tinta de la zarigüeya y la abeja Angelita: compone el MISMO kit
   `_rubberhose.jsx` (ojos de goma con aro grueso —los anillos de la lámina—,
   chapetas, sonrisa) y hereda la fundación transversal (clima en el cuerpo,
   line-boil, modo poder). El molde de ESTRUCTURA es `Zariguya.jsx` (capas por
   región, cadencia por clase); el CONTENIDO es todo suyo.

   ── SU FIRMA ES DE FORMA (sobrevive al negro sobre blanco) ──────────────────
   · LA CRESTA: alta y echada hacia atrás en reposo — el "casco" del
     helmetcrest. Cuando ACTÚA se le para en MOHAWK de puntas moradas (prop
     `punk`): mismo cuerpo, otra cresta — el punk no es una especie aparte,
     es su estado de acción (spec 2026-08-31 + nota del operador en elenco.js).
   · LA BARBA VERDE: el pendón puntudo que le cuelga del mentón sobre el pecho
     (el "barbudito" — Oxypogon es el colibrí BARBADO).
   · PICO corto y fino de colibrí de páramo (Oxypogon lo tiene corto, no aguja).
   · LÁPIZ + LIBRO: el naturalista campesino — anota lo que el páramo le dicta.
   · PAÑUELO al cuello: la prenda campesina (verde salvia, con nudo y colas).

   La CADENCIA nueva (pop del mohawk) vive en `tintaChivitoLuciernaga.css`;
   las transversales (`rh-*`) en `creatures.css`, como toda la familia. */
const VIEWBOX = '-18 -28 36 50';

/* Paleta TINTA del chivito (verde-dominante, tierra de páramo). Vive aquí y no
   en `chivitoIdentidad.js` a propósito: ese archivo documenta el rig F24 del
   valle (otro arte, congelado) — esta paleta es de la tinta nueva. */
export const CHIVITO_TINTA_PALETA = {
  cuerpo: '#7c9440',        // el verde oliva del plumaje (dominante)
  cuerpoSombra: '#5d7330',  // flanco y plumas en sombra
  cuerpoGlow: 'rgba(124, 148, 64, 0.5)',
  ala: '#55702e',           // las alas-brazo y la cola, un verde más hondo
  panza: '#e3e5bd',         // pecho crema-verdoso donde cae la barba
  cara: '#f5efdb',          // la máscara clara de la cara
  corona: '#2c3320',        // el casquete oscuro (verde-tinta, no negro puro)
  barba: '#3fa35c',         // LA BARBA VERDE (su pendón)
  barbaSombra: '#2f7d46',   // las mechas de la barba
  crestaPluma: '#eee8d4',   // las plumas pálidas de la cresta
  crestaRaya: '#2c3320',    // la raya oscura de cada pluma
  punkPunta: '#9b4fd6',     // EL MORADO del mohawk (solo cuando actúa)
  panuelo: '#a3b06b',       // el pañuelo campesino verde salvia
  panueloSombra: '#7f8c4d', // el pliegue del pañuelo
  pico: '#57503c',          // pico córneo oscuro
  picoBajo: '#463f2e',      // la mandíbula inferior
  pata: '#8a7a52',          // patitas de cuerno
  lapizCuerpo: '#4f7d3a',   // el lápiz (verde, cómo no)
  lapizMadera: '#d9a05b',   // la madera sacada punta
  lapizBorrador: '#d1615a', // el borrador coral
  libroTapa: '#4a6b35',     // la tapa del cuaderno de campo
  libroPaginas: '#efe6c8',  // el canto de las páginas
};

/* Perfil de CLIMA→cuerpo (creatureClimaCuerpo): bicho DE páramo — la niebla es
   su casa (difusa baja), el aguacero lo despeina apenas, la seca sí lo alarma
   (el frailejonal seco es su hábitat perdido). */
const PERFIL_CHIVITO_TINTA = Object.freeze({
  alas: true,
  humedad: 0.4,
  difusa: 0.45,
  sequia: 0.7,
});

/* LIP-SYNC de pico (mismo criterio que el colibrí: su boca ES el pico): cuánto
   abre la mandíbula inferior por visema. V1 cerrado = sonrisa en la comisura. */
const ABERTURA_VISEMA = { V1: 0, V2: 0.4, V3: 1, V4: 0.55 };

/* ── LA CRESTA NORMAL: el casco echado hacia atrás (reposo) ───────────────────
   Cuatro plumas pálidas con su raya oscura, barridas hacia atrás-arriba como
   en la lámina. Coordenadas LOCALES de la cabeza (cráneo r=5.2 en el origen). */
function CrestaNormal() {
  const P = CHIVITO_TINTA_PALETA;
  return (
    <g className="chiv-cresta chiv-cresta-normal">
      {/* pluma trasera corta */}
      <path d="M-3.6,-2.6 C-5.8,-4.2 -7.2,-6.4 -7.6,-9.0 C-5.4,-7.4 -3.8,-5.4 -2.9,-3.3 Z"
        fill={P.crestaPluma} stroke={RH_INK} strokeWidth="0.95" strokeLinejoin="round" />
      {/* pluma de atrás, larga */}
      <path d="M-2.3,-3.5 C-4.0,-6.4 -4.8,-9.6 -4.2,-12.8 C-2.4,-9.9 -1.4,-6.8 -1.3,-4.1 Z"
        fill={P.crestaPluma} stroke={RH_INK} strokeWidth="0.95" strokeLinejoin="round" />
      {/* LA pluma central (la más alta) */}
      <path d="M-0.8,-4.2 C-1.5,-7.9 -1.1,-11.6 0.7,-14.8 C1.8,-11.3 1.7,-7.5 0.9,-4.5 Z"
        fill={P.crestaPluma} stroke={RH_INK} strokeWidth="0.95" strokeLinejoin="round" />
      {/* pluma delantera corta */}
      <path d="M1.5,-4.4 C1.9,-6.9 2.9,-8.9 4.6,-10.4 C4.4,-7.8 3.6,-5.7 2.6,-4.1 Z"
        fill={P.crestaPluma} stroke={RH_INK} strokeWidth="0.95" strokeLinejoin="round" />
      {/* la raya oscura de cada pluma (el patrón del casco) */}
      <g stroke={P.crestaRaya} strokeWidth="0.55" fill="none" strokeLinecap="round" opacity="0.85">
        <path d="M-5.3,-4.6 C-6.2,-5.8 -6.8,-7.0 -7.0,-8.2" />
        <path d="M-2.9,-4.6 C-3.8,-6.9 -4.2,-9.3 -3.9,-11.6" />
        <path d="M0.0,-5.0 C-0.4,-8.0 -0.1,-11.0 1.0,-13.6" />
        <path d="M2.4,-4.8 C2.8,-6.6 3.5,-8.2 4.0,-9.4" />
      </g>
    </g>
  );
}

/* ── LA CRESTA PUNK: el mohawk de puntas MORADAS (cuando actúa) ───────────────
   Siete púas en abanico, pálidas con la punta encendida de morado — la lámina
   punk traducida a tinta. Entra con overshoot (chiv-punk-pop). */
const PUAS_PUNK = [
  { x1: -3.9, y1: -1.9, x2: -2.9, y2: -3.3, tx: -8.9, ty: -8.6 },
  { x1: -2.9, y1: -3.3, x2: -1.8, y2: -4.1, tx: -6.6, ty: -11.6 },
  { x1: -1.8, y1: -4.1, x2: -0.7, y2: -4.5, tx: -3.6, ty: -13.9 },
  { x1: -0.7, y1: -4.6, x2: 0.9, y2: -4.6, tx: 0.1, ty: -14.9 },
  { x1: 0.9, y1: -4.5, x2: 2.0, y2: -4.1, tx: 3.8, ty: -13.8 },
  { x1: 2.0, y1: -4.0, x2: 3.1, y2: -3.2, tx: 6.8, ty: -11.4 },
  { x1: 3.1, y1: -3.2, x2: 4.1, y2: -1.8, tx: 9.0, ty: -8.4 },
];
function CrestaPunk({ animated }) {
  const P = CHIVITO_TINTA_PALETA;
  return (
    <g className={`chiv-cresta chiv-cresta-punk${animated ? ' chiv-punk-pop' : ''}`}>
      {PUAS_PUNK.map((p, i) => {
        // el tercio superior de cada púa se enciende de morado
        const f = 0.62;
        const lx = p.x1 + (p.tx - p.x1) * f;
        const ly = p.y1 + (p.ty - p.y1) * f;
        const rx = p.x2 + (p.tx - p.x2) * f;
        const ry = p.y2 + (p.ty - p.y2) * f;
        return (
          <g key={i}>
            <path d={`M${p.x1},${p.y1} L${p.tx},${p.ty} L${p.x2},${p.y2} Z`}
              fill={P.crestaPluma} stroke={RH_INK} strokeWidth="0.9" strokeLinejoin="round" />
            <path d={`M${lx.toFixed(2)},${ly.toFixed(2)} L${p.tx},${p.ty} L${rx.toFixed(2)},${ry.toFixed(2)} Z`}
              fill={P.punkPunta} stroke="none" />
          </g>
        );
      })}
    </g>
  );
}

export function ChivitoTinta({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = `${CHIVITO_NOMBRE} de páramo`,
  /* Pose de VIDA (idle-life), species-agnostic (gestos rh-g-* de creatures.css):
     'anda' (base) | 'celebra' | 'reposo' | 'señala'. */
  pose = 'anda',
  animo = 'sereno',
  energia = 1,
  /* CLIMA REAL escrito en el cuerpo (perfil chivito: la niebla es su casa). */
  clima = null,
  enso = 'neutro',
  /* ── LIP-SYNC (useLipSync → pico): el pico se abre por visema, como el
     colibrí — su boca ES el pico. Sin visema (o 'V1') = comisura sonriente. */
  visema = null,
  /* ── PUNK — el estado "CUANDO ACTÚA" (spec 2026-08-31) ─────────────────────
     OPT-IN: la cresta de casco se vuelve MOHAWK de puntas moradas. Mismo
     cuerpo, misma cara: solo la cresta cambia. No es permanente ni una especie
     aparte — es su modo de acción. Default false = el casco de reposo. */
  punk = false,
  /* Device-tier (DR-3D-PERF-GAMABAJA): 'bajo' apaga el idle continuo. */
  tier,
  /* ── LÍNEA QUE RESPIRA (line-boil, Cuphead años 30) — OPT-IN. ──────────────*/
  lineBoil = false,
  /* ── MODO PODER (transformación / power-up) — OPT-IN. ──────────────────────*/
  poder = false,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const vivo = animated;
  const P = CHIVITO_TINTA_PALETA;
  const auraOp = Math.max(0.14, Math.min(0.38, 0.15 + 0.22 * (energia ?? 1)));
  const auraR = 8.2 + 1.4 * (energia ?? 1);

  const cuerpoClima = cuerpoDeClima(clima, {
    enso: /** @type {any} */ (enso), tier, perfil: PERFIL_CHIVITO_TINTA,
  });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {lineBoil && <LineBoilFilter id={boil} animated={vivo} />}
    </defs>
  );

  // LIP-SYNC de pico: la mandíbula inferior baja según el visema.
  const abertura = visema ? (ABERTURA_VISEMA[visema] ?? 0) : 0;

  // ── CUERPO tinta (atrás→adelante): aura, cola, pata trasera, ala del libro
  //    (con el libro), tronco, panza, pañuelo, barba, pata delantera, cabeza
  //    (cresta según estado + cara + pico que habla), ala del lápiz.
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* aura viva (presencia de bicho chico y despierto) */}
      <circle cx="0" cy="1" r={auraR} fill={P.cuerpo} opacity={auraOp} filter={`url(#${blur})`} />

      {/* ── LA COLA: dos timoneras verdes que caen atrás (grupo .chiv-cola) ── */}
      <g className="chiv-cola" style={{ transformBox: 'fill-box', transformOrigin: 'right top' }}>
        <path d="M-4.6,6.4 C-8.4,8.0 -11.4,10.4 -13.0,13.2 L-10.4,12.6 C-8.0,10.4 -6.0,8.8 -4.2,7.8 Z"
          fill={P.ala} stroke={RH_INK} strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M-4.4,8.4 C-7.6,10.2 -9.8,12.4 -11.0,15.0 L-8.6,14.2 C-6.8,12.0 -5.2,10.4 -3.8,9.6 Z"
          fill={P.cuerpoSombra} stroke={RH_INK} strokeWidth="1.1" strokeLinejoin="round" />
      </g>

      {/* ── PATAS de pájaro: tarso fino + tres deditos (tinta con alma de
          cuerno). La trasera va antes del cuerpo; la delantera, después. ── */}
      <g strokeLinecap="round" fill="none">
        <path d="M-1.6,11.6 L-2.2,17.4" stroke={RH_INK} strokeWidth="1.6" />
        <path d="M-1.7,12.0 L-2.2,17.2" stroke={P.pata} strokeWidth="0.7" />
        <g stroke={RH_INK} strokeWidth="1.25">
          <path d="M-2.2,17.4 L-4.0,19.2" />
          <path d="M-2.2,17.4 L-2.2,19.5" />
          <path d="M-2.2,17.4 L-0.5,19.1" />
          <path d="M-2.2,17.4 L-3.6,17.0" />
        </g>
        <g stroke={P.pata} strokeWidth="0.55">
          <path d="M-2.3,17.6 L-3.8,19.0" />
          <path d="M-2.2,17.6 L-2.2,19.3" />
          <path d="M-2.1,17.6 L-0.7,18.9" />
        </g>
      </g>

      {/* ── EL LIBRO (cuaderno de campo) sujeto bajo el ala izquierda ──────── */}
      <g transform="translate(-8.6 2.4) rotate(-14)">
        {/* canto de páginas */}
        <path d="M2.4,-3.2 L3.4,-2.7 L3.6,3.7 L2.7,3.3 Z"
          fill={P.libroPaginas} stroke={RH_INK} strokeWidth="0.8" strokeLinejoin="round" />
        {/* tapa */}
        <path d="M-2.8,-3.6 L2.4,-3.2 L2.7,3.3 L-2.4,3.6 C-2.8,3.6 -3.0,3.3 -3.0,3.0 Z"
          fill={P.libroTapa} stroke={RH_INK} strokeWidth="1.0" strokeLinejoin="round" />
        {/* la etiqueta del cuaderno con sus renglones */}
        <rect x="-1.7" y="-1.4" width="3.0" height="2.4" rx="0.3"
          fill={P.libroPaginas} stroke={RH_INK} strokeWidth="0.5" />
        <g stroke={RH_INK} strokeWidth="0.32" opacity="0.7">
          <path d="M-1.1,-0.6 L0.7,-0.6" />
          <path d="M-1.1,0.2 L0.7,0.2" />
        </g>
      </g>

      {/* ala izquierda: cae sobre el libro y lo sujeta (puntas escalonadas) */}
      <g className="crt-brazo-l" style={{ transformBox: 'fill-box', transformOrigin: 'right top' }}>
        <path d="M-5.0,-4.4 C-8.6,-3.6 -10.6,-0.6 -10.2,2.9 C-10.0,4.7 -9.0,6.3 -7.4,7.1
                 L-6.7,5.5 L-5.7,6.7 L-5.1,5.1 L-4.0,6.1 L-3.9,4.4 C-5.5,2.0 -5.6,-1.6 -5.0,-4.4 Z"
          fill={P.ala} stroke={RH_INK} strokeWidth="1.2" strokeLinejoin="round" />
        {/* barbas del ala */}
        <g stroke={P.cuerpoSombra} strokeWidth="0.5" fill="none" opacity="0.8">
          <path d="M-6.2,-2.8 C-7.8,-1.6 -8.6,0.4 -8.3,2.6" />
          <path d="M-5.8,-0.8 C-6.9,0.3 -7.3,1.9 -7.0,3.6" />
        </g>
      </g>

      {/* ── EL TRONCO en pera erguida (pájaro parado, pecho al frente) ─────── */}
      <path d="M-6.8,-3.2 C-8.6,1.2 -8.2,7.6 -4.6,10.8 C-1.2,13.6 3.8,13.4 6.4,10.4
               C8.8,7.4 8.8,1.6 6.6,-2.6 C4.8,-6.0 -0.4,-7.6 -3.6,-6.2 C-5.2,-5.4 -6.2,-4.6 -6.8,-3.2 Z"
        fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.4" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 6px ${P.cuerpoGlow})` }} />
      {/* la panza crema (el escenario de la barba) */}
      <path d="M1.6,-4.2 C4.8,-3.0 6.4,0.8 5.8,4.8 C5.3,8.0 3.4,10.4 0.8,11.2
               C2.8,7.6 3.2,2.0 1.0,-2.6 Z"
        fill={P.panza} opacity="0.9" />
      {/* plumitas del flanco (mechones que rompen la silueta, como la lámina) */}
      <g stroke={P.cuerpoSombra} strokeWidth="0.9" strokeLinecap="round" fill="none" opacity="0.85">
        <path d="M-7.4,1.0 C-8.8,0.7 -9.7,0.2 -10.2,-0.5" />
        <path d="M-7.2,4.6 C-8.6,4.8 -9.6,4.6 -10.3,4.1" />
        <path d="M-5.4,9.4 C-6.3,10.5 -7.0,11.1 -7.8,11.4" />
      </g>

      {/* ── EL PAÑUELO campesino: banda al cuello + nudo + colas ───────────── */}
      <g className="chiv-panuelo">
        <path d="M-5.4,-6.2 C-2.0,-4.2 2.8,-4.0 6.4,-5.8 L6.8,-3.9 C3.0,-1.9 -2.2,-2.1 -5.8,-4.3 Z"
          fill={P.panuelo} stroke={RH_INK} strokeWidth="1.1" strokeLinejoin="round" />
        {/* colas del nudo (caen sobre el pecho) */}
        <path d="M5.6,-3.8 C7.0,-1.8 7.1,0.6 6.2,2.6 L4.7,1.2 C5.3,-0.5 5.3,-2.2 4.9,-3.4 Z"
          fill={P.panuelo} stroke={RH_INK} strokeWidth="1.0" strokeLinejoin="round" />
        <path d="M4.6,-3.4 C4.8,-1.8 4.5,-0.4 3.7,0.8 L2.7,-0.4 C3.2,-1.5 3.4,-2.5 3.3,-3.4 Z"
          fill={P.panueloSombra} stroke={RH_INK} strokeWidth="0.9" strokeLinejoin="round" />
        {/* el nudo */}
        <circle cx="5.2" cy="-4.4" r="1.15" fill={P.panuelo} stroke={RH_INK} strokeWidth="1.0" />
        <path d="M-4.6,-5.0 C-2.0,-3.6 1.6,-3.3 4.4,-4.2"
          stroke={P.panueloSombra} strokeWidth="0.5" fill="none" opacity="0.9" />
      </g>

      {/* ── LA BARBA VERDE (su pendón): cae del mentón sobre el pañuelo ────── */}
      <g className="chiv-barba" style={{ transformBox: 'fill-box', transformOrigin: 'center top' }}>
        <path d="M1.2,-7.2 C3.2,-6.8 4.3,-5.6 4.3,-3.9 C4.3,-1.4 3.3,1.2 1.7,3.2
                 C0.2,0.9 -0.7,-2.1 -0.5,-4.9 C-0.4,-6.4 0.3,-7.2 1.2,-7.2 Z"
          fill={P.barba} stroke={RH_INK} strokeWidth="1.15" strokeLinejoin="round" />
        <g stroke={P.barbaSombra} strokeWidth="0.55" fill="none" strokeLinecap="round" opacity="0.9">
          <path d="M1.1,-6.0 C1.6,-3.8 1.7,-1.4 1.4,0.9" />
          <path d="M2.6,-5.6 C3.0,-3.8 2.9,-1.8 2.3,0.2" />
          <path d="M-0.0,-5.4 C0.2,-3.6 0.4,-1.8 0.8,-0.2" />
        </g>
      </g>

      {/* pata delantera (por delante del cuerpo) */}
      <g strokeLinecap="round" fill="none">
        <path d="M2.6,11.9 L3.1,17.7" stroke={RH_INK} strokeWidth="1.6" />
        <path d="M2.7,12.3 L3.1,17.5" stroke={P.pata} strokeWidth="0.7" />
        <g stroke={RH_INK} strokeWidth="1.25">
          <path d="M3.1,17.7 L1.4,19.5" />
          <path d="M3.1,17.7 L3.2,19.8" />
          <path d="M3.1,17.7 L4.8,19.4" />
          <path d="M3.1,17.7 L4.5,17.2" />
        </g>
        <g stroke={P.pata} strokeWidth="0.55">
          <path d="M3.0,17.9 L1.6,19.3" />
          <path d="M3.1,17.9 L3.2,19.6" />
          <path d="M3.2,17.9 L4.6,19.2" />
        </g>
      </g>

      {/* ── LA CABEZA (grupo .chiv-cabeza): cresta según estado, casquete,
          máscara clara, ojos de aro grueso, pico que habla. ────────────────── */}
      <g transform="translate(1.5 -11)">
        <g className="chiv-cabeza" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
          {/* LA CRESTA — el casco en reposo o el MOHAWK cuando actúa */}
          {punk ? <CrestaPunk animated={vivo} /> : <CrestaNormal />}

          {/* cráneo */}
          <circle cx="0" cy="0" r="5.2" fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.4" />
          {/* el casquete oscuro del helmetcrest */}
          <path d="M-5.05,-1.2 A5.2,5.2 0 0 1 5.05,-1.2 C3.4,-2.6 -3.4,-2.6 -5.05,-1.2 Z"
            fill={P.corona} />
          {/* la máscara clara de la cara */}
          <path d="M-3.4,-0.7 C-2.0,-2.2 2.4,-2.3 4.2,-0.8 C4.8,0.8 4.4,2.8 3.2,4.0
                   C0.8,4.9 -2.0,4.6 -3.6,3.2 C-4.2,1.8 -4.1,0.4 -3.4,-0.7 Z"
            fill={P.cara} opacity="0.95" />
          {/* el antifaz oscuro sobre los ojos (el patrón de la lámina) */}
          <path d="M-3.2,-0.5 C-1.2,-1.6 2.6,-1.7 4.0,-0.6 C2.6,0.3 -1.4,0.4 -3.2,-0.5 Z"
            fill={P.corona} opacity="0.75" />
          {/* chapetas campesinas */}
          <Cachetes puntos={[{ cx: -2.7, cy: 1.9, r: 1.0 }, { cx: 3.5, cy: 1.7, r: 0.9 }]} vivo={vivo} />
          {/* ojos de goma con el ARO grueso (los anillos de la lámina) */}
          <OjosRubber
            ojos={[{ cx: -1.1, cy: -0.2, r: 1.55 }, { cx: 2.6, cy: -0.3, r: 1.45 }]}
            mirar={[0.3, 0.08]}
            parpadea={vivo}
          />
          {/* ── EL PICO (corto, de Oxypogon): habla por visema ─────────────── */}
          <g className="chiv-pico">
            {/* garganta: solo asoma cuando el pico se abre */}
            {abertura > 0 && (
              <path d={`M3.4,2.2 C5.4,2.0 7.0,2.4 8.0,3.0 C7.0,${3.4 + abertura * 1.6} 5.0,${3.8 + abertura * 1.8} 3.5,${3.4 + abertura * 1.2} Z`}
                fill={RH_BOCA} stroke={RH_INK} strokeWidth="0.6" />
            )}
            {/* mandíbula superior */}
            <path d="M3.0,0.9 C5.6,0.4 8.4,1.2 9.8,2.6 C10.0,2.9 9.9,3.2 9.5,3.2 L3.4,3.2
                     C2.8,2.5 2.7,1.5 3.0,0.9 Z"
              fill={P.pico} stroke={RH_INK} strokeWidth="1.05" strokeLinejoin="round" />
            {/* mandíbula inferior (rota al hablar — lip-sync de pico) */}
            <g style={{
              transformBox: 'fill-box', transformOrigin: 'left top',
              transform: abertura ? `rotate(${(abertura * 16).toFixed(1)}deg)` : undefined,
            }}>
              <path d="M3.4,3.4 L8.8,3.3 C7.4,4.6 5.4,5.1 3.6,4.6 C3.3,4.3 3.2,3.8 3.4,3.4 Z"
                fill={P.picoBajo} stroke={RH_INK} strokeWidth="0.95" strokeLinejoin="round" />
            </g>
            {/* la comisura sonriente (solo con el pico cerrado) */}
            {!abertura && <Sonrisa cx={3.3} cy={3.9} w={1.8} prof={0.7} />}
          </g>
        </g>
      </g>

      {/* ── ALA DERECHA en alto con EL LÁPIZ (el naturalista que anota) ────── */}
      <g className="crt-brazo-r" style={{ transformBox: 'fill-box', transformOrigin: 'left bottom' }}>
        {/* el brazo-manguera del ala */}
        <path d="M4.6,-3.6 C7.6,-4.6 9.6,-7.4 10.2,-11.0"
          stroke={RH_INK} strokeWidth="2.8" fill="none" strokeLinecap="round" />
        <path d="M4.8,-3.9 C7.5,-4.9 9.3,-7.4 9.9,-10.6"
          stroke={P.ala} strokeWidth="1.3" fill="none" strokeLinecap="round" />
        {/* EL LÁPIZ verde (debajo de la manito, que lo agarra) */}
        <g>
          <path d="M8.6,-10.2 L12.6,-15.2" stroke={RH_INK} strokeWidth="2.1" strokeLinecap="round" />
          <path d="M8.8,-10.4 L12.4,-14.9" stroke={P.lapizCuerpo} strokeWidth="1.1" strokeLinecap="round" />
          {/* la punta sacada (madera + mina) */}
          <path d="M12.2,-14.7 L14.2,-17.3 L13.1,-14.2 Z"
            fill={P.lapizMadera} stroke={RH_INK} strokeWidth="0.7" strokeLinejoin="round" />
          <path d="M13.8,-16.7 L14.2,-17.3 L14.0,-16.5 Z" fill={RH_INK} />
          {/* el borrador coral */}
          <path d="M8.3,-9.8 L9.3,-9.4" stroke={P.lapizBorrador} strokeWidth="1.6" strokeLinecap="round" />
        </g>
        {/* la manito de plumas (mitón escalonado que agarra el lápiz) */}
        <path d="M8.7,-11.0 C8.0,-12.6 8.7,-14.2 10.3,-14.6 C11.7,-14.9 12.9,-14.0 13.0,-12.7
                 C12.4,-12.8 12.0,-12.5 11.8,-12.0 C11.3,-12.3 10.7,-12.2 10.4,-11.7
                 C9.9,-11.9 9.3,-11.5 9.2,-10.9 Z"
          fill={P.ala} stroke={RH_INK} strokeWidth="1.0" strokeLinejoin="round" />
      </g>
    </g>
  );

  const conAntics = vivo ? (
    <g className="rh-antic">
      <g className="rh-travieso">{body}</g>
    </g>
  ) : body;
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{conAntics}</g> : conAntics;

  const estadoAttrs = {
    'data-creature': CHIVITO_SLUG,
    'data-pose': vivo ? pose : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-visema': visema || undefined,
    'data-punk': punk ? '1' : undefined,
    'data-lineboil': lineBoil ? '1' : undefined,
  };

  if (inline) {
    return (
      <g className={className} style={estiloClima} data-poder={poder ? '1' : undefined} {...estadoAttrs}>
        {defs}
        {cuerpoVivo}
      </g>
    );
  }
  const svg = (
    <svg viewBox={VIEWBOX} width={size} height={size} className={className} style={estiloClima}
      role="img" aria-label={title} {...estadoAttrs} {...rest}>
      <title>{title}</title>
      {defs}
      {cuerpoVivo}
    </svg>
  );
  if (poder) {
    return (
      <span
        className="is-powered-up chivito-poder"
        data-creature-poder={CHIVITO_SLUG}
        style={{ '--aura-color': auraDeBicho(CHIVITO_SLUG), display: 'inline-flex' }}
      >
        {svg}
        <AuraPoder />
      </span>
    );
  }
  return svg;
}

export default ChivitoTinta;
