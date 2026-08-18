import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from '../../lib3d/render/CSS2DRenderer.js';
import { RNG, clamp, lerp, smoothstep } from '../../lib3d/core/RNG.js';
import { buildFrijol } from '../../lib3d/bio/planta.js';
import { MotorTropismo, crearHeliotropo, crearNictinastia } from '../../lib3d/bio/tropismo.js';
import { construirEscenaCelula, crearPiezas } from '../../lib3d/bio/celula.js';
import { Rompecabezas3D } from '../../lib3d/bio/rompecabezas3d.js';

const GAME_QUERY = new URLSearchParams(location.search);
const AUTO_DEMO = GAME_QUERY.get('autostart') === '1' || GAME_QUERY.get('embedded') === '1';

const SEMILLA = 20860406;
const rng = new RNG(SEMILLA);
const stageNames = ['Planta', 'Raíz y suelo', 'Micelio', 'Célula y ADN'];
const stagePrompts = [
  'Toca hoja, tallo, flor, fruto y raíz. Cada una te deja avanzar al siguiente zoom.',
  'Guía la raíz hacia agua y nutrientes. Toca un brillo y mira cómo responde la punta.',
  'Toca dos nodos para tejer la red. Si ayudas a la planta enferma, el suelo se enciende.',
  'Arma la célula y luego entra al ADN. Después compara semilla nativa y comercial.',
];
const stageThemes = [
  { bg1: '#203925', bg2: '#3e5d33', bg3: '#7d6a34', bg4: '#f2e4bf', fog: 0xb9d8ad },
  { bg1: '#172215', bg2: '#273c25', bg3: '#4f6230', bg4: '#d7b95e', fog: 0x7e9269 },
  { bg1: '#0c110d', bg2: '#141f14', bg3: '#1e2c19', bg4: '#4e6a39', fog: 0x243023 },
  { bg1: '#11141c', bg2: '#1c2331', bg3: '#3d3557', bg4: '#8d7ad7', fog: 0x1c2132 },
];
const STAGE_Z = [0, -9.2, -19.5, -30.2];
const STAGE_SCALE = [1, 0.82, 0.58, 0.42];
const STAGE_FOV = [42, 38, 31, 28];

const canvas = document.getElementById('c');
const labelsHost = document.getElementById('labels');
const elIntro = document.getElementById('intro');
const elStart = document.getElementById('startBtn');
const elToast = document.getElementById('toast');
const elStageName = document.getElementById('stageName');
const elPrompt = document.getElementById('prompt');
const elMeterText = document.getElementById('meterText');
const elMeterFill = document.getElementById('meterFill');
const elChips = document.getElementById('chips');
const elZoomBtn = document.getElementById('zoomBtn');
const elForward = document.getElementById('forwardStageBtn');
const elBack = document.getElementById('backStageBtn');
const elBackBtn = document.getElementById('backBtn');

const style = document.createElement('style');
style.textContent = `
  .part-label{
    min-width:74px;max-width:130px;
    background:rgba(18,24,17,.78);color:#fff2c9;border:1px solid rgba(255,244,213,.14);
    border-radius:999px;padding:6px 9px;font-size:11px;line-height:1.1;text-align:center;
    box-shadow:0 8px 18px rgba(0,0,0,.18);backdrop-filter:blur(6px)
  }
  .part-label.active{background:rgba(219,189,92,.94);color:#2d1b0c;border-color:rgba(66,44,18,.35)}
  .node-label{
    padding:5px 8px;border-radius:999px;background:rgba(12,17,13,.76);color:#f5e9bf;
    border:1px solid rgba(255,255,255,.08);font-size:11px;line-height:1;white-space:nowrap
  }
  .seed-label{
    padding:5px 8px;border-radius:999px;background:rgba(17,20,28,.72);color:#edf2ff;
    border:1px solid rgba(255,255,255,.09);font-size:11px;line-height:1;white-space:nowrap
  }
  .seed-label.active{background:rgba(238,217,129,.94);color:#2f230f}
  .chip button{all:unset;cursor:pointer}
  .chip.active{background:rgba(229,197,94,.18);border-color:rgba(229,197,94,.38);color:#fff7cf}
`;
document.head.appendChild(style);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1b2e1f, 0.018);

const camera = new THREE.PerspectiveCamera(STAGE_FOV[0], innerWidth / innerHeight, 0.05, 250);
camera.position.set(7.2, 4.2, 9.4);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;

const labelRenderer = new CSS2DRenderer({ element: labelsHost });
labelRenderer.setSize(innerWidth, innerHeight);

const world = new THREE.Group();
scene.add(world);

const ambient = new THREE.AmbientLight(0xe8f6d5, 0.75);
scene.add(ambient);
const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(6, 12, 8);
scene.add(key);
const fill = new THREE.DirectionalLight(0xa7d4ff, 0.3);
fill.position.set(-6, 3, -5);
scene.add(fill);
const under = new THREE.DirectionalLight(0xe7b06f, 0.22);
under.position.set(-2, -6, -3);
scene.add(under);

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pointer = new THREE.Vector2(0, 0);

const state = {
  started: false,
  stage: 0,
  targetStage: 0,
  anim: null,
  learned: new Set(),
  rootTargets: new Set(),
  linksMade: 0,
  mycoComplete: false,
  cell: null,
};

function hex(v) {
  return '#' + v.toString(16).padStart(6, '0');
}

function setTheme(i) {
  const t = stageThemes[i];
  document.documentElement.style.setProperty('--bg0', t.bg1);
  document.documentElement.style.setProperty('--bg1', t.bg2);
  document.documentElement.style.setProperty('--bg2', t.bg3);
  document.documentElement.style.setProperty('--bg3', t.bg4);
  scene.fog.color.setHex(t.fog);
}

function showToast(msg, ms = 1200) {
  elToast.textContent = msg;
  elToast.classList.add('show');
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => elToast.classList.remove('show'), ms);
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function worldPos(group, localVec) {
  return group.localToWorld(localVec.clone());
}

function createGlowTexture(colorA, colorB, size = 128) {
  const cnv = document.createElement('canvas');
  cnv.width = cnv.height = size;
  const ctx = cnv.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
  g.addColorStop(0, colorB);
  g.addColorStop(0.35, colorA);
  g.addColorStop(0.8, colorA.replace('1)', '0.25)'));
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cnv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeBillboard(colorA, colorB, scale = 1) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createGlowTexture(colorA, colorB),
    transparent: true,
    depthWrite: false,
    depthTest: false,
  }));
  sprite.scale.setScalar(scale);
  return sprite;
}

function makeLabel(text, cls = 'part-label') {
  const el = document.createElement('div');
  el.className = cls;
  el.textContent = text;
  return new CSS2DObject(el);
}

function addChip(text, onClick) {
  const el = document.createElement('button');
  el.className = 'chip';
  el.innerHTML = text;
  el.addEventListener('click', onClick);
  elChips.appendChild(el);
  return el;
}

function clearChips() {
  elChips.innerHTML = '';
}

// ---------------------------------------------------------------------------
// Stage 1: planta
// ---------------------------------------------------------------------------

function createPlantStage() {
  const root = new THREE.Group();
  root.position.y = STAGE_Z[0];
  root.scale.setScalar(STAGE_SCALE[0]);
  world.add(root);

  const { grupo: planta, PARTES } = buildFrijol(rng.fork(11));
  planta.position.set(0, 0, 0);
  root.add(planta);

  const points = [];
  const labels = [];
  const sprites = [];
  const controllers = new MotorTropismo();
  const leafMotion = crearNictinastia({ relajacion: 4.5, velCierre: 3.2, velTacto: 7.5 });
  const flowerMotion = [];
  const sunDir = new THREE.Vector3(0.55, 0.82, 0.2);

  planta.traverse((o) => {
    if (!o.isGroup || !o.name) return;
    if (o.name === 'hoja-unidad') {
      leafMotion.agregarHoja(o, { eje: new THREE.Vector3(1, 0, 0), angulo: 0.42, escalaMin: 0.96 });
    }
    if (o.name === 'flor-unidad') {
      const heli = crearHeliotropo(o, { modo: 'cabeza', eje: new THREE.Vector3(0, 0, 1), maxAng: 0.5, suavizado: 0.08 });
      flowerMotion.push(heli);
      controllers.addHeliotropo(heli);
    }
  });
  controllers.addNictinastia(leafMotion);

  const hotspotTex = createGlowTexture('rgba(120,207,102,1)', 'rgba(255,255,255,0.96)', 128);
  for (const parte of PARTES) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: hotspotTex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    }));
    sprite.scale.setScalar(0.6);
    sprite.position.copy(parte.hotspot);
    sprite.userData.parteId = parte.id;
    root.add(sprite);
    sprites.push(sprite);

    const label = makeLabel(parte.nombre);
    label.position.copy(parte.hotspot).add(new THREE.Vector3(0, 0.4, 0));
    root.add(label);
    labels.push(label);
  }

  const guide = makeBillboard('rgba(148,215,105,1)', 'rgba(255,255,255,0.88)', 1.3);
  guide.position.set(0.45, 1.6, 0.2);
  root.add(guide);

  const data = {
    id: 'plant',
    group: root,
    // La variable se llama `planta` (línea ~197: `const { grupo: planta } =
    // buildFrijol(...)`). La abreviatura `plant,` referenciaba un identificador
    // inexistente y tumbaba la escena entera con "plant is not defined".
    plant: planta,
    parts: PARTES,
    sprites,
    labels,
    controllers,
    sunDir,
    guide,
    selectedPart: null,
    done: false,
  };
  return data;
}

function selectPart(id) {
  const stage = stages[0];
  const part = stage.parts.find((p) => p.id === id);
  if (!part) return;
  stage.selectedPart = id;
  stage.learned = stage.learned || new Set();
  stage.learned.add(id);
  showToast(`${part.nombre}: ${part.funcion.split('.')[0]}.`);
  updatePlantFeedback();
  updateHUD();
  if (stage.learned.size >= stage.parts.length) {
    stage.done = true;
    showToast('La planta ya se dejó leer.');
    updateHUD();
  }
}

function updatePlantFeedback() {
  const stage = stages[0];
  for (const sprite of stage.sprites) {
    const active = sprite.userData.parteId === stage.selectedPart;
    sprite.scale.setScalar(active ? 0.9 : 0.6);
  }
  for (const label of stage.labels) label.element.classList.remove('active');
  const idx = stage.parts.findIndex((p) => p.id === stage.selectedPart);
  if (idx >= 0) stage.labels[idx].element.classList.add('active');
}

// ---------------------------------------------------------------------------
// Stage 2: raíz y suelo
// ---------------------------------------------------------------------------

function makeRootGeometry(points) {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, 28, 0.18, 10, false);
}

function createRootStage() {
  const root = new THREE.Group();
  root.position.y = STAGE_Z[1];
  root.scale.setScalar(STAGE_SCALE[1]);
  world.add(root);

  const soilMat = new THREE.MeshStandardMaterial({
    color: 0x7c6040, roughness: 1, metalness: 0, transparent: true, opacity: 0.9,
  });
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 6.8, 1.0, 40, 1, false), soilMat);
  soil.rotation.x = Math.PI / 2;
  soil.position.y = 0;
  root.add(soil);

  const horizon = new THREE.Mesh(
    new THREE.CylinderGeometry(6.75, 6.75, 0.08, 40),
    new THREE.MeshStandardMaterial({ color: 0x4b2d1a, roughness: 1 })
  );
  horizon.rotation.x = Math.PI / 2;
  horizon.position.y = 0.52;
  root.add(horizon);

  const base = new THREE.Group();
  base.position.set(0, 0.65, 0);
  root.add(base);

  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 18, 12),
    new THREE.MeshStandardMaterial({ color: 0xdab784, roughness: 0.9 })
  );
  crown.scale.set(1.1, 0.65, 1.1);
  crown.position.y = 0.05;
  base.add(crown);

  const rootTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xffe2b8, roughness: 0.55, emissive: 0x6a4425, emissiveIntensity: 0.1 })
  );
  base.add(rootTip);

  const soilMotes = new THREE.Group();
  root.add(soilMotes);
  for (let i = 0; i < 150; i++) {
    const mote = new THREE.Mesh(
      new THREE.SphereGeometry(rng.float(0.01, 0.03), 6, 4),
      new THREE.MeshStandardMaterial({
        color: i % 4 === 0 ? 0xcba76c : 0x8b6a46,
        roughness: 1,
        transparent: true,
        opacity: rng.float(0.2, 0.6),
      })
    );
    mote.position.set(rng.float(-6, 6), rng.float(-2.2, 2.0), rng.float(-2.1, 2.1));
    soilMotes.add(mote);
  }

  const targets = [
    { id: 'agua', kind: 'agua', color: 0x84dbff, label: 'Agua', pos: new THREE.Vector3(-1.9, -0.8, 1.1), taken: false },
    { id: 'fosforo', kind: 'nutriente', color: 0xd9bc57, label: 'Fósforo', pos: new THREE.Vector3(2.0, -1.0, -0.9), taken: false },
    { id: 'humus', kind: 'materia', color: 0x99d06e, label: 'Materia viva', pos: new THREE.Vector3(0.4, -1.6, 1.7), taken: false },
  ];
  const targetSprites = [];
  const targetLabels = [];
  const targetHalo = createGlowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0.95)', 128);
  for (const t of targets) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: targetHalo,
      color: t.color,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    }));
    sprite.scale.setScalar(0.65);
    sprite.position.copy(t.pos);
    sprite.userData.targetId = t.id;
    root.add(sprite);
    targetSprites.push(sprite);

    const label = makeLabel(t.label, 'node-label');
    label.position.copy(t.pos).add(new THREE.Vector3(0, 0.3, 0));
    root.add(label);
    targetLabels.push(label);
  }

  const probeMat = new THREE.MeshStandardMaterial({
    color: 0xe8d6b4, roughness: 0.75, emissive: 0x7c4d29, emissiveIntensity: 0.05,
  });
  const probeHead = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.28, 4, 8), probeMat);
  probeHead.rotation.z = Math.PI / 2;
  probeHead.position.set(0, -0.14, 0);
  root.add(probeHead);

  const rootPath = {
    points: [
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(0.1, 0.0, 0.1),
      targets[0].pos.clone(),
    ],
    mesh: null,
    target: targets[0].pos.clone(),
    current: new THREE.Vector3(0.06, 0.08, 0.04),
    lastBuild: 0,
    complete: false,
  };
  rootPath.mesh = new THREE.Mesh(
    makeRootGeometry(rootPath.points),
    new THREE.MeshStandardMaterial({ color: 0xf0d1aa, roughness: 0.96, emissive: 0x5c3215, emissiveIntensity: 0.05 })
  );
  root.add(rootPath.mesh);

  const droplets = [];
  for (const t of targets) {
    const droplet = makeBillboard('rgba(110,214,255,1)', 'rgba(255,255,255,0.98)', 0.72);
    droplet.material.color.setHex(t.color);
    droplet.position.copy(t.pos).add(new THREE.Vector3(0, 0.12, 0));
    droplet.userData.targetId = t.id;
    root.add(droplet);
    droplets.push(droplet);
  }

  const motion = new MotorTropismo();
  const topLeaf = new THREE.Group();
  topLeaf.position.set(0.55, 1.12, 0);
  const leafMesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 26),
    new THREE.MeshStandardMaterial({ color: 0x77bb57, side: THREE.DoubleSide, roughness: 0.8 })
  );
  leafMesh.scale.set(1.4, 0.8, 1);
  topLeaf.add(leafMesh);
  root.add(topLeaf);
  const nict = crearNictinastia({ relajacion: 4.2, velCierre: 3.8, velTacto: 9.5 });
  nict.agregarHoja(topLeaf, { eje: new THREE.Vector3(1, 0, 0), angulo: 0.46, escalaMin: 0.94 });
  motion.addNictinastia(nict);

  return {
    id: 'root',
    group: root,
    soil,
    targetSprites,
    targetLabels,
    droplets,
    targets,
    rootPath,
    rootTip,
    probeHead,
    motion,
    currentTarget: targets[0],
    completedTargets: 0,
    done: false,
  };
}

function setRootTarget(stage, target) {
  stage.currentTarget = target;
  stage.rootPath.target.copy(target.pos);
  showToast(`La raíz va hacia ${target.label.toLowerCase()}.`);
}

function updateRootStage(stage, dt) {
  stage.motion.update({ hora: day, dt });
  const p = stage.rootPath;
  // OJO: `p.target` es un Vector3 (la meta geométrica hacia donde crece la
  // raíz), NO el objetivo del juego. El objetivo —con `.pos`, `.taken`,
  // `.label`— es `stage.currentTarget`. Confundirlos hacía que más abajo se
  // llamara `target.pos` sobre un Vector3 y reventara la escena con
  // "Cannot read properties of undefined (reading 'x')".
  const destino = p.target;
  const target = stage.currentTarget;
  const dir = destino.clone().sub(p.current);
  const dist = dir.length();
  if (dist > 1e-4) {
    dir.normalize();
    p.current.addScaledVector(dir, dt * 2.2 * (1 + smoothstep(0, 3, dist)));
  }
  const bend = p.current.clone().multiplyScalar(0.25);
  const base = new THREE.Vector3(0, 0.5, 0);
  const mid = new THREE.Vector3(bend.x * 0.3, 0.14 - bend.length() * 0.05, bend.z * 0.3);
  const tip = new THREE.Vector3(p.current.x, p.current.y, p.current.z);
  p.points = [base, mid, tip];
  if (p.mesh.geometry) p.mesh.geometry.dispose();
  p.mesh.geometry = makeRootGeometry(p.points);
  stage.rootTip.position.copy(tip);
  stage.probeHead.position.copy(tip.clone().multiplyScalar(0.15));
  stage.probeHead.lookAt(destino);   // lookAt espera un Vector3, no el objeto objetivo

  for (const droplet of stage.droplets) {
    const t = stage.targets.find((q) => q.id === droplet.userData.targetId);
    const active = !t.taken && stage.currentTarget.id === t.id;
    droplet.scale.x += ((active ? 0.88 : 0.72) - droplet.scale.x) * 0.06;
    droplet.scale.y += ((active ? 0.88 : 0.72) - droplet.scale.y) * 0.06;
  }

  if (!target.taken && tip.distanceTo(target.pos) < 0.42) {
    target.taken = true;
    stage.completedTargets += 1;
    stage.rootPath.target.copy(new THREE.Vector3(0.1, -0.4 - stage.completedTargets * 0.15, 0));
    stage.currentTarget = target;
    showToast(`${target.label} absorbido.`);
    const droplet = stage.droplets.find((d) => d.userData.targetId === target.id);
    if (droplet) droplet.visible = false;
    const label = stage.targetLabels.find((l) => l.element.textContent === target.label);
    if (label) label.element.style.opacity = '0.35';
    if (stage.completedTargets < stage.targets.length) {
      const next = stage.targets.find((t) => !t.taken);
      if (next) setRootTarget(stage, next);
    } else {
      stage.done = true;
      showToast('La raíz encontró agua y nutrientes.');
    }
  }
}

// ---------------------------------------------------------------------------
// Stage 3: micelio
// ---------------------------------------------------------------------------

function createMycoStage() {
  const root = new THREE.Group();
  root.position.y = STAGE_Z[2];
  root.scale.setScalar(STAGE_SCALE[2]);
  world.add(root);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(7.3, 60),
    new THREE.MeshStandardMaterial({ color: 0x1c140d, roughness: 1, transparent: true, opacity: 0.96 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.1;
  root.add(floor);

  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(7.0, 60),
    new THREE.MeshBasicMaterial({ color: 0x1f3323, transparent: true, opacity: 0.3 })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.01;
  root.add(glow);

  const center = new THREE.Group();
  root.add(center);

  const nodes = [
    { id: 'planta-a', kind: 'plant', name: 'Planta A', pos: new THREE.Vector3(-2.3, 0.05, -0.8), color: 0x6bb84b, health: 1, need: 'agua' },
    { id: 'planta-b', kind: 'plant', name: 'Planta B', pos: new THREE.Vector3(2.1, 0.02, 1.3), color: 0x74c85d, health: 1, need: 'fosforo' },
    { id: 'planta-c', kind: 'plant', name: 'Planta enferma', pos: new THREE.Vector3(0.4, 0.0, -2.2), color: 0xd06a5f, health: 0.32, need: 'ayuda' , sick: true},
    { id: 'micelio', kind: 'fungus', name: 'Micelio', pos: new THREE.Vector3(0.0, -0.2, 0.0), color: 0xc9a86d, health: 1, need: 'red' },
    { id: 'trichoderma', kind: 'fungus', name: 'Trichoderma', pos: new THREE.Vector3(-0.6, -0.1, 2.0), color: 0x79c84f, health: 1, need: 'protege' },
  ];
  const nodeMap = new Map();
  const nodeLabels = [];
  const nodeMeshes = [];
  for (const n of nodes) {
    const group = new THREE.Group();
    group.position.copy(n.pos);
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(n.kind === 'fungus' ? 0.42 : 0.38, 20, 16),
      new THREE.MeshStandardMaterial({
        color: n.color,
        roughness: 0.7,
        emissive: n.sick ? 0x62181a : 0x0d0d0d,
        emissiveIntensity: n.sick ? 0.16 : 0.03,
      })
    );
    if (n.kind === 'fungus') body.scale.set(1.2, 0.85, 1.2);
    group.add(body);
    const halo = makeBillboard('rgba(255,255,255,1)', 'rgba(255,255,255,0.9)', n.kind === 'fungus' ? 1.0 : 0.82);
    halo.material.color.setHex(n.color);
    group.add(halo);

    const label = makeLabel(n.name, 'node-label');
    label.position.set(0, 0.55, 0);
    group.add(label);
    root.add(group);

    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(n.kind === 'fungus' ? 0.45 : 0.42, 10, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hit.position.copy(n.pos);
    hit.userData.nodeId = n.id;
    root.add(hit);

    nodeMap.set(n.id, n);
    nodeLabels.push(label);
    nodeMeshes.push(hit);
    n.group = group;
    n.label = label;
    n.body = body;
    n.hit = hit;
    n.links = [];
  }

  const links = [];
  const linkMatByKind = {
    water: new THREE.MeshStandardMaterial({ color: 0x83d8ff, roughness: 0.6, emissive: 0x1f5f7b, emissiveIntensity: 0.2 }),
    phosphorus: new THREE.MeshStandardMaterial({ color: 0xe0bf59, roughness: 0.55, emissive: 0x7d5d16, emissiveIntensity: 0.18 }),
    sugar: new THREE.MeshStandardMaterial({ color: 0xc8e56b, roughness: 0.55, emissive: 0x4d6819, emissiveIntensity: 0.18 }),
  };

  function linkKind(a, b) {
    if (a.kind === 'fungus' && b.kind === 'plant') return b.sick ? 'water' : 'phosphorus';
    if (b.kind === 'fungus' && a.kind === 'plant') return a.sick ? 'water' : 'phosphorus';
    if (a.kind === 'fungus' || b.kind === 'fungus') return 'sugar';
    return 'sugar';
  }

  function addLink(aId, bId) {
    if (aId === bId) return null;
    const key = [aId, bId].sort().join(':');
    if (links.some((l) => l.key === key)) return null;
    const a = nodeMap.get(aId);
    const b = nodeMap.get(bId);
    if (!a || !b) return null;
    const pts = [a.pos.clone(), a.pos.clone().lerp(b.pos, 0.35).add(new THREE.Vector3(0, 0.55, 0.25)), b.pos.clone()];
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 28, 0.05, 7, false);
    const kind = linkKind(a, b);
    const tube = new THREE.Mesh(geo, linkMatByKind[kind].clone());
    root.add(tube);

    const pulseA = makeBillboard(
      kind === 'water' ? 'rgba(128,220,255,1)' : kind === 'phosphorus' ? 'rgba(245,218,107,1)' : 'rgba(208,255,122,1)',
      'rgba(255,255,255,0.95)',
      0.25
    );
    const pulseB = pulseA.clone();
    root.add(pulseA);
    root.add(pulseB);
    links.push({ key, a, b, curve, tube, pulseA, pulseB, phase: rng.float(0, 1), kind });
    a.links.push(b.id);
    b.links.push(a.id);
    stageMyco.linksMade += 1;
    showToast(`${a.name} ↔ ${b.name}`);
    if (!stageMyco.mycoComplete && stageMyco.sickNode.health > 0.98 && stageMyco.linksMade >= 3) {
      stageMyco.mycoComplete = true;
      stageMyco.done = true;
      showToast('La red sostuvo a la planta enferma.');
    }
    updateHUD();
    return links[links.length - 1];
  }

  const stageMyco = {
    id: 'myco',
    group: root,
    nodes,
    nodeMap,
    nodeMeshes,
    nodeLabels,
    links,
    addLink,
    selected: null,
    linksMade: 0,
    sickNode: nodeMap.get('planta-c'),
    mycoComplete: false,
    done: false,
  };

  const pulses = [];
  function pushPulse(link) {
    if (!link) return;
    pulses.push({ link, t: 0, dur: 2.2, dir: 1 });
    pulses.push({ link, t: 0.34, dur: 2.2, dir: -1 });
  }
  stageMyco.pushPulse = pushPulse;

  stageMyco.autoLink = () => {
    const base = stageMyco.nodeMap;
    const a = base.get('micelio');
    const b = base.get('planta-a');
    const c = base.get('planta-b');
    const d = base.get('planta-c');
    if (a && b) pushPulse(addLink(a.id, b.id));
    if (a && c) pushPulse(addLink(a.id, c.id));
    if (a && d) pushPulse(addLink(a.id, d.id));
  };

  stageMyco._links = links;
  stageMyco._pulses = pulses;
  return stageMyco;
}

function updateMycoStage(stage, dt) {
  for (const n of stage.nodes) {
    const pulse = 0.5 + Math.sin(performance.now() * 0.002 + n.pos.x * 3.1) * 0.06;
    n.group.scale.setScalar(clamp(n.health * pulse, 0.5, 1.35));
    if (n.sick) {
      n.health = clamp(n.health + (stage.linksMade >= 2 ? dt * 0.06 : 0), 0, 1);
      n.body.material.emissiveIntensity = 0.14 + (1 - n.health) * 0.25;
      n.body.material.color.lerp(new THREE.Color(0x8fd36d), stage.linksMade > 1 ? dt * 0.1 : 0);
    }
  }
  for (const link of stage.links) {
    link.phase = (link.phase + dt * 0.18) % 1;
    const p1 = link.curve.getPointAt(link.phase);
    const p2 = link.curve.getPointAt((1 - link.phase + 0.12) % 1);
    link.pulseA.position.copy(p1);
    link.pulseB.position.copy(p2);
    link.pulseA.scale.setScalar(0.2 + 0.08 * Math.sin((performance.now() + link.phase * 1000) * 0.01));
    link.pulseB.scale.setScalar(0.2 + 0.08 * Math.sin((performance.now() + link.phase * 1200) * 0.01));
  }
  const sick = stage.sickNode;
  if (sick.health >= 0.98 && stage.linksMade >= 2) {
    stage.done = true;
  }
}

// ---------------------------------------------------------------------------
// Stage 4: célula y ADN
// ---------------------------------------------------------------------------

function createDNAHelix() {
  const g = new THREE.Group();
  const strands = [];
  const r = 1.0;
  const turns = 4.8;
  const steps = 120;
  const strandA = [];
  const strandB = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const ang = u * Math.PI * 2 * turns;
    const y = (u - 0.5) * 5.0;
    strandA.push(new THREE.Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r));
    strandB.push(new THREE.Vector3(Math.cos(ang + Math.PI) * r, y, Math.sin(ang + Math.PI) * r));
  }
  const matStemA = new THREE.MeshStandardMaterial({ color: 0x59b85e, roughness: 0.65, emissive: 0x19351d, emissiveIntensity: 0.08 });
  const matStemB = new THREE.MeshStandardMaterial({ color: 0xc95f58, roughness: 0.65, emissive: 0x321514, emissiveIntensity: 0.08 });
  const matRung = new THREE.MeshStandardMaterial({ color: 0xe3c25a, roughness: 0.5, emissive: 0x5a4810, emissiveIntensity: 0.08 });
  const geoA = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strandA), 80, 0.07, 8, false);
  const geoB = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strandB), 80, 0.07, 8, false);
  const meshA = new THREE.Mesh(geoA, matStemA);
  const meshB = new THREE.Mesh(geoB, matStemB);
  g.add(meshA, meshB);
  for (let i = 0; i <= 16; i++) {
    const u = i / 16;
    const ang = u * Math.PI * 2 * turns;
    const y = (u - 0.5) * 5.0;
    const rungPts = [new THREE.Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r), new THREE.Vector3(Math.cos(ang + Math.PI) * r, y, Math.sin(ang + Math.PI) * r)];
    const rungGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.05, 6);
    const rung = new THREE.Mesh(rungGeo, matRung);
    rung.position.set(0, y, 0);
    rung.lookAt(rungPts[1]);
    rung.rotation.x = Math.PI / 2;
    rung.scale.set(1, 1, 0.9);
    g.add(rung);

    const leaf = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.04, 0.2, 3, 6),
      new THREE.MeshStandardMaterial({ color: i % 2 ? 0x7bc25f : 0xe58c58, roughness: 0.65 })
    );
    leaf.position.copy(rungPts[0]).multiplyScalar(0.92);
    leaf.lookAt(0, y, 0);
    g.add(leaf);
  }
  return g;
}

function makeSeedShape(color, accent) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 24, 18),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7, emissive: accent, emissiveIntensity: 0.08 })
  );
  body.scale.set(1.32, 0.82, 0.72);
  body.rotation.z = 0.15;
  g.add(body);
  const seam = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.04, 0.48, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0xf7e0b7, roughness: 0.55 })
  );
  seam.position.set(-0.58, 0, 0.02);
  seam.rotation.z = Math.PI / 2;
  g.add(seam);
  return g;
}

function createCellStage() {
  const root = new THREE.Group();
  root.position.y = STAGE_Z[3];
  root.scale.setScalar(STAGE_SCALE[3]);
  world.add(root);

  const base = construirEscenaCelula(rng.fork(91));
  root.add(base.contenedor);

  const dna = createDNAHelix();
  dna.visible = false;
  dna.position.set(0, 0.4, 0.2);
  root.add(dna);

  const compare = new THREE.Group();
  compare.visible = false;
  compare.position.set(0, -4.6, 0.4);
  root.add(compare);

  const native = makeSeedShape(0x8f3b25, 0x6aab55);
  native.position.set(-2.2, 0, 0);
  compare.add(native);
  const commercial = makeSeedShape(0xb45d44, 0x425067);
  commercial.position.set(2.2, 0, 0);
  compare.add(commercial);

  const nativeLbl = makeLabel('Nativa', 'seed-label');
  nativeLbl.position.set(-2.2, 0.85, 0);
  compare.add(nativeLbl);
  const commLbl = makeLabel('Comercial', 'seed-label');
  commLbl.position.set(2.2, 0.85, 0);
  compare.add(commLbl);

  const dnaGlow = makeBillboard('rgba(122,200,127,1)', 'rgba(255,255,255,0.95)', 1.2);
  dnaGlow.position.set(0, 0.2, 0);
  root.add(dnaGlow);

  const pieceDefs = crearPiezas(rng.fork(17), base.radioCelula);
  const puzzlePieces = [];
  for (const d of pieceDefs) {
    root.add(d.mesh);
    root.add(d.pickHelper);
    puzzlePieces.push(d);
  }

  const stage = {
    id: 'cell',
    group: root,
    base: base.contenedor,
    puzzlePieces,
    pieceDefs,
    puzzle: null,
    dna,
    compare,
    native,
    commercial,
    nativeLbl,
    commLbl,
    complete: false,
    viewMode: 'puzzle',
    climatePulse: 0,
  };

  stage.puzzle = new Rompecabezas3D({
    renderer,
    camera,
    scene,
    onPiezaColocada: (pieza) => {
      showToast(`Encajó ${pieza.ficha?.titulo ?? pieza.id}.`);
      updateHUD();
    },
    onProgreso: (done, total) => {
      stage.progress = { done, total };
      updateHUD();
    },
    onCompleto: () => {
      stage.complete = true;
      stage.viewMode = 'dna';
      stage.dna.visible = true;
      stage.compare.visible = true;
      showToast('Ya estás dentro del ADN.');
      updateHUD();
    },
    onArrastreInicio: () => {},
    onArrastreFin: () => {},
  });

  for (const d of pieceDefs) stage.puzzle.agregarPieza(d);
  stage.puzzle.iniciar();
  stage.puzzle.setHabilitado(false);
  stage.progress = { done: 0, total: pieceDefs.length };
  return stage;
}

function pulseClimate(stage) {
  if (!stage || !stage.complete) return;
  stage.climatePulse = 1;
  showToast('Pulso de clima local.');
}

function updateCellStage(stage, dt) {
  if (stage.puzzle) stage.puzzle.tick(dt);
  if (stage.puzzle) stage.puzzle.setHabilitado(state.stage === 3 && !stage.complete);
  stage.dna.rotation.y += dt * 0.24;
  stage.dna.rotation.x = Math.sin(performance.now() * 0.001) * 0.08;
  stage.compare.rotation.y = Math.sin(performance.now() * 0.0007) * 0.12;
  if (stage.complete) {
    stage.climatePulse = Math.max(0, stage.climatePulse - dt * 0.45);
    const k = stage.climatePulse;
    stage.native.scale.lerpVectors(stage.native.scale, new THREE.Vector3(1.1 + k * 0.05, 1.1 + k * 0.05, 1), 0.02);
    stage.commercial.scale.lerpVectors(stage.commercial.scale, new THREE.Vector3(1.0 - k * 0.04, 1.0 - k * 0.04, 1), 0.02);
    stage.native.material = stage.native.children[0].material;
    stage.commercial.material = stage.commercial.children[0].material;
  }
}

// ---------------------------------------------------------------------------
// World & stage management
// ---------------------------------------------------------------------------

const stages = [
  createPlantStage(),
  createRootStage(),
  createMycoStage(),
  null,
];

function ensureCellStage() {
  if (!stages[3]) stages[3] = createCellStage();
  return stages[3];
}

function updateHUD() {
  const s = stages[state.stage];
  const total = state.stage === 0 ? s.parts.length : state.stage === 1 ? s.targets.length : state.stage === 2 ? 3 : (s.progress?.total || 0);
  let done = 0;
  if (state.stage === 0) done = s.learned ? s.learned.size : 0;
  if (state.stage === 1) done = s.completedTargets;
  if (state.stage === 2) done = Math.min(s.linksMade, 3);
  if (state.stage === 3) done = s.progress?.done || 0;
  elStageName.textContent = `${state.stage + 1} / 4 · ${stageNames[state.stage]}`;
  elPrompt.textContent = stagePrompts[state.stage];
  elMeterText.textContent = `${done} / ${total}`;
  elMeterFill.style.width = total ? `${Math.round((done / total) * 100)}%` : '0%';
  elBackBtn.classList.toggle('show', state.stage > 0);
  clearChips();
  if (state.stage === 0) {
    for (const part of s.parts) {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.dataset.partId = part.id;
      chip.innerHTML = `<b>${part.nombre}</b>`;
      chip.addEventListener('click', () => selectPart(part.id));
      if (s.learned && s.learned.has(part.id)) chip.classList.add('active');
      elChips.appendChild(chip);
    }
  } else if (state.stage === 1) {
    const labels = [
      ['Toca', 'agua / fósforo / materia viva'],
      ['Guía', 'la punta hacia el brillo'],
      ['Raíz', 'absorbe y explora'],
    ];
    for (const [a, b] of labels) {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = `<b>${a}</b> ${b}`;
      elChips.appendChild(chip);
    }
  } else if (state.stage === 2) {
    const labels = [
      ['Toca', 'dos nodos para tejer'],
      ['Red', 'nutrientes viajan por lo conectado'],
      ['Trichoderma', 'biocontrol del suelo'],
    ];
    for (const [a, b] of labels) {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = `<b>${a}</b> ${b}`;
      elChips.appendChild(chip);
    }
  } else if (state.stage === 3) {
    const labels = [
      ['Nativa', 'conserva rasgos locales'],
      ['Comercial', 'más uniforme'],
      ['Toca', 'el ADN para mirar semillas'],
    ];
    for (const [a, b] of labels) {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = `<b>${a}</b> ${b}`;
      elChips.appendChild(chip);
    }
  }
}

function setStage(i, snap = false) {
  const next = clamp(i, 0, 3);
  if (next === 3) ensureCellStage();
  state.targetStage = next;
  if (snap) {
    state.stage = next;
    state.anim = null;
  } else {
    state.anim = {
      from: state.stage,
      to: next,
      t: 0,
      dur: 1.15,
      fromCam: camera.position.clone(),
      fromTarget: cameraTarget.clone(),
      fromFov: camera.fov,
    };
  }
  updateHUD();
  setTheme(next);
  updateControls();
}

function canAdvance() {
  const s = stages[state.stage];
  if (state.stage === 0) return !!s.done;
  if (state.stage === 1) return !!s.done;
  if (state.stage === 2) return !!s.done;
  if (state.stage === 3) return !!s.complete;
  return false;
}

function updateControls() {
  if (state.stage === 0) elZoomBtn.innerHTML = `<span>BAJAR</span><strong>↟</strong>`;
  if (state.stage === 1) elZoomBtn.innerHTML = `<span>SEGUIR</span><strong>↟</strong>`;
  if (state.stage === 2) elZoomBtn.innerHTML = `<span>ENTRAR</span><strong>↟</strong>`;
  if (state.stage === 3) elZoomBtn.innerHTML = `<span>CLIMA</span><strong>↻</strong>`;
}

function tryAdvance() {
  if (state.stage < 3) {
    if (!canAdvance()) {
      showToast('Primero termina la interacción de esta escala.');
      return;
    }
    const next = state.stage + 1;
    setStage(next);
    showToast(`Zoom hacia ${stageNames[next]}.`);
  } else {
    const cell = stages[3];
    if (cell.complete) {
      pulseClimate(cell);
    } else {
      showToast('Arma la célula primero.');
    }
  }
}

function goBack() {
  if (state.stage <= 0) return;
  const next = state.stage - 1;
  setStage(next);
  showToast(`Vuelta a ${stageNames[next]}.`);
}

let cameraTarget = new THREE.Vector3(0, 1.4, 5.8);
let cameraLook = new THREE.Vector3(0, 1.1, 0);

function updateCameraTargets(dt) {
  if (state.anim) return;
  const idx = clamp(state.stage, 0, 3);
  const basePos = [
    new THREE.Vector3(7.2, 4.1, 9.1),
    new THREE.Vector3(4.7, 2.2, 6.0),
    new THREE.Vector3(3.2, 1.3, 4.1),
    new THREE.Vector3(2.5, 0.8, 2.9),
  ][idx];
  const baseLook = [
    new THREE.Vector3(0, 1.2, 0),
    new THREE.Vector3(0, 0.0, 0),
    new THREE.Vector3(0, -0.1, 0),
    new THREE.Vector3(0, -0.2, 0),
  ][idx];
  cameraTarget.lerp(basePos, 1 - Math.pow(0.0004, dt));
  cameraLook.lerp(baseLook, 1 - Math.pow(0.0004, dt));
  cameraTarget.x += pointer.x * 0.6;
  cameraTarget.y += pointer.y * 0.35;
  camera.position.copy(cameraTarget);
  camera.lookAt(cameraLook);
  const fov = STAGE_FOV[idx];
  camera.fov = lerp(camera.fov, fov, 1 - Math.pow(0.0007, dt));
  camera.updateProjectionMatrix();
}

function updateStageTheme(dt) {
  const t = stages[state.stage];
  document.documentElement.style.setProperty('--bg0', stageThemes[state.stage].bg1);
  document.documentElement.style.setProperty('--bg1', stageThemes[state.stage].bg2);
  document.documentElement.style.setProperty('--bg2', stageThemes[state.stage].bg3);
  document.documentElement.style.setProperty('--bg3', stageThemes[state.stage].bg4);
  if (state.stage === 0) {
    ambient.color.setHex(0xe8f6d5); ambient.intensity = 0.78; key.color.setHex(0xffffff); key.intensity = 1.1; fill.intensity = 0.3; under.intensity = 0.16;
  } else if (state.stage === 1) {
    ambient.color.setHex(0xdbf0ce); ambient.intensity = 0.62; key.color.setHex(0xfef5dc); key.intensity = 0.92; fill.intensity = 0.22; under.intensity = 0.24;
  } else if (state.stage === 2) {
    ambient.color.setHex(0x8b6f46); ambient.intensity = 0.44; key.color.setHex(0xe8c18a); key.intensity = 0.48; fill.intensity = 0.12; under.intensity = 0.8;
  } else {
    ambient.color.setHex(0xadc6ff); ambient.intensity = 0.7; key.color.setHex(0xeaf1ff); key.intensity = 0.8; fill.intensity = 0.35; under.intensity = 0.1;
  }
  scene.fog.color.setHex(stageThemes[state.stage].fog);
}

function syncStageVisibility() {
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i];
    if (!s) continue;
    const active = i === state.stage;
    if (i === 3 && s.puzzle) s.puzzle.setHabilitado(active && !s.complete);
  }
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

function screenToNdc(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  return {
    x: ((ev.clientX - r.left) / r.width) * 2 - 1,
    y: -((ev.clientY - r.top) / r.height) * 2 + 1,
  };
}

function setPointer(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.x = (((ev.clientX - r.left) / r.width) * 2 - 1);
  pointer.y = -(((ev.clientY - r.top) / r.height) * 2 - 1);
}

let pointerDown = null;
renderer.domElement.addEventListener('pointerdown', (ev) => {
  pointerDown = { x: ev.clientX, y: ev.clientY, moved: false, time: performance.now() };
  setPointer(ev);
});
renderer.domElement.addEventListener('pointermove', (ev) => {
  setPointer(ev);
  if (pointerDown && (Math.abs(ev.clientX - pointerDown.x) > 8 || Math.abs(ev.clientY - pointerDown.y) > 8)) pointerDown.moved = true;
});
renderer.domElement.addEventListener('pointerup', (ev) => {
  setPointer(ev);
  if (!state.started || state.stage === 3) return;
  const moved = pointerDown?.moved;
  pointerDown = null;
  if (moved) return;
  const nd = screenToNdc(ev);
  ndc.set(nd.x, nd.y);
  raycaster.setFromCamera(ndc, camera);
  if (state.stage === 0) {
    const stage = stages[0];
    const hits = raycaster.intersectObjects(stage.sprites, false);
    if (hits.length) {
      const id = hits[0].object.userData.parteId;
      selectPart(id);
      return;
    }
  }
  if (state.stage === 1) {
    const stage = stages[1];
    const hits = raycaster.intersectObjects(stage.targetSprites, false);
    if (hits.length) {
      const id = hits[0].object.userData.targetId;
      const target = stage.targets.find((t) => t.id === id);
      if (target) setRootTarget(stage, target);
      return;
    }
  }
  if (state.stage === 2) {
    const stage = stages[2];
    const hits = raycaster.intersectObjects(stage.nodeMeshes, false);
    if (hits.length) {
      const node = stage.nodeMap.get(hits[0].object.userData.nodeId);
      if (!node) return;
      if (!stage.selected) {
        stage.selected = node;
        showToast(node.name);
        stage.nodeLabels.forEach((l) => l.element.classList.remove('active'));
        node.label.element.classList.add('active');
      } else if (stage.selected.id === node.id) {
        stage.selected = null;
        node.label.element.classList.remove('active');
      } else {
        const link = stage.addLink(stage.selected.id, node.id);
        if (link) stage.pushPulse(link);
        stage.selected.label.element.classList.remove('active');
        stage.selected = null;
      }
    }
  }
});

elStart.addEventListener('click', () => {
  state.started = true;
  elIntro.classList.add('hidden');
  showToast('Empieza por tocar la planta.');
});
renderer.domElement.addEventListener('click', () => {
  if (!state.started) {
    state.started = true;
    elIntro.classList.add('hidden');
  }
});
if (AUTO_DEMO) queueMicrotask(() => elStart.click());

elForward.addEventListener('click', tryAdvance);
elZoomBtn.addEventListener('click', tryAdvance);
elBack.addEventListener('click', goBack);
elBackBtn.addEventListener('click', goBack);
window.addEventListener('keydown', (ev) => {
  if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown' || ev.key === ' ') {
    ev.preventDefault();
    tryAdvance();
  }
  if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') {
    ev.preventDefault();
    goBack();
  }
  if (ev.key === 'Escape') goBack();
});
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------

let last = performance.now();
let day = 11.5;
setTheme(0);
updateHUD();
updateControls();
state.started = false;

function updateStageAnim(dt) {
  if (!state.anim) return;
  state.anim.t += dt;
  const k = clamp(state.anim.t / state.anim.dur, 0, 1);
  const e = easeInOut(k);
  state.stage = state.anim.from;
  const targetIdx = state.anim.to;
  const fromPos = state.anim.fromCam;
  const fromLook = state.anim.fromTarget;
  const toPos = [
    new THREE.Vector3(7.2, 4.1, 9.1),
    new THREE.Vector3(4.7, 2.2, 6.0),
    new THREE.Vector3(3.2, 1.3, 4.1),
    new THREE.Vector3(2.5, 0.8, 2.9),
  ][targetIdx];
  const toLook = [
    new THREE.Vector3(0, 1.2, 0),
    new THREE.Vector3(0, 0.0, 0),
    new THREE.Vector3(0, -0.1, 0),
    new THREE.Vector3(0, -0.2, 0),
  ][targetIdx];
  camera.position.lerpVectors(fromPos, toPos, e);
  cameraLook.lerpVectors(fromLook, toLook, e);
  camera.lookAt(cameraLook);
  camera.fov = lerp(state.anim.fromFov, STAGE_FOV[targetIdx], e);
  camera.updateProjectionMatrix();
  if (k >= 1) {
    state.stage = targetIdx;
    state.anim = null;
    syncStageVisibility();
    updateHUD();
  }
}

function tick(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (!state.started) {
    camera.position.lerp(new THREE.Vector3(7.5, 4.6, 9.7), 0.02);
    camera.lookAt(0, 0.9, 0);
  }
  updateStageAnim(dt);
  updateStageTheme(dt);

  day = (day + dt * 0.05) % 24;
  const stage0 = stages[0];
  stage0.controllers.update({ hora: day, dt, sunDir: stage0.sunDir });
  stage0.guide.rotation.y += dt * 0.3;
  stage0.plant.rotation.y = Math.sin(now * 0.00014) * 0.18;
  stage0.plant.rotation.x = Math.sin(now * 0.00011) * 0.03;
  if (stage0.done && state.stage === 0) {
    elZoomBtn.disabled = false;
  }

  updateRootStage(stages[1], dt);
  updateMycoStage(stages[2], dt);
  if (stages[3]) updateCellStage(stages[3], dt);

  if (state.stage === 1) {
    elPrompt.textContent = 'Guía la raíz hacia agua y nutrientes. Toca un brillo y mira cómo responde la punta.';
  } else if (state.stage === 2) {
    elPrompt.textContent = 'Teje la red. Si conectas la planta enferma, el micelio empieza a repartir ayuda.';
  } else if (state.stage === 3) {
    elPrompt.textContent = stages[3]?.complete
      ? 'La célula ya respira. Toca el botón para pulso de clima local.'
      : 'Arrastra organelos hasta su sitio. El núcleo abre el ADN cuando termines.';
  } else {
    elPrompt.textContent = stagePrompts[0];
  }

  if (state.stage === 1 && stages[1].done) updateHUD();
  if (state.stage === 2 && stages[2].done) updateHUD();
  if (state.stage === 3 && stages[3]?.complete) updateHUD();

  syncStageVisibility();
  updateCameraTargets(dt);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  requestAnimationFrame(tick);
}

syncStageVisibility();

updateHUD();
updateControls();
setTheme(0);
requestAnimationFrame(tick);

// stage completion helpers
function refreshStageState() {
  const stage0 = stages[0];
  const stage1 = stages[1];
  const stage2 = stages[2];
  if (stage0.learned && stage0.learned.size >= stage0.parts.length) stage0.done = true;
  if (stage1.completedTargets >= stage1.targets.length) stage1.done = true;
  if (stage2.linksMade >= 3 && stage2.sickNode.health >= 0.98) stage2.done = true;
}

window.setInterval(refreshStageState, 250);

// Make the mycorrhizal stage breathe a little when nodes are connected.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) showToast('...');
});
