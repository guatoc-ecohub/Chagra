import React from 'react';
import { createRoot } from 'react-dom/client';
import LuciernagaLaminaViva from './src/visual/creatures/LuciernagaLaminaViva.jsx';

// Mismo patrón del jaguar-lv-gate (reúso, no reinvento). `animated` se puede
// apagar por query para el control determinista: si un "defecto" desaparece con
// animated=0 era un frame de animación, no una costura. Ese control ya refutó un
// hallazgo mío antes (el "antifaz" de la abejita = parpadeo, 3/24 frames).
const q = new URLSearchParams(location.search);
const estado = q.get('estado') || 'caminando';
const size = Number(q.get('size') || 420);
const animated = q.get('animated') !== '0';
const fondo = q.get('fondo') || '#e9e4d6';

createRoot(document.getElementById('root')).render(
  React.createElement(
    'div',
    { style: { display: 'grid', placeItems: 'center', height: '100vh', background: fondo } },
    React.createElement(LuciernagaLaminaViva, { estado, size, animated, tier: 'alto' })
  )
);
