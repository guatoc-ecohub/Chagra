/* Harness del GATE 2.5D DOM (no versionado): monta ChivitoPunkLaminaViva
   grande y deja forzar cada fase por query:
   ?estado=idle|listening|speaking|thinking|caminando
   ?visema=V1..V4  ?size=420  ?animated=0
   ?vida=rockea|apunta|reposo  (fuerza data-vida en la raíz, para el CSS)
   ?fase=parpado               (congela los párpados CERRADOS — verifica que
                                los parches renderizan, el bug 0×0 del jaguar)
   ?fase=jaw                   (fuerza --clv-jaw:1 — pico abajo + interior)
   ?romper=cabeza|mano         (CONTROL NEGATIVO del juez: oculta esa capa)
   ?ref=1                      (lámina plana al lado, para comparar identidad) */
import React from 'react';
import { createRoot } from 'react-dom/client';
import ChivitoPunkLaminaViva from '/src/visual/creatures/ChivitoPunkLaminaViva.jsx';

const q = new URLSearchParams(location.search);
const estado = q.get('estado') || 'idle';
const visema = q.get('visema') || null;
const size = Number(q.get('size') || 420);
const animated = q.get('animated') !== '0';
const fase = q.get('fase');
const romper = q.get('romper');
const vida = q.get('vida');

if (fase === 'parpado') {
  const st = document.createElement('style');
  st.textContent = '.clv-parpado{animation:none !important;transform:scaleY(1) !important;}';
  document.head.appendChild(st);
}
if (fase === 'jaw') {
  const st = document.createElement('style');
  st.textContent = '[data-creature="chivito-punk"]{--clv-jaw:1 !important;} .clv-mandibulaPivote{animation:none !important;transition:none !important;} .clv-bocaInterior{animation:none !important;transition:none !important;}';
  document.head.appendChild(st);
}
if (romper) {
  const clase = { cabeza: '.clv-cabezaGesto', mano: '.clv-manoPivote' }[romper];
  if (clase) {
    const st = document.createElement('style');
    st.textContent = `${clase}{display:none !important;}`;
    document.head.appendChild(st);
  }
}
if (vida) {
  // fuerza el momento del idle-cerebro (el CSS reacciona a data-vida)
  setInterval(() => {
    const el = document.querySelector('[data-creature="chivito-punk"]');
    if (el) el.setAttribute('data-vida', vida);
  }, 80);
}

const hijos = [
  React.createElement(ChivitoPunkLaminaViva, { estado, visema, size, animated, title: 'chivito-punk' }),
];
if (q.get('ref') === '1') {
  hijos.push(React.createElement('img', { src: '/compai/laminas/chivito-punk.png', style: { height: size, imageRendering: 'auto' }, alt: 'lamina plana' }));
}
createRoot(document.getElementById('root')).render(
  React.createElement('div', { style: { display: 'flex', gap: 24, placeItems: 'center', justifyContent: 'center', height: '100vh', background: '#e9e4d6' } }, ...hijos),
);
