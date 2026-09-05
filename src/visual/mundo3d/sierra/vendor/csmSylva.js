/* ─────────────────────────────────────────────────────────────────────────────
 * COPIA VERBATIM VENDORIZADA — NO EDITAR A MANO.
 *
 * Original: `~/demos/3d/lib3d/fx/csmSylva.js` (el valle). Se trae al bundle de la PWA porque
 * el descenso por la Sierra necesita las MISMAS sombras en cascada (CSM de
 * 2 cascadas + PCF suave) del valle, no una reimplementación «parecida».
 * El valle sirve ese archivo desde `public/valle/`, que NO está versionado
 * ni es importable desde `src/` — de ahí la copia.
 *
 * El byte-a-byte lo verifica `fxSylva.vendor.test.js` (sha-256 fijado). Si
 * el original cambia, ese test falla y hay que re-sincronizar con:
 *   cp ~/demos/3d/lib3d/fx/csmSylva.js src/visual/mundo3d/sierra/vendor/csmSylva.js
 *   (y volver a poner esta cabecera + actualizar el sha del test)
 *
 * Licencia: MIT (Sylva / Token-Gremlin). El original cita la licencia en su
 * propia cabecera pero NO trae el notice completo al pie, así que el
 * notice completo viaja en esta cabecera:
 *
   MIT License
   Copyright (c) 2026 Token Gremlin
   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
   associated documentation files (the "Software"), to deal in the Software without restriction, including
   without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
   following conditions: The above copyright notice and this permission notice shall be included in all
   copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
   KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
   PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR
   ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * ───────────────────────────────────────────────────────────────────────────── */
/* eslint-disable */
/* ── INICIO COPIA VERBATIM ── */
// ── lib3d/fx/csmSylva.js ─────────────────────────────────────────────────────
// CSM 2 CASCADAS + SOMBRAS SUAVES (Sylva s25). Opt-in `?csm=1`.
//
// Qué hace CSM en Sylva (token-gremlin/realistic-forest, MIT;
// src/render/CSM.js, src/shadows/CascadeShadowMap):
//   · Divide el frustum de cámara en N cascadas (aquí 2);
//   · cada cascada tiene su propio OrthographicCamera + shadow map;
//   · cascada cercana: resolución alta, rango corto → sombras nítidas cerca;
//   · cascada lejana: resolución baja, rango amplio → sombras suaves lejos;
//   · PCFSoftShadowMap para bordes suaves sin PCF hand-tuned;
//   · bias negativo pequeño para evitar acne sin peter-panning.
//
// Qué se adapta al valle (forward WebGL2 r160, 2 cascadas por rendimiento):
//   · 2× DirectionalLight internas, ambas en la dirección de atmos.dir;
//   · cada una con su shadow camera independiente (rango cercano/lejano);
//   · shadow map 1024² (cascada cercana, nítida) + 512² (lejana, suave);
//     ~1280 KB en GPU móvil, graduado a la Silvia/Sylva crisp-close soft-far;
//   · PCFSoftShadowMap nativo de three r160;
//   · bias -0.0006 (mismo que arboles-frio-andino.html, medido sin acne);
//   · scene.castShadow = false por defecto (los objetos optan individualmente);
//   · terrain recibe sombras via receiveShadow = true;
//   · flora puede optar con castShadow en follaje denso (masa, no cards).
//
// Hook: window.__csm = { activa, update(cam), dispose(), stats() }.

import * as THREE from 'three';

const CASCADAS = 2;
const MAP_SIZE_NEAR = 1024; // cascada cercana: nítida (Sylva: crisp-close)
const MAP_SIZE_FAR = 512;   // cascada lejana: suave y barata (Sylva: soft-far)
const NEAR_FRAC = 0.06;     // cascada cercana cubre el 6% del far → nítida cerca
const SHADOW_BIAS = -0.0006;
const CAM_NARROW_FACTOR = 1.08; // margen sobre el frustum proyectado (anti-corte)

export function leerParamsCSM(search) {
  const q = new URLSearchParams(search || '');
  return q.get('csm') === '1';
}

export function crearCSM(THREE, { scene, renderer, sunLight, camera, terrainGroup }) {
  // ── habilitar shadow map en el renderer ──
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ── las dos luces de cascada ──
  const cascadas = [];
  const sunDir = sunLight.position.clone().normalize();

  for (let i = 0; i < CASCADAS; i++) {
    // LUZ SHADOW-ONLY: la intensidad se deja en 0 para que estas luces NO sumen
    // luz a la escena (la iluminación la sigue dando atmos.dir). Con una
    // DirectionalLight r160, `castShadow=true` con `intensity=0` sigue
    // proyectando su shadow map sin alterar el look del alumbrado — así se
    // consigue un mapa de sombras independiente por cascada sin duplicar el sol.
    const mapSize = i === 0 ? MAP_SIZE_NEAR : MAP_SIZE_FAR;
    const light = new THREE.DirectionalLight(sunLight.color.getHex(), 0);
    light.position.copy(sunLight.position);
    light.castShadow = true;
    light.shadow.mapSize.set(mapSize, mapSize);
    light.shadow.bias = SHADOW_BIAS;
    light.shadow.normalBias = 0.02;

    // ortho camera por cascada
    const shadowCam = light.shadow.camera;
    shadowCam.near = 0.5;
    shadowCam.far = 10; // se ajusta por frame
    shadowCam.left = shadowCam.bottom = -10;
    shadowCam.right = shadowCam.top = 10;
    shadowCam.updateProjectionMatrix();

    scene.add(light);
    cascadas.push({ light, shadowCam });
  }

  // ── marcar terreno como receptor de sombras ──
  if (terrainGroup) {
    terrainGroup.traverse((obj) => {
      if (obj.isMesh) obj.receiveShadow = true;
    });
  }

  // ── estado interno ──
  const _frustum = new THREE.Frustum();
  const _projScreen = new THREE.Matrix4();
  const _corners = [
    new THREE.Vector3(), new THREE.Vector3(),
    new THREE.Vector3(), new THREE.Vector3(),
    new THREE.Vector3(), new THREE.Vector3(),
    new THREE.Vector3(), new THREE.Vector3(),
  ];
  const _center = new THREE.Vector3();
  const _forward = new THREE.Vector3();
  const _cascadeDir = new THREE.Vector3();
  const _maxEnSombra = [0, 0];
  const _bbox = new THREE.Box3();
  const _v3 = new THREE.Vector3();

  function update(cam) {
    // ── proyectar frustum de cámara a world space ──
    _projScreen.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_projScreen);

    // ── esquinas del frustum en world space ──
    const inv = _projScreen.clone().invert();
    let idx = 0;
    for (let z = 0; z <= 1; z++) {
      for (let y = 0; y <= 1; y++) {
        for (let x = 0; x <= 1; x++) {
          const v = _corners[idx];
          v.set(x * 2 - 1, y * 2 - 1, z * 2 - 1);
          v.applyMatrix4(inv);
          idx++;
        }
      }
    }

    // ── distancia de los corners al ojo ──
    const camPos = cam.position;
    const dists = new Float32Array(8);
    for (let i = 0; i < 8; i++) {
      dists[i] = camPos.distanceTo(_corners[i]);
    }

    // ── dirección del sol normalizada ──
    _cascadeDir.copy(sunDir).normalize();

    // ── splits: cascada cercana [near, splitDist], lejana [splitDist, far] ──
    const near = cam.near;
    const far = cam.far;
    const splitDist = near + (far - near) * NEAR_FRAC;

    const ranges = [
      { n: near, f: splitDist },   // cascada 0: cercana
      { n: splitDist, f: far },     // cascada 1: lejana
    ];

    for (let c = 0; c < CASCADAS; c++) {
      const r = ranges[c];
      const { light, shadowCam } = cascadas[c];

      // ── corners de esta cascada ──
      // separar corners por distancia: los que caen dentro del rango [n, f]
      const cCorners = [];
      for (let i = 0; i < 8; i++) {
        // linearizar z del frustum para clasificar corners
        const zNDC = _corners[i].clone().project(cam);
        const depth = -zNDC.z; // 0=near, 1=far en NDC
        const dist = near + (far - near) * depth;
        if (dist >= r.n - 1 && dist <= r.f + 1) {
          cCorners.push(_corners[i]);
        }
      }
      // fallback: si quedó menos de 2 corners, usar los 8
      if (cCorners.length < 2) {
        for (let i = 0; i < 8; i++) cCorners.push(_corners[i].clone());
      }

      // ── centro de esta cascada ──
      _center.set(0, 0, 0);
      for (const p of cCorners) _center.add(p);
      _center.multiplyScalar(1 / cCorners.length);

      // ──BoundingBox de los corners de esta cascada ──
      _bbox.makeEmpty();
      for (const p of cCorners) _bbox.expandByPoint(p);
      const radius = _bbox.getSize(_v3).length() * 0.5;

      // ── positionar la luz sobre el centro de la cascada ──
      light.position.copy(_center).addScaledVector(_cascadeDir, radius * 3);
      light.target.position.copy(_center);
      light.target.updateMatrixWorld();

      // ── ajustar ortho camera ──
      const extent = radius * CAM_NARROW_FACTOR;
      shadowCam.left = -extent;
      shadowCam.right = extent;
      shadowCam.top = extent;
      shadowCam.bottom = -extent;
      shadowCam.near = 0.5;
      shadowCam.far = radius * 6;
      shadowCam.updateProjectionMatrix();

      // shadow-only: ninguna cascada suma iluminación (ver nota de creación)
      light.intensity = 0;
    }

    _maxEnSombra[0] = ranges[0].f;
    _maxEnSombra[1] = ranges[1].f;
  }

  function stats() {
    return {
      activa: true,
      cascadas: CASCADAS,
      mapSize: [MAP_SIZE_NEAR, MAP_SIZE_FAR],
      bias: SHADOW_BIAS,
      maxDistCercana: _maxEnSombra[0],
      maxDistLejana: _maxEnSombra[1],
    };
  }

  function dispose() {
    for (const c of cascadas) {
      c.light.shadow.dispose();
      scene.remove(c.light);
    }
    renderer.shadowMap.enabled = false;
    renderer.shadowMap.type = THREE.PCFShadowMap;
  }

  return { activa: true, update, dispose, stats };
}
