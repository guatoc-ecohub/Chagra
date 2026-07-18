import { useId, useRef } from 'react';
import './creatures.css';
import { useVidaIdle, useRitmoPropio, useMiradaUsted } from './useVidaIdle.js';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, BocaVisema, Miembro, RH_INK } from './_rubberhose.jsx';
import { DALMATA_PALETA, DALMATA_PROPORCION, DALMATA_SLUG, PERFIL_DALMATA } from './dalmataIdentidad.js';
import { cuerpoDeClima, ropaDeClimaBicho } from './creatureClimaCuerpo.js';
import { AccesoriosClima } from './AccesoriosClima.jsx';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { PropEnMano } from './PropEnMano.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';

/* Dálmata — Canis lupus familiaris (el perro ATLÉTICO moteado de la casa).
   Hermano rubber-hose de la abeja Angelita, el jaguar y el borugo: compone el
   MISMO kit `_rubberhose.jsx` (ojos de goma, cachetes, sonrisa, miembros
   manguera) y hereda la MISMA fundación transversal — lip-sync (useLipSync →
   BocaVisema), modo poder (transformacion, aura AZUL COBALTO), ropa por clima
   (ropaDeClima), prop por mundo (PropEnMano) y line-boil (LineBoilFilter) —
   cero código duplicado. Solo cambia el ANIMAL y su CARÁCTER: perro ALTO y
   atlético de pelaje BLANCO PURO con MANCHAS NEGRAS REDONDAS bien definidas y
   SEPARADAS (la firma de la raza — mancha llena, SIN centro: no es la roseta
   del jaguar), cuerpo casi cuadrado y esbelto, PATAS LARGAS, HOCICO LARGO,
   orejas caídas MOTEADAS, collar rojo de perro de finca y lengüita rosada que
   JADEA feliz. Alegre, leal, incansable. Su seña de vida es la COLA LÁTIGO que
   menea (y arrastra la grupa cuando está feliz) y el HEAD-TILT curioso (`ladea`
   — el perro que ladea la cabeza cuando no entiende). Su squash&stretch es
   ELÁSTICO y brincón (energía de perro joven, no la mole del oso). Es de
   SUELO: corre, no vuela — sin alas. Sus estados-firma son MENEA (`menea` — la
   felicidad leída en la cola) y LADEA (`ladea`). Su color de poder es el AZUL
   COBALTO leal (no el dorado de la abeja ni el púrpura del jaguar). La
   IDENTIDAD (paleta + proporciones + perfil de clima) vive en
   `dalmataIdentidad.js`; el CLIMA→cuerpo, en `creatureClimaCuerpo.js` con
   PERFIL_DALMATA (pelo corto que se sacude rápido). NO confundir con el
   beagle: el dálmata es ALTO, esbelto y moteado; el beagle es BAJITO, orejón y
   tricolor. Todo se PODA en tier bajo / reduced-motion (fotograma digno). */
const VIEWBOX = '-16 -20 32 40';

/* Mancha del dálmata: círculo NEGRO lleno, redondo y bien definido — la firma
   de la raza (SIN centro: no es la roseta del jaguar; NEGRA: no es la mota
   crema del borugo). Decorativa (aria-hidden en el grupo padre). */
function Mancha({ cx, cy, r = 1.2, fill, opacity = 0.96 }) {
  return <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.94} fill={fill} opacity={opacity} />;
}

/* MANCHAS del cuerpo: redondas, LLENAS y bien SEPARADAS (nunca se tocan), sin
   centro. Cubren ~30-35% del tronco para que se lea "dálmata" a distancia (la
   firma inequívoca). Van CLIPEADAS a la elipse del tronco: las de la orilla se
   RECORTAN contra el contorno (el patrón ENVUELVE el volumen, como el pelaje
   real — nunca rompe la silueta → nada de ruido en el borde de tinta). */
const MANCHAS = [
  { cx: -6.8, cy: 0.2, r: 1.55 },  // orilla izquierda (se recorta: envuelve)
  { cx: -3.4, cy: -3.2, r: 1.2 },
  { cx: -5.6, cy: 5.0, r: 1.5 },
  { cx: -1.6, cy: 8.6, r: 1.35 },  // baja al vientre
  { cx: 1.2, cy: 2.2, r: 1.45 },
  { cx: 4.9, cy: -2.2, r: 1.35 },
  { cx: 7.0, cy: 2.6, r: 1.6 },    // orilla derecha (se recorta: envuelve)
  { cx: 3.6, cy: 7.6, r: 1.4 },
  { cx: -1.8, cy: -0.4, r: 0.95 },
  { cx: 5.2, cy: 5.4, r: 0.85 },
];

export function Dalmata({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Dálmata',
  /* Pose de VIDA (idle-life), species-agnostic (gestos rh-g-* de creatures.css):
     'anda' (base, con cola que menea suave) | 'celebra' (brinca con patas en V +
     overshoot brincón) | 'reposo' (respira hondo, sentado) | 'señala' (se
     inclina al POI y apunta con la pata). Solo corren viva (animated); con
     animated=false o reduced-motion queda en fotograma digno y alerta. */
  pose = 'anda',
  animo = 'sereno',
  energia = 1,
  /* CLIMA REAL escrito en el cuerpo (perfil dálmata). Sin clima (avatares,
     catálogo) = neutro digno: el dálmata se ve EXACTO como siempre. */
  clima = null,
  enso = 'neutro',
  /* ── LIP-SYNC (sistema transversal, useLipSync) ────────────────────────────
     visema opcional ('V1'..'V4') que produce useLipSync desde el RMS del TTS: la
     boca se abre cuando el agente narra. Sin visema (o 'V1') = la sonrisa de
     goma de siempre → avatares/catálogo no cambian. El HOOK vive aparte; acá
     solo se consume. */
  visema = null,
  /* ── VESTUARIO por clima+hora (ropaDeClima) ───────────────────────────────
     OPT-IN: con vestuario=true el dálmata se abriga según el clima real (RUANA
     de noche/frío — pelo CORTO: siente el frío pronto). Los perros JADEAN, no
     sudan → jamás sudor ni sombrero (se suprimen aquí aunque el termómetro
     suba; el jadeo ya vive en la lengüita). Default false → los consumidores
     de `clima` existentes NO ven ropa nueva. */
  vestuario = false,
  tempC = undefined,
  /* ── MENEA (la felicidad leída en la cola — su reacción-firma) ──────────────
     OPT-IN: la COLA LÁTIGO bate rápido y la GRUPA entera se contagia (un perro
     feliz menea desde la cadera). Default false → wag idle suave. */
  menea = false,
  /* ── LADEA (head-tilt curioso — su otra reacción-firma) ─────────────────────
     OPT-IN: la cabeza se LADEA a un lado y las orejas caídas se alzan apenas
     (el perro que escucha algo que no entiende — curiosidad pura). Default
     false. */
  ladea = false,
  /* ── VIDA PROPIA (idle-cerebro v2 — la vara de Angelita) ───────────────────
     Default ON: un reloj con jitter hojea el repertorio de la especie
     (vidaEstados.js) — el bicho EXISTE aunque nadie le hable. Cada instancia
     parpadea a SU aire (ritmo propio) y sus pupilas SIGUEN su puntero/dedo
     cuando anda cerca. El cerebro CEDE ante el host (cualquier gesto manual
     lo apaga); animated=false, tier 'bajo' y reduced-motion lo apagan entero.
     vida={false} = el bicho de antes, idéntico. */
  vida = true,
  /* Device-tier (DR-3D-PERF-GAMABAJA): 'alto'|'medio' corren el rubber-hose
     pleno; 'bajo' apaga el idle continuo (boil + cola + lengua + orejas) y
     deja los estados reactivos. Sin prop (standalone) = pleno. */
  tier,
  /* ── LÍNEA QUE RESPIRA (line-boil, Cuphead años 30 — LineBoilFilter) ────────
     OPT-IN: con lineBoil el CONTORNO del dálmata vibra escalonado — el trazo
     "hierve" como dibujo animado clásico. Default false. Con animated=false o
     reduced-motion queda con seed fija. Capa MÁS cara del kit: reservada para
     su entrada heroica (galería, hero). */
  lineBoil = false,
  /* ── MODO PODER (transformación / power-up AZUL COBALTO) ────────────────────
     OPT-IN: con poder=true (y en modo standalone) el dálmata se envuelve en su
     aura AZUL COBALTO leal de 4 capas — su firma cuando "sube de nivel". En
     modo inline el power-up lo pone el host DOM; acá solo marcamos data-poder. */
  poder = false,
  /* ── PROP POR MUNDO (herramienta en la pata — propsPorMundo/PropEnMano) ──────
     mundoId opcional: al ENTRAR a un mundo el dálmata carga su herramienta.
     Va en su pata IZQUIERDA (la cola cae al lado DERECHO: no se pisan). */
  mundoId = null,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const pelaje = `crt-pelaje-${uid}`;
  const clipTronco = `crt-clip-${uid}`;
  const vivo = animated;
  const auraOp = Math.max(0.12, Math.min(0.36, 0.14 + 0.22 * (energia ?? 1)));
  const auraR = 8.4 + 1.5 * (energia ?? 1);

  // ═══ VIDA PROPIA (idle-cerebro + ritmo propio + mirada — vara Angelita v2).
  const raizRef = useRef(null);
  const ritmoPropio = useRitmoPropio();
  const enBase = pose === 'anda' && !menea && !ladea && !visema;
  const momento = useVidaIdle('dalmata', vida && vivo && tier !== 'bajo' && enBase);
  useMiradaUsted(raizRef, vida && vivo && tier !== 'bajo');
  const meneaFx = menea || momento === 'menea';
  const ladeaFx = ladea || momento === 'ladea';
  const poseFx = momento === 'reposo' ? 'reposo' : pose;

  // CLIMA → cuerpo (determinista): tinte + opacidad al contorno. Sin alas.
  const cuerpoClima = cuerpoDeClima(clima, { enso: /** @type {any} */ (enso), tier, perfil: PERFIL_DALMATA });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  // Vestuario por clima+hora (opt-in). Los perros JADEAN, no sudan: sudor y
  // sombrero suprimidos aquí sin tocar la función compartida (contrato/tests
  // intactos). Sin vestuario/clima → nada.
  const ropaBase = (vestuario && clima) ? ropaDeClimaBicho(DALMATA_SLUG, clima, { tempC }) : null;
  const ropa = ropaBase ? { ...ropaBase, sombrero: false, sudor: false } : null;

  const P = DALMATA_PALETA;
  const PR = DALMATA_PROPORCION;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {/* PELAJE CON VOLUMEN — gradiente radial del blanco (luz dorsal arriba →
          blanco medio → marfil en penumbra al borde ventral): el mismo def
          viste tronco y cabeza (objectBoundingBox: cada uno recibe su luz).
          Sin esto el blanco es un fill PLANO — el origen del look blobby. */}
      <radialGradient id={pelaje} cx="42%" cy="30%" r="85%">
        <stop offset="0%" stopColor={P.cuerpoLuz} />
        <stop offset="58%" stopColor={P.cuerpo} />
        <stop offset="100%" stopColor={P.cuerpoSombra} />
      </radialGradient>
      {/* Clip del tronco: las manchas se RECORTAN contra la silueta (el patrón
          envuelve el volumen — jamás pisa el contorno de tinta). */}
      <clipPath id={clipTronco}>
        <ellipse cx="0" cy="2.7" rx={PR.troncoRx} ry={PR.troncoRy} />
      </clipPath>
      {lineBoil && <LineBoilFilter id={boil} animated={vivo} />}
    </defs>
  );

  // PROP DEL MUNDO en la pata izquierda (la cola cae a la derecha). Sin mundoId
  // o mundo sin prop → PropEnMano devuelve null (patas libres).
  const propMundo = mundoId ? (
    <PropEnMano mundoId={mundoId} x={-10.2} y={9.2} escala={0.72} ink={RH_INK} animated={vivo} />
  ) : null;

  // BOCA: visema (el agente narra) o la sonrisa de goma con LENGÜITA que jadea
  // (la felicidad de perro por defecto). El visema pisa la lengua (no se puede
  // articular con la lengua afuera).
  const boca = visema
    ? <BocaVisema cx={0} cy={-3.7} w={3.0} prof={1.1} visema={visema} />
    : (
      <g>
        <Sonrisa cx={0} cy={-3.6} w={3.2} prof={1.15} />
        {/* lengüita rosada asomando (jadeo feliz — grupo .dalmata-lengua):
            lóbulo redondeado CON pliegue central (volumen, no triángulo). */}
        <g className={vivo ? 'dalmata-lengua' : undefined}
          style={{ transformBox: 'fill-box', transformOrigin: 'center top' }} aria-hidden="true">
          {/* cuelga apenas LADEADA (la asimetría con encanto de la casa —
              vara Angelita: nada de simetría muerta) */}
          <path d="M-0.95,-3.3 C-1.15,-1.9 -0.7,-1.3 -0.1,-1.32 C0.55,-1.36 1.05,-2.0 0.85,-3.3 Z"
            fill={P.lengua} stroke={RH_INK} strokeWidth="0.32" />
          <path d="M-0.08,-3.1 L-0.12,-1.8" stroke={P.lenguaHondo} strokeWidth="0.28" strokeLinecap="round" />
        </g>
      </g>
    );

  // ── CUERPO rubber-hose (atrás→adelante): sombra de suelo (peso), aura, cola
  //    con MASA que cae en "S", patas traseras LARGAS, tronco esbelto con
  //    GRADIENTE de pelaje (volumen), MANCHAS clipeadas (la firma envuelve),
  //    definición muscular, collar rojo, patas delanteras, cabeza estructurada
  //    (orejas-lóbulo moteadas + hocico LARGO + cejas amables + ojos ámbar con
  //    alma). `.crt-body` squashea (boil dálmata: brincón y elástico).
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* SOMBRA DE SUELO — la mancha blanda bajo las patas que le da PESO al
          perro (un animal con masa, no un sticker). Ancla las patas largas. */}
      <ellipse cx="0" cy="13.8" rx="8.2" ry="1.45"
        fill={P.sombraSuelo} filter={`url(#${blur})`} aria-hidden="true" />
      {/* aura viva (presencia cálida) */}
      <circle cx="0" cy="2" r={auraR} fill={P.cuerpo} opacity={auraOp} filter={`url(#${blur})`} />

      {/* COLA LARGA en "S" que CAE con MASA (la anti-cola del beagle, que va
          erguida): tubo con TAPER (grueso en la base, fino a la punta — dos
          trazos superpuestos, como la cola del jaguar) + contorno de tinta.
          Blanca moteada, al lado derecho. Pivota desde su base en la grupa
          (sway relajado idle, wag amplio en menea). */}
      <g className={vivo ? 'dalmata-cola' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'left top' }}>
        <path d="M6.6,2.0 C10.8,1.2 13.0,4.0 12.3,7.4 C11.9,9.8 12.7,11.6 14.1,11.2"
          fill="none" stroke={P.cuerpo} strokeWidth="2.9" strokeLinecap="round" />
        {/* la base más gruesa (el taper que le da masa donde nace) */}
        <path d="M6.6,2.0 C9.2,1.5 10.9,2.3 11.9,4.3"
          fill="none" stroke={P.cuerpo} strokeWidth="3.7" strokeLinecap="round" />
        {/* contorno de tinta encima (la línea que manda del rubber-hose) */}
        <path d="M6.6,2.0 C10.8,1.2 13.0,4.0 12.3,7.4 C11.9,9.8 12.7,11.6 14.1,11.2"
          fill="none" stroke={RH_INK} strokeWidth="0.7" strokeLinecap="round" opacity="0.55" />
        {/* manchas de la cola (la firma llega hasta la punta) */}
        <Mancha cx={10.6} cy={2.9} r={0.8} fill={P.mancha} />
        <Mancha cx={12.4} cy={7.3} r={0.65} fill={P.mancha} />
        <Mancha cx={13.3} cy={10.5} r={0.5} fill={P.mancha} />
      </g>

      {/* patas traseras LARGAS y finas pero con SUSTANCIA (no alambres), pie
          blanco anclado a la sombra de suelo. Se mecen suave. */}
      <Miembro d="M-5.2,6.8 C-6.6,9.2 -6.6,11.4 -5.6,13.0" ancho={2.7} punta={[-5.6, PR.pataLarga]} puntaR={1.95} pie sway={vivo} delay={-0.7} glove={P.vientre} />
      <Miembro d="M5.2,6.8 C6.6,9.2 6.6,11.4 5.6,13.0" ancho={2.7} punta={[5.6, PR.pataLarga]} puntaR={1.95} pie sway={vivo} delay={-1.0} glove={P.vientre} />

      {/* tronco BLANCO esbelto, más ALTO que ancho (atlético, casi cuadrado —
          la anti-silueta del beagle chato). El fill es el GRADIENTE de pelaje:
          luz dorsal → marfil ventral (volumen real, no blanco plano). */}
      <ellipse cx="0" cy="2.7" rx={PR.troncoRx} ry={PR.troncoRy}
        fill={`url(#${pelaje})`} stroke={RH_INK} strokeWidth="1.4"
        style={{ filter: `drop-shadow(0 0 5px ${P.cuerpoGlow})` }} />
      {/* pecho aún más claro (el brillo del blanco sobre el gradiente) */}
      <path d="M0,-4.4 C3.6,-3.4 4.6,1.4 3.5,5.8 C2.0,8.4 -2.0,8.4 -3.5,5.8 C-4.6,1.4 -3.6,-3.4 0,-4.4 Z"
        fill={P.vientre} opacity="0.75" />

      {/* MANCHAS del cuerpo (negras, redondas, SEPARADAS — LA FIRMA),
          CLIPEADAS al tronco: las de la orilla se recortan contra la silueta
          (el patrón envuelve el volumen, nunca pisa el contorno de tinta). */}
      <g aria-hidden="true" clipPath={`url(#${clipTronco})`}>
        {MANCHAS.map((m, i) => (
          <Mancha key={i} cx={m.cx} cy={m.cy} r={m.r} fill={P.mancha} />
        ))}
      </g>

      {/* DEFINICIÓN MUSCULAR sutil (el atleta se siente): dos trazos de anca
          sobre los muslos y el surco del pectoral. Tinta a baja opacidad —
          sugiere, no delinea. */}
      <g aria-hidden="true" fill="none" stroke={RH_INK} strokeWidth="0.5" opacity="0.18" strokeLinecap="round">
        <path d="M-7.0,4.2 C-6.4,6.6 -5.1,8.2 -3.5,8.9" />
        <path d="M7.0,4.2 C6.4,6.6 5.1,8.2 3.5,8.9" />
        <path d="M-1.5,-3.3 C-0.5,-2.6 0.5,-2.6 1.5,-3.3" />
      </g>

      {/* COLLAR ROJO de perro de finca (tachuela + plaquita dorada al lado).
          Va antes de la cabeza: el hocico largo cae encima. */}
      <g aria-hidden="true">
        <path d="M-4.9,-5.7 C-2.4,-4.2 2.4,-4.2 4.9,-5.7 L4.5,-3.9 C2.2,-2.6 -2.2,-2.6 -4.5,-3.9 Z"
          fill={P.collar} stroke={RH_INK} strokeWidth="0.55" strokeLinejoin="round" />
        <circle cx="-2.7" cy="-4.15" r="0.3" fill={P.placa} stroke={RH_INK} strokeWidth="0.25" />
        <circle cx="3.1" cy="-3.6" r="0.68" fill={P.placa} stroke={RH_INK} strokeWidth="0.35" />
      </g>

      {/* patas delanteras LARGAS manguera, pivote en el HOMBRO para que
          celebra/señala las alcen desde el hombro. */}
      <Miembro clase="crt-brazo-l" origen="right top"
        d="M-5.9,-0.8 C-8.6,1.2 -9.5,5.4 -8.9,9.6" ancho={2.5} punta={[-8.9, 10.0]} puntaR={1.95} pie sway={vivo} delay={-0.15} glove={P.vientre} />
      <Miembro clase="crt-brazo-r" origen="left top"
        d="M5.9,-0.8 C8.6,1.2 9.5,5.4 8.9,9.6" ancho={2.5} punta={[8.9, 10.0]} puntaR={1.95} pie sway={vivo} delay={-0.45} glove={P.vientre} />

      {/* CABEZA (grupo propio .dalmata-cabeza para el head-tilt de `ladea`).
          Cráneo apenas más ancho que alto (perro fino, no carita-círculo),
          vestido con el MISMO gradiente de pelaje (volumen). */}
      <g className="dalmata-cabeza" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
        <ellipse cx="0" cy="-10.2" rx={PR.cabezaRx} ry={PR.cabezaRy}
          fill={`url(#${pelaje})`} stroke={RH_INK} strokeWidth="1.35" />
        {/* manchitas de la cabeza (pequeñas, asimétricas — el encanto del
            parche propio; nunca tapan el ojo) */}
        <g aria-hidden="true">
          <Mancha cx={3.4} cy={-13.3} r={0.95} fill={P.mancha} />
          <Mancha cx={-2.0} cy={-14.0} r={0.6} fill={P.mancha} />
        </g>
        {/* HOCICO LARGO claro (la seña atlética de la raza: el morro baja BIEN
            por debajo de la cara — nada de carita chata). Cuelga hasta y≈-2.3
            (la cabeza termina en -5.0): eso es lo que lee "hocico largo". */}
        <path d="M-2.7,-8.7 C-3.3,-5.3 -2.4,-2.6 0,-2.3 C2.4,-2.6 3.3,-5.3 2.7,-8.7 C1.35,-7.6 -1.35,-7.6 -2.7,-8.7 Z"
          fill={P.hocico} opacity="0.96" />
        {/* CEJAS AMABLES (arcos suaves — la nobleza del perro viejo y bueno;
            lo contrario de la ceja fiera del jaguar). La izquierda va apenas
            MÁS ALTA (la carita expresiva asimétrica — vara Angelita). */}
        <g aria-hidden="true" fill="none" stroke={RH_INK} strokeWidth="0.8" strokeLinecap="round" opacity="0.75">
          <path d="M-3.7,-13.7 Q-2.5,-14.4 -1.3,-13.9" />
          <path d="M3.7,-13.5 Q2.5,-14.1 1.3,-13.7" />
        </g>
        {/* chapetas (rubor amable) */}
        <Cachetes puntos={[{ cx: -4.3, cy: -7.9, r: 1.05 }, { cx: 4.3, cy: -7.9, r: 1.05 }]} vivo={vivo} />
        {boca}
        {/* puntos de VIBRISAS en el morro (realismo de perro sin perder la goma) */}
        <g aria-hidden="true" fill={P.mancha} opacity="0.4">
          <circle cx="-1.8" cy="-5.8" r="0.18" /><circle cx="-1.3" cy="-5.3" r="0.15" />
          <circle cx="1.8" cy="-5.8" r="0.18" /><circle cx="1.3" cy="-5.3" r="0.15" />
        </g>
        {/* TRUFA negra grande MODELADA (redondeada, no triángulo duro) con su
            brillito húmedo (la nariz sana del perro querido) + filtrum */}
        <path d="M-1.35,-6.15 C-1.35,-6.8 1.35,-6.8 1.35,-6.15 C1.35,-5.25 0.6,-4.65 0,-4.65 C-0.6,-4.65 -1.35,-5.25 -1.35,-6.15 Z"
          fill={P.nariz} />
        <circle cx="-0.45" cy="-6.1" r="0.3" fill="#fffdf7" opacity="0.65" aria-hidden="true" />
        <path d="M0,-4.65 L0,-3.95" stroke={RH_INK} strokeWidth="0.32" strokeLinecap="round" opacity="0.6" aria-hidden="true" />
        {/* OJOS GRANDES ámbar-café, vivos y amables (catchlight del kit +
            iris que enmarca la pupila — el alma en el ojo, nunca vacío). */}
        {/* mirada de REOJO curiosa (vara Angelita: la pupila descentrada es lo
            que da el alma — mirar al frente fijo se lee muerto) */}
        <OjosRubber
          ojos={[{ cx: -2.3, cy: -11.2, r: 1.85 }, { cx: 2.3, cy: -11.2, r: 1.85 }]}
          mirar={[0.22, 0.2]}
          parpadea={vivo}
        />
        <g aria-hidden="true" fill="none" stroke={P.iris} strokeWidth="0.6" opacity="0.85">
          <circle cx="-2.3" cy="-11.2" r="1.44" />
          <circle cx="2.3" cy="-11.2" r="1.44" />
        </g>
        {/* OREJAS CAÍDAS moteadas — LÓBULOS reales (path de gota, no elipse
            genérica) que nacen arriba del cráneo y cuelgan ENMARCANDO la cara
            sin tocar los ojos. Se alzan apenas al ladear (.dalmata-orejas).
            La derecha es la izquierda espejada (scale -1). */}
        <g className="dalmata-orejas" style={{ transformBox: 'fill-box', transformOrigin: 'center top' }}>
          {/* cada oreja cuelga con SU caída (asimetría viva — vara Angelita) */}
          {[false, true].map((espejo) => (
            <g key={espejo ? 'd' : 'i'}
              transform={espejo ? 'scale(-1 1) rotate(3 -5.5 -13.5)' : 'rotate(-2 -5.5 -13.5)'}>
              <path d="M-3.7,-14.1 C-6.2,-13.9 -7.9,-11.6 -7.7,-8.6 C-7.5,-6.3 -6.3,-5.0 -5.1,-5.7 C-4.3,-6.2 -4.4,-8.4 -4.5,-10.3 C-4.6,-11.9 -4.3,-13.0 -3.7,-14.1 Z"
                fill={P.oreja} stroke={RH_INK} strokeWidth="1.15" strokeLinejoin="round" />
              {/* penumbra del lóbulo (volumen de la oreja que cuelga) */}
              <ellipse cx="-5.7" cy="-7.2" rx="1.0" ry="1.45" fill={P.cuerpoSombra} opacity="0.4" aria-hidden="true" />
              {/* orejas MOTEADAS: la firma llega hasta las orejas */}
              <Mancha cx={-6.3} cy={-10.2} r={1.15} fill={P.mancha} opacity={0.9} />
              <Mancha cx={-5.8} cy={-6.9} r={0.55} fill={P.mancha} opacity={0.85} />
            </g>
          ))}
        </g>
      </g>

      {/* Vestuario por clima+hora (RUANA de noche/frío) — solo con vestuario=true.
          Sombrero/sudor van suprimidos (los perros jadean, no sudan). */}
      {ropa && (
        <AccesoriosClima
          estado={ropa}
          tronco={{ cx: 0, cy: 2.7, rx: PR.troncoRx, ry: PR.troncoRy }}
          cabeza={{ cx: 0, cy: -10.2, r: PR.cabezaR }}
          animated={vivo}
        />
      )}

      {/* Prop del mundo en la pata (entra alegre con su herramienta). */}
      {propMundo}
    </g>
  );

  // Antics de VIDA (períodos co-primos) SOLO viva; nodos aparte para no pisar
  // el boil de `.crt-body`. El CSS los apaga con RM / tier bajo / gestos.
  const conAntics = vivo ? (
    <g className="rh-antic">
      <g className="rh-travieso">{body}</g>
    </g>
  ) : body;
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{conAntics}</g> : conAntics;

  const estadoAttrs = {
    'data-creature': DALMATA_SLUG,
    'data-pose': vivo ? poseFx : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-visema': visema || undefined,
    'data-ruana': ropa?.ruana ? '1' : undefined,
    'data-mojado': ropa?.mojado ? '1' : undefined,
    'data-menea': meneaFx ? '1' : undefined,
    'data-ladea': ladeaFx ? '1' : undefined,
    'data-vida': momento || undefined,
    'data-lineboil': lineBoil ? '1' : undefined,
    'data-prop': mundoId || undefined,
  };

  // El ritmo propio (parpadeo/dardeo por instancia) viaja como vars CSS.
  const estiloRaiz = { ...ritmoPropio, ...estiloClima };

  if (inline) {
    // En modo inline el power-up lo pone el host DOM; acá solo data-poder.
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
  // MODO PODER (standalone): aura AZUL COBALTO leal de 4 capas.
  if (poder) {
    return (
      <span
        className="is-powered-up dalmata-poder"
        data-creature-poder={DALMATA_SLUG}
        style={{ '--aura-color': auraDeBicho(DALMATA_SLUG), display: 'inline-flex' }}
      >
        {svg}
        <AuraPoder />
      </span>
    );
  }
  return svg;
}

export default Dalmata;
