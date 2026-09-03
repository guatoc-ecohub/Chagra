import * as THREE from 'three';
import { createJaguarRiggedActor } from './jaguarRigged.js';
import { createOsoRiggedActor } from './osoRigged.js';

const canvas = document.querySelector('#rigged-canvas');
const controls = document.querySelector('#controls');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#182218');

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(4.7, 3.25, 7.8);
camera.lookAt(0.15, 1.15, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

scene.add(new THREE.HemisphereLight('#f1e5bd', '#152318', 2.1));
const key = new THREE.DirectionalLight('#ffe1a1', 3.4);
key.position.set(-3, 7, 4);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -5;
key.shadow.camera.right = 5;
key.shadow.camera.top = 5;
key.shadow.camera.bottom = -4;
scene.add(key);
const rim = new THREE.PointLight('#7cb8a1', 8, 12, 2);
rim.position.set(3, 2.5, -4);
scene.add(rim);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(7, 64),
  new THREE.MeshStandardMaterial({ color: '#1e2c1e', roughness: 1, metalness: 0 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const backGlow = new THREE.Mesh(
  new THREE.CircleGeometry(4.7, 48),
  new THREE.MeshBasicMaterial({ color: '#405239', transparent: true, opacity: 0.25, side: THREE.DoubleSide }),
);
backGlow.position.set(0.5, 2.35, -2.3);
backGlow.rotation.x = -0.22;
scene.add(backGlow);

const entries = [
  { key: 'jaguar', label: 'Jaguar', actor: createJaguarRiggedActor({ phase: 0.2 }), position: [0, 0, 1.45], color: '#d9a94d', walkRate: 2.2 },
  { key: 'oso', label: 'Oso', actor: createOsoRiggedActor({ phase: 1.7, majestic: true }), position: [0, 0, -1.25], color: '#9e8063', walkRate: 1.65 },
];

const clocks = new Map(entries.map(({ key: name }) => [name, { deathAt: null, status: 'idle' }]));
for (const entry of entries) {
  entry.actor.object.position.set(...entry.position);
  scene.add(entry.actor.object);
}

function resetEntry(entry) {
  entry.actor.resetPose();
  const clock = clocks.get(entry.key);
  clock.deathAt = null;
  clock.status = 'idle';
}

function command(entry, action) {
  const clock = clocks.get(entry.key);
  if (action === 'reset') {
    resetEntry(entry);
  } else if (action === 'idle') {
    resetEntry(entry);
    entry.actor.playIdle(0.18);
    clock.status = 'idle';
  } else if (action === 'walk') {
    resetEntry(entry);
    entry.actor.startLoop('walk', entry.walkRate);
    clock.status = 'walk';
  } else if (action === 'attack') {
    resetEntry(entry);
    entry.actor.playAttack();
    clock.status = 'attack';
  } else if (action === 'death') {
    resetEntry(entry);
    entry.actor.playDeath();
    clock.deathAt = elapsed;
    clock.status = 'death + dissolve';
  }
}

const labels = [
  ['idle', 'Idle'],
  ['walk', 'Walk'],
  ['attack', 'Golpe'],
  ['death', 'Muerte + polvo'],
  ['reset', 'Reiniciar'],
];
for (const entry of entries) {
  const card = document.createElement('div');
  card.className = 'card';
  const heading = document.createElement('h2');
  heading.textContent = entry.label;
  const status = document.createElement('span');
  status.className = 'status';
  heading.append(status);
  const buttons = document.createElement('div');
  buttons.className = 'buttons';
  for (const [action, label] of labels) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => command(entry, action));
    buttons.append(button);
  }
  card.append(heading, buttons);
  controls.append(card);
  entry.statusElement = status;
}

function resize() {
  const width = canvas.clientWidth || canvas.parentElement.clientWidth;
  const height = canvas.clientHeight || canvas.parentElement.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize, { passive: true });
resize();

let elapsed = 0;
let previous = performance.now();
function frame(now) {
  const delta = Math.min(0.05, Math.max(0, (now - previous) / 1000));
  previous = now;
  elapsed += delta;
  for (const entry of entries) {
    const clock = clocks.get(entry.key);
    entry.actor.update(delta, elapsed);
    if (clock.deathAt !== null) {
      const progress = Math.min(1, Math.max(0, (elapsed - clock.deathAt - 0.28) / 0.87));
      entry.actor.setDissolve(progress);
    }
    entry.statusElement.textContent = clock.status;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
