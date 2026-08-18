import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from '../../lib3d/geom/three-mesh-bvh.js';
import { BESTIARIO } from './criaturas/index.js';

THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

export function montarAtlas({ activo = false, debug = false } = {}) {
  if (!activo) {
    document.documentElement.dataset.atlasCodex = 'apagado';
    const loadingMessage = document.getElementById('loading');
    if (loadingMessage) {
      loadingMessage.textContent = 'Atlas apagado · agrega ?atlas=1 para abrirlo';
      loadingMessage.classList.remove('hidden');
    }
    return false;
  }

  function montarDebugAxes({ activo = false } = {}) {
    if (!activo) return null;
    const axes = new THREE.AxesHelper(1.25);
    scene.add(axes);
    return axes;
  }

// Movimiento reducido: apaga la rotación del halo (adorno). El giro del animal
// y el suavizado de cámara siguen al dedo del usuario y se conservan. Se
// escucha el cambio: la preferencia puede activarse con la página abierta.
let reducedMotion = typeof matchMedia === 'function'
  && matchMedia('(prefers-reduced-motion: reduce)').matches;
const rmQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
if (rmQuery?.addEventListener) {
  rmQuery.addEventListener('change', () => { reducedMotion = rmQuery.matches; window.__bestiarioReducedMotion = reducedMotion; });
}
window.__bestiarioReducedMotion = reducedMotion;

const canvas = document.getElementById('scene');
const viewport = document.getElementById('viewport');
const speciesList = document.getElementById('speciesList');
const loading = document.getElementById('loading');
const animalName = document.getElementById('animalName');
const animalLatin = document.getElementById('animalLatin');
const animalRole = document.getElementById('animalRole');
const animalDesc = document.getElementById('animalDesc');
const pointTitle = document.getElementById('pointTitle');
const pointBody = document.getElementById('pointBody');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#183221');
scene.fog = new THREE.FogExp2('#173020', 0.018);

const camera = new THREE.PerspectiveCamera(42, 1, 0.03, 140);
camera.position.set(0.8, 0.5, 3.2);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = false;

const hemi = new THREE.HemisphereLight(0xe5ffd0, 0x27401f, 1.55);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff5d6, 2.25);
sun.position.set(-0.8, 1.4, 0.9);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xa4d3a0, 0.88);
fill.position.set(1.1, 0.6, -0.8);
scene.add(fill);
const bounce = new THREE.DirectionalLight(0xcdb06b, 0.32);
bounce.position.set(0.2, -0.6, 0.4);
scene.add(bounce);

const ground = buildGround();
scene.add(ground);
const halo = buildHalo();
scene.add(halo);
montarDebugAxes({ activo: debug });

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const state = {
  speciesId: 'oso',
  speciesRoot: null,
  current: null,
  pointMeshes: [],
  occluders: [],
  selectedPointId: null,
  down: null,
  orbit: { theta: 0.85, phi: 0.22, radius: 3.4 },
  targetOrbit: { theta: 0.85, phi: 0.22, radius: 3.4 },
  target: new THREE.Vector3(0, 0.45, 0),
  hover: null,
};

const SPECIES_ID_ALIASES = {
  zarigueya: 'zariguella',
  'luciérnaga': 'luciernaga',
};

function canonicalSpeciesId(id) {
  return SPECIES_ID_ALIASES[id] || id;
}

function speciesIsReady(spec) {
  return typeof spec?.construir === 'function';
}

const requestedSpeciesId = canonicalSpeciesId(
  new URL(globalThis.location.href).searchParams.get('bicho')
    || new URL(globalThis.location.href).searchParams.get('especie')
    || globalThis.location.hash.replace(/^#/, '')
    || 'oso',
);

const pointMaterial = new THREE.MeshStandardMaterial({
  color: 0xe8ff8e,
  emissive: 0x7ea514,
  emissiveIntensity: 0.45,
  roughness: 0.3,
  metalness: 0.02,
});
const pointMaterialActive = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xffd36b,
  emissiveIntensity: 0.95,
  roughness: 0.2,
  metalness: 0.03,
});
const pointMaterialHover = new THREE.MeshStandardMaterial({
  color: 0xf9ffcf,
  emissive: 0xa4d43d,
  emissiveIntensity: 0.75,
  roughness: 0.24,
  metalness: 0.02,
});

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
  let amp = 0.55;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < 5; i++) {
    sum += noise2(x * freq, z * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.02;
  }
  return sum / norm;
}

function buildGround() {
  const geo = new THREE.PlaneGeometry(30, 30, 130, 130);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x * 0.34, z * 0.34);
    const y = -0.48 + (fbm(x * 0.12, z * 0.12) - 0.5) * 0.22 - smoothstep(8, 15, r) * 0.3;
    pos.setY(i, y);
    const moss = new THREE.Color('#5f7643');
    const leaf = new THREE.Color('#8ea95a');
    const soil = new THREE.Color('#4e5840');
    const wet = new THREE.Color('#6b8158');
    const glow = new THREE.Color('#b9d79a');
    const t = clamp(0.32 + fbm(x * 0.1, z * 0.1) * 0.5 - y * 0.08, 0, 1);
    color.copy(soil).lerp(moss, t);
    color.lerp(leaf, clamp(t * 0.52 + smoothstep(-0.2, 0.1, y) * 0.2, 0, 1));
    color.lerp(wet, clamp(smoothstep(6.5, 13, r) * 0.2, 0, 0.2));
    color.lerp(glow, clamp(smoothstep(12, 17, r) * 0.12, 0, 0.12));
    col[i * 3] = color.r;
    col[i * 3 + 1] = color.g;
    col[i * 3 + 2] = color.b;
  }
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.position.y = -0.02;
  return mesh;
}

function buildHalo() {
  const g = new THREE.SphereGeometry(24, 44, 30);
  const m = new THREE.MeshBasicMaterial({
    color: 0x2a4f31,
    transparent: true,
    opacity: 0.10,
    side: THREE.BackSide,
  });
  const s = new THREE.Mesh(g, m);
  s.position.y = 2;
  return s;
}

function makeLeafTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, 'rgba(255,255,255,0.0)');
  grd.addColorStop(0.48, 'rgba(216,248,170,0.28)');
  grd.addColorStop(1, 'rgba(214,255,152,0.82)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(85,108,55,0.42)';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(128, 16);
  g.quadraticCurveTo(52, 88, 68, 166);
  g.quadraticCurveTo(128, 232, 188, 166);
  g.quadraticCurveTo(204, 88, 128, 16);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function setSize() {
  const rect = viewport.getBoundingClientRect();
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function clearSpeciesRoot() {
  if (state.speciesRoot) {
    scene.remove(state.speciesRoot);
    state.speciesRoot.traverse((o) => {
      if (o.isMesh && o.geometry?.disposeBoundsTree) o.geometry.disposeBoundsTree();
      if (o.isMesh) {
        o.geometry?.dispose?.();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
        else o.material?.dispose?.();
      }
    });
  }
  state.speciesRoot = null;
  state.current = null;
  state.pointMeshes = [];
  state.occluders = [];
  state.selectedPointId = null;
}

function fitOrbitToBox(box) {
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  state.target.copy(center);
  const maxDim = Math.max(size.x, size.y, size.z);
  const radius = Math.max(maxDim * 1.18, 0.34);
  state.targetOrbit.radius = radius * 1.08 + 0.32;
  state.targetOrbit.theta = 0.92;
  state.targetOrbit.phi = maxDim < 0.18 ? 0.22 : 0.46;

  if (maxDim < 0.12) {
    state.targetOrbit.radius = 0.88;
    state.targetOrbit.phi = 0.18;
  }
}

function placeRoot(root, scale = 1) {
  root.scale.setScalar(scale);
  scene.add(root);
  root.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(root);
  const center = new THREE.Vector3();
  box.getCenter(center);
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  root.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(root);
}

function attachBounds(mesh) {
  if (mesh?.geometry?.computeBoundsTree) mesh.geometry.computeBoundsTree();
}

function createPoint(spec, punto, scale, idx) {
  const posicion = punto?.posicion;
  if (!Array.isArray(posicion) || posicion.length < 3 || posicion.some((v) => !Number.isFinite(v))) {
    throw new Error(`atlas: punto "${punto?.id || 'sin-id'}" sin posicion finita`);
  }
  const geo = new THREE.SphereGeometry(Math.max(0.02, Math.min(0.08, scale * 0.0025)), 14, 10);
  const mat = idx === 0 ? pointMaterialActive.clone() : pointMaterial.clone();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(posicion[0] * scale, posicion[1] * scale, posicion[2] * scale);
  mesh.userData = {
    speciesId: spec.id,
    pointId: punto.id,
    label: punto.etiqueta,
    desc: punto.descripcion,
  };
  return mesh;
}

function buildSpecies(spec) {
  clearSpeciesRoot();
  state.hover = null;
  let built = null;

  const root = new THREE.Group();
  root.name = `species-${spec.id}`;
  root.position.set(0, 0, 0);
  scene.add(root);

  if (speciesIsReady(spec)) {
    built = spec.construir();
    const animal = built.grupo;
    root.add(animal);
    if (animal.rotation?.y !== undefined) animal.rotation.y = -0.22;

    built.grupo.updateWorldMatrix(true, true);
    const builtBox = new THREE.Box3().setFromObject(built.grupo);
    const builtSize = builtBox.getSize(new THREE.Vector3());
    const builtMaxDim = Math.max(builtSize.x, builtSize.y, builtSize.z);
    const scale = builtMaxDim > 0 ? 1.7 / builtMaxDim : 1;
    if (scale !== 1) animal.scale.setScalar(scale);

    animal.traverse((o) => {
      if (o.isMesh) attachBounds(o);
    });

    const pointGroup = new THREE.Group();
    pointGroup.name = 'puntos';
    const points = [];
    built.puntos.forEach((p, idx) => {
      const dot = createPoint(spec, { ...p, id: p.id }, scale, idx);
      pointGroup.add(dot);
      points.push(dot);
    });
    root.add(pointGroup);
    state.pointMeshes = points;
    state.occluders = [];
    animal.traverse((o) => {
      if (o.isMesh) state.occluders.push(o);
    });
  } else {
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 1.1, 1, 1),
      new THREE.MeshStandardMaterial({
        color: 0x26412c,
        roughness: 0.92,
        metalness: 0,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      }),
    );
    plaque.position.set(0, 0.95, 0);
    root.add(plaque);
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 1.3, 10),
      new THREE.MeshStandardMaterial({ color: 0x6d8c4c, roughness: 0.95 }),
    );
    stem.position.set(0, 0.05, 0);
    root.add(stem);
    const leafTex = makeLeafTexture();
    const leaf = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 1.6, 1, 1),
      new THREE.MeshStandardMaterial({
        map: leafTex,
        transparent: true,
        alphaTest: 0.05,
        side: THREE.DoubleSide,
        roughness: 0.95,
        metalness: 0,
      }),
    );
    leaf.position.set(0.58, 1.7, 0);
    leaf.rotation.z = 0.28;
    root.add(leaf);
    state.pointMeshes = [];
    state.occluders = [];
  }

  const ficha = built?.ficha || {};
  animalName.textContent = ficha.nombreComun || spec.nombre;
  animalLatin.textContent = ficha.nombreCientifico || spec.nombreCientifico || 'Nombre científico por verificar';
  animalRole.textContent = ficha.rol || spec.rol;
  animalDesc.textContent = [spec.tamano, spec.donde].filter(Boolean).join(' · ') || spec.apodo || spec.rol;
  pointTitle.textContent = speciesIsReady(spec) ? 'Toca un punto' : 'Modelo pendiente';
  pointBody.textContent = speciesIsReady(spec)
    ? 'Los puntos aparecen sobre la anatomía y se ocultan cuando quedan detrás del cuerpo.'
    : 'Este compañero todavía no está modelado en 3D. La ficha ya quedó lista para cuando entre a taller.';

  root.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(root);
  const center = new THREE.Vector3();
  box.getCenter(center);
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  root.updateWorldMatrix(true, true);
  fitOrbitToBox(new THREE.Box3().setFromObject(root));

  state.speciesRoot = root;
  state.current = spec;
  state.selectedPointId = null;
  if (speciesIsReady(spec) && built?.puntos?.length) {
    state.selectedPointId = built.puntos[0].id;
    setPointCard(built.puntos[0].etiqueta, built.puntos[0].descripcion);
  }
  highlightSpeciesButtons(spec.id);
  loading.classList.add('hidden');
}

function setPointCard(title, body) {
  pointTitle.textContent = title;
  pointBody.textContent = body;
}

function highlightSpeciesButtons(id) {
  for (const btn of speciesList.querySelectorAll('button')) {
    btn.classList.toggle('active', btn.dataset.id === id);
  }
}

function buildSpeciesButtons() {
  speciesList.innerHTML = '';
  for (const spec of BESTIARIO) {
    const btn = document.createElement('button');
    btn.className = `speciesBtn${speciesIsReady(spec) ? '' : ' pending'}`;
    btn.dataset.id = spec.id;
    btn.innerHTML = `
      <strong>${spec.nombre}</strong>
      <span>${spec.nombreCientifico || 'Pendiente de verificación'}</span>
      <small>${spec.rol}</small>
    `;
    btn.addEventListener('click', () => buildSpecies(spec));
    speciesList.appendChild(btn);
  }
}

function updateCamera(dt) {
  state.orbit.theta += (state.targetOrbit.theta - state.orbit.theta) * Math.min(1, dt * 4.5);
  state.orbit.phi += (state.targetOrbit.phi - state.orbit.phi) * Math.min(1, dt * 4.5);
  state.orbit.radius += (state.targetOrbit.radius - state.orbit.radius) * Math.min(1, dt * 4.5);
  const sinPhi = Math.sin(state.orbit.phi);
  const cosPhi = Math.cos(state.orbit.phi);
  const sinTheta = Math.sin(state.orbit.theta);
  const cosTheta = Math.cos(state.orbit.theta);
  camera.position.set(
    state.target.x + state.orbit.radius * sinPhi * cosTheta,
    state.target.y + state.orbit.radius * cosPhi,
    state.target.z + state.orbit.radius * sinPhi * sinTheta,
  );
  camera.lookAt(state.target);
}

function updatePointVisibility() {
  if (!state.pointMeshes.length || !state.occluders.length) return;
  const cam = camera.position.clone();
  const target = new THREE.Vector3();
  for (const mesh of state.pointMeshes) {
    mesh.getWorldPosition(target);
    const dist = cam.distanceTo(target);
    const dir = target.clone().sub(cam).normalize();
    raycaster.set(cam, dir);
    raycaster.far = Math.max(0, dist - 0.01);
    const hits = raycaster.intersectObjects(state.occluders, true);
    const occluded = hits.length > 0;
    mesh.visible = !occluded;
    const base = mesh.userData.pointId === state.selectedPointId;
    mesh.material = base ? pointMaterialActive : (mesh === state.hover ? pointMaterialHover : pointMaterial);
    mesh.scale.setScalar(base ? 1.35 : mesh === state.hover ? 1.18 : 1);
  }
}

function pickPoint(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(state.pointMeshes, false);
  return hits[0]?.object || null;
}

function setActivePoint(mesh) {
  if (!mesh) return;
  state.selectedPointId = mesh.userData.pointId;
  setPointCard(mesh.userData.label, mesh.userData.desc);
}

function handleMove(e) {
  if (!speciesIsReady(state.current)) return;
  const hit = pickPoint(e.clientX, e.clientY);
  state.hover = hit || null;
  canvas.style.cursor = hit ? 'pointer' : 'grab';
}

function onPointerDown(e) {
  if (e.button !== 0) return;
  state.down = { x: e.clientX, y: e.clientY, hit: pickPoint(e.clientX, e.clientY) };
  canvas.setPointerCapture?.(e.pointerId);
  canvas.style.cursor = 'grabbing';
}

function onPointerMove(e) {
  if (!state.down) {
    handleMove(e);
    return;
  }
  const dx = e.clientX - state.down.x;
  const dy = e.clientY - state.down.y;
  if (Math.hypot(dx, dy) < 3) return;
  state.targetOrbit.theta -= dx * 0.0044;
  state.targetOrbit.phi = clamp(state.targetOrbit.phi + dy * 0.0033, -0.08, Math.PI / 2 - 0.12);
  state.down.x = e.clientX;
  state.down.y = e.clientY;
}

function onPointerUp(e) {
  if (!state.down) return;
  const dx = e.clientX - state.down.x;
  const dy = e.clientY - state.down.y;
  const moved = Math.hypot(dx, dy) > 5;
  if (!moved && state.down.hit) setActivePoint(state.down.hit);
  state.down = null;
  canvas.style.cursor = 'grab';
}

function onWheel(e) {
  if (!state.current) return;
  e.preventDefault();
  const delta = Math.sign(e.deltaY);
  const factor = delta > 0 ? 1.12 : 0.9;
  state.targetOrbit.radius = clamp(state.targetOrbit.radius * factor, 0.22, 18);
}

function animate() {
  const dt = Math.min(0.05, clock.getDelta());
  updateCamera(dt);
  updatePointVisibility();
  if (!reducedMotion) halo.rotation.y += dt * 0.025;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

const clock = new THREE.Clock();
buildSpeciesButtons();
buildSpecies(BESTIARIO.find((s) => s.id === requestedSpeciesId && speciesIsReady(s)) || BESTIARIO[0]);
setSize();
animate();

window.addEventListener('resize', setSize);
canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointercancel', onPointerUp);
canvas.addEventListener('wheel', onWheel, { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function buildPendingBackdrop() {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x38583a,
    roughness: 0.95,
    metalness: 0,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.08, 10, 42), mat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.82;
  return ring;
}

void buildPendingBackdrop;
  return true;
}

const atlasParams = new URL(globalThis.location.href).searchParams;
montarAtlas({
  activo: atlasParams.get('atlas') === '1',
  debug: atlasParams.get('debug') === '1',
});
