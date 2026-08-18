/**
 * enredadera.js — builder de TREPADORA / LIANA (NO ez-tree, NO hierba-baja).
 *
 * Cuarto arquetipo de porte, hermano de `plantas-bajas.js`. ez-tree genera
 * árboles (tronco + ramas recursivas) y `plantas-bajas.js` genera matas
 * basales; ninguno modela una PASIONARIA trepadora (gulupa/maracuyá/granadilla):
 * un tallo delgado que ESCALA en espiral un soporte (estaca/espaldera),
 * con hoja lobulada, ZARCILLOS (tendrils) que se enroscan, y la flor
 * característica de Passiflora. Forzarla por ez-tree daría un arbolito; por
 * hierba-baja, una matita en el suelo — ninguna de las dos trepa.
 *
 * `crearEnredadera` devuelve un `THREE.Group` con el pie en y=0:
 *   - estaca/soporte vertical (delgado, tinte madera)
 *   - tallo helicoidal enroscado al soporte (TubeGeometry sobre una hélice)
 *   - hojas lobuladas (billboards) repartidas a lo largo del tallo
 *   - zarcillos: pequeñas espirales que salen del tallo
 *   - flores de Passiflora (disco radiado) — el color vivo que pide el gate
 *
 * Determinismo: mismo `seed` + params = misma planta (RNG de `ez-tree/rng.js`).
 * Expone `.update(t)` no-op para encajar en el mismo loop de render.
 */
import * as THREE from 'three';
import RNG from './ez-tree/rng.js';

/**
 * @typedef {Object} EnredaderaOpts
 * @property {number} seed
 * @property {number} [alturaSoporte=3.4] alto de la estaca/espaldera (m)
 * @property {number} [radioHelix=0.35] radio del enroscado alrededor del soporte
 * @property {number} [vueltas=3.2] número de vueltas del tallo al subir
 * @property {number} [countHoja=26] hojas repartidas por el tallo
 * @property {number} [sizeHoja=0.5] largo de hoja (m)
 * @property {number} [tint=0x3f8a3a] verde de la hoja
 * @property {number} [countFlor=5] número de flores
 * @property {number} [colorFlor=0x8a4fae] color de la flor (gulupa: morado)
 * @property {number} [colorCentroFlor=0xf2e6b0] centro/corona de la flor
 * @property {number} [tamanoFlor=0.14] diámetro de la flor (m)
 * @property {number} [tintSoporte=0x9a7a52] color de la estaca
 */

/** Curva paramétrica: hélice que sube alrededor del eje Y. */
class Helice extends THREE.Curve {
  constructor(altura, radio, vueltas, jitter, rng) {
    super();
    this.altura = altura;
    this.radio = radio;
    this.vueltas = vueltas;
    this.jitter = jitter;
    // pre-muestrea un poco de ruido de radio para que no sea una hélice perfecta
    this.ruido = [];
    for (let i = 0; i < 24; i++) this.ruido.push((rng ? rng.random() : Math.random()) - 0.5);
  }
  getPoint(t, target = new THREE.Vector3()) {
    const ang = t * this.vueltas * Math.PI * 2;
    const rn = this.ruido[Math.floor(t * (this.ruido.length - 1))] || 0;
    const r = this.radio * (1 + this.jitter * rn);
    // el radio se cierra un poco hacia la punta (busca la luz arriba)
    const rr = r * (1 - 0.25 * t);
    return target.set(Math.cos(ang) * rr, t * this.altura, Math.sin(ang) * rr);
  }
}

function geometriaHojaLobulada(largo) {
  // hoja de pasiflora: trilobulada ancha. Aproximada con un plano ancho.
  const geo = new THREE.PlaneGeometry(largo * 1.05, largo, 2, 2);
  geo.translate(0, largo / 2, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = largo > 0 ? y / largo : 0;
    pos.setZ(i, pos.getZ(i) + t * t * largo * 0.14); // leve combado
  }
  geo.computeVertexNormals();
  return geo;
}

/** Flor de Passiflora vista de frente: disco radiado (corona de filamentos). */
function crearFlor(colorFlor, colorCentro, diam) {
  const g = new THREE.Group();
  const petalos = new THREE.Mesh(
    new THREE.CircleGeometry(diam / 2, 12),
    new THREE.MeshStandardMaterial({ color: colorFlor, side: THREE.DoubleSide, roughness: 0.7, metalness: 0, emissive: colorFlor, emissiveIntensity: 0.12 })
  );
  g.add(petalos);
  const centro = new THREE.Mesh(
    new THREE.CircleGeometry(diam * 0.24, 10),
    new THREE.MeshStandardMaterial({ color: colorCentro, side: THREE.DoubleSide, roughness: 0.6, metalness: 0 })
  );
  centro.position.z = 0.004;
  g.add(centro);
  return g;
}

/**
 * @param {EnredaderaOpts} opts
 * @returns {THREE.Group}
 */
export function crearEnredadera(opts = {}) {
  const {
    seed = 1,
    alturaSoporte = 3.4,
    radioHelix = 0.35,
    vueltas = 3.2,
    countHoja = 26,
    sizeHoja = 0.5,
    tint = 0x3f8a3a,
    countFlor = 5,
    colorFlor = 0x8a4fae,
    colorCentroFlor = 0xf2e6b0,
    tamanoFlor = 0.14,
    tintSoporte = 0x9a7a52,
  } = opts;

  const rng = new RNG(seed);
  const grupo = new THREE.Group();

  // ── soporte (estaca) ──
  const soporte = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.036, alturaSoporte, 6),
    new THREE.MeshStandardMaterial({ color: tintSoporte, roughness: 0.95, metalness: 0 })
  );
  soporte.position.y = alturaSoporte / 2;
  grupo.add(soporte);

  // ── tallo helicoidal ──
  const helice = new Helice(alturaSoporte * 0.97, radioHelix, vueltas, 0.45, rng);
  const tallo = new THREE.Mesh(
    new THREE.TubeGeometry(helice, 120, 0.022, 6, false),
    new THREE.MeshStandardMaterial({ color: 0x5a6a30, roughness: 0.9, metalness: 0 })
  );
  grupo.add(tallo);

  // ── hojas repartidas por el tallo ──
  const hojaGeo = geometriaHojaLobulada(sizeHoja);
  const hojaMat = new THREE.MeshStandardMaterial({ color: tint, side: THREE.DoubleSide, roughness: 0.85, metalness: 0 });
  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  for (let i = 0; i < countHoja; i++) {
    const t = (i + 0.5) / countHoja;
    helice.getPoint(t, p);
    helice.getTangent(t, tan);
    const hoja = new THREE.Mesh(hojaGeo, hojaMat);
    // hoja apunta hacia afuera del soporte (radial) y cuelga un poco
    const outward = Math.atan2(p.z, p.x);
    hoja.position.copy(p);
    hoja.rotation.y = -outward + Math.PI / 2 + (rng.random() - 0.5) * 0.6;
    hoja.rotation.x = -0.9 - rng.random() * 0.5; // cuelga hacia afuera/abajo
    const s = 1 - 0.35 * t + (rng.random() - 0.5) * 0.25; // más chicas arriba
    hoja.scale.setScalar(Math.max(0.4, s));
    grupo.add(hoja);
  }

  // ── zarcillos (tendrils): pequeñas espirales que salen del tallo ──
  const tendrilMat = new THREE.MeshStandardMaterial({ color: 0x7a8a45, roughness: 0.9, metalness: 0 });
  for (let i = 0; i < 6; i++) {
    const t = 0.2 + rng.random() * 0.7;
    helice.getPoint(t, p);
    const rizo = new Helice(0.22, 0.05, 2.5, 0.1, rng);
    const tend = new THREE.Mesh(new THREE.TubeGeometry(rizo, 20, 0.006, 4, false), tendrilMat);
    tend.position.copy(p);
    tend.rotation.z = Math.PI / 2;
    tend.rotation.y = rng.random() * Math.PI * 2;
    grupo.add(tend);
  }

  // ── flores de Passiflora ──
  for (let i = 0; i < countFlor; i++) {
    const t = 0.3 + (i / Math.max(1, countFlor - 1)) * 0.62;
    helice.getPoint(t, p);
    const flor = crearFlor(colorFlor, colorCentroFlor, tamanoFlor * (0.85 + rng.random() * 0.3));
    const outward = Math.atan2(p.z, p.x);
    flor.position.copy(p);
    // la empuja un poco hacia afuera del tallo
    flor.position.x += Math.cos(outward) * 0.08;
    flor.position.z += Math.sin(outward) * 0.08;
    flor.rotation.y = -outward + Math.PI / 2;
    flor.rotation.x = -0.4 + (rng.random() - 0.5) * 0.5;
    grupo.add(flor);
  }

  grupo.userData.tipo = 'enredadera';
  grupo.update = function () {}; // no-op, encaja en el loop de render
  return grupo;
}
