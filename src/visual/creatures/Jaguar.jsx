import { useId, useRef } from 'react';
import './creatures.css';
import { useVidaIdle, useRitmoPropio, useMiradaUsted } from './useVidaIdle.js';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, BocaVisema, Miembro, RH_INK, RH_BOCA } from './_rubberhose.jsx';
import { JAGUAR_PALETA, JAGUAR_PROPORCION, JAGUAR_SLUG, PERFIL_JAGUAR } from './jaguarIdentidad.js';
import { cuerpoDeClima, ropaDeClimaBicho } from './creatureClimaCuerpo.js';
import { AccesoriosClima } from './AccesoriosClima.jsx';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { PropEnMano } from './PropEnMano.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';

/* Jaguar — Panthera onca (el felino de tierra cálida/selva). Hermano rubber-hose
   de la abeja Angelita y el oso andino: compone el MISMO kit `_rubberhose.jsx`
   (ojos de goma, cachetes, sonrisa, miembros manguera) y hereda la MISMA
   fundación transversal — lip-sync (useLipSync → BocaVisema), modo poder
   (transformacion, aura PÚRPURA), ropa por clima (ropaDeClima), prop por mundo
   (PropEnMano) y line-boil (LineBoilFilter) — cero código duplicado. Solo cambia
   el ANIMAL y su CARÁCTER: felino MUSCULOSO leonado con ROSETAS (manchas de
   centro ocre, su firma), majestuoso y ACECHADOR. Su seña de vida es el ACECHO
   DE HOMBROS (los omóplatos suben al moverse), la COLA que ondea con PESO y la
   mirada felina ÁMBAR intensa; su squash&stretch es controlado y elegante, no
   hiperactivo (poder contenido). Es de SUELO: acecha, no vuela — sin alas. Su
   estado-firma es el RUGIDO corporal (`ruge`) y el modo ACECHO (`acecha`). Su
   color de poder es el PÚRPURA depredador (no el dorado de la abeja ni el rojo
   del oso). La IDENTIDAD (paleta + proporciones + perfil de clima) vive en
   `jaguarIdentidad.js`; el CLIMA→cuerpo, en `creatureClimaCuerpo.js` con
   PERFIL_JAGUAR (pelaje lustroso que escurre agua, robusto ante la seca) — y de
   tierra cálida: NUNCA suda (aguanta el calor sin sudar ni sombrero).

   MÍSTICO (cosmología andino-amazónica: el jaguar es el ANIMAL-ESPÍRITU DEL
   CHAMÁN — transformación, mundo espiritual, visión nocturna, poder sagrado).
   Tejido con gusto, permanente y sutil: OJOS LUMINOSOS que respiran
   (fosforescencia, visión nocturna del espíritu), un AURA ESPECTRAL etérea que
   lo envuelve (no solo en poder), CONSTELACIONES de geometría sagrada sobre las
   rosetas (estrellas que titilan, patrón andino), un SHIMMER espectral en el
   contorno, BRUMA etérea a los pies y MOTAS de luz que flotan lento (polvo del
   espíritu). En modo poder el aura, los ojos y las estrellas se vuelven
   CHAMÁNICOS, y con `revelacion` (opt-in, su entrada cinematográfica) el
   espíritu SE MANIFIESTA: las marcas gemelas brillan sobre las rosetas, la
   bruma se adensa y el felino levita apenas (ingravidez). Todo se PODA en tier
   bajo / reduced-motion (queda un fotograma digno y quieto).

   VOLUMEN Y PESO (que parezca de verdad): el pelaje lleva GRADIENTE radial (luz
   dorsal → sombra ventral), las rosetas son ANILLOS ROTOS reales de Panthera
   onca (arcos con cortes, giro propio por mancha, motas internas en las
   grandes), hay definición muscular sutil en ancas y pecho, VIBRISAS y motas
   oscuras en el hocico, y una SOMBRA DE SUELO blanda bajo las zarpas — un
   animal con masa, no un sticker.

   CARÁCTER (el registro de casa, tipo reloj-carismático de los años 30):
   CARISMÁTICO y encantador en reposo — ojos grandes ámbar con catchlight,
   sonrisa de goma, cachetes — PERO capaz de volverse SERIO e IMPONENTE
   (acecho, rugido, revelación). Esa DUALIDAD es su corazón: guardián sagrado
   que cae bien y a la vez impone respeto. Nunca gore, nunca ojos vacíos. */
const VIEWBOX = '-16 -20 32 40';

/* Anillo ROTO de la roseta: la roseta real de Panthera onca no es un aro
   cerrado sino ARCOS con cortes (manchas periféricas que casi cierran). El
   dasharray reparte 3 arcos + 3 cortes sobre el perímetro aproximado. */
function anilloRoto(r) {
  const c = Math.PI * r * 1.88; // perímetro aprox de la elipse (rx=r, ry=0.88r)
  return `${c * 0.3} ${c * 0.08} ${c * 0.26} ${c * 0.1} ${c * 0.18} ${c * 0.08}`;
}

/* Roseta del jaguar: ANILLO ROTO oscuro con centro ocre (la firma de la
   especie — mancha CON centro, no el puntito del leopardo). Cada roseta gira
   distinto (`rot`) para que los cortes del anillo no se repitan, y las GRANDES
   del lomo llevan una mota interna extra (`motas`), como en el animal real.
   Decorativa (aria-hidden en el grupo padre). */
function Roseta({ cx, cy, r = 1.5, ink, centro, opacity = 0.9, rot = 0, motas = 1 }) {
  return (
    <g opacity={opacity} transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined}>
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.88} fill="none" stroke={ink}
        strokeWidth={r * 0.46} strokeDasharray={anilloRoto(r)} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r * 0.3} fill={centro} />
      {motas > 1 && <circle cx={cx + r * 0.38} cy={cy - r * 0.32} r={r * 0.16} fill={ink} />}
    </g>
  );
}

/* Estrella de constelación — el titileo "de geometría sagrada" sobre las
   rosetas (el jaguar-espíritu lleva el cielo nocturno en la piel). Sparkle de 4
   puntas; titila (.jaguar-estrella) solo viva — con animated=false / RM queda
   quieta y digna. */
function Estrella({ cx, cy, r = 0.9, color, delay = 0, vivo = false }) {
  const p = r * 0.26;
  return (
    <g
      className={vivo ? 'jaguar-estrella' : undefined}
      style={{ transformBox: 'fill-box', transformOrigin: 'center', ...(vivo ? { animationDelay: `${delay}s` } : null) }}
    >
      <path
        d={`M${cx},${cy - r} L${cx + p},${cy - p} L${cx + r},${cy} L${cx + p},${cy + p} L${cx},${cy + r} L${cx - p},${cy + p} L${cx - r},${cy} L${cx - p},${cy - p} Z`}
        fill={color}
      />
    </g>
  );
}

/* ROSETAS del cuerpo y la cara, como DATOS (una sola fuente): las dibuja la
   capa de tinta y las REUSA la capa de marcas-espíritu (las gemelas
   espectrales que se encienden en la revelación). rot varía el corte del
   anillo; las dos grandes del lomo llevan mota interna (motas: 2). */
const ROSETAS_CUERPO = [
  { cx: -5.4, cy: 2.6, r: 1.5, rot: 15, motas: 2 },
  { cx: -2.0, cy: 5.0, r: 1.35, rot: 130 },
  { cx: 5.6, cy: 1.4, r: 1.5, rot: 250, motas: 2 },
  { cx: 6.6, cy: 4.6, r: 1.15, rot: 40, o: 0.8 },
  { cx: 2.4, cy: -0.6, r: 1.2, rot: 205, o: 0.85 },
  { cx: -6.6, cy: -0.8, r: 1.2, rot: 320, o: 0.8 },
];
const ROSETAS_CARA = [
  { cx: -3.4, cy: -10.6, r: 0.95, rot: 25, o: 0.8 },
  { cx: 3.4, cy: -10.6, r: 0.95, rot: 200, o: 0.8 },
  { cx: -4.8, cy: -7.6, r: 0.85, rot: 95, o: 0.7 },
  { cx: 4.8, cy: -7.6, r: 0.85, rot: 300, o: 0.7 },
];

/* Vértices de la constelación: coinciden con centros de rosetas para que el
   "cielo" viva SOBRE las manchas. Partida en dos: el LOMO (grandes + menores,
   la telaraña sagrada) va en el tronco; la FRENTE va DENTRO del grupo de la
   cabeza (si no, el círculo de la cabeza — que se pinta después — la tapa) y
   así además acompaña el acecho cuando la testa baja. */
const ESTRELLAS_LOMO = [
  { cx: -5.4, cy: 2.6, r: 0.95, d: -1.1 },
  { cx: 2.4, cy: -0.6, r: 0.8, d: -0.7 },
  { cx: 5.6, cy: 1.4, r: 0.95, d: -1.5 },
  { cx: -6.6, cy: -0.8, r: 0.55, d: -0.3 },
  { cx: -2.0, cy: 5.0, r: 0.5, d: -1.9 },
  { cx: 6.6, cy: 4.6, r: 0.55, d: -2.2 },
];
const ESTRELLAS_FRENTE = [
  { cx: -3.4, cy: -10.6, r: 0.85, d: 0 },
  { cx: 3.4, cy: -10.6, r: 0.85, d: -0.5 },
];

/* MOTAS de luz (polvo del espíritu): flotan lento alrededor del felino, cada
   una con su delay/duración propios (nunca en compás — vida, no metrónomo). */
const MOTAS = [
  { cx: -10.6, cy: 3.2, r: 0.5, d: 0, s: 6.4 },
  { cx: 11.2, cy: -1.6, r: 0.42, d: -2.1, s: 7.2 },
  { cx: -8.2, cy: -6.8, r: 0.38, d: -3.4, s: 5.8 },
  { cx: 9.0, cy: 6.4, r: 0.55, d: -1.2, s: 6.9 },
  { cx: -12.0, cy: -2.4, r: 0.34, d: -4.6, s: 7.6 },
  { cx: 6.4, cy: -10.2, r: 0.4, d: -5.2, s: 6.1 },
];

export function Jaguar({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Jaguar',
  /* Pose de VIDA (idle-life), species-agnostic (gestos rh-g-* de creatures.css):
     'anda' (base, con acecho de hombros) | 'celebra' (brinca con brazos en V +
     overshoot) | 'reposo' (respira hondo, agazapado) | 'señala' (se inclina al
     POI y apunta con la zarpa). Solo corren viva (animated); con animated=false
     o reduced-motion queda en fotograma digno e imponente. */
  pose = 'anda',
  animo = 'sereno',
  energia = 1,
  /* CLIMA REAL escrito en el cuerpo (perfil jaguar). Sin clima (avatares,
     catálogo) = neutro digno: el jaguar se ve EXACTO como siempre. */
  clima = null,
  enso = 'neutro',
  /* ── LIP-SYNC (sistema transversal, useLipSync) ────────────────────────────
     visema opcional ('V1'..'V4') que produce useLipSync desde el RMS del TTS: la
     boca se abre cuando el agente narra. Sin visema (o 'V1') = la sonrisa de
     goma de siempre → avatares/catálogo no cambian. El HOOK vive aparte (no
     cuelga un AnalyserNode por instancia); acá solo se consume. El RUGIDO manda
     sobre el visema (una fiera que ruge no articula fonemas). */
  visema = null,
  /* ── VESTUARIO por clima+hora (ropaDeClima) ───────────────────────────────
     OPT-IN: con vestuario=true el jaguar se abriga según el clima real (RUANA de
     noche/frío — es de tierra cálida y siente el frío pronto). Es de tierra
     cálida: NUNCA se sobrecalienta → jamás suda ni sombrero (se suprimen aquí
     aunque el termómetro suba). Default false → los consumidores de `clima`
     existentes NO ven ropa nueva. */
  vestuario = false,
  tempC = undefined,
  /* ── RUGE (rugido corporal — la fiera ruge) ────────────────────────────────
     OPT-IN: el jaguar abre las fauces (colmillos + garganta) y el pecho hincha y
     SUELTA con peso (el rugido leído en el cuerpo). Su reacción-firma imponente.
     Default false → sin rugido (avatar sereno). */
  ruge = false,
  /* ── ACECHA (modo acecho — el depredador se agazapa) ───────────────────────
     OPT-IN: los omóplatos SUBEN, la cabeza BAJA y el cuerpo avanza lento y
     controlado (el acecho felino). Su otra reacción-firma. Default false. */
  acecha = false,
  /* ── VIDA PROPIA (idle-cerebro v2 — la vara de Angelita) ───────────────────
     Default ON: un reloj con jitter hojea el repertorio de la especie
     (vidaEstados.js) — el bicho EXISTE aunque nadie le hable. Cada instancia
     parpadea a SU aire (ritmo propio) y sus pupilas SIGUEN su puntero/dedo
     cuando anda cerca. El cerebro CEDE ante el host (cualquier gesto manual
     lo apaga); animated=false, tier 'bajo' y reduced-motion lo apagan entero.
     vida={false} = el bicho de antes, idéntico. */
  vida = true,
  /* Device-tier (DR-3D-PERF-GAMABAJA): 'alto'|'medio' corren el rubber-hose
     pleno; 'bajo' apaga el idle continuo (boil + acecho de hombros + cola) y
     deja los estados reactivos. Sin prop (standalone: avatares, catálogo) = pleno. */
  tier,
  /* ── LÍNEA QUE RESPIRA (line-boil, Cuphead años 30 — LineBoilFilter) ────────
     OPT-IN: con lineBoil el CONTORNO del jaguar vibra escalonado (feTurbulence +
     feDisplacement, ~8fps) — el trazo "hierve" como dibujo animado clásico.
     Default false → los consumidores existentes NO cambian. Con animated=false
     o reduced-motion queda con seed fija (textura sin vibrar). Capa MÁS cara del
     kit: reservada para su entrada heroica (galería, hero). */
  lineBoil = false,
  /* ── MODO PODER (transformación / power-up PÚRPURA — transformacion.css) ─────
     OPT-IN: con poder=true (y en modo standalone) el jaguar se envuelve en su
     aura PÚRPURA depredadora de 4 capas (glow, boost, ingravidez, corrientes) —
     su firma cuando "sube de nivel". El host lo enciende un rato con
     usePoderTemporal(). En modo inline el power-up lo pone el host DOM
     (::before/mix-blend no aplican a nodos SVG); acá solo marcamos data-poder por
     si el host lo consulta. */
  poder = false,
  /* ── REVELACIÓN DEL ESPÍRITU (estado héroe — su entrada cinematográfica) ────
     OPT-IN: con revelacion=true el jaguar-espíritu SE MANIFIESTA — las
     marcas-espíritu (rosetas gemelas espectrales) se encienden y laten, la
     bruma etérea se adensa, el felino LEVITA apenas (ingravidez contenida), la
     sombra del suelo cede (el peso se vuelve espíritu) y aura/ojos/estrellas
     suben a su registro chamánico. MAJESTAD, no susto: todo lento y digno.
     Default false → los consumidores actuales NO cambian. Se poda en tier
     bajo / reduced-motion (quedan las marcas encendidas, quietas). */
  revelacion = false,
  /* ── PROP POR MUNDO (herramienta en la zarpa — propsPorMundo/PropEnMano) ─────
     mundoId opcional: al ENTRAR a un mundo el jaguar carga su herramienta
     (agua→manguerita, suelo→lupa, animales→lazo, semillero→canasto…). Sin
     mundoId (o mundo sin prop) entra con las zarpas libres. Va en su zarpa
     IZQUIERDA (la cola cae al lado DERECHO: prop y cola no se pisan). */
  mundoId = null,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const pelaje = `crt-pelaje-${uid}`;
  const vivo = animated;
  const auraOp = Math.max(0.14, Math.min(0.42, 0.18 + 0.26 * (energia ?? 1)));
  const auraR = 8.5 + 1.6 * (energia ?? 1);

  // ═══ VIDA PROPIA (idle-cerebro + ritmo propio + mirada — vara Angelita v2).
  // El cerebro solo manda cuando el host no dirige (pose base, sin gestos
  // manuales ni lip-sync); sus momentos se funden con los props opt-in para
  // reusar TODO el CSS existente de los gestos-firma.
  const raizRef = useRef(null);
  const ritmoPropio = useRitmoPropio();
  const enBase = pose === 'anda' && !ruge && !acecha && !visema && !revelacion;
  const momento = useVidaIdle('jaguar', vida && vivo && tier !== 'bajo' && enBase);
  useMiradaUsted(raizRef, vida && vivo && tier !== 'bajo');
  const rugeFx = ruge || momento === 'ruge';
  const acechaFx = acecha || momento === 'acecha';
  const poseFx = momento === 'reposo' ? 'reposo' : pose;

  // CLIMA → cuerpo (determinista, una vez por render): tinte + opacidad al
  // contorno. El jaguar no tiene alas (velocidadAlas siempre 1: no se usa).
  const cuerpoClima = cuerpoDeClima(clima, { enso: /** @type {any} */ (enso), tier, perfil: PERFIL_JAGUAR });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  // Vestuario por clima+hora (opt-in). Perfil jaguar de TIERRA CÁLIDA: la RUANA
  // de noche/frío; NUNCA sombrero ni sudor (aunque suba el termómetro) — el
  // jaguar no se sobrecalienta. Los suprimimos aquí sin tocar la función
  // compartida (su contrato/tests siguen intactos). Sin vestuario/clima → nada.
  const ropaBase = (vestuario && clima) ? ropaDeClimaBicho(JAGUAR_SLUG, clima, { tempC }) : null;
  const ropa = ropaBase ? { ...ropaBase, sombrero: false, sudor: false } : null;

  const P = JAGUAR_PALETA;
  const PR = JAGUAR_PROPORCION;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {/* PELAJE CON VOLUMEN — gradiente radial del pelaje (luz dorsal arriba a
          la izquierda → leonado medio → sombra ventral en el borde): el mismo
          def viste tronco y cabeza (objectBoundingBox: cada uno recibe su luz). */}
      <radialGradient id={pelaje} cx="42%" cy="30%" r="82%">
        <stop offset="0%" stopColor={P.cuerpoLuz} />
        <stop offset="55%" stopColor={P.cuerpo} />
        <stop offset="100%" stopColor={P.cuerpoSombra} />
      </radialGradient>
      {/* Line-boil (contorno que hierve) — solo se instancia si se pide. */}
      {lineBoil && <LineBoilFilter id={boil} animated={vivo} />}
    </defs>
  );

  // PROP DEL MUNDO en la zarpa izquierda (el lado libre; la cola cae a la
  // derecha). Sin mundoId o mundo sin prop → PropEnMano devuelve null (zarpas
  // libres, nunca rompe la escena).
  const propMundo = mundoId ? (
    <PropEnMano mundoId={mundoId} x={-11.2} y={7.6} escala={0.72} ink={RH_INK} animated={vivo} />
  ) : null;

  // BOCA: precedencia RUGIDO > visema > sonrisa. La fiera que ruge abre las
  // fauces con colmillos + garganta (no articula fonemas); si narra sin rugir,
  // el visema; en reposo, la sonrisa de goma de siempre.
  const boca = rugeFx ? (
    <g className="jaguar-rugido-boca" aria-hidden="true">
      <ellipse cx="0" cy="-2.9" rx="2.5" ry="2.1" fill={RH_BOCA} stroke={RH_INK} strokeWidth="0.9" />
      {/* colmillos superiores (el rugido) */}
      <path className="jaguar-colmillo" d="M-1.5,-4.4 L-0.7,-4.4 L-1.1,-2.5 Z" fill={P.colmillo} stroke={RH_INK} strokeWidth="0.3" />
      <path className="jaguar-colmillo" d="M1.5,-4.4 L0.7,-4.4 L1.1,-2.5 Z" fill={P.colmillo} stroke={RH_INK} strokeWidth="0.3" />
      {/* lengua */}
      <path d="M-1.1,-2.0 Q0,-0.7 1.1,-2.0 Z" fill="#d1615a" />
    </g>
  ) : visema
    ? <BocaVisema cx={0} cy={-3.4} w={3.4} prof={1.3} visema={visema} />
    : <Sonrisa cx={0} cy={-3.6} w={3.2} prof={1.2} />;

  // ── CUERPO rubber-hose (atrás→adelante): aura, cola pesada, orejas, patas,
  //    tronco leonado con vientre crema, rosetas, omóplatos del acecho, bracitos
  //    manguera, cabeza (hocico + cejas fieras + ojos ámbar/cachetes/boca +
  //    trufa). `.crt-body` es el nodo que squashea (boil idle jaguar: lento,
  //    controlado y elegante — poder contenido).
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* SOMBRA DE SUELO — la mancha blanda bajo las zarpas que le da PESO al
          felino (un animal con masa, no un sticker). Estática (no anima); en
          la revelación CEDE por CSS (el peso se vuelve espíritu). */}
      <ellipse className="jaguar-sombra-suelo" cx="0" cy="13.2" rx="8.2" ry="1.5"
        fill={P.sombraSuelo} filter={`url(#${blur})`} aria-hidden="true" />
      {/* AURA ESPECTRAL etérea (PERMANENTE, sutil): la presencia sagrada del
          jaguar-espíritu del chamán envuelve al felino aun en reposo. Late lento
          y se vuelve CHAMÁNICA en modo poder (CSS). */}
      <circle className={vivo ? 'jaguar-aura-espectral' : undefined}
        cx="0" cy="1.4" r={auraR + 2.6} fill={P.espectral} opacity="0.13"
        filter={`url(#${blur})`}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }} aria-hidden="true" />
      {/* aura viva */}
      <circle cx="0" cy="2" r={auraR} fill={P.cuerpo} opacity={auraOp} filter={`url(#${blur})`} />

      {/* COLA LARGA que ondea con PESO (la firma del acecho, al lado derecho para
          no pisar el prop de la zarpa izquierda). Pivota desde su base en el
          lomo. Rosetas + punta oscura. */}
      <g className={vivo ? 'jaguar-cola' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'left bottom' }}>
        <path d="M8.4,5.4 C13.2,4.4 15.4,0.2 13.8,-4.4 C13.0,-6.6 11.2,-7.2 9.6,-6.4"
          fill="none" stroke={P.cuerpo} strokeWidth="3.0" strokeLinecap="round" />
        {/* contorno de tinta encima (la línea que manda del rubber-hose) */}
        <path d="M8.4,5.4 C13.2,4.4 15.4,0.2 13.8,-4.4 C13.0,-6.6 11.2,-7.2 9.6,-6.4"
          fill="none" stroke={RH_INK} strokeWidth="0.7" strokeLinecap="round" opacity="0.55" />
        {/* punta oscura + rosetas de la cola */}
        <circle cx="9.9" cy="-6.2" r="1.5" fill={P.roseta} />
        <Roseta cx={13.7} cy={-1.0} r={1.15} rot={70} ink={P.roseta} centro={P.rosetaCentro} opacity={0.85} />
        <Roseta cx={11.4} cy={3.6} r={1.1} rot={230} ink={P.roseta} centro={P.rosetaCentro} opacity={0.85} />
      </g>

      {/* orejas redondas de felino (detrás de la cabeza, se mecen con
          follow-through) */}
      <g className={vivo ? 'rh-sway' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animationDelay: '-0.2s' }}>
        <circle cx="-4.4" cy="-13.4" r={PR.orejaR} fill={P.cuerpoLuz} stroke={RH_INK} strokeWidth="1.2" />
        <circle cx="-4.4" cy="-13.4" r={PR.orejaR * 0.5} fill={P.oreja} />
      </g>
      <g className={vivo ? 'rh-sway' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animationDelay: '-0.5s' }}>
        <circle cx="4.4" cy="-13.4" r={PR.orejaR} fill={P.cuerpoLuz} stroke={RH_INK} strokeWidth="1.2" />
        <circle cx="4.4" cy="-13.4" r={PR.orejaR * 0.5} fill={P.oreja} />
      </g>

      {/* patas traseras (muslos musculosos con planta crema, detrás del tronco).
          Se mecen suave. */}
      <Miembro d="M-6.6,7.0 C-8.6,9.0 -8.8,10.8 -7.4,12.0" ancho={3.4} punta={[-7.4, 12.2]} puntaR={2.0} pie sway={vivo} delay={-0.7} />
      <Miembro d="M6.6,7.0 C8.6,9.0 8.8,10.8 7.4,12.0" ancho={3.4} punta={[7.4, 12.2]} puntaR={2.0} pie sway={vivo} delay={-1.0} />

      {/* tronco leonado musculoso con contorno grueso (la línea que respira con
          el boil). El fill es el GRADIENTE de pelaje: luz dorsal → sombra
          ventral (volumen real, no color plano). */}
      <ellipse cx="0" cy="2" rx={PR.troncoRx} ry={PR.troncoRy}
        fill={`url(#${pelaje})`} stroke={RH_INK} strokeWidth="1.4"
        style={{ filter: `drop-shadow(0 0 6px ${P.cuerpoGlow})` }} />
      {/* SHIMMER MÍSTICO — destello espectral sutil en el contorno (se apoya en
          el glow del cuerpo; el line-boil lo remata en su entrada heroica).
          Pulsa lento; se intensifica en modo poder (CSS). */}
      <ellipse className={vivo ? 'jaguar-shimmer' : undefined}
        cx="0" cy="2" rx={PR.troncoRx} ry={PR.troncoRy}
        fill="none" stroke={P.espectral} strokeWidth="0.8" opacity="0.16" aria-hidden="true" />
      {/* vientre/pecho crema */}
      <path d="M0,-4.2 C4.2,-3.2 5.4,2 4.0,6.2 C2.4,9.0 -2.4,9.0 -4.0,6.2 C-5.4,2 -4.2,-3.2 0,-4.2 Z"
        fill={P.vientre} opacity="0.9" />
      {/* mechones del pecho (el zigzag de pelo crema donde el vientre nace) */}
      <path d="M-1.8,-3.95 L-1.2,-3.3 L-0.6,-4.0 L0,-3.3 L0.6,-4.0 L1.2,-3.3 L1.8,-3.95"
        fill="none" stroke={P.vientre} strokeWidth="0.5" strokeLinecap="round" opacity="0.9" aria-hidden="true" />

      {/* DEFINICIÓN MUSCULAR sutil (que se sienta la masa del felino): dos
          trazos de anca sobre los muslos y el surco del pectoral. Tinta a baja
          opacidad — sugiere, no delinea. */}
      <g aria-hidden="true" fill="none" stroke={RH_INK} strokeWidth="0.55" opacity="0.22" strokeLinecap="round">
        <path d="M-8.6,3.2 C-8.0,5.6 -6.6,7.2 -4.8,7.9" />
        <path d="M8.6,3.2 C8.0,5.6 6.6,7.2 4.8,7.9" />
        <path d="M-1.6,-3.2 C-0.5,-2.5 0.5,-2.5 1.6,-3.2" />
      </g>

      {/* ROSETAS del cuerpo (anillos ROTOS de centro ocre — la firma). Una
          sola fuente de datos (ROSETAS_CUERPO) que también visten las
          marcas-espíritu. Decorativas. */}
      <g aria-hidden="true">
        {ROSETAS_CUERPO.map((m, i) => (
          <Roseta key={i} cx={m.cx} cy={m.cy} r={m.r} rot={m.rot} motas={m.motas}
            ink={P.roseta} centro={P.rosetaCentro} opacity={m.o ?? 0.9} />
        ))}
      </g>
      {/* MARCAS-ESPÍRITU del lomo — las rosetas gemelas espectrales: invisibles
          en reposo (opacity 0 por CSS), se ENCIENDEN y laten cuando el espíritu
          se revela (revelación / modo poder). */}
      <g className="jaguar-marcas-espiritu" aria-hidden="true" fill="none"
        stroke={P.marcaEspiritu} strokeLinecap="round">
        {ROSETAS_CUERPO.map((m, i) => (
          <ellipse key={i} cx={m.cx} cy={m.cy} rx={m.r} ry={m.r * 0.88}
            strokeWidth={m.r * 0.5} strokeDasharray={anilloRoto(m.r)}
            transform={`rotate(${m.rot} ${m.cx} ${m.cy})`} />
        ))}
      </g>

      {/* CONSTELACIÓN del lomo — geometría sagrada sobre las rosetas: la
          telaraña de líneas etéreas punteadas (el patrón andino) RESPIRA
          (pulso co-primo con el titilar) y las estrellas TITILAN en los
          centros de mancha — grandes en los vértices mayores, menores en los
          secundarios. El cielo nocturno del jaguar-espíritu. Decorativa. */}
      <g className="jaguar-constelacion" aria-hidden="true">
        <path className={vivo ? 'jaguar-constelacion-linea' : undefined}
          d="M-6.6,-0.8 L-5.4,2.6 L-2.0,5.0 M-5.4,2.6 L2.4,-0.6 L5.6,1.4 L6.6,4.6"
          fill="none" stroke={P.espectral}
          strokeWidth="0.3" strokeLinecap="round" strokeDasharray="0.5 1.1" opacity="0.28" />
        {ESTRELLAS_LOMO.map((e, i) => (
          <Estrella key={i} cx={e.cx} cy={e.cy} r={e.r} delay={e.d} color={P.estrella} vivo={vivo} />
        ))}
      </g>

      {/* OMÓPLATOS del ACECHO (la firma del jaguar): dos picos musculosos sobre el
          lomo que SUBEN al moverse (más en modo acecho). Grupo propio
          (.jaguar-hombros) que la CSS anima. Van sobre el tronco, detrás de la
          cabeza y los bracitos. */}
      <g className="jaguar-hombros" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
        <path d="M-6.4,-1.4 Q-4.4,-6.2 -1.8,-2.6 Z" fill={P.hombro} stroke={RH_INK} strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M6.4,-1.4 Q4.4,-6.2 1.8,-2.6 Z" fill={P.hombro} stroke={RH_INK} strokeWidth="1.1" strokeLinejoin="round" />
      </g>

      {/* bracitos manguera (zarpas delanteras) con planta crema, pivote en el
          HOMBRO para que celebra/señala los alcen desde el hombro. */}
      <Miembro clase="crt-brazo-l" origen="right top"
        d="M-7.0,-1.2 C-10.0,0.4 -11.0,3.4 -10.0,6.2" ancho={3.2} punta={[-10.0, 6.6]} puntaR={2.1} pie sway={vivo} delay={-0.15} />
      <Miembro clase="crt-brazo-r" origen="left top"
        d="M7.0,-1.2 C10.0,0.4 11.0,3.4 10.0,6.2" ancho={3.2} punta={[10.0, 6.6]} puntaR={2.1} pie sway={vivo} delay={-0.45} />

      {/* CABEZA (grupo propio .jaguar-cabeza para que el ACECHO la baje). */}
      <g className="jaguar-cabeza" style={{ transformBox: 'fill-box', transformOrigin: 'center top' }}>
        <circle cx="0" cy="-8.2" r={PR.cabezaR} fill={`url(#${pelaje})`} stroke={RH_INK} strokeWidth="1.3" />
        {/* hocico claro que baja al morro */}
        <path d="M-2.6,-6.6 C-1.2,-5.2 1.2,-5.2 2.6,-6.6 C2.8,-3.6 1.8,-2.0 0,-1.8 C-1.8,-2.0 -2.8,-3.6 -2.6,-6.6 Z"
          fill={P.hocico} opacity="0.95" />
        {/* rosetas de la frente/mejillas (anillos rotos — la firma también en
            la cara), desde la misma fuente de datos que sus marcas-espíritu */}
        <g aria-hidden="true">
          {ROSETAS_CARA.map((m, i) => (
            <Roseta key={i} cx={m.cx} cy={m.cy} r={m.r} rot={m.rot}
              ink={P.roseta} centro={P.rosetaCentro} opacity={m.o} />
          ))}
        </g>
        {/* marcas-espíritu de la cara (gemelas espectrales, ver las del lomo) */}
        <g className="jaguar-marcas-espiritu" aria-hidden="true" fill="none"
          stroke={P.marcaEspiritu} strokeLinecap="round">
          {ROSETAS_CARA.map((m, i) => (
            <ellipse key={i} cx={m.cx} cy={m.cy} rx={m.r} ry={m.r * 0.88}
              strokeWidth={m.r * 0.5} strokeDasharray={anilloRoto(m.r)}
              transform={`rotate(${m.rot} ${m.cx} ${m.cy})`} />
          ))}
        </g>
        {/* CONSTELACIÓN de la frente — vive DENTRO de la cabeza (dibujada tras
            el círculo, si no quedaba oculta) y baja con la testa en el acecho. */}
        <g className="jaguar-constelacion" aria-hidden="true">
          <path className={vivo ? 'jaguar-constelacion-linea' : undefined}
            d="M-3.4,-10.6 L3.4,-10.6" fill="none" stroke={P.espectral}
            strokeWidth="0.3" strokeLinecap="round" strokeDasharray="0.5 1.1" opacity="0.28" />
          {ESTRELLAS_FRENTE.map((e, i) => (
            <Estrella key={i} cx={e.cx} cy={e.cy} r={e.r} delay={e.d} color={P.estrella} vivo={vivo} />
          ))}
        </g>
        {/* CEJAS FIERAS del depredador (mirada intensa y focalizada): trazos
            angulados con el extremo INTERNO más bajo. Identidad (no opt-in); se
            fruncen más al rugir/acechar (CSS). En su grupo .jaguar-cejas. */}
        <g className="jaguar-cejas" stroke={RH_INK} strokeWidth="1.25" strokeLinecap="round" fill="none">
          <path d="M-5.2,-11.9 L-1.7,-10.8" />
          <path d="M5.2,-11.9 L1.7,-10.8" />
        </g>
        {/* chapetas + boca + trufa + ojos ámbar dentro de la cara */}
        <Cachetes puntos={[{ cx: -4.4, cy: -6.4, r: 1.2 }, { cx: 4.4, cy: -6.4, r: 1.2 }]} vivo={vivo} />
        {boca}
        {/* VIBRISAS — los bigotes del felino (crema claro, finísimos) nacen de
            motas oscuras en el hocico, como en el jaguar real. Realismo felino
            sin perder la goma. */}
        <g aria-hidden="true" fill={P.roseta} opacity="0.45">
          <circle cx="-1.9" cy="-5.1" r="0.2" /><circle cx="-1.4" cy="-4.6" r="0.18" /><circle cx="-2.3" cy="-4.5" r="0.16" />
          <circle cx="1.9" cy="-5.1" r="0.2" /><circle cx="1.4" cy="-4.6" r="0.18" /><circle cx="2.3" cy="-4.5" r="0.16" />
        </g>
        <g aria-hidden="true" fill="none" stroke={P.vibrisa} strokeWidth="0.32" strokeLinecap="round" opacity="0.55">
          <path d="M-2.6,-5.0 C-4.4,-4.8 -5.8,-5.0 -7.0,-5.6" />
          <path d="M-2.6,-4.4 C-4.3,-4.0 -5.6,-3.9 -6.8,-4.2" />
          <path d="M2.6,-5.0 C4.4,-4.8 5.8,-5.0 7.0,-5.6" />
          <path d="M2.6,-4.4 C4.3,-4.0 5.6,-3.9 6.8,-4.2" />
        </g>
        {/* trufa (nariz) */}
        <path d="M-1.3,-4.7 L1.3,-4.7 L0,-3.5 Z" fill={P.nariz} />
        {/* OJOS grandes, ámbar y EXPRESIVOS (el registro de casa: carisma con
            alma — catchlight del kit + parpadeo + micro-mirada). Nunca vacíos:
            la nobleza vive en el ojo aunque el gesto se ponga serio. */}
        <OjosRubber
          ojos={[{ cx: -2.5, cy: -9.2, r: 1.85 }, { cx: 2.5, cy: -9.2, r: 1.85 }]}
          mirar={[0, 0.1]}
          parpadea={vivo}
        />
        {/* MIRADA FELINA ÁMBAR: iris que enmarca la pupila (sobre la esclerótica,
            fuera del negro de la pupila) → la intensidad del ojo de gato. */}
        <g aria-hidden="true" fill="none" stroke={P.iris} strokeWidth="0.6" opacity="0.85">
          <circle cx="-2.5" cy="-9.2" r="1.44" />
          <circle cx="2.5" cy="-9.2" r="1.44" />
        </g>
        {/* OJOS LUMINOSOS — fosforescencia del espíritu (visión nocturna del
            chamán): un halo suave que respira sobre cada ojo. Sutil siempre;
            CHAMÁNICO (más brillante) en modo poder / revelación (CSS). */}
        <g className={vivo ? 'jaguar-ojo-brillo' : undefined} filter={`url(#${blur})`} aria-hidden="true"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
          <circle cx="-2.5" cy="-9.2" r="1.25" fill={P.ojoBrillo} opacity="0.55" />
          <circle cx="2.5" cy="-9.2" r="1.25" fill={P.ojoBrillo} opacity="0.55" />
        </g>
      </g>

      {/* Vestuario por clima+hora (RUANA de noche/frío) — solo con vestuario=true.
          Sombrero/sudor van suprimidos (el jaguar de tierra cálida no suda). */}
      {ropa && (
        <AccesoriosClima
          estado={ropa}
          tronco={{ cx: 0, cy: 2, rx: PR.troncoRx, ry: PR.troncoRy }}
          cabeza={{ cx: 0, cy: -8.2, r: PR.cabezaR }}
          animated={vivo}
        />
      )}

      {/* Prop del mundo en la zarpa (entra heroico con su herramienta). */}
      {propMundo}

      {/* BRUMA ETÉREA — el velo del mundo-espíritu a los pies: vela apenas las
          zarpas (por eso va al frente) y deriva lentísimo. En la revelación se
          ADENSA (CSS). */}
      <ellipse className={vivo ? 'jaguar-bruma' : undefined} cx="0" cy="11.8" rx="9.4" ry="2.1"
        fill={P.bruma} opacity="0.1" filter={`url(#${blur})`}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }} aria-hidden="true" />

      {/* MOTAS DE LUZ — polvo del espíritu que flota lento alrededor del
          felino; cada mota con su delay/duración propios (nunca en compás).
          Quietas y tenues con animated=false / RM / tier bajo. */}
      <g aria-hidden="true" fill={P.mota}>
        {MOTAS.map((m, i) => (
          <circle key={i} className={vivo ? 'jaguar-mota' : undefined}
            cx={m.cx} cy={m.cy} r={m.r} opacity="0.3"
            style={vivo ? { animationDelay: `${m.d}s`, animationDuration: `${m.s}s` } : undefined} />
        ))}
      </g>
    </g>
  );

  // Antics de VIDA (períodos co-primos) SOLO viva; nodos aparte para no pisar el
  // boil de `.crt-body`. El CSS los apaga con RM / tier bajo / ánimo bajo /
  // durante los gestos (celebra/reposo/señala) y estados (ruge/acecha).
  const conAntics = vivo ? (
    <g className="rh-antic">
      <g className="rh-travieso">{body}</g>
    </g>
  ) : body;
  // El line-boil (contorno que hierve) envuelve TODO el dibujo cuando se pide.
  const conBoil = lineBoil ? <g filter={`url(#${boil})`}>{conAntics}</g> : conAntics;
  // La LEVITACIÓN de la revelación envuelve todo (ingravidez del espíritu):
  // el wrapper siempre existe, la animación solo corre con data-revelacion (CSS)
  // → cero costo para los consumidores actuales.
  const cuerpoVivo = (
    <g className="jaguar-levita" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
      {conBoil}
    </g>
  );

  const estadoAttrs = {
    'data-creature': JAGUAR_SLUG,
    'data-pose': vivo ? poseFx : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-visema': visema || undefined,
    'data-ruana': ropa?.ruana ? '1' : undefined,
    'data-mojado': ropa?.mojado ? '1' : undefined,
    'data-ruge': rugeFx ? '1' : undefined,
    'data-acecha': acechaFx ? '1' : undefined,
    'data-revelacion': revelacion ? '1' : undefined,
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
  // MODO PODER (standalone): lo envolvemos en su aura PÚRPURA depredadora de 4
  // capas (transformacion.css: glow radial + boost + ingravidez + corrientes). El
  // wrapper DOM es lo único que puede llevar ::before/mix-blend/corrientes.
  if (poder) {
    return (
      <span
        className="is-powered-up jaguar-poder"
        data-creature-poder={JAGUAR_SLUG}
        style={{ '--aura-color': auraDeBicho(JAGUAR_SLUG), display: 'inline-flex' }}
      >
        {svg}
        <AuraPoder />
      </span>
    );
  }
  return svg;
}

export default Jaguar;
