/*
 * ojo-probar — ARNÉS DE PRUEBA (uncommitted): rinde el avatar REAL en pose
 * base y superpone la CIRUGÍA CANDIDATA del ojo cercano (pupila+catchlight)
 * como overlay SVG en el mismo viewBox, para tunear coords y comparar contra
 * el ojo lejano ANTES de tocar pielTrazado.js. Coord candidata configurable
 * por querystring ?x=&y= (default medido de la grilla).
 */
/* eslint-disable */
import { createRoot } from 'react-dom/client';
import ChagraAgentAvatarZariguya from '../../src/components/ChagraAgentAvatarZariguya.jsx';

const SZ = 800;
const q = new URLSearchParams(location.search);
const X = parseFloat(q.get('x') ?? '184');
const Y = parseFloat(q.get('y') ?? '77');
const R = parseFloat(q.get('r') ?? '5');
const CAT = parseFloat(q.get('cat') ?? '2.1');

// Pupila redonda DEFINIDA que funde el creciente existente en un disco, +
// catchlight arriba-izquierda (misma luz que el ojo lejano). El ojo cercano
// es blanco-dominante → NO lleva base gris translúcida (se lee como mancha);
// la pupila oscura sólida ES el acento.
function Cirugia({ x, y, r, cat }) {
  return (
    <svg width={SZ} height={SZ} viewBox="-30 -25 545 500" preserveAspectRatio="xMidYMid meet"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <circle cx={x} cy={y} r={r} fill="#120c07" opacity={0.92} />
      <circle cx={x - 2.7} cy={y - 3.7} r={cat} fill="#f7efdb" opacity={0.92} />
    </svg>
  );
}

function App() {
  return (
    <div style={{ padding: 12, background: '#faf4e6' }}>
      <style>{`[data-calibrar] svg.zariguyaHuesos{ width:${SZ}px !important; height:${SZ}px !important; }`}</style>
      <div style={{ fontFamily: 'monospace', fontSize: 13 }}>candidato ojo cercano: x={X} y={Y}</div>
      <div data-calibrar data-medir style={{ position: 'relative', width: SZ, height: SZ }}>
        <ChagraAgentAvatarZariguya state="idle" size={SZ} animated={false} />
        <Cirugia x={X} y={Y} />
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
