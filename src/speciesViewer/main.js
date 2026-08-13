import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getPerspectiveFitDistanceForSilhouette } from './cameraFit.js';
import { projectHotspot, snapHotspotsToSurface } from './hotspots.js';
import { SPECIES } from './speciesData.js';

const canvas = /** @type {HTMLCanvasElement} */ (document.querySelector('#species-canvas'));
const stage = /** @type {HTMLElement} */ (document.querySelector('#stage-wrap'));
const hotspotLayer = /** @type {HTMLElement} */ (document.querySelector('#hotspot-layer'));
const posterFallback = /** @type {HTMLElement} */ (document.querySelector('#poster-fallback'));
const posterImage = /** @type {HTMLImageElement} */ (document.querySelector('#poster-image'));
const hotspotCard = /** @type {HTMLElement} */ (document.querySelector('#hotspot-card'));
const model = { group: null, anchors: [], species: SPECIES[0], fitDistance: 2.4, maxExtent: 1 };
const state = {
  autoRotate: true,
  poster: false,
  distance: 'medium',
  seed: Number(new URLSearchParams(window.location.search).get('seed')) || 20260807,
  yaw: 0,
  pitch: 0.08,
  phase: 0,
  frame: 0,
  pointer: null,
  raf: 0,
};

let renderer;
let camera;
let scene;
let water;
let raycaster;
let lastOcclusion = new Map();

const DISTANCE_SCALE = { close: 0.78, medium: 1, wide: 1.46 };

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function colorFor(species, part) {
  const palette = {
    solanum_lycopersicum: { stem: '#628a58', leaf: '#91b970', fruit: '#d96b4f' },
    zea_mays: { stem: '#a4a958', leaf: '#9dbd67', fruit: '#dfb863' },
    persea_americana: { stem: '#6f5e42', leaf: '#5f8f62', fruit: '#8ba25a' },
  };
  return palette[species.id]?.[part] || '#91b970';
}

function makeMaterial(color, roughness = 0.72) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 });
}

/**
 * @param {import('three').Object3D} group
 * @param {import('three').BufferGeometry} geometry
 * @param {import('three').Material} material
 * @param {[number, number, number]} position
 * @param {[number, number, number]} [scale]
 * @param {[number, number, number]} [rotation]
 */
function addMesh(group, geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  mesh.userData.isSpecimenSurface = true;
  group.add(mesh);
  return mesh;
}

/**
 * @param {import('three').Object3D} group
 * @param {import('three').Material} material
 * @param {[number, number, number]} position
 * @param {[number, number, number]} scale
 * @param {[number, number, number]} rotation
 */
function addLeaf(group, material, position, scale, rotation) {
  return addMesh(
    group,
    new THREE.SphereGeometry(0.46, 14, 8),
    material,
    position,
    scale,
    rotation,
  );
}

/**
 * @param {import('three').Object3D} group
 * @param {import('three').Material} material
 * @param {[number, number, number]} position
 * @param {[number, number, number]} [scale]
 */
function addFruit(group, material, position, scale = [0.18, 0.18, 0.18]) {
  return addMesh(group, new THREE.SphereGeometry(0.5, 18, 12), material, position, scale);
}

function createProceduralSpecimen(species, seed) {
  const random = seededRandom(seed + species.id.length * 31);
  const group = new THREE.Group();
  group.name = `${species.id}-procedural-placeholder`;
  group.userData.speciesId = species.id;
  const stem = makeMaterial(colorFor(species, 'stem'));
  const leaf = makeMaterial(colorFor(species, 'leaf'));
  const fruit = makeMaterial(colorFor(species, 'fruit'), 0.46);

  if (species.id === 'solanum_lycopersicum') {
    addMesh(group, new THREE.CylinderGeometry(0.075, 0.11, 1.9, 12), stem, [0, 0.1, 0]);
    for (let index = 0; index < 7; index += 1) {
      const angle = index * 0.9 + random() * 0.2;
      addLeaf(group, leaf, [Math.cos(angle) * 0.28, 0.25 + index * 0.16, Math.sin(angle) * 0.16], [0.58, 0.08, 0.24], [0.15, angle, -0.08]);
    }
    for (let index = 0; index < 4; index += 1) {
      const angle = index * 1.8 + random();
      addFruit(group, fruit, [Math.cos(angle) * 0.28, 0.08 + (index % 2) * 0.2, Math.sin(angle) * 0.24], [0.22, 0.24, 0.22]);
    }
  } else if (species.id === 'zea_mays') {
    addMesh(group, new THREE.CylinderGeometry(0.1, 0.15, 2.7, 12), stem, [0, 0.48, 0]);
    for (let index = 0; index < 8; index += 1) {
      const angle = index * 0.84 + random() * 0.25;
      const lean = index % 2 === 0 ? 0.52 : -0.48;
      addLeaf(group, leaf, [Math.cos(angle) * 0.2, -0.15 + index * 0.2, Math.sin(angle) * 0.16], [0.75, 0.07, 0.13], [lean, angle, 0.08]);
    }
    addFruit(group, fruit, [0.18, 0.12, 0.16], [0.14, 0.42, 0.14]);
  } else {
    addMesh(group, new THREE.CylinderGeometry(0.14, 0.24, 1.7, 14), stem, [0, -0.05, 0]);
    for (let index = 0; index < 9; index += 1) {
      const angle = index * 0.7 + random() * 0.4;
      const radius = 0.35 + (index % 3) * 0.1;
      addLeaf(group, leaf, [Math.cos(angle) * radius, 0.55 + (index % 4) * 0.22, Math.sin(angle) * radius], [0.7, 0.26, 0.52], [random() * 0.22, angle, random() * 0.18]);
    }
    addFruit(group, fruit, [0.3, 0.35, 0.2], [0.18, 0.3, 0.18]);
    addFruit(group, fruit, [-0.28, 0.55, 0.15], [0.15, 0.25, 0.15]);
  }

  return group;
}

function createWaterWashTexture() {
  const surface = document.createElement('canvas');
  surface.width = 256;
  surface.height = 256;
  const context = surface.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 12, 128, 128, 150);
  gradient.addColorStop(0, '#b8cf9a');
  gradient.addColorStop(0.42, '#6f9c83');
  gradient.addColorStop(1, '#29483f');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  context.globalAlpha = 0.28;
  context.strokeStyle = '#e4d58b';
  context.lineWidth = 2;
  for (let index = 0; index < 18; index += 1) {
    context.beginPath();
    context.ellipse(128, 128, 28 + index * 5, 12 + index * 2.5, index * 0.3, 0, Math.PI * 2);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createStage() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#111b12');
  camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.6, 3.1);
  camera.lookAt(0, 0.25, 0);
  raycaster = new THREE.Raycaster();

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene.add(new THREE.HemisphereLight('#dce7b6', '#142117', 2.2));
  const key = new THREE.DirectionalLight('#fff1c5', 3.3);
  key.position.set(-2.5, 4, 4);
  key.castShadow = true;
  scene.add(key);
  const rim = new THREE.PointLight('#8bbbc0', 8, 7);
  rim.position.set(2.6, 1.6, -2.4);
  scene.add(rim);

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.32, 0.2, 64), makeMaterial('#6e7552', 0.95));
  pedestal.position.y = -1.05;
  pedestal.userData.excludeFromCameraFit = true;
  scene.add(pedestal);
  water = new THREE.Mesh(new THREE.CircleGeometry(1.48, 64), new THREE.MeshBasicMaterial({ map: createWaterWashTexture(), transparent: true, opacity: 0.72, toneMapped: false, depthWrite: false }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.92;
  water.userData.excludeFromCameraFit = true;
  scene.add(water);

  resize();
  window.addEventListener('resize', resize);
}

function resize() {
  if (!renderer || !camera) return;
  const rect = stage.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = Math.max(0.1, rect.width / Math.max(1, rect.height));
  camera.updateProjectionMatrix();
  requestRender();
}

function collectLocalVertices(root) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const points = [];
  root.traverse((object) => {
    if (!object.isMesh || object.userData.excludeFromCameraFit) return;
    const attribute = object.geometry?.attributes?.position;
    if (!attribute) return;
    for (let index = 0; index < attribute.count; index += 1) {
      const point = new THREE.Vector3().fromBufferAttribute(attribute, index).applyMatrix4(object.matrixWorld).applyMatrix4(inverse);
      points.push([point.x, point.y, point.z]);
    }
  });
  return points;
}

function updateCamera() {
  const pivot = new THREE.Vector3(...model.species.modelPivot);
  const distance = model.fitDistance * DISTANCE_SCALE[state.distance];
  camera.position.set(Math.sin(state.yaw) * distance, pivot.y + Math.sin(state.pitch) * distance, Math.cos(state.yaw) * distance);
  camera.lookAt(pivot);
  camera.updateMatrixWorld(true);
}

function setupAnchors(vertices) {
  model.anchors = snapHotspotsToSurface({ modelUrl: model.species.modelUrl || model.species.id, vertices, hotspots: model.species.hotspots });
  hotspotLayer.replaceChildren();
  model.anchors.forEach((anchor, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hotspot-button';
    button.dataset.id = anchor.id;
    button.dataset.tone = anchor.tone || 'coral';
    button.setAttribute('aria-label', `Abrir ficha: ${anchor.label}`);
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `<span class="hotspot-index">${String(index + 1).padStart(2, '0')} ${anchor.label}</span>`;
    button.addEventListener('click', () => openHotspot(anchor.id));
    button.addEventListener('focus', () => openHotspot(anchor.id));
    hotspotLayer.append(button);
  });
}

function updateOcclusion() {
  if (!model.group || !camera) return;
  const hidden = [];
  model.anchors.forEach((anchor) => {
    const point = new THREE.Vector3(...anchor.position).applyMatrix4(model.group.matrixWorld);
    const direction = point.clone().sub(camera.position);
    const targetDistance = direction.length();
    raycaster.set(camera.position, direction.normalize());
    const firstHit = raycaster.intersectObject(model.group, true)[0];
    const isHidden = Boolean(firstHit && firstHit.distance < targetDistance - model.maxExtent * 0.035);
    lastOcclusion.set(anchor.id, !isHidden);
    if (isHidden) hidden.push(anchor.id);
  });
  document.querySelector('#occlusion-readout').textContent = `OCLUSIÓN: ${hidden.length} oculto${hidden.length === 1 ? '' : 's'} · 1/10 frames`;
}

function updateHotspots() {
  const rect = stage.getBoundingClientRect();
  model.anchors.forEach((anchor) => {
    const button = /** @type {HTMLElement|null} */ (hotspotLayer.querySelector(`[data-id="${anchor.id}"]`));
    if (!button) return;
    const point = new THREE.Vector3(...anchor.position).applyMatrix4(model.group.matrixWorld);
    const projected = projectHotspot([point.x, point.y, point.z], { camera, width: rect.width, height: rect.height, THREE });
    const visible = projected.visible && lastOcclusion.get(anchor.id) !== false;
    button.style.left = `${projected.x}px`;
    button.style.top = `${projected.y}px`;
    button.setAttribute('aria-hidden', String(!visible));
    button.tabIndex = visible ? 0 : -1;
  });
}

function renderFrame() {
  state.raf = 0;
  state.frame += 1;
  if (state.autoRotate && model.group) {
    state.phase += 0.012;
    model.group.rotation.y = model.species.modelRotation[1] + Math.sin(state.phase) * model.species.autoRotateArc;
  }
  updateCamera();
  if (state.frame % 10 === 0 || lastOcclusion.size === 0) updateOcclusion();
  updateHotspots();
  renderer?.render(scene, camera);
  if (state.autoRotate) state.raf = requestAnimationFrame(renderFrame);
}

function requestRender() {
  if (!renderer || state.autoRotate || state.raf) return;
  state.raf = requestAnimationFrame(renderFrame);
}

function startRenderLoop() {
  if (!state.raf) state.raf = requestAnimationFrame(renderFrame);
}

function setRotation(enabled) {
  state.autoRotate = enabled;
  const button = document.querySelector('#toggle-rotation');
  button.setAttribute('aria-pressed', String(enabled));
  button.textContent = enabled ? 'Auto giro' : 'Giro pausado';
  if (enabled) startRenderLoop();
  else requestRender();
}

function openHotspot(id) {
  const hotspot = model.species.hotspots.find((item) => item.id === id);
  if (!hotspot) return;
  hotspotCard.hidden = false;
  document.querySelector('#hotspot-name').textContent = hotspot.label;
  document.querySelector('#hotspot-note').textContent = hotspot.note;
  hotspotLayer.querySelectorAll('.hotspot-button').forEach((/** @type {HTMLElement} */ button) => button.setAttribute('aria-pressed', String(button.dataset.id === id)));
}

function updateCard(species) {
  document.querySelector('#species-name').textContent = species.name;
  document.querySelector('#species-scientific').textContent = species.scientific;
  document.querySelector('#species-role').textContent = species.role;
  document.querySelector('#species-zone').textContent = species.zone.toUpperCase();
  document.querySelector('#model-data-readout').textContent = `modelPivot [${species.modelPivot.join(', ')}] · fill ${species.modelViewportFill}`;
  document.querySelector('#model-profile-readout').textContent = `modelProfile: ${species.modelProfile} · autoArc ${species.autoRotateArc}`;
  const facts = document.querySelector('#facts-grid');
  facts.replaceChildren();
  species.facts.forEach(([label, value]) => {
    const wrapper = document.createElement('div');
    const title = document.createElement('dt');
    const detail = document.createElement('dd');
    title.textContent = label;
    detail.textContent = value;
    wrapper.append(title, detail);
    facts.append(wrapper);
  });
  posterImage.src = species.poster;
  posterImage.alt = `Lámina 2D de ${species.name}`;
}

function setPoster(enabled, reason = 'Vista disponible sin modelo 3D') {
  state.poster = enabled;
  posterFallback.hidden = !enabled;
  canvas.style.opacity = enabled ? '0.08' : '1';
  document.querySelector('#stage-mode').textContent = enabled ? 'LÁMINA 2D / FALLBACK' : 'PLACEHOLDER PROCEDURAL';
  document.querySelector('#poster-reason').textContent = reason;
  document.querySelector('#toggle-poster').setAttribute('aria-pressed', String(enabled));
  requestRender();
}

function setSpecies(species) {
  model.species = species;
  if (model.group) scene.remove(model.group);
  model.group = createProceduralSpecimen(species, state.seed);
  model.group.rotation.set(...species.modelRotation);
  scene.add(model.group);
  const vertices = collectLocalVertices(model.group);
  const fitDistanceFromUtility = getPerspectiveFitDistanceForSilhouette(vertices, {
    verticalFov: camera.fov * Math.PI / 180,
    aspect: camera.aspect,
    pivot: species.modelPivot,
    fill: species.modelViewportFill,
    minDistance: 1.65,
  });
  model.fitDistance = fitDistanceFromUtility;
  model.maxExtent = vertices.reduce((max, point) => Math.max(max, Math.hypot(point[0], point[1], point[2])), 1);
  setupAnchors(vertices);
  updateCard(species);
  document.querySelectorAll('.species-item').forEach((/** @type {HTMLElement} */ button) => button.setAttribute('aria-pressed', String(button.dataset.id === species.id)));
  hotspotCard.hidden = true;
  setPoster(false);
  state.phase = 0;
  lastOcclusion = new Map();
  requestRender();
}

function buildSpeciesList() {
  const list = document.querySelector('#species-list');
  SPECIES.forEach((species, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'species-item';
    button.dataset.id = species.id;
    button.setAttribute('aria-pressed', String(index === 0));
    const title = document.createElement('strong');
    const scientific = document.createElement('span');
    title.textContent = species.name;
    scientific.textContent = species.scientific;
    button.append(title, scientific);
    button.addEventListener('click', () => setSpecies(species));
    list.append(button);
  });
}

function bindControls() {
  document.querySelectorAll('[data-distance]').forEach((/** @type {HTMLElement} */ button) => button.addEventListener('click', () => {
    state.distance = button.dataset.distance;
    document.querySelectorAll('[data-distance]').forEach((item) => item.classList.toggle('is-active', item === button));
    requestRender();
  }));
  document.querySelector('#toggle-rotation').addEventListener('click', () => setRotation(!state.autoRotate));
  document.querySelector('#toggle-poster').addEventListener('click', () => setPoster(!state.poster));
  canvas.addEventListener('pointerdown', (event) => {
    setRotation(false);
    canvas.setPointerCapture(event.pointerId);
    state.pointer = { x: event.clientX, y: event.clientY };
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!state.pointer) return;
    state.yaw += (event.clientX - state.pointer.x) * 0.008;
    state.pitch = Math.max(-0.34, Math.min(0.34, state.pitch + (event.clientY - state.pointer.y) * 0.004));
    state.pointer = { x: event.clientX, y: event.clientY };
    requestRender();
  });
  canvas.addEventListener('pointerup', () => { state.pointer = null; });
  canvas.addEventListener('pointercancel', () => { state.pointer = null; });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    setRotation(false);
    state.distance = event.deltaY > 0 ? 'wide' : 'close';
    document.querySelectorAll('[data-distance]').forEach((/** @type {HTMLElement} */ item) => item.classList.toggle('is-active', item.dataset.distance === state.distance));
    requestRender();
  }, { passive: false });
}

function init() {
  document.querySelector('#seed-readout').textContent = `SEMILLA ${state.seed}`;
  buildSpeciesList();
  bindControls();
  try {
    createStage();
    setSpecies(SPECIES[0]);
    window.__ARRANQUE_OK = true;
    window.__ARRANQUE_FALLO = null;
    startRenderLoop();
  } catch (error) {
    window.__ARRANQUE_OK = false;
    window.__ARRANQUE_FALLO = String(error?.message || error);
    document.querySelector('#stage-mode').textContent = 'LÁMINA 2D / WEBGL NO DISPONIBLE';
    setPoster(true, 'El navegador no pudo iniciar WebGL');
    console.warn('Species viewer fell back to its poster:', error);
  }
}

init();
