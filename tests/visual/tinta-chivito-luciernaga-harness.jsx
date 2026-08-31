/* eslint-disable chagra-i18n/no-hardcoded-spanish --
 * Harness de gate: strings fijas intencionales, solo para captura headed. */
/**
 * tinta-chivito-luciernaga-harness.jsx — gate headed de la TINTA NUEVA
 * (2026-08-31): chivito de páramo (normal + punk) y luciérnaga de pie, las
 * bases aprobadas traducidas a tinta a mano. Cada bicho se muestra grande
 * (el juicio del arte) y a 64px (la legibilidad real de avatar), sobre fondo
 * claro y sobre fondo noche (la luciérnaga se juzga de noche).
 */
import { createRoot } from 'react-dom/client';
import { ChivitoTinta } from '../../src/visual/creatures/ChivitoTinta.jsx';
import { LuciernagaTinta } from '../../src/visual/creatures/LuciernagaTinta.jsx';

const panel = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  padding: '18px 22px', borderRadius: 12,
};
const label = { fontFamily: 'monospace', fontSize: 12 };

function Fila({ fondo, color, sufijo }) {
  return (
    <div style={{ display: 'flex', gap: 24, background: fondo, color, padding: 16 }}>
      <div style={panel} id={`chivito-normal-${sufijo}`}>
        <ChivitoTinta size={230} />
        <span style={label}>chivito normal</span>
        <ChivitoTinta size={64} />
      </div>
      <div style={panel} id={`chivito-punk-${sufijo}`}>
        <ChivitoTinta size={230} punk />
        <span style={label}>chivito PUNK (actúa)</span>
        <ChivitoTinta size={64} punk />
      </div>
      <div style={panel} id={`luciernaga-${sufijo}`}>
        <LuciernagaTinta size={230} />
        <span style={label}>luciérnaga (idle)</span>
        <LuciernagaTinta size={64} />
      </div>
      <div style={panel} id={`luciernaga-fuerte-${sufijo}`}>
        <LuciernagaTinta size={230} linterna="fuerte" />
        <span style={label}>luciérnaga (linterna fuerte)</span>
        <LuciernagaTinta size={64} linterna="apagada" />
      </div>
    </div>
  );
}

function Gate() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <Fila fondo="#f4efe2" color="#2a1a0c" sufijo="claro" />
      <Fila fondo="#101623" color="#f4efe2" sufijo="noche" />
    </div>
  );
}

createRoot(document.getElementById('tinta-root')).render(<Gate />);
