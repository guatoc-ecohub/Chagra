/*
 * Ficha — ARQUETIPO 2D `ficha` (dim '2d'): la TARJETA DE ESPECIE.
 *
 * Para los mundos que son fichas foto-secuenciales (frutales, botica, café): el
 * espacio 3D no agrega (DR §3.3) y el mundo declara este arquetipo. Cabecera
 * (emoji + nombre común + binomio), hechos en lista, y hotspots. Puede incrustar
 * una lámina de la librería (`params.lamina`) o una creature como retrato.
 */
export default function Ficha({ params, hotspots = [], tinte, onHotspot, titulo, retrato }) {
  const acento = (tinte && tinte[0]) || '#3f7d4e';
  const hechos = params?.hechos || [];
  return (
    <div className="mundo2d mundo2d--ficha" style={{ '--m2d-tinte': acento }}>
      <header className="mundo2d__ficha-head">
        {retrato ? <div className="mundo2d__retrato">{retrato}</div> : (
          <span className="mundo2d__ficha-emoji" aria-hidden="true">{params?.emoji || '🌱'}</span>
        )}
        <div>
          <h3 className="mundo2d__titulo">{titulo || params?.nombre || 'Especie'}</h3>
          {params?.cientifico && <p className="mundo2d__sci">{params.cientifico}</p>}
        </div>
      </header>
      {hechos.length > 0 && (
        <dl className="mundo2d__hechos">
          {hechos.map((h, i) => (
            <div key={i} className="mundo2d__hecho">
              <dt>{h.clave}</dt>
              <dd>{h.valor}</dd>
            </div>
          ))}
        </dl>
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
