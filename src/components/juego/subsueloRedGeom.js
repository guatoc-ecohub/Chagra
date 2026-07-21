/*
 * subsueloRedGeom — la GEOMETRÍA (2D, SVG) del subsuelo vivo del juego "Mundo
 * Subsuelo": la RED MICORRÍZICA que enlaza las raíces (el "wood wide web"), las
 * raíces profundas con sus NÓDULOS de fijación, el AGUA que se infiltra y los
 * MINERALES que suben a la mata. Todo en funciones PURAS y deterministas —
 * cero azar por frame, cero libs, corre headless y es testeable — que devuelven
 * cadenas `d` de path y puntos listos para pintar en el `<svg>` de la escena.
 *
 * ── LA BIOLOGÍA QUE ENSEÑA (grounded) ──────────────────────────────────────
 * Los hongos micorrízicos se enredan en las puntas de las raíces: la mata les
 * entrega AZÚCARES (carbono de la fotosíntesis) y ellos le devuelven FÓSFORO y
 * AGUA que su micelio busca lejos, donde la raíz sola no llega. Ese micelio no
 * se queda en una sola mata: CONECTA plantas distintas bajo tierra y REPARTE
 * nutrientes entre ellas — por eso el maíz, el fríjol y la ahuyama se ayudan por
 * debajo. Las leguminosas (el fríjol) suman NÓDULOS en sus raíces: bolitas donde
 * viven bacterias (Rhizobium) que fijan el nitrógeno del aire. La red se DAÑA
 * con la quema y la labranza que la parte; se CUIDA con coberturas y compost.
 *
 * ── EL MODELO ───────────────────────────────────────────────────────────────
 * El suelo es un GRAFO: NODOS (puntas de raíz donde ocurre el intercambio,
 * uniones del micelio y esporas) unidos por HILOS (hifas). Los hilos que cruzan
 * de una planta a OTRA son PUENTES: ahí se lee el reparto. La densidad de la red
 * crece con la VIDA del suelo (0–100): tierra cansada = pocos hilos apagados;
 * tierra viva = malla densa que respira.
 *
 * El sistema de coordenadas es el del viewBox de la escena (0..760 x 0..430),
 * con la superficie del suelo en y≈SUP y lo profundo hacia abajo (y creciente).
 */

/* PRNG determinista (mismo subsuelo en cada carga; nada de Math.random). */
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* Geometría de la vitrina de tierra (coords del viewBox de la escena). */
export const SUP = 155; // línea de la superficie del suelo
export const FONDO = 424; // fondo del corte
export const ANCHO = 760;

/*
 * LAS MATAS de la chagra, ancladas en la superficie. `x` es el pie del tallo;
 * `hondo` hasta dónde bajan las raíces; `raices` cuántas puntas principales.
 * `leguminosa` marca al fríjol (raíces con nódulos que fijan nitrógeno).
 * Alineadas con las matas verdes que la escena dibuja arriba.
 */
export const MATAS = [
  { id: 'maiz', x: 121, hondo: 232, raices: 3, esparce: 1.05, leguminosa: false },
  { id: 'frijol', x: 294, hondo: 196, raices: 3, esparce: 0.9, leguminosa: true },
  { id: 'ahuyama', x: 467, hondo: 176, raices: 3, esparce: 1.25, leguminosa: false },
  { id: 'arbol', x: 637, hondo: 258, raices: 4, esparce: 1.3, leguminosa: false },
];

/* Vida (0..100) → factor 0..1, saturado. */
export function vidaFactor(soilLife) {
  return Math.max(0, Math.min(1, soilLife / 100));
}

/*
 * SISTEMA DE RAÍCES de una mata: una raíz-madre que baja curvándose y se afina,
 * con raicillas laterales. Devuelve los `d` de path (para pintar el trazo) y las
 * PUNTAS (nodos de intercambio de la red micorrízica). Determinista por semilla.
 */
export function raicesDeMata(mata, seed) {
  const r = rng(seed);
  const bx = mata.x;
  const by = SUP + 2;
  const trazos = [];
  const puntas = [];
  const n = mata.raices;
  const anclaLateral = mata.leguminosa ? [] : null; // sitios para nódulos

  for (let i = 0; i < n; i++) {
    // cada raíz se abre a un lado; el árbol reparte más ancho
    const t = n === 1 ? 0 : i / (n - 1) - 0.5; // -0.5..0.5
    const spread = mata.esparce * (18 + r() * 10);
    const largo = mata.hondo * (0.72 + r() * 0.32);
    const dx = t * spread * 2 + (r() - 0.5) * 10;
    const x1 = bx + dx * 0.35;
    const y1 = by + largo * 0.42;
    const x2 = bx + dx * 0.85;
    const y2 = by + largo * 0.78;
    const xf = bx + dx + (r() - 0.5) * 14;
    const yf = by + largo;
    const ancho = mata.id === 'arbol' ? 7.5 : 5.5;
    trazos.push({
      d: `M${bx.toFixed(1)} ${by.toFixed(1)} C${x1.toFixed(1)} ${y1.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}, ${xf.toFixed(1)} ${yf.toFixed(1)}`,
      ancho,
    });
    puntas.push({ x: xf, y: yf, tipo: 'raiz', mata: mata.id, arbol: mata.id === 'arbol' });

    // una raicilla intermedia con su puntita (más sitios de intercambio)
    if (r() > 0.28) {
      const tm = 0.55 + r() * 0.15;
      // punto sobre la curva madre (Bézier cúbica aproximada por el medio)
      const mx = bx + dx * (0.55 * tm + 0.2);
      const my = by + largo * tm;
      const lx = mx + (t >= 0 ? 1 : -1) * (16 + r() * 20);
      const ly = my + 20 + r() * 22;
      trazos.push({
        d: `M${mx.toFixed(1)} ${my.toFixed(1)} Q${((mx + lx) / 2 + (r() - 0.5) * 10).toFixed(1)} ${((my + ly) / 2).toFixed(1)}, ${lx.toFixed(1)} ${ly.toFixed(1)}`,
        ancho: ancho * 0.5,
      });
      puntas.push({ x: lx, y: ly, tipo: 'raiz', mata: mata.id, arbol: mata.id === 'arbol' });
    }

    // guardamos anclas para los nódulos de la leguminosa (a lo largo de la madre)
    if (anclaLateral) {
      for (let k = 1; k <= 3; k++) {
        const tt = 0.3 + k * 0.18;
        anclaLateral.push({
          x: bx + dx * (0.5 * tt + 0.25) + (r() - 0.5) * 6,
          y: by + largo * tt,
        });
      }
    }
  }
  return { trazos, puntas, nodulos: anclaLateral || [] };
}

/* Todas las raíces + puntas + nódulos de la chagra. */
export function sistemaRaices(seed = 11) {
  const trazos = [];
  const puntasRaiz = [];
  const nodulos = [];
  MATAS.forEach((m, i) => {
    const { trazos: t, puntas, nodulos: nod } = raicesDeMata(m, seed + i * 37);
    trazos.push(...t);
    puntasRaiz.push(...puntas);
    nod.forEach((p) => nodulos.push({ ...p, r: 2.6 + ((i * 7 + p.x) % 3) * 0.7 }));
  });
  return { trazos, puntasRaiz, nodulos };
}

/*
 * NODOS LIBRES del micelio: uniones de hifas repartidas en el volumen ENTRE las
 * raíces (donde el hongo explora la tierra). Sesgo hacia la franja viva (ni muy
 * arriba ni muy al fondo). Algunas son ESPORAS (memoria del suelo). `n` escala
 * con la vida del suelo.
 */
export function nodosLibres(n, seed = 23) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = 46 + r() * (ANCHO - 92);
    const y = SUP + 44 + r() * (FONDO - SUP - 80);
    out.push({ x, y, tipo: r() > 0.82 ? 'espora' : 'micelio', mata: null });
  }
  return out;
}

/* Distancia al cuadrado (barata, para vecindad). */
function d2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/*
 * CONSTRUYE LA RED: dados los nodos (puntas de raíz + libres), teje los HILOS con
 * estructura legible (no un amasijo):
 *   1) cada nodo se une a sus `vecinos` más cercanos (grafo k-vecinos, dedup);
 *   2) se AÑADEN puentes explícitos entre matas vecinas (la punta de una mata ↔
 *      la punta más cercana de OTRA mata): son la lección (el reparto), y se
 *      marcan `puente` para brillar más.
 * Los hilos largísimos se descartan (evita cruces que ensucian la lectura).
 * Cada hilo trae su `d` (Bézier cuadrática con caída suave, orgánica).
 */
export function construirRed(puntasRaiz, libres, { vecinos = 2 } = {}, seed = 37) {
  const r = rng(seed);
  const nodos = [...puntasRaiz, ...libres];
  const maxLargo2 = 210 * 210;
  const clave = (i, j) => (i < j ? `${i}-${j}` : `${j}-${i}`);
  const vistos = new Set();
  const hilos = [];

  const empujar = (i, j, puente) => {
    if (i === j) return;
    const k = clave(i, j);
    if (vistos.has(k)) {
      if (puente) {
        const h = hilos.find((x) => x.k === k);
        if (h) h.puente = true;
      }
      return;
    }
    const a = nodos[i];
    const b = nodos[j];
    if (!puente && d2(a, b) > maxLargo2) return;
    vistos.add(k);
    // punto medio con caída (la hifa cuelga un poco) y ruido determinista
    const largo = Math.sqrt(d2(a, b));
    const mx = (a.x + b.x) / 2 + (r() - 0.5) * largo * 0.22;
    const my = (a.y + b.y) / 2 + largo * (0.05 + r() * 0.08);
    hilos.push({
      k,
      d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`,
      a,
      b,
      mid: { x: mx, y: my },
      puente: !!puente,
    });
  };

  // 1) k-vecinos: cada nodo con sus más cercanos
  for (let i = 0; i < nodos.length; i++) {
    const orden = [];
    for (let j = 0; j < nodos.length; j++) if (j !== i) orden.push([j, d2(nodos[i], nodos[j])]);
    orden.sort((p, q) => p[1] - q[1]);
    for (let v = 0; v < Math.min(vecinos, orden.length); v++) empujar(i, orden[v][0], false);
  }

  // 2) PUENTES entre matas vecinas: por cada par contiguo, une la punta de una
  //    con la punta más cercana de la otra (el reparto entre plantas distintas).
  const porMata = new Map();
  puntasRaiz.forEach((p, idx) => {
    if (!porMata.has(p.mata)) porMata.set(p.mata, []);
    porMata.get(p.mata).push(idx);
  });
  const matas = [...porMata.keys()];
  for (let pi = 0; pi < matas.length - 1; pi++) {
    const a = porMata.get(matas[pi]);
    const b = porMata.get(matas[pi + 1]);
    let mejor = null;
    let md = Infinity;
    for (const i of a) for (const j of b) {
      const dd = d2(nodos[i], nodos[j]);
      if (dd < md) { md = dd; mejor = [i, j]; }
    }
    if (mejor) empujar(mejor[0], mejor[1], true);
  }

  return { nodos, hilos };
}

/*
 * GOTAS DE AGUA que se infiltran: canales verticales ondulados desde la
 * superficie hacia abajo (percolación). Cada una trae su `d`, un `delay` para
 * escalonar la animación y su x/y de arranque. La cantidad escala con la vida
 * del suelo (tierra viva y esponjosa = más infiltración; tierra apretada, poca).
 */
export function gotasAgua(soilLife, seed = 53) {
  const r = rng(seed);
  const n = Math.max(2, Math.round(3 + vidaFactor(soilLife) * 6));
  const out = [];
  for (let i = 0; i < n; i++) {
    const x0 = 60 + (i + r() * 0.6) * ((ANCHO - 120) / n);
    const y0 = SUP + 4;
    const largo = 60 + r() * 120;
    // canal ondulado: dos curvas encadenadas que serpentean al bajar
    const x1 = x0 + (r() - 0.5) * 26;
    const y1 = y0 + largo * 0.5;
    const x2 = x0 + (r() - 0.5) * 30;
    const y2 = y0 + largo;
    out.push({
      d: `M${x0.toFixed(1)} ${y0.toFixed(1)} Q${(x0 + (r() - 0.5) * 20).toFixed(1)} ${(y0 + largo * 0.25).toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)} T${x2.toFixed(1)} ${y2.toFixed(1)}`,
      cx: x2,
      cy: y2,
      delay: (i * 0.42).toFixed(2),
    });
  }
  return out;
}

/*
 * MINERALES del suelo: granitos de nutriente suspendidos que la red sube a las
 * matas. Se colorean por tipo (fósforo ámbar, nitrógeno azul, potasio malva) y
 * los que están cerca de una punta de raíz brillan (uptake). `n` escala con la
 * vida del suelo. Puro y determinista.
 */
const MINERAL_COLORES = [
  { tipo: 'fosforo', color: '#fcd34d' },
  { tipo: 'nitrogeno', color: '#93c5fd' },
  { tipo: 'potasio', color: '#d8b4fe' },
];
export function mineralesDelSuelo(soilLife, puntasRaiz, seed = 71) {
  const r = rng(seed);
  const vida = vidaFactor(soilLife);
  const n = Math.round(10 + vida * 18);
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = 40 + r() * (ANCHO - 80);
    const y = SUP + 40 + r() * (FONDO - SUP - 70);
    const mineral = MINERAL_COLORES[i % MINERAL_COLORES.length];
    // ¿cerca de una punta de raíz? entonces está siendo tomado (brilla)
    let cerca = false;
    for (const p of puntasRaiz) {
      if (d2({ x, y }, p) < 34 * 34) { cerca = true; break; }
    }
    out.push({
      x,
      y,
      r: 1.6 + r() * 1.8,
      color: mineral.color,
      tipo: mineral.tipo,
      uptake: cerca && vida > 0.4,
      delay: (i * 0.19).toFixed(2),
    });
  }
  return out;
}

/*
 * Construye TODO el subsuelo de un tirón, listo para pintar. Es la única función
 * que la escena necesita llamar; memoiza bien porque solo depende de `soilLife`
 * (la estructura de raíces es fija; la densidad de red/agua/minerales escala).
 */
export function construirSubsuelo(soilLife) {
  const vida = vidaFactor(soilLife);
  const { trazos: raices, puntasRaiz, nodulos } = sistemaRaices(11);
  const nLibres = Math.round(6 + vida * 16); // 6..22
  const libres = nodosLibres(nLibres, 23);
  const { nodos, hilos } = construirRed(puntasRaiz, libres, { vecinos: 2 }, 37);
  const gotas = gotasAgua(soilLife, 53);
  const minerales = mineralesDelSuelo(soilLife, puntasRaiz, 71);
  return { raices, puntasRaiz, nodulos, nodos, hilos, gotas, minerales, vida };
}
