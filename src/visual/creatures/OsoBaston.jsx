import { useId, useRef } from 'react';
import './creatures.css';
import { useVidaIdle, useRitmoPropio, useMiradaUsted } from './useVidaIdle.js';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, BocaVisema, RH_GLOVE } from './_rubberhose.jsx';
import {
  OSO_BASTON_PALETA, OSO_BASTON_PROPORCION, OSO_BASTON_SLUG,
  OSO_BASTON_TINTA, PERFIL_OSO_BASTON,
} from './osoBastonIdentidad.js';
import { cuerpoDeClima } from './creatureClimaCuerpo.js';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { PropEnMano } from './PropEnMano.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';

/* EL OSO DEL BASTÓN — Tremarctos ornatus, EL CAMINANTE DE LOS ANDES.
   Cuarta dirección de arte del oso de anteojos, calcada de la referencia
   aprobada del operador (el póster "¡El oso de anteojos! El guardián de los
   Andes"): ERGUIDO y de día, sonrisa amplia de goma, ojos Cuphead del kit,
   guantes crema en las zarpas, botas de trocha, y su firma — EL BASTÓN
   FLORECIDO, más alto que él, coronado de frailejón y orquídea.

   NO es el oso café plano (OsoAndino, RECHAZADO y archivado) ni el guardián
   lunar (OsoGuardian, gravitas biopunk nocturna). Comparte con ellos la
   ESPECIE y la fundación transversal de la familia (cero código duplicado):
   kit rubber-hose (OjosRubber/Cachetes/Sonrisa/BocaVisema), vida propia
   (useVidaIdle + ritmo propio + la mirada que reconoce), clima→cuerpo,
   line-boil, prop por mundo y modo poder (aura VERDE del bastón florecido).

   ── LA MIRADA HUMBOLDT (sin lámina muerta) ──────────────────────────────────
   La nota del operador sobre la referencia: "una que se parezca más a la
   visión de Humboldt con su expresión cuphead". Aquí eso se traduce en:
   · FLORA CIERTA y nombrada en el bastón (Espeletia grandiflora, Cattleya
     trianae — ver OSO_BASTON_FLORA): lámina de historia natural, no adorno.
   · RAYADO DE GRABADO sugerido en el pelaje (trazos cortos a contraluz, como
     buril) y tintas tierra cálidas — el sabor de la plancha ilustrada.
   · Y TODO VIVO: la lámina respira (oso-boil pesado), el bastón se mece
     plantado, la corola cabecea, el polen flota. Lámina viva, jamás plana.

   ── SU ECOLOGÍA ES SU PODER ─────────────────────────────────────────────────
   El oso andino es el gran DISPERSOR DE SEMILLAS del bosque altoandino: por
   donde camina, el monte germina. Su gesto-firma `florece` (momento del
   idle-cerebro o prop del host) es el bastón latiendo EN FLOR con halo verde
   y polen acelerado. Su otro gesto es el `resopla` familiar de los osos de la
   casa (huff pesado con vaho). Y `pose='camina'` es el ciclo de ANDAR con
   bastón (para kart/mundos): paso pesado, bastón que planta y levanta.

   La IDENTIDAD (paleta + proporciones + firma + flora + presencia + perfil)
   vive en `osoBastonIdentidad.js`; la CADENCIA, en `creatures.css` (`osb-*`,
   reusa ADITIVO los keyframes familiares oso-boil/oso-resoplido/oso-vaho). */
const VIEWBOX = '-17 -22 34 42';

/* ═══ LA MOLE ERGUIDA — anatomía de oso parado, no un costal.
 * Hombros que existen (y de los que NACEN los brazos), pecho profundo que
 * sostiene la luna, panza de barriga amable (la referencia la tiene), y
 * caderas que recogen hacia las piernas de goma. El cuello va ESCONDIDO tras
 * el cráneo (lección del guardián: es lo que separa un oso de un muñeco). */
const SILUETA_ERGUIDA =
  'M -5.0,-7.2 '
  + 'C -6.7,-5.9 -7.3,-3.5 -7.4,-1.2 '   // hombro → costillar (pecho profundo)
  + 'C -7.6,1.5 -8.0,4.2 -7.2,6.5 '      // la panza amable (lo más ancho)
  + 'C -6.5,8.4 -4.8,9.5 -2.6,9.9 '      // cadera que recoge
  + 'C -0.9,10.2 0.9,10.2 2.6,9.9 '
  + 'C 4.8,9.5 6.5,8.4 7.2,6.5 '
  + 'C 8.0,4.2 7.6,1.5 7.4,-1.2 '
  + 'C 7.3,-3.5 6.7,-5.9 5.0,-7.2 '
  + 'C 3.2,-8.4 -3.2,-8.4 -5.0,-7.2 Z';  // el trapecio, oculto tras el cráneo

/* LA MEDIA LUNA del pecho (el babero pectoral real de la especie): creciente
   que abre a la derecha, colgada con un giro de gracia. CHICA y ALTA — vive en
   el pecho, bajo la garganta; el primer render la tenía gigante al centro de
   la panza y leía "luna en barriga", no babero pectoral. */
const LUNA_PECHO = 'M 0,-5.2 A 2.05,2.05 0 1 0 0,-1.1 A 2.4,2.4 0 0 1 0,-5.2 Z';

/* GOLILLA — el pelaje denso de cuello y hombros, en mechones. Como sombra
   suave (sin trazo, sin dobladillo: la lección del guardián), cose la cabeza
   al cuerpo. */
const GOLILLA =
  'M -5.6,-6.4 '
  + 'C -5.2,-7.6 -4.4,-8.6 -3.4,-9.2 '
  + 'C -3.0,-8.3 -2.5,-9.3 -2.0,-8.4 '
  + 'C -1.4,-9.4 -0.7,-8.5 0,-9.3 '
  + 'C 0.7,-8.5 1.4,-9.4 2.0,-8.4 '
  + 'C 2.5,-9.3 3.0,-8.3 3.4,-9.2 '
  + 'C 4.4,-8.6 5.2,-7.6 5.6,-6.4 '
  + 'C 3.6,-5.7 -3.6,-5.7 -5.6,-6.4 Z';

/* BOTA de trocha (`s`: -1 izquierda, +1 derecha) — punta hacia AFUERA como en
   la referencia: caña corta con doblez, empeine redondo, suela plantada. */
function bota(s) {
  const x = (v) => (s * v).toFixed(2);
  return (
    `M ${x(2.9)},13.5 `
    + `C ${x(2.85)},14.6 ${x(3.0)},15.5 ${x(3.5)},16.1 `      // caña → empeine
    + `C ${x(4.3)},17.0 ${x(6.3)},17.3 ${x(7.4)},16.7 `       // la punta redonda
    + `C ${x(8.2)},16.2 ${x(8.1)},15.2 ${x(7.0)},14.9 `       // vuelve al tobillo
    + `C ${x(6.2)},14.7 ${x(5.6)},14.3 ${x(5.4)},13.5 `
    + `C ${x(4.6)},13.1 ${x(3.7)},13.1 ${x(2.9)},13.5 Z`
  );
}

/* El POLEN que flota de la corona (delays/duraciones propios: vida, no
   metrónomo). Coordenadas alrededor de la corona del bastón. */
const POLEN = [
  { cx: 8.6, cy: -16.4, r: 0.4, d: 0, s: 6.5 },
  { cx: 13.6, cy: -14.8, r: 0.34, d: -2.1, s: 7.3 },
  { cx: 9.6, cy: -12.2, r: 0.3, d: -3.6, s: 5.9 },
  { cx: 12.8, cy: -18.2, r: 0.36, d: -1.4, s: 6.9 },
];

export function OsoBaston({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Oso del bastón',
  /* Pose de VIDA: 'anda' (base, plantado en su trocha) | 'camina' (el ciclo de
     ANDAR con bastón — kart/mundos) | 'celebra' | 'reposo' | 'señala'
     (species-agnostic rh-g-*). */
  pose = 'anda',
  animo = 'sereno',
  energia = 1,
  /* CLIMA REAL escrito en el cuerpo (perfil de bosque altoandino/páramo).
     Sin clima (avatares, catálogo) = neutro digno. */
  clima = null,
  enso = 'neutro',
  /* Lip-sync transversal (useLipSync → 'V1'..'V4'). Sin visema = la sonrisa
     amplia de goma de la referencia. */
  visema = null,
  /* FLORECE (opt-in): su gesto-firma — el bastón late EN FLOR (halo verde,
     corola con overshoot, polen acelerado). La ecología del dispersor de
     semillas hecha estado visual. */
  florece = false,
  /* RESOPLA (opt-in): el huff pesado familiar de los osos de la casa — vaho
     por la trufa, pecho que hincha y suelta. */
  resopla = false,
  /* VIDA PROPIA (idle-cerebro v2): default ON. Repertorio propio 'oso-baston'
     (florece/resopla/reposo — caminante lento que se detiene a hacer florecer). */
  vida = true,
  /* Device-tier: 'bajo' apaga el idle continuo; el bastón y su corona quedan
     en fotograma digno (la firma no se negocia, la cadencia sí). */
  tier = undefined,
  /* Line-boil (opt-in, capa cara): la línea que respira años-30. */
  lineBoil = false,
  /* MODO PODER (opt-in, standalone): aura VERDE del bastón florecido. */
  poder = false,
  /* Prop por mundo (opt-in): la herramienta va en la mano LIBRE (la jarra) —
     el bastón no se suelta jamás (es su firma). */
  mundoId = null,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const pelaje = `osb-pelaje-${uid}`;
  const panzaLuz = `osb-panza-${uid}`;
  const lunaGrad = `osb-luna-${uid}`;
  const botaGrad = `osb-bota-${uid}`;
  const haloVerde = `osb-halo-verde-${uid}`;
  const haloSombra = `osb-halo-sombra-${uid}`;
  const vivo = animated;

  // ═══ VIDA PROPIA (idle-cerebro + ritmo propio + mirada — vara Angelita v2).
  const raizRef = useRef(null);
  const ritmoPropio = useRitmoPropio();
  const enBase = pose === 'anda' && !florece && !resopla && !visema;
  const momento = useVidaIdle(OSO_BASTON_SLUG, vida && vivo && tier !== 'bajo' && enBase);
  useMiradaUsted(raizRef, vida && vivo && tier !== 'bajo');
  const floreceFx = florece || momento === 'florece';
  const resoplaFx = resopla || momento === 'resopla';
  const poseFx = momento === 'reposo' ? 'reposo' : pose;

  // CLIMA → cuerpo (determinista): tinte + opacidad al contorno. Sin alas.
  const cuerpoClima = cuerpoDeClima(clima, { enso: /** @type {any} */ (enso), tier, perfil: PERFIL_OSO_BASTON });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  const P = OSO_BASTON_PALETA;
  const PR = OSO_BASTON_PROPORCION;
  const INK = OSO_BASTON_TINTA;
  const auraOp = Math.max(0.08, Math.min(0.24, 0.1 + 0.14 * (energia ?? 1)));

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {/* PELAJE CON VOLUMEN: sol andino arriba-izquierda → tierra tostada →
          sombra ventral cálida. Viste mole y cráneo. La luz llega más lejos
          (46%, no 52%) para que el medio pardo domine sobre la sombra: el
          repaint anti-blob (el cuerpo viejo se hundía en la tinta). */}
      <radialGradient id={pelaje} cx="36%" cy="22%" r="92%">
        <stop offset="0%" stopColor={P.cuerpoLuz} />
        <stop offset="46%" stopColor={P.cuerpo} />
        <stop offset="100%" stopColor={P.cuerpoSombra} />
      </radialGradient>
      {/* LUZ DE PANZA: el plano de luz que abomba la barriga (radial suave,
          sin filtro: barato). Da la esfera que el gradiente global no alcanza. */}
      <radialGradient id={panzaLuz}>
        <stop offset="0%" stopColor={P.cuerpoLuz} stopOpacity="0.5" />
        <stop offset="60%" stopColor={P.cuerpoLuz} stopOpacity="0.22" />
        <stop offset="100%" stopColor={P.cuerpoLuz} stopOpacity="0" />
      </radialGradient>
      {/* LA LUNA del pecho con cuerpo propio (no un sticker plano). */}
      <radialGradient id={lunaGrad} cx="30%" cy="35%" r="90%">
        <stop offset="0%" stopColor="#fdf6e0" />
        <stop offset="55%" stopColor={P.pecho} />
        <stop offset="100%" stopColor={P.pechoSombra} />
      </radialGradient>
      {/* CUERO de las botas: brillo arriba → suela en sombra. */}
      <linearGradient id={botaGrad} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={P.botaLuz} />
        <stop offset="55%" stopColor={P.bota} />
        <stop offset="100%" stopColor={P.botaSombra} />
      </linearGradient>
      {/* halo VERDE del florecer (gradiente, no blur: barato y sin recortes) */}
      <radialGradient id={haloVerde}>
        <stop offset="0%" stopColor={P.verdeHalo} stopOpacity="0.9" />
        <stop offset="55%" stopColor={P.verde} stopOpacity="0.4" />
        <stop offset="100%" stopColor={P.verde} stopOpacity="0" />
      </radialGradient>
      <radialGradient id={haloSombra}>
        <stop offset="0%" stopColor="#140c06" stopOpacity="0.55" />
        <stop offset="70%" stopColor="#140c06" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#140c06" stopOpacity="0" />
      </radialGradient>
      {lineBoil && <LineBoilFilter id={boil} animated={vivo} />}
    </defs>
  );

  // VAHO del resoplido: motas cálidas que salen de la trufa y se disuelven.
  const vaho = resoplaFx ? (
    <g className="crt-vaho" fill={P.anteojo} aria-hidden="true" opacity="0.6">
      <circle className={vivo ? 'crt-vaho-mota' : undefined} cx="2.5" cy="-9.4" r="0.95" />
      <circle className={vivo ? 'crt-vaho-mota' : undefined} style={{ animationDelay: '-0.7s' }} cx="3.4" cy="-8.5" r="0.75" />
    </g>
  ) : null;

  // PROP DEL MUNDO junto a la mano LIBRE (la jarra); el bastón nunca se suelta.
  const propMundo = mundoId ? (
    <PropEnMano mundoId={mundoId} x={-11.6} y={5.2} escala={0.74} ink={INK} animated={vivo} />
  ) : null;

  // BOCA: lip-sync si narra; si no, LA SONRISA AMPLIA de la referencia
  // (Cuphead), con su sliver de dientes debajo del arco.
  const boca = visema
    ? <BocaVisema cx={0} cy={-9.35} w={3.4} prof={1.2} visema={visema} ink={INK} />
    : (
      <g>
        <path d="M -2.2,-9.55 Q 0,-7.65 2.2,-9.55 Q 0,-8.75 -2.2,-9.55 Z"
          fill="#fffaf0" stroke={INK} strokeWidth="0.4" strokeLinejoin="round" />
        <Sonrisa cx={0} cy={-9.55} w={4.4} prof={1.8} ink={INK} />
      </g>
    );

  /* ═══ EL BASTÓN FLORECIDO — la firma. Grupo `.osb-baston` con origen en la
     CONTERA (la base no se despega del suelo en el vaivén idle); en
     pose='camina' el CSS lo hace plantar y levantar al compás del paso. */
  const baston = (
    <g className={vivo ? 'osb-baston' : 'osb-baston osb-quieto'}
      style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
      {/* halo del florecer (detrás de la corona; late con data-florece) */}
      <circle className="osb-halo" cx="10.9" cy="-14.6" r="5.2"
        fill={`url(#${haloVerde})`} opacity="0.16" aria-hidden="true"
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
      {/* el palo: contorno de tinta + madera encima (tubo rubber-hose) */}
      <path d="M 10.6,17.2 C 10.9,12.2 10.5,7.0 10.9,2.0 C 11.2,-2.6 10.8,-7.4 11.1,-12.4"
        stroke={INK} strokeWidth="2.1" fill="none" strokeLinecap="round" />
      <path d="M 10.6,17.2 C 10.9,12.2 10.5,7.0 10.9,2.0 C 11.2,-2.6 10.8,-7.4 11.1,-12.4"
        stroke={P.baston} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      {/* la luz del canto + dos nudos de madera */}
      <path d="M 10.75,14.5 C 10.9,11.0 10.7,7.5 10.9,4.0" stroke={P.bastonLuz}
        strokeWidth="0.4" fill="none" strokeLinecap="round" opacity="0.8" aria-hidden="true" />
      <circle cx="10.72" cy="8.6" r="0.4" fill={P.bastonSombra} aria-hidden="true" />
      <circle cx="11.05" cy="-4.4" r="0.34" fill={P.bastonSombra} aria-hidden="true" />
      {/* LA ENREDADERA: la vida trepándose al caminante (verde dominante) */}
      <path d="M 10.7,13.6 C 12.0,11.8 9.8,10.2 11.0,8.4 C 12.2,6.6 9.9,4.8 11.1,3.0 C 12.2,1.4 10.0,-0.4 11.05,-2.2"
        stroke={P.hoja} strokeWidth="0.55" fill="none" strokeLinecap="round" opacity="0.9" aria-hidden="true" />
      {/* hojas de la enredadera (cabecean con vida propia) */}
      {[
        { x: 9.9, y: 9.6, r: -38 },
        { x: 12.0, y: 5.5, r: 34 },
        { x: 9.9, y: 0.6, r: -30 },
      ].map((h, i) => (
        <g key={i} transform={`translate(${h.x},${h.y}) rotate(${h.r})`}>
          <g className={vivo ? 'osb-hoja' : undefined}
            style={{ transformBox: 'fill-box', transformOrigin: 'right center', animationDelay: `${-i * 0.9}s` }}>
            <path d="M 0,0 C -2.2,-1.0 -3.4,-0.2 -3.8,0.6 C -3.0,1.4 -1.4,1.2 0,0 Z"
              fill={P.hoja} stroke={P.hojaSombra} strokeWidth="0.3" />
            <path d="M -0.4,0.25 C -1.4,0.2 -2.4,0.3 -3.2,0.6" stroke={P.hojaLuz}
              strokeWidth="0.25" fill="none" opacity="0.9" />
          </g>
        </g>
      ))}
      {/* ═══ LA CORONA (grupo `.osb-corola`: respira; late FUERTE al florecer) */}
      <g className={vivo ? 'osb-corola' : undefined}
        style={{ transformBox: 'fill-box', transformOrigin: 'center 80%' }}>
        {/* la roseta de frailejón (Espeletia): hojas afelpadas radiando */}
        <g aria-hidden="true">
          {[-72, -38, -8, 22, 55, 96, 137, 175, 215].map((a, i) => (
            <ellipse key={i} cx="0" cy="-2.1" rx="0.62" ry="2.15"
              fill={i % 2 ? P.frailejonHoja : P.hojaLuz} stroke={P.hojaSombra} strokeWidth="0.22"
              transform={`translate(11.05,-13.4) rotate(${a} 0 0)`} />
          ))}
        </g>
        {/* la flor amarilla del frailejón, arriba de la roseta */}
        <g transform="translate(11.05,-17.1)" aria-hidden="true">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <ellipse key={a} cx="0" cy="-1.15" rx="0.5" ry="1.15" fill={P.frailejonFlor}
              stroke={P.frailejonCentro} strokeWidth="0.18" transform={`rotate(${a})`} />
          ))}
          <circle cx="0" cy="0" r="0.8" fill={P.frailejonCentro} />
          <circle cx="-0.22" cy="-0.22" r="0.26" fill={P.frailejonFlor} opacity="0.9" />
        </g>
        {/* la orquídea de Mayo (Cattleya trianae) colgada del cayado */}
        <g transform="translate(8.9,-11.6) rotate(-14)" aria-hidden="true">
          {[-55, 0, 55].map((a) => (
            <ellipse key={a} cx="0" cy="-1.05" rx="0.62" ry="1.1" fill={P.orquidea}
              stroke={P.orquideaLuz} strokeWidth="0.2" transform={`rotate(${a})`} />
          ))}
          <path d="M -0.55,0.15 C -0.6,0.95 0.6,0.95 0.55,0.15 C 0.3,-0.15 -0.3,-0.15 -0.55,0.15 Z"
            fill={P.orquidea} stroke={P.orquideaLuz} strokeWidth="0.2" />
          <circle cx="0" cy="0.3" r="0.24" fill={P.orquideaGarganta} />
        </g>
      </g>
      {/* el POLEN que flota de la corona (se acelera al florecer) */}
      <g aria-hidden="true" fill={P.polen}>
        {POLEN.map((m, i) => (
          <circle key={i} className={vivo ? 'osb-polen' : undefined}
            cx={m.cx} cy={m.cy} r={m.r} opacity="0.3"
            style={vivo ? { animationDelay: `${m.d}s`, animationDuration: `${m.s}s` } : undefined} />
        ))}
      </g>
    </g>
  );

  // ── EL DIBUJO (atrás→adelante): sombra de trocha, piernas con botas, la mole
  //    erguida con rayado-grabado, la luna del pecho, brazo en jarra, cabeza
  //    Cuphead con anteojos, y el lado del bastón (brazo + cayado + guante).
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* SOMBRA DE TROCHA — el peso del caminante (abarca botas y contera). */}
      <ellipse cx="1" cy="17.3" rx="12.6" ry="1.9" fill={`url(#${haloSombra})`} aria-hidden="true" />
      {/* aura verde tenue del que hace germinar (presencia, no neón) */}
      <circle cx="0" cy="2" r={10 + 1.4 * (energia ?? 1)} fill={`url(#${haloVerde})`} opacity={auraOp * 0.4} aria-hidden="true" />

      {/* ═══ PIERNAS de goma + BOTAS de trocha (grupos propios: en 'camina'
          alternan el paso). Tubos de tinta — el noodle Cuphead correcto. */}
      <g aria-hidden="true">
        <g className="osb-pierna-i" style={{ transformBox: 'fill-box', transformOrigin: 'top center' }}>
          <path d="M -3.5,8.8 C -3.8,10.3 -4.0,11.9 -4.1,13.6" stroke={INK}
            strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d={bota(-1)} fill={`url(#${botaGrad})`} stroke={INK} strokeWidth="0.85" strokeLinejoin="round" />
          <path d="M -3.0,13.4 C -3.9,13.0 -4.9,13.0 -5.5,13.5" stroke={P.botaSombra}
            strokeWidth="0.5" fill="none" strokeLinecap="round" opacity="0.9" />
          <path d="M -7.6,16.9 C -6.2,17.3 -4.4,17.3 -3.4,16.7" stroke={P.botaSuela}
            strokeWidth="0.7" fill="none" strokeLinecap="round" />
        </g>
        <g className="osb-pierna-d" style={{ transformBox: 'fill-box', transformOrigin: 'top center' }}>
          <path d="M 3.5,8.8 C 3.8,10.3 4.0,11.9 4.1,13.6" stroke={INK}
            strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d={bota(1)} fill={`url(#${botaGrad})`} stroke={INK} strokeWidth="0.85" strokeLinejoin="round" />
          <path d="M 3.0,13.4 C 3.9,13.0 4.9,13.0 5.5,13.5" stroke={P.botaSombra}
            strokeWidth="0.5" fill="none" strokeLinecap="round" opacity="0.9" />
          <path d="M 7.6,16.9 C 6.2,17.3 4.4,17.3 3.4,16.7" stroke={P.botaSuela}
            strokeWidth="0.7" fill="none" strokeLinecap="round" />
        </g>
      </g>

      {/* ═══ LA MOLE ERGUIDA — pelaje con volumen y el contorno de la familia. */}
      <path d={SILUETA_ERGUIDA} fill={`url(#${pelaje})`} stroke={INK} strokeWidth="1.3"
        strokeLinejoin="round" />

      {/* RIM-LIGHT — el contraluz que da FORMA a la mole (repaint anti-blob):
          sol pleno en el hombro izquierdo, filo tenue que rescata la joroba y
          la cadera derechas de la sombra, y el plano de luz que abomba la
          panza. Sutil: modela pelaje, no dibuja neón. */}
      <g aria-hidden="true">
        <ellipse cx="-1.6" cy="2.6" rx="4.4" ry="4.8" fill={`url(#${panzaLuz})`} />
        <g fill="none" strokeLinecap="round" stroke={P.cuerpoRim}>
          <path d="M -4.8,-6.6 C -6.1,-5.5 -6.7,-3.5 -6.8,-1.6"
            strokeWidth="0.75" opacity="0.6" />
          <path d="M 5.0,-6.7 C 6.2,-5.6 6.7,-3.7 6.8,-1.9"
            strokeWidth="0.6" opacity="0.42" />
          <path d="M 7.0,2.6 C 6.9,4.6 6.0,6.6 4.4,7.9"
            strokeWidth="0.55" opacity="0.35" />
        </g>
      </g>

      {/* RAYADO DE GRABADO (la mirada Humboldt): trazos cortos de buril a
          contraluz en flanco y grupa. Sugiere plancha ilustrada, no delinea. */}
      <g aria-hidden="true" fill="none" strokeLinecap="round">
        <g stroke={P.cuerpoLuz} strokeWidth="0.4" opacity="0.4">
          <path d="M -6.6,0.2 C -6.3,1.2 -6.2,2.2 -6.4,3.2" />
          <path d="M -5.6,-2.4 C -5.3,-1.5 -5.2,-0.6 -5.4,0.3" />
          <path d="M -6.9,3.9 C -6.6,4.8 -6.5,5.7 -6.7,6.5" />
          <path d="M -4.6,-5.2 C -4.3,-4.4 -4.2,-3.6 -4.4,-2.9" />
        </g>
        <g stroke={P.cuerpoSombra} strokeWidth="0.45" opacity="0.55">
          <path d="M 6.3,1.0 C 6.6,2.0 6.7,3.0 6.5,4.0" />
          <path d="M 5.5,-1.8 C 5.8,-0.9 5.9,0.0 5.7,0.9" />
          <path d="M 6.4,4.8 C 6.7,5.6 6.7,6.4 6.4,7.1" />
        </g>
      </g>

      {/* GOLILLA — la costura de la cabeza al cuerpo (sombra, sin dobladillo) */}
      <path d={GOLILLA} fill={P.golilla} opacity="0.55" aria-hidden="true" />

      {/* ═══ LA MEDIA LUNA del pecho (el babero de la especie, con gracia):
          chica y ALTA, colgada bajo la garganta — no un emblema de barriga. */}
      <g transform="rotate(12 0 -3.2)" aria-hidden="true">
        <path d={LUNA_PECHO} fill={`url(#${lunaGrad})`}
          stroke={P.pechoSombra} strokeWidth="0.28" />
        {/* dos trazos de buril sobre la luna: textura de plancha, no sticker */}
        <g stroke={P.pechoSombra} strokeWidth="0.22" opacity="0.55" fill="none">
          <path d="M -1.5,-4.4 C -1.2,-4.0 -1.1,-3.5 -1.2,-3.1" />
          <path d="M -1.7,-2.7 C -1.5,-2.4 -1.4,-2.0 -1.5,-1.7" />
        </g>
      </g>

      {/* ═══ BRAZO EN JARRA (izquierdo): tubo de goma del hombro a la cadera,
          guante crema apoyado — la chulería amable de la referencia. El codo
          sale BIEN AFUERA de la silueta (el primer render lo tenía pegado al
          flanco y el guante leía como bola suelta) y el tubo lleva su filo de
          luz para despegarse del pelaje oscuro. */}
      <g className={vivo ? 'crt-brazo-l rh-sway' : 'crt-brazo-l'}
        style={{ transformBox: 'fill-box', transformOrigin: 'top right', animationDelay: '-0.3s' }}>
        <path d="M -4.9,-4.8 C -9.6,-4.9 -11.6,-1.6 -10.3,1.2 C -9.6,2.7 -8.6,3.9 -7.5,4.6"
          stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        {/* el filo de luz del canto externo (separa el tubo del cuerpo;
            repaint: en rim y más presente — el tubo era negro puro) */}
        <path d="M -5.2,-5.7 C -9.4,-5.8 -11.3,-2.8 -10.4,0.2" stroke={P.cuerpoRim}
          strokeWidth="0.55" fill="none" strokeLinecap="round" opacity="0.7" aria-hidden="true" />
        <circle cx="-7.2" cy="4.9" r="1.85" fill={RH_GLOVE} stroke={INK} strokeWidth="0.7" />
        {/* nudillos del guante en jarra */}
        <path d="M -8.2,4.2 C -8.4,4.7 -8.3,5.3 -7.9,5.7" stroke={INK} strokeWidth="0.35"
          fill="none" strokeLinecap="round" opacity="0.6" aria-hidden="true" />
      </g>

      {/* ═══ CABEZA Cuphead del caminante (ojos de goma, sonrisa amplia) */}
      <g>
        {/* orejas redondas sobre el cráneo */}
        <g aria-hidden="true">
          <circle cx="-3.3" cy="-15.9" r={PR.orejaR} fill={P.cuerpo} stroke={INK} strokeWidth="1.0" />
          <circle cx="-3.3" cy="-15.9" r={PR.orejaR * 0.45} fill={P.oreja} />
          <circle cx="3.3" cy="-15.9" r={PR.orejaR} fill={P.cuerpo} stroke={INK} strokeWidth="1.0" />
          <circle cx="3.3" cy="-15.9" r={PR.orejaR * 0.45} fill={P.oreja} />
        </g>
        {/* cráneo ancho de hocico corto */}
        <ellipse cx="0" cy="-12.1" rx={PR.cabezaRx} ry={PR.cabezaRy}
          fill={`url(#${pelaje})`} stroke={INK} strokeWidth="1.2" />
        {/* contraluz del cráneo en DOS arcos laterales pegados al contorno
            (repaint: que la cabeza no se funda con el fondo oscuro). Laterales
            a propósito: la frente queda limpia para las cejas. */}
        <g fill="none" stroke={P.cuerpoRim} strokeWidth="0.55" strokeLinecap="round"
          opacity="0.5" aria-hidden="true">
          <path d="M -4.35,-13.1 C -4.15,-14.0 -3.7,-14.75 -3.05,-15.25" />
          <path d="M 3.05,-15.2 C 3.7,-14.7 4.15,-13.95 4.35,-13.05" />
        </g>

        {/* ═══ LOS ANTEOJOS crema — ASIMÉTRICOS como el animal real: el
            izquierdo cierra completo; el derecho abre por abajo y DERRAMA su
            lágrima hacia el hocico. Repaint 2026-08-24: aros MÁS GRUESOS
            (0.7→1.05) y un pelo más amplios para que la marca diagnóstica de
            la especie lea a 64 px (antes desaparecía en el pelaje). El ojo se
            dibuja ENCIMA y tapa el canto interno: el anillo queda por fuera. */}
        <g aria-hidden="true" fill="none" strokeLinecap="round">
          <ellipse cx="-2.0" cy="-12.75" rx={PR.anteojoR * 1.26} ry={PR.anteojoR * 1.38}
            transform="rotate(-7 -2.0 -12.75)" stroke={P.anteojo} strokeWidth="1.05" />
          <ellipse cx="2.0" cy="-12.75" rx={PR.anteojoR * 1.26} ry={PR.anteojoR * 1.38}
            transform="rotate(7 2.0 -12.75)" stroke={P.anteojo} strokeWidth="1.05"
            strokeDasharray="9.2 2.7" strokeDashoffset="-10.0" />
          <path d="M 3.4,-11.3 C 3.9,-10.2 3.65,-9.2 2.8,-8.55"
            stroke={P.anteojo} strokeWidth="0.85" opacity="0.92" />
        </g>

        {/* CEJAS de goma: la izquierda ALZADA (travieso noble de la referencia).
            Un pelo más arriba que antes: despegadas del aro engrosado (crema
            sobre crema las borraría) y con sombra fina debajo para leer. */}
        <g className="oso-cejas" strokeLinecap="round" fill="none">
          <g stroke={INK} strokeWidth="1.25" opacity="0.6">
            <path d="M -3.2,-15.4 C -2.5,-16.05 -1.5,-16.0 -0.9,-15.55" />
            <path d="M 0.9,-15.3 C 1.5,-15.6 2.5,-15.6 3.1,-15.25" />
          </g>
          <g stroke={P.ceja} strokeWidth="0.75" opacity="0.9">
            <path d="M -3.2,-15.4 C -2.5,-16.05 -1.5,-16.0 -0.9,-15.55" />
            <path d="M 0.9,-15.3 C 1.5,-15.6 2.5,-15.6 3.1,-15.25" />
          </g>
        </g>

        {/* OJOS Cuphead del kit (catchlight, parpadeo, la mirada que reconoce) */}
        <OjosRubber
          ojos={[{ cx: -2.0, cy: -12.75, r: 1.5 }, { cx: 2.0, cy: -12.75, r: 1.5 }]}
          mirar={[0.2, 0.1]}
          parpadea={vivo}
          ink={INK}
        />

        {/* cachetes campesinos (la calidez de la familia) */}
        <Cachetes puntos={[{ cx: -3.5, cy: -10.2, r: 0.95 }, { cx: 3.5, cy: -10.2, r: 0.95 }]} vivo={vivo} />

        {/* HOCICO corto tan claro + trufa con chispa + la sonrisa amplia */}
        <path d="M -1.9,-11.9 C -2.5,-9.9 -1.8,-8.2 0,-7.95 C 1.8,-8.2 2.5,-9.9 1.9,-11.9 C 1.1,-12.65 -1.1,-12.65 -1.9,-11.9 Z"
          fill={P.hocico} stroke={INK} strokeWidth="0.75" strokeLinejoin="round" />
        <path d="M -0.95,-12.05 C -0.3,-12.35 0.3,-12.35 0.95,-12.05" fill="none"
          stroke={P.hocicoSombra} strokeWidth="0.4" opacity="0.6" aria-hidden="true" />
        <ellipse cx="0" cy="-10.7" rx="0.92" ry="0.66" fill={P.trufa} />
        <ellipse cx="-0.3" cy="-10.9" rx="0.26" ry="0.16" fill="#fffaf0" opacity="0.6" />
        <path d="M 0,-10.05 L 0,-9.8" stroke={INK} strokeWidth="0.4" strokeLinecap="round" />
        {boca}
      </g>

      {/* ═══ EL LADO DEL BASTÓN (derecho): brazo de goma + cayado + guante que
          EMPUÑA. Un solo grupo `.crt-brazo-r`: en 'celebra' el oso ALZA el
          bastón entero (el flourish del caminante). */}
      <g className="crt-brazo-r" style={{ transformBox: 'fill-box', transformOrigin: 'top left' }}>
        <path d="M 4.9,-4.8 C 7.4,-4.7 9.3,-3.8 10.4,-2.4"
          stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        {baston}
        {/* el guante que empuña, ENCIMA del palo (los dedos lo agarran) */}
        <circle cx="10.75" cy="-1.7" r="1.85" fill={RH_GLOVE} stroke={INK} strokeWidth="0.7" />
        <g aria-hidden="true" fill="none" stroke={INK} strokeWidth="0.35" strokeLinecap="round" opacity="0.65">
          <path d="M 9.9,-2.3 C 10.6,-2.5 11.3,-2.5 11.8,-2.2" />
          <path d="M 9.9,-1.6 C 10.6,-1.8 11.3,-1.8 11.8,-1.5" />
          <path d="M 10.0,-0.9 C 10.6,-1.1 11.2,-1.1 11.7,-0.85" />
        </g>
      </g>

      {/* Prop del mundo en la mano libre. */}
      {propMundo}

      {/* Vaho del resoplido (el huff familiar de los osos de la casa). */}
      {vaho}
    </g>
  );

  // Antics de VIDA solo vivo; los estados (florece/resopla/camina) los pisan
  // por CSS (un oso que hace florecer el bastón no da además volteretas).
  const conAntics = vivo ? (
    <g className="rh-antic">
      <g className="rh-travieso">{body}</g>
    </g>
  ) : body;
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{conAntics}</g> : conAntics;

  const estadoAttrs = {
    'data-creature': OSO_BASTON_SLUG,
    'data-pose': vivo ? poseFx : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-visema': visema || undefined,
    'data-florece': floreceFx ? '1' : undefined,
    'data-resopla': resoplaFx ? '1' : undefined,
    'data-vida': momento || undefined,
    'data-lineboil': lineBoil ? '1' : undefined,
    'data-prop': mundoId || undefined,
  };
  const estiloRaiz = { ...ritmoPropio, ...estiloClima };

  if (inline) {
    return (
      <g ref={raizRef} className={className} style={estiloRaiz} data-poder={poder ? '1' : undefined} {...estadoAttrs}>
        {defs}
        {cuerpoVivo}
      </g>
    );
  }
  const svg = (
    <svg ref={raizRef} viewBox={VIEWBOX} width={size} height={size} className={className} style={estiloRaiz}
      role="img" aria-label={title} {...estadoAttrs} {...rest}>
      <title>{title}</title>
      {defs}
      {cuerpoVivo}
    </svg>
  );
  // MODO PODER (standalone): aura VERDE del bastón florecido, 4 capas.
  if (poder) {
    return (
      <span
        className="is-powered-up osb-poder"
        data-creature-poder={OSO_BASTON_SLUG}
        style={{ '--aura-color': auraDeBicho(OSO_BASTON_SLUG), display: 'inline-flex' }}
      >
        {svg}
        <AuraPoder />
      </span>
    );
  }
  return svg;
}

export default OsoBaston;
