/*
 * HotspotsGemelo — la fila de botones tocables compartida por los gemelos 2D.
 *
 * Cada `hotspot` (los MISMOS del registro del mundo) es un botón REAL que navega
 * a una vista de la app. Reusa las clases `.mundo2d__hotspot` (mundo.css) y
 * garantiza el target táctil ≥44px + contraste AA del texto. Un solo lugar para
 * no repetir la fila en los cuatro gemelos.
 */
export default function HotspotsGemelo({ hotspots = [], acento, onHotspot }) {
  if (!hotspots.length) return null;
  return (
    <div className="mundo2d__hotspots">
      {hotspots.map((h) => (
        <button
          key={h.id}
          type="button"
          className="mundo2d__hotspot gemelo2d__hotspot"
          style={{ '--hs-tinte': acento }}
          onClick={() => onHotspot?.(h.view, h.data)}
          aria-label={h.label}
        >
          <span className="mundo2d__emoji" aria-hidden="true">{h.emoji}</span>
          <span className="gemelo2d__hotspot-txt">{h.label}</span>
        </button>
      ))}
    </div>
  );
}
