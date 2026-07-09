/**
 * BotonAnarquia.jsx — MOCKUP DEV del nuevo FAB del agente (#/mockups/boton-anarquia)
 *
 * Concepto (operador, 2026-07-08): el ícono del agente es la Ⓐ — de ANARQUÍA
 * y de AGRICULTURA a la vez. Tres herramientas del campo caen y se ensamblan
 * formando la A:
 *   - una PALA cae de un costado        → la diagonal izquierda,
 *   - un AZADÓN entra en horizontal     → el travesaño,
 *   - un MACHETE cae del otro costado   → la diagonal derecha.
 *
 * Clave: el círculo externo del botón actual SOBRA — es el MISMO aro de la Ⓐ.
 * Aquí el aro de la propia A hace de borde del botón: el ícono llena TODO el
 * FAB y las herramientas sobresalen del aro (como en la Ⓐ pintada en un muro).
 *
 * Tres variantes lado a lado, cada una con un lenguaje de animación distinto:
 *   01 LA FORJA      — caída con gravedad, rebote, chispas y encendido neón.
 *   02 LA SIMBIOSIS  — las herramientas brotan en espiral; savia + esporas.
 *   03 EL MACHETAZO  — esténcil callejero: golpes secos, salpicadura, flicker.
 *
 * Técnica: SVG + CSS puro (cero deps, cero fotos). Solo transform / opacity /
 * stroke-dashoffset (GPU-friendly, sin filter animado — el "glow" son trazos
 * duplicados translúcidos). `prefers-reduced-motion` apaga todo y deja la Ⓐ
 * ensamblada (estado base = fotograma final). Ruta sin gate ni sesión: es un
 * mockup para decidir dirección, no toca datos.
 */

import React, { useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// GEOMETRÍA COMPARTIDA — viewBox 0 0 140 140. Aro: cx 70, cy 74, r 46.
// Cada herramienta se dibuja en coordenadas locales "apuntando hacia abajo"
// (o en horizontal, el azadón) y se posiciona con translate+rotate para que
// las tres formen la A. Los extremos SOBRESALEN del aro a propósito:
// empuñadura arriba, hoja de pala y punta de machete abajo, travesaño a los
// lados — la Ⓐ pintada de un solo gesto.
// ─────────────────────────────────────────────────────────────────────────────

// PALA (diagonal izquierda). Local: empuñadura D en (0,~2), mango a (0,78),
// hoja puntuda hasta (0,112). Colocada: vértice (70,15), 17.2° → punta ~(37,122).
const PALA_POS = 'translate(70 15) rotate(17.2)';
const PALA_GRIP = 'M -7 9 A 7 7 0 1 1 7 9 L -7 9';
const PALA_SHAFT = 'M 0 9 L 0 78';
const PALA_BLADE = 'M -10 74 C -11.5 88 -6 100 0 112 C 6 100 11.5 88 10 74 C 4 78.5 -4 78.5 -10 74 Z';

// MACHETE (diagonal derecha). Local: pomo/mango (0,2)-(0,26), guarda, hoja
// que se ensancha con lomo recto y filo curvo hasta la punta (12,100).
// Colocado: nace junto al vértice (72,22), −18.8° → punta ~(116,113).
const MACHETE_POS = 'translate(72 22) rotate(-18.8)';
const MACHETE_HANDLE = 'M 0 2 L 0 26';
const MACHETE_GUARD = 'M -6 27 L 7 27';
const MACHETE_BLADE = 'M -4 29 L -4 80 Q -4 94 9 104 L 15 97 Q 7 90 6.5 76 L 6.5 29 Z';

// AZADÓN (travesaño). Local horizontal: mango (6,0)-(100,0); en el extremo
// izquierdo el cuello dobla hacia abajo y remata en la hoja perpendicular.
// Colocado en (22,88): el mango sobresale del aro por ambos lados y la cabeza
// cuelga afuera abajo-izquierda (contrapeso de la punta del machete).
const AZADON_POS = 'translate(22 88)';
const AZADON_HANDLE = 'M 8 0 L 100 0';
const AZADON_NECK = 'M 10 -1 C 2 0 -2 4 -3 10';
const AZADON_BLADE = 'M -8 8 L 3 9 L 5 26 L -13 23 Z';

// Ejes simplificados de la A (para capas de glow / savia): las tres barras.
const EJE_PALA = 'M 70 15 L 37 122';
const EJE_MACHETE = 'M 72 22 L 116 113';
const EJE_AZADON = 'M 24 88 L 120 88';

// ─────────────────────────────────────────────────────────────────────────────
// Herramientas por variante — mismos trazos, tres pieles:
//   neon    → trazo rojo marca + relleno vino profundo (biopunk actual)
//   bio     → trazo verde-menta bioluminiscente, filos claros, acento rojo
//   stencil → SIN trazos: masas hueso planas, como plantilla de aerosol
// ─────────────────────────────────────────────────────────────────────────────

function Pala({ skin }) {
  if (skin === 'stencil') {
    return (
      <g transform={PALA_POS}>
        <path d={PALA_GRIP} fill="none" stroke="#ece3cf" strokeWidth="7.5" strokeLinecap="round" />
        <path d={PALA_SHAFT} fill="none" stroke="#ece3cf" strokeWidth="9" strokeLinecap="round" />
        <path d={PALA_BLADE} fill="#ece3cf" />
      </g>
    );
  }
  const c = skin === 'bio'
    ? { line: '#35e0a1', hi: '#8fffd2', fill: '#0b2f23' }
    : { line: '#e8402e', hi: '#ff6b57', fill: '#4a0a00' };
  return (
    <g transform={PALA_POS}>
      <path d={PALA_GRIP} fill="none" stroke={c.line} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={PALA_SHAFT} fill="none" stroke={c.line} strokeWidth="6.5" strokeLinecap="round" />
      <path d={PALA_BLADE} fill={c.fill} stroke={c.hi} strokeWidth="3" strokeLinejoin="round" />
    </g>
  );
}

function Machete({ skin }) {
  if (skin === 'stencil') {
    return (
      <g transform={MACHETE_POS}>
        <path d={MACHETE_HANDLE} fill="none" stroke="#ece3cf" strokeWidth="9" strokeLinecap="round" />
        <path d={MACHETE_GUARD} fill="none" stroke="#ece3cf" strokeWidth="6" strokeLinecap="round" />
        <path d={MACHETE_BLADE} fill="#ece3cf" />
      </g>
    );
  }
  const c = skin === 'bio'
    ? { line: '#35e0a1', hi: '#8fffd2', fill: '#0b2f23', filo: '#ff5f4d' }
    : { line: '#e8402e', hi: '#ff6b57', fill: '#4a0a00', filo: '#ff6b57' };
  return (
    <g transform={MACHETE_POS}>
      <path d={MACHETE_HANDLE} fill="none" stroke={c.line} strokeWidth="6.5" strokeLinecap="round" />
      <path d={MACHETE_GUARD} fill="none" stroke={c.line} strokeWidth="4.5" strokeLinecap="round" />
      <path d={MACHETE_BLADE} fill={c.fill} stroke={c.hi} strokeWidth="2.6" strokeLinejoin="round" />
      {/* filo — la línea de vida del machete */}
      <path d="M 9 104 L 15 97" fill="none" stroke={c.filo} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

function Azadon({ skin }) {
  if (skin === 'stencil') {
    return (
      <g transform={AZADON_POS}>
        <path d={AZADON_HANDLE} fill="none" stroke="#ece3cf" strokeWidth="9" strokeLinecap="round" />
        <path d={AZADON_NECK} fill="none" stroke="#ece3cf" strokeWidth="6.5" strokeLinecap="round" />
        <path d={AZADON_BLADE} fill="#ece3cf" />
      </g>
    );
  }
  const c = skin === 'bio'
    ? { line: '#35e0a1', hi: '#8fffd2', fill: '#0b2f23' }
    : { line: '#e8402e', hi: '#ff6b57', fill: '#4a0a00' };
  return (
    <g transform={AZADON_POS}>
      <path d={AZADON_HANDLE} fill="none" stroke={c.line} strokeWidth="6.5" strokeLinecap="round" />
      <path d={AZADON_NECK} fill="none" stroke={c.line} strokeWidth="4.5" strokeLinecap="round" />
      <path d={AZADON_BLADE} fill={c.fill} stroke={c.hi} strokeWidth="2.6" strokeLinejoin="round" />
    </g>
  );
}

/** Chispas de impacto: rayitas que salen despedidas desde (x,y). */
function Chispas({ x, y, kf, color = '#ffb03a' }) {
  const dirs = [
    { sx: '-13px', sy: '-9px', r: -40 },
    { sx: '12px', sy: '-12px', r: 35 },
    { sx: '-10px', sy: '7px', r: -105 },
    { sx: '14px', sy: '5px', r: 110 },
  ];
  return (
    <g>
      {dirs.map((d, i) => (
        <line
          key={i}
          className={`ba-spark ${kf}`}
          x1={x} y1={y} x2={x} y2={y - 6}
          stroke={color} strokeWidth="2.6" strokeLinecap="round"
          style={{ '--sx': d.sx, '--sy': d.sy, '--sr': `${d.r}deg` }}
        />
      ))}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VARIANTE 01 — LA FORJA (neón, gravedad, chispas)
// ─────────────────────────────────────────────────────────────────────────────
function FabForja() {
  return (
    <svg viewBox="0 0 140 140" className="ba-svg b1-root" aria-hidden="true">
      {/* cara del botón: el disco ES el fondo del FAB */}
      <circle cx="70" cy="74" r="46" fill="#150907" />
      {/* aro de la Ⓐ = borde del botón; se traza a sí mismo al arrancar */}
      <circle
        className="b1-aro" cx="70" cy="74" r="46" fill="none"
        stroke="#c93b2a" strokeWidth="7" strokeLinecap="round"
        pathLength="290"
      />
      <circle cx="70" cy="74" r="46" fill="none" stroke="#ff6b57" strokeWidth="1.4" opacity="0.35" />

      {/* glow de la Ⓐ completa — trazos anchos translúcidos (cero filtros) */}
      <g className="b1-glow" fill="none" stroke="#ff5a46" strokeWidth="13" strokeLinecap="round" opacity="0">
        <path d={EJE_PALA} />
        <path d={EJE_MACHETE} />
        <path d={EJE_AZADON} />
        <circle cx="70" cy="74" r="46" strokeWidth="11" />
      </g>

      {/* herramientas: caen en orden pala → machete → azadón */}
      <g className="b1-pala"><Pala skin="neon" /></g>
      <g className="b1-machete"><Machete skin="neon" /></g>
      <g className="b1-azadon"><Azadon skin="neon" /></g>

      {/* ondas + chispas de cada aterrizaje */}
      <circle className="b1-onda b1-onda-a" cx="42" cy="112" r="9" fill="none" stroke="#ffb03a" strokeWidth="2.4" opacity="0" />
      <circle className="b1-onda b1-onda-b" cx="108" cy="106" r="9" fill="none" stroke="#ffb03a" strokeWidth="2.4" opacity="0" />
      <circle className="b1-onda b1-onda-c" cx="70" cy="88" r="9" fill="none" stroke="#ffb03a" strokeWidth="2.4" opacity="0" />
      <Chispas x={42} y={112} kf="b1-sp-a" />
      <Chispas x={108} y={106} kf="b1-sp-b" />
      <Chispas x={26} y={88} kf="b1-sp-c" />
      <Chispas x={118} y={88} kf="b1-sp-c" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VARIANTE 02 — LA SIMBIOSIS (brote en espiral, savia, esporas)
// ─────────────────────────────────────────────────────────────────────────────
function FabSimbiosis() {
  const esporas = [
    { x: 48, y: 88, kf: 'b2-es-a' },
    { x: 70, y: 62, kf: 'b2-es-b' },
    { x: 92, y: 88, kf: 'b2-es-c' },
    { x: 58, y: 46, kf: 'b2-es-c' },
    { x: 82, y: 50, kf: 'b2-es-a' },
    { x: 70, y: 96, kf: 'b2-es-b' },
  ];
  return (
    <svg viewBox="0 0 140 140" className="ba-svg b2-root" aria-hidden="true">
      <circle cx="70" cy="74" r="46" fill="#04140d" />
      {/* membrana viva: aro que respira + poros punteados que giran lento */}
      <g className="b2-membrana">
        <circle cx="70" cy="74" r="46" fill="none" stroke="#2fe6a6" strokeWidth="6.5" />
        <circle cx="70" cy="74" r="46" fill="none" stroke="#bfffe6" strokeWidth="1.2" opacity="0.4" />
        <circle
          className="b2-poros" cx="70" cy="74" r="40" fill="none"
          stroke="#57f2b8" strokeWidth="2" strokeLinecap="round"
          strokeDasharray="0.5 9" opacity="0.55"
        />
      </g>

      {/* destello al completarse la Ⓐ */}
      <g className="b2-bloom" fill="none" stroke="#8fffd2" strokeWidth="12" strokeLinecap="round" opacity="0">
        <path d={EJE_PALA} />
        <path d={EJE_MACHETE} />
        <path d={EJE_AZADON} />
      </g>

      {/* estelas fantasma (mismo brote, desfasado y tenue) */}
      <g className="b2-orb b2-orb-pala b2-estela"><Pala skin="bio" /></g>
      <g className="b2-orb b2-orb-azadon b2-estela"><Azadon skin="bio" /></g>
      <g className="b2-orb b2-orb-machete b2-estela"><Machete skin="bio" /></g>

      {/* herramientas: brotan en espiral pala → azadón → machete */}
      <g className="b2-orb b2-orb-pala"><Pala skin="bio" /></g>
      <g className="b2-orb b2-orb-azadon"><Azadon skin="bio" /></g>
      <g className="b2-orb b2-orb-machete"><Machete skin="bio" /></g>

      {/* savia: pulsos de luz recorriendo la Ⓐ ya ensamblada */}
      <g className="b2-savia" fill="none" stroke="#c8ffe9" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="4 12" opacity="0">
        <path d={EJE_PALA} pathLength="96" />
        <path d={EJE_MACHETE} pathLength="96" />
        <path d={EJE_AZADON} pathLength="96" />
      </g>

      {/* esporas que se desprenden de la Ⓐ viva */}
      {esporas.map((e, i) => (
        <circle key={i} className={`b2-espora ${e.kf}`} cx={e.x} cy={e.y} r={i % 2 ? 1.7 : 2.3} fill="#b8ffe3" opacity="0" />
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VARIANTE 03 — EL MACHETAZO (esténcil callejero, golpes secos, salpicadura)
// ─────────────────────────────────────────────────────────────────────────────
function FabMachetazo() {
  return (
    <svg viewBox="0 0 140 140" className="ba-svg b3-root" aria-hidden="true">
      <circle cx="70" cy="74" r="46" fill="#100e0a" />
      <g className="b3-shake">
        {/* aro estampado con aerosol + anillo grunge discontinuo */}
        <g className="b3-aro">
          <circle cx="70" cy="74" r="46" fill="none" stroke="#ece3cf" strokeWidth="8" />
          <circle
            cx="70" cy="74" r="46" fill="none" stroke="#ece3cf" strokeWidth="8"
            strokeDasharray="30 7 55 5 40 9 62 4" opacity="0.0"
          />
          <circle
            className="b3-grunge" cx="70" cy="74" r="41" fill="none"
            stroke="#d43222" strokeWidth="1.6" strokeDasharray="18 26 7 40 24 14" opacity="0.5"
          />
        </g>

        {/* la Ⓐ estarcida — con flicker de neón roto al final */}
        <g className="b3-tools">
          <g className="b3-pala"><Pala skin="stencil" /></g>
          <g className="b3-azadon"><Azadon skin="stencil" /></g>
          <g className="b3-machete"><Machete skin="stencil" /></g>
        </g>

        {/* estelas de velocidad de cada golpe */}
        <polygon className="b3-streak b3-streak-pala" points="66,-14 74,-14 71,52 69,52" fill="#ece3cf" opacity="0" />
        <g className="b3-streak b3-streak-azadon" stroke="#ece3cf" strokeWidth="3" strokeLinecap="round" opacity="0">
          <line x1="78" y1="82" x2="130" y2="80" />
          <line x1="86" y1="94" x2="132" y2="93" />
        </g>
        <polygon className="b3-streak b3-streak-machete" points="86,6 92,1 122,110 114,112" fill="#ece3cf" opacity="0" />

        {/* salpicaduras de pintura — una tanda por golpe, quedan de recuerdo */}
        <g className="b3-splat b3-splat-a" fill="#d43222">
          <circle cx="34" cy="118" r="3.2" />
          <circle cx="26" cy="110" r="1.8" />
          <circle cx="43" cy="126" r="1.4" />
          <circle cx="21" cy="121" r="1.1" />
        </g>
        <g className="b3-splat b3-splat-b" fill="#d43222">
          <circle cx="122" cy="84" r="2.8" />
          <circle cx="128" cy="94" r="1.6" />
          <circle cx="117" cy="76" r="1.2" />
        </g>
        <g className="b3-splat b3-splat-c" fill="#d43222">
          <circle cx="112" cy="120" r="3.4" />
          <circle cx="120" cy="112" r="1.9" />
          <circle cx="104" cy="128" r="1.5" />
          <circle cx="126" cy="124" r="1.2" />
        </g>
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tarjeta de variante: demo grande + fila a tamaño real + ficha
// ─────────────────────────────────────────────────────────────────────────────
function VarianteCard({ num, nombre, lema, desc, specs, children }) {
  const [gen, setGen] = useState(0);
  return (
    <article className="ba-card">
      <header className="ba-card-head">
        <span className="ba-num">{num}</span>
        <div>
          <h2 className="ba-nombre">{nombre}</h2>
          <p className="ba-lema">{lema}</p>
        </div>
      </header>
      <button
        type="button"
        className="ba-stage"
        onClick={() => setGen((g) => g + 1)}
        aria-label={`Repetir el ensamble de ${nombre}`}
        title="Toca para repetir el ensamble"
      >
        <span className="ba-fab ba-fab-demo" key={gen}>{children}</span>
        <span className="ba-suelo" aria-hidden="true" />
      </button>
      <p className="ba-desc">{desc}</p>
      <div className="ba-real" key={`real-${gen}`}>
        <span className="ba-real-label">tamaño real</span>
        <span className="ba-fab" style={{ width: 64, height: 64 }}>{children}</span>
        <span className="ba-fab" style={{ width: 44, height: 44 }}>{children}</span>
        <span className="ba-real-px">64 / 44 px</span>
      </div>
      <p className="ba-specs">{specs}</p>
    </article>
  );
}

export default function BotonAnarquia({ onBack }) {
  return (
    <div className="ba-page">
      <style>{BA_CSS}</style>
      <div className="ba-frame">
        <nav className="ba-topnav">
          <button type="button" className="ba-back" onClick={onBack}>← Volver</button>
          <span className="ba-tag">mockup dev · no toca datos</span>
        </nav>

        <header className="ba-hero">
          <p className="ba-eyebrow">FAB del agente · reemplazo del botón Ⓐ · 3 variantes</p>
          <h1 className="ba-title">
            Ⓐ de anarquía.<br />Ⓐ de agricultura.
          </h1>
          <p className="ba-sub">
            Tres herramientas caen y se ensamblan: la <b>pala</b> es una diagonal, el{' '}
            <b>azadón</b> el travesaño y el <b>machete</b> completa la A. El aro de la
            propia Ⓐ hace de borde del botón — sin círculo externo, el ícono llena todo
            el FAB y las herramientas se asoman por fuera del aro.
          </p>
          <p className="ba-hint">Toca cualquier botón para repetir el ensamble.</p>
        </header>

        <main className="ba-grid">
          <VarianteCard
            num="01"
            nombre="La Forja"
            lema="cae con peso, golpea, se enciende"
            desc="El aro se traza solo, como marcado a soplete. Cada herramienta cae con gravedad y rebota al clavarse — onda y chispas en cada golpe. Con el azadón puesto, la Ⓐ completa se enciende en neón y queda respirando."
            specs="loop 5.8 s · trazo neón de la marca actual · chispas ámbar de fragua"
          >
            <FabForja />
          </VarianteCard>

          <VarianteCard
            num="02"
            nombre="La Simbiosis"
            lema="brota en espiral, corre savia"
            desc="El aro es una membrana viva que respira. Las herramientas no caen: brotan girando en espiral como zarcillos que buscan su lugar. Al ensamblarse, pulsos de savia recorren la Ⓐ y suelta esporas que flotan hacia arriba."
            specs="loop 7 s · bioluminiscencia verde-menta · acento rojo solo en el filo"
          >
            <FabSimbiosis />
          </VarianteCard>

          <VarianteCard
            num="03"
            nombre="El Machetazo"
            lema="tres golpes secos y salpicadura"
            desc="Esténcil de aerosol sobre el muro: el aro se estampa, la pala se CLAVA, el azadón entra de hachazo y el machete corta al final — el botón entero se sacude con cada golpe y la pintura salpica. Remata con un parpadeo de neón roto."
            specs="loop 5.2 s · esténcil hueso + salpicadura roja · micro-sacudida por golpe"
          >
            <FabMachetazo />
          </VarianteCard>
        </main>

        <footer className="ba-foot">
          <p>
            SVG + CSS puro (transform/opacity, cero filtros animados, cero deps) ·{' '}
            con <code>prefers-reduced-motion</code> la Ⓐ queda ensamblada y quieta ·{' '}
            misma geometría en las tres — solo cambia la piel y el gesto.
          </p>
        </footer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS — todo el movimiento vive aquí. Convención: b1-* Forja, b2-* Simbiosis,
// b3-* Machetazo, ba-* página. Cada ciclo es UNA animación infinita por
// elemento con fases en porcentajes (ensamble → vida → fundido → reset).
// ─────────────────────────────────────────────────────────────────────────────
const BA_CSS = `
/* ══ página ══════════════════════════════════════════════════════════════ */
.ba-page {
  min-height: 100vh;
  min-height: 100dvh;
  background:
    radial-gradient(1100px 480px at 82% -10%, rgba(46, 230, 166, 0.05), transparent 60%),
    radial-gradient(900px 520px at -10% 108%, rgba(212, 50, 34, 0.06), transparent 55%),
    #070d0a;
  color: #d9e5dc;
  font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  overflow-x: hidden;
}
.ba-frame { max-width: 1180px; margin: 0 auto; padding: 18px 20px 48px; }
.ba-topnav { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.ba-back {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(217, 229, 220, 0.18);
  color: #d9e5dc; border-radius: 999px; padding: 8px 16px;
  font-size: 0.9rem; cursor: pointer;
}
.ba-back:hover { border-color: rgba(217, 229, 220, 0.45); }
.ba-back:focus-visible, .ba-stage:focus-visible {
  outline: 2px solid #2fe6a6; outline-offset: 3px;
}
.ba-tag {
  font-family: ui-monospace, 'Cascadia Mono', 'JetBrains Mono', monospace;
  font-size: 0.68rem; letter-spacing: 0.14em; text-transform: uppercase;
  color: rgba(217, 229, 220, 0.45);
}
.ba-hero { padding: 34px 0 10px; max-width: 720px; }
.ba-eyebrow {
  font-family: ui-monospace, 'Cascadia Mono', 'JetBrains Mono', monospace;
  font-size: 0.72rem; letter-spacing: 0.22em; text-transform: uppercase;
  color: #e8402e; margin: 0 0 14px;
}
.ba-title {
  font-size: clamp(2.1rem, 5.2vw, 3.4rem); line-height: 0.98; margin: 0 0 16px;
  font-weight: 900; letter-spacing: -0.02em; text-transform: uppercase;
  color: #f2f7f3;
}
.ba-sub { font-size: 0.98rem; line-height: 1.55; color: rgba(217, 229, 220, 0.78); margin: 0; }
.ba-sub b { color: #f2f7f3; }
.ba-hint {
  margin: 12px 0 0; font-size: 0.8rem; color: rgba(217, 229, 220, 0.5); font-style: italic;
}

.ba-grid {
  display: grid; gap: 18px; margin-top: 26px;
  grid-template-columns: repeat(auto-fit, minmax(305px, 1fr));
}
.ba-card {
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(217, 229, 220, 0.12);
  border-radius: 18px; padding: 18px 18px 16px;
  display: flex; flex-direction: column; gap: 12px;
}
.ba-card-head { display: flex; gap: 12px; align-items: baseline; }
.ba-num {
  font-family: ui-monospace, 'Cascadia Mono', 'JetBrains Mono', monospace;
  font-size: 0.8rem; color: #e8402e; letter-spacing: 0.08em;
}
.ba-nombre {
  margin: 0; font-size: 1.25rem; font-weight: 800; letter-spacing: 0.01em;
  text-transform: uppercase; color: #f2f7f3;
}
.ba-lema { margin: 2px 0 0; font-size: 0.8rem; color: rgba(217, 229, 220, 0.55); }
.ba-stage {
  display: flex; align-items: center; justify-content: center; position: relative;
  padding: 26px 0 34px; cursor: pointer; border: 0; border-radius: 14px;
  background:
    radial-gradient(340px 200px at 50% 42%, rgba(255, 255, 255, 0.035), transparent 70%),
    rgba(0, 0, 0, 0.32);
}
.ba-fab { display: inline-block; position: relative; width: 208px; height: 208px; }
.ba-svg { display: block; width: 100%; height: 100%; overflow: visible; }
.ba-suelo {
  position: absolute; left: 50%; bottom: 16px; width: 120px; height: 14px;
  transform: translateX(-50%);
  background: radial-gradient(50% 50% at 50% 50%, rgba(0, 0, 0, 0.55), transparent 75%);
  border-radius: 50%;
}
.ba-desc { margin: 0; font-size: 0.86rem; line-height: 1.5; color: rgba(217, 229, 220, 0.72); }
.ba-real {
  display: flex; align-items: center; gap: 14px;
  border-top: 1px dashed rgba(217, 229, 220, 0.14); padding-top: 12px;
}
.ba-real-label, .ba-real-px, .ba-specs {
  font-family: ui-monospace, 'Cascadia Mono', 'JetBrains Mono', monospace;
  font-size: 0.66rem; letter-spacing: 0.12em; text-transform: uppercase;
  color: rgba(217, 229, 220, 0.42);
}
.ba-specs { margin: 0; }
.ba-foot { margin-top: 30px; }
.ba-foot p {
  font-size: 0.75rem; line-height: 1.6; color: rgba(217, 229, 220, 0.4);
  border-top: 1px solid rgba(217, 229, 220, 0.1); padding-top: 14px; margin: 0;
}
.ba-foot code {
  font-family: ui-monospace, monospace; color: rgba(47, 230, 166, 0.75);
}

/* herramientas y capas animadas: transform en unidades del viewBox */
.ba-svg g, .ba-svg circle, .ba-svg line, .ba-svg polygon, .ba-svg path {
  transform-box: fill-box;
  transform-origin: center;
}

/* ══ 01 · LA FORJA ═══════════════════════════════════════════════════════ */
.b1-root { animation: b1-fade 5.8s linear infinite; }
@keyframes b1-fade {
  0% { opacity: 0; }
  1.5%, 94% { opacity: 1; }
  98%, 100% { opacity: 0; }
}
.b1-aro {
  stroke-dasharray: 290;
  animation: b1-aro 5.8s linear infinite;
}
@keyframes b1-aro {
  0%, 2% { stroke-dashoffset: 290; }
  11% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 0; }
}
.b1-pala { animation: b1-pala 5.8s linear infinite; }
@keyframes b1-pala {
  0%, 14% {
    transform: translate(-24px, -118px) rotate(-36deg);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
  }
  15% { opacity: 1; }
  22% {
    transform: translate(0, 2.5px) rotate(1.6deg);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.4, 1);
  }
  26%, 100% { transform: none; opacity: 1; }
}
.b1-machete { animation: b1-machete 5.8s linear infinite; }
@keyframes b1-machete {
  0%, 30% {
    transform: translate(26px, -124px) rotate(42deg);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
  }
  31% { opacity: 1; }
  38% {
    transform: translate(0, 2.5px) rotate(-1.6deg);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.4, 1);
  }
  42%, 100% { transform: none; opacity: 1; }
}
.b1-azadon { animation: b1-azadon 5.8s linear infinite; }
@keyframes b1-azadon {
  0%, 48% {
    transform: translate(116px, -36px) rotate(300deg) scale(0.85);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.3, 0.4, 0.55, 1);
  }
  49.5% { opacity: 1; }
  59% {
    transform: translate(-3px, 0) rotate(-7deg) scale(1);
    animation-timing-function: cubic-bezier(0.25, 0.9, 0.4, 1);
  }
  63%, 100% { transform: none; opacity: 1; }
}
.b1-glow { animation: b1-glow 5.8s ease-in-out infinite; }
@keyframes b1-glow {
  0%, 62% { opacity: 0; }
  66% { opacity: 0.55; }
  73% { opacity: 0.14; }
  80% { opacity: 0.3; }
  87% { opacity: 0.14; }
  94%, 100% { opacity: 0.18; }
}
.b1-onda { animation-duration: 5.8s; animation-timing-function: ease-out; animation-iteration-count: infinite; }
.b1-onda-a { animation-name: b1-onda-a; }
.b1-onda-b { animation-name: b1-onda-b; }
.b1-onda-c { animation-name: b1-onda-c; }
@keyframes b1-onda-a {
  0%, 21.5% { transform: scale(0.25); opacity: 0; }
  23% { opacity: 0.85; }
  32%, 100% { transform: scale(2.3); opacity: 0; }
}
@keyframes b1-onda-b {
  0%, 37.5% { transform: scale(0.25); opacity: 0; }
  39% { opacity: 0.85; }
  48%, 100% { transform: scale(2.3); opacity: 0; }
}
@keyframes b1-onda-c {
  0%, 58.5% { transform: scale(0.25); opacity: 0; }
  60% { opacity: 0.85; }
  69%, 100% { transform: scale(2.3); opacity: 0; }
}
.ba-spark { animation-duration: 5.8s; animation-timing-function: cubic-bezier(0.2, 0.7, 0.4, 1); animation-iteration-count: infinite; }
.b1-sp-a { animation-name: b1-sp-a; }
.b1-sp-b { animation-name: b1-sp-b; }
.b1-sp-c { animation-name: b1-sp-c; }
@keyframes b1-sp-a {
  0%, 22% { transform: none; opacity: 0; }
  23.5% { opacity: 1; }
  31%, 100% { transform: translate(var(--sx), var(--sy)) rotate(var(--sr)); opacity: 0; }
}
@keyframes b1-sp-b {
  0%, 38% { transform: none; opacity: 0; }
  39.5% { opacity: 1; }
  47%, 100% { transform: translate(var(--sx), var(--sy)) rotate(var(--sr)); opacity: 0; }
}
@keyframes b1-sp-c {
  0%, 59% { transform: none; opacity: 0; }
  60.5% { opacity: 1; }
  68%, 100% { transform: translate(var(--sx), var(--sy)) rotate(var(--sr)); opacity: 0; }
}

/* ══ 02 · LA SIMBIOSIS ═══════════════════════════════════════════════════ */
.b2-root { animation: b2-fade 7s linear infinite; }
@keyframes b2-fade {
  0% { opacity: 0; }
  2%, 95% { opacity: 1; }
  99%, 100% { opacity: 0; }
}
.b2-membrana {
  transform-box: view-box;
  transform-origin: 70px 74px;
  animation: b2-membrana 7s ease-in-out infinite;
}
@keyframes b2-membrana {
  0% { transform: scale(0.93); opacity: 0; }
  5% { opacity: 1; }
  6% { transform: scale(1); }
  20% { transform: scale(1.014); }
  34% { transform: scale(1); }
  50% { transform: scale(1.016); }
  66% { transform: scale(1); }
  81% { transform: scale(1.013); }
  95%, 100% { transform: scale(1); opacity: 1; }
}
.b2-poros {
  transform-box: view-box;
  transform-origin: 70px 74px;
  animation: b2-poros 7s linear infinite;
}
@keyframes b2-poros {
  from { transform: rotate(0deg); }
  to { transform: rotate(16deg); }
}
.b2-orb { transform-box: view-box; transform-origin: 70px 74px; }
.b2-orb-pala { animation: b2-orb-pala 7s cubic-bezier(0.22, 0.75, 0.25, 1) infinite; }
@keyframes b2-orb-pala {
  0%, 6% { transform: rotate(-168deg) scale(0.4); opacity: 0; }
  9% { opacity: 1; }
  28%, 100% { transform: rotate(0deg) scale(1); opacity: 1; }
}
.b2-orb-azadon { animation: b2-orb-azadon 7s cubic-bezier(0.22, 0.75, 0.25, 1) infinite; }
@keyframes b2-orb-azadon {
  0%, 20% { transform: rotate(152deg) scale(0.45); opacity: 0; }
  23% { opacity: 1; }
  42%, 100% { transform: rotate(0deg) scale(1); opacity: 1; }
}
.b2-orb-machete { animation: b2-orb-machete 7s cubic-bezier(0.22, 0.75, 0.25, 1) infinite; }
@keyframes b2-orb-machete {
  0%, 33% { transform: rotate(-128deg) scale(0.45); opacity: 0; }
  36% { opacity: 1; }
  54%, 100% { transform: rotate(0deg) scale(1); opacity: 1; }
}
.b2-estela { opacity: 0; }
.b2-estela.b2-orb-pala { animation-name: b2-orb-pala-e; }
.b2-estela.b2-orb-azadon { animation-name: b2-orb-azadon-e; }
.b2-estela.b2-orb-machete { animation-name: b2-orb-machete-e; }
@keyframes b2-orb-pala-e {
  0%, 8% { transform: rotate(-168deg) scale(0.4); opacity: 0; }
  11% { opacity: 0.28; }
  25% { opacity: 0.18; }
  31%, 100% { transform: rotate(0deg) scale(1); opacity: 0; }
}
@keyframes b2-orb-azadon-e {
  0%, 22% { transform: rotate(152deg) scale(0.45); opacity: 0; }
  25% { opacity: 0.28; }
  39% { opacity: 0.18; }
  45%, 100% { transform: rotate(0deg) scale(1); opacity: 0; }
}
@keyframes b2-orb-machete-e {
  0%, 35% { transform: rotate(-128deg) scale(0.45); opacity: 0; }
  38% { opacity: 0.28; }
  51% { opacity: 0.18; }
  57%, 100% { transform: rotate(0deg) scale(1); opacity: 0; }
}
.b2-bloom { animation: b2-bloom 7s ease-in-out infinite; }
@keyframes b2-bloom {
  0%, 53% { opacity: 0; }
  57% { opacity: 0.6; }
  66%, 100% { opacity: 0; }
}
.b2-savia { animation: b2-savia 7s linear infinite; }
@keyframes b2-savia {
  0%, 55% { opacity: 0; stroke-dashoffset: 0; }
  59% { opacity: 0.9; }
  92% { opacity: 0.9; stroke-dashoffset: -128; }
  96%, 100% { opacity: 0; stroke-dashoffset: -136; }
}
.b2-espora { animation-duration: 7s; animation-timing-function: ease-out; animation-iteration-count: infinite; }
.b2-es-a { animation-name: b2-es-a; }
.b2-es-b { animation-name: b2-es-b; }
.b2-es-c { animation-name: b2-es-c; }
@keyframes b2-es-a {
  0%, 58% { transform: none; opacity: 0; }
  61% { opacity: 0.9; }
  74%, 100% { transform: translate(3px, -26px); opacity: 0; }
}
@keyframes b2-es-b {
  0%, 66% { transform: none; opacity: 0; }
  69% { opacity: 0.9; }
  84%, 100% { transform: translate(-4px, -28px); opacity: 0; }
}
@keyframes b2-es-c {
  0%, 74% { transform: none; opacity: 0; }
  77% { opacity: 0.9; }
  92%, 100% { transform: translate(2px, -24px); opacity: 0; }
}

/* ══ 03 · EL MACHETAZO ═══════════════════════════════════════════════════ */
.b3-root { animation: b3-fade 5.2s linear infinite; }
@keyframes b3-fade {
  0% { opacity: 0; }
  1%, 95% { opacity: 1; }
  98.5%, 100% { opacity: 0; }
}
.b3-aro {
  transform-box: view-box;
  transform-origin: 70px 74px;
  animation: b3-aro 5.2s cubic-bezier(0.2, 0.8, 0.3, 1) infinite;
}
@keyframes b3-aro {
  0% { transform: scale(1.32); opacity: 0; }
  5%, 100% { transform: scale(1); opacity: 1; }
}
.b3-grunge {
  transform-box: view-box;
  transform-origin: 70px 74px;
  animation: b3-grunge 5.2s linear infinite;
}
@keyframes b3-grunge {
  0%, 5% { opacity: 0; transform: rotate(-8deg); }
  9%, 100% { opacity: 0.5; transform: rotate(0deg); }
}
.b3-shake { animation: b3-shake 5.2s linear infinite; }
@keyframes b3-shake {
  0%, 12.6% { transform: none; }
  13.1% { transform: translate(-2.6px, 1.6px); }
  13.7% { transform: translate(2.1px, -1.1px); }
  14.3% { transform: translate(-1px, 0.5px); }
  15%, 26.6% { transform: none; }
  27.1% { transform: translate(2.6px, 1.1px); }
  27.7% { transform: translate(-2.1px, -1.1px); }
  28.5%, 40.6% { transform: none; }
  41.1% { transform: translate(-3.1px, 2.1px); }
  41.8% { transform: translate(2.6px, -1.6px); }
  42.5% { transform: translate(-1px, 1px); }
  43.2%, 100% { transform: none; }
}
.b3-pala { animation: b3-pala 5.2s linear infinite; }
@keyframes b3-pala {
  0%, 10% {
    transform: translate(-8px, -138px) rotate(-22deg);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.7, 0, 1, 0.6);
  }
  10.6% { opacity: 1; }
  13% { transform: translate(0, 3px); animation-timing-function: cubic-bezier(0.2, 0.9, 0.4, 1); }
  14.6%, 100% { transform: none; opacity: 1; }
}
.b3-azadon { animation: b3-azadon 5.2s linear infinite; }
@keyframes b3-azadon {
  0%, 24% {
    transform: translate(144px, -8px) rotate(30deg);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.7, 0, 1, 0.6);
  }
  24.6% { opacity: 1; }
  27% { transform: translate(-4px, 0); animation-timing-function: cubic-bezier(0.2, 0.9, 0.4, 1); }
  28.6%, 100% { transform: none; opacity: 1; }
}
.b3-machete { animation: b3-machete 5.2s linear infinite; }
@keyframes b3-machete {
  0%, 38% {
    transform: translate(86px, -120px) rotate(48deg) scale(1.08);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.7, 0, 1, 0.6);
  }
  38.6% { opacity: 1; }
  41% { transform: translate(-2px, 2px); animation-timing-function: cubic-bezier(0.2, 0.9, 0.4, 1); }
  42.6%, 100% { transform: none; opacity: 1; }
}
.b3-streak { animation-duration: 5.2s; animation-timing-function: ease-out; animation-iteration-count: infinite; }
.b3-streak-pala { animation-name: b3-streak-pala; }
.b3-streak-azadon { animation-name: b3-streak-azadon; }
.b3-streak-machete { animation-name: b3-streak-machete; }
@keyframes b3-streak-pala {
  0%, 12.4% { transform: none; opacity: 0; }
  13.4% { opacity: 0.7; }
  18%, 100% { transform: translate(0, 14px); opacity: 0; }
}
@keyframes b3-streak-azadon {
  0%, 26.4% { transform: none; opacity: 0; }
  27.4% { opacity: 0.7; }
  32%, 100% { transform: translate(-16px, 0); opacity: 0; }
}
@keyframes b3-streak-machete {
  0%, 40.4% { transform: none; opacity: 0; }
  41.4% { opacity: 0.8; }
  46.5%, 100% { transform: translate(-8px, 12px); opacity: 0; }
}
.b3-splat { animation-duration: 5.2s; animation-timing-function: cubic-bezier(0.2, 0.9, 0.35, 1); animation-iteration-count: infinite; }
.b3-splat-a { animation-name: b3-splat-a; }
.b3-splat-b { animation-name: b3-splat-b; }
.b3-splat-c { animation-name: b3-splat-c; }
@keyframes b3-splat-a {
  0%, 12.8% { transform: scale(0.3); opacity: 0; }
  14.6%, 100% { transform: scale(1); opacity: 1; }
}
@keyframes b3-splat-b {
  0%, 26.8% { transform: scale(0.3); opacity: 0; }
  28.6%, 100% { transform: scale(1); opacity: 1; }
}
@keyframes b3-splat-c {
  0%, 40.8% { transform: scale(0.3); opacity: 0; }
  42.6%, 100% { transform: scale(1); opacity: 1; }
}
.b3-tools { animation: b3-flicker 5.2s linear infinite; }
@keyframes b3-flicker {
  0%, 61% { opacity: 1; }
  62% { opacity: 0.45; }
  62.8% { opacity: 1; }
  63.6% { opacity: 0.6; }
  64.4%, 100% { opacity: 1; }
}

/* ══ reduced motion: la Ⓐ ensamblada, quieta y digna ═════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .ba-svg, .ba-svg * { animation: none !important; }
  .b1-aro { stroke-dashoffset: 0; }
  .b1-glow { opacity: 0.16; }
  .b2-savia { opacity: 0.5; }
  .b3-grunge { opacity: 0.5; }
}

/* móvil: demo un poco más chica para que quepan las tarjetas */
@media (max-width: 420px) {
  .ba-fab.ba-fab-demo { width: 176px; height: 176px; }
  .ba-frame { padding: 14px 14px 40px; }
}
`;
