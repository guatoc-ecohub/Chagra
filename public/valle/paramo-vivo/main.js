import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { montarMundoParamoVivo } from '../paramo-vivo.js';

const app = document.getElementById('app');
const perfEl = document.getElementById('perf');

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc9d8c7);
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(18, 14, 34);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 8;
controls.maxDistance = 120;
controls.maxPolarAngle = Math.PI * 0.46;
controls.minPolarAngle = Math.PI * 0.18;

const ctx = { camera, controls };
const mundo = montarMundoParamoVivo(scene, THREE, ctx);
if (mundo?.arrancar) mundo.arrancar();

const clock = new THREE.Clock();
let frames = 0;
let fpsStamp = performance.now();

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize, { passive: true });
resize();

function tick() {
  const dt = clock.getDelta();
  const t = clock.elapsedTime;
  controls.update();
  if (mundo?.update) mundo.update(t, dt);
  renderer.render(scene, camera);
  frames++;
  const now = performance.now();
  if (now - fpsStamp > 900) {
    const fps = frames * 1000 / (now - fpsStamp);
    perfEl.textContent = `FPS ${fps.toFixed(1)}\nscene ${scene.children.length}`;
    frames = 0;
    fpsStamp = now;
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
