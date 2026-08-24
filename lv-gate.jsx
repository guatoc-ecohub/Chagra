import React from 'react';
import { createRoot } from 'react-dom/client';
import Compai from './src/visual/creatures/ChivitoPunkLaminaViva.jsx';

const q = new URLSearchParams(location.search);
const estado = q.get('estado') || 'caminando';
const visema = q.get('visema') || null;
if (q.get('anim') === '0') {
  const st = document.createElement('style');
  st.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; }';
  document.head.appendChild(st);
}
createRoot(document.getElementById('root')).render(
  React.createElement(
    'div',
    { style: { display: 'grid', placeItems: 'center', height: '100vh', background: '#e9e4d6' } },
    React.createElement(Compai, { estado, size: 420, animated: true, tier: 'alto', visema })
  )
);
