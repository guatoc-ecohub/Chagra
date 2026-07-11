/*
 * Infografia — ARQUETIPO 2D `infografia` (dim '2d'): DATO / CIFRAS de PRIMERA
 * CLASE, no un fallback.
 *
 * Para los mundos cuyo valor ES el dato/dosis/precio/diagnóstico (mercado,
 * toxicología, boletín del clima): el 3D sería ruido (DR §3.3), así que el mundo
 * declara DIRECTO este arquetipo. Una tarjeta con cifras grandes + notas + los
 * hotspots como accesos. Todo por datos: `params.cifras`, `params.notas`.
 */
export default function Infografia({ params, hotspots = [], tinte, onHotspot, titulo }) {
  const acento = (tinte && tinte[0]) || '#b98a2f';
  const cifras = params?.cifras || [];
  const notas = params?.notas || [];
  return (
    <div className="mundo2d mundo2d--info" style={{ '--m2d-tinte': acento }}>
      {(titulo || params?.titulo) && <h3 className="mundo2d__titulo">{titulo || params.titulo}</h3>}
      {cifras.length > 0 && (
        <ul className="mundo2d__cifras">
          {cifras.map((c, i) => (
            <li key={i} className="mundo2d__cifra">
              <span className="mundo2d__valor">
                {c.valor}
                {c.unidad ? <span className="mundo2d__unidad">{c.unidad}</span> : null}
              </span>
              <span className="mundo2d__cifra-label">{c.label}</span>
            </li>
          ))}
        </ul>
      )}
      {notas.length > 0 && (
        <ul className="mundo2d__notas">
          {notas.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
      {hotspots.length > 0 && (
        <div className="mundo2d__hotspots mundo2d__hotspots--info">
          {hotspots.map((h) => (
            <button
              key={h.id}
              type="button"
              className="mundo2d__hotspot"
              style={{ '--hs-tinte': acento }}
              onClick={() => onHotspot?.(h.view, h.data)}
              aria-label={h.label}
            >
              <span className="mundo2d__emoji" aria-hidden="true">{h.emoji}</span>
              <span className="mundo2d__txt">{h.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
