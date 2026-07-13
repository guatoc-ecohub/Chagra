import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, BocaVisema, Miembro, RH_INK } from './_rubberhose.jsx';
import { OSO_PALETA, OSO_PROPORCION } from './faunaAndina.js';
import { cuerpoDeClima, PERFIL_OSO, ropaDeClimaBicho } from './creatureClimaCuerpo.js';
import { AccesoriosClima } from './AccesoriosClima.jsx';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { PropEnMano } from './PropEnMano.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';

/* Oso andino — Tremarctos ornatus (oso de anteojos, el único oso de Suramérica,
   GUARDIÁN DEL PÁRAMO). Hermano rubber-hose de la abeja Angelita: compone el
   MISMO kit `_rubberhose.jsx` (ojos de goma, cachetes, sonrisa, miembros
   manguera) y hereda la MISMA fundación transversal — lip-sync (useLipSync →
   BocaVisema), modo poder (transformacion), ropa por clima (ropaDeClima), prop
   por mundo (PropEnMano) y line-boil (LineBoilFilter) — cero código duplicado.
   Solo cambia el ANIMAL y su CARÁCTER: mole parda, PESADA y SERIA, con los
   ANTEOJOS crema (su firma) alrededor de los ojos, cejas de sabio gruñón, hocico
   claro y orejas redondas que se mecen. Es de SUELO: se SIENTA (no vuela) — sin
   alas. Su voz es de papá-noel (grave, cálida): la boca se abre AMPLIA al hablar.
   Su color de poder es el ROJO berserker (no el dorado de la abeja). La IDENTIDAD
   (paleta + proporciones) vive en `faunaAndina.js`; el CLIMA→cuerpo, en
   `creatureClimaCuerpo.js` con PERFIL_OSO (pelaje que empapa despacio, mole que
   la niebla apenas difumina, robusto ante la seca) — y de páramo: NUNCA suda. */
const VIEWBOX = '-16 -20 32 40';

export function OsoAndino({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Oso andino',
  /* Pose de VIDA (idle-life), equivalentes a las de Angelita: 'anda' (base) |
     'celebra' (brinca con brazos en V + overshoot) | 'reposo' (respira hondo,
     sentado) | 'señala' (se inclina al POI y apunta con la zarpa). Los gestos
     species-agnostic viven en `creatures.css` (rh-g-*) y solo corren viva
     (animated); con animated=false o reduced-motion queda en fotograma digno. */
  pose = 'anda',
  animo = 'sereno',
  energia = 1,
  /* CLIMA REAL escrito en el cuerpo (perfil oso). Sin clima (avatares, catálogo)
     = neutro digno: el oso se ve EXACTO como siempre. */
  clima = null,
  enso = 'neutro',
  /* ── LIP-SYNC (sistema transversal, useLipSync) ────────────────────────────
     visema opcional ('V1'..'V4') que produce useLipSync desde el RMS del TTS:
     la bocota se abre AMPLIA al hablar (voz grave de papá-noel). Sin visema (o
     'V1') = la sonrisa de siempre → avatares/catálogo no cambian. El HOOK vive
     aparte (no cuelga un AnalyserNode por instancia); acá solo se consume. */
  visema = null,
  /* ── VESTUARIO por clima+hora (ropaDeClima) ───────────────────────────────
     OPT-IN: con vestuario=true el oso se abriga según el clima real (RUANA
     andina de noche/frío del páramo). Es de páramo: NUNCA se sobrecalienta →
     jamás sombrero ni sudor (se suprimen aquí aunque el termómetro suba).
     Default false → los consumidores de `clima` existentes NO ven ropa nueva. */
  vestuario = false,
  tempC = undefined,
  /* ── RESOPLA (gruñido corporal — el sabio gruñón resopla) ──────────────────
     OPT-IN: el oso suelta un VAHO por la trufa y el cuerpo da un huff pesado
     (squash&stretch lento con peso). Su reacción-firma cuando gruñe/refunfuña.
     Default false → sin resoplido (avatar sereno). */
  resopla = false,
  /* ── RASCA (se rasca con la zarpa) ─────────────────────────────────────────
     OPT-IN: el oso se rasca la panza con la zarpa derecha (gesto de oso, pausado
     y entrañable). Default false. */
  rasca = false,
  /* Device-tier (DR-3D-PERF-GAMABAJA): 'alto'|'medio' corren el rubber-hose
     pleno; 'bajo' apaga el idle continuo (boil + follow-through) y deja los
     estados reactivos. Sin prop (standalone: avatares, catálogo) = pleno. */
  tier,
  /* ── LÍNEA QUE RESPIRA (line-boil, Cuphead años 30 — LineBoilFilter) ────────
     OPT-IN: con lineBoil el CONTORNO del oso vibra escalonado (feTurbulence +
     feDisplacement, ~8fps) — el trazo "hierve" como dibujo animado clásico.
     Default false → los consumidores existentes NO cambian. Con animated=false
     o reduced-motion queda con seed fija (textura sin vibrar). Capa MÁS cara del
     kit: reservada para su entrada heroica (galería, hero). */
  lineBoil = false,
  /* ── MODO PODER (transformación / power-up ROJO — transformacion.css) ───────
     OPT-IN: con poder=true (y en modo standalone) el oso se envuelve en su aura
     ROJA berserker de 4 capas (glow, boost, ingravidez, corrientes) — su firma
     cuando "sube de nivel". El host lo enciende un rato con usePoderTemporal().
     En modo inline el power-up lo pone el host DOM (::before/mix-blend no aplican
     a nodos SVG); acá solo marcamos data-poder por si el host lo consulta. */
  poder = false,
  /* ── PROP POR MUNDO (herramienta en la zarpa — propsPorMundo/PropEnMano) ─────
     mundoId opcional: al ENTRAR a un mundo el oso carga su herramienta
     (agua→manguerita, suelo→lupa/pala, animales→lazo, semillero→canasto…). Sin
     mundoId (o mundo sin prop) entra con las zarpas libres. Va en su zarpa
     IZQUIERDA (la carita es simétrica; el prop cae al lado libre del cuerpo). */
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
  // contorno. El oso no tiene alas (velocidadAlas siempre 1: no se usa).
  const cuerpoClima = cuerpoDeClima(clima, { enso, tier, perfil: PERFIL_OSO });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  // Vestuario por clima+hora (opt-in). Perfil oso de PÁRAMO: la RUANA de noche/
  // frío; NUNCA sombrero ni sudor (aunque suba el termómetro) — el oso no se
  // sobrecalienta. Los suprimimos aquí sin tocar la función compartida (su
  // contrato/tests siguen intactos). Sin vestuario o sin clima → nada.
  const ropaBase = (vestuario && clima) ? ropaDeClimaBicho('oso-andino', clima, { tempC }) : null;
  const ropa = ropaBase ? { ...ropaBase, sombrero: false, sudor: false } : null;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {/* Line-boil (contorno que hierve) — solo se instancia si se pide. */}
      {lineBoil && <LineBoilFilter id={boil} animated={vivo} />}
    </defs>
  );

  // VAHO del resoplido: dos motas claras que salen de la trufa y se disuelven
  // (el oso resopla — su gruñido corporal). CSS (crt-vaho-mota) las anima; con
  // animated=false / RM quedan colgando dignas. Opt-in (resopla).
  const vaho = resopla ? (
    <g className="crt-vaho" fill={OSO_PALETA.cremaClara} aria-hidden="true" opacity="0.7">
      <circle className={vivo ? 'crt-vaho-mota' : undefined} cx="2.6" cy="-4.4" r="1.1" />
      <circle className={vivo ? 'crt-vaho-mota' : undefined} style={{ animationDelay: '-0.7s' }} cx="3.6" cy="-3.2" r="0.85" />
    </g>
  ) : null;

  // PROP DEL MUNDO en la zarpa izquierda (el lado libre). El punta del brazo
  // izquierdo cae en ~(-10.2, 6.4); posamos el prop ahí, a escala de oso (mole
  // grande). Sin mundoId o mundo sin prop → PropEnMano devuelve null (zarpas
  // libres, nunca rompe la escena).
  const propMundo = mundoId ? (
    <PropEnMano mundoId={mundoId} x={-11.4} y={7.8} escala={0.72} ink={RH_INK} animated={vivo} />
  ) : null;

  // ── CUERPO rubber-hose (atrás→adelante): aura, orejas, patas, tronco pardo
  //    con pecho crema, bracitos manguera, cabeza (anteojos + cejas + ojos/
  //    cachetes/boca + hocico). `.crt-body` es el nodo que squashea (boil idle,
  //    más LENTO y PESADO en el oso — su masa asienta despacio).
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* aura viva */}
      <circle cx="0" cy="2" r={auraR} fill={OSO_PALETA.cuerpo} opacity={auraOp} filter={`url(#${blur})`} />

      {/* orejas redondas (detrás de la cabeza, se mecen con follow-through) */}
      <g className={vivo ? 'rh-sway' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animationDelay: '-0.2s' }}>
        <circle cx="-4.7" cy="-13.6" r={OSO_PROPORCION.orejaR} fill={OSO_PALETA.cuerpo} stroke={RH_INK} strokeWidth="1.2" />
        <circle cx="-4.7" cy="-13.6" r={OSO_PROPORCION.orejaR * 0.5} fill={OSO_PALETA.oreja} />
      </g>
      <g className={vivo ? 'rh-sway' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animationDelay: '-0.5s' }}>
        <circle cx="4.7" cy="-13.6" r={OSO_PROPORCION.orejaR} fill={OSO_PALETA.cuerpo} stroke={RH_INK} strokeWidth="1.2" />
        <circle cx="4.7" cy="-13.6" r={OSO_PROPORCION.orejaR * 0.5} fill={OSO_PALETA.oreja} />
      </g>

      {/* patas traseras (se sienta): muslos anchos con planta crema, detrás del
          tronco. Se mecen suave. */}
      <Miembro d="M-6.4,7.2 C-8.4,9.2 -8.6,11 -7.2,12.2" ancho={3.4} punta={[-7.2, 12.4]} puntaR={2.0} pie sway={vivo} delay={-0.7} />
      <Miembro d="M6.4,7.2 C8.4,9.2 8.6,11 7.2,12.2" ancho={3.4} punta={[7.2, 12.4]} puntaR={2.0} pie sway={vivo} delay={-1.0} />

      {/* tronco pardo con contorno grueso (la línea que respira con el boil) */}
      <ellipse cx="0" cy="2" rx={OSO_PROPORCION.troncoRx} ry={OSO_PROPORCION.troncoRy}
        fill={OSO_PALETA.cuerpo} stroke={RH_INK} strokeWidth="1.4"
        style={{ filter: `drop-shadow(0 0 6px ${OSO_PALETA.cuerpoGlow})` }} />
      {/* pecho/panza crema (el pelaje claro del pecho) */}
      <path d="M0,-4.4 C4.4,-3.4 5.6,2 4.2,6.4 C2.6,9.4 -2.6,9.4 -4.2,6.4 C-5.6,2 -4.4,-3.4 0,-4.4 Z"
        fill={OSO_PALETA.panza} opacity="0.9" />
      <ellipse cx="0" cy="3.4" rx="3.2" ry="4.2" fill={OSO_PALETA.crema} opacity="0.85" />

      {/* bracitos manguera (zarpas) con planta crema, pivote en el HOMBRO para
          que celebra/señala/rasca los alcen desde el hombro (no del centro del
          bbox). El derecho (crt-brazo-r) es el que rasca la panza. */}
      <Miembro clase="crt-brazo-l" origen="right top"
        d="M-7.2,-1.4 C-10.2,0.2 -11.2,3.2 -10.2,6.0" ancho={3.2} punta={[-10.2, 6.4]} puntaR={2.1} pie sway={vivo} delay={-0.15} />
      <Miembro clase="crt-brazo-r" origen="left top"
        d="M7.2,-1.4 C10.2,0.2 11.2,3.2 10.2,6.0" ancho={3.2} punta={[10.2, 6.4]} puntaR={2.1} pie sway={vivo} delay={-0.45} />

      {/* cabeza parda con contorno */}
      <circle cx="0" cy="-8.2" r={OSO_PROPORCION.cabezaR} fill={OSO_PALETA.cuerpo} stroke={RH_INK} strokeWidth="1.3" />
      {/* ANTEOJOS crema: los anillos claros alrededor de los ojos (la firma de la
          especie), dibujados DETRÁS de los ojos de goma. */}
      <g fill={OSO_PALETA.crema} opacity="0.95">
        <ellipse cx="-2.5" cy="-9.0" rx="2.6" ry="3.0" />
        <ellipse cx="2.5" cy="-9.0" rx="2.6" ry="3.0" />
        {/* puente + hocico crema que baja al morro */}
        <path d="M-2.2,-6.6 C-1,-5.4 1,-5.4 2.2,-6.6 C2.4,-4 1.6,-2.4 0,-2.2 C-1.6,-2.4 -2.4,-4 -2.2,-6.6 Z" />
      </g>
      {/* CEJAS del sabio gruñón (ceño serio): trazos gruesos sobre los anteojos,
          con el extremo INTERNO más bajo (mirada brava pero noble). Dan la
          EXPRESIVIDAD de los anteojos — la cara del guardián serio. En un grupo
          propio (.oso-cejas) que se frunce más cuando resopla (gruñe). */}
      <g className="oso-cejas" stroke={RH_INK} strokeWidth="1.4" strokeLinecap="round" fill="none">
        <path d="M-4.7,-12.0 C-3.4,-12.5 -2.1,-12.2 -1.3,-11.4" />
        <path d="M4.7,-12.0 C3.4,-12.5 2.1,-12.2 1.3,-11.4" />
      </g>
      {/* chapetas + boca + trufa + ojos de goma dentro de los anteojos */}
      <Cachetes puntos={[{ cx: -4.4, cy: -6.6, r: 1.25 }, { cx: 4.4, cy: -6.6, r: 1.25 }]} vivo={vivo} />
      {/* Boca AMPLIA (voz grave de papá-noel): lip-sync si hay visema; si no, la
          sonrisa de goma de siempre. Más ancha que la de la abeja (w=3.6). */}
      {visema
        ? <BocaVisema cx={0} cy={-3.4} w={3.6} prof={1.35} visema={visema} />
        : <Sonrisa cx={0} cy={-3.6} w={3.4} prof={1.3} />}
      {/* trufa (nariz) */}
      <ellipse cx="0" cy="-4.6" rx="1.5" ry="1.15" fill={OSO_PALETA.hocico} />
      <OjosRubber
        ojos={[{ cx: -2.5, cy: -9.2, r: 1.7 }, { cx: 2.5, cy: -9.2, r: 1.7 }]}
        mirar={[0, 0.28]}
        parpadea={vivo}
      />

      {/* Vestuario por clima+hora (RUANA de noche/frío del páramo) — solo con
          vestuario=true. Sombrero/sudor van suprimidos (el oso no se acalora). */}
      {ropa && (
        <AccesoriosClima
          estado={ropa}
          tronco={{ cx: 0, cy: 2, rx: OSO_PROPORCION.troncoRx, ry: OSO_PROPORCION.troncoRy }}
          cabeza={{ cx: 0, cy: -8.2, r: OSO_PROPORCION.cabezaR }}
          animated={vivo}
        />
      )}

      {/* Prop del mundo en la zarpa (entra heroico con su herramienta). */}
      {propMundo}

      {/* Vaho del resoplido (el gruñido corporal). */}
      {vaho}
    </g>
  );

  // Antics de VIDA (períodos co-primos) SOLO viva; nodos aparte para no pisar
  // el boil de `.crt-body`. El CSS los apaga con RM / tier bajo / ánimo bajo /
  // durante los gestos (celebra/reposo/señala) y estados (resopla/rasca).
  const conAntics = vivo ? (
    <g className="rh-antic">
      <g className="rh-travieso">{body}</g>
    </g>
  ) : body;
  // El line-boil (contorno que hierve) envuelve TODO el dibujo cuando se pide:
  // el feDisplacementMap desplaza el trazo entero (Cuphead). Grupo aparte para
  // no colisionar con el glow del `.crt-body` (dos filtros, nodos distintos).
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{conAntics}</g> : conAntics;

  const estadoAttrs = {
    'data-creature': 'oso-andino',
    'data-pose': vivo ? pose : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-visema': visema || undefined,
    'data-ruana': ropa?.ruana ? '1' : undefined,
    'data-mojado': ropa?.mojado ? '1' : undefined,
    'data-resopla': resopla ? '1' : undefined,
    'data-rasca': rasca ? '1' : undefined,
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
  // MODO PODER (standalone): lo envolvemos en su aura ROJA berserker de 4 capas
  // (transformacion.css: glow radial + boost + ingravidez + corrientes). El
  // wrapper DOM es lo único que puede llevar ::before/mix-blend/corrientes.
  if (poder) {
    return (
      <span
        className="is-powered-up oso-poder"
        data-creature-poder="oso-andino"
        style={{ '--aura-color': auraDeBicho('oso-andino'), display: 'inline-flex' }}
      >
        {svg}
        <AuraPoder />
      </span>
    );
  }
  return svg;
}

export default OsoAndino;
