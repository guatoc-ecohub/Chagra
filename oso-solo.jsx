// oso-solo — harness del GATE 2.5D DOM (patrón jaguar-solo): monta
// OsoBastonLaminaViva a tamaño grande, con estado/visema/vida por query
// (?estado=listening&visema=V3&vida=florece) para capturar cada fase con
// microapp-shot y juzgarla con judge-vl. NO se versiona en el commit final.
import React from 'react';
import { createRoot } from 'react-dom/client';
import OsoBastonLaminaViva from './src/visual/creatures/OsoBastonLaminaViva.jsx';
const q = new URLSearchParams(location.search);
const estado = q.get('estado') || 'idle';
const visema = q.get('visema') || null;
// ?congela=T — congela TODAS las animaciones CSS en el segundo T (delay
// negativo + paused): pose determinista para comparar fases píxel a píxel
// (la captura con virtual-time no controla en qué fase cae el keyframe).
const congela = q.get('congela');
if (congela !== null) {
  const st = document.createElement('style');
  st.textContent = `* { animation-delay: -${Number(congela) || 0}s !important; ` +
    'animation-play-state: paused !important; transition: none !important; }';
  document.head.appendChild(st);
}
createRoot(document.getElementById('root')).render(
  React.createElement('div', { style: { display: 'grid', placeItems: 'center', height: '100vh', background: '#e9e4d6' } },
    React.createElement(OsoBastonLaminaViva, { estado, visema, size: 420, animated: true, title: 'oso' })
  )
);
// ?vida=florece|resopla|reposo — fuerza el data-vida del idle-cerebro (el
// componente lo pone solo con su reloj jitter; para el gate se fija a mano).
const vida = q.get('vida');
if (vida) {
  const fijar = () => {
    const raiz = document.querySelector('[data-creature="oso-baston"]');
    if (raiz) raiz.setAttribute('data-vida', vida); else setTimeout(fijar, 100);
  };
  setTimeout(fijar, 300);
}
