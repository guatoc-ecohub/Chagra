/* eslint-disable react-refresh/only-export-components -- arnés de QA, no lib */
/* Arnés del GATE VISUAL del jaguar de huesos (no se commitea a main; vive en
   la rama del piloto para que Opus/operador lo reproduzcan igual).
   ?vista=todo|lamina|camina|idle|actuando|giros|fauces|calco  (para capturas). */
import { createRoot } from 'react-dom/client';
import JaguarHuesos from './src/visual/creatures/JaguarHuesos.jsx';

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
      <Caja titulo="REFERENCIA — la lámina (jaguar-natural.png)" clase="ref">
        <img src="/compai/laminas/jaguar-natural.png" alt="lámina" />
      </Caja>
    ),
    idle: (
      <Caja titulo="IDLE normal (70%): digno, vida sutil">
        <JaguarHuesos estado="idle" modo="normal" size={560} className="lienzo" style={{ '--jh-fase': '0s' }} />
      </Caja>
    ),
    camina: (
      <Caja titulo="CAMINA normal (70%): marcha 4 patas">
        <JaguarHuesos estado="caminando" modo="normal" size={560} className="lienzo" style={{ '--jh-fase': '0s' }} />
      </Caja>
    ),
    actuando: (
      <Caja titulo="ACTUANDO (30%): Miss Minutes">
        <JaguarHuesos estado="idle" modo="actuando" size={560} className="lienzo" style={{ '--jh-fase': '0s' }} />
      </Caja>
    ),
    giros: (
      <>
        <Caja titulo="STRESS giro −18° (¿costura?)" clase="pin-giro">
          <JaguarHuesos estado="idle" modo="normal" size={430} className="lienzo" />
        </Caja>
        <Caja titulo="STRESS giro +14° (¿costura?)" clase="pin-giro2">
          <JaguarHuesos estado="idle" modo="normal" size={430} className="lienzo" />
        </Caja>
      </>
    ),
    fauces: (
      <Caja titulo="FAUCES abiertas (visema V3): boca real del vector">
        <JaguarHuesos estado="speaking" modo="normal" visema="V3" size={430} className="lienzo" />
      </Caja>
    ),
    auto: (
      <Caja titulo="AUTO 70/30 — el reloj propio alterna normal/actuando">
        <JaguarHuesos estado="idle" size={430} className="lienzo" />
      </Caja>
    ),
    calco: (
      <Caja titulo="CALCO — vector al 55% sobre la lámina (calce de siluetas)">
        <div className="calco">
          <img src="/compai/laminas/jaguar-natural.png" alt="" />
          <div><JaguarHuesos estado="idle" modo="normal" animated={false} size={765} style={{ width: 765, height: 500 }} /></div>
        </div>
      </Caja>
    ),
  };
  const orden = vista === 'todo'
    ? ['lamina', 'idle', 'camina', 'actuando', 'giros', 'fauces']
    : [vista];
  return <div className="fila">{orden.map((k) => <div key={k}>{bloques[k]}</div>)}</div>;
}

createRoot(document.getElementById('root')).render(<App />);
