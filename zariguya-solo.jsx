import React from 'react';
import { createRoot } from 'react-dom/client';
import ZariguyaLaminaViva from './src/visual/creatures/ZariguyaLaminaViva.jsx';

createRoot(document.getElementById('root')).render(
  React.createElement('div', { style: { display: 'grid', placeItems: 'center', height: '100vh', background: '#e9e4d6' } },
    React.createElement(ZariguyaLaminaViva, { estado: 'idle', size: 420, animated: true, title: 'zarigüeya' })
  )
);
