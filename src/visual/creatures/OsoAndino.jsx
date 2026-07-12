import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, Miembro, RH_INK } from './_rubberhose.jsx';
import { OSO_PALETA, OSO_PROPORCION } from './faunaAndina.js';
import { cuerpoDeClima, PERFIL_OSO } from './creatureClimaCuerpo.js';

/* Oso andino — Tremarctos ornatus (oso de anteojos, el único oso de Suramérica,
   guardián del páramo). Hermano rubber-hose de la abeja Angelita: compone el
   MISMO kit `_rubberhose.jsx` (ojos de goma, cachetes, sonrisa, miembros
   manguera) y hereda la MISMA cadencia `rh-*` de `creatures.css` (boil que
   respira, parpadeo, follow-through, vuelta de campana) — cero animación
   redibujada. Solo cambia el ANIMAL: mole parda, pesada y entrañable, con los
   ANTEOJOS crema (su firma) alrededor de los ojos, hocico claro y orejas
   redondas que se mecen. Es de SUELO: se sienta (no vuela) — sin alas. La
   IDENTIDAD (paleta + proporciones) vive en `faunaAndina.js`; el CLIMA→cuerpo,
   en `creatureClimaCuerpo.js` con PERFIL_OSO (pelaje que empapa despacio, mole
   que la niebla apenas difumina, robusto ante la seca). */
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
  tier,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const vivo = animated;
  const auraOp = Math.max(0.14, Math.min(0.42, 0.18 + 0.26 * (energia ?? 1)));
  const auraR = 8.5 + 1.6 * (energia ?? 1);

  // CLIMA → cuerpo (determinista, una vez por render): tinte + opacidad al
  // contorno. El oso no tiene alas (velocidadAlas siempre 1: no se usa).
  const cuerpoClima = cuerpoDeClima(clima, { enso, tier, perfil: PERFIL_OSO });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
    </defs>
  );

  // ── CUERPO rubber-hose (atrás→adelante): aura, orejas, patas, tronco pardo
  //    con pecho crema, bracitos manguera, cabeza (anteojos + ojos/cachetes/
  //    sonrisa + hocico). `.crt-body` es el nodo que squashea (boil idle).
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
          que celebra/señala los alcen desde el hombro (no del centro del bbox). */}
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
      {/* chapetas + sonrisa + trufa + ojos de goma dentro de los anteojos */}
      <Cachetes puntos={[{ cx: -4.4, cy: -6.6, r: 1.25 }, { cx: 4.4, cy: -6.6, r: 1.25 }]} vivo={vivo} />
      <Sonrisa cx={0} cy={-3.6} w={3.0} prof={1.2} />
      {/* trufa (nariz) */}
      <ellipse cx="0" cy="-4.6" rx="1.5" ry="1.15" fill={OSO_PALETA.hocico} />
      <OjosRubber
        ojos={[{ cx: -2.5, cy: -9.2, r: 1.7 }, { cx: 2.5, cy: -9.2, r: 1.7 }]}
        mirar={[0, 0.28]}
        parpadea={vivo}
      />
    </g>
  );

  // Antics de VIDA (períodos co-primos) SOLO viva; nodos aparte para no pisar
  // el boil de `.crt-body`. El CSS los apaga con RM / tier bajo / ánimo bajo /
  // durante los gestos (celebra/reposo/señala).
  const cuerpoVivo = vivo ? (
    <g className="rh-antic">
      <g className="rh-travieso">{body}</g>
    </g>
  ) : body;

  const estadoAttrs = {
    'data-creature': 'oso-andino',
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

export default OsoAndino;
