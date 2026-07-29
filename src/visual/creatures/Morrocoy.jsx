import { useId, useRef } from 'react';
import './creatures.css';
import { useVidaIdle, useRitmoPropio, useMiradaUsted } from './useVidaIdle.js';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, BocaVisema, RH_INK, RH_BOCA } from './_rubberhose.jsx';
import { MORROCOY_PALETA, MORROCOY_PROPORCION, MORROCOY_SLUG, PERFIL_MORROCOY } from './morrocoyIdentidad.js';
import { cuerpoDeClima, ropaDeClimaBicho } from './creatureClimaCuerpo.js';
import { AccesoriosClima } from './AccesoriosClima.jsx';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { PropEnMano } from './PropEnMano.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';

/* Morrocoy — Chelonoidis carbonarius (el galápago de patas rojas de tierra
   cálida). Hermano rubber-hose de la abeja Angelita, el oso andino, la rana y el
   jaguar: compone el MISMO kit `_rubberhose.jsx` (ojos de goma, cachetes,
   sonrisa, cuello/patas manguera) y hereda la MISMA fundación transversal —
   lip-sync (useLipSync → BocaVisema), modo poder (transformacion, aura BRONCE),
   ropa por clima (ropaDeClima), prop por mundo (PropEnMano) y line-boil
   (LineBoilFilter) — cero código duplicado. Solo cambia el ANIMAL y su CARÁCTER:
   el ANCIANO tranquilo de la chagra — ANCESTRAL, LENTO, SABIO y PACIENTE. Su
   caparazón es un DOMO GEOMÉTRICO de escudos HEXAGONALES (su firma) que
   "respira" apacible; sus patas y su cabeza son ROJIZAS con escamas naranja-
   fuego (la marca carbonarius). Su seña de vida es la RETRACCIÓN ELÁSTICA
   (`seRetrae`): mete cabeza y patas al caparazón estirando y encogiendo con
   squash&stretch de goma. Su otra reacción-firma es el ASENTIMIENTO sabio
   (`asiente`): la testa cabecea lento, "sí, mijo, con paciencia". Su squash es
   LENTO y firme (nada hiperactivo: la sabiduría no corre). Es de SUELO: anda con
   paso pesado, sin alas. Su color de poder es el BRONCE/COBRE cálido (no el
   dorado de la abeja ni el púrpura del jaguar). La IDENTIDAD (paleta +
   proporciones + perfil de clima) vive en `morrocoyIdentidad.js`; el CLIMA→
   cuerpo, en `creatureClimaCuerpo.js` con PERFIL_MORROCOY (caparazón córneo que
   escurre el agua, reptil robusto ante la seca) — y de tierra cálida: NUNCA suda
   (aguanta el calor sin sudar ni sombrero, como el jaguar).

   ANCESTRAL (el anciano de piedra viva): tejido con gusto, permanente y sutil.
   Cada escudo hexagonal lleva ANILLOS DE EDAD grabados (el tiempo escrito en el
   domo) y un RESPLANDOR cobrizo lo envuelve como calor de brasa apacible, con un
   SHIMMER tibio recorriendo el reborde del caparazón. En modo poder el resplandor
   y las brasas se avivan (el anciano guarda fuego dentro). Todo se PODA en tier
   bajo / reduced-motion (queda un fotograma digno y quieto). */
const VIEWBOX = '-16 -20 32 40';

/* Genera el path de un hexágono de vértices arriba/abajo (pointy-top) —
   la geometría del escudo del caparazón. r = radio al vértice. */
function hexPath(cx, cy, r) {
  const pts = [];
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 180) * (90 + k * 60); // arranca en la punta superior
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy - r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(' L')} Z`;
}

/* Escudo hexagonal del caparazón (la firma del domo geométrico): hexágono de
   domo con su cara alta iluminada y ANILLOS DE EDAD concéntricos grabados (lo
   ancestral: el tiempo escrito en la concha). Decorativo (aria-hidden en el
   grupo padre). */
function Escudo({ cx, cy, r, P }) {
  return (
    <g>
      <path d={hexPath(cx, cy, r)} fill={P.escudoCentro} stroke={P.escudo} strokeWidth={r * 0.24} strokeLinejoin="round" />
      {/* anillos de edad concéntricos (el anciano lleva su tiempo grabado) */}
      <path d={hexPath(cx, cy, r * 0.66)} fill="none" stroke={P.anillo} strokeWidth={r * 0.1} opacity="0.55" strokeLinejoin="round" />
      <path d={hexPath(cx, cy, r * 0.34)} fill="none" stroke={P.anillo} strokeWidth={r * 0.1} opacity="0.4" strokeLinejoin="round" />
      {/* brillo de domo en la cara alta del escudo */}
      <path d={hexPath(cx, cy - r * 0.18, r * 0.5)} fill={P.caparazonAlto} opacity="0.35" />
    </g>
  );
}

/* Escudos del caparazón: la vertebral central (3 escudos apilados) + las
   costales laterales (2 por lado). El patrón geométrico canónico del galápago. */
const ESCUDOS = [
  { cx: 0, cy: -3.6, r: 3.0 },   // vertebral alta
  { cx: 0, cy: 0.6, r: 3.2 },    // vertebral central
  { cx: 0, cy: 4.6, r: 2.7 },    // vertebral baja
  { cx: -5.6, cy: -1.4, r: 2.6 }, // costal izq. alta
  { cx: 5.6, cy: -1.4, r: 2.6 }, // costal der. alta
  { cx: -5.9, cy: 3.2, r: 2.4 }, // costal izq. baja
  { cx: 5.9, cy: 3.2, r: 2.4 },  // costal der. baja
];

export function Morrocoy({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Morrocoy',
  /* Pose de VIDA (idle-life), species-agnostic (gestos rh-g-* de creatures.css):
     'anda' (base, con paso pesado) | 'celebra' (brinca con brazos en V +
     overshoot) | 'reposo' (respira hondo, se asienta) | 'señala' (se inclina al
     POI y apunta con la pata). Solo corren viva (animated); con animated=false o
     reduced-motion queda en fotograma digno y sereno. */
  pose = 'anda',
  animo = 'sereno',
  energia = 1,
  /* CLIMA REAL escrito en el cuerpo (perfil morrocoy). Sin clima (avatares,
     catálogo) = neutro digno: el morrocoy se ve EXACTO como siempre. */
  clima = null,
  enso = 'neutro',
  /* ── LIP-SYNC (sistema transversal, useLipSync) ────────────────────────────
     visema opcional ('V1'..'V4') que produce useLipSync desde el RMS del TTS: la
     boca (pico) se abre cuando el agente narra. Sin visema (o 'V1') = la sonrisa
     de goma de siempre → avatares/catálogo no cambian. El HOOK vive aparte (no
     cuelga un AnalyserNode por instancia); acá solo se consume. La RETRACCIÓN
     manda sobre el visema (una tortuga metida en su concha no articula). */
  visema = null,
  /* ── VESTUARIO por clima+hora (ropaDeClima) ───────────────────────────────
     OPT-IN: con vestuario=true el morrocoy se abriga según el clima real (RUANA
     de noche/frío — es de tierra cálida y siente el frío pronto). Es de tierra
     cálida: NUNCA se sobrecalienta → jamás suda ni sombrero (se suprimen aquí
     aunque el termómetro suba, contrato compartido con el jaguar). Default false
     → los consumidores de `clima` existentes NO ven ropa nueva. */
  vestuario = false,
  tempC = undefined,
  /* ── SE RETRAE (retracción elástica — la firma del morrocoy) ────────────────
     OPT-IN: cabeza y patas ENTRAN al caparazón estirando y encogiendo con
     squash&stretch de goma (el domo se abomba un pelín al recogerse). Su
     reacción-firma ancestral: se guarda, paciente. Default false → asoma sereno. */
  seRetrae = false,
  /* ── ASIENTE (el asentimiento sabio — el anciano cabecea) ───────────────────
     OPT-IN: la testa cabecea lento y firme ("sí, mijo, con paciencia"). Su otra
     reacción-firma. Default false. */
  asiente = false,
  /* ── VIDA PROPIA (idle-cerebro v2 — la vara de Angelita) ───────────────────
     Default ON: un reloj con jitter hojea el repertorio de la especie
     (vidaEstados.js) — el bicho EXISTE aunque nadie le hable. Cada instancia
     parpadea a SU aire (ritmo propio) y sus pupilas SIGUEN su puntero/dedo
     cuando anda cerca. El cerebro CEDE ante el host (cualquier gesto manual
     lo apaga); animated=false, tier 'bajo' y reduced-motion lo apagan entero.
     vida={false} = el bicho de antes, idéntico. */
  vida = true,
  /* Device-tier (DR-3D-PERF-GAMABAJA): 'alto'|'medio' corren el rubber-hose
     pleno; 'bajo' apaga el idle continuo (boil + respiración del domo + shimmer)
     y deja los estados reactivos. Sin prop (standalone: avatares, catálogo) = pleno. */
  tier,
  /* ── LÍNEA QUE RESPIRA (line-boil, Cuphead años 30 — LineBoilFilter) ────────
     OPT-IN: con lineBoil el CONTORNO del morrocoy vibra escalonado (feTurbulence
     + feDisplacement, ~8fps) — el trazo "hierve" como dibujo animado clásico.
     Default false → los consumidores existentes NO cambian. Con animated=false o
     reduced-motion queda con seed fija (textura sin vibrar). Capa MÁS cara del
     kit: reservada para su entrada heroica (galería, hero). */
  lineBoil = false,
  /* ── MODO PODER (transformación / power-up BRONCE — transformacion.css) ──────
     OPT-IN: con poder=true (y en modo standalone) el morrocoy se envuelve en su
     aura BRONCE/COBRE de 4 capas (glow, boost, ingravidez, corrientes) — su firma
     cuando "sube de nivel" (el anciano guarda fuego dentro). El host lo enciende
     un rato con usePoderTemporal(). En modo inline el power-up lo pone el host
     DOM (::before/mix-blend no aplican a nodos SVG); acá solo marcamos data-poder
     por si el host lo consulta. */
  poder = false,
  /* ── PROP POR MUNDO (herramienta en la pata — propsPorMundo/PropEnMano) ──────
     mundoId opcional: al ENTRAR a un mundo el morrocoy carga su herramienta
     (agua→manguerita, suelo→lupa, animales→lazo, semillero→canasto…). Sin mundoId
     (o mundo sin prop) entra con las patas libres. Va en su pata delantera
     IZQUIERDA. */
  mundoId = null,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const vivo = animated;
  const auraOp = Math.max(0.14, Math.min(0.42, 0.18 + 0.26 * (energia ?? 1)));
  const auraR = 9.0 + 1.6 * (energia ?? 1);

  // ═══ VIDA PROPIA (idle-cerebro + ritmo propio + mirada — vara Angelita v2).
  // El cerebro solo manda cuando el host no dirige (pose base, sin gestos
  // manuales ni lip-sync); sus momentos se funden con los props opt-in para
  // reusar TODO el CSS existente de los gestos-firma.
  const raizRef = useRef(null);
  const ritmoPropio = useRitmoPropio();
  const enBase = pose === 'anda' && !seRetrae && !asiente && !visema;
  const momento = useVidaIdle('morrocoy', vida && vivo && tier !== 'bajo' && enBase);
  useMiradaUsted(raizRef, vida && vivo && tier !== 'bajo');
  const seRetraeFx = seRetrae || momento === 'seRetrae';
  const asienteFx = asiente || momento === 'asiente';
  const poseFx = momento === 'reposo' ? 'reposo' : pose;

  // CLIMA → cuerpo (determinista, una vez por render): tinte + opacidad al
  // contorno. El morrocoy no tiene alas (velocidadAlas siempre 1: no se usa).
  const cuerpoClima = cuerpoDeClima(clima, { enso: /** @type {any} */ (enso), tier, perfil: PERFIL_MORROCOY });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  // Vestuario por clima+hora (opt-in). Perfil morrocoy de TIERRA CÁLIDA: la RUANA
  // de noche/frío; NUNCA sombrero ni sudor (aunque suba el termómetro) — el
  // galápago no se sobrecalienta. Los suprimimos aquí sin tocar la función
  // compartida (su contrato/tests siguen intactos). Sin vestuario/clima → nada.
  const ropaBase = (vestuario && clima) ? ropaDeClimaBicho(MORROCOY_SLUG, clima, { tempC }) : null;
  const ropa = ropaBase ? { ...ropaBase, sombrero: false, sudor: false } : null;

  const P = MORROCOY_PALETA;
  const PR = MORROCOY_PROPORCION;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {/* Line-boil (contorno que hierve) — solo se instancia si se pide. */}
      {lineBoil && <LineBoilFilter id={boil} animated={vivo} />}
    </defs>
  );

  // PROP DEL MUNDO en la pata delantera izquierda. Sin mundoId o mundo sin prop →
  // PropEnMano devuelve null (patas libres, nunca rompe la escena).
  const propMundo = mundoId ? (
    <PropEnMano mundoId={mundoId} x={-10.6} y={8.2} escala={0.7} ink={RH_INK} animated={vivo} />
  ) : null;

  // BOCA (pico): precedencia visema > sonrisa. El morrocoy asoma la testa con su
  // sonrisa serena; si narra, articula el visema. (La RETRACCIÓN esconde la
  // cabeza entera vía CSS, no pinta boca aparte.)
  const boca = visema
    ? <BocaVisema cx={0} cy={-9.4} w={2.8} prof={1.0} visema={visema} boca={RH_BOCA} />
    : <Sonrisa cx={0} cy={-9.6} w={2.6} prof={0.95} />;

  // Patas ROJIZAS robustas y cortas (paso pesado). Cada una en su grupo
  // `.morrocoy-pata` (la RETRACCIÓN las recoge; el idle las mece suave). Pivote
  // hacia el caparazón para que celebra/señala/retracción las muevan bien.
  const pata = (x, y, dir, delay, origen) => (
    <g className={`morrocoy-pata${vivo ? ' rh-sway' : ''}`}
      style={{ transformBox: 'fill-box', transformOrigin: origen, ...(vivo ? { animationDelay: `${delay}s` } : null) }}>
      {/* muslo/pata: tubo rojizo con contorno de tinta encima (la línea que manda) */}
      <path d={`M${x},${y - 3.4} Q${x + dir * 1.6},${y - 0.4} ${x + dir * 1.3},${y + 2.4}`}
        fill="none" stroke={P.pata} strokeWidth={PR.pataAncho} strokeLinecap="round" />
      <path d={`M${x},${y - 3.4} Q${x + dir * 1.6},${y - 0.4} ${x + dir * 1.3},${y + 2.4}`}
        fill="none" stroke={RH_INK} strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
      {/* planta con garras (paso pesado) */}
      <ellipse cx={x + dir * 1.3} cy={y + 2.8} rx="2.4" ry="1.5" fill={P.pata} stroke={RH_INK} strokeWidth="0.8" />
      <g stroke={RH_INK} strokeWidth="0.5" strokeLinecap="round">
        <path d={`M${x + dir * 0.1},${y + 3.7} l0,0.9`} />
        <path d={`M${x + dir * 1.3},${y + 4.0} l0,0.9`} />
        <path d={`M${x + dir * 2.5},${y + 3.7} l0,0.9`} />
      </g>
      {/* escamas naranja-fuego (la marca carbonarius) */}
      <circle cx={x + dir * 0.7} cy={y - 0.6} r="0.7" fill={P.pataEscama} opacity="0.85" />
      <circle cx={x + dir * 1.2} cy={y + 1.1} r="0.6" fill={P.pataEscama} opacity="0.7" />
    </g>
  );

  // ── CUERPO rubber-hose (atrás→adelante): aura, cola, patas traseras, caparazón
  //    de domo geométrico (escudos hexagonales + reborde marginal + shimmer
  //    ancestral), patas delanteras, cabeza (cuello + testa rojiza con escamas +
  //    ojos ámbar/cachetes/pico). `.crt-body` es el nodo que squashea (boil idle
  //    morrocoy: LENTO y firme — la sabiduría no corre).
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* RESPLANDOR ANCESTRAL (PERMANENTE, sutil): el calor de brasa apacible que
          el anciano guarda dentro del caparazón. Late lento y se aviva en modo
          poder (CSS). */}
      <circle className={vivo ? 'morrocoy-resplandor' : undefined}
        cx="0" cy="1" r={auraR + 2.4} fill={P.resplandor} opacity="0.12"
        filter={`url(#${blur})`}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }} aria-hidden="true" />
      {/* aura viva bronce */}
      <circle cx="0" cy="1.2" r={auraR} fill={P.caparazon} opacity={auraOp} filter={`url(#${blur})`} />

      {/* cola cortita (nub) al ras del reborde */}
      <path d="M0,8.6 Q1.6,10.4 0.2,11.4 Q-1.4,10.4 0,8.6 Z" fill={P.pata} stroke={RH_INK} strokeWidth="0.8" />

      {/* patas traseras (detrás del caparazón, se recogen en la retracción) */}
      {pata(-8.4, 5.0, -1, -0.9, 'right top')}
      {pata(8.4, 5.0, 1, -1.2, 'left top')}

      {/* ── CAPARAZÓN de DOMO GEOMÉTRICO (la firma) — grupo propio
          `.morrocoy-caparazon` que RESPIRA apacible (y se abomba al retraerse). */}
      <g className="morrocoy-caparazon" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        {/* domo del caparazón (más ancho que alto), contorno grueso que respira */}
        <ellipse cx="0" cy="1" rx={PR.caparazonRx} ry={PR.caparazonRy}
          fill={P.caparazon} stroke={RH_INK} strokeWidth="1.5"
          style={{ filter: `drop-shadow(0 0 6px ${P.caparazonGlow})` }} />
        {/* cara alta del domo iluminada */}
        <path d="M-9.4,-2.6 Q0,-9.0 9.4,-2.6 Q0,-5.2 -9.4,-2.6 Z" fill={P.caparazonAlto} opacity="0.55" />

        {/* ESCUDOS HEXAGONALES (el patrón geométrico canónico). Decorativos. */}
        <g aria-hidden="true">
          {ESCUDOS.map((e, i) => (
            <Escudo key={i} cx={e.cx} cy={e.cy} r={e.r} P={P} />
          ))}
        </g>

        {/* reborde de escudos MARGINALES (el filo dentado del domo) */}
        <g aria-hidden="true" fill="none" stroke={P.marginal} strokeWidth="0.7" opacity="0.7">
          <path d="M-11.0,1.8 Q-10.0,5.2 -7.4,7.6" />
          <path d="M11.0,1.8 Q10.0,5.2 7.4,7.6" />
          <path d="M-7.4,7.6 Q-3.7,9.4 0,9.2 Q3.7,9.4 7.4,7.6" strokeDasharray="0.2 2.4" strokeLinecap="round" />
        </g>

        {/* SHIMMER ANCESTRAL — destello cobrizo tibio en el reborde del caparazón
            (brasa apacible). Pulsa lento; se aviva en modo poder (CSS). */}
        <ellipse className={vivo ? 'morrocoy-shimmer' : undefined}
          cx="0" cy="1" rx={PR.caparazonRx} ry={PR.caparazonRy}
          fill="none" stroke={P.brasa} strokeWidth="0.9" opacity="0.16" aria-hidden="true" />
      </g>

      {/* patas delanteras (sobre el caparazón, más claras; se recogen al
          retraerse). La izquierda carga el prop del mundo. */}
      {pata(-7.2, 7.2, -1, -0.2, 'right top')}
      {pata(7.2, 7.2, 1, -0.5, 'left top')}

      {/* ── CABEZA (grupo propio `.morrocoy-cabeza`: la RETRACCIÓN la mete al
          caparazón y el ASENTIMIENTO la cabecea). Cuello grueso rojizo + testa
          parda con escamas naranja-fuego (la firma carbonarius). */}
      <g className="morrocoy-cabeza" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
        {/* cuello que asoma (tubo rojizo con contorno de tinta) */}
        <path d="M0,-4.6 C-0.4,-6.6 -0.4,-8.0 0,-9.0" fill="none" stroke={P.cabeza} strokeWidth={PR.cuelloAncho} strokeLinecap="round" />
        <path d="M0,-4.6 C-0.4,-6.6 -0.4,-8.0 0,-9.0" fill="none" stroke={RH_INK} strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
        {/* testa */}
        <circle cx="0" cy="-10.6" r={PR.cabezaR} fill={P.cabeza} stroke={RH_INK} strokeWidth="1.2" />
        {/* escamas ROJO-NARANJA de la testa (la marca de la especie). Decorativas. */}
        <g aria-hidden="true" fill={P.cabezaEscama}>
          <circle cx="-2.0" cy="-12.0" r="0.85" opacity="0.9" />
          <circle cx="2.1" cy="-11.6" r="0.75" opacity="0.85" />
          <circle cx="0.2" cy="-13.2" r="0.7" opacity="0.8" />
          <circle cx="-2.6" cy="-9.8" r="0.6" opacity="0.7" />
        </g>
        {/* chapetas + pico (boca) + fosas + ojos ámbar dentro de la cara */}
        <Cachetes puntos={[{ cx: -2.5, cy: -9.6, r: 0.95 }, { cx: 2.5, cy: -9.6, r: 0.95 }]} vivo={vivo} />
        {boca}
        {/* fosas nasales (el pico romo del galápago) */}
        <circle cx="-0.7" cy="-10.2" r="0.28" fill={P.nariz} />
        <circle cx="0.7" cy="-10.2" r="0.28" fill={P.nariz} />
        <OjosRubber
          ojos={[{ cx: -1.5, cy: -11.4, r: 1.25 }, { cx: 1.5, cy: -11.4, r: 1.25 }]}
          mirar={[0, 0.08]}
          parpadea={vivo}
        />
        {/* MIRADA SERENA ÁMBAR: anillo tenue que enmarca cada ojo (la calma del
            anciano). */}
        <g aria-hidden="true" fill="none" stroke={P.ojoAnillo} strokeWidth="0.4" opacity="0.8">
          <circle cx="-1.5" cy="-11.4" r="1.0" />
          <circle cx="1.5" cy="-11.4" r="1.0" />
        </g>
      </g>

      {/* Vestuario por clima+hora (RUANA de noche/frío) — solo con vestuario=true.
          Sombrero/sudor van suprimidos (el morrocoy de tierra cálida no suda). */}
      {ropa && (
        <AccesoriosClima
          estado={ropa}
          tronco={{ cx: 0, cy: 1, rx: PR.caparazonRx, ry: PR.caparazonRy }}
          cabeza={{ cx: 0, cy: -10.6, r: PR.cabezaR }}
          animated={vivo}
        />
      )}

      {/* Prop del mundo en la pata (entra sereno con su herramienta). */}
      {propMundo}
    </g>
  );

  // Antics de VIDA (períodos co-primos) SOLO viva; nodos aparte para no pisar el
  // boil de `.crt-body`. El CSS los apaga con RM / tier bajo / ánimo bajo /
  // durante los gestos (celebra/reposo/señala) y estados (seRetrae/asiente).
  const conAntics = vivo ? (
    <g className="rh-antic">
      <g className="rh-travieso">{body}</g>
    </g>
  ) : body;
  // El line-boil (contorno que hierve) envuelve TODO el dibujo cuando se pide.
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{conAntics}</g> : conAntics;

  const estadoAttrs = {
    'data-creature': MORROCOY_SLUG,
    'data-pose': vivo ? poseFx : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-visema': visema || undefined,
    'data-ruana': ropa?.ruana ? '1' : undefined,
    'data-mojado': ropa?.mojado ? '1' : undefined,
    'data-retrae': seRetraeFx ? '1' : undefined,
    'data-asiente': asienteFx ? '1' : undefined,
    'data-vida': momento || undefined,
    'data-lineboil': lineBoil ? '1' : undefined,
    'data-prop': mundoId || undefined,
  };

  // El ritmo propio (parpadeo/dardeo por instancia) viaja como vars CSS.
  const estiloRaiz = { ...ritmoPropio, ...estiloClima };

  if (inline) {
    // En modo inline el power-up lo pone el host DOM (::before/mix-blend no
    // aplican a SVG); acá solo marcamos data-poder por si el host lo consulta.
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
  // MODO PODER (standalone): lo envolvemos en su aura BRONCE/COBRE de 4 capas
  // (transformacion.css: glow radial + boost + ingravidez + corrientes) — su
  // firma cuando "sube de nivel". El wrapper DOM es lo único que puede llevar
  // ::before/mix-blend/corrientes.
  if (poder) {
    return (
      <span
        className="is-powered-up morrocoy-poder"
        data-creature-poder={MORROCOY_SLUG}
        style={{ '--aura-color': auraDeBicho(MORROCOY_SLUG), display: 'inline-flex' }}
      >
        {svg}
        <AuraPoder />
      </span>
    );
  }
  return svg;
}

export default Morrocoy;
