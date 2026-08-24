/* Harness de gate 2.5D DOM (no versionado, como jaguar-solo.*): monta
   ZariguyaLaminaViva real y permite fijar fase por query:
   ?estado=idle|listening|speaking|thinking|caminando
   &visema=V1..V4  &vida=husmea|tanatosis|reposo|none  &parpado=1 */
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import ZariguyaLaminaViva from './src/visual/creatures/ZariguyaLaminaViva.jsx';

const q = new URLSearchParams(location.search);
const estado = q.get('estado') || 'idle';
const visema = q.get('visema') || null;
const vida = q.get('vida');
const parpado = q.get('parpado') === '1';
const pausa = q.get('pausa'); // segundos NEGATIVOS: congela los keyframes en esa fase

function Gate() {
  useEffect(() => {
    if (vida) {
      const pin = setInterval(() => {
        const el = document.querySelector('[data-creature="zariguya"]');
        if (!el) return;
        if (vida === 'none') el.removeAttribute('data-vida');
        else el.setAttribute('data-vida', vida);
      }, 80);
      return () => clearInterval(pin);
    }
    return undefined;
  }, []);
  useEffect(() => {
    if (pausa) {
      const st = document.createElement('style');
      st.textContent = `[data-creature="zariguya"] *, .zlv-stage { animation-play-state: paused !important; animation-delay: ${pausa}s !important; }`;
      document.head.appendChild(st);
    }
    if (parpado) {
      const st = document.createElement('style');
      st.textContent = '.zlv-parpado{animation:none !important;transform:scaleY(1) !important;}';
      document.head.appendChild(st);
    }
  }, []);
  return React.createElement('div',
    { style: { display: 'grid', placeItems: 'center', height: '100vh', background: '#e9e4d6' } },
    React.createElement(ZariguyaLaminaViva, { estado, visema, size: 430, animated: true, title: 'zariguya' }));
}
createRoot(document.getElementById('root')).render(React.createElement(Gate));
