import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';

/* Abeja angelita — Tetragonisca angustula, la abeja NATIVA sin aguijón de los
   Andes (mansa, dorada, guardiana de la finca). Es el COMPAÑERO-JUGADOR del
   valle: vuela por el mundo y "entra" a cada lugar. No es un mascota infantil —
   es un ser al que se cuida (ref Finch): su ÁNIMO y su ENERGÍA cambian el color,
   el aura y la vivacidad según cómo está la finca de verdad.

   Coreografía de vuelo/llegada = de la ESCENA que la consume (Valle3D / 2D).
   Aquí solo vive el cuerpo: SVG + CSS puros, solo transform/opacity (GPU,
   Android gama baja), aleteo reutilizando .crt-wing de creatures.css. */
const VIEWBOX = '-16 -15 34 30';

/* Paletas por ánimo (estado real de la finca leído en el valle). Maduras,
   cálidas — nunca chillonas. `aura` es el halo; `cuerpo`/`banda` el insecto. */
const ANIMOS = {
  pleno: { cuerpo: '#f3b229', banda: '#7a4a12', aura: '#ffd772', vida: 1 },
  sereno: { cuerpo: '#e6a637', banda: '#7a4a12', aura: '#f4c66a', vida: 0.82 },
  atento: { cuerpo: '#f0a233', banda: '#6f3d10', aura: '#ffb352', vida: 0.9 },
  sediento: { cuerpo: '#cdae6e', banda: '#6b5330', aura: '#cfe0d6', vida: 0.6 },
  descansa: { cuerpo: '#c9a24a', banda: '#5a4526', aura: '#9fb6d6', vida: 0.45 },
};

export function AbejaAngelita({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  animo = 'sereno',
  energia = 1,
  title = 'Angelita, la abeja de su finca',
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const clip = `crt-clip-${uid}`;
  const wing = animated ? 'crt-wing' : undefined;

  const a = ANIMOS[animo] || ANIMOS.sereno;
  const e = Math.max(0.35, Math.min(1, energia));
  // El aura respira con la energía; la vitalidad del ánimo la matiza.
  const auraOp = 0.16 + 0.34 * e * a.vida;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      <clipPath id={clip}>
        {/* abdomen: la elipse que recorta las bandas para que no se desborden */}
        <ellipse cx="-1.5" cy="1.5" rx="8.5" ry="6" />
      </clipPath>
    </defs>
  );

  const body = (
    <g className="crt-body" filter={`url(#${glow})`}>
      {/* aura viva: el halo que refleja el ánimo/energía de la finca */}
      <circle r="12" cx="-1" cy="1" fill={a.aura} opacity={auraOp} filter={`url(#${blur})`} />

      {/* alas translúcidas que baten (arriba del tórax) */}
      <ellipse className={wing} cx="1.5" cy="-6.5" rx="5.5" ry="3.4" fill="#dff3ff" opacity="0.72"
        transform="rotate(-24 1.5 -6.5)" />
      <ellipse className={wing} style={{ animationDelay: '-0.05s' }} cx="4.5" cy="-6" rx="4.6" ry="3"
        fill="#c8e8ff" opacity="0.5" transform="rotate(-6 4.5 -6)" />

      {/* patas finas bajo el cuerpo (quietas, dan peso) */}
      <path d="M-3,6 L-4.5,9 M0,6.5 L0.5,9.6 M3,6 L4.8,8.8" stroke={a.banda} strokeWidth="0.8"
        fill="none" strokeLinecap="round" opacity="0.85" />

      {/* abdomen dorado con bandas (recortadas al contorno) */}
      <ellipse cx="-1.5" cy="1.5" rx="8.5" ry="6" fill={a.cuerpo} />
      <g clipPath={`url(#${clip})`}>
        <rect x="-6.5" y="-5" width="2.6" height="14" rx="1.3" fill={a.banda} opacity="0.9"
          transform="rotate(12 -5 1.5)" />
        <rect x="-1.6" y="-5" width="2.8" height="14" rx="1.4" fill={a.banda} opacity="0.92"
          transform="rotate(12 -0.2 1.5)" />
      </g>
      {/* brillo suave del lomo */}
      <ellipse cx="-2.5" cy="-1.2" rx="4.2" ry="2" fill="#fff2c8" opacity="0.5" />

      {/* cabeza (a la derecha = hacia donde vuela) + ojo */}
      <circle cx="7.6" cy="-0.6" r="3.6" fill={a.banda} />
      <circle cx="8.9" cy="-1.4" r="1.15" fill="#1b1205" />
      <circle cx="9.3" cy="-1.8" r="0.4" fill="#fff6e2" />
      {/* antenas */}
      <path d="M9.4,-3.2 C11.4,-5 12.6,-5.4 13.6,-6.6 M8.4,-3.6 C9.6,-6 10.4,-6.8 10.9,-8.4"
        stroke={a.banda} strokeWidth="0.85" fill="none" strokeLinecap="round" />
    </g>
  );

  if (inline) {
    return (
      <g className={className} data-creature="abeja-angelita">
        {defs}
        {body}
      </g>
    );
  }
  return (
    <svg viewBox={VIEWBOX} width={size} height={size} className={className}
      role="img" aria-label={title} data-creature="abeja-angelita" {...rest}>
      <title>{title}</title>
      {defs}
      {body}
    </svg>
  );
}

export default AbejaAngelita;
