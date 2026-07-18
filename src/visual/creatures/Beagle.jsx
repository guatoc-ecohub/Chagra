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
   nariz es su vida) y la COLA ERGUIDA con PUNTA BLANCA (la "bandera" del
   cazador). Ojos GRANDES café con expresión dulce. Curioso, dulce,
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

  // ── CUERPO rubber-hose (atrás→adelante): aura, cola-BANDERA erguida, patas
  //    traseras CORTAS, tronco blanco chato con SILLA negra ribeteada de canela
  //    (el tricolor), paticas delanteras CORTAS, cabeza canela (orejotas caídas
  //    + LISTA blanca + hocico ancho + trufa grande + ojos grandes/cachetes/
  //    boca). `.crt-body` squashea (boil beagle: blandito y bonachón).
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* aura viva (presencia cálida canela) */}
      <circle cx="0" cy="3" r={auraR} fill={P.canela} opacity={auraOp} filter={`url(#${blur})`} />

      {/* COLA ERGUIDA con PUNTA BLANCA — la "bandera" del sabueso (SUBE, no
          cae: lo contrario de la cola-látigo del dálmata). Wag de bandera en
          idle; pivota desde su base en la grupa. */}
      <g className={vivo ? 'beagle-cola' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'left bottom' }}>
        <path d={`M7.8,1.6 C9.8,-1.2 10.6,-4.8 10.0,${PR.colaAlto + 0.6}`}
          fill="none" stroke={P.manto} strokeWidth="2.0" strokeLinecap="round" />
        <path d={`M7.8,1.6 C9.8,-1.2 10.6,-4.8 10.0,${PR.colaAlto + 0.6}`}
          fill="none" stroke={RH_INK} strokeWidth="0.6" strokeLinecap="round" opacity="0.5" />
        {/* LA PUNTA BLANCA (la bandera que se ve entre el monte) */}
        <circle cx="10.0" cy={PR.colaAlto} r="1.45" fill={P.colaPunta} stroke={RH_INK} strokeWidth="0.7" />
      </g>

      {/* patas traseras CORTAS (paticas rechonchas con pie blanco) */}
      <Miembro d="M-5.4,8.6 C-6.2,9.8 -6.0,10.8 -5.2,11.2" ancho={3.2} punta={[-5.2, PR.pataCorta]} puntaR={1.9} pie sway={vivo} delay={-0.7} />
      <Miembro d="M5.4,8.6 C6.2,9.8 6.0,10.8 5.2,11.2" ancho={3.2} punta={[5.2, PR.pataCorta]} puntaR={1.9} pie sway={vivo} delay={-1.0} />

      {/* tronco BLANCO chato y compacto, más ANCHO que alto (bajito de patas
          cortas — la anti-silueta del dálmata esbelto) */}
      <ellipse cx="0" cy="4" rx={PR.troncoRx} ry={PR.troncoRy}
        fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.4"
        style={{ filter: `drop-shadow(0 0 5px ${P.cuerpoGlow})` }} />
      {/* ribete CANELA bajo la silla (la transición del tricolor) */}
      <path d="M-9.2,2.6 C-4.6,-2.6 4.6,-2.6 9.2,2.6 C7.2,6.2 -7.2,6.2 -9.2,2.6 Z"
        fill={P.canela} opacity="0.85" />
      {/* SILLA NEGRA del lomo (LA FIRMA tricolor: el manto oscuro montado
          sobre el ribete canela y el fondo blanco) */}
      <path d="M-8.6,2.0 C-4.2,-2.4 4.2,-2.4 8.6,2.0 C6.6,4.8 -6.6,4.8 -8.6,2.0 Z"
        fill={P.manto} opacity="0.96" />
      {/* pecho/panza blanca (lo de abajo siempre blanco) */}
      <path d="M0,3.0 C3.8,3.6 4.8,6.2 3.6,8.6 C2.0,10.2 -2.0,10.2 -3.6,8.6 C-4.8,6.2 -3.8,3.6 0,3.0 Z"
        fill={P.cuerpo} opacity="0.95" />

      {/* FUEGO/canela en las PATAS DELANTERAS (el tricolor también baja a los
          hombros/brazos — la patita termina en pie BLANCO). Va bajo las patas
          para que el pie crema quede encima. */}
      <g aria-hidden="true">
        <ellipse cx="-6.8" cy="4.8" rx="2.1" ry="2.9" fill={P.canela} opacity="0.92" />
        <ellipse cx="6.8" cy="4.8" rx="2.1" ry="2.9" fill={P.canela} opacity="0.92" />
      </g>
      {/* paticas delanteras CORTAS y robustas, pivote en el HOMBRO. */}
      <Miembro clase="crt-brazo-l" origen="right top"
        d="M-6.6,2.4 C-8.6,4.0 -9.2,6.2 -8.6,8.4" ancho={3.2} punta={[-8.6, 8.8]} puntaR={2.0} pie sway={vivo} delay={-0.15} />
      <Miembro clase="crt-brazo-r" origen="left top"
        d="M6.6,2.4 C8.6,4.0 9.2,6.2 8.6,8.4" ancho={3.2} punta={[8.6, 8.8]} puntaR={2.0} pie sway={vivo} delay={-0.45} />

      {/* CABEZA (grupo propio .beagle-cabeza: baja al olfatear, sube al aullar). */}
      <g className="beagle-cabeza" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
        {/* OREJAS LARGUÍSIMAS anchas y CAÍDAS (canela) — tan largas que casi
            TAPAN el hocico en reposo: cuelgan hasta bien por debajo de la
            mejilla y su borde interno roza el morro. LA seña del sabueso. Cada
            una con su vaivén propio; el grupo .beagle-orejas las gobierna en
            olfatea (cuelgan adelante). */}
        <g className="beagle-orejas">
          <g className={vivo ? 'beagle-oreja' : undefined}
            style={{ transformBox: 'fill-box', transformOrigin: 'center top', animationDelay: '-0.4s' }}>
            <g transform="rotate(-13 -5.6 -10.0)">
              <ellipse cx="-5.6" cy="-5.6" rx={PR.orejaRx} ry={PR.orejaRy} fill={P.canela} stroke={RH_INK} strokeWidth="1.2" />
              <ellipse cx="-5.7" cy="-4.6" rx={PR.orejaRx * 0.55} ry={PR.orejaRy * 0.66} fill={P.canelaHondo} opacity="0.6" />
            </g>
          </g>
          <g className={vivo ? 'beagle-oreja' : undefined}
            style={{ transformBox: 'fill-box', transformOrigin: 'center top', animationDelay: '-1.7s' }}>
            <g transform="rotate(13 5.6 -10.0)">
              <ellipse cx="5.6" cy="-5.6" rx={PR.orejaRx} ry={PR.orejaRy} fill={P.canela} stroke={RH_INK} strokeWidth="1.2" />
              <ellipse cx="5.7" cy="-4.6" rx={PR.orejaRx * 0.55} ry={PR.orejaRy * 0.66} fill={P.canelaHondo} opacity="0.6" />
            </g>
          </g>
        </g>
        {/* cara CANELA (cabeza grande y dulce de sabueso) */}
        <circle cx="0" cy="-6.6" r={PR.cabezaR} fill={P.canela} stroke={RH_INK} strokeWidth="1.3" />
        {/* LISTA BLANCA que sube por el centro de la cara (del hocico a la
            frente, entre los ojos — la firma de la cara tricolor) */}
        <path d="M-1.4,-1.2 C-1.9,-5.2 -1.3,-9.4 0,-12.4 C1.3,-9.4 1.9,-5.2 1.4,-1.2 Z"
          fill={P.lista} opacity="0.95" />
        {/* HOCICO ANCHO y CUADRADO con belfos de sabueso (morro amplio y romo,
            nada fino — el morro cuadrado es firma de la raza) */}
        <path d="M-3.8,-4.7 C-4.1,-1.5 -2.1,-0.6 0,-0.6 C2.1,-0.6 4.1,-1.5 3.8,-4.7 C1.9,-3.3 -1.9,-3.3 -3.8,-4.7 Z"
          fill={P.hocico} opacity="0.96" />
        {/* la línea de los belfos (del centro de la trufa a la boca) */}
        <line x1="0" y1="-4.0" x2="0" y2="-2.8" stroke={RH_INK} strokeWidth="0.35" opacity="0.7" />
        {/* chapetas (rubor dulce) */}
        <Cachetes puntos={[{ cx: -4.3, cy: -4.6, r: 1.2 }, { cx: 4.3, cy: -4.6, r: 1.2 }]} vivo={vivo} />
        {boca}
        {/* TRUFA GRANDE negra (la nariz manda: el sabueso ES su nariz) —
            grupo propio .beagle-nariz (tiembla al olfatear) */}
        <g className={vivo ? 'beagle-nariz' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
          <ellipse cx="0" cy="-4.6" rx="1.6" ry="1.2" fill={P.nariz} />
          {/* el brillito húmedo de la trufa sana */}
          <circle cx="-0.5" cy="-4.95" r="0.36" fill="#fffdf7" opacity="0.7" />
        </g>
        {/* OJOS MUY GRANDES y REDONDOS café — la mirada dulce-suplicante ("de
            llanto") del beagle: su gancho de simpatía. */}
        <OjosRubber
          ojos={[{ cx: -2.8, cy: -7.7, r: 2.25 }, { cx: 2.8, cy: -7.7, r: 2.25 }]}
          mirar={[0, 0.1]}
          parpadea={vivo}
        />
        {/* iris café grande que enmarca la pupila (dulzura, no fiereza) */}
        <g aria-hidden="true" fill="none" stroke={P.iris} strokeWidth="0.6" opacity="0.75">
          <circle cx="-2.8" cy="-7.7" r="1.72" />
          <circle cx="2.8" cy="-7.7" r="1.72" />
        </g>
        {/* PÁRPADO INFERIOR húmedo (el borde de "llanto" que da la súplica) +
            CEJAS PREOCUPADAS con el interior alzado (la carita que ruega). */}
        <g aria-hidden="true" fill="none" stroke={RH_INK} strokeLinecap="round">
          <path d="M-4.7,-6.0 Q-2.8,-4.9 -0.9,-6.0" strokeWidth="0.5" opacity="0.5" />
          <path d="M0.9,-6.0 Q2.8,-4.9 4.7,-6.0" strokeWidth="0.5" opacity="0.5" />
          <path d="M-4.9,-10.0 Q-3.2,-10.8 -1.5,-10.6" strokeWidth="0.85" opacity="0.8" />
          <path d="M4.9,-10.0 Q3.2,-10.8 1.5,-10.6" strokeWidth="0.85" opacity="0.8" />
        </g>
      </g>

      {/* Vestuario por clima+hora (RUANA de noche/frío) — solo con vestuario=true.
          Sombrero/sudor suprimidos (los perros jadean, no sudan). */}
      {ropa && (
        <AccesoriosClima
          estado={ropa}
          tronco={{ cx: 0, cy: 4, rx: PR.troncoRx, ry: PR.troncoRy }}
          cabeza={{ cx: 0, cy: -6.6, r: PR.cabezaR }}
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
