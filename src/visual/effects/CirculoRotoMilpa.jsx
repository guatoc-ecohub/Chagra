import React, { useEffect, useId, useRef, useState } from 'react';
import './circulo-roto-milpa.css';

/*
 * CirculoRotoMilpa — el círculo del compai en el login que SE ROMPE invadido
 * por la RAÍZ DE LA MILPA (spec 2026-08-27-login-compai-choreography, FASE 1).
 *
 * La abeja vive "encerrada" en el aro esmeralda top-central del login; a los
 * 9s de la coreografía sale, y este componente pone el momento ESPECTACULAR:
 * la semilla de maíz despierta dentro del círculo, las raíces de sostén
 * (los zancos rosados del maíz real) agarran el aro, la cabellera fasciculada
 * se derrama, las grietas se propagan por bordes DENTADOS y el aro se astilla
 * en placas cuyos filos calzan entre sí (fractura real, no gajos); dos
 * esquirlas vuelan, una queda colgando, y la plúmula del maíz se desenrolla en
 * la brecha. El círculo queda ROTO pero VIVO (line-boil, polen, brasas).
 *
 * Anatomía real del maíz (misma que LaminaMaiz.jsx): grano → raíces de sostén
 * en zanco + raíz fasciculada en cabellera + plúmula con hojas de masa.
 *
 * API (FASE 2 la cablea codex al segundo 9 de la coreografía):
 *   <CirculoRotoMilpa
 *     trigger={bool}          flanco de subida ⇒ arranca la ruptura (una vez)
 *     roto={bool}             montar directo en estado final roto (sin animar)
 *     onRupturaCompleta={fn}  brecha abierta (~2.25s): la abeja puede salir
 *     onAsentado={fn}         raíz asentada (~3.4s): plantar la tríada
 *     className={string}      clases extra sobre el wrapper
 *   >
 *     {lámina del compai — ranura centrada, opcional}
 *   </CirculoRotoMilpa>
 *
 * El componente dibuja TODO el orbe (vidrio interior + aro); al integrarlo se
 * reemplaza el aro estático del login (ring-muzo), no se superpone.
 * Reduced-motion: salta al fotograma final digno y dispara los callbacks.
 */

/* Momentos del timeline (deben calzar con circulo-roto-milpa.css) */
export const CRM_RUPTURA_MS = 2250;
export const CRM_ASENTADO_MS = 3400;

/* ── Geometría ─────────────────────────────────────────────────────────────
   Centro (160,160); aro de radio exterior 104 / interior 92. El viewBox va
   ceñido al aro (52..268) y el desborde (raíces colgantes, esquirlas volando)
   queda visible vía overflow: visible. */
const CX = 160;
const CY = 160;
const R_EXT = 104;
const R_INT = 92;
const RAD = Math.PI / 180;

const P = (a, r) => [CX + r * Math.cos(a * RAD), CY + r * Math.sin(a * RAD)];
const fxy = ([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`;
const pp = (a, r) => fxy(P(a, r));

/* Bordes de fractura: ángulo + jitter angular del filo dentado (5 puntos de
   afuera hacia adentro; extremos en 0 para empalmar con los arcos). El MISMO
   filo se usa en los dos fragmentos vecinos ⇒ la costura es invisible hasta
   que se separan, y al separarse los dientes calzan como fractura real. */
const BORDES = [
  { a: 20, jit: [0, 2.2, -1.8, 1.4, 0] },
  { a: 55, jit: [0, -1.9, 2.3, -1.2, 0] },
  { a: 125, jit: [0, 1.6, -2.4, 1.8, 0] },
  { a: 175, jit: [0, -2.2, 1.5, -1.7, 0] },
  { a: 225, jit: [0, 1.9, -1.4, 2.1, 0] },
  { a: 262, jit: [0, -1.6, 2.5, -1.9, 0] },
  { a: 288, jit: [0, 2.4, -2.0, 1.2, 0] },
  { a: 310, jit: [0, -1.4, 1.9, -2.3, 0] },
  { a: 330, jit: [0, 1.7, -2.2, 1.6, 0] },
];
const R_FILO = [R_EXT, 100.2, 96.8, 94.4, R_INT];

/** Puntos del filo dentado del borde k (opcionalmente con el ángulo corrido
 *  una vuelta, para el fragmento que cruza 360°). */
function filo(k, aOverride) {
  const ang = aOverride ?? BORDES[k].a;
  return R_FILO.map((r, i) => P(ang + BORDES[k].jit[i], r));
}

/** Sector anular a1→a2 con los dos extremos dentados (la placa/astilla). */
function fragPath(b1, b2, a1, a2) {
  const zi = filo(b1, a1); // filo en el arranque, de afuera hacia adentro
  const zj = filo(b2, a2); // filo en el cierre
  let d = `M ${fxy(zi[0])} `;
  d += `A ${R_EXT} ${R_EXT} 0 0 1 ${fxy(zj[0])} `;
  for (let k = 1; k < zj.length; k += 1) d += `L ${fxy(zj[k])} `;
  d += `A ${R_INT} ${R_INT} 0 0 0 ${fxy(zi[zi.length - 1])} `;
  for (let k = zi.length - 2; k >= 1; k -= 1) d += `L ${fxy(zi[k])} `;
  return `${d}Z`;
}

/** Arcos de contorno del fragmento (exterior + interior), SIN los filos:
 *  el borde esmeralda se dibuja solo sobre los arcos para que las costuras
 *  dentadas sean invisibles mientras el círculo está íntegro. */
function fragBordes(a1, a2) {
  return (
    `M ${pp(a1, R_EXT)} A ${R_EXT} ${R_EXT} 0 0 1 ${pp(a2, R_EXT)} ` +
    `M ${pp(a1, R_INT)} A ${R_INT} ${R_INT} 0 0 1 ${pp(a2, R_INT)}`
  );
}

/* Fragmentos que QUEDAN (desplazados por la raíz): desplazamiento a lo largo
   de la normal exterior + rotación propia + extra [dx,dy] (la astilla
   colgante del noroccidente se descuelga un poco más). */
const FRAGMENTOS = [
  { b1: 0, b2: 1, a1: 20, a2: 55, disp: 3, rot: 3, extra: [0, 0] },
  { b1: 1, b2: 2, a1: 55, a2: 125, disp: 2.5, rot: -1, extra: [0, 1.5] },
  { b1: 2, b2: 3, a1: 125, a2: 175, disp: 4.5, rot: -4, extra: [0, 0] },
  { b1: 3, b2: 4, a1: 175, a2: 225, disp: 3.5, rot: -3, extra: [0, 0] },
  { b1: 4, b2: 5, a1: 225, a2: 262, disp: 8, rot: -10, extra: [0, 4] },
  { b1: 8, b2: 0, a1: 330, a2: 380, disp: 4, rot: 2, extra: [0, 0] },
];

/* Esquirlas del arco superior (262°..330°): la brecha por donde sale la
   abeja. Dos vuelan y se pierden; la tercera queda colgando del filo. */
const ESQUIRLAS = [
  { b1: 5, b2: 6, a1: 262, a2: 288, d1: 26, rot1: -50, d2: 36, rot2: -70, op2: 0, extra2: [0, -6] },
  { b1: 6, b2: 7, a1: 288, a2: 310, d1: 30, rot1: 65, d2: 42, rot2: 95, op2: 0, extra2: [4, -4] },
  { b1: 7, b2: 8, a1: 310, a2: 330, d1: 9, rot1: 22, d2: 9, rot2: 26, op2: 1, extra2: [2, 5] },
];

const FRAG_DATA = FRAGMENTOS.map((f) => {
  const m = ((f.a1 + f.a2) / 2) * RAD;
  return {
    d: fragPath(f.b1, f.b2, f.a1, f.a2),
    borde: fragBordes(f.a1, f.a2),
    vars: {
      '--dx': `${(f.disp * Math.cos(m) + f.extra[0]).toFixed(2)}px`,
      '--dy': `${(f.disp * Math.sin(m) + f.extra[1]).toFixed(2)}px`,
      '--rot': `${f.rot}deg`,
    },
  };
});

const ESQUIRLA_DATA = ESQUIRLAS.map((e) => {
  const m = ((e.a1 + e.a2) / 2) * RAD;
  return {
    d: fragPath(e.b1, e.b2, e.a1, e.a2),
    borde: fragBordes(e.a1, e.a2),
    vars: {
      '--dx1': `${(e.d1 * Math.cos(m)).toFixed(2)}px`,
      '--dy1': `${(e.d1 * Math.sin(m)).toFixed(2)}px`,
      '--rot1': `${e.rot1}deg`,
      '--dx2': `${(e.d2 * Math.cos(m) + e.extra2[0]).toFixed(2)}px`,
      '--dy2': `${(e.d2 * Math.sin(m) + e.extra2[1]).toFixed(2)}px`,
      '--rot2': `${e.rot2}deg`,
      '--op2': `${e.op2}`,
    },
  };
});

/* Grietas visibles antes de la ruptura: el mismo filo dentado + una ramita
   corta (las grietas se dibujan EXACTAMENTE donde el aro va a partirse). */
const GRIETA_DATA = BORDES.map((b, k) => {
  const pts = filo(k);
  let d = `M ${fxy(pts[0])} `;
  for (let i = 1; i < pts.length; i += 1) d += `L ${fxy(pts[i])} `;
  const rama = P(b.a + b.jit[2] * 2.4, 99.5);
  d += `M ${fxy(pts[2])} L ${fxy(rama)}`;
  return { d, delay: 0.85 + k * 0.05 };
});

/* ── La milpa (anatomía de LaminaMaiz llevada al orbe) ────────────────────
   Corona del grano en (160,241), justo sobre el piso interior del círculo. */

/* Raíces de SOSTÉN (zancos): trepan desde el grano y agarran el aro
   atravesando las grietas de 125°, 55°, 90° (colgando) y 175°. */
const SOSTEN = [
  `M 154 240 C 140 243, ${pp(118, 68)}, ${pp(125, 90)} C ${pp(126.5, 97)}, ${pp(128, 103)}, ${pp(130, 107)}`,
  `M 166 240 C 180 243, ${pp(62, 68)}, ${pp(55, 90)} C ${pp(53.5, 97)}, ${pp(52, 103)}, ${pp(50, 107)}`,
  `M 160 242 C 156 254, 158 264, ${pp(94, 108)} C ${pp(95, 113)}, 156 284, 150 292`,
  `M 156 238 C 136 234, ${pp(196, 70)}, ${pp(182, 86)} C ${pp(178, 94)}, ${pp(176, 100)}, ${pp(174, 106)}`,
];

/* Cabellera fasciculada: se derrama del grano, cruza la banda del fondo y
   cuelga por fuera del aro roto. */
const CABELLERA = [
  { x0: -7, a: 118, r: 116, curva: -14 },
  { x0: -5, a: 108, r: 122, curva: -8 },
  { x0: -2, a: 99, r: 128, curva: -4 },
  { x0: 0, a: 91, r: 132, curva: 3 },
  { x0: 2, a: 83, r: 126, curva: 6 },
  { x0: 5, a: 73, r: 120, curva: 10 },
  { x0: 7, a: 63, r: 114, curva: 16 },
  { x0: 3, a: 90, r: 118, curva: -18 },
].map(({ x0, a, r, curva }) => {
  const [ex, ey] = P(a, r);
  return `M ${160 + x0} 242 C ${160 + x0 + curva} 252, ${(ex + curva).toFixed(2)} ${(ey - 18).toFixed(2)}, ${ex.toFixed(2)} ${ey.toFixed(2)}`;
});

/* Raicillas de segundo orden sobre algunas hebras */
const RAICILLAS = [1, 3, 5].map((i) => {
  const { a, r, curva } = [
    { a: 108, r: 122, curva: -8 },
    { a: 91, r: 132, curva: 3 },
    { a: 73, r: 120, curva: 10 },
  ][[1, 3, 5].indexOf(i)];
  const [bx, by] = P(a + curva * 0.15, r * 0.82);
  return `M ${bx.toFixed(2)} ${by.toFixed(2)} q ${(curva * 0.4).toFixed(1)} 6, ${(curva * 0.55).toFixed(1)} 12`;
});

/* Raíces INVASORAS (segunda ola, tras la ruptura): entran por las grietas de
   175° y 20° y se abrazan a la pared interior; otras dos cruzan POR ENCIMA de
   la banda rota del fondo y cuelgan afuera. */
const INVASORAS = [
  `M ${pp(179, 122)} C ${pp(177, 112)}, ${pp(175, 104)}, ${pp(174, 94)} C ${pp(196, 84)}, ${pp(214, 82)}, ${pp(224, 86)} C ${pp(228, 88)}, ${pp(230, 92)}, ${pp(229, 96)}`,
  `M ${pp(26, 124)} C ${pp(23, 114)}, ${pp(21, 106)}, ${pp(20, 96)} C ${pp(8, 86)}, ${pp(354, 84)}, ${pp(344, 88)}`,
  `M 157 240 C 150 250, ${pp(103, 96)}, ${pp(104, 110)} C ${pp(104.5, 116)}, 143 282, 140 288`,
  `M 163 240 C 172 250, ${pp(77, 96)}, ${pp(76, 110)} C ${pp(75.5, 116)}, 180 282, 184 286`,
];

/* Chispas + terrones de la ruptura (radiales desde la banda, sesgo arriba) */
const PARTICULAS = [
  { a: 268, r: 100, d: 34, s: 2.4, c: '#6ee7b7' },
  { a: 278, r: 102, d: 44, s: 1.6, c: '#a7f3d0' },
  { a: 286, r: 98, d: 30, s: 2.8, c: '#34d399' },
  { a: 295, r: 101, d: 46, s: 1.4, c: '#6ee7b7' },
  { a: 303, r: 99, d: 38, s: 2.0, c: '#a7f3d0' },
  { a: 312, r: 102, d: 28, s: 1.8, c: '#b08a5a' },
  { a: 322, r: 100, d: 24, s: 1.5, c: '#8a6b40' },
  { a: 255, r: 100, d: 22, s: 1.6, c: '#b08a5a' },
  { a: 240, r: 99, d: 16, s: 1.3, c: '#6ee7b7' },
  { a: 128, r: 100, d: 14, s: 1.5, c: '#8a6b40' },
  { a: 58, r: 101, d: 12, s: 1.4, c: '#b08a5a' },
  { a: 176, r: 100, d: 13, s: 1.3, c: '#6ee7b7' },
].map((q, i) => {
  const [cx, cy] = P(q.a, q.r);
  return {
    cx: cx.toFixed(2),
    cy: cy.toFixed(2),
    s: q.s,
    c: q.c,
    vars: {
      '--dx': `${(q.d * Math.cos(q.a * RAD)).toFixed(2)}px`,
      '--dy': `${(q.d * Math.sin(q.a * RAD) - 6).toFixed(2)}px`,
      '--d': `${(1.6 + i * 0.018).toFixed(3)}s`,
    },
  };
});

/* Brasas verdes en las puntas rotas del aro */
const BRASAS = [P(262, 98), P(310, 98), P(125, 98)];

/* Paleta: aro esmeralda muzo del login; raíz del maíz real (sostén rosado,
   cabellera crema, grano oro — misma familia que LaminaMaiz). */
const ARO_FILL = 'rgba(16, 185, 129, 0.30)';
const ARO_BORDE = 'rgba(52, 211, 153, 0.9)';
const SOSTEN_SOMBRA = '#7c4a35';
const SOSTEN_LUZ = '#cf8f6b';
const CREMA = '#e6d5ab';
const CREMA_2 = '#d3bf8f';
const TIERRA_OSC = '#33281a';
const TIERRA_RIM = '#7a5a34';
const GRANO = '#d8a93f';
const GRANO_OSC = '#b0822a';
const VERDE_TALLO_OSC = '#55702c';
const VERDE_TALLO = '#7c9a3e';
const VERDE_HOJA = '#7aa23f';
const VERDE_HOJA_LUZ = '#9dbf55';
const VERDE_HOJA_BORDE = '#3f5620';

/* Tres frutos compactos, uno por hermana visible del dibujo. Son formas SVG
   propias del mismo lenguaje de la lámina, no un asset nuevo: el gate puede
   contar exactamente los tres nodos que deben quedar legibles. */
const FRUTOS = [
  { id: 'maiz', cx: 132, cy: 215, rx: 7, ry: 10, fill: GRANO, stroke: GRANO_OSC, delay: '2.2s' },
  { id: 'frijol', cx: 160, cy: 190, rx: 6, ry: 9, fill: '#a8443a', stroke: '#71352f', delay: '2.34s' },
  { id: 'calabaza', cx: 191, cy: 216, rx: 8, ry: 7, fill: '#d98b3c', stroke: '#9a5d2c', delay: '2.48s' },
];

export default function CirculoRotoMilpa({
  trigger = false,
  roto = false,
  onRupturaCompleta,
  onAsentado,
  milpaScale = 1.3,
  className,
  children,
}) {
  const [fase, setFase] = useState(roto ? 'roto' : 'quieta');
  const disparado = useRef(false);
  const timers = useRef([]);

  useEffect(() => {
    if (!trigger || roto || disparado.current) return;
    disparado.current = true;
    // El flanco de subida del trigger arranca la coreografía. La fase se
    // agenda en un timer (nunca setState síncrono dentro del effect) y queda
    // latcheada: bajar el trigger después no reinicia nada.
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const tRuptura = reduce ? 350 : CRM_RUPTURA_MS;
    const tAsentado = reduce ? 600 : CRM_ASENTADO_MS;
    const timerIds = [
      setTimeout(() => setFase(reduce ? 'roto' : 'activa'), 0),
      setTimeout(() => onRupturaCompleta?.(), tRuptura),
      setTimeout(() => onAsentado?.(), tAsentado),
    ];
    timers.current.push(...timerIds);

    // React Strict Mode monta, desmonta y vuelve a montar los efectos en
    // desarrollo. El cleanup debe cancelar SOLO esta ejecución y liberar el
    // latch para que el segundo montaje reprograme la coreografía.
    return () => {
      timerIds.forEach(clearTimeout);
      timers.current = timers.current.filter((id) => !timerIds.includes(id));
      disparado.current = false;
    };
  }, [trigger, roto, onRupturaCompleta, onAsentado]);

  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glowId = `crm-glow-${uid}`;
  const flashId = `crm-flashg-${uid}`;
  const granoGlowId = `crm-granog-${uid}`;

  const faseClase =
    fase === 'activa' ? 'crm-activa' : fase === 'roto' ? 'crm-roto' : '';
  const [flashCx, flashCy] = P(286, 96);

  return (
    <div
      className={['crm-wrap', faseClase, className].filter(Boolean).join(' ')}
      style={{ '--crm-milpa-scale': milpaScale }}
      data-fase={fase}
      data-testid="circulo-roto-milpa"
    >
      <svg
        className="crm-svg"
        viewBox="52 52 216 216"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="3.2"
              floodColor="#10b981"
              floodOpacity="0.55"
            />
          </filter>
          <radialGradient id={flashId}>
            <stop offset="0%" stopColor="#ecfdf5" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#34d399" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={granoGlowId}>
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Vidrio interior del orbe (se disuelve con la ruptura) */}
        <circle className="crm-vidrio" cx={CX} cy={CY} r={R_INT} fill="rgba(15, 23, 42, 0.9)" />

        {/* EL ARO: placas con filos dentados que calzan (círculo íntegro
            mientras nadie las separa) */}
        <g className="crm-anillo" filter={`url(#${glowId})`}>
          {FRAG_DATA.map((f, i) => (
            <g key={`frag-${i}`} className="crm-frag" style={f.vars}>
              <path d={f.d} fill={ARO_FILL} />
              <path
                d={f.borde}
                fill="none"
                stroke={ARO_BORDE}
                strokeWidth="1.2"
                strokeLinecap="butt"
              />
            </g>
          ))}
          {ESQUIRLA_DATA.map((e, i) => (
            <g key={`esq-${i}`} className="crm-esquirla" style={e.vars}>
              <path d={e.d} fill={ARO_FILL} />
              <path
                d={e.borde}
                fill="none"
                stroke={ARO_BORDE}
                strokeWidth="1.2"
                strokeLinecap="butt"
              />
            </g>
          ))}
        </g>

        {/* Aro fantasma: la energía acumulándose antes del estallido */}
        <circle
          className="crm-aro-pulso"
          cx={CX}
          cy={CY}
          r={(R_EXT + R_INT) / 2}
          fill="none"
          stroke="#34d399"
          strokeWidth="11"
        />

        {/* GRIETAS dentadas (se esfuman al abrirse la fractura de verdad):
            trazo oscuro que "corta" el aro + gemelo de luz caliente al lado,
            para que la propagación se LEA antes del estallido */}
        <g fill="none" strokeLinecap="round">
          {GRIETA_DATA.map((g, i) => (
            <path
              key={`grieta-${i}`}
              className="crm-trazo crm-grieta"
              style={{ '--d': `${g.delay.toFixed(2)}s`, '--dur': '0.26s' }}
              d={g.d}
              pathLength={1}
              stroke="#031712"
              strokeWidth="2.4"
              strokeOpacity="0.95"
            />
          ))}
          {GRIETA_DATA.map((g, i) => (
            <path
              key={`grieta-luz-${i}`}
              className="crm-trazo crm-grieta"
              style={{ '--d': `${(g.delay + 0.05).toFixed(2)}s`, '--dur': '0.26s' }}
              d={g.d}
              pathLength={1}
              stroke="#d1fae5"
              strokeWidth="0.8"
              strokeOpacity="0.65"
            />
          ))}
        </g>

        {/* LA MILPA: tierra, grano, raíces, brote */}
        <g className="crm-milpa">
          {/* Frutos claros de las tres plantas de la milpa. */}
          <g className="crm-frutos">
            {FRUTOS.map((fruto) => (
              <g
                key={fruto.id}
                className="crm-fruto"
                style={{ '--d': fruto.delay }}
                data-crm-fruto={fruto.id}
                data-crm-planta={fruto.id}
              >
                <ellipse
                  cx={fruto.cx}
                  cy={fruto.cy}
                  rx={fruto.rx}
                  ry={fruto.ry}
                  fill={fruto.fill}
                  stroke={fruto.stroke}
                  strokeWidth="1.4"
                />
                <path
                  d={`M ${fruto.cx - 2} ${fruto.cy - fruto.ry + 2} q 2 3 4 0`}
                  fill="none"
                  stroke="#f8e7b0"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  opacity="0.8"
                />
              </g>
            ))}
          </g>
          {/* Montículo de tierra que se parte en dos */}
          <g className="crm-monticulo crm-mont-izq">
            <path
              d="M 132 252 Q 143 237 160 235 L 160 252 Z"
              fill={TIERRA_OSC}
              stroke={TIERRA_RIM}
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </g>
          <g className="crm-monticulo crm-mont-der">
            <path
              d="M 188 252 Q 177 237 160 235 L 160 252 Z"
              fill={TIERRA_OSC}
              stroke={TIERRA_RIM}
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </g>

          {/* Polvo al partirse la tierra y al romperse el aro */}
          <ellipse className="crm-polvo" style={{ '--d': '0.32s' }} cx="150" cy="240" rx="7" ry="4" fill="#a08a62" />
          <ellipse className="crm-polvo" style={{ '--d': '0.4s' }} cx="171" cy="238" rx="6" ry="3.5" fill="#a08a62" />
          <ellipse className="crm-polvo" style={{ '--d': '1.64s' }} cx={flashCx.toFixed(1)} cy={(flashCy + 8).toFixed(1)} rx="8" ry="5" fill="#9fc9b4" />

          {/* El grano de maíz (de aquí nace la mata) + su halo */}
          <g className="crm-grano">
            <circle cx="160" cy="241" r="12" fill={`url(#${granoGlowId})`} />
            <path
              d="M 153 236 C 158 231, 166 232, 169 238 C 171 244, 168 249, 161 250 C 154 251, 150 245, 153 236 Z"
              fill={GRANO}
              stroke={GRANO_OSC}
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <path d="M 158 240 C 156 243, 157 246, 160 248" fill="none" stroke="#e9d9a6" strokeWidth="1.4" strokeLinecap="round" />
          </g>

          {/* Raíces de SOSTÉN: sombra ancha + luz rosada encima */}
          <g fill="none" strokeLinecap="round">
            {SOSTEN.map((d, i) => (
              <path
                key={`ss-${i}`}
                className="crm-trazo"
                style={{ '--d': `${(0.35 + i * 0.1).toFixed(2)}s`, '--dur': '0.8s' }}
                d={d}
                pathLength={1}
                stroke={SOSTEN_SOMBRA}
                strokeWidth="5"
              />
            ))}
            {SOSTEN.map((d, i) => (
              <path
                key={`sl-${i}`}
                className="crm-trazo"
                style={{ '--d': `${(0.35 + i * 0.1).toFixed(2)}s`, '--dur': '0.8s' }}
                d={d}
                pathLength={1}
                stroke={SOSTEN_LUZ}
                strokeWidth="2.8"
              />
            ))}
          </g>

          {/* Cabellera fasciculada + raicillas de segundo orden */}
          <g fill="none" strokeLinecap="round">
            {CABELLERA.map((d, i) => (
              <path
                key={`cab-${i}`}
                className="crm-trazo"
                style={{ '--d': `${(0.55 + i * 0.06).toFixed(2)}s`, '--dur': '0.7s' }}
                d={d}
                pathLength={1}
                stroke={CREMA}
                strokeWidth="1.6"
                opacity="0.9"
              />
            ))}
            {RAICILLAS.map((d, i) => (
              <path
                key={`rai-${i}`}
                className="crm-trazo"
                style={{ '--d': `${(1.0 + i * 0.09).toFixed(2)}s`, '--dur': '0.4s' }}
                d={d}
                pathLength={1}
                stroke={CREMA_2}
                strokeWidth="1.1"
                opacity="0.75"
              />
            ))}
          </g>

          {/* Segunda ola: raíces invasoras por las grietas y sobre la banda */}
          <g fill="none" strokeLinecap="round">
            {INVASORAS.map((d, i) => (
              <path
                key={`invs-${i}`}
                className="crm-trazo"
                style={{ '--d': `${(1.95 + i * 0.12).toFixed(2)}s`, '--dur': '0.8s' }}
                d={d}
                pathLength={1}
                stroke={SOSTEN_SOMBRA}
                strokeWidth="3.4"
              />
            ))}
            {INVASORAS.map((d, i) => (
              <path
                key={`invl-${i}`}
                className="crm-trazo"
                style={{ '--d': `${(1.95 + i * 0.12).toFixed(2)}s`, '--dur': '0.8s' }}
                d={d}
                pathLength={1}
                stroke={CREMA}
                strokeWidth="1.7"
              />
            ))}
          </g>

          {/* EL BROTE: tallo + hojas de masa que se desenrollan */}
          <g className="crm-hojas-vaiven">
            <path
              className="crm-trazo"
              style={{ '--d': '2s', '--dur': '0.5s' }}
              d="M 160 238 C 158.5 226, 161.5 214, 160 198"
              pathLength={1}
              fill="none"
              stroke={VERDE_TALLO_OSC}
              strokeWidth="4.2"
              strokeLinecap="round"
            />
            <path
              className="crm-trazo"
              style={{ '--d': '2.05s', '--dur': '0.5s' }}
              d="M 160 238 C 158.5 226, 161.5 214, 160 198"
              pathLength={1}
              fill="none"
              stroke={VERDE_TALLO}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* Hoja izquierda (masa, con vena) */}
            <g
              className="crm-hoja"
              style={{ '--d': '2.25s', '--curl': '-65deg', '--org': 'right bottom' }}
            >
              <path
                d="M 159.5 221 C 145 220, 131 213, 124 198 C 130 195, 140 198, 147 204 C 153 209, 158 215, 159.5 218 Z"
                fill={VERDE_HOJA}
                stroke={VERDE_HOJA_BORDE}
                strokeWidth="1"
                strokeLinejoin="round"
                opacity="0.95"
              />
              <path d="M 158 219 C 148 215, 137 209, 128 200" fill="none" stroke={VERDE_HOJA_BORDE} strokeWidth="0.8" opacity="0.7" />
            </g>
            {/* Hoja derecha (más larga, con luz) */}
            <g
              className="crm-hoja"
              style={{ '--d': '2.4s', '--curl': '65deg', '--org': 'left bottom' }}
            >
              <path
                d="M 160.5 212 C 175 210, 190 202, 198 186 C 191 183, 180 187, 172 194 C 166 199, 162 206, 160.5 209 Z"
                fill={VERDE_HOJA}
                stroke={VERDE_HOJA_BORDE}
                strokeWidth="1"
                strokeLinejoin="round"
                opacity="0.95"
              />
              <path
                d="M 163 208 C 172 203, 182 197, 192 188"
                fill="none"
                stroke={VERDE_HOJA_LUZ}
                strokeWidth="1.2"
                opacity="0.8"
              />
            </g>
            {/* Cogollo: la hojita central apuntando arriba */}
            <g
              className="crm-hoja"
              style={{ '--d': '2.55s', '--curl': '-40deg', '--org': 'center bottom' }}
            >
              <path
                d="M 160 199 C 156 192, 157 184, 161 177 C 163 184, 163 192, 160.5 199 Z"
                fill={VERDE_HOJA_LUZ}
                stroke={VERDE_HOJA_BORDE}
                strokeWidth="0.9"
                strokeLinejoin="round"
              />
            </g>
          </g>
        </g>

        {/* FLASH + onda expansiva de la ruptura */}
        <circle
          className="crm-flash"
          cx={flashCx.toFixed(1)}
          cy={flashCy.toFixed(1)}
          r="40"
          fill={`url(#${flashId})`}
        />
        <circle
          className="crm-onda"
          cx={CX}
          cy={CY}
          r={(R_EXT + R_INT) / 2}
          fill="none"
          stroke="#6ee7b7"
          strokeWidth="2"
        />

        {/* Chispas de esmeralda + terrones */}
        <g>
          {PARTICULAS.map((q, i) => (
            <circle
              key={`part-${i}`}
              className="crm-particula"
              style={q.vars}
              cx={q.cx}
              cy={q.cy}
              r={q.s}
              fill={q.c}
            />
          ))}
        </g>

        {/* Estado vivo final: brasas en las puntas rotas + motas de polen */}
        <g>
          {BRASAS.map((b, i) => (
            <circle
              key={`brasa-${i}`}
              className="crm-brasa"
              style={{ '--d': `${(2.75 + i * 0.9).toFixed(2)}s` }}
              cx={b[0].toFixed(1)}
              cy={b[1].toFixed(1)}
              r="1.9"
              fill="#34d399"
            />
          ))}
          <circle className="crm-mota" style={{ '--d': '3s', '--dx': '5px' }} cx="152" cy="212" r="1.5" fill="#fcd34d" />
          <circle className="crm-mota" style={{ '--d': '4.4s', '--dx': '-4px' }} cx="170" cy="204" r="1.3" fill="#fcd34d" />
          <circle className="crm-mota" style={{ '--d': '5.6s', '--dx': '3px' }} cx="196" cy="90" r="1.4" fill="#fcd34d" />
        </g>
      </svg>

      {children ? <div className="crm-centro">{children}</div> : null}
    </div>
  );
}
