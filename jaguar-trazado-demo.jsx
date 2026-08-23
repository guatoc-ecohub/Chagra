/* eslint-disable react-refresh/only-export-components -- arnés de gate:
   entry de createRoot para capturas, no un módulo Fast-Refresh. */
/* Arnés del GATE VISUAL del jaguar auto-trazado riggeado (vive en la rama
   del experimento; no se mergea).
   ?vista=todo|lamina|idle|camina|actuando|giros|cola|paso|boca|calco|regiones
   ?fondo=magenta  → fondo #f0f (verificar que el calco no trae fondo horneado)
   ?quieto=1       → congela toda animación (capturas deterministas)
   ?z=2.4&cx=150&cy=140 → lupa (cx,cy en px de lámina) — el examen es a
   TAMAÑO DE USO con zoom en las junturas, no el thumbnail. */
import { createRoot } from 'react-dom/client';
import JaguarTrazado from './src/visual/creatures/JaguarTrazado.jsx';
import { JT_REGIONES, JT_PIVOTES } from './src/visual/creatures/jaguarTrazado/pielTrazado.js';

const q = new URLSearchParams(location.search);
const vista = q.get('vista') || 'todo';
if (q.get('fondo') === 'magenta') document.body.classList.add('magenta');
if (q.get('quieto')) {
  const s = document.createElement('style');
  s.textContent = '*{animation:none !important;transition:none !important}';
  document.head.appendChild(s);
}
// ?fps=1 → cuenta frames reales (rAF) 5s y los estampa en pantalla y título
if (q.get('fps')) {
  let frames = 0;
  const t0 = performance.now();
  const cartel = document.createElement('div');
  cartel.style.cssText = 'position:fixed;top:4px;right:8px;font:bold 28px monospace;background:#000;color:#0f0;padding:4px 10px;z-index:99';
  cartel.textContent = 'FPS…';
  document.body.appendChild(cartel);
  const tick = () => {
    frames++;
    const dt = performance.now() - t0;
    if (dt < 5000) requestAnimationFrame(tick);
    else {
      const fps = (frames / dt) * 1000;
      cartel.textContent = `FPS ${fps.toFixed(1)}`;
      document.title = `FPS ${fps.toFixed(1)}`;
    }
  };
  requestAnimationFrame(tick);
}

function Caja({ titulo, children, clase = '' }) {
  return (
    <div className={`caja ${clase}`}>
      <h3>{titulo}</h3>
      {children}
    </div>
  );
}

const COLORES = ['#d33', '#36c', '#2a2', '#c6a', '#a63', '#099', '#c33a00',
  '#7040c0', '#0a7040', '#b09000', '#e06080', '#4060e0', '#666', '#903030',
  '#308090', '#a0a020', '#c07030', '#5060a0', '#a03060', '#307060'];

function Regiones() {
  // zoom por query: ?z=2.4&cx=200&cy=100 (cx,cy en px de lámina)
  const z = parseFloat(q.get('z') || '1');
  const cx = parseFloat(q.get('cx') || '350');
  const cy = parseFloat(q.get('cy') || '200');
  const estilo = z !== 1
    ? { transform: `scale(${z})`, transformOrigin: `${cx + 30}px ${cy + 80}px` }
    : undefined;
  const grid = [];
  for (let x = 0; x <= 700; x += 20) {
    grid.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={394} stroke={x % 100 ? '#0002' : '#00f4'} strokeWidth={x % 100 ? 0.4 : 0.7} />);
    if (x % 100 === 0) grid.push(<text key={`xt${x}`} x={x + 1} y={8} fontSize="7" fill="#00f">{x}</text>);
  }
  for (let y = 0; y <= 394; y += 20) {
    grid.push(<line key={`y${y}`} x1={0} y1={y} x2={705} y2={y} stroke={y % 100 ? '#0002' : '#00f4'} strokeWidth={y % 100 ? 0.4 : 0.7} />);
    if (y % 100 === 0) grid.push(<text key={`yt${y}`} x={1} y={y + 8} fontSize="7" fill="#00f">{y}</text>);
  }
  return (
    <div className="regiones" style={estilo}>
      <img src="/compai/laminas/jaguar-natural.png" alt="" />
      <svg viewBox="-30 -80 765 500">
        <g>{grid}</g>
        {Object.entries(JT_REGIONES).map(([n, pts], i) => (
          <g key={n}>
            <path
              d={`M${pts.map(([x, y]) => `${x},${y}`).join(' L')} Z`}
              fill="none" stroke={COLORES[i % COLORES.length]} strokeWidth="1.6"
            />
            <text x={pts[0][0] + 3} y={pts[0][1] + 11} fontSize="10"
              fill={COLORES[i % COLORES.length]}>{n}</text>
          </g>
        ))}
        {Object.entries(JT_PIVOTES).map(([n, [x, y]]) => (
          <g key={n}>
            <circle cx={x} cy={y} r="3" fill="#000" stroke="#fff" strokeWidth="1" />
            <text x={x + 4} y={y - 4} fontSize="8" fill="#000">{n}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function App() {
  // ?w=480 → tamaño del lienzo de idle/camina (comparar FPS como-con-como)
  const w = parseInt(q.get('w') || '760', 10);
  const tierQ = q.get('tier') || undefined;
  const bloques = {
    lamina: (
      <Caja titulo="REFERENCIA — la lámina (jaguar-natural.png)" clase="ref">
        <img src="/compai/laminas/jaguar-natural.png" alt="lámina" />
      </Caja>
    ),
    idle: (
      <Caja titulo="IDLE normal (70%): el trazado vivo">
        <JaguarTrazado estado="idle" modo="normal" tier={tierQ} size={w} className="lienzo" style={{ '--jh-fase': '0s', width: w }} />
      </Caja>
    ),
    camina: (
      <Caja titulo="CAMINA normal: marcha lateral de cuadrúpedo">
        <JaguarTrazado estado="caminando" modo="normal" tier={tierQ} size={w} className="lienzo" style={{ '--jh-fase': '0s', width: w }} />
      </Caja>
    ),
    actuando: (
      <Caja titulo="ACTUANDO (30%): Miss Minutes + aura">
        <JaguarTrazado estado="idle" modo="actuando" size={760} className="lienzo" style={{ '--jh-fase': '0s' }} />
      </Caja>
    ),
    giros: (
      <div style={{ display: 'flex', gap: 8 }}>
        <Caja titulo="STRESS giro −18° (¿costura? ¿bigotes enteros?)" clase="pin-giro">
          <JaguarTrazado estado="idle" modo="normal" tier="bajo" size={600} className="lienzo" style={{ width: 600 }} />
        </Caja>
        <Caja titulo="STRESS giro +14° (¿costura? ¿bigotes enteros?)" clase="pin-giro2">
          <JaguarTrazado estado="idle" modo="normal" tier="bajo" size={600} className="lienzo" style={{ width: 600 }} />
        </Caja>
      </div>
    ),
    cola: (
      <Caja titulo="STRESS cola: lash al extremo (¿se parte el rulo?)" clase="pin-cola">
        <JaguarTrazado estado="idle" modo="normal" tier="bajo" size={700} className="lienzo" />
      </Caja>
    ),
    paso: (
      <Caja titulo="STRESS paso: patas en pleno vuelo (¿huecos?)" clase="pin-paso">
        <JaguarTrazado estado="idle" modo="normal" tier="bajo" size={700} className="lienzo" />
      </Caja>
    ),
    boca: (
      <Caja titulo="BOCA abierta (visema V3): fauces detrás del calco">
        <JaguarTrazado estado="speaking" modo="normal" visema="V3" size={700} className="lienzo" />
      </Caja>
    ),
    calco: (
      <Caja titulo="CALCO — vector al 55% sobre la lámina (calce de siluetas)">
        <div className="calco">
          <img src="/compai/laminas/jaguar-natural.png" alt="" />
          <div><JaguarTrazado estado="idle" modo="normal" animated={false} size={765} style={{ width: 765, height: 500 }} /></div>
        </div>
      </Caja>
    ),
    regiones: (
      <Caja titulo="REGIONES de clip + pivotes sobre la lámina (depurar cortes)">
        <Regiones />
      </Caja>
    ),
  };
  const orden = vista === 'todo'
    ? ['lamina', 'idle', 'camina', 'actuando', 'giros', 'cola', 'paso', 'boca']
    : [vista];
  // zoom para CUALQUIER vista: ?z=2.4&cx=150&cy=140 (px de lámina, aprox)
  const z = parseFloat(q.get('z') || '1');
  const cx = parseFloat(q.get('cx') || '350');
  const cy = parseFloat(q.get('cy') || '200');
  const estiloZoom = z !== 1 && vista !== 'regiones'
    ? { transform: `scale(${z})`, transformOrigin: `${(cx + 30) * (760 / 765) + 20}px ${(cy + 80) * (760 / 765) + 32}px` }
    : undefined;
  return <div className="fila" style={estiloZoom}>{orden.map((k) => <div key={k}>{bloques[k]}</div>)}</div>;
}

createRoot(document.getElementById('root')).render(<App />);
