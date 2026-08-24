import React from 'react';
import { createRoot } from 'react-dom/client';
import LuciernagaLaminaViva from './src/visual/creatures/LuciernagaLaminaViva.jsx';
const q = new URLSearchParams(location.search);
const size = Number(q.get('size') || 360);
const ANCHO = 367; const ALTO = 507;
const contenido = q.get('plano') === '1'
  ? React.createElement('img', {
    src: '/compai/laminas/luciernaga.png',
    width: size * (ANCHO / ALTO), height: size,
    style: { display: 'block' },
  })
  : React.createElement(LuciernagaLaminaViva, {
    estado: q.get('estado') || 'idle',
    visema: q.get('visema') || null,
    eco: q.get('eco') || null,
    animated: q.get('animated') !== '0',
    size,
    title: 'luciernaga',
  });
createRoot(document.getElementById('root')).render(
  React.createElement('div', { style: { display: 'grid', placeItems: 'center', height: '100vh', background: q.get('bg') || '#e9e4d6' } }, contenido)
);
