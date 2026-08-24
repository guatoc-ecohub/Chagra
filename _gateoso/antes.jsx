import { createRoot } from 'react-dom/client';
import { OsoAndino } from '../src/visual/creatures/OsoAndino.jsx';
import { OsoGuardian } from '../src/visual/creatures/OsoGuardian.jsx';

const SZ = 230;

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
      <Cell label="Oso café (OsoAndino) — RECHAZADO por diseño"><OsoAndino size={SZ} tier="alto" /></Cell>
      <Cell label="Oso guardián (lunar) — dirección vigente, SIN bastón"><OsoGuardian size={SZ} tier="alto" /></Cell>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
