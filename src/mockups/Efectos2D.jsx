/*
 * Efectos2D — vitrina de los GEMELOS 2D del framework de mundos. Ruta pública
 * #/mockups/efectos-2d.
 *
 * Muestra los cuatro reemplazos 2D de primera clase (corte-lámina 2.5D, flujo-2D,
 * recinto-2D, estratos-2D) LADO A LADO, cada uno con los datos REALES de su mundo
 * (mismos `params`/hotspots que el diorama 3D) y una nota de cuándo se activa. El
 * mensaje: el 2D no es un fallback pobre — enseña LO MISMO con otro lenguaje.
 *
 * Estética: cuaderno de laboratorio. Mobile-first (320px). Autocontenido: cero
 * enlaces/imágenes externas; todo SVG propio de la librería visual.
 */
import { useState } from 'react';
import Mundo2D from '../visual/mundo3d/Mundo2D.jsx';
import { MUNDO } from '../visual/mundo3d/mundoData.js';
import { ARQUETIPOS } from '../visual/mundo3d/arquetipos.js';
import { tinteDeMundo, tituloDeMundo } from '../visual/mundo3d/resolverMundo.js';
import '../visual/mundo3d/mundo.css';
import './Efectos2D.css';

/* Cada gemelo, apareado con el mundo que lo usa (para traer datos reales). */
const GEMELOS = [
  {
    twin: 'corte2d', mundo: 'suelo',
    activa: 'Reemplaza el corte 3D del suelo en equipos de gama baja, sin WebGL o en ahorro de datos.',
  },
  {
    twin: 'flujo2d', mundo: 'agua',
    activa: 'Reemplaza el diorama del agua cuando el equipo no aguanta 3D o usted pidió menos movimiento.',
  },
  {
    twin: 'recinto2d', mundo: 'animales',
    activa: 'Reemplaza el corral 3D en gama baja; también sirve de mapa claro del corral, visto en planta.',
  },
  {
    twin: 'estratos2d', mundo: 'disenio',
    activa: 'Reemplaza el bosque 3D en equipos humildes; el corte vertical deja leer los 7 pisos de un vistazo.',
  },
];

function GemeloCard({ twin, mundo, activa, onVista }) {
  const d = MUNDO[mundo] || {};
  const arq = ARQUETIPOS[twin] || {};
  const titulo = tituloDeMundo(mundo);
  const tinte = tinteDeMundo(mundo);
  const entrada = { ...d, params: d.params, hotspots: d.hotspots, titulo };

  return (
    <figure className="ef2d-card">
      <figcaption className="ef2d-card__head">
        <h2 className="ef2d-card__titulo">{arq.nombre || twin}</h2>
        <p className="ef2d-card__par">
          Gemelo 2D de <b>{ARQUETIPOS[arq.de]?.nombre || arq.de}</b> · mundo: {titulo}
        </p>
      </figcaption>

      <div className="ef2d-card__escena">
        <Mundo2D
          escena={twin}
          motivo={arq.motivo}
          entrada={entrada}
          tinte={tinte}
          onHotspot={(view) => onVista(view)}
        />
      </div>

      <p className="ef2d-card__activa">
        <span className="ef2d-card__activa-tag" aria-hidden="true">Se activa</span>
        {activa}
      </p>
    </figure>
  );
}

export default function Efectos2D() {
  // Guardamos la última vista tocada (string vacío = ninguna aún) para el aviso.
  const [ultimaVista, setUltimaVista] = useState('');

  return (
    <main className="ef2d">
      <header className="ef2d-hero">
        <p className="ef2d-hero__kicker">Framework de mundos · reemplazo 2D</p>
        <h1 className="ef2d-hero__titulo">Los gemelos 2D de los mundos 3D</h1>
        <p className="ef2d-hero__par">
          El 2D no es un fallback pobre: es un reemplazo <b>claro, legible y consistente</b>.
          Cada diorama 3D tiene su gemelo 2D, que enseña <b>lo mismo</b> con otro lenguaje
          visual y la <b>misma paleta</b>.
        </p>
        <ul className="ef2d-hero__reglas">
          <li>
            <span className="ef2d-hero__num">1</span>
            El equipo no aguanta 3D (gama baja, sin WebGL, ahorro de datos o menos movimiento).
          </li>
          <li>
            <span className="ef2d-hero__num">2</span>
            El mundo nunca fue 3D (es dato, ficha o diagnóstico): usa directo su arquetipo 2D.
          </li>
        </ul>
      </header>

      <section className="ef2d-grid" aria-label="Los cuatro gemelos 2D">
        {GEMELOS.map((g) => (
          <GemeloCard key={g.twin} {...g} onVista={(view) => setUltimaVista(view)} />
        ))}
      </section>

      <p className="ef2d-estado" role="status" aria-live="polite">
        {ultimaVista
          ? `En la app, ese botón llevaría a la vista: ${ultimaVista}.`
          : 'Los botones de cada gemelo son reales: en la app navegan a su vista.'}
      </p>

      <footer className="ef2d-pie">
        <p>
          Reduced-motion: si usted pidió menos movimiento, los gemelos muestran un
          fotograma quieto y digno (el corte ya dibujado, el agua en reposo).
        </p>
      </footer>
    </main>
  );
}
