import { useId } from 'react';
import './creatures.css';
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
   tierra cálida: NUNCA suda (aguanta el calor sin sudar ni sombrero). */
const VIEWBOX = '-16 -20 32 40';

/* Roseta del jaguar: anillo oscuro con centro ocre (la firma de la especie —
   mancha CON centro, no el puntito del leopardo). Decorativa (aria-hidden en el
   grupo padre). */
function Roseta({ cx, cy, r = 1.5, ink, centro, opacity = 0.9 }) {
  return (
    <g opacity={opacity}>
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.88} fill="none" stroke={ink} strokeWidth={r * 0.46} />
      <circle cx={cx} cy={cy} r={r * 0.3} fill={centro} />
    </g>
  );
}

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
  const vivo = animated;
  const auraOp = Math.max(0.14, Math.min(0.42, 0.18 + 0.26 * (energia ?? 1)));
  const auraR = 8.5 + 1.6 * (energia ?? 1);

  // CLIMA → cuerpo (determinista, una vez por render): tinte + opacidad al
  // contorno. El jaguar no tiene alas (velocidadAlas siempre 1: no se usa).
  const cuerpoClima = cuerpoDeClima(clima, { enso, tier, perfil: PERFIL_JAGUAR });
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
  const boca = ruge ? (
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
        <Roseta cx={13.7} cy={-1.0} r={1.15} ink={P.roseta} centro={P.rosetaCentro} opacity={0.85} />
        <Roseta cx={11.4} cy={3.6} r={1.1} ink={P.roseta} centro={P.rosetaCentro} opacity={0.85} />
      </g>

      {/* orejas redondas de felino (detrás de la cabeza, se mecen con
          follow-through) */}
      <g className={vivo ? 'rh-sway' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animationDelay: '-0.2s' }}>
        <circle cx="-4.4" cy="-13.4" r={PR.orejaR} fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.2" />
        <circle cx="-4.4" cy="-13.4" r={PR.orejaR * 0.5} fill={P.oreja} />
      </g>
      <g className={vivo ? 'rh-sway' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animationDelay: '-0.5s' }}>
        <circle cx="4.4" cy="-13.4" r={PR.orejaR} fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.2" />
        <circle cx="4.4" cy="-13.4" r={PR.orejaR * 0.5} fill={P.oreja} />
      </g>

      {/* patas traseras (muslos musculosos con planta crema, detrás del tronco).
          Se mecen suave. */}
      <Miembro d="M-6.6,7.0 C-8.6,9.0 -8.8,10.8 -7.4,12.0" ancho={3.4} punta={[-7.4, 12.2]} puntaR={2.0} pie sway={vivo} delay={-0.7} />
      <Miembro d="M6.6,7.0 C8.6,9.0 8.8,10.8 7.4,12.0" ancho={3.4} punta={[7.4, 12.2]} puntaR={2.0} pie sway={vivo} delay={-1.0} />

      {/* tronco leonado musculoso con contorno grueso (la línea que respira con
          el boil) */}
      <ellipse cx="0" cy="2" rx={PR.troncoRx} ry={PR.troncoRy}
        fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.4"
        style={{ filter: `drop-shadow(0 0 6px ${P.cuerpoGlow})` }} />
      {/* vientre/pecho crema */}
      <path d="M0,-4.2 C4.2,-3.2 5.4,2 4.0,6.2 C2.4,9.0 -2.4,9.0 -4.0,6.2 C-5.4,2 -4.2,-3.2 0,-4.2 Z"
        fill={P.vientre} opacity="0.9" />

      {/* ROSETAS del cuerpo (manchas de centro ocre — la firma). Decorativas. */}
      <g aria-hidden="true">
        <Roseta cx={-5.4} cy={2.6} r={1.5} ink={P.roseta} centro={P.rosetaCentro} />
        <Roseta cx={-2.0} cy={5.0} r={1.35} ink={P.roseta} centro={P.rosetaCentro} />
        <Roseta cx={5.6} cy={1.4} r={1.5} ink={P.roseta} centro={P.rosetaCentro} />
        <Roseta cx={6.6} cy={4.6} r={1.15} ink={P.roseta} centro={P.rosetaCentro} opacity={0.8} />
        <Roseta cx={2.4} cy={-0.6} r={1.2} ink={P.roseta} centro={P.rosetaCentro} opacity={0.85} />
        <Roseta cx={-6.6} cy={-0.8} r={1.2} ink={P.roseta} centro={P.rosetaCentro} opacity={0.8} />
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
        <circle cx="0" cy="-8.2" r={PR.cabezaR} fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.3" />
        {/* hocico claro que baja al morro */}
        <path d="M-2.6,-6.6 C-1.2,-5.2 1.2,-5.2 2.6,-6.6 C2.8,-3.6 1.8,-2.0 0,-1.8 C-1.8,-2.0 -2.8,-3.6 -2.6,-6.6 Z"
          fill={P.hocico} opacity="0.95" />
        {/* rosetas de la frente/mejillas (la firma también en la cara) */}
        <g aria-hidden="true">
          <Roseta cx={-3.4} cy={-10.6} r={0.95} ink={P.roseta} centro={P.rosetaCentro} opacity={0.8} />
          <Roseta cx={3.4} cy={-10.6} r={0.95} ink={P.roseta} centro={P.rosetaCentro} opacity={0.8} />
          <Roseta cx={-4.8} cy={-7.6} r={0.85} ink={P.roseta} centro={P.rosetaCentro} opacity={0.7} />
          <Roseta cx={4.8} cy={-7.6} r={0.85} ink={P.roseta} centro={P.rosetaCentro} opacity={0.7} />
        </g>
        {/* CEJAS FIERAS del depredador (mirada intensa y focalizada): trazos
            angulados con el extremo INTERNO más bajo. Identidad (no opt-in); se
            fruncen más al rugir/acechar (CSS). En su grupo .jaguar-cejas. */}
        <g className="jaguar-cejas" stroke={RH_INK} strokeWidth="1.25" strokeLinecap="round" fill="none">
          <path d="M-5.0,-11.4 L-1.6,-10.3" />
          <path d="M5.0,-11.4 L1.6,-10.3" />
        </g>
        {/* chapetas + boca + trufa + ojos ámbar dentro de la cara */}
        <Cachetes puntos={[{ cx: -4.4, cy: -6.4, r: 1.2 }, { cx: 4.4, cy: -6.4, r: 1.2 }]} vivo={vivo} />
        {boca}
        {/* trufa (nariz) */}
        <path d="M-1.3,-4.7 L1.3,-4.7 L0,-3.5 Z" fill={P.nariz} />
        <OjosRubber
          ojos={[{ cx: -2.5, cy: -9.2, r: 1.7 }, { cx: 2.5, cy: -9.2, r: 1.7 }]}
          mirar={[0, 0.1]}
          parpadea={vivo}
        />
        {/* MIRADA FELINA ÁMBAR: iris que enmarca la pupila (sobre la esclerótica,
            fuera del negro de la pupila) → la intensidad del ojo de gato. */}
        <g aria-hidden="true" fill="none" stroke={P.iris} strokeWidth="0.55" opacity="0.85">
          <circle cx="-2.5" cy="-9.2" r="1.32" />
          <circle cx="2.5" cy="-9.2" r="1.32" />
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
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{conAntics}</g> : conAntics;

  const estadoAttrs = {
    'data-creature': JAGUAR_SLUG,
    'data-pose': vivo ? pose : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-visema': visema || undefined,
    'data-ruana': ropa?.ruana ? '1' : undefined,
    'data-mojado': ropa?.mojado ? '1' : undefined,
    'data-ruge': ruge ? '1' : undefined,
    'data-acecha': acecha ? '1' : undefined,
    'data-lineboil': lineBoil ? '1' : undefined,
    'data-prop': mundoId || undefined,
  };

  if (inline) {
    // En modo inline el power-up lo pone el host DOM (::before/mix-blend no
    // aplican a SVG); acá solo marcamos data-poder por si el host lo consulta.
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
