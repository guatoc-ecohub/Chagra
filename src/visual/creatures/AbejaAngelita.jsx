import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';

/* Abeja angelita — Tetragonisca angustula (meliponino nativo SIN aguijón, NO
   Apis). Cuerpo ámbar rayado, cabeza clara, alitas de tul. Versión canónica
   deducida del mockup "Guardianes que aparecen". */
const VIEWBOX = '-15 -15 32 30';

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
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const wing = animated ? 'crt-wing' : undefined;
  // El aura respira con la energía real de la finca (matas vivas + agua).
  const auraOp = Math.max(0.16, Math.min(0.5, 0.2 + 0.3 * (energia ?? 1)));
  const auraR = 5.4 + 1.2 * (energia ?? 1);

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
    </defs>
  );
  // Probóscide (lengüita): sale con SED (jadeo) o al COMER (libar). Cuelga de la
  // cabeza (cx≈9). CSS la anima según data-sed/data-comiendo; RM la deja quieta.
  // El <g> EXTERNO posiciona (attr transform); el INTERNO (.crt-lengua) anima —
  // si el CSS animara el mismo nodo del translate, lo pisaría (CSS transform
  // gana sobre el atributo) y la lengüita saltaría al centro del cuerpo.
  const lengua = (sed || comiendo) ? (
    <g transform="translate(9.6 2)">
      <g className="crt-lengua">
        <path d="M0,0 C-0.4,2.6 0.4,4.4 0,6.2" stroke="#c9524e" strokeWidth="1.1"
          fill="none" strokeLinecap="round" />
        <circle cx="0" cy="6.4" r="1.05" fill="#c9524e" />
      </g>
    </g>
  ) : null;
  // Gotas de lluvia que escurren del cuerpo/alas cuando está MOJADA. Rubber-hose:
  // caen con un rebotico. CSS (crt-gota) las anima; RM las deja colgando.
  const gotas = mojada ? (
    <g className="crt-gotas" fill="#bfe6ff" opacity="0.9">
      <path className="crt-gota" d="M-6,4 q-1.1,1.8 0,3.2 q1.1,-1.4 0,-3.2 Z" />
      <path className="crt-gota" style={{ animationDelay: '-0.5s' }} d="M2,5.2 q-1,1.7 0,3 q1,-1.3 0,-3 Z" />
      <path className="crt-gota" style={{ animationDelay: '-1.1s' }} d="M8,3.4 q-0.9,1.5 0,2.7 q0.9,-1.2 0,-2.7 Z" />
    </g>
  ) : null;

  const body = (
    <g className="crt-body" filter={`url(#${glow})`}>
      <circle r={auraR} fill="#ffb54f" opacity={auraOp} filter={`url(#${blur})`} />
      <ellipse cx="0" cy="0" rx="8.5" ry="5.4" fill="#ffb54f"
        style={{ filter: 'drop-shadow(0 0 6px rgba(255,181,79,0.9))' }} />
      <path d="M-3.2,-4.9 L-3.2,4.9 M0.8,-5.2 L0.8,5.2 M4.4,-4.2 L4.4,4.2"
        stroke="#3a2410" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8.2" cy="-0.8" r="3.4" fill="#ffd76a" />
      <circle cx="9.3" cy="-1.6" r="0.9" fill="#04160f" />
      <path d="M11,-2.4 C12.4,-3.4 13.7,-3.4 14.7,-2.6" stroke="#3a2410" strokeWidth="0.7" fill="none" strokeLinecap="round" />
      {lengua}
      <ellipse className={wing} cx="-1.8" cy="-7" rx="6" ry="3.6" fill="#bfeaff" opacity="0.6" />
      <ellipse className={wing} style={{ animationDelay: '-0.07s' }} cx="2.2" cy="-6.4" rx="4.6" ry="2.8" fill="#eafff6" opacity="0.5" />
      {gotas}
    </g>
  );

  // data-estado agrupa la reacción para el CSS (brillo mojado, jadeo, mordisco).
  const estadoAttrs = {
    'data-creature': 'abeja-angelita',
    'data-pose': pose,
    'data-animo': animo,
    'data-mojada': mojada ? '1' : undefined,
    'data-sed': sed ? '1' : undefined,
    'data-comiendo': comiendo ? '1' : undefined,
  };

  if (inline) {
    return (
      <g className={className} {...estadoAttrs}>
        {defs}
        {body}
      </g>
    );
  }
  return (
    <svg viewBox={VIEWBOX} width={size} height={size} className={className}
      role="img" aria-label={title} {...estadoAttrs} {...rest}>
      <title>{title}</title>
      {defs}
      {body}
    </svg>
  );
}

export default AbejaAngelita;
