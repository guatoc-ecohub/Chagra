/*
 * floraCacao.geom — la GEOMETRÍA del CACAOTAL BAJO SOMBRA (piso cálido).
 *
 * El cacao es el cultivo de paz de la tierra caliente y aquí se cuenta como es
 * de verdad en la vega: un plano caliente y húmedo sembrado a distancia pareja,
 * con los árboles de cacao ABAJO y el SOMBRÍO arriba — guamos que le hacen
 * techo de hojas y el plátano que acompaña casi todo cacaotal campesino. Cada
 * especie con su identidad inequívoca:
 *
 *   · Cacao (Theobroma cacao)  — árbol bajito de HORQUETA: el tronco se abre en
 *                                ramas gruesas a la altura del pecho, copa ancha
 *                                de hoja grande y el brote nuevo COBRIZO.
 *   · Mazorca de cacao         — el fruto, INSTANCIADO APARTE con color por
 *                                instancia: verde → amarillo → rojo-marrón. Y
 *                                nace del TRONCO y de las ramas gruesas
 *                                (caulifloria — la firma del cacao).
 *   · Guamo (Inga)             — el sombrío clásico: tronco que se bifurca y
 *                                copa ANCHA y plana, un parasol alto.
 *   · Plátano intercalado      — pseudotallo claro y hojas enormes arqueadas.
 *   · Tronco caído + hojarasca — el mantillo grueso que el cacaotal deja en el
 *                                suelo (la hoja del cacao no se barre: abona).
 *
 * TÉCNICA tier-safe (mismo contrato que floraCafetal.geom): cada especie se
 * FUSIONA en UNA geometría con color horneado en vertexColors y se dibuja con
 * UN InstancedMesh → una draw-call por especie. La MAZORCA se pinta BLANCA en
 * la geometría para que el color POR INSTANCIA (setColorAt) sea el color real
 * del fruto — así el mismo InstancedMesh lleva mazorcas verdes, amarillas y
 * rojas-marrón.
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

/* -------------------------------------------------------------------------- */
/*  La vega cacaotera (la geografía del mundo, determinista)                   */
/* -------------------------------------------------------------------------- */

export const ANCHO = 40; // x: -20 … 20
export const FONDO = 34; // z: -17 (el fondo, la lomita) … 17 (el frente)

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/* Ruido determinista (hash de senos): misma vega siempre, sin Math.random. */
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.8 + wz * 0.6) * 0.5 +
    Math.sin(wx * 1.9 - wz * 1.4 + 2.3) * 0.3 +
    Math.sin(wx * 3.1 + wz * 2.7 + 5.1) * 0.2
  );
}

/**
 * La altura de la vega en un punto: casi plana (el cacao es de tierra baja),
 * con una lomita suave al fondo donde vive la casa y ondulación natural.
 */
export function alturaVega(wx, wz) {
  const sub = smoothstep(2, -15, wz); // 0 al frente, 1 a la lomita del fondo
  let h = 0.1;
  h += sub * 1.7; // la vega apenas se levanta hacia atrás
  h += ruido(wx * 0.45, wz * 0.45) * 0.28 * (0.5 + sub * 0.5); // ondulación
  return h;
}

/* -------------------------------------------------------------------------- */
/*  Presupuesto por tier                                                       */
/* -------------------------------------------------------------------------- */

/*
 * Instancias por especie. 'alto' puebla el cacaotal pleno; 'medio' es frugal;
 * 'bajo' deja lo mínimo para que AÚN se lea "cacaotal con sombrío". La mazorca
 * es el conteo del InstancedMesh de frutos (colgados del tronco y las ramas de
 * las matas cargadas).
 */
export const FLORA_CACAO = {
  alto: { cacao: 90, mazorca: 300, guamo: 6, platano: 8, tronco: 3, hojarasca: 18, piedra: 4 },
  medio: { cacao: 55, mazorca: 170, guamo: 4, platano: 5, tronco: 2, hojarasca: 10, piedra: 3 },
  bajo: { cacao: 24, mazorca: 70, guamo: 2, platano: 3, tronco: 1, hojarasca: 5, piedra: 2 },
};

/** Conteos para un tier (desconocido → frugal, nunca el más caro). */
export const cacaotalDeTier = (tier) => FLORA_CACAO[tier] || FLORA_CACAO.medio;

/** Factor de detalle geométrico por tier (menos blobs/hojas en gama baja). */
export const CALIDAD_CACAO = { alto: 1, medio: 0.62, bajo: 0.42 };
export const calidadCacao = (tier) => CALIDAD_CACAO[tier] ?? CALIDAD_CACAO.medio;

/* -------------------------------------------------------------------------- */
/*  Paleta del cacaotal (colores horneados en vertexColors)                    */
/* -------------------------------------------------------------------------- */

export const PAL = {
  // Cacao
  cacaoTronco: '#54402c', // corteza parda del tronco y la horqueta
  cacaoHoja: '#33642f', // hoja grande verde oscura
  cacaoHojaSol: '#4f8340', // la cara de la copa que da al sol
  cacaoBrote: '#b06a3f', // el brote nuevo COBRIZO (la hoja tierna del cacao)

  // Los tres estados de la mazorca (van POR INSTANCIA, no aquí; referencia):
  mazorcaVerde: '#6da03f',
  mazorcaAmarilla: '#dcae3a',
  mazorcaRoja: '#9c4523', // rojo-marrón de mazorca madura

  // Guamo (Inga) — el parasol del sombrío
  guamoTronco: '#6b533a',
  guamoCopa: '#4a7c38',
  guamoCopaSol: '#68984a',

  // Plátano intercalado
  platanoTallo: '#a8b06c',
  platanoHoja: '#579440',
  platanoHojaSol: '#77ac4e',
  platanoHojaSeca: '#a5924c',

  // Suelo de tierra caliente
  hojarasca: '#8a6a3e',
  hojarasca2: '#6f5530',
  troncoCaido: '#6f5138',
  musgo: '#7a8a4a',
  piedra: '#8b8578',
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

/** Orienta el +Y de la geometría hacia `dir` y la ubica en `pos` (ramas/hojas). */
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
    throw new Error('floraCacao: mergeGeometries devolvió null — atributos incompatibles entre partes');
  }
  return g;
}

/** Pequeña variación determinista de color (que el cacaotal no sea plano). */
function variar(base, r, amt = 0.06) {
  const c = new THREE.Color(base);
  c.multiplyScalar(1 + (r() - 0.5) * amt * 2);
  return c;
}

/* -------------------------------------------------------------------------- */
/*  CACAO (Theobroma cacao) — el cultivo                                       */
/* -------------------------------------------------------------------------- */

/*
 * El porte del cacao es inconfundible: un tronco corto que a la altura del
 * pecho se abre en HORQUETA — 3-4 ramas gruesas que suben abiertas — y encima
 * una copa ancha y baja de hoja GRANDE, con el brote nuevo cobrizo asomando.
 * Las MAZORCAS no van aquí: son un InstancedMesh aparte con color por
 * instancia, colgadas del tronco y las ramas (caulifloria).
 */
export function geomCacao({ q = 1 } = {}, seed = 1) {
  const r = rng(seed);
  const partes = [];

  // El tronco corto (con AIRE debajo de la copa: ahí cuelga la mazorca).
  const tronco = new THREE.CylinderGeometry(0.06, 0.095, 1.5, 6, 1);
  poner(tronco, [0, 0.75, 0]);
  partes.push(pintar(tronco, PAL.cacaoTronco));

  // La HORQUETA: las ramas gruesas que se abren a la altura del pecho.
  const nRamas = q < 0.5 ? 3 : 4;
  const dirRamas = [];
  for (let i = 0; i < nRamas; i++) {
    const a = (i / nRamas) * Math.PI * 2 + r() * 0.8;
    const abierta = 0.75 + r() * 0.35; // qué tan abierta sube la rama
    const dir = [Math.cos(a) * abierta, 1, Math.sin(a) * abierta];
    dirRamas.push({ a, abierta });
    const rama = new THREE.CylinderGeometry(0.028, 0.05, 1.05, 5, 1);
    apuntar(rama, [Math.cos(a) * 0.32, 1.8, Math.sin(a) * 0.32], dir);
    partes.push(pintar(rama, PAL.cacaoTronco));
  }

  // La copa ancha de hoja grande, una masa por rama + el centro — recogida
  // (que entre ella y el suelo quede el aire donde se ve la caulifloria).
  const nMasas = Math.max(3, Math.round((nRamas + 1) * Math.min(1, q + 0.25)));
  for (let i = 0; i < nMasas; i++) {
    const centro = i === 0;
    const d = dirRamas[(i - 1 + dirRamas.length) % dirRamas.length];
    const rad = centro ? 0 : 0.56 + r() * 0.22;
    const masa = new THREE.IcosahedronGeometry(centro ? 0.56 : 0.44 + r() * 0.14, 1);
    poner(
      masa,
      [Math.cos(d.a) * rad, (centro ? 2.5 : 2.28) + (r() - 0.5) * 0.22, Math.sin(d.a) * rad],
      [0, r() * Math.PI, 0],
      [1.42, 0.62, 1.42],
    );
    partes.push(pintar(masa, variar(i % 2 ? PAL.cacaoHojaSol : PAL.cacaoHoja, r, 0.05)));
  }

  // El brote nuevo COBRIZO: la hoja tierna del cacao asoma rojiza, discreta y
  // ANIDADA al borde de la copa (que no parezca fruto en las ramitas: la
  // mazorca va en el tronco, y este mundo no puede contradecirse).
  const brote = new THREE.IcosahedronGeometry(0.11, 0);
  const ab = r() * Math.PI * 2;
  poner(brote, [Math.cos(ab) * 0.68, 2.42, Math.sin(ab) * 0.68], [0, r() * Math.PI, 0], [1.1, 0.6, 1.1]);
  partes.push(pintar(brote, variar(PAL.cacaoBrote, r, 0.08)));

  return fusionar(partes);
}

/**
 * La MAZORCA del cacao: una vaina alargada y panzona que cuelga pegada del
 * tronco. Se pinta BLANCA — el color real (verde → amarillo → rojo-marrón) va
 * POR INSTANCIA.
 */
export function geomMazorca() {
  const g = new THREE.SphereGeometry(0.115, 7, 6);
  poner(g, [0, 0, 0], [0, 0, 0], [0.72, 1.5, 0.72]); // alargada, panzona
  return pintar(g.index ? g.toNonIndexed() : g, '#ffffff');
}

/* -------------------------------------------------------------------------- */
/*  GUAMO (Inga) — el parasol del sombrío                                      */
/* -------------------------------------------------------------------------- */

export function geomGuamo({ q = 1 } = {}, seed = 2) {
  const r = rng(seed);
  const partes = [];

  // Tronco alto que se abre en ramas maestras (más alto que en el cafetal:
  // en tierra caliente el sombrío del cacao tiende techo bien arriba, un piso
  // entero por encima del dosel del cultivo).
  const tronco = new THREE.CylinderGeometry(0.15, 0.26, 4.4, 7, 1);
  poner(tronco, [0, 2.2, 0]);
  partes.push(pintar(tronco, PAL.guamoTronco));
  const nRamas = Math.max(2, Math.round(3 * q));
  for (let i = 0; i < nRamas; i++) {
    const a = (i / nRamas) * Math.PI * 2 + r();
    const rama = new THREE.CylinderGeometry(0.05, 0.1, 1.6, 5, 1);
    apuntar(rama, [Math.cos(a) * 0.6, 4.7, Math.sin(a) * 0.6], [Math.cos(a) * 0.9, 1, Math.sin(a) * 0.9]);
    partes.push(pintar(rama, PAL.guamoTronco));
  }

  // La copa ANCHA y plana: el techo de hojas sobre el cacaotal.
  const nMasas = Math.max(3, Math.round(5 * q));
  for (let i = 0; i < nMasas; i++) {
    const a = (i / nMasas) * Math.PI * 2 + 0.7;
    const rad = i === 0 ? 0 : 1.15 + r() * 0.45;
    const masa = new THREE.IcosahedronGeometry(i === 0 ? 1.35 : 1.0 + r() * 0.28, 1);
    poner(
      masa,
      [Math.cos(a) * rad, 5.35 + (r() - 0.5) * 0.4, Math.sin(a) * rad],
      [0, r() * Math.PI, 0],
      [1.8, 0.72, 1.8],
    );
    partes.push(pintar(masa, variar(i % 2 ? PAL.guamoCopaSol : PAL.guamoCopa, r, 0.06)));
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  PLÁTANO intercalado — el hermano de sombra del cacao joven                 */
/* -------------------------------------------------------------------------- */

export function geomPlatano({ q = 1 } = {}, seed = 4) {
  const r = rng(seed);
  const partes = [];

  // Pseudotallo claro (en tierra caliente el plátano se da grande y asoma
  // POR ENCIMA del dosel del cacao).
  const tallo = new THREE.CylinderGeometry(0.1, 0.17, 3.1, 6, 1);
  poner(tallo, [0, 1.55, 0]);
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
      [Math.cos(a) * 0.55, 3.15, Math.sin(a) * 0.55],
      [Math.cos(a), 1 - caida, Math.sin(a)],
      [0.16, 1.0, 0.36],
    );
    partes.push(pintar(hoja, variar(seca ? PAL.platanoHojaSeca : i % 2 ? PAL.platanoHojaSol : PAL.platanoHoja, r, 0.05)));
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  Suelo: tronco caído, hojarasca y piedra                                    */
/* -------------------------------------------------------------------------- */

/** Un tronco caído con su musgo: la madera que se queda abonando la vega. */
export function geomTroncoCaido(seed = 7) {
  const r = rng(seed);
  const partes = [];
  const palo = new THREE.CylinderGeometry(0.13, 0.17, 1.9, 6, 1);
  poner(palo, [0, 0.15, 0], [0, 0, Math.PI / 2 + (r() - 0.5) * 0.2]);
  partes.push(pintar(palo, PAL.troncoCaido));
  const capa = new THREE.IcosahedronGeometry(0.16, 0);
  poner(capa, [0.35, 0.27, 0.02], [0, r() * Math.PI, 0], [1.4, 0.5, 1]);
  partes.push(pintar(capa, PAL.musgo));
  return fusionar(partes);
}

export function geomHojarasca(seed = 5) {
  const r = rng(seed);
  const partes = [];
  for (let i = 0; i < 3; i++) {
    const mancha = new THREE.CylinderGeometry(0.36 + r() * 0.32, 0.46 + r() * 0.34, 0.035, 7, 1);
    poner(mancha, [(r() - 0.5) * 0.55, 0.02 + i * 0.012, (r() - 0.5) * 0.55], [0, r() * Math.PI, 0]);
    partes.push(pintar(mancha, i % 2 ? PAL.hojarasca2 : PAL.hojarasca));
  }
  return fusionar(partes);
}

export function geomPiedra(seed = 6) {
  const r = rng(seed);
  const roca = new THREE.DodecahedronGeometry(0.3, 0);
  poner(roca, [0, 0.13, 0], [r() * 0.6, r() * Math.PI, r() * 0.6], [1.25, 0.7, 1]);
  const capa = new THREE.DodecahedronGeometry(0.17, 0);
  poner(capa, [0.11, 0.22, 0.05], [0, r() * Math.PI, 0], [1, 0.55, 1]);
  return fusionar([pintar(roca, PAL.piedra), pintar(capa, PAL.musgo)]);
}

/* -------------------------------------------------------------------------- */
/*  Distribución: siembra a distancia pareja + sombrío disperso                */
/* -------------------------------------------------------------------------- */

/* El sombrío vive FIJO en la vega (posiciones compuestas a mano para que el
   techo de sombra cubra el cultivo sin taparlo todo). Se recortan por tier. */
const SITIOS_GUAMO = [
  [-7.5, -4.5], [3.5, -8.0], [10.5, -3.0], [-13.0, -9.5], [-1.5, -1.0], [7.0, -12.0],
];
const SITIOS_PLATANO = [
  [-11.0, -2.0], [5.5, -4.5], [-4.0, -10.5], [13.5, -8.5], [-15.5, -6.0], [9.5, 0.5], [-8.0, -13.0], [1.5, 2.8],
];
const SITIOS_TRONCO = [
  [-5.5, 3.5], [8.5, -6.5], [-12.0, -12.5],
];

/* La casa con el cajón de fermentar y la pasera vive en la lomita del fondo. */
export const SITIO_CASA = /** @type {[number, number]} */ ([11.5, -13.0]);

/** ¿Qué tan madura pinta la mazorca en esta mata? Varía mata a mata. */
function madurezEn(wx, wz, r) {
  const base = 0.5 + 0.5 * ruido(wx * 0.35 + 9, wz * 0.35 + 4); // parches de cosecha
  return clamp(base * 0.85 + (r() - 0.5) * 0.4, 0, 1);
}

/**
 * Siembra determinista del cacaotal completo. Devuelve items por especie:
 * `{pos, rotY, escala, tint}` (contrato del componente `Especie`), y para la
 * mazorca el `tint` ES el color del fruto (verde → amarillo → rojo-marrón por
 * instancia). Las mazorcas van PEGADAS del tronco de su mata (caulifloria).
 */
export function distribucionCacaotal(conteos, seed = 417) {
  const c = conteos;
  const rCac = rng(seed + 1);
  const rMaz = rng(seed + 2);
  const rSue = rng(seed + 3);

  // --- La siembra a distancia pareja (el cacao se planta a 3x3, tresbolillo).
  //     ABIERTA: entre copa y copa queda aire — se ve el tronco y su mazorca. ---
  const sitios = [];
  const filasZ = [4.2, 2.0, -0.2, -2.4, -4.6, -6.8, -9.0, -11.2, -13.2];
  filasZ.forEach((z0, fila) => {
    const corrimiento = fila % 2 ? 1.15 : 0; // tresbolillo
    for (let wx = -17; wx <= 17; wx += 2.3) {
      const px = wx + corrimiento + (rCac() - 0.5) * 0.6;
      const pz = z0 + (rCac() - 0.5) * 0.55;
      // respetar el patio de la casa y su secadero
      const dx = px - SITIO_CASA[0];
      const dz = pz - SITIO_CASA[1];
      if (dx * dx + dz * dz < 20) continue;
      sitios.push({
        px, pz,
        esc: 0.82 + rCac() * 0.42,
        rotY: rCac() * Math.PI * 2,
        maduro: madurezEn(px, pz, rCac),
        carga: rCac(), // qué tan cargada de mazorca está la mata
      });
    }
  });
  // recorte determinista al presupuesto del tier (salto parejo, no los primeros N)
  const paso = Math.max(1, Math.floor(sitios.length / Math.max(1, c.cacao)));
  const matas = [];
  for (let i = 0; i < sitios.length && matas.length < c.cacao; i += paso) matas.push(sitios[i]);

  const cacao = matas.map((s) => ({
    pos: [s.px, alturaVega(s.px, s.pz), s.pz],
    rotY: s.rotY,
    escala: s.esc,
    tint: [0.92 + rCac() * 0.16, 0.92 + rCac() * 0.16, 0.92 + rCac() * 0.16],
  }));

  // --- Las mazorcas: PEGADAS del tronco y las ramas bajas (caulifloria). ---
  const verde = new THREE.Color(PAL.mazorcaVerde);
  const amarilla = new THREE.Color(PAL.mazorcaAmarilla);
  const roja = new THREE.Color(PAL.mazorcaRoja);
  const col = new THREE.Color();
  const mazorca = [];
  const cargadas = matas.filter((s) => s.carga > 0.25);
  let gi = 0;
  while (mazorca.length < c.mazorca && cargadas.length > 0) {
    const s = cargadas[gi % cargadas.length];
    gi += 1;
    if (gi > cargadas.length * 9) break;
    const baseY = alturaVega(s.px, s.pz);
    const cuantas = 2 + Math.floor(rMaz() * 3);
    for (let k = 0; k < cuantas && mazorca.length < c.mazorca; k++) {
      const a = rMaz() * Math.PI * 2;
      const enRama = rMaz() > 0.78; // unas pocas suben a la horqueta
      // pegada del tronco: radio apenas mayor que la corteza
      const rad = (enRama ? 0.32 + rMaz() * 0.18 : 0.13 + rMaz() * 0.035) * s.esc;
      const y = (enRama ? 1.5 + rMaz() * 0.35 : 0.35 + rMaz() * 1.0) * s.esc;
      // el estado del fruto: la madurez de la mata + su propio azar
      const m = clamp(s.maduro + (rMaz() - 0.5) * 0.5, 0, 1);
      if (m < 0.5) col.lerpColors(verde, amarilla, m * 2);
      else col.lerpColors(amarilla, roja, (m - 0.5) * 2);
      col.multiplyScalar(0.92 + rMaz() * 0.16);
      mazorca.push({
        pos: [s.px + Math.cos(a) * rad, baseY + y, s.pz + Math.sin(a) * rad],
        rotY: rMaz() * Math.PI,
        escala: (0.8 + rMaz() * 0.5) * s.esc,
        tint: [col.r, col.g, col.b],
      });
    }
  }

  // --- El sombrío y el plátano (sitios fijos recortados por tier). ---
  const enVega = (p, esc, rr) => ({
    pos: [p[0], alturaVega(p[0], p[1]), p[1]],
    rotY: rr() * Math.PI * 2,
    escala: esc,
    tint: [0.94 + rr() * 0.12, 0.94 + rr() * 0.12, 0.94 + rr() * 0.12],
  });
  const rArb = rng(seed + 4);
  const guamo = SITIOS_GUAMO.slice(0, c.guamo).map((p) => enVega(p, 0.95 + rArb() * 0.35, rArb));
  const platano = SITIOS_PLATANO.slice(0, c.platano).map((p) => enVega(p, 0.85 + rArb() * 0.3, rArb));
  const tronco = SITIOS_TRONCO.slice(0, c.tronco).map((p) => enVega(p, 0.85 + rArb() * 0.4, rArb));

  // --- El suelo: hojarasca gruesa por todo el cacaotal, piedras sueltas. ---
  const hojarasca = [];
  for (let i = 0; i < c.hojarasca; i++) {
    const x = -16 + rSue() * 32;
    const z = -13 + rSue() * 27;
    hojarasca.push({
      pos: [x, alturaVega(x, z) + 0.01, z],
      rotY: rSue() * Math.PI * 2,
      escala: 0.85 + rSue() * 0.75,
      tint: [0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16],
    });
  }
  const piedra = [];
  for (let i = 0; i < c.piedra; i++) {
    const x = -17 + rSue() * 34;
    const z = -13 + rSue() * 27;
    piedra.push({
      pos: [x, alturaVega(x, z), z],
      rotY: rSue() * Math.PI * 2,
      escala: 0.7 + rSue() * 0.9,
      tint: [0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16],
    });
  }

  return { cacao, mazorca, guamo, platano, tronco, hojarasca, piedra };
}

/** Los centros del sombrío del tier (para la luz colada bajo las copas). */
export function centrosSombrio(conteos) {
  return SITIOS_GUAMO.slice(0, conteos.guamo).map(
    ([x, z]) => /** @type {[number, number, number]} */ ([x, alturaVega(x, z), z]),
  );
}
