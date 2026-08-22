/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { createRoot } from 'react-dom/client';
import Zariguya from '../src/visual/creatures/ZariguyaLaminaViva.jsx';
import Luciernaga from '../src/visual/creatures/LuciernagaLaminaViva.jsx';
import Oso from '../src/visual/creatures/OsoBastonLaminaViva.jsx';
import Chivito from '../src/visual/creatures/ChivitoPunkLaminaViva.jsx';
import Jaguar from '../src/visual/creatures/JaguarLaminaViva.jsx';
import { GuacamayaCompai } from '../src/visual/creatures/GuacamayaCompai.jsx';
import { MaizCompai } from '../src/visual/creatures/MaizCompai.jsx';

const LAMINA_PROPS = (size) => ({ estado: 'idle', size, animated: true, tier: 'alto' });

const COMPONENTES = {
  zariguya: { Component: Zariguya, props: LAMINA_PROPS },
  luciernaga: { Component: Luciernaga, props: LAMINA_PROPS },
  oso: { Component: Oso, props: LAMINA_PROPS },
  chivito: { Component: Chivito, props: LAMINA_PROPS },
  jaguar: { Component: Jaguar, props: LAMINA_PROPS },
  // La guacamaya usa la API rica: `estado` activa su idle-cerebro.
  guacamaya: {
    Component: GuacamayaCompai,
    props: (size) => ({ estado: 'acompana', state: 'idle', tier: 'alto', size }),
  },
  maiz: {
    Component: MaizCompai,
    props: (size) => ({ size, animated: true, tier: 'alto', pose: 'anda', animo: 'sereno' }),
  },
};

const params = new URLSearchParams(window.location.search);
const species = params.get('species') || 'zariguya';
const size = Number(params.get('size') || 360);
const seed = params.get('seed') || '20260807';
const config = COMPONENTES[species] || COMPONENTES.zariguya;
const Compai = config.Component;

document.documentElement.dataset.gateSeed = seed;
document.documentElement.dataset.gateSpecies = species;
createRoot(document.getElementById('root')).render(
  <main className="gate-shell">
    <Compai {...config.props(size)} />
  </main>,
);
