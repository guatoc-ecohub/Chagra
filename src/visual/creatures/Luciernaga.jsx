import { useId, useRef } from 'react';
import './creatures.css';
import { useVidaIdle, useRitmoPropio, useMiradaUsted } from './useVidaIdle.js';
import { CreatureFilters } from './_filters.jsx';
import {
  OjosRubber, Cachetes, Sonrisa, BocaVisema, RH_INK,
} from './_rubberhose.jsx';
import {
  LUCIERNAGA_PALETA, LUCIERNAGA_PROPORCION, LUCIERNAGA_SLUG, PERFIL_LUCIERNAGA,
} from './luciernagaIdentidad.js';
import { cuerpoDeClima } from './creatureClimaCuerpo.js';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';
import { CompaiAgente } from '../agente/CompaiAgente.jsx';
import { COMPAI_ESPECIES } from '../agente/compaiEspecies.js';

/* LA LUCIÉRNAGA (cocuyo) — Lampyridae, el ESCARABAJO bioluminiscente de la finca:
   guía NOCTURNA, científica y BIOINDICADORA — la que "lee la noche". Hermana
   rubber-hose de la abeja Angelita (la MISMA familia de personaje-guía) y del
   jaguar y la zarigüeya: compone el MISMO kit `_rubberhose.jsx` (ojos de goma,
   cachetes, sonrisa) y hereda la MISMA fundación transversal — vida propia
   (useVidaIdle, ritmo propio, la mirada que reconoce), lip-sync (BocaVisema),
   modo poder (aura VERDE-LINTERNA) y line-boil — cero código duplicado. Solo
   cambia el ANIMAL y su CARÁCTER.

   ── FIDELIDAD DE ESPECIE (innegociable, DR-luciernaga.md) ─────────────────────
   NO es una mosca ni una abeja: es un ESCARABAJO (Coleoptera, Lampyridae). El
   dibujo lo respeta y calca el arte aprobado (demos/luciernaga):
     · ÉLITROS (alas endurecidas) que forman el caparazón compacto y achatado de
       altura fría, con sutura central y margen lateral pálido.
     · PRONOTO: el escudo de borde coral que ENCAPUCHA la cabeza (su firma).
     · ANTENAS filiformes con bulbo (no mazas).
     · LA LINTERNA: el órgano bioluminiscente del abdomen, luz amarillo-verde
       FRÍA — su rasgo estrella.

   ── LA LINTERNA ES UN MEDIDOR VIVO (el carácter científico) ───────────────────
   El prop `eco` maneja la linterna como BIOINDICADOR del cambio climático (ver
   LUCIERNAGA_ESTADOS_ECO): 'sano' late fuerte, 'degradado' titila débil a punto
   de apagarse, 'leer' pulsa atenta mientras mide la noche, 'pacto' vuelve fuerte
   y sereno. Sin `eco` (o 'normal') late suave — viva, sin diagnosticar. La
   CADENCIA vive en `creatures.css` (`[data-eco='…']`).

   La IDENTIDAD (paleta + proporciones + firma + estados eco) vive en
   `luciernagaIdentidad.js`; la CADENCIA, en `creatures.css` (clases `luci-*`). */
const VIEWBOX = '-175 -150 350 340';
const LUCIERNAGA_PERFIL = COMPAI_ESPECIES.luciernaga;

function LuciernagaRig({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  reducedMotion = false,
  estado = 'acompana',
  title = 'Luciérnaga (cocuyo)',
  /* Pose de VIDA (idle-life), species-agnostic (gestos rh-g-* de creatures.css):
     'vuela' (base, flota) | 'celebra' | 'reposo' | 'señala'. */
  pose = 'vuela',
  animo = 'sereno',
  energia = 1,
  /* CLIMA REAL escrito en el cuerpo (perfil luciérnaga: la niebla se la traga,
     la seca la amenaza). Sin clima (avatares, catálogo) = neutro digno. */
  clima = null,
  enso = 'neutro',
  /* ── LIP-SYNC (sistema transversal, useLipSync) ────────────────────────────
     visema opcional ('V1'..'V4'): la boca amable se abre cuando el agente narra.
     Sin visema (o 'V1') = la sonrisa de goma de siempre. */
  visema = null,
  /* ── ECO — LA LINTERNA COMO BIOINDICADOR (su firma científica) ──────────────
     null|'normal' (reposo, late suave) | 'sano' (fuerte y grande) | 'leer'
     (atenta, lee la noche) | 'degradado' (titila débil: el aviso del cambio
     climático) | 'pacto' (fuerte y serena). Ver LUCIERNAGA_ESTADOS_ECO. */
  eco = null,
  /* Device-tier (DR-3D-PERF-GAMABAJA): 'alto'|'medio' corren el rubber-hose
     pleno; 'bajo' apaga el idle continuo (boil + aleteo + antenas) y deja la
     linterna latiendo (su señal no se apaga: es su alma). */
  tier,
  /* ── LÍNEA QUE RESPIRA (line-boil, Cuphead años 30) — OPT-IN. ───────────────*/
  lineBoil = false,
  /* ── MODO PODER (transformación / power-up VERDE-LINTERNA) — OPT-IN. ────────*/
  poder = false,
  /* ── VIDA PROPIA (idle-cerebro v2 — la vara de Angelita). Default ON. ───────*/
  vida = true,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const gElytra = `luci-elytra-${uid}`;
  const gPronoto = `luci-pronoto-${uid}`;
  const gLinterna = `luci-linterna-${uid}`;
  const gHalo = `luci-halo-${uid}`;
  const vivo = animated && !reducedMotion;

  // ═══ VIDA PROPIA (idle-cerebro + ritmo propio + mirada — vara Angelita v2).
  const raizRef = useRef(null);
  const ritmoPropio = useRitmoPropio();
  const enBase = pose === 'vuela' && !visema;
  const momento = useVidaIdle('luciernaga', vida && vivo && tier !== 'bajo' && enBase);
  useMiradaUsted(raizRef, vida && vivo && tier !== 'bajo');
  const destellaFx = momento === 'destella';
  const leeFx = eco === 'leer' || momento === 'lee';
  const poseFx = momento === 'reposo' ? 'reposo' : pose;
  // La lectura de eco: 'leer' del momento idle se traduce a data-eco='leer'.
  const ecoFx = eco || (momento === 'lee' ? 'leer' : null);

  // CLIMA → cuerpo (determinista): tinte + opacidad al contorno.
  const cuerpoClima = cuerpoDeClima(clima, { enso: /** @type {any} */ (enso), tier, perfil: PERFIL_LUCIERNAGA });
  const climaEstado = typeof clima === 'string' ? clima : clima?.estado || clima?.tipo;
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  const P = LUCIERNAGA_PALETA;
  const auraOp = Math.max(0.12, Math.min(0.34, 0.14 + 0.2 * (energia ?? 1)));

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {/* ÉLITROS con volumen: luz dorsal → sombra ventral (calcado del arte). */}
      <linearGradient id={gElytra} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={P.elitroLuz} />
        <stop offset="0.55" stopColor={P.elitro} />
        <stop offset="1" stopColor={P.elitroSombra} />
      </linearGradient>
      {/* PRONOTO coral (el escudo). */}
      <linearGradient id={gPronoto} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={P.pronoto} />
        <stop offset="1" stopColor={P.pronotoSombra} />
      </linearGradient>
      {/* LINTERNA: núcleo blanco-cálido → amarillo-verde → verde de borde. */}
      <radialGradient id={gLinterna} cx="0.5" cy="0.38" r="0.65">
        <stop offset="0" stopColor={P.linternaNucleo} />
        <stop offset="0.5" stopColor={P.linternaMedio} />
        <stop offset="1" stopColor={P.linternaBorde} />
      </radialGradient>
      {/* HALO grande de la luz (se desvanece al borde). */}
      <radialGradient id={gHalo} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor={P.haloDentro} stopOpacity="0.9" />
        <stop offset="0.45" stopColor={P.linternaBorde} stopOpacity="0.38" />
        <stop offset="1" stopColor={P.haloFuera} stopOpacity="0" />
      </radialGradient>
      {lineBoil && <LineBoilFilter id={boil} animated={vivo} />}
    </defs>
  );

  // BOCA: visema (el agente narra) o la sonrisa amable de siempre.
  const boca = visema
    ? <BocaVisema cx={0} cy={-9} w={16} prof={5} visema={visema} />
    : <Sonrisa cx={0} cy={-9} w={15} prof={5} />;

  // ── CUERPO (atrás→adelante). `.crt-body` es el nodo que squashea (boil). Nota:
  //    coordenadas del arte aprobado (demos/luciernaga), viewBox grande.
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* AURA viva (presencia de luz, no de masa) */}
      <ellipse cx="0" cy="60" rx="150" ry="180" fill={P.luz} opacity={auraOp * 0.5} filter={`url(#${blur})`} />

      {/* HALO GRANDE de la linterna (detrás del cuerpo) — su alma envuelve todo.
          Late/titila con el estado eco (CSS). */}
      <circle className={vivo ? 'luci-linterna-halo' : undefined} cx="0" cy="152" r="78"
        fill={`url(#${gHalo})`} aria-hidden="true"
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />

      {/* ALAS membranosas (detrás de los élitros, borrosas) — abanican vivas. */}
      <g transform="translate(-30,18) rotate(14)">
        <g className={vivo ? 'luci-ala luci-ala-i' : undefined} style={{ transformBox: 'fill-box', transformOrigin: '100% 100%' }}>
          <path d="M0,0 C -46,-8 -100,-4 -134,-44 C -100,-64 -48,-42 -8,-6 Z" transform="rotate(20 0 0)"
            fill="#cfe0a0" opacity="0.16" filter={`url(#${blur})`} />
          <path d="M0,0 C -46,-8 -100,-4 -134,-44 C -100,-64 -48,-42 -8,-6 Z" fill="#d8e6a8" opacity="0.28" />
        </g>
      </g>
      <g transform="translate(30,18) rotate(-14)">
        <g className={vivo ? 'luci-ala luci-ala-d' : undefined} style={{ transformBox: 'fill-box', transformOrigin: '0% 100%' }}>
          <path d="M0,0 C 46,-8 100,-4 134,-44 C 100,-64 48,-42 8,-6 Z" transform="rotate(-20 0 0)"
            fill="#cfe0a0" opacity="0.16" filter={`url(#${blur})`} />
          <path d="M0,0 C 46,-8 100,-4 134,-44 C 100,-64 48,-42 8,-6 Z" fill="#d8e6a8" opacity="0.28" />
        </g>
      </g>

      {/* PATAS (6 en total con las delanteras): traseras + medias, con sus puntas */}
      <g stroke={P.tinta} strokeWidth="8.5" strokeLinecap="round" fill="none" aria-hidden="true">
        <path d="M-26,102 C -50,118 -64,142 -62,164" />
        <path d="M26,102 C 50,118 64,142 62,164" />
        <path d="M-52,56 C -86,66 -110,72 -124,64" />
        <path d="M52,56 C 86,66 110,72 124,64" />
      </g>
      <g fill={P.tinta} aria-hidden="true">
        <circle cx="-62" cy="166" r="4.2" /><circle cx="62" cy="166" r="4.2" />
        <circle cx="-125" cy="64" r="4.2" /><circle cx="125" cy="64" r="4.2" />
      </g>

      {/* ÉLITROS (alas endurecidas): cuerpo MACIZO y compacto de altura fría. */}
      <g>
        <path d="M0,-16 C -44,-16 -74,10 -76,50 C -78,86 -54,114 -24,124 C -12,129 12,129 24,124 C 54,114 78,86 76,50 C 74,10 44,-16 0,-16 Z"
          fill={`url(#${gElytra})`} stroke={P.tinta} strokeWidth="4.5" />
        {/* brillo de volumen en cada élitro */}
        <ellipse cx="-38" cy="18" rx="14" ry="32" fill={P.elitroBrillo} opacity="0.35" transform="rotate(-9 -38 18)" />
        <ellipse cx="38" cy="18" rx="14" ry="32" fill={P.elitroBrillo} opacity="0.35" transform="rotate(9 38 18)" />
        {/* margen lateral pálido (rasgo Lampyridae) */}
        <path d="M-72,24 C -74,58 -58,96 -28,118" stroke={P.margen} strokeWidth="5.5" fill="none" strokeLinecap="round" opacity="0.85" />
        <path d="M72,24 C 74,58 58,96 28,118" stroke={P.margen} strokeWidth="5.5" fill="none" strokeLinecap="round" opacity="0.85" />
        {/* SUTURA central (los dos élitros se juntan — su costura, la firma) */}
        <path d="M0,-8 L0,120" stroke={P.sutura} strokeWidth="4" strokeLinecap="round" />
        <path d="M-3,-6 L-3,114" stroke="#4a4130" strokeWidth="1.6" opacity="0.6" />
        <path d="M3,-6 L3,114" stroke="#4a4130" strokeWidth="1.6" opacity="0.6" />
        {/* punteado de la cutícula */}
        <g fill={P.sutura} opacity="0.38" aria-hidden="true">
          <circle cx="-46" cy="38" r="1.6" /><circle cx="-40" cy="62" r="1.6" /><circle cx="-48" cy="82" r="1.5" />
          <circle cx="-34" cy="98" r="1.5" /><circle cx="46" cy="38" r="1.6" /><circle cx="40" cy="62" r="1.6" />
          <circle cx="48" cy="82" r="1.5" /><circle cx="34" cy="98" r="1.5" />
        </g>
        {/* escutelo (triangulito entre la base de los élitros) */}
        <path d="M-12,-12 L12,-12 L0,9 Z" fill={P.escutelo} stroke={P.sutura} strokeWidth="1.5" />
      </g>

      {/* ABDOMEN ventral pálido con segmentos, asomando bajo los élitros */}
      <path d="M-28,116 C -32,138 -18,168 0,168 C 18,168 32,138 28,116 Z" fill={P.abdomen} stroke={P.tinta} strokeWidth="3" />
      <path d="M-25,128 C -9,134 9,134 25,128" stroke={P.tinta} strokeWidth="2" fill="none" opacity="0.45" />

      {/* LA LINTERNA (órgano bioluminiscente en los últimos segmentos) — su alma
          y su medidor. Late/titila con el estado eco (CSS). */}
      <g className={vivo ? 'luci-linterna-core' : undefined} aria-hidden="true"
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <path d="M-24,132 C -28,150 -16,168 0,168 C 16,168 28,150 24,132 C 8,138 -8,138 -24,132 Z" fill={`url(#${gLinterna})`} />
        <path d="M-20,148 C -6,152 6,152 20,148" stroke={P.linternaBorde} strokeWidth="2" fill="none" opacity="0.6" />
        <ellipse cx="0" cy="150" rx="11" ry="9" fill={P.linternaNucleo} opacity="0.92" />
      </g>

      {/* TESTA (la cabeza + antenas + pronoto): grupo propio que se ladea al
          leer la noche (data-eco='leer'). */}
      <g className="luci-testa" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
        {/* CABEZA (parcialmente encapuchada por el pronoto) */}
        <g>
          <path d="M-38,-46 C -40,-16 -26,-2 0,-2 C 26,-2 40,-16 38,-46 C 30,-58 -30,-58 -38,-46 Z"
            fill={P.cabeza} stroke={P.tinta} strokeWidth="3.5" />
          {/* OJOS compuestos grandes y vidriosos (kit de la casa: catchlight,
              parpadeo con ritmo propio, la mirada que reconoce) */}
          <OjosRubber
            ojos={[{ cx: -22, cy: -32, r: 22 }, { cx: 22, cy: -32, r: 22 }]}
            mirar={[0, 0.12]}
            parpadea={vivo}
            ink={P.tinta}
          />
          {/* cachetes campesinos (calidez, como la abeja angelita) */}
          <Cachetes puntos={[{ cx: -31, cy: -13, r: 8.5 }, { cx: 31, cy: -13, r: 8.5 }]} color={P.cachete} vivo={vivo} />
          {boca}
        </g>

        {/* ANTENAS filiformes con bulbo (base bajo el pronoto) — se enderezan al
            leer la noche */}
        <g transform="translate(-24,-50)">
          <g className={vivo ? 'luci-antena luci-antena-i' : undefined} style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}>
            <path d="M0,0 C -14,-30 -26,-56 -22,-84" stroke={P.tinta} strokeWidth="6" fill="none" strokeLinecap="round" />
            <circle cx="-22" cy="-86" r="5.4" fill="#2a1c10" stroke={P.tinta} strokeWidth="2" />
          </g>
        </g>
        <g transform="translate(24,-50)">
          <g className={vivo ? 'luci-antena luci-antena-d' : undefined} style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}>
            <path d="M0,0 C 14,-30 26,-56 22,-84" stroke={P.tinta} strokeWidth="6" fill="none" strokeLinecap="round" />
            <circle cx="22" cy="-86" r="5.4" fill="#2a1c10" stroke={P.tinta} strokeWidth="2" />
          </g>
        </g>

        {/* PRONOTO (el escudo que encapucha la cabeza; borde cálido rojo-coral —
            su firma de silueta) */}
        <g className="luci-pronoto">
          <path d="M-66,-42 C -74,-80 -46,-104 0,-104 C 46,-104 74,-80 66,-42 C 42,-27 -42,-27 -66,-42 Z"
            fill={`url(#${gPronoto})`} stroke={P.tinta} strokeWidth="4.5" />
          {/* mancha oscura central (patrón real Lampyridae) */}
          <ellipse cx="0" cy="-66" rx="33" ry="22" fill={P.pronotoMancha} />
          {/* dos ventanas cálidas a los lados de la mancha */}
          <ellipse cx="-40" cy="-63" rx="10" ry="14" fill={P.pronotoVentana} opacity="0.8" />
          <ellipse cx="40" cy="-63" rx="10" ry="14" fill={P.pronotoVentana} opacity="0.8" />
          <path d="M-50,-70 C -36,-94 36,-94 50,-70" stroke={P.pronotoBorde} strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.7" />
        </g>
      </g>

      {/* BRAZOS (patas delanteras que gesticulan; manitas cálidas) */}
      <g transform="translate(-30,6)">
        <g className={vivo ? 'crt-brazo-l rh-sway' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'right top', animationDelay: '-0.2s' }}>
          <path d="M0,0 C -26,-6 -46,-2 -62,-14" stroke={P.tinta} strokeWidth="9" fill="none" strokeLinecap="round" />
          <circle cx="-66" cy="-16" r="12" fill={P.mano} stroke={P.tinta} strokeWidth="3.5" />
        </g>
      </g>
      <g transform="translate(30,6)">
        <g className={vivo ? 'crt-brazo-r rh-sway' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'left top', animationDelay: '-0.5s' }}>
          <path d="M0,0 C 26,-6 46,-2 62,-14" stroke={P.tinta} strokeWidth="9" fill="none" strokeLinecap="round" />
          <circle cx="66" cy="-16" r="12" fill={P.mano} stroke={P.tinta} strokeWidth="3.5" />
        </g>
      </g>
    </g>
  );

  // Antics de VIDA (períodos co-primos) SOLO viva; nodos aparte para no pisar el
  // boil de `.crt-body`. Envueltos en el bob de flota (luci-flota).
  const conAntics = vivo ? (
    <g className="rh-antic">
      <g className="rh-travieso">
        <g className="luci-flota" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>{body}</g>
      </g>
    </g>
  ) : body;
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{conAntics}</g> : conAntics;

  const estadoAttrs = {
    'data-creature': LUCIERNAGA_SLUG,
    'data-agt-estado': estado,
    'data-pose': vivo ? poseFx : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-clima': climaEstado || undefined,
    'data-visema': visema || undefined,
    'data-eco': ecoFx || undefined,
    'data-destella': destellaFx ? '1' : undefined,
    'data-lee': leeFx ? '1' : undefined,
    'data-vida': momento || undefined,
    'data-lineboil': lineBoil ? '1' : undefined,
  };

  // El ritmo propio (parpadeo/dardeo por instancia) viaja como vars CSS.
  const estiloRaiz = { ...ritmoPropio, ...estiloClima };

  if (inline) {
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
  // MODO PODER (standalone): aura VERDE-LINTERNA de 4 capas.
  if (poder) {
    return (
      <span
        className="is-powered-up luciernaga-poder"
        data-creature-poder={LUCIERNAGA_SLUG}
        style={{ '--aura-color': auraDeBicho(LUCIERNAGA_SLUG), display: 'inline-flex' }}
      >
        {svg}
        <AuraPoder />
      </span>
    );
  }
  return svg;
}

const POSE_RIG_DE_ESTADO = LUCIERNAGA_PERFIL.posePorEstado;

function AdaptadorLuciernaga({
  especie: _especie,
  creatureSlug: _creatureSlug,
  capacidades: _capacidades,
  perfil: _perfil,
  idlePerfil: _idlePerfil,
  climaPerfil: _climaPerfil,
  pose: posePerfil,
  estadoLegado = undefined,
  reducedMotion,
  'data-agt-especie': dataEspecie,
  'data-creature': dataCreature,
  'data-agt-estado': dataEstado,
  'data-pose': dataPose,
  'data-visema': dataVisema,
  'data-clima': dataClima,
  'data-tier': dataTier,
  ...props
}) {
  const estadoActual = estadoLegado || dataEstado || 'acompana';
  const pose = POSE_RIG_DE_ESTADO[estadoActual] || posePerfil || 'vuela';
  return (
    <LuciernagaRig
      {...props}
      estado={estadoActual}
      pose={pose}
      reducedMotion={reducedMotion}
      tier={dataTier}
      data-agt-especie={dataEspecie}
      data-creature={dataCreature}
      data-agt-estado={estadoActual}
      data-pose={dataPose || pose}
      data-visema={dataVisema}
      data-clima={dataClima}
      data-tier={dataTier}
    />
  );
}

/** Fachada compatible de la luciérnaga sobre el contrato común Compai. */
export function Luciernaga({ estado = 'acompana', ...props }) {
  return (
    <CompaiAgente
      {...props}
      estado={estado}
      estadoLegado={estado}
      especie={LUCIERNAGA_PERFIL.avatarType}
      chrome={false}
      preserveRigAnimation
      adaptador={AdaptadorLuciernaga}
    />
  );
}

export { LuciernagaRig };
export default Luciernaga;
