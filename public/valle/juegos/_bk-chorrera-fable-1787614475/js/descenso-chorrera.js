// Geometría física del tramo final: La Chorrera no es otra pista. Estos
// escalones son la garganta que ya recorre el circuito, expresados como una
// envolvente de altura que el heightfield esculpe junto con la ruta.

export const CHORRERA_BEATS = [0.205, 0.218, 0.232, 0.247, 0.264, 0.282, 0.302];

// Altura adicional de cada repisa sobre el perfil base. La diferencia entre
// repisas hace jugables el primer salto, el salto vertical grande, los medios
// y el ancho final; no es un toggle de decoración.
export const CHORRERA_REPISAS = [40, 34, 24, 9, 6, 3, 0];
export const CHORRERA_DROPS = CHORRERA_REPISAS.slice(0, -1).map((v, i) => v - CHORRERA_REPISAS[i + 1]);

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function suave(t) { const s = clamp(t, 0, 1); return s * s * (3 - 2 * s); }
function cresta(f, c, w) {
  const d = (f - c) / w;
  return Math.exp(-d * d);
}

function repisaEn(f) {
  if (f < CHORRERA_BEATS[0]) {
    return CHORRERA_REPISAS[0] * suave((f - 0.178) / 0.027);
  }
  for (let i = 0; i < CHORRERA_BEATS.length - 1; i++) {
    const a = CHORRERA_BEATS[i], b = CHORRERA_BEATS[i + 1];
    if (f <= b) {
      const t = suave((f - a) / (b - a));
      return CHORRERA_REPISAS[i] + (CHORRERA_REPISAS[i + 1] - CHORRERA_REPISAS[i]) * t;
    }
  }
  return 0;
}

export function perfilChorrera(f, perfilBase) {
  let y = perfilBase(f) + repisaEn(f);
  // Labios de roca para que el kart despegue antes de cada poza. La caída
  // final es ancha en el arte; su física conserva una salida controlable.
  y += 1.4 * cresta(f, 0.216, 0.0028);
  y += 1.8 * cresta(f, 0.232, 0.0028);
  y += 2.4 * cresta(f, 0.247, 0.0028);
  y += 1.2 * cresta(f, 0.264, 0.0028);
  y += 1.0 * cresta(f, 0.282, 0.0028);
  y += 2.1 * cresta(f, 0.302, 0.0028);
  return y;
}

