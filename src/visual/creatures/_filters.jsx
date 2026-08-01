/*
 * Filtro SVG compartido de la familia visual "creatures": glow orgánico
 * (feGaussianBlur + feMerge) heredado de GuardianEspiritu + blur suave.
 * Cada criatura instancia estos filtros con ids ÚNICOS (useId) para poder
 * repetirse muchas veces en una misma página sin colisión de ids.
 * Interno de la librería — no se exporta desde el barrel.
 */
export function CreatureFilters({ glow, blur }) {
  return (
    <>
      <filter id={glow} x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="2.1" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id={blur}>
        <feGaussianBlur stdDeviation="3" />
      </filter>
    </>
  );
}
