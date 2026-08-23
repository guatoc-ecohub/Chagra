import React from 'react';
import { createRoot } from 'react-dom/client';
import OsoBastonLaminaViva from './src/visual/creatures/OsoBastonLaminaViva.jsx';
import OsoTrazado from './src/visual/creatures/OsoTrazado.jsx';
// congelar toda animación: el gate mide forma, no fase
const st = document.createElement('style');
st.textContent = '*{animation:none!important;transition:none!important}';
document.head.appendChild(st);
function App() {
  return (
    <div className="fila">
      <div className="caja pin-giro2"><h3>LÁMINA VIVA (aprobada) a +18°</h3>
        <OsoBastonLaminaViva estado="idle" size={480} /></div>
      <div className="caja pin-giro2"><h3>TRAZADO a +18°</h3>
        <OsoTrazado estado="idle" size={480} /></div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
