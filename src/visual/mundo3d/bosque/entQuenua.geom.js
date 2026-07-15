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
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
/* `poner` vive en el taller compartido de vegetación (sombreadoVegetal), que no
   importa nada de aquí → sin ciclo. */
import { poner } from './sombreadoVegetal.js';

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
    tubular: 150, radial: 16, radialCara: 64, hojas: 680, clusters: 9, ramas: 5, raices: 6,
    frailejones: 5, materialRico: true, flatShading: true, fog: true,
    barba: 30, usnea: 22, laminas: 34,
  },
  medio: {
    tubular: 90, radial: 10, radialCara: 34, hojas: 340, clusters: 7, ramas: 5, raices: 5,
    frailejones: 4, materialRico: false, flatShading: false, fog: true,
    barba: 20, usnea: 12, laminas: 20,
  },
  bajo: {
    tubular: 44, radial: 8, radialCara: 16, hojas: 120, clusters: 4, ramas: 3, raices: 4,
    frailejones: 0, materialRico: false, flatShading: false, fog: false,
    barba: 12, usnea: 0, laminas: 10,
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
  /*
   * OJO CON EL ALIASING — aquí estaba la razón de que el tronco se leyera como
   * "chocolate de plástico" en vez de corteza:
   *
   * la versión anterior metía términos `sin(ang*17)` y `sin(ang*23)`, pero el
   * tubo tiene ~38 segmentos radiales → esas frecuencias caen en ~2.2 y ~1.6
   * muestras por ciclo, POR DEBAJO de Nyquist. No se dibujaban como grano fino:
   * aliasaban a lóbulos anchos y blandos, y el fuste parecía cera derretida.
   *
   * Regla: ninguna frecuencia en `ang` por encima de ~radial/4 (≈9 con radial 38).
   * El detalle fino se busca a lo LARGO (en `t`, que tiene 124 anillos) y con
   * dos familias de surcos que interfieren — así la corteza sale irregular sin
   * pedirle a la malla más de lo que puede resolver.
   */
  // AMPLITUDES: han de ser hondas o no se ven. Con surcos de ~0.02 sobre un
  // fuste de 1.3 de diámetro la corteza desaparece y vuelve el "plástico".
  const surcos = 0.1 * Math.sin(ang * 8.0 + t * 2.5); // acanaladura principal
  const surcos2 = 0.05 * Math.sin(ang * 5.0 - t * 4.2); // 2ª familia: interfiere
  const fibra = 0.06 * Math.sin(ang * 16.0 + t * 1.5); // fibra fina (radial≥64)
  const bandas = 0.03 * Math.sin(t * 18 + ang * 1.5); // vetas horizontales
  const nudos = 0.05 * Math.sin(ang * 2.0 - t * 6.5) * Math.sin(t * Math.PI); // nudos
  const grano = 0.022 * Math.sin(t * 46 + ang * 3); // grano fino, a lo largo
  const masAbajo = 1 + (1 - t) * 0.35; // el pie es algo más rugoso, sin exagerar
  return (surcos + surcos2 + fibra + bandas + nudos + grano) * masAbajo;
}

/* Color de corteza para un desplazamiento dado (cresta pelada clara, grieta
   oscura) con un velo de líquen en la base. Devuelve una THREE.Color nueva. */
export function colorCorteza(disp, t) {
  // Rango de mapeo ESTRECHO (±0.13 en vez de ±0.16) y papel desde n>0.5: la luz
  // del páramo es plana y difusa, así que si el color de la corteza no trae
  // contraste propio HORNEADO, el relieve se lava y el tronco se ve liso.
  const n = Math.max(0, Math.min(1, (disp + 0.13) / 0.26)); // grieta 0 → cresta 1
  const c = CORTEZA.valle.clone().lerp(CORTEZA.cuerpo, Math.min(1, n * 1.9));
  if (n > 0.5) c.lerp(CORTEZA.papel, (n - 0.5) / 0.5); // papel en la cresta
  // Oclusión de contacto: el pie del árbol vive en penumbra (da peso y asienta
  // el tronco en la tierra en vez de dejarlo flotando).
  c.multiplyScalar(0.72 + 0.28 * Math.min(1, t / 0.28));
  if (t < 0.45 && disp < 0) {
    const musgo = (0.45 - t) / 0.45 * 0.35; // líquen que trepa el pie
    c.lerp(CORTEZA.liquen, musgo);
  }
  return c;
}

/*
 * ── EL ROSTRO TALLADO EN LA MADERA ──────────────────────────────────────────
 *
 * El operador rechazó la cara anterior: era una careta pegada ENCIMA del tronco
 * (cejas de tablón, nariz de bola, ojos almendrados) y se leía como caricatura
 * de Halloween. El DR §3 es explícito: los rasgos deben INTEGRARSE en la
 * estructura del tronco "como si fueran formaciones de la corteza", usando las
 * grietas y protuberancias para formar los contornos.
 *
 * Así que ahora el rostro NO se pega: se TALLA. Esta función devuelve un
 * desplazamiento RELATIVO del radio del tronco (igual que la corteza) que
 * hunde las cuencas y la boca y saca las cejas, el caballete y los pómulos. La
 * cara ES la madera: las mismas fibras de corteza corren por encima de ella.
 *
 * Trabaja en dirección de MUNDO (`dir`, el vector unitario que sale del eje del
 * tronco) y no en el ángulo paramétrico del tubo: el marco de Frenet del
 * TubeGeometry se retuerce a lo largo de la curva, así que el ángulo `j/radial`
 * NO apunta a un lado fijo del mundo. Con `dir` el rostro siempre mira al +Z.
 *
 * @param {{x:number,y:number,z:number}} dir  dirección unitaria hacia afuera.
 * @param {number} y      altura de mundo del vértice.
 * @param {number} yOjos  altura de la mirada (la del ancla del rostro).
 * @returns {number} desplazamiento relativo (negativo = hundido en la madera).
 */
export function desplazamientoRostro(dir, y, yOjos) {
  // Solo la cara frontal: se desvanece hacia los lados y detrás.
  const frente = dir.z;
  if (frente <= 0.08) return 0;
  const mascara = Math.min(1, (frente - 0.08) / 0.52);
  const u = dir.x; // lateral: -1 izquierda → +1 derecha
  const v = y - yOjos; // vertical respecto a la mirada
  // Bulto gaussiano: la herramienta de tallar.
  const g = (u0, v0, su, sv) => Math.exp(-(((u - u0) ** 2) / su + ((v - v0) ** 2) / sv));

  // Los anchos (su, sv) van DELIBERADAMENTE generosos: con una malla de tubo
  // hasta 'bajo' tiene pocos anillos por rasgo, y una gaussiana estrecha
  // produciría picos aislados (aliasing) en vez de una cuenca. Rasgos anchos y
  // suaves se leen bien en los tres tiers.
  let d = 0;
  // CUENCAS: dos pozos donde se hunde la mirada. Es el rasgo que más "cara" da
  // y el que sostiene los ojos DENTRO de la madera, no encima. Van HONDAS: con
  // poca profundidad el rostro se difumina en el tronco y no se lee a distancia.
  d -= 0.56 * g(-0.46, 0.04, 0.15, 0.075);
  d -= 0.56 * g(0.46, 0.04, 0.15, 0.075);
  // CEJAS: crestas de corteza sobre las cuencas (el ceño del guardián).
  // Asimétricas a propósito: la simetría perfecta es lo que delata al muñeco.
  d += 0.4 * g(-0.44, 0.4, 0.19, 0.045);
  d += 0.36 * g(0.5, 0.44, 0.19, 0.045);
  // CABALLETE: el nudo vertical entre las cuencas.
  d += 0.28 * g(0, 0.1, 0.04, 0.14);
  // PÓMULOS: peso y edad bajo las cuencas.
  d += 0.18 * g(-0.5, -0.32, 0.12, 0.07);
  d += 0.18 * g(0.5, -0.32, 0.12, 0.07);
  // BOCA: la grieta. Ancha, poco alta y hundida — una fisura de la madera.
  d -= 0.44 * g(0, -0.62, 0.26, 0.035);
  // LABIO/MENTÓN: el reborde bajo la grieta que remata la mandíbula.
  d += 0.22 * g(0, -0.82, 0.22, 0.05);
  // ARRUGAS: dos surcos que bajan del caballete a las comisuras (edad).
  d -= 0.12 * g(-0.34, -0.4, 0.045, 0.08);
  d -= 0.12 * g(0.34, -0.4, 0.045, 0.08);

  return d * mascara;
}

/*
 * Construye una malla de TUBO ORGÁNICO tapereado y con corteza, siguiendo una
 * curva. Reutilizada por tronco, ramas y raíces. Parte de un TubeGeometry de
 * radio 1 y reubica cada vértice: escala su offset respecto al eje por el taper
 * y el desplazamiento, y le pinta vertexColor de corteza.
 *
 * Si se le pasa `yOjos`, además TALLA el rostro en la malla (ver
 * `desplazamientoRostro`): el tronco del Ent y su cara son la misma superficie.
 *
 * @returns {THREE.BufferGeometry} geometría con atributo `color`.
 */
export function tuboOrganico(curve, { tubular, radial, taperFn, dispAmp = 1, seedAng = 0, yOjos = null }) {
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
    // El rostro se talla en la MISMA superficie que la corteza: se suma al
    // mismo desplazamiento radial, así que las fibras de la madera corren por
    // encima de las cejas y dentro de las cuencas (DR §3: "corteza como arruga").
    const cara = yOjos === null ? 0 : desplazamientoRostro(off, centro.y, yOjos);
    const radio = taperFn(t) * (1 + disp + cara);
    v.copy(centro).addScaledVector(off, radio);
    pos.setXYZ(k, v.x, v.y, v.z);

    // La grieta tallada se pinta como grieta: lo hundido va oscuro y la cresta
    // clara (sombra propia HORNEADA) → la cara se lee incluso con la luz plana
    // y difusa del páramo, que es la que tenemos. Sin esto el relieve existe
    // pero se difumina y el rostro "no está".
    const col = colorCorteza(disp + cara * 0.95, t);
    colores[k * 3] = col.r;
    colores[k * 3 + 1] = col.g;
    colores[k * 3 + 2] = col.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * Geometría del tronco completo: corteza rojiza pelada + EL ROSTRO TALLADO.
 *
 * `radialCara` (si viene) manda sobre `radial`: la cara necesita bastantes
 * vértices alrededor del fuste para que las cuencas y la boca se resuelvan como
 * formas y no como picos sueltos. Es el único sitio del mundo donde gastamos esa
 * densidad, porque es el que mira el usuario.
 *
 * @param {{tubular: number, radial: number, radialCara?: number}} P
 * @param {number} [seed]
 */
export function geometriaTronco({ tubular, radial, radialCara }, seed = 7) {
  const { centro } = anclaRostro(seed);
  return tuboOrganico(curvaTronco(seed), {
    tubular,
    radial: radialCara || radial,
    taperFn: taperTronco,
    dispAmp: 1,
    seedAng: 0.6,
    yOjos: centro.y,
  });
}

/*
 * ── LAS LÁMINAS DE PAPEL (la firma de la queñua) ────────────────────────────
 *
 * *Polylepis* significa literalmente "muchas escamas": su corteza rojiza se
 * DESCAMA en láminas finísimas como hojas de papel, que se despegan del tronco
 * y se enrollan. Es el rasgo que la hace inconfundible en el páramo — y el Ent
 * es una queñua, así que le tocan.
 *
 * Sin ellas el fuste se lee como un tubo marrón liso (que era justo el problema:
 * "chocolate de plástico"). Con ellas, la silueta del tronco se rompe en cientos
 * de bordes que atrapan la luz. Y la contradicción quedaba a la vista: las
 * queñuas del cortejo (floraParamo) SÍ tenían láminas y el guardián no.
 *
 * Va como malla aparte (mismo material vertexColors) para no tocar el tubo del
 * tronco ni el rostro tallado.
 *
 * @param {{tubular:number, radial:number, laminas?:number}} P
 * @returns {THREE.BufferGeometry} una sola malla con todas las láminas.
 */
export function geometriaLaminas(P, seed = 5) {
  const r = rng(seed);
  const curva = curvaTronco(7);
  const { centro: anc, radio: radioCara } = anclaRostro(7);
  const n = P.laminas ?? 30;
  const partes = [];

  for (let i = 0; i < n; i++) {
    const t = 0.03 + r() * 0.9;
    const c = curva.getPointAt(t);
    const rad = taperTronco(t);
    const azim = r() * Math.PI * 2;
    // PEQUEÑAS y CEÑIDAS. Con láminas grandes y despegadas el tronco se llena de
    // parches planos que se leen como esparadrapos pegados — no como escamas.
    // La lámina de Polylepis es una viruta fina: aporta como TEXTURA, en
    // cantidad, no como pieza suelta que se mira una por una.
    const arco = 0.28 + r() * 0.5; // cuánto del contorno abraza
    const alto = 0.05 + r() * 0.12;

    // No taparle la CARA al Ent: se saltan las láminas que caerían sobre el
    // rostro (mirando al +Z, a la altura de la mirada).
    const miraAlFrente = Math.sin(azim) > 0.35;
    const enLaCara = Math.abs(c.y - anc.y) < radioCara * 1.5;
    if (miraAlFrente && enLaCara) continue;

    // La lámina: un casquete de cilindro (una escama despegada), abierto, con
    // el borde levantado hacia afuera y un poco caído.
    // Ceñida al fuste: solo el borde inferior se abre (la viruta que se levanta).
    const lam = new THREE.CylinderGeometry(
      rad * 1.0, rad * 1.09, alto, 5, 1, true, azim, arco,
    );
    poner(lam, [c.x, c.y, c.z], [(r() - 0.5) * 0.12, 0, (r() - 0.5) * 0.12]);

    // Color: el papel expuesto va claro por fuera y la madera viva, oscura,
    // asoma por debajo → cada escama proyecta su propio borde.
    const pos = lam.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const col = new THREE.Color();
    for (let k = 0; k < pos.count; k++) {
      const y = pos.getY(k);
      const s = (y - (c.y - alto / 2)) / Math.max(1e-5, alto); // 0 abajo → 1 arriba
      // Casi del color de la corteza: la escama se despega y APENAS aclara en el
      // borde levantado. Con papel a tope salían parches salmón que gritaban.
      col.copy(CORTEZA.valle).lerp(CORTEZA.cuerpo, 0.5 + s * 0.5);
      if (s > 0.72) col.lerp(CORTEZA.papel, (s - 0.72) / 0.28 * 0.55); // borde
      col.multiplyScalar(0.7 + s * 0.34);
      cols[k * 3] = col.r;
      cols[k * 3 + 1] = col.g;
      cols[k * 3 + 2] = col.b;
    }
    lam.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    partes.push(lam);
  }

  if (!partes.length) return null;
  const buenas = partes.map((g) => (g.index ? g.toNonIndexed() : g));
  const g = mergeGeometries(buenas, false);
  if (!g) {
    // mergeGeometries devuelve null EN SILENCIO al mezclar indexadas con
    // no-indexadas → las láminas desaparecerían sin un solo error. Truena.
    throw new Error('[entQuenua] geometriaLaminas: mergeGeometries devolvió NULL '
      + '(¿mezcla de geometrías indexadas y no-indexadas?). Las láminas habrían '
      + 'quedado invisibles sin error.');
  }
  g.computeVertexNormals();
  return g;
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

/* ── BARBA de árbol-anciano (referente: Bárbol / Treebeard). Cortinas de MUSGO
      que cuelgan de la mandíbula, RAICILLAS leñosas más largas en el mentón y
      matas de LIQUEN prendidas a los lados. Todo procedural, cuelga y se mece. ── */
export const BARBA = {
  musgo: new THREE.Color('#5f6f42'), // musgo del páramo, verde apagado
  musgoClaro: new THREE.Color('#879463'), // mechón más claro (variedad)
  raicilla: new THREE.Color('#5a3b2b'), // raicilla leñosa colgante (marrón)
  liquen: new THREE.Color('#aeb890'), // liquen foliáceo pálido (sage)
  liquenAzul: new THREE.Color('#93a89a'), // liquen azul-grisáceo
};

/*
 * Invierte la curva del tronco: dado un `y` de mundo, ¿en qué `t` va la curva?
 * La curva es monótona en y, así que basta muestrear y luego interpolar.
 * Se usa para pegar la barba a la SUPERFICIE del tronco a cada altura.
 */
export function tDeAltura(curva, y, muestras = 48) {
  const y0 = curva.getPointAt(0).y;
  const y1 = curva.getPointAt(1).y;
  if (y <= y0) return 0;
  if (y >= y1) return 1;
  let tPrev = 0;
  let yPrev = y0;
  for (let i = 1; i <= muestras; i++) {
    const t = i / muestras;
    const yi = curva.getPointAt(t).y;
    if (yi >= y) {
      const f = (y - yPrev) / Math.max(1e-6, yi - yPrev);
      return tPrev + (t - tPrev) * f;
    }
    tPrev = t;
    yPrev = yi;
  }
  return 1;
}

/*
 * ── LA BARBA DE USNEA (el rasgo que faltaba) ────────────────────────────────
 *
 * El operador: *"no se parece en nada al del Señor de los Anillos, no tiene
 * barba, no tiene vida"*. Y tenía razón aunque el código ANTERIOR ya tuviera una
 * función `specsBarba`: la barba estaba ahí, pero NO SE VEÍA. El fallo era
 * geométrico y silencioso —
 *
 *   los mechones colgaban rectos hacia abajo desde el mentón a una `z` FIJA,
 *   mientras el tronco se ENSANCHA hacia el pie (el taper tiene raigón). A la
 *   altura del mentón el radio del tronco es ~0.65, pero un metro más abajo pasa
 *   de 0.9 → los mechones quedaban DENTRO de la madera. Solo asomaban las matas
 *   de liquen, junto a la boca. Una barba enterrada en el propio tronco.
 *
 * Ahora cada mechón se construye SIGUIENDO LA SUPERFICIE: a cada altura se
 * consulta el radio real del tronco y la hebra se cuelga por fuera de él, con un
 * vuelo que crece hacia la punta (la usnea se separa y se mece). Así no puede
 * volver a tragarse: la barba está definida como "el tronco, más un margen".
 *
 * La usnea ("barba de viejo", *Usnea* spp.) no es licencia poética: es el líquen
 * colgante REAL del bosque altoandino, y es exactamente lo que convierte una
 * queñua en Bárbol. Es lo más barato que podemos hacer para sacarlo de "árbol
 * genérico" (DR §3: geometría de mechones + movimiento + densidad).
 *
 * @returns {{hebras: object[], liquenes: object[]}} hebras con sus puntos ya en
 *   coordenadas del TRONCO (mundo), listas para tubular.
 */
export function specsBarba(seed = 91, n = 26) {
  const r = rng(seed);
  const curva = curvaTronco(seed >> 3 || 7);
  const { centro: anc, radio: radioCara } = anclaRostro(7);

  // La barba nace bajo la boca-grieta y se reparte por la mandíbula.
  const yMandibula = anc.y - radioCara * 0.72;
  const hebras = [];

  for (let i = 0; i < n; i++) {
    // Reparto IRREGULAR: si las hebras van equiespaciadas por la mandíbula, la
    // barba sale peinada en filas y se lee como flecos de rafia. Un jitter
    // fuerte + varias capas en profundidad la enredan, que es como cuelga la
    // usnea de verdad.
    const f = n === 1 ? 0.5 : (i / (n - 1)) + (r() - 0.5) * 0.14;
    // Azimut alrededor del frente del tronco: la barba abraza la mandíbula
    // (±50°), no es una cortina plana pegada al frente.
    const azim = Math.PI / 2 - (f - 0.5) * 1.5;
    // Larga en el mentón, corta en las mejillas (forma de barba, no de flecos).
    // OJO con el LARGO: el fuste mide 6 y la mandíbula va a y≈1.6, así que una
    // hebra de 2 termina BAJO TIERRA. La primera versión hacía justo eso y la
    // barba se leía como falda hawaiana tapando medio árbol. El mentón acaba
    // sobre y≈0.9: barba de anciano, no enagua.
    const central = Math.max(0, 1 - Math.abs(f - 0.5) * 1.75);
    const largo = 0.16 + central * 0.36 + r() * 0.1;
    // Arranca más arriba en las mejillas (patillas) que en el mentón.
    const yTop = yMandibula + 0.06 + Math.abs(f - 0.5) * 0.34 - r() * 0.05;
    // Capa: a qué distancia del tronco cuelga esta hebra (barba con espesor).
    const capa = r() * 0.055;
    // Cuánto serpentea (cada hebra a su aire).
    const ondula = 0.06 + r() * 0.16;

    // Muestrea la hebra a lo largo de su caída, pegada al tronco + vuelo.
    const K = 6;
    const pts = [];
    for (let k = 0; k <= K; k++) {
      const s = k / K; // 0 raíz → 1 punta
      const y = yTop - largo * s;
      const t = tDeAltura(curva, y);
      const c = curva.getPointAt(t);
      const radioAqui = taperTronco(t);
      // Vuelo: la hebra se despega del tronco según cae (si no, se lo traga el
      // raigón). Crece con s² → arriba abraza, abajo cuelga suelta. Poco vuelo:
      // con mucho, la barba se abre en campana y vuelve a parecer falda. El
      // término por hebra reparte la barba en CAPAS (unas cuelgan más adentro
      // que otras) en vez de dejarlas todas en la misma cáscara.
      const vuelo = 0.05 + capa + s * s * (0.1 + central * 0.09);
      // Deriva lateral: cada hebra serpentea a su aire y se enreda con las
      // vecinas. Sin esto quedan rectas y paralelas = flecos de rafia.
      const desvio = ondula * Math.sin(s * 3.1 + i * 1.7) * s;
      const a = azim + desvio;
      pts.push(new THREE.Vector3(
        c.x + Math.cos(a) * (radioAqui + vuelo),
        y,
        c.z + Math.sin(a) * (radioAqui + vuelo),
      ));
    }
    hebras.push({
      pts,
      // Fina y filiforme: la usnea es un hilo, no un fideo. Con hebras gruesas
      // la barba se lee como plástico peinado.
      grosor: 0.012 + r() * 0.012 + central * 0.008,
      claro: r() > 0.6,
      fase: i * 1.27,
      // Peso de viento: las del mentón (largas) se mecen más.
      peso: 0.5 + central * 0.5,
    });
  }

  // Matas de liquen foliáceo prendidas a lo alto de la barba, a los lados de la
  // boca: dan el "enganche" entre la madera y la barba (no una peluca pegada).
  const liquenes = [];
  const L = Math.max(4, Math.round(n * 0.4));
  for (let i = 0; i < L; i++) {
    const f = i / (L - 1);
    const azim = Math.PI / 2 - (f - 0.5) * 1.9;
    const y = yMandibula - 0.12 - r() * 0.26;
    const t = tDeAltura(curva, y);
    const c = curva.getPointAt(t);
    const radioAqui = taperTronco(t);
    liquenes.push({
      pos: [
        c.x + Math.cos(azim) * (radioAqui + 0.04),
        y,
        c.z + Math.sin(azim) * (radioAqui + 0.04),
      ],
      esc: 0.05 + r() * 0.055,
      azul: r() > 0.6,
    });
  }

  return { hebras, liquenes };
}

/*
 * USNEA COLGANTE DE LAS RAMAS: el mismo líquen barbado que cuelga de la copa.
 * Es lo que hace que el claro se lea como BOSQUE DE NIEBLA altoandino y no como
 * un árbol de parque — y de paso hace que la barba del Ent no parezca un
 * disfraz, sino lo mismo que le cuelga a todo el bosque.
 *
 * @param {{punta: THREE.Vector3}[]} puntasRama  puntas de las ramas.
 */
export function specsUsneaRamas(puntasRama, n = 22, seed = 77) {
  const r = rng(seed);
  const mechas = [];
  if (!puntasRama.length || n <= 0) return mechas;
  for (let i = 0; i < n; i++) {
    const base = puntasRama[i % puntasRama.length];
    const ang = r() * Math.PI * 2;
    const rad = r() * 0.42;
    const x = base.x + Math.cos(ang) * rad;
    const z = base.z + Math.sin(ang) * rad;
    const yTop = base.y - 0.1 - r() * 0.25;
    const largo = 0.22 + r() * 0.5;
    const K = 4;
    const pts = [];
    for (let k = 0; k <= K; k++) {
      const s = k / K;
      // Cuelga casi a plomo con una deriva suave (no un palo recto).
      pts.push(new THREE.Vector3(
        x + Math.sin(s * 2.1 + i) * 0.04 * s,
        yTop - largo * s,
        z + Math.cos(s * 1.7 + i) * 0.04 * s,
      ));
    }
    mechas.push({
      pts,
      grosor: 0.008 + r() * 0.008,
      claro: r() > 0.55,
      fase: i * 0.9,
      peso: 1,
    });
  }
  return mechas;
}

/**
 * Tubula una hebra (barba o usnea) en una malla con color horneado y un
 * atributo `peso` (0 en la raíz → 1 en la punta) para mecerla por vértice.
 */
export function geometriaHebra(hebra, colorBase, radial = 4) {
  const curva = new THREE.CatmullRomCurve3(hebra.pts, false, 'catmullrom', 0.5);
  const tub = Math.max(3, hebra.pts.length - 1);
  const geo = new THREE.TubeGeometry(curva, tub, hebra.grosor, radial, false);
  const pos = geo.attributes.position;
  const nAnillo = radial + 1;
  const colores = new Float32Array(pos.count * 3);
  const pesos = new Float32Array(pos.count);
  const c = new THREE.Color();
  for (let k = 0; k < pos.count; k++) {
    const anillo = Math.floor(k / nAnillo);
    const s = anillo / tub; // 0 raíz → 1 punta
    // La usnea se aclara y se seca hacia la punta.
    c.copy(colorBase).lerp(BARBA.liquen, s * 0.45);
    c.multiplyScalar(0.82 + s * 0.28);
    colores[k * 3] = c.r;
    colores[k * 3 + 1] = c.g;
    colores[k * 3 + 2] = c.b;
    pesos[k] = s * s * (hebra.peso ?? 1); // s²: la raíz no se mueve, la punta sí
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  geo.setAttribute('peso', new THREE.BufferAttribute(pesos, 1));
  return geo;
}

/*
 * Ancla del HOMBRO sobre el fuste (para el BRAZO que señala el suelo). Se toma
 * un punto de la curva del tronco por encima del rostro, de donde nace el brazo.
 */
export function anclaBrazo(t = 0.47, seed = 7) {
  const curva = curvaTronco(seed);
  return curva.getPointAt(Math.max(0, Math.min(1, t)));
}
