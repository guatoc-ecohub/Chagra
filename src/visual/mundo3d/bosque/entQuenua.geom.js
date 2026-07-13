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
  },
  medio: {
    tubular: 76, radial: 10, hojas: 340, clusters: 7, ramas: 5, raices: 5,
    frailejones: 4, materialRico: false, flatShading: false, fog: true,
  },
  bajo: {
    tubular: 44, radial: 8, hojas: 120, clusters: 4, ramas: 3, raices: 4,
    frailejones: 0, materialRico: false, flatShading: false, fog: false,
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
  return Math.max(0.05, base + raigon + nudo);
}

/*
 * Desplazamiento de la corteza en un punto (t a lo largo, ang alrededor): surcos
 * verticales + bandas de nudo + rugosidad. Devuelve un factor relativo (~±0.16)
 * que multiplica el radio → surcos y nudos reales en la malla, no un normal-map.
 */
export function desplazamientoCorteza(t, ang) {
  // Surcos FINOS y numerosos (corteza acanalada), poco profundos: dan textura
  // sin partir el tronco en "trenzas". La rugosidad de nudo se concentra abajo.
  const surcos = 0.055 * Math.sin(ang * 9.0 + t * 2.5); // acanaladuras verticales finas
  const surcosF = 0.03 * Math.sin(ang * 17 - t * 3); // grano de corteza más fino
  const bandas = 0.035 * Math.sin(t * 22 + ang * 1.5); // vetas horizontales
  const nudos = 0.05 * Math.sin(ang * 2.0 - t * 6.5) * Math.sin(t * Math.PI); // nudos suaves
  const aspereza = 0.015 * Math.sin(ang * 23 + t * 40); // aspereza
  const masAbajo = 1 + (1 - t) * 0.35; // el pie es algo más rugoso, sin exagerar
  return (surcos + surcosF + bandas + nudos + aspereza) * masAbajo;
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
export function tuboOrganico(curve, { tubular, radial, taperFn, dispAmp = 1, seedAng = 0 }) {
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
    const disp = desplazamientoCorteza(t, ang) * dispAmp;
    const radio = taperFn(t) * (1 + disp);
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

/** Geometría del tronco completo (con la corteza rojiza pelada). */
export function geometriaTronco({ tubular, radial }, seed = 7) {
  return tuboOrganico(curvaTronco(seed), {
    tubular, radial, taperFn: taperTronco, dispAmp: 1, seedAng: 0.6,
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
