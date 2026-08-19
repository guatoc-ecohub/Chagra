/* Harness del GATE 2.5D DOM (no versionado): monta LuciernagaLaminaViva
   grande y deja forzar cada fase por query:
   ?estado=idle|listening|speaking|thinking|caminando
   ?visema=V1..V4  ?eco=leer|degradado|sano|pacto  ?size=420  ?animated=0
   ?vida=destella|lee|reposo   (fuerza data-vida en la raíz, para el CSS)
   ?fase=parpado               (congela los párpados CERRADOS — verifica que
                                los parches renderizan, el bug 0×0 del jaguar)
   ?fase=jaw                   (fuerza --llv-jaw:1 — mentón abajo + interior)
   ?romper=cabeza|linterna     (CONTROL NEGATIVO del juez: oculta esa capa)
   ?ref=1                      (lámina plana al lado, para comparar identidad) */
import React from 'react';
import { createRoot } from 'react-dom/client';
import LuciernagaLaminaViva from '/src/visual/creatures/LuciernagaLaminaViva.jsx';

const q = new URLSearchParams(location.search);
const estado = q.get('estado') || 'idle';
const visema = q.get('visema') || null;
const eco = q.get('eco') || null;
const size = Number(q.get('size') || 420);
const animated = q.get('animated') !== '0';
const fase = q.get('fase');
const romper = q.get('romper');
const vida = q.get('vida');

if (fase === 'parpado') {
  const st = document.createElement('style');
  st.textContent = '.llv-parpado{animation:none !important;transform:scaleY(1) !important;}';
  document.head.appendChild(st);
}
if (fase === 'jaw') {
  const st = document.createElement('style');
  st.textContent = '[data-creature="luciernaga"]{--llv-jaw:1 !important;} .llv-mandibulaPivote{transition:none !important;}';
  document.head.appendChild(st);
}
if (romper) {
  const clase = { cabeza: '.llv-cabezaGesto', linterna: '.llv-linterna' }[romper];
  if (clase) {
    const st = document.createElement('style');
    st.textContent = `${clase}{display:none !important;}`;
    document.head.appendChild(st);
  }
}
if (vida) {
  // fuerza el momento del idle-cerebro (el CSS reacciona a data-vida)
  setInterval(() => {
    const el = document.querySelector('[data-creature="luciernaga"]');
    if (el) el.setAttribute('data-vida', vida);
  }, 80);
}

const hijos = [
  React.createElement(LuciernagaLaminaViva, { estado, visema, eco, size, animated, title: 'luciernaga' }),
];
if (q.get('ref') === '1') {
  hijos.push(React.createElement('img', { src: '/compai/laminas/luciernaga.png', style: { height: size, imageRendering: 'auto' }, alt: 'lamina plana' }));
}
createRoot(document.getElementById('root')).render(
  React.createElement('div', { style: { display: 'flex', gap: 24, placeItems: 'center', justifyContent: 'center', height: '100vh', background: '#e9e4d6' } }, ...hijos),
);
