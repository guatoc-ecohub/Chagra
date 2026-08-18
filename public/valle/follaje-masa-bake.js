// ── follaje-masa-bake.js ─────────────────────────────────────────────────────
// HORNEADO de las piezas de follaje-MASA (lib3d/flora) a geometría fusionada,
// para INSTANCIARLAS en el valle (mismo patrón que flora-eztree-bake.js: se
// hornea UNA vez por arquetipo y se instancia → draw-call-neutral, sin reventar
// el presupuesto). Las piezas fuente YA pasaron gate Humboldt; esto solo las
// aplana para poder meterlas en un InstancedMesh conservando el scatter existente.
//
//  · frailejonFabrica.buildFrailejon → roseta caulescente Espeletia (gate 8/10),
//    reemplaza el cono de 6 caras. Se aplana el nivel LOD "detail" a DOS geos
//    fusionadas por material (necromasa marrón del tronco+falda / roseta plateada).
//  · FollajeMasa.crearCopaMasa → copa de MASA densa (núcleo + cards texturizados),
//    reemplaza los icosaedros/conos low-poly del pajonal, sietecueros, romero,
//    matorral. Se aplanan las DOS mallas (núcleo / cards) a geos fusionadas.
import * as THREE from 'three';
import { crearCopaMasa } from './lib3d/flora/FollajeMasa.js';
import { buildFrailejon } from './lib3d/flora/frailejonFabrica.js';

// Aplana un Object3D (Group/Mesh con transformaciones locales) a UNA geometría
// no-indexada en espacio local del objeto, aplicando la matriz de cada malla y
// preservando las normales (transformadas por la matriz, NO recalculadas → nada
// de facetas planas). El COLOR de cada material se hornea como color-por-vértice,
// para que UNA sola malla instanciada con `vertexColors:true` conserve el look
// del arquetipo (roseta plateada + falda de necromasa marrón + tronco) TODO junto
// = masa densa sin gaps, sin bug de separar materiales por umbral de hex.
function flattenGeo(root, keep) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const geos = [];
  const tmpC = new THREE.Color();
  root.traverse((o) => {
    if (!o.isMesh || (keep && !keep(o))) return;
    const rel = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone());
    g.applyMatrix4(rel);                       // transforma posición Y normal
    const cnt = g.attributes.position.count;
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', g.attributes.position.clone());
    if (g.attributes.normal) out.setAttribute('normal', g.attributes.normal.clone());
    else { g.computeVertexNormals(); out.setAttribute('normal', g.attributes.normal.clone()); }
    // color del material (color base + un toque del emissive plateado) por vértice
    tmpC.copy(o.material.color || { r: 1, g: 1, b: 1 });
    if (o.material.emissive) tmpC.lerp(o.material.emissive, (o.material.emissiveIntensity ?? 0) * 2.2);
    const col = new Float32Array(cnt * 3);
    for (let i = 0; i < cnt; i++) { col[i * 3] = tmpC.r; col[i * 3 + 1] = tmpC.g; col[i * 3 + 2] = tmpC.b; }
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geos.push(out);
    g.dispose();
  });
  return concatPNC(geos);
}

// concat no-indexado position+normal+color (todas homogéneas): cero null silencioso.
function concatPNC(geos) {
  let count = 0;
  for (const g of geos) count += g.attributes.position.count;
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), col = new Float32Array(count * 3);
  let off = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, off);
    nor.set(g.attributes.normal.array, off);
    col.set(g.attributes.color.array, off);
    off += g.attributes.position.array.length;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

// ── FRAILEJÓN ────────────────────────────────────────────────────────────────
// Hornea el nivel LOD "detail" de buildFrailejon a DOS geos fusionadas + sus
// materiales (necromasa del tronco/falda, roseta plateada de palas lanceoladas).
// La roseta es MASA de hojas — NO un cono de 6 caras.  Devuelve alturaNatural
// medida (Box3) para escalar el InstancedMesh a metros reales, como el ez-tree.
export function bakearFrailejon(esp = 'grandiflora', seed = 7) {
  // Se hornea el frailejón COMPLETO (tronco + necromasa/falda + roseta + flor) en
  // UNA sola geometría con color-por-vértice → UN material `vertexColors`. La
  // falda de necromasa da CUERPO alrededor del tronco; la roseta plateada corona.
  // Todo junto = masa densa, NO se separan materiales (evita el bug del umbral de
  // hex y los gaps de una roseta suelta). Para densificar y romper la simetría se
  // fusionan DOS individuos con seeds distintos, ligeramente girados.
  const lodA = buildFrailejon(esp, seed);
  const lodB = buildFrailejon(esp, seed ^ 0x5bd1e995);
  const detA = lodA.levels[0].object;
  const detB = lodB.levels[0].object;
  detB.rotation.y = 0.7;                        // girar el 2º para tapar los huecos entre palas
  detB.updateMatrixWorld(true);
  const geoA = flattenGeo(detA);
  const geoB = flattenGeo(detB);
  const geo = concatPNC([geoA, geoB]);           // masa doble densa (una geo)

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.84, metalness: 0.02, flatShading: true, side: THREE.DoubleSide,
  });

  const box = new THREE.Box3().setFromObject(detA);
  const alturaNatural = Math.max(0.001, box.max.y - box.min.y);
  return { geo, mat, alturaNatural };
}

// ── COPA DE MASA (pajonal / sietecueros / romero / matorral) ──────────────────
// Hornea crearCopaMasa a DOS geos fusionadas (núcleo + cards) + sus materiales.
// `esferas` define la silueta; `gradiente`/tono la especie. El resultado es masa
// densa de cards texturizados — NO facetas contables.  alturaNatural medida.
export function bakearCopaMasa({ esferas, tono = '#3c6a30', claro, oscuro, cobertura = 1.25, tamCard, seed = 7, brillo = 0.0, texOscuro, texClaro } = {}) {
  const gradiente = (() => {
    const base = new THREE.Color(tono);
    const cl = new THREE.Color(claro ?? base.clone().offsetHSL(0.0, -0.05, 0.14).getStyle());
    const os = new THREE.Color(oscuro ?? base.clone().offsetHSL(0.0, 0.04, -0.12).getStyle());
    const tmp = new THREE.Color();
    // gradiente vertical: cumbre encendida, base a sombra
    let yMin = Infinity, yMax = -Infinity;
    for (const e of esferas) { yMin = Math.min(yMin, e.c[1] - e.r); yMax = Math.max(yMax, e.c[1] + e.r); }
    const span = Math.max(0.001, yMax - yMin);
    return (x, y) => {
      const t = THREE.MathUtils.clamp((y - yMin) / span, 0, 1);
      return tmp.copy(os).lerp(cl, t * 0.85 + 0.1);
    };
  })();

  const { grupo } = crearCopaMasa(THREE, {
    esferas, gradiente, cobertura, tamCard, seed, brillo,
    // texOpts.medio/oscuro/claro tintan las hojitas del CANVAS de follaje: sin
    // esto la textura sale con sus verdes por defecto y un acento rosa/oro solo
    // teñiría el núcleo/gradiente → copa verde con "rubor", no masa rosa/oro de
    // verdad. Para los ACENTOS (guayacán rosado/amarillo) pasamos texOscuro/
    // texClaro y las hojitas del map salen del color de la especie. El verde
    // dominante NO pasa estos → conserva su textura verde tal cual.
    texOpts: {
      medio: tono, seed,
      ...(texOscuro ? { oscuro: texOscuro } : {}),
      ...(texClaro ? { claro: texClaro } : {}),
    },
  });

  // grupo = [nucleo(Mesh), cards(Mesh)]; extraemos geo+material de cada uno tal cual.
  const nucleo = grupo.children.find((c) => c.isMesh && !c.material.map);
  const cards = grupo.children.find((c) => c.isMesh && c.material.map);
  const box = new THREE.Box3().setFromObject(grupo);
  const alturaNatural = Math.max(0.001, box.max.y - box.min.y);

  return {
    geoNucleo: nucleo.geometry, matNucleo: nucleo.material,
    geoCards: cards.geometry, matCards: cards.material,
    alturaNatural,
  };
}
