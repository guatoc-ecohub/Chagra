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
 * Cuatro variantes lado a lado, cada una con un lenguaje de animación distinto:
 *   01 LA FORJA             — caída con gravedad, rebote, chispas y neón.
 *   02 LA SIMBIOSIS         — las herramientas brotan en espiral; savia + esporas.
 *   03 EL MACHETAZO         — esténcil callejero: golpes secos, salpicadura, flicker.
 *   04 EL MACHETAZO FORJADO — los golpes del 03 con la paleta neón rojo/ámbar del 01.
 *
 * Técnica: SVG + CSS puro (cero deps, cero fotos). Solo transform / opacity /
 * stroke-dashoffset (GPU-friendly, sin filter animado). La A la forman SOLO
 * las herramientas — no hay ninguna A dibujada aparte (ni trazo, ni glow, ni
 * savia sobre los ejes): quitarla fue decisión del operador (v2, 2026-07-09).
 *
 * v3 (2026-07-09): FIX X→A. El bug: la regla blanket `transform-box: fill-box;
 * transform-origin: center` (necesaria para las animaciones) también aplicaba
 * al atributo `transform` de los grupos de POSICIÓN de cada herramienta (en
 * SVG2 el atributo mapea a la propiedad CSS), así que `rotate(±21)` pivotaba
 * sobre el CENTRO del propio bbox de la herramienta y no sobre el ápice tras
 * el translate: la parte de arriba de cada diagonal se abría hacia afuera y
 * las dos se CRUZABAN a media altura → se leía X/tijera, no A. El fix es la
 * clase `.ba-tool` (transform-box: view-box + origin 0 0 = semántica SVG
 * nativa): las diagonales convergen en el ápice y divergen hacia abajo sin
 * cruzarse. La sección "antes (X) / ahora (A)" conserva el render viejo
 * (`.ba-legacy` re-aplica el pivote roto) para comparar lado a lado.
 * Además: variante 04 = el gesto de El Machetazo con los colores de La Forja.
 * Cada ciclo termina con un HOLD de ~2 s+ con la Ⓐ armada, quieta y legible,
 * y recién ahí reinicia. `prefers-reduced-motion` apaga todo y deja la Ⓐ
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

// PALA (diagonal izquierda). Local: empuñadura D (estribo abierto) arriba,
// mango a (0,78), hoja puntuda hasta (0,111). Colocada: vértice (68.5,13),
// 18° → punta ~(34,118). La empuñadura asoma por fuera del aro (vértice Ⓐ).
const PALA_POS = 'translate(70 11) rotate(21)';
const PALA_GRIP = 'M -7 13 L -7 6 A 7 7 0 0 1 7 6 L 7 13';
const PALA_SHAFT = 'M 0 11 L 0 78';
const PALA_BLADE = 'M -8.5 74 C -10 87 -5.5 99 0 111 C 5.5 99 10 87 8.5 74 C 3.5 78 -3.5 78 -8.5 74 Z';

// MACHETE (diagonal derecha). Local: pomo/mango (0,2)-(0,26), guarda, hoja
// que se ensancha con lomo recto y filo curvo hasta la punta (13.5,~96).
// Colocado: el pomo casi TOCA la empuñadura de la pala en el vértice (72,15)
// — las dos diagonales convergen arriba y la A se lee sin duda — −19.5° →
// punta ~(112,105).
const MACHETE_POS = 'translate(70 11) rotate(-21)';
const MACHETE_HANDLE = 'M 0 2 L 0 26';
const MACHETE_GUARD = 'M -6 27 L 7 27';
const MACHETE_BLADE = 'M -3.5 29 L -3.5 78 Q -3.5 90 8 99 L 13.5 92.5 Q 6.5 86 6 73 L 6 29 Z';
const MACHETE_FILO = 'M 8 99 L 13.5 92.5';

// AZADÓN (travesaño). Local horizontal: mango (8,0)-(100,0); en el extremo
// izquierdo el cuello dobla hacia abajo y remata en la hoja perpendicular,
// pequeña y pegada al mango. Colocado en (22,88): el mango sobresale del aro
// por ambos lados y la cabeza queda abajo-izquierda (contrapeso del machete).
const AZADON_POS = 'translate(40 82)';
const AZADON_HANDLE = 'M 8 0 L 58 0';
const AZADON_NECK = 'M 12 -1 C 4 0 0 3 -1 9';
const AZADON_BLADE = 'M -6 7 L 4 8.5 L 5.5 22 L -10 19 Z';

// ─────────────────────────────────────────────────────────────────────────────
// Herramientas por variante — mismos trazos, tres pieles:
//   neon    → trazo rojo marca + relleno vino profundo (biopunk actual)
//   bio     → trazo verde-menta bioluminiscente, filos claros, acento rojo
//   stencil → SIN trazos: masas hueso planas, como plantilla de aerosol
// ─────────────────────────────────────────────────────────────────────────────

function Pala({ skin }) {
  if (skin === 'stencil') {
    return (
      <g className="ba-tool" transform={PALA_POS}>
        <path d={PALA_GRIP} fill="none" stroke="#ece3cf" strokeWidth="8.5" strokeLinecap="round" />
        <path d={PALA_SHAFT} fill="none" stroke="#ece3cf" strokeWidth="10.5" strokeLinecap="round" />
        <path d={PALA_BLADE} fill="#ece3cf" />
      </g>
    );
  }
  const c = skin === 'bio'
    ? { line: '#35e0a1', hi: '#8fffd2', fill: '#11382a' }
    : { line: '#e8402e', hi: '#ff6b57', fill: '#571106' };
  return (
    <g className="ba-tool" transform={PALA_POS}>
      <path d={PALA_GRIP} fill="none" stroke={c.line} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d={PALA_SHAFT} fill="none" stroke={c.line} strokeWidth="8.5" strokeLinecap="round" />
      <path d={PALA_BLADE} fill={c.fill} stroke={c.hi} strokeWidth="3.4" strokeLinejoin="round" />
    </g>
  );
}

function Machete({ skin }) {
  if (skin === 'stencil') {
    return (
      <g className="ba-tool" transform={MACHETE_POS}>
        <path d={MACHETE_HANDLE} fill="none" stroke="#ece3cf" strokeWidth="10.5" strokeLinecap="round" />
        <path d={MACHETE_GUARD} fill="none" stroke="#ece3cf" strokeWidth="6.5" strokeLinecap="round" />
        <path d={MACHETE_BLADE} fill="#ece3cf" />
      </g>
    );
  }
  const c = skin === 'bio'
    ? { line: '#35e0a1', hi: '#8fffd2', fill: '#11382a', filo: '#ff5f4d' }
    : { line: '#e8402e', hi: '#ff6b57', fill: '#571106', filo: '#ff6b57' };
  return (
    <g className="ba-tool" transform={MACHETE_POS}>
      <path d={MACHETE_HANDLE} fill="none" stroke={c.line} strokeWidth="8.5" strokeLinecap="round" />
      <path d={MACHETE_GUARD} fill="none" stroke={c.line} strokeWidth="5" strokeLinecap="round" />
      <path d={MACHETE_BLADE} fill={c.fill} stroke={c.hi} strokeWidth="3.2" strokeLinejoin="round" />
      {/* filo — la línea de vida del machete */}
      <path d={MACHETE_FILO} fill="none" stroke={c.filo} strokeWidth="3.2" strokeLinecap="round" />
    </g>
  );
}

function Azadon({ skin }) {
  if (skin === 'stencil') {
    return (
      <g className="ba-tool" transform={AZADON_POS}>
        <path d={AZADON_HANDLE} fill="none" stroke="#ece3cf" strokeWidth="10.5" strokeLinecap="round" />
        <path d={AZADON_NECK} fill="none" stroke="#ece3cf" strokeWidth="7" strokeLinecap="round" />
        <path d={AZADON_BLADE} fill="#ece3cf" />
      </g>
    );
  }
  const c = skin === 'bio'
    ? { line: '#35e0a1', hi: '#8fffd2', fill: '#11382a' }
    : { line: '#e8402e', hi: '#ff6b57', fill: '#571106' };
  return (
    <g className="ba-tool" transform={AZADON_POS}>
      <path d={AZADON_HANDLE} fill="none" stroke={c.line} strokeWidth="8.5" strokeLinecap="round" />
      <path d={AZADON_NECK} fill="none" stroke={c.line} strokeWidth="5" strokeLinecap="round" />
      <path d={AZADON_BLADE} fill={c.fill} stroke={c.hi} strokeWidth="3.2" strokeLinejoin="round" />
    </g>
  );
}

/** Chispas de impacto: rayitas que salen despedidas desde (x,y). */
function Chispas({ x, y, kf, color = '#ffb03a' }) {
  const dirs = [
    { sx: '-20px', sy: '-15px', r: -50 },
    { sx: '18px', sy: '-19px', r: 40 },
    { sx: '-16px', sy: '9px', r: -100 },
    { sx: '22px', sy: '7px', r: 95 },
  ];
  return (
    <g>
      {dirs.map((d, i) => (
        <line
          key={i}
          className={`ba-spark ${kf}`}
          x1={x} y1={y} x2={x} y2={y - 10}
          stroke={color} strokeWidth="2.8" strokeLinecap="round"
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

      {/* la A la arman SOLO las herramientas — sin trazos de A dibujados aparte */}
      {/* herramientas: caen en orden pala → machete → azadón */}
      <g className="b1-pala"><Pala skin="neon" /></g>
      <g className="b1-machete"><Machete skin="neon" /></g>
      <g className="b1-azadon"><Azadon skin="neon" /></g>

      {/* ondas + chispas de cada aterrizaje */}
      <circle className="b1-onda b1-onda-a" cx="36" cy="114" r="9" fill="none" stroke="#ffb03a" strokeWidth="2.4" opacity="0" />
      <circle className="b1-onda b1-onda-b" cx="112" cy="103" r="9" fill="none" stroke="#ffb03a" strokeWidth="2.4" opacity="0" />
      <circle className="b1-onda b1-onda-c" cx="70" cy="88" r="9" fill="none" stroke="#ffb03a" strokeWidth="2.4" opacity="0" />
      <Chispas x={36} y={114} kf="b1-sp-a" />
      <Chispas x={112} y={103} kf="b1-sp-b" />
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

      {/* estelas fantasma (mismo brote, desfasado y tenue) */}
      <g className="b2-orb b2-orb-pala b2-estela"><Pala skin="bio" /></g>
      <g className="b2-orb b2-orb-azadon b2-estela"><Azadon skin="bio" /></g>
      <g className="b2-orb b2-orb-machete b2-estela"><Machete skin="bio" /></g>

      {/* herramientas: brotan en espiral pala → azadón → machete */}
      <g className="b2-orb b2-orb-pala"><Pala skin="bio" /></g>
      <g className="b2-orb b2-orb-azadon"><Azadon skin="bio" /></g>
      <g className="b2-orb b2-orb-machete"><Machete skin="bio" /></g>

      {/* esporas que se desprenden de la Ⓐ viva (celebración breve, luego calma) */}
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
        <polygon className="b3-streak b3-streak-pala" points="60,-28 69,-30 72,48 66,49" fill="#ece3cf" opacity="0" />
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
// VARIANTE 04 — EL MACHETAZO FORJADO (los golpes del 03, los colores del 01)
// Reusa TODOS los keyframes b3-* (shake, golpes, estelas, splats, flicker):
// solo cambia la piel — aro rojo marca, herramientas neón, salpicadura ámbar
// como chispa de fragua.
// ─────────────────────────────────────────────────────────────────────────────
function FabMachetazoForjado() {
  return (
    <svg viewBox="0 0 140 140" className="ba-svg b3-root" aria-hidden="true">
      <circle cx="70" cy="74" r="46" fill="#150907" />
      <g className="b3-shake">
        {/* aro estampado, pero en el neón de La Forja */}
        <g className="b3-aro">
          <circle cx="70" cy="74" r="46" fill="none" stroke="#c93b2a" strokeWidth="8" />
          <circle cx="70" cy="74" r="46" fill="none" stroke="#ff6b57" strokeWidth="1.4" opacity="0.35" />
          <circle
            className="b3-grunge" cx="70" cy="74" r="41" fill="none"
            stroke="#ffb03a" strokeWidth="1.6" strokeDasharray="18 26 7 40 24 14" opacity="0.5"
          />
        </g>

        {/* la Ⓐ neón estampada a golpes */}
        <g className="b3-tools">
          <g className="b3-pala"><Pala skin="neon" /></g>
          <g className="b3-azadon"><Azadon skin="neon" /></g>
          <g className="b3-machete"><Machete skin="neon" /></g>
        </g>

        {/* estelas de velocidad, encendidas */}
        <polygon className="b3-streak b3-streak-pala" points="60,-28 69,-30 72,48 66,49" fill="#ff6b57" opacity="0" />
        <g className="b3-streak b3-streak-azadon" stroke="#ff6b57" strokeWidth="3" strokeLinecap="round" opacity="0">
          <line x1="78" y1="82" x2="130" y2="80" />
          <line x1="86" y1="94" x2="132" y2="93" />
        </g>
        <polygon className="b3-streak b3-streak-machete" points="86,6 92,1 122,110 114,112" fill="#ff6b57" opacity="0" />

        {/* salpicaduras ÁMBAR — chispas de fragua que quedan de recuerdo */}
        <g className="b3-splat b3-splat-a" fill="#ffb03a">
          <circle cx="34" cy="118" r="3.2" />
          <circle cx="26" cy="110" r="1.8" />
          <circle cx="43" cy="126" r="1.4" />
          <circle cx="21" cy="121" r="1.1" />
        </g>
        <g className="b3-splat b3-splat-b" fill="#ffb03a">
          <circle cx="122" cy="84" r="2.8" />
          <circle cx="128" cy="94" r="1.6" />
          <circle cx="117" cy="76" r="1.2" />
        </g>
        <g className="b3-splat b3-splat-c" fill="#ffb03a">
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
          <p className="ba-eyebrow">FAB del agente · reemplazo del botón Ⓐ · 4 variantes · X→A arreglada</p>
          <h1 className="ba-title">
            Ⓐ de anarquía.<br />Ⓐ de agricultura.
          </h1>
          <p className="ba-sub">
            Tres herramientas caen y se ensamblan: la <b>pala</b> es una diagonal, el{' '}
            <b>azadón</b> el travesaño y el <b>machete</b> completa la A — la A la
            forman <b>solo las herramientas</b>, sin ningún trazo dibujado encima. El
            aro de la propia Ⓐ hace de borde del botón, y al final de cada ciclo la Ⓐ
            armada se queda quieta ~2 s antes de volver a armarse.
          </p>
          <p className="ba-hint">Toca cualquier botón para repetir el ensamble.</p>
        </header>

        <main className="ba-grid">
          <VarianteCard
            num="01"
            nombre="La Forja"
            lema="cae con peso, golpea, se queda"
            desc="El aro se traza solo, como marcado a soplete. Cada herramienta cae con gravedad y rebota al clavarse — onda y chispas en cada golpe. Con el azadón puesto, la Ⓐ de herramientas queda armada, quieta y legible casi 3 segundos."
            specs="loop 7.2 s · hold ~2.8 s con la A armada · trazo neón · chispas ámbar"
          >
            <FabForja />
          </VarianteCard>

          <VarianteCard
            num="02"
            nombre="La Simbiosis"
            lema="brota en espiral, suelta esporas"
            desc="El aro es una membrana viva que respira. Las herramientas no caen: brotan girando en espiral como zarcillos que buscan su lugar. Al ensamblarse suelta unas esporas que flotan hacia arriba y la Ⓐ queda quieta 2 segundos."
            specs="loop 8 s · hold ~2 s con la A armada · bioluminiscencia verde-menta"
          >
            <FabSimbiosis />
          </VarianteCard>

          <VarianteCard
            num="03"
            nombre="El Machetazo"
            lema="tres golpes secos y salpicadura"
            desc="Esténcil de aerosol sobre el muro: el aro se estampa, la pala se CLAVA, el azadón entra de hachazo y el machete corta al final — el botón entero se sacude con cada golpe y la pintura salpica. Un parpadeo de neón roto y la Ⓐ queda estampada, quieta, más de 2 segundos."
            specs="loop 6 s · hold ~2.3 s con la A armada · esténcil hueso + salpicadura roja"
          >
            <FabMachetazo />
          </VarianteCard>

          <VarianteCard
            num="04"
            nombre="El Machetazo Forjado"
            lema="los golpes del 03, el neón del 01"
            desc="El mismo esténcil de tres golpes secos de El Machetazo — la pala se CLAVA, el azadón entra de hachazo, el machete corta y el botón se sacude salpicando — pero vestido con la piel de La Forja: aro rojo marca, herramientas neón encendidas y salpicadura ámbar como chispa de fragua."
            specs="loop 6 s · hold ~2.3 s con la A armada · golpes del 03 + paleta neón rojo/ámbar del 01"
          >
            <FabMachetazoForjado />
          </VarianteCard>
        </main>

        <section className="ba-compare" aria-label="Antes y ahora del arreglo de la A">
          <h2 className="ba-compare-title">antes (X) → ahora (A)</h2>
          <p className="ba-compare-sub">
            El render viejo giraba cada herramienta sobre su propio centro: las
            empuñaduras sobresalían por encima del punto de encuentro y las dos
            diagonales se <b>cruzaban</b> a media altura — se leía X de tijera.
            Ahora pala y machete pivotan sobre el <b>ápice</b>: se tocan arriba,
            divergen hacia abajo sin cruzarse y el azadón queda de travesaño —
            se lee A.
          </p>
          <div className="ba-compare-grid">
            {[
              { nombre: '01 · La Forja', Fab: FabForja },
              { nombre: '02 · La Simbiosis', Fab: FabSimbiosis },
              { nombre: '03 · El Machetazo', Fab: FabMachetazo },
            ].map((v) => (
              <div className="ba-compare-col" key={v.nombre}>
                <span className="ba-compare-name">{v.nombre}</span>
                <div className="ba-compare-pair">
                  <figure className="ba-compare-cell ba-legacy">
                    <span className="ba-fab" style={{ width: 108, height: 108 }}><v.Fab /></span>
                    <figcaption>antes (X)</figcaption>
                  </figure>
                  <figure className="ba-compare-cell">
                    <span className="ba-fab" style={{ width: 108, height: 108 }}><v.Fab /></span>
                    <figcaption>ahora (A)</figcaption>
                  </figure>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="ba-foot">
          <p>
            SVG + CSS puro (transform/opacity, cero filtros animados, cero deps) ·{' '}
            con <code>prefers-reduced-motion</code> la Ⓐ queda ensamblada y quieta ·{' '}
            misma geometría en las cuatro — solo cambia la piel y el gesto.
          </p>
        </footer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS — todo el movimiento vive aquí. Convención: b1-* Forja, b2-* Simbiosis,
// b3-* Machetazo, ba-* página. Cada ciclo es UNA animación infinita por
// elemento con fases en porcentajes (ensamble → HOLD ~2 s+ con la A armada y
// quieta → fundido → reset).
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
  overflow: hidden; /* las herramientas "entran" a escena, no vuelan sobre el texto */
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
  overflow: hidden;
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

/* ══ comparación antes (X) / ahora (A) ═══════════════════════════════════ */
.ba-compare {
  margin-top: 34px; padding: 18px 18px 16px;
  border: 1px solid rgba(217, 229, 220, 0.12); border-radius: 18px;
  background: rgba(255, 255, 255, 0.02);
}
.ba-compare-title {
  margin: 0 0 8px; font-size: 1.15rem; font-weight: 800;
  letter-spacing: 0.05em; text-transform: uppercase; color: #f2f7f3;
}
.ba-compare-sub {
  margin: 0 0 16px; font-size: 0.86rem; line-height: 1.5;
  color: rgba(217, 229, 220, 0.72); max-width: 780px;
}
.ba-compare-sub b { color: #f2f7f3; }
.ba-compare-grid {
  display: grid; gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
}
.ba-compare-col { display: flex; flex-direction: column; gap: 8px; }
.ba-compare-name {
  font-family: ui-monospace, 'Cascadia Mono', 'JetBrains Mono', monospace;
  font-size: 0.68rem; letter-spacing: 0.14em; text-transform: uppercase;
  color: rgba(217, 229, 220, 0.55);
}
.ba-compare-pair { display: flex; gap: 12px; }
.ba-compare-cell {
  margin: 0; flex: 1; display: flex; flex-direction: column;
  align-items: center; gap: 8px; padding: 14px 8px 10px;
  border-radius: 12px; background: rgba(0, 0, 0, 0.32); overflow: hidden;
}
.ba-compare-cell figcaption {
  font-family: ui-monospace, 'Cascadia Mono', 'JetBrains Mono', monospace;
  font-size: 0.64rem; letter-spacing: 0.12em; text-transform: uppercase;
  color: #2fe6a6;
}
.ba-compare-cell.ba-legacy figcaption { color: #ff6b57; }

/* herramientas y capas animadas: transform en unidades del viewBox */
.ba-svg g, .ba-svg circle, .ba-svg line, .ba-svg polygon, .ba-svg path {
  transform-box: fill-box;
  transform-origin: center;
}
/* las capas que giran alrededor del CENTRO del botón (órbitas de la
   Simbiosis, estampado y poros) pivotan sobre el viewBox, no sobre su bbox.
   Especificidad .ba-svg + clase para ganarle a la regla blanket de arriba. */
.ba-svg .b2-orb, .ba-svg .b2-membrana, .ba-svg .b2-poros,
.ba-svg .b3-aro, .ba-svg .b3-grunge {
  transform-box: view-box;
  transform-origin: 70px 74px;
}
/* FIX X→A: los grupos de POSICIÓN de cada herramienta (atributo transform =
   translate al ápice + rotate) deben pivotar sobre el ORIGEN LOCAL tras el
   translate (semántica SVG nativa), no sobre el centro de su bbox. Con la
   regla blanket de arriba, rotate(±21) giraba cada diagonal sobre su propio
   centro: las empuñaduras se abrían hacia afuera por ENCIMA del punto de
   encuentro y las dos diagonales se CRUZABAN → X. Con view-box + origin 0 0
   convergen en el ápice y divergen hacia abajo sin cruzarse → A. */
.ba-svg .ba-tool {
  transform-box: view-box;
  transform-origin: 0 0;
}
/* "antes (X)": re-aplica el pivote roto SOLO dentro de la sección de
   comparación, para que el operador vea el render viejo junto al nuevo. */
.ba-legacy .ba-svg .ba-tool {
  transform-box: fill-box;
  transform-origin: center;
}

/* ══ 01 · LA FORJA ═══════════════════════════════════════════════════════
   7.2 s: ensamble 0–4.0 s → HOLD con la A armada y quieta 4.0–6.8 s (~2.8 s)
   → fundido y reset. Mismos tiempos absolutos de caída que la v1 (5.8 s). */
.b1-root { animation: b1-fade 7.2s linear infinite; }
@keyframes b1-fade {
  0% { opacity: 0; }
  1.2%, 94.5% { opacity: 1; }
  98%, 100% { opacity: 0; }
}
.b1-aro {
  stroke-dasharray: 290;
  animation: b1-aro 7.2s linear infinite;
}
@keyframes b1-aro {
  0%, 1.6% { stroke-dashoffset: 290; }
  8.9% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 0; }
}
.b1-pala { animation: b1-pala 7.2s linear infinite; }
@keyframes b1-pala {
  0%, 11.3% {
    transform: translate(-24px, -118px) rotate(-36deg);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
  }
  12.1% { opacity: 1; }
  17.7% {
    transform: translate(0, 2.5px) rotate(1.6deg);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.4, 1);
  }
  21%, 100% { transform: none; opacity: 1; }
}
.b1-machete { animation: b1-machete 7.2s linear infinite; }
@keyframes b1-machete {
  0%, 24.2% {
    transform: translate(26px, -124px) rotate(42deg);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
  }
  25% { opacity: 1; }
  30.6% {
    transform: translate(0, 2.5px) rotate(-1.6deg);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.4, 1);
  }
  33.8%, 100% { transform: none; opacity: 1; }
}
.b1-azadon { animation: b1-azadon 7.2s linear infinite; }
@keyframes b1-azadon {
  0%, 38.7% {
    transform: translate(116px, -36px) rotate(300deg) scale(0.85);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.3, 0.4, 0.55, 1);
  }
  39.9% { opacity: 1; }
  47.5% {
    transform: translate(-3px, 0) rotate(-7deg) scale(1);
    animation-timing-function: cubic-bezier(0.25, 0.9, 0.4, 1);
  }
  50.8%, 100% { transform: none; opacity: 1; }
}
.b1-onda { animation-duration: 7.2s; animation-timing-function: ease-out; animation-iteration-count: infinite; }
.b1-onda-a { animation-name: b1-onda-a; }
.b1-onda-b { animation-name: b1-onda-b; }
.b1-onda-c { animation-name: b1-onda-c; }
@keyframes b1-onda-a {
  0%, 17.3% { transform: scale(0.25); opacity: 0; }
  18.5% { opacity: 0.85; }
  25.8%, 100% { transform: scale(2.3); opacity: 0; }
}
@keyframes b1-onda-b {
  0%, 30.2% { transform: scale(0.25); opacity: 0; }
  31.4% { opacity: 0.85; }
  38.7%, 100% { transform: scale(2.3); opacity: 0; }
}
@keyframes b1-onda-c {
  0%, 47.1% { transform: scale(0.25); opacity: 0; }
  48.3% { opacity: 0.85; }
  55.6%, 100% { transform: scale(2.3); opacity: 0; }
}
.ba-spark { animation-duration: 7.2s; animation-timing-function: cubic-bezier(0.2, 0.7, 0.4, 1); animation-iteration-count: infinite; }
.b1-sp-a { animation-name: b1-sp-a; }
.b1-sp-b { animation-name: b1-sp-b; }
.b1-sp-c { animation-name: b1-sp-c; }
@keyframes b1-sp-a {
  0%, 17.7% { transform: none; opacity: 0; }
  18.9% { opacity: 1; }
  25%, 100% { transform: translate(var(--sx), var(--sy)) rotate(var(--sr)); opacity: 0; }
}
@keyframes b1-sp-b {
  0%, 30.6% { transform: none; opacity: 0; }
  31.8% { opacity: 1; }
  37.9%, 100% { transform: translate(var(--sx), var(--sy)) rotate(var(--sr)); opacity: 0; }
}
@keyframes b1-sp-c {
  0%, 47.5% { transform: none; opacity: 0; }
  48.7% { opacity: 1; }
  54.8%, 100% { transform: translate(var(--sx), var(--sy)) rotate(var(--sr)); opacity: 0; }
}

/* ══ 02 · LA SIMBIOSIS ═══════════════════════════════════════════════════
   8 s: brote 0–3.8 s → esporas 3.9–5.6 s → HOLD con la A quieta 5.6–7.6 s
   (~2 s; la membrana deja de respirar y los poros de girar) → reset. */
.b2-root { animation: b2-fade 8s linear infinite; }
@keyframes b2-fade {
  0% { opacity: 0; }
  1.8%, 95% { opacity: 1; }
  99%, 100% { opacity: 0; }
}
.b2-membrana {
  transform-box: view-box;
  transform-origin: 70px 74px;
  animation: b2-membrana 8s ease-in-out infinite;
}
@keyframes b2-membrana {
  0% { transform: scale(0.93); opacity: 0; }
  4.4% { opacity: 1; }
  5.3% { transform: scale(1); }
  17.5% { transform: scale(1.014); }
  30% { transform: scale(1); }
  44% { transform: scale(1.016); }
  58% { transform: scale(1); }
  66%, 100% { transform: scale(1); opacity: 1; }
}
.b2-poros {
  transform-box: view-box;
  transform-origin: 70px 74px;
  animation: b2-poros 8s linear infinite;
}
@keyframes b2-poros {
  0% { transform: rotate(0deg); }
  66%, 100% { transform: rotate(16deg); }
}
.b2-orb { transform-box: view-box; transform-origin: 70px 74px; }
.b2-orb-pala { animation: b2-orb-pala 8s cubic-bezier(0.22, 0.75, 0.25, 1) infinite; }
@keyframes b2-orb-pala {
  0%, 5.3% { transform: rotate(-168deg) scale(0.4); opacity: 0; }
  7.9% { opacity: 1; }
  24.5%, 100% { transform: rotate(0deg) scale(1); opacity: 1; }
}
.b2-orb-azadon { animation: b2-orb-azadon 8s cubic-bezier(0.22, 0.75, 0.25, 1) infinite; }
@keyframes b2-orb-azadon {
  0%, 17.5% { transform: rotate(152deg) scale(0.45); opacity: 0; }
  20.1% { opacity: 1; }
  36.8%, 100% { transform: rotate(0deg) scale(1); opacity: 1; }
}
.b2-orb-machete { animation: b2-orb-machete 8s cubic-bezier(0.22, 0.75, 0.25, 1) infinite; }
@keyframes b2-orb-machete {
  0%, 28.9% { transform: rotate(-128deg) scale(0.45); opacity: 0; }
  31.5% { opacity: 1; }
  47.3%, 100% { transform: rotate(0deg) scale(1); opacity: 1; }
}
.b2-estela { opacity: 0; }
.b2-estela.b2-orb-pala { animation-name: b2-orb-pala-e; }
.b2-estela.b2-orb-azadon { animation-name: b2-orb-azadon-e; }
.b2-estela.b2-orb-machete { animation-name: b2-orb-machete-e; }
@keyframes b2-orb-pala-e {
  0%, 7% { transform: rotate(-168deg) scale(0.4); opacity: 0; }
  9.6% { opacity: 0.28; }
  21.9% { opacity: 0.18; }
  27.1%, 100% { transform: rotate(0deg) scale(1); opacity: 0; }
}
@keyframes b2-orb-azadon-e {
  0%, 19.3% { transform: rotate(152deg) scale(0.45); opacity: 0; }
  21.9% { opacity: 0.28; }
  34.1% { opacity: 0.18; }
  39.4%, 100% { transform: rotate(0deg) scale(1); opacity: 0; }
}
@keyframes b2-orb-machete-e {
  0%, 30.6% { transform: rotate(-128deg) scale(0.45); opacity: 0; }
  33.3% { opacity: 0.28; }
  44.6% { opacity: 0.18; }
  49.9%, 100% { transform: rotate(0deg) scale(1); opacity: 0; }
}
.b2-espora { animation-duration: 8s; animation-timing-function: ease-out; animation-iteration-count: infinite; }
.b2-es-a { animation-name: b2-es-a; }
.b2-es-b { animation-name: b2-es-b; }
.b2-es-c { animation-name: b2-es-c; }
@keyframes b2-es-a {
  0%, 49% { transform: none; opacity: 0; }
  52% { opacity: 0.9; }
  63%, 100% { transform: translate(3px, -26px); opacity: 0; }
}
@keyframes b2-es-b {
  0%, 52% { transform: none; opacity: 0; }
  55% { opacity: 0.9; }
  66%, 100% { transform: translate(-4px, -28px); opacity: 0; }
}
@keyframes b2-es-c {
  0%, 55% { transform: none; opacity: 0; }
  58% { opacity: 0.9; }
  70%, 100% { transform: translate(2px, -24px); opacity: 0; }
}

/* ══ 03 · EL MACHETAZO ═══════════════════════════════════════════════════
   6 s: golpes 0–2.25 s → flicker 3.2–3.35 s → HOLD con la A estampada y
   quieta 3.35–5.64 s (~2.3 s) → reset. */
.b3-root { animation: b3-fade 6s linear infinite; }
@keyframes b3-fade {
  0% { opacity: 0; }
  0.9%, 94% { opacity: 1; }
  98%, 100% { opacity: 0; }
}
.b3-aro {
  transform-box: view-box;
  transform-origin: 70px 74px;
  animation: b3-aro 6s cubic-bezier(0.2, 0.8, 0.3, 1) infinite;
}
@keyframes b3-aro {
  0% { transform: scale(1.32); opacity: 0; }
  4.3%, 100% { transform: scale(1); opacity: 1; }
}
.b3-grunge {
  transform-box: view-box;
  transform-origin: 70px 74px;
  animation: b3-grunge 6s linear infinite;
}
@keyframes b3-grunge {
  0%, 4.3% { opacity: 0; transform: rotate(-8deg); }
  7.8%, 100% { opacity: 0.5; transform: rotate(0deg); }
}
.b3-shake { animation: b3-shake 6s linear infinite; }
@keyframes b3-shake {
  0%, 10.9% { transform: none; }
  11.4% { transform: translate(-2.6px, 1.6px); }
  11.9% { transform: translate(2.1px, -1.1px); }
  12.4% { transform: translate(-1px, 0.5px); }
  13%, 23.1% { transform: none; }
  23.5% { transform: translate(2.6px, 1.1px); }
  24% { transform: translate(-2.1px, -1.1px); }
  24.7%, 35.2% { transform: none; }
  35.6% { transform: translate(-3.1px, 2.1px); }
  36.2% { transform: translate(2.6px, -1.6px); }
  36.8% { transform: translate(-1px, 1px); }
  37.4%, 100% { transform: none; }
}
.b3-pala { animation: b3-pala 6s linear infinite; }
@keyframes b3-pala {
  0%, 8.7% {
    transform: translate(-8px, -138px) rotate(-22deg);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.7, 0, 1, 0.6);
  }
  9.2% { opacity: 1; }
  11.3% { transform: translate(0, 3px); animation-timing-function: cubic-bezier(0.2, 0.9, 0.4, 1); }
  12.7%, 100% { transform: none; opacity: 1; }
}
.b3-azadon { animation: b3-azadon 6s linear infinite; }
@keyframes b3-azadon {
  0%, 20.8% {
    transform: translate(144px, -8px) rotate(30deg);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.7, 0, 1, 0.6);
  }
  21.3% { opacity: 1; }
  23.4% { transform: translate(-4px, 0); animation-timing-function: cubic-bezier(0.2, 0.9, 0.4, 1); }
  24.8%, 100% { transform: none; opacity: 1; }
}
.b3-machete { animation: b3-machete 6s linear infinite; }
@keyframes b3-machete {
  0%, 32.9% {
    transform: translate(86px, -120px) rotate(48deg) scale(1.08);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.7, 0, 1, 0.6);
  }
  33.5% { opacity: 1; }
  35.5% { transform: translate(-2px, 2px); animation-timing-function: cubic-bezier(0.2, 0.9, 0.4, 1); }
  36.9%, 100% { transform: none; opacity: 1; }
}
.b3-streak { animation-duration: 6s; animation-timing-function: ease-out; animation-iteration-count: infinite; }
.b3-streak-pala { animation-name: b3-streak-pala; }
.b3-streak-azadon { animation-name: b3-streak-azadon; }
.b3-streak-machete { animation-name: b3-streak-machete; }
@keyframes b3-streak-pala {
  0%, 10.8% { transform: none; opacity: 0; }
  11.6% { opacity: 0.7; }
  15.6%, 100% { transform: translate(0, 14px); opacity: 0; }
}
@keyframes b3-streak-azadon {
  0%, 22.9% { transform: none; opacity: 0; }
  23.8% { opacity: 0.7; }
  27.7%, 100% { transform: translate(-16px, 0); opacity: 0; }
}
@keyframes b3-streak-machete {
  0%, 35% { transform: none; opacity: 0; }
  35.9% { opacity: 0.8; }
  40.3%, 100% { transform: translate(-8px, 12px); opacity: 0; }
}
.b3-splat { animation-duration: 6s; animation-timing-function: cubic-bezier(0.2, 0.9, 0.35, 1); animation-iteration-count: infinite; }
.b3-splat-a { animation-name: b3-splat-a; }
.b3-splat-b { animation-name: b3-splat-b; }
.b3-splat-c { animation-name: b3-splat-c; }
@keyframes b3-splat-a {
  0%, 11.1% { transform: scale(0.3); opacity: 0; }
  12.7%, 100% { transform: scale(1); opacity: 1; }
}
@keyframes b3-splat-b {
  0%, 23.2% { transform: scale(0.3); opacity: 0; }
  24.8%, 100% { transform: scale(1); opacity: 1; }
}
@keyframes b3-splat-c {
  0%, 35.4% { transform: scale(0.3); opacity: 0; }
  36.9%, 100% { transform: scale(1); opacity: 1; }
}
.b3-tools { animation: b3-flicker 6s linear infinite; }
@keyframes b3-flicker {
  0%, 52.9% { opacity: 1; }
  53.7% { opacity: 0.45; }
  54.4% { opacity: 1; }
  55.1% { opacity: 0.6; }
  55.8%, 100% { opacity: 1; }
}

/* ══ reduced motion: la Ⓐ ensamblada, quieta y digna ═════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .ba-svg, .ba-svg * { animation: none !important; }
  .b1-aro { stroke-dashoffset: 0; }
  .ba-spark { opacity: 0; }
  .b3-grunge { opacity: 0.5; }
}

/* móvil: demo un poco más chica para que quepan las tarjetas */
@media (max-width: 420px) {
  .ba-fab.ba-fab-demo { width: 176px; height: 176px; }
  .ba-frame { padding: 14px 14px 40px; }
}
`;
