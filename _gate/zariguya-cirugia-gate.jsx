import React from 'react';
import { createRoot } from 'react-dom/client';
import Zariguya from '../src/visual/creatures/ZariguyaLaminaViva.jsx';

createRoot(document.getElementById('root')).render(
  <main style={{ display: 'grid', placeItems: 'center', width: '100vw', height: '100vh', background: '#e9e4d6' }}>
    <Zariguya estado="idle" size={720} animated={false} tier="alto" />
  </main>,
);
