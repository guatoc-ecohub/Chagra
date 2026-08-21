// ── lib3d-motas.js — motas GPU reusables (envoltorio fino de fx/three.quarks) ──
//
// TOP-5 lib3d: los mundos del valle tenían las motas (pelusa kapok, polvo,
// polen) como `THREE.Points` estáticos. Esto las lleva a partículas GPU con
// three.quarks — motas que NACEN, DERIVAN con viento/turbulencia y MUEREN con
// halo suave (fade in/out por SizeOverLife + ColorOverLife). Un solo emisor
// por mundo, batcheado, presupuesto controlado.
//
// Uso:
//   import { crearMotas } from './lib3d-motas.js';
//   const motas = crearMotas(scene, { ...perfil });
//   // en el loop: motas.update(delta);   // delta en SEGUNDOS
//
// El presupuesto de draw-calls es BAJO: three.quarks batchea TODOS los sistemas
// del mismo material en UN VFXBatch (1 draw call por batch, no por partícula).
import * as THREE from 'three';
import { BatchedRenderer, ParticleSystem, PointEmitter,
  ConstantValue, IntervalValue, ConstantColor, ColorOverLife, SizeOverLife,
  Gradient, PiecewiseBezier, Bezier, ApplyForce, RenderMode } from './lib3d/fx/three.quarks.js';

// Textura de mota suave (disco radial con caída) — cero binarios, Canvas2D.
let _texCache = null;
function texMota() {
  if (_texCache) return _texCache;
  const s = 64, cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.65)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(cv);
  t.needsUpdate = true;
  _texCache = t;
  return t;
}

// Rampa de tamaño «nace pequeño → crece → se desvanece» (halo que respira).
function rampaTamano() {
  return new SizeOverLife(new PiecewiseBezier([[new Bezier(0.0, 0.85, 1.0, 0.35), 0]]));
}
// Rampa de opacidad por color (mantiene el tinte, sube el alpha al medio, baja al final).
function rampaColor(hex, aMax) {
  const c = new THREE.Color(hex);
  const g = new Gradient(
    [[new THREE.Vector3(c.r, c.g, c.b), 0]],
    [[0.0, 0], [aMax, 0.25], [aMax * 0.9, 0.7], [0.0, 1]],
  );
  return new ColorOverLife(g);
}

/**
 * crearMotas(scene, perfil) → { batch, sistema, update(delta), dispose() }
 *
 * perfil: {
 *   color:      hex del tinte (default '#f8ecc4' — pelusa/polvo cálido)
 *   opacidad:   alpha máximo (default 0.55)
 *   tam:        [min,max] tamaño de partícula en unidades de mundo (default [0.4, 0.9])
 *   vida:       [min,max] segundos que vive cada mota (default [6, 12])
 *   emisionSeg: partículas nuevas por segundo (default 40)
 *   caja:       [ancho, alto, fondo] volumen del emisor centrado (default [60, 30, 60])
 *   centro:     THREE.Vector3 del centro del volumen (default 0, alto/2, 0)
 *   viento:     THREE.Vector3 fuerza de deriva (default leve hacia +x/+y)
 *   subida:     empuje vertical extra (m/s²) para que floten (default 0.05)
 * }
 */
export function crearMotas(scene, perfil = {}) {
  const color   = perfil.color   ?? '#f8ecc4';
  const opac    = perfil.opacidad ?? 0.55;
  const tam     = perfil.tam      ?? [0.4, 0.9];
  const vida    = perfil.vida     ?? [6, 12];
  const emision = perfil.emisionSeg ?? 40;
  const caja    = perfil.caja     ?? [60, 30, 60];
  const centro  = perfil.centro   ?? new THREE.Vector3(0, caja[1] / 2, 0);
  const viento  = perfil.viento   ?? new THREE.Vector3(0.4, 0, 0.15);
  const subida  = perfil.subida   ?? 0.05;

  const batch = new BatchedRenderer();

  const material = new THREE.MeshBasicMaterial({
    map: texMota(),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const c = new THREE.Color(color);
  const sistema = new ParticleSystem({
    duration: 1,
    looping: true,
    prewarm: true,               // arranca «ya poblado», sin rampa de entrada vacía
    startLife: new IntervalValue(vida[0], vida[1]),
    startSpeed: new IntervalValue(0.05, 0.35),
    startSize: new IntervalValue(tam[0], tam[1]),
    startColor: new ConstantColor(new THREE.Vector4(c.r, c.g, c.b, opac)),
    worldSpace: true,
    emissionOverTime: new ConstantValue(emision),
    // Emisor de cono muy abierto = casi isotrópico, sembrando en un volumen ancho.
    shape: new PointEmitter(),
    material,
    renderMode: RenderMode.BillBoard,
    behaviors: [
      // deriva de viento + flotación (magnitud = ValueGenerator, no número plano)
      new ApplyForce(viento.clone().normalize(), new ConstantValue(viento.length())),
      new ApplyForce(new THREE.Vector3(0, 1, 0), new ConstantValue(subida)),
      rampaTamano(),
      rampaColor(color, opac),
    ],
  });

  // Sembrar las partículas en un VOLUMEN (no en un punto): reposicionamos el
  // emisor cada frame dentro de la caja para cubrir todo el haz de luz.
  batch.addSystem(sistema);
  batch.add(sistema.emitter);
  scene.add(batch);

  const half = new THREE.Vector3(caja[0] / 2, caja[1] / 2, caja[2] / 2);
  const _tmp = new THREE.Vector3();
  function reubicarEmisor() {
    _tmp.set(
      (Math.random() * 2 - 1) * half.x,
      (Math.random() * 2 - 1) * half.y,
      (Math.random() * 2 - 1) * half.z,
    ).add(centro);
    sistema.emitter.position.copy(_tmp);
  }
  reubicarEmisor();

  let _acc = 0;
  function update(delta) {
    // mover el emisor a un punto nuevo del volumen varias veces por segundo,
    // así las motas nacen repartidas por TODO el haz, no en un solo punto.
    _acc += delta;
    if (_acc > 0.02) { reubicarEmisor(); _acc = 0; }
    batch.update(delta);
  }

  function dispose() {
    scene.remove(batch);
    material.dispose();
  }

  return { batch, sistema, update, dispose };
}
