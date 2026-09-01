// ── Flora por piso altitudinal (Humboldt / Cruz Verde) ───────────────────────
// Bosque altoandino ~2300 m en el sitio y laderas: roble andino / encenillo,
// palma de cera, helecho arbóreo, sietecueros. Bosque oscuro aferrado a la
// pared del farallón. Subpáramo/páramo hacia el filo: frailejón + pajonal.
// Todo con InstancedMesh: un draw call por arquetipo.
import * as THREE from 'three';
import { height, fbm, sstep, clamp, elevOf, CHANNEL_X, CHIFLON_X, SITE_X, SITE_Z, dirtAmount, channelAxis } from './terrain.js';
// Árboles ez-tree (silueta rica, esqueleto recursivo) para los árboles-héroe de
// primer plano y como geometría de copa del bosque. Ver flora-eztree-bake.js:
// se BAKEA una vez por arquetipo y se instancia (draw-call-neutral). El módulo
// solo usa especies nativas andinas y VETA por diseño eucalipto/pino/retamo/
// acacia (ESPECIES_EXCLUIDAS). No es drop-in — ver BITACORA-flora-eztree.md.
import { crearHeroe, crearHeroeMasa, bakearArbolMasa } from './flora-eztree-bake.js';
// FOLLAJE-MASA (2026-08-04): las piezas de lib3d/flora que YA pasaron gate
// Humboldt, horneadas para instanciar y MATAR el low-poly. frailejonFabrica =
// roseta caulescente Espeletia (gate 8/10, reemplaza el cono de 6 caras);
// FollajeMasa.crearCopaMasa = copa de masa densa con cards texturizados
// (reemplaza los icosaedros/conos del pajonal, sietecueros, romero, matorral).
// Se hornea UNA vez por arquetipo y se instancia (draw-call-neutral).
import { bakearFrailejon, bakearCopaMasa } from './follaje-masa-bake.js';
// PASTO DE MASA (2026-08-04): gramínea Quick_Grass (pala curva multi-segmento
// construida en el VERTEX SHADER — técnica Ghost of Tsushima/GDC, vendorizada de
// simondevyoutube/Quick_Grass MIT). Cada brizna es un quad de N segmentos que se
// AFINA hacia la punta y se DOBLA con hash por-brizna, meciéndose con el reloj de
// viento GLOBAL compartido (uTiempoVM) — la MISMA ráfaga que menea las copas. Un
// parche = 1 InstancedMesh = 1 draw call, miles de briznas dentro. Reemplaza el
// suelo pelado del potrero y da MASA de gramínea al pajonal y el sotobosque. NO
// ConeGeometry, NO cartelitos, NO low-poly. Solo gramínea NATIVA (Calamagrostis/
// Festuca altoandina), nunca invasora.
import { crearParchePasto } from './lib3d/flora/quickGrass.js';
// VIENTO EN LAS COPAS (2026-08-10): el pasto ya se mecía con el reloj global
// uTiempoVM, pero las copas de MASA quedaban CLAVADAS — el comentario de arriba
// («la MISMA ráfaga que menea las copas») describía una intención, no un hecho:
// ningún material de copa leía el reloj. aplicarVientoMundo es el parche que ya
// usan los mundos autónomos para este mismo bug (copas clavadas = árbol muerto):
// onBeforeCompile sobre el MeshStandardMaterial horneado, onda coherente en
// espacio MUNDO con desfase por instancia, base quieta por altura local. El
// reloj lo avanza el auto-tick de quickGrass (este valle no llama
// tickVientoMundos), así que copas y briznas comparten la misma ráfaga.
import { aplicarVientoMundo } from './lib3d/flora/vientoMundos.js';

const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _c = new THREE.Color();

function slopeAt(x, z) {
  const e = 2.5;
  const dx = (height(x + e, z) - height(x - e, z)) / (2 * e);
  const dz = (height(x, z + e) - height(x, z - e)) / (2 * e);
  return Math.sqrt(dx * dx + dz * dz);
}

// muestrea posiciones que cumplan una regla; evita el claro del sitio y el
// potrero TRASERO (cabana-real2: la pradera detrás del sitio es pasto abierto,
// y es el eje visual de la vista ?cam=back hacia la cabaña)
function scatter(count, rule, avoidSite = true) {
  const out = [];
  let guard = count * 60;
  while (out.length < count && guard-- > 0) {
    const x = (Math.random() * 2 - 1) * 1250;
    const z = 250 - Math.random() * 1900;
    // despeje alrededor de la casa: iba clavado en (-30, 40) con radio 30, o
    // sea el sitio VIEJO — con la casa re-ubicada plantaba palmas de 26 u
    // dentro del jardín y una de ellas justo delante del ojo del gate.
    // 62 u ≈ 103 m: lo que de verdad está despejado alrededor de una casa.
    if (avoidSite && Math.hypot(x - SITE_X, z - SITE_Z) < 62) continue;
    if (z > SITE_Z + 15 && z < SITE_Z + 225 && x > SITE_X - 55 && x < SITE_X + 65) continue; // potrero trasero limpio
    const y = height(x, z);
    const s = slopeAt(x, z);
    if (rule(x, y, z, s)) out.push({ x, y, z, s });
  }
  return out;
}

function instParams(mesh, pts, opts = {}) {
  const { sMin = 0.8, sMax = 1.3, hueJitter = 0.06, baseColor = null, sink = 0.3 } = opts;
  pts.forEach((pt, i) => {
    const sc = sMin + Math.random() * (sMax - sMin);
    _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
    _s.set(sc, sc * (0.9 + Math.random() * 0.25), sc);
    _p.set(pt.x, pt.y - sink, pt.z);
    _m4.compose(_p, _q, _s);
    mesh.setMatrixAt(i, _m4);
    if (baseColor) {
      _c.copy(baseColor).offsetHSL((Math.random() - 0.5) * hueJitter, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.07);
      mesh.setColorAt(i, _c);
    }
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

// Calcula UNA matriz por punto (escala a metros vía Box3 + giro Y + hundido),
// para que TODAS las mallas de un mismo arquetipo horneado (p.ej. núcleo+cards de
// una copa de masa, o tronco+roseta de un frailejón) queden PERFECTAMENTE
// superpuestas (misma matriz por individuo). Devuelve un array de Matrix4.
function matricesMasa(pts, { hBajo = 1, hAlto = 2, alturaNatural = 1, sink = 0.3 } = {}) {
  return pts.map((pt) => {
    const hm = hBajo + Math.random() * (hAlto - hBajo);
    const k = hm / alturaNatural;                    // escala Box3 → altura en metros
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
    const s = new THREE.Vector3(k, k * (0.9 + Math.random() * 0.2), k);
    const p = new THREE.Vector3(pt.x, pt.y - sink, pt.z);
    return new THREE.Matrix4().compose(p, q, s);
  });
}

// Crea un InstancedMesh (1 draw call) a partir de una geo horneada + matrices
// ya calculadas (compartidas entre las mallas del arquetipo → superposición
// exacta). tint opcional con jitter de tono por individuo.
function instConMatrices(geo, mat, mats, { tint = null, hueJitter = 0.05 } = {}) {
  const mesh = new THREE.InstancedMesh(geo, mat, mats.length);
  const base = tint ? new THREE.Color(tint) : null;
  mats.forEach((m, i) => {
    mesh.setMatrixAt(i, m);
    if (base) {
      _c.copy(base).offsetHSL((Math.random() - 0.5) * hueJitter, (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.06);
      mesh.setColorAt(i, _c);
    }
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

// ── geometrías de arquetipo (low-poly, sin merges → nada de null silencioso) ──

// concat manual de geometrías no-indexadas (posición+normal): cero null silencioso
function concatGeos(...geos) {
  const nonIdx = geos.map(g => g.index ? g.toNonIndexed() : g);
  let count = 0;
  for (const g of nonIdx) count += g.attributes.position.count;
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3);
  let off = 0;
  for (const g of nonIdx) {
    pos.set(g.attributes.position.array, off);
    nor.set(g.attributes.normal.array, off);
    off += g.attributes.position.array.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

// copa de roble/encenillo: tres lóbulos (silueta irregular, no gomita)
// (canopyLobesGeo —3 lóbulos icosaedro = la bola verde plana del bosque de MASA—
//  quedó ELIMINADA por la purga AUDIT-ARBOLES-HUMBOLDT. La masa verde del valle
//  (cercana y lejana) ahora es encenillo ez-tree instanciado; ver más abajo
//  `ezForestScatter(ezt.encenillo, ...)` para `canopy` y `farForest`.)

// `dirt` APAGADO por defecto, igual que en makeTerrain: el ralear del pasto
// acompaña al campo de tierra y comparte su juicio de arte pendiente.
export function makeFlora(scene, { dirt = false } = {}) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4c3a26, roughness: 0.95 });
  const group = new THREE.Group();
  // Barrido reproducible del procedural: la semilla cambia texturas y la mezcla
  // espacial de formas, no el catálogo botánico. El valor por defecto queda
  // fijo para que el gate público sea estable.
  const floraSeed = Number.parseInt(new URLSearchParams(location.search).get('floraSeed') || '20260811', 10) >>> 0;

  // ── PASTO RALO: la densidad de cada macolla respeta el campo de tierra ─────
  // `dirtAmount` (terrain.js) dice cuánto suelo desnudo hay en cada punto
  // (caminos, obras, laderas lavadas). Donde sube, la mata nace con MENOS
  // briznas; sobre la tierra pelada no nace ninguna. `?dirt=0` apaga el campo
  // (baseline A/B del gate, como `?milpa=0`/`?flores=0`).
  const rel = dirt
    ? (x, z, s) => {
        const d = dirtAmount(x, z, s);
        return { d, rel: 1 - sstep(0.15, 0.75, d) };
      }
    : () => ({ d: 0, rel: 1 });

  // EZ-TREE (2026-08-02): geometrías horneadas UNA vez por arquetipo nativo.
  // (2026-08-04) Los últimos consumidores del bosque instanciado —los 3 acentos
  // (guayacán rosa/oro, chachafruto)— pasaron a copa de MASA (arbolMasaScatter),
  // así que YA NADIE instancia arquetipos ez-tree en el bosque: se retira la
  // llamada a bakearArbolesValle() (horneaba TODOS los arquetipos en cada carga
  // para nada). Los árboles-HÉROE del sitio siguen usando ez-tree, pero por
  // `crearHeroe(esp)` (Tree individual), no por estos arquetipos horneados.

  // ── FOLLAJE-MASA horneado (una vez por arquetipo, luego se instancia) ────────
  // frailejón: roseta caulescente Espeletia (gate 8/10) — reemplaza el cono 6-caras.
  const fraileBake = bakearFrailejon('grandiflora', 7);
  // pajonal de páramo: MASA herbácea baja ocre-verdosa (Calamagrostis/Festuca —
  // pajonal andino NATIVO, NO invasoras). Silueta de macolla achatada y ancha.
  const pajBake = bakearCopaMasa({
    esferas: [
      { c: [0, 0.75, 0], r: 0.95, esc: [1.15, 0.65, 1.15] },
      { c: [0.35, 0.55, 0.2], r: 0.55, esc: [1.0, 0.7, 1.0] },
      { c: [-0.3, 0.6, -0.25], r: 0.6, esc: [1.0, 0.7, 1.0] },
    ],
    tono: '#8f8a4e', claro: '#b7ad63', oscuro: '#5f5a34', cobertura: 1.35, tamCard: 0.5, seed: 21,
  });
  // sietecueros (Tibouchina): copa menor redondeada, verde con rubor morado discreto.
  const sieteBake = bakearCopaMasa({
    esferas: [
      { c: [0, 2.4, 0], r: 1.7, esc: [1.05, 0.9, 1.05] },
      { c: [0.9, 2.1, 0.5], r: 1.0 }, { c: [-0.8, 2.2, -0.6], r: 1.05 },
    ],
    tono: '#3f5a34', claro: '#6a5f8a', oscuro: '#2c4028', cobertura: 1.25, seed: 33,
  });
  // romero de páramo (Diplostephium): mata baja oscura densa entre el pajonal.
  const romBake = bakearCopaMasa({
    esferas: [
      { c: [0, 0.6, 0], r: 0.62, esc: [1.0, 1.15, 1.0] },
      { c: [0.28, 0.75, 0.1], r: 0.38 }, { c: [-0.25, 0.7, -0.15], r: 0.4 },
    ],
    tono: '#3a4a2c', claro: '#57683c', oscuro: '#28331e', cobertura: 1.3, tamCard: 0.4, seed: 44,
  });
  // chusque/matorral del potrero cercano: mata verde densa achatada.
  const shrubBake = bakearCopaMasa({
    esferas: [
      { c: [0, 0.55, 0], r: 0.85, esc: [1.1, 0.7, 1.1] },
      { c: [0.35, 0.5, 0.15], r: 0.5 }, { c: [-0.3, 0.55, -0.2], r: 0.52 },
    ],
    tono: '#42602c', claro: '#66883a', oscuro: '#2c421c', cobertura: 1.3, seed: 55,
  });
  // ── SILUETAS DIVERSAS DE MASA: arquetipos existentes, no especies inventadas
  // Cada bake roba la distribución de ramas/hojas de ez-tree y la convierte en
  // núcleo + cards densos. Cuatro formas mezcladas por ruido espacial dan
  // copa ancha, columnar, irregular alta y dosel extendido sin hojas contables.
  const bosqueBakes = [
    bakearArbolMasa('roble_negro', { tono: '#315b2b', claro: '#5d8140', oscuro: '#1b351b', seed: floraSeed + 811 }),
    bakearArbolMasa('encenillo', { tono: '#3d6d32', claro: '#6e9145', oscuro: '#203e20', seed: floraSeed + 812 }),
    bakearArbolMasa('aliso_andino', { tono: '#477b3d', claro: '#7aa34f', oscuro: '#294d27', seed: floraSeed + 813 }),
    bakearArbolMasa('nogal_andino', { tono: '#356b35', claro: '#65934b', oscuro: '#1d4124', seed: floraSeed + 814 }),
  ];
  const oroBake = bakearArbolMasa('guayacan_amarillo', {
    tono: '#d1a82e', claro: '#f0d878', oscuro: '#a77d13', seed: floraSeed + 815,
  });
  const chachaBake = bakearArbolMasa('chachafruto', {
    tono: '#3f7a3a', claro: '#6aa65a', oscuro: '#1d3f1e', seed: floraSeed + 816,
  });
  // LOD-LEJOS de la extensión verde: los MISMOS arquetipos con cards grandes y
  // núcleo magro (~60% menos tris/instancia) — permiten CERRAR el dosel de la
  // franja alta a 700–1300 m sin pagar el precio del bake cercano.
  const bosqueLejosBakes = [
    bakearArbolMasa('encenillo', { tono: '#3d6d32', claro: '#6e9145', oscuro: '#203e20', seed: floraSeed + 821, lejos: true }),
    bakearArbolMasa('aliso_andino', { tono: '#477b3d', claro: '#7aa34f', oscuro: '#294d27', seed: floraSeed + 822, lejos: true }),
  ];
  // ── las copas SE MECEN (regla dura: viento en todos los mundos) ────────────
  // El peso del meneo es la altura LOCAL del vértice sobre `piso` (unidades del
  // BAKE, no de mundo): la base del follaje queda quieta, la punta se dobla. La
  // proyección mundo→instancia de aplicarVientoMundo cancela la escala, así que
  // el bamboleo en MUNDO es el mismo para el rodal cercano y el lejano (que
  // comparten estos materiales). Los troncos no se parchean: un tronco que se
  // dobla desde la raíz lee como gelatina, no como viento.
  // El FRAILEJÓN queda rígido a propósito: la roseta de Espeletia es dura; lo
  // que ondea en el páramo es el pajonal alrededor.
  for (const bk of [...bosqueBakes, ...bosqueLejosBakes, oroBake, chachaBake]) {
    aplicarVientoMundo(bk.matNucleo, { amplitud: 0.07, piso: 2.2 });
    aplicarVientoMundo(bk.matCards, { amplitud: 0.07, piso: 2.2 });
  }
  aplicarVientoMundo(sieteBake.matNucleo, { amplitud: 0.06, piso: 1.6 });
  aplicarVientoMundo(sieteBake.matCards, { amplitud: 0.06, piso: 1.6 });
  // matas bajas: apenas un respiro (son macollas duras, no banderas)
  aplicarVientoMundo(pajBake.matNucleo, { amplitud: 0.05, piso: 0.3, velocidad: 1.2 });
  aplicarVientoMundo(pajBake.matCards, { amplitud: 0.05, piso: 0.3, velocidad: 1.2 });
  aplicarVientoMundo(romBake.matNucleo, { amplitud: 0.03, piso: 0.4 });
  aplicarVientoMundo(romBake.matCards, { amplitud: 0.03, piso: 0.4 });
  aplicarVientoMundo(shrubBake.matNucleo, { amplitud: 0.04, piso: 0.35 });
  aplicarVientoMundo(shrubBake.matCards, { amplitud: 0.04, piso: 0.35 });

  // Calcula las instancias de una silueta de masa (núcleo + cards) sobre `pts`,
  // escalando cada individuo a una altura en metros. La malla se crea después:
  // cercano, lejano y potrero acumulan aquí sus matrices para que haya una sola
  // InstancedMesh por silueta, no un draw call por rodal.
  // OJO: los materiales del núcleo/cards de crearCopaMasa usan `vertexColors`
  // (el gradiente y la textura ya vienen horneados). NO se pasa `tint` a
  // instConMatrices: instanceColor MULTIPLICA sobre el color por-vértice y
  // apaga el gradiente. La variación de tono por individuo la da el bake (seed)
  // y el jitter de escala/giro de matricesMasa — suficiente para no clonar.
  const arbolMasaScatter = (bake, pts, { hBajo = 8, hAlto = 14, sink = 0.3 } = {}) => {
    const mats = matricesMasa(pts, { hBajo, hAlto, alturaNatural: bake.alturaNatural, sink });
    return { matrices: mats };
  };
  const matricesPorSilueta = new Map([
    ...bosqueBakes.map((bake) => [bake, []]),
    ...bosqueLejosBakes.map((bake) => [bake, []]),
    [oroBake, []],
    [chachaBake, []],
  ]);
  const acumularSilueta = (bake, matrices) => matricesPorSilueta.get(bake).push(...matrices);
  // El follaje original de ez-tree no entra al bosque: solo se conserva su forma
  // para construir la masa y sus ramas, así la copa no vuelve a ser low-poly.
  const arbolTrunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 2.4, 5);
  arbolTrunkGeo.translate(0, 1.0, 0);
  const arbolTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 0.95, flatShading: true });
  const instTroncosRodal = (matrices, nombre) => {
    const mesh = new THREE.InstancedMesh(arbolTrunkGeo, arbolTrunkMat, matrices.length);
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = nombre;
    mesh.userData.floraValleBosque = true;
    group.add(mesh);
    return mesh;
  };

  // Núcleo y cards comparten la instancia y el material. `masaTipo` permite que
  // el shader fuerce alpha opaco/color de vértice en el núcleo, pero conserve la
  // textura alpha de follaje en los cards. Así cada silueta paga un solo draw
  // call de copa; el tronco sigue consolidado en el lote común.
  const fusionarCopaMasa = (bake) => {
    const fuentes = [[bake.geoNucleo, 0], [bake.geoCards, 1]]
      .map(([geo, tipo]) => ({ geo: geo.index ? geo.toNonIndexed() : geo, tipo }));
    const total = fuentes.reduce((s, { geo }) => s + geo.attributes.position.count, 0);
    const pos = new Float32Array(total * 3);
    const nor = new Float32Array(total * 3);
    const col = new Float32Array(total * 3);
    const uv = new Float32Array(total * 2);
    const tipo = new Float32Array(total);
    let off = 0;
    for (const fuente of fuentes) {
      const g = fuente.geo;
      const n = g.attributes.position.count;
      pos.set(g.attributes.position.array, off * 3);
      if (g.attributes.normal) nor.set(g.attributes.normal.array, off * 3);
      if (g.attributes.color) col.set(g.attributes.color.array, off * 3);
      else for (let i = 0; i < n * 3; i++) col[off * 3 + i] = 1;
      if (g.attributes.uv) uv.set(g.attributes.uv.array, off * 2);
      tipo.fill(fuente.tipo, off, off + n);
      off += n;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.setAttribute('masaTipo', new THREE.BufferAttribute(tipo, 1));
    out.computeBoundingSphere();
    return out;
  };
  const materialCopaMasaInstanciada = (bake) => {
    const mat = new THREE.MeshStandardMaterial({
      map: bake.tex, alphaTest: 0.28, side: THREE.DoubleSide,
      vertexColors: true, roughness: 1, metalness: 0,
    });
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float masaTipo;\nvarying float vMasaTipo;')
        .replace('#include <begin_vertex>', 'vMasaTipo = masaTipo;\n#include <begin_vertex>');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vMasaTipo;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          if (vMasaTipo < 0.5) diffuseColor = vec4(vColor, 1.0);`);
    };
    aplicarVientoMundo(mat, { amplitud: 0.07, piso: 2.2 });
    return mat;
  };
  const instanciarSilueta = (bake, prefijo, forma) => {
    const matrices = matricesPorSilueta.get(bake);
    if (!matrices.length) return;
    const mesh = new THREE.InstancedMesh(fusionarCopaMasa(bake), materialCopaMasaInstanciada(bake), matrices.length);
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = `${prefijo}-${forma}-masa`;
    mesh.userData.floraValleBosque = true;
    mesh.receiveShadow = true;
    // La sombra de los cards alpha requeriría un depth shader con masaTipo; el
    // lote de troncos conserva la sombra estructural sin duplicar este pase.
    mesh.castShadow = false;
    group.add(mesh);
  };

  // corredor visual despejado: del deck hacia el cañón no se planta nada
  const inCorridor = (x, z) => {
    if (z < -640 || z > 40) return false;
    const w = 90 + (40 - z) * 0.12;
    return Math.abs(x + 45) < w;
  };
  // El corredor visual anterior estaba centrado en el deck, no en el cauce
  // real de La Chorrera. Mantener limpio el eje del agua evita que los
  // scatters generales vuelvan a tapar la escalera de roca restaurada.
  const inChorrera = (x, z) =>
    z < -560 && z > -1180 && Math.abs(x - channelAxis(z)) < 46;
  const nearCam = (x, z) => Math.hypot(x + 68, z - 91) < 30;

  // ── bosque altoandino: formas verdes mezcladas + acento amarillo ──────────
  // El rosa queda reservado a los DOS héroes del sitio (más abajo). No se
  // siembra ningún árbol rosado en el bosque: el color dominante sigue siendo
  // verde y el amarillo aparece solo como acento pequeño.
  const forestPts = scatter(1500, (x, y, z, s) =>
    elevOf(y) > 2150 && elevOf(y) < 2880 && s < 0.9 && z > -700 &&
    (s > 0.24 || Math.abs(x + 45) > 240) &&
    !inCorridor(x, z) && !inChorrera(x, z) && !nearCam(x, z) &&
    (fbm(x / 260 + 3, z / 260 + 3, 3) * 0.5 + 0.5) > 0.42);
  // Ruido espacial de baja frecuencia forma manchas mixtas, y un jitter pequeño
  // evita bordes geométricos o filas repetidas entre arquetipos.
  const formaPara = (pt, i) => {
    const suave = fbm(pt.x / 78 + 13, pt.z / 78 + 13, 3) * 0.5 + 0.5;
    const jitter = (((Math.imul(i + 17, 0x9e3779b1) ^ floraSeed) >>> 0) / 4294967296) * 0.18;
    const n = (suave * 0.82 + jitter) % 1;
    return n < 0.29 ? 0 : n < 0.55 ? 1 : n < 0.79 ? 2 : 3;
  };
  const repartirBosque = (pts) => {
    const formas = bosqueBakes.map(() => []);
    const oro = [];
    pts.forEach((pt, i) => {
      const r = (((Math.imul(i + 1, 0x9e3779b1) ^ floraSeed) >>> 0) / 4294967296);
      if (r < 0.05) oro.push(pt);       // 5% amarillo: acento, no paleta dominante
      else formas[formaPara(pt, i)].push(pt);
    });
    return { formas, oro };
  };
  const nearForest = repartirBosque(forestPts);
  const nearTroncos = [];
  nearForest.formas.forEach((pts, i) => {
    const rodal = arbolMasaScatter(bosqueBakes[i], pts, { hBajo: 7, hAlto: 13, sink: 0.3 });
    nearTroncos.push(...rodal.matrices);
    acumularSilueta(bosqueBakes[i], rodal.matrices);
  });
  const nearOro = arbolMasaScatter(oroBake, nearForest.oro, { hBajo: 8, hAlto: 13, sink: 0.3 });
  nearTroncos.push(...nearOro.matrices);
  acumularSilueta(oroBake, nearOro.matrices);

  // ── árboles sueltos de potrero (como en las fotos del deck) ──
  // EZ-TREE: son primer plano en las vistas del deck (?cam=site/back) — se
  // suben a chachafruto ez-tree (silueta rica) instanciado. 170 individuos ×
  // 2 mallas = 2 draw calls (instanciado), triángulos acotados por el LOD.
  const pastPts = scatter(170, (x, y, z, s) =>
    elevOf(y) < 2460 && s < 0.2 && z < -180 && !inCorridor(x, z) && !inChorrera(x, z));
  // FOLLAJE-MASA: chachafruto conserva una forma distinta en el potrero.
  const pastTree = arbolMasaScatter(chachaBake, pastPts, { hBajo: 6.5, hAlto: 11, sink: 0.3 });
  acumularSilueta(chachaBake, pastTree.matrices);

  // ── sietecueros: copas menores, apenas un rubor morado discreto ──
  const sietePts = scatter(110, (x, y, z, s) =>
    elevOf(y) > 2330 && elevOf(y) < 2700 && s < 0.6 && z > -420 && !inCorridor(x, z) && !inChorrera(x, z) && !nearCam(x, z));
  // FOLLAJE-MASA: copa densa verde con rubor morado (Tibouchina) — NO icosaedro.
  const sieteMats = matricesMasa(sietePts, { hBajo: 3.4, hAlto: 5.2, alturaNatural: sieteBake.alturaNatural, sink: 0.2 });
  group.add(
    instConMatrices(sieteBake.geoNucleo, sieteBake.matNucleo, sieteMats),
    instConMatrices(sieteBake.geoCards, sieteBake.matCards, sieteMats),
  );

  // ── palmas de cera: tronco altísimo + corona ──
  const palmPts = scatter(70, (x, y, z, s) =>
    elevOf(y) > 2250 && elevOf(y) < 2780 && s < 0.75 && z > -640 && !inCorridor(x, z) && !inChorrera(x, z) && !nearCam(x, z));
  const palmTrunkGeo = new THREE.CylinderGeometry(0.26, 0.4, 18, 6);
  palmTrunkGeo.translate(0, 9, 0);
  const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x98917f, roughness: 0.85 });
  const palmTrunks = new THREE.InstancedMesh(palmTrunkGeo, palmTrunkMat, palmPts.length);
  // ARMONÍA DE ESCALA (2026-07-31): medido con Box3 (top natural = 19,8 u),
  // sMax=1,45 daba palmas de 47,8 m — más que un edificio de 15 pisos. Factor
  // 0,5644 deja el tope en ~27 m (emergente de verdad, dentro del rango
  // 5-25 m + margen de palma-excepción que pidió el operador).
  instParams(palmTrunks, palmPts, { sMin: 0.48, sMax: 0.82, sink: 0.3 });
  group.add(palmTrunks);
  // corona: cono invertido chato de "frondas"
  // corona en parasol: cono INVERTIDO (frondas cayendo) + moño arriba
  const crownCone = new THREE.ConeGeometry(4.6, 3.0, 8);
  // ⚠️ BUG (preexistente, no de la rotación): esto era `scale(1, -1, 1)`.
  // Un espejo INVIERTE el sentido de giro de los triángulos, así que las
  // normales de la corona apuntaban HACIA ADENTRO y la palma se veía NEGRA
  // desde abajo — que es justo desde donde la mira un peatón. Se ve en
  // cualquier captura vieja: los mástiles pálidos rematan en un disco negro.
  // Una ROTACIÓN de 180° deja el parasol igual (apex abajo, base arriba) y
  // conserva la orientación de las caras.
  crownCone.rotateX(Math.PI);          // apex abajo, base arriba = parasol
  crownCone.translate(0, 18.0, 0);
  const crownTop = new THREE.IcosahedronGeometry(1.0, 0);
  crownTop.scale(1.4, 0.7, 1.4);
  crownTop.translate(0, 19.2, 0);
  const crownGeo = concatGeos(crownCone, crownTop);
  const crownMat = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true });
  // la corona de la palma cabecea entera (frondas a 16.5-19.9 u locales); el
  // mástil (palmTrunks, malla aparte) queda firme — así se mece una palma real.
  aplicarVientoMundo(crownMat, { amplitud: 0.06, piso: 16, velocidad: 0.9 });
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, palmPts.length);
  instParams(crowns, palmPts, { sMin: 0.48, sMax: 0.82, baseColor: new THREE.Color(0x37502a), hueJitter: 0.04, sink: 0.3 });
  group.add(crowns);

  // ── helechos arbóreos: cerca de agua/sombra ──
  const fernPts = scatter(160, (x, y, z, s) =>
    elevOf(y) > 2100 && elevOf(y) < 2620 && s > 0.22 && s < 1.0 && z < -80 && z > -680 && !inChorrera(x, z));
  const fernGeo = new THREE.ConeGeometry(1.9, 0.9, 8, 1, true);
  fernGeo.translate(0, 2.4, 0);
  const fernMat = new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true, side: THREE.DoubleSide });
  aplicarVientoMundo(fernMat, { amplitud: 0.05, piso: 1.9 });   // las frondas altas apenas
  const ferns = new THREE.InstancedMesh(fernGeo, fernMat, fernPts.length);
  instParams(ferns, fernPts, { sMin: 0.7, sMax: 1.2, baseColor: new THREE.Color(0x3c5c26), hueJitter: 0.05 });
  group.add(ferns);
  const fernTrunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 2.4, 5);
  fernTrunkGeo.translate(0, 1.2, 0);
  const fernTrunks = new THREE.InstancedMesh(fernTrunkGeo, trunkMat, fernPts.length);
  instParams(fernTrunks, fernPts, { sMin: 0.7, sMax: 1.2, sink: 0.2 });
  group.add(fernTrunks);

  // ── bosque LEJANO de laderas: las mismas formas, a mayor escala ───────────
  // La mezcla se repite con otra fase espacial: el fondo no se convierte en
  // una fila de clones y conserva el mismo lenguaje botánico del plano cercano.
  const farPts = scatter(420, (x, y, z, s) =>
    z < -260 && z > -700 && elevOf(y) > 2150 && elevOf(y) < 2950 && s > 0.24 && s < 1.1 && !inCorridor(x, z) && !inChorrera(x, z));
  const farForest = repartirBosque(farPts);
  const farTroncos = [];
  farForest.formas.forEach((pts, i) => {
    const rodal = arbolMasaScatter(bosqueBakes[i], pts, { hBajo: 14, hAlto: 24, sink: 0.3 });
    farTroncos.push(...rodal.matrices);
    acumularSilueta(bosqueBakes[i], rodal.matrices);
  });
  const farOro = arbolMasaScatter(oroBake, farForest.oro, { hBajo: 15, hAlto: 24, sink: 0.3 });
  farTroncos.push(...farOro.matrices);
  acumularSilueta(oroBake, farOro.matrices);

  // ── EXTENSIÓN VERDE-DOMINANTE (2026-08-18, INFORME-VALLE-CERCA-BEIGE) ──────
  // La sonda ocre→mundo (_gate/verde-20260818/sonda-ocre-mundo.mjs) proyectó
  // los píxeles beige del cuadro b3 al terreno y midió POR QUÉ el scatter no
  // plantaba ahí: (1) ladera empinada s>0,9 (42°–64°) donde el bosque nublado
  // real sí se aferra; (2) el hueco z −700..−1000 que ninguna banda cubría;
  // (3) el cinturón subpáramo 2850–3050 pelado entre el techo del bosque
  // (2880/2950) y el piso del páramo (2990, y sólo a −z>840). Se extiende la
  // masa que YA existe: mismos bakes (mismo viento en las copas), matrices
  // acumuladas en los lotes por silueta → CERO draw calls nuevos de árbol.
  // `?verde=0` es el brazo OFF del A/B. PRNG PROPIO sembrado: esta extensión
  // no llama Math.random ni una vez, así que con verde=0 la secuencia del
  // scatter histórico queda intacta (el valle previo, byte a byte).
  const VERDE_EXT = new URLSearchParams(location.search).get('verde') !== '0';
  const prandVerde = ((a) => () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  })(floraSeed ^ 0x51f7a3d);
  const scatterVerde = (count, rule) => {
    const out = [];
    let guard = count * 70;
    while (out.length < count && guard-- > 0) {
      const x = (prandVerde() * 2 - 1) * 1250;
      const z = 250 - prandVerde() * 1900;
      const y = height(x, z);
      const s = slopeAt(x, z);
      if (rule(x, y, z, s)) out.push({ x, y, z, s });
    }
    return out;
  };
  const matricesVerde = (pts, { hBajo, hAlto, alturaNatural, sink = 0.3 }) => pts.map((pt) => {
    const hm = hBajo + prandVerde() * (hAlto - hBajo);
    const k = hm / alturaNatural;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), prandVerde() * Math.PI * 2);
    const esc = new THREE.Vector3(k, k * (0.9 + prandVerde() * 0.2), k);
    return new THREE.Matrix4().compose(new THREE.Vector3(pt.x, pt.y - sink, pt.z), q, esc);
  });
  // los cauces van limpios: el canal de La Chorrera (z<−560, eje curvo) y el
  // salto del Chiflón con su poza — en la roca lavada no se planta
  const lejosDeCauces = (x, z) =>
    !(z < -560 && Math.abs(x - channelAxis(z)) < 45) &&
    !(z > -570 && z < -410 && Math.abs(x - CHIFLON_X) < 45);
  const troncosVerde = [];
  const sembrarRodal = (bakes, pts, alturas) => {
    const porForma = bakes.map(() => []);
    pts.forEach((pt, i) => porForma[formaPara(pt, i) % bakes.length].push(pt));
    porForma.forEach((sub, i) => {
      const mats = matricesVerde(sub, { ...alturas, alturaNatural: bakes[i].alturaNatural });
      troncosVerde.push(...mats);
      acumularSilueta(bakes[i], mats);
    });
    return pts.length;
  };
  // Sin oro ni rosa en la extensión: el acento de color ya está dosificado en
  // el bosque histórico, y sumar amarillo acá sería sumar OCRE al censo.
  let romExtVerde = [], shrubExtVerde = [], pastoLaderaPts = [];
  const censoVerdeExt = { r1LaderaCerca: 0, r2Hueco: 0, r3Subparamo: 0, matorral: 0, pasto: 0 };
  if (VERDE_EXT) {
    // (1) bosque aferrado a la ladera empinada CERCANA (s 0,9–1,6 ≈ 42°–58°):
    // la falla nº1 medida ("s>0.9", quebradas de z −620..−700). Bake cercano.
    censoVerdeExt.r1LaderaCerca = sembrarRodal(bosqueBakes, scatterVerde(560, (x, y, z, s) =>
      z > -700 && z < 40 && elevOf(y) > 2250 && elevOf(y) < 2880 && s > 0.9 && s < 1.6 &&
      !inCorridor(x, z) && !nearCam(x, z) && lejosDeCauces(x, z)), { hBajo: 7, hAlto: 13 });
    // (2) el hueco z −700..−1050: paredes del cañón a elevación de bosque.
    // A 500–900 m: bake LOD-lejos (cards grandes, mismo arquetipo).
    censoVerdeExt.r2Hueco = sembrarRodal(bosqueLejosBakes, scatterVerde(500, (x, y, z, s) =>
      z <= -700 && z > -1050 && elevOf(y) > 2300 && elevOf(y) < 2880 && s > 0.24 && s < 1.7 &&
      lejosDeCauces(x, z)), { hBajo: 12, hAlto: 22 });
    // (3) cinturón SUBPÁRAMO 2850–3100: bosque achaparrado que trepa hacia el
    // filo. Dosis MEDIDA: con 1300 la franja a ~1 km se movió ~1 pp (la niebla
    // neutraliza el verde lejano) — esa banda la carga el TONO del terreno
    // (makeTerrain); acá quedan 700 para la textura de dosel en vistas medias.
    censoVerdeExt.r3Subparamo = sembrarRodal(bosqueLejosBakes, scatterVerde(700, (x, y, z, s) =>
      z < -600 && z > -1350 && elevOf(y) > 2850 && elevOf(y) < 3100 && s < 1.6 &&
      lejosDeCauces(x, z)), { hBajo: 7, hAlto: 13 });
    // (4) matorral aferrado donde ni el bosque extendido llega (s 1,4–2,1):
    // chusque y romero de los MISMOS bakes, matas de ladera 1–2,4 m
    const matorralPts = scatterVerde(360, (x, y, z, s) =>
      z > -1100 && z < 40 && elevOf(y) > 2250 && elevOf(y) < 3050 && s >= 1.4 && s < 2.1 &&
      !inCorridor(x, z) && !nearCam(x, z) && lejosDeCauces(x, z));
    censoVerdeExt.matorral = matorralPts.length;
    shrubExtVerde = matricesVerde(matorralPts.filter((_, i) => i % 5 < 3),
      { hBajo: 1.2, hAlto: 2.4, alturaNatural: shrubBake.alturaNatural, sink: 0.15 });
    romExtVerde = matricesVerde(matorralPts.filter((_, i) => i % 5 >= 3),
      { hBajo: 1.0, hAlto: 1.8, alturaNatural: romBake.alturaNatural, sink: 0.15 });
    // (5) gramínea de ladera: los puntos se siembran acá (PRNG propio) y el
    // parche se crea al final del módulo junto a los otros tres
    pastoLaderaPts = scatterVerde(900, (x, y, z, s) =>
      z > -700 && z < -120 && elevOf(y) > 2350 && elevOf(y) < 2900 && s > 0.55 && s < 1.3 &&
      !inCorridor(x, z) && !nearCam(x, z) && lejosDeCauces(x, z));
    censoVerdeExt.pasto = pastoLaderaPts.length;
  }
  // sonda del gate: conteos reales sembrados (¿el guard del scatter llenó?)
  window.__verdeExt = censoVerdeExt;

  // Un lote por silueta: la misma forma conserva su diversidad en cerca/lejos,
  // pero no paga una draw call por rodal. La visibilidad en el mundo páramo se
  // conserva por `floraValleBosque`, no por el nombre de la malla.
  bosqueBakes.forEach((bake) => instanciarSilueta(bake, 'flora-bosque', bake.clave));
  bosqueLejosBakes.forEach((bake) => instanciarSilueta(bake, 'flora-bosque-lejos', bake.clave));
  instanciarSilueta(oroBake, 'flora-bosque', 'guayacan-amarillo');
  instanciarSilueta(chachaBake, 'flora-bosque', 'chachafruto');
  instTroncosRodal([...nearTroncos, ...pastTree.matrices, ...farTroncos, ...troncosVerde], 'flora-bosque-troncos');

  // (el bosque aferrado a la pared vive en cliff.js, pegado a la cara paramétrica)

  // ── páramo hacia el filo: frailejones + pajonal ──
  // los canales del agua (La Chorrera y El Chiflón) van LIMPIOS de páramo:
  // en la roca lavada del cauce no crece frailejón ni pajonal
  const lejosDelAgua = (x) => Math.abs(x - CHANNEL_X) > 70 && Math.abs(x - CHIFLON_X) > 90;
  const frailePts = scatter(420, (x, y, z, s) => elevOf(y) > 3040 && s < 0.5 && -z > 860 && lejosDelAgua(x));
  // FOLLAJE-MASA: frailejón = roseta caulescente Espeletia (gate 8/10) — tronco
  // de necromasa + roseta de palas lanceoladas plateadas, TODO horneado junto en
  // una geo (masa densa doble). NO un cono de 6 caras. Un solo InstancedMesh.
  // Altura natural del arquetipo ~3,4 m → escalado a 1,6–2,8 m (frailejón real).
  const fraileMats = matricesMasa(frailePts, { hBajo: 1.6, hAlto: 2.8, alturaNatural: fraileBake.alturaNatural, sink: 0.15 });
  const frailes = instConMatrices(fraileBake.geo, fraileBake.mat, fraileMats);
  frailes.name = 'flora-frailes';               // ?mundo=paramo los apaga (pone los suyos)
  group.add(frailes);

  const pajPts = scatter(900, (x, y, z, s) => elevOf(y) > 2990 && s < 0.6 && -z > 840 && lejosDelAgua(x));
  // FOLLAJE-MASA: pajonal = macolla de MASA herbácea ocre-verdosa (Calamagrostis
  // /Festuca, pajonal páramo NATIVO) — NO un cono de 4 caras. Baja y ancha.
  const pajMats = matricesMasa(pajPts, { hBajo: 0.9, hAlto: 1.7, alturaNatural: pajBake.alturaNatural, sink: 0.1 });
  const pajaNuc = instConMatrices(pajBake.geoNucleo, pajBake.matNucleo, pajMats);
  const pajaCards = instConMatrices(pajBake.geoCards, pajBake.matCards, pajMats);
  pajaNuc.name = 'flora-paja';      // ?mundo=paramo la apaga (pone macollas)
  pajaCards.name = 'flora-paja-cards';
  group.add(pajaNuc, pajaCards);

  // romero de páramo: mata baja, oscura, entre el pajonal (>3000 m)
  const romPts = scatter(300, (x, y, z, s) => elevOf(y) > 3010 && s < 0.55 && -z > 850 && lejosDelAgua(x));
  // FOLLAJE-MASA: romero de páramo = mata baja oscura DENSA (Diplostephium) — NO icosaedro.
  // (+ romExtVerde: el romero de ladera de la extensión verde entra al MISMO
  //  lote instanciado — cero draw calls nuevos)
  const romMats = [...matricesMasa(romPts, { hBajo: 0.7, hAlto: 1.2, alturaNatural: romBake.alturaNatural, sink: 0.1 }), ...romExtVerde];
  group.add(
    instConMatrices(romBake.geoNucleo, romBake.matNucleo, romMats),
    instConMatrices(romBake.geoCards, romBake.matCards, romMats),
  );

  // ── chusque y matorral: textura del potrero cercano ──
  const shrubPts = [];
  let sg = 40000;
  while (shrubPts.length < 520 && sg-- > 0) {
    const x = -380 + Math.random() * 760;
    const z = -280 + Math.random() * 380;
    if (nearCam(x, z)) continue;
    if (Math.abs(x + 45) < 55 && z < 10) continue; // corredor limpio
    if (z > 55 && z < 265 && x > -85 && x < 35) continue; // potrero trasero limpio
    const y = height(x, z);
    const s = slopeAt(x, z);
    if (elevOf(y) > 2360 && elevOf(y) < 2680 && s < 0.6) shrubPts.push({ x, y, z, s });
  }
  // FOLLAJE-MASA: chusque/matorral = mata verde DENSA achatada — NO icosaedro.
  // (+ shrubExtVerde: el chusque de ladera de la extensión verde, mismo lote)
  const shrubMats = [...matricesMasa(shrubPts, { hBajo: 0.7, hAlto: 1.5, alturaNatural: shrubBake.alturaNatural, sink: 0.1 }), ...shrubExtVerde];
  group.add(
    instConMatrices(shrubBake.geoNucleo, shrubBake.matNucleo, shrubMats),
    instConMatrices(shrubBake.geoCards, shrubBake.matCards, shrubMats),
  );

  // ── rodal PROTAGONISTA de palmas de cera, silueta contra la niebla (Zelda) ──
  // ARMONÍA DE ESCALA (2026-07-31): mismo top natural 19,8 u que las palmas
  // normales — con sc=2.0 daba 66 m (un edificio). Factor 0,4092 deja el tope
  // (sc=2.0) en 27 m, coherente con el resto del rodal y el tope pedido.
  const heroPalms = [
    { x: -215, z: -235, sc: 0.82 }, { x: -238, z: -262, sc: 0.70 }, { x: -196, z: -270, sc: 0.78 },
    { x: -256, z: -228, sc: 0.61 }, { x: -222, z: -298, sc: 0.74 }, { x: -180, z: -240, sc: 0.57 },
    { x: -262, z: -288, sc: 0.65 },
  ];
  const hpTrunks = new THREE.InstancedMesh(palmTrunkGeo, palmTrunkMat, heroPalms.length);
  const hpCrowns = new THREE.InstancedMesh(crownGeo, crownMat, heroPalms.length);
  heroPalms.forEach((p, i) => {
    const y = height(p.x, p.z);
    _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
    _m4.compose(new THREE.Vector3(p.x, y - 0.3, p.z), _q, new THREE.Vector3(p.sc, p.sc * (1 + Math.random() * 0.3), p.sc));
    hpTrunks.setMatrixAt(i, _m4);
    hpCrowns.setMatrixAt(i, _m4);
    _c.set(0x3d5a2e).offsetHSL((Math.random() - 0.5) * 0.03, 0, (Math.random() - 0.5) * 0.05);
    hpCrowns.setColorAt(i, _c);
  });
  hpTrunks.instanceMatrix.needsUpdate = true;
  hpCrowns.instanceMatrix.needsUpdate = true;
  group.add(hpTrunks, hpCrowns);

  // ── árboles del sitio: robles grandes que enmarcan los BORDES (Zelda) ──
  // + los árboles de coacha FLANQUEANDO el domo a los DOS lados (cabana-real2:
  // a los lados del domo no hay montaña — hay árboles grandes) y la cresta
  // ⚠️ van RELATIVOS al sitio (flanquean el domo): con la casa re-ubicada por
  // la rotación, hornear x/z absolutos los dejaba plantados a 470 m de ella.
  // ARMONÍA DE ESCALA (2026-07-31): top natural de canopyGeo = 8,385 u — con
  // sc=2.9 la coacha izquierda del domo medía 40,5 m (competía con el domo y
  // hasta con el cerro). Factor 0,6169 deja el máximo (la coacha) en 25 m,
  // el tope de "emergente" pedido, con el domo (10 m) todavía por debajo
  // pero ya prominente contra la cabaña.
  // EZ-TREE (2026-08-02): los árboles-héroe pasan de copa-lóbulo instanciada a
  // encenillos ez-tree COMPLETOS (esqueleto recursivo + copa de hojas ricas).
  // Son ~7, primer plano — el costo (7 Tree = 14 draw calls, ~35k tri) es
  // trivial y ahí la silueta es lo que más se ve. Cada Tree es individual, así
  // conserva su propio meneo de viento (a diferencia de instanciar, que
  // sincroniza el shader). La ESCALA respeta el mapeo Box3 previo: la coacha
  // (sc=1.79) medía 25 m → factor metros = 25/1.79 = 13.966 m por unidad de sc.
  // GUAYACANES HÉROE (2026-08-02): antes TODOS eran roble_negro (verde plano,
  // sin vida). El operador pidió incluir "los guayacanes que se ven bien". Los
  // árboles que FLANQUEAN el domo y enmarcan el sitio son lo primero que se ve
  // en ?cam=site — ahí van los guayacanes en floración (rosa/oro) para que el
  // valle lea VIVO y con color, no un manto verde. Se conservan dos robles de
  // masa verde en los flancos exteriores para que el color sea acento, no chillón.
  const heroTrees = [
    { x: -175, z: -30, sc: 1.48, esp: 'roble_negro' },         // borde izquierdo lejano: masa verde
    { x: 46, z: 92, sc: 0.68, esp: 'guayacan_amarillo' },      // primer plano derecho: ORO de acento
    { x: -42, z: 118, sc: 1.36, esp: 'roble_negro' },          // borde trasero: masa verde
    { x: 58, z: 46, sc: 1.17, esp: 'guayacan_rosado' },        // flanco derecho: ROSA
    { x: -52, z: 46, sc: 0.70, esp: 'guayacan_rosado' },       // coacha IZQUIERDA del domo: ROSA de acento
    { x: -8, z: 32, sc: 0.50, esp: 'guayacan_amarillo' },      // coacha DERECHA del domo: ORO de acento
    { x: -62, z: -20, sc: 1.11, esp: 'roble_negro' },          // árbol de la cresta, junto al carro: verde
  ].map((t) => ({ ...t, x: t.x + (SITE_X + 30), z: t.z + (SITE_Z - 40) }));
  const M_POR_SC = 25 / 1.79;   // altura objetivo en metros por unidad de sc (Box3)
  const heroesGrupo = new THREE.Group();
  heroesGrupo.name = 'flora-heroes-eztree';
  heroTrees.forEach((t) => {
    // Guayacanes HÉROE: copa de MASA densa florecida (rosa/oro) sobre el
    // esqueleto ez-tree (tronco + ramas visibles), NO las cartas facetadas del
    // ez-tree (2026-08-04, gate Humboldt: eran el peor low-poly de la escena, en
    // primer plano junto a la casa). Los robles siguen ez-tree (masa verde de
    // fondo, acento). Ver crearHeroeMasa en flora-eztree-bake.js.
    const esMasa = t.esp === 'guayacan_rosado' || t.esp === 'guayacan_amarillo';
    // Primer plano: tarjetas más pequeñas y solapadas leen como grano continuo
    // de hojas, no como parches grandes sobre un núcleo liso tipo algodón.
    const arbol = esMasa ? crearHeroeMasa(t.esp, { tamCard: 0.62 }) : crearHeroe(t.esp);
    arbol.rotation.y = Math.random() * Math.PI * 2;
    // escalar el Tree para que su altura natural quede en la altura-objetivo del
    // héroe (mismo tamaño en metros que la copa-lóbulo anterior).
    const box = new THREE.Box3().setFromObject(arbol);
    const alturaNatural = Math.max(0.001, box.max.y - box.min.y);
    // VIENTO EN LOS ROBLES-HÉROE (2026-08-11, regla dura: TODA la flora se mece).
    // El ez-tree trae su propio shader de viento, pero el valle NUNCA llama
    // tree.update(t): su uTime vive clavado en 0 y la copa quedaba CONGELADA en
    // una pose torcida (el F17 dio por bueno «cada Tree conserva su propio
    // meneo» — no, no se tickeaba). Se parchea el material de hojas con el MISMO
    // reloj global uTiempoVM que menea pasto y copas de masa (aplicarVientoMundo):
    // las hojas ondulan con la misma ráfaga y el esqueleto queda quieto (un
    // tronco que se dobla desde la raíz lee gelatina). `transformed.y` está en
    // unidades LOCALES del bake (pre-escala del grupo): piso = 30% de la altura
    // natural, así las hojas bajas casi no se mueven y la copa se dobla.
    if (!esMasa && arbol.leavesMesh && arbol.leavesMesh.material) {
      aplicarVientoMundo(arbol.leavesMesh.material, { amplitud: 0.035, piso: alturaNatural * 0.30, velocidad: 0.9 });
    }
    const alturaObjetivo = t.sc * M_POR_SC;
    const k = alturaObjetivo / alturaNatural;
    arbol.scale.setScalar(k);
    const y = height(t.x, t.z);
    arbol.position.set(t.x, y - 0.3, t.z);
    heroesGrupo.add(arbol);
  });
  group.add(heroesGrupo);

  // ── PASTO DE MASA (Quick_Grass) en 3 zonas ─────────────────────────────────
  // Reemplaza el suelo pelado / cartelitos por MASA de gramínea que se mece con
  // la MISMA ráfaga global (uTiempoVM) que las copas. Cada zona = 1 InstancedMesh
  // (1 draw call), con `densidad` briznas por punto → mata densa, no palito.
  // Se añaden a `scene` (no a `group`) para que su material ShaderMaterial no
  // herede transformaciones del grupo; igual quedan clavadas al terreno por su
  // matriz por-brizna. Nombrados para poder apagarlos desde paramo.js si hiciera
  // falta (arriba de 3000 m el potrero/sotobosque no aplican).
  const pastoParches = [];

  // ── A3 (2026-08-11): VIENTO COHERENTE en el pasto del valle ────────────────
  // Los 3 parches pasan al modo `vientoCoherente` de quickGrass (three-stylized,
  // MIT): la onda viaja por el MUNDO con la misma dirección/frecuencia que las
  // copas (uDirVM/uFrecVM compartidos) — pasto y árboles bajo UN campo de
  // viento, no ruido por-brizna. La amplitud va en METROS de mundo (vientoAmp),
  // ya no escalada por el ancho de la brizna. Backlight 3-factores con el sol
  // REAL del valle: amanecer rasante de atmosphere.js (φ=83.5° θ=14° +cruce
  // x/y de la DirectionalLight) ≈ (0.71, 0.17, 0.69) normalizado — a contraluz
  // (?cam=site mirando al cañón) las puntas se encienden.
  const SOL_VALLE = [0.71, 0.17, 0.69];
  // PRNG local sembrado (mulberry32 con floraSeed): el POTRERO se siembra
  // determinista — misma carga, mismo potrero (doctrina de semilla del steal).
  // scatter() global sigue SIN semilla a propósito: es decisión pendiente del
  // operador (afecta a todo el bosque, no solo al pasto).
  const prandPasto = ((a) => () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  })(floraSeed ^ 0x9e3779b9);

  // (1) PAJONAL DEL PÁRAMO — tinte ocre-verdoso (Calamagrostis/Festuca, gramínea
  // altoandina NATIVA). Va ENTRE las macollas de pajonal ya sembradas (>2990 m),
  // lejos del agua. Briznas más altas y secas (páramo ventoso). Comparte los
  // mismos puntos-base que el pajonal de masa para que el manto sea coherente.
  const pastoParamoPts = scatter(1600, (x, y, z, s) =>
    elevOf(y) > 2980 && s < 0.62 && -z > 820 && lejosDelAgua(x));
  pastoParches.push(crearParchePasto(scene, {
    puntos: pastoParamoPts, densidad: 9, densidadEn: (pt) => 2 + Math.round(7 * rel(pt.x, pt.z, pt.s).rel), radio: 2.4,
    altura: [0.9, 1.9], ancho: 0.14, segmentos: 5,
    colorBase: '#6f7a3c', colorPunta: '#c2b56a',   // ocre-verdoso → punta seca
    tinteJitter: 0.16, viento: 1.25, combado: 0.42,
    vientoCoherente: true, vientoAmp: 0.22,        // brizna alta de páramo ventoso
    backlight: 0.5, backlightColor: '#e6d27a', backlightDir: SOL_VALLE,
    semilla: floraSeed,
    name: 'pasto-pajonal-paramo',
  }));

  // (2) POTRERO DEL DECK — hoy suelo pelado. Pasto verde de potrero (kikuyo NO:
  // gramínea nativa de potrero altoandino, verde franco). Cubre la pradera
  // abierta del fondo del cañón (2360–2680 m, pendiente baja), EVITANDO el
  // corredor visual, el despeje de la casa y el potrero trasero limpio (que es
  // eje de la vista ?cam=back). Briznas medianas, verdes, mansas.
  // El potrero es el suelo pelado que se ve en ?cam=site / ?cam=back: la pradera
  // ALREDEDOR de la casa. Antes se dejaba pelado a propósito, pero el pedido es
  // JUSTO cubrirlo con pasto de MASA. Se cubre en anillo alrededor del sitio,
  // dejando limpio SOLO el footprint de la casa/deck (radio 22) y el corredor
  // visual hacia el cañón. El pasto es BAJO (pradera segada) para no tapar el
  // domo ni la huerta — cubre el pelado sin bloquear la lectura.
  const pastoPotreroPts = [];
  let pg = 140000;
  while (pastoPotreroPts.length < 3200 && pg-- > 0) {
    // prandPasto (no Math.random): el potrero es DETERMINISTA por floraSeed —
    // dos cargas dan el mismo potrero y el gate de movimiento no mide lotería.
    const x = -260 + prandPasto() * 520;
    const z = -260 + prandPasto() * 420;   // incluye z>0 (delante del deck, hacia el ojo)
    if (Math.hypot(x - SITE_X, z - SITE_Z) < 22) continue;         // solo el footprint de la casa/deck
    if (inCorridor(x, z)) continue;                                // corredor visual limpio
    const y = height(x, z);
    const sl = slopeAt(x, z);
    if (elevOf(y) > 2300 && elevOf(y) < 2720 && sl < 0.42) {
      const d = dirtAmount(x, z, sl);
      if (d < 0.62) pastoPotreroPts.push({ x, y, z, s: sl, d });   // tierra pelada: no nace pasto
    }
  }
  pastoParches.push(crearParchePasto(scene, {
    // radio 1.9→1.2 + más briznas por punto (A3): con 10 briznas regadas en
    // r=1.9 m cada una quedaba a ~1 m de la otra — PALITOS SUELTOS contables,
    // contra la doctrina del módulo («mata, no palito suelto») y la regla de
    // masa Humboldt. Macolla apretada = mata legible, mismo conteo de puntos.
    puntos: pastoPotreroPts, densidad: 14, densidadEn: (pt) => 4 + Math.round(10 * rel(pt.x, pt.z, pt.s).rel), radio: 1.2,
    altura: [0.5, 1.0], ancho: 0.11, segmentos: 5,
    colorBase: '#3f6a2c', colorPunta: '#86a83e',   // verde franco de potrero
    tinteJitter: 0.14, viento: 0.95, combado: 0.36,
    vientoCoherente: true, vientoAmp: 0.10,        // pradera baja: meneo manso
    backlight: 0.3, backlightColor: '#cfe07a', backlightDir: SOL_VALLE,
    semilla: floraSeed,
    // COBERTURA (steal): raleo SUAVE hacia la tierra pelada/caminos — antes el
    // corte era binario en d=0.62 (borde de alfombra); ahora la densidad cae
    // con la máscara remapeada, y sobre el camino no nace ninguna.
    cobertura: { muestra: (pt) => 1 - pt.d / 0.62, potencia: 0.6 },
    name: 'pasto-potrero-deck',
  }));

  // (3) SOTOBOSQUE — pasto RALO bajo el bosque (menos densidad, más oscuro por
  // la sombra del dosel). Va donde hay canopy (mismo rango del bosque de valle),
  // pendiente moderada, lejos del corredor. Briznas cortas y más oscuras.
  const pastoSotoPts = scatter(700, (x, y, z, s) =>
    elevOf(y) > 2150 && elevOf(y) < 2820 && s < 0.7 && z > -700 && z < -120 &&
    !inCorridor(x, z) && !inChorrera(x, z) && !nearCam(x, z) &&
    (fbm(x / 200 + 9, z / 200 + 9, 3) * 0.5 + 0.5) > 0.5);
  pastoParches.push(crearParchePasto(scene, {
    puntos: pastoSotoPts, densidad: 6, densidadEn: (pt) => 1 + Math.round(5 * rel(pt.x, pt.z, pt.s).rel), radio: 1.8,
    altura: [0.4, 0.85], ancho: 0.09, segmentos: 4,
    colorBase: '#2e4a22', colorPunta: '#547033',   // verde oscuro de sombra
    tinteJitter: 0.14, viento: 0.7, combado: 0.5,   // ralo, más doblado (poca luz)
    vientoCoherente: true, vientoAmp: 0.07,        // bajo el dosel el viento llega filtrado
    backlight: 0.12, backlightColor: '#8fae56', backlightDir: SOL_VALLE,
    semilla: floraSeed,
    name: 'pasto-sotobosque',
  }));

  // (EXTENSIÓN VERDE) gramínea de ladera: cubre el suelo entre los rodales
  // nuevos con la MISMA brizna nativa y el MISMO reloj de viento del valle.
  if (pastoLaderaPts.length) {
    pastoParches.push(crearParchePasto(scene, {
      puntos: pastoLaderaPts, densidad: 8, densidadEn: (pt) => 3 + Math.round(5 * rel(pt.x, pt.z, pt.s).rel), radio: 2.0,
      altura: [0.7, 1.4], ancho: 0.12, segmentos: 5,
      colorBase: '#41652e', colorPunta: '#7f9c3c',   // verde de ladera húmeda
      tinteJitter: 0.15, viento: 1.05, combado: 0.44,
      vientoCoherente: true, vientoAmp: 0.16,
      backlight: 0.35, backlightColor: '#cfe07a', backlightDir: SOL_VALLE,
      semilla: floraSeed ^ 0x5eed,
      name: 'pasto-ladera-verde',
    }));
  }

  scene.add(group);
  return { group, pastoParches };
}
