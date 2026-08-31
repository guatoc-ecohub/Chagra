/*
 * trama — PUNTILLISMO y plumilla: el oficio del grabado científico.
 *
 * Esta es la pieza que separa una lámina botánica de un dibujo animado, y por
 * eso existe antes que cualquier planta. El volumen en la lámina clásica
 * (Mutis, Humboldt, los cuadernos de Darwin) NO se resuelve con degradés ni
 * con brillos: se resuelve con MILES DE PUNTOS cuya DENSIDAD modela la forma.
 * Donde el órgano se hunde, los puntos se aprietan; donde recibe luz, se
 * abren hasta desaparecer y queda el papel desnudo.
 *
 * Reglas del oficio, embebidas acá para que ninguna especie las viole:
 *   1. El punto NO tiene contorno y es más chico de lo que uno cree
 *      (r ≈ 0.3-0.55 en un pliego de 1000 de ancho).
 *   2. La densidad se GRADÚA, nunca se corta con un filo. Un parche de puntos
 *      de borde recto se lee como suciedad, no como sombra.
 *   3. Los puntos no se sortean por frame: entran con un rng determinista
 *      (ver `rng.js`) para que la lámina sea un documento y no una animación.
 *   4. El puntillismo se RECORTA contra el órgano (clipPath), nunca se
 *      calcula "por dentro" a mano — es más barato y no deja fugas.
 *
 * Todo devuelve datos planos (arrays de {x,y,r}), no JSX: quien pinta decide
 * el color. Así el mismo motor sirve para la sombra de una hoja sana y para
 * el polvo de la roya en el envés.
 */
import { entre, tembleque } from './rng.js';
import { lerp, sujeta } from './trazo.js';

/**
 * Nube de puntos con densidad modelada por una función de sombreado.
 *
 * @param {Function} rng generador determinista
 * @param {Object} caja {x, y, w, h} región de siembra (se recorta con clipPath)
 * @param {Function} sombra (u, v) → 0..1, con u,v normalizados 0..1 dentro de
 *        la caja. 1 = zona honda (puntos apretados), 0 = luz (papel desnudo).
 * @param {Object} [op] {intentos, rMin, rMax, umbral}
 * @returns {Array<{x,y,r}>}
 */
export function puntillismo(rng, caja, sombra, op = {}) {
  const { x, y, w, h } = caja;
  const intentos = op.intentos ?? Math.round((w * h) / 26);
  const rMin = op.rMin ?? 0.28;
  const rMax = op.rMax ?? 0.5;
  const umbral = op.umbral ?? 0.06;
  const pts = [];
  for (let i = 0; i < intentos; i += 1) {
    const u = rng();
    const v = rng();
    const s = sujeta(sombra(u, v), 0, 1);
    /* Rechazo por densidad: el punto sólo prende si el azar cae bajo la
       sombra. De acá sale el degradé de densidad sin un solo gradiente. */
    if (s <= umbral || rng() > s) continue;
    pts.push({
      x: x + u * w,
      y: y + v * h,
      /* el punto de la zona honda es apenas más gordo: así la sombra pesa sin
         que se note el truco */
      r: lerp(rMin, rMax, s * 0.75 + rng() * 0.25),
    });
  }
  return pts;
}

/** Puntillismo → un solo `d` de path (cada punto es un círculo por arco).
 *
 *  UN path con 2.000 puntos rinde muchísimo mejor que 2.000 <circle>: un nodo
 *  contra dos mil. Es la razón de que un pliego entero quede en ~700 nodos y
 *  no en ~40.000, y de que esto corra en el celular con el que se mira una
 *  mata en la montaña.
 *
 *  UN DECIMAL, a propósito. No es sólo por peso (aunque recorta ~30% del `d`):
 *  una plumilla de verdad tiene CALIBRES FIJOS — el dibujante no cambia de
 *  punta cada punto. Cuantizar el radio a 0,3 / 0,4 / 0,5 no es una pérdida:
 *  es lo que hace el oficio. Y a este tamaño, medio centésimo de píxel no lo
 *  ve nadie ni lo imprime ninguna impresora. */
export function puntosAPath(pts) {
  let d = '';
  for (const p of pts) {
    const rr = Math.round(p.r * 10) / 10;
    const xx = Math.round(p.x * 10) / 10;
    const yy = Math.round(p.y * 10) / 10;
    d += `M${xx - rr} ${yy}a${rr} ${rr} 0 1 0 ${rr * 2} 0a${rr} ${rr} 0 1 0 ${-rr * 2} 0`;
  }
  return d;
}

/** Sombra estándar de una lámina foliar: honda contra el nervio y en la base,
 *  clara hacia el borde y la punta. `lado` -1/1 modela la luz desde arriba. */
export function sombraDeHoja(lado = 1) {
  return (u, v) => {
    const alNervio = 1 - Math.abs(v - 0.5) * 2; // 1 en el nervio, 0 en el borde
    const aLaBase = 1 - u; // la base pesa más que la punta
    const luz = lado > 0 ? v : 1 - v; // una mitad recibe la luz
    return sujeta(alNervio * 0.55 + aLaBase * 0.3 + luz * 0.22 - 0.28, 0, 1) * 0.9;
  };
}

/** Sombra estándar de un cuerpo redondo (fruto, tubérculo): la clásica esfera
 *  con la luz arriba-izquierda y el rebote tenue en el borde de abajo. */
export function sombraDeVolumen(luzU = 0.34, luzV = 0.3) {
  return (u, v) => {
    const d = Math.hypot(u - luzU, v - luzV) / 1.05;
    const rebote = Math.hypot(u - 0.72, v - 0.86) < 0.3 ? -0.18 : 0;
    return sujeta(d * 1.25 - 0.22 + rebote, 0, 1);
  };
}

/** Sombra de cilindro (tallo, pseudotallo, caña): sólo depende del eje corto. */
export function sombraDeCilindro(eje = 'v', luz = 0.34) {
  return (u, v) => {
    const t = eje === 'v' ? v : u;
    return sujeta(Math.abs(t - luz) * 1.9 - 0.12, 0, 1);
  };
}

/**
 * Tramado (hatching) paralelo: la otra mano del grabado. Se usa para el CORTE
 * (un corte anatómico se rellena con líneas, no con puntos — así se distingue
 * de un vuelto lo macizo de lo hueco) y para la tierra.
 *
 * @returns {string} un solo `d` con todas las líneas.
 */
export function tramado(caja, paso = 3, angulo = 45, rng = null, comba = 0) {
  const { x, y, w, h } = caja;
  const rad = (angulo * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const largo = Math.hypot(w, h) * 1.2;
  const n = Math.ceil(largo / paso);
  const cx = x + w / 2;
  const cy = y + h / 2;
  let d = '';
  for (let i = -n; i <= n; i += 1) {
    const ox = cx + -dy * i * paso;
    const oy = cy + dx * i * paso;
    const x1 = ox - dx * largo * 0.5;
    const y1 = oy - dy * largo * 0.5;
    const x2 = ox + dx * largo * 0.5;
    const y2 = oy + dy * largo * 0.5;
    if (comba && rng) {
      const mx = (x1 + x2) / 2 + tembleque(rng, comba);
      const my = (y1 + y2) / 2 + tembleque(rng, comba);
      d += `M${x1.toFixed(1)} ${y1.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    } else {
      d += `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
    }
  }
  return d;
}

/** Vellosidad: pelitos cortos sobre un borde. La pubescencia es un CARÁCTER
 *  diagnóstico real (tomate de árbol, uchuva, curuba *mollissima* = "muy
 *  suave"), no un adorno: sólo la lleva la especie que la tiene. */
export function pelusa(rng, pts, largo = 2.2, cada = 3) {
  let d = '';
  for (let i = 1; i < pts.length - 1; i += cada) {
    const [px, py] = pts[i];
    const a = pts[i - 1];
    const b = pts[i + 1];
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const m = Math.hypot(tx, ty) || 1;
    const nx = ty / m;
    const ny = -tx / m;
    const l = largo * entre(rng, 0.6, 1.25);
    const sesgo = tembleque(rng, 0.4);
    d += `M${px.toFixed(1)} ${py.toFixed(1)}l${(nx * l + tx / m * sesgo * l).toFixed(1)} ${(ny * l + ty / m * sesgo * l).toFixed(1)}`;
  }
  return d;
}

/** Moteado irregular: una mancha de contorno orgánico (lesión, foxing del
 *  papel, pigmento del tubérculo). Devuelve puntos para `suave(pts, true)`. */
export function borron(rng, cx, cy, radio, irregular = 0.42, lados = 11) {
  const pts = [];
  for (let i = 0; i < lados; i += 1) {
    const a = (i / lados) * Math.PI * 2;
    const rr = radio * (1 - irregular / 2 + rng() * irregular);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.86]);
  }
  return pts;
}
