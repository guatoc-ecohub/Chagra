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

/* MANCHAS del cuerpo: redondas, bien SEPARADAS, distribuidas por todo el
   tronco (la distribución dispersa es lo que lee "dálmata" de lejos). */
const MANCHAS = [
  { cx: -4.6, cy: -2.2, r: 1.3 },
  { cx: 3.9, cy: -3.4, r: 1.05 },
  { cx: 5.2, cy: 1.8, r: 1.35 },
  { cx: -5.6, cy: 3.6, r: 1.1 },
  { cx: -1.8, cy: 6.6, r: 1.0 },
  { cx: 2.6, cy: 8.6, r: 1.15 },
  { cx: -0.6, cy: 0.8, r: 0.85 },
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
    ? <BocaVisema cx={0} cy={-3.6} w={3.0} prof={1.1} visema={visema} />
    : (
      <g>
        <Sonrisa cx={0} cy={-3.5} w={3.0} prof={1.1} />
        {/* lengüita rosada asomando (jadeo feliz — grupo .dalmata-lengua) */}
        <g className={vivo ? 'dalmata-lengua' : undefined}
          style={{ transformBox: 'fill-box', transformOrigin: 'center top' }} aria-hidden="true">
          <path d="M-0.85,-3.2 Q0,-1.4 0.85,-3.2 Z" fill={P.lengua} stroke={RH_INK} strokeWidth="0.3" />
        </g>
      </g>
    );

  // ── CUERPO rubber-hose (atrás→adelante): aura, cola látigo moteada, patas
  //    traseras LARGAS, tronco esbelto blanco, MANCHAS (la firma), collar rojo,
  //    patas delanteras LARGAS, cabeza (orejas caídas moteadas + hocico LARGO +
  //    ojos alerta/cachetes/boca + trufa). `.crt-body` squashea (boil dálmata:
  //    brincón y elástico — perro joven).
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* aura viva (presencia cálida) */}
      <circle cx="0" cy="2" r={auraR} fill={P.cuerpo} opacity={auraOp} filter={`url(#${blur})`} />

      {/* COLA LÁTIGO moteada (larga y fina, al lado derecho). Wag suave idle;
          bate RÁPIDO en menea. Pivota desde su base en la grupa. */}
      <g className={vivo ? 'dalmata-cola' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'left bottom' }}>
        <path d="M6.8,6.6 C11.4,5.8 13.6,2.2 12.8,-2.6"
          fill="none" stroke={P.cuerpo} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M6.8,6.6 C11.4,5.8 13.6,2.2 12.8,-2.6"
          fill="none" stroke={RH_INK} strokeWidth="0.65" strokeLinecap="round" opacity="0.55" />
        {/* manchas de la cola (la firma llega hasta la punta) */}
        <Mancha cx={11.3} cy={4.4} r={0.75} fill={P.mancha} />
        <Mancha cx={13.1} cy={0.2} r={0.7} fill={P.mancha} />
      </g>

      {/* patas traseras LARGAS (esbeltas, con pie blanco). Se mecen suave. */}
      <Miembro d="M-5.2,7.4 C-6.6,9.8 -6.4,11.8 -5.2,13.0" ancho={2.8} punta={[-5.2, PR.pataLarga]} puntaR={1.9} pie sway={vivo} delay={-0.7} glove={P.vientre} />
      <Miembro d="M5.2,7.4 C6.6,9.8 6.4,11.8 5.2,13.0" ancho={2.8} punta={[5.2, PR.pataLarga]} puntaR={1.9} pie sway={vivo} delay={-1.0} glove={P.vientre} />

      {/* tronco BLANCO esbelto, más ALTO que ancho (atlético, casi cuadrado —
          la anti-silueta del beagle chato) */}
      <ellipse cx="0" cy="2.6" rx={PR.troncoRx} ry={PR.troncoRy}
        fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.4"
        style={{ filter: `drop-shadow(0 0 5px ${P.cuerpoGlow})` }} />
      {/* pecho aún más claro (el brillo del blanco) */}
      <path d="M0,-4.6 C3.4,-3.8 4.4,0.8 3.4,5.2 C2.0,7.8 -2.0,7.8 -3.4,5.2 C-4.4,0.8 -3.4,-3.8 0,-4.6 Z"
        fill={P.vientre} opacity="0.85" />

      {/* MANCHAS del cuerpo (negras, redondas, SEPARADAS — LA FIRMA). */}
      <g aria-hidden="true">
        {MANCHAS.map((m, i) => (
          <Mancha key={i} cx={m.cx} cy={m.cy} r={m.r} fill={P.mancha} />
        ))}
      </g>

      {/* COLLAR ROJO de perro de finca (con tachuelita dorada al lado). Va
          antes de la cabeza: el hocico largo cae encima. */}
      <g aria-hidden="true">
        <path d="M-4.9,-5.8 C-2.4,-4.3 2.4,-4.3 4.9,-5.8 L4.6,-4.1 C2.2,-2.8 -2.2,-2.8 -4.6,-4.1 Z"
          fill={P.collar} stroke={RH_INK} strokeWidth="0.55" strokeLinejoin="round" />
        <circle cx="3.1" cy="-3.9" r="0.62" fill={P.placa} stroke={RH_INK} strokeWidth="0.35" />
      </g>

      {/* patas delanteras LARGAS manguera, pivote en el HOMBRO para que
          celebra/señala las alcen desde el hombro. */}
      <Miembro clase="crt-brazo-l" origen="right top"
        d="M-6.0,-1.2 C-9.0,0.8 -9.9,4.8 -9.2,8.8" ancho={2.6} punta={[-9.2, 9.2]} puntaR={1.9} pie sway={vivo} delay={-0.15} glove={P.vientre} />
      <Miembro clase="crt-brazo-r" origen="left top"
        d="M6.0,-1.2 C9.0,0.8 9.9,4.8 9.2,8.8" ancho={2.6} punta={[9.2, 9.2]} puntaR={1.9} pie sway={vivo} delay={-0.45} glove={P.vientre} />

      {/* CABEZA (grupo propio .dalmata-cabeza para el head-tilt de `ladea`). */}
      <g className="dalmata-cabeza" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
        {/* OREJAS CAÍDAS moteadas (cuelgan a los lados; se alzan apenas al
            ladear). Grupo propio .dalmata-orejas. */}
        <g className="dalmata-orejas" style={{ transformBox: 'fill-box', transformOrigin: 'center top' }}>
          <g transform="rotate(-22 -5 -13)">
            <ellipse cx="-5.0" cy="-11.6" rx={PR.orejaRx} ry={PR.orejaRy} fill={P.oreja} stroke={RH_INK} strokeWidth="1.15" />
            <Mancha cx={-5.3} cy={-12.6} r={0.6} fill={P.mancha} />
            <Mancha cx={-4.7} cy={-10.2} r={0.5} fill={P.mancha} />
          </g>
          <g transform="rotate(22 5 -13)">
            <ellipse cx="5.0" cy="-11.6" rx={PR.orejaRx} ry={PR.orejaRy} fill={P.oreja} stroke={RH_INK} strokeWidth="1.15" />
            <Mancha cx={5.3} cy={-12.6} r={0.6} fill={P.mancha} />
            <Mancha cx={4.7} cy={-10.2} r={0.5} fill={P.mancha} />
          </g>
        </g>
        <circle cx="0" cy="-10.2" r={PR.cabezaR} fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.3" />
        {/* manchitas de la cabeza (pequeñas, a los lados — nunca tapan el ojo) */}
        <g aria-hidden="true">
          <Mancha cx={-3.9} cy={-13.4} r={0.7} fill={P.mancha} />
          <Mancha cx={4.1} cy={-12.8} r={0.6} fill={P.mancha} />
        </g>
        {/* HOCICO LARGO claro (la seña atlética de la raza: el morro baja BIEN
            por debajo de la cara redonda — nada de carita chata). Cuelga hasta
            y≈-1.7 (la cabeza termina en -4.9): eso es lo que lee "hocico largo". */}
        <path d="M-2.5,-8.4 C-3.0,-5.0 -2.0,-2.0 0,-1.7 C2.0,-2.0 3.0,-5.0 2.5,-8.4 C1.25,-7.2 -1.25,-7.2 -2.5,-8.4 Z"
          fill={P.hocico} opacity="0.95" />
        {/* chapetas (rubor amable) */}
        <Cachetes puntos={[{ cx: -4.2, cy: -7.6, r: 1.1 }, { cx: 4.2, cy: -7.6, r: 1.1 }]} vivo={vivo} />
        {boca}
        {/* trufa negra grande sobre el hocico largo */}
        <path d="M-1.3,-5.4 L1.3,-5.4 L0,-4.1 Z" fill={P.nariz} />
        {/* OJOS alerta y amables (café) */}
        <OjosRubber
          ojos={[{ cx: -2.5, cy: -11.3, r: 1.6 }, { cx: 2.5, cy: -11.3, r: 1.6 }]}
          mirar={[0, 0.12]}
          parpadea={vivo}
        />
        {/* iris café que enmarca la pupila (mirada alerta, no fiera) */}
        <g aria-hidden="true" fill="none" stroke={P.iris} strokeWidth="0.5" opacity="0.75">
          <circle cx="-2.5" cy="-11.3" r="1.22" />
          <circle cx="2.5" cy="-11.3" r="1.22" />
        </g>
      </g>

      {/* Vestuario por clima+hora (RUANA de noche/frío) — solo con vestuario=true.
          Sombrero/sudor van suprimidos (los perros jadean, no sudan). */}
      {ropa && (
        <AccesoriosClima
          estado={ropa}
          tronco={{ cx: 0, cy: 2.6, rx: PR.troncoRx, ry: PR.troncoRy }}
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
