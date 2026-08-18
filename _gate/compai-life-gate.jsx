import React from 'react';
import { createRoot } from 'react-dom/client';
import Zariguya from '../src/visual/creatures/ZariguyaLaminaViva.jsx';
import Luciernaga from '../src/visual/creatures/LuciernagaLaminaViva.jsx';
import Oso from '../src/visual/creatures/OsoBastonLaminaViva.jsx';
import Chivito from '../src/visual/creatures/ChivitoPunkLaminaViva.jsx';

const COMPONENTES = { zariguya: Zariguya, luciernaga: Luciernaga, oso: Oso, chivito: Chivito };
const params = new URLSearchParams(window.location.search);
const species = params.get('species') || 'zariguya';
const size = Number(params.get('size') || 360);
const seed = params.get('seed') || '20260807';
const Compai = COMPONENTES[species] || Zariguya;

document.documentElement.dataset.gateSeed = seed;
createRoot(document.getElementById('root')).render(
  <main className="gate-shell">
    <Compai estado="idle" size={size} animated tier="alto" />
  </main>,
);
