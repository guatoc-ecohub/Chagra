/*
 * entQuenua.geom — la GEOMETRÍA del Ent del páramo (queñua / colorado,
 * *Polylepis* spp.), separada en funciones PURAS y testeables (sin WebGL).
 *
 * La queñua es el árbol más alto del páramo andino y su forma REAL ya es la de
 * un guardián: tronco grueso RETORCIDO y nudoso, corteza rojiza que se pela en
 * láminas de papel, ramas torcidas, copa de hojitas pequeñas verde-plateadas.
 * No inventamos un personaje encima del árbol: TALLAMOS el árbol y dejamos que
 * el rostro aparezca en la madera (ojos hundidos, cejas de corteza, boca-grieta).
 *
 * Aquí viven SOLO los datos y las mallas procedurales (three core, que corre
 * headless — cero contexto GL). El componente r3f (`EntQuenua.jsx`) consume esto
 * y le pone luz, material y vida. Cero assets externos: todo es procedural.
 */
import * as THREE from 'three';

/* PRNG determinista: el mismo guardián en cada carga (nada de azar por frame). */
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/*
 * PARÁMETROS por tier (tier-safe, DR §6). El look imponente vive en 'alto';
 * 'medio' es frugal (menos hojas/segmentos, sin PBR); 'bajo' es el mínimo digno
 * (aún se lee el árbol con cara, sin niebla ni facetado caro).
 */
export const PARAMS_TIER = {
  alto: {
    tubular: 124, radial: 16, hojas: 680, clusters: 9, ramas: 5, raices: 6,
    frailejones: 5, materialRico: true, flatShading: true, fog: true,
    barbaDens: 1, segRostro: [56, 62], detalleMasa: 2,
  },
  medio: {
    tubular: 76, radial: 10, hojas: 340, clusters: 7, ramas: 5, raices: 5,
    frailejones: 4, materialRico: false, flatShading: false, fog: true,
    barbaDens: 0.62, segRostro: [40, 44], detalleMasa: 2,
  },
  bajo: {
    tubular: 44, radial: 8, hojas: 120, clusters: 4, ramas: 3, raices: 4,
    frailejones: 0, materialRico: false, flatShading: false, fog: false,
    barbaDens: 0.34, segRostro: [26, 30], detalleMasa: 1,
  },
};

/** Parámetros del Ent para un tier (desconocido → 'medio', nunca el más caro). */
export const paramsDeTier = (tier) => PARAMS_TIER[tier] || PARAMS_TIER.medio;

/* Paleta de la corteza del colorado: del valle oscuro de la grieta al papel
   rojizo que se pela en la cresta, con un toque de líquen del páramo abajo. */
export const CORTEZA = {
  valle: new THREE.Color('#4a2a20'), // fondo de grieta, casi cacao
  cuerpo: new THREE.Color('#8a4a33'), // corteza rojiza madura
  papel: new THREE.Color('#cf9166'), // lámina de papel que se despega (cresta)
  liquen: new THREE.Color('#6f7d4f'), // líquen/musgo del páramo en la base
};

export const ALTURA_TRONCO = 6.0; // metros-escena de la base a la corona

/*
 * La espina del tronco: una curva SINUOSA que se inclina y se retuerce, más
 * dramática abajo (donde el árbol pelea con el viento del páramo). Catmull-Rom
 * para que quede orgánica, no un tubo recto.
 */
export function curvaTronco(seed = 7) {
  const r = rng(seed);
  const j = (a) => (r() - 0.5) * a; // temblor determinista
  // Un solo fuste erguido que se inclina y curva con suavidad (nudoso, no
  // zigzag): las desviaciones respecto al eje crecen hacia la copa, donde el
  // árbol se abre. Abajo se mantiene más aplomado para leer como UN tronco.
  const pts = [
    new THREE.Vector3(0.00, 0.00, 0.00),
    new THREE.Vector3(0.08 + j(0.05), 0.85, 0.05 + j(0.04)),
    new THREE.Vector3(-0.12 + j(0.05), 1.75, -0.08 + j(0.04)),
    new THREE.Vector3(0.14 + j(0.06), 2.65, 0.10 + j(0.05)),
    new THREE.Vector3(-0.05 + j(0.07), 3.55, -0.04 + j(0.05)),
    new THREE.Vector3(0.28 + j(0.08), 4.40, 0.16 + j(0.06)),
    new THREE.Vector3(0.20 + j(0.08), 5.20, -0.02 + j(0.06)),
    new THREE.Vector3(0.42 + j(0.06), ALTURA_TRONCO, 0.14 + j(0.06)),
  ];
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4);
}

/*
 * Taper del tronco: radio-mundo a lo largo de t∈[0,1]. Base ENSANCHADA y
 * nudosa (raigón), estrangulamientos donde nacen las ramas, punta fina. Es lo
 * que le da el peso ancestral: no es un cono, es un raigón que sube.
 */
export function taperTronco(t) {
  // `1 - t` puede quedar levemente negativo por error de punto flotante en la
  // punta (t≈1) → `Math.pow(neg, 1.35)` es NaN. Se acota a [0,1].
  const base = 0.86 * Math.pow(Math.max(0, 1 - t), 1.35) + 0.12; // grueso abajo → fino arriba
  const raigon = 0.28 * Math.exp(-t * 9); // ensanche del pie (contrafuertes)
  const nudo = 0.05 * Math.sin(t * 7.5) * Math.sin(t * Math.PI); // pulsos de nudo
  // HOMBROS: un ensanche suave donde nacen los brazos-rama (t≈0.52) — le da al
  // fuste la silueta de un cuerpo de guardián, no la de un poste tapereado.
  const dh = (t - 0.52) / 0.11;
  const hombro = 0.075 * Math.exp(-dh * dh);
  return Math.max(0.05, base + raigon + nudo + hombro);
}

/*
 * Desplazamiento de la corteza en un punto (t a lo largo, ang alrededor): surcos
 * verticales + bandas de nudo + rugosidad. Devuelve un factor relativo (~±0.16)
 * que multiplica el radio → surcos y nudos reales en la malla, no un normal-map.
 */
export function desplazamientoCorteza(t, ang) {
  // Surcos FINOS y numerosos (corteza acanalada), poco profundos: dan textura
  // sin partir el tronco en "trenzas". La rugosidad de nudo se concentra abajo.
  const surcos = 0.075 * Math.sin(ang * 9.0 + t * 2.5); // acanaladuras verticales
  const surcosF = 0.04 * Math.sin(ang * 17 - t * 3); // grano de corteza más fino
  const bandas = 0.04 * Math.sin(t * 22 + ang * 1.5); // vetas horizontales
  const nudos = 0.06 * Math.sin(ang * 2.0 - t * 6.5) * Math.sin(t * Math.PI); // nudos suaves
  const aspereza = 0.02 * Math.sin(ang * 23 + t * 40); // aspereza
  // PLACAS: crestas anchas de borde firme (tanh aplana el seno → meseta) que
  // parten la corteza en placas leñosas serpenteantes — el tallado profundo que
  // se lee de lejos, encima del grano fino. Amplitud generosa: madera vieja.
  const placas = 0.09 * Math.tanh(Math.sin(ang * 3.4 + Math.sin(t * 5.2) * 1.1 + t * 0.8) * 2.4);
  const placasV = 0.05 * Math.tanh(Math.sin(t * 9 + ang * 0.6 + Math.sin(ang * 2) * 0.8) * 2.2); // segmenta a lo alto
  const masAbajo = 1 + (1 - t) * 0.4; // el pie es algo más rugoso
  return (surcos + surcosF + bandas + nudos + aspereza + placas + placasV) * masAbajo;
}

/* Color de corteza para un desplazamiento dado (cresta pelada clara, grieta
   oscura) con un velo de líquen en la base. Devuelve una THREE.Color nueva. */
export function colorCorteza(disp, t) {
  const n = Math.max(0, Math.min(1, (disp + 0.16) / 0.32)); // grieta 0 → cresta 1
  const c = CORTEZA.valle.clone().lerp(CORTEZA.cuerpo, Math.min(1, n * 1.7));
  if (n > 0.6) c.lerp(CORTEZA.papel, (n - 0.6) / 0.4); // papel en la cresta
  if (t < 0.45 && disp < 0) {
    const musgo = (0.45 - t) / 0.45 * 0.35; // líquen que trepa el pie
    c.lerp(CORTEZA.liquen, musgo);
  }
  return c;
}

/*
 * Construye una malla de TUBO ORGÁNICO tapereado y con corteza, siguiendo una
 * curva. Reutilizada por tronco, ramas y raíces. Parte de un TubeGeometry de
 * radio 1 y reubica cada vértice: escala su offset respecto al eje por el taper
 * y el desplazamiento, y le pinta vertexColor de corteza.
 *
 * @returns {THREE.BufferGeometry} geometría con atributo `color`.
 */
export function tuboOrganico(curve, { tubular, radial, taperFn, dispAmp = 1, seedAng = 0, bahia = null }) {
  const geo = new THREE.TubeGeometry(curve, tubular, 1, radial, false);
  const pos = geo.attributes.position;
  const nAnillo = radial + 1;

  // Centros de cada anillo (una sola vez): coinciden con los de TubeGeometry.
  const centros = [];
  for (let i = 0; i <= tubular; i++) centros.push(curve.getPointAt(i / tubular));

  const colores = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  const off = new THREE.Vector3();

  for (let k = 0; k < pos.count; k++) {
    const anillo = Math.floor(k / nAnillo);
    const j = k % nAnillo;
    const t = anillo / tubular;
    const ang = (j / radial) * Math.PI * 2 + seedAng;
    const centro = centros[Math.min(anillo, centros.length - 1)];

    v.fromBufferAttribute(pos, k);
    off.subVectors(v, centro); // offset unitario en el plano normal-binormal
    let disp = desplazamientoCorteza(t, ang) * dispAmp;
    let escBahia = 1;
    if (bahia) {
      // la BAHÍA del rostro: en el sector frontal donde vive la cáscara tallada,
      // el tronco se RECOGE y calma su corteza para que ningún surco se asome
      // por dentro de las cuencas o de la boca-grieta. Los bordes de la bahía se
      // funden suaves con la corteza plena (jamás un escalón).
      const az = Math.atan2(Math.abs(off.x), off.z); // 0 = frente puro (+Z)
      const mAng = 1 - suave(0.75, 1.1, az);
      const mVert = 1 - suave(0.55, 0.85, Math.abs((centro.y - bahia.cy) / 1.55 + 0.1));
      const m = mAng * mVert;
      disp *= 1 - 0.9 * m;
      escBahia = 1 - 0.38 * m;
    }
    const radio = taperFn(t) * (1 + disp) * escBahia;
    v.copy(centro).addScaledVector(off, radio);
    pos.setXYZ(k, v.x, v.y, v.z);

    const col = colorCorteza(disp, t);
    colores[k * 3] = col.r;
    colores[k * 3 + 1] = col.g;
    colores[k * 3 + 2] = col.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** Geometría del tronco completo (con la corteza rojiza pelada y la bahía
    excavada tras el rostro, para que la cáscara tallada siempre lo cubra). */
export function geometriaTronco({ tubular, radial }, seed = 7) {
  const curva = curvaTronco(seed);
  return tuboOrganico(curva, {
    tubular, radial, taperFn: taperTronco, dispAmp: 1, seedAng: 0.6,
    bahia: { cy: curva.getPointAt(ROSTRO_T).y },
  });
}

/*
 * Ramas torcidas que salen del tronco. Cada una nace en un punto del tronco
 * (t_base) y crece hacia afuera y arriba con una torcedura (dos curvas de
 * control con temblor). Devuelve specs {curve, r0} para construir su tubo.
 */
export function specsRamas(n, seed = 21) {
  const r = rng(seed);
  const curva = curvaTronco(seed >> 1 || 3);
  // Nacen del tercio alto (por encima del rostro) y trepan hacia la copa.
  const alturas = [0.6, 0.7, 0.78, 0.85, 0.9, 0.94];
  const specs = [];
  for (let i = 0; i < n; i++) {
    const tBase = alturas[i % alturas.length];
    const base = curva.getPointAt(tBase);
    const ang = (i / n) * Math.PI * 2 + r() * 0.8;
    const largo = 1.3 + r() * 0.7 - tBase * 0.3;
    const dirX = Math.cos(ang);
    const dirZ = Math.sin(ang);
    const sube = 1.1 + r() * 0.6; // suben con ganas hacia la copa
    // Codo torcido: arranca abriéndose y enseguida se endereza hacia arriba.
    const pts = [
      base.clone(),
      base.clone().add(new THREE.Vector3(dirX * largo * 0.35, sube * 0.28, dirZ * largo * 0.35)),
      base.clone().add(new THREE.Vector3(dirX * largo * 0.7 + (r() - 0.5) * 0.25, sube * 0.68, dirZ * largo * 0.7 + (r() - 0.5) * 0.25)),
      base.clone().add(new THREE.Vector3(dirX * largo, sube, dirZ * largo)),
    ];
    const curveRama = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    const r0 = Math.max(0.05, taperTronco(tBase) * 0.42);
    // Punta de la rama: donde cuelga un cluster de copa.
    const punta = pts[pts.length - 1].clone();
    specs.push({ curve: curveRama, r0, punta, tBase });
  }
  return specs;
}

/** Taper lineal para una rama/raíz (r0 en la base → punta fina). */
export function taperLineal(r0, r1 = 0.03) {
  return (t) => Math.max(0.02, r0 * (1 - t) + r1 * t);
}

/*
 * Raíces que agarran la tierra: nacen del pie y se hunden hacia afuera y abajo,
 * como dedos nudosos. Devuelve specs {curve, r0}.
 */
export function specsRaices(n, seed = 33) {
  const r = rng(seed);
  const specs = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + r() * 0.5;
    const largo = 0.5 + r() * 0.3; // CORTO: contrafuerte, no palito tendido
    const dirX = Math.cos(ang);
    const dirZ = Math.sin(ang);
    // Contrafuerte: nace ALTO en el pie, se abre y se HUNDE rápido en la tierra.
    // El tramo profundo queda bajo el suelo (oculto): solo se ve el raigón que
    // agarra la tierra, nunca un palo horizontal.
    const pts = [
      new THREE.Vector3(dirX * 0.2, 0.55, dirZ * 0.2),
      new THREE.Vector3(dirX * largo * 0.7, 0.12, dirZ * largo * 0.7),
      new THREE.Vector3(dirX * largo, -0.3, dirZ * largo),
      new THREE.Vector3(dirX * largo * 1.05, -0.8 - r() * 0.2, dirZ * largo * 1.05),
    ];
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    specs.push({ curve, r0: 0.3 + r() * 0.08 }); // grueso, de contrafuerte
  }
  return specs;
}

/*
 * Clusters de la COPA: nubes de hojitas cerca de las puntas de rama + la corona
 * del tronco. Cada cluster {center, radio, count} recibe una fracción del
 * presupuesto total de hojas.
 */
export function clustersCopa(puntasRama, { clusters, hojas }, seed = 51) {
  const r = rng(seed);
  const curva = curvaTronco(7);
  const centros = [];
  // La corona: encima de la punta del tronco.
  centros.push({ center: curva.getPointAt(1).clone().add(new THREE.Vector3(0.1, 0.5, 0)), radio: 1.25 });
  // Una copa por punta de rama (hasta llenar `clusters`).
  for (const p of puntasRama) {
    if (centros.length >= clusters) break;
    centros.push({ center: p.clone().add(new THREE.Vector3(0, 0.2, 0)), radio: 0.82 + r() * 0.3 });
  }
  // Si faltan clusters (pocas ramas), rellena alrededor de la corona.
  while (centros.length < clusters) {
    const a = r() * Math.PI * 2;
    const rad = 0.7 + r() * 0.6;
    centros.push({
      center: curva.getPointAt(0.9).clone().add(new THREE.Vector3(Math.cos(a) * rad, 0.3 + r() * 0.5, Math.sin(a) * rad)),
      radio: 0.55 + r() * 0.25,
    });
  }
  const porCluster = Math.max(8, Math.floor(hojas / centros.length));
  return centros.map((c, i) => ({ ...c, count: porCluster, seed: seed + i * 17 }));
}

/*
 * Transformaciones de las HOJITAS de un cluster (relativas a su centro, para
 * poder mecer el grupo entero). Distribución en volumen elipsoidal, tamaño y
 * giro variados, y un tono 0..1 (verde ↔ verde-plateado) para instanceColor.
 */
export function hojasDeCluster({ radio, count, seed }) {
  const r = rng(seed);
  const hojas = [];
  for (let i = 0; i < count; i++) {
    // Punto dentro de una esfera, achatada un poco (copa más ancha que alta).
    const u = r() * 2 - 1;
    const theta = r() * Math.PI * 2;
    const rad = radio * Math.cbrt(r());
    const s = Math.sqrt(1 - u * u);
    const x = rad * s * Math.cos(theta);
    const y = rad * u * 0.8;
    const z = rad * s * Math.sin(theta);
    hojas.push({
      pos: [x, y, z],
      escala: 0.07 + r() * 0.08,
      rot: [r() * Math.PI, r() * Math.PI, r() * Math.PI],
      tono: r(), // 0 verde profundo → 1 verde-plateado
    });
  }
  return hojas;
}

/* Los dos tonos de la copa: hojita verde y su envés plateado del colorado. */
export const HOJA = {
  verde: new THREE.Color('#556f3f'),
  plata: new THREE.Color('#aab89a'),
};

/** Color de una hojita según su tono 0..1 (verde → verde-plateado). */
export function colorHoja(tono) {
  return HOJA.verde.clone().lerp(HOJA.plata, tono);
}

/*
 * El ROSTRO tallado en el tronco (el alma del Ent). Devuelve las posiciones en
 * coords del tronco: ojos hundidos, cejas de corteza, boca-grieta. Colocadas
 * sobre la curva a la altura de la mirada, mirando al frente (+Z).
 */
export function anclaRostro(seed = 7) {
  const curva = curvaTronco(seed);
  const t = 0.34; // altura de la mirada
  const centro = curva.getPointAt(t);
  const radio = taperTronco(t); // el rostro se apoya en la superficie frontal
  return { centro, radio, t };
}

/* smoothstep clásico: 0 en a, 1 en b, suave en el medio. */
const suave = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* gaussiana 2D anisótropa: el cincel con el que se talla el campo del rostro. */
const g2 = (x, y, cx, cy, rx, ry) => {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return Math.exp(-(dx * dx + dy * dy));
};

/* Altura paramétrica del rostro sobre la curva del tronco y línea de la boca
   (coordenada Y local del grupo del rostro — la misma que usan ojos y barba). */
export const ROSTRO_T = 0.34;
export const ROSTRO_BOCA_Y = -0.445;
// Escala del grupo del rostro (y de la barba, que comparte ancla). La cáscara
// (`mallaRostro`) usa estos mismos factores para convertir las coords del tronco
// a las locales, así que TODO lo que lo monte debe usar ROSTRO_ESCALA — cambiarla
// aquí reescala rostro y barba a la vez sin desalinear la talla.
/** @type {[number, number, number]} */
export const ROSTRO_ESCALA = [1.62, 1.68, 1.24];

/*
 * El CAMPO del rostro: para un punto (x lateral, y vertical) en coords locales
 * del rostro, cuánto se desplaza la corteza hacia afuera (+) o se hunde (−),
 * y cuánta sombra tallada lleva. Es el rostro ENTERO como campo escalar —
 * frente pesada, cejas-cornisa, cuencas hondas, nariz de nudo, labios de
 * corteza alrededor de la boca-grieta, mentón macizo — que luego la cáscara
 * (`mallaRostro`) convierte en relieve REAL de la madera. Pura y testeable.
 */
export function campoRostro(x, y) {
  let d = 0;
  // PANEL FACIAL: la cara vive sobre un plano frontal REHUNDIDO en el tronco (así
  // Bárbol: la madera se aplana y retrocede, y los rasgos se tallan sobre ese
  // panel). Sin esto la suma de rasgos abomba toda la cara como una cúpula pegada.
  const panel = g2(x, y, 0, -0.06, 0.46, 0.6);
  d -= 0.13 * panel;
  // FRENTE: apenas se recupera del panel (superficie sobre la que cuelga la cornisa)
  d += 0.05 * g2(x, y, 0, 0.36, 0.5, 0.26);
  // CEJAS-CORNISA: los aleros pesados de corteza que SOBRESALEN y encapuchan los
  // ojos. Fuertes hacia afuera, con leve asimetría (madera viva).
  d += 0.2 * g2(x, y, -0.235, 0.13, 0.21, 0.07);
  d += 0.2 * g2(x, y, 0.245, 0.145, 0.22, 0.075);
  // el HUECO de sombra justo bajo la cornisa (el párpado hundido) — carga el
  // encapuchado que hace la mirada sabia
  d -= 0.14 * (g2(x, y, -0.235, 0.03, 0.17, 0.06) + g2(x, y, 0.245, 0.04, 0.18, 0.065));
  // entrecejo: el surco vertical del pensamiento, hondo entre las cejas
  d -= 0.11 * g2(x, y, 0, 0.15, 0.05, 0.14);
  // CUENCAS: pozos HONDOS donde se hunden los ojos ámbar (sombra que los encapucha)
  const cuencas = g2(x, y, -0.235, -0.03, 0.15, 0.12) + g2(x, y, 0.245, -0.02, 0.155, 0.125);
  d -= 0.44 * cuencas;
  // NARIZ: lomo ANCHO de madera que baja del entrecejo, se ensancha y termina en
  // nudo — sobresale de verdad (el rasgo más prominente de la cara).
  const caida = Math.min(1, Math.max(0, (0.14 - y) / 0.3)); // 0 arriba → 1 punta
  d += (0.12 + 0.16 * caida) * g2(x, 0, 0, 0, 0.09 + 0.05 * caida, 1) * g2(0, y, 0, -0.04, 1, 0.22);
  d += 0.17 * g2(x, y, 0, -0.17, 0.12, 0.08); // el nudo de la punta
  const fosas = g2(x, y, -0.07, -0.235, 0.045, 0.035) + g2(x, y, 0.07, -0.235, 0.045, 0.035);
  d -= 0.12 * fosas;
  // PÓMULOS anchos que pegan la luz + surcos nasolabiales hondos (la vejez del árbol)
  d += 0.09 * (g2(x, y, -0.42, -0.16, 0.19, 0.16) + g2(x, y, 0.42, -0.15, 0.19, 0.16));
  d -= 0.08 * (g2(x, y, -0.2, -0.32, 0.055, 0.13) + g2(x, y, 0.2, -0.32, 0.055, 0.13));
  // bolsas bajo los ojos (peso de los años)
  d += 0.05 * (g2(x, y, -0.235, -0.16, 0.13, 0.05) + g2(x, y, 0.245, -0.15, 0.13, 0.05));
  // BOCA: labios de corteza alrededor de la grieta (la grieta es un pozo hondo)
  d += 0.08 * g2(x, y, 0, -0.375, 0.28, 0.055); // labio superior
  d += 0.1 * g2(x, y, 0, -0.53, 0.25, 0.065); // labio inferior
  const grieta = g2(x, y, 0, ROSTRO_BOCA_Y, 0.32, 0.05);
  d -= 0.36 * grieta;
  // MENTÓN macizo (el peso del árbol viejo; la barba lo enmarca)
  d += 0.12 * g2(x, y, 0, -0.68, 0.22, 0.14);
  // ARRUGAS de madera: grano fino que cruza el rostro (leve — sigue siendo corteza)
  d += 0.02 * Math.sin(x * 30 + y * 6) + 0.017 * Math.sin(y * 24 + x * 4);
  d -= 0.03 * Math.sin(y * 30) * g2(x, y, 0, 0.4, 0.44, 0.22); // pliegues de la frente
  const sombra = Math.min(1, cuencas * 1.0 + grieta * 1.15 + fosas * 0.8 + panel * 0.12);
  return { d, sombra };
}

/*
 * La CÁSCARA del rostro: una malla paramétrica DENSA que abraza el tronco
 * (sigue su curva, su taper y su corteza) y sobre la que el `campoRostro`
 * talla el relieve REAL — el rostro EMERGE de la madera, no es una careta
 * pegada. Se construye en las coords locales del grupo del rostro (el grupo
 * va en `anclaRostro().centro` con escala [1.5, 1.55, 1.15], la misma que
 * usan los ojos y la barba, así todo sigue alineado).
 *
 * Devuelve DOS geometrías: `cara` (de la línea de la boca hacia arriba) y
 * `mandibula` (labio inferior + mentón), esta última con el origen en la
 * línea de la boca para poder pivotarla al hablar (rotation.x abre la boca).
 */
export function mallaRostro({ segRostro = [48, 54] } = {}, seed = 7) {
  const curva = curvaTronco(seed);
  const centro = curva.getPointAt(ROSTRO_T);
  const [segU, segV] = segRostro;
  const angMax = 1.4; // medio-abanico amplio: la cara ocupa buena parte del frente

  // wBajo/wAlto: cuánto se tuca cada borde horizontal. Los bordes EXTERIORES se
  // hunden de lleno en el tronco; los bordes de la COSTURA de la boca apenas
  // (las dos cáscaras se encuentran casi al ras y la grieta del campo hace el
  // resto — sin una trinchera de lado a lado de la cara).
  const construye = (yMin, yMax, pivotY, filas, wBajo, wAlto) => {
    const cols = segU + 1;
    const rows = filas + 1;
    const pos = new Float32Array(cols * rows * 3);
    const col = new Float32Array(cols * rows * 3);
    const idx = [];
    const c = new THREE.Color();
    for (let iv = 0; iv < rows; iv++) {
      const vN = iv / filas;
      const y = yMin + (yMax - yMin) * vN;
      // la cáscara SIGUE el tronco: a esta altura local, qué t, radio y centro
      const t = Math.max(0.02, Math.min(0.98, ROSTRO_T + (y * ROSTRO_ESCALA[1]) / ALTURA_TRONCO));
      const R = taperTronco(t);
      const pC = curva.getPointAt(t);
      const offX = (pC.x - centro.x) / ROSTRO_ESCALA[0];
      const offZ = (pC.z - centro.z) / ROSTRO_ESCALA[2];
      for (let iu = 0; iu < cols; iu++) {
        const uN = iu / segU;
        const ang = (uN * 2 - 1) * angMax;
        const xl = (Math.sin(ang) * R) / ROSTRO_ESCALA[0]; // lateral local sobre la superficie
        const { d, sombra } = campoRostro(xl, y);
        // máscara del óvalo: adentro manda la talla; afuera, la corteza normal
        const m = Math.exp(-((xl / 0.56) ** 2 + ((y + 0.08) / 0.66) ** 2));
        const bark = desplazamientoCorteza(t, ang + 0.6) * (0.35 + 0.65 * (1 - m));
        // borde: la cáscara se HUNDE en el tronco (jamás un canto flotando)
        const eU = suave(0.7, 1, Math.abs(ang) / angMax);
        const eV = Math.max(wAlto * suave(0.78, 1, vN), wBajo * suave(0.78, 1, 1 - vN));
        const borde = Math.max(eU, eV);
        // GANANCIA de relieve: el tallado es HONDO de verdad (el rostro emerge y se
        // hunde en la madera, no un bajorrelieve tímido). Sin proud global → al ras.
        const relieve = d * 1.5 * m;
        const f = (1 + relieve * (1 - borde) + bark) * (1 - 0.28 * borde);
        const k = (iv * cols + iu) * 3;
        pos[k] = (Math.sin(ang) * R * f) / ROSTRO_ESCALA[0] + offX;
        pos[k + 1] = y - pivotY;
        pos[k + 2] = (Math.cos(ang) * R * f) / ROSTRO_ESCALA[2] + offZ;
        // color: corteza + pátina clara de madera vieja + cresta pelada + sombra
        c.copy(colorCorteza(bark + d * 0.9, t));
        if (m > 0.2) c.lerp(CORTEZA.papel, m * 0.14);
        if (d > 0.1) c.lerp(CORTEZA.papel, Math.min(0.45, (d - 0.1) * 1.9));
        c.multiplyScalar(1 - 0.6 * sombra * (1 - borde));
        col[k] = c.r;
        col[k + 1] = c.g;
        col[k + 2] = c.b;
      }
    }
    for (let iv = 0; iv < filas; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = iv * cols + iu;
        const b = a + 1;
        const cc = a + cols;
        const dd = cc + 1;
        idx.push(a, b, cc, b, dd, cc); // normales hacia afuera (+Z al frente)
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  };

  const filasCara = Math.max(8, Math.round(segV * 0.72));
  const filasMand = Math.max(6, segV - filasCara);
  return {
    cara: construye(ROSTRO_BOCA_Y, 0.78, 0, filasCara, 0.18, 1),
    mandibula: construye(-0.98, ROSTRO_BOCA_Y, ROSTRO_BOCA_Y, filasMand, 1, 0.18),
  };
}

/* Los tonos de la MASA de follaje: del hueco profundo al haz plateado al sol. */
export const FOLLAJE = {
  profundo: new THREE.Color('#42582f'),
  medio: new THREE.Color('#5c7440'),
  plata: new THREE.Color('#a9b998'),
};

/*
 * MASA de follaje con HUECOS: una esfera subdividida que deja de ser esfera —
 * lóbulos que la inflan, mordiscos que abren huecos de cielo, grano fino — y
 * queda como un cúmulo de hojas facetado (color POR CARA: arriba plateado al
 * sol, los huecos en verde profundo). Es la copa que se lee como MASA de
 * hojitas con sombra propia, no un poliedro literal ni confeti de partículas.
 */
export function geometriaMasaFollaje(radio, seed = 11, detalle = 2) {
  const r = rng(seed);
  const base = new THREE.IcosahedronGeometry(radio, Math.max(1, detalle));
  const geo = base.toNonIndexed(); // caras sueltas → facetado nítido por cara
  base.dispose();
  const lobos = [];
  for (let i = 0; i < 5; i++) {
    lobos.push({
      dir: new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize(),
      peso: 0.22 + r() * 0.3,
    });
  }
  const huecos = [];
  for (let i = 0; i < 3; i++) {
    huecos.push({
      dir: new THREE.Vector3(r() * 2 - 1, (r() * 2 - 1) * 0.7, r() * 2 - 1).normalize(),
      prof: 0.3 + r() * 0.25,
    });
  }
  const pos = geo.attributes.position;
  const n = new THREE.Vector3();
  // el factor depende SOLO de la dirección → vértices repetidos coinciden y la
  // malla no se raja aunque esté des-indexada
  for (let k = 0; k < pos.count; k++) {
    n.fromBufferAttribute(pos, k).normalize();
    let f = 0.8;
    for (const L of lobos) f += L.peso * Math.pow(Math.max(0, n.dot(L.dir)), 3);
    for (const H of huecos) f -= H.prof * Math.pow(Math.max(0, n.dot(H.dir)), 5);
    f += 0.06 * Math.sin(n.x * 6.3 + n.y * 4.7 + n.z * 5.1 + seed);
    f = Math.max(0.4, f);
    pos.setXYZ(k, n.x * radio * f, n.y * radio * f, n.z * radio * f);
  }
  // color POR CARA: altura + qué tan afuera está la cara (hueco ↔ lóbulo)
  const col = new Float32Array(pos.count * 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const cv = new THREE.Vector3();
  const c = new THREE.Color();
  for (let tri = 0; tri < pos.count / 3; tri++) {
    a.fromBufferAttribute(pos, tri * 3);
    b.fromBufferAttribute(pos, tri * 3 + 1);
    cv.fromBufferAttribute(pos, tri * 3 + 2);
    a.add(b).add(cv).multiplyScalar(1 / 3);
    const altura = Math.max(0, Math.min(1, (a.y / radio) * 0.5 + 0.5));
    const rad = a.length() / radio;
    const luz = Math.max(0, Math.min(1, altura * 0.55 + (rad - 0.55) * 0.7));
    const hash = Math.sin(tri * 12.9898 + seed) * 43758.5453;
    const jitter = (hash - Math.floor(hash)) * 0.22;
    c.copy(FOLLAJE.profundo).lerp(FOLLAJE.medio, Math.min(1, luz * 1.4 + jitter));
    if (luz > 0.55) c.lerp(FOLLAJE.plata, (luz - 0.55) * 1.5 * (0.6 + jitter));
    for (let v = 0; v < 3; v++) {
      col[(tri * 3 + v) * 3] = c.r;
      col[(tri * 3 + v) * 3 + 1] = c.g;
      col[(tri * 3 + v) * 3 + 2] = c.b;
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

/*
 * Los BRAZOS del guardián: dos ramas-brazo que nacen de los hombros (t≈0.52),
 * se abren a los lados, doblan el codo y CAEN con peso — la silueta humanoide
 * del árbol viejo. Terminan en una muñeca donde el componente arma dedos-ramita.
 * No invaden el frente: el rostro queda enmarcado, nunca tapado.
 */
export function specsBrazos(seed = 63) {
  const r = rng(seed);
  const curva = curvaTronco(7);
  const brazos = [];
  const lados = [
    { s: -1, tH: 0.52, drop: 1.65, alza: 0.06 },
    { s: 1, tH: 0.545, drop: 1.35, alza: 0.22 },
  ];
  for (const L of lados) {
    const hombro = curva.getPointAt(L.tH);
    const j = () => (r() - 0.5) * 0.12;
    const pts = [
      hombro.clone(),
      hombro.clone().add(new THREE.Vector3(L.s * 0.62, 0.1 + L.alza, 0.18 + j())),
      hombro.clone().add(new THREE.Vector3(L.s * 1.12, -L.drop * 0.34 + L.alza, 0.42 + j())),
      hombro.clone().add(new THREE.Vector3(L.s * 1.5, -L.drop * 0.75, 0.6 + j())),
      hombro.clone().add(new THREE.Vector3(L.s * 1.62, -L.drop, 0.72)),
    ];
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.55);
    brazos.push({ curve, r0: 0.24 + r() * 0.04, muneca: pts[pts.length - 1].clone(), s: L.s });
  }
  return brazos;
}

/*
 * Factor de PARPADEO 0..1 (1 = ojo abierto, ~0.08 = cerrado). Parpadeo lento y
 * ancestral: la mayor parte del tiempo abierto, un pestañeo corto cada ~periodo.
 */
export function factorParpadeo(t, periodo = 6.2) {
  const fase = (t % periodo) / periodo; // 0..1 en el ciclo
  const cierre = 0.06; // fracción del ciclo que dura el pestañeo
  if (fase > 1 - cierre) {
    const p = (fase - (1 - cierre)) / cierre; // 0..1 dentro del pestañeo
    return 1 - Math.sin(p * Math.PI) * 0.92; // baja y sube suave
  }
  return 1;
}

/*
 * ── LA BOCA que HABLA (feedback: los gestos deben LEERSE y NO chocar con la
 *    nariz). Envolvente de "maestro que enseña": articula sílabas claras (la
 *    mandíbula baja y sube con pausas entre frases), no un temblor mecánico.
 *    Devuelve 0..1 = cuánto se ABRE la boca (0 cerrada, 1 bien abierta). ──
 */
export function factorHabla(t) {
  // Frases con pausa: cada ciclo ~4.2 s tiene una tanda de sílabas y un silencio
  // (respira / deja pensar). Dentro de la tanda, sílabas nítidas y separadas.
  const frase = 4.2;
  const f = (t % frase) / frase; // 0..1 dentro de la frase
  if (f > 0.72) return 0; // silencio: boca cerrada, cara serena
  const dentro = f / 0.72; // 0..1 en la parte hablada
  // sílabas: 3 aperturas claras, con cierre entre cada una (se lee "ha-bla-ndo")
  const silaba = Math.sin(dentro * Math.PI * 3);
  const abre = Math.max(0, silaba); // solo aperturas (nunca "hacia arriba")
  // una apertura base sostenida para que aun entre sílabas la boca "diga"
  return Math.min(1, abre * 0.85 + 0.12);
}

/*
 * SONRISA lenta de sabio: sube apenas las comisuras cada tanto (calidez, no
 * caricatura). 0..1. Independiente del habla → capas legibles y no mecánicas.
 */
export function factorSonrisa(t) {
  const s = Math.sin(t * 0.19 + 0.5) * 0.5 + Math.sin(t * 0.07) * 0.5; // ~-1..1 lento
  return Math.max(0, s); // solo sonríe (nunca "amarga" la boca)
}

/* ── BARBA de líquen del páramo (Usnea, "barba de viejo"): NO es musgo verde
      plano, es líquen colgante FIBROSO de tono verde-gris PLATEADO. La barba se
      arma como una CORTINA DENSA de mechones finos, en capas para dar volumen,
      con gradiente raíz-en-sombra → punta-plateada. Referente: Bárbol/WETA. ── */
export const BARBA = {
  usnea: new THREE.Color('#aebb96'), // cuerpo del líquen: verde-gris PÁLIDO (sage)
  usneaGris: new THREE.Color('#c3cab4'), // mechón más plateado (variedad)
  raicilla: new THREE.Color('#725036'), // pocas hebras leñosas marrones (contraste)
  liquen: new THREE.Color('#8f9c7a'), // mata de liquen foliáceo (sage apagado, NO blanco)
  liquenAzul: new THREE.Color('#828f7e'), // liquen gris-verdoso (variedad)
};

/*
 * Geometría de UN mechón de usnea (líquen colgante): un tubo FINO y tapereado
 * que nace en el mentón (y=0) y CAE con una leve enroscadura hacia el frente,
 * como hilo de barba de viejo. Trae horneado el gradiente de color a lo largo:
 * raíz en sombra → punta plateada (la receta del DR: oscuro en la base, claro en
 * la punta). Una sola geometría compartida por TODOS los mechones (InstancedMesh,
 * 1 draw-call); la variedad de largo/grosor/color va por instancia.
 */
export function geometriaHebraBarba(segmentos = 6, radial = 4) {
  const pts = [
    new THREE.Vector3(0.0, 0.0, 0.0),
    new THREE.Vector3(0.02, -0.28, 0.05),
    new THREE.Vector3(-0.02, -0.58, 0.06),
    new THREE.Vector3(0.03, -0.84, 0.02),
    new THREE.Vector3(0.0, -1.0, -0.03),
  ];
  const curva = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  const geo = new THREE.TubeGeometry(curva, segmentos, 1, radial, false);
  const pos = geo.attributes.position;
  const nAnillo = radial + 1;
  const centros = [];
  for (let i = 0; i <= segmentos; i++) centros.push(curva.getPointAt(i / segmentos));
  const colores = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  const off = new THREE.Vector3();
  // El color va como RAMPA DE LUMINANCIA (raíz en sombra → punta encendida); el
  // TONO real de usnea lo pone el instanceColor. Así el mechón queda pálido y
  // plateado (multiplicar dos verdes medios lo ensuciaba a oliva-espagueti).
  const lumRaiz = 0.5;
  const lumPunta = 1.0;
  for (let k = 0; k < pos.count; k++) {
    const anillo = Math.floor(k / nAnillo);
    const t = Math.min(1, anillo / segmentos); // 0 raíz → 1 punta
    const radio = 0.03 * (1 - t) + 0.006; // fino, más fino aún en la punta
    const cen = centros[Math.min(anillo, centros.length - 1)];
    v.fromBufferAttribute(pos, k);
    off.subVectors(v, cen).multiplyScalar(radio); // offset unitario → grosor real
    v.copy(cen).add(off);
    pos.setXYZ(k, v.x, v.y, v.z);
    const lum = lumRaiz + (lumPunta - lumRaiz) * Math.min(1, t * 1.1);
    colores[k * 3] = lum;
    colores[k * 3 + 1] = lum;
    colores[k * 3 + 2] = lum * 0.97; // punta apenas cálida
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/*
 * Mechones de la barba en coords del rostro (0,0,0 = ancla del mentón; -y cuelga,
 * +z al frente). Forma de barba REAL: densa, larga en el centro (mentón), corta y
 * dispersa hacia las mejillas, en TRES CAPAS de profundidad para que tenga
 * VOLUMEN (no un plano de cuatro hebras). Devuelve transformaciones por instancia.
 */
export function specsBarba(seed = 91) {
  const r = rng(seed);
  const hebras = [];
  // Capas: fondo (volumen), medio y frente (las más largas y visibles). El
  // solape entre capas es lo que hace que se lea como BARBA con cuerpo. Densa y
  // con el CENTRO lleno (el mentón de Bárbol), no cuatro hebras a los lados.
  const capas = [
    { z: -0.03, lenMul: 0.72, n: 34 },
    { z: 0.05, lenMul: 0.86, n: 40 },
    { z: 0.12, lenMul: 0.98, n: 34 },
  ];
  for (const capa of capas) {
    for (let i = 0; i < capa.n; i++) {
      // sesgo al centro: raíz cuadrada empuja las muestras hacia el mentón para
      // que la barba tenga cuerpo en el medio y se disperse hacia las mejillas.
      const u = (i + r() * 0.8) / capa.n; // 0..1 crudo
      const f = 0.5 + (u - 0.5) * Math.sqrt(Math.abs(u - 0.5) * 2) * 1.05;
      const x = (f - 0.5) * 0.92; // a lo ancho de la mandíbula (más ceñida)
      const centro = Math.max(0, 1 - Math.abs(f - 0.5) * 1.7); // 1 en el mentón
      // arranca BAJO la boca (deja ver los labios) y cuelga desde el mentón
      const yTop = -0.5 - centro * 0.05 - Math.abs(f - 0.5) * 0.03;
      const len = (0.4 + centro * 0.6 + r() * 0.22) * capa.lenMul; // barba CORTA y tupida
      hebras.push({
        pos: [x + (r() - 0.5) * 0.045, yTop, capa.z + (r() - 0.5) * 0.02],
        len,
        grosor: 0.8 + r() * 0.7, // más gruesa: mechones tupidos, no hilo suelto
        tilt: (f - 0.5) * 0.22 + (r() - 0.5) * 0.18, // cuelgan casi rectos
        lean: 0.05 + r() * 0.14, // caen hacia el frente
        yaw: (r() - 0.5) * 0.4,
        tono: r(), // 0 usnea sage → 1 plateado
        woody: r() > 0.92, // muy pocas hebras leñosas marrones (contraste)
      });
    }
  }
  // COLUMNA CENTRAL del mentón: mechones que cuelgan RECTOS en el eje para que la
  // barba no se parta en dos y tape el surco vertical del tronco (el mentón macizo
  // de un árbol viejo). Es lo que une la cortina en una sola barba maciza.
  const CENTRO = 30;
  for (let i = 0; i < CENTRO; i++) {
    // arrancan JUSTO bajo el labio y cuelgan rectos, adelantados para tapar el
    // surco vertical del tronco → una sola barba maciza, sin raya al medio.
    hebras.push({
      pos: [(r() - 0.5) * 0.3, -0.48 - r() * 0.08, 0.1 + r() * 0.05],
      len: 0.7 + r() * 0.4, // el chorro central del mentón (corto y denso)
      grosor: 0.9 + r() * 0.6,
      tilt: (r() - 0.5) * 0.12, // casi vertical
      lean: 0.04 + r() * 0.1,
      yaw: (r() - 0.5) * 0.35,
      tono: r(),
      woody: r() > 0.92,
    });
  }
  // BIGOTE / patillas cortas: mechones cortos prendidos a las mejillas justo bajo
  // los pómulos, que cierran el marco de la cara (barba que sube por las patillas).
  for (let i = 0; i < 16; i++) {
    const s = i < 8 ? -1 : 1;
    hebras.push({
      pos: [s * (0.28 + r() * 0.14), -0.34 - r() * 0.14, 0.06 + r() * 0.05],
      len: 0.24 + r() * 0.2,
      grosor: 0.7 + r() * 0.5,
      tilt: s * (0.12 + r() * 0.1),
      lean: 0.05 + r() * 0.12,
      yaw: (r() - 0.5) * 0.4,
      tono: r(),
      woody: r() > 0.9,
    });
  }
  // matas de liquen foliáceo: acentos MINÚSCULOS del enredo de usnea, prendidos al
  // borde de la barba y trepando por las patillas. Chicos, planos y sage-apagado
  // para que se lean como líquen enredado — NUNCA como sombreros de hongo blancos.
  const tufts = [];
  const L = 16;
  for (let i = 0; i < L; i++) {
    const f = i / (L - 1);
    const lado = Math.abs(f - 0.5) * 2; // 0 centro → 1 mejilla
    tufts.push({
      pos: [(f - 0.5) * 0.94, -0.52 - r() * 0.2 + lado * 0.18, 0.05 + r() * 0.06],
      esc: 0.016 + r() * 0.018, // minúsculos: textura, no piedras/hongos
      azul: r() > 0.6,
    });
  }
  return { hebras, tufts };
}

/*
 * Ancla del HOMBRO sobre el fuste (para el BRAZO que señala el suelo). Se toma
 * un punto de la curva del tronco por encima del rostro, de donde nace el brazo.
 */
export function anclaBrazo(t = 0.47, seed = 7) {
  const curva = curvaTronco(seed);
  return curva.getPointAt(Math.max(0, Math.min(1, t)));
}
