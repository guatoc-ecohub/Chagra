/*
 * AuraPoder — Capa 4 del power-up: las CORRIENTES ascendentes
 * (ficha DR animación rubber-hose §4). SVG absoluto, pointer-events
 * none, con N líneas verticales que suben y se desvanecen escalonadas (el
 * stagger por :nth-child vive en `transformacion.css`).
 *
 * Species-agnostic: solo depende de `--aura-color`. Se monta DENTRO del wrapper
 * `.is-powered-up` (que ya define la variable). Decorativo → aria-hidden.
 */

import './transformacion.css';

/**
 * @param {object} props
 * @param {number} [props.n=5]  cuántas corrientes (spec: 4–6).
 * @param {string} [props.color]  fuerza `--aura-color` local (si el wrapper no
 *   la define). Normalmente se hereda del `.is-powered-up`.
 * @param {number} [props.grosor=2.2]  ancho de línea (unidades del viewBox 0..100).
 */
export function AuraPoder({ n = 5, color, grosor = 2.2 }) {
  const cantidad = Math.max(2, Math.min(6, n | 0));
  const izq = 12;
  const ancho = 76; // reparte las corrientes en el 76% central
  const paso = ancho / (cantidad - 1);
  return (
    <svg
      className="poder-corrientes"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={color ? { '--aura-color': color } : undefined}
    >
      {Array.from({ length: cantidad }).map((_, i) => {
        const x = izq + i * paso;
        // Altura de arranque alterna un poco → corrientes desparejas (vida).
        const y2 = 62 - (i % 2) * 8;
        return (
          <line
            key={i}
            className="poder-corriente"
            x1={x}
            y1={100}
            x2={x}
            y2={y2}
            stroke="var(--aura-color)"
            strokeWidth={grosor}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

export default AuraPoder;
