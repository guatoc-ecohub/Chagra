import { createRoot } from 'react-dom/client';
import { OsoBaston } from '../src/visual/creatures/OsoBaston.jsx';

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
      <Cell label="Idle — plantado en su trocha (vaivén + corola)"><OsoBaston size={SZ} tier="alto" /></Cell>
      <Cell label="FLORECE — el bastón late en flor (gesto-firma)"><OsoBaston size={SZ} tier="alto" florece /></Cell>
      <Cell label="RESOPLA — el huff familiar con vaho"><OsoBaston size={SZ} tier="alto" resopla /></Cell>
      <Cell label="CAMINA — ciclo de andar con bastón"><OsoBaston size={SZ} tier="alto" pose="camina" /></Cell>
      <Cell label="CELEBRA — alza el bastón (rh-g)"><OsoBaston size={SZ} tier="alto" pose="celebra" /></Cell>
      <Cell label="PODER — aura verde del bastón florecido"><OsoBaston size={SZ} tier="alto" poder /></Cell>
      <Cell label="Narra — visema V3 (lip-sync)"><OsoBaston size={SZ} tier="alto" visema="V3" /></Cell>
      <Cell label="lineBoil — la línea que respira"><OsoBaston size={SZ} tier="alto" lineBoil /></Cell>
      <Cell label="tier bajo — fotograma digno"><OsoBaston size={SZ} tier="bajo" /></Cell>
      <Cell label="animated=false — lámina quieta digna"><OsoBaston size={SZ} animated={false} /></Cell>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
