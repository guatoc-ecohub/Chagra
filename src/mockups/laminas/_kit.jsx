/*
 * _kit — utilería compartida de las láminas del mockup "el agente enseña
 * dibujando". Sigue la casa de `src/visual/laminas` (tinta sobre papel crema,
 * colores FIJOS porque es una ilustración que enseña, no cromo de UI) y usa el
 * auto-dibujado canónico de `src/visual/effects` (AutoDibujo + effects.css).
 *
 * No es una lámina de producción: vive junto al mockup. Si alguna de estas tres
 * (milpa / rotación / piso térmico) se estabiliza, se promovería a
 * `src/visual/laminas` con su fila en el índice — misma regla de la casa.
 */
import { AutoDibujo } from '../../visual/effects';

/* Paleta de tinta: sepia + verdes botánicos + tierras, sobre papel crema.
   Fija a propósito (legible al sol, no reacciona al tema). */
export const TINTA = '#5c4326'; // sepia principal (trazo y rótulos)
export const TINTA_2 = '#8a6b40'; // sepia claro (guías, rótulos 2°)
export const VERDE = '#6f8a3c'; // verde hoja
export const VERDE_OSC = '#55702c'; // verde de contornos/venas
export const VERDE_CLARO = '#9bb45f'; // verde tierno (frijol)
export const GRANO = '#d8a93f'; // oro del grano / flor
export const GRANO_OSC = '#b0822a'; // contorno del grano
export const NARANJA = '#d98b3c'; // calabaza / fruto cálido
export const TIERRA = '#7a5a34'; // suelo
export const TIERRA_CLARA = '#a07d4e'; // suelo claro
export const ROJO = '#a8443a'; // fruto / flor de frijol
export const CIAN = '#4f9aa0'; // páramo / frío

/* Rótulo de cuaderno: línea-guía que se DIBUJA sola + punto en el objetivo +
   texto serif itálico (letra de mano) que aparece en fundido. Se agrupa en una
   `etapa` (1..9) para escalonar su aparición con el resto de la lámina. */
export function Rotulo({ x, y, tx, ty, texto, sub = null, anchor = 'start', stage = 6 }) {
  return (
    <g className={`vfx-t${stage}`}>
      <AutoDibujo as="line" x1={tx} y1={ty} x2={x} y2={y} stroke={TINTA_2} strokeWidth="0.9" strokeLinecap="round" />
      <circle className="vfx-fade" cx={tx} cy={ty} r="1.8" fill={TINTA} />
      <text
        className="vfx-fade"
        x={x}
        y={y}
        textAnchor={anchor}
        fontFamily="'Georgia', 'Times New Roman', serif"
        fontStyle="italic"
        fontSize="12.5"
        fontWeight="600"
        fill={TINTA}
      >
        {texto}
      </text>
      {sub && (
        <text
          className="vfx-fade"
          x={x}
          y={y + 13}
          textAnchor={anchor}
          fontFamily="'Georgia', 'Times New Roman', serif"
          fontStyle="italic"
          fontSize="10"
          fill={TINTA_2}
        >
          {sub}
        </text>
      )}
    </g>
  );
}
