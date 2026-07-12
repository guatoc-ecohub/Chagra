import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, RH_INK } from './_rubberhose.jsx';
import { COLIBRI_PALETA, COLIBRI_PROPORCION } from './faunaAndina.js';
import { cuerpoDeClima, PERFIL_COLIBRI } from './creatureClimaCuerpo.js';

/* Colibrí chillón — Colibri coruscans (esmeralda andino, el ave-agente de
   Chagra). Hermano rubber-hose de la abeja Angelita: ADOPTA el mismo kit
   `_rubberhose.jsx` (ojos de goma, cachetes, sonrisa) y la misma cadencia `rh-*`
   de `creatures.css` (boil que respira, parpadeo, follow-through, vuelta de
   campana) — la versión canónica sube al lenguaje de goma sin cambiar de ave.
   Sigue siendo ÉL: dorso turquesa esmeralda, gorguera violeta iridiscente y el
   pico recto y largo. Es de AIRE: las alas baten en borrón (`.crt-wing`, que ya
   trae smear), y el CLIMA le pesa o le apura el aleteo (perfil colibrí: plumas
   aceitadas que escurren el agua, ágil, aguanta algo la seca). IDENTIDAD en
   `faunaAndina.js`; CLIMA→cuerpo en `creatureClimaCuerpo.js`.
   API estable (size/className/inline/animated/title) — los consumidores de la
   vieja versión SVG heredan el rubber-hose sin tocar su código. */
const VIEWBOX = '-15 -16 36 30';

/* Timoneras de la cola (abanico a la izquierda). */
const COLA = [
  'M-6,1.4 L-13.2,-1.4 L-8,1.6 Z',
  'M-6,2.2 L-13.6,2.2 L-8,2.6 Z',
  'M-6,3.0 L-12.8,5.4 L-8,3.4 Z',
];

export function Colibri({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Colibrí',
  /* Pose de VIDA (idle-life), equivalentes a las de Angelita: 'vuela' (base,
     aleteo normal) | 'celebra' (giro alegre + aleteo acelerado) | 'reposo'
     (se posa, alitas plegadas, respira) | 'señala' (se inclina al POI y apunta
     con el pico). Gestos species-agnostic en `creatures.css` (rh-g-*); solo
     corren viva (animated). */
  pose = 'vuela',
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
  const wing = animated ? 'crt-wing' : undefined;
  const vivo = animated;
  const auraOp = Math.max(0.16, Math.min(0.5, 0.2 + 0.3 * (energia ?? 1)));
  const auraR = 5.2 + 1.2 * (energia ?? 1);

  // CLIMA → cuerpo (perfil colibrí). El aleteo se apura (dorada) o pesa (lluvia)
  // escalando la duración base de `.crt-wing` (0.15s). Sin clima = neutro.
  const cuerpoClima = cuerpoDeClima(clima, { enso, tier, perfil: PERFIL_COLIBRI });
  const wingDur = (wing && cuerpoClima.velocidadAlas !== 1)
    ? { animationDuration: `${(0.15 / cuerpoClima.velocidadAlas).toFixed(3)}s` }
    : undefined;
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
    </defs>
  );

  // ── CUERPO rubber-hose (atrás→adelante): aura, cola, ala trasera, cuerpo
  //    turquesa con vientre claro, patitas, cabeza (gorguera + ojo + pico),
  //    ala delantera en borrón. `.crt-body` squashea (boil idle).
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
        d="M2,0.6 C-4,12 9,16.4 13.6,8.8 C10.6,3.4 6,1.2 2,0.6 Z"
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

      {/* cabeza turquesa con contorno */}
      <circle cx="6.6" cy="-2.4" r={COLIBRI_PROPORCION.cabezaR} fill={COLIBRI_PALETA.cuerpo} stroke={RH_INK} strokeWidth="1.2" />
      {/* GORGUERA violeta iridiscente (la firma): mancha bajo la cara + brillo */}
      <path d="M5.0,-0.2 C6.6,2.2 9.4,2.2 10.8,-0.2 C10.2,2.6 5.8,2.8 5.0,-0.2 Z"
        fill={COLIBRI_PALETA.garganta} opacity="0.95" />
      <path d="M6.4,0.2 C7.2,1.2 8.6,1.2 9.4,0.2 C8.6,1.4 7.2,1.4 6.4,0.2 Z"
        fill={COLIBRI_PALETA.gargantaBrillo} opacity="0.8" />
      {/* chapeta + sonrisa mínima en la base del pico */}
      <Cachetes puntos={[{ cx: 5.0, cy: -1.4, r: 1.0 }]} vivo={vivo} />
      <Sonrisa cx={8.4} cy={-1.0} w={1.8} prof={0.7} />
      {/* PICO recto y largo (dos mandíbulas de tinta cálida) */}
      <path d="M9.6,-2.4 L18.4,-4.2" stroke={RH_INK} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M9.6,-1.4 L17.8,-3.4" stroke={RH_INK} strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.7" />
      {/* ojo de goma grande (3/4: uno prominente) */}
      <OjosRubber
        ojos={[{ cx: 6.9, cy: -3.0, r: 1.7 }]}
        mirar={[0.32, 0.2]}
        parpadea={vivo}
      />

      {/* ala DELANTERA en borrón (batida, encima del cuerpo con smear) */}
      <path className={wing} style={wingDur}
        d="M3,-1.6 C-4.6,-15 10.8,-22 17.6,-13 C14.6,-5 8.2,-1.6 3,-1.6 Z"
        fill={COLIBRI_PALETA.ala} opacity="0.78" stroke="rgba(42,26,12,0.35)" strokeWidth="0.5" />
    </g>
  );

  const cuerpoVivo = vivo ? (
    <g className="rh-antic">
      <g className="rh-travieso">{body}</g>
    </g>
  ) : body;

  const estadoAttrs = {
    'data-creature': 'colibri',
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

export default Colibri;
