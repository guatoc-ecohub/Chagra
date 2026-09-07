/*
 * formasHoja — la geometría de LA HOJA (una sola) y de las marcas del daño.
 *
 * Todo el diferencial plaga/enfermedad/deficiencia se dibuja sobre la MISMA
 * hoja de café, tres veces. Ese es el truco didáctico entero: si la hoja
 * cambiara entre panel y panel, el campesino no sabría si lo que ve distinto
 * es el daño o es la hoja. Controlando la hoja, lo único que varía es el daño.
 *
 * Por eso la hoja NO se dibuja a mano tres veces: se CONSTRUYE una vez acá,
 * en tiempo de módulo (cero costo por render, cero `Math.random` en pintura,
 * arte byte-idéntico entre capturas), y las tres láminas la consumen.
 *
 * Grounded — hoja de Coffea arabica, mirando las fotos reales del repo
 * (`public/plaga-images/hemileia_vastatrix.jpg`, `cercospora_coffeicola.jpg`):
 *   - elíptico-oblonga, ~2.5:1, base cuneada y punta ACUMINADA (la gotera);
 *   - margen ONDULADO (ondea suave, no es un óvalo liso) — se ve clarito en
 *     la foto de la roya, contra el dedo;
 *   - nervadura BROQUIDÓDROMA: las laterales salen del nervio central, se
 *     arquean hacia adelante y NO llegan al borde: se cierran en lazo con la
 *     siguiente. Dibujar venas que tocan el borde es el error de calco que
 *     delata a un dibujo inventado;
 *   - lámina abullonada (bullada): entre vena y vena se infla, y por eso la
 *     vena se lee como un surco hundido, no como una raya encima.
 *
 * Convención del sistema de coordenadas de la hoja:
 *   la base (donde entra el pecíolo) en (0,0); la punta en (0,-L); el nervio
 *   central sobre x=0. Es decir: la hoja está PARADA, punta arriba, como en
 *   un herbario. El consumidor la rota/traslada con un <g transform>.
 */

/* ------------------------------------------------------------------ */
/* Utilería determinista                                               */
/* ------------------------------------------------------------------ */

/** PRNG mulberry32: mismo `semilla` → misma secuencia, siempre y en toda
 *  máquina. Nunca `Math.random` en arte: rompe la captura byte-idéntica. */
export function prngDe(semilla) {
  let a = semilla >>> 0;
  return function siguiente() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Redondeo a 2 decimales: paths cortos y estables (diffs legibles). */
const r2 = (n) => Math.round(n * 100) / 100;

/** smoothstep clásico: 0 antes de `a`, 1 después de `b`, suave en medio. */
export function suave(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** mezcla lineal de dos hex (#rrggbb). Para rampas de daño sin inventar hex. */
export function mezclarHex(a, b, t) {
  const ca = parseInt(a.slice(1), 16);
  const cb = parseInt(b.slice(1), 16);
  const f = (d) => {
    const x = (ca >> d) & 255;
    const y = (cb >> d) & 255;
    return Math.round(x + (y - x) * t);
  };
  const v = (f(16) << 16) | (f(8) << 8) | f(0);
  return `#${v.toString(16).padStart(6, '0')}`;
}

/* ------------------------------------------------------------------ */
/* Suavizado Catmull-Rom → cúbicas de Bézier                           */
/* (una curva orgánica de verdad, no un polígono con muchos lados)     */
/* ------------------------------------------------------------------ */

function tramo(p0, p1, p2, p3, tension) {
  const c1x = p1.x + ((p2.x - p0.x) / 6) * tension;
  const c1y = p1.y + ((p2.y - p0.y) / 6) * tension;
  const c2x = p2.x - ((p3.x - p1.x) / 6) * tension;
  const c2y = p2.y - ((p3.y - p1.y) / 6) * tension;
  return `C${r2(c1x)} ${r2(c1y)} ${r2(c2x)} ${r2(c2y)} ${r2(p2.x)} ${r2(p2.y)}`;
}

/** Path cerrado y suave que pasa por todos los puntos. */
export function curvaCerrada(pts, tension = 1) {
  const n = pts.length;
  const en = (i) => pts[((i % n) + n) % n];
  let d = `M${r2(pts[0].x)} ${r2(pts[0].y)}`;
  for (let i = 0; i < n; i += 1) d += tramo(en(i - 1), en(i), en(i + 1), en(i + 2), tension);
  return `${d}Z`;
}

/** Path abierto y suave que pasa por todos los puntos (venas, contornos). */
export function curvaAbierta(pts, tension = 1) {
  const n = pts.length;
  const en = (i) => pts[Math.min(n - 1, Math.max(0, i))];
  let d = `M${r2(pts[0].x)} ${r2(pts[0].y)}`;
  for (let i = 0; i < n - 1; i += 1) d += tramo(en(i - 1), en(i), en(i + 1), en(i + 2), tension);
  return d;
}

/* ------------------------------------------------------------------ */
/* EL PERFIL DE LA HOJA                                                */
/* ------------------------------------------------------------------ */

/**
 * Ancho relativo (0..1) de la media hoja a lo largo del eje.
 * `t` = 0 en la base, 1 en la punta.
 *
 * Tres factores, cada uno con su razón botánica:
 *   cuerpo → la elipse oblonga (el grueso de la hoja);
 *   acumen → el pellizco del último cuarto = punta ACUMINADA (gotera);
 *   base   → la cuña de la base (cuneada), no un ovalo que arranca ancho.
 */
export function perfilAncho(t) {
  if (t <= 0 || t >= 1) return 0;
  const cuerpo = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.82)), 0.66);
  const acumen = 1 - 0.44 * suave(0.72, 1, t);
  const base = 0.68 + 0.32 * suave(0, 0.16, t);
  return cuerpo * acumen * base;
}

/**
 * Construye la hoja completa: contorno, nervio central, laterales con sus
 * lazos broquidódromos y los "surcos" de la lámina abullonada.
 *
 * @param {Object} [cfg]
 * @param {number} [cfg.L] largo de la hoja (base→punta).
 * @param {number} [cfg.W] media anchura máxima.
 * @param {number} [cfg.ondas] cuántas ondulaciones tiene el margen.
 * @param {number} [cfg.amp] qué tan marcada es la ondulación (0..1).
 * @param {number} [cfg.pares] pares de venas laterales.
 * @param {number} [cfg.semilla] semilla del PRNG (asimetría viva).
 */
export function construirHoja(cfg = {}) {
  const {
    L = 140,
    W = 26,
    ondas = 6,
    amp = 0.055,
    pares = 8,
    semilla = 7,
  } = cfg;
  const rnd = prngDe(semilla);

  /* Cada lado lleva su propia fase de ondulación y un ~2% de diferencia de
     anchura: una hoja real NO es un espejo perfecto. Es a propósito y es
     honesto — y es poquito, porque la lección de la deficiencia ES la
     simetría del DAÑO, y no queremos que el contorno la contradiga. */
  const lados = [
    { signo: 1, fase: rnd() * Math.PI * 2, escala: 1 },
    { signo: -1, fase: rnd() * Math.PI * 2, escala: 0.98 },
  ];

  const anchoLado = (t, lado) => {
    const onda = 1 + amp * Math.sin(ondas * Math.PI * 2 * t + lado.fase);
    return perfilAncho(t) * W * onda * lado.escala;
  };

  /** Punto sobre el margen de un lado, a la altura `t`. */
  const margen = (t, lado) => ({ x: lado.signo * anchoLado(t, lado), y: -t * L });

  /* --- contorno: base → margen derecho → punta → margen izquierdo --- */
  const N = 34;
  const pts = [{ x: 0, y: 0 }];
  for (let i = 1; i <= N; i += 1) pts.push(margen(0.008 + (i / (N + 1)) * 0.985, lados[0]));
  pts.push({ x: 0, y: -L }); // la punta, exacta y aguda
  for (let i = N; i >= 1; i -= 1) pts.push(margen(0.008 + (i / (N + 1)) * 0.985, lados[1]));

  const contorno = curvaCerrada(pts, 0.92);

  /* --- nervio central: no es recto, la hoja cuelga un poquito --- */
  const eje = [];
  for (let i = 0; i <= 10; i += 1) {
    const t = i / 10;
    eje.push({ x: Math.sin(t * 2.1) * 1.1, y: -t * L });
  }
  const nervioCentral = curvaAbierta(eje, 1);
  /** x del nervio central a la altura t (la hoja se curva: hay que seguirlo). */
  const ejeEn = (t) => Math.sin(Math.min(1, Math.max(0, t)) * 2.1) * 1.1;

  /* --- laterales broquidódromas + lazos --- */
  const laterales = [];
  const t0 = 0.1;
  const t1 = 0.88;
  for (let i = 0; i < pares; i += 1) {
    const t = t0 + ((t1 - t0) * i) / (pares - 1);
    for (const lado of lados) {
      const w = anchoLado(t, lado);
      /* La vena muere al 78% del ancho: NO toca el borde (broquidódroma). */
      const finT = t + 0.075 + 0.02 * rnd();
      const fin = {
        x: lado.signo * anchoLado(finT, lado) * 0.78,
        y: -finT * L,
      };
      const ini = { x: ejeEn(t), y: -t * L };
      const ctrl = { x: lado.signo * w * 0.44, y: -(t + 0.012) * L };
      const d = `M${r2(ini.x)} ${r2(ini.y)}Q${r2(ctrl.x)} ${r2(ctrl.y)} ${r2(fin.x)} ${r2(fin.y)}`;
      laterales.push({ d, fin, lado: lado.signo, t });
    }
  }

  /* Los lazos: el arco que une la punta de una vena con la siguiente, por
     fuera. Es la firma broquidódroma y casi nadie la dibuja. */
  const lazos = [];
  for (const signo of [1, -1]) {
    const delLado = laterales.filter((v) => v.lado === signo);
    for (let i = 0; i < delLado.length - 1; i += 1) {
      const a = delLado[i].fin;
      const b = delLado[i + 1];
      /* llega a media vena de la siguiente, no a su punta */
      const destino = { x: b.fin.x * 0.62, y: (b.fin.y + -b.t * L) / 2 };
      const cx = signo * Math.max(Math.abs(a.x), Math.abs(destino.x)) * 1.12;
      lazos.push(
        `M${r2(a.x)} ${r2(a.y)}Q${r2(cx)} ${r2((a.y + destino.y) / 2)} ${r2(destino.x)} ${r2(destino.y)}`,
      );
    }
  }

  return { L, W, contorno, nervioCentral, laterales, lazos, ejeEn, anchoLado, lados };
}

/** LA hoja del diferencial. Una sola, compartida por las tres láminas. */
export const HOJA = construirHoja({ L: 140, W: 26, ondas: 6, amp: 0.055, pares: 8, semilla: 7 });

/**
 * Punto DENTRO de la lámina, en coordenadas de hoja.
 * @param {number} t 0=base, 1=punta (a lo largo del nervio).
 * @param {number} u -1=margen izquierdo, 0=nervio, 1=margen derecho.
 *
 * Sirve para posar una mancha, un hueco o un bicho y que SIEMPRE caiga en la
 * hoja y siga su forma — sin ir midiendo a ojo pixel por pixel.
 */
export function puntoEnHoja(t, u, hoja = HOJA) {
  const lado = hoja.lados[u >= 0 ? 0 : 1];
  const w = hoja.anchoLado(t, lado);
  return { x: hoja.ejeEn(t) + u * w, y: -t * hoja.L };
}

/* ------------------------------------------------------------------ */
/* MARCAS DEL DAÑO — cada una calcada de una foto real del repo         */
/* ------------------------------------------------------------------ */

/**
 * Blob irregular: el contorno de una lesión que NO es un círculo.
 * (Un círculo perfecto es la marca del dibujo inventado; en la foto de la
 * roya las manchas son manchones lobulados que a veces se funden.)
 *
 * OJO — lección aprendida mirando el primer render: si se suman armónicos
 * (l y l+2) con poco ruido, sale un TRÉBOL. Un hueco de mordisco dibujado
 * así parece una flor pegada en la hoja, y arruina la lámina entera. Por eso
 * acá van tres frecuencias NO armónicas (l, l+3, l+7), ruido de verdad
 * encima, y `alargue`+`rot` para estirar la marca en la dirección que le toca
 * (los huecos de mordisco se estiran ENTRE vena y vena, porque el bicho
 * esquiva la nervadura dura).
 *
 * @param {number} [rot] giro de la marca, en grados.
 */
export function blob({ cx, cy, r, semilla, lobulos = 3, rugosidad = 0.22, alargue = 1, rot = 0 }) {
  const rnd = prngDe(semilla);
  const f1 = rnd() * Math.PI * 2;
  const f2 = rnd() * Math.PI * 2;
  const f3 = rnd() * Math.PI * 2;
  const co = Math.cos((rot * Math.PI) / 180);
  const si = Math.sin((rot * Math.PI) / 180);
  const pts = [];
  const N = 22;
  for (let i = 0; i < N; i += 1) {
    const a = (i / N) * Math.PI * 2;
    const k =
      1 +
      rugosidad * Math.sin(lobulos * a + f1) +
      rugosidad * 0.55 * Math.sin((lobulos + 3) * a + f2) +
      rugosidad * 0.32 * Math.sin((lobulos + 7) * a + f3) +
      (rnd() - 0.5) * rugosidad * 1.2;
    const px = Math.cos(a) * r * k * alargue;
    const py = Math.sin(a) * r * k;
    pts.push({ x: cx + px * co - py * si, y: cy + px * si + py * co });
  }
  return curvaCerrada(pts, 1);
}

/**
 * El POLVO de la roya: lo que de verdad se ve en `hemileia_vastatrix.jpg`.
 *
 * No es una mancha naranja plana — es POLVILLO: miles de uredosporas que
 * reventaron por los estomas del envés. Se ve como cúrcuma regada: grano,
 * no pintura. Denso en el centro, ralo en la orilla, y siempre con unas
 * esporas sueltas más allá (el polvo que ya se regó — la pista de que la
 * cosa se está moviendo).
 *
 * @returns {{granos: Array, sueltas: Array}} círculos listos para pintar.
 */
export function polvoRoya({ cx, cy, r, semilla, densidad = 150, alargue = 1 }) {
  const rnd = prngDe(semilla);
  const granos = [];
  for (let i = 0; i < densidad; i += 1) {
    const a = rnd() * Math.PI * 2;
    /* sesgo al centro: ^1.15 apiña adentro y deja la orilla deshilachada */
    const rho = Math.pow(rnd(), 1.15);
    const ondul = 1 + 0.2 * Math.sin(3 * a + semilla);
    const d = rho * r * ondul;
    granos.push({
      x: r2(cx + Math.cos(a) * d * alargue),
      y: r2(cy + Math.sin(a) * d),
      r: r2(0.34 + rnd() * 0.92 * (1 - rho * 0.45)),
      /* el centro es naranja quemado; la orilla, amarillo pálido */
      tono: rho,
      op: r2(0.5 + (1 - rho) * 0.5),
    });
  }
  /* esporas sueltas: el polvo que se cayó al voltear la hoja */
  const sueltas = [];
  for (let i = 0; i < Math.round(densidad * 0.12); i += 1) {
    const a = rnd() * Math.PI * 2;
    const d = r * (1.15 + rnd() * 1.5);
    sueltas.push({
      x: r2(cx + Math.cos(a) * d * alargue),
      y: r2(cy + Math.sin(a) * d),
      r: r2(0.3 + rnd() * 0.5),
      op: r2(0.3 + rnd() * 0.4),
    });
  }
  return { granos, sueltas };
}

/**
 * Un mordisco: el trozo que se comió el bicho.
 *
 * Clave de realismo (foto `alternaria_solani.jpg`, borde comido; y cualquier
 * hoja mordida de verdad): el mordisco NO es una muesca limpia de tijera.
 * Es una bahía de borde irregular, y la herida CICATRIZA: queda un filito
 * pardo y un halo amarillento alrededor del corte. Ese filito pardo es la
 * diferencia entre un dibujo creíble y una hoja de caricatura con muescas.
 */
export function mordisco({ cx, cy, r, semilla }) {
  return blob({ cx, cy, r, semilla, lobulos: 4, rugosidad: 0.3 });
}

/**
 * Excremento de gusano (frass). No son puntos redondos: son barrilitos
 * acanalados, verde-pardo, y se acumulan donde el bicho estuvo comiendo —
 * en la horqueta de la vena o en el cogollo. Encontrar frass sin ver el
 * bicho es prueba suficiente de plaga: el rastro cuenta.
 */
export function frass({ cx, cy, n, radio, semilla }) {
  const rnd = prngDe(semilla);
  const bolitas = [];
  for (let i = 0; i < n; i += 1) {
    const a = rnd() * Math.PI * 2;
    const d = Math.pow(rnd(), 0.6) * radio;
    bolitas.push({
      x: r2(cx + Math.cos(a) * d),
      y: r2(cy + Math.sin(a) * d * 0.8),
      w: r2(2.1 + rnd() * 1.1),
      h: r2(1.35 + rnd() * 0.6),
      rot: r2(rnd() * 180),
    });
  }
  return bolitas;
}
