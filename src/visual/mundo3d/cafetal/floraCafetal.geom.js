/*
 * floraCafetal.geom — la GEOMETRÍA del CAFETAL BAJO SOMBRA (piso templado).
 *
 * El café es EL cultivo del campesino colombiano y aquí se cuenta como es de
 * verdad en la montaña: una LADERA sembrada en surcos a curva de nivel, con los
 * cafetos ABAJO y el SOMBRÍO arriba — guamos y nogales cafeteros que le hacen
 * techo de hojas al cultivo — y el plátano intercalado que acompaña casi todo
 * cafetal campesino. Cada especie con su identidad inequívoca:
 *
 *   · Cafeto (Coffea arabica)   — arbusto de porte columnar con PISOS de ramas
 *                                 plagiotrópicas (horizontales) VISIBLES y hojas
 *                                 elípticas opuestas, verde oscuro lustroso. La
 *                                 tabla de ramas (PISOS_CAFETO + anguloRamaCafeto)
 *                                 se EXPORTA: la distribución siembra las cerezas
 *                                 SOBRE esas mismas ramas — racimos pegados a la
 *                                 rama, como carga el café de verdad.
 *   · Cereza de café            — el fruto OVOIDE, INSTANCIADO APARTE con color
 *                                 por instancia: verde → pintón → rojo cereza →
 *                                 VINO maduro (la gama real de la cosecha).
 *   · Flor de café              — el racimo axilar BLANCO: en la misma ladera
 *                                 conviven flor, cereza verde y cereza madura
 *                                 (dato real del ciclo del arábica).
 *   · Guamo (Inga)              — el árbol de sombrío clásico: tronco que se
 *                                 bifurca y copa ANCHA y plana, un parasol.
 *   · Nogal cafetero            — el otro sombrío: tronco recto y alto, copa
 *     (Cordia alliodora)          más recogida y elevada.
 *   · Plátano intercalado       — pseudotallo claro y hojas enormes arqueadas.
 *   · Hojarasca + piedra        — el mantillo que la sombra deja en el suelo.
 *
 * TÉCNICA tier-safe (mismo contrato que floraParamo.geom): cada especie se
 * FUSIONA en UNA geometría con color horneado en vertexColors y se dibuja con
 * UN InstancedMesh → una draw-call por especie. La CEREZA se pinta BLANCA en la
 * geometría para que el color POR INSTANCIA (setColorAt) sea el color real del
 * fruto — así el mismo InstancedMesh lleva cerezas verdes, pintonas y rojas.
 *
 * ⚠️ mergeGeometries devuelve NULL EN SILENCIO si se mezclan geometrías
 * indexadas con no-indexadas (ya mordió 3 veces): aquí TODO se desindexa antes
 * de fusionar y se TRUENA si aun así falla.
 *
 * Aquí viven SOLO los datos y las mallas (nada de WebGL): corre headless.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../bosque/entQuenua.geom.js';
import { construirTerreno } from '../kit/terreno.js';
import { ruidoTerreno } from '../kit/ruido.js';
import { VERDES, TIERRAS } from '../paleta/paletaMadre.js';
import { mezclar } from '../atmosferaMadre.js';

/* -------------------------------------------------------------------------- */
/*  La ladera cafetera (la geografía del mundo, determinista)                  */
/* -------------------------------------------------------------------------- */

export const ANCHO = 38; // x: -19 … 19
export const FONDO = 36; // z: -18 (la loma, arriba) … 18 (el frente, abajo)

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/* Ruido determinista (hash de senos): misma ladera siempre, sin Math.random. */
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.8 + wz * 0.6) * 0.5 +
    Math.sin(wx * 1.9 - wz * 1.4 + 2.3) * 0.3 +
    Math.sin(wx * 3.1 + wz * 2.7 + 5.1) * 0.2
  );
}

/** La altura de la ladera en un punto: sube hacia el fondo (el café es de montaña). */
export function alturaLadera(wx, wz) {
  const sub = smoothstep(6, -16, wz); // 0 al frente (bajo), 1 al fondo (la loma)
  let h = 0.12;
  h += sub * 5.4; // la ladera cafetera gana altura hacia atrás
  h += ruido(wx * 0.5, wz * 0.5) * 0.35 * (0.3 + sub); // ondulación natural
  return h;
}

/*
 * LA MALLA de la ladera — el heightfield del KIT (mismo andamiaje que todos los
 * mundos) con la pintura PROPIA del piso templado: arvenses verdes (cobertura
 * viva), tierra roja andina asomando y el mantillo pardo hacia la sombra. Vivía
 * duplicada en cada escena que montaba el cafetal; aquí es la geografía única
 * (headless, testeable, memoizar en quien llama).
 */
export function construirLadera(seg, plano) {
  const cPasto = new THREE.Color(VERDES.brote); // pasto al sol del piso templado
  const cPasto2 = new THREE.Color(VERDES.calido); // el oliva que asoma hacia lo seco
  const cTierra = new THREE.Color(TIERRAS.arcilla); // la tierra roja cafetera
  const cMantillo = new THREE.Color(TIERRAS.mantillo); // hojarasca bajo el sombrío
  const cCamino = new THREE.Color(mezclar(TIERRAS.camino, TIERRAS.vega, 0.4));
  return construirTerreno({
    ancho: ANCHO,
    fondo: FONDO,
    seg,
    plano,
    altura: alturaLadera,
    pintar: (wx, wz, alt, c) => {
      const enLoma = smoothstep(5, -8, wz);
      c.lerpColors(cPasto, cPasto2, 0.5 + 0.5 * ruidoTerreno(wx * 0.9, wz * 0.7));
      // la tierra roja asoma a manchas entre los surcos
      c.lerp(cTierra, smoothstep(-0.1, 0.85, ruidoTerreno(wx * 1.3, wz * 1.1)) * 0.45 * enLoma);
      // el mantillo pardo gana hacia lo alto (más sombrío, más hojarasca)
      c.lerp(cMantillo, enLoma * 0.22);
      // el caminito seco del frente, por donde se llega
      c.lerp(cCamino, smoothstep(1.2, 0, Math.abs(wx - Math.sin(wz * 0.4) * 2.2)) * smoothstep(2, 12, wz));
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Presupuesto por tier                                                       */
/* -------------------------------------------------------------------------- */

/*
 * Instancias por especie. 'alto' puebla el cafetal pleno; 'medio' es frugal;
 * 'bajo' deja lo mínimo para que AÚN se lea "cafetal con sombrío". La cereza es
 * el conteo del InstancedMesh de frutos (repartidos entre las matas cargadas).
 */
export const FLORA_CAFETAL = {
  alto: { cafeto: 120, cereza: 460, flor: 90, guamo: 10, nogal: 4, platano: 9, hojarasca: 14, piedra: 6 },
  medio: { cafeto: 70, cereza: 250, flor: 40, guamo: 6, nogal: 2, platano: 5, hojarasca: 8, piedra: 4 },
  bajo: { cafeto: 30, cereza: 100, flor: 0, guamo: 3, nogal: 1, platano: 2, hojarasca: 4, piedra: 2 },
};

/** Conteos para un tier (desconocido → frugal, nunca el más caro). */
export const cafetalDeTier = (tier) => FLORA_CAFETAL[tier] || FLORA_CAFETAL.medio;

/** Factor de detalle geométrico por tier (menos blobs/hojas en gama baja). */
export const CALIDAD_CAFETAL = { alto: 1, medio: 0.62, bajo: 0.42 };
export const calidadCafetal = (tier) => CALIDAD_CAFETAL[tier] ?? CALIDAD_CAFETAL.medio;

/* -------------------------------------------------------------------------- */
/*  Paleta del cafetal (colores horneados en vertexColors)                     */
/* -------------------------------------------------------------------------- */

export const PAL = {
  // Cafeto
  cafetoTallo: '#5a4430', // tallo leñoso delgado
  cafetoRama: '#6b5138', // la rama plagiotrópica, la percha de las cerezas
  cafetoHoja: '#24512c', // hoja verde MUY oscura lustrosa (la firma del café)
  cafetoHojaSol: '#3d7238', // la cara de la hoja que da al sol
  cafetoHojaSombra: '#1c3f23', // el corazón tupido de cada piso, tras las hojas
  cafetoBrote: '#7fa24c', // cogollo tierno arriba

  // Los estados de la cereza (van POR INSTANCIA, no aquí; referencia — la gama
  // real de la foto de cosecha: verde → pintón naranja → rojo cereza → VINO):
  cerezaVerde: '#7aa244',
  cerezaPinton: '#e0a33a',
  cerezaRoja: '#cf2a1d',
  cerezaVino: '#8e1a20',

  // La flor axilar blanca del arábica (nace pegada a la rama, como la cereza)
  florCafe: '#f6f1e2',
  florCentro: '#e9d98d',

  // Guamo (Inga) — el parasol del sombrío
  guamoTronco: '#6b533a',
  guamoCopa: '#4b7c3a',
  guamoCopaSol: '#699a48',
  guama: '#82a854', // las vainas verdes colgantes (la firma del Inga)

  // Nogal cafetero (Cordia alliodora) — el sombrío alto y recto
  nogalTronco: '#8a8274',
  nogalCopa: '#527a40',
  nogalCopaSol: '#6c9450',

  // Plátano intercalado
  platanoTallo: '#a8b06c',
  platanoHoja: '#5d9440',
  platanoHojaSol: '#7cb04e',
  platanoHojaSeca: '#a5924c',
  platanoRacimo: '#8fae55', // las manos verdes del racimo
  platanoBellota: '#77293a', // la bellota vinotinto que cuelga debajo

  // Suelo
  hojarasca: '#8a6c42',
  hojarasca2: '#75592f',
  piedra: '#8b8578',
  liquen: '#a3a878',
};

/* -------------------------------------------------------------------------- */
/*  Utilidades (fusión desindexada + colocación + color horneado)              */
/* -------------------------------------------------------------------------- */

const UP = new THREE.Vector3(0, 1, 0);

/** Hornea un color plano en TODOS los vértices (atributo `color`). */
function pintar(geo, color) {
  const c = color instanceof THREE.Color ? color : new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/** Coloca una geometría (posición/rotación/escala) transformando vértices. */
function poner(geo, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])),
    new THREE.Vector3(scale[0], scale[1], scale[2]),
  );
  geo.applyMatrix4(m);
  return geo;
}

/** Orienta el +Y de la geometría hacia `dir` y la ubica en `pos` (hojas). */
function apuntar(geo, pos, dir, esc = [1, 1, 1]) {
  const d = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d);
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    q,
    new THREE.Vector3(esc[0], esc[1], esc[2]),
  );
  geo.applyMatrix4(m);
  return geo;
}

/**
 * Fusiona partes (ya coloreadas) en UNA geometría. Se DESINDEXA todo antes de
 * fusionar y se TRUENA si falla: mejor un error de build que una especie
 * invisible en producción (mordida conocida de mergeGeometries).
 */
function fusionar(partes) {
  const buenas = partes.filter(Boolean).map((p) => {
    const plana = p.index ? p.toNonIndexed() : p;
    if (plana !== p) p.dispose();
    return plana;
  });
  const g = mergeGeometries(buenas, false);
  if (!g) {
    throw new Error('floraCafetal: mergeGeometries devolvió null — atributos incompatibles entre partes');
  }
  return g;
}

/** Pequeña variación determinista de color (que el cafetal no sea plano). */
function variar(base, r, amt = 0.06) {
  const c = new THREE.Color(base);
  c.multiplyScalar(1 + (r() - 0.5) * amt * 2);
  return c;
}

/* -------------------------------------------------------------------------- */
/*  CAFETO (Coffea arabica) — el cultivo                                       */
/* -------------------------------------------------------------------------- */

/*
 * La ARQUITECTURA del arábica, compartida entre la malla y la distribución:
 * pisos de ramas plagiotrópicas (horizontales, apenas caídas) alrededor del
 * tallo ortotrópico. Se EXPORTA para que las cerezas y las flores se siembren
 * SOBRE la misma rama que la geometría dibuja — el racimo pegado a la rama.
 */
export const PISOS_CAFETO = [
  { y: 0.34, ramas: 4, len: 0.56, caida: -0.16 }, // el piso bajo, el más ancho
  { y: 0.6, ramas: 4, len: 0.5, caida: -0.12 },
  { y: 0.84, ramas: 3, len: 0.42, caida: -0.08 },
  { y: 1.06, ramas: 3, len: 0.32, caida: -0.05 }, // el piso alto, el más corto
];

/** El ángulo de la rama j del piso i (filotaxis simple, determinista). */
export const anguloRamaCafeto = (piso, j, n) => (j / n) * Math.PI * 2 + piso * 0.55 + 0.35;

/** Cuántos pisos de ramas dibuja (y carga) cada tier. */
export const pisosCafetoDeQ = (q) => (q < 0.5 ? 2 : q < 0.85 ? 3 : PISOS_CAFETO.length);

/*
 * Porte columnar REAL del arábica: tallo leñoso central, pisos de RAMAS
 * horizontales visibles (la percha donde la distribución cuelga las cerezas),
 * HOJAS elípticas opuestas — grandes, oscuras, lustrosas: la firma del café —
 * y un corazón tupido por piso que da densidad a la silueta. Las CEREZAS y las
 * FLORES no van aquí: son InstancedMesh aparte, sembradas sobre estas ramas.
 */
export function geomCafeto({ q = 1 } = {}, seed = 1) {
  const r = rng(seed);
  const partes = [];

  // El tallo ortotrópico central.
  const tallo = new THREE.CylinderGeometry(0.028, 0.058, 1.24, 5, 1);
  poner(tallo, [0, 0.62, 0]);
  partes.push(pintar(tallo, PAL.cafetoTallo));

  const nPisos = pisosCafetoDeQ(q);
  const nudosPorRama = q < 0.85 ? 1 : 2; // pares de hojas por rama según tier
  for (let i = 0; i < nPisos; i++) {
    const p = PISOS_CAFETO[i];

    // El corazón tupido del piso (la masa oscura tras las hojas).
    const core = new THREE.IcosahedronGeometry(p.len * 0.5, 0);
    poner(
      core,
      [(r() - 0.5) * 0.06, p.y + 0.04, (r() - 0.5) * 0.06],
      [0, r() * Math.PI, 0],
      [1.3, 0.55, 1.3],
    );
    partes.push(pintar(core, variar(PAL.cafetoHojaSombra, r, 0.05)));

    for (let j = 0; j < p.ramas; j++) {
      const a = anguloRamaCafeto(i, j, p.ramas);
      const d = new THREE.Vector3(Math.cos(a), p.caida, Math.sin(a)).normalize();

      // La rama plagiotrópica visible (donde cargan racimos y hojas).
      const rama = new THREE.CylinderGeometry(0.011, 0.021, p.len, 4, 1, true);
      apuntar(
        rama,
        [d.x * p.len * 0.5, p.y + d.y * p.len * 0.5, d.z * p.len * 0.5],
        [d.x, d.y, d.z],
      );
      partes.push(pintar(rama, PAL.cafetoRama));

      // HOJAS elípticas OPUESTAS en los nudos (medio y punta de la rama):
      // grandes y tendidas casi horizontales — de lejos se leen "hojas de café".
      for (let k = 0; k < nudosPorRama * 2; k++) {
        const t = nudosPorRama === 1 ? 0.85 : k < 2 ? 0.5 : 0.92;
        const lado = k % 2 ? 1 : -1;
        const nx = d.x * p.len * t;
        const ny = p.y + d.y * p.len * t;
        const nz = d.z * p.len * t;
        const ah = a + lado * 1.15; // la hoja sale casi perpendicular a la rama
        const hoja = new THREE.SphereGeometry(1, 4, 2);
        poner(
          hoja,
          [nx + Math.cos(ah) * 0.1, ny - 0.01, nz + Math.sin(ah) * 0.1],
          [0, -ah, lado * 0.16], // tendida, con una caída leve hacia su lado
          [0.19 + r() * 0.03, 0.028, 0.1 + r() * 0.02],
        );
        partes.push(
          pintar(hoja, variar((i + k) % 2 ? PAL.cafetoHojaSol : PAL.cafetoHoja, r, 0.05)),
        );
      }
    }
  }

  // El cogollo tierno de la punta.
  const brote = new THREE.IcosahedronGeometry(0.1, 0);
  poner(brote, [0, 1.28, 0], [0, r() * Math.PI, 0], [1, 0.8, 1]);
  partes.push(pintar(brote, PAL.cafetoBrote));

  return fusionar(partes);
}

/** La cereza del café: OVOIDE (como en la rama real), pintada blanca — el
    color verdadero (verde→pintón→rojo→vino) va POR INSTANCIA. */
export function geomCereza() {
  const g = new THREE.IcosahedronGeometry(0.068, 0);
  g.scale(1, 1.28, 1);
  return pintar(g.index ? g.toNonIndexed() : g, '#ffffff');
}

/** El racimo axilar de FLOR blanca del arábica: tres motas y su centro crema.
    Nace pegado a la rama, igual que la cereza (misma tabla de pisos). */
export function geomFlorCafe(seed = 7) {
  const r = rng(seed);
  const partes = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + r();
    const mota = new THREE.IcosahedronGeometry(0.042 + r() * 0.018, 0);
    poner(
      mota,
      [Math.cos(a) * 0.05, (r() - 0.5) * 0.03, Math.sin(a) * 0.05],
      [r() * 0.6, r() * Math.PI, r() * 0.6],
      [1.15, 0.8, 1.15],
    );
    partes.push(pintar(mota, PAL.florCafe));
  }
  const centro = new THREE.IcosahedronGeometry(0.028, 0);
  poner(centro, [0, 0.035, 0]);
  partes.push(pintar(centro, PAL.florCentro));
  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  GUAMO (Inga) — el parasol del sombrío                                      */
/* -------------------------------------------------------------------------- */

export function geomGuamo({ q = 1 } = {}, seed = 2) {
  const r = rng(seed);
  const partes = [];

  // Tronco que se abre en ramas maestras.
  const tronco = new THREE.CylinderGeometry(0.14, 0.24, 2.9, 7, 1);
  poner(tronco, [0, 1.45, 0]);
  partes.push(pintar(tronco, PAL.guamoTronco));
  const nRamas = Math.max(2, Math.round(3 * q));
  for (let i = 0; i < nRamas; i++) {
    const a = (i / nRamas) * Math.PI * 2 + r();
    const rama = new THREE.CylinderGeometry(0.05, 0.09, 1.3, 5, 1);
    apuntar(rama, [Math.cos(a) * 0.55, 3.1, Math.sin(a) * 0.55], [Math.cos(a) * 0.9, 1, Math.sin(a) * 0.9]);
    partes.push(pintar(rama, PAL.guamoTronco));
  }

  // La copa ANCHA y plana: el techo de hojas sobre el cafetal (el parasol
  // del Inga — más ancho que alto, para que el café quepa DEBAJO).
  const nMasas = Math.max(3, Math.round(5 * q));
  for (let i = 0; i < nMasas; i++) {
    const a = (i / nMasas) * Math.PI * 2 + 0.7;
    const rad = i === 0 ? 0 : 1.2 + r() * 0.45;
    const masa = new THREE.IcosahedronGeometry(i === 0 ? 1.3 : 0.95 + r() * 0.25, 1);
    poner(
      masa,
      [Math.cos(a) * rad, 3.6 + (r() - 0.5) * 0.3, Math.sin(a) * rad],
      [0, r() * Math.PI, 0],
      [2.0, 0.66, 2.0],
    );
    partes.push(pintar(masa, variar(i % 2 ? PAL.guamoCopaSol : PAL.guamoCopa, r, 0.06)));
  }

  // Las GUAMAS: vainas verdes colgando bajo la copa — la firma del Inga
  // (y la merienda del cafetero). Pocas y gordas, legibles de lejos.
  const nGuamas = Math.max(2, Math.round(4 * q));
  for (let i = 0; i < nGuamas; i++) {
    const a = r() * Math.PI * 2;
    const rad = 0.7 + r() * 1.1;
    const vaina = new THREE.CylinderGeometry(0.03, 0.045, 0.5 + r() * 0.22, 4, 1);
    poner(
      vaina,
      [Math.cos(a) * rad, 3.0 + (r() - 0.5) * 0.25, Math.sin(a) * rad],
      [(r() - 0.5) * 0.5, r() * Math.PI, (r() - 0.5) * 0.5],
    );
    partes.push(pintar(vaina, variar(PAL.guama, r, 0.07)));
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  NOGAL CAFETERO (Cordia alliodora) — el sombrío alto y recto                */
/* -------------------------------------------------------------------------- */

export function geomNogal({ q = 1 } = {}, seed = 3) {
  const r = rng(seed);
  const partes = [];

  // Tronco recto y alto (madera fina de la finca cafetera).
  const tronco = new THREE.CylinderGeometry(0.1, 0.17, 4.1, 7, 1);
  poner(tronco, [0, 2.05, 0]);
  partes.push(pintar(tronco, PAL.nogalTronco));

  // Copa recogida y elevada, por pisos cortos (silueta de nogal).
  const nMasas = Math.max(3, Math.round(4 * q));
  for (let i = 0; i < nMasas; i++) {
    const a = i * 2.1 + 0.5;
    const rad = i === 0 ? 0 : 0.55 + r() * 0.3;
    const masa = new THREE.IcosahedronGeometry(0.75 + r() * 0.2, 1);
    poner(
      masa,
      [Math.cos(a) * rad, 4.15 + i * 0.32, Math.sin(a) * rad],
      [0, r() * Math.PI, 0],
      [1.15, 0.8, 1.15],
    );
    partes.push(pintar(masa, variar(i % 2 ? PAL.nogalCopaSol : PAL.nogalCopa, r, 0.06)));
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  PLÁTANO intercalado — el acompañante de casi todo cafetal campesino        */
/* -------------------------------------------------------------------------- */

export function geomPlatano({ q = 1 } = {}, seed = 4) {
  const r = rng(seed);
  const partes = [];

  // Pseudotallo claro.
  const tallo = new THREE.CylinderGeometry(0.09, 0.14, 1.9, 6, 1);
  poner(tallo, [0, 0.95, 0]);
  partes.push(pintar(tallo, PAL.platanoTallo));

  // Las hojas enormes, arqueadas hacia afuera y abajo.
  const nHojas = Math.max(4, Math.round(6 * q));
  for (let i = 0; i < nHojas; i++) {
    const a = (i / nHojas) * Math.PI * 2 + r() * 0.5;
    const caida = 0.55 + r() * 0.4; // cuánto se arquea
    const hoja = new THREE.SphereGeometry(1, 7, 5);
    const seca = r() > 0.82; // alguna hoja vieja amarillea
    apuntar(
      hoja,
      [Math.cos(a) * 0.5, 1.95, Math.sin(a) * 0.5],
      [Math.cos(a), 1 - caida, Math.sin(a)],
      [0.14, 0.85, 0.32],
    );
    partes.push(pintar(hoja, variar(seca ? PAL.platanoHojaSeca : i % 2 ? PAL.platanoHojaSol : PAL.platanoHoja, r, 0.05)));
  }

  // EL RACIMO con su BELLOTA: la señal inequívoca del plátano. El vástago se
  // descuelga de la corona, las manos verdes en pisos y la bellota vinotinto
  // rematando abajo.
  const ar = r() * Math.PI * 2;
  const rx = Math.cos(ar);
  const rz = Math.sin(ar);
  const vastago = new THREE.CylinderGeometry(0.028, 0.038, 0.6, 4, 1);
  apuntar(vastago, [rx * 0.38, 1.72, rz * 0.38], [rx * 0.7, -1, rz * 0.7]);
  partes.push(pintar(vastago, variar(PAL.platanoTallo, r, 0.06)));
  for (let i = 0; i < 3; i++) {
    const mano = new THREE.IcosahedronGeometry(0.15 - i * 0.025, 0);
    poner(
      mano,
      [rx * (0.5 + i * 0.05), 1.52 - i * 0.16, rz * (0.5 + i * 0.05)],
      [0, r() * Math.PI, 0],
      [1.25, 0.8, 1.25],
    );
    partes.push(pintar(mano, variar(PAL.platanoRacimo, r, 0.05)));
  }
  const bellota = new THREE.IcosahedronGeometry(0.085, 0);
  poner(bellota, [rx * 0.68, 0.94, rz * 0.68], [0, r() * Math.PI, 0], [0.85, 1.4, 0.85]);
  partes.push(pintar(bellota, PAL.platanoBellota));

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  Suelo: hojarasca y piedra                                                  */
/* -------------------------------------------------------------------------- */

export function geomHojarasca(seed = 5) {
  const r = rng(seed);
  const partes = [];
  for (let i = 0; i < 3; i++) {
    const mancha = new THREE.CylinderGeometry(0.34 + r() * 0.3, 0.42 + r() * 0.32, 0.035, 7, 1);
    poner(mancha, [(r() - 0.5) * 0.5, 0.02 + i * 0.012, (r() - 0.5) * 0.5], [0, r() * Math.PI, 0]);
    partes.push(pintar(mancha, i % 2 ? PAL.hojarasca2 : PAL.hojarasca));
  }
  return fusionar(partes);
}

export function geomPiedra(seed = 6) {
  const r = rng(seed);
  const roca = new THREE.DodecahedronGeometry(0.32, 0);
  poner(roca, [0, 0.14, 0], [r() * 0.6, r() * Math.PI, r() * 0.6], [1.25, 0.7, 1]);
  const capa = new THREE.DodecahedronGeometry(0.18, 0);
  poner(capa, [0.12, 0.24, 0.05], [0, r() * Math.PI, 0], [1, 0.55, 1]);
  return fusionar([pintar(roca, PAL.piedra), pintar(capa, PAL.liquen)]);
}

/* -------------------------------------------------------------------------- */
/*  Distribución: surcos a curva de nivel + sombrío disperso                   */
/* -------------------------------------------------------------------------- */

/* El sombrío vive FIJO en la ladera (posiciones compuestas a mano para que el
   techo de sombra cubra TODO el cultivo — también los surcos del FRENTE, que
   antes quedaban a pleno sol: café sin sombrío parece potrero, y eso aquí no
   va). El ORDEN importa: se recortan por tier con slice, así que las primeras
   posiciones reparten frente y fondo para que hasta 'medio' y 'bajo' lean
   "cafetal bajo sombra", nunca hileras desnudas. */
const SITIOS_GUAMO = [
  [-8.5, -5.5], [3.2, 2.4], [6.5, -6.0], [-6.8, 1.6], [-1.5, -8.5],
  [11.0, -2.5], [14.2, 1.2], [-12.5, -10.0], [-4.5, -2.0], [2.5, -12.5],
];
const SITIOS_NOGAL = [
  [9.5, -10.5], [-6.5, -13.0], [14.0, -7.5], [-15.2, -3.0],
];
const SITIOS_PLATANO = [
  [-11.5, -3.0], [-2.4, 1.9], [4.0, -3.8], [9.8, 2.8], [-3.0, -11.0],
  [12.5, -12.0], [-14.5, -7.0], [8.0, -1.2], [-16.2, 0.8],
];

/* La casa/beneficiadero vive arriba al fondo; los surcos la respetan. */
export const SITIO_CASA = /** @type {[number, number]} */ ([9.0, -14.6]);

/*
 * Los CAFETOS PROTAGONISTAS del primer plano: tres matas grandes y CARGADAS que
 * flanquean el camino de entrada (los surcos arrancan en z=2.6; estos viven más
 * acá, donde la cámara llega). Son la respuesta al reclamo "el café no se
 * distingue como planta": a esta distancia los pisos de ramas plagiotrópicas,
 * la hoja elíptica oscura y el racimo de cereza PEGADO a la rama se leen sin
 * ayuda. Deterministas y en TODOS los tiers (son pocos y son la lección).
 * `maduro` alto = cosecha a la vista (roja/vino con su pintón); el verde queda
 * en los surcos del fondo — la maduración despareja real de la ladera.
 */
export const SITIOS_HERO = [
  { px: -2.8, pz: 5.6, esc: 1.6, rotY: 2.2, maduro: 0.85, carga: 1, hero: true },
  { px: 4.2, pz: 4.6, esc: 1.35, rotY: 0.7, maduro: 0.7, carga: 1, hero: true },
  { px: -5.0, pz: 3.2, esc: 1.25, rotY: 4.1, maduro: 0.75, carga: 1, hero: true },
];

/** ¿Qué tan maduro está el café en esta franja? Abajo (más caliente) más rojo. */
function madurezEn(wz, r) {
  const base = smoothstep(-13.5, 3.0, wz); // el frente de la ladera pinta primero
  return clamp(base + (r() - 0.5) * 0.35, 0, 1);
}

/**
 * Siembra determinista del cafetal completo. Devuelve items por especie:
 * `{pos, rotY, escala, tint}` (contrato del componente `Especie`), y para la
 * cereza el `tint` ES el color del fruto (verde → pintón → rojo → vino por
 * instancia). `q` es la calidad del tier: define cuántos pisos de ramas dibuja
 * la mata — y por tanto sobre cuáles pisos pueden cargar cerezas y flores
 * (nunca fruto flotando sobre una rama que el tier no dibujó).
 */
export function distribucionCafetal(conteos, seed = 311, q = 1) {
  const c = conteos;
  const rCaf = rng(seed + 1);
  const rCer = rng(seed + 2);
  const rSue = rng(seed + 3);
  const rFlo = rng(seed + 5);

  // --- Los surcos a curva de nivel (el café nunca se siembra ladera abajo). ---
  const sitios = [];
  const filasZ = [2.6, 1.0, -0.6, -2.2, -3.8, -5.4, -7.0, -8.6, -10.2, -11.8, -13.4];
  filasZ.forEach((z0, fila) => {
    for (let wx = -15; wx <= 15; wx += 1.35) {
      const jx = (rCaf() - 0.5) * 0.5;
      const curva = Math.sin(wx * 0.13 + fila * 0.45) * 0.9; // la curva del surco
      const px = wx + jx;
      const pz = z0 + curva + (rCaf() - 0.5) * 0.3;
      // respetar el patio de la casa/beneficiadero
      const dx = px - SITIO_CASA[0];
      const dz = pz - SITIO_CASA[1];
      if (dx * dx + dz * dz < 16) continue;
      sitios.push({
        px, pz,
        esc: 0.8 + rCaf() * 0.45,
        rotY: rCaf() * Math.PI * 2,
        maduro: madurezEn(pz, rCaf),
        carga: rCaf(), // qué tan cargada de fruto está la mata
      });
    }
  });
  // Recorte determinista al presupuesto del tier: muestreo PAREJO de TODA la
  // ladera con paso FRACCIONAL — nunca "los primeros N". (El paso entero con
  // floor daba 1 con ~239 sitios y 120 matas: sembraba solo las filas del
  // frente y dejaba el fondo pelado, sin matas verdes para la flor.)
  const matas = [];
  if (sitios.length <= c.cafeto) {
    matas.push(...sitios);
  } else {
    const paso = sitios.length / c.cafeto;
    for (let k = 0; k < c.cafeto; k++) matas.push(sitios[Math.floor(k * paso)]);
  }
  // Los protagonistas del primer plano van SIEMPRE (fuera del presupuesto: son
  // tres y son la lección — hasta 'bajo' tiene que leer "eso es un cafeto").
  matas.push(...SITIOS_HERO);

  const cafeto = matas.map((s) => ({
    pos: [s.px, alturaLadera(s.px, s.pz), s.pz],
    rotY: s.rotY,
    escala: s.esc,
    tint: [0.92 + rCaf() * 0.16, 0.92 + rCaf() * 0.16, 0.92 + rCaf() * 0.16],
  }));

  // --- Las cerezas: RACIMOS EN FILA sobre la MISMA rama que la geometría
  //     dibuja (PISOS_CAFETO + anguloRamaCafeto) — el café carga pegado a la
  //     rama, en cuentas apretadas, no flotando en el follaje. Cada racimo
  //     mezcla estados (verde/pintón/rojo/vino), como en la rama real. ---
  const verde = new THREE.Color(PAL.cerezaVerde);
  const pinton = new THREE.Color(PAL.cerezaPinton);
  const roja = new THREE.Color(PAL.cerezaRoja);
  const vino = new THREE.Color(PAL.cerezaVino);
  const col = new THREE.Color();
  const cereza = [];
  const nPisos = pisosCafetoDeQ(q);
  // Los héroes del primer plano entran TRES veces a la rueda Y AL FRENTE:
  // cargan el triple de racimos que una mata del surco y cargan PRIMERO — la
  // cereza pegada a la rama tiene que leerse desde la entrada en TODOS los
  // tiers (en 'bajo' el presupuesto se agota rápido: si el héroe espera turno
  // al final, queda pelado — mordida encontrada en el sanity headless).
  const cargadas = [
    ...SITIOS_HERO,
    ...SITIOS_HERO,
    ...SITIOS_HERO,
    ...matas.filter((s) => s.carga > 0.3 && !s.hero),
  ];
  /* Un punto local de la rama (piso i, rama j, avance t) llevado al mundo:
     escala de la mata + su giro + su sitio en la ladera. */
  const enRama = (s, i, j, t, dy, jit, rr) => {
    const p = PISOS_CAFETO[i];
    const a = anguloRamaCafeto(i, j, p.ramas);
    const lx = Math.cos(a) * p.len * t + (rr() - 0.5) * jit;
    const ly = p.y + p.caida * p.len * t + dy + (rr() - 0.5) * jit * 0.6;
    const lz = Math.sin(a) * p.len * t + (rr() - 0.5) * jit;
    const cosR = Math.cos(s.rotY);
    const sinR = Math.sin(s.rotY);
    return [
      s.px + (lx * cosR + lz * sinR) * s.esc,
      alturaLadera(s.px, s.pz) + ly * s.esc,
      s.pz + (-lx * sinR + lz * cosR) * s.esc,
    ];
  };
  let gi = 0;
  while (cereza.length < c.cereza && cargadas.length > 0) {
    const s = cargadas[gi % cargadas.length];
    gi += 1;
    if (gi > cargadas.length * 12) break;
    // los pisos BAJOS cargan más (madera más vieja, más cosecha)
    const i = Math.floor(rCer() * Math.min(nPisos, 3));
    const p = PISOS_CAFETO[i];
    const j = Math.floor(rCer() * p.ramas);
    const cuantas = 3 + Math.floor(rCer() * 4) + (s.hero ? 2 : 0);
    const t0 = 0.2 + rCer() * 0.28;
    for (let k = 0; k < cuantas && cereza.length < c.cereza; k++) {
      const t = t0 + k * 0.085; // el racimo EN FILA, cuenta tras cuenta
      if (t > 0.82) break; // la punta de la rama es de las hojas
      // el estado del fruto: la madurez de la mata + su propio azar
      const m = clamp(s.maduro + (rCer() - 0.5) * 0.45, 0, 1);
      if (m < 0.35) col.lerpColors(verde, pinton, m / 0.35);
      else if (m < 0.68) col.lerpColors(pinton, roja, (m - 0.35) / 0.33);
      else col.lerpColors(roja, vino, (m - 0.68) / 0.32);
      col.multiplyScalar(0.94 + rCer() * 0.12);
      cereza.push({
        pos: enRama(s, i, j, t, -0.045, 0.035, rCer), // colgada APENAS bajo la rama
        rotY: rCer() * Math.PI,
        // en el héroe la cuenta es un pelín más gorda: legible desde la entrada
        escala: (0.8 + rCer() * 0.45) * (s.hero ? 1.3 : 1),
        tint: [col.r, col.g, col.b],
      });
    }
  }

  // --- Las FLORES: racimos axilares blancos en las matas más VERDES (arriba,
  //     donde la madurez aún no llega) — flor y cereza conviviendo en la misma
  //     ladera, el ciclo real del arábica a la vista. ---
  const flor = [];
  const florecidas = matas.filter((s) => s.maduro < 0.45);
  let fi = 0;
  while (flor.length < (c.flor || 0) && florecidas.length > 0) {
    const s = florecidas[fi % florecidas.length];
    fi += 1;
    if (fi > florecidas.length * 6) break;
    const i = Math.floor(rFlo() * nPisos);
    const p = PISOS_CAFETO[i];
    const j = Math.floor(rFlo() * p.ramas);
    const t = 0.28 + rFlo() * 0.5;
    flor.push({
      pos: enRama(s, i, j, t, 0.025, 0.02, rFlo), // asomada SOBRE la rama
      rotY: rFlo() * Math.PI * 2,
      escala: 0.85 + rFlo() * 0.4,
      tint: [1, 0.99 - rFlo() * 0.03, 0.95 - rFlo() * 0.04],
    });
  }

  // --- El sombrío y el plátano (sitios fijos recortados por tier). ---
  const enLadera = (p, esc, rr) => ({
    pos: [p[0], alturaLadera(p[0], p[1]), p[1]],
    rotY: rr() * Math.PI * 2,
    escala: esc,
    tint: [0.94 + rr() * 0.12, 0.94 + rr() * 0.12, 0.94 + rr() * 0.12],
  });
  const rArb = rng(seed + 4);
  // alturas MEZCLADAS a propósito: el dosel del sombrío es desigual (guamos
  // viejos y jóvenes conviven) — nada aquí puede parecer plantación pareja.
  const guamo = SITIOS_GUAMO.slice(0, c.guamo).map((p) => enLadera(p, 0.82 + rArb() * 0.55, rArb));
  const nogal = SITIOS_NOGAL.slice(0, c.nogal).map((p) => enLadera(p, 0.9 + rArb() * 0.35, rArb));
  const platano = SITIOS_PLATANO.slice(0, c.platano).map((p) => enLadera(p, 0.8 + rArb() * 0.42, rArb));

  // --- El suelo: hojarasca bajo el sombrío, piedras sueltas. ---
  const hojarasca = [];
  const bajoSombra = [...SITIOS_GUAMO.slice(0, c.guamo), ...SITIOS_NOGAL.slice(0, c.nogal)];
  for (let i = 0; i < c.hojarasca; i++) {
    const s = bajoSombra[i % Math.max(1, bajoSombra.length)] || [0, -6];
    const x = s[0] + (rSue() - 0.5) * 3.2;
    const z = s[1] + (rSue() - 0.5) * 3.2;
    hojarasca.push({
      pos: [x, alturaLadera(x, z) + 0.01, z],
      rotY: rSue() * Math.PI * 2,
      escala: 0.8 + rSue() * 0.7,
      tint: [0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16],
    });
  }
  const piedra = [];
  for (let i = 0; i < c.piedra; i++) {
    const x = -16 + rSue() * 32;
    const z = -14 + rSue() * 28;
    piedra.push({
      pos: [x, alturaLadera(x, z), z],
      rotY: rSue() * Math.PI * 2,
      escala: 0.7 + rSue() * 0.9,
      tint: [0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16],
    });
  }

  return { cafeto, cereza, flor, guamo, nogal, platano, hojarasca, piedra };
}

/** Los centros del sombrío del tier (para la luz colada bajo las copas). */
export function centrosSombrio(conteos) {
  return [
    ...SITIOS_GUAMO.slice(0, conteos.guamo),
    ...SITIOS_NOGAL.slice(0, conteos.nogal),
  ].map(([x, z]) => /** @type {[number, number, number]} */ ([x, alturaLadera(x, z), z]));
}
