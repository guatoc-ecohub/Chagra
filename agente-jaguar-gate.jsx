/* eslint-disable react-refresh/only-export-components -- arnés de gate, no módulo de app */
/* Arnés del GATE del jaguar del AGENTE (trazado). NO SE COMMITEA.
   ?vista=vitrina|camina|pecho
   ?t=0.35   → congela TODA animación en el segundo t del ciclo (determinista)
   ?quieto=1 → pose base sin animación */
import { createRoot } from 'react-dom/client';
import ChagraAgentAvatarJaguar from './src/components/ChagraAgentAvatarJaguar.jsx';

const q = new URLSearchParams(location.search);
const vista = q.get('vista') || 'vitrina';
if (q.get('quieto')) {
  const s = document.createElement('style');
  s.textContent = '*{animation:none !important;transition:none !important}';
  document.head.appendChild(s);
}
const t = q.get('t');
if (t) {
  const s = document.createElement('style');
  s.textContent = `.jaguarHuesos, .jaguarHuesos *{ animation-play-state: paused !important; }
  .jaguarHuesos{ --jh-fase: ${-parseFloat(t)}s !important; }`;
  document.head.appendChild(s);
}

const ESTADOS = ['idle', 'thinking', 'speaking', 'listening', 'caminando'];

function Vitrina() {
  return (
    <>
      <div className="fila">
        {ESTADOS.map((e) => (
          <div className="caja" key={e}>
            <h3>{e} · 220px</h3>
            <ChagraAgentAvatarJaguar state={e} size={220} />
          </div>
        ))}
      </div>
      <div className="fila">
        {ESTADOS.map((e) => (
          <div className="caja oscura" key={e}>
            <h3>{e} · 48px FAB · glow · fondo oscuro</h3>
            <ChagraAgentAvatarJaguar state={e} size={48} glow withLabel />
          </div>
        ))}
      </div>
    </>
  );
}

function Camina() {
  return (
    <div className="fila">
      <div className="caja">
        <h3>caminando · 680px · t={t || 'vivo'}</h3>
        <ChagraAgentAvatarJaguar state="caminando" size={680} />
      </div>
    </div>
  );
}

function Pecho() {
  return (
    <div className="fila">
      <div className="caja">
        <h3>idle · 540px</h3>
        <ChagraAgentAvatarJaguar state="idle" size={540} />
      </div>
      <div className="caja">
        <h3>LUPA pecho x3 (pivote cuello 228,200→viewBox)</h3>
        <div className="lupa-pecho">
          <div><ChagraAgentAvatarJaguar state="idle" size={540} /></div>
        </div>
      </div>
    </div>
  );
}

function Caras() {
  return (
    <div className="fila">
      {ESTADOS.slice(0, 4).map((e) => (
        <div className="caja" key={e}>
          <h3>{e} · lupa cabeza x2.2</h3>
          <div className="lupa-cara">
            <div><ChagraAgentAvatarJaguar state={e} size={540} /></div>
          </div>
        </div>
      ))}
    </div>
  );
}

const VISTAS = { vitrina: Vitrina, camina: Camina, pecho: Pecho, caras: Caras };
const V = VISTAS[vista] || Vitrina;
createRoot(document.getElementById('root')).render(<V />);
