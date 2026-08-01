/*
 * FiltroAcuarela — el borde/relleno "pintado a la acuarela" compartido
 * (feTurbulence + feDisplacementMap).
 *
 * Da a un trazo o relleno SVG el borde húmedo, irregular y sangrado de la
 * acuarela: la turbulencia genera un ruido fractal y el displacement empuja los
 * píxeles según ese ruido. Es la receta que dibuja los bordes del mapa-acuarela
 * en vez de re-hilvanar un `<filter>` inline por mockup.
 *
 * Emite SOLO el `<filter>` (sin `<defs>`): el consumidor lo mete en su propio
 * `<defs>` y lo referencia con `filter={`url(#${id})`}`. Pasar ids únicos
 * (`useId`) para repetir varios en la misma página sin colisión.
 *
 * Reduced-motion-safe por construcción: el filtro es ESTÁTICO (no anima), en
 * línea con la regla de la casa "blur/filtros estáticos, solo transform/opacity
 * animados".
 *
 * @param {object} props
 * @param {string}  props.id                 id del filtro (obligatorio).
 * @param {number} [props.frequency=0.012]   baseFrequency del ruido (más alto =
 *                                           borde más nervioso/fino).
 * @param {number} [props.scale=6]           fuerza del desplazamiento en px.
 * @param {number} [props.octaves=2]         numOctaves del fractalNoise.
 * @param {number} [props.seed=7]            semilla del ruido (determinista).
 * @param {string} [props.bounds='-20%']     origen del box del filtro (x/y).
 */
export function FiltroAcuarela({
  id,
  frequency = 0.012,
  scale = 6,
  octaves = 2,
  seed = 7,
  bounds = '-20%',
}) {
  const off = parseFloat(bounds);
  const size = `${100 - 2 * off}%`;
  const noise = `${id}-noise`;
  return (
    <filter id={id} x={bounds} y={bounds} width={size} height={size}>
      <feTurbulence
        type="fractalNoise"
        baseFrequency={frequency}
        numOctaves={octaves}
        seed={seed}
        result={noise}
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2={noise}
        scale={scale}
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>
  );
}

export default FiltroAcuarela;
