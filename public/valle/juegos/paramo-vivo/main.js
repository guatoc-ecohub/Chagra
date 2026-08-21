import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { buildFrailejon, frailejonSpec } from '../../lib3d/flora/frailejonFabrica.js';
import { crearParchePasto } from '../../lib3d/flora/quickGrass.js';
import { aplicarVientoMundo, tickVientoMundos } from '../../lib3d/flora/vientoMundos.js';

const GAME_QUERY = new URLSearchParams(location.search);
const EMBEDDED = GAME_QUERY.get('embedded') === '1' || GAME_QUERY.get('autostart') === '1';

const canvas = document.getElementById('game');
const perfEl = document.getElementById('perf');
const detailTitle = document.getElementById('detailTitle');
const detailBody = document.getElementById('detailBody');
const detailTiny = document.getElementById('detailTiny');
const hintEl = document.getElementById('hint');
const introEl = document.getElementById('intro');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd4e1da);
scene.fog = new THREE.FogExp2(0xcfdbd5, 0.005);

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 700);
camera.position.set(-72, 4.2, -8);

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2(0, 0);
const clock = new THREE.Clock();
const world = new THREE.Group();
scene.add(world);

const hemi = new THREE.HemisphereLight(0xeaf6d6, 0x4f5d3a, 1.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0cf, 1.4);
sun.position.set(-0.4, 0.95, 0.2);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xaed7c4, 0.42);
fill.position.set(0.8, 0.2, -0.5);
scene.add(fill);

const sky = new Sky();
sky.scale.setScalar(5000);
scene.add(sky);
const skyU = sky.material.uniforms;
skyU.turbidity.value = 8;
skyU.rayleigh.value = 1.15;
skyU.mieCoefficient.value = 0.0105;
skyU.mieDirectionalG.value = 0.82;
const sunDir = new THREE.Vector3(-0.38, 0.92, 0.18).normalize();
skyU.sunPosition.value.copy(sunDir);

const WORLD_W = 190;
const WORLD_D = 170;
const SEG_X = 180;
const SEG_Z = 160;
const X0 = -WORLD_W / 2;
const Z0 = -WORLD_D / 2;
const STEP_X = WORLD_W / SEG_X;
const STEP_Z = WORLD_D / SEG_Z;
const X1 = X0 + WORLD_W;
const Z1 = Z0 + WORLD_D;

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
function hash2(x, z) {
  const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return h - Math.floor(h);
}
function noise2(x, z) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi);
  const b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1);
  const d = hash2(xi + 1, zi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function fbm(x, z) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < 5; i++) {
    sum += noise2(x * freq, z * freq) * amp;
    norm += amp;
    amp *= 0.52;
    freq *= 2.08;
  }
  return sum / norm;
}
function ridge(x, z) {
  return 1 - Math.abs(2 * fbm(x, z) - 1);
}
function hill(x, z, cx, cz, rx, rz, height) {
  const dx = (x - cx) / rx;
  const dz = (z - cz) / rz;
  const d = dx * dx + dz * dz;
  return height * Math.exp(-d);
}
function trailZ(x) {
  return 10 * Math.sin(x * 0.037) + 6 * Math.sin(x * 0.11 + 0.8) - 2.3;
}
function terrainHeight(x, z) {
  const tDist = Math.abs(z - trailZ(x));
  let h = 0;
  h += hill(x, z, -58, 18, 55, 38, 5.2);
  h += hill(x, z, 40, -20, 46, 34, 4.1);
  h += hill(x, z, 68, 28, 34, 26, 5.5);
  h -= hill(x, z, -4, 6, 30, 18, 3.4);
  h += (ridge(x * 0.03 + 13, z * 0.03 - 7) - 0.5) * 2.1;
  h += (fbm(x * 0.012, z * 0.012) - 0.5) * 4.8;
  h += (fbm(x * 0.053 + 24, z * 0.053 - 11) - 0.5) * 0.9;
  h -= smoothstep(0, 18, tDist) * 0.9;
  if (tDist < 4.2) h -= (4.2 - tDist) * 0.08;
  return h;
}
function terrainColor(x, z, y) {
  const tDist = Math.abs(z - trailZ(x));
  const slope = Math.abs(
    terrainHeight(x + 0.8, z) - terrainHeight(x - 0.8, z) +
    terrainHeight(x, z + 0.8) - terrainHeight(x, z - 0.8)
  );
  const wet = 1 - smoothstep(0, 24, tDist);
  const alt = smoothstep(-1, 8, y);
  const grain = fbm(x * 0.08, z * 0.08);
  const moss = new THREE.Color('#5e7440');
  const leaf = new THREE.Color('#86a65a');
  const lichen = new THREE.Color('#c0d199');
  const soil = new THREE.Color('#5b5f40');
  const rock = new THREE.Color('#7a8469');
  const wetTone = new THREE.Color('#677f56');
  const c = new THREE.Color();
  const h1 = soil.clone().lerp(rock, clamp(slope * 0.7 + grain * 0.15, 0, 1));
  const h2 = moss.clone().lerp(leaf, clamp(0.35 + alt * 0.45 + grain * 0.2, 0, 1));
  c.copy(h1).lerp(h2, clamp(0.42 + alt * 0.42 + wet * 0.18, 0, 1));
  c.lerp(lichen, clamp(wet * 0.18, 0, 0.18));
  c.lerp(wetTone, clamp(wet * 0.22, 0, 0.22));
  c.multiplyScalar(0.88 + grain * 0.18);
  return c;
}
function createGroundTexture() {
  const size = 512;
  const cnv = document.createElement('canvas');
  cnv.width = cnv.height = size;
  const ctx = cnv.getContext('2d');
  ctx.fillStyle = '#586442';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 6 + Math.random() * 28;
    const t = Math.random();
    ctx.fillStyle = t < 0.3 ? 'rgba(40,57,32,0.12)' : t < 0.7 ? 'rgba(181,195,130,0.08)' : 'rgba(108,89,59,0.1)';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.32 + Math.random() * 0.5), Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 1200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 0.4 + Math.random() * 1.5;
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(29,51,23,0.35)' : 'rgba(237,224,182,0.16)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 14 + Math.random() * 24;
    const ang = Math.random() * Math.PI * 2;
    ctx.strokeStyle = Math.random() < 0.6 ? 'rgba(198,214,154,0.18)' : 'rgba(77,96,55,0.16)';
    ctx.lineWidth = 1 + Math.random() * 1.7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cnv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  tex.anisotropy = 8;
  return tex;
}
function buildTerrain() {
  const geo = new THREE.PlaneGeometry(WORLD_W, WORLD_D, SEG_X, SEG_Z);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  for (let iz = 0; iz <= SEG_Z; iz++) {
    for (let ix = 0; ix <= SEG_X; ix++) {
      const i = iz * (SEG_X + 1) + ix;
      const x = X0 + ix * STEP_X;
      const z = Z0 + iz * STEP_Z;
      const y = terrainHeight(x, z);
      pos.setXYZ(i, x, y, z);
      tmp.copy(terrainColor(x, z, y));
      col[i * 3] = tmp.r;
      col[i * 3 + 1] = tmp.g;
      col[i * 3 + 2] = tmp.b;
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    map: createGroundTexture(),
    vertexColors: true,
    roughness: 1,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  world.add(mesh);
  return mesh;
}
buildTerrain();

function createRidgeBand(opts) {
  const {
    z = -76,
    scale = 1,
    color = '#83966c',
    fogColor = '#c9d7ca',
    peaks = 6,
    amp = 8,
    depth = 22,
  } = opts;
  const geo = new THREE.PlaneGeometry(220, depth, 140, 18);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color(color);
  const fc = new THREE.Color(fogColor);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const zLocal = pos.getZ(i);
    const t = (x + 110) / 220;
    const ridge =
      Math.sin(t * Math.PI * peaks) * 0.62 +
      Math.sin(t * Math.PI * (peaks * 1.7) + 0.7) * 0.22 +
      Math.sin(t * Math.PI * (peaks * 2.9) + 2.1) * 0.12;
    const top = Math.pow(clamp(1 - Math.abs(zLocal) / (depth * 0.5), 0, 1), 1.35);
    pos.setY(i, ridge * amp * top + (1 - top) * -0.8);
    const haze = clamp((z + 110) / 230, 0, 1);
    col[i * 3] = lerp(c.r, fc.r, haze * 0.5);
    col[i * 3 + 1] = lerp(c.g, fc.g, haze * 0.5);
    col[i * 3 + 2] = lerp(c.b, fc.b, haze * 0.5);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    fog: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, 0, z);
  mesh.scale.set(scale, 1, 1);
  mesh.renderOrder = -2;
  scene.add(mesh);
  return mesh;
}
createRidgeBand({ z: -92, scale: 1.45, color: '#6c7e5c', peaks: 5, amp: 8.6, depth: 26 });
createRidgeBand({ z: -68, scale: 1.1, color: '#86a16c', peaks: 7, amp: 7, depth: 22 });
createRidgeBand({ z: -42, scale: 0.9, color: '#9bb689', peaks: 8, amp: 5.2, depth: 18 });
createRidgeBand({ z: 26, scale: 0.8, color: '#91aa79', peaks: 6, amp: 4.8, depth: 18 });
createRidgeBand({ z: 74, scale: 1.12, color: '#7a8f63', peaks: 5, amp: 6.5, depth: 24 });

function makeRock(seed, scale = 1) {
  const rand = mulberry(seed);
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#728064', roughness: 1, metalness: 0 });
  const core = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), mat);
  core.scale.set(1.1 + rand() * 0.45, 0.75 + rand() * 0.3, 0.95 + rand() * 0.4);
  g.add(core);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), new THREE.MeshStandardMaterial({ color: '#8b957d', roughness: 1 }));
  cap.position.set(-0.28, 0.34, 0.12);
  cap.scale.set(1.2, 0.8, 1.1);
  g.add(cap);
  g.scale.setScalar(scale);
  return g;
}

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeGlow(color = '#f9f2cb', size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 6, size / 2, size / 2, size / 2);
  g.addColorStop(0, color);
  g.addColorStop(0.25, color);
  g.addColorStop(0.65, 'rgba(255,255,255,0.24)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function tagInteractive(root, item) {
  root.userData.item = item;
  root.traverse((o) => {
    o.userData.item = item;
    if (o.isMesh && o.material && !o.userData._windPatched && o.name.includes('frailejon')) {
      aplicarVientoMundo(o.material, { amplitud: 0.06, piso: 0.28, velocidad: 0.9 });
      o.userData._windPatched = true;
    }
  });
}

function addHalo(root, color) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlow(color, 128),
    transparent: true,
    depthWrite: false,
    depthTest: false,
    opacity: 0.54,
  }));
  sprite.scale.setScalar(2.5);
  sprite.position.y = 1.2;
  root.add(sprite);
  return sprite;
}

function makeFrailejon(key, seed, scale = 1) {
  const lod = buildFrailejon(key, seed);
  lod.scale.setScalar(scale);
  lod.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = true;
      if (!o.material.userData?.__vientoMundo) {
        aplicarVientoMundo(o.material, { amplitud: 0.05, piso: 0.26, velocidad: 1.0 });
      }
    }
  });
  return lod;
}

function createBear(seed) {
  const rand = mulberry(seed);
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#5f5749', roughness: 1, metalness: 0 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#3f382f', roughness: 1, metalness: 0 });
  const warmMat = new THREE.MeshStandardMaterial({ color: '#7d725d', roughness: 1, metalness: 0 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 1.5, 10, 20), bodyMat);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.95;
  g.add(body);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.76, 20, 16), bodyMat);
  chest.position.set(0.42, 0.98, 0);
  chest.scale.set(1.12, 0.88, 0.96);
  g.add(chest);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 20, 16), warmMat);
  head.position.set(1.35, 1.18, 0.02);
  g.add(head);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 12), darkMat);
  snout.position.set(1.72, 1.03, 0.03);
  snout.scale.set(1.3, 0.78, 0.95);
  g.add(snout);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), darkMat);
    ear.position.set(1.23, 1.58, side * 0.2);
    ear.scale.set(1, 0.85, 1);
    g.add(ear);
  }
  const legGeo = new THREE.CapsuleGeometry(0.16, 0.62, 6, 12);
  for (const x of [-0.48, 0.26]) {
    for (const z of [-0.34, 0.34]) {
      const leg = new THREE.Mesh(legGeo, darkMat);
      leg.position.set(x, 0.32, z);
      leg.rotation.z = 0.02 * rand();
      g.add(leg);
    }
  }
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), darkMat);
  tail.position.set(-1.0, 1.05, 0);
  g.add(tail);
  const halo = addHalo(g, 'rgba(234,244,206,0.9)');
  halo.position.set(0.2, 1.1, 0.02);
  return g;
}

function createVenado(seed) {
  const rand = mulberry(seed);
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#7a684d', roughness: 1, metalness: 0 });
  const dark = new THREE.MeshStandardMaterial({ color: '#554734', roughness: 1, metalness: 0 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.45, 9, 18), mat);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.95;
  g.add(body);
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.74, 8, 14), mat);
  neck.position.set(0.92, 1.27, 0);
  neck.rotation.z = -0.55;
  g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 14), mat);
  head.position.set(1.46, 1.58, 0.02);
  head.scale.set(1.1, 0.9, 0.85);
  g.add(head);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), dark);
  muzzle.position.set(1.66, 1.48, 0.03);
  muzzle.scale.set(1.2, 0.7, 0.8);
  g.add(muzzle);
  const legGeo = new THREE.CapsuleGeometry(0.08, 0.8, 6, 10);
  for (const x of [-0.32, 0.18]) {
    for (const z of [-0.22, 0.22]) {
      const leg = new THREE.Mesh(legGeo, dark);
      leg.position.set(x, 0.25, z);
      g.add(leg);
    }
  }
  function antlerCurve(side, up) {
    const pts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.08 * side, 0.18, 0.04 * side),
      new THREE.Vector3(0.18 * side, 0.52, 0.08 * side),
      new THREE.Vector3(0.08 * side, 0.9, 0.12 * side),
    ];
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.018, 8, false);
    const mesh = new THREE.Mesh(geo, dark);
    mesh.position.set(1.36, 1.8 + up * 0.05, side * 0.09);
    return mesh;
  }
  g.add(antlerCurve(-1, rand()));
  g.add(antlerCurve(1, rand()));
  const halo = addHalo(g, 'rgba(236,244,217,0.85)');
  halo.position.set(0.8, 1.0, 0);
  return g;
}

function wingShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(1.0, 0.7, 2.8, 1.2, 4.6, 1.0);
  s.bezierCurveTo(6.6, 0.76, 8.0, 0.18, 9.0, -0.25);
  s.bezierCurveTo(7.8, -0.52, 6.2, -0.85, 4.6, -0.68);
  s.bezierCurveTo(2.7, -0.48, 1.0, -0.2, 0, 0);
  return s;
}

function makeCondor(seed) {
  const rand = mulberry(seed);
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: '#2f2a25', roughness: 1, metalness: 0, side: THREE.DoubleSide });
  const slate = new THREE.MeshStandardMaterial({ color: '#43423e', roughness: 1, metalness: 0 });
  const ivory = new THREE.MeshStandardMaterial({ color: '#e1dbc8', roughness: 1, metalness: 0 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.95, 10, 18), dark);
  body.position.y = 1.1;
  g.add(body);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 14), slate);
  chest.position.set(0.02, 0.96, 0);
  chest.scale.set(1.05, 1.18, 0.95);
  g.add(chest);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), ivory);
  head.position.set(0.46, 1.18, 0.03);
  g.add(head);
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.28, 6, 10), slate);
  neck.position.set(0.27, 1.1, 0.02);
  neck.rotation.z = -0.4;
  g.add(neck);
  const wingGeo = new THREE.ExtrudeGeometry(wingShape(), {
    depth: 0.12,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.06,
    bevelThickness: 0.03,
  });
  wingGeo.center();
  wingGeo.rotateY(Math.PI / 2);
  const left = new THREE.Mesh(wingGeo, dark);
  left.position.set(-0.05, 1.08, 0.02);
  left.rotation.z = 0.1;
  left.rotation.y = Math.PI;
  g.add(left);
  const right = new THREE.Mesh(wingGeo, dark);
  right.position.set(-0.05, 1.08, -0.02);
  right.rotation.z = -0.1;
  g.add(right);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 16), dark);
  tail.position.set(-0.42, 0.86, 0);
  tail.rotation.z = Math.PI / 2;
  g.add(tail);
  const halo = addHalo(g, 'rgba(241,238,200,0.68)');
  halo.position.set(0.02, 1.02, 0);
  g.userData.wings = { left, right, base: 0.06 + rand() * 0.03 };
  return g;
}

function addInteractive(root, item) {
  tagInteractive(root, item);
  item.root = root;
  item.baseScale = root.scale.x;
  item.halo = root.children.find((o) => o.isSprite) || null;
  interactives.push(item);
  interactiveRoots.push(root);
  world.add(root);
}

const interactives = [];
const interactiveRoots = [];
const floraPoints = [];
function placeFrailejon(key, x, z, scale, seed) {
  const lod = makeFrailejon(key, seed, scale);
  lod.position.set(x, terrainHeight(x, z), z);
  lod.rotation.y = mulberry(seed + 11)() * Math.PI * 2;
  const spec = frailejonSpec(key);
  const item = {
    type: 'frailejon',
    name: spec.common,
    scientific: spec.scientific,
    text: frailejonCopy(key),
    root: lod,
    key,
  };
  addInteractive(lod, item);
  floraPoints.push(new THREE.Vector3(x, lod.position.y, z));
  return lod;
}

function frailejonCopy(key) {
  const base = {
    grandiflora: {
      title: 'Frailejón mayor',
      body: 'Espeletia grandiflora. Planta columnar en roseta caulescente. Crece alrededor de 1 cm por año. Sus hojas muertas quedan pegadas al tallo y ayudan a retener agua; por eso el páramo funciona como fábrica de agua.',
    },
    argentea: {
      title: 'Frailejón plateado',
      body: 'Espeletia argentea. La roseta apical recoge humedad y la guarda en un tallo cubierto por hojas secas. No es un hongo ni una sombrilla: es un tallo columnar con corona de hojas.',
    },
    killipii: {
      title: 'Frailejón Killip',
      body: 'Espeletia killipii. En algunos ejemplares la arquitectura se ramifica como candelabro, pero sigue siendo frailejón: tronco columnar, skirt de hojas marcescentes y roseta viva arriba.',
    },
    lopezii: {
      title: 'Frailejón de López',
      body: 'Espeletia lopezii. Su silueta es alta y apretada para resistir frío, radiación y viento. La planta conserva agua y amortigua el clima extremo del altoandino.',
    },
    pycnophylla: {
      title: 'Frailejón de Nariño',
      body: 'Espeletia pycnophylla. La roseta es más densa y cerrada. En el páramo, esa masa de hojas vellosas reduce evaporación y captura humedad de niebla.',
    },
    uribei: {
      title: 'Frailejón de Uribe',
      body: 'Espeletia uribei. Vive en ambientes fríos y nublados. La combinación de tallo, roseta y hojas secas pegadas al fuste ayuda a sostener el flujo lento del agua.',
    },
  };
  return base[key];
}

function makeSpeciesMix() {
  return [
    ['grandiflora', -44, -8, 1.08, 12],
    ['argentea', -29, 11, 0.96, 27],
    ['killipii', -8, -3, 1.18, 33],
    ['lopezii', 18, 10, 0.92, 41],
    ['pycnophylla', 36, -6, 0.88, 55],
    ['uribei', 56, 18, 1.02, 68],
  ];
}

for (const [key, x, z, scale, seed] of makeSpeciesMix()) {
  placeFrailejon(key, x, z, scale, seed);
}
placeFrailejon('grandiflora', -31, 6, 1.32, 181);
placeFrailejon('argentea', -22, 13, 1.08, 188);
placeFrailejon('killipii', -14, 3, 1.24, 197);
placeFrailejon('pycnophylla', -6, 11, 1.16, 206);
placeFrailejon('uribei', 4, 5, 1.12, 215);
placeFrailejon('grandiflora', -12, 1, 1.36, 224);
placeFrailejon('argentea', -4, 9, 1.18, 232);
placeFrailejon('killipii', 6, 4, 1.12, 241);
placeFrailejon('pycnophylla', 14, 11, 1.0, 250);
placeFrailejon('uribei', -1, 3, 1.46, 259);
placeFrailejon('grandiflora', 9, 7, 1.34, 268);
for (let i = 0; i < 10; i++) {
  const key = buildFrailejonKey(i);
  const x = lerp(-74, 72, (i % 5) / 4) + (i % 2 ? 6 : -6);
  const z = trailZ(x) + (i < 5 ? -18 : 18) + (i % 3 - 1) * 4.5;
  placeFrailejon(key, x, z, 0.76 + (i % 4) * 0.08, 110 + i * 13);
}

function buildFrailejonKey(i) {
  const keys = ['grandiflora', 'argentea', 'killipii', 'lopezii', 'pycnophylla', 'uribei'];
  return keys[i % keys.length];
}

function placeBear(x, z, seed) {
  const bear = createBear(seed);
  bear.position.set(x, terrainHeight(x, z) + 0.02, z);
  bear.rotation.y = -0.8;
  const item = {
    type: 'animal',
    name: 'Oso de anteojos',
    scientific: 'Tremarctos ornatus',
    text: {
      title: 'Oso de anteojos',
      body: 'El único oso de Sudamérica. En el páramo usa plantas, frutos y bromelias como parte de su dieta, y ayuda a dispersar semillas. No vive en línea recta: recorre el gradiente frío entre bosque alto y altura abierta.',
    },
    root: bear,
  };
  addInteractive(bear, item);
  return bear;
}

function placeVenado(x, z, seed) {
  const deer = createVenado(seed);
  deer.position.set(x, terrainHeight(x, z) + 0.02, z);
  deer.rotation.y = 2.5;
  const item = {
    type: 'animal',
    name: 'Venado de cola blanca',
    scientific: 'Odocoileus virginianus',
    text: {
      title: 'Venado de cola blanca',
      body: 'Mamífero herbívoro de bordes abiertos y matorrales. Se mueve con cautela por las quebradas y pastizales altos. Su dieta cambia con la estación y con la oferta del relieve.',
    },
    root: deer,
  };
  addInteractive(deer, item);
  return deer;
}

function placeCondor(x, z, seed) {
  const condor = makeCondor(seed);
  condor.position.set(x, terrainHeight(x, z) + 8.5, z);
  condor.rotation.y = -1.4;
  const item = {
    type: 'animal',
    name: 'Cóndor andino',
    scientific: 'Vultur gryphus',
    text: {
      title: 'Cóndor andino',
      body: 'Planeador de gran envergadura, adaptado a aprovechar térmicas y corrientes de ladera. Es carroñero: limpia el paisaje y usa las rocas altas y los farallones como mirador.',
    },
    root: condor,
  };
  addInteractive(condor, item);
  return condor;
}

placeBear(-18, trailZ(-18) + 11, 301);
placeVenado(26, trailZ(26) - 14, 402);
placeCondor(44, -28, 512);

const pathPoints = [];
for (let i = 0; i <= 52; i++) {
  const x = lerp(-86, 84, i / 52);
  const z = trailZ(x);
  pathPoints.push(new THREE.Vector3(x, terrainHeight(x, z) + 0.02, z));
}
const pathGeo = new THREE.CatmullRomCurve3(pathPoints).getSpacedPoints(160);
const pathLine = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints(pathGeo.map((p) => p.clone().add(new THREE.Vector3(0, 0.1, 0)))),
  new THREE.LineBasicMaterial({ color: 0xf2ead2, transparent: true, opacity: 0.48 })
);
world.add(pathLine);

const grassClusters = [];
for (let i = 0; i < 28; i++) {
  const x = lerp(-78, 76, hash2(i, 17));
  const z = trailZ(x) + lerp(-30, 28, hash2(i, 27));
  grassClusters.push({ x, y: terrainHeight(x, z) + 0.03, z });
}
crearParchePasto(world, {
  puntos: grassClusters,
  densidad: 7,
  radio: 1.15,
  altura: [0.18, 0.62],
  ancho: 0.022,
  segmentos: 5,
  colorBase: '#4e6c36',
  colorPunta: '#b0c47a',
  tinteJitter: 0.15,
  viento: 0.95,
  combado: 0.28,
  name: 'pajonal',
});

const stones = [];
for (let i = 0; i < 18; i++) {
  const x = lerp(-80, 78, hash2(i, 9));
  const z = trailZ(x) + lerp(-16, 16, hash2(i, 15));
  const r = 0.5 + hash2(i, 21) * 1.1;
  const rock = makeRock(i * 13 + 5, r);
  rock.position.set(x, terrainHeight(x, z) + 0.02, z);
  rock.rotation.set(hash2(i, 5) * 0.1, hash2(i, 7) * Math.PI * 2, hash2(i, 3) * 0.1);
  world.add(rock);
  stones.push(rock);
}

const player = {
  pos: new THREE.Vector3(-18, terrainHeight(-18, trailZ(-18)) + 1.9, trailZ(-18) + 3.5),
  // El spawn miraba al cuadrante -x/-z, vacío: 21 de los 27 frailejones quedaban
  // literalmente detrás de la cámara y solo 2 caían en el frustum. El frailejonal
  // denso está en +x/+z. Barrido de yaw sobre la proyección del propio main.js:
  // 3.42 rad deja 15 frailejones en cuadro (12 a menos de 40 m, el más cercano a
  // 13.1 m) y el oso de anteojos a 8.1 m. Ver _gate/INFORME-PARAMO-VIVO-DIAGNOSTICO.md
  yaw: 3.42,
  pitch: -0.22,
  speed: 7.6,
  current: null,
};
camera.position.copy(player.pos);
window.__player = player;

const keys = { left: false, right: false, fwd: false, back: false };
const drag = { active: false, id: null, x: 0, y: 0 };
const btnMap = [
  ['leftBtn', 'left', -1],
  ['rightBtn', 'right', 1],
  ['fwdBtn', 'fwd', 1],
  ['backBtn', 'back', -1],
];

function bindHoldButton(id, key, mult = 1) {
  const el = document.getElementById(id);
  if (!el) return;
  const on = (e) => { e.preventDefault(); keys[key] = true; el.classList.add('down'); };
  const off = () => { keys[key] = false; el.classList.remove('down'); };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off);
  el.addEventListener('pointerleave', off);
  el.addEventListener('pointercancel', off);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  if (key === 'left' || key === 'right' || mult < 0) {
    el.addEventListener('pointerdown', (e) => {
      if (key === 'left') player.yaw += 0.06;
      if (key === 'right') player.yaw -= 0.06;
      if (key === 'back') keys.back = true;
      if (key === 'fwd') keys.fwd = true;
    });
  }
}
btnMap.forEach(([id, key, mult]) => bindHoldButton(id, key, mult));

const goBtn = document.getElementById('goBtn');
goBtn.addEventListener('click', () => interactCurrent());

addEventListener('keydown', (e) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE'].includes(e.code)) e.preventDefault();
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
  if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.fwd = true;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.back = true;
  if (e.code === 'Space' || e.code === 'KeyE') interactCurrent();
});
addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.fwd = false;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.back = false;
});

canvas.addEventListener('pointerdown', (e) => {
  drag.active = true;
  drag.id = e.pointerId;
  drag.x = e.clientX;
  drag.y = e.clientY;
  canvas.setPointerCapture?.(e.pointerId);
  if (e.isPrimary && e.detail === 1) {
    if (e.clientX > innerWidth * 0.35) player.yaw += 0.0;
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag.active || drag.id !== e.pointerId) return;
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  drag.x = e.clientX;
  drag.y = e.clientY;
  player.yaw -= dx * 0.0048;
  player.pitch = clamp(player.pitch - dy * 0.0035, -0.55, 0.28);
});
canvas.addEventListener('pointerup', (e) => {
  if (drag.id === e.pointerId) {
    drag.active = false;
    drag.id = null;
  }
  if (currentPick) {
    focusItem(currentPick);
  }
});
canvas.addEventListener('pointercancel', () => {
  drag.active = false;
  drag.id = null;
});

const infoState = {
  pinned: null,
  current: null,
  introSeen: false,
  hintTimer: 0,
};

function focusItem(item) {
  infoState.pinned = item;
  detailTitle.textContent = item.text.title || item.name;
  detailBody.textContent = item.text.body || item.text;
  detailTiny.textContent = `${item.name} · ${item.scientific}`;
  showHint(`${item.name}`);
}

function showHint(msg) {
  hintEl.textContent = msg;
  hintEl.classList.add('show');
  clearTimeout(showHint._t);
  showHint._t = setTimeout(() => hintEl.classList.remove('show'), 1300);
}

function nearestInteractive() {
  const origin = camera.position;
  let best = null;
  let bestD = Infinity;
  for (const item of interactives) {
    const p = new THREE.Vector3();
    item.root.getWorldPosition(p);
    const d = origin.distanceTo(p);
    if (d < bestD) {
      bestD = d;
      best = item;
    }
  }
  return { item: best, dist: bestD };
}

let currentPick = null;
function updateAiming() {
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(interactiveRoots, true);
  let picked = null;
  for (const hit of hits) {
    let o = hit.object;
    while (o) {
      if (o.userData?.item) {
        picked = o.userData.item;
        break;
      }
      o = o.parent;
    }
    if (picked) break;
  }
  currentPick = picked;
  infoState.current = picked;
  if (picked) {
    const label = picked.name;
    const near = nearestInteractive();
    const d = near.item === picked ? near.dist : null;
    const hint = d != null && d < 10 ? 'Toca para leer la ficha' : 'Mire más cerca';
    if (!infoState.pinned) {
      detailTitle.textContent = picked.text.title || label;
      detailBody.textContent = picked.text.body || '';
      detailTiny.textContent = `${picked.name} · ${picked.scientific}`;
    }
    if (!infoState.introSeen || Math.random() < 0.01) showHint(`${label} · ${hint}`);
  } else if (!infoState.pinned) {
    detailTitle.textContent = 'Acérquese a un frailejón o a un animal';
    detailBody.textContent = 'Cada punto del paisaje cuenta algo real. Toca un objeto para fijarlo y leer su ficha. El páramo domina el verde, pero el suelo nunca es una cobija uniforme.';
    detailTiny.textContent = 'Firewatch + lámina de Humboldt';
  }
}

function interactCurrent() {
  const target = currentPick || nearestInteractive().item;
  if (!target) return;
  infoState.introSeen = true;
  focusItem(target);
}

function updatePlayer(dt) {
  const turn = 1.6 * dt;
  if (keys.left) player.yaw += turn;
  if (keys.right) player.yaw -= turn;
  // La cámara (rotation.order='YXZ', rotation.y=yaw) mira a (-sin yaw, 0, -cos yaw).
  // Este vector venía sin los signos, así que W caminaba ~180° opuesto a la vista.
  const fwd = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const move = new THREE.Vector3();
  if (keys.fwd) move.add(fwd);
  if (keys.back) move.sub(fwd);
  const speed = player.speed * (0.72 + 0.18 * Math.cos(performance.now() * 0.0012));
  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(speed * dt);
    player.pos.add(move);
    infoState.introSeen = true;
    introEl.style.opacity = '0';
  }
  player.pos.x = clamp(player.pos.x, X0 + 3, X1 - 3);
  player.pos.z = clamp(player.pos.z, Z0 + 3, Z1 - 3);
  const gy = terrainHeight(player.pos.x, player.pos.z);
  player.pos.y = gy + 1.74 + Math.sin(performance.now() * 0.006) * 0.02;
  camera.position.copy(player.pos);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
}

function updateAnimals(t) {
  for (const item of interactives) {
    if (!item.root) continue;
    if (item.type === 'animal' && item.name === 'Cóndor andino') {
      item.root.position.y = terrainHeight(item.root.position.x, item.root.position.z) + 8.2 + Math.sin(t * 1.4) * 0.55;
      item.root.rotation.z = Math.sin(t * 0.7) * 0.07;
      item.root.rotation.x = Math.sin(t * 0.8) * 0.04;
      const wings = item.root.userData.wings;
      if (wings) {
        wings.left.rotation.y = Math.sin(t * 1.25) * 0.18 + Math.PI;
        wings.right.rotation.y = -Math.sin(t * 1.25) * 0.18;
        wings.left.rotation.z = 0.18 + Math.sin(t * 0.7) * 0.06;
        wings.right.rotation.z = -0.18 - Math.sin(t * 0.7) * 0.06;
      }
    }
    if (item.type === 'animal' && item.name === 'Oso de anteojos') {
      item.root.rotation.y = -0.82 + Math.sin(t * 0.25) * 0.1;
      item.root.position.y = terrainHeight(item.root.position.x, item.root.position.z) + 0.02 + Math.sin(t * 1.2) * 0.025;
    }
    if (item.type === 'animal' && item.name === 'Venado de cola blanca') {
      item.root.rotation.y = 2.45 + Math.sin(t * 0.2) * 0.05;
      item.root.position.y = terrainHeight(item.root.position.x, item.root.position.z) + 0.02 + Math.sin(t * 1.1) * 0.02;
    }
  }
}

function updateFrailejons(t) {
  for (const item of interactives) {
    if (item.type !== 'frailejon') continue;
    item.root.rotation.y += Math.sin(t * 0.15 + item.root.position.x * 0.03) * 0.0004;
  }
}

function updatePerf(dt) {
  const fps = Math.round(1 / Math.max(dt, 1 / 240));
  perfEl.textContent = `FPS ${fps}\nObj ${interactives.length}`;
}

const existingKeys = {};
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function animate() {
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  tickVientoMundos(t);
  updatePlayer(dt);
  updateAnimals(t);
  updateFrailejons(t);
  updateAiming();
  renderer.render(scene, camera);
  updatePerf(dt);
  requestAnimationFrame(animate);
}

setTimeout(() => {
  introEl.style.opacity = '0.55';
  introEl.style.transition = 'opacity .35s ease';
}, 1400);

if (EMBEDDED) {
  introEl.style.display = 'none';
}

showHint('Camine hacia el valle o toque una planta');
animate();
