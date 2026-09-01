// ── descenso-chorrera.js — EL MUNDO CHORRERA ES EL DESCENSO ─────────────────
// La Chorrera real (590 m, escalonada) traducida al circuito del kart: la
// vuelta ENTERA baja. Meseta de arranque con la carpa azul → siete beats del
// video del dron (saltos de repisa en repisa, cada uno con su caída de agua y
// su poza) → valle de salida con el riachuelo → PORTAL mágico (reinicio de
// vuelta estilo túnel New Donk). El tramo f≈0.872–0.984 es el TÚNEL de
// retorno: la montaña se traga la vía (el jugador nunca lo maneja — se
// teletransporta por el portal; los rivales sobre riel también saltan).
//
// Módulo PURO (sin THREE, sin location): pista.js lo consulta al construir y
// los QA de node lo pueden importar. Solo aplica cuando opts.chorrera.

// ── Los 7 beats del video del dron (f de cada caída) ───────────────────────
// 1 meseta+carpa → primer salto/poza roca negra   f=0.085  (drop  8 m)
// 2 escalonado alto + roca blanca (dos peldaños)  f=0.135/0.158 (5+5 m)
// 3 GRAN salto vertical + poza + riachuelo        f=0.210  (drop 15 m)
// 4 saltos medios                                 f=0.270  (drop  7 m)
// 5 saltos medios                                 f=0.320  (drop  7 m)
// 6 diagonal (canaleta continua, sin acantilado)  f=0.355–0.455 (−13.5 m)
// 7 caída final ANCHA = clímax                    f=0.492  (drop 11 m)
export const CHORRERA_BEATS = [0.085, 0.135, 0.158, 0.210, 0.270, 0.320, 0.492];
export const CHORRERA_DROPS = [8, 5, 5, 15, 7, 7, 11];

// Nodos del perfil: [f, altura] con transición suave entre nodos. Las caídas
// son pares de nodos casi verticales (ancho ~0.0035 de f ≈ 5.7 m de arco):
// acantilado jugable, no rampa. La vuelta cierra 84 → 84.
const NODOS = [
  [0.000, 84.0],   // arranque en la meseta (carpa azul)
  [0.070, 83.0],   // borde de la meseta
  [0.0815, 83.0], [0.0850, 75.0],  // beat 1 — primer salto
  [0.125, 74.2],
  [0.1315, 74.2], [0.1350, 69.2],  // beat 2a — peldaño (roca blanca)
  [0.148, 68.6],
  [0.1545, 68.6], [0.1580, 63.6],  // beat 2b — peldaño
  [0.200, 62.2],
  [0.2065, 62.2], [0.2110, 47.2],  // beat 3 — EL GRAN SALTO
  [0.262, 46.2],
  [0.2665, 46.2], [0.2700, 39.2],  // beat 4 — salto medio
  [0.312, 38.4],
  [0.3165, 38.4], [0.3200, 31.4],  // beat 5 — salto medio
  [0.355, 30.6],
  [0.395, 26.0],                   // beat 6 — la diagonal (canaleta)
  [0.400, 25.2], [0.404, 23.2],    //   escaloncito 1
  [0.436, 20.4], [0.440, 18.4],    //   escaloncito 2
  [0.480, 16.6],
  [0.4885, 16.6], [0.4930, 5.6],   // beat 7 — caída final ANCHA (clímax)
  [0.530, 5.2],                    // la gran poza
  [0.860, 3.2],                    // valle de salida (riachuelo) → portal
  [0.872, 3.4],                    // boca del túnel
  [0.984, 82.0],                   // el túnel sube por dentro de la montaña
  [1.000, 84.0],                   // cierre exacto con f=0
];

// ── Portal New Donk (reinicio de vuelta) ───────────────────────────────────
// El kart entra al arco en f≈0.868 y reaparece en f≈0.995, ya afuera de la
// boca de salida, mirando la meseta. El salto de progreso lo suma la física
// vía wrapFrac (df = +0.127): la vuelta se completa al pasar por f≈0.
export const CHORRERA_PORTAL = { f: 0.868, salidaF: 0.995, ventana: 0.010 };
export const CHORRERA_TUNEL = [0.872, 0.984];

// Pozas (para el agua, la bruma y los chapuzones): f del centro + radio.
export const CHORRERA_POZAS = [
  { f: 0.090, r: 6.5 },   // poza roca negra
  { f: 0.163, r: 5.5 },   // pie del escalonado
  { f: 0.218, r: 9.0 },   // poza del gran salto (la del video, carpa a un lado)
  { f: 0.275, r: 5.5 },
  { f: 0.325, r: 5.5 },
  { f: 0.443, r: 4.5 },   // remanso de la diagonal
  { f: 0.508, r: 11.0 },  // LA gran poza del clímax
];

// Nombres de zona del mundo chorrera (índices = ZONA de pista.js).
export const NOMBRES_CHORRERA = [
  'Meseta de la carpa',        // 0 (PARAMO_ALTO)
  'Repisas de roca blanca',    // 1 (TRANSICION)
  'La garganta',               // 2 (BOSQUE)
  'La caída grande',           // 3 (NIEBLA)
  'Valle del riachuelo',       // 4 (SUBIDA)
];

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function suave(t) { const s = clamp(t, 0, 1); return s * s * (3 - 2 * s); }
function cresta(f, c, w) {
  const d = (f - c) / w;
  return Math.exp(-d * d);
}

// ── perfil de altitud (reemplaza al del páramo; ignora perfilBase) ─────────
export function perfilChorrera(f, _perfilBase) {
  f = ((f % 1) + 1) % 1;
  let i = 0;
  while (i < NODOS.length - 2 && NODOS[i + 1][0] <= f) i++;
  const [fa, ya] = NODOS[i];
  const [fb, yb] = NODOS[i + 1];
  const t = fb > fa ? suave((f - fa) / (fb - fa)) : 0;
  let y = ya + (yb - ya) * t;
  // micro-relieve del lecho (fuera del túnel, donde debe ser tersa la unión)
  if (f < CHORRERA_TUNEL[0] || f > CHORRERA_TUNEL[1]) {
    y += 0.35 * Math.sin(f * 61 + 1.7) + 0.22 * Math.sin(f * 113 + 4.1);
  }
  // labios de despegue antes de cada caída (roca que lanza el kart)
  y += 1.1 * cresta(f, 0.0805, 0.0022);
  y += 0.8 * cresta(f, 0.1305, 0.0020);
  y += 0.8 * cresta(f, 0.1535, 0.0020);
  y += 1.6 * cresta(f, 0.2050, 0.0024);  // el gran salto merece el mejor labio
  y += 0.9 * cresta(f, 0.2655, 0.0020);
  y += 0.9 * cresta(f, 0.3155, 0.0020);
  y += 1.4 * cresta(f, 0.4875, 0.0024);  // clímax
  return y;
}

// ── envolvente de PAREDES del cañón (heightfield fuera de la vía) ──────────
// Amplitud del muro sobre la cota local de la vía. La garganta de los beats
// es un cañón hondo; la meseta y el valle de salida abren; el túnel se tapa.
export function paredChorrera(f) {
  f = ((f % 1) + 1) % 1;
  if (f >= CHORRERA_TUNEL[0] && f <= CHORRERA_TUNEL[1]) return 38; // montaña
  if (f < 0.065) return 5 + 18 * suave((f - 0.03) / 0.035);   // meseta → borde
  if (f < 0.55) {
    // el cañón: más hondo alrededor del gran salto y del clímax.
    // Subido en el reencargo "como el dron": la garganta debe leer VERTICAL
    // (paredes altas que cierran el cielo), no lomas de decenas de metros.
    return 30
      + 16 * cresta(f, 0.215, 0.06)
      + 18 * cresta(f, 0.50, 0.055);
  }
  if (f < 0.86) return 24 - 12 * suave((f - 0.55) / 0.12);    // valle abre
  return 16 + 22 * suave((f - 0.86) / 0.012);                  // boca del túnel
}

// ── ancho extra de la vía (pozas anchas, canaleta angosta) ─────────────────
export function anchoChorrera(f) {
  f = ((f % 1) + 1) % 1;
  let w = 0.6; // el lecho general es un pelo más ancho que la trocha del páramo
  for (const p of CHORRERA_POZAS) {
    w += (p.r > 8 ? 4.2 : 2.6) * cresta(f, p.f, 0.014);
  }
  if (f > 0.36 && f < 0.45) w -= 1.2;      // la diagonal aprieta
  if (f > 0.87 && f < 0.985) w -= 0.8;     // túnel
  return w;
}

// ── zonas del mundo chorrera (códigos ZONA de pista.js, sin importarlo) ────
// 0=PARAMO_ALTO 1=TRANSICION 2=BOSQUE 3=NIEBLA 4=SUBIDA. La flora del
// entorno puebla BOSQUE/NIEBLA con monte denso: verde dominante.
export function zonaChorrera(f) {
  f = ((f % 1) + 1) % 1;
  if (f < 0.07) return 0;    // meseta (claro de la carpa, frailejones al borde)
  if (f < 0.19) return 1;    // repisas de roca blanca (transición: mezcla)
  if (f < 0.26) return 3;    // la caída grande: bosque de niebla, bruma
  if (f < 0.55) return 2;    // la garganta: bosque andino denso
  if (f < 0.872) return 4;   // valle del riachuelo (salida)
  return 4;                  // túnel (da igual: va tapado)
}

export function esTunelChorrera(f) {
  f = ((f % 1) + 1) % 1;
  return f >= CHORRERA_TUNEL[0] && f <= CHORRERA_TUNEL[1];
}
