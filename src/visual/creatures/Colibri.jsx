import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, RH_INK, RH_BOCA } from './_rubberhose.jsx';
import { COLIBRI_PALETA, COLIBRI_PROPORCION } from './faunaAndina.js';
import { cuerpoDeClima, PERFIL_COLIBRI, ropaDeClimaBicho } from './creatureClimaCuerpo.js';
import { AccesoriosClima } from './AccesoriosClima.jsx';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { PropEnMano } from './PropEnMano.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';

/* Colibrí chillón — Colibri coruscans (el ave-agente de Chagra, HIPERACTIVO).
   Hermano rubber-hose de la abeja Angelita, el oso andino y la rana: compone el
   MISMO kit `_rubberhose.jsx` (ojos de goma, cachetes, sonrisa) y hereda la
   MISMA fundación transversal — lip-sync (useLipSync → el PICO habla), modo
   poder (transformacion), ropa por clima (ropaDeClima), prop por mundo
   (PropEnMano) y line-boil (LineBoilFilter) — cero código duplicado.
   Solo cambia el ANIMAL y su CARÁCTER: veloz, nervioso, zumbón, NUNCA quieto.
   Sigue siendo ÉL: dorso turquesa esmeralda, GORGUERA violeta iridiscente (la
   firma de la especie) y el pico recto y largo. Es de AIRE: se cierne vibrando
   y de pronto DARDEA — cambia de dirección de golpe con overshoot — dejando
   ESTELAS iridiscentes cian↔magenta (afterimages, la firma de SU carácter: el
   tornasol del plumaje quedándose un instante atrás del cuerpo). Su color de
   poder es el IRIDISCENTE cian-magenta (no el dorado de la abeja, ni el rojo
   del oso, ni el verde de la rana). La IDENTIDAD (paleta + proporciones) vive
   en `faunaAndina.js`; el CLIMA→cuerpo, en `creatureClimaCuerpo.js` con
   PERFIL_COLIBRI (plumas aceitadas que escurren el agua, ágil) — y como toda
   AVE: NUNCA suda (las aves no tienen glándulas sudoríparas).
   API estable (size/className/inline/animated/title) — los consumidores
   existentes heredan la hiperactividad sin tocar su código. */
const VIEWBOX = '-15 -16 36 30';

/* Timoneras de la cola (abanico a la izquierda). */
const COLA = [
  'M-6,1.4 L-13.2,-1.4 L-8,1.6 Z',
  'M-6,2.2 L-13.6,2.2 L-8,2.6 Z',
  'M-6,3.0 L-12.8,5.4 L-8,3.4 Z',
];

/* Alas en borrón (compartidas entre el cuerpo y sus estelas-afterimage). */
const ALA_DELANTERA = 'M3,-1.6 C-4.6,-15 10.8,-22 17.6,-13 C14.6,-5 8.2,-1.6 3,-1.6 Z';
const ALA_TRASERA = 'M2,0.6 C-4,12 9,16.4 13.6,8.8 C10.6,3.4 6,1.2 2,0.6 Z';

/* LIP-SYNC de PICO: cuánto abre la mandíbula inferior por visema (V1 cerrado =
   la sonrisa de siempre; V3 abierto amplio — el chillón chilla). El colibrí no
   tiene bocota de goma: su boca ES el pico, así que el visema de useLipSync se
   traduce a apertura de mandíbula (mismo contrato V1..V4, otra anatomía). */
const ABERTURA_VISEMA = { V2: 0.35, V3: 1, V4: 0.55 };

/* ESTELA iridiscente (afterimage): la silueta simplificada del ave (ala, cuerpo,
   cabeza, pico, timonera) en un solo tono tornasol. CSS la anima con el MISMO
   dardo que el cuerpo pero con delay → durante el dardo queda visiblemente
   ATRÁS (motion trail); cerniéndose casi coincide y solo asoma como fleco
   cromático en el contorno (el shimmer del plumaje). Decorativa → aria-hidden. */
function EstelaColibri({ clase, color, opacidad }) {
  return (
    <g className={`colibri-estela ${clase}`} fill={color} opacity={opacidad} aria-hidden="true">
      <path d={ALA_TRASERA} />
      <path d={COLA[1]} />
      <ellipse cx="0" cy="0.4" rx={COLIBRI_PROPORCION.troncoRx} ry={COLIBRI_PROPORCION.troncoRy} />
      <circle cx="6.6" cy="-2.4" r={COLIBRI_PROPORCION.cabezaR} />
      <path d="M9.6,-2.4 L18.4,-4.2" stroke={color} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d={ALA_DELANTERA} />
    </g>
  );
}

export function Colibri({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Colibrí',
  /* Pose de VIDA (idle-life), equivalentes a las de Angelita: 'vuela' (base,
     cernido nervioso + dardos con estela) | 'celebra' (brinco + aleteo a tope)
     | 'reposo' (se posa, alitas plegadas, respira — el ÚNICO momento quieto)
     | 'señala' (se inclina al POI y apunta con el pico). Gestos
     species-agnostic en `creatures.css` (rh-g-*); solo corren viva (animated). */
  pose = 'vuela',
  animo = 'sereno',
  energia = 1,
  clima = null,
  enso = /** @type {('nino'|'nina'|'neutro')} */ ('neutro'),
  /* ── LIP-SYNC (sistema transversal, useLipSync) ────────────────────────────
     visema opcional ('V1'..'V4') que produce useLipSync desde el RMS del TTS:
     el PICO se abre al hablar (mandíbula inferior + garganta al chillar). Sin
     visema (o 'V1') = la sonrisita de siempre → avatares/catálogo no cambian.
     El HOOK vive aparte (no cuelga un AnalyserNode por instancia). */
  visema = null,
  /* ── VESTUARIO por clima+hora (ropaDeClima) ───────────────────────────────
     OPT-IN: con vestuario=true el colibrí se abriga según el clima real
     (RUANITA de noche/frío). Es un AVE: NUNCA suda (las aves no tienen
     glándulas sudoríparas) → jamás sombrero ni gotas de sudor, aunque el
     termómetro suba (se suprimen aquí sin tocar la función compartida).
     Default false → los consumidores de `clima` existentes NO ven ropa nueva. */
  vestuario = false,
  tempC = undefined,
  /* ── ESTELAS iridiscentes (afterimages — SU firma de carácter) ─────────────
     Default ON viva: 2 siluetas tornasol (cian y magenta) que persiguen el
     cuerpo con delay — en cada DARDO quedan atrás como estela de velocidad.
     estelas={false} las apaga (hosts que quieran al colibrí sobrio). Con
     animated=false / reduced-motion / tier bajo no existen o quedan ocultas. */
  estelas = true,
  /* Device-tier (DR-3D-PERF-GAMABAJA): 'alto'|'medio' corren el rubber-hose
     pleno; 'bajo' apaga lo continuo (dardo + estelas + boil) y deja aleteo y
     estados reactivos. Sin prop (standalone: avatares, catálogo) = pleno. */
  tier = undefined,
  /* ── LÍNEA QUE RESPIRA (line-boil, Cuphead años 30 — LineBoilFilter) ────────
     OPT-IN: con lineBoil el CONTORNO vibra escalonado (feTurbulence +
     feDisplacement, ~8fps). Default false → consumidores existentes no
     cambian. Con animated=false o reduced-motion queda con seed fija. Capa MÁS
     cara del kit: reservada para su entrada heroica (galería, hero). */
  lineBoil = false,
  /* ── MODO PODER (power-up IRIDISCENTE cian-magenta — transformacion.css) ───
     OPT-IN: con poder=true (y en modo standalone) el colibrí se envuelve en su
     aura TORNASOL de 4 capas (glow radial cian→magenta, boost, ingravidez,
     corrientes alternadas). El host lo enciende un rato con usePoderTemporal().
     En modo inline el power-up lo pone el host DOM (::before/mix-blend no
     aplican a nodos SVG); acá solo marcamos data-poder. */
  poder = false,
  /* ── PROP POR MUNDO (herramienta en las patitas — propsPorMundo/PropEnMano) ─
     mundoId opcional: al ENTRAR a un mundo el colibrí carga su herramienta
     colgando de las patitas (agua→manguerita, suelo→lupa, animales→lazo,
     semillero→canasto…). Sin mundoId (o mundo sin prop) entra con las patitas
     libres (PropEnMano devuelve null, nunca rompe la escena). */
  mundoId = null,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const wing = animated ? 'crt-wing' : undefined;
  const vivo = animated;
  const auraOp = Math.max(0.16, Math.min(0.5, 0.2 + 0.3 * (energia ?? 1)));
  const auraR = 5.2 + 1.2 * (energia ?? 1);
  const estelasOn = vivo && !!estelas;

  // CLIMA → cuerpo (perfil colibrí). El aleteo base HIPERVELOZ (0.11s, en el
  // CSS del bloque colibrí) se apura (dorada) o pesa (lluvia) escalando por
  // velocidadAlas; solo estampamos inline cuando difiere de 1 para no pisar
  // los gestos CSS (celebra/reposo). Sin clima = neutro.
  const cuerpoClima = cuerpoDeClima(clima, { enso, tier, perfil: PERFIL_COLIBRI });
  const wingDur = (wing && cuerpoClima.velocidadAlas !== 1)
    ? { animationDuration: `${(0.11 / cuerpoClima.velocidadAlas).toFixed(3)}s` }
    : undefined;
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  // Vestuario por clima+hora (opt-in). Es AVE: RUANITA de noche/frío, y NUNCA
  // sombrero ni sudor (las aves no sudan) — mismo contrato que el oso de
  // páramo: se suprimen aquí sin tocar la función compartida (sus tests y su
  // contrato siguen intactos). Sin vestuario o sin clima → nada.
  const ropaBase = (vestuario && clima) ? ropaDeClimaBicho('colibri', clima, { tempC }) : null;
  const ropa = ropaBase ? { ...ropaBase, sombrero: false, sudor: false } : null;

  // LIP-SYNC de pico: el visema abre la mandíbula inferior (V3 = chillido
  // amplio con garganta visible). Determinista, cero estado.
  const abertura = visema ? (ABERTURA_VISEMA[visema] ?? 0) : 0;
  const picoBajoX = (17.8 - 1.4 * abertura).toFixed(2);
  const picoBajoY = (-3.4 + 3.8 * abertura).toFixed(2);

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {/* Line-boil (contorno que hierve) — solo se instancia si se pide. */}
      {lineBoil && <LineBoilFilter id={boil} animated={vivo} />}
    </defs>
  );

  // PROP DEL MUNDO colgando de las patitas (bajo el cuerpo, a su escala de
  // pajarito). Sin mundoId o mundo sin prop → null (patitas libres).
  const propMundo = mundoId ? (
    <PropEnMano mundoId={mundoId} x={0.6} y={9.8} escala={0.55} ink={RH_INK} animated={vivo} />
  ) : null;

  // ── CUERPO rubber-hose (atrás→adelante): aura, cola, ala trasera, patitas,
  //    cuerpo turquesa con vientre claro, ruanita, cabeza (gorguera + ojo +
  //    pico que habla), ala delantera en borrón, prop. `.crt-body` squashea
  //    (boil idle — RÁPIDO en el colibrí: cernido nervioso, ver CSS).
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* aura viva */}
      <circle cx="1" cy="0" r={auraR} fill={COLIBRI_PALETA.cuerpo} opacity={auraOp} filter={`url(#${blur})`} />

      {/* cola (abanico de timoneras a la izquierda) */}
      <g fill={COLIBRI_PALETA.cola} stroke={RH_INK} strokeWidth="0.5">
        {COLA.map((d, i) => (<path key={i} d={d} />))}
      </g>

      {/* ala TRASERA en borrón (batida): detrás del cuerpo, con smear del aleteo */}
      <path className={wing} style={{ animationDelay: '-0.05s', ...wingDur }}
        d={ALA_TRASERA}
        fill={COLIBRI_PALETA.cuerpo} opacity="0.4" stroke="rgba(42,26,12,0.3)" strokeWidth="0.5" />

      {/* patitas manguera diminutas (recogidas bajo el cuerpo) */}
      <path d="M-1.4,4.4 C-1.8,5.8 -1.6,6.6 -1.0,7.0" stroke={RH_INK} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M1.4,4.6 C1.2,6.0 1.4,6.8 2.0,7.2" stroke={RH_INK} strokeWidth="1.1" fill="none" strokeLinecap="round" />

      {/* cuerpo turquesa (gota) con contorno grueso (respira con el boil) */}
      <ellipse cx="0" cy="0.4" rx={COLIBRI_PROPORCION.troncoRx} ry={COLIBRI_PROPORCION.troncoRy}
        fill={COLIBRI_PALETA.cuerpo} stroke={RH_INK} strokeWidth="1.3"
        style={{ filter: `drop-shadow(0 0 6px ${COLIBRI_PALETA.cuerpoGlow})` }} />
      {/* vientre claro (el pecho que sube y baja) */}
      <path d="M-3,2.6 C2.4,4.6 7,4 10,1.8 C6.6,5.8 -0.4,6 -4,2.0 Z" fill={COLIBRI_PALETA.vientre} opacity="0.85" />

      {/* Vestuario por clima+hora (RUANITA de noche/frío) — solo con
          vestuario=true. Va SOBRE el tronco y BAJO la cabeza y el ala
          delantera (las alas salen del poncho — el pajarito sigue volando).
          Sombrero/sudor van suprimidos (las aves no sudan). */}
      {ropa && (
        <AccesoriosClima
          estado={ropa}
          tronco={{ cx: 0, cy: 0.4, rx: COLIBRI_PROPORCION.troncoRx, ry: COLIBRI_PROPORCION.troncoRy }}
          cabeza={{ cx: 6.6, cy: -2.4, r: COLIBRI_PROPORCION.cabezaR }}
          animated={vivo}
        />
      )}

      {/* cabeza turquesa con contorno */}
      <circle cx="6.6" cy="-2.4" r={COLIBRI_PROPORCION.cabezaR} fill={COLIBRI_PALETA.cuerpo} stroke={RH_INK} strokeWidth="1.2" />
      {/* GORGUERA violeta iridiscente (la firma de la especie): mancha bajo la
          cara + brillo tornasol */}
      <path d="M5.0,-0.2 C6.6,2.2 9.4,2.2 10.8,-0.2 C10.2,2.6 5.8,2.8 5.0,-0.2 Z"
        fill={COLIBRI_PALETA.garganta} opacity="0.95" />
      <path d="M6.4,0.2 C7.2,1.2 8.6,1.2 9.4,0.2 C8.6,1.4 7.2,1.4 6.4,0.2 Z"
        fill={COLIBRI_PALETA.gargantaBrillo} opacity="0.8" />
      {/* chapeta + sonrisa mínima en la base del pico (solo con el pico
          cerrado: al hablar, el pico ES la boca) */}
      <Cachetes puntos={[{ cx: 5.0, cy: -1.4, r: 1.0 }]} vivo={vivo} />
      {!abertura && <Sonrisa cx={8.4} cy={-1.0} w={1.8} prof={0.7} />}
      {/* GARGANTA al chillar (V3/V4: la cuña cálida entre mandíbulas) */}
      {abertura >= 0.5 && (
        <path className="colibri-garganta"
          d={`M9.7,-2.1 L13.6,-2.9 L12.6,${(-2.7 + 2.4 * abertura).toFixed(2)} Z`}
          fill={RH_BOCA} />
      )}
      {/* PICO recto y largo (dos mandíbulas de tinta cálida). La inferior es la
          que HABLA: se abre según el visema (lip-sync de pico). */}
      <path d="M9.6,-2.4 L18.4,-4.2" stroke={RH_INK} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d={`M9.6,-1.4 L${picoBajoX},${picoBajoY}`}
        stroke={RH_INK} strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.7" />
      {/* ojo de goma grande (3/4: uno prominente) — MIRADA RÁPIDA (ver CSS:
          el colibrí dardea también con los ojitos) */}
      <OjosRubber
        ojos={[{ cx: 6.9, cy: -3.0, r: 1.7 }]}
        mirar={[0.32, 0.2]}
        parpadea={vivo}
      />

      {/* ala DELANTERA en borrón (batida, encima del cuerpo con smear) */}
      <path className={wing} style={wingDur}
        d={ALA_DELANTERA}
        fill={COLIBRI_PALETA.ala} opacity="0.78" stroke="rgba(42,26,12,0.35)" strokeWidth="0.5" />

      {/* Prop del mundo colgando de las patitas (entra con su herramienta). */}
      {propMundo}
    </g>
  );

  // DARDO + ESTELAS: el cuerpo dardea (cambios de dirección bruscos con
  // overshoot — CSS colibri-dardo) y las 2 siluetas tornasol lo persiguen con
  // delay (afterimages). Las estelas van DETRÁS (el cuerpo las tapa cerniéndose
  // y las suelta al dardear). Solo existen viva; CSS las esconde fuera de
  // 'vuela' y en tier bajo / reduced-motion.
  const conDardo = estelasOn ? (
    <g>
      <EstelaColibri clase="colibri-estela--2" color={COLIBRI_PALETA.irisMagenta} opacidad={0.22} />
      <EstelaColibri clase="colibri-estela--1" color={COLIBRI_PALETA.irisCian} opacidad={0.3} />
      <g className="colibri-dardo">{body}</g>
    </g>
  ) : (vivo ? <g className="colibri-dardo">{body}</g> : body);

  // Antics de VIDA (períodos co-primos) SOLO viva; nodos aparte para no pisar
  // ni el boil de `.crt-body` ni el dardo. El CSS los apaga con RM / tier bajo /
  // ánimo bajo / durante los gestos.
  const conAntics = vivo ? (
    <g className="rh-antic">
      <g className="rh-travieso">{conDardo}</g>
    </g>
  ) : conDardo;
  // El line-boil (contorno que hierve) envuelve TODO el dibujo cuando se pide
  // (grupo aparte: no colisiona con el glow del `.crt-body`).
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{conAntics}</g> : conAntics;

  const estadoAttrs = {
    'data-creature': 'colibri',
    'data-pose': vivo ? pose : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-visema': visema || undefined,
    'data-ruana': ropa?.ruana ? '1' : undefined,
    'data-mojado': ropa?.mojado ? '1' : undefined,
    'data-estelas': estelasOn ? '1' : undefined,
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
  // MODO PODER (standalone): el aura IRIDISCENTE cian-magenta de 4 capas
  // (transformacion.css + el tornasol del bloque colibrí en creatures.css:
  // glow radial cian→magenta que rota de tono + corrientes alternadas). El
  // wrapper DOM es lo único que puede llevar ::before/mix-blend/corrientes.
  if (poder) {
    return (
      <span
        className="is-powered-up colibri-poder"
        data-creature-poder="colibri"
        style={{ '--aura-color': auraDeBicho('colibri'), display: 'inline-flex' }}
      >
        {svg}
        <AuraPoder />
      </span>
    );
  }
  return svg;
}

export default Colibri;
