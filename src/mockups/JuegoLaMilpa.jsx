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
  return (
    <g>
      <g className="milpa-sun-rays" style={{ transformOrigin: '150px 120px' }}>
        {Array.from({ length: 12 }, (_, k) => {
          const a = (k * Math.PI) / 6;
          const x1 = 150 + Math.cos(a) * 62;
          const y1 = 120 + Math.sin(a) * 62;
          const x2 = 150 + Math.cos(a) * 92;
          const y2 = 120 + Math.sin(a) * 92;
          return (
            <line key={k} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={C.rayo} strokeWidth="9" strokeLinecap="round" />
          );
        })}
      </g>
      <g className="milpa-sun-core" style={{ transformOrigin: '150px 120px' }}>
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

function Maiz({ cx, stage, grow, droop }) {
  if (stage === 0) return null;
  const h = 46 + grow * 2.05; // 46..251
  const topY = GROUND_Y - h;
  const bend = droop ? 16 : 6;
  const leaves = [];
  const nLeaves = stage === 1 ? 2 : stage === 2 ? 4 : 5;
  for (let k = 0; k < nLeaves; k++) {
    const t = 0.25 + (k / nLeaves) * 0.6;
    const ly = GROUND_Y - h * t;
    const dir = k % 2 === 0 ? 1 : -1;
    const len = 30 + (1 - t) * 26;
    leaves.push(
      <g key={k}>
        <path d={leafPath(cx, ly, len, dir)} fill={C.maizHi} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d={`M ${cx} ${ly} q ${dir * len * 0.55} ${-len * 0.4} ${dir * len} ${-len * 0.42}`}
          fill="none" stroke={C.maiz} strokeWidth="3" strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g transform={`rotate(${droop ? 6 : 0} ${cx} ${GROUND_Y})`}>
      <g className="milpa-sway"><g className="milpa-pop" key={stage}>
        {/* tallo */}
        <path d={`M ${cx} ${GROUND_Y} C ${cx - bend} ${GROUND_Y - h * 0.5} ${cx + bend} ${GROUND_Y - h * 0.72} ${cx} ${topY}`}
          fill="none" stroke={INK} strokeWidth="11" strokeLinecap="round" />
        <path d={`M ${cx} ${GROUND_Y} C ${cx - bend} ${GROUND_Y - h * 0.5} ${cx + bend} ${GROUND_Y - h * 0.72} ${cx} ${topY}`}
          fill="none" stroke={C.maiz} strokeWidth="6" strokeLinecap="round" />
        {leaves}
        {stage >= 3 && (
          <g>
            {/* mazorca */}
            <ellipse cx={cx + 20} cy={GROUND_Y - h * 0.5} rx="15" ry="30" fill={C.mazorca}
              stroke={INK} strokeWidth="4.5" transform={`rotate(24 ${cx + 20} ${GROUND_Y - h * 0.5})`} />
            {[-16, -6, 4, 14].map((dy, idx) => (
              <line key={idx} x1={cx + 10} y1={GROUND_Y - h * 0.5 + dy} x2={cx + 30} y2={GROUND_Y - h * 0.5 + dy - 6}
                stroke={C.mazorcaDark} strokeWidth="2.5" strokeLinecap="round" />
            ))}
            <path d={`M ${cx + 8} ${GROUND_Y - h * 0.5 - 26} q 12 -6 20 2`} fill={C.maizHi} stroke={INK} strokeWidth="3.5" />
            {/* penacho (tassel) */}
            {[-10, 0, 10].map((dx, idx) => (
              <path key={idx} d={`M ${cx} ${topY} q ${dx} -14 ${dx * 1.4} -30`}
                fill="none" stroke={C.pluma} strokeWidth="4" strokeLinecap="round" />
            ))}
          </g>
        )}
      </g></g>
    </g>
  );
}

function Frijol({ cx, stage, grow, hasPole }) {
  if (stage === 0) return null;
  // Sin tutor (o recien nacido): mata baja tumbada en el suelo.
  if (!hasPole || stage === 1) {
    return (
      <g className="milpa-sway-soft"><g className="milpa-pop" key="flop">
        <path d={`M ${cx - 6} ${GROUND_Y} q -26 -10 -40 6`} fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
        <path d={`M ${cx - 6} ${GROUND_Y} q -26 -10 -40 6`} fill="none" stroke={C.frijol} strokeWidth="4" strokeLinecap="round" />
        <path d={leafPath(cx - 30, GROUND_Y - 2, 22, -1)} fill={C.frijolHi} stroke={INK} strokeWidth="3.5" />
        <path d={leafPath(cx - 12, GROUND_Y - 4, 20, 1)} fill={C.frijolHi} stroke={INK} strokeWidth="3.5" />
      </g></g>
    );
  }
  // Con tutor: enredadera que sube espiralando junto al maiz.
  const h = 60 + grow * 1.7; // sube casi tanto como el maiz
  const topY = GROUND_Y - h;
  const coils = [];
  const seg = 26;
  for (let y = GROUND_Y; y > topY; y -= seg) {
    const side = ((GROUND_Y - y) / seg) % 2 < 1 ? 1 : -1;
    coils.push(`Q ${cx + side * 22} ${y - seg * 0.5} ${cx} ${y - seg}`);
  }
  const coilPath = `M ${cx} ${GROUND_Y} ${coils.join(' ')}`;
  const leafYs = [0.3, 0.55, 0.78].filter((_, k) => k < (stage >= 3 ? 3 : 2));
  return (
    <g className="milpa-sway"><g className="milpa-pop" key={stage}>
      <path d={coilPath} fill="none" stroke={INK} strokeWidth="6.5" strokeLinecap="round" />
      <path d={coilPath} fill="none" stroke={C.frijol} strokeWidth="3.5" strokeLinecap="round" />
      {leafYs.map((t, k) => {
        const ly = GROUND_Y - h * t;
        const dir = k % 2 === 0 ? -1 : 1;
        return <path key={k} d={leafPath(cx + dir * 14, ly, 24, dir)} fill={C.frijolHi} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />;
      })}
      {stage >= 3 && (
        <g>
          {[[cx - 20, GROUND_Y - h * 0.62], [cx + 18, GROUND_Y - h * 0.44], [cx - 12, GROUND_Y - h * 0.8]].map(([px, py], k) => (
            <path key={k} d={`M ${px} ${py} q 10 6 6 26 q -6 6 -12 0 q -3 -18 6 -26 Z`}
              fill={C.vaina} stroke={INK} strokeWidth="3.5" transform={`rotate(${k % 2 ? 18 : -14} ${px} ${py})`} />
          ))}
          <circle cx={cx - 6} cy={GROUND_Y - h * 0.9} r="6" fill={C.flor} stroke={INK} strokeWidth="3" />
        </g>
      )}
    </g></g>
  );
}

function Ahuyama({ cx, stage, grow }) {
  if (stage === 0) return null;
  const spread = 18 + grow * 0.7; // que tanto se abren las hojas
  const y = GROUND_Y - 4;
  const nLeaves = stage === 1 ? 2 : stage === 2 ? 4 : 5;
  return (
    <g className="milpa-sway-soft"><g className="milpa-pop" key={stage}>
      {/* guia rastrera */}
      <path d={`M ${cx} ${GROUND_Y} q -${spread * 1.6} 8 -${spread * 2.4} 2`} fill="none" stroke={C.ahLeaf} strokeWidth="4" strokeLinecap="round" />
      <path d={`M ${cx} ${GROUND_Y} q ${spread * 1.6} 8 ${spread * 2.4} 2`} fill="none" stroke={C.ahLeaf} strokeWidth="4" strokeLinecap="round" />
      {Array.from({ length: nLeaves }, (_, k) => {
        const dir = k % 2 === 0 ? -1 : 1;
        const off = (Math.floor(k / 2) + 1) * spread;
        const lx = cx + dir * off;
        const size = 26 + (stage >= 2 ? 8 : 0);
        return (
          <g key={k}>
            <path d={`M ${lx} ${y} q ${-size} ${-size * 0.5} ${-size * 0.2} ${-size} q ${size * 0.6} ${-size * 0.25} ${size} ${size * 0.15} q ${size * 0.1} ${size * 0.6} ${-size * 0.8} ${size * 0.35} Z`}
              fill={k % 2 ? C.ahLeafHi : C.ahLeaf} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
            <path d={`M ${lx - size * 0.4} ${y - size * 0.2} l ${-size * 0.3} ${-size * 0.4}`} fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      })}
      {stage >= 3 && (
        <g transform={`translate(${cx + spread + 6} ${GROUND_Y - 4})`}>
          <ellipse cx="0" cy="0" rx="34" ry="26" fill={C.fruto} stroke={INK} strokeWidth="5" />
          {[-20, -8, 6, 20].map((dx, idx) => (
            <path key={idx} d={`M ${dx} -24 Q ${dx * 1.1} 0 ${dx} 24`} fill="none" stroke={C.frutoRib} strokeWidth="3" strokeLinecap="round" />
          ))}
          <path d="M 0 -25 q 6 -12 14 -14" fill="none" stroke={C.frutoStem} strokeWidth="6" strokeLinecap="round" />
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
            <circle cx="17" cy="6" r="4" fill={C.flor} stroke={INK} strokeWidth="2" />
          </svg>
          <div><b>Frijol</b><span>Le fija alimento a la tierra: enriquece el monticulo.</span></div>
        </div>
        <div className="milpa-chip">
          <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
            <ellipse cx="20" cy="24" rx="10" ry="7" fill={C.fruto} stroke={INK} strokeWidth="3" />
            <path d="M 14 20 q -8 -6 -2 -12 q 6 2 4 12 Z" fill={C.ahLeafHi} stroke={INK} strokeWidth="2.5" />
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
