import React from 'react';
import { createRoot } from 'react-dom/client';
import { Jaguar } from '../src/visual/creatures/Jaguar.jsx';
import { Zariguya } from '../src/visual/creatures/Zariguya.jsx';
import { Luciernaga } from '../src/visual/creatures/Luciernaga.jsx';

const SZ = 190;

function Cell({ label, children }) {
  return (
    <div className="cell">
      {children}
      <div className="lbl">{label}</div>
    </div>
  );
}

function App() {
  return (
    <div className="grid">
      <Cell label="Jaguar — idle (acecho de hombros)"><Jaguar size={SZ} tier="alto" /></Cell>
      <Cell label="Jaguar — PAISAJE DEL MIEDO (poder kart)"><Jaguar size={SZ} tier="alto" paisajeDelMiedo /></Cell>
      <Cell label="Jaguar — ruge + lineBoil"><Jaguar size={SZ} tier="alto" ruge lineBoil /></Cell>
      <Cell label="Zarigüeya — idle (crías al lomo)"><Zariguya size={SZ} tier="alto" /></Cell>
      <Cell label="Zarigüeya — husmea"><Zariguya size={SZ} tier="alto" husmea /></Cell>
      <Cell label="Luciérnaga — normal (linterna late)"><Luciernaga size={SZ} tier="alto" /></Cell>
      <Cell label="Luciérnaga — eco=SANO (brilla fuerte)"><Luciernaga size={SZ} tier="alto" eco="sano" /></Cell>
      <Cell label="Luciérnaga — eco=DEGRADADO (titila)"><Luciernaga size={SZ} tier="alto" eco="degradado" /></Cell>
      <Cell label="Luciérnaga — eco=LEER (lee la noche)"><Luciernaga size={SZ} tier="alto" eco="leer" /></Cell>
      <Cell label="Luciérnaga — poder (verde-linterna)"><Luciernaga size={SZ} tier="alto" poder /></Cell>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
