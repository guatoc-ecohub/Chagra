/*
 * GlowFilter — el GLOW neón orgánico compartido de Chagra (§13.16 del catálogo).
 *
 * Es la MISMA receta que hoy está copiada como `<filter>` inline en varias
 * escenas y en la librería de fauna (GuardianEspiritu `ge-glow1`, creatures
 * `CreatureFilters`, SceneFincaOrganismo `fvo-glow1`…): un feGaussianBlur
 * fundido con el original vía feMerge, más — opcionalmente — un blur suave
 * suelto para halos/estelas. Aquí vive la versión canónica.
 *
 * Emite SOLO los `<filter>` (sin `<defs>`): el consumidor lo mete en su propio
 * `<defs>` y referencia por id. Como cada escena decide su id, se pueden repetir
 * muchos glows en una misma página sin colisión (pasar ids únicos con `useId`).
 *
 * @param {object} props
 * @param {string}  props.id              id del filtro de glow (obligatorio).
 * @param {number} [props.std=2.1]        desenfoque del glow (stdDeviation).
 * @param {string} [props.blurId]         si se pasa, emite además un blur suelto
 *                                        con este id (para halos/estelas).
 * @param {number} [props.blurStd=3]      desenfoque del blur suelto.
 * @param {string} [props.bounds='-80%']  origen del box del filtro (x/y); el
 *                                        ancho/alto se calculan como 100%-2*bounds.
 */
export function GlowFilter({ id, std = 2.1, blurId = '', blurStd = 3, bounds = '-80%' }) {
  const off = parseFloat(bounds); // -80  → box de 260%
  const size = `${100 - 2 * off}%`;
  return (
    <>
      <filter id={id} x={bounds} y={bounds} width={size} height={size}>
        <feGaussianBlur stdDeviation={std} result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      {blurId ? (
        <filter id={blurId}>
          <feGaussianBlur stdDeviation={blurStd} />
        </filter>
      ) : null}
    </>
  );
}

export default GlowFilter;
