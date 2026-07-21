/*
 * LineBoilFilter — el filtro SVG de LINE-BOIL reutilizable (contorno que vibra,
 * estética años 30 / Cuphead — ficha DR animación rubber-hose §1).
 *
 * `feTurbulence` (baseFrequency 0.02–0.03) + `feDisplacementMap` (scale 4–5)
 * desplazan el trazo; NO fluido → ESCALONADO a ~8fps rotando la `seed` en 3
 * estados con SMIL discreto (0.4s), tal cual la ficha. Cualquier creature lo
 * aplica con `filter="url(#id)"`.
 *
 * Cada instancia necesita un `id` ÚNICO (usá `useId()` en la creature) para no
 * colisionar con otras en la misma página. GPU-friendly y sin dependencias.
 *
 * GATE: el line-boil es MOVIMIENTO — con `prefers-reduced-motion` pasá
 * `animated={false}` (la creature ya sabe si debe congelar) y el filtro queda
 * estático (una seed fija): el trazo sigue con su textura pero sin vibrar.
 */

/* Los 3 estados de seed que rotan (line-boil de 3 fotogramas). */
export const BOIL_SEEDS = [2, 11, 23];

/**
 * @param {Object} props
 * @param {string} props.id  id ÚNICO del filtro (useId de la creature).
 * @param {number} [props.baseFrequency=0.025]  turbulencia (spec 0.02–0.03).
 * @param {number} [props.scale=4.5]  desplazamiento (spec 4.0–5.0).
 * @param {boolean} [props.animated=true]  rota la seed (line-boil). false = fijo.
 * @param {number[]} [props.seeds=BOIL_SEEDS]  los 3 estados de seed.
 * @param {string} [props.dur='0.4s']  duración del ciclo escalonado.
 * @returns {import('react').JSX.Element}
 */
export function LineBoilFilter({
  id,
  baseFrequency = 0.025,
  scale = 4.5,
  animated = true,
  seeds = BOIL_SEEDS,
  dur = '0.4s',
}) {
  return (
    <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence
        type="fractalNoise"
        baseFrequency={baseFrequency}
        numOctaves="1"
        seed={seeds[0]}
        result="rh-boil-noise"
      >
        {animated && (
          <animate
            attributeName="seed"
            values={seeds.join(';')}
            dur={dur}
            calcMode="discrete"
            repeatCount="indefinite"
          />
        )}
      </feTurbulence>
      <feDisplacementMap
        in="SourceGraphic"
        in2="rh-boil-noise"
        scale={scale}
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>
  );
}

export default LineBoilFilter;
