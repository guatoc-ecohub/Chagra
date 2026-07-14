import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, BocaVisema, Miembro, RH_INK } from './_rubberhose.jsx';
import { RANA_PALETA, RANA_PROPORCION } from './faunaAndina.js';
import { cuerpoDeClima, PERFIL_RANA, ropaDeClimaBicho } from './creatureClimaCuerpo.js';
import { AccesoriosClima } from './AccesoriosClima.jsx';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { PropEnMano } from './PropEnMano.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';

/* Rana arlequín andina — Atelopus del páramo, anfibia guardiana del agua y la
   PENSADORA SERENA del grupo (personalidad ZEN: calma, sabia, contemplativa).
   Hermana rubber-hose de la abeja Angelita: compone el MISMO kit
   `_rubberhose.jsx` y la MISMA fundación transversal (lip-sync, modo poder,
   prop-por-mundo, ropa por clima, line-boil) — cero código duplicado. Solo
   cambian el ANIMAL y la CADENCIA: cuerpo verde húmedo achatado con manchas
   ARLEQUÍN ocre, vientre dorado, OJOS SALTONES enormes y una BOCOTA de goma; y
   una vida QUIETA (no los arrebatos de la abeja): respira despacio con la
   GARGANTA que late/infla, parpadea pausado y solo de vez en cuando pega un
   SALTO muy elástico que aterriza y asienta. Es de SUELO: se sienta en la hoja
   (no vuela) — sin alas. Su PERFIL_RANA la hace la más brillante mojada y la MÁS
   golpeada por la sequía (la piel se le reseca): el CLIMA→cuerpo lo pone
   `creatureClimaCuerpo.js`. IDENTIDAD en `faunaAndina.js`; cadencia ZEN en
   `creatures.css` (bloque RANA: crt-garganta + rana-salto, aditivo). */
const VIEWBOX = '-15 -16 30 32';

/* Manchas del patrón arlequín (blobs ocre sobre el dorso verde). */
const MANCHAS = [
  { cx: -5.2, cy: 1.2, rx: 1.9, ry: 1.5, c: 'mancha' },
  { cx: 4.8, cy: 2.0, rx: 2.1, ry: 1.6, c: 'manchaClara' },
  { cx: -1.0, cy: 5.2, rx: 1.7, ry: 1.3, c: 'mancha' },
  { cx: 6.0, cy: -1.6, rx: 1.3, ry: 1.1, c: 'manchaClara' },
];

export function RanaAndina({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Rana arlequín andina',
  /* Pose de VIDA (idle-life), equivalentes a las de Angelita: 'anda' (base) |
     'celebra' (brinco de gozo con overshoot) | 'reposo' (respira en la hoja) |
     'señala' (se inclina al POI y apunta con la manito). Gestos species-agnostic
     en `creatures.css` (rh-g-*); solo corren viva (animated). */
  pose = 'anda',
  animo = 'sereno',
  energia = 1,
  /* CLIMA REAL escrito en el cuerpo (perfil rana). Sin clima (avatares, catálogo)
     = neutro digno: la rana se ve EXACTO como siempre. */
  clima = null,
  enso = 'neutro',
  /* ── LIP-SYNC (fundación transversal, useLipSync) ──────────────────────────
     visema opcional ('V1'..'V4') que produce useLipSync desde el RMS del TTS: la
     BOCOTA de la rana cambia de forma cuando el agente narra. Sin visema (o 'V1')
     = la sonrisa de siempre → avatares/catálogo no cambian. El HOOK vive aparte
     (no cuelga un AnalyserNode por instancia); acá solo se consume el estado. */
  visema = null,
  /* ── VESTUARIO por clima+hora (ropaDeClima) ───────────────────────────────
     OPT-IN: con vestuario=true la rana del páramo húmedo se abriga según el
     clima real (ruana de noche/frío) y NUNCA se ve sudando de noche. Perfil
     'rana-andina' (sudaAlSol:false): de páramo, solo suda con calor REAL de día.
     Default false → los consumidores de `clima` existentes solo ven el tinte de
     piel de cuerpoDeClima. tempC afina frío/calor. */
  vestuario = false,
  tempC = undefined,
  /* Device-tier: 'alto'|'medio' corren la cadencia zen plena; 'bajo' apaga lo
     continuo (boil + garganta + salto + follow-through) y deja los estados
     reactivos. Sin prop (standalone: avatares, catálogo) = pleno. El CSS gatea
     por [data-tier='bajo']; reduced-motion lo congela por encima. */
  tier,
  /* ── LÍNEA QUE RESPIRA (line-boil, Cuphead años 30 — LineBoilFilter) ────────
     OPT-IN: con lineBoil el CONTORNO de la rana vibra escalonado (feTurbulence +
     feDisplacement, ~8fps) — el trazo "hierve" como dibujo clásico. Default
     false → los consumidores existentes NO cambian. Con animated=false o
     reduced-motion el filtro queda con seed fija (textura sin vibrar). */
  lineBoil = false,
  /* ── MODO PODER (transformación / power-up VERDE — transformacion.css) ──────
     OPT-IN: con poder=true (y en modo standalone) la rana se envuelve en su aura
     VERDE-ZEN de 4 capas (glow, boost, ingravidez, corrientes ascendentes) — su
     firma cuando "sube de nivel" (verde, como dorado=abeja / rojo=oso). El host
     la enciende un rato con usePoderTemporal(). En modo inline el power-up lo
     pone el host DOM (::before/mix-blend no aplican a nodos SVG). */
  poder = false,
  /* ── PROP POR MUNDO (herramienta en la mano — propsPorMundo/PropEnMano) ─────
     mundoId opcional: al ENTRAR a un mundo la rana carga su herramienta
     (agua→manguerita, suelo→lupa, animales→lazo, semillero→canasto…). Sin
     mundoId (o mundo sin prop) entra con las manos libres. Va en su manito
     izquierda. */
  mundoId = null,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const vivo = animated;
  const auraOp = Math.max(0.14, Math.min(0.44, 0.18 + 0.28 * (energia ?? 1)));
  const auraR = 7.6 + 1.4 * (energia ?? 1);

  // CLIMA → cuerpo (perfil rana). Sin clima = neutro digno.
  const cuerpoClima = cuerpoDeClima(clima, { enso: /** @type {any} */ (enso), tier, perfil: PERFIL_RANA });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  // Vestuario por clima+hora (opt-in). Perfil rana: de páramo, no suda al sol,
  // ruana de noche. Sin vestuario o sin clima → nada (comportamiento histórico).
  const ropa = (vestuario && clima) ? ropaDeClimaBicho('rana-andina', clima, { tempC }) : null;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {/* Line-boil (contorno que hierve) — solo se instancia si se pide. */}
      {lineBoil && <LineBoilFilter id={boil} animated={vivo} />}
    </defs>
  );

  // PROP DEL MUNDO en la manito izquierda (el punta del brazo izquierdo cae en
  // ~(-8.2, 8.9)). Sin mundoId o mundo sin prop → PropEnMano devuelve null.
  const propMundo = mundoId ? (
    <PropEnMano mundoId={mundoId} x={-8.6} y={9.8} escala={0.55} ink={RH_INK} animated={vivo} />
  ) : null;

  // ── CUERPO rubber-hose (atrás→adelante): aura, ancas traseras, tronco verde
  //    con manchas + vientre dorado, bracitos manguera con discos, GARGANTA que
  //    late, bocota, ojos saltones en cúpula. `.crt-body` respira despacio (boil
  //    zen, ralentizado en el bloque RANA de creatures.css).
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* aura viva */}
      <circle cx="0" cy="1" r={auraR} fill={RANA_PALETA.cuerpo} opacity={auraOp} filter={`url(#${blur})`} />

      {/* ancas traseras plegadas (los muslos potentes a cada lado, detrás) */}
      <g className={vivo ? 'rh-sway' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center top', animationDelay: '-0.8s' }}>
        <path d="M-8.4,1.6 C-11.6,2.6 -12.2,6.6 -9.6,8.8 C-7.6,10.4 -5.4,9.2 -5.0,7.0 C-4.6,4.6 -6.0,2.2 -8.4,1.6 Z"
          fill={RANA_PALETA.cuerpo} stroke={RH_INK} strokeWidth="1.2" />
        {/* pie palmeado */}
        <Miembro d="M-9.4,8.4 C-11.4,9.6 -12.6,9.2 -13.4,10.2" ancho={1.6} punta={[-13.4, 10.3]} puntaR={1.3} pie />
      </g>
      <g className={vivo ? 'rh-sway' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center top', animationDelay: '-1.1s' }}>
        <path d="M8.4,1.6 C11.6,2.6 12.2,6.6 9.6,8.8 C7.6,10.4 5.4,9.2 5.0,7.0 C4.6,4.6 6.0,2.2 8.4,1.6 Z"
          fill={RANA_PALETA.cuerpo} stroke={RH_INK} strokeWidth="1.2" />
        <Miembro d="M9.4,8.4 C11.4,9.6 12.6,9.2 13.4,10.2" ancho={1.6} punta={[13.4, 10.3]} puntaR={1.3} pie />
      </g>

      {/* tronco verde achatado con contorno grueso (respira con el boil) */}
      <ellipse cx="0" cy="1.6" rx={RANA_PROPORCION.troncoRx} ry={RANA_PROPORCION.troncoRy}
        fill={RANA_PALETA.cuerpo} stroke={RH_INK} strokeWidth="1.4"
        style={{ filter: `drop-shadow(0 0 6px ${RANA_PALETA.cuerpoGlow})` }} />
      {/* manchas arlequín ocre sobre el dorso */}
      {MANCHAS.map((m, i) => (
        <ellipse key={i} cx={m.cx} cy={m.cy} rx={m.rx} ry={m.ry} fill={RANA_PALETA[m.c]} opacity="0.92" />
      ))}
      {/* vientre dorado (el pecho claro que sube y baja) */}
      <ellipse cx="0" cy="4.6" rx="5.2" ry="3.4" fill={RANA_PALETA.vientre} opacity="0.9" />

      {/* bracitos manguera con discos de dedo (crema-dorado), pivote en HOMBRO */}
      <Miembro clase="crt-brazo-l" origen="right top"
        d="M-6.0,3.0 C-8.6,4.6 -9.2,6.8 -8.2,8.6" ancho={2.0} punta={[-8.2, 8.9]} puntaR={1.5} pie sway={vivo} delay={-0.2} glove={RANA_PALETA.dedo} />
      <Miembro clase="crt-brazo-r" origen="left top"
        d="M6.0,3.0 C8.6,4.6 9.2,6.8 8.2,8.6" ancho={2.0} punta={[8.2, 8.9]} puntaR={1.5} pie sway={vivo} delay={-0.5} glove={RANA_PALETA.dedo} />

      {/* GARGANTA que late (papada): la respiración ZEN visible — infla y
          desinfla despacio bajo la boca. `.crt-garganta` la anima (bloque RANA). */}
      <g className={vivo ? 'crt-garganta' : undefined}>
        <ellipse cx="0" cy="-1.2" rx="3.6" ry="2.2" fill={RANA_PALETA.papada} opacity="0.85" />
      </g>
      {/* la BOCOTA de goma: lip-sync si hay visema; si no, la sonrisa ancha. */}
      {visema
        ? <BocaVisema cx={0} cy={-2.2} w={9.2} prof={2.2} visema={visema} />
        : <Sonrisa cx={0} cy={-2.2} w={9.2} prof={2.2} />}
      {/* chapetas campesinas a los lados de la bocota */}
      <Cachetes puntos={[{ cx: -5.6, cy: -2.6, r: 1.35 }, { cx: 5.6, cy: -2.6, r: 1.35 }]} vivo={vivo} />

      {/* OJOS SALTONES: cúpulas verdes sobre el lomo con el ojo de goma encima
          (el rasgo de la rana). Párpado que asoma por arriba. */}
      <circle cx="-4.4" cy="-6.2" r={RANA_PROPORCION.ojoR + 0.7} fill={RANA_PALETA.cuerpo} stroke={RH_INK} strokeWidth="1.2" />
      <circle cx="4.4" cy="-6.2" r={RANA_PROPORCION.ojoR + 0.7} fill={RANA_PALETA.cuerpo} stroke={RH_INK} strokeWidth="1.2" />
      <path d="M-7.2,-7.0 A3.6,3.6 0 0 1 -1.6,-7.0" fill={RANA_PALETA.parpado} opacity="0.9" />
      <path d="M1.6,-7.0 A3.6,3.6 0 0 1 7.2,-7.0" fill={RANA_PALETA.parpado} opacity="0.9" />
      <OjosRubber
        ojos={[{ cx: -4.4, cy: -5.9, r: 2.2 }, { cx: 4.4, cy: -5.9, r: 2.2 }]}
        mirar={[0, 0.18]}
        parpadea={vivo}
      />

      {/* Vestuario por clima+hora (ruana/sombrero) — solo con vestuario=true.
          La rana del páramo NUNCA suda de noche (perfil sudaAlSol:false). */}
      {ropa && (
        <AccesoriosClima
          estado={ropa}
          tronco={{ cx: 0, cy: 1.6, rx: RANA_PROPORCION.troncoRx, ry: RANA_PROPORCION.troncoRy }}
          cabeza={{ cx: 0, cy: -6.2, r: 3.6 }}
          animated={vivo}
        />
      )}

      {/* Prop del mundo en la manito (entra heroica con su herramienta). */}
      {propMundo}
    </g>
  );

  // Idle ZEN: la rana NO usa los arrebatos de la abeja (rh-antic/rh-travieso).
  // Su única "locura" es un SALTO ocasional muy elástico (rana-salto): casi todo
  // el ciclo quieta, contemplativa. Wrapper aparte para no pisar el boil del
  // cuerpo. El CSS lo apaga con RM / tier bajo / gestos / ánimo bajo.
  const cuerpoBase = vivo ? <g className="rana-salto">{body}</g> : body;
  // El line-boil (contorno que hierve) envuelve TODO cuando se pide (nodo aparte
  // para no colisionar con el glow del `.crt-body`).
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{cuerpoBase}</g> : cuerpoBase;

  const estadoAttrs = {
    'data-creature': 'rana-andina',
    'data-pose': vivo ? pose : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-visema': visema || undefined,
    'data-ruana': ropa?.ruana ? '1' : undefined,
    'data-sombrero': ropa?.sombrero ? '1' : undefined,
    'data-sudor': ropa?.sudor ? '1' : undefined,
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
  // MODO PODER (standalone): la envolvemos en su aura VERDE-ZEN de 4 capas
  // (transformacion.css: glow radial + boost + ingravidez + corrientes). El
  // wrapper DOM es lo único que puede llevar ::before/mix-blend/corrientes.
  if (poder) {
    return (
      <span
        className="is-powered-up rana-poder"
        data-creature-poder="rana-andina"
        style={{ '--aura-color': auraDeBicho('rana-andina'), display: 'inline-flex' }}
      >
        {svg}
        <AuraPoder />
      </span>
    );
  }
  return svg;
}

export default RanaAndina;
