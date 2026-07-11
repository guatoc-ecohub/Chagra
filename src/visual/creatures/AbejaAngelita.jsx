import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, Miembro, AntenaRubber, RH_INK } from './_rubberhose.jsx';
import { ABEJA_PALETA, ABEJA_PROPORCION } from './abejaIdentidad.js';

/* Abeja angelita — Tetragonisca angustula (meliponino nativo SIN aguijón, NO
   Apis). Cuerpo ámbar rayado (chumbe andino), cabeza clara, alitas de tul.
   Elevada al lenguaje RUBBER-HOSE PLENO (Cuphead + Miss Minutes de Loki):
   contorno grueso que respira, ojos de goma con pupila grande y brillo, cachetes
   campesinos, bracitos/patitas de manguera con mitones, antenas con bombillo que
   hacen follow-through, y squash-&-stretch en el idle (boil ~12fps). El DIBUJO
   compone el KIT reutilizable `_rubberhose.jsx` (que el oso andino y el colibrí
   heredan); la CADENCIA vive en `creatures.css` (clases `rh-*`, gate RM + tier).
   La IDENTIDAD (paleta + proporciones) vive en `abejaIdentidad.js`: la MISMA
   fuente que dimensiona/tiñe su presencia 3D (useEntradaAbeja) — una sola abeja. */
const VIEWBOX = '-15 -15 32 30';

/* Rayas del cuerpo tejidas como CHUMBE andino: banda de tinta con hilo tierra. */
const BANDAS = [
  { x: -3.6, y0: -4.7, y1: 4.7 },
  { x: 0.4, y0: -5.0, y1: 5.0 },
  { x: 4.0, y0: -4.0, y1: 4.0 },
];

export function AbejaAngelita({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Abeja angelita',
  /* Pose de VIDA (idle-life): 'vuela' (default, aleteo normal) | 'celebra'
     (aleteo rápido, la escena puede darle la vuelta de campana) | 'reposo'
     (alitas plegadas que respiran despacio). Solo cambia CSS por data-pose:
     los consumidores existentes no notan nada. */
  pose = 'vuela',
  /* ── REACTIVIDAD AL ESTADO REAL DE LA FINCA (auditoría §5b) ────────────────
     El repertorio de reacción que la escena deriva de la finca (reaccionFinca).
     La creature lo interpreta con SU cuerpo (gotas, probóscide, brillo) — estética
     rubber-hose (Miss Minutes / Cuphead): squash-and-stretch, elástico, expresivo.
     Todo opcional: sin estos props la abeja se ve EXACTO como antes.
       animo    → piel/aura: 'pleno'|'sereno'|'atento'|'sediento'|'descansa'
       energia  → 0..1 viveza (aura y tamaño del brillo)
       mojada   → llueve: gotas que escurren + brillo húmedo
       sed      → Niño/sequía: saca la lengüita y jadea
       comiendo → hay cosecha: baja la probóscide y liba (mordisquea) */
  animo = 'sereno',
  energia = 1,
  mojada = false,
  sed = false,
  comiendo = false,
  /* Device-tier (DR-3D-PERF-GAMABAJA): 'alto'|'medio' corren el rubber-hose
     pleno; 'bajo' apaga el idle continuo (boil + follow-through) y deja el
     aleteo + estados reactivos. Sin prop (standalone: avatares, catálogo) =
     pleno. El CSS gatea por [data-tier='bajo']; RM lo congela por encima. */
  tier,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const wing = animated ? 'crt-wing' : undefined;
  const vivo = animated;
  // El aura respira con la energía real de la finca (matas vivas + agua).
  const auraOp = Math.max(0.16, Math.min(0.5, 0.2 + 0.3 * (energia ?? 1)));
  const auraR = 5.4 + 1.2 * (energia ?? 1);

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
    </defs>
  );
  // Probóscide (lengüita): sale con SED (jadeo) o al COMER (libar). Cuelga de la
  // cabeza (cx≈9.6). CSS la anima según data-sed/data-comiendo; RM la deja quieta.
  // El <g> EXTERNO posiciona (attr transform); el INTERNO (.crt-lengua) anima —
  // si el CSS animara el mismo nodo del translate, lo pisaría (CSS transform
  // gana sobre el atributo) y la lengüita saltaría al centro del cuerpo.
  const lengua = (sed || comiendo) ? (
    <g transform="translate(9.6 2.4)">
      <g className="crt-lengua">
        <path d="M0,0 C-0.4,2.6 0.4,4.4 0,6.2" stroke={ABEJA_PALETA.lengua} strokeWidth="1.1"
          fill="none" strokeLinecap="round" />
        <circle cx="0" cy="6.4" r="1.05" fill={ABEJA_PALETA.lengua} />
      </g>
    </g>
  ) : null;
  // Gotas de lluvia que escurren del cuerpo/alas cuando está MOJADA. Rubber-hose:
  // caen con un rebotico. CSS (crt-gota) las anima; RM las deja colgando.
  const gotas = mojada ? (
    <g className="crt-gotas" fill={ABEJA_PALETA.gota} opacity="0.9">
      <path className="crt-gota" d="M-6,4 q-1.1,1.8 0,3.2 q1.1,-1.4 0,-3.2 Z" />
      <path className="crt-gota" style={{ animationDelay: '-0.5s' }} d="M2,5.2 q-1,1.7 0,3 q1,-1.3 0,-3 Z" />
      <path className="crt-gota" style={{ animationDelay: '-1.1s' }} d="M8,3.4 q-0.9,1.5 0,2.7 q0.9,-1.2 0,-2.7 Z" />
    </g>
  ) : null;

  // ── CUERPO rubber-hose. Orden de atrás→adelante: aura, alas, patitas, tronco
  //    (ámbar con contorno + chumbe), bracitos, cabeza (ojos/cachetes/sonrisa/
  //    antenas), probóscide, gotas. `.crt-body` es el nodo que squashea (boil
  //    idle + estados reactivos, que lo pisan por especificidad).
  //    ENCIMA van DOS wrappers de VIDA con períodos co-primos (6.3s / 9.7s):
  //    `rh-travieso` (saltitos de lado, wobble, double-take) y `rh-antic` (la
  //    vuelta de campana Miss-Minutes con anticipación y overshoot). Tres capas
  //    de transform que nunca caen en el mismo compás = idle impredecible, vivo.
  //    El CSS los apaga con RM, tier bajo, estados reactivos y ánimo bajito.
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* aura viva */}
      <circle r={auraR} fill={ABEJA_PALETA.cuerpo} opacity={auraOp} filter={`url(#${blur})`} />

      {/* alitas de tul con contorno + smear (crt-wingbeat ya lleva el estirón) */}
      <ellipse className={wing} cx="-1.8" cy="-7" rx="6" ry="3.6" fill={ABEJA_PALETA.alaTul}
        opacity="0.62" stroke="rgba(42,26,12,0.4)" strokeWidth="0.5" />
      <ellipse className={wing} style={{ animationDelay: '-0.07s' }} cx="2.2" cy="-6.4"
        rx="4.6" ry="2.8" fill={ABEJA_PALETA.alaTulClara} opacity="0.5" stroke="rgba(42,26,12,0.35)" strokeWidth="0.5" />

      {/* patitas manguera con pie crema (detrás del tronco, se mecen suave) */}
      <Miembro d="M-2.6,4.4 C-3.2,6.6 -3.4,8 -3.0,9.2" ancho={1.9} punta={[-3.0, 9.4]} puntaR={1.3} pie sway={vivo} delay={-0.6} />
      <Miembro d="M1.8,4.7 C1.4,6.8 1.3,8.2 1.8,9.4" ancho={1.9} punta={[1.8, 9.6]} puntaR={1.3} pie sway={vivo} delay={-0.95} />

      {/* tronco ámbar con contorno grueso (la línea que respira con el boil) */}
      <ellipse cx="0" cy="0" rx={ABEJA_PROPORCION.troncoRx} ry={ABEJA_PROPORCION.troncoRy}
        fill={ABEJA_PALETA.cuerpo} stroke={RH_INK} strokeWidth="1.3"
        style={{ filter: `drop-shadow(0 0 6px ${ABEJA_PALETA.cuerpoGlow})` }} />
      {/* rayas = chumbe: banda de tinta + hilo tierra */}
      {BANDAS.map((b, i) => (
        <g key={i}>
          <path d={`M${b.x},${b.y0} L${b.x},${b.y1}`} stroke={RH_INK} strokeWidth="1.9" strokeLinecap="round" />
          <path d={`M${b.x},${b.y0 + 0.6} L${b.x},${b.y1 - 0.6}`} stroke={ABEJA_PALETA.hiloChumbe} strokeWidth="0.7" strokeLinecap="round" />
        </g>
      ))}

      {/* bracitos manguera con mitón crema (delante del tronco, follow-through) */}
      <Miembro d="M-6.2,1.4 C-8.2,2.4 -9.0,4.1 -8.4,5.9" ancho={2.1} punta={[-8.5, 6.2]} puntaR={1.55} sway={vivo} delay={-0.15} />
      <Miembro d="M5.4,3.0 C6.9,4.2 7.5,5.9 7.0,7.5" ancho={2.2} punta={[7.0, 7.8]} puntaR={1.6} sway={vivo} delay={-0.45} />

      {/* cabeza clara con contorno */}
      <circle cx="8.6" cy="-1.0" r={ABEJA_PROPORCION.cabezaR} fill={ABEJA_PALETA.cabeza} stroke={RH_INK} strokeWidth="1.2" />
      {/* chapetas campesinas + sonrisa + ojos de goma (parpadean juntos) */}
      <Cachetes puntos={[{ cx: 10.4, cy: 0.7, r: 1.15 }, { cx: 6.9, cy: 0.3, r: 0.85 }]} vivo={vivo} />
      <Sonrisa cx={8.9} cy={1.4} w={2.8} prof={1.1} />
      <OjosRubber
        ojos={[{ cx: 10.1, cy: -1.9, r: 1.95 }, { cx: 7.4, cy: -2.2, r: 1.45 }]}
        mirar={[0.3, 0.34]}
        parpadea={vivo}
      />
      {/* antenas con bombillo que se mecen (secondary motion) */}
      <AntenaRubber d="M7.7,-4.7 C6.7,-7.3 7.0,-9.3 8.3,-10.1" bulbo={[8.3, -10.3]} sway={vivo} delay={0} />
      <AntenaRubber d="M9.7,-4.6 C11.0,-6.7 11.3,-8.7 10.5,-10.3" bulbo={[10.5, -10.5]} sway={vivo} delay={-0.3} />

      {lengua}
      {gotas}
    </g>
  );
  // Las capas de antics envuelven al cuerpo SOLO cuando está vivo (animated):
  // nodos aparte para que sus transforms no pisen el boil de `.crt-body`.
  const cuerpoVivo = vivo ? (
    <g className="rh-antic">
      <g className="rh-travieso">{body}</g>
    </g>
  ) : body;

  // data-estado agrupa la reacción para el CSS (brillo mojado, jadeo, mordisco).
  const estadoAttrs = {
    'data-creature': 'abeja-angelita',
    'data-pose': pose,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-mojada': mojada ? '1' : undefined,
    'data-sed': sed ? '1' : undefined,
    'data-comiendo': comiendo ? '1' : undefined,
  };

  if (inline) {
    return (
      <g className={className} {...estadoAttrs}>
        {defs}
        {cuerpoVivo}
      </g>
    );
  }
  return (
    <svg viewBox={VIEWBOX} width={size} height={size} className={className}
      role="img" aria-label={title} {...estadoAttrs} {...rest}>
      <title>{title}</title>
      {defs}
      {cuerpoVivo}
    </svg>
  );
}

export default AbejaAngelita;
