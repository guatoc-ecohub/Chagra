// ── FLORES DE PÁRAMO DEL VALLE GUATOC — deterministas y ondulando CON el pasto ──
// «El páramo» sobre el valle real (?mundo=paramo) tiene frailejón, pajonal y
// queñua; le faltaba la hierba FLORIDA baja: lupinos, árnica y valerianas del
// páramo, metidas DENTRO del pajonal, no en el valle cálido.
//
// CÓMO SE MUEVE: reusa EXACTAMENTE la proyección de viento del pasto de
// cortiz2894/stylized-components (Wildflowers.ts) — `dot(worldWind, axisX)…`
// — y la corre con el MISMO reloj global `uTiempoVM`/`uFuerzaVM` de
// vientoMundos.js que menea las briznas del pajonal (quickGrass). Por eso las
// flores se mecen SINCRONIZADAS con la hierba, con la misma ráfaga, en vez de
// cada una por su lado (integrarles viento propio se nota y se ve mal).
//
// CERO ASSETS: las máscaras se dibujan en un <canvas> en runtime (drawDaisy,
// drawFlowerSpike, drawBranchingFlowers) armando un atlas — mismo dogma
// procedural del valle. Canal R = pétalo, G = follaje, B = centro.
//
// PERFORMANCE: la fuente pone `frustumCulled = false` a propósito (el bounding
// box de su InstancedMesh no sirve). Acá el páramo es 320×320 m y eso se paga
// siempre; por eso las flores se parten en TILES (40×40 m), cada tile su propio
// InstancedMesh con frustum culling de three → el costo depende del disco
// visible, no del área sembrada. Contenido bajo a propósito: es páramo, no
// jardín.
//
// ESPECIES (hecho duro del grafo AGE, export en app/grafo-relations.json y
// app/species-images.json — no de memoria):
//   · Senecio formosus Kunth   — árnica de páramo, capítulos amarillos (acento)
//   · Lupinus alopecuroides Desr. — lupino de páramo, espiga violeta (acento)
//   · Valeriana microphylla Kunth — chisquillo, cabezuelas crema apagadas
// Verde dominante: los pétalos van en tonos salvia/crema la mayor parte de las
// veces; el amarillo y el morado solo como acento.
//
// Atribución MIT: portado de `Wildflowers.ts` de cortiz2894/stylized-components
// (https://github.com/cortiz2894/stylized-components), Copyright (c) 2026
// Steve245270533, licencia MIT. Ver _steals/three-stylized/LICENSE.
import * as THREE from 'three';
import { height, elevOf } from './terrain.js';
import { uniformesVientoMundo } from './lib3d/flora/vientoMundos.js';

const MASK_TILE_WIDTH = 160;
const MASK_HEIGHT = 256;
const MASK_VARIANTS = 3;

// ── paleta por especie (grafo AGE) — pétalo / follaje / centro ────────────────
const FLOWER_PALETTES = [
  { petal: 0xf2c94c, foliage: 0x5c7040, centre: 0xa86a1e }, // Senecio formosus (amarillo)
  { petal: 0x8f7fd8, foliage: 0x4f6a3a, centre: 0xbdb36a }, // Lupinus alopecuroides (violeta)
  { petal: 0xcfd2a6, foliage: 0x45602f, centre: 0xa8a85f }, // Valeriana microphylla (crema)
  { petal: 0xb9c08f, foliage: 0x3f5a2c, centre: 0x8f9a55 }, // salvia apagado (verde dominante)
];

// azar determinista LOCAL (no pisa el rng de paramo.js)
function lcg(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// pendiente local del DEM (misma sonda que paramo.js, sin tocar su estado)
function pendienteEn(x, z) {
  const e = 2.5;
  const dx = (height(x + e, z) - height(x - e, z)) / (2 * e);
  const dz = (height(x, z + e) - height(x, z - e)) / (2 * e);
  return Math.hypot(dx, dz);
}

// ── dibujo del atlas de máscaras (port del MIT: drawDaisy/Spike/Branching) ─────
function setMaskColor(context, channel) {
  context.fillStyle =
    channel === 'petal' ? '#ff0000' : channel === 'foliage' ? '#00ff00' : '#0000ff';
  context.strokeStyle = context.fillStyle;
}

function drawStem(context, points, width) {
  setMaskColor(context, 'foliage');
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = width;
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) context.lineTo(points[index][0], points[index][1]);
  context.stroke();
}

function drawLeaf(context, x, y, angle, length) {
  setMaskColor(context, 'foliage');
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.beginPath();
  context.moveTo(0, 0);
  context.quadraticCurveTo(length * 0.35, -length * 0.18, length, 0);
  context.quadraticCurveTo(length * 0.35, length * 0.18, 0, 0);
  context.fill();
  context.restore();
}

function drawPetals(context, x, y, radius, petals) {
  setMaskColor(context, 'petal');
  for (let index = 0; index < petals; index += 1) {
    context.save();
    context.translate(x, y);
    context.rotate((index / petals) * Math.PI * 2);
    context.beginPath();
    context.ellipse(0, -radius * 0.62, radius * 0.28, radius * 0.58, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  setMaskColor(context, 'centre');
  context.beginPath();
  context.arc(x, y, radius * 0.26, 0, Math.PI * 2);
  context.fill();
}

function drawDaisy(context, x) {
  const stemX = x + 81;
  drawStem(context, [[stemX, 248], [stemX - 3, 170], [stemX + 3, 101]], 7);
  drawLeaf(context, stemX - 2, 185, Math.PI * 0.78, 52);
  drawLeaf(context, stemX + 1, 151, -Math.PI * 0.66, 45);
  drawPetals(context, stemX + 3, 72, 45, 9);
}

function drawFlowerSpike(context, x) {
  const stemX = x + 79;
  drawStem(context, [[stemX, 249], [stemX - 2, 172], [stemX + 5, 58]], 7);
  drawLeaf(context, stemX - 2, 184, Math.PI * 0.84, 51);
  drawLeaf(context, stemX + 1, 154, -Math.PI * 0.75, 38);
  setMaskColor(context, 'petal');
  for (let index = 0; index < 9; index += 1) {
    const y = 118 - index * 9;
    const width = 22 - index * 1.2;
    context.beginPath();
    context.ellipse(stemX + (index % 2 === 0 ? -6 : 6), y, width * 0.52, 8, index % 2 === 0 ? -0.38 : 0.38, 0, Math.PI * 2);
    context.fill();
  }
  setMaskColor(context, 'centre');
  context.beginPath();
  context.ellipse(stemX + 4, 50, 6, 10, 0, 0, Math.PI * 2);
  context.fill();
}

function drawBranchingFlowers(context, x) {
  const stemX = x + 73;
  drawStem(context, [[stemX, 249], [stemX - 3, 185], [stemX + 8, 133], [stemX + 24, 68]], 6);
  drawStem(context, [[stemX + 2, 184], [stemX - 31, 139], [stemX - 43, 108]], 5);
  drawStem(context, [[stemX + 9, 139], [stemX + 43, 113]], 5);
  drawLeaf(context, stemX - 1, 197, Math.PI * 0.83, 47);
  drawLeaf(context, stemX + 4, 162, -Math.PI * 0.64, 43);
  drawLeaf(context, stemX + 14, 139, Math.PI * 0.64, 35);
  drawPetals(context, stemX + 24, 55, 31, 8);
  drawPetals(context, stemX - 45, 98, 23, 7);
  drawPetals(context, stemX + 49, 108, 21, 7);
}

function crearTexturaMascara() {
  if (typeof document === 'undefined') {
    const texture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
    texture.needsUpdate = true;
    return texture;
  }
  const canvas = document.createElement('canvas');
  canvas.width = MASK_TILE_WIDTH * MASK_VARIANTS;
  canvas.height = MASK_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('no se pudo crear el canvas procedural de flores.');
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawDaisy(context, 0);
  drawFlowerSpike(context, MASK_TILE_WIDTH);
  drawBranchingFlowers(context, MASK_TILE_WIDTH * 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

// ── shaders: el MISMO `deformWildflower` del MIT, con el reloj del pajonal ─────
const flowerWindVertexUniforms = /* glsl */ `
uniform float uTiempoVM;
uniform float uFuerzaVM;
uniform float uWindStrength;
uniform float uWindSpeed;
uniform float uWindFrequency;
uniform float uWindTurbulence;
uniform float uWindLean;
uniform vec2 uWindDirection;
`;

const flowerWindVertexTransform = /* glsl */ `
vec3 deformWildflower(vec3 transformed) {
  mat4 instanceWorldMatrix = modelMatrix * instanceMatrix;
  vec3 baseWorldPosition = (instanceWorldMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float primaryWave = sin(dot(baseWorldPosition.xz, uWindDirection) * uWindFrequency + uTiempoVM * uWindSpeed);
  vec2 perpendicular = vec2(-uWindDirection.y, uWindDirection.x);
  float secondaryWave = sin(dot(baseWorldPosition.xz, perpendicular) * uWindFrequency * 1.7 + uTiempoVM * uWindSpeed * 0.73) * uWindTurbulence;
  vec3 worldWind = vec3(uWindDirection.x, 0.0, uWindDirection.y)
    * ((primaryWave + secondaryWave) * uWindStrength * uFuerzaVM + uWindLean);

  vec3 axisX = vec3(instanceWorldMatrix[0]);
  vec3 axisY = vec3(instanceWorldMatrix[1]);
  vec3 axisZ = vec3(instanceWorldMatrix[2]);
  vec3 localWind = vec3(
    dot(worldWind, axisX) / max(dot(axisX, axisX), 0.00001),
    dot(worldWind, axisY) / max(dot(axisY, axisY), 0.00001),
    dot(worldWind, axisZ) / max(dot(axisZ, axisZ), 0.00001)
  );
  float tipMask = uv.y * uv.y;
  return transformed + localWind * tipMask * 0.45;
}
`;

const flowerVertexShader = /* glsl */ `
${flowerWindVertexUniforms}
${flowerWindVertexTransform}

attribute float aVariant;
attribute vec3 aPetalColor;
attribute vec3 aFoliageColor;
attribute vec3 aCentreColor;
varying vec2 vMaskUv;
varying vec3 vPetalColor;
varying vec3 vFoliageColor;
varying vec3 vCentreColor;

void main() {
  vMaskUv = vec2((uv.x + aVariant) / ${MASK_VARIANTS.toFixed(1)}, uv.y);
  vPetalColor = aPetalColor;
  vFoliageColor = aFoliageColor;
  vCentreColor = aCentreColor;

  vec3 transformed = deformWildflower(position);
  mat4 instanceWorldMatrix = modelMatrix * instanceMatrix;
  vec4 worldPosition = instanceWorldMatrix * vec4(transformed, 1.0);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const flowerFragmentShader = /* glsl */ `
precision mediump float;
uniform sampler2D uMask;
varying vec2 vMaskUv;
varying vec3 vPetalColor;
varying vec3 vFoliageColor;
varying vec3 vCentreColor;

void main() {
  vec4 mask = texture2D(uMask, vMaskUv);
  if (mask.a < 0.28) discard;

  vec3 color = mask.r * vPetalColor
    + mask.g * vFoliageColor
    + mask.b * vCentreColor;
  gl_FragColor = vec4(color, mask.a);
  #include <colorspace_fragment>
}
`;

// ── construcción ──────────────────────────────────────────────────────────────
function crearAtributos(count, random) {
  const variants = new Float32Array(count);
  const petalColors = new Float32Array(count * 3);
  const foliageColors = new Float32Array(count * 3);
  const centreColors = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let index = 0; index < count; index += 1) {
    const paleta = FLOWER_PALETTES[Math.floor(random() * FLOWER_PALETTES.length)];
    variants[index] = (index + Math.floor(random() * MASK_VARIANTS)) % MASK_VARIANTS;
    c.set(paleta.petal).offsetHSL((random() - 0.5) * 0.06, (random() - 0.5) * 0.1, (random() - 0.5) * 0.08);
    petalColors[index * 3] = c.r; petalColors[index * 3 + 1] = c.g; petalColors[index * 3 + 2] = c.b;
    c.set(paleta.foliage).offsetHSL((random() - 0.5) * 0.025, (random() - 0.5) * 0.06, (random() - 0.5) * 0.04);
    foliageColors[index * 3] = c.r; foliageColors[index * 3 + 1] = c.g; foliageColors[index * 3 + 2] = c.b;
    c.set(paleta.centre).offsetHSL((random() - 0.5) * 0.04, (random() - 0.5) * 0.08, (random() - 0.5) * 0.06);
    centreColors[index * 3] = c.r; centreColors[index * 3 + 1] = c.g; centreColors[index * 3 + 2] = c.b;
  }
  return { variants, petalColors, foliageColors, centreColors };
}

function crearGeometria(atributos) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.translate(0, 0.5, 0);
  geometry.setAttribute('aVariant', new THREE.InstancedBufferAttribute(atributos.variants, 1));
  geometry.setAttribute('aPetalColor', new THREE.InstancedBufferAttribute(atributos.petalColors, 3));
  geometry.setAttribute('aFoliageColor', new THREE.InstancedBufferAttribute(atributos.foliageColors, 3));
  geometry.setAttribute('aCentreColor', new THREE.InstancedBufferAttribute(atributos.centreColors, 3));
  return geometry;
}

const VIENTO = {
  strength: 0.85,   // el reloj uTiempoVM/uFuerzaVM ya mete la ráfaga del pajonal
  speed: 1.6,       // misma cadencia de onda que las briznas de quickGrass
  frequency: 0.35,
  turbulence: 0.45,
  lean: 0.12,
  direction: new THREE.Vector2(0.8, 0.6).normalize(),  // el viento cruza la meseta
};

/**
 * @param {object} opts
 *   scene      THREE.Scene — donde colgar el grupo
 *   area       {x0,x1,z0,z1} — el rellano del páramo (320×320 en paramo.js)
 *   evitar     [{x,z,r}] — discos vetados (ojo de agua, corte de suelo)
 *   seed       número — fija la siembra determinista
 *   tile       m — lado del tile de frustum culling (def 40)
 *   omitir     bool — no construir nada (URL ?flores=0)
 * @returns {{ grupo, setVisible, conteo, tiles, dispose }}
 */
export function crearFloresParamo({ scene, area, evitar = [], seed = 20731, tile = 40, omitir = false }) {
  if (omitir) return { grupo: null, setVisible() {}, conteo: 0, tiles: [], dispose() {} };
  const rng = lcg(seed);
  const anchoX = area.x1 - area.x0;
  const anchoZ = area.z1 - area.z0;
  const nx = Math.max(1, Math.ceil(anchoX / tile));
  const nz = Math.max(1, Math.ceil(anchoZ / tile));

  const libre = (x, z) => {
    const y = height(x, z);
    if (elevOf(y) < 3000) return false;
    if (pendienteEn(x, z) > 0.5) return false;
    for (const e of evitar) if (Math.hypot(x - e.x, z - e.z) < e.r) return false;
    return true;
  };

  // intenta un punto dentro de una celda; devuelve {x,y,z} o null
  const puntoEnCelda = (gx, gz, intentos) => {
    for (let k = 0; k < intentos; k++) {
      const x = area.x0 + (gx + rng()) * tile;
      const z = area.z0 + (gz + rng()) * tile;
      if (!libre(x, z)) continue;
      return { x, y: height(x, z), z };
    }
    return null;
  };

  // ── siembra 1: toda la meseta, baja densidad (páramo, no jardín) ──
  const porCelda = 10;                 // intentos
  const maxPorCelda = 7;               // aceptados
  const porTile = new Array(nx * nz).fill(0).map(() => []);
  for (let gz = 0; gz < nz; gz++) {
    for (let gx = 0; gx < nx; gx++) {
      const lista = porTile[gz * nx + gx];
      for (let a = 0; a < porCelda && lista.length < maxPorCelda; a++) {
        const p = puntoEnCelda(gx, gz, 8);
        if (p) lista.push(p);
      }
    }
  }

  // ── siembra 2: un corro extra cerca del ojo de agua y del corredor de la
  //    estación 1 (donde la cámara pasa), para que el verde florido se lea ──
  const corros = [
    { cx: area.x0 + 45, cz: area.z0 + 45, r: 45, n: 120 },   // la hoya del nacimiento
    { cx: area.x0 + 60, cz: area.z1 - 160, r: 55, n: 160 },  // el corredor de la estación 1
  ];
  for (const corro of corros) {
    let sembrados = 0, guard = corro.n * 40;
    while (sembrados < corro.n && guard-- > 0) {
      const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * corro.r;
      const x = corro.cx + Math.cos(a) * d, z = corro.cz + Math.sin(a) * d;
      if (!libre(x, z)) continue;
      const gx = Math.min(nx - 1, Math.max(0, Math.floor((x - area.x0) / tile)));
      const gz = Math.min(nz - 1, Math.max(0, Math.floor((z - area.z0) / tile)));
      porTile[gz * nx + gx].push({ x, y: height(x, z), z });
      sembrados++;
    }
  }

  // ── un InstancedMesh por tile, con frustum culling de three ──
  const grupo = new THREE.Group();
  grupo.name = 'paramo-flores';
  const texturaMascara = crearTexturaMascara();
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMask: { value: texturaMascara },
      uTiempoVM: uniformesVientoMundo.uTiempoVM,
      uFuerzaVM: uniformesVientoMundo.uFuerzaVM,
      uWindStrength: { value: VIENTO.strength },
      uWindSpeed: { value: VIENTO.speed },
      uWindFrequency: { value: VIENTO.frequency },
      uWindTurbulence: { value: VIENTO.turbulence },
      uWindLean: { value: VIENTO.lean },
      uWindDirection: { value: VIENTO.direction },
    },
    vertexShader: flowerVertexShader,
    fragmentShader: flowerFragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
    alphaTest: 0.28,
    depthWrite: true,
  });
  Object.assign(material, { map: texturaMascara });

  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _p = new THREE.Vector3();
  const _s = new THREE.Vector3();
  const eje = new THREE.Vector3(0, 1, 0);
  const tiles = [];
  let conteo = 0;

  for (let gz = 0; gz < nz; gz++) {
    for (let gx = 0; gx < nx; gx++) {
      const lista = porTile[gz * nx + gx];
      if (!lista.length) continue;
      const atributos = crearAtributos(lista.length, rng);
      const mesh = new THREE.InstancedMesh(crearGeometria(atributos), material, lista.length);
      mesh.name = `paramo-flores-${gx}-${gz}`;
      mesh.frustumCulled = true;          // TROCEADO: culling real, no el de la fuente
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      lista.forEach((p, i) => {
        const alto = THREE.MathUtils.lerp(0.45, 1.05, rng());
        const ancho = alto * THREE.MathUtils.lerp(0.45, 0.62, rng());
        _q.setFromAxisAngle(eje, rng() * Math.PI * 2);
        _p.set(p.x, p.y, p.z);
        _s.set(ancho, alto, 1);
        _m.compose(_p, _q, _s);
        mesh.setMatrixAt(i, _m);
      });
      mesh.instanceMatrix.needsUpdate = true;
      grupo.add(mesh);
      tiles.push({ cx: area.x0 + (gx + 0.5) * tile, cz: area.z0 + (gz + 0.5) * tile, mesh });
      conteo += lista.length;
    }
  }
  scene.add(grupo);

  const actualizar = (camara, corte = GRAN_CORTE) => {
    if (!camara || !tiles.length) return;
    const cx = camara.position.x, cz = camara.position.z;
    const r2 = corte * corte;
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      const dx = t.cx - cx, dz = t.cz - cz;
      // el tile se apaga más allá del corte; THREE.frustumCulled ya filtra
      // por cono de visión el resto. Distancia al cuadrado para barato.
      const vivo = (dx * dx + dz * dz) < r2;
      if (t.mesh.visible !== vivo) t.mesh.visible = vivo;
    }
  };

  return {
    grupo,
    setVisible(v) { grupo.visible = v; },
    conteo,
    tiles,
    actualizar,
    dispose() {
      scene.remove(grupo);
      for (const t of tiles) t.mesh.geometry.dispose();
      material.dispose();
      texturaMascara.dispose();
    },
  };
}

const GRAN_CORTE = 80;
