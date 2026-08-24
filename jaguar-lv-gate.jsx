import React from 'react';
import { createRoot } from 'react-dom/client';
import JaguarLaminaViva from './src/visual/creatures/JaguarLaminaViva.jsx';

const q = new URLSearchParams(location.search);
const estado = q.get('estado') || 'caminando';
createRoot(document.getElementById('root')).render(
  React.createElement(
    'div',
    { style: { display: 'grid', placeItems: 'center', height: '100vh', background: '#e9e4d6' } },
    React.createElement(JaguarLaminaViva, { estado, size: 420, animated: true, tier: 'alto' })
  )
);
