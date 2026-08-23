/* eslint-disable react-refresh/only-export-components -- arnés de gate:
   entry de createRoot para capturas, no un módulo Fast-Refresh. */
/* Arnés del GATE VISUAL de la zarigüeya de huesos (no se commitea a main;
   vive en la rama del piloto para que Opus/operador lo reproduzcan igual).
   ?vista=todo|lamina|idle|camina|actuando|giros|cola|boca|calco  (capturas). */
import { createRoot } from 'react-dom/client';
import ZariguyaHuesos from './src/visual/creatures/ZariguyaHuesos.jsx';

const vista = new URLSearchParams(location.search).get('vista') || 'todo';

function Caja({ titulo, children, clase = '' }) {
  return (
    <div className={`caja ${clase}`}>
      <h3>{titulo}</h3>
      {children}
    </div>
  );
}

function App() {
  const bloques = {
    lamina: (
      <Caja titulo="REFERENCIA — la lámina (zariguya.png)" clase="ref">
        <img src="/compai/laminas/zariguya.png" alt="lámina" />
      </Caja>
    ),
    idle: (
      <Caja titulo="IDLE normal (70%): digna, vida sutil">
        <ZariguyaHuesos estado="idle" modo="normal" size={480} className="lienzo" style={{ '--zh-fase': '0s' }} />
      </Caja>
    ),
    camina: (
      <Caja titulo="CAMINA normal (70%): ronda nocturna bípeda">
        <ZariguyaHuesos estado="caminando" modo="normal" size={480} className="lienzo" style={{ '--zh-fase': '0s' }} />
      </Caja>
    ),
    actuando: (
      <Caja titulo="ACTUANDO (30%): Miss Minutes + cola en espiral">
        <ZariguyaHuesos estado="idle" modo="actuando" size={480} className="lienzo" style={{ '--zh-fase': '0s' }} />
      </Caja>
    ),
    giros: (
      <>
        <Caja titulo="STRESS giro −18° (¿costura?)" clase="pin-giro">
          <ZariguyaHuesos estado="idle" modo="normal" size={400} className="lienzo" />
        </Caja>
        <Caja titulo="STRESS giro +14° (¿costura?)" clase="pin-giro2">
          <ZariguyaHuesos estado="idle" modo="normal" size={400} className="lienzo" />
        </Caja>
      </>
    ),
    cola: (
      <Caja titulo="STRESS cola: la espiral prensil apretada (¿se parte?)" clase="pin-cola">
        <ZariguyaHuesos estado="idle" modo="normal" size={400} className="lienzo" />
      </Caja>
    ),
    boca: (
      <Caja titulo="BOCA abierta (visema V3): fauces reales del vector">
        <ZariguyaHuesos estado="speaking" modo="normal" visema="V3" size={400} className="lienzo" />
      </Caja>
    ),
    calco: (
      <Caja titulo="CALCO — vector al 55% sobre la lámina (calce de siluetas)">
        <div className="calco">
          <img src="/compai/laminas/zariguya.png" alt="" />
          <div><ZariguyaHuesos estado="idle" modo="normal" animated={false} size={545} style={{ width: 545, height: 500 }} /></div>
        </div>
      </Caja>
    ),
  };
  const orden = vista === 'todo'
    ? ['lamina', 'idle', 'camina', 'actuando', 'giros', 'cola', 'boca']
    : [vista];
  return <div className="fila">{orden.map((k) => <div key={k}>{bloques[k]}</div>)}</div>;
}

createRoot(document.getElementById('root')).render(<App />);
