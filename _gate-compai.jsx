import React from 'react';
import { createRoot } from 'react-dom/client';
import { GuacamayaCompai } from './src/visual/creatures/GuacamayaCompai.jsx';
import JaguarLaminaViva from './src/visual/creatures/JaguarLaminaViva.jsx';

const params = new URLSearchParams(window.location.search);
const species = params.get('species') || 'guacamaya';
const size = Number(params.get('size') || 380);
const estado = params.get('estado') || 'acompana';

function Elegido() {
  if (species === 'jaguar') {
    return <JaguarLaminaViva estado={estado} size={size} animated tier="alto" />;
  }
  return <GuacamayaCompai estado={estado} size={size} tier="alto" />;
}

createRoot(document.getElementById('root')).render(
  <main className="gate-shell">
    <Elegido />
  </main>,
);
