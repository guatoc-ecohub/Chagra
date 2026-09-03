/* eslint-disable react-refresh/only-export-components -- harness visual aislado */
import { createRoot } from 'react-dom/client';
import { ChivitoTrazado, LuciernagaTrazado } from '../../src/visual/creatures/index.js';

const panel = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
  minWidth: 190, padding: 18, borderRadius: 12,
};
const label = { fontFamily: 'monospace', fontSize: 12 };

function Fila({ fondo, sufijo }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 20, background: fondo, color: fondo === '#101623' ? '#f4efe2' : '#2a1a0c', padding: 20 }}>
      <div style={panel} data-testid={`chivito-normal-${sufijo}`}>
        <ChivitoTrazado size={230} />
        <span style={label}>chivito normal</span>
        <ChivitoTrazado size={64} />
        <ChivitoTrazado size={32} />
      </div>
      <div style={panel} data-testid={`chivito-punk-${sufijo}`}>
        <ChivitoTrazado size={230} punk modo="actuando" />
        <span style={label}>chivito punk, actuando</span>
        <ChivitoTrazado size={64} punk modo="actuando" />
        <ChivitoTrazado size={32} punk modo="actuando" />
      </div>
      <div style={panel} data-testid={`luciernaga-${sufijo}`}>
        <LuciernagaTrazado size={230} />
        <span style={label}>luciérnaga</span>
        <LuciernagaTrazado size={64} />
        <LuciernagaTrazado size={32} />
      </div>
    </div>
  );
}

function Gate() {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <Fila fondo="#f4efe2" sufijo="claro" />
      <Fila fondo="#101623" sufijo="noche" />
    </main>
  );
}

createRoot(document.getElementById('tinta-root')).render(<Gate />);
