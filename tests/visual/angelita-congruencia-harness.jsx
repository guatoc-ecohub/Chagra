/* eslint-disable react-refresh/only-export-components --
 * Entry point del harness visual (createRoot directo); la página se recarga
 * entera para ver cambios — fast-refresh es irrelevante aquí. */
/**
 * angelita-congruencia-harness.jsx — Harness del GATE de congruencia visual de
 * Angelita (silueta · color · línea · movimiento).
 *
 * Monta la AbejaAngelita REAL (el mismo componente de producción, cero copias)
 * en las vistas que el gate necesita mirar por regiones:
 *
 *   #hero           — grande, viva, pose vuela (el retrato).
 *   #regiones       — lupa por zonas: cara, alas, tronco (tórax/abdomen),
 *                     extremidades. Zoom REAL del mismo SVG (no re-dibujo).
 *   #lectura        — lectura instantánea a tamaño chico (20→80px) sobre
 *                     fondo claro y oscuro (test Miss Minutes).
 *   #poses          — vuela / celebra / reposo / señala (rig intacto).
 *   #estados        — gafas, cejas, visemas, sed/mojada/comiendo/polen.
 *   #alpha          — sobre tablero de ajedrez: entra LIMPIA, nada horneado.
 *   #lineboil       — el contorno que hierve (capa cara, hero only).
 *
 * Uso: npx vite → /tests/visual/angelita-congruencia-harness.html
 * No entra al bundle de producción — solo tests/visual.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AbejaAngelita } from '../../src/visual/creatures/AbejaAngelita.jsx';

const CAJA = {
  background: '#10160f',
  color: '#e8e2d0',
  fontFamily: 'monospace',
  padding: '16px',
  minHeight: '100vh',
};

function Titulo({ children }) {
  return (
    <h2 style={{ font: 'bold 13px monospace', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ec49a', margin: '26px 0 10px', borderBottom: '1px solid #2c3a2a', paddingBottom: '4px' }}>
      {children}
    </h2>
  );
}

function Celda({ label, bg = 'transparent', children }) {
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, margin: 6, verticalAlign: 'top' }}>
      <div style={{ background: bg, borderRadius: 8, padding: 8, display: 'inline-flex' }}>{children}</div>
      <span style={{ fontSize: 10, color: '#8a9686' }}>{label}</span>
    </div>
  );
}

/* Lupa: muestra una REGIÓN del mismo SVG a gran aumento. El SVG se renderiza
 * enorme (size=S) y la ventana (view×view px) recorta centrada en (cx,cy) en
 * unidades del viewBox ('-15 -15 32 30'). preserveAspectRatio centra: escala
 * = S/32; el alto pintado es 30·escala con offset (S−30·escala)/2. */
function Lupa({ cx, cy, units = 12, view = 300, animated = true, ...props }) {
  const S = Math.round((32 / units) * view);
  const esc = S / 32;
  const offY = (S - 30 * esc) / 2;
  const px = (cx + 15) * esc;
  const py = (cy + 15) * esc + offY;
  return (
    <div style={{ width: view, height: view, overflow: 'hidden', position: 'relative', borderRadius: 6, background: '#1c2419' }}>
      <div style={{ position: 'absolute', left: Math.round(view / 2 - px), top: Math.round(view / 2 - py) }}>
        <AbejaAngelita size={S} animated={animated} {...props} />
      </div>
    </div>
  );
}

const AJEDREZ = {
  backgroundImage:
    'linear-gradient(45deg, #666 25%, transparent 25%, transparent 75%, #666 75%), linear-gradient(45deg, #666 25%, #999 25%, #999 75%, #666 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 8px 8px',
};

function Gate() {
  return (
    <div style={CAJA}>
      <h1 style={{ font: 'bold 15px monospace', color: '#d8e6cf' }}>
        GATE · Angelita — congruencia visual (componente real de producción)
      </h1>

      <section id="hero">
        <Titulo>Hero — viva, pose vuela</Titulo>
        <Celda label="360px vuela"><AbejaAngelita size={360} /></Celda>
        <Celda label="360px quieta (fotograma digno)"><AbejaAngelita size={360} animated={false} /></Celda>
      </section>

      <section id="regiones">
        <Titulo>Lupa por regiones (mismo SVG, zoom real)</Titulo>
        <Celda label="cara / cabeza"><Lupa cx={8.8} cy={-2.5} units={13} /></Celda>
        <Celda label="alas"><Lupa cx={-3} cy={-6} units={19} /></Celda>
        <Celda label="tronco: tórax + abdomen"><Lupa cx={0} cy={0} units={20} /></Celda>
        <Celda label="extremidades"><Lupa cx={-1} cy={6.5} units={20} /></Celda>
        <Celda label="antenas"><Lupa cx={9} cy={-8} units={12} /></Celda>
      </section>

      <section id="lectura">
        <Titulo>Lectura instantánea (Miss Minutes) — claro / oscuro</Titulo>
        <Celda label="claro" bg="#f3ead6">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            {[20, 28, 40, 56, 80].map((s) => <AbejaAngelita key={s} size={s} />)}
          </div>
        </Celda>
        <Celda label="oscuro" bg="#151b23">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            {[20, 28, 40, 56, 80].map((s) => <AbejaAngelita key={s} size={s} />)}
          </div>
        </Celda>
      </section>

      <section id="poses">
        <Titulo>Poses del rig (no se toca)</Titulo>
        {['vuela', 'celebra', 'reposo', 'señala'].map((p) => (
          <Celda key={p} label={p}><AbejaAngelita size={170} pose={p} /></Celda>
        ))}
      </section>

      <section id="estados">
        <Titulo>Estados / cara</Titulo>
        <Celda label="gafas"><AbejaAngelita size={140} gafas /></Celda>
        <Celda label="cejas alegres"><AbejaAngelita size={140} cejas="alegres" /></Celda>
        <Celda label="cejas altas"><AbejaAngelita size={140} cejas="altas" /></Celda>
        <Celda label="cejas fruncidas"><AbejaAngelita size={140} cejas="fruncidas" /></Celda>
        <Celda label="visema V2"><AbejaAngelita size={140} visema="V2" /></Celda>
        <Celda label="visema V3"><AbejaAngelita size={140} visema="V3" /></Celda>
        <Celda label="visema V4"><AbejaAngelita size={140} visema="V4" /></Celda>
        <Celda label="sed"><AbejaAngelita size={140} sed /></Celda>
        <Celda label="mojada"><AbejaAngelita size={140} mojada /></Celda>
        <Celda label="comiendo"><AbejaAngelita size={140} comiendo /></Celda>
        <Celda label="polen"><AbejaAngelita size={140} polen /></Celda>
      </section>

      <section id="alpha">
        <Titulo>Alpha limpio (nada horneado)</Titulo>
        <Celda label="ajedrez 200px" bg="transparent">
          <div style={{ ...AJEDREZ, padding: 10, borderRadius: 8 }}>
            <AbejaAngelita size={200} />
          </div>
        </Celda>
      </section>

      <section id="lineboil">
        <Titulo>Line-boil (hero)</Titulo>
        <Celda label="lineBoil 300px"><AbejaAngelita size={300} lineBoil /></Celda>
      </section>
    </div>
  );
}

createRoot(document.getElementById('gate-root')).render(<Gate />);

// El hash (#regiones, #poses…) apunta a secciones que existen DESPUÉS del
// mount de React — el scroll nativo del navegador ya pasó y no encontró nada.
// Se re-aplica a mano para que la captura por sección enfoque donde toca.
const ancla = window.location.hash.slice(1);
if (ancla) {
  setTimeout(() => {
    document.getElementById(ancla)?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, 300);
}
