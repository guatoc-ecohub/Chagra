/* eslint-disable react-refresh/only-export-components -- arnés de gate:
   entry de createRoot para capturas, no un módulo Fast-Refresh. */
/* Arnés del GATE VISUAL del oso auto-trazado riggeado (vive en la rama del
   experimento; no se mergea).
   ?vista=todo|lamina|idle|camina|escucha|piensa|boca|florece|resopla|giros|
          perk|mira|calco|control|regiones
   ?fondo=magenta  → fondo #f0f (verificar que el calco no trae fondo horneado)
   ?quieto=1       → congela toda animación (capturas deterministas)
   ?z=2&cx=330&cy=160 → zoom con lupa (cx,cy en px de lámina)
   ?fps=1          → cuenta frames reales (rAF) 5s y los estampa. */
import { createRoot } from 'react-dom/client';
import OsoTrazado from './src/visual/creatures/OsoTrazado.jsx';
import OsoBastonLaminaViva from './src/visual/creatures/OsoBastonLaminaViva.jsx';
import { OT_REGIONES, OT_PIVOTES } from './src/visual/creatures/osoTrazado/pielTrazado.js';
import { CALCO_TRAZADO } from './src/visual/creatures/osoTrazado/calcoTrazado.js';

const q = new URLSearchParams(location.search);
const vista = q.get('vista') || 'todo';
if (q.get('fondo') === 'magenta') document.body.classList.add('magenta');
if (q.get('quieto')) {
  const s = document.createElement('style');
  s.textContent = '*{animation:none !important;transition:none !important}';
  document.head.appendChild(s);
}
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

/* El calco PLANO (sin rig): patrón del CONTROL de costuras. Mismo string
   CALCO_TRAZADO, mismo viewBox — la única diferencia con el rig ES el rig. */
function CalcoPlano({ opacity = 1 }) {
  return (
    <div
      style={{ opacity }}
      dangerouslySetInnerHTML={{
        __html: `<svg viewBox="-20 -30 655 690" style="width:100%;height:100%;display:block"><g>${CALCO_TRAZADO}</g></svg>`,
      }}
    />
  );
}

const COLORES = ['#d33', '#36c', '#2a2', '#c6a', '#a63', '#099', '#c33a00',
  '#7040c0', '#0a7040', '#b09000', '#e06080', '#4060e0'];

function Regiones() {
  const grid = [];
  for (let x = 0; x <= 615; x += 20) {
    grid.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={630} stroke={x % 100 ? '#0002' : '#00f4'} strokeWidth={x % 100 ? 0.4 : 0.8} />);
    if (x % 100 === 0) grid.push(<text key={`xt${x}`} x={x + 1} y={9} fontSize="8" fill="#00f">{x}</text>);
  }
  for (let y = 0; y <= 630; y += 20) {
    grid.push(<line key={`y${y}`} x1={0} y1={y} x2={615} y2={y} stroke={y % 100 ? '#0002' : '#00f4'} strokeWidth={y % 100 ? 0.4 : 0.8} />);
    if (y % 100 === 0) grid.push(<text key={`yt${y}`} x={1} y={y + 9} fontSize="8" fill="#00f">{y}</text>);
  }
  return (
    <div className="regiones">
      <img src="/compai/laminas/oso.png" alt="" />
      <svg viewBox="-20 -30 655 690">
        <g>{grid}</g>
        {Object.entries(OT_REGIONES).map(([n, pts], i) => (
          <g key={n}>
            <path
              d={`M${pts.map(([x, y]) => `${x},${y}`).join(' L')} Z`}
              fill="none" stroke={COLORES[i % COLORES.length]} strokeWidth="1.6"
            />
            <text x={pts[0][0] + 3} y={pts[0][1] + 11} fontSize="11"
              fill={COLORES[i % COLORES.length]}>{n}</text>
          </g>
        ))}
        {Object.entries(OT_PIVOTES).map(([n, [x, y]]) => (
          <g key={n}>
            <circle cx={x} cy={y} r="3" fill="#000" stroke="#fff" strokeWidth="1" />
            <text x={x + 4} y={y - 4} fontSize="9" fill="#000">{n}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function App() {
  const bloques = {
    lamina: (
      <Caja titulo="REFERENCIA — la lámina (oso.png)" clase="ref">
        <img src="/compai/laminas/oso.png" alt="lámina" />
      </Caja>
    ),
    idle: (
      <Caja titulo="IDLE: el trazado vivo (respira, corona cabecea)">
        <OsoTrazado estado="idle" size={520} className="lienzo" />
      </Caja>
    ),
    camina: (
      <Caja titulo="CAMINA: bob de marcha (plantado — el andar lo pone el host)">
        <OsoTrazado estado="caminando" size={520} className="lienzo" />
      </Caja>
    ),
    escucha: (
      <Caja titulo="ESCUCHA: orejas en perk + testa ladeada">
        <OsoTrazado estado="listening" size={520} className="lienzo" />
      </Caja>
    ),
    piensa: (
      <Caja titulo="PIENSA: mira arriba, orejas atrás">
        <OsoTrazado estado="thinking" size={520} className="lienzo" />
      </Caja>
    ),
    boca: (
      <Caja titulo="BOCA abierta (speaking, visema V3): fauces tras el calco">
        <OsoTrazado estado="speaking" visema="V3" size={520} className="lienzo" />
      </Caja>
    ),
    florece: (
      <Caja titulo="FLORECE: la corona late en flor">
        <OsoTrazado estado="idle" florece size={520} className="lienzo" />
      </Caja>
    ),
    resopla: (
      <Caja titulo="RESOPLA: huff de pecho">
        <OsoTrazado estado="idle" resopla size={520} className="lienzo" />
      </Caja>
    ),
    giros: (
      <>
        <Caja titulo="STRESS giro −18° (¿costura?)" clase="pin-giro">
          <OsoTrazado estado="idle" size={480} className="lienzo" />
        </Caja>
        <Caja titulo="STRESS giro +18° (¿costura?)" clase="pin-giro2">
          <OsoTrazado estado="idle" size={480} className="lienzo" />
        </Caja>
      </>
    ),
    perk: (
      <Caja titulo="STRESS orejas ±9° + corona 2°/1.045 congeladas" clase="pin-perk pin-corona">
        <OsoTrazado estado="idle" size={520} className="lienzo" />
      </Caja>
    ),
    mira: (
      <Caja titulo="STRESS mirada al extremo (translate máximo del rig)" clase="pin-mira">
        <OsoTrazado
          estado="idle" size={520} className="lienzo"
          data-rh-mira="usted"
          style={{ '--rh-mx': '0.55px', '--rh-my': '0.42px' }}
        />
      </Caja>
    ),
    calco: (
      <Caja titulo="CALCO — rig quieto al 55% sobre la lámina (calce de siluetas)">
        <div className="calco">
          <img src="/compai/laminas/oso.png" alt="" />
          <div><OsoTrazado animated={false} size={655} style={{ width: 655, height: 690 }} /></div>
        </div>
      </Caja>
    ),
    control: (
      <Caja titulo="CONTROL de costuras — |rig quieto − calco plano| (difference): todo lo que no sea negro es artefacto del RIG">
        <div className="control">
          <CalcoPlano />
          <div className="capaB">
            <OsoTrazado animated={false} size={655} style={{ width: 655, height: 690 }} />
          </div>
        </div>
      </Caja>
    ),
    regiones: (
      <Caja titulo="REGIONES de clip + pivotes sobre la lámina (depurar cortes)">
        <Regiones />
      </Caja>
    ),
    evidencia: (
      <>
        <Caja titulo="A — LA LÁMINA original (oso.png)" clase="ref">
          <img src="/compai/laminas/oso.png" alt="lámina" />
        </Caja>
        <Caja titulo="B — TRAZADO riggeado, idle">
          <OsoTrazado estado="idle" size={520} className="lienzo" />
        </Caja>
      </>
    ),
    ladoalado: (
      <>
        <Caja titulo="LÁMINA VIVA (aprobada) — mismo estado">
          <OsoBastonLaminaViva estado={q.get('e') || 'idle'} visema={q.get('v') || null} size={520} />
        </Caja>
        <Caja titulo="TRAZADO riggeado — mismo estado">
          <OsoTrazado estado={q.get('e') || 'idle'} visema={q.get('v') || null} size={520} className="lienzo" />
        </Caja>
      </>
    ),
  };
  const orden = vista === 'todo'
    ? ['lamina', 'idle', 'camina', 'escucha', 'boca', 'giros', 'perk', 'control']
    : [vista];
  // zoom-lupa para CUALQUIER vista: ?z=2.4&cx=330&cy=160 (px de lámina)
  const z = parseFloat(q.get('z') || '1');
  const cx = parseFloat(q.get('cx') || '306');
  const cy = parseFloat(q.get('cy') || '300');
  const estiloZoom = z !== 1
    ? { transform: `scale(${z})`, transformOrigin: `${cx + 20}px ${cy + 30 + 32}px` }
    : undefined;
  return (
    <div className="fila" style={estiloZoom}>
      {orden.map((k) => <div key={k} style={{ display: 'contents' }}>{bloques[k]}</div>)}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
