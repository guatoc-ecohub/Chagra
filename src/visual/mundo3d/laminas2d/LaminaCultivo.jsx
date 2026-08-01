/*
 * LaminaCultivo — ARQUETIPO 2D `lamina` (dim '2d'): la FICHA ILUSTRADA que REUSA
 * `src/visual/laminas`.
 *
 * El caso de reuso de libro: un mundo-cultivo (maíz, cafeto, mata por etapa)
 * muestra la lámina dibujada a mano de la librería visual, elegida por datos
 * (`params.lamina` = slug del registro LAMINAS) con sus props de dominio
 * (`params.laminaProps`), + los hotspots. Sumar un mundo así = un slug + hotspots.
 */
import { LAMINAS } from '../../laminas/index.js';

export default function LaminaCultivo({ params, hotspots = [], tinte, onHotspot, titulo }) {
  const acento = (tinte && tinte[0]) || '#3f8f4e';
  const slug = params?.lamina;
  const entry = slug ? LAMINAS[slug] : null;
  const Lamina = entry?.Component;
  return (
    <div className="mundo2d mundo2d--lamina" style={{ '--m2d-tinte': acento }}>
      {(titulo || entry?.nombre) && <h3 className="mundo2d__titulo">{titulo || entry.nombre}</h3>}
      <div className="mundo2d__lamina-stage">
        {Lamina ? <Lamina {...(params?.laminaProps || {})} /> : (
          <p className="mundo2d__vacio">Lámina no encontrada: <code>{String(slug)}</code></p>
        )}
      </div>
      {hotspots.length > 0 && (
        <div className="mundo2d__hotspots">
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
