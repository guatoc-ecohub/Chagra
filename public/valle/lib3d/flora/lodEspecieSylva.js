// ── lib3d/flora/lodEspecieSylva.js ────────────────────────────────────────────
// Batch + instancing por LOD y especie (Sylva s48).
//
// Qué emula: en Sylva (realistic-forest, github.com/Token-Gremlin/realistic-forest,
// MIT © 2026 Token Gremlin; notice retenido en lib3d/flora/LICENSE-sylva-MIT) los
// árboles NO se dibujan con una malla por individuo ni con una malla por rodal:
// cada (especie × LOD) es UN draw instanciado (Trees.js `_makeDraws` → un
// InstancedBufferGeometry por variante-LOD, y todos los individuos de esa especie
// que en pantalla caen a ese LOD escriben su instancia en el MISMO bucket). El
// reparto es en vivo por altura proyectada en píxeles (no por distancia sola) con
// histéresis, y el número de draws queda FIJO = N_especies × N_LOD, no crece con
// la cantidad de rodales ni de individuos. Sylva además conserva la MEZCLA de
// especies hasta el fondo: cada especie llega lejos porque tiene sus propios
// LODs, no se la elimina de la franja distante por "no lee a esa distancia".
//
// En el valle la copa-masa ya se instancia UNA vez por arquetipo con la
// acumulación de rodales (flora.js `matricesPorSilueta`), pero cada arquetipo
// vive a UN solo nivel de bake (full para la banda cercana, `lejos` para la
// lejana) y el rodal lejano solo conserva DOS especies. Este módulo formaliza
// el lote por (especie × nivel): hornea cada especie a sus tres niveles
// (bakearArbolMasa `nivel`, Sylva s47) y reparte CADA individuo en vivo al
// nivel que su tamaño en pantalla justifica, con histéresis.
//
// Dos brazos para el A/B, mismísimos árboles y matrices:
//   · modo 'rodal'   (A): un InstancedMesh por (población × especie) con UN
//     bake por población — la arquitectura "un draw call por rodal" previa al
//     lote. El conteo de draws crece con las poblaciones.
//   · modo 'batch'   (B): un InstancedMesh por (especie × nivel). Fijo. Cada
//     árbol se reubica entre niveles cuando su altura en píxeles cruza un
//     umbral (histéresis), como la asignación en vivo de Sylva.
// La implementación es emulación original sobre los rangos reales del valle
// (fusionarCopaMasa/materialCopaMasaInstanciada/bakearArbolMasa); no se portó
// código ni shader literal de Sylva. No se agregó dependencia.
import * as THREE from 'three';
import { bakearArbolMasa } from '../../flora-eztree-bake.js';
import { fusionarCopaMasa, materialCopaMasaInstanciada } from '../../flora.js';

export const NIVELES_SYLVA = ['full', 'mid', 'lejos'];

// Las cuatro siluetas nativas que el valle mezcla en su bosque altoandino
// (flora.js perfilesBosque, s41): cada una con su firma de copa (ancho/fondo).
export const PERFILES_BOSQUE_S48 = [
  { clave: 'roble_negro', tono: '#315b2b', claro: '#5d8140', oscuro: '#1b351b', ancho: 1.26, profundidad: 1.16 },
  { clave: 'encenillo', tono: '#3d6d32', claro: '#6e9145', oscuro: '#203e20', ancho: 0.84, profundidad: 0.88 },
  { clave: 'aliso_andino', tono: '#477b3d', claro: '#7aa34f', oscuro: '#294d27', ancho: 0.72, profundidad: 0.82 },
  { clave: 'nogal_andino', tono: '#356b35', claro: '#65934b', oscuro: '#1d4124', ancho: 1.14, profundidad: 1.06 },
];

// Umbrales de altura proyectada (px) con histéresis — los mismos del banco
// s47, elegidos contra el presupuesto de la copa-masa del valle.
export function umbralesPx(q = {}) {
  return {
    fullEnter: Number(q.get('fullEnter')) || 230,
    fullExit: Number(q.get('fullExit')) || 170,
    midEnter: Number(q.get('midEnter')) || 95,
    midExit: Number(q.get('midExit')) || 55,
  };
}

// Las poblaciones del rodal = franjas radiales concéntricas, cada una con su
// rango de altura en metros. En el brazo 'rodal' cada franja dibuja la especie
// con UN solo nivel de bake (`nivel`), como hoy el valle separa su banda
// cercana (full) de la lejana (`lejos`).
export const BANDAS_POR_DEFECTO = [
  { desde: 18, hasta: 60, nivel: 'full', hBajo: 6, hAlto: 10, n: 80 },
  { desde: 60, hasta: 120, nivel: 'full', hBajo: 7, hAlto: 12, n: 180 },
  { desde: 120, hasta: 210, nivel: 'full', hBajo: 8, hAlto: 14, n: 280 },
  { desde: 210, hasta: 330, nivel: 'lejos', hBajo: 9, hAlto: 16, n: 360 },
  { desde: 330, hasta: 500, nivel: 'lejos', hBajo: 10, hAlto: 18, n: 480 },
];

export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Hornea las especies a los tres niveles de bake y las fusiona/instancia
// (geo = fusionarCopaMasa, mat = materialCopaMasaInstanciada — código real del
// valle). Misma seed de esqueleto por especie en los tres niveles → la MISMA
// silueta (los lóbulos), solo cambia el presupuesto de cards/núcleo (s47).
export function bakearLodPorEspecie({ especies, seed = 20027 } = {}) {
  const lista = (especies && especies.length ? especies : PERFILES_BOSQUE_S48);
  const porEspecie = new Map();
  const trisPorNivel = {};
  for (const [i, sp] of lista.entries()) {
    const niveles = {};
    for (const nivel of NIVELES_SYLVA) {
      const bake = bakearArbolMasa(sp.clave, {
        tono: sp.tono, claro: sp.claro, oscuro: sp.oscuro,
        seed: seed + 811 + i, nivel,
      });
      const geo = fusionarCopaMasa(bake);
      trisPorNivel[nivel] = (trisPorNivel[nivel] ?? 0) + geo.attributes.position.count / 3;
      niveles[nivel] = { bake, geo, mat: materialCopaMasaInstanciada(bake) };
    }
    porEspecie.set(sp.clave, { perfil: sp, niveles });
  }
  return { porEspecie, trisPorNivel };
}

// Población determinista del rodal (mismos árboles entre brazos): PRNG
// mulberry32 sembrado + distribución uniforme por área en cada franja.
// Cada árbol: { banda, sp, x, z, hm, giro } (la matriz se compone después con
// el perfil de copa de su especie). Devuelve { arboles, porBanda }.
export function poblarRodales({ seed = 20027, bandas = BANDAS_POR_DEFECTO, especies = PERFILES_BOSQUE_S48 } = {}) {
  const porIndice = (i, sal) => mulberry32((seed + 0x9e3779b9 * i + 0x85ebca6b * sal) >>> 0)();
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const arboles = [];
  const porBanda = [];
  let indiceGlobal = 0;
  bandas.forEach((b, bi) => {
    const lista = [];
    for (let k = 0; k < b.n; k++) {
      const r = b.desde + (b.hasta - b.desde) * Math.sqrt(porIndice(indiceGlobal, 1));
      const a = (k + 0.5) * GOLDEN + porIndice(indiceGlobal, 3) * 0.35;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const hm = b.hBajo + porIndice(indiceGlobal, 6) * (b.hAlto - b.hBajo);
      const sp = especies[Math.floor(porIndice(indiceGlobal, 9) * especies.length)].clave;
      const giro = porIndice(indiceGlobal, 11) * Math.PI * 2;
      arboles.push({ banda: bi, sp, x, z, hm, giro });
      lista.push(arboles.length - 1);
      indiceGlobal++;
    }
    porBanda.push(lista);
  });
  return { arboles, porBanda };
}

// Compone la Matrix4 mundo de cada árbol (pie en y=0; luego se hunde en el
// terreno). La altura la escala a metros reales (Box3 → hm), y el ancho/fondo
// reproducen la firma de copa de la especie.
export function componerMatrices(THREE, arboles, porEspecie) {
  const _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _m = new THREE.Matrix4();
  const eje = new THREE.Vector3(0, 1, 0);
  const matrices = new Array(arboles.length);
  arboles.forEach((t, i) => {
    const info = porEspecie.get(t.sp);
    const perfil = info.perfil;
    const k = t.hm / info.niveles.full.bake.alturaNatural;
    _q.setFromAxisAngle(eje, t.giro);
    _s.set(k * perfil.ancho, k * (0.9 + Math.sin(t.giro * 7.13) * 0.1), k * perfil.profundidad);
    _v.set(t.x, -0.3, t.z);
    matrices[i] = _m.compose(_v, _q, _s).clone();
  });
  return matrices;
}

// Altura proyectada del árbol en píxeles verticales del framebuffer (misma
// forma que lib/impostor-lod.js `tamanoEnPixeles` y que el banco s47:
// profundidad de cámara, focalPx desde la proyección y el alto real del
// drawingBuffer). Detrás del near → 0 (no ocupa píxeles visibles).
export function alturaEnPixelesDe(t, camera, drawingBufferY) {
  if (!t._p) {
    t._p = new THREE.Vector3();
    t._p.set(t.x, t.hm * 0.5, t.z);
  }
  const v = t._p.clone().applyMatrix4(camera.matrixWorldInverse);
  if (v.z >= -camera.near) return 0;
  const focalPx = drawingBufferY * 0.5 * Math.abs(camera.projectionMatrix.elements[5]);
  return t.hm * focalPx / (-v.z);
}

// ── BRAZO A 'rodal': un InstancedMesh por (población × especie), cada población
// con UN solo nivel de bake. El conteo de copas = bandas × especies (fijo, no
// sigue en vivo al individuo). Devuelve { group, copas } para medir.
export function montarRodal(THREE, { porEspecie, bandas = BANDAS_POR_DEFECTO, especies = PERFILES_BOSQUE_S48, arboles, porBanda, matrices }) {
  const group = new THREE.Group();
  const copas = [];
  bandas.forEach((b, bi) => {
    especies.forEach((sp, si) => {
      const nivel = b.nivel;
      const info = porEspecie.get(sp.clave);
      const mesh = new THREE.InstancedMesh(info.niveles[nivel].geo, info.niveles[nivel].mat, b.n);
      let cnt = 0;
      for (const idx of porBanda[bi]) {
        if (arboles[idx].sp !== sp.clave) continue;
        mesh.setMatrixAt(cnt++, matrices[idx]);
      }
      mesh.count = cnt;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      mesh.name = `rodal-b${bi}-s${si}-${nivel}`;
      mesh.userData.s48 = { banda: bi, especie: sp.clave, nivel, instancias: cnt };
      mesh.visible = cnt > 0;
      group.add(mesh);
      copas.push(mesh);
    });
  });
  return { group, copas };
}

// ── BRAZO B 'batch': un InstancedMesh por (especie × nivel), F IJO. Cada árbol
// escribe su matriz en el lote que le toca por altura proyectada en px y se
// reubica con histéresis cuando la cámara se mueve. Devuelve { group, copas,
// sincronizar, activa }. `umbrales` = {fullEnter,...} de umbralesPx().
export function montarBatch(THREE, { porEspecie, especies = PERFILES_BOSQUE_S48, arboles, matrices, umbrales }) {
  const group = new THREE.Group();
  const copas = {};
  const porNivel = { full: [], mid: [], lejos: [] };
  const nivelDe = new Int8Array(arboles.length).fill(2);
  for (const sp of especies) {
    copas[sp.clave] = {};
    for (const nivel of NIVELES_SYLVA) {
      const mesh = new THREE.InstancedMesh(
        porEspecie.get(sp.clave).niveles[nivel].geo,
        porEspecie.get(sp.clave).niveles[nivel].mat,
        arboles.length,
      );
      mesh.count = 0;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      mesh.visible = false;
      mesh.name = `batch-${sp.clave}-${nivel}`;
      mesh.userData.s48 = { especie: sp.clave, nivel, instancias: 0 };
      group.add(mesh);
      copas[sp.clave][nivel] = mesh;
    }
  }
  const _tmp = new THREE.Matrix4();

  function sincronizar(camera, drawingBufferY, forzar) {
    for (const sp of especies) {
      for (const nivel of NIVELES_SYLVA) copas[sp.clave][nivel].count = 0;
    }
    for (const nivel of NIVELES_SYLVA) porNivel[nivel].length = 0;
    for (let i = 0; i < arboles.length; i++) {
      const t = arboles[i];
      const px = alturaEnPixelesDe(t, camera, drawingBufferY);
      let nivel;
      if (forzar) {
        nivel = px >= umbrales.fullEnter ? 0 : (px >= umbrales.midEnter ? 1 : 2);
        nivelDe[i] = nivel;
      } else {
        const actual = nivelDe[i];
        if (actual === 0) nivel = px < umbrales.fullExit ? (px > umbrales.midEnter ? 1 : 2) : 0;
        else if (actual === 1) nivel = px > umbrales.fullEnter ? 0 : (px < umbrales.midExit ? 2 : 1);
        else nivel = px > umbrales.fullEnter ? 0 : (px > umbrales.midEnter ? 1 : 2);
        nivelDe[i] = nivel;
      }
      const mesh = copas[t.sp][NIVELES_SYLVA[nivel]];
      mesh.setMatrixAt(mesh.count, matrices[i]);
      mesh.count++;
      porNivel[NIVELES_SYLVA[nivel]].push(i);
    }
    for (const sp of especies) {
      for (const nivel of NIVELES_SYLVA) {
        const mesh = copas[sp.clave][nivel];
        mesh.instanceMatrix.needsUpdate = true;
        mesh.visible = mesh.count > 0;
        mesh.userData.s48.instancias = mesh.count;
      }
    }
  }
  return { group, copas, sincronizar, nivelDe, porNivel };
}
