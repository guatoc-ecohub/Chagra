import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, BocaVisema, RH_INK } from './_rubberhose.jsx';
import { CONDOR_PALETA, CONDOR_PROPORCION, CONDOR_SLUG, PERFIL_CONDOR } from './condorIdentidad.js';
import { cuerpoDeClima } from './creatureClimaCuerpo.js';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { PropEnMano } from './PropEnMano.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';

/* Cóndor de los Andes — Vultur gryphus (el ave voladora más grande del mundo,
   EL EMBLEMA DEL PÁRAMO: verlo cruzar el cielo es saber que la montaña está
   sana — el carroñero sagrado que limpia y cierra el ciclo). Hermano
   rubber-hose de la abeja Angelita, el oso y la danta: compone el MISMO kit
   `_rubberhose.jsx` (ojos de goma, cachetes, sonrisa) y hereda la MISMA
   fundación transversal — lip-sync (useLipSync → BocaVisema), modo poder
   (transformacion, aura CELESTE DE ALTURA), clima→cuerpo (PERFIL_CONDOR) y
   line-boil (LineBoilFilter) — cero código duplicado. Solo cambia el ANIMAL
   y su CARÁCTER: MAJESTUOSO e imperturbable, EL SEÑOR DEL VIENTO — su seña de
   vida es que CASI NO ALETEA: planea con las alas planchadas (banqueo lento de
   térmica) y solo cada tanto da DOS golpes de ala secos y vuelve a la plancha.
   Su firma es TRIPLE: las ALAS ENORMES con las plumas primarias abiertas como
   DEDOS (toda la silueta es ala), el COLLAR BLANCO de plumón (su ruana propia:
   contrato de altura — JAMÁS vestuario) y la CABEZA PELADA rosada con la
   carúncula. Su squash&stretch es MÍNIMO y lentísimo (la majestad no rebota).
   La IDENTIDAD (paleta + proporciones) vive en `condorIdentidad.js`; el
   CLIMA→cuerpo usa PERFIL_CONDOR (vuela por encima de la lluvia; la niebla sí
   se lo traga). A diferencia de sus hermanos NO monta `rh-antic`/`rh-travieso`
   (volteretas y arrebatos): un cóndor no hace travesuras — su vida idle es el
   PLANEO (.condor-planeo). */
const VIEWBOX = '-24 -20 48 40';

/* EL ALA — dibujada UNA vez para el lado izquierdo; la derecha la monta el
   cuerpo con scale(-1,1) en un grupo exterior SIN animación (el CSS transform
   de `.condor-ala` pisaría el atributo). Hombro en (-2.6,-5.0): ahí pivota
   (transform-origin right center del fill-box — vale igual espejada).

   ANTI-COMETA (2026-07, veredicto del operador): el ala vieja era un
   TRIÁNGULO tipo vela → con la cola en abanico la silueta cerraba un ROMBO
   (una cometa, no un ave). El ala nueva es la del Vultur gryphus real:
     · TABLA ancha de bordes casi paralelos (nada de vela): el borde de fuga
       festoneado de secundarias llega ancho casi hasta la mano.
     · DIEDRO LEVE dibujado en la geometría: el borde de ataque SUBE del
       hombro (-5.0) a la mano (-8.2) — espejada, la silueta hace una V suave.
     · SEIS PRIMARIAS-DEDO largas, curvas y SEPARADAS (emarginadas) abiertas
       en abanico de ~100°, la de adelante apuntando ARRIBA (la punta alzada
       del planeo en térmica). Esa mano abierta ES la seña que hace cóndor a
       la silueta aun a 40 px — una cometa jamás tiene dedos. */
function AlaCondor({ P, vivo }) {
  return (
    <g
      className={vivo ? 'condor-ala' : undefined}
      style={{ transformBox: 'fill-box', transformOrigin: 'right center' }}
    >
      {/* la TABLA del ala: borde de ataque que sube (diedro) y borde de fuga
          ancho y festoneado (secundarias) — planta rectangular, no triángulo */}
      <path
        d="M-2.6,-5.0 C-7.6,-6.9 -12.6,-7.8 -15.8,-8.2 L-16.6,-5.4
           C-15.0,-4.2 -13.2,-3.6 -11.2,-2.9
           C-8.4,-1.9 -5.2,-0.6 -2.1,1.5
           C-1.1,-0.7 -1.2,-3.5 -2.6,-5.0 Z"
        fill={P.ala} stroke={RH_INK} strokeWidth="1.3" strokeLinejoin="round"
      />
      {/* la banda PLATEADA sobre el ala (el relumbre del adulto al sol),
          corrida a lo largo de la tabla como panel, no como cuña */}
      <path
        d="M-3.6,-4.2 C-8.2,-6.0 -12.6,-6.9 -15.4,-7.4
           C-13.0,-5.6 -9.4,-4.0 -5.0,-2.4 C-4.0,-3.0 -3.7,-3.6 -3.6,-4.2 Z"
        fill={P.cobertera} opacity="0.85"
      />
      {/* los cañones de las secundarias (el festón se lee como plumas) */}
      <g stroke={RH_INK} strokeWidth="0.55" opacity="0.35" fill="none">
        <path d="M-6.2,-3.2 L-5.1,-0.3" />
        <path d="M-9.4,-4.5 L-8.7,-2.0" />
        <path d="M-12.4,-5.7 L-12.0,-3.3" />
      </g>
      {/* LAS PRIMARIAS: seis plumas-dedo LARGAS, curvas y separadas, en
          abanico desde la mano — la primera alzada hacia arriba. Vibran
          tanteando el viento (.condor-primarias). */}
      <g
        className={vivo ? 'condor-primarias' : undefined}
        style={{ transformBox: 'fill-box', transformOrigin: 'right center' }}
        stroke={P.pluma} strokeWidth="1.7" strokeLinecap="round" fill="none"
      >
        <path d="M-15.4,-7.8 Q-18.8,-10.4 -21.6,-13.4" />
        <path d="M-15.9,-7.3 Q-19.8,-9.4 -22.8,-11.0" />
        <path d="M-16.2,-6.6 Q-20.2,-7.8 -23.4,-8.2" />
        <path d="M-16.2,-5.8 Q-20.0,-6.0 -23.0,-5.3" />
        <path d="M-15.8,-5.0 Q-19.2,-4.2 -21.9,-2.9" />
        <path d="M-15.3,-4.3 Q-18.0,-2.6 -19.9,-0.9" />
      </g>
    </g>
  );
}

export function Condor({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Cóndor de los Andes',
  /* Pose de VIDA (idle-life): 'planea' (base — banqueo de térmica, alas
     planchadas, dos golpes de ala cada tanto) | 'celebra' (brinca con las ALAS
     alzadas en V — CSS propio: sin bracitos, celebra con la envergadura) |
     'reposo' (respira lentísimo, plantado) | 'señala' (se inclina al POI).
     Solo corren vivas (animated); con animated=false o reduced-motion queda en
     fotograma digno: la plancha perfecta. */
  pose = 'planea',
  animo = 'sereno',
  energia = 1,
  /* CLIMA REAL escrito en el cuerpo (perfil cóndor: vuela por encima de la
     lluvia, la niebla sí se lo traga). Sin clima (avatares, catálogo) = neutro
     digno. */
  clima = null,
  enso = 'neutro',
  /* ── LIP-SYNC (sistema transversal, useLipSync) ────────────────────────────
     visema opcional ('V1'..'V4') del RMS del TTS: la boca (bajo el pico) se
     abre cuando el agente narra y la cabeza pelada se adelanta cortés (CSS por
     data-visema). Sin visema (o 'V1') = la sonrisa de siempre. */
  visema = null,
  /* ── OTEA (la cabeza pelada escanea el valle — su reacción-firma) ───────────
     OPT-IN: la CABEZA gira a lado y lado con pausa de vigía (el censo del
     carroñero: nada se le escapa desde arriba) y el collar se esponja. Default
     false → planeo sereno de siempre. */
  otea = false,
  /* Device-tier (DR-3D-PERF-GAMABAJA): 'alto'|'medio' corren el rubber-hose
     pleno; 'bajo' apaga el idle continuo (planeo + primarias + cola) y deja
     los estados reactivos. Sin prop (standalone) = pleno. */
  tier,
  /* ── LÍNEA QUE RESPIRA (line-boil, Cuphead años 30 — LineBoilFilter) ────────
     OPT-IN: el CONTORNO vibra escalonado (~8fps). Capa MÁS cara del kit:
     reservada para su entrada heroica. */
  lineBoil = false,
  /* ── MODO PODER (transformación / power-up CELESTE DE ALTURA) ───────────────
     OPT-IN: aura de 4 capas color cielo de 5000 msnm — su firma cuando "sube
     de nivel": el señor del viento en pleno. En modo inline el power-up lo
     pone el host DOM. */
  poder = false,
  /* ── PROP POR MUNDO (la herramienta EN LAS GARRAS — propsPorMundo) ──────────
     mundoId opcional: al entrar a un mundo el cóndor carga su herramienta
     colgando de las garras recogidas. Sin mundoId entra con las garras libres. */
  mundoId = null,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const vivo = animated;
  const auraOp = Math.max(0.12, Math.min(0.34, 0.14 + 0.2 * (energia ?? 1)));
  const auraR = 8.4 + 1.4 * (energia ?? 1);

  // CLIMA → cuerpo (determinista, una vez por render): tinte + opacidad.
  // Sin aleteo continuo que acelerar (alas:false — el planeo es imperturbable).
  const cuerpoClima = cuerpoDeClima(clima, { enso: /** @type {any} */ (enso), tier, perfil: PERFIL_CONDOR });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  const P = CONDOR_PALETA;
  const PR = CONDOR_PROPORCION;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {lineBoil && <LineBoilFilter id={boil} animated={vivo} />}
    </defs>
  );

  // PROP DEL MUNDO colgando de las garras. Sin mundoId → garras libres.
  const propMundo = mundoId ? (
    <PropEnMano mundoId={mundoId} x={-2.6} y={7.4} escala={0.62} ink={RH_INK} animated={vivo} />
  ) : null;

  // BOCA bajo el pico ganchudo: visema (el agente narra) o la sonrisa serena.
  const boca = visema
    ? <BocaVisema cx={0} cy={-10.0} w={2.4} prof={0.9} visema={visema} />
    : <Sonrisa cx={0} cy={-9.9} w={2.4} prof={0.8} />;

  // ── CUERPO rubber-hose (atrás→adelante): aura, cola-timón, LAS ALAS (la
  //    silueta manda), garras recogidas, torso, COLLAR de plumón y la CABEZA
  //    PELADA (carúncula + pico ganchudo + boca + ojos). `.crt-body` respira
  //    mínimo (condor-boil: la majestad no rebota).
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* aura viva (la presencia grande y serena) */}
      <circle cx="0" cy="0" r={auraR} fill={P.cuerpo} opacity={auraOp} filter={`url(#${blur})`} />

      {/* LA COLA-TIMÓN: corta y CUADRADA (borde recto — Vultur gryphus).
          El abanico curvo viejo cerraba la punta de abajo del rombo-cometa;
          el trapecio de remate recto la mata. (grupo propio) */}
      <g className={vivo ? 'condor-cola' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center top' }}>
        <path
          d={`M-3.0,4.4 L-4.1,${4.4 + PR.colaLargo} L4.1,${4.4 + PR.colaLargo} L3.0,4.4 Z`}
          fill={P.cola} stroke={RH_INK} strokeWidth="1.2" strokeLinejoin="round"
        />
        <path d={`M-1.3,5.1 L-1.7,${4.6 + PR.colaLargo}`} stroke={RH_INK} strokeWidth="0.6" opacity="0.5" />
        <path d={`M0,5.2 L0,${4.7 + PR.colaLargo}`} stroke={RH_INK} strokeWidth="0.6" opacity="0.5" />
        <path d={`M1.3,5.1 L1.7,${4.6 + PR.colaLargo}`} stroke={RH_INK} strokeWidth="0.6" opacity="0.5" />
      </g>

      {/* LAS ALAS ENORMES (la firma: toda la silueta es ala). El grupo exterior
          derecho lleva el espejo SIN animación; la animación vive adentro. */}
      <g className="condor-ala-mount">
        <AlaCondor P={P} vivo={vivo} />
      </g>
      <g className="condor-ala-mount" transform="scale(-1,1)">
        <AlaCondor P={P} vivo={vivo} />
      </g>

      {/* las garras RECOGIDAS del planeo (dos puntitas, casi escondidas) */}
      <ellipse cx="-1.7" cy="6.3" rx="1.1" ry="0.7" fill={P.pico} stroke={RH_INK} strokeWidth="0.7" />
      <ellipse cx="1.7" cy="6.3" rx="1.1" ry="0.7" fill={P.pico} stroke={RH_INK} strokeWidth="0.7" />

      {/* el torso compacto negro azabache (todo lo demás es ala) */}
      <ellipse cx="0" cy="0.5" rx={PR.cuerpoRx} ry={PR.cuerpoRy}
        fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.4"
        style={{ filter: `drop-shadow(0 0 6px ${P.cuerpoGlow})` }} />
      {/* la pechuga un tono más honda (la sombra del planeo) */}
      <ellipse cx="0" cy="2.6" rx="3.4" ry="3.2" fill={P.ala} opacity="0.7" />

      {/* EL COLLAR BLANCO de plumón (su firma, su ruana propia): la nube
          esponjosa de la que emerge el cuello pelado. Grupo .condor-collar
          (se esponja al otear). */}
      <g className={vivo ? 'condor-collar' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <circle cx="-3.2" cy="-6.6" r="1.9" fill={P.collar} stroke={RH_INK} strokeWidth="0.9" />
        <circle cx="3.2" cy="-6.6" r="1.9" fill={P.collar} stroke={RH_INK} strokeWidth="0.9" />
        <circle cx="-1.7" cy="-7.5" r="2.0" fill={P.collar} stroke={RH_INK} strokeWidth="0.9" />
        <circle cx="1.7" cy="-7.5" r="2.0" fill={P.collar} stroke={RH_INK} strokeWidth="0.9" />
        <circle cx="0" cy="-7.9" r="2.1" fill={P.collar} stroke={RH_INK} strokeWidth="0.9" />
        {/* la elipse de fusión: borra las costuras internas de la nube */}
        <ellipse cx="0" cy="-6.8" rx="4.5" ry="2.2" fill={P.collar} />
      </g>

      {/* LA CABEZA PELADA (grupo propio .condor-cabeza: otea, habla) */}
      <g className="condor-cabeza" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
        {/* la carúncula (la cresta carnosa del adulto) — detrás de la testa */}
        <ellipse cx="0.2" cy="-14.9" rx="1.6" ry="1.0" fill={P.caruncula} stroke={RH_INK} strokeWidth="0.9" />
        {/* la testa pelada rosada-gris (su firma: ni una pluma) */}
        <circle cx="0" cy="-12" r={PR.cabezaR} fill={P.cabeza} stroke={RH_INK} strokeWidth="1.3" />
        {/* el rubor sobre la piel pelada (ternura rubber-hose) */}
        <Cachetes puntos={[{ cx: -2.3, cy: -11.5, r: 0.8 }, { cx: 2.3, cy: -11.5, r: 0.8 }]} color={P.cachete} vivo={vivo} />
        {/* el pico ganchudo marfil (base + el gancho que cuelga) */}
        <path
          d="M-1.0,-11.9 C-1.3,-10.9 -0.7,-10.3 0,-10.3 C0.8,-10.3 1.3,-10.9 1.0,-11.9 C0.4,-12.5 -0.5,-12.5 -1.0,-11.9 Z"
          fill={P.pico} stroke={RH_INK} strokeWidth="0.9" strokeLinejoin="round"
        />
        <path d="M-0.35,-10.35 C-0.3,-9.9 0.1,-9.72 0.5,-9.92"
          stroke={P.picoPunta} strokeWidth="0.9" strokeLinecap="round" fill="none" />
        {boca}
        {/* ojos de goma serenos (la mirada que ve el valle entero) */}
        <OjosRubber
          ojos={[{ cx: -1.4, cy: -13.1, r: 1.2 }, { cx: 1.4, cy: -13.1, r: 1.2 }]}
          mirar={[0, 0.12]}
          parpadea={vivo}
        />
      </g>

      {/* Prop del mundo en las garras (entra con su herramienta colgando). */}
      {propMundo}
    </g>
  );

  // El cóndor NO monta rh-antic/rh-travieso (arrebatos y volteretas): su vida
  // idle es el PLANEO — banqueo lento de térmica sobre el dibujo entero.
  const conVida = vivo ? <g className="condor-planeo">{body}</g> : body;
  // El line-boil (contorno que hierve) envuelve TODO el dibujo cuando se pide.
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{conVida}</g> : conVida;

  const estadoAttrs = {
    'data-creature': CONDOR_SLUG,
    'data-pose': vivo ? pose : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-visema': visema || undefined,
    'data-otea': otea ? '1' : undefined,
    'data-lineboil': lineBoil ? '1' : undefined,
    'data-prop': mundoId || undefined,
  };

  if (inline) {
    // En modo inline el power-up lo pone el host DOM (::before/mix-blend no
    // aplican a SVG); aquí solo marcamos data-poder por si el host lo consulta.
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
  // MODO PODER (standalone): el aura CELESTE DE ALTURA de 4 capas
  // (transformacion.css). El wrapper DOM es lo único que puede llevar
  // ::before/mix-blend/corrientes.
  if (poder) {
    return (
      <span
        className="is-powered-up condor-poder"
        data-creature-poder={CONDOR_SLUG}
        style={{ '--aura-color': auraDeBicho(CONDOR_SLUG), display: 'inline-flex' }}
      >
        {svg}
        <AuraPoder />
      </span>
    );
  }
  return svg;
}

export default Condor;
