import { useId, useRef } from 'react';
import './creatures.css';
import { useVidaIdle, useRitmoPropio, useMiradaUsted } from './useVidaIdle.js';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, BocaVisema, Miembro, RH_INK } from './_rubberhose.jsx';
import { ARDILLA_PALETA, ARDILLA_PROPORCION } from './faunaAndina.js';
import { cuerpoDeClima, ropaDeClimaBicho } from './creatureClimaCuerpo.js';
import { AccesoriosClima } from './AccesoriosClima.jsx';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { PropEnMano } from './PropEnMano.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';

/* Ardilla de cola roja andina — Notosciurus granatensis (clima TEMPLADO).
   Hermana rubber-hose de la abeja Angelita y del trío andino: compone el MISMO
   kit `_rubberhose.jsx` (ojos de goma, cachetes, sonrisa, miembros manguera) y
   hereda la MISMA fundación transversal — lip-sync (useLipSync → BocaVisema),
   modo poder (transformacion, ÁMBAR), ropa por clima (ropaDeClima), prop por
   mundo (PropEnMano) y line-boil (LineBoilFilter) — cero código duplicado.
   Solo cambia el ANIMAL y su CARÁCTER: pizpireta RUFA con la LÍNEA DORSAL oscura
   (su firma), COLA TUPIDA que se sacude, orejitas y DIENTES de roedor. Es de
   SUELO: se SIENTA (no vuela) — sin alas. ÁGIL, curiosa, rápida e INQUIETA: su
   boil es más VELOZ y nervioso que el de la abeja, la cola tiembla, la nariz
   olfatea y su gesto-FIRMA es la INSPECCIÓN INVERTIDA (se cuelga de cabeza a
   mirar). Roe semillas (roer/olfatear). La IDENTIDAD (paleta + proporciones)
   vive en `faunaAndina.js`; el CLIMA→cuerpo, en `creatureClimaCuerpo.js`. Es
   templada pero, como el resto de la familia, NUNCA suda (contrato compartido:
   se abriga de noche/frío, jamás gotea sudor). */
const VIEWBOX = '-18 -22 36 44';

export function Ardilla({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Ardilla de cola roja',
  /* Pose de VIDA (idle-life), equivalentes a las del resto de la familia: 'anda'
     (base) | 'celebra' (brinca con brazos en V + overshoot) | 'reposo' (respira)
     | 'señala' (se inclina al POI y apunta). Gestos species-agnostic (rh-g-*) en
     `creatures.css`; solo corren viva (animated). */
  pose = 'anda',
  animo = 'sereno',
  energia = 1,
  /* CLIMA REAL escrito en el cuerpo. Sin clima (avatares, catálogo) = neutro
     digno: la ardilla se ve EXACTA como siempre. */
  clima = null,
  enso = 'neutro',
  /* ── LIP-SYNC (sistema transversal, useLipSync) ────────────────────────────
     visema opcional ('V1'..'V4') que produce useLipSync desde el RMS del TTS:
     la boquita se abre al hablar (voz ágil y chillona). Sin visema (o 'V1') = la
     sonrisa de siempre → avatares/catálogo no cambian. El HOOK vive aparte; acá
     solo se consume. */
  visema = null,
  /* ── VESTUARIO por clima+hora (ropaDeClima) ───────────────────────────────
     OPT-IN: con vestuario=true la ardilla se abriga según el clima real (RUANA
     de noche/frío). Templada, pero del contrato compartido: NUNCA suda (el sudor
     se suprime aquí aunque el termómetro suba). Default false → los consumidores
     de `clima` existentes NO ven ropa nueva. */
  vestuario = false,
  tempC = undefined,
  /* ── INSPECCIÓN INVERTIDA (el gesto-FIRMA — se cuelga de cabeza a mirar) ────
     OPT-IN: la ardilla se voltea de cabeza y espía curiosa hacia los lados (su
     pose icónica de ardilla en el tronco). Su reacción-firma cuando husmea algo.
     Default false → avatar en pie sereno. */
  inspecciona = false,
  /* ── ROE (roer/olfatear — mordisquea una semilla) ──────────────────────────
     OPT-IN: la ardilla sostiene una bellota y la ROE a mordiscos rápidos (los
     incisivos castañetean, olfateo veloz). Default false. */
  roe = false,
  /* ── VIDA PROPIA (idle-cerebro v2 — la vara de Angelita) ───────────────────
     Default ON: un reloj con jitter hojea el repertorio de la especie
     (vidaEstados.js) — el bicho EXISTE aunque nadie le hable. Cada instancia
     parpadea a SU aire (ritmo propio) y sus pupilas SIGUEN su puntero/dedo
     cuando anda cerca. El cerebro CEDE ante el host (cualquier gesto manual
     lo apaga); animated=false, tier 'bajo' y reduced-motion lo apagan entero.
     vida={false} = el bicho de antes, idéntico. */
  vida = true,
  /* Device-tier (DR-3D-PERF-GAMABAJA): 'alto'|'medio' corren el rubber-hose
     pleno; 'bajo' apaga el idle continuo (boil + cola + olfateo) y deja los
     estados reactivos. Sin prop (standalone) = pleno. */
  tier,
  /* ── LÍNEA QUE RESPIRA (line-boil, Cuphead años 30 — LineBoilFilter) ────────
     OPT-IN: con lineBoil el CONTORNO de la ardilla vibra escalonado (~8fps) — el
     trazo "hierve" como dibujo animado clásico. Default false. Con animated=false
     o reduced-motion queda con seed fija (textura sin vibrar). */
  lineBoil = false,
  /* ── MODO PODER (transformación / power-up ÁMBAR — transformacion.css) ──────
     OPT-IN: con poder=true (standalone) la ardilla se envuelve en su aura ÁMBAR
     de 4 capas (glow, boost, ingravidez, corrientes) — su firma al "subir de
     nivel". En modo inline lo pone el host DOM; acá solo marcamos data-poder. */
  poder = false,
  /* ── PROP POR MUNDO (herramienta en la patita — propsPorMundo/PropEnMano) ────
     mundoId opcional: al ENTRAR a un mundo la ardilla carga su herramienta
     (agua→manguerita, suelo→lupa, animales→lazo, semillero→canasto…). Sin
     mundoId (o mundo sin prop) entra con las patitas libres. Va en su patita
     DERECHA (la cola tupida ocupa el flanco izquierdo). */
  mundoId = null,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const vivo = animated;
  const auraOp = Math.max(0.14, Math.min(0.44, 0.18 + 0.28 * (energia ?? 1)));
  const auraR = 7.8 + 1.5 * (energia ?? 1);

  // ═══ VIDA PROPIA (idle-cerebro + ritmo propio + mirada — vara Angelita v2).
  // El cerebro solo manda cuando el host no dirige (pose base, sin gestos
  // manuales ni lip-sync); sus momentos se funden con los props opt-in para
  // reusar TODO el CSS existente de los gestos-firma.
  const raizRef = useRef(null);
  const ritmoPropio = useRitmoPropio();
  const enBase = pose === 'anda' && !inspecciona && !roe && !visema;
  const momento = useVidaIdle('ardilla', vida && vivo && tier !== 'bajo' && enBase);
  useMiradaUsted(raizRef, vida && vivo && tier !== 'bajo');
  const inspeccionaFx = inspecciona || momento === 'inspecciona';
  const roeFx = roe || momento === 'roe';
  const poseFx = momento === 'reposo' ? 'reposo' : pose;
  const P = ARDILLA_PROPORCION;
  const C = ARDILLA_PALETA;

  // CLIMA → cuerpo (determinista). La ardilla no tiene alas (velocidadAlas 1: no
  // se usa). Sin perfil propio → usa el de referencia (defecto); su piso térmico
  // templado ya vive en el perfil de ROPA (ROPA_PERFIL_POR_BICHO.ardilla).
  const cuerpoClima = cuerpoDeClima(clima, { enso: /** @type {any} */ (enso), tier });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  // Vestuario por clima+hora (opt-in). CONTRATO COMPARTIDO: la ardilla NUNCA
  // suda — suprimimos sudor aquí (sin tocar la función compartida: su contrato/
  // tests siguen intactos). Sí se pone RUANA de noche/frío y su sombrerito al
  // sol (templada: se cubre, pero no gotea). Sin vestuario o sin clima → nada.
  const ropaBase = (vestuario && clima) ? ropaDeClimaBicho('ardilla', clima, { tempC }) : null;
  const ropa = ropaBase ? { ...ropaBase, sudor: false } : null;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {lineBoil && <LineBoilFilter id={boil} animated={vivo} />}
    </defs>
  );

  // PROP DEL MUNDO en la patita DERECHA (la cola ocupa el flanco izquierdo). La
  // punta del bracito derecho cae en ~(9.4, 7); posamos el prop ahí a escala de
  // ardilla (menudita). Sin mundoId o mundo sin prop → PropEnMano devuelve null.
  const propMundo = mundoId ? (
    <PropEnMano mundoId={mundoId} x={9.6} y={7.4} escala={0.58} ink={RH_INK} animated={vivo} />
  ) : null;

  // La BELLOTA que roe (solo con roe): entre las patitas, a la altura de la boca.
  const bellota = roeFx ? (
    <g className="ardilla-bellota" aria-hidden="true">
      <ellipse cx="0" cy="0.6" rx="1.7" ry="2.0" fill={C.bellota} stroke={RH_INK} strokeWidth="0.7" />
      <path d="M-1.7,-0.6 A1.7,1.4 0 0 1 1.7,-0.6 Z" fill="#5f3a17" stroke={RH_INK} strokeWidth="0.5" />
      <path d="M0,-2.0 L0,-3.0" stroke={RH_INK} strokeWidth="0.7" strokeLinecap="round" />
    </g>
  ) : null;

  // ── CUERPO rubber-hose (atrás→adelante): aura, COLA tupida, patas traseras,
  //    tronco rufo con vientre crema, línea DORSAL, bracitos, cabeza (orejas +
  //    ojos curiosos + hocico que olfatea + dientes de roedor). `.crt-body` es el
  //    nodo que squashea (boil idle, más VELOZ y nervioso en la ardilla). El
  //    grupo entero se INVIERTE con `inspecciona` (se cuelga de cabeza).
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* aura viva */}
      <circle cx="0" cy="2" r={auraR} fill={C.cuerpo} opacity={auraOp} filter={`url(#${blur})`} />

      {/* COLA TUPIDA (detrás de todo, flanco izquierdo, arquea sobre el lomo).
          Se sacude nerviosa (`.ardilla-cola`, pivote en la base). */}
      <g className={vivo ? 'ardilla-cola' : undefined}
        style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
        {/* pluma exterior */}
        <path
          d="M-2,11 C-9,11 -13.4,6 -12.8,-1 C-12.2,-8 -8.6,-14.6 -1.6,-16
             C-5.6,-17.4 -11.8,-15.6 -13.8,-10.6 C-15.8,-6 -16,1 -12.2,6.6
             C-9.6,10.2 -6,12 -2,11 Z"
          fill={C.cola} stroke={RH_INK} strokeWidth="1.3" strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 5px ${C.cuerpoGlow})` }} />
        {/* núcleo claro (volumen tupido) */}
        <path
          d="M-3,9 C-8.4,8.6 -11.4,4 -11,-1.6 C-10.5,-7.2 -7.6,-12.4 -2.6,-13.6
             C-6,-14 -9.8,-11.4 -11,-6.6 C-12.1,-2 -11.6,4 -8.4,7.6
             C-6.6,9.4 -4.6,9.6 -3,9 Z"
          fill={C.colaClara} opacity="0.7" />
        {/* mechones de la punta (tupida) */}
        <g stroke={RH_INK} strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.85">
          <path d="M-13.6,-10 l-1.6,-1.1" />
          <path d="M-15.2,-6 l-1.7,-0.4" />
          <path d="M-15.6,-1 l-1.8,0.3" />
          <path d="M-3.2,-15.6 l-0.6,-1.7" />
        </g>
      </g>

      {/* patas traseras (se sienta): plantas crema, detrás del tronco. Se mecen. */}
      <Miembro d="M-4.6,8.4 C-6.2,10 -6.6,11.6 -5.4,12.6" ancho={3.0} punta={[-5.4, 12.8]} puntaR={1.8} pie sway={vivo} delay={-0.6} />
      <Miembro d="M4.6,8.4 C6.2,10 6.6,11.6 5.4,12.6" ancho={3.0} punta={[5.4, 12.8]} puntaR={1.8} pie sway={vivo} delay={-0.9} />

      {/* tronco rufo con contorno grueso (la línea que respira con el boil) */}
      <ellipse cx="0" cy="2.4" rx={P.troncoRx} ry={P.troncoRy}
        fill={C.cuerpo} stroke={RH_INK} strokeWidth="1.4"
        style={{ filter: `drop-shadow(0 0 6px ${C.cuerpoGlow})` }} />
      {/* manto DORSAL oscuro sobre el lomo/hombros (la espalda vista de frente) */}
      <path d="M0,-5.4 C5.4,-5 6.6,-1.4 5.6,2.6 C3,-1 -3,-1 -5.6,2.6 C-6.6,-1.4 -5.4,-5 0,-5.4 Z"
        fill={C.dorsal} opacity="0.92" />
      {/* vientre crema (el pecho claro que sube y baja) */}
      <ellipse cx="0" cy="4.6" rx="4.4" ry="5.4" fill={C.panza} opacity="0.92" />
      <ellipse cx="0" cy="5.6" rx="2.6" ry="3.6" fill={C.vientre} opacity="0.85" />

      {/* bracitos manguera (patitas delanteras) con plantita crema, pivote en el
          HOMBRO para que celebra/señala los alcen. Se juntan al pecho (pose de
          ardilla que sostiene). */}
      <Miembro clase="crt-brazo-l" origen="right top"
        d="M-4.4,-0.8 C-6.6,0.8 -6.2,4.4 -2.6,5.2" ancho={2.4} punta={[-2.6, 5.4]} puntaR={1.5} pie sway={vivo} delay={-0.15} />
      <Miembro clase="crt-brazo-r" origen="left top"
        d="M4.4,-0.8 C6.6,0.8 6.2,4.4 2.6,5.2" ancho={2.4} punta={[2.6, 5.4]} puntaR={1.5} pie sway={vivo} delay={-0.4} />

      {/* la BELLOTA que roe (entre las patitas). */}
      {bellota}

      {/* orejitas (detrás de la cabeza, se mecen con follow-through) */}
      <g className={vivo ? 'rh-sway' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animationDelay: '-0.25s' }}>
        <path d="M-4.4,-12.4 C-4.9,-15.4 -3.6,-16.4 -2.2,-14.4 C-1.9,-13.2 -2.9,-12.4 -4.4,-12.4 Z"
          fill={C.cuerpo} stroke={RH_INK} strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M-3.9,-12.9 C-4.1,-14.4 -3.4,-14.9 -2.8,-13.9 Z" fill={C.oreja} />
      </g>
      <g className={vivo ? 'rh-sway' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animationDelay: '-0.55s' }}>
        <path d="M4.4,-12.4 C4.9,-15.4 3.6,-16.4 2.2,-14.4 C1.9,-13.2 2.9,-12.4 4.4,-12.4 Z"
          fill={C.cuerpo} stroke={RH_INK} strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M3.9,-12.9 C4.1,-14.4 3.4,-14.9 2.8,-13.9 Z" fill={C.oreja} />
      </g>

      {/* cabeza rufa con contorno */}
      <circle cx="0" cy="-9" r={P.cabezaR} fill={C.cuerpo} stroke={RH_INK} strokeWidth="1.3" />
      {/* LÍNEA DORSAL: la franja oscura por la coronilla/frente (la firma de la
          especie). En su grupo propio (.ardilla-dorsal) — identidad, no opt-in. */}
      <g className="ardilla-dorsal" fill={C.dorsal}>
        <path d="M-1.3,-13.8 C-0.5,-14.4 0.5,-14.4 1.3,-13.8 C1.0,-11.6 0.9,-9.6 0.7,-8.4
                 C0.3,-8.9 -0.3,-8.9 -0.7,-8.4 C-0.9,-9.6 -1.0,-11.6 -1.3,-13.8 Z" opacity="0.95" />
      </g>
      {/* chapetas + boca + dientes + hocico + ojos de goma curiosos */}
      <Cachetes puntos={[{ cx: -3.8, cy: -6.9, r: 1.2 }, { cx: 3.8, cy: -6.9, r: 1.2 }]} vivo={vivo} />
      {/* Boca: lip-sync si hay visema; si no, la sonrisita de goma de siempre. */}
      {visema
        ? <BocaVisema cx={0} cy={-6.0} w={2.8} prof={1.05} visema={visema} />
        : <Sonrisa cx={0} cy={-6.2} w={2.6} prof={1.05} />}
      {/* DIENTES de roedor: los dos incisivos bajo la boca (castañetean al roer). */}
      <g className="ardilla-dientes" style={{ transformBox: 'fill-box', transformOrigin: 'center top' }}>
        <rect x="-1.0" y="-5.5" width="0.9" height="1.7" rx="0.28" fill={C.diente} stroke={RH_INK} strokeWidth="0.35" />
        <rect x="0.1" y="-5.5" width="0.9" height="1.7" rx="0.28" fill={C.diente} stroke={RH_INK} strokeWidth="0.35" />
      </g>
      {/* hocico/trufa que OLFATEA (nariz que tiembla — inquieta). */}
      <g className={vivo ? 'ardilla-nariz' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <ellipse cx="0" cy="-7.4" rx="1.15" ry="0.9" fill={C.hocico} />
      </g>
      <OjosRubber
        ojos={[{ cx: -2.2, cy: -9.6, r: 1.75 }, { cx: 2.2, cy: -9.6, r: 1.75 }]}
        mirar={[0, 0.2]}
        parpadea={vivo}
      />

      {/* Vestuario por clima+hora (RUANA de noche/frío) — solo con vestuario=true.
          Sudor suprimido (contrato compartido: la ardilla nunca gotea). */}
      {ropa && (
        <AccesoriosClima
          estado={ropa}
          tronco={{ cx: 0, cy: 2.4, rx: P.troncoRx, ry: P.troncoRy }}
          cabeza={{ cx: 0, cy: -9, r: P.cabezaR }}
          animated={vivo}
        />
      )}

      {/* Prop del mundo en la patita (entra con su herramienta). */}
      {propMundo}
    </g>
  );

  // Antics de VIDA (períodos co-primos) SOLO viva; nodos aparte para no pisar el
  // boil de `.crt-body`. El CSS los apaga con RM / tier bajo / ánimo bajo / durante
  // los gestos (celebra/reposo/señala) y estados (inspecciona/roe).
  const conAntics = vivo ? (
    <g className="rh-antic">
      <g className="rh-travieso">{body}</g>
    </g>
  ) : body;
  // El line-boil (contorno que hierve) envuelve TODO el dibujo cuando se pide.
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{conAntics}</g> : conAntics;

  const estadoAttrs = {
    'data-creature': 'ardilla',
    'data-pose': vivo ? poseFx : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-visema': visema || undefined,
    'data-ruana': ropa?.ruana ? '1' : undefined,
    'data-mojado': ropa?.mojado ? '1' : undefined,
    'data-inspecciona': inspeccionaFx ? '1' : undefined,
    'data-roe': roeFx ? '1' : undefined,
    'data-vida': momento || undefined,
    'data-lineboil': lineBoil ? '1' : undefined,
    'data-prop': mundoId || undefined,
  };

  // El ritmo propio (parpadeo/dardeo por instancia) viaja como vars CSS.
  const estiloRaiz = { ...ritmoPropio, ...estiloClima };

  if (inline) {
    // En modo inline el power-up lo pone el host DOM; acá solo marcamos data-poder.
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
  // MODO PODER (standalone): lo envolvemos en su aura ÁMBAR de 4 capas
  // (transformacion.css: glow radial + boost + ingravidez + corrientes).
  if (poder) {
    return (
      <span
        className="is-powered-up ardilla-poder"
        data-creature-poder="ardilla"
        style={{ '--aura-color': auraDeBicho('ardilla'), display: 'inline-flex' }}
      >
        {svg}
        <AuraPoder />
      </span>
    );
  }
  return svg;
}

export default Ardilla;
