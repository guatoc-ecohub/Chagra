/**
 * plantas-bajas.js — builders propios (NO ez-tree) para portes no-arbóreos:
 * hierba/rastrera/groundcover, roseta de páramo (frailejón) y macolla de
 * pasto (pajonal).
 *
 * Por qué existe esto aparte de `especies-eztree.js`: ez-tree (`flora/
 * ez-tree/`) es un generador de ÁRBOLES — esqueleto de ramas recursivo +
 * corteza tubular. Forzar una fresa (rastrera diminuta, sin fuste leñoso) o
 * un frailejón (roseta basal sin ramificación) por ese pipeline produce un
 * "arbolito" con un tronquito y una bola de hojas arriba — la silueta sale
 * mal sin importar cuánto se ajusten los parámetros, porque el algoritmo
 * asume tronco+ramas y estas plantas no tienen eso. Bug real detectado en
 * gate visual 2026-08-02: la fresa salía como un bollo sobre un palito.
 *
 * Estos tres builders generan geometría plana simple con THREE puro:
 * - `crearHierbaBaja`: manojo de hojas basales al ras del suelo, en abanico
 *   desde un punto central, + fruto opcional (esfera/disco chico) para
 *   especies como fresa. Cubre también tubérculos/hortalizas bajas (papa,
 *   oca, ulluco, arracacha, quinua, arveja, cilantro, manzanilla, romero,
 *   ruda, agraz de páramo, romero de páramo) — mismo arquetipo geométrico
 *   ("matita"), solo cambia número/tamaño/color de hoja.
 * - `crearRoseta`: hojas largas y angostas irradiando desde un tronco corto
 *   grueso (frailejón) — más hojas, más rígidas, con tronco visible corto.
 * - `crearPajonal`: macolla de láminas finas y largas curvadas, sin tronco,
 *   simulando una mata de gramínea (Festuca).
 *
 * Determinismo: cada builder recibe `seed` y usa el mismo RNG
 * multiply-with-carry de `ez-tree/rng.js` (no reinventar otro generador) —
 * misma semilla + mismos parámetros = misma planta siempre.
 *
 * Todas devuelven un `THREE.Group` con `.update(t)` (no-op salvo pequeño
 * balanceo opcional) para que el mismo loop de render que llama
 * `child.update(t)` sobre `Tree` (ver `_tests/flora-eztree.html`) funcione
 * sin ramificar el caller por tipo de objeto.
 */
import * as THREE from 'three';
import RNG from './ez-tree/rng.js';

/**
 * @typedef {Object} HojaBajaOpts
 * @property {number} seed
 * @property {number} [count=8] número de hojas basales
 * @property {number} [size=0.14] largo de hoja (m)
 * @property {number} [sizeVariance=0.4]
 * @property {number} [tint=0x5a9a3f] color de hoja
 * @property {number} [alturaTallo=0.03] altura del punto de nacimiento (m) — hierbas casi 0
 * @property {boolean} [conFruto=false]
 * @property {number} [colorFruto=0xd23a4a]
 * @property {number} [tamanoFruto=0.03]
 * @property {number} [anguloHoja=55] inclinación de la hoja respecto al suelo (grados) — bajo = más plana/rastrera
 */

const _tmpQuat = new THREE.Quaternion();
const _tmpEuler = new THREE.Euler();

/**
 * Geometría de una sola "hoja" — plano alargado tipo lanceolada, más ancho
 * en la base, apuntado en la punta. Usa dos triángulos con una leve
 * curvatura (2 segmentos) para que no se vea perfectamente plano de canto.
 * @param {number} largo
 * @param {number} anchoBase
 */
function geometriaHoja(largo, anchoBase) {
  const geo = new THREE.PlaneGeometry(anchoBase, largo, 1, 2);
  geo.translate(0, largo / 2, 0); // pivote en la base, crece en +Y
  // leve combado hacia arriba en la punta (curvatura natural de hoja)
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = largo > 0 ? y / largo : 0;
    pos.setZ(i, pos.getZ(i) + t * t * largo * 0.12);
  }
  geo.computeVertexNormals();
  return geo;
}

function materialHoja(tint) {
  return new THREE.MeshStandardMaterial({
    color: tint,
    side: THREE.DoubleSide,
    roughness: 0.85,
    metalness: 0,
    flatShading: false,
  });
}

/**
 * Manojo de hojas basales / matita rastrera. Sirve para fresa y toda la
 * familia de hierbas/tubérculos de porte bajo del catálogo (papa, oca,
 * ulluco, arracacha, quinua, arveja, cilantro, manzanilla, romero, ruda,
 * agraz de páramo, romero de páramo).
 * @param {HojaBajaOpts} opts
 * @returns {THREE.Group}
 */
export function crearHierbaBaja(opts = {}) {
  const {
    seed = 1,
    count = 8,
    size = 0.14,
    sizeVariance = 0.4,
    tint = 0x5a9a3f,
    alturaTallo = 0.03,
    conFruto = false,
    colorFruto = 0xd23a4a,
    tamanoFruto = 0.03,
    anguloHoja = 55, // grados desde el plano del suelo: 90=vertical, 0=rastrera pegada al piso
  } = opts;

  const rng = new RNG(seed);
  const grupo = new THREE.Group();
  grupo.name = 'HierbaBaja';

  const geoBase = geometriaHoja(1, 0.42); // se escala por hoja
  const mat = materialHoja(tint);
  const mesh = new THREE.InstancedMesh(geoBase, mat, count);
  mesh.castShadow = false;
  mesh.receiveShadow = true;

  const anguloRad = THREE.MathUtils.degToRad(anguloHoja);
  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const yaw = (i / count) * Math.PI * 2 + rng.random() * 0.5;
    const largo = size * (1 - sizeVariance / 2 + rng.random() * sizeVariance);
    const inclinacion = anguloRad * (0.75 + rng.random() * 0.4); // jitter de ángulo hoja a hoja

    // Rotar: primero inclinar desde el suelo (eje X local), luego girar en yaw (eje Y mundo)
    _tmpEuler.set(-(Math.PI / 2 - inclinacion), 0, 0);
    const qInclinar = new THREE.Quaternion().setFromEuler(_tmpEuler);
    const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    _tmpQuat.copy(qYaw).multiply(qInclinar);

    pos.set(0, alturaTallo, 0);
    scl.set(largo * 0.85, largo, 1);

    m.compose(pos, _tmpQuat, scl);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  grupo.add(mesh);

  if (conFruto) {
    const fruta = new THREE.Mesh(
      new THREE.SphereGeometry(tamanoFruto, 8, 6),
      new THREE.MeshStandardMaterial({ color: colorFruto, roughness: 0.5, metalness: 0 }),
    );
    // asoma entre las hojas, cerca del suelo, desplazada del centro
    const ang = rng.random() * Math.PI * 2;
    const r = size * 0.35;
    fruta.position.set(Math.cos(ang) * r, alturaTallo + tamanoFruto * 0.8, Math.sin(ang) * r);
    fruta.castShadow = false;
    grupo.add(fruta);
  }

  grupo.update = () => {}; // sin animación de viento propia — son demasiado bajas para leerse
  return grupo;
}

/**
 * Roseta de páramo (frailejón): tronco corto y grueso + corona de hojas
 * largas, angostas y RÍGIDAS irradiando desde la punta — más parecidas a una
 * corona vegetal que a una copa de árbol. Sin ramificación real: todas las
 * hojas nacen del mismo punto.
 * @param {Object} opts
 * @param {number} opts.seed
 * @param {number} [opts.alturaTronco=0.9] alto del tronco corto (m)
 * @param {number} [opts.radioTronco=0.09]
 * @param {number} [opts.count=22] número de hojas de la corona
 * @param {number} [opts.size=0.5] largo de hoja
 * @param {number} [opts.sizeVariance=0.35]
 * @param {number} [opts.tintHoja=0xb8c090]
 * @param {number} [opts.tintTronco=0xd8cfa8]
 * @returns {THREE.Group}
 */
export function crearRoseta(opts = {}) {
  const {
    seed = 1,
    alturaTronco = 0.9,
    radioTronco = 0.09,
    count = 22,
    size = 0.5,
    sizeVariance = 0.35,
    tintHoja = 0xb8c090,
    tintTronco = 0xd8cfa8,
  } = opts;

  const rng = new RNG(seed);
  const grupo = new THREE.Group();
  grupo.name = 'Roseta';

  // Tronco corto y grueso — cilindro simple, sin ramificación (fiel al hábito
  // real de Espeletia: tallo único no ramificado cubierto de hojas muertas).
  const tronco = new THREE.Mesh(
    new THREE.CylinderGeometry(radioTronco * 0.75, radioTronco, alturaTronco, 8),
    new THREE.MeshStandardMaterial({ color: tintTronco, roughness: 0.95, metalness: 0 }),
  );
  tronco.position.y = alturaTronco / 2;
  grupo.add(tronco);

  // Corona: hojas rígidas, MÁS erguidas en el centro (ángulo alto) y más
  // abiertas hacia afuera en el borde exterior — así se lee la roseta densa
  // característica en vez de un penacho disperso.
  const geoBase = geometriaHoja(1, 0.16); // hoja angosta, lanceolada
  const mat = materialHoja(tintHoja);
  const mesh = new THREE.InstancedMesh(geoBase, mat, count);
  mesh.receiveShadow = true;

  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const yaw = (i / count) * Math.PI * 2 + rng.random() * 0.3;
    const largo = size * (1 - sizeVariance / 2 + rng.random() * sizeVariance);
    // hojas exteriores más abiertas (más horizontales) que las centrales —
    // da la silueta de "corona abierta" del frailejón real
    const aperturaGrados = 35 + rng.random() * 30;
    const inclinacion = THREE.MathUtils.degToRad(90 - aperturaGrados);

    _tmpEuler.set(-(Math.PI / 2 - inclinacion), 0, 0);
    const qInclinar = new THREE.Quaternion().setFromEuler(_tmpEuler);
    const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    _tmpQuat.copy(qYaw).multiply(qInclinar);

    pos.set(0, alturaTronco * 0.97, 0);
    scl.set(largo * 0.5, largo, 1);

    m.compose(pos, _tmpQuat, scl);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  grupo.add(mesh);

  grupo.update = () => {};
  return grupo;
}

/**
 * Macolla de pasto / pajonal de páramo: sin tronco, penacho denso de
 * láminas finas, largas y curvadas naciendo todas al ras del suelo —
 * silueta de mata de gramínea (Festuca / Calamagrostis), NO árbol.
 * @param {Object} opts
 * @param {number} opts.seed
 * @param {number} [opts.count=30] número de briznas
 * @param {number} [opts.size=0.35] largo de brizna
 * @param {number} [opts.sizeVariance=0.4]
 * @param {number} [opts.tint=0xb8a850]
 * @param {number} [opts.radioMata=0.12] radio de dispersión de las briznas en la base
 * @returns {THREE.Group}
 */
export function crearPajonal(opts = {}) {
  const {
    seed = 1,
    count = 30,
    size = 0.35,
    sizeVariance = 0.4,
    tint = 0xb8a850,
    radioMata = 0.12,
  } = opts;

  const rng = new RNG(seed);
  const grupo = new THREE.Group();
  grupo.name = 'Pajonal';

  // Briznas MUY angostas, curvadas (la curvatura ya la aporta geometriaHoja)
  // y con arco pronunciado hacia afuera — imitan el arqueo típico de una
  // macolla de gramínea de páramo.
  const geoBase = geometriaHoja(1, 0.035);
  const mat = materialHoja(tint);
  const mesh = new THREE.InstancedMesh(geoBase, mat, count);
  mesh.receiveShadow = true;

  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const yaw = rng.random() * Math.PI * 2;
    const largo = size * (1 - sizeVariance / 2 + rng.random() * sizeVariance);
    // arco amplio: briznas bien arqueadas hacia afuera, típico de macolla
    const inclinacion = THREE.MathUtils.degToRad(30 + rng.random() * 35);
    // dispersión pequeña en la base para que no nazcan todas del mismo punto exacto
    const rBase = rng.random() * radioMata;
    const angBase = rng.random() * Math.PI * 2;

    _tmpEuler.set(-(Math.PI / 2 - inclinacion), 0, 0);
    const qInclinar = new THREE.Quaternion().setFromEuler(_tmpEuler);
    const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    _tmpQuat.copy(qYaw).multiply(qInclinar);

    pos.set(Math.cos(angBase) * rBase, 0.01, Math.sin(angBase) * rBase);
    scl.set(largo * 0.35, largo, 1);

    m.compose(pos, _tmpQuat, scl);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  grupo.add(mesh);

  grupo.update = () => {};
  return grupo;
}
