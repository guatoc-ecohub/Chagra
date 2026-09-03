import { useId } from 'react';
import './creatures.css';
import './tintaChivitoLuciernaga.css';
import { CreatureFilters } from './_filters.jsx';
import {
  OjosRubber, Cachetes, BocaVisema, Miembro, RH_INK, RH_GLOVE,
} from './_rubberhose.jsx';
import { LUCIERNAGA_SLUG, PERFIL_LUCIERNAGA } from './luciernagaIdentidad.js';
import { LUCIERNAGA_TINTA_PALETA } from './luciernagaTintaIdentidad.js';
import { cuerpoDeClima } from './creatureClimaCuerpo.js';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';

/* LA LUCIÉRNAGA DE PIE — Lampyridae (cocuyo), la científica nocturna PARADA
   con su lápiz y su libro. TINTA NUEVA dibujada a mano (2026-08-31, base
   aprobada por el operador en `public/valle/compai/laminas/luciernaga.png`):
   línea limpia + planos de color, con el ABDOMEN LUMINOSO como acento — la
   lámina es la REFERENCIA DE IDENTIDAD, no un calco. Cero vtracer.

   Convive sin pisar nada con `Luciernaga.jsx` (la composición entomológica de
   cuerpo entero, arte congelado): esta es la VERSIÓN PERSONAJE de la base
   aprobada — de pie, guantes blancos y botas rubber-hose, lápiz + libro (la
   misma pareja de props del chivito: los dos anotan lo que el monte dicta).

   ── SU FIRMA ES DE FORMA (LUCIERNAGA_FIRMA sigue mandando) ──────────────────
   · PRONOTO-CAPUCHA: el escudo que asoma detrás de la cabeza como cuello.
   · ÉLITROS: los dos faldones duros que cuelgan a los lados como levita,
     con su margen lateral pálido (rasgo Lampyridae).
   · ANTENAS FILIFORMES con bulbo (escarabajo, no mariposa).
   · LA LINTERNA: el abdomen remata en segmentos pálidos y los últimos se
     ENCIENDEN amarillo-verde frío — su alma. Late suave (lucit-pulso, período
     co-primo 3.4s); en tier bajo queda encendida FIJA (su señal no se apaga).

   El molde de ESTRUCTURA es `Zariguya.jsx` (capas por región, kit rubber-hose,
   clima al cuerpo); la CADENCIA nueva vive en `tintaChivitoLuciernaga.css`. */
const VIEWBOX = '-18 -28 36 50';

export function LuciernagaTinta({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Luciérnaga (cocuyo)',
  /* Pose de VIDA (idle-life), species-agnostic (gestos rh-g-* de creatures.css):
     'anda' (base) | 'celebra' | 'reposo' | 'señala'. */
  pose = 'anda',
  animo = 'sereno',
  energia = 1,
  /* CLIMA REAL escrito en el cuerpo (PERFIL_LUCIERNAGA: la niebla se la traga,
     la seca la amenaza — el perfil canónico de la especie, reusado). */
  clima = null,
  enso = 'neutro',
  /* ── LIP-SYNC (useLipSync → BocaVisema, transversal) ───────────────────────*/
  visema = null,
  /* ── LA LINTERNA: 'suave' (late, default) | 'fuerte' | 'apagada' ───────────
     El acento de la base aprobada. 'fuerte' agranda el halo (leyendo la noche
     con toda), 'apagada' la deja en segmentos pálidos (de día, o el aviso).
     El medidor eco completo vive en la Luciernaga entomológica; acá el
     personaje solo necesita su acento de luz. */
  linterna = 'suave',
  /* Device-tier (DR-3D-PERF-GAMABAJA): 'bajo' apaga el idle continuo; la
     linterna queda encendida FIJA (su alma no se apaga). */
  tier,
  /* ── LÍNEA QUE RESPIRA (line-boil, Cuphead años 30) — OPT-IN. ──────────────*/
  lineBoil = false,
  /* ── MODO PODER (transformación / power-up VERDE-LINTERNA) — OPT-IN. ───────*/
  poder = false,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const vivo = animated;
  const P = LUCIERNAGA_TINTA_PALETA;
  const auraOp = Math.max(0.12, Math.min(0.32, 0.13 + 0.18 * (energia ?? 1)));
  const auraR = 8.0 + 1.3 * (energia ?? 1);

  const cuerpoClima = cuerpoDeClima(clima, {
    enso: /** @type {any} */ (enso), tier, perfil: PERFIL_LUCIERNAGA,
  });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {lineBoil && <LineBoilFilter id={boil} animated={vivo} />}
    </defs>
  );

  const boca = visema
    ? <BocaVisema cx={0.4} cy={2.5} w={2.6} prof={1.0} visema={visema} />
    : <BocaVisema cx={0.4} cy={2.5} w={2.6} prof={1.0} visema="V1" />;

  const luce = linterna !== 'apagada';
  const haloR = linterna === 'fuerte' ? 8.2 : 6.2;
  const pulsa = vivo && luce;

  // ── CUERPO tinta (atrás→adelante): aura, élitros-levita, patas con botas,
  //    halo de la linterna, tórax, abdomen (linterna), pronoto, libro + brazo,
  //    cabeza (antenas, cara, ojos), brazo del lápiz.
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* aura viva (bicho chico: su presencia es la luz, no la masa) */}
      <circle cx="0" cy="0" r={auraR} fill={P.torax} opacity={auraOp} filter={`url(#${blur})`} />

      {/* ── LOS ÉLITROS-LEVITA: los faldones duros que cuelgan a los lados ── */}
      <g className="lucit-elitros">
        <path d="M-4.4,-4.8 C-7.6,-3.2 -9.2,0.6 -8.8,5.0 C-8.6,7.2 -7.6,9.0 -6.0,9.9
                 C-5.2,6.4 -4.9,1.2 -4.3,-4.2 Z"
          fill={P.elitro} stroke={RH_INK} strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M5.2,-4.8 C8.4,-3.2 10.0,0.6 9.6,5.0 C9.4,7.2 8.4,9.0 6.8,9.9
                 C6.0,6.4 5.7,1.2 5.1,-4.2 Z"
          fill={P.elitro} stroke={RH_INK} strokeWidth="1.2" strokeLinejoin="round" />
        {/* el margen lateral pálido (rasgo Lampyridae) */}
        <g stroke={P.elitroMargen} strokeWidth="0.6" fill="none" strokeLinecap="round" opacity="0.9">
          <path d="M-8.0,-1.6 C-8.7,1.4 -8.5,4.8 -7.2,7.8" />
          <path d="M8.8,-1.6 C9.5,1.4 9.3,4.8 8.0,7.8" />
        </g>
        {/* la puntica de ala membranosa que asoma bajo cada faldón */}
        <path d="M-6.2,9.5 C-5.7,11.0 -4.8,11.8 -3.6,12.0 C-4.3,10.9 -4.7,9.9 -4.8,8.9 Z"
          fill={P.alaMembrana} opacity="0.6" />
        <path d="M7.0,9.5 C6.5,11.0 5.6,11.8 4.4,12.0 C5.1,10.9 5.5,9.9 5.6,8.9 Z"
          fill={P.alaMembrana} opacity="0.6" />
      </g>

      {/* ── PIERNAS-manguera con BOTAS (rubber-hose de la base aprobada) ───── */}
      <Miembro d="M-2.0,10.2 C-2.8,13.0 -3.0,15.2 -2.8,16.6" ancho={2.3}
        sway={vivo} delay={-0.8} />
      <g className="lucit-bota">
        <path d="M-1.5,15.4 C-1.3,16.3 -1.4,17.2 -2.0,17.9 C-2.9,18.9 -4.7,19.1 -5.6,18.4
                 C-6.2,17.9 -6.1,17.1 -5.5,16.8 C-4.6,16.4 -4.2,16.0 -4.0,15.3 Z"
          fill={P.bota} stroke={RH_INK} strokeWidth="1.05" strokeLinejoin="round" />
        <path d="M-4.1,15.5 C-3.3,15.9 -2.4,15.9 -1.6,15.6"
          stroke={P.botaCana} strokeWidth="0.7" fill="none" strokeLinecap="round" />
      </g>
      <Miembro d="M3.0,10.2 C3.8,13.0 4.0,15.2 3.8,16.6" ancho={2.3}
        sway={vivo} delay={-1.15} />
      <g className="lucit-bota">
        <path d="M2.5,15.4 C2.3,16.3 2.4,17.2 3.0,17.9 C3.9,18.9 5.7,19.1 6.6,18.4
                 C7.2,17.9 7.1,17.1 6.5,16.8 C5.6,16.4 5.2,16.0 5.0,15.3 Z"
          fill={P.bota} stroke={RH_INK} strokeWidth="1.05" strokeLinejoin="round" />
        <path d="M5.1,15.5 C4.3,15.9 3.4,15.9 2.6,15.6"
          stroke={P.botaCana} strokeWidth="0.7" fill="none" strokeLinecap="round" />
      </g>

      {/* ── EL HALO de la linterna (detrás del abdomen, late a su compás) ──── */}
      {luce && (
        <g className={`lucit-halo${pulsa ? ' lucit-halo-pulso' : ''}`}>
          <circle cx="0.4" cy="10.4" r={haloR} fill={P.halo} opacity="0.3" filter={`url(#${blur})`} />
          <circle cx="0.4" cy="10.6" r={haloR * 0.55} fill={P.haloDentro} opacity="0.5" filter={`url(#${blur})`} />
        </g>
      )}

      {/* ── EL TÓRAX: el peto segmentado del pecho ─────────────────────────── */}
      <path d="M-4.6,-4.6 C-5.7,-1.2 -5.5,1.8 -4.2,3.6 L4.9,3.6 C6.2,1.6 6.3,-1.6 5.3,-4.6
               C2.1,-5.9 -1.5,-5.9 -4.6,-4.6 Z"
        fill={P.torax} stroke={RH_INK} strokeWidth="1.25" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 5px ${P.cuerpoGlow})` }} />
      <g stroke={P.toraxRaya} strokeWidth="0.6" fill="none" strokeLinecap="round" opacity="0.85">
        <path d="M-4.9,-1.6 C-1.4,-0.6 2.7,-0.6 5.5,-1.6" />
        <path d="M-4.6,1.0 C-1.2,1.9 2.5,1.9 5.2,1.0" />
      </g>

      {/* ── EL ABDOMEN que remata en LA LINTERNA (su alma) ─────────────────── */}
      <g className="lucit-linterna">
        {/* primer segmento, aún sin luz */}
        <path d="M-3.8,3.6 C-4.2,5.2 -4.1,6.6 -3.6,7.8 L4.3,7.8 C4.8,6.4 4.9,5.0 4.5,3.6 Z"
          fill={P.segmento} stroke={RH_INK} strokeWidth="1.15" strokeLinejoin="round" />
        {/* el segmento ENCENDIDO */}
        <path d="M-3.6,7.8 C-3.7,9.4 -3.3,10.8 -2.4,11.9 L3.1,11.9 C4.0,10.7 4.4,9.2 4.3,7.8 Z"
          fill={luce ? P.linternaMedio : P.segmento} stroke={RH_INK} strokeWidth="1.1"
          strokeLinejoin="round" className={pulsa ? 'lucit-pulso' : undefined} />
        {/* el remate: el bulbito blanco-cálido de la luz */}
        <ellipse cx="0.4" cy="12.2" rx="2.7" ry="1.5"
          fill={luce ? P.linternaNucleo : P.segmento} stroke={RH_INK} strokeWidth="1.0"
          className={pulsa ? 'lucit-pulso' : undefined} />
      </g>

      {/* ── EL PRONOTO-CAPUCHA: el escudo asoma detrás de la cabeza ────────── */}
      <g className="lucit-pronoto">
        <path d="M-6.2,-8.0 C-4.2,-10.6 5.2,-10.6 7.2,-7.8 C7.9,-6.2 7.5,-4.8 6.3,-4.1
                 L-5.3,-4.1 C-6.6,-5.0 -6.9,-6.4 -6.2,-8.0 Z"
          fill={P.pronoto} stroke={RH_INK} strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M-5.6,-7.4 C-3.8,-9.4 4.8,-9.4 6.6,-7.2"
          stroke={P.pronotoRibete} strokeWidth="0.7" fill="none" strokeLinecap="round" opacity="0.9" />
        <ellipse cx="0.5" cy="-8.2" rx="1.6" ry="1.0" fill={P.pronotoMancha} opacity="0.8" />
      </g>

      {/* ── EL LIBRO bajo el brazo izquierdo (la científica que anota) ─────── */}
      <g transform="translate(-8.2 4.0) rotate(10)">
        <path d="M2.2,-3.4 L3.2,-2.9 L3.4,3.5 L2.5,3.1 Z"
          fill={P.libroPaginas} stroke={RH_INK} strokeWidth="0.8" strokeLinejoin="round" />
        <path d="M-3.0,-3.8 L2.2,-3.4 L2.5,3.1 L-2.6,3.4 C-3.0,3.4 -3.2,3.1 -3.2,2.8 Z"
          fill={P.libroTapa} stroke={RH_INK} strokeWidth="1.0" strokeLinejoin="round" />
        <rect x="-1.9" y="-1.5" width="3.0" height="2.4" rx="0.3"
          fill={P.libroPaginas} stroke={RH_INK} strokeWidth="0.5" />
        <g stroke={RH_INK} strokeWidth="0.32" opacity="0.7">
          <path d="M-1.3,-0.7 L0.5,-0.7" />
          <path d="M-1.3,0.1 L0.5,0.1" />
        </g>
      </g>
      {/* brazo izquierdo: baja y sujeta el libro (guante blanco) */}
      <Miembro clase="crt-brazo-l" origen="right top"
        d="M-4.2,-3.2 C-6.4,-1.8 -7.4,0.6 -7.0,3.0" ancho={2.4}
        punta={[-7.1, 3.5]} puntaR={1.6} sway={vivo} delay={-0.3} glove={RH_GLOVE} />

      {/* ── LA CABEZA (grupo .lucit-cabeza): antenas, testa, carita, ojos ──── */}
      <g transform="translate(0.5 -12)">
        <g className="lucit-cabeza" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
          {/* ANTENAS filiformes con bulbo (escarabajo): nacen del borde alto */}
          <g className="lucit-antenas">
            <g className={vivo ? 'rh-sway' : undefined}
              style={{ transformBox: 'fill-box', transformOrigin: 'bottom right', animationDelay: '-0.5s' }}>
              <path d="M-1.8,-4.2 C-3.8,-7.4 -6.4,-9.4 -9.4,-10.4"
                stroke={RH_INK} strokeWidth="1.0" fill="none" strokeLinecap="round" />
              <g stroke={RH_INK} strokeWidth="0.55" strokeLinecap="round">
                <path d="M-3.6,-6.4 L-4.3,-5.7" />
                <path d="M-5.6,-8.1 L-6.1,-7.3" />
                <path d="M-7.6,-9.5 L-8.0,-8.6" />
              </g>
              <circle cx="-9.7" cy="-10.5" r="0.9" fill={RH_INK} />
            </g>
            <g className={vivo ? 'rh-sway' : undefined}
              style={{ transformBox: 'fill-box', transformOrigin: 'bottom left', animationDelay: '-1.7s' }}>
              <path d="M2.6,-4.2 C4.8,-7.6 7.4,-9.7 10.4,-10.5"
                stroke={RH_INK} strokeWidth="1.0" fill="none" strokeLinecap="round" />
              <g stroke={RH_INK} strokeWidth="0.55" strokeLinecap="round">
                <path d="M4.5,-6.7 L5.2,-6.0" />
                <path d="M6.6,-8.4 L7.1,-7.6" />
                <path d="M8.6,-9.7 L9.0,-8.8" />
              </g>
              <circle cx="10.7" cy="-10.6" r="0.9" fill={RH_INK} />
            </g>
          </g>

          {/* la testa */}
          <circle cx="0" cy="0" r="4.9" fill={P.cabeza} stroke={RH_INK} strokeWidth="1.4" />
          {/* la carita clara */}
          <path d="M-3.2,-0.8 C-1.6,-2.0 2.2,-2.0 3.6,-0.6 C4.2,1.2 3.6,3.2 2.0,4.2
                   C-0.4,4.9 -2.6,4.4 -3.8,2.8 C-4.2,1.4 -3.9,0.0 -3.2,-0.8 Z"
            fill={P.cara} opacity="0.92" />
          {/* cejitas decididas (la científica sabe lo que mide) */}
          <g stroke={RH_INK} strokeWidth="0.55" strokeLinecap="round" fill="none">
            <path d="M-2.6,-2.3 C-1.9,-2.2 -1.3,-2.1 -0.8,-1.9" />
            <path d="M3.0,-2.4 C2.4,-2.3 1.8,-2.2 1.3,-2.0" />
          </g>
          {/* chapetas campesinas */}
          <Cachetes puntos={[{ cx: -2.8, cy: 1.6, r: 1.0 }, { cx: 3.1, cy: 1.4, r: 0.9 }]} vivo={vivo} />
          {/* ojos de goma, grandes y nocturnos */}
          <OjosRubber
            ojos={[{ cx: -1.3, cy: -0.4, r: 1.5 }, { cx: 2.2, cy: -0.5, r: 1.4 }]}
            mirar={[0.28, 0.1]}
            parpadea={vivo}
          />
          {boca}
        </g>
      </g>

      {/* ── BRAZO DERECHO en alto con EL LÁPIZ (guante blanco que lo alza) ─── */}
      <g className="crt-brazo-r" style={{ transformBox: 'fill-box', transformOrigin: 'left bottom' }}>
        <path d="M4.6,-3.4 C7.2,-4.8 8.9,-7.2 9.5,-10.2"
          stroke={RH_INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* EL LÁPIZ verde (debajo del guante, que lo agarra) */}
        <g>
          <path d="M8.0,-9.6 L12.0,-14.6" stroke={RH_INK} strokeWidth="2.1" strokeLinecap="round" />
          <path d="M8.2,-9.8 L11.8,-14.3" stroke={P.lapizCuerpo} strokeWidth="1.1" strokeLinecap="round" />
          <path d="M11.6,-14.1 L13.6,-16.7 L12.5,-13.6 Z"
            fill={P.lapizMadera} stroke={RH_INK} strokeWidth="0.7" strokeLinejoin="round" />
          <path d="M13.2,-16.1 L13.6,-16.7 L13.4,-15.9 Z" fill={RH_INK} />
          <path d="M7.7,-9.2 L8.7,-8.8" stroke={P.lapizBorrador} strokeWidth="1.6" strokeLinecap="round" />
        </g>
        {/* el guante blanco (encima del lápiz: lo está agarrando) */}
        <circle cx="9.6" cy="-10.8" r="1.7" fill={RH_GLOVE} stroke={RH_INK} strokeWidth="0.7" />
        <path d="M8.6,-10.3 C9.2,-9.9 9.9,-10.0 10.3,-10.6"
          stroke={RH_INK} strokeWidth="0.6" fill="none" strokeLinecap="round" />
      </g>
    </g>
  );

  const conAntics = vivo ? (
    <g className="rh-antic">
      <g className="rh-travieso">{body}</g>
    </g>
  ) : body;
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{conAntics}</g> : conAntics;

  const estadoAttrs = {
    'data-creature': LUCIERNAGA_SLUG,
    'data-pose': vivo ? pose : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-visema': visema || undefined,
    'data-linterna': linterna !== 'suave' ? linterna : undefined,
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

export default LuciernagaTinta;
