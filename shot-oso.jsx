/* Harness EFÍMERO de captura (no se commitea): OsoGuardian y su ruana. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { OsoGuardian, AbejaAngelita, Jaguar, Danta } from './src/visual/creatures/index.js';
import './src/visual/creatures/creatures.css';

function Caja({ titulo, children }) {
  return (
    <div className="caja">
      <h2>{titulo}</h2>
      {children}
    </div>
  );
}

function App() {
  return (
    <div className="fila" data-listo="si">
      <Caja titulo="OSO — sin ruana">
        <OsoGuardian size={180} animated={false} />
      </Caja>
      <Caja titulo="OSO — ruana noche">
        <OsoGuardian size={180} animated={false} vestuario clima="noche" tempC={6} />
      </Caja>
      <Caja titulo="ANGELITA — sin ruana">
        <AbejaAngelita size={180} animated={false} />
      </Caja>
      <Caja titulo="ANGELITA — ruana noche">
        <AbejaAngelita size={180} animated={false} vestuario clima="noche" tempC={6} />
      </Caja>
      <Caja titulo="JAGUAR — ruana noche">
        <Jaguar size={180} animated={false} vestuario clima="noche" tempC={6} />
      </Caja>
      <Caja titulo="DANTA — ruana noche">
        <Danta size={180} animated={false} vestuario clima="noche" tempC={6} />
      </Caja>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
