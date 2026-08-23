/* eslint-disable react-refresh/only-export-components -- arnés de gate:
   entry de createRoot para capturas, no un módulo Fast-Refresh. */
/* Arnés del GATE VISUAL del experimento auto-trazado riggeado (vive en la
   rama del experimento; no se mergea).
   ?vista=todo|lamina|idle|camina|actuando|giros|cola|paso|boca|calco|regiones
   ?fondo=magenta  → fondo #f0f (verificar que el calco no trae fondo horneado)
   ?quieto=1       → congela toda animación (capturas deterministas). */
import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import ZariguyaTrazado from './src/visual/creatures/ZariguyaTrazado.jsx';
import { ZT_REGIONES, ZT_PIVOTES, BIGOTES_LIMPIOS } from './src/visual/creatures/zariguyaTrazado/pielTrazado.js';
import * as calcoMod from './src/visual/creatures/zariguyaTrazado/calcoTrazado.js';

/* El "crudo" de control = calco depurado (con su clip de aire limpio) +
   bigotes limpios — lo mismo que el rig pinta en reposo, sin huesos. */
const CLIP_AIRE = calcoMod.AIRE_LIMPIO_D
  ? `<clipPath id="crudoAire"><path clip-rule="evenodd" d="${calcoMod.AIRE_LIMPIO_D}"/></clipPath>`
  : '';
const CALCO_COMPLETO = `${CLIP_AIRE}<g${CLIP_AIRE ? ' clip-path="url(#crudoAire)"' : ''}>${calcoMod.CALCO_TRAZADO}</g>${BIGOTES_LIMPIOS}`;

const q = new URLSearchParams(location.search);
const vista = q.get('vista') || 'todo';
if (q.get('fondo') === 'magenta') document.body.classList.add('magenta');
/* ?sin=casquete,casqueteCalco,fauces… → apaga capas del rig por clase, para
   atribuir a ojo qué capa pinta un defecto (diagnóstico, no producto). */
if (q.get('sin')) {
  const s = document.createElement('style');
  s.textContent = q.get('sin').split(',')
    .map((c) => c.trim())
    .map((c) => `.${c.startsWith('zh-') ? c : `zt-${c}`}{display:none !important}`)
    .join('\n');
  document.head.appendChild(s);
}
/* ?sonda=x,y (px de página) → overlay con el stack de elementsFromPoint en
   ese punto + una cruz roja marcándolo (atribuir a ojo qué capa pinta ahí). */
if (q.get('sonda')) {
  const [sx, sy] = q.get('sonda').split(',').map(Number);
  setTimeout(() => {
    const pila = document.elementsFromPoint(sx, sy)
      .map((el) => `${el.tagName}${el.getAttribute('class') ? `.${el.getAttribute('class').split(' ').join('.')}` : ''}${el.getAttribute('fill') ? `[fill=${el.getAttribute('fill')}]` : ''}${el.getAttribute('href') ? `[${el.getAttribute('href')}]` : ''}${el.getAttribute('clip-path') ? `[clip=${el.getAttribute('clip-path')}]` : ''}${el.getAttribute('d') ? `[d=${el.getAttribute('d').slice(0, 40)}…]` : ''}`);
    const caja = document.createElement('pre');
    caja.style.cssText = 'position:fixed;right:8px;top:8px;max-width:560px;background:#000;color:#0f0;font:11px monospace;padding:8px;z-index:99;white-space:pre-wrap;word-break:break-all';
    caja.textContent = `sonda @ ${sx},${sy}\n${pila.join('\n')}`;
    document.body.appendChild(caja);
    const cruz = document.createElement('div');
    cruz.style.cssText = `position:fixed;left:${sx - 6}px;top:${sy - 6}px;width:12px;height:12px;border:2px solid #f00;border-radius:50%;z-index:98;pointer-events:none`;
    document.body.appendChild(cruz);
  }, 1200);
}
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
  '#308090', '#a0a020'];

function Regiones() {
  // zoom por query: ?z=2.4&cx=200&cy=100 (cx,cy en px de lámina)
  const z = parseFloat(q.get('z') || '1');
  const cx = parseFloat(q.get('cx') || '240');
  const cy = parseFloat(q.get('cy') || '220');
  const estilo = z !== 1
    ? { transform: `scale(${z})`, transformOrigin: `${cx + 30}px ${cy + 25}px` }
    : undefined;
  const grid = [];
  for (let x = 0; x <= 480; x += 20) {
    grid.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={444} stroke={x % 40 ? '#0002' : '#00f4'} strokeWidth={x % 40 ? 0.4 : 0.7} />);
    if (x % 40 === 0) grid.push(<text key={`xt${x}`} x={x + 1} y={8} fontSize="7" fill="#00f">{x}</text>);
  }
  for (let y = 0; y <= 444; y += 20) {
    grid.push(<line key={`y${y}`} x1={0} y1={y} x2={481} y2={y} stroke={y % 40 ? '#0002' : '#00f4'} strokeWidth={y % 40 ? 0.4 : 0.7} />);
    if (y % 40 === 0) grid.push(<text key={`yt${y}`} x={1} y={y + 8} fontSize="7" fill="#00f">{y}</text>);
  }
  return (
    <div className="regiones" style={estilo}>
      <img src="/compai/laminas/zariguya-trazo-ref.png" alt="" />
      <svg viewBox="-30 -25 545 500">
        <g>{grid}</g>
        {Object.entries(ZT_REGIONES).map(([n, pts], i) => (
          <g key={n}>
            <path
              d={`M${pts.map(([x, y]) => `${x},${y}`).join(' L')} Z`}
              fill="none" stroke={COLORES[i % COLORES.length]} strokeWidth="1.6"
            />
            <text x={pts[0][0] + 3} y={pts[0][1] + 11} fontSize="10"
              fill={COLORES[i % COLORES.length]}>{n}</text>
          </g>
        ))}
        {Object.entries(ZT_PIVOTES).map(([n, [x, y]]) => (
          <g key={n}>
            <circle cx={x} cy={y} r="3" fill="#000" stroke="#fff" strokeWidth="1" />
            <text x={x + 4} y={y - 4} fontSize="8" fill="#000">{n}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* Debug de la extracción de bigotes: el calco completo + los candidatos de
   extraer-bigotes.mjs (zt-bigotes-debug.json) pintados en ROJO encima. */
function BigotesDebug() {
  const [cand, setCand] = useState(null);
  useEffect(() => {
    fetch('/zt-bigotes-debug.json').then((r) => r.json()).then(setCand).catch(() => setCand([]));
  }, []);
  if (!cand) return <p>cargando…</p>;
  const rojos = cand.map((c) => `<path fill="#f00" d="${c.d}"/>`).join('');
  const markup = `<svg viewBox="0 0 481 444" width="962" height="888">${CALCO_COMPLETO}${rojos}</svg>`;
  return <div dangerouslySetInnerHTML={{ __html: markup }} />;
}

/* CRUDO: el calco COMPLETO sin rig ni clips — control del diff de reposo:
   el rig quieto debe dar píxel-idéntico a esto (todo diff = artefacto). */
function Crudo() {
  const markup = `<svg class="zariguyaHuesos" viewBox="-30 -25 545 500" preserveAspectRatio="xMidYMid meet" width="480" height="480">${CALCO_COMPLETO}</svg>`;
  return <div style={{ width: 480, height: 480, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: markup }} />;
}

function App() {
  const bloques = {
    lamina: (
      <Caja titulo="REFERENCIA — la lámina (zariguya.png)" clase="ref">
        <img src="/compai/laminas/zariguya-trazo-ref.png" alt="lámina" />
      </Caja>
    ),
    idle: (
      <Caja titulo="IDLE normal (70%): el trazado vivo">
        <ZariguyaTrazado estado="idle" modo="normal" size={480} className="lienzo" style={{ '--zh-fase': '0s' }} />
      </Caja>
    ),
    camina: (
      <Caja titulo="CAMINA normal: ronda nocturna bípeda">
        <ZariguyaTrazado estado="caminando" modo="normal" size={480} className="lienzo" style={{ '--zh-fase': '0s' }} />
      </Caja>
    ),
    actuando: (
      <Caja titulo="ACTUANDO (30%): Miss Minutes + cola en espiral">
        <ZariguyaTrazado estado="idle" modo="actuando" size={480} className="lienzo" style={{ '--zh-fase': '0s' }} />
      </Caja>
    ),
    giros: (
      <>
        <Caja titulo="STRESS giro −18° (¿costura?)" clase="pin-giro">
          <ZariguyaTrazado estado="idle" modo="normal" size={400} className="lienzo" />
        </Caja>
        <Caja titulo="STRESS giro +14° (¿costura?)" clase="pin-giro2">
          <ZariguyaTrazado estado="idle" modo="normal" size={400} className="lienzo" />
        </Caja>
      </>
    ),
    cola: (
      <Caja titulo="STRESS cola: la espiral prensil apretada (¿se parte?)" clase="pin-cola">
        <ZariguyaTrazado estado="idle" modo="normal" size={400} className="lienzo" />
      </Caja>
    ),
    paso: (
      <Caja titulo="STRESS paso: piernas en pleno vuelo (¿huecos?)" clase="pin-paso">
        <ZariguyaTrazado estado="idle" modo="normal" size={400} className="lienzo" />
      </Caja>
    ),
    boca: (
      <Caja titulo="BOCA abierta (visema V3): fauces detrás del calco">
        <ZariguyaTrazado estado="speaking" modo="normal" visema="V3" size={400} className="lienzo" />
      </Caja>
    ),
    calco: (
      <Caja titulo="CALCO — vector al 55% sobre la lámina (calce de siluetas)">
        <div className="calco">
          <img src="/compai/laminas/zariguya-trazo-ref.png" alt="" />
          <div><ZariguyaTrazado estado="idle" modo="normal" animated={false} size={545} style={{ width: 545, height: 500 }} /></div>
        </div>
      </Caja>
    ),
    regiones: (
      <Caja titulo="REGIONES de clip + pivotes sobre la lámina (depurar cortes)">
        <Regiones />
      </Caja>
    ),
    bigotes: (
      <Caja titulo="BIGOTES — candidatos de extracción en ROJO (2x)">
        <BigotesDebug />
      </Caja>
    ),
    crudo: (
      <Caja titulo="CRUDO — calco completo sin rig (control diff reposo)">
        <Crudo />
      </Caja>
    ),
  };
  const orden = vista === 'todo'
    ? ['lamina', 'idle', 'camina', 'actuando', 'giros', 'cola', 'paso', 'boca']
    : [vista];
  // zoom para CUALQUIER vista: ?z=2.4&cx=200&cy=100 (px de lámina, aprox)
  const z = parseFloat(q.get('z') || '1');
  const cx = parseFloat(q.get('cx') || '240');
  const cy = parseFloat(q.get('cy') || '220');
  const estiloZoom = z !== 1 && vista !== 'regiones'
    ? { transform: `scale(${z})`, transformOrigin: `${(cx + 30) * (480 / 545) + 20}px ${(cy + 25) * (480 / 545) + 32}px` }
    : undefined;
  return <div className="fila" style={estiloZoom}>{orden.map((k) => <div key={k}>{bloques[k]}</div>)}</div>;
}

createRoot(document.getElementById('root')).render(<App />);
