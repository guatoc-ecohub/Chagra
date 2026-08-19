// ===========================================================================
// La Milpa — datos de cultivos y asociaciones reales de la chagra.
// Asociaciones agronómicas verdaderas (las tres hermanas + parejas clásicas).
// ===========================================================================

export const COLS = 8;
export const ROWS = 11;

export const CROPS = {
  maiz:      { id: 'maiz',      name: 'Maíz' },
  frijol:    { id: 'frijol',    name: 'Fríjol' },
  calabaza:  { id: 'calabaza',  name: 'Calabaza' },
  tomate:    { id: 'tomate',    name: 'Tomate' },
  albahaca:  { id: 'albahaca',  name: 'Albahaca' },
  zanahoria: { id: 'zanahoria', name: 'Zanahoria' },
  cebolla:   { id: 'cebolla',   name: 'Cebolla' },
  lechuga:   { id: 'lechuga',   name: 'Lechuga' },
  rabano:    { id: 'rabano',    name: 'Rábano' },
  papa:      { id: 'papa',      name: 'Papa' },
  habas:     { id: 'habas',     name: 'Habas' },
  ajo:       { id: 'ajo',       name: 'Ajo' },
};

export const CROP_LIST = Object.values(CROPS);

// P(pareja compatible) y P(pareja antagonista) — receta real.
const COMPAT = new Map();
const ANTAG = new Map();
const put = (map, a, b, reason) => { map.set(a + '|' + b, reason); map.set(b + '|' + a, reason); };

put(COMPAT, 'maiz', 'frijol', 'El maíz le sirve de tutor al fríjol para trepar.');
put(COMPAT, 'maiz', 'calabaza', 'La calabaza tapa el suelo y lo mantiene fresco.');
put(COMPAT, 'frijol', 'calabaza', 'El fríjol alimenta a la calabaza con nitrógeno.');
put(COMPAT, 'tomate', 'albahaca', 'La albahaca espanta plagas y mejora al tomate.');
put(COMPAT, 'zanahoria', 'cebolla', 'La cebolla aleja la mosca de la zanahoria.');
put(COMPAT, 'lechuga', 'rabano', 'El rábano suelta la tierra para la lechuga.');
put(COMPAT, 'papa', 'habas', 'Las habas le dan nitrógeno a la papa.');

put(ANTAG, 'frijol', 'cebolla', 'La cebolla frena el crecimiento del fríjol.');
put(ANTAG, 'frijol', 'ajo', 'El ajo inhibe al fríjol.');
put(ANTAG, 'papa', 'tomate', 'Son de la misma familia y comparten la tizón.');
put(ANTAG, 'maiz', 'tomate', 'El maíz le quita luz y alimento al tomate.');

// --- API pública ------------------------------------------------------------

export function compatReason(a, b) { return COMPAT.get(a + '|' + b) || null; }
export function antagReason(a, b) { return ANTAG.get(a + '|' + b) || null; }

// 1 = se llevan bien · -1 = se llevan mal · 0 = neutral
export function relation(a, b) {
  if (!a || !b || a === b) return 0;
  if (COMPAT.has(a + '|' + b)) return 1;
  if (ANTAG.has(a + '|' + b)) return -1;
  return 0;
}

// --- La milpa (las tres hermanas) --------------------------------------------

export const MILPA = ['maiz', 'frijol', 'calabaza'];
export const MILPA_INFO = [
  { id: 'maiz',     role: 'El tutor',       text: 'Su tallo alto y firme le sirve de guía al fríjol para trepar hacia el sol.' },
  { id: 'frijol',   role: 'El que alimenta', text: 'Sus raíces fijan nitrógeno del aire y lo convierten en abono para sus vecinas.' },
  { id: 'calabaza', role: 'La que protege',  text: 'Sus hojas anchas cubren el suelo: lo mantiene fresco y no dejan crecer las arvenses.' },
];
export const MILPA_TITLE = '¡La milpa completa!';
export const MILPA_TEXT = 'Las tres hermanas se ayudan entre sí: el maíz da el tutor, el fríjol fija el nitrógeno y la calabaza cubre el suelo y controla las arvenses.';

// --- Piezas (formas tipo Tetris, cada pieza es una parcela con UN cultivo) ---

const SHAPE_BASE = {
  single: [[0, 0]],
  domino: [[0, 0], [1, 0]],
  square: [[0, 0], [1, 0], [0, 1], [1, 1]],
  corner: [[0, 0], [1, 0], [0, 1]],
  line3:  [[0, 0], [1, 0], [2, 0]],
};

export const SHAPE_WEIGHT = { single: 6, domino: 5, corner: 4, square: 3, line3: 2 };

const r90 = cells => {
  const my = Math.max(...cells.map(c => c[1]));
  return cells.map(([x, y]) => [my - y, x]);
};
const norm = cells => {
  const mx = Math.min(...cells.map(c => c[0]));
  const my = Math.min(...cells.map(c => c[1]));
  return cells.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
};

export const SHAPE_ROTS = new Map();
for (const [id, base] of Object.entries(SHAPE_BASE)) {
  const seen = new Set();
  const rots = [];
  let cur = norm(base.map(p => p.slice()));
  for (let i = 0; i < 4; i++) {
    const k = JSON.stringify(cur);
    if (!seen.has(k)) { seen.add(k); rots.push(cur); }
    cur = norm(r90(cur));
  }
  SHAPE_ROTS.set(id, rots);
}

export function pickShape(rng) {
  const total = Object.values(SHAPE_WEIGHT).reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (const [id, w] of Object.entries(SHAPE_WEIGHT)) {
    if ((r -= w) < 0) return id;
  }
  return 'single';
}

// Bolsa con los 12 cultivos mezclada (Fisher–Yates). Garantiza que las tres
// hermanas aparezcan siempre dentro de cada bolsa → la milpa siempre es posible.
export function makeBag(rng) {
  const arr = Object.keys(CROPS);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
