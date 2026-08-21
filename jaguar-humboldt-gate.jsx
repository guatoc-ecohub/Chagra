/*
 * jaguar-humboldt-gate — harness SOLO del jaguar para los gates de la piel
 * Humboldt vectorial. Estados DETERMINISTAS por query (la vida idle aleatoria
 * va apagada por defecto: un gate no puede depender de un timer con jitter):
 *
 *   ?pose=camina        → marcha de perfil (rig .jaguar-lado)
 *   ?acecha=1 | ?ruge=1 → estados-firma del retrato
 *   ?mira=1             → simula mirausted (data-rh-mira + vars --rh-mx/--rh-my
 *                         como los setea useMiradaUsted) para verificar que la
 *                         TESTA GIRA y el cuello se estira SIN COSTURA
 *   ?mx=0.55&my=-0.2    → deflexión de la mirada (px chicos, contrato del hook)
 *   ?size=520           → tamaño del svg
 *   ?vida=1             → (opcional) enciende el idle-cerebro real
 *
 * El congelado de fases NO va aquí: lo hace el capturador con Web Animations
 * API (pause + currentTime), que preserva los delays entre patas — el truco
 * ?congela de animation-delay global aplastaría el 4 tiempos del jaguar.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Jaguar } from './src/visual/creatures/Jaguar.jsx';

const q = new URLSearchParams(location.search);
const size = Number(q.get('size') || 520);
const props = {
  size,
  animated: q.get('animated') !== '0',
  vida: q.get('vida') === '1',
  pose: q.get('pose') || 'anda',
  acecha: q.get('acecha') === '1',
  ruge: q.get('ruge') === '1',
  poder: q.get('poder') === '1',
  revelacion: q.get('revelacion') === '1',
  title: 'jaguar humboldt',
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Jaguar {...props} />
  </StrictMode>,
);

/* mirausted simulado: el hook real exige puntero vivo; el gate clava el MISMO
   contrato DOM que deja el hook (attr + vars sobre el nodo raíz del bicho). */
window.addEventListener('load', () => {
  window.setTimeout(() => {
    const svg = document.querySelector('svg[data-creature="jaguar"]');
    if (svg && q.get('mira') === '1') {
      svg.style.setProperty('--rh-mx', `${q.get('mx') || '0.55'}px`);
      svg.style.setProperty('--rh-my', `${q.get('my') || '-0.2'}px`);
      svg.setAttribute('data-rh-mira', 'usted');
    }
    document.body.setAttribute('data-listo', '1');
  }, 400);
});
