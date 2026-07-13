import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, BocaVisema, Miembro, RH_INK } from './_rubberhose.jsx';
import { BORUGO_PALETA, BORUGO_PROPORCION, BORUGO_SLUG, PERFIL_BORUGO } from './borugoIdentidad.js';
import { cuerpoDeClima, ropaDeClimaBicho } from './creatureClimaCuerpo.js';
import { AccesoriosClima } from './AccesoriosClima.jsx';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { PropEnMano } from './PropEnMano.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';

/* Borugo — Cuniculus taczanowskii (la paca/lapa de montaña andina, el roedor
   NOCTURNO de la vereda). El 9º y ÚLTIMO personaje: el ANIMAL DE CIERRE. Hermano
   rubber-hose de la abeja Angelita, el oso, el jaguar y la ardilla: compone el
   MISMO kit `_rubberhose.jsx` (ojos de goma, cachetes, sonrisa, miembros
   manguera) y hereda la MISMA fundación transversal — lip-sync (useLipSync →
   BocaVisema), modo poder (transformacion, aura PLATA LUNAR), ropa por clima
   (ropaDeClima), prop por mundo (PropEnMano) y line-boil (LineBoilFilter) — cero
   código duplicado. Solo cambia el ANIMAL y su CARÁCTER: roedor ROBUSTO pardo con
   HILERAS de motas crema por los flancos (su firma inconfundible), hocico con
   BIGOTES, ojos GRANDES nocturnos y orejitas atentas. TIERNO, tímido, sereno,
   NOCTURNO: el alma dulce del grupo, el que despierta el instinto de cuidar. Su
   seña de vida es el OLFATEO (la nariz que tiembla, los bigotes que se abren, las
   orejitas que se enderezan) y el ACURRUCARSE (se ovilla a salvo, digno). Su
   squash&stretch es SUAVE y tímido (nada de comedia bruta). Es de SUELO: patas
   cortas, no vuela — sin alas. Su color de poder es la PLATA LUNAR / blanco
   luminoso (no el dorado de la abeja ni el púrpura del jaguar).

   EL HOMENAJE (el alma de este personaje): en la vereda lo cazan con perros para
   vender su carne; en el mundo de Chagra lo honramos AL REVÉS — vivo, a salvo,
   querido y digno. Nada de cacería, sangre ni victimismo: solo ternura, dignidad
   y esperanza. Es el corazón emotivo del cierre.

   NOCTURNO SAGRADO (permanente y sutil, elegante, no recargado): las MOTAS crema
   de los flancos BRILLAN tenue con luz lunar y los ojos grandes reflejan la LUNA
   (un halo suave que respira). En modo poder ese brillo se vuelve PLATA LUNAR
   pleno (el ser protegido por fin se revela seguro). Todo se PODA en tier bajo /
   reduced-motion (queda un fotograma digno y quieto). */
const VIEWBOX = '-16 -20 32 40';

/* Mota crema de los flancos: la firma inconfundible del borugo (hileras de
   puntos claros por los costados). Decorativa (aria-hidden en el grupo padre). */
function Mota({ cx, cy, r = 1.0, fill, opacity = 0.95 }) {
  return <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.86} fill={fill} opacity={opacity} />;
}

/* HILERAS de motas por flanco (la firma). Dos filas escalonadas a cada lado del
   tronco; coords en el viewBox del cuerpo. La luz lunar (overlay) se pinta con
   los MISMOS centros para que el brillo viva SOBRE las motas. */
const MOTAS = [
  // flanco izquierdo (dos hileras)
  { cx: -6.6, cy: -0.6, r: 1.05 }, { cx: -7.2, cy: 2.2, r: 1.1 }, { cx: -6.4, cy: 4.8, r: 0.95 },
  { cx: -3.8, cy: 0.4, r: 0.9 }, { cx: -4.2, cy: 3.4, r: 0.95 }, { cx: -3.4, cy: 5.8, r: 0.8 },
  // flanco derecho (dos hileras)
  { cx: 6.6, cy: -0.6, r: 1.05 }, { cx: 7.2, cy: 2.2, r: 1.1 }, { cx: 6.4, cy: 4.8, r: 0.95 },
  { cx: 3.8, cy: 0.4, r: 0.9 }, { cx: 4.2, cy: 3.4, r: 0.95 }, { cx: 3.4, cy: 5.8, r: 0.8 },
];

export function Borugo({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Borugo',
  /* Pose de VIDA (idle-life), species-agnostic (gestos rh-g-* de creatures.css):
     'anda' (base, con olfateo tímido) | 'celebra' (brinca con bracitos en V +
     overshoot suave) | 'reposo' (respira hondo, ovillado) | 'señala' (se inclina
     al POI y apunta con la patita). Solo corren viva (animated); con
     animated=false o reduced-motion queda en fotograma digno y tierno. */
  pose = 'anda',
  animo = 'sereno',
  energia = 1,
  /* CLIMA REAL escrito en el cuerpo (perfil borugo). Sin clima (avatares,
     catálogo) = neutro digno: el borugo se ve EXACTO como siempre. */
  clima = null,
  enso = 'neutro',
  /* ── LIP-SYNC (sistema transversal, useLipSync) ────────────────────────────
     visema opcional ('V1'..'V4') que produce useLipSync desde el RMS del TTS: la
     boca se abre cuando el agente narra. Sin visema (o 'V1') = la sonrisa de
     goma de siempre → avatares/catálogo no cambian. El HOOK vive aparte; acá
     solo se consume. */
  visema = null,
  /* ── VESTUARIO por clima+hora (ropaDeClima) ───────────────────────────────
     OPT-IN: con vestuario=true el borugo se abriga según el clima real (RUANA de
     noche/frío — es de montaña húmeda y nocturno, siente el frío pronto). NUNCA
     suda (contrato compartido de páramo): jamás sombrero ni sudor, aunque el
     termómetro suba. Default false → los consumidores de `clima` existentes NO
     ven ropa nueva. */
  vestuario = false,
  tempC = undefined,
  /* ── OLFATEA (olfateo tímido — su reacción-firma tierna) ────────────────────
     OPT-IN: la nariz TIEMBLA más, los bigotes se ABREN y las orejitas se
     ENDEREZAN (el roedor nocturno husmea el aire con dulzura). Default false →
     olfateo idle suave (avatar sereno). */
  olfatea = false,
  /* ── ACURRUCA (se ovilla a salvo — el instinto de cuidar) ───────────────────
     OPT-IN: el cuerpo se REDONDEA y encoge suave y la cabecita se recoge (el ser
     protegido, digno y tranquilo). Su otra reacción-firma, el corazón emotivo
     del cierre. Default false. */
  acurruca = false,
  /* Device-tier (DR-3D-PERF-GAMABAJA): 'alto'|'medio' corren el rubber-hose
     pleno; 'bajo' apaga el idle continuo (boil + olfateo + bigotes + brillo
     lunar) y deja los estados reactivos. Sin prop (standalone: avatares,
     catálogo) = pleno. */
  tier,
  /* ── LÍNEA QUE RESPIRA (line-boil, Cuphead años 30 — LineBoilFilter) ────────
     OPT-IN: con lineBoil el CONTORNO del borugo vibra escalonado (feTurbulence +
     feDisplacement, ~8fps) — el trazo "hierve" como dibujo animado clásico.
     Default false → los consumidores existentes NO cambian. Con animated=false o
     reduced-motion queda con seed fija (textura sin vibrar). Capa MÁS cara del
     kit: reservada para su entrada heroica (galería, hero). */
  lineBoil = false,
  /* ── MODO PODER (transformación / power-up PLATA LUNAR — transformacion.css) ──
     OPT-IN: con poder=true (y en modo standalone) el borugo se envuelve en su
     aura PLATA LUNAR de 4 capas (glow, boost, ingravidez, corrientes) — su firma
     cuando "sube de nivel": el ser protegido que se revela seguro bajo la luna.
     El host lo enciende un rato con usePoderTemporal(). En modo inline el
     power-up lo pone el host DOM (::before/mix-blend no aplican a nodos SVG); acá
     solo marcamos data-poder por si el host lo consulta. */
  poder = false,
  /* ── PROP POR MUNDO (herramienta en la patita — propsPorMundo/PropEnMano) ─────
     mundoId opcional: al ENTRAR a un mundo el borugo carga su herramienta
     (agua→manguerita, suelo→lupa, animales→lazo, semillero→canasto…). Sin
     mundoId (o mundo sin prop) entra con las patitas libres. */
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

  // CLIMA → cuerpo (determinista, una vez por render): tinte + opacidad al
  // contorno. El borugo no tiene alas (velocidadAlas siempre 1: no se usa).
  const cuerpoClima = cuerpoDeClima(clima, { enso, tier, perfil: PERFIL_BORUGO });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  // Vestuario por clima+hora (opt-in). Perfil de montaña húmeda/nocturno: la
  // RUANA de noche/frío; NUNCA sombrero ni sudor (aunque suba el termómetro) — el
  // borugo no se sobrecalienta. Los suprimimos aquí sin tocar la función
  // compartida (su contrato/tests siguen intactos). Sin vestuario/clima → nada.
  const ropaBase = (vestuario && clima) ? ropaDeClimaBicho(BORUGO_SLUG, clima, { tempC }) : null;
  const ropa = ropaBase ? { ...ropaBase, sombrero: false, sudor: false } : null;

  const P = BORUGO_PALETA;
  const PR = BORUGO_PROPORCION;

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
    <PropEnMano mundoId={mundoId} x={-10.6} y={7.4} escala={0.7} ink={RH_INK} animated={vivo} />
  ) : null;

  // BOCA: visema (el agente narra) o la sonrisa tímida de siempre. El borugo es
  // dulce: aun narrando, boquita pequeña.
  const boca = visema
    ? <BocaVisema cx={0} cy={-3.0} w={2.6} prof={1.0} visema={visema} />
    : <Sonrisa cx={0} cy={-3.2} w={2.4} prof={0.9} />;

  // ── CUERPO rubber-hose (atrás→adelante): aura, patitas traseras, tronco pardo
  //    con vientre crema, MOTAS de los flancos (la firma) + su luz lunar,
  //    bracitos manguera, cabeza (hocico + ojos grandes/cachetes/boca + trufa +
  //    bigotes + dientecitos), orejitas. `.crt-body` es el nodo que squashea
  //    (boil idle borugo: suave y tímido — ternura, no comedia).
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* aura viva (presencia cálida) */}
      <circle cx="0" cy="2" r={auraR} fill={P.cuerpo} opacity={auraOp} filter={`url(#${blur})`} />

      {/* orejitas cortas y atentas (detrás de la cabeza, se enderezan al
          olfatear). Grupo propio (.borugo-orejas). */}
      <g className="borugo-orejas" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
        <ellipse cx="-3.2" cy="-12.4" rx={PR.orejaR} ry={PR.orejaR * 1.15} fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.1" />
        <ellipse cx="-3.2" cy="-12.2" rx={PR.orejaR * 0.5} ry={PR.orejaR * 0.7} fill={P.oreja} />
        <ellipse cx="3.2" cy="-12.4" rx={PR.orejaR} ry={PR.orejaR * 1.15} fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.1" />
        <ellipse cx="3.2" cy="-12.2" rx={PR.orejaR * 0.5} ry={PR.orejaR * 0.7} fill={P.oreja} />
      </g>

      {/* patitas traseras cortas (con plantita crema, detrás del tronco). Se
          mecen suave. */}
      <Miembro d="M-5.6,7.6 C-6.8,9.4 -6.6,10.8 -5.2,11.6" ancho={3.0} punta={[-5.2, 11.8]} puntaR={1.8} pie sway={vivo} delay={-0.7} glove={P.vientre} />
      <Miembro d="M5.6,7.6 C6.8,9.4 6.6,10.8 5.2,11.6" ancho={3.0} punta={[5.2, 11.8]} puntaR={1.8} pie sway={vivo} delay={-1.0} glove={P.vientre} />

      {/* tronco pardo robusto con contorno grueso (la línea que respira con el
          boil) */}
      <ellipse cx="0" cy="2" rx={PR.troncoRx} ry={PR.troncoRy}
        fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.4"
        style={{ filter: `drop-shadow(0 0 5px ${P.cuerpoGlow})` }} />
      {/* lomo un tono más hondo (sombra dorsal) */}
      <path d="M-8.6,-2.4 C-4,-6.6 4,-6.6 8.6,-2.4 C6,-4.2 -6,-4.2 -8.6,-2.4 Z"
        fill={P.lomo} opacity="0.55" />
      {/* vientre/panza crema */}
      <path d="M0,-3.6 C4.0,-2.8 5.2,2.2 3.8,6.4 C2.2,9.0 -2.2,9.0 -3.8,6.4 C-5.2,2.2 -4.0,-2.8 0,-3.6 Z"
        fill={P.vientre} opacity="0.92" />

      {/* MOTAS de los flancos (hileras crema — LA FIRMA). Decorativas. */}
      <g aria-hidden="true">
        {MOTAS.map((m, i) => (
          <Mota key={i} cx={m.cx} cy={m.cy} r={m.r} fill={P.mota} />
        ))}
      </g>
      {/* LUZ LUNAR sobre las motas — brillo tenue nocturno (permanente y sutil).
          Late lento; se vuelve PLATA LUNAR pleno en modo poder (CSS). Decorativa. */}
      <g className={vivo ? 'borugo-motas-luz' : undefined} filter={`url(#${blur})`} aria-hidden="true"
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        {MOTAS.map((m, i) => (
          <Mota key={i} cx={m.cx} cy={m.cy} r={m.r * 0.72} fill={P.motaLuz} opacity={0.5} />
        ))}
      </g>

      {/* bracitos manguera (patitas delanteras) con plantita crema, pivote en el
          HOMBRO para que celebra/señala los alcen desde el hombro. */}
      <Miembro clase="crt-brazo-l" origen="right top"
        d="M-6.2,-0.6 C-8.8,0.8 -9.6,3.4 -8.6,5.8" ancho={2.8} punta={[-8.6, 6.0]} puntaR={1.8} pie sway={vivo} delay={-0.15} glove={P.vientre} />
      <Miembro clase="crt-brazo-r" origen="left top"
        d="M6.2,-0.6 C8.8,0.8 9.6,3.4 8.6,5.8" ancho={2.8} punta={[8.6, 6.0]} puntaR={1.8} pie sway={vivo} delay={-0.45} glove={P.vientre} />

      {/* CABEZA (grupo propio .borugo-cabeza para que el ACURRUCARSE la recoja). */}
      <g className="borugo-cabeza" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
        <circle cx="0" cy="-7.6" r={PR.cabezaR} fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.3" />
        {/* hocico romo claro que baja al morro */}
        <path d="M-2.4,-6.0 C-1.1,-4.7 1.1,-4.7 2.4,-6.0 C2.6,-3.4 1.6,-2.0 0,-1.9 C-1.6,-2.0 -2.6,-3.4 -2.4,-6.0 Z"
          fill={P.hocico} opacity="0.95" />
        {/* chapetas (rubor tímido) */}
        <Cachetes puntos={[{ cx: -4.0, cy: -5.8, r: 1.15 }, { cx: 4.0, cy: -5.8, r: 1.15 }]} vivo={vivo} />
        {boca}
        {/* dientecitos de roedor (tímidos, suaves — no agresivos). Bajo la boca. */}
        <path d="M-0.8,-2.4 L0.8,-2.4 L0.7,-1.2 L-0.7,-1.2 Z" fill={P.diente} stroke={RH_INK} strokeWidth="0.25" opacity="0.9" />
        <line x1="0" y1="-2.4" x2="0" y2="-1.2" stroke={RH_INK} strokeWidth="0.22" />
        {/* trufa (nariz que TIEMBLA al olfatear) — grupo propio .borugo-nariz */}
        <g className="borugo-nariz" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
          <path d="M-1.2,-4.4 L1.2,-4.4 L0,-3.2 Z" fill={P.nariz} />
        </g>
        {/* BIGOTES (los del hocico, se abren al olfatear) — grupo .borugo-bigotes */}
        <g className="borugo-bigotes" stroke={P.bigote} strokeWidth="0.4" strokeLinecap="round" fill="none"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }} aria-hidden="true">
          <path d={`M-1.6,-3.8 Q-4.4,-4.2 -${PR.bigoteLargo},-4.6`} />
          <path d="M-1.6,-3.4 Q-4.2,-3.4 -5.0,-3.2" />
          <path d="M-1.6,-3.0 Q-4.0,-2.6 -4.8,-2.0" />
          <path d={`M1.6,-3.8 Q4.4,-4.2 ${PR.bigoteLargo},-4.6`} />
          <path d="M1.6,-3.4 Q4.2,-3.4 5.0,-3.2" />
          <path d="M1.6,-3.0 Q4.0,-2.6 4.8,-2.0" />
        </g>
        {/* OJOS GRANDES nocturnos (dulces) */}
        <OjosRubber
          ojos={[{ cx: -2.4, cy: -8.4, r: 1.95 }, { cx: 2.4, cy: -8.4, r: 1.95 }]}
          mirar={[0, 0.12]}
          parpadea={vivo}
        />
        {/* iris cálido oscuro que enmarca la pupila (ojo nocturno grande) */}
        <g aria-hidden="true" fill="none" stroke={P.iris} strokeWidth="0.5" opacity="0.7">
          <circle cx="-2.4" cy="-8.4" r="1.5" />
          <circle cx="2.4" cy="-8.4" r="1.5" />
        </g>
        {/* LA LUNA en los ojos — un halo suave que respira sobre cada ojo (el
            nocturno refleja la luna). Sutil siempre; PLATA LUNAR pleno en modo
            poder (CSS). */}
        <g className={vivo ? 'borugo-ojo-luna' : undefined} filter={`url(#${blur})`} aria-hidden="true"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
          <circle cx="-2.4" cy="-8.6" r="0.95" fill={P.ojoBrillo} opacity="0.6" />
          <circle cx="2.4" cy="-8.6" r="0.95" fill={P.ojoBrillo} opacity="0.6" />
        </g>
      </g>

      {/* Vestuario por clima+hora (RUANA de noche/frío) — solo con vestuario=true.
          Sombrero/sudor van suprimidos (el borugo nocturno/páramo no suda). */}
      {ropa && (
        <AccesoriosClima
          estado={ropa}
          tronco={{ cx: 0, cy: 2, rx: PR.troncoRx, ry: PR.troncoRy }}
          cabeza={{ cx: 0, cy: -7.6, r: PR.cabezaR }}
          animated={vivo}
        />
      )}

      {/* Prop del mundo en la patita (entra tierno con su herramienta). */}
      {propMundo}
    </g>
  );

  // Antics de VIDA (períodos co-primos) SOLO viva; nodos aparte para no pisar el
  // boil de `.crt-body`. El CSS los apaga con RM / tier bajo / ánimo bajo /
  // durante los gestos (celebra/reposo/señala) y estados (olfatea/acurruca).
  const conAntics = vivo ? (
    <g className="rh-antic">
      <g className="rh-travieso">{body}</g>
    </g>
  ) : body;
  // El line-boil (contorno que hierve) envuelve TODO el dibujo cuando se pide.
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{conAntics}</g> : conAntics;

  const estadoAttrs = {
    'data-creature': BORUGO_SLUG,
    'data-pose': vivo ? pose : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-visema': visema || undefined,
    'data-ruana': ropa?.ruana ? '1' : undefined,
    'data-mojado': ropa?.mojado ? '1' : undefined,
    'data-olfatea': olfatea ? '1' : undefined,
    'data-acurruca': acurruca ? '1' : undefined,
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
  // MODO PODER (standalone): lo envolvemos en su aura PLATA LUNAR de 4 capas
  // (transformacion.css: glow radial + boost + ingravidez + corrientes). El
  // wrapper DOM es lo único que puede llevar ::before/mix-blend/corrientes.
  if (poder) {
    return (
      <span
        className="is-powered-up borugo-poder"
        data-creature-poder={BORUGO_SLUG}
        style={{ '--aura-color': auraDeBicho(BORUGO_SLUG), display: 'inline-flex' }}
      >
        {svg}
        <AuraPoder />
      </span>
    );
  }
  return svg;
}

export default Borugo;
