/*
 * Arnés diag del cóndor: ?vista=grid (las variantes del SVG rubber-hose de
 * cerca — planeo, otea, celebra en V, lip-sync, line-boil, poder celeste) o
 * ?vista=cielo (el mockup CondorCielo3D: el billboard planeando en 3D).
 * Para capturas antes/después con scripts/diag/shot-condor.mjs.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Condor } from '/src/visual/creatures/index.js';
import CondorCielo3D from '/src/mockups/CondorCielo3D.jsx';

const vista = new URLSearchParams(window.location.search).get('vista') || 'grid';

const VARIANTES = [
  ['planea (idle)', {}],
  ['otea el valle', { otea: true }],
  ['celebra (alas en V)', { pose: 'celebra' }],
  ['reposo', { pose: 'reposo' }],
  ['habla V3', { visema: 'V3' }],
  ['línea que hierve', { lineBoil: true }],
  ['poder celeste', { poder: true }],
  ['sin animación', { animated: false }],
];

function Grid() {
  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(#a8cfe4, #d9ebf4)',
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
      alignItems: 'center', justifyItems: 'center', padding: 18, boxSizing: 'border-box',
      fontFamily: 'system-ui', color: '#1e3442',
    }}>
      <div style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Cóndor de los Andes — Vultur gryphus</h1>
        <div style={{ fontSize: 12, opacity: 0.75 }}>rubber-hose SVG · arnés diag</div>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <Condor size={340} />
      </div>
      {VARIANTES.map(([label, props]) => (
        <figure key={label} style={{ margin: 0, textAlign: 'center' }}>
          <Condor size={150} {...props} />
          <figcaption style={{ fontSize: 11, marginTop: 2 }}>{label}</figcaption>
        </figure>
      ))}
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>{vista === 'cielo' ? <CondorCielo3D /> : <Grid />}</React.StrictMode>,
);
