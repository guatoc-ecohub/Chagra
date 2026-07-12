import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, Miembro, RH_INK } from './_rubberhose.jsx';
import { RANA_PALETA, RANA_PROPORCION } from './faunaAndina.js';
import { cuerpoDeClima, PERFIL_RANA } from './creatureClimaCuerpo.js';

/* Rana arlequín andina — Atelopus del páramo, anfibia guardiana del agua.
   Hermana rubber-hose de la abeja Angelita: compone el MISMO kit
   `_rubberhose.jsx` y hereda la MISMA cadencia `rh-*` de `creatures.css` — cero
   animación redibujada. Solo cambia el ANIMAL: cuerpo verde húmedo achatado con
   manchas ARLEQUÍN ocre, vientre dorado, OJOS SALTONES enormes en lo alto y una
   BOCOTA de goma. Es de SUELO: se sienta en la hoja (no vuela) — sin alas. Su
   PERFIL_RANA la hace la más brillante mojada y la MÁS golpeada por la sequía
   (la piel se le reseca): el CLIMA→cuerpo lo pone `creatureClimaCuerpo.js`, con
   un tinte de lluvia que empuja el verde húmedo. IDENTIDAD en `faunaAndina.js`. */
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
  clima = null,
  enso = 'neutro',
  tier,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const vivo = animated;
  const auraOp = Math.max(0.14, Math.min(0.44, 0.18 + 0.28 * (energia ?? 1)));
  const auraR = 7.6 + 1.4 * (energia ?? 1);

  // CLIMA → cuerpo (perfil rana). Sin clima = neutro digno.
  const cuerpoClima = cuerpoDeClima(clima, { enso, tier, perfil: PERFIL_RANA });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
    </defs>
  );

  // ── CUERPO rubber-hose (atrás→adelante): aura, ancas traseras, tronco verde
  //    con manchas + vientre dorado, bracitos manguera con discos, garganta,
  //    bocota, ojos saltones en cúpula. `.crt-body` squashea (boil idle).
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

      {/* garganta que late (papada), bajo la boca */}
      <ellipse cx="0" cy="-1.2" rx="3.6" ry="2.2" fill={RANA_PALETA.papada} opacity="0.85" />
      {/* la BOCOTA de goma: sonrisa ancha de rana */}
      <Sonrisa cx={0} cy={-2.2} w={9.2} prof={2.2} />
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
    </g>
  );

  const cuerpoVivo = vivo ? (
    <g className="rh-antic">
      <g className="rh-travieso">{body}</g>
    </g>
  ) : body;

  const estadoAttrs = {
    'data-creature': 'rana-andina',
    'data-pose': vivo ? pose : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
  };

  if (inline) {
    return (
      <g className={className} style={estiloClima} {...estadoAttrs}>
        {defs}
        {cuerpoVivo}
      </g>
    );
  }
  return (
    <svg viewBox={VIEWBOX} width={size} height={size} className={className} style={estiloClima}
      role="img" aria-label={title} {...estadoAttrs} {...rest}>
      <title>{title}</title>
      {defs}
      {cuerpoVivo}
    </svg>
  );
}

export default RanaAndina;
