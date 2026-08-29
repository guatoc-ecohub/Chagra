/* Harness de GATE — renderiza UN compai (especie por localStorage, ya sembrada
   en el <head>) en un estado dado por ?estado=, sobre banda clara y banda
   oscura, a tamaño grande para juzgar el arte. NO es código de producto: solo
   sirve al gate visual GPU (shot3d --headed). No se mergea. */
import React from 'react';
import { createRoot } from 'react-dom/client';
// CSS global de la app (mismos imports que main.jsx) — sin esto los tokens de
// color (var(--…)) quedan sin definir y los compai que pintan por CSS (la tinta
// de la zarigüeya) salen con trazos transparentes = captura en blanco.
import './index.css';
import './styles/themes.css';
import './styles/motion.css';
import './styles/temas-fase2.css';
import ChagraAgentAvatar from './components/ChagraAgentAvatar.jsx';

const q = new URLSearchParams(location.search);
const especie = q.get('especie') || 'angelita';
const estado = q.get('estado') || 'acompana';
const size = Number(q.get('size') || 200);

document.getElementById('cap').textContent = `${especie} · estado=${estado}`;

function Celda() {
  return (
    <>
      <div className="banda clara">
        <ChagraAgentAvatar estado={estado} size={size} title="gate" ariaLabel="gate" />
      </div>
      <div className="banda oscura">
        <ChagraAgentAvatar estado={estado} size={size} title="gate" ariaLabel="gate" />
      </div>
    </>
  );
}

createRoot(document.getElementById('raiz')).render(<Celda />);
