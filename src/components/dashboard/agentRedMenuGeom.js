/**
 * agentRedMenuGeom — helpers geométricos PUROS del menú-red (AgentRedMenu).
 * Viven en módulo aparte (regla react-refresh: el componente solo exporta
 * componentes) y se testean directo en jsdom sin montar el motor rAF.
 */

const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * Relajación anticolisión: separa puntos a minD dentro del bound bd.
 * Mandato operador 2026-06-10 (nodos+etiquetas NO chocan con la red):
 *   - `ky` (<1) = métrica anisotrópica: la distancia vertical "cuenta menos",
 *     o sea exige MÁS separación en Y — las etiquetas viven DEBAJO del nodo
 *     y necesitan más aire vertical que horizontal.
 *   - `fixed` = obstáculos inmóviles (hub del grupo enfocado, yemas, miga):
 *     repelen a los puntos a `fixedD` (o a su radio propio `f.d`) pero no
 *     se mueven.
 */
export function relax(pts, minD, bd, opts = {}) {
  const ky = opts.ky ?? 1;
  const fixed = opts.fixed || [];
  const fixedD = opts.fixedD ?? minD;
  for (let it = 0; it < 48; it++) {
    let moved = false;
    for (let a = 0; a < pts.length; a++) {
      for (let b = a + 1; b < pts.length; b++) {
        let dx = pts[b].x - pts[a].x, dy = pts[b].y - pts[a].y;
        let d = Math.hypot(dx, dy * ky);
        if (d < minD) {
          moved = true;
          if (d < 1) { dx = 1; dy = 0; d = 1; }
          const push = (minD - d) / 2 / d;
          pts[a].x -= dx * push; pts[a].y -= dy * push;
          pts[b].x += dx * push; pts[b].y += dy * push;
        }
      }
      for (let f = 0; f < fixed.length; f++) {
        const fD = fixed[f].d ?? fixedD; /* radio propio del obstáculo */
        let dx = pts[a].x - fixed[f].x, dy = pts[a].y - fixed[f].y;
        let d = Math.hypot(dx, dy * ky);
        if (d < fD) {
          moved = true;
          if (d < 1) { dx = 1; dy = 0; d = 1; }
          const push = (fD - d) / d;
          pts[a].x += dx * push; pts[a].y += dy * push;
        }
      }
    }
    pts.forEach((p) => { p.x = clampN(p.x, bd.x0, bd.x1); p.y = clampN(p.y, bd.y0, bd.y1); });
    if (!moved) break;
  }
}

/**
 * Relajación de RECTÁNGULOS nodo+etiqueta (mandato CERO choque 2026-06-10).
 * pts[i] = centro del orbe; boxes[i] = { hw, hh, oy } — semiancho/semialto de
 * la caja COMBINADA (orbe + etiqueta debajo, medida real del DOM) y offset
 * vertical de su centro respecto al orbe. Dos cajas se separan empujando por
 * el EJE DE MENOR SOLAPE (los rects son disjuntos si despeja UN eje — mucho
 * menos restrictivo que la métrica radial, cabe en pantallas campesinas).
 * `fixed` = cajas inmóviles { x, y, hw, hh } (hub, miga, yemas, atenuados).
 */
export function relaxRects(pts, boxes, bd, opts = {}) {
  const fixed = opts.fixed || [];
  const pad = opts.pad ?? 6;
  for (let it = 0; it < 96; it++) {
    let moved = false;
    for (let a = 0; a < pts.length; a++) {
      for (let b = a + 1; b < pts.length; b++) {
        const dx = pts[b].x - pts[a].x;
        const dy = (pts[b].y + boxes[b].oy) - (pts[a].y + boxes[a].oy);
        const ox = boxes[a].hw + boxes[b].hw + pad - Math.abs(dx);
        const oy = boxes[a].hh + boxes[b].hh + pad - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          moved = true;
          if (ox < oy) {
            const s = (dx >= 0 ? 1 : -1) * ox / 2;
            pts[a].x -= s; pts[b].x += s;
          } else {
            const s = (dy >= 0 ? 1 : -1) * oy / 2;
            pts[a].y -= s; pts[b].y += s;
          }
        }
      }
      for (let f = 0; f < fixed.length; f++) {
        const dx = pts[a].x - fixed[f].x;
        const dy = (pts[a].y + boxes[a].oy) - fixed[f].y;
        const ox = boxes[a].hw + fixed[f].hw + pad - Math.abs(dx);
        const oy = boxes[a].hh + fixed[f].hh + pad - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          moved = true;
          /* BOUNDS-AWARE (deadlock medido 2026-06-10): si el empuje por el
             eje de menor solape cae fuera del bound, el clamp final lo anula
             y el punto queda encimado al obstáculo PARA SIEMPRE (oscilación
             nature/enfocado: hoja clavada en y1 contra el hub). En ese caso
             empujamos por el OTRO eje, que sí puede despejar. */
          const sx = (dx >= 0 ? 1 : -1) * ox, sy = (dy >= 0 ? 1 : -1) * oy;
          const xOk = pts[a].x + sx >= bd.x0 && pts[a].x + sx <= bd.x1;
          const yOk = pts[a].y + sy >= bd.y0 && pts[a].y + sy <= bd.y1;
          if ((ox < oy && xOk) || !yOk) pts[a].x = clampN(pts[a].x + sx, bd.x0, bd.x1);
          else pts[a].y += sy;
        }
      }
    }
    pts.forEach((p) => { p.x = clampN(p.x, bd.x0, bd.x1); p.y = clampN(p.y, bd.y0, bd.y1); });
    if (!moved) break;
  }
}

/**
 * Caja combinada orbe+etiqueta de un nodo de la red, medida del DOM real
 * (offsetWidth/Height); si el nodo aún está display:none (hojas plegadas),
 * estima por longitud de texto — coherente con --lblSize 12.5-13.5px y
 * max-width 128px.
 */
export function nodeRect(lblEl, orbHalf, soon = false) {
  let lw = lblEl ? lblEl.offsetWidth : 0;
  let lh = lblEl ? lblEl.offsetHeight : 0;
  if (!lw && lblEl && lblEl.closest) {
    /* hoja plegada (display:none): destapar, medir y volver a tapar en el
       mismo frame síncrono (sin paint intermedio) — la medida REAL evita
       los choques que daba estimar el wrapping (p. ej. "Agregar planta por
       foto" rompe en 3 líneas según la fuente del tema). */
    const host = lblEl.closest('.arm-node');
    if (host && host.style.display === 'none') {
      host.style.display = '';
      lw = lblEl.offsetWidth;
      lh = lblEl.offsetHeight;
      host.style.display = 'none';
    }
  }
  if (!lw) {
    const txt = ((lblEl && lblEl.textContent) || '').trim();
    const est = Math.round(txt.length * 7.4) + 18;
    lw = clampN(est, 58, 128);
    lh = (est > 128 ? 42 : 26) + (soon ? 20 : 0);
  }
  const top = -orbHalf - 2;
  const bottom = orbHalf + 4 + lh;
  return { hw: Math.max(orbHalf + 1, lw / 2), hh: (bottom - top) / 2, oy: (top + bottom) / 2 };
}

/**
 * Empaquetado por ESTANTES (shelf packing) — colocación determinista SIN
 * solapes para el overview micorriza: 7 nodos+etiquetas en un lienzo de
 * celular no caben con relajación sola (mínimos locales contra los bordes);
 * los estantes garantizan cero choque POR CONSTRUCCIÓN. El orden de entrada
 * (abanico desde la Ⓐ) se respeta: primer nodo arriba-izquierda, último
 * abajo-derecha — la diagonal viva de la micorriza. Filas alternas van
 * derecha→izquierda (zigzag orgánico, no grilla).
 * `jitter(seed)` rompe la rigidez sin romper el pad.
 */
export function shelfPack(boxes, band, opts = {}) {
  const pad = opts.pad ?? 8;
  const jit = opts.jitter ?? 0;
  const rnd = opts.rand || (() => 0.5);
  const width = band.x1 - band.x0;
  /* 1) partir en estantes por ancho */
  const shelves = [];
  let cur = [], curW = 0;
  boxes.forEach((b, i) => {
    const w = b.hw * 2 + pad;
    if (cur.length && curW + w > width) { shelves.push(cur); cur = []; curW = 0; }
    cur.push(i); curW += w;
  });
  if (cur.length) shelves.push(cur);
  /* 2) altura total y reparto del aire vertical sobrante */
  const shelfH = shelves.map((sh) => Math.max(...sh.map((i) => boxes[i].hh * 2)));
  const totalH = shelfH.reduce((a, b) => a + b, 0) + pad * (shelves.length - 1);
  const gap = Math.max(0, (band.y1 - band.y0 - totalH) / (shelves.length + 1));
  /* 3) colocar centros (zigzag en filas impares) */
  const pts = new Array(boxes.length);
  let yTop = band.y0 + gap;
  shelves.forEach((sh, s) => {
    const items = s % 2 ? [...sh].reverse() : sh;
    const sumW = sh.reduce((a, i) => a + boxes[i].hw * 2, 0);
    const lead = Math.max(0, (width - sumW - pad * (sh.length - 1)) / (sh.length + 1));
    let x = band.x0 + lead;
    items.forEach((i) => {
      const b = boxes[i];
      pts[i] = {
        x: x + b.hw + (rnd(i) - 0.5) * jit,
        y: yTop + b.hh - b.oy + (rnd(i + 50) - 0.5) * jit * 0.6,
      };
      x += b.hw * 2 + pad + lead;
    });
    yTop += shelfH[s] + pad + gap;
  });
  return pts;
}

/**
 * Escalera del ÁRBOL (nature): filas copa→base alternando columna izquierda/
 * derecha del tronco. Las columnas opuestas nunca chocan en X (los orbes
 * flanquean el tronco); dentro de la MISMA columna (vecino = fila r-2) el
 * paso vertical respeta las cajas reales (etiqueta debajo) — cero choque
 * por construcción. Si el total excede el suelo, comprime proporcional.
 * Devuelve array de y por índice de nodo (i mayor = copa).
 */
export function treeLadder(boxes, n, y0, y1, pad = 6) {
  const ys = new Array(n);
  const step = n > 1 ? (y1 - y0) / (n - 1) : 0;
  for (let r = 0; r < n; r++) {
    const i = n - 1 - r;        /* fila 0 = copa */
    const prev = i + 2;          /* vecino de la misma columna, arriba */
    let y = y0 + r * step;
    if (prev < n && ys[prev] != null) {
      const need = boxes[prev].hh + boxes[i].hh + pad +
        (boxes[prev].oy - boxes[i].oy);
      y = Math.max(y, ys[prev] + need);
    }
    ys[i] = y;
  }
  const bottom = ys[0] ?? y0;
  if (bottom > y1 && bottom > y0) {
    const k = (y1 - y0) / (bottom - y0);
    for (let i = 0; i < n; i++) ys[i] = y0 + (ys[i] - y0) * k;
  }
  return ys;
}

/**
 * Anillo proporcional alrededor del hub (hojas del grupo enfocado): reparte
 * los ángulos del arco [a0,a1] según el ANCHO ANGULAR real de cada caja
 * (cajas anchas reciben más arco) — las hojas no se montan entre sí ni
 * sobre el grupo del centro. Pulir después con relaxRects.
 */
export function ringPlace(center, boxes, opts) {
  const { a0, a1, rx, ry, pad = 8 } = opts;
  const rAvg = (rx + ry) / 2;
  const widths = boxes.map((b) => {
    const half = Math.hypot(b.hw, b.hh) + pad;
    return 2 * Math.asin(Math.min(0.95, half / Math.max(1, rAvg)));
  });
  const total = widths.reduce((a, b) => a + b, 0);
  const span = a1 - a0;
  const scale = total > 0 ? Math.min(1.25, span / total) : 1;
  const lead = Math.max(0, (span - total * scale) / 2);
  let cum = a0 + lead;
  return boxes.map((b, i) => {
    const a = cum + widths[i] * scale / 2;
    cum += widths[i] * scale;
    return { x: center.x + Math.cos(a) * rx, y: center.y + Math.sin(a) * ry };
  });
}

/**
 * Verificación de CERO choque (mandato 2026-06-10): ¿alguna caja nodo+etiqueta
 * se intersecta con otra o con un obstáculo fijo? relaxRects puede oscilar sin
 * converger cuando el sistema queda sobre-restringido (hub + orbes atenuados +
 * bordes de un celular) — esta función lo DETECTA para reintentar la colocación
 * con radios mayores / menos obstáculos, en vez de aceptar un encime visible.
 */
export function rectsOverlap(pts, boxes, fixed = [], pad = 0) {
  const rect = (p, b) => ({
    x0: p.x - b.hw, x1: p.x + b.hw,
    y0: p.y + b.oy - b.hh, y1: p.y + b.oy + b.hh,
  });
  const hit = (A, B) =>
    Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0) > pad &&
    Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0) > pad;
  const rs = pts.map((p, i) => rect(p, boxes[i]));
  for (let a = 0; a < rs.length; a++) {
    for (let b = a + 1; b < rs.length; b++) if (hit(rs[a], rs[b])) return true;
    for (let f = 0; f < fixed.length; f++) {
      const F = {
        x0: fixed[f].x - fixed[f].hw, x1: fixed[f].x + fixed[f].hw,
        y0: fixed[f].y - fixed[f].hh, y1: fixed[f].y + fixed[f].hh,
      };
      if (hit(rs[a], F)) return true;
    }
  }
  return false;
}

/**
 * Colocación de hojas GARANTIZADA sin choque visible (anillo + relax +
 * verificación + reintento). En un celular el sistema completo (hub + miga +
 * yemas/orbes atenuados + bordes) puede ser infactible y relaxRects oscila;
 * medido 2026-06-10: nature/grupo-enfocado dejaba la hoja encimada al hub.
 * Estrategia por intentos:
 *   1º: todos los obstáculos (hard + soft) — el ideal.
 *   2º+: SOLO los hard (hub/miga: lo que el usuario está leyendo) y radios
 *        crecientes — los soft (orbes atenuados ~25% opacidad, sin etiqueta)
 *        son sacrificables ANTES que permitir un encime de nodos/texto vivos.
 * Devuelve el primer arreglo verificado sin intersección (rectsOverlap);
 * si ninguno verifica, el último (mejor esfuerzo, radios máximos).
 */
export function placeLeavesNoClash(center, boxes, opts) {
  const { a0, a1, rx, ry, bd, hard = [], soft = [], pad = 6 } = opts;
  let pts = null, kx = 1, ky = 1;
  for (let t = 0; t < 4; t++) {
    const fixed = t === 0 ? [...hard, ...soft] : hard;
    pts = ringPlace(center, boxes, { a0, a1, rx: rx * kx, ry: ry * ky, pad: 8 });
    relaxRects(pts, boxes, bd, { pad, fixed });
    if (!rectsOverlap(pts, boxes, hard, 2)) return pts;
    kx *= 1.18; ky *= 1.12;
  }
  return pts;
}

/**
 * Punto sobre el borde del botón Ⓐ (radio r desde el centro c, mirando a
 * target). Es el origen de cada trazo: el trazo NACE dentro del disco del
 * botón (mismo color que su relleno) → la unión raíz↔red queda soldada,
 * sin gap ni borde (continuidad pedida por el operador 2026-06-10).
 * Si el destino está más cerca que r, no lo sobrepasa (clamp, sin NaN).
 */
export function rimPoint(c, r, target) {
  const dx = target.x - c.x, dy = target.y - c.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: c.x, y: c.y };
  const t = Math.min(r, len) / len;
  return { x: c.x + dx * t, y: c.y + dy * t };
}
