import React from 'react';
import { createRoot } from 'react-dom/client';
import ChivitoPunkLaminaViva from './src/visual/creatures/ChivitoPunkLaminaViva.jsx';

// Mismo patrón del jaguar/luciernaga lv-gate (reúso, no reinvento). `animated`
// se apaga por query (?animated=0) para el control determinista: si un
// "defecto" desaparece sin animación, era un frame, no una costura.
const q = new URLSearchParams(location.search);
const estado = q.get('estado') || 'caminando';
const size = Number(q.get('size') || 460);
const animated = q.get('animated') !== '0';
const fondo = q.get('fondo') || '#e9e4d6';

createRoot(document.getElementById('root')).render(
  React.createElement(
    'div',
    { style: { display: 'grid', placeItems: 'center', height: '100vh', background: fondo } },
    React.createElement(ChivitoPunkLaminaViva, { estado, size, animated, tier: 'alto' })
  )
);
