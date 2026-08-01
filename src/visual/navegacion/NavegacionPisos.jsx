/*
 * NavegacionPisos — el HOST de la navegación unificada por pisos térmicos.
 *
 * Orquesta los TRES zooms sobre el mismo dato (`pisosNavegacion.js`):
 *   · MINI    — minimapa de esquina, siempre visible (orientación).
 *   · MEDIO   — mapa estratégico tipo Age of Empires (toggle).
 *   · GRANDE  — vista global de pantalla completa, la lámina del paisaje
 *               con el nevado y la Chorrera (toggle).
 *
 * Tocar un mundo en CUALQUIER zoom navega a su pantalla real vía
 * `onNavigate(view, data)` (la firma de `navigate` de App.jsx). Este host no
 * dibuja nada propio: compone los tres zooms y les reparte el estado.
 */
import { useCallback, useState } from 'react';
import MiniMapaPisos from './MiniMapaPisos.jsx';
import MapaEstrategicoPisos from './MapaEstrategicoPisos.jsx';
import VistaGlobalPisos from './VistaGlobalPisos.jsx';

/**
 * @param {object} props
 * @param {string|null} [props.mundoActual]  id del mundo donde está el usuario
 * @param {(view: string, data?: object|null) => void} [props.onNavigate]
 * @param {'mini'|'medio'|'grande'} [props.zoomInicial]
 */
export default function NavegacionPisos({ mundoActual = null, onNavigate, zoomInicial = 'mini' }) {
  const [zoom, setZoom] = useState(zoomInicial);

  const navegarAMundo = useCallback(
    (mundo) => {
      setZoom('mini');
      onNavigate?.(mundo.destino.view, mundo.destino.data || null);
    },
    [onNavigate],
  );

  return (
    <>
      <MiniMapaPisos
        mundoActual={mundoActual}
        onNavigate={navegarAMundo}
        onMapa={() => setZoom('medio')}
        onGlobal={() => setZoom('grande')}
      />
      {zoom === 'medio' && (
        <MapaEstrategicoPisos
          mundoActual={mundoActual}
          onNavigate={navegarAMundo}
          onCerrar={() => setZoom('mini')}
          onGlobal={() => setZoom('grande')}
        />
      )}
      {zoom === 'grande' && (
        <VistaGlobalPisos
          mundoActual={mundoActual}
          onNavigate={navegarAMundo}
          onCerrar={() => setZoom('mini')}
          onMapa={() => setZoom('medio')}
        />
      )}
    </>
  );
}
