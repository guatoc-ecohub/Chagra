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

import { RH_LINE_BOIL } from './rubberhoseSpec.js';

/* Los 3 estados de seed que rotan (line-boil de 3 fotogramas). Los VALORES
   canónicos (seeds, frecuencia, escala, compás) viven en `rubberhoseSpec.js`:
   cualquier emulación CSS del boil debe latir a ese mismo compás. */
export const BOIL_SEEDS = RH_LINE_BOIL.seeds;

/**
 * @param {Object} props
 * @param {string} props.id  id ÚNICO del filtro (useId de la creature).
 * @param {number} [props.baseFrequency=0.025]  turbulencia (spec 0.02–0.03).
 * @param {number} [props.scale=4.5]  desplazamiento (spec 4.0–5.0).
 * @param {boolean} [props.animated=true]  rota la seed (line-boil). false = fijo.
 * @param {number[]} [props.seeds=BOIL_SEEDS]  los 3 estados de seed.
 * @param {string} [props.dur='0.4s']  duración del ciclo escalonado.
 * @returns {JSX.Element}
 */
export function LineBoilFilter({
  id,
  baseFrequency = RH_LINE_BOIL.baseFrequency,
  scale = RH_LINE_BOIL.scale,
  animated = true,
  seeds = BOIL_SEEDS,
  dur = RH_LINE_BOIL.dur,
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
