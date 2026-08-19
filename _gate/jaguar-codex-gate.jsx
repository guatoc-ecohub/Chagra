import React from 'react';
import { createRoot } from 'react-dom/client';
import JaguarLaminaViva from '../src/visual/creatures/JaguarLaminaViva.jsx';

const params = new URLSearchParams(location.search);
const size = Number(params.get('size') || 420);
const estado = params.get('estado') || 'caminando';

createRoot(document.getElementById('root')).render(
  React.createElement(
    'div',
    { style: { display: 'grid', placeItems: 'center', height: '100vh', margin: 0, background: '#e9e4d6' } },
    React.createElement(JaguarLaminaViva, { estado, size, animated: true, tier: 'alto' }),
  ),
);
