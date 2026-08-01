/*
 * trazo — construcción de curvas para la plumilla.
 *
 * La lámina botánica NO tiene líneas rectas ni arcos de compás: tiene curvas
 * de contorno continuas que nacen de un perfil. Todo el motor dibuja con
 * polilíneas de muestreo denso y las suaviza acá, en un solo lugar, con
 * Catmull-Rom → Bézier cúbica. Así el borde de una hoja entera sale liso y el
 * de una hoja aserrada sale con diente REAL (mismos puntos, otra costura).
 *
 * Convención de ejes en todo el motor: la hoja/órgano nace en (0,0) y crece
 * hacia +X; el ancho se reparte en ±Y. Quien la coloca la rota. Esto viene de
 * `LaminaCafeto` (la lámina canónica del repo) y se respeta para que las dos
 * generaciones de láminas hablen el mismo idioma.
 */
import { r2 } from './rng.js';

/** Polilínea → path suave (Catmull-Rom uniforme → cúbicas). `cerrar` une el
 *  último con el primero. `tension` 0 = anguloso, 1 = redondo (0.5 clásico). */
export function suave(pts, cerrar = false, tension = 0.5) {
  if (pts.length < 2) return '';
  const p = cerrar ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${r2(pts[0][0])} ${r2(pts[0][1])}`;
  for (let i = 1; i < p.length - 2; i += 1) {
    const [x0, y0] = p[i - 1];
    const [x1, y1] = p[i];
    const [x2, y2] = p[i + 1];
    const [x3, y3] = p[i + 2];
    const k = tension / 3;
    const c1x = x1 + (x2 - x0) * k;
    const c1y = y1 + (y2 - y0) * k;
    const c2x = x2 - (x3 - x1) * k;
    const c2y = y2 - (y3 - y1) * k;
    d += ` C${r2(c1x)} ${r2(c1y)} ${r2(c2x)} ${r2(c2y)} ${r2(x2)} ${r2(y2)}`;
  }
  return cerrar ? `${d} Z` : d;
}

/** Polilínea → path anguloso (para el diente de sierra: el borde aserrado NO
 *  se suaviza, si no deja de ser un diente). */
export function quebrado(pts, cerrar = false) {
  if (!pts.length) return '';
  let d = `M${r2(pts[0][0])} ${r2(pts[0][1])}`;
  for (let i = 1; i < pts.length; i += 1) d += ` L${r2(pts[i][0])} ${r2(pts[i][1])}`;
  return cerrar ? `${d} Z` : d;
}

/** Normal unitaria de la polilínea en el índice i (mira hacia afuera si los
 *  puntos van en sentido antihorario). Sirve para colgar dientes del borde. */
export function normalEn(pts, i) {
  const a = pts[Math.max(0, i - 1)];
  const b = pts[Math.min(pts.length - 1, i + 1)];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const m = Math.hypot(dx, dy) || 1;
  return [dy / m, -dx / m];
}

/** Espejo de una polilínea sobre el eje X (Y → -Y), en orden inverso: con
 *  esto media hoja se vuelve hoja entera sin recalcular el perfil. */
export const espejar = (pts) => pts.map(([x, y]) => [x, -y]).reverse();

/** Interpolación lineal y sujeción: los dos verbos que usa todo el motor. */
export const lerp = (a, b, t) => a + (b - a) * t;
export const sujeta = (n, min, max) => Math.min(max, Math.max(min, n));

/** Un arco de vena que sale del nervio central y curva hacia la punta.
 *  `origen` sobre el nervio, `destino` en el borde; `comba` cuánto arquea. */
export function vena([ox, oy], [dx, dy], comba = 0.3) {
  const mx = (ox + dx) / 2;
  const my = (oy + dy) / 2;
  const nx = -(dy - oy);
  const ny = dx - ox;
  const m = Math.hypot(nx, ny) || 1;
  const cx = mx + (nx / m) * comba * Math.hypot(dx - ox, dy - oy) * 0.5;
  const cy = my + (ny / m) * comba * Math.hypot(dx - ox, dy - oy) * 0.5;
  return `M${r2(ox)} ${r2(oy)} Q${r2(cx)} ${r2(cy)} ${r2(dx)} ${r2(dy)}`;
}

/** Punto sobre una cuadrática (para colgar frutos/flores de un tallo curvo). */
export function enCuadratica([x0, y0], [cx, cy], [x1, y1], t) {
  const u = 1 - t;
  return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1];
}
