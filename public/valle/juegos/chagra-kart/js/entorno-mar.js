// ── entorno-mar.js — el MISMO circuito del chagra-kart, corriendo EN EL MAR ─
// Reemplaza a entorno.js (páramo) con la MISMA interfaz que consume main.js
// ({ actualizar, luzSol, sky }), pero el mundo es océano:
//   · Océano FFT + swell Gerstner analítico compartido GPU↔CPU
//     (mar-capa.js) — el mismo mar GPU-verificado anti-mareo del 3d-mar-kart.
//   · Cielo tropical procedural con horizonte nítido (la referencia visual
//     que el anti-mareo exige).
//   · La PISTA se marca con BIODIVERSIDAD, no con conos: boyas que delimitan
//     el borde jugable (donde fisica.js ya frena de verdad), bosques de algas
//     (kelp procedural que ondula), rocas de arrecife y cabezas de coral.
//     Todo instanciado: ~6 draw calls extra (doctrina móvil Mali-G78).
//
// Las 5 zonas del circuito (pista.ZON) pasan de pisos térmicos a hábitats:
// 0 Mar abierto · 1 Arrecife · 2 Bosque de algas · 3 Aguas de coral · 4 Puerto.

import { OceanFFT } from './mar/ocean/OceanFFT.js';
import { MarMesh } from './mar/ocean/MarMesh.js';
import { crearCielo } from './mar/cielo.js';
import { iniciarCapaMar, capaMar, olaAltura } from './mar/mar-capa.js';
// [CERO LOW-POLY] arte real del mar: rocas esculpidas suaves, corales
// orgánicos, kelp con lámina dibujada e islas con copa MASA de lib3d.
import {
  geoRocaMarina, materialRoca, geoCoralCabeza, geoCoralRamas, materialCoral,
  texturaKelp, geoKelpCruzada, crearIsla, fusionarConColor,
} from './mar-biodiversidad.js';
import { tickVientoMundos } from '../../../lib3d/flora/vientoMundos.js';

function rand(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function crearEntornoMar(THREE, pista, cfg = {}) {
  const escena = cfg.escena;
  const renderer = cfg.renderer;
  const capa = iniciarCapaMar(THREE);

  // ── sol y luces (mismo sol que el mar F1 verificado) ──────────────────────
  const elv = 0.62, az = 0.95;
  const sunDir = new THREE.Vector3(
    Math.cos(az) * Math.cos(elv), Math.sin(elv), Math.sin(az) * Math.cos(elv),
  ).normalize();
  const luzSol = new THREE.DirectionalLight(0xfff4e0, cfg.movil ? 2.0 : 2.2);
  luzSol.position.copy(sunDir).multiplyScalar(160);
  if (cfg.sombras) {
    luzSol.castShadow = true;
    luzSol.shadow.mapSize.set(cfg.sombraRes || 2048, cfg.sombraRes || 2048);
    luzSol.shadow.camera.left = -60; luzSol.shadow.camera.right = 60;
    luzSol.shadow.camera.top = 60; luzSol.shadow.camera.bottom = -60;
    luzSol.shadow.camera.far = 500;
    luzSol.shadow.bias = -0.0006;
  }
  escena.add(luzSol);
  escena.add(luzSol.target);
  const hemi = new THREE.HemisphereLight(0xaecfe8, 0x2a5a68, 0.8);
  escena.add(hemi);

  // ── cielo ─────────────────────────────────────────────────────────────────
  const cielo = crearCielo(sunDir);
  // el composer (ACES + gradeo) ya sube el brillo: bajar la exposición interna
  // para que el cielo no quede lavado ni el horizonte se pierda en blanco
  cielo.uniforms.uExposicion.value = 0.92;
  escena.add(cielo.mesh);

  // ── océano FFT + malla proyectada ─────────────────────────────────────────
  const fft = new OceanFFT(renderer, { size: cfg.movil ? 128 : 256 });
  Object.assign(fft.params, {
    // chop más contenido que en el bote F1: los karts son chicos y un mar
    // bravo se los traga visualmente (la física ni lo ve — solo estética)
    windSpeed: 5.8, windDir: 0.44, fetch: 200000,
    swellHs: 0.30, swellPeriod: 8.5, swellDir: 0.44,
    spread: 0.75, choppiness: 1.1, amplitude: 0.78,
    foamBias: 0.55, foamMul: 1.2,
  });
  fft.markDirty();
  const mar = new MarMesh(fft, capa.swellU, sunDir, {
    gridX: cfg.movil ? 160 : 224, gridY: cfg.movil ? 96 : 128,
  });
  mar.uniforms.uVientoMS.value = fft.params.windSpeed;
  mar.uniforms.uExposicion.value = 1.0;
  escena.add(mar.mesh);

  // ═══ BIODIVERSIDAD QUE MARCA LA PISTA ═════════════════════════════════════
  const { PX, PZ, HDG, W, ZON, n, L } = pista;
  const rn = rand(20260829);
  const paso = L / n;                      // m entre muestras (~0.55)
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _p = new THREE.Vector3();
  const _s = new THREE.Vector3();
  const _c = new THREE.Color();

  // punto al costado de la muestra i: lat>0 = derecha del sentido de marcha
  function lateral(i, dist, lado) {
    const dx = Math.sin(HDG[i]) * dist * lado;
    const dz = -Math.cos(HDG[i]) * dist * lado;
    return { x: PX[i] + dx, z: PZ[i] + dz };
  }

  // ── 1) BOYAS: delimitan el borde jugable y BOBEAN con la misma ola ────────
  const boyas = [];                        // { x, z, fase }
  const stepBoya = Math.max(1, Math.round(9 / paso));
  for (let i = 0; i < n; i += stepBoya) {
    for (const lado of [-1, 1]) {
      const p = lateral(i, W[i] + 1.1, lado);
      boyas.push({ x: p.x, z: p.z, fase: rn() * Math.PI * 2 });
    }
  }
  // [CERO LOW-POLY] boya de verdad: casco liso (una boya es de plástico/metal,
  // sin una sola faceta) con más segmentos y sin flatShading; el tope es un
  // mástil cónico también liso.
  const geoBoya = new THREE.SphereGeometry(0.46, 18, 14);
  geoBoya.scale(1, 0.78, 1);
  const matBoya = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.08 });
  const imBoya = new THREE.InstancedMesh(geoBoya, matBoya, boyas.length);
  imBoya.frustumCulled = false;
  // tope = MÁSTIL con marca esférica (boya de navegación real). El cono suelto
  // de antes leía como pincho/aleta clavada en la bola — visto en el gate.
  const geoMastil = new THREE.CylinderGeometry(0.035, 0.05, 0.44, 10);
  geoMastil.translate(0, 0.22, 0);
  const geoMarca = new THREE.SphereGeometry(0.085, 12, 9);
  geoMarca.translate(0, 0.48, 0);
  const geoTope = fusionarConColor(THREE, [geoMastil, geoMarca]);
  const matTope = new THREE.MeshStandardMaterial({ color: 0xf6f2e8, roughness: 0.5 });
  const imTope = new THREE.InstancedMesh(geoTope, matTope, boyas.length);
  imTope.frustumCulled = false;
  for (let b = 0; b < boyas.length; b++) {
    imBoya.setColorAt(b, _c.setHex(b % 2 ? 0xe8483a : 0xf6cf45));
  }
  imBoya.instanceColor.needsUpdate = true;
  function bobBoyas() {
    _q.identity(); _s.set(1, 1, 1);
    for (let b = 0; b < boyas.length; b++) {
      const o = boyas[b];
      const y = olaAltura(o.x, o.z) + 0.10 + Math.sin(capa.t * 0.9 + o.fase) * 0.04;
      _p.set(o.x, y, o.z);
      _m.compose(_p, _q, _s);
      imBoya.setMatrixAt(b, _m);
      _p.y += 0.30;                     // base del mástil sobre el casco
      _m.compose(_p, _q, _s);
      imTope.setMatrixAt(b, _m);
    }
    imBoya.instanceMatrix.needsUpdate = true;
    imTope.instanceMatrix.needsUpdate = true;
  }
  bobBoyas();
  escena.add(imBoya, imTope);

  // ── 2) ALGAS (kelp): bosques que ondulan fuera del borde ──────────────────
  // Densidad por hábitat: bosque de algas (2) espeso, arrecife (1) medio.
  const algas = [];
  const stepAlga = Math.max(1, Math.round(3.4 / paso));
  for (let i = 0; i < n; i += stepAlga) {
    const zona = ZON[i];
    const prob = zona === 2 ? 0.95 : zona === 1 ? 0.5 : zona === 4 ? 0.35 : 0.22;
    if (rn() > prob) continue;
    const lado = rn() < 0.5 ? -1 : 1;
    const d = W[i] + 2.6 + rn() * 8.5;
    const p = lateral(i, d, lado);
    algas.push({ x: p.x, z: p.z, rot: rn() * Math.PI * 2, esc: 0.7 + rn() * 0.9 });
  }
  // [CERO LOW-POLY] la hoja de kelp es una LÁMINA dibujada (nervadura, borde
  // ondulado, mordiscos con alpha) sobre dos planos cruzados — desde cualquier
  // ángulo se lee masa de alga, no el rectángulo pelado del primer pase.
  const geoAlga = geoKelpCruzada(THREE);  // base en y=0 del instance
  const matAlga = new THREE.MeshStandardMaterial({
    map: texturaKelp(THREE), alphaTest: 0.45,
    roughness: 0.88, metalness: 0.0, side: THREE.DoubleSide,
  });
  matAlga.onBeforeCompile = (sh) => {
    sh.uniforms.uT = matAlga.userData.uT = { value: 0 };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uT;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        // vaivén de alga: fase por instancia (hash de su posición), peso por altura
        float faseAlga = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831;
        float pesoAlga = pow(position.y / 3.0, 1.6);
        transformed.x += sin(uT * 1.25 + faseAlga) * 0.42 * pesoAlga;
        transformed.z += cos(uT * 0.9 + faseAlga * 1.7) * 0.22 * pesoAlga;`);
  };
  const imAlga = new THREE.InstancedMesh(geoAlga, matAlga, algas.length);
  imAlga.frustumCulled = false;
  for (let a = 0; a < algas.length; a++) {
    const o = algas[a];
    // base bien hundida: solo la PUNTA rompe el agua (dosel de kelp real, no
    // estacas paradas — a media distancia las estacas leían como pinchos)
    _p.set(o.x, -2.1 * o.esc, o.z);
    _q.setFromEuler(_e.set(0, o.rot, 0));
    _s.set(o.esc, o.esc, o.esc);
    _m.compose(_p, _q, _s);
    imAlga.setMatrixAt(a, _m);
    imAlga.setColorAt(a, _c.setHSL(0.30 + rn() * 0.06, 0.5, 0.5 + rn() * 0.18));
  }
  imAlga.instanceColor.needsUpdate = true;
  escena.add(imAlga);

  // ── 3) ROCAS de arrecife: silueta dura que enmarca el camino ──────────────
  const rocas = [];
  const stepRoca = Math.max(1, Math.round(11 / paso));
  for (let i = 0; i < n; i += stepRoca) {
    const zona = ZON[i];
    const prob = zona === 1 ? 0.85 : zona === 0 ? 0.45 : 0.3;
    if (rn() > prob) continue;
    const lado = rn() < 0.5 ? -1 : 1;
    const d = W[i] + 3.4 + rn() * 11;
    const p = lateral(i, d, lado);
    rocas.push({ x: p.x, z: p.z, rot: rn() * Math.PI * 2, esc: 0.6 + rn() * 1.9 });
  }
  // [CERO LOW-POLY] la roca facetada (Icosahedron(1,0)+flatShading) se
  // reemplaza por piedra REAL: icosaedro subdividido esculpido con fbm,
  // normales suaves, franja mojada y costra de alga por vértice (la receta de
  // las rocas húmedas del valle, llevada al arrecife). 3 variantes instanciadas
  // = 3 draw calls para todas las rocas del circuito.
  const variantesRoca = [geoRocaMarina(THREE, 11), geoRocaMarina(THREE, 23), geoRocaMarina(THREE, 37)];
  const matRoca = materialRoca(THREE);
  const rocasPorVar = [[], [], []];
  for (let r = 0; r < rocas.length; r++) rocasPorVar[r % 3].push(rocas[r]);
  for (let vI = 0; vI < 3; vI++) {
    const lista = rocasPorVar[vI];
    if (!lista.length) continue;
    const im = new THREE.InstancedMesh(variantesRoca[vI], matRoca, lista.length);
    im.frustumCulled = false;
    for (let r = 0; r < lista.length; r++) {
      const o = lista[r];
      _p.set(o.x, -0.30 * o.esc + 0.18, o.z);   // ~1/3 hundida: piedra posada
      _q.setFromEuler(_e.set(0, o.rot, 0));      // sin volcarla: la franja mojada queda en la línea de agua
      _s.set(o.esc, o.esc * (0.82 + rn() * 0.3), o.esc * (0.8 + rn() * 0.4));
      _m.compose(_p, _q, _s);
      im.setMatrixAt(r, _m);
    }
    im.instanceMatrix.needsUpdate = true;
    escena.add(im);
  }

  // ── 4) CORALES: cabezas de color pegadas a la línea de boyas ──────────────
  const corales = [];
  const stepCoral = Math.max(1, Math.round(6.5 / paso));
  for (let i = 0; i < n; i += stepCoral) {
    const zona = ZON[i];
    const prob = zona === 3 ? 0.9 : zona === 1 ? 0.55 : 0.18;
    if (rn() > prob) continue;
    const lado = rn() < 0.5 ? -1 : 1;
    const d = W[i] + 1.8 + rn() * 2.6;
    const p = lateral(i, d, lado);
    corales.push({ x: p.x, z: p.z, rot: rn() * Math.PI * 2, esc: 0.55 + rn() * 0.9 });
  }
  // [CERO LOW-POLY] el cono de 5 lados se reemplaza por coral ORGÁNICO: cabezas
  // masivas (esfera esculpida con surcos de alta frecuencia) y colonias ramosas
  // (tubos curvos fusionados con puntas claras). 3 draw calls en total.
  const matCoral = materialCoral(THREE);
  const geosCabeza = [geoCoralCabeza(THREE, 5), geoCoralCabeza(THREE, 19)];
  const geoRamas = geoCoralRamas(THREE, 31);
  const CORAL_COLORES = [0xe86aa6, 0xf29e4c, 0xb85ef0, 0xff7f66, 0xf0d75e];
  const porTipo = [[], [], []];               // cabeza A, cabeza B, ramas
  for (let cI = 0; cI < corales.length; cI++) porTipo[cI % 3].push(corales[cI]);
  const geosCoral = [geosCabeza[0], geosCabeza[1], geoRamas];
  for (let tI = 0; tI < 3; tI++) {
    const lista = porTipo[tI];
    if (!lista.length) continue;
    const im = new THREE.InstancedMesh(geosCoral[tI], matCoral, lista.length);
    im.frustumCulled = false;
    for (let cI = 0; cI < lista.length; cI++) {
      const o = lista[cI];
      const esc = o.esc * (tI === 2 ? 1.15 : 0.72);
      _p.set(o.x, tI === 2 ? -0.30 : -0.18, o.z);   // asoman del agua apenas
      _q.setFromEuler(_e.set(rn() * 0.2 - 0.1, o.rot, rn() * 0.2 - 0.1));
      _s.set(esc, esc, esc);
      _m.compose(_p, _q, _s);
      im.setMatrixAt(cI, _m);
      im.setColorAt(cI, _c.setHex(CORAL_COLORES[Math.floor(rn() * CORAL_COLORES.length)]));
    }
    im.instanceMatrix.needsUpdate = true;
    im.instanceColor.needsUpdate = true;
    escena.add(im);
  }

  // ── 5) META: arco de puerto de verdad — pilotes de madera lisos, travesaño
  // y lona a cuadros con "META" (canvas). La vuelta ahora se LEE: sabés dónde
  // empieza y termina. [CERO LOW-POLY: sin flatShading, madera con veta]
  const meta = new THREE.Group();
  const matPilote = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.92 });
  {
    const pA = lateral(0, W[0] + 1.4, -1);
    const pB = lateral(0, W[0] + 1.4, 1);
    const luzMeta = 5.6;
    for (const p of [pA, pB]) {
      const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.30, luzMeta + 1.2, 12), matPilote);
      pil.position.set(p.x, (luzMeta + 1.2) / 2 - 1.2, p.z);
      meta.add(pil);
    }
    // travesaño entre pilotes
    const largo = Math.hypot(pB.x - pA.x, pB.z - pA.z);
    const viga = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, largo, 10), matPilote);
    viga.position.set((pA.x + pB.x) / 2, luzMeta - 0.35, (pA.z + pB.z) / 2);
    viga.rotation.z = Math.PI / 2;
    viga.rotation.y = -Math.atan2(pB.z - pA.z, pB.x - pA.x);
    meta.add(viga);
    // lona: cuadros + META dibujados en canvas (nada de plano de un solo color)
    const cvM = document.createElement('canvas');
    cvM.width = 512; cvM.height = 128;
    const cxM = cvM.getContext('2d');
    cxM.fillStyle = '#f4efe2';
    cxM.fillRect(0, 0, 512, 128);
    const cel = 16;
    cxM.fillStyle = '#191a17';
    for (let yy = 0; yy < 2; yy++) {
      for (let xx = 0; xx < 32; xx++) {
        if ((xx + yy) % 2 === 0) cxM.fillRect(xx * cel, yy * cel, cel, cel);
        if ((xx + yy) % 2 === 0) cxM.fillRect(xx * cel, 128 - (yy + 1) * cel, cel, cel);
      }
    }
    cxM.fillStyle = '#1c2b1d';
    cxM.font = '900 58px Georgia, "Times New Roman", serif';
    cxM.textAlign = 'center';
    cxM.textBaseline = 'middle';
    cxM.fillText('META', 256, 64);
    const texMeta = new THREE.CanvasTexture(cvM);
    texMeta.colorSpace = THREE.SRGBColorSpace;
    const lona = new THREE.Mesh(
      new THREE.PlaneGeometry(largo - 0.6, 1.05, 12, 1),
      new THREE.MeshStandardMaterial({ map: texMeta, roughness: 0.7, side: THREE.DoubleSide }),
    );
    // comba leve de lona colgada (nada rígido)
    const lp = lona.geometry.attributes.position;
    for (let i = 0; i < lp.count; i++) {
      const u = lp.getX(i) / (largo - 0.6);
      lp.setY(i, lp.getY(i) - (1 - Math.abs(u * 2) ** 2) * 0.12);
    }
    lona.geometry.computeVertexNormals();
    lona.position.set((pA.x + pB.x) / 2, luzMeta - 1.05, (pA.z + pB.z) / 2);
    // +π: la cara con el texto mira al kart que LLEGA (sin el giro, "META" se
    // leía en espejo desde la recta de llegada — visto en el gate)
    lona.rotation.y = -Math.atan2(pB.z - pA.z, pB.x - pA.x) + Math.PI;
    meta.add(lona);
  }
  escena.add(meta);

  // ── 6) PUERTAS DE SECTOR: a 1/4, 1/2 y 3/4 de vuelta, un par de mástiles
  // con gallardete cian — el circuito se lee por tramos, como pide el brief
  // (checkpoints JUGABLES y visibles, no solo internos de la física).
  const puertas = new THREE.Group();
  {
    const matMastil = new THREE.MeshStandardMaterial({ color: 0xdad4c4, roughness: 0.5, metalness: 0.15 });
    const matGallardete = new THREE.MeshStandardMaterial({
      color: 0x39c2d7, emissive: 0x0d5560, emissiveIntensity: 0.35, roughness: 0.55, side: THREE.DoubleSide,
    });
    for (const fSector of [0.25, 0.5, 0.75]) {
      const i = Math.floor(fSector * n) % n;
      for (const lado of [-1, 1]) {
        const p = lateral(i, W[i] + 1.2, lado);
        const mastil = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.10, 3.4, 10), matMastil);
        mastil.position.set(p.x, 1.35, p.z);
        puertas.add(mastil);
        const gal = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.42, 6, 1), matGallardete);
        // gallardete triangular: se estrecha hacia la punta
        const gp = gal.geometry.attributes.position;
        for (let q = 0; q < gp.count; q++) {
          const u = (gp.getX(q) / 0.95) + 0.5;
          gp.setY(q, gp.getY(q) * (1 - u * 0.85));
        }
        gal.geometry.computeVertexNormals();
        gal.position.set(p.x, 2.85, p.z);
        gal.rotation.y = HDG[i];
        puertas.add(gal);
      }
    }
  }
  escena.add(puertas);

  // ── 7) ISLAS con arte real (mar-biodiversidad): domo esculpido, arena,
  // troncos y follaje en MASA (lib3d/FollajeMasa). Se colocan lejos del
  // corredor jugable (el rescate del Ent salta antes de que un kart llegue) y
  // se cuidan de no pisar OTRO tramo del circuito (el trazado se dobla cerca
  // de sí mismo). Ancla visual del "camino no recto": cada curva grande tiene
  // su isla de referencia.
  const islas = [];
  {
    const candidatos = [0.055, 0.16, 0.30, 0.415, 0.55, 0.66, 0.80, 0.93];
    const maxIslas = cfg.movil ? 4 : 7;
    let colocadas = 0;
    for (let ci = 0; ci < candidatos.length && colocadas < maxIslas; ci++) {
      const i = Math.floor(candidatos[ci] * n) % n;
      const lado = ci % 2 ? 1 : -1;
      const radio = 8 + rn() * 7;
      const dist = W[i] + 24 + radio + rn() * 14;
      const p = lateral(i, dist, lado);
      // rechazo: ninguna muestra del circuito puede quedar dentro de la playa
      let ok = true;
      for (let j = 0; j < n; j += 6) {
        const dx = PX[j] - p.x, dz = PZ[j] - p.z;
        if (dx * dx + dz * dz < (radio + W[j] + 5) * (radio + W[j] + 5)) { ok = false; break; }
      }
      if (!ok) continue;
      // ni encimarse con otra isla
      for (const otra of islas) {
        const dx = otra.x - p.x, dz = otra.z - p.z;
        if (dx * dx + dz * dz < (radio + otra.radio + 6) * (radio + otra.radio + 6)) { ok = false; break; }
      }
      if (!ok) continue;
      const isla = crearIsla(THREE, { seed: 900 + ci * 13, radio, arboles: radio > 12 ? 3 : 2 });
      isla.grupo.position.set(p.x, 0, p.z);
      isla.grupo.rotation.y = rn() * Math.PI * 2;
      escena.add(isla.grupo);
      islas.push({ x: p.x, z: p.z, radio });
      colocadas++;
    }
  }

  // ═══ ACTUALIZACIÓN ════════════════════════════════════════════════════════
  // tickMar corre SIEMPRE (aun en menú/retrato): el mar y el cielo respiran.
  function tickMar(dt, camara) {
    fft.update(dt);
    if (camara) {
      mar.update(camara);
      cielo.mesh.position.copy(camara.position);
    }
    if (matAlga.userData.uT) matAlga.userData.uT.value = capa.t;
    // el follaje MASA de las islas se mece con el viento coherente de mundos
    tickVientoMundos(capa.t);
    bobBoyas();
  }

  // misma firma que entorno.js: por-jugador (luz que sigue al kart)
  function actualizar(dt, s) {
    if (s) {
      luzSol.target.position.set(s.x, 0, s.z);
      luzSol.position.set(s.x + sunDir.x * 160, sunDir.y * 160, s.z + sunDir.z * 160);
    }
  }

  // modos de mar (anti-mareo): calmo baja el swell y el viento del FFT
  function setCalma(calmo, reduced) {
    capa.swellU.uSwellAmp.value = reduced ? 0.12 : (calmo ? 0.35 : 0.85);
    fft.params.windSpeed = calmo ? 3.6 : 5.8;
    fft.params.choppiness = calmo ? 0.95 : 1.25;
    fft.markDirty();
    mar.uniforms.uVientoMS.value = fft.params.windSpeed;
  }
  setCalma(false, false);

  return {
    actualizar,
    tickMar,
    setCalma,
    luzSol,
    sky: cielo.mesh,
    niebla: null,
    bruma: null,
    fft,
    mar,
    cielo,
    chorrera: null,
    _fraj: [],
    _arb: [],
    islas,
    _counts: {
      boyas: boyas.length, algas: algas.length, rocas: rocas.length,
      corales: corales.length, islas: islas.length,
    },
  };
}
