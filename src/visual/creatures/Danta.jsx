import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, BocaVisema, Miembro, RH_INK } from './_rubberhose.jsx';
import { DANTA_PALETA, DANTA_PROPORCION, DANTA_SLUG, PERFIL_DANTA } from './dantaIdentidad.js';
import { cuerpoDeClima, ropaDeClimaBicho } from './creatureClimaCuerpo.js';
import { AccesoriosClima } from './AccesoriosClima.jsx';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { PropEnMano } from './PropEnMano.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';

/* Danta de páramo — Tapirus pinchaque (el tapir andino, el mamífero grande del
   bosque altoandino y LA JARDINERA DEL BOSQUE: siembra semillas al andar).
   Hermana rubber-hose de la abeja Angelita, el oso y el borugo: compone el
   MISMO kit `_rubberhose.jsx` (ojos de goma, cachetes, sonrisa, miembros
   manguera) y hereda la MISMA fundación transversal — lip-sync (useLipSync →
   BocaVisema), modo poder (transformacion, aura VERDE SEMILLA), ropa por clima
   (ropaDeClima), prop por mundo (PropEnMano) y line-boil (LineBoilFilter) —
   cero código duplicado. Solo cambia el ANIMAL y su CARÁCTER: mole LANUDA
   pardo-negruzca, MANSA y monumental, con la firma doble del pinchaque — la
   TROMPA corta y flexible que tantea el aire (su seña de vida: ondula idle y
   HUSMEA en periscopio cuando algo le interesa) y el BORDE BLANCO de orejas y
   labios contra el pelaje oscuro. Es de SUELO: patas cortas de andar pesado,
   no vuela — sin alas. Su squash&stretch es LENTO y con peso (la mole asienta
   despacio, como el oso pero más honda). Su color de poder es el VERDE SEMILLA
   (lima tierno: todo lo que pisa, germina). La IDENTIDAD (paleta +
   proporciones) vive en `dantaIdentidad.js`; el CLIMA→cuerpo, en
   `creatureClimaCuerpo.js` con PERFIL_DANTA (lana que empapa despacio, mole
   que la niebla apenas difumina) — de tierra fría: NUNCA suda. */
const VIEWBOX = '-16 -20 32 40';

export function Danta({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Danta de páramo',
  /* Pose de VIDA (idle-life), species-agnostic (gestos rh-g-* de creatures.css):
     'anda' (base, con la trompa que ondula) | 'celebra' (brinca con bracitos en
     V + overshoot, versión pesada) | 'reposo' (respira hondo, plantada) |
     'señala' (se inclina al POI y apunta con la patita). Solo corren viva
     (animated); con animated=false o reduced-motion queda en fotograma digno. */
  pose = 'anda',
  animo = 'sereno',
  energia = 1,
  /* CLIMA REAL escrito en el cuerpo (perfil danta). Sin clima (avatares,
     catálogo) = neutro digno: la danta se ve EXACTO como siempre. */
  clima = null,
  enso = 'neutro',
  /* ── LIP-SYNC (sistema transversal, useLipSync) ────────────────────────────
     visema opcional ('V1'..'V4') que produce useLipSync desde el RMS del TTS:
     la boca (bajo la trompa) se abre cuando el agente narra, y la trompa se
     alza cortés para dejarla hablar (CSS por data-visema). Sin visema (o 'V1')
     = la sonrisa de siempre → avatares/catálogo no cambian. */
  visema = null,
  /* ── VESTUARIO por clima+hora (ropaDeClima) ───────────────────────────────
     OPT-IN: con vestuario=true la danta se abriga según el clima real (RUANA
     de noche/frío — es de tierra fría y lanuda, pero el frío del páramo cala).
     NUNCA suda (contrato de páramo): jamás sombrero ni sudor, aunque el
     termómetro suba. Default false → los consumidores de `clima` existentes NO
     ven ropa nueva. */
  vestuario = false,
  tempC = undefined,
  /* ── HUSMEA (la trompa en periscopio — su reacción-firma) ───────────────────
     OPT-IN: la TROMPA se alza y tantea el aire a lado y lado (el periscopio
     curioso del tapir) y las orejas de borde blanco se enderezan. Su seña
     inconfundible cuando algo huele a fruta o a visita. Default false →
     ondulación idle suave (avatar sereno). */
  husmea = false,
  /* ── RAMONEA (el otro gesto-firma de la trompita, hacia ABAJO) ──────────────
     OPT-IN: la cabeza baja mansa al pasto y la TROMPA PRENSIL se estira y
     curla a lado y lado agarrando brotes (así siembra el bosque al andar).
     Complemento del husmea (que sube en periscopio): ramonea BAJA. Si ambos
     llegan encendidos, gana husmea (la visita puede más que el pasto).
     Default false → nada cambia. */
  ramonea = false,
  /* ── CRÍA (guiño opcional): los tapires NACEN RAYADOS. Con cria=true el
     flanco lanudo luce las rayas/motas pálidas de bebé (líneas quebradas +
     motitas, el camuflaje de sotobosque). Solo pelaje — el tamaño lo pone el
     host con `size`. Default false → la adulta de siempre. */
  cria = false,
  /* Device-tier (DR-3D-PERF-GAMABAJA): 'alto'|'medio' corren el rubber-hose
     pleno; 'bajo' apaga el idle continuo (boil + trompa + orejas + cola) y
     deja los estados reactivos (husmea/ramonea). Sin prop (standalone:
     avatares, catálogo) = pleno. */
  tier,
  /* ── LÍNEA QUE RESPIRA (line-boil, Cuphead años 30 — LineBoilFilter) ────────
     OPT-IN: con lineBoil el CONTORNO de la danta vibra escalonado
     (feTurbulence + feDisplacement, ~8fps). Default false → los consumidores
     existentes NO cambian. Con animated=false o reduced-motion queda con seed
     fija. Capa MÁS cara del kit: reservada para su entrada heroica. */
  lineBoil = false,
  /* ── MODO PODER (transformación / power-up VERDE SEMILLA) ───────────────────
     OPT-IN: con poder=true (y en modo standalone) la danta se envuelve en su
     aura VERDE SEMILLA de 4 capas (glow, boost, ingravidez, corrientes) — su
     firma cuando "sube de nivel": la jardinera del bosque en pleno (todo lo
     que pisa, germina). El host lo enciende un rato con usePoderTemporal().
     En modo inline el power-up lo pone el host DOM. */
  poder = false,
  /* ── PROP POR MUNDO (herramienta en la patita — propsPorMundo/PropEnMano) ────
     mundoId opcional: al ENTRAR a un mundo la danta carga su herramienta
     (agua→manguerita, suelo→lupa, semillero→canasto…). Sin mundoId (o mundo
     sin prop) entra con las patitas libres. */
  mundoId = null,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const vivo = animated;
  const auraOp = Math.max(0.14, Math.min(0.4, 0.16 + 0.24 * (energia ?? 1)));
  const auraR = 9.0 + 1.6 * (energia ?? 1);

  // CLIMA → cuerpo (determinista, una vez por render): tinte + opacidad al
  // contorno. La danta no tiene alas (velocidadAlas siempre 1: no se usa).
  const cuerpoClima = cuerpoDeClima(clima, { enso: /** @type {any} */ (enso), tier, perfil: PERFIL_DANTA });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  // Vestuario por clima+hora (opt-in). Perfil de tierra fría: la RUANA de
  // noche/frío; NUNCA sombrero ni sudor (aunque suba el termómetro) — la danta
  // lanuda no se sobrecalienta. Los suprimimos aquí sin tocar la función
  // compartida (su contrato/tests siguen intactos). Sin vestuario/clima → nada.
  const ropaBase = (vestuario && clima) ? ropaDeClimaBicho(DANTA_SLUG, clima, { tempC }) : null;
  const ropa = ropaBase ? { ...ropaBase, sombrero: false, sudor: false } : null;

  const P = DANTA_PALETA;
  const PR = DANTA_PROPORCION;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {/* Line-boil (contorno que hierve) — solo se instancia si se pide. */}
      {lineBoil && <LineBoilFilter id={boil} animated={vivo} />}
    </defs>
  );

  // PROP DEL MUNDO en la patita izquierda. Sin mundoId o mundo sin prop →
  // PropEnMano devuelve null (patitas libres, nunca rompe la escena).
  const propMundo = mundoId ? (
    <PropEnMano mundoId={mundoId} x={-11.6} y={7.8} escala={0.72} ink={RH_INK} animated={vivo} />
  ) : null;

  // BOCA con LABIOS BLANCOS (la firma del pinchaque): visema (el agente narra)
  // o la sonrisa mansa de siempre. Vive en el morro claro, BAJO la trompa
  // (la puntita cuelga encima sin taparla).
  const boca = visema
    ? <BocaVisema cx={0} cy={-2.1} w={3.2} prof={1.1} visema={visema} />
    : <Sonrisa cx={0} cy={-2.2} w={3.0} prof={1.0} />;

  // ── CUERPO rubber-hose (atrás→adelante): aura, orejas de borde blanco,
  //    colita, patas traseras, tronco lanudo con lomo hondo, bracitos manguera, cabeza
  //    (cachetes + labios + boca + ojos dulces) y LA TROMPA encima de todo
  //    (grupo .danta-trompa: ondula idle, husmea en periscopio). `.crt-body`
  //    es el nodo que squashea (boil danta: LENTO y con peso de mole).
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* aura viva (presencia grande y mansa) */}
      <circle cx="0" cy="2" r={auraR} fill={P.cuerpo} opacity={auraOp} filter={`url(#${blur})`} />

      {/* OREJAS redondas de BORDE BLANCO (la firma), detrás de la cabeza; se
          enderezan al husmear. Grupo propio (.danta-orejas). */}
      <g className="danta-orejas" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
        <ellipse cx="-4.4" cy="-13.0" rx={PR.orejaR} ry={PR.orejaR * 1.1} fill={P.orejaBorde} stroke={RH_INK} strokeWidth="1.1" />
        <ellipse cx="-4.4" cy="-12.8" rx={PR.orejaR * 0.62} ry={PR.orejaR * 0.72} fill={P.cuerpo} />
        <ellipse cx="-4.4" cy="-12.7" rx={PR.orejaR * 0.3} ry={PR.orejaR * 0.4} fill={P.oreja} />
        <ellipse cx="4.4" cy="-13.0" rx={PR.orejaR} ry={PR.orejaR * 1.1} fill={P.orejaBorde} stroke={RH_INK} strokeWidth="1.1" />
        <ellipse cx="4.4" cy="-12.8" rx={PR.orejaR * 0.62} ry={PR.orejaR * 0.72} fill={P.cuerpo} />
        <ellipse cx="4.4" cy="-12.7" rx={PR.orejaR * 0.3} ry={PR.orejaR * 0.4} fill={P.oreja} />
      </g>

      {/* COLITA de tapir (corta, casi un botón — asoma por el flanco IZQUIERDO,
          DETRÁS del tronco, y se menea mansa: .danta-cola). El rasgo que
          faltaba de la silueta real del pinchaque: cola corta de mole. */}
      <g className="danta-cola" style={{ transformBox: 'fill-box', transformOrigin: 'right center' }}>
        <ellipse cx="-11.2" cy="0.9" rx={PR.colaR * 1.15} ry={PR.colaR * 0.75}
          fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.1"
          transform="rotate(-18 -11.2 0.9)" />
      </g>

      {/* patas traseras CORTAS de mole (con almohadilla clara). Se mecen suave. */}
      <Miembro d="M-6.8,7.4 C-8.4,9.2 -8.6,10.8 -7.4,12.0" ancho={3.6} punta={[-7.4, 12.2]} puntaR={2.0} pie sway={vivo} delay={-0.7} glove={P.labio} />
      <Miembro d="M6.8,7.4 C8.4,9.2 8.6,10.8 7.4,12.0" ancho={3.6} punta={[7.4, 12.2]} puntaR={2.0} pie sway={vivo} delay={-1.0} glove={P.labio} />

      {/* tronco lanudo pardo-negruzco con contorno grueso (la línea que respira
          con el boil) */}
      <ellipse cx="0" cy="2" rx={PR.troncoRx} ry={PR.troncoRy}
        fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.4"
        style={{ filter: `drop-shadow(0 0 6px ${P.cuerpoGlow})` }} />
      {/* lomo un tono más hondo (la lana densa del dorso) */}
      <path d="M-9.2,-2.2 C-4.4,-6.8 4.4,-6.8 9.2,-2.2 C6.2,-4.4 -6.2,-4.4 -9.2,-2.2 Z"
        fill={P.lomo} opacity="0.6" />
      {/* panza apenas más clara (mole discreta, nada de bib llamativo) */}
      <ellipse cx="0" cy="4.6" rx="5.6" ry="4.0" fill={P.panza} opacity="0.85" />
      {/* GUIÑO DE CRÍA (opt-in): las rayas quebradas + motitas pálidas con que
          nacen los tapires (camuflaje de sotobosque), sobre el flanco lanudo. */}
      {cria && (
        <g className="danta-cria" opacity="0.55">
          <path d="M-6.6,-1.4 C-6.2,0.6 -6.4,2.4 -7.0,4.0" stroke={P.cria} strokeWidth="1.0" fill="none" strokeLinecap="round" />
          <path d="M-2.3,-2.6 C-1.9,-0.4 -2.1,1.6 -2.7,3.4" stroke={P.cria} strokeWidth="1.0" fill="none" strokeLinecap="round" />
          <path d="M2.3,-2.6 C1.9,-0.4 2.1,1.6 2.7,3.4" stroke={P.cria} strokeWidth="1.0" fill="none" strokeLinecap="round" />
          <path d="M6.6,-1.4 C6.2,0.6 6.4,2.4 7.0,4.0" stroke={P.cria} strokeWidth="1.0" fill="none" strokeLinecap="round" />
          <circle cx="-4.5" cy="5.6" r="0.55" fill={P.cria} />
          <circle cx="4.5" cy="5.6" r="0.55" fill={P.cria} />
          <circle cx="0" cy="6.4" r="0.5" fill={P.cria} />
        </g>
      )}

      {/* bracitos manguera (patas delanteras cortas) con almohadilla clara,
          pivote en el HOMBRO para que celebra/señala los alcen desde ahí. */}
      <Miembro clase="crt-brazo-l" origen="right top"
        d="M-7.4,-1.0 C-10.2,0.6 -11.0,3.4 -10.0,6.0" ancho={3.4} punta={[-10.0, 6.3]} puntaR={2.0} pie sway={vivo} delay={-0.15} glove={P.labio} />
      <Miembro clase="crt-brazo-r" origen="left top"
        d="M7.4,-1.0 C10.2,0.6 11.0,3.4 10.0,6.0" ancho={3.4} punta={[10.0, 6.3]} puntaR={2.0} pie sway={vivo} delay={-0.45} glove={P.labio} />

      {/* CABEZA lanuda (grupo propio .danta-cabeza) */}
      <g className="danta-cabeza" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
        <circle cx="0" cy="-8.0" r={PR.cabezaR} fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.4" />
        {/* chapetas pardas claras (rubor manso) */}
        <Cachetes puntos={[{ cx: -4.2, cy: -5.6, r: 1.2 }, { cx: 4.2, cy: -5.6, r: 1.2 }]} vivo={vivo} />
        {/* MORRO de LABIOS BLANCOS del pinchaque (su firma): rompe la silueta
            de la cabeza hacia abajo (como el hocico del oso) y le da a la boca
            un escenario CLARO donde leerse contra el pelaje oscuro. */}
        <path d="M-3.2,-4.9 C-3.5,-2.3 -1.9,-1.0 0,-1.0 C1.9,-1.0 3.5,-2.3 3.2,-4.9 C2.4,-6.4 -2.4,-6.4 -3.2,-4.9 Z"
          fill={P.labio} stroke={RH_INK} strokeWidth="1.0" strokeLinejoin="round" />
        {boca}
        {/* ojos de goma pequeños y dulces (mirada mansa de mole tierna) */}
        <OjosRubber
          ojos={[{ cx: -2.7, cy: -9.4, r: 1.5 }, { cx: 2.7, cy: -9.4, r: 1.5 }]}
          mirar={[0, 0.14]}
          parpadea={vivo}
        />
        {/* LA TROMPA — la firma viva del tapir: el hocico-probóscide corto y
            flexible que cae del entrecejo SOBRE el morro claro y TANTEA. Un
            tono más clara que la cara (que se LEA contra el pelaje oscuro),
            con la puntita pálida y sus dos naricitas. Grupo propio
            (.danta-trompa): ondula idle; en husmea sube en periscopio (CSS).
            Pivote arriba (nace entre los ojos). */}
        <g className="danta-trompa" style={{ transformBox: 'fill-box', transformOrigin: 'center top' }}>
          <path d={`M-2.1,-7.8 C-2.3,-5.6 -1.7,-4.4 -1.0,-${7.8 - PR.trompaLargo}
                    L1.4,-${7.8 - PR.trompaLargo} C2.1,-5.0 2.3,-5.8 2.1,-7.8
                    C0.9,-8.8 -0.9,-8.8 -2.1,-7.8 Z`}
            fill={P.trompa} stroke={RH_INK} strokeWidth="1.2" strokeLinejoin="round" />
          {/* la puntita PÁLIDA y móvil (con sus dos naricitas): el remate que
              hace legible la trompa aun a 48 px */}
          <ellipse cx="0.25" cy={-(7.8 - PR.trompaLargo) - 0.1} rx="1.65" ry="1.05" fill={P.trompaPunta} stroke={RH_INK} strokeWidth="0.8" />
          <circle cx="-0.35" cy={-(7.8 - PR.trompaLargo) - 0.2} r="0.26" fill={RH_INK} opacity="0.85" />
          <circle cx="0.85" cy={-(7.8 - PR.trompaLargo) - 0.2} r="0.26" fill={RH_INK} opacity="0.85" />
        </g>
      </g>

      {/* Vestuario por clima+hora (RUANA de noche/frío) — solo con
          vestuario=true. Sombrero/sudor van suprimidos (la lanuda no suda). */}
      {ropa && (
        <AccesoriosClima
          estado={ropa}
          tronco={{ cx: 0, cy: 2, rx: PR.troncoRx, ry: PR.troncoRy }}
          cabeza={{ cx: 0, cy: -8.0, r: PR.cabezaR }}
          animated={vivo}
        />
      )}

      {/* Prop del mundo en la patita (entra mansa con su herramienta). */}
      {propMundo}
    </g>
  );

  // Antics de VIDA (períodos co-primos) SOLO viva; nodos aparte para no pisar
  // el boil de `.crt-body`. El CSS los apaga con RM / tier bajo / ánimo bajo /
  // durante los gestos (celebra/reposo/señala) y el estado husmea.
  const conAntics = vivo ? (
    <g className="rh-antic">
      <g className="rh-travieso">{body}</g>
    </g>
  ) : body;
  // El line-boil (contorno que hierve) envuelve TODO el dibujo cuando se pide.
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{conAntics}</g> : conAntics;

  const estadoAttrs = {
    'data-creature': DANTA_SLUG,
    'data-pose': vivo ? pose : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-visema': visema || undefined,
    'data-ruana': ropa?.ruana ? '1' : undefined,
    'data-mojado': ropa?.mojado ? '1' : undefined,
    'data-husmea': husmea ? '1' : undefined,
    'data-ramonea': (ramonea && !husmea) ? '1' : undefined,
    'data-cria': cria ? '1' : undefined,
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
  // MODO PODER (standalone): la envolvemos en su aura VERDE SEMILLA de 4 capas
  // (transformacion.css: glow radial + boost + ingravidez + corrientes). El
  // wrapper DOM es lo único que puede llevar ::before/mix-blend/corrientes.
  if (poder) {
    return (
      <span
        className="is-powered-up danta-poder"
        data-creature-poder={DANTA_SLUG}
        style={{ '--aura-color': auraDeBicho(DANTA_SLUG), display: 'inline-flex' }}
      >
        {svg}
        <AuraPoder />
      </span>
    );
  }
  return svg;
}

export default Danta;
