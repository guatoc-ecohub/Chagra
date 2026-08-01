/*
 * glifosNavegacion — glifos SVG compartidos por los zooms de navegación.
 *
 * Siluetas de lámina (no fotorrealistas) que marcan las bandas térmicas en
 * cualquier zoom: el Ent guardián de cada piso (ceiba/roble/aliso/queñua,
 * ids de `MAPA_PISO_ENT`) y el frailejón del páramo. Solo dibujo: cero
 * estado, cero datos — los datos viven en `pisosNavegacion.js`.
 */

/**
 * Silueta del Ent guardián de un piso. Se dibuja centrada en el origen del
 * grupo que la contiene (usar `transform` para ubicarla y escalarla).
 * @param {{ entId: string|null, color: string }} props
 */
export function GlifoEnt({ entId, color }) {
  switch (entId) {
    case 'quenua': // queñua: bajita, torcida, de corteza de papel rojizo
      return (
        <g>
          <path d="M0 22 C -2 12 4 8 1 0" stroke="#7c5a4a" strokeWidth="3" fill="none" />
          <ellipse cx="1" cy="-2" rx="11" ry="7" fill={color} />
          <ellipse cx="-6" cy="4" rx="7" ry="5" fill={color} opacity="0.85" />
        </g>
      );
    case 'aliso': // aliso: copa ovalada esbelta
      return (
        <g>
          <rect x="-1.5" y="4" width="3" height="18" fill="#6b5442" />
          <ellipse cx="0" cy="-2" rx="9" ry="13" fill={color} />
        </g>
      );
    case 'roble': // roble andino: copa ancha y redonda
      return (
        <g>
          <rect x="-2" y="6" width="4" height="16" fill="#5d4632" />
          <circle cx="0" cy="-2" r="12" fill={color} />
          <circle cx="-9" cy="3" r="7" fill={color} opacity="0.9" />
          <circle cx="9" cy="3" r="7" fill={color} opacity="0.9" />
        </g>
      );
    case 'ceiba': // ceiba: paraguas alto con bambas en la base
      return (
        <g>
          <path d="M-2 22 L -7 22 L -2 8 L 2 8 L 7 22 L 2 22 L 2 10 L -2 10 Z" fill="#7a6248" />
          <ellipse cx="0" cy="2" rx="15" ry="6.5" fill={color} />
        </g>
      );
    default:
      return null;
  }
}

/**
 * Un frailejón: roseta estrellada sobre tronco corto (silueta de lámina).
 * @param {{ x: number, y: number, escala?: number }} props
 */
export function Frailejon({ x, y, escala = 1 }) {
  const petalos = [];
  for (let i = 0; i < 7; i += 1) {
    const ang = (i / 7) * Math.PI * 2;
    petalos.push(
      <ellipse
        key={i}
        cx={Math.cos(ang) * 5}
        cy={Math.sin(ang) * 3.4 - 8}
        rx="4.6"
        ry="1.7"
        transform={`rotate(${(ang * 180) / Math.PI} ${Math.cos(ang) * 5} ${Math.sin(ang) * 3.4 - 8})`}
        fill="#c9c489"
      />,
    );
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${escala})`}>
      <rect x="-1.6" y="-6" width="3.2" height="9" rx="1.4" fill="#6d6a52" />
      {petalos}
      <circle cx="0" cy="-8" r="2.4" fill="#a8a468" />
    </g>
  );
}
