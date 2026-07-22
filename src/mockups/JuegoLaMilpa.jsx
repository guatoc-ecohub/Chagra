import React, { useCallback, useEffect, useState } from 'react';
import './JuegoLaMilpa.css';

/**
 * MOCKUP JUGABLE — "La milpa: las tres hermanas".
 *
 * Mini-juego educativo 2D sobre la milpa mesoamericana/andina: el policultivo
 * de maiz + frijol + ahuyama (calabaza) sembrados en el mismo monticulo. El
 * jugador siembra las tres hermanas y ve nacer la SINERGIA:
 *
 *   - El MAIZ crece alto y da el palo por donde el frijol se trepa.
 *   - El FRIJOL le fija nitrogeno a la tierra: todo el monticulo crece mejor.
 *   - La AHUYAMA tapa el suelo con sus hojas anchas y guarda la humedad
 *     (el agua se gasta mas despacio).
 *
 * No hay puntaje, ni monedas, ni castigo por perder: curva amable, sin
 * gamificacion toxica. El unico objetivo es entender la asociacion de
 * cultivos jugando. Todo es SVG 2D con estetica Cuphead andina (linea gruesa
 * que respira, squash & stretch), 0 dependencias, offline, gama baja.
 *
 * Ruta: #/mockups/juego-la-milpa (sin auth).
 *
 * Arquitectura: TODO el estado del juego vive en un solo objeto y avanza con
 * reductores PUROS (stepDay / applyMoundClick). El unico efecto es el
 * temporizador opcional del "sol automatico". Cero Math.random en el render:
 * el confeti y los desfases de animacion son deterministas (derivados del
 * indice), asi el arbol de React se mantiene puro y estable.
 */

// ── Paleta rubber-hose (terrosa, calida) ──────────────────────────────────
const INK = '#2a1a10';
const C = {
  cielo1: '#ffe6b0', cielo2: '#ffd07a',
  sol: '#ffce4d', solHi: '#ffe08a', rayo: '#ffb020',
  cerro: '#c98d54', cerroHi: '#dda876',
  tierra: '#6e4a2c', tierraHi: '#8a6038', tierraDark: '#4f3520',
  maiz: '#5f8f39', maizHi: '#7bad4a', mazorca: '#f3c44e', mazorcaDark: '#d9a02f', pluma: '#c9a05a',
  frijol: '#3f8050', frijolHi: '#66b06a', vaina: '#356e3c', flor: '#e879a6',
  ahLeaf: '#3c7a3a', ahLeafHi: '#64a24a', fruto: '#e8862e', frutoRib: '#c96a1e', frutoStem: '#74812f',
  agua: '#3fa7d6', aguaLo: '#cdeaf5',
  panel: '#fff6e6',
};

// Confeti determinista (sin Math.random): 22 piezas en posiciones fijas.
const PARTY = [C.mazorca, C.frijolHi, C.fruto, C.flor, C.maizHi, C.agua];
const CONFETTI = Array.from({ length: 22 }, (_, i) => ({
  x: ((i * 79 + 40) % 940) + 10,
  delay: (i % 11) * 0.16,
  dur: 2.4 + (i % 5) * 0.28,
  color: PARTY[i % PARTY.length],
  size: 10 + (i % 4) * 4,
  round: i % 2 === 0,
}));

// ── Modelo de datos ───────────────────────────────────────────────────────
const MOUNDS_X = [250, 500, 750]; // centro de cada monticulo en el viewBox
const GROUND_Y = 470;             // linea de suelo donde nacen las matas

const emptySister = () => ({ planted: false, growth: 0 });
const initialMounds = () =>
  MOUNDS_X.map((_, i) => ({
    id: i,
    maiz: emptySister(),
    frijol: emptySister(),
    ahuyama: emptySister(),
    water: 72,
    health: 72,
  }));

const initialGame = () => ({
  phase: 'intro', // intro | play | won
  tool: 'maiz',   // maiz | frijol | ahuyama | agua
  day: 1,
  auto: false,
  tip: 'Escoja una semilla y toque un monticulo para sembrar. Junte las tres hermanas.',
  mounds: initialMounds(),
});

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const stageOf = (s) => (!s.planted ? 0 : s.growth < 34 ? 1 : s.growth < 78 ? 2 : 3);
const growOne = (s, rate, bonus, cap) =>
  !s.planted ? s : { ...s, growth: clamp(Math.min(s.growth + rate + bonus, cap), 0, 100) };

// Mensajes de la guia (Angelita). Tono "usted" colombiano, sin regionalismos.
const TIP = {
  dry: 'Alguna mata quedo seca. Escoja la regadera y deles agua.',
  pole: 'El frijol encontro el palo del maiz y empezo a treparse.',
  shade: 'Las hojas anchas de la ahuyama taparon el suelo: la humedad dura mas.',
  trio: 'Las tres hermanas juntas en el mismo monticulo: se apoyan entre ellas.',
  alone: 'Sembrada sola, la mata queda mas expuesta. Acompanela con sus hermanas.',
  beanN: 'El frijol maduro le pasa alimento a la tierra: todo crece mejor.',
  grow: 'La milpa va creciendo. Que siga saliendo el sol.',
  win: 'Milpa completa. Maiz, frijol y ahuyama dieron su cosecha juntas.',
};

// Reductor PURO: avanzar un dia de sol sobre toda la milpa.
function stepDay(g) {
  if (g.phase !== 'play') return g;
  const events = [];
  const mounds = g.mounds.map((m) => {
    const wasPole = stageOf(m.maiz) >= 2;
    const wasLeafy = stageOf(m.ahuyama) >= 2;
    const wasTrio = stageOf(m.maiz) === 3 && stageOf(m.frijol) === 3 && stageOf(m.ahuyama) === 3;
    const wasBeanN = m.frijol.planted && m.frijol.growth >= 78;

    const leafy = stageOf(m.ahuyama) >= 2; // sombra ya activa
    const drain = leafy ? 11 : 20;
    const water = clamp(m.water - drain, 0, 100);
    const wet = water >= 25;
    const nBonus = wasBeanN ? 7 : 0; // nitrogeno del frijol maduro

    const maiz = growOne(m.maiz, wet ? 22 : 6, nBonus, 100);
    const poleReady = stageOf(maiz) >= 2; // el maiz ya sirve de tutor
    const frijol = growOne(m.frijol, wet ? 20 : 5, 0, poleReady ? 100 : 33);
    const ahuyama = growOne(m.ahuyama, wet ? 20 : 5, nBonus, 100);

    const plantedCount = [maiz, frijol, ahuyama].filter((s) => s.planted).length;
    const maxStage = Math.max(stageOf(maiz), stageOf(frijol), stageOf(ahuyama));
    let health = m.health;
    if (!wet) health -= 15;
    else if (plantedCount === 3) health += 12;
    else health += 4;
    if (plantedCount === 1 && maxStage >= 2) health -= 8; // monocultivo expuesto
    health = clamp(health, 18, 100);

    // Eventos didacticos (se elige el mas relevante por prioridad).
    if (water < 25) events.push({ p: 9, t: TIP.dry });
    if (!wasTrio && plantedCount === 3 && stageOf(maiz) === 3 && stageOf(frijol) === 3 && stageOf(ahuyama) === 3)
      events.push({ p: 8, t: TIP.trio });
    if (wet && !wasPole && stageOf(maiz) >= 2 && frijol.planted) events.push({ p: 6, t: TIP.pole });
    if (!wasLeafy && stageOf(ahuyama) >= 2) events.push({ p: 4, t: TIP.shade });
    if (!wasBeanN && frijol.planted && frijol.growth >= 78) events.push({ p: 3, t: TIP.beanN });
    if (plantedCount === 1 && maxStage >= 2) events.push({ p: 2, t: TIP.alone });

    return { ...m, water, maiz, frijol, ahuyama, health };
  });

  const won = mounds.every(
    (m) => stageOf(m.maiz) === 3 && stageOf(m.frijol) === 3 && stageOf(m.ahuyama) === 3
  );
  let tip;
  if (won) tip = TIP.win;
  else if (events.length) tip = events.sort((a, b) => b.p - a.p)[0].t;
  else tip = TIP.grow;

  return { ...g, mounds, day: g.day + 1, tip, phase: won ? 'won' : 'play', auto: won ? false : g.auto };
}

const plantTip = {
  maiz: 'Sembro maiz: va a dar el palo para el frijol.',
  frijol: 'Sembro frijol: necesita el maiz para treparse.',
  ahuyama: 'Sembro ahuyama: sus hojas van a tapar el suelo.',
};

// Reductor PURO: tocar un monticulo con la herramienta activa.
function applyMoundClick(g, i) {
  if (g.phase !== 'play') return g;
  const tool = g.tool;
  const target = g.mounds[i];

  if (tool === 'agua') {
    const mounds = g.mounds.map((m, idx) =>
      idx === i ? { ...m, water: 100, health: clamp(m.health + 6, 18, 100) } : m
    );
    return { ...g, mounds, tip: 'Le echo agua al monticulo. El agua mantiene la mata contenta.' };
  }
  if (target[tool].planted) {
    return { ...g, tip: 'Ahi ya sembro esa hermana. Pruebe con otra o con otro monticulo.' };
  }
  const mounds = g.mounds.map((m, idx) =>
    idx === i ? { ...m, [tool]: { planted: true, growth: 0 } } : m
  );
  return { ...g, mounds, tip: plantTip[tool] };
}

// ══════════════════════════════════════════════════════════════════════════
//  ARTE SVG (rubber-hose). Componentes internos, no exportados.
// ══════════════════════════════════════════════════════════════════════════

function Sol() {
  // BUG corregido (reporte del operador: "los rayos se salen de la cara"):
  // el transform-origin inline iba en px del viewBox (150,120) pero el CSS
  // declara transform-box:fill-box, así que el eje de giro quedaba corrido
  // (58,28) y los rayos ORBITABAN por fuera del sol. Además la cara bobeaba
  // sola (milpa-bob) y se despegaba 5px más del anillo de rayos.
  // Ahora: rayos y cara son geometría simétrica alrededor de (150,120), el
  // giro usa el centro real del fill-box y TODO el sol bobea junto.
  return (
    <g className="milpa-sun">
      <g className="milpa-sun-rays">
        {Array.from({ length: 12 }, (_, k) => {
          const a = (k * Math.PI) / 6;
          const largo = k % 2 === 0 ? 88 : 74; // rayos alternos largo/corto
          const x1 = 150 + Math.cos(a) * 57;
          const y1 = 120 + Math.sin(a) * 57;
          const x2 = 150 + Math.cos(a) * largo;
          const y2 = 120 + Math.sin(a) * largo;
          return (
            <line key={k} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={C.rayo} strokeWidth={k % 2 === 0 ? 9 : 7} strokeLinecap="round" />
          );
        })}
      </g>
      <g>
        <circle cx="150" cy="120" r="52" fill={C.sol} stroke={INK} strokeWidth="6" />
        <circle cx="150" cy="120" r="52" fill="none" stroke={C.solHi} strokeWidth="4"
          strokeDasharray="6 22" strokeLinecap="round" />
        <circle cx="135" cy="112" r="6" fill={INK} />
        <circle cx="167" cy="112" r="6" fill={INK} />
        <path d="M 133 136 Q 150 152 167 136" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        <circle cx="126" cy="130" r="7" fill="#ff9d5c" opacity="0.55" />
        <circle cx="174" cy="130" r="7" fill="#ff9d5c" opacity="0.55" />
      </g>
    </g>
  );
}

// Un blade/hoja generica (rubber-hose), apunta segun dir (+1 derecha, -1 izq).
function leafPath(x, y, len, dir) {
  const ex = x + dir * len;
  const ey = y - len * 0.42;
  return `M ${x} ${y} Q ${x + dir * len * 0.5} ${y - len * 0.9} ${ex} ${ey} Q ${x + dir * len * 0.55} ${y - len * 0.28} ${x} ${y} Z`;
}

/*
 * LAS TRES HERMANAS con su silueta REAL (reporte del operador: "no se parecen
 * a las de verdad"). Cada una cuenta su parte de la asociacion:
 *   MAIZ    caña con nudos + hojas LARGAS ACINTADAS que arquean y dejan caer
 *           la punta, penacho arriba, mazorca con amero y barbas al costado.
 *   FRIJOL  enredadera de hoja ACORAZONADA que trepa por la caña del maiz
 *           (zarcillos incluidos); sin tutor queda tanteando el suelo.
 *   AHUYAMA rastrera de hoja ANCHA LOBULADA que tapa el monticulo (venas
 *           palidas de cucurbita), flor de trompeta naranja y fruto acostillado.
 */

function Maiz({ cx, stage, grow, droop }) {
  if (stage === 0) return null;
  const h = 46 + grow * 2.05; // 46..251
  const topY = GROUND_Y - h;
  const bend = droop ? 16 : 6;
  const caida = droop ? 0.15 : 0; // seca: las hojas cuelgan mas
  const nLeaves = stage === 1 ? 2 : stage === 2 ? 4 : 6;
  const nudos = [];
  const leaves = [];
  for (let k = 0; k < nLeaves; k++) {
    const t = 0.16 + (k / nLeaves) * 0.62;
    const ly = GROUND_Y - h * t;
    const dir = k % 2 === 0 ? 1 : -1;
    // Hoja ACINTADA: larga, arquea hacia arriba-afuera y la punta cae.
    const L = (40 + (1 - t) * 42) * (0.82 + 0.18 * Math.min(1, grow / 60));
    const tipX = cx + dir * L * 1.04;
    const tipY = ly - L * (0.3 - caida);
    const dHoja = `M ${cx} ${ly - 3}
      C ${cx + dir * L * 0.16} ${ly - L * 0.68} ${cx + dir * L * 0.6} ${ly - L * (0.6 - caida)} ${tipX} ${tipY}
      C ${cx + dir * L * 0.58} ${ly - L * (0.26 - caida)} ${cx + dir * L * 0.2} ${ly - L * 0.08} ${cx} ${ly + 3} Z`;
    const dVena = `M ${cx} ${ly} Q ${cx + dir * L * 0.44} ${ly - L * (0.48 - caida)} ${tipX} ${tipY}`;
    nudos.push(<ellipse key={`n${k}`} cx={cx} cy={ly} rx="6.5" ry="3" fill={C.maiz} stroke={INK} strokeWidth="2.5" />);
    leaves.push(
      <g key={k}>
        <path d={dHoja} fill={k % 2 ? C.maiz : C.maizHi} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d={dVena} fill="none" stroke={k % 2 ? C.maizHi : C.maiz} strokeWidth="2.4" strokeLinecap="round" />
      </g>
    );
  }
  const tallo = `M ${cx} ${GROUND_Y} C ${cx - bend} ${GROUND_Y - h * 0.5} ${cx + bend} ${GROUND_Y - h * 0.72} ${cx} ${topY}`;
  return (
    <g transform={`rotate(${droop ? 6 : 0} ${cx} ${GROUND_Y})`}>
      <g className="milpa-sway"><g className="milpa-pop" key={stage}>
        {/* la caña, con sus nudos */}
        <path d={tallo} fill="none" stroke={INK} strokeWidth="11" strokeLinecap="round" />
        <path d={tallo} fill="none" stroke={C.maiz} strokeWidth="6" strokeLinecap="round" />
        {nudos}
        {leaves}
        {stage >= 3 && (
          <g>
            {/* MAZORCA al costado: amero, granos en reticula y barbas */}
            <g transform={`translate(${cx + 15} ${GROUND_Y - h * 0.52}) rotate(-24)`}>
              <path d="M -3 26 Q -14 6 -7 -16 Q 1 2 -3 26 Z" fill={C.maiz} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
              <path d="M 5 26 Q 17 8 11 -14 Q 3 4 5 26 Z" fill={C.maizHi} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
              <ellipse cx="1" cy="-2" rx="13" ry="27" fill={C.mazorca} stroke={INK} strokeWidth="4.5" />
              {[-6, 0, 6].map((gx) => (
                <path key={gx} d={`M ${gx} -24 Q ${gx * 1.35} -2 ${gx} 20`} stroke={C.mazorcaDark} strokeWidth="2.2" fill="none" />
              ))}
              {[-14, -6, 2, 10].map((gy) => (
                <line key={gy} x1="-10" y1={gy} x2="10.5" y2={gy} stroke={C.mazorcaDark} strokeWidth="1.7" />
              ))}
              <path d="M -2 -28 q -6 -8 -12 -9" stroke="#b96a2a" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M 1 -29 q 1 -10 -3 -15" stroke="#d08a3e" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M 4 -28 q 7 -7 12 -7" stroke="#b96a2a" strokeWidth="3" fill="none" strokeLinecap="round" />
            </g>
            {/* PENACHO (la espiga macho, arriba del todo) */}
            <line x1={cx} y1={topY} x2={cx} y2={topY - 26} stroke={C.pluma} strokeWidth="4" strokeLinecap="round" />
            {[-18, -9, 9, 18].map((dx) => (
              <path key={dx} d={`M ${cx} ${topY} q ${dx * 0.7} -14 ${dx * 1.4} -22`}
                fill="none" stroke={C.pluma} strokeWidth="3.5" strokeLinecap="round" />
            ))}
            {[-25, -12, 0, 12, 25].map((dx) => (
              <circle key={dx} cx={cx + dx} cy={topY - (dx === 0 ? 28 : 22 - Math.abs(dx) * 0.12)} r="2.6"
                fill={C.mazorcaDark} />
            ))}
          </g>
        )}
      </g></g>
    </g>
  );
}

// Hoja de frijol: CORAZON con la punta hacia abajo (la seña de la trepadora).
const CORAZON = 'M 0 15 C -12 5 -14 -7 -7 -10 C -2 -12 0 -8 0 -4 C 0 -8 2 -12 7 -10 C 14 -7 12 5 0 15 Z';
function HojaFrijol({ x, y, s, rot = 0, tono = C.frijolHi }) {
  const k = s / 15;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${k})`}>
      <path d={CORAZON} fill={tono} stroke={INK} strokeWidth={3.4 / k} strokeLinejoin="round" />
      <line x1="0" y1="-3" x2="0" y2="10" stroke={INK} strokeWidth={1.5 / k} opacity="0.3" />
    </g>
  );
}

// Vaina de frijol colgante, con sus semillas marcadas.
function Vaina({ x, y, rot = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d="M 0 0 C -1 8 1 16 6 21 C 9 24 13 22 11 17 C 9 10 6 3 2 -2 Z"
        fill={C.vaina} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="3" cy="7" r="1.7" fill="#274f2b" />
      <circle cx="5.4" cy="12.5" r="1.7" fill="#274f2b" />
      <circle cx="8" cy="17" r="1.7" fill="#274f2b" />
    </g>
  );
}

function Frijol({ cx, stage, grow, hasPole }) {
  if (stage === 0) return null;
  // Sin tutor (o recien nacido): mata baja que TANTEA buscando palo.
  if (!hasPole || stage === 1) {
    return (
      <g className="milpa-sway-soft"><g className="milpa-pop" key="flop">
        <path d={`M ${cx - 4} ${GROUND_Y} q -22 -8 -38 4`} fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
        <path d={`M ${cx - 4} ${GROUND_Y} q -22 -8 -38 4`} fill="none" stroke={C.frijol} strokeWidth="4" strokeLinecap="round" />
        <HojaFrijol x={cx - 38} y={GROUND_Y - 10} s={13} rot={35} />
        <HojaFrijol x={cx - 18} y={GROUND_Y - 12} s={12} rot={-20} />
        {/* el zarcillo levanta la cabeza buscando la caña */}
        <path d={`M ${cx - 8} ${GROUND_Y - 2} q 4 -14 12 -18 q 7 -3 8 3 q 1 5 -5 5`}
          fill="none" stroke={C.frijol} strokeWidth="3" strokeLinecap="round" />
      </g></g>
    );
  }
  // Con tutor: la enredadera SUBE POR LA CAÑA del maiz — esa es la leccion.
  const h = 60 + grow * 1.7;
  const topY = GROUND_Y - h;
  const coils = [];
  const seg = 24;
  for (let y = GROUND_Y; y > topY; y -= seg) {
    const side = ((GROUND_Y - y) / seg) % 2 < 1 ? 1 : -1;
    coils.push(`Q ${cx + side * 13} ${y - seg * 0.5} ${cx} ${y - seg}`);
  }
  const coilPath = `M ${cx} ${GROUND_Y} ${coils.join(' ')}`;
  const nHojas = stage >= 3 ? 4 : 3;
  return (
    <g className="milpa-sway"><g className="milpa-pop" key={stage}>
      <path d={coilPath} fill="none" stroke={INK} strokeWidth="6.5" strokeLinecap="round" />
      <path d={coilPath} fill="none" stroke={C.frijol} strokeWidth="3.5" strokeLinecap="round" />
      {/* zarcillo en la punta, agarrandose mas arriba */}
      <path d={`M ${cx} ${topY} q 7 -10 15 -9 q 7 1 4 7 q -3 6 -9 3 q -3 -2 0 -5`}
        fill="none" stroke={C.frijol} strokeWidth="3" strokeLinecap="round" />
      {Array.from({ length: nHojas }, (_, k) => {
        const t = 0.24 + (k / nHojas) * 0.62;
        const dir = k % 2 === 0 ? -1 : 1;
        const ly = GROUND_Y - h * t;
        const lx = cx + dir * 17;
        return (
          <g key={k}>
            <path d={`M ${cx + dir * 6} ${ly + 5} Q ${cx + dir * 12} ${ly + 1} ${lx} ${ly - 4}`}
              fill="none" stroke={C.frijol} strokeWidth="2.6" strokeLinecap="round" />
            <HojaFrijol x={lx + dir * 7} y={ly + 2} s={14 + (k % 2) * 3} rot={dir * 28}
              tono={k % 2 ? C.frijolHi : '#57a35f'} />
          </g>
        );
      })}
      {stage >= 3 && (
        <g>
          {/* vainas colgando en racimo + flores rosadas */}
          <Vaina x={cx - 16} y={GROUND_Y - h * 0.56} rot={-8} />
          <Vaina x={cx - 9} y={GROUND_Y - h * 0.53} rot={14} />
          <Vaina x={cx + 15} y={GROUND_Y - h * 0.38} rot={4} />
          {[[cx + 12, GROUND_Y - h * 0.72], [cx - 10, GROUND_Y - h * 0.88]].map(([fx, fy], k) => (
            <g key={k}>
              <circle cx={fx} cy={fy} r="5" fill={C.flor} stroke={INK} strokeWidth="2.6" />
              <circle cx={fx + 1.5} cy={fy + 2} r="2" fill="#fdd9e8" />
            </g>
          ))}
        </g>
      )}
    </g></g>
  );
}

// Hoja de ahuyama: ANCHA y LOBULADA (cinco lobulos redondos), con las venas
// palidas que radian del peciolo — la hoja de cucurbita que tapa el suelo.
const LOBULADA = 'M 0 9 C -6 9 -10 7 -12 4 C -18 6 -22 1 -19 -3 C -23 -8 -18 -13 -12 -12 C -10 -17 -3 -19 0 -14 C 3 -19 10 -17 12 -12 C 18 -13 23 -8 19 -3 C 22 1 18 6 12 4 C 10 7 6 9 0 9 Z';
const VENAS_LOB = [[-14, -5], [-7, -12], [0, -14], [7, -12], [14, -5]];
function HojaAhuyama({ x, y, s, rot = 0, tono = C.ahLeaf }) {
  const k = s / 20;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${k})`}>
      <path d={LOBULADA} fill={tono} stroke={INK} strokeWidth={4 / k} strokeLinejoin="round" />
      {VENAS_LOB.map(([vx, vy], i) => (
        <path key={i} d={`M 0 7 Q ${vx * 0.45} ${vy * 0.35} ${vx} ${vy}`}
          fill="none" stroke="#a9cb86" strokeWidth={1.9 / k} strokeLinecap="round" opacity="0.9" />
      ))}
    </g>
  );
}

function Ahuyama({ cx, stage, grow }) {
  if (stage === 0) return null;
  // La rastrera avanza pero SE QUEDA EN SU MONTICULO (medio surco = 125px).
  const spread = 16 + grow * 0.6; // 16..76
  const y = GROUND_Y - 5;
  const nLeaves = stage === 1 ? 2 : stage === 2 ? 5 : 7;
  return (
    <g className="milpa-sway-soft"><g className="milpa-pop" key={stage}>
      {/* guias rastreras serpenteando por el suelo, con zarcillo en la punta */}
      {[-1, 1].map((dir) => (
        <g key={dir}>
          <path d={`M ${cx} ${GROUND_Y} q ${dir * spread * 0.55} 10 ${dir * spread * 1.05} 3 q ${dir * spread * 0.3} -6 ${dir * spread * 0.5} 1`}
            fill="none" stroke={C.ahLeaf} strokeWidth="4.5" strokeLinecap="round" />
          <path d={`M ${cx + dir * spread * 1.55} ${GROUND_Y + 4} q ${dir * 7} -6 ${dir * 12} -2 q ${dir * 4} 4 ${dir * 1} 6 q ${dir * -4} 2 ${dir * -5} -2`}
            fill="none" stroke={C.ahLeafHi} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      ))}
      {/* el manto de hojas anchas que le hace sombra a la maleza */}
      {Array.from({ length: nLeaves }, (_, k) => {
        const dir = k % 2 === 0 ? -1 : 1;
        const off = (Math.floor(k / 2) + 0.6) * spread * 0.45;
        const lx = cx + dir * off;
        const ly = y - (k % 3) * 4 + (k % 2) * 2;
        const size = (30 + (stage >= 2 ? 8 : 0)) - (k % 3) * 3;
        const rot = dir * (8 + (k % 3) * 9);
        return <HojaAhuyama key={k} x={lx} y={ly} s={size} rot={rot} tono={k % 2 ? C.ahLeafHi : C.ahLeaf} />;
      })}
      {/* flor de trompeta naranja: la seña de la ahuyama en el rastrojo */}
      {stage >= 2 && (
        <g transform={`translate(${cx - spread * 1.35} ${GROUND_Y - 10})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-6.5" rx="3.6" ry="7" fill="#f2a93b" stroke={INK} strokeWidth="2.4"
              transform={`rotate(${a})`} />
          ))}
          <circle cx="0" cy="0" r="3.4" fill={C.fruto} stroke={INK} strokeWidth="2" />
        </g>
      )}
      {stage >= 3 && (
        <g transform={`translate(${cx + spread * 1.05 + 6} ${GROUND_Y + 4})`}>
          {/* ahuyama ACHATADA y acostillada, con pedunculo en tirabuzon */}
          <ellipse cx="0" cy="0" rx="34" ry="22" fill={C.fruto} stroke={INK} strokeWidth="5" />
          {[-22, -11, 0, 11, 22].map((dx) => (
            <path key={dx} d={`M ${dx} ${-20 + Math.abs(dx) * 0.28} Q ${dx * 1.12} 0 ${dx} ${20 - Math.abs(dx) * 0.28}`}
              fill="none" stroke={C.frutoRib} strokeWidth="3" strokeLinecap="round" />
          ))}
          <path d="M -11 -15 Q -2 -20 8 -17" fill="none" stroke="#f7ac62" strokeWidth="3.5" strokeLinecap="round" opacity="0.8" />
          <path d="M 0 -21 q 2 -10 10 -12 q 6 -1 5 4 q -1 4 -5 3" fill="none" stroke={C.frutoStem} strokeWidth="4.5" strokeLinecap="round" />
        </g>
      )}
    </g></g>
  );
}

// Carita del monticulo (estado de animo): sonrie sano, se apaga si sufre.
function MoodFace({ cx, health }) {
  const cy = GROUND_Y + 46;
  const happy = health >= 55;
  const meh = health >= 40 && health < 55;
  return (
    <g>
      <circle cx={cx - 15} cy={cy} r="4.5" fill={INK} />
      <circle cx={cx + 15} cy={cy} r="4.5" fill={INK} />
      <circle cx={cx - 26} cy={cy + 8} r="6" fill="#ff9d7a" opacity="0.6" />
      <circle cx={cx + 26} cy={cy + 8} r="6" fill="#ff9d7a" opacity="0.6" />
      {happy && <path d={`M ${cx - 13} ${cy + 12} Q ${cx} ${cy + 26} ${cx + 13} ${cy + 12}`} fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />}
      {meh && <line x1={cx - 11} y1={cy + 16} x2={cx + 11} y2={cy + 16} stroke={INK} strokeWidth="4" strokeLinecap="round" />}
      {!happy && !meh && <path d={`M ${cx - 13} ${cy + 20} Q ${cx} ${cy + 8} ${cx + 13} ${cy + 20}`} fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />}
    </g>
  );
}

// Barra de humedad al pie del monticulo.
function Moisture({ cx, water }) {
  const w = 16, hMax = 54, x = cx + 96, yBase = GROUND_Y + 70;
  const fill = clamp(water, 0, 100) / 100;
  return (
    <g>
      <rect x={x} y={yBase - hMax} width={w} height={hMax} rx="8" fill={C.aguaLo} stroke={INK} strokeWidth="3.5" />
      <rect x={x} y={yBase - hMax * fill} width={w} height={hMax * fill} rx="8" fill={C.agua} stroke="none" />
      <path d={`M ${x + w / 2} ${yBase - hMax - 14} q 8 10 0 16 q -8 -6 0 -16 Z`} fill={C.agua} stroke={INK} strokeWidth="3" />
    </g>
  );
}

function Bee() {
  return (
    <g className="milpa-bee" transform="translate(360 210)">
      <ellipse cx="0" cy="0" rx="17" ry="13" fill={C.mazorca} stroke={INK} strokeWidth="4" />
      <path d="M -6 -12 A 13 13 0 0 1 -6 12" fill={INK} />
      <path d="M 6 -12 A 13 13 0 0 1 6 12" fill="none" stroke={INK} strokeWidth="4" />
      <g className="milpa-wing" style={{ transformOrigin: '-2px -12px' }}>
        <ellipse cx="-2" cy="-14" rx="10" ry="7" fill="#ffffff" stroke={INK} strokeWidth="3" opacity="0.9" />
      </g>
      <circle cx="15" cy="-3" r="4" fill={INK} />
      <path d="M 12 -12 q 4 -8 -2 -12" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
    </g>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════

export default function JuegoLaMilpa({ onBack = () => {} }) {
  const [game, setGame] = useState(initialGame);

  const nextDay = useCallback(() => setGame((g) => stepDay(g)), []);
  const setTool = useCallback((tool) => setGame((g) => ({ ...g, tool })), []);
  const clickMound = useCallback((i) => setGame((g) => applyMoundClick(g, i)), []);
  const start = useCallback(() => setGame((g) => ({ ...g, phase: 'play' })), []);
  const reset = useCallback(() => setGame(initialGame()), []);
  const toggleAuto = useCallback(() => setGame((g) => ({ ...g, auto: !g.auto })), []);

  // Unico efecto: el "sol automatico" avanza un dia cada 3.2s mientras juega.
  useEffect(() => {
    if (!(game.auto && game.phase === 'play')) return undefined;
    const id = setInterval(() => setGame((g) => stepDay(g)), 3200);
    return () => clearInterval(id);
  }, [game.auto, game.phase]);

  const { phase, tool, day, auto, tip, mounds } = game;

  return (
    <div className="milpa-root">
      <div className="milpa-topbar">
        <h1 className="milpa-title">La milpa: las tres hermanas</h1>
        <div className="milpa-topright">
          <span className="milpa-day">Dia {day}</span>
          <button type="button" className="milpa-back" onClick={onBack}>Salir</button>
        </div>
      </div>

      {/* ── Escenario SVG ─────────────────────────────────────────────── */}
      <div className="milpa-stage">
        <svg className="milpa-svg" viewBox="0 0 1000 660" role="img"
          aria-label="Huerta de milpa con tres monticulos: maiz, frijol y ahuyama.">
          <defs>
            <linearGradient id="milpaCielo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={C.cielo1} />
              <stop offset="1" stopColor={C.cielo2} />
            </linearGradient>
            <linearGradient id="milpaTierra" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={C.tierraHi} />
              <stop offset="1" stopColor={C.tierraDark} />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="1000" height="660" fill="url(#milpaCielo)" />
          <Sol />

          {/* cerros andinos de fondo */}
          <path d="M -20 470 Q 160 350 360 452 Q 560 360 780 452 Q 900 400 1020 460 L 1020 470 Z"
            fill={C.cerroHi} stroke={INK} strokeWidth="4" />
          <path d="M -20 480 Q 220 400 440 478 Q 680 405 1020 480 L 1020 500 L -20 500 Z"
            fill={C.cerro} stroke={INK} strokeWidth="4" />

          {/* franja de tierra */}
          <rect x="0" y="478" width="1000" height="182" fill="url(#milpaTierra)" />
          <path d="M 0 486 Q 500 470 1000 486" fill="none" stroke={INK} strokeWidth="5" />

          <Bee />

          {/* Monticulos + matas (detras: monticulos; encima: plantas) */}
          {mounds.map((m, i) => {
            const cx = MOUNDS_X[i];
            const dry = m.water < 25 || m.health < 40;
            return (
              <g key={m.id}>
                {/* monticulo de tierra */}
                <ellipse cx={cx} cy={GROUND_Y + 40} rx="118" ry="60" fill={C.tierra} stroke={INK} strokeWidth="5" />
                <ellipse cx={cx} cy={GROUND_Y + 30} rx="118" ry="46" fill={C.tierraHi} stroke="none" opacity="0.5" />
                {/* plantas del monticulo */}
                <Ahuyama cx={cx} stage={stageOf(m.ahuyama)} grow={m.ahuyama.growth} />
                <Maiz cx={cx} stage={stageOf(m.maiz)} grow={m.maiz.growth} droop={dry} />
                <Frijol cx={cx} stage={stageOf(m.frijol)} grow={m.frijol.growth} hasPole={stageOf(m.maiz) >= 2} />
                <MoodFace cx={cx} health={m.health} />
                <Moisture cx={cx} water={m.water} />
              </g>
            );
          })}

          {/* Zonas tactiles por monticulo (encima de todo, transparentes) */}
          {mounds.map((m, i) => {
            const cx = MOUNDS_X[i];
            return (
              <rect key={`hit-${m.id}`} className="milpa-hit"
                x={cx - 150} y={140} width={300} height={420}
                fill="transparent"
                tabIndex={phase === 'play' ? 0 : -1}
                role="button"
                aria-label={`Monticulo ${i + 1}: tocar para ${tool === 'agua' ? 'regar' : 'sembrar'}.`}
                onClick={() => clickMound(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clickMound(i); }
                }} />
            );
          })}

          {/* Confeti de celebracion */}
          {phase === 'won' && (
            <g aria-hidden="true">
              {CONFETTI.map((c, k) => (
                <rect key={k} className="milpa-confetti"
                  x={c.x} y={-40} width={c.size} height={c.size}
                  rx={c.round ? c.size / 2 : 2}
                  fill={c.color} stroke={INK} strokeWidth="2"
                  style={{ animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }} />
              ))}
            </g>
          )}
        </svg>
      </div>

      {/* ── Guia (Angelita habla) ─────────────────────────────────────── */}
      <div className="milpa-tip">
        <svg className="milpa-tip-bee" viewBox="0 0 40 40" aria-hidden="true">
          <ellipse cx="20" cy="22" rx="13" ry="10" fill={C.mazorca} stroke={INK} strokeWidth="3" />
          <path d="M 15 12 A 10 10 0 0 1 15 32" fill={INK} />
          <ellipse cx="16" cy="10" rx="7" ry="5" fill="#fff" stroke={INK} strokeWidth="2.5" />
          <circle cx="30" cy="19" r="3" fill={INK} />
        </svg>
        <span>{tip}</span>
      </div>

      {/* ── Controles ─────────────────────────────────────────────────── */}
      <div className="milpa-controls">
        <div className="milpa-seedrow">
          <button type="button" className={`milpa-btn ${tool === 'maiz' ? 'active' : ''}`}
            onClick={() => setTool('maiz')} aria-pressed={tool === 'maiz'}>
            <span className="milpa-swatch" style={{ background: C.maizHi }} /> Maiz
          </button>
          <button type="button" className={`milpa-btn ${tool === 'frijol' ? 'active' : ''}`}
            onClick={() => setTool('frijol')} aria-pressed={tool === 'frijol'}>
            <span className="milpa-swatch" style={{ background: C.frijolHi }} /> Frijol
          </button>
          <button type="button" className={`milpa-btn ${tool === 'ahuyama' ? 'active' : ''}`}
            onClick={() => setTool('ahuyama')} aria-pressed={tool === 'ahuyama'}>
            <span className="milpa-swatch" style={{ background: C.fruto }} /> Ahuyama
          </button>
          <button type="button" className={`milpa-btn ${tool === 'agua' ? 'active' : ''}`}
            onClick={() => setTool('agua')} aria-pressed={tool === 'agua'}>
            <span className="milpa-swatch" style={{ background: C.agua }} /> Regadera
          </button>
        </div>

        <button type="button" className="milpa-btn sun" onClick={nextDay}
          disabled={phase !== 'play'}>Que salga el sol</button>

        <label className="milpa-toggle">
          <input type="checkbox" checked={auto} onChange={toggleAuto} disabled={phase !== 'play'} />
          Sol automatico
        </label>

        <button type="button" className="milpa-btn ghost" onClick={reset}>Volver a sembrar</button>
      </div>

      {/* ── Leyenda de las tres hermanas ──────────────────────────────── */}
      <div className="milpa-legend">
        <div className="milpa-chip">
          <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
            <line x1="17" y1="32" x2="17" y2="4" stroke={C.maiz} strokeWidth="5" strokeLinecap="round" />
            <path d={leafPath(17, 18, 12, 1)} fill={C.maizHi} stroke={INK} strokeWidth="2" />
            <path d={leafPath(17, 24, 12, -1)} fill={C.maizHi} stroke={INK} strokeWidth="2" />
          </svg>
          <div><b>Maiz</b><span>Crece alto y da el palo para que el frijol se trepe.</span></div>
        </div>
        <div className="milpa-chip">
          <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
            <path d="M 17 32 Q 8 22 17 14 Q 26 8 17 2" fill="none" stroke={C.frijol} strokeWidth="4" strokeLinecap="round" />
            <g transform="translate(24 22) scale(0.55)">
              <path d={CORAZON} fill={C.frijolHi} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
            </g>
            <circle cx="17" cy="6" r="4" fill={C.flor} stroke={INK} strokeWidth="2" />
          </svg>
          <div><b>Frijol</b><span>Le fija alimento a la tierra: enriquece el monticulo.</span></div>
        </div>
        <div className="milpa-chip">
          <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
            <ellipse cx="21" cy="26" rx="10" ry="6.5" fill={C.fruto} stroke={INK} strokeWidth="3" />
            <path d="M 16 22 Q 21 26 16 30 M 26 22 Q 21 26 26 30" fill="none" stroke={C.frutoRib} strokeWidth="1.6" />
            <g transform="translate(13 12) scale(0.52)">
              <path d={LOBULADA} fill={C.ahLeafHi} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
            </g>
          </svg>
          <div><b>Ahuyama</b><span>Tapa el suelo con sus hojas anchas y guarda la humedad.</span></div>
        </div>
      </div>

      {/* ── Overlay de bienvenida ─────────────────────────────────────── */}
      {phase === 'intro' && (
        <div className="milpa-overlay">
          <div className="milpa-card">
            <h2>La milpa: las tres hermanas</h2>
            <p className="milpa-lead">
              En la milpa, tres cultivos crecen en el mismo monticulo y se apoyan:
            </p>
            <ul>
              <li><b>Maiz —</b> crece alto y da el palo para que el frijol se trepe.</li>
              <li><b>Frijol —</b> le pasa alimento a la tierra y la enriquece.</li>
              <li><b>Ahuyama —</b> tapa el suelo con sus hojas y guarda la humedad.</li>
            </ul>
            <p className="milpa-lead">
              Siembre los tres en cada monticulo, deles agua con la regadera y vea florecer la milpa.
            </p>
            <button type="button" className="milpa-cta" onClick={start}>Empezar a sembrar</button>
          </div>
        </div>
      )}

      {/* ── Overlay de cosecha lograda ────────────────────────────────── */}
      {phase === 'won' && (
        <div className="milpa-overlay">
          <div className="milpa-card">
            <h2>Milpa completa</h2>
            <p className="milpa-lead">
              Las tres hermanas dieron su cosecha juntas: el maiz sostuvo al
              frijol, el frijol nutrio la tierra y la ahuyama guardo la humedad.
              Asi se cuida un policultivo.
            </p>
            <button type="button" className="milpa-cta" onClick={reset}>Sembrar de nuevo</button>
          </div>
        </div>
      )}
    </div>
  );
}
