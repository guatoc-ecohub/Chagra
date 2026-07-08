/**
 * organico.js — geometría viva del organismo de escucha ("la semilla que
 * despierta"). Genera formas ORGÁNICAS deterministas (misma semilla → misma
 * criatura, nada aleatorio entre renders):
 *
 *  - blobPath(): membranas cerradas tipo célula/amiba (Catmull-Rom → Bézier),
 *    para que la silueta de la criatura NO sea un círculo de máquina.
 *  - generarRaices(): raíces curvas asimétricas que brotan del corazón; cada
 *    una trae su path normalizado (pathLength=100) para crecer con el RMS
 *    real vía stroke-dashoffset, y la punta (tip) para encender el nodo.
 *
 * Solo matemática pura — cero DOM, cero side-effects. Lo comparten
 * EscuchaOverlay (criatura grande) y EscuchaFab (semilla en reposo).
 *
 * IMPORTANTE — español colombiano (tú/usted), NUNCA voseo argentino.
 */

/**
 * Membrana orgánica cerrada: N puntos alrededor del centro con radio
 * perturbado por seno (determinista por `seed`), suavizados Catmull-Rom a
 * Béziers cúbicas. El resultado parece célula viva, no polígono.
 *
 * @param {number} cx - centro x (unidades del viewBox).
 * @param {number} cy - centro y.
 * @param {number} r - radio base.
 * @param {number} [seed] - semilla de la perturbación (cambia la silueta).
 * @param {number} [wobble] - amplitud relativa de la perturbación (0..~0.25).
 * @returns {string} atributo `d` de un path SVG cerrado.
 */
export function blobPath(cx, cy, r, seed = 0, wobble = 0.14) {
  const N = 8;
  /** @type {{x: number, y: number}[]} */
  const pts = [];
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * Math.PI * 2;
    const rad = r * (1 + Math.sin(seed + i * 2.6) * wobble);
    pts.push({ x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad });
  }
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i - 1 + N) % N];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % N];
    const p3 = pts[(i + 2) % N];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return `${d} Z`;
}

/**
 * @typedef {Object} Rama
 * @property {string} d - path de la ramificación secundaria.
 * @property {{x: number, y: number}} tip - punta de la rama (nodo pequeño).
 */

/**
 * @typedef {Object} Raiz
 * @property {string} d - path de la raíz (curva en S del corazón hacia afuera).
 * @property {number} w - grosor del trazo (varía raíz a raíz, como en un ser vivo).
 * @property {{x: number, y: number}} tip - coordenada de la punta (nodo luminoso).
 * @property {Rama|null} rama - ramificación secundaria (la mitad de las raíces).
 */

/**
 * Raíces de luz: `n` tendrilos en curva de S que brotan del corazón hacia
 * afuera, con ángulo, largo, curvatura y grosor deterministas pero
 * ASIMÉTRICOS (una criatura, no un medidor radial); la mitad ramifica en un
 * tendril secundario, como raíz de verdad. Cada path se usa con
 * pathLength=100 para que el crecimiento (stroke-dashoffset) responda al
 * micrófono.
 *
 * @param {number} cx - centro x.
 * @param {number} cy - centro y.
 * @param {number} [n] - número de raíces.
 * @param {number} [r0] - radio donde nacen (borde del corazón).
 * @param {number} [escala] - factor de tamaño global (1 = criatura grande).
 * @returns {Raiz[]} raíces listas para pintar.
 */
export function generarRaices(cx, cy, n = 12, r0 = 50, escala = 1) {
  /** @type {Raiz[]} */
  const raices = [];
  for (let i = 0; i < n; i++) {
    // Ángulo con jitter determinista: rompe la simetría de compás.
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2 + Math.sin(i * 7.3) * 0.17;
    // Largo 46..~96 (patrón no periódico) y curvatura en S alternante.
    const len = (46 + ((i * 37) % 5) * 8 + Math.abs(Math.sin(i * 1.7)) * 16) * escala;
    const bend = Math.sin(i * 3.1 + 0.8) * 26 * escala;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const px = -dy;
    const py = dx;
    const nace = r0 * escala;
    const punto = (t, b) => ({
      x: cx + dx * (nace + len * t) + px * b,
      y: cy + dy * (nace + len * t) + py * b,
    });
    // Curva en S: los controles se cruzan de lado — la raíz serpentea.
    const p0 = punto(0, 0);
    const p1 = punto(0.3, bend * 0.55);
    const p2 = punto(0.72, -bend * 0.75);
    const p3 = punto(1, bend * 0.35);

    // Ramificación secundaria (raíces pares): brota a ~55% del recorrido.
    /** @type {Rama|null} */
    let rama = null;
    if (i % 2 === 0) {
      const bAng = ang + (i % 4 === 0 ? 0.82 : -0.82);
      const q0 = punto(0.55, -bend * 0.35);
      const largoRama = len * 0.45;
      const q2 = {
        x: q0.x + Math.cos(bAng) * largoRama,
        y: q0.y + Math.sin(bAng) * largoRama,
      };
      const q1 = {
        x: q0.x + Math.cos(bAng) * largoRama * 0.5 - Math.sin(bAng) * 7 * escala,
        y: q0.y + Math.sin(bAng) * largoRama * 0.5 + Math.cos(bAng) * 7 * escala,
      };
      rama = {
        d: `M ${q0.x.toFixed(1)} ${q0.y.toFixed(1)} Q ${q1.x.toFixed(1)} ${q1.y.toFixed(1)}, ${q2.x.toFixed(1)} ${q2.y.toFixed(1)}`,
        tip: q2,
      };
    }

    raices.push({
      d: `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}, ${p3.x.toFixed(1)} ${p3.y.toFixed(1)}`,
      w: 1.3 + ((i * 53) % 4) * 0.45,
      tip: p3,
      rama,
    });
  }
  return raices;
}
