/*
 * oso-baston-gate — harness SOLO del oso del bastón para los gates de la
 * piel-lámina vectorial sobre huesos. Estados DETERMINISTAS por query (la
 * vida idle aleatoria va apagada por defecto: un gate no puede depender de un
 * timer con jitter). Calcado del harness del jaguar Humboldt (aprobado):
 *
 *   ?pose=camina        → marcha plantígrada con bastón
 *   ?modo=actuando      → fuerza el 30% Miss Minutes (sin query: normal)
 *   ?florece=1|resopla=1→ estados-firma
 *   ?visema=V3          → boca de lip-sync
 *   ?mira=1             → simula mirausted (data-rh-mira + vars --rh-mx/-my
 *                         como los setea useMiradaUsted): la TESTA GIRA sobre
 *                         el cuello-gola SIN COSTURA
 *   ?mx=0.55&my=-0.2    → deflexión de la mirada (px chicos, contrato del hook)
 *   ?size=520           → tamaño del svg
 *   ?vida=1             → (opcional) enciende el idle-cerebro real
 *
 * El congelado de fases NO va aquí: lo hace el capturador con Web Animations
 * API (pause + currentTime), que preserva los delays entre huesos.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { OsoBaston } from './src/visual/creatures/OsoBaston.jsx';

const q = new URLSearchParams(location.search);
const size = Number(q.get('size') || 520);
const props = {
  size,
  animated: q.get('animated') !== '0',
  vida: q.get('vida') === '1',
  pose: q.get('pose') || 'anda',
  modo: q.get('modo') || null,
  florece: q.get('florece') === '1',
  resopla: q.get('resopla') === '1',
  visema: q.get('visema') || null,
  poder: q.get('poder') === '1',
  title: 'oso del bastón lámina',
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <OsoBaston {...props} />
  </StrictMode>,
);

/* mirausted simulado: el hook real exige puntero vivo; el gate clava el MISMO
   contrato DOM que deja el hook (attr + vars sobre el nodo raíz del bicho). */
window.addEventListener('load', () => {
  window.setTimeout(() => {
    const svg = document.querySelector('svg[data-creature="oso-baston"]');
    if (svg && q.get('mira') === '1') {
      svg.style.setProperty('--rh-mx', `${q.get('mx') || '0.55'}px`);
      svg.style.setProperty('--rh-my', `${q.get('my') || '-0.2'}px`);
      svg.setAttribute('data-rh-mira', 'usted');
    }
    document.body.setAttribute('data-listo', '1');
  }, 400);
});
