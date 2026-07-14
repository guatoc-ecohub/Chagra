import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, BocaVisema, Sonrisa, RH_INK } from './_rubberhose.jsx';
import { cuerpoDeClima, ropaDeClima } from './creatureClimaCuerpo.js';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';

/* ─────────────────────────────────────────────────────────────────────────────
 * EL ENT DEL PÁRAMO — el árbol-guardián vivo que ENSEÑA (frailejón gigante).
 *
 * NO es un bicho: es el ÁRBOL CENTRAL del "Bosque Vivo". Un frailejón gigante
 * (Espeletia sp.) — el landmark del páramo de casa (Chingaza/Fómeque): tronco
 * alto vestido con la "faldita" de hojas muertas, una CORONA en roseta de hojas
 * plateadas y pubescentes (su cabellera), flores amarillas, y un ROSTRO SABIO en
 * la corteza (ojos hundidos entre las grietas, cejas de corteza, boca en la
 * hendidura). Guardián del AGUA del páramo. Anciano sereno, LENTO, de peso: nada
 * hiperactivo — quietud imponente.
 *
 * Reusa la MISMA fundación transversal de la familia rubber-hose, adaptada a su
 * escala y su lentitud: line-boil (LineBoilFilter, muy lento), lip-sync
 * (BocaVisema por RMS), modo-guardián (el "modo poder": transformacion +
 * AuraPoder verde-plateado), clima de páramo (cuerpoDeClima/ropaDeClima → aquí
 * ESCARCHA y NEBLINA, y JAMÁS suda) y la enseñanza (useEntGuion, aparte). El
 * carácter y la geometría de árbol son propios; cero código de bicho duplicado.
 * ──────────────────────────────────────────────────────────────────────────── */

/* Cuadro cuadrado (como el resto de creatures) para que size×size no deforme;
   preserveAspectRatio por defecto centra el árbol alto sin distorsión. */
const VIEWBOX = '-16 -20 32 40';
const SLUG = 'ent-frailejon';

/* Paleta del frailejón (corteza ancestral + faldita ocre + roseta plateada). */
const ENT = {
  corteza: '#6f4c2b',
  cortezaClara: '#8a6b45',
  cortezaOscura: '#402a15',
  grieta: '#291a0d',
  faldita: '#a9793f',
  falditaOscura: '#7d5527',
  roseta: '#9db99a',      // verde-plateado pubescente
  rosetaClara: '#c6d8c0', // el brillo aterciopelado (plateado)
  rosetaOscura: '#7c9a7d',
  vena: '#e3eddd',
  flor: '#f2c531',
  florCentro: '#c98a1e',
  ojoHueco: '#22150a',
  escarcha: '#e9f4ff',
  raiz: '#5b3d22',
};

/* Perfil de clima del Ent (páramo alto): la niebla apenas lo difumina (es un
   gigante), casi no le pega la seca (guarda el agua) y NUNCA se sobrecalienta.
   Sin alas (es un árbol). Se pasa como perfil a cuerpoDeClima. */
const ENT_PERFIL_CUERPO = Object.freeze({ alas: false, humedad: 0.55, difusa: 0.3, sequia: 0.2 });
/* Perfil de "vestuario": adaptado a árbol de páramo → nunca suda (sudaAlSol
   false), siente el frío pronto (escarcha). Se pasa a ropaDeClima. */
const ENT_PERFIL_ROPA = Object.freeze({ frioC: 6, calorC: 40, sudaAlSol: false });

/* La CORONA en roseta: hojas lanceoladas que abren en abanico hacia arriba.
   Generadas deterministamente (fan de ángulos) — dos coronas: la trasera (más
   ancha y oscura) y la delantera (más clara), para dar volumen de "cabellera". */
function hojaPath(len, w) {
  // Hoja lanceolada que apunta hacia ARRIBA desde (0,0) hasta (0,-len).
  return `M0,0 C${-w},${-len * 0.42} ${-w * 0.5},${-len * 0.86} 0,${-len} `
    + `C${w * 0.5},${-len * 0.86} ${w},${-len * 0.42} 0,0 Z`;
}

function Roseta({ cx, cy, vivo, escarcha }) {
  // Fan trasero (7 hojas, -100°..100°) + delantero (9 hojas, -78°..78°).
  const traseras = Array.from({ length: 7 }, (_, i) => -100 + (200 / 6) * i);
  const delanteras = Array.from({ length: 9 }, (_, i) => -78 + (156 / 8) * i);
  return (
    <g className={`ent-roseta${vivo ? ' ent-roseta-viva' : ''}`}
      style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
      {/* corona trasera (volumen, más oscura) */}
      <g className={vivo ? 'ent-hoja-atras' : undefined} fill={ENT.rosetaOscura} stroke={ENT.cortezaOscura} strokeWidth="0.5">
        {traseras.map((a, i) => (
          <g key={`t${i}`} className={vivo ? 'ent-hoja' : undefined}
            style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animationDelay: `${-0.4 * i}s` }}
            transform={`rotate(${a} ${cx} ${cy})`}>
            <path d={hojaPath(10.5, 2.1)} transform={`translate(${cx} ${cy})`} />
          </g>
        ))}
      </g>
      {/* corona delantera (plateada, con vena central) */}
      <g fill={ENT.roseta} stroke={ENT.cortezaOscura} strokeWidth="0.55">
        {delanteras.map((a, i) => (
          <g key={`d${i}`} className={vivo ? 'ent-hoja' : undefined}
            style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animationDelay: `${-0.33 * i}s` }}
            transform={`rotate(${a} ${cx} ${cy})`}>
            <path d={hojaPath(9.2, 1.85)} transform={`translate(${cx} ${cy})`} />
            {/* vena central + brillo pubescente */}
            <path d={`M${cx},${cy} L${cx},${cy - 8.6}`} stroke={ENT.vena} strokeWidth="0.5" fill="none" opacity="0.7" />
            {escarcha && (
              <circle className="ent-escarcha-cristal" cx={cx} cy={cy - 6.2} r="0.6" fill={ENT.escarcha} />
            )}
          </g>
        ))}
      </g>
      {/* flores amarillas asomando en el centro de la corona */}
      <g className={vivo ? 'ent-flor' : undefined}>
        {[[-2.2, -7.4], [2.4, -7.0], [0, -9.2]].map(([fx, fy], i) => (
          <g key={`f${i}`}>
            {Array.from({ length: 8 }, (_, k) => (
              <ellipse key={k} cx={cx + fx} cy={cy + fy} rx="0.5" ry="1.15" fill={ENT.flor}
                transform={`rotate(${k * 45} ${cx + fx} ${cy + fy})`} />
            ))}
            <circle cx={cx + fx} cy={cy + fy} r="0.85" fill={ENT.florCentro} />
          </g>
        ))}
      </g>
    </g>
  );
}

/* La "faldita": hileras de hojas muertas colgando pegadas al tronco. */
function Faldita() {
  const filas = [-2.5, 1.5, 5.5, 9.5];
  return (
    <g className="ent-faldita" aria-hidden="true">
      {filas.map((y, fi) => (
        <g key={fi}>
          {[-4.6, -2.3, 0, 2.3, 4.6].map((x, i) => (
            <path key={i}
              d={`M${x},${y} Q${x - 1.5},${y + 3.2} ${x},${y + 5.4} Q${x + 1.5},${y + 3.2} ${x},${y} Z`}
              fill={(fi + i) % 2 ? ENT.faldita : ENT.falditaOscura}
              stroke={ENT.cortezaOscura} strokeWidth="0.35" opacity="0.92" />
          ))}
        </g>
      ))}
    </g>
  );
}

export function EntFrailejon({
  size = 96,
  className = '',
  inline = false,
  animated = true,
  title = 'El Ent del páramo (frailejón guardián)',
  /* Pose de VIDA. El Ent no anda ni brinca: su base es 'arraigado' (quieto,
     respirando con peso). 'reposo' = duerme el páramo; 'señala' = se inclina a
     mostrar algo (enseñando). Nada de 'celebra' hiperactiva. */
  pose = 'arraigado',
  animo = 'sereno',
  energia = 1,
  /* CLIMA REAL de páramo. Sin clima (avatar/catálogo) = neutro digno. */
  clima = null,
  enso = 'neutro',
  tempC = undefined,
  /* ── LIP-SYNC: la boca entre las grietas del tronco (visema por RMS). Sin
     visema = la hendidura serena de siempre → avatares no cambian. */
  visema = null,
  /* ── CLIMA DE PÁRAMO (opt-in): con vestuario=true el Ent se cubre de ESCARCHA
     de noche/frío y de NEBLINA cuando el aire está cargado. Vive en el frío:
     JAMÁS suda (mismo contrato compartido, adaptado). Default false. */
  vestuario = false,
  /* ── MODO-GUARDIÁN (su "modo poder"): cuando el páramo peligra el Ent se
     yergue — aura verde-plateada de 4 capas, ojos que brillan, la roseta se
     abre. Se siente que va a INTERVENIR. Sobrio y épico. */
  poder = false,
  /* ── ENSEÑA: postura de maestro (se inclina un poco, la roseta atenta). El
     TEXTO lo trae useEntGuion; acá solo marcamos data-ensena para la postura. */
  ensena = false,
  /* Device-tier: 'bajo' apaga el idle continuo (boil + mecido) y deja lo
     reactivo. Sin prop (standalone) = pleno. */
  tier,
  /* ── LÍNEA QUE RESPIRA (line-boil, MUY lento en el Ent — corteza ancestral). */
  lineBoil = false,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `ent-glow-${uid}`;
  const blur = `ent-blur-${uid}`;
  const boil = `ent-boil-${uid}`;
  const vivo = animated;
  const auraOp = Math.max(0.12, Math.min(0.34, 0.14 + 0.2 * (energia ?? 1)));

  // CLIMA → cuerpo (determinista): tinte + opacidad. Perfil de gigante de páramo.
  const cuerpoClima = cuerpoDeClima(clima, { enso: /** @type {any} */ (enso), tier, perfil: ENT_PERFIL_CUERPO });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  // CLIMA DE PÁRAMO (opt-in): derivamos el estado con el MISMO contrato
  // (ropaDeClima), pero el Ent no usa ruana/sombrero: su "abrigo" es la ESCARCHA
  // (frío/noche) y la NEBLINA. Y NUNCA suda (sudor forzado a false por su perfil).
  const estadoClima = (vestuario && clima) ? ropaDeClima(clima, { perfil: ENT_PERFIL_ROPA, tempC }) : null;
  const escarcha = !!(estadoClima && estadoClima.ruana); // frío/noche → escarcha
  const neblina = !!(estadoClima && estadoClima.niebla);
  const mojado = !!(estadoClima && estadoClima.mojado);

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {lineBoil && <LineBoilFilter id={boil} animated={vivo} baseFrequency={0.018} scale={3.2} dur="0.7s" />}
    </defs>
  );

  // NEBLINA: bandas tenues que cruzan el tronco (solo con clima de niebla).
  const bruma = neblina ? (
    <g className="ent-neblina" aria-hidden="true" fill={ENT.escarcha} opacity="0.42">
      <ellipse className={vivo ? 'ent-neblina-banda' : undefined} cx="0" cy="2" rx="15" ry="1.6" />
      <ellipse className={vivo ? 'ent-neblina-banda' : undefined} style={{ animationDelay: '-3s' }} cx="0" cy="8" rx="14" ry="1.3" />
    </g>
  ) : null;

  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* aura viva (presencia del gigante) */}
      <circle cx="0" cy="0" r="12.5" fill={ENT.roseta} opacity={auraOp} filter={`url(#${blur})`} />

      {/* RAÍCES que se asientan (base del árbol, detrás del tronco) */}
      <g className={vivo ? 'ent-raices' : undefined} stroke={ENT.raiz} strokeWidth="2.2" strokeLinecap="round" fill="none">
        <path d="M-3,15 C-6,16.5 -9,17 -11.5,17.4" />
        <path d="M-1.5,15.5 C-3,17.5 -4.5,18.4 -6.2,18.8" />
        <path d="M3,15 C6,16.5 9,17 11.5,17.4" />
        <path d="M1.5,15.5 C3,17.5 4.5,18.4 6.2,18.8" />
        <path d="M0,15.6 C0.3,17.6 0.4,18.6 0.2,19.2" />
      </g>

      {/* TRONCO alto (la línea gruesa que respira con el boil) — tapered path */}
      <path
        d="M-6,16 C-6.4,9 -5.2,1 -4.4,-5 C-4,-8 -2,-9 0,-9 C2,-9 4,-8 4.4,-5 C5.2,1 6.4,9 6,16 C4,17.6 -4,17.6 -6,16 Z"
        fill={ENT.corteza} stroke={RH_INK} strokeWidth="1.3"
        style={{ filter: `drop-shadow(0 0 5px ${ENT.cortezaOscura})` }} />
      {/* vetas/grietas de la corteza (la línea que respira) */}
      <g className="ent-grietas" stroke={ENT.grieta} strokeWidth="0.7" fill="none" strokeLinecap="round" opacity="0.75">
        <path d="M-2.6,-6 C-3.2,0 -3.4,7 -3,14" />
        <path d="M2.6,-6 C3.2,0 3.4,7 3,14" />
        <path d="M0,10 C-0.2,12 -0.2,14 0,15.6" />
      </g>

      {/* faldita de hojas muertas pegada al tronco */}
      <Faldita />

      {/* ── ROSTRO SABIO en la corteza ─────────────────────────────────────── */}
      {/* hoyos hundidos de los ojos (corteza oscura) — profundidad ancestral */}
      <g fill={ENT.ojoHueco}>
        <ellipse cx="-3" cy="-1" rx="2.5" ry="2.9" />
        <ellipse cx="3" cy="-1" rx="2.5" ry="2.9" />
      </g>
      {/* nariz-cresta de corteza entre los ojos */}
      <path d="M0,-2.4 C-0.7,-0.6 -0.7,1.6 0,2.6 C0.7,1.6 0.7,-0.6 0,-2.4 Z"
        fill={ENT.cortezaClara} opacity="0.7" />
      {/* CEJAS de corteza: gruesas cornisas SERENAS (no bravas) sobre los ojos —
          el rostro del anciano sabio, no del gruñón. */}
      <g className="ent-cejas" stroke={ENT.cortezaOscura} strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M-5.4,-3.6 C-4,-4.4 -2.2,-4.2 -1,-3.4" />
        <path d="M5.4,-3.6 C4,-4.4 2.2,-4.2 1,-3.4" />
      </g>
      {/* ojos hundidos que parpadean LENTO (rh-blink, ralentizado por la especie) */}
      <OjosRubber
        ojos={[{ cx: -3, cy: -1, r: 1.7 }, { cx: 3, cy: -1, r: 1.7 }]}
        mirar={[0, 0.18]}
        parpadea={vivo}
      />
      {/* BOCA entre las grietas del tronco: lip-sync si hay visema; si no, la
          hendidura serena (una grieta que sonríe apenas). */}
      <g className="ent-boca">
        {visema
          ? <BocaVisema cx={0} cy={5} w={4.2} prof={1.4} visema={visema} ink={ENT.grieta} />
          : <Sonrisa cx={0} cy={5} w={3.8} prof={1.2} ink={ENT.grieta} />}
      </g>

      {/* CORONA en roseta (su cabellera plateada) — se dibuja al FRENTE del tope
          del tronco, con las flores. Es lo que "se abre" en modo-guardián. */}
      <Roseta cx={0} cy={-7} vivo={vivo} escarcha={escarcha} />

      {/* NEBLINA que cruza el tronco (clima). */}
      {bruma}
    </g>
  );

  // Antics de VIDA (balanceo ancestral, muy lento) SOLO viva; nodo aparte para
  // no pisar el boil de `.crt-body`. El CSS lo apaga con RM / tier bajo.
  const conAntics = vivo ? (
    <g className="ent-balanceo">{body}</g>
  ) : body;
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{conAntics}</g> : conAntics;

  const estadoAttrs = {
    'data-creature': SLUG,
    'data-pose': vivo ? pose : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-visema': visema || undefined,
    'data-escarcha': escarcha ? '1' : undefined,
    'data-neblina': neblina ? '1' : undefined,
    'data-mojado': mojado ? '1' : undefined,
    'data-ensena': ensena ? '1' : undefined,
    'data-lineboil': lineBoil ? '1' : undefined,
  };

  if (inline) {
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
  // MODO-GUARDIÁN (standalone): lo envolvemos en su aura VERDE-PLATEADA de 4
  // capas (transformacion.css: glow radial + boost + ingravidez + corrientes).
  if (poder) {
    return (
      <span
        className="is-powered-up ent-poder"
        data-creature-poder={SLUG}
        style={{ '--aura-color': auraDeBicho(SLUG), display: 'inline-flex' }}
      >
        {svg}
        <AuraPoder />
      </span>
    );
  }
  return svg;
}

export default EntFrailejon;
