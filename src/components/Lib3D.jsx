/*
 * Lib3D — puente React hacia el Valle canónico.
 *
 * El Valle es una aplicación vanilla con renderer propio y no expone una
 * fábrica de Object3D. El iframe conserva ese contrato, evita duplicar la
 * escena en R3F y mantiene los juegos del Valle fuera del bundle de la PWA.
 */
import { useState } from 'react';
import { MSG } from '../config/messages.js';
import './lib3d.css';

export const CANONICAL_VALLE_URL = 'https://3d.guatoc.co/';

/**
 * @param {{ onBack?: () => void }} props
 */
export default function Lib3D({ onBack }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <main className="lib3d" data-testid="lib3d-bridge">
      <iframe
        className="lib3d__frame"
        src={CANONICAL_VALLE_URL}
        title="Valle canónico en 3D"
        loading="eager"
        allow="fullscreen"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
      />
      {!loaded && (
        <div className="lib3d__loading" role="status" aria-live="polite">
          {MSG.status.cargando}
        </div>
      )}
      {onBack && (
        <button type="button" className="lib3d__back" onClick={onBack} aria-label="Volver">
          ‹ Volver
        </button>
      )}
    </main>
  );
}
