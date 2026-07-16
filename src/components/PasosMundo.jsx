import { useState } from 'react';
import { PASOS_MUNDO } from '../data/pasosMundo.js';
import './PasosMundo.css';

const PREFIJO = 'chagra:pasosmundo:v1';

function clavePara(id) {
  return `${PREFIJO}:${id}`;
}

function leerVisto(id) {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(clavePara(id)) === '1';
  } catch {
    return false;
  }
}

function marcarVisto(id) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(clavePara(id), '1');
  } catch {
    // localStorage no disponible: la UI sigue funcionando sin romper.
  }
}

export default function PasosMundo({ id }) {
  const pasos = PASOS_MUNDO[id];
  const [abierto, setAbierto] = useState(() => Boolean(pasos) && !leerVisto(id));

  if (!pasos) return null;

  const cerrar = () => {
    marcarVisto(id);
    setAbierto(false);
  };

  const reabrir = () => setAbierto(true);

  return (
    <aside className="pasos-mundo" aria-live="polite">
      {abierto ? (
        <section className="pasos-mundo__card" role="dialog" aria-modal="false" aria-labelledby={`pasos-${id}-title`}>
          <p className="pasos-mundo__eyebrow">Pasos del mundo</p>
          <h2 className="pasos-mundo__title" id={`pasos-${id}-title`}>
            {pasos.titulo}
          </h2>
          <p className="pasos-mundo__intro">
            En esta pantalla usted ve para que sirve este mundo y como recorrerlo sin perderse.
          </p>
          <ol className="pasos-mundo__steps">
            {pasos.pasos.map((paso, index) => (
              <li key={`${id}-${index}`} className="pasos-mundo__step">
                <span className="pasos-mundo__num" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="pasos-mundo__text">{paso}</span>
              </li>
            ))}
          </ol>
          <div className="pasos-mundo__footer">
            <button type="button" className="pasos-mundo__close" onClick={cerrar}>
              Listo
            </button>
            <span className="pasos-mundo__hint">Luego lo puede abrir de nuevo con el signo de pregunta.</span>
          </div>
        </section>
      ) : (
        <button
          type="button"
          className="pasos-mundo__reopen"
          onClick={reabrir}
          aria-label={`Ver pasos de ${pasos.titulo}`}
          title={`Ver pasos de ${pasos.titulo}`}
        >
          ?
        </button>
      )}
    </aside>
  );
}
