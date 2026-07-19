import { useId, useRef } from 'react';
import './creatures.css';
import { useVidaIdle, useRitmoPropio, useMiradaUsted } from './useVidaIdle.js';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, BocaVisema, Miembro, RH_INK, RH_BOCA } from './_rubberhose.jsx';
import { BEAGLE_PALETA, BEAGLE_PROPORCION, BEAGLE_SLUG, PERFIL_BEAGLE } from './beagleIdentidad.js';
import { cuerpoDeClima, ropaDeClimaBicho } from './creatureClimaCuerpo.js';
import { AccesoriosClima } from './AccesoriosClima.jsx';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { PropEnMano } from './PropEnMano.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';

/* Beagle — Canis lupus familiaris (el sabueso BAJITO y orejón de la casa).
   Hermano rubber-hose de la abeja Angelita, el jaguar y el dálmata: compone el
   MISMO kit `_rubberhose.jsx` (ojos de goma, cachetes, sonrisa, miembros
   manguera) y hereda la MISMA fundación transversal — lip-sync (useLipSync →
   BocaVisema), modo poder (transformacion, aura CANELA DE RASTRO), ropa por
   clima (ropaDeClima), prop por mundo (PropEnMano) y line-boil
   (LineBoilFilter) — cero código duplicado. Solo cambia el ANIMAL y su
   CARÁCTER: sabueso COMPACTO de patas CORTAS, TRICOLOR de manual — SILLA NEGRA
   sobre el lomo, BLANCO en cara-pecho-patas, FUEGO/canela en cabeza y orejas —
   con LISTA blanca subiendo por el centro de la cara, orejas LARGUÍSIMAS
   anchas y CAÍDAS que enmarcan la cara, hocico ANCHO con trufa GRANDE (la
   nariz es su vida), el HOCICO ESCARCHADO de perro viejo (Dante tiene 15
   años: velo blanco-hueso desde la trufa por el puente — su marca de
   dignidad, la misma del mesh 3D), cejas CANELA del tricolor, collar VERDE
   con plaquita de LATÓN y la COLA ERGUIDA con PUNTA BLANCA (la "bandera"
   del cazador). Ojos GRANDES café con expresión dulce. Curioso, dulce,
   NARIZ-PRIMERO. Su seña de vida es el OLFATEO de sabueso (`olfatea` — la
   cabeza BAJA al suelo, la trufa tiembla, las orejas cuelgan hacia adelante) y
   el AULLIDO (`aulla` — hocico al cielo, boca en O, el canto del sabueso). Su
   squash&stretch es BLANDITO y bonachón (rechoncho feliz, no atlético). Es de
   SUELO: rastrea, no vuela — sin alas. Su color de poder es el CANELA DE
   RASTRO (la nariz de oro; no el cobalto del dálmata ni el púrpura del
   jaguar). La IDENTIDAD (paleta + proporciones + perfil de clima) vive en
   `beagleIdentidad.js`; el CLIMA→cuerpo, en `creatureClimaCuerpo.js` con
   PERFIL_BEAGLE. NO confundir con el dálmata: el beagle es BAJITO, orejón y
   tricolor; el dálmata es ALTO, esbelto y moteado. Todo se PODA en tier bajo /
   reduced-motion (fotograma digno). */
const VIEWBOX = '-16 -20 32 40';

export function Beagle({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Beagle',
  /* Pose de VIDA (idle-life), species-agnostic (gestos rh-g-* de creatures.css):
     'anda' (base, con orejas que se mecen) | 'celebra' (brinca con patas en V +
     overshoot blandito) | 'reposo' (respira hondo, echado) | 'señala' (se
     inclina al POI y apunta con la patica). Solo corren viva (animated); con
     animated=false o reduced-motion queda en fotograma digno y dulce. */
  pose = 'anda',
  animo = 'sereno',
  energia = 1,
  /* CLIMA REAL escrito en el cuerpo (perfil beagle). Sin clima (avatares,
     catálogo) = neutro digno: el beagle se ve EXACTO como siempre. */
  clima = null,
  enso = 'neutro',
  /* ── LIP-SYNC (sistema transversal, useLipSync) ────────────────────────────
     visema opcional ('V1'..'V4') que produce useLipSync desde el RMS del TTS.
     Sin visema (o 'V1') = la sonrisa de goma de siempre. El AULLIDO manda sobre
     el visema (un sabueso que aúlla no articula fonemas). */
  visema = null,
  /* ── VESTUARIO por clima+hora (ropaDeClima) ───────────────────────────────
     OPT-IN: con vestuario=true el beagle se abriga según el clima real (RUANA
     de noche/frío). Los perros JADEAN, no sudan → jamás sudor ni sombrero (se
     suprimen aquí aunque el termómetro suba). Default false. */
  vestuario = false,
  tempC = undefined,
  /* ── OLFATEA (el olfateo de sabueso — su reacción-firma) ────────────────────
     OPT-IN: la cabeza BAJA al suelo, la trufa TIEMBLA rápido y las orejotas
     cuelgan hacia ADELANTE (el sabueso agarró un rastro). Default false →
     olfateo idle suave (la nariz siempre trabaja un poquito). */
  olfatea = false,
  /* ── AULLA (el canto del sabueso — su otra reacción-firma) ──────────────────
     OPT-IN: el hocico apunta AL CIELO, la boca se frunce en O y el pecho
     hincha (el aullido leído en el cuerpo — entrañable, no amenazante).
     Default false. */
  aulla = false,
  /* ── VIDA PROPIA (idle-cerebro v2 — la vara de Angelita) ───────────────────
     Default ON: un reloj con jitter hojea el repertorio de la especie
     (vidaEstados.js) — el bicho EXISTE aunque nadie le hable. Cada instancia
     parpadea a SU aire y sus pupilas SIGUEN su puntero/dedo. El cerebro CEDE
     ante el host; animated=false, tier 'bajo' y reduced-motion lo apagan
     entero. vida={false} = el bicho de antes, idéntico. */
  vida = true,
  /* Device-tier (DR-3D-PERF-GAMABAJA): 'alto'|'medio' corren el rubber-hose
     pleno; 'bajo' apaga el idle continuo (boil + orejas + cola + nariz) y deja
     los estados reactivos. Sin prop (standalone) = pleno. */
  tier,
  /* ── LÍNEA QUE RESPIRA (line-boil, Cuphead años 30 — LineBoilFilter) ────────
     OPT-IN: el CONTORNO vibra escalonado (~8fps). Default false. Reservada
     para su entrada heroica (galería, hero). */
  lineBoil = false,
  /* ── MODO PODER (transformación / power-up CANELA DE RASTRO) ────────────────
     OPT-IN: con poder=true (standalone) el beagle se envuelve en su aura
     CANELA de 4 capas — la nariz de oro del sabueso. En modo inline el
     power-up lo pone el host DOM; acá solo marcamos data-poder. */
  poder = false,
  /* ── PROP POR MUNDO (herramienta en la patica — propsPorMundo/PropEnMano) ────
     mundoId opcional: al ENTRAR a un mundo el beagle carga su herramienta.
     Va en su patica IZQUIERDA (la cola-bandera sube al lado DERECHO). */
  mundoId = null,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const pelajeBlanco = `crt-pelb-${uid}`;
  const pelajeCanela = `crt-pelc-${uid}`;
  const clipTronco = `crt-clip-${uid}`;
  const vivo = animated;
  const auraOp = Math.max(0.13, Math.min(0.38, 0.15 + 0.23 * (energia ?? 1)));
  const auraR = 8.6 + 1.5 * (energia ?? 1);

  // ═══ VIDA PROPIA (idle-cerebro + ritmo propio + mirada — vara Angelita v2).
  const raizRef = useRef(null);
  const ritmoPropio = useRitmoPropio();
  const enBase = pose === 'anda' && !olfatea && !aulla && !visema;
  const momento = useVidaIdle('beagle', vida && vivo && tier !== 'bajo' && enBase);
  useMiradaUsted(raizRef, vida && vivo && tier !== 'bajo');
  const olfateaFx = olfatea || momento === 'olfatea';
  const aullaFx = aulla || momento === 'aulla';
  const poseFx = momento === 'reposo' ? 'reposo' : pose;

  // CLIMA → cuerpo (determinista): tinte + opacidad al contorno. Sin alas.
  const cuerpoClima = cuerpoDeClima(clima, { enso: /** @type {any} */ (enso), tier, perfil: PERFIL_BEAGLE });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  // Vestuario por clima+hora (opt-in). Los perros JADEAN, no sudan: sudor y
  // sombrero suprimidos sin tocar la función compartida. Sin vestuario → nada.
  const ropaBase = (vestuario && clima) ? ropaDeClimaBicho(BEAGLE_SLUG, clima, { tempC }) : null;
  const ropa = ropaBase ? { ...ropaBase, sombrero: false, sudor: false } : null;

  const P = BEAGLE_PALETA;
  const PR = BEAGLE_PROPORCION;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {/* PELAJE CON VOLUMEN — dos gradientes radiales (luz dorsal → sombra
          ventral): el BLANCO viste el tronco, el CANELA viste la cabeza. Sin
          esto los planos de color quedan PLANOS — el origen del look blobby. */}
      <radialGradient id={pelajeBlanco} cx="42%" cy="30%" r="85%">
        <stop offset="0%" stopColor={P.cuerpoLuz} />
        <stop offset="58%" stopColor={P.cuerpo} />
        <stop offset="100%" stopColor={P.cuerpoSombra} />
      </radialGradient>
      <radialGradient id={pelajeCanela} cx="42%" cy="30%" r="85%">
        <stop offset="0%" stopColor={P.canelaLuz} />
        <stop offset="55%" stopColor={P.canela} />
        <stop offset="100%" stopColor={P.canelaHondo} />
      </radialGradient>
      {/* Clip del tronco: silla, ribete y fuego de hombros se RECORTAN contra
          la silueta (el tricolor envuelve el volumen — jamás pisa el contorno
          de tinta ni queda como lentes flotantes). */}
      <clipPath id={clipTronco}>
        <ellipse cx="0" cy="4.4" rx={PR.troncoRx} ry={PR.troncoRy} />
      </clipPath>
      {lineBoil && <LineBoilFilter id={boil} animated={vivo} />}
    </defs>
  );

  // PROP DEL MUNDO en la patica izquierda (la cola-bandera sube a la derecha).
  const propMundo = mundoId ? (
    <PropEnMano mundoId={mundoId} x={-10.4} y={8.0} escala={0.7} ink={RH_INK} animated={vivo} />
  ) : null;

  // BOCA: precedencia AULLIDO > visema > sonrisa. El sabueso que aúlla frunce
  // la boca en O (no articula fonemas); si narra sin aullar, el visema; en
  // reposo, la sonrisa ancha y dulce de sabueso.
  const boca = aullaFx ? (
    <g className="beagle-aullido-boca" aria-hidden="true"
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
      <circle cx="0" cy="-2.6" r="1.25" fill={RH_BOCA} stroke={RH_INK} strokeWidth="0.8" />
      <circle cx="0" cy="-2.6" r="0.6" fill="#5c231f" />
    </g>
  ) : visema
    ? <BocaVisema cx={0} cy={-2.4} w={3.4} prof={1.1} visema={visema} />
    : <Sonrisa cx={0} cy={-2.3} w={3.4} prof={1.2} />;

  // ── CUERPO rubber-hose (atrás→adelante): sombra de suelo (peso), aura,
  //    cola-BANDERA con taper y punta blanca, patas traseras CORTAS, tronco
  //    blanco chato con GRADIENTE (volumen) y SILLA negra + ribete canela
  //    CLIPEADOS a la silueta (tricolor limpio, no lentes flotantes), paticas
  //    delanteras CORTAS, cabeza canela con volumen (orejotas-LÓBULO
  //    larguísimas + LISTA blanca + hocico ancho + trufa grande + ojos dulces).
  //    `.crt-body` squashea (boil beagle: blandito y bonachón).
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* SOMBRA DE SUELO — la mancha blanda bajo las paticas que le da PESO al
          sabueso (un animal con masa, no un sticker). */}
      <ellipse cx="0" cy="13.2" rx="9.0" ry="1.5"
        fill={P.sombraSuelo} filter={`url(#${blur})`} aria-hidden="true" />
      {/* aura viva (presencia cálida canela) */}
      <circle cx="0" cy="3" r={auraR} fill={P.canela} opacity={auraOp} filter={`url(#${blur})`} />

      {/* COLA ERGUIDA con PUNTA BLANCA — la "bandera" del sabueso (SUBE, no
          cae: lo contrario de la cola-látigo del dálmata). Tubo con TAPER
          (base canela gruesa → tramo negro del manto → banderín blanco) +
          contorno de tinta: masa real, no un alambre. Wag de bandera en idle;
          pivota desde su base en la grupa. */}
      <g className={vivo ? 'beagle-cola' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'left bottom' }}>
        <path d="M8.0,2.4 C9.6,-0.4 10.5,-4.2 10.1,-7.8"
          fill="none" stroke={P.canela} strokeWidth="2.3" strokeLinecap="round" />
        {/* la base más gruesa (el taper donde la cola nace de la grupa) */}
        <path d="M8.0,2.4 C8.8,0.9 9.4,-0.6 9.8,-2.2"
          fill="none" stroke={P.canela} strokeWidth="3.0" strokeLinecap="round" />
        {/* el tramo NEGRO del manto (el tricolor sube por la cola) */}
        <path d="M9.9,-3.0 C10.3,-4.8 10.4,-6.4 10.2,-7.6"
          fill="none" stroke={P.manto} strokeWidth="2.3" strokeLinecap="round" />
        {/* contorno de tinta encima (la línea que manda del rubber-hose) */}
        <path d="M8.0,2.4 C9.6,-0.4 10.5,-4.2 10.1,-7.8"
          fill="none" stroke={RH_INK} strokeWidth="0.65" strokeLinecap="round" opacity="0.5" />
        {/* LA PUNTA BLANCA (el banderín que se ve entre el monte) */}
        <ellipse cx="10.15" cy={PR.colaAlto + 0.3} rx="1.2" ry="1.6"
          transform={`rotate(-7 10.15 ${PR.colaAlto + 0.3})`}
          fill={P.colaPunta} stroke={RH_INK} strokeWidth="0.7" />
      </g>

      {/* patas traseras CORTAS y robustas (paticas rechonchas, pie BLANCO
          anclado a la sombra de suelo) */}
      <Miembro d="M-5.8,8.2 C-6.7,9.6 -6.6,10.9 -5.8,11.7" ancho={3.4} punta={[-5.8, PR.pataCorta]} puntaR={2.05} pie sway={vivo} delay={-0.7} glove={P.cuerpo} />
      <Miembro d="M5.8,8.2 C6.7,9.6 6.6,10.9 5.8,11.7" ancho={3.4} punta={[5.8, PR.pataCorta]} puntaR={2.05} pie sway={vivo} delay={-1.0} glove={P.cuerpo} />

      {/* tronco BLANCO chato y compacto, más ANCHO que alto (bajito de patas
          cortas — la anti-silueta del dálmata esbelto). El fill es el GRADIENTE
          de pelaje: luz dorsal → marfil ventral (volumen real). */}
      <ellipse cx="0" cy="4.4" rx={PR.troncoRx} ry={PR.troncoRy}
        fill={`url(#${pelajeBlanco})`} stroke={RH_INK} strokeWidth="1.4"
        style={{ filter: `drop-shadow(0 0 5px ${P.cuerpoGlow})` }} />
      {/* TRICOLOR del lomo, CLIPEADO a la silueta del tronco (envuelve el
          volumen; jamás pisa el contorno de tinta): primero el ribete CANELA,
          encima la SILLA NEGRA con borde inferior FESTONEADO (el manto real
          cae en ondas, no en lente dura), y el fuego canela de los hombros. */}
      <g aria-hidden="true" clipPath={`url(#${clipTronco})`}>
        <path d="M-10,4.8 C-6,-0.6 6,-0.6 10,4.8 C6.6,7.4 -6.6,7.4 -10,4.8 Z"
          fill={P.canela} opacity="0.9" />
        <path d="M-10.2,3.2 C-5.6,-3.0 5.6,-3.0 10.2,3.2 C7.4,5.2 4.8,4.4 2.5,5.0 C0.9,5.4 -0.9,5.4 -2.5,5.0 C-4.8,4.4 -7.4,5.2 -10.2,3.2 Z"
          fill={P.manto} opacity="0.97" />
        {/* FUEGO/canela en los hombros (el tricolor baja a las paticas — la
            patita termina en pie BLANCO encima) */}
        <ellipse cx="-7.2" cy="5.0" rx="2.0" ry="2.7" fill={P.canela} opacity="0.9" />
        <ellipse cx="7.2" cy="5.0" rx="2.0" ry="2.7" fill={P.canela} opacity="0.9" />
      </g>
      {/* pecho/panza blanca (lo de abajo siempre blanco) */}
      <path d="M0,4.2 C3.8,4.6 4.9,6.9 3.7,9.0 C2.0,10.4 -2.0,10.4 -3.7,9.0 C-4.9,6.9 -3.8,4.6 0,4.2 Z"
        fill={P.cuerpo} opacity="0.95" />
      {/* DEFINICIÓN sutil de las ancas (el rechoncho también tiene cuerpo):
          tinta a baja opacidad — sugiere, no delinea. */}
      <g aria-hidden="true" fill="none" stroke={RH_INK} strokeWidth="0.5" opacity="0.18" strokeLinecap="round">
        <path d="M-8.6,5.8 C-8.0,7.6 -6.6,8.8 -5.0,9.4" />
        <path d="M8.6,5.8 C8.0,7.6 6.6,8.8 5.0,9.4" />
      </g>

      {/* COLLAR VERDE de Dante con su plaquita de LATÓN (gemela de la de
          Oliver: los dos son perros CON CASA) — la misma seña del mesh 3D
          (geomPerroAndante). Va antes de la cabeza: el hocico ancho cae
          encima y solo asoman los lados + la placa. */}
      <g aria-hidden="true">
        <path d="M-5.6,-3.1 C-2.8,-1.6 2.8,-1.6 5.6,-3.1 L5.2,-1.3 C2.6,-0.1 -2.6,-0.1 -5.2,-1.3 Z"
          fill={P.collar} stroke={RH_INK} strokeWidth="0.55" strokeLinejoin="round" />
        <circle cx="-3.1" cy="-2.05" r="0.3" fill={P.placa} stroke={RH_INK} strokeWidth="0.25" />
        <circle cx="4.4" cy="-1.5" r="0.68" fill={P.placa} stroke={RH_INK} strokeWidth="0.35" />
      </g>

      {/* paticas delanteras CORTAS y robustas, pie BLANCO, pivote en el HOMBRO. */}
      <Miembro clase="crt-brazo-l" origen="right top"
        d="M-6.6,3.0 C-8.4,4.8 -9.0,6.9 -8.5,8.8" ancho={3.3} punta={[-8.5, 9.2]} puntaR={2.05} pie sway={vivo} delay={-0.15} glove={P.cuerpo} />
      <Miembro clase="crt-brazo-r" origen="left top"
        d="M6.6,3.0 C8.4,4.8 9.0,6.9 8.5,8.8" ancho={3.3} punta={[8.5, 9.2]} puntaR={2.05} pie sway={vivo} delay={-0.45} glove={P.cuerpo} />

      {/* CABEZA (grupo propio .beagle-cabeza: baja al olfatear, sube al
          aullar). Abombada y dulce, vestida con el gradiente CANELA (volumen). */}
      <g className="beagle-cabeza" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
        <ellipse cx="0" cy="-7.8" rx={PR.cabezaRx} ry={PR.cabezaRy}
          fill={`url(#${pelajeCanela})`} stroke={RH_INK} strokeWidth="1.35" />
        {/* LISTA BLANCA que sube por el centro de la cara (del hocico a la
            frente, entre los ojos — la firma de la cara tricolor) */}
        <path d="M-1.3,-2.8 C-1.8,-6.4 -1.5,-10.2 0,-13.1 C1.5,-10.2 1.8,-6.4 1.3,-2.8 Z"
          fill={P.lista} opacity="0.95" />
        {/* CEJAS CANELA del tricolor — los dos puntos más hondos sobre los
            ojos que hacen "cara de beagle" (la misma seña del mesh 3D); van
            DEBAJO de los trazos de ceja para que la tinta siga dibujando. */}
        <g aria-hidden="true" fill={P.ceja} opacity="0.85">
          <ellipse cx="-3.05" cy="-10.5" rx="1.0" ry="0.55" transform="rotate(-12 -3.05 -10.5)" />
          <ellipse cx="3.05" cy="-10.7" rx="1.0" ry="0.55" transform="rotate(12 3.05 -10.7)" />
        </g>
        {/* CEJAS PREOCUPADAS con el interior alzado (la carita que ruega —
            LA expresión del beagle). La derecha sube apenas MÁS (la súplica
            asimétrica con encanto — vara Angelita, nada de simetría muerta). */}
        <g aria-hidden="true" fill="none" stroke={RH_INK} strokeWidth="0.85" strokeLinecap="round" opacity="0.8">
          <path d="M-4.4,-10.1 Q-3.0,-10.5 -1.7,-11.1" />
          <path d="M4.4,-10.2 Q3.0,-10.7 1.7,-11.4" />
        </g>
        {/* HOCICO ANCHO y ROMO con belfos de sabueso (morro amplio y cuadrado,
            nada fino — firma de la raza; cuelga por debajo de la cara) */}
        <path d="M-3.9,-4.9 C-4.3,-2.1 -2.6,-0.8 0,-0.8 C2.6,-0.8 4.3,-2.1 3.9,-4.9 C1.95,-3.5 -1.95,-3.5 -3.9,-4.9 Z"
          fill={P.hocico} opacity="0.97" />
        {/* EL HOCICO ESCARCHADO de Dante — 15 años se llevan con canas: el
            velo blanco-hueso que sube desde la trufa por el puente del hocico
            y RALEA hacia los ojos, desbordando apenas sobre el canela de las
            mejillas (la marca de dignidad del perro viejo — no un defecto).
            La misma seña del mesh 3D. Trufa, boca y ojos van DESPUÉS en el
            orden de pintado: la cara no pierde su dibujo. Encima, tres
            CANITAS sueltas (pelitos de luz) que rematan la escarcha. */}
        <g aria-hidden="true">
          <ellipse cx="0" cy="-3.4" rx="4.7" ry="3.0" fill={P.escarcha} opacity="0.4" />
          <ellipse cx="0" cy="-4.5" rx="3.2" ry="2.1" fill={P.escarcha} opacity="0.55" />
          <g fill="none" stroke={P.cuerpoLuz} strokeWidth="0.32" strokeLinecap="round" opacity="0.7">
            <path d="M-1.7,-6.1 L-2.1,-6.9" />
            <path d="M0.4,-6.5 L0.3,-7.3" />
            <path d="M2.0,-6.0 L2.5,-6.7" />
          </g>
        </g>
        {/* chapetas (rubor dulce, asomando junto a las orejotas) */}
        <Cachetes puntos={[{ cx: -3.4, cy: -3.9, r: 0.9 }, { cx: 3.4, cy: -3.9, r: 0.9 }]} vivo={vivo} />
        {boca}
        {/* la línea de los belfos (del centro de la trufa a la boca) */}
        <line x1="0" y1="-3.5" x2="0" y2="-2.75" stroke={RH_INK} strokeWidth="0.35" opacity="0.7" />
        {/* puntos de VIBRISAS en el morro (realismo de sabueso sin perder la goma) */}
        <g aria-hidden="true" fill={P.manto} opacity="0.4">
          <circle cx="-2.4" cy="-2.9" r="0.17" /><circle cx="-2.9" cy="-3.5" r="0.15" />
          <circle cx="2.4" cy="-2.9" r="0.17" /><circle cx="2.9" cy="-3.5" r="0.15" />
        </g>
        {/* TRUFA GRANDE negra (la nariz manda: el sabueso ES su nariz) —
            grupo propio .beagle-nariz (tiembla al olfatear) */}
        <g className={vivo ? 'beagle-nariz' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
          <ellipse cx="0" cy="-4.7" rx="1.75" ry="1.35" fill={P.nariz} />
          {/* el brillito húmedo de la trufa sana */}
          <circle cx="-0.55" cy="-5.1" r="0.4" fill="#fffdf7" opacity="0.7" />
        </g>
        {/* OJOS GRANDES y REDONDOS café-ámbar — la mirada dulce-suplicante
            ("de llanto") del beagle: su gancho de simpatía. Catchlight del
            kit + iris que enmarca la pupila (alma, nunca vacío). */}
        {/* mirada de REOJO dulce (vara Angelita: la pupila descentrada da el
            alma — el reojo suplicante hacia arriba es el gesto del sabueso) */}
        <OjosRubber
          ojos={[{ cx: -2.4, cy: -8.4, r: 1.95 }, { cx: 2.4, cy: -8.4, r: 1.95 }]}
          mirar={[0.22, -0.08]}
          parpadea={vivo}
        />
        <g aria-hidden="true" fill="none" stroke={P.iris} strokeWidth="0.62" opacity="0.85">
          <circle cx="-2.4" cy="-8.4" r="1.52" />
          <circle cx="2.4" cy="-8.4" r="1.52" />
        </g>
        {/* PÁRPADO INFERIOR húmedo (el borde de "llanto" que da la súplica) */}
        <g aria-hidden="true" fill="none" stroke={RH_INK} strokeLinecap="round">
          <path d="M-4.05,-6.6 Q-2.4,-5.6 -0.75,-6.6" strokeWidth="0.5" opacity="0.5" />
          <path d="M4.05,-6.6 Q2.4,-5.6 0.75,-6.6" strokeWidth="0.5" opacity="0.5" />
        </g>
        {/* OREJAS LARGUÍSIMAS anchas y CAÍDAS — LÓBULOS reales (path de gota
            larga, no elipse genérica) que nacen ALTO en el cráneo y cuelgan
            hasta por debajo de la quijada ENMARCANDO la cara ("casi tapan el
            hocico"). LA seña del sabueso. Con penumbra interior y filo de luz
            (volumen del lóbulo que cuelga). Cada una con su vaivén propio
            (.beagle-oreja); el grupo .beagle-orejas las gobierna en olfatea.
            La derecha es la izquierda espejada (scale -1). */}
        <g className="beagle-orejas">
          {/* cada oreja cuelga con SU caída (asimetría viva — vara Angelita) */}
          {[false, true].map((espejo) => (
            <g key={espejo ? 'd' : 'i'} className={vivo ? 'beagle-oreja' : undefined}
              style={{ transformBox: 'fill-box', transformOrigin: 'center top', animationDelay: espejo ? '-1.7s' : '-0.4s' }}>
              <g transform={espejo ? 'scale(-1 1) rotate(3 -6.4 -11)' : 'rotate(-2 -6.4 -11)'}>
                <path d="M-4.1,-12.0 C-6.8,-11.8 -8.8,-9.2 -8.7,-5.5 C-8.6,-2.1 -7.1,0.5 -5.4,0.1 C-4.5,-0.1 -4.6,-2.8 -4.8,-5.6 C-5.0,-7.9 -4.7,-10.1 -4.1,-12.0 Z"
                  fill={P.canela} stroke={RH_INK} strokeWidth="1.2" strokeLinejoin="round" />
                {/* penumbra interior del lóbulo (el peso de la oreja que cuelga) */}
                <ellipse cx="-6.6" cy="-4.8" rx="1.45" ry="3.4"
                  transform="rotate(-5 -6.6 -4.8)" fill={P.canelaHondo} opacity="0.5" aria-hidden="true" />
                {/* filo de luz en el borde externo (volumen, no plano) */}
                <path d="M-4.9,-11.6 C-7.0,-11.3 -8.4,-8.9 -8.35,-6.0"
                  fill="none" stroke={P.canelaLuz} strokeWidth="0.5" strokeLinecap="round" opacity="0.6" aria-hidden="true" />
              </g>
            </g>
          ))}
        </g>
      </g>

      {/* Vestuario por clima+hora (RUANA de noche/frío) — solo con vestuario=true.
          Sombrero/sudor suprimidos (los perros jadean, no sudan). */}
      {ropa && (
        <AccesoriosClima
          estado={ropa}
          tronco={{ cx: 0, cy: 4.4, rx: PR.troncoRx, ry: PR.troncoRy }}
          cabeza={{ cx: 0, cy: -7.8, r: PR.cabezaR }}
          animated={vivo}
        />
      )}

      {/* Prop del mundo en la patica (entra curioso con su herramienta). */}
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
    'data-creature': BEAGLE_SLUG,
    'data-pose': vivo ? poseFx : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-visema': visema || undefined,
    'data-ruana': ropa?.ruana ? '1' : undefined,
    'data-mojado': ropa?.mojado ? '1' : undefined,
    'data-olfatea': olfateaFx ? '1' : undefined,
    'data-aulla': aullaFx ? '1' : undefined,
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
  // MODO PODER (standalone): aura CANELA DE RASTRO de 4 capas.
  if (poder) {
    return (
      <span
        className="is-powered-up beagle-poder"
        data-creature-poder={BEAGLE_SLUG}
        style={{ '--aura-color': auraDeBicho(BEAGLE_SLUG), display: 'inline-flex' }}
      >
        {svg}
        <AuraPoder />
      </span>
    );
  }
  return svg;
}

export default Beagle;
