/*
 * sierraMonte.geom — la GEOMETRÍA de la Sierra como MACIZO 3D DE VERDAD.
 *
 * A diferencia de `SierraCorteVertical` (un corte plano visto de frente — se
 * lee como lámina de geografía, y ESO se guarda), aquí la montaña es un RELIEVE
 * con volumen: un heightfield radial con crestas, contrafuertes y quebradas, que
 * se ORBITA. Tiene cara, laderas y profundidad; la luz modela el relieve. El
 * referente es Alto's Odyssey / Journey / Sable: terreno low-poly que se siente
 * un LUGAR con presupuesto de teléfono barato.
 *
 * Cero three de render aquí: solo three-core (geometría + color por vértice) —
 * corre headless y no toca WebGL. Lo consume `SierraMonte3D.jsx`.
 *
 * ── LOS DATOS SON DEL GRAFO (IDEAM/IGAC, 1093 aristas GROWS_IN) ──────────────
 * Las cuatro bandas navegables salen de `pisosTermicos.js`:
 *     cálido    0–1000 m     templado 1000–2000 m
 *     frío      2000–3000 m  páramo   3000–4000 m
 * Encima, la corona (superpáramo + nival, hasta 5 775 m) es roca y hielo: se
 * mira, no se navega. La altura del terreno mapea a metros REALES (cima=5 775 m),
 * así el color por vértice cae en su banda climática y la vegetación instanciada
 * cambia con la altura: palma abajo, café, bosque de niebla, frailejón, y roca
 * y nieve arriba.
 *
 * ── PRESUPUESTO (Android barato + Quadro M6000, gateado por tier) ────────────
 * El terreno es UNA malla (rejilla polar, densidad por tier). La vegetación es
 * un InstancedMesh por especie (una draw-call por especie por más matas que
 * haya), con geometría FUSIONADA vía `fusionarSeguro` (la trampa del null
 * silencioso queda cerrada). Color 100% horneado en vertexColors; cero texturas,
 * cero DEM, cero GLTF.
 */
import * as THREE from 'three';
import { CUMBRE_SIERRA_M } from '../pisosTermicos.js';
import {
  rng,
  ruido3D,
  ruidoFbm,
  fusionarSeguro,
  poner,
  tuboOrganico,
  taperLineal,
  taperTronco,
  curvaTronco,
  hornearFollaje,
  hornearCorteza,
  sembrarFollaje,
  matojoHoja,
  pintarPlano,
  pintarPorVertice,
} from '../bosque/sombreadoVegetal.js';

/* ── Dimensiones del macizo (unidades de mundo). El pie es ancho (cálido junto
      al mar); la cima, fina y nevada. ── */
export const R_MONTE = 11.5; // radio de la base al nivel del mar
export const H_PICO = 10.5; // altura de la cima (alta y empinada: macizo imponente)
export const Y_MAR = 0; // el mar al pie

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

/** Altura de mundo → altitud en metros (proporción real: cima = 5 775 m). */
export const metrosDeY = (y) => (clamp(y, 0, H_PICO) / H_PICO) * CUMBRE_SIERRA_M;
/** Altitud en metros → altura de mundo. */
export const yDeMetros = (m) => (clamp(m, 0, CUMBRE_SIERRA_M) / CUMBRE_SIERRA_M) * H_PICO;

/* Silueta radial del macizo: cóncava (cae del pico al mar) con un ensanche de
   falda en el pie —las estribaciones que tocan el Caribe—. */
function perfilRadial(rn) {
  const cuerpo = Math.pow(1 - rn, 1.05); // casi lineal: cuerpo lleno, no cinta fina
  const falda = Math.exp(-rn * 9) * 0.05; // faldón corto: la montaña sube del mar sin plano vasto
  return cuerpo + falda;
}

/**
 * La ALTURA del terreno en (x, z). Determinista. Es el corazón de "montaña de
 * verdad": sobre la silueta cóncava monta contrafuertes radiales (5 espolones
 * que bajan por los flancos), quebradas talladas por ruido con cresta, y una
 * asimetría de baja frecuencia para que NO sea un cono perfecto. Todo el
 * relieve fino se amortigua con `damp` (0 en la cima y en el borde, máximo a
 * media ladera) para que la cumbre quede limpia y la base se funda con el mar.
 */
export function alturaTerreno(x, z) {
  const r = Math.hypot(x, z);
  const rn = clamp(r / R_MONTE, 0, 1);
  const ang = Math.atan2(z, x);
  const damp = Math.sin(rn * Math.PI); // 0 en cima y borde, máx a media ladera

  let h = perfilRadial(rn);
  // Contrafuertes radiales: 5 espolones que bajan por las laderas.
  const spur = Math.pow(Math.max(0, Math.cos(ang * 5 + Math.sin(rn * 4))), 1.5);
  h += spur * 0.2 * damp;
  // Quebradas y hombros: ruido con cresta (ridged) talla surcos y sub-cumbres.
  const n = ruidoFbm(x * 0.16 + 3.3, 0, z * 0.16 - 1.7);
  const ridged = 1 - Math.abs(n * 2 - 1);
  h += (ridged - 0.4) * 0.16 * damp;
  // Asimetría de baja frecuencia: rompe el cono (un flanco más lleno + un hombro
  // lateral) — para que se lea macizo, no triángulo.
  h += Math.cos(ang) * 0.09 * damp;
  h += Math.cos(ang * 2 + 1.1) * 0.05 * damp;
  // Rugosidad fina.
  h += (ruido3D(x * 0.6 + 9, 2, z * 0.6) - 0.5) * 0.03 * damp;

  h = Math.max(0, h);
  h *= smoothstep(1.0, 0.82, rn); // se funde con el mar en el borde
  return H_PICO * h;
}

/** Pendiente aproximada en (x,z): 0 llano, 1 vertical. Diferencias finitas. */
export function pendienteTerreno(x, z, e = 0.35) {
  const hx = alturaTerreno(x + e, z) - alturaTerreno(x - e, z);
  const hz = alturaTerreno(x, z + e) - alturaTerreno(x, z - e);
  const g = Math.hypot(hx, hz) / (2 * e);
  return clamp(g / (g + 1.2), 0, 1);
}

/* ── Paleta de biomas del terreno (colores del SUELO/dosel bajo; los árboles
      instanciados ponen el dosel alto encima). Cálido→frío→roca→nieve. ── */
const COL = {
  arena: new THREE.Color('#cdb98a'),
  calido: new THREE.Color('#93813f'),
  calidoV: new THREE.Color('#7c9646'),
  templado: new THREE.Color('#5a8a3d'),
  frio: new THREE.Color('#3c7b5f'),
  paramo: new THREE.Color('#a89a63'), // pajonal pajizo-dorado (claro, se distingue)
  paramoAlt: new THREE.Color('#8f978c'), // gris frío claro hacia la roca
  roca: new THREE.Color('#726456'),
  rocaAlt: new THREE.Color('#544a40'),
  nieve: new THREE.Color('#f1f6f8'),
  hielo: new THREE.Color('#d3e2e8'),
};

/* Rampa de bioma por altitud (metros → color base del suelo). */
const RAMPA = [
  { m: 0, c: COL.arena },
  { m: 120, c: COL.calidoV },
  { m: 1000, c: COL.calido },
  { m: 1400, c: COL.templado },
  { m: 2200, c: COL.frio },
  { m: 3000, c: COL.paramo },
  { m: 3700, c: COL.paramoAlt },
  { m: 4100, c: COL.roca },
  { m: 4700, c: COL.hielo },
  { m: 5100, c: COL.nieve },
];

const _cr = new THREE.Color();
function colorBioma(m) {
  if (m <= RAMPA[0].m) return _cr.copy(RAMPA[0].c);
  for (let i = 1; i < RAMPA.length; i++) {
    if (m <= RAMPA[i].m) {
      const a = RAMPA[i - 1];
      const b = RAMPA[i];
      const t = smoothstep(a.m, b.m, m);
      return _cr.copy(a.c).lerp(b.c, t);
    }
  }
  return _cr.copy(RAMPA[RAMPA.length - 1].c);
}

/**
 * Construye la malla del macizo: rejilla polar (anillos × sectores) desplazada
 * por `alturaTerreno`, con color por vértice horneado (bioma por altitud +
 * roca en las pendientes fuertes + nieve arriba, modelada por la altura y la
 * pendiente). Indexada; el llamador la desindexa si su tier hace flatShading.
 *
 * @param {number} anillos  resolución radial (perfil.segmentosTerreno).
 * @param {number} [sectores]
 */
export function geometriaMonte(anillos = 48, sectores = 0) {
  const RN = Math.max(10, anillos);
  const SN = Math.max(16, sectores || Math.round(RN * 1.4));
  const nV = (RN + 1) * (SN + 1);
  const posArr = new Float32Array(nV * 3);
  const uvArr = new Float32Array(nV * 2);

  let p = 0;
  let u = 0;
  for (let i = 0; i <= RN; i++) {
    const r = (i / RN) * R_MONTE;
    for (let j = 0; j <= SN; j++) {
      const a = (j / SN) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = alturaTerreno(x, z);
      posArr[p++] = x;
      posArr[p++] = y;
      posArr[p++] = z;
      uvArr[u++] = j / SN;
      uvArr[u++] = i / RN;
    }
  }

  const index = [];
  const row = SN + 1;
  for (let i = 0; i < RN; i++) {
    for (let j = 0; j < SN; j++) {
      const a = i * row + j;
      const b = a + 1;
      const c = (i + 1) * row + j;
      const d = c + 1;
      index.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();

  // ── Color por vértice: bioma + roca por pendiente + nieve por altura/llano ──
  const nrm = geo.getAttribute('normal');
  const tmp = new THREE.Color();
  pintarPorVertice(geo, (x, y, z, i) => {
    const m = metrosDeY(y);
    tmp.copy(colorBioma(m));
    const pend = clamp(1 - nrm.getY(i), 0, 1); // 0 llano, 1 pared
    // Roca desnuda en pendientes fuertes: fuerte solo arriba (peñascos del
    // páramo/roca); abajo apenas un roce, para que los pisos verdes NO se
    // embarren de marrón y el gradiente térmico se lea.
    if (m < 4000) {
      const roca = smoothstep(0.54, 0.86, pend);
      tmp.lerp(m > 3400 ? COL.rocaAlt : COL.roca, roca * (m > 2900 ? 0.5 : 0.14));
    }
    // Nieve: corona la Sierra. Empieza abajo y cuaja fuerte; el tercio alto es
    // blanco franco aunque la pared sea empinada (es "del mar a la NIEVE").
    const alta = smoothstep(3400, 4100, m);
    if (alta > 0) {
      const cuaja = alta * (0.9 + 0.1 * (1 - pend));
      tmp.lerp(m > 4300 ? COL.nieve : COL.hielo, clamp(cuaja, 0, 1));
      if (m > 3900) tmp.lerp(COL.nieve, smoothstep(3900, 4800, m));
    }
    // Grano fino de color para que la ladera no sea plana.
    const g = ruidoFbm(x * 0.5 + 21, y * 0.5, z * 0.5);
    tmp.multiplyScalar(0.92 + g * 0.16);
    return tmp;
  });

  return geo;
}

/* -------------------------------------------------------------------------- */
/*  VEGETACIÓN — una geometría fusionada por especie, luego instanciada         */
/* -------------------------------------------------------------------------- */

/* Cuántas matas de cada especie por tier. Son INSTANCIAS (no draw-calls: cada
   especie es un solo InstancedMesh). 'bajo' deja lo mínimo que aún lee "montaña
   con pisos". */
export const VEG_TIER = {
  alto: { palmera: 70, cafeto: 95, niebla: 85, frailejon: 70 },
  medio: { palmera: 40, cafeto: 52, niebla: 46, frailejon: 40 },
  bajo: { palmera: 12, cafeto: 16, niebla: 14, frailejon: 18 },
};
export const vegDeTier = (tier) => VEG_TIER[tier] || VEG_TIER.medio;

/* Factor de detalle geométrico por tier (menos blobs/segmentos en gama baja). */
export const CALIDAD_VEG = { alto: 1, medio: 0.66, bajo: 0.45 };
export const calidadVeg = (tier) => CALIDAD_VEG[tier] ?? CALIDAD_VEG.medio;

/* ── Un árbol frondoso genérico (café de sombra / árbol de niebla): tronco con
      curva + corteza horneada, y una copa de matojos con sombreado de follaje
      (AO + gradiente + contraluz). ── */
function arbolFrondoso({ altura, radioCopa, base, sol, luz, corteza, nBlobs, q }, seed) {
  const partes = [];
  const curva = curvaTronco({ altura, inclina: 0.06, sinuoso: 0.08, giro: seed }, seed);
  const tronco = tuboOrganico(curva, {
    tubular: Math.max(4, Math.round(6 * q)),
    radial: 5,
    taper: taperTronco(altura * 0.06, altura * 0.02, 0.3),
    arruga: 0.14,
    semilla: seed,
  });
  hornearCorteza(tronco, { grieta: corteza.g, cuerpo: corteza.c, cresta: corteza.k });
  partes.push(tronco);

  const nb = Math.max(2, Math.round(nBlobs * q));
  const cen = [0, altura * 0.92, 0];
  const puntos = sembrarFollaje({
    centro: cen, radio: radioCopa, achatado: 0.82, n: nb,
    semilla: seed + 7, huecos: 0.36, mordida: 0.34, distMin: radioCopa * 0.42,
  });
  for (const pt of puntos) {
    const rad = radioCopa * (0.42 + 0.3 * pt.esc);
    const hoja = matojoHoja(rad, seed + Math.round(pt.pos[0] * 40) + 3, 0.4);
    poner(hoja, pt.pos, pt.giro, [1, 1, 1]);
    hornearFollaje(hoja, {
      base, sol, luz, centro: pt.pos, radio: rad * 1.15,
      yMin: altura * 0.5, yMax: altura + radioCopa, ao: 0.6, manchas: 0.14,
    });
    partes.push(hoja);
  }
  return fusionarSeguro(partes, 'arbol-frondoso');
}

/** Café / árbol de sombra (templado): bajo, copa redonda verde media. */
export function geomCafeto(q = 1, seed = 3) {
  return arbolFrondoso({
    altura: 0.9, radioCopa: 0.42,
    base: '#375f2c', sol: '#79a34a', luz: '#c8d888',
    corteza: { g: '#3c2c1c', c: '#6a4d31', k: '#8a6942' },
    nBlobs: 5, q,
  }, seed);
}

/** Árbol de niebla / roble andino (frío): más alto, copa densa verde-hondo. */
export function geomNiebla(q = 1, seed = 5) {
  return arbolFrondoso({
    altura: 1.35, radioCopa: 0.55,
    base: '#264a34', sol: '#4f7d47', luz: '#a9c479',
    corteza: { g: '#2a2016', c: '#4f3a26', k: '#6e5238' },
    nBlobs: 7, q,
  }, seed);
}

/* ── La palma de tierra caliente (cálido): estípite curvo alto y una corona de
      hojas pinnadas que caen. Se lee "trópico" de un vistazo. ── */
export function geomPalmera(q = 1, seed = 9) {
  const partes = [];
  const altura = 1.5;
  const curva = curvaTronco({ altura, inclina: 0.16, sinuoso: 0.05, giro: seed }, seed);
  const estipite = tuboOrganico(curva, {
    tubular: Math.max(5, Math.round(7 * q)),
    radial: 5,
    taper: taperLineal(0.06, 0.045),
    arruga: 0.16,
    semilla: seed,
  });
  hornearCorteza(estipite, { grieta: '#5a4326', cuerpo: '#8a6a44', cresta: '#a98a5c', escalaGrano: 8 });
  partes.push(estipite);

  const cima = curva.getPointAt(1);
  const nHojas = Math.max(4, Math.round(8 * q));
  for (let i = 0; i < nHojas; i++) {
    const a = (i / nHojas) * Math.PI * 2 + seed;
    // Hoja pinnada: un cono aplastado que cae, radiando de la corona.
    const hoja = new THREE.ConeGeometry(0.12, 0.62, 4, 1, true);
    hoja.scale(1, 1, 0.28); // aplastada: fronda, no pincho
    hoja.translate(0, 0.31, 0);
    const droop = 0.7 + (i % 3) * 0.12;
    poner(
      hoja,
      [cima.x + Math.cos(a) * 0.16, cima.y + 0.02, cima.z + Math.sin(a) * 0.16],
      [Math.PI / 2 - droop, -a, 0],
    );
    pintarPorVertice(hoja, (x, y) => {
      // gradiente base→punta a lo largo de la fronda
      const t = clamp((y - cima.y) / 0.7, 0, 1);
      return _cr.copy(new THREE.Color('#3f6a2f')).lerp(new THREE.Color('#7fae4a'), t);
    });
    partes.push(hoja);
  }
  // cogollo central
  const cogollo = matojoHoja(0.12, seed + 1, 0.3);
  poner(cogollo, [cima.x, cima.y + 0.08, cima.z], [0, 0, 0]);
  pintarPlano(cogollo, '#6a9a3f');
  partes.push(cogollo);
  return fusionarSeguro(partes, 'palmera');
}

/* ── El frailejón que GUARDA el páramo (Espeletia): tronco columnar con enagua
      de hojas muertas, roseta lanuda plateada y flor. La firma del piso
      protegido. ── */
export function geomFrailejon(q = 1, seed = 11) {
  const partes = [];
  const altura = 0.6;
  const curva = curvaTronco({ altura, inclina: 0.04, sinuoso: 0.03, giro: seed }, seed);
  const tallo = tuboOrganico(curva, {
    tubular: Math.max(3, Math.round(5 * q)),
    radial: 6,
    taper: taperLineal(0.07, 0.06),
    arruga: 0.08,
    semilla: seed,
  });
  hornearCorteza(tallo, { grieta: '#4a3a26', cuerpo: '#6f5c40', cresta: '#8a7350' });
  partes.push(tallo);
  // enagua: cono invertido de hojas secas alrededor del tallo
  const enagua = new THREE.ConeGeometry(0.13, altura * 0.9, 8, 1, true);
  enagua.translate(0, altura * 0.45, 0);
  pintarPlano(enagua, '#7a6440');
  partes.push(enagua);
  // roseta lanuda plateada
  const roseta = matojoHoja(0.15, seed + 2, 0.34);
  roseta.scale(1, 0.62, 1);
  poner(roseta, [0, altura + 0.02, 0], [0, 0, 0]);
  hornearFollaje(roseta, {
    base: '#8f9a7a', sol: '#c2ccb0', luz: '#dfe6cf',
    centro: [0, altura + 0.02, 0], radio: 0.2, ao: 0.4, manchas: 0.1,
  });
  partes.push(roseta);
  // flor
  const flor = new THREE.SphereGeometry(0.05, 6, 5);
  flor.translate(0, altura + 0.12, 0);
  pintarPlano(flor, '#e8c53a');
  partes.push(flor);
  return fusionarSeguro(partes, 'frailejon');
}

/* -------------------------------------------------------------------------- */
/*  Distribución biogeográfica: sembrar cada especie en SU banda de altitud     */
/* -------------------------------------------------------------------------- */

/**
 * Reparte las matas sobre la superficie del macizo, cada especie en la banda
 * climática que le toca (palma <1000 m, café 1000–2000, niebla 2000–3000,
 * frailejón 3000–4000). Evita las paredes muy empinadas y la corona nevada.
 * Devuelve, por especie, los items {pos, rotY, escala, tint} que consume el
 * InstancedMesh.
 *
 * @param {{palmera:number,cafeto:number,niebla:number,frailejon:number}} conteos
 * @param {number} [seed]
 */
export function distribuirVegetacion(conteos, seed = 707) {
  const r = rng(seed);
  const out = { palmera: [], cafeto: [], niebla: [], frailejon: [] };
  const cap = {
    palmera: conteos.palmera || 0,
    cafeto: conteos.cafeto || 0,
    niebla: conteos.niebla || 0,
    frailejon: conteos.frailejon || 0,
  };
  const total = cap.palmera + cap.cafeto + cap.niebla + cap.frailejon;
  // Escalas PEQUEÑAS a propósito: la vegetación es textura de ladera, no
  // protagonista — el macizo debe leerse como el gran landform. Un árbol ronda
  // 0.3–0.6 unidades sobre una montaña de ~9.
  const escalas = { palmera: [0.26, 0.42], cafeto: [0.22, 0.36], niebla: [0.26, 0.44], frailejon: [0.2, 0.36] };

  const lleno = () =>
    out.palmera.length >= cap.palmera &&
    out.cafeto.length >= cap.cafeto &&
    out.niebla.length >= cap.niebla &&
    out.frailejon.length >= cap.frailejon;

  let intentos = 0;
  const maxIntentos = total * 40 + 200;
  while (!lleno() && intentos < maxIntentos) {
    intentos++;
    const ang = r() * Math.PI * 2;
    // radio en el CUERPO de la montaña (ni el pico, ni el faldón raso del mar)
    const rn = 0.18 + Math.sqrt(r()) * 0.62;
    const rad = rn * R_MONTE;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    const y = alturaTerreno(x, z);
    const m = metrosDeY(y);
    if (m < 620 || m > 4000) continue; // arriba de la orilla; bajo la corona
    if (pendienteTerreno(x, z) > 0.62) continue; // no en las paredes

    let esp = null;
    if (m < 1000) esp = 'palmera';
    else if (m < 2000) esp = 'cafeto';
    else if (m < 3000) esp = 'niebla';
    else esp = 'frailejon';
    if (out[esp].length >= cap[esp]) continue;

    const [e0, e1] = escalas[esp];
    out[esp].push({
      pos: [x, y - 0.03, z],
      rotY: r() * Math.PI * 2,
      escala: e0 + r() * (e1 - e0),
      tint: [0.9 + r() * 0.18, 0.92 + r() * 0.14, 0.9 + r() * 0.16],
    });
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/*  El AGUA que baja del páramo: una quebrada que sigue el relieve real         */
/* -------------------------------------------------------------------------- */

/**
 * Traza una quebrada desde la banda de páramo (~3400 m) hasta el mar por un
 * flanco, siguiendo la altura REAL del terreno (se apoya sobre el relieve, con
 * un dedo de holgura). Es "de aquí baja el agua" hecho visible, sin cartel.
 *
 * @param {number} [azimut]  el flanco por el que baja (rad).
 * @returns {THREE.CatmullRomCurve3}
 */
export function curvaQuebrada(azimut = -0.7) {
  const pts = [];
  const n = 24;
  const yTop = yDeMetros(3400);
  const rnTop = alturaARadio(yTop);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // baja de la cota del páramo al mar; serpentea de flanco
    const rn = lerp(rnTop, 0.99, t);
    const ang = azimut + Math.sin(t * Math.PI * 2.4) * 0.28 * (1 - t * 0.5);
    const rad = rn * R_MONTE;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    const y = alturaTerreno(x, z) + 0.06;
    pts.push(new THREE.Vector3(x, y, z));
  }
  return new THREE.CatmullRomCurve3(pts);
}

/* Radio normalizado aproximado para una altura dada de la ladera (invierte el
   perfil por muestreo: barato y suficiente para colgar el nacedero del agua). */
function alturaARadio(yObjetivo) {
  let mejor = 0.5;
  let dif = Infinity;
  for (let k = 6; k <= 60; k++) {
    const rn = k / 60;
    const y = alturaTerreno(Math.cos(0) * rn * R_MONTE, Math.sin(0) * rn * R_MONTE);
    const d = Math.abs(y - yObjetivo);
    if (d < dif) {
      dif = d;
      mejor = rn;
    }
  }
  return mejor;
}

/**
 * Punto de mundo sobre la superficie del macizo para colgar un hotspot de piso:
 * a la cota media de la banda, en el azimut dado, un dedo sobre el terreno.
 *
 * @param {number} metros  altitud de la banda (m).
 * @param {number} azimut  rad.
 * @returns {[number,number,number]}
 */
export function puntoEnLadera(metros, azimut) {
  const rn = alturaARadio(yDeMetros(metros));
  const rad = rn * R_MONTE;
  const x = Math.cos(azimut) * rad;
  const z = Math.sin(azimut) * rad;
  const y = alturaTerreno(x, z);
  return [x, y, z];
}
