import { useId, useRef } from 'react';
import './creatures.css';
import { useVidaIdle, useRitmoPropio, useMiradaUsted } from './useVidaIdle.js';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, BocaVisema, Miembro, RH_INK } from './_rubberhose.jsx';
import { cuerpoDeClima, ropaDeClimaBicho } from './creatureClimaCuerpo.js';
import { AccesoriosClima } from './AccesoriosClima.jsx';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { PropEnMano } from './PropEnMano.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';

/* Perezoso de tres dedos — Bradypus variegatus (perezoso de garganta parda, de
   clima templado). Hermano rubber-hose de la abeja Angelita y del oso: compone
   el MISMO kit `_rubberhose.jsx` (ojos de goma, cachetes, sonrisa, miembros
   manguera) y hereda la MISMA fundación transversal — lip-sync (useLipSync →
   BocaVisema), modo poder (transformacion), ropa por clima (ropaDeClima), prop
   por mundo (PropEnMano) y line-boil (LineBoilFilter) — cero código duplicado.
   Solo cambia el ANIMAL y su CARÁCTER: CUELGA de una rama por sus GARRAS LARGAS
   curvas, con ANTIFAZ oscuro cruzando los ojos (su firma), TINTE VERDOSO de
   algas en el pelo y una SONRISA SERENA permanente. Su gracia es la QUIETUD
   EXTREMA: todo en cámara lenta — parpadeo larguísimo, mecerse pausado desde la
   rama, respiración honda. Es el más LENTO y ZEN del grupo. Su color de poder es
   el TURQUESA/teal (distinto del verde de la rana): irónicamente el perezoso
   "se activa" también en slow-motion. La IDENTIDAD (paleta + proporciones) vive
   acá inline (self-contained); el CLIMA→cuerpo, en `creatureClimaCuerpo.js` con
   PERFIL_PEREZOSO (pelaje templado que empapa despacio, mole que la niebla apenas
   difumina) — y NUNCA suda: la calma total no se acalora. */
const VIEWBOX = '-15 -20 30 39';

/* Identidad de especie como datos (self-contained: no toca la del trío andino). */
export const PEREZOSO_PALETA = {
  cuerpo: '#93876a',        // pelaje pardo-grisáceo templado
  cuerpoGlow: 'rgba(122,138,92,0.62)', // el halo tira a VERDOSO (algas)
  panza: '#a89a78',         // vientre un tono más claro
  alga: '#8caf57',          // TINTE VERDOSO de las algas en el pelo (su firma)
  algaClara: '#a9c77a',
  crema: '#ece0c2',         // cara/hocico crema
  cremaClara: '#f6eed6',
  antifaz: '#4f3a26',       // el ANTIFAZ oscuro que cruza los ojos (su firma)
  hocico: '#3a2a1c',        // trufa
  garra: '#33261a',         // garras largas curvas (oscuras) — su firma
  rama: '#6b4a30',          // la rama de la que cuelga
  hoja: '#5f9e46',          // brotes de la rama
};
export const PEREZOSO_PROPORCION = {
  troncoRx: 8.4,
  troncoRy: 8.2,
  cabezaR: 6.2,
};

/* Perfil de CLIMA→cuerpo del perezoso (templado). Sin alas; pelaje que empapa
   despacio; mole media (la niebla lo difumina a medias); aguanta algo la seca. */
const PERFIL_PEREZOSO = Object.freeze({
  alas: false, humedad: 0.75, difusa: 0.5, sequia: 0.5,
});

/* Manchas de ALGA (el tinte verdoso del pelo) sobre el dorso pardo. */
const ALGAS = [
  { cx: -5.2, cy: 0.4, rx: 2.0, ry: 1.5, c: 'alga' },
  { cx: 4.8, cy: 2.2, rx: 2.2, ry: 1.6, c: 'algaClara' },
  { cx: -1.4, cy: 5.4, rx: 1.8, ry: 1.3, c: 'alga' },
  { cx: 5.4, cy: -1.4, rx: 1.3, ry: 1.1, c: 'algaClara' },
];

export function Perezoso({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Perezoso de tres dedos',
  /* Pose de VIDA (idle-life), equivalentes a las de Angelita: 'anda' (base) |
     'celebra' (brinco con overshoot) | 'reposo' (respira colgado) | 'señala'
     (se inclina al POI y apunta con la garra). Los gestos species-agnostic viven
     en `creatures.css` (rh-g-*) y solo corren viva (animated); con animated=false
     o reduced-motion queda en un fotograma digno colgando de la rama. */
  pose = 'anda',
  animo = 'sereno',
  energia = 1,
  /* CLIMA REAL escrito en el cuerpo (perfil perezoso). Sin clima (avatares,
     catálogo) = neutro digno: el perezoso se ve EXACTO como siempre. */
  clima = null,
  enso = 'neutro',
  /* ── LIP-SYNC (sistema transversal, useLipSync) ────────────────────────────
     visema opcional ('V1'..'V4') que produce useLipSync desde el RMS del TTS: la
     boca se abre LENTA cuando el agente narra. Sin visema (o 'V1') = la sonrisa
     serena de siempre → avatares/catálogo no cambian. El HOOK vive aparte; acá
     solo se consume. */
  visema = null,
  /* ── VESTUARIO por clima+hora (ropaDeClima) ───────────────────────────────
     OPT-IN: con vestuario=true el perezoso se abriga según el clima real (RUANA
     de noche/frío). NUNCA suda (la calma total no se acalora): sombrero y sudor
     se suprimen aquí aunque suba el termómetro. Default false → los consumidores
     de `clima` existentes NO ven ropa nueva. */
  vestuario = false,
  tempC = undefined,
  /* ── BOSTEZA/DORMITA (dormilón zen — su reacción-firma) ────────────────────
     OPT-IN: al perezoso se le escapan unas "Z" que flotan LENTÍSIMO (cabeceo de
     sueño). Su firma serena cuando dormita. Default false → avatar despierto. */
  dormita = false,
  /* ── ESTIRA (estiramiento en cámara lenta) ─────────────────────────────────
     OPT-IN: el cuerpo se ALARGA despacio y SOSTIENE el estirón (el clásico
     bostezo-estiramiento del perezoso, lentísimo). Default false. */
  estira = false,
  /* ── VIDA PROPIA (idle-cerebro v2 — la vara de Angelita) ───────────────────
     Default ON: un reloj con jitter hojea el repertorio de la especie
     (vidaEstados.js) — el bicho EXISTE aunque nadie le hable. Cada instancia
     parpadea a SU aire (ritmo propio) y sus pupilas SIGUEN su puntero/dedo
     cuando anda cerca. El cerebro CEDE ante el host (cualquier gesto manual
     lo apaga); animated=false, tier 'bajo' y reduced-motion lo apagan entero.
     vida={false} = el bicho de antes, idéntico. */
  vida = true,
  /* Device-tier (DR-3D-PERF-GAMABAJA): 'alto'|'medio' corren el rubber-hose
     pleno; 'bajo' apaga el idle continuo (boil + mecerse) y deja los estados
     reactivos. Sin prop (standalone: avatares, catálogo) = pleno. */
  tier,
  /* ── LÍNEA QUE RESPIRA (line-boil, Cuphead años 30 — LineBoilFilter) ────────
     OPT-IN: con lineBoil el CONTORNO del perezoso vibra MUY LENTO (feTurbulence +
     feDisplacement, seed rotando pausada) — el trazo "hierve" en cámara lenta,
     fiel a su carácter. Default false. Con animated=false o reduced-motion queda
     con seed fija (textura sin vibrar). */
  lineBoil = false,
  /* ── MODO PODER (transformación / power-up TURQUESA — transformacion.css) ───
     OPT-IN: con poder=true (standalone) el perezoso se envuelve en su aura
     TURQUESA de 4 capas (glow, boost, ingravidez, corrientes) — su firma al
     "subir de nivel" (irónicamente, también en cámara lenta). En modo inline el
     power-up lo pone el host DOM (::before/mix-blend no aplican a nodos SVG);
     acá solo marcamos data-poder por si el host lo consulta. */
  poder = false,
  /* ── PROP POR MUNDO (herramienta en la garra — propsPorMundo/PropEnMano) ─────
     mundoId opcional: al ENTRAR a un mundo el perezoso carga su herramienta
     (agua→manguerita, suelo→lupa, animales→lazo, semillero→canasto…). Sin
     mundoId (o mundo sin prop) entra con las garras libres. */
  mundoId = null,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const vivo = animated;
  const auraOp = Math.max(0.14, Math.min(0.4, 0.16 + 0.24 * (energia ?? 1)));
  const auraR = 8.2 + 1.5 * (energia ?? 1);

  // ═══ VIDA PROPIA (idle-cerebro + ritmo propio + mirada — vara Angelita v2).
  // El cerebro solo manda cuando el host no dirige (pose base, sin gestos
  // manuales ni lip-sync); sus momentos se funden con los props opt-in para
  // reusar TODO el CSS existente de los gestos-firma.
  const raizRef = useRef(null);
  const ritmoPropio = useRitmoPropio();
  const enBase = pose === 'anda' && !dormita && !estira && !visema;
  const momento = useVidaIdle('perezoso', vida && vivo && tier !== 'bajo' && enBase);
  useMiradaUsted(raizRef, vida && vivo && tier !== 'bajo');
  const dormitaFx = dormita || momento === 'dormita';
  const estiraFx = estira || momento === 'estira';
  const poseFx = momento === 'reposo' ? 'reposo' : pose;

  // CLIMA → cuerpo (determinista, una vez por render): tinte + opacidad al
  // contorno. El perezoso no tiene alas (velocidadAlas siempre 1: no se usa).
  const cuerpoClima = cuerpoDeClima(clima, { enso, tier, perfil: PERFIL_PEREZOSO });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  // Vestuario por clima+hora (opt-in). La RUANA de noche/frío; NUNCA sombrero ni
  // sudor (la calma total no se acalora) — se suprimen aquí sin tocar la función
  // compartida (su contrato/tests siguen intactos). Sin vestuario o sin clima → nada.
  const ropaBase = (vestuario && clima) ? ropaDeClimaBicho('perezoso', clima, { tempC }) : null;
  const ropa = ropaBase ? { ...ropaBase, sombrero: false, sudor: false } : null;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {/* Line-boil (contorno que hierve) — MUY LENTO (dur alto): su carácter. */}
      {lineBoil && <LineBoilFilter id={boil} animated={vivo} dur="1.2s" />}
    </defs>
  );

  // "Z" del sueño: tres zetas que flotan LENTO y se disuelven (el perezoso
  // dormita). CSS (perezoso-zzz-mota) las anima; con animated=false / RM quedan
  // colgando dignas. Opt-in (dormita).
  const zzz = dormitaFx ? (
    <g className="perezoso-zzz" fill="none" stroke={RH_INK} strokeWidth="0.9"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" opacity="0.75">
      <path className={vivo ? 'perezoso-zzz-mota' : undefined} d="M2,-12 h2 l-2,2 h2" />
      <path className={vivo ? 'perezoso-zzz-mota' : undefined} style={{ animationDelay: '-1.2s' }} d="M3.6,-14 h1.6 l-1.6,1.6 h1.6" />
      <path className={vivo ? 'perezoso-zzz-mota' : undefined} style={{ animationDelay: '-2.4s' }} d="M5,-15.6 h1.3 l-1.3,1.3 h1.3" />
    </g>
  ) : null;

  // PROP DEL MUNDO en la garra izquierda (el lado libre). La punta del brazo
  // izquierdo cae en ~(-6.4, 6.4); posamos el prop ahí, a escala de perezoso.
  // Sin mundoId o mundo sin prop → PropEnMano devuelve null (garras libres).
  const propMundo = mundoId ? (
    <PropEnMano mundoId={mundoId} x={-7.4} y={7.6} escala={0.66} ink={RH_INK} animated={vivo} />
  ) : null;

  // Tres garras curvas hacia la rama (la firma del perezoso): grupos de trazos.
  const garraRama = (x, s) => (
    <g fill="none" stroke={PEREZOSO_PALETA.garra} strokeWidth="1.5" strokeLinecap="round">
      <path d={`M${x - 1.0 * s},-15.0 C${x - 1.8 * s},-16.4 ${x - 1.6 * s},-17.6 ${x - 0.6 * s},-18.0`} />
      <path d={`M${x},-15.0 C${x - 0.6 * s},-16.6 ${x - 0.2 * s},-17.8 ${x + 0.8 * s},-18.0`} />
      <path d={`M${x + 1.0 * s},-14.8 C${x + 0.6 * s},-16.4 ${x + 1.2 * s},-17.6 ${x + 2.0 * s},-17.6`} />
    </g>
  );
  // Garras del pie (cuelgan hacia abajo).
  const garraPie = (x) => (
    <g fill="none" stroke={PEREZOSO_PALETA.garra} strokeWidth="1.4" strokeLinecap="round">
      <path d={`M${x - 1.1},13.6 C${x - 1.4},15.0 ${x - 1.2},16.0 ${x - 0.4},16.4`} />
      <path d={`M${x},13.8 C${x - 0.3},15.2 ${x + 0.1},16.2 ${x + 0.6},16.5`} />
      <path d={`M${x + 1.1},13.6 C${x + 1.0},15.0 ${x + 1.4},16.0 ${x + 1.8},16.2`} />
    </g>
  );

  // ── CUERPO rubber-hose (atrás→adelante): aura, patas colgantes, tronco pardo
  //    con algas + panza, brazos manguera que suben a la rama con garras largas,
  //    cabeza (antifaz + cara crema + ojos/cachetes/boca + trufa). `.crt-body` es
  //    el nodo que squashea (boil idle, el MÁS LENTO del grupo — mecerse zen).
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* aura viva (con tinte verdoso de algas) */}
      <circle cx="0" cy="2" r={auraR} fill={PEREZOSO_PALETA.cuerpo} opacity={auraOp} filter={`url(#${blur})`} />

      {/* patas traseras que cuelgan (muslos + espinilla manguera), detrás del
          tronco, se mecen suave. Con sus garras hacia abajo. */}
      <Miembro clase="crt-pata-l" origen="center top"
        d="M-4.4,7.4 C-5.6,9.8 -5.6,11.8 -5.0,13.6" ancho={3.0} punta={[-5.0, 13.8]} puntaR={1.8} pie sway={vivo} delay={-0.9} />
      <Miembro clase="crt-pata-r" origen="center top"
        d="M4.4,7.4 C5.6,9.8 5.6,11.8 5.0,13.6" ancho={3.0} punta={[5.0, 13.8]} puntaR={1.8} pie sway={vivo} delay={-1.2} />
      {garraPie(-5.0)}
      {garraPie(5.0)}

      {/* tronco pardo con contorno grueso (la línea que respira con el boil) */}
      <ellipse cx="0" cy="2" rx={PEREZOSO_PROPORCION.troncoRx} ry={PEREZOSO_PROPORCION.troncoRy}
        fill={PEREZOSO_PALETA.cuerpo} stroke={RH_INK} strokeWidth="1.4"
        style={{ filter: `drop-shadow(0 0 6px ${PEREZOSO_PALETA.cuerpoGlow})` }} />
      {/* manchas de ALGA (el tinte verdoso del pelo) sobre el dorso */}
      {ALGAS.map((a, i) => (
        <ellipse key={i} cx={a.cx} cy={a.cy} rx={a.rx} ry={a.ry} fill={PEREZOSO_PALETA[a.c]} opacity="0.55" />
      ))}
      {/* panza clara (el pelaje del pecho que sube y baja) */}
      <ellipse cx="0" cy="3.6" rx="5.0" ry="5.4" fill={PEREZOSO_PALETA.panza} opacity="0.9" />

      {/* brazos manguera LARGOS que suben a la rama, pivote en el HOMBRO para que
          celebra/señala los alcen desde el hombro. El izquierdo (crt-brazo-l) es
          el que carga el prop del mundo. Sin mitón en la punta: la garra la
          dibujamos aparte (garras largas curvas, su firma). */}
      <Miembro clase="crt-brazo-l" origen="center bottom"
        d="M-4.4,-2.2 C-7.0,-7.4 -8.0,-11.4 -7.2,-15.2" ancho={2.8} sway={vivo} delay={-0.4} />
      <Miembro clase="crt-brazo-r" origen="center bottom"
        d="M4.4,-2.2 C7.0,-7.4 8.0,-11.4 7.2,-15.2" ancho={2.8} sway={vivo} delay={-0.7} />
      {/* GARRAS LARGAS curvas hooking sobre la rama (su firma, gripping) */}
      {garraRama(-7.2, 1)}
      {garraRama(7.2, -1)}

      {/* cabeza parda con contorno */}
      <circle cx="0" cy="-7.6" r={PEREZOSO_PROPORCION.cabezaR} fill={PEREZOSO_PALETA.cuerpo} stroke={RH_INK} strokeWidth="1.3" />
      {/* cara crema (el disco claro del rostro) */}
      <ellipse cx="0" cy="-6.4" rx="4.7" ry="4.5" fill={PEREZOSO_PALETA.crema} opacity="0.96" />
      {/* ANTIFAZ oscuro que cruza los ojos (la firma de la especie): dos parches
          diagonales que enmarcan los ojos hacia las sienes. En su grupo propio
          (.perezoso-antifaz) por si algún consumidor lo estiliza. */}
      <g className="perezoso-antifaz" fill={PEREZOSO_PALETA.antifaz} opacity="0.92">
        <path d="M-5.4,-9.8 C-3.0,-10.6 -1.5,-9.4 -1.2,-7.9 C-1.9,-6.4 -3.7,-6.1 -5.2,-6.8 C-6.4,-7.5 -6.5,-9.0 -5.4,-9.8 Z" />
        <path d="M5.4,-9.8 C3.0,-10.6 1.5,-9.4 1.2,-7.9 C1.9,-6.4 3.7,-6.1 5.2,-6.8 C6.4,-7.5 6.5,-9.0 5.4,-9.8 Z" />
      </g>
      {/* chapetas + boca serena + trufa + ojos de goma dentro del antifaz */}
      <Cachetes puntos={[{ cx: -4.6, cy: -5.4, r: 1.2 }, { cx: 4.6, cy: -5.4, r: 1.2 }]} vivo={vivo} />
      {/* Boca SERENA (lenta): lip-sync si hay visema; si no, la sonrisa tranquila
          de siempre (arco suave, angosta — nada de bocota). */}
      {visema
        ? <BocaVisema cx={0} cy={-4.2} w={2.8} prof={1.1} visema={visema} />
        : <Sonrisa cx={0} cy={-4.4} w={2.8} prof={1.0} />}
      {/* trufa (nariz) */}
      <ellipse cx="0" cy="-5.4" rx="1.2" ry="0.95" fill={PEREZOSO_PALETA.hocico} />
      <OjosRubber
        ojos={[{ cx: -3.3, cy: -8.0, r: 1.5 }, { cx: 3.3, cy: -8.0, r: 1.5 }]}
        mirar={[0, 0.16]}
        parpadea={vivo}
      />

      {/* Vestuario por clima+hora (RUANA de noche/frío) — solo con vestuario=true.
          Sombrero/sudor van suprimidos (el perezoso jamás suda). */}
      {ropa && (
        <AccesoriosClima
          estado={ropa}
          tronco={{ cx: 0, cy: 2, rx: PEREZOSO_PROPORCION.troncoRx, ry: PEREZOSO_PROPORCION.troncoRy }}
          cabeza={{ cx: 0, cy: -7.6, r: PEREZOSO_PROPORCION.cabezaR }}
          animated={vivo}
        />
      )}

      {/* Prop del mundo en la garra (entra con su herramienta). */}
      {propMundo}

      {/* Las "Z" del sueño (dormita). */}
      {zzz}
    </g>
  );

  // El perezoso NO da vueltas de campana: su gracia es la QUIETUD (sin rh-antic/
  // rh-travieso). El mecerse lento sale del boil reescrito (perezoso-boil).
  // El line-boil (contorno que hierve) envuelve TODO el dibujo cuando se pide.
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{body}</g> : body;

  // La RAMA de la que cuelga: un travesaño leñoso ESTÁTICO por encima, con un par
  // de brotes. Va detrás del cuerpo (las garras hookean sobre ella). Fuera de
  // `.crt-body` para que no se mezca con él: el cuerpo se columpia, la rama no.
  const rama = (
    <g className="perezoso-rama" aria-hidden="true">
      <path d="M-13.5,-16.5 C-6,-17.4 6,-17.4 13.5,-16.5 C6,-15.6 -6,-15.6 -13.5,-16.5 Z"
        fill={PEREZOSO_PALETA.rama} stroke={RH_INK} strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M11.5,-16.7 c2.2,-1.2 3.4,-0.6 4.2,0.4 c-1.3,0.3 -2.6,0.5 -3.8,0.2"
        fill={PEREZOSO_PALETA.hoja} opacity="0.9" />
      <path d="M-12.0,-16.9 c-1.8,-1.1 -3.0,-0.5 -3.6,0.5 c1.1,0.3 2.2,0.4 3.2,0.1"
        fill={PEREZOSO_PALETA.hoja} opacity="0.9" />
    </g>
  );

  const estadoAttrs = {
    'data-creature': 'perezoso',
    'data-pose': vivo ? poseFx : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-visema': visema || undefined,
    'data-ruana': ropa?.ruana ? '1' : undefined,
    'data-mojado': ropa?.mojado ? '1' : undefined,
    'data-dormita': dormitaFx ? '1' : undefined,
    'data-estira': estiraFx ? '1' : undefined,
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
        {rama}
        {cuerpoVivo}
      </g>
    );
  }
  const svg = (
    <svg ref={raizRef} viewBox={VIEWBOX} width={size} height={size} className={className} style={estiloRaiz}
      role="img" aria-label={title} {...estadoAttrs} {...rest}>
      <title>{title}</title>
      {defs}
      {rama}
      {cuerpoVivo}
    </svg>
  );
  // MODO PODER (standalone): lo envolvemos en su aura TURQUESA de 4 capas
  // (transformacion.css: glow radial + boost + ingravidez + corrientes). El
  // wrapper DOM es lo único que puede llevar ::before/mix-blend/corrientes.
  if (poder) {
    return (
      <span
        className="is-powered-up perezoso-poder"
        data-creature-poder="perezoso"
        style={{ '--aura-color': auraDeBicho('perezoso'), display: 'inline-flex' }}
      >
        {svg}
        <AuraPoder />
      </span>
    );
  }
  return svg;
}

export default Perezoso;
