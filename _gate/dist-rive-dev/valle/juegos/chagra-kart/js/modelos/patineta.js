// ── patineta.js — patineta eléctrica (Chagra Kart) ──────────────────────────
// Factory pura: crearPatineta(THREE, opts) → THREE.Group orientado a +X, piso
// en y=0. Convención modelos.js: grupo → chasis → piezas; ruedas como grupos
// nombrados hijos del chasis en (x, radio, z); el motor aplica rotation.x
// (giro) y rotation.y (dirección). Tabla pegada al suelo, ruedas chiquitas y
// duras, sin carrocería: el piloto va de pie y expuesto. Sin marcas ni logos.
// Pasada 2 (arte): materiales separados por respuesta a la luz — trucks de
// aluminio y uretano con brillo de resina reflejan un cielo pintado
// (CubeTexture procedural), la lija gana grano real y el testigo LED emite.

// cielo pintado para reflejos: sin esto el metal se ve gris muerto
function crearCielo(THREE) {
  const cara = (tipo) => {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 32);
    if (tipo === 1) { g.addColorStop(0, '#f4fafe'); g.addColorStop(1, '#bcd6e6'); }
    else if (tipo === -1) { g.addColorStop(0, '#5c5044'); g.addColorStop(1, '#4a4036'); }
    else {
      g.addColorStop(0, '#a9cbde'); g.addColorStop(0.45, '#e9e3c8');
      g.addColorStop(0.58, '#8d7a5e'); g.addColorStop(1, '#544738');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    return c;
  };
  const t = new THREE.CubeTexture([cara(0), cara(0), cara(1), cara(-1), cara(0), cara(0)]);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

// grano de lija: puntos claros sobre negro (CanvasTexture procedural)
function texturaLija(THREE) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#121417';
  ctx.fillRect(0, 0, 64, 64);
  let s = 977;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 420; i++) {
    const g = 40 + rnd() * 70;
    ctx.fillStyle = `rgba(${g},${g},${g + 6},${(0.3 + rnd() * 0.5).toFixed(2)})`;
    ctx.fillRect(rnd() * 64, rnd() * 64, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  return t;
}

function extruir(THREE, shape, ancho, bisel = 0.03, curva = 10) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: ancho,
    bevelEnabled: true,
    bevelThickness: bisel,
    bevelSize: bisel,
    bevelSegments: 3,
    curveSegments: curva,
    steps: 1,
  });
  geo.computeBoundingBox();
  geo.translate(0, 0, -(geo.boundingBox.max.z + geo.boundingBox.min.z) / 2);
  return geo;
}

export function crearPatineta(THREE, opts = {}) {
  const cielo = crearCielo(THREE);
  const M = (c, r = 0.85, m = 0.05, refl = 0) => {
    const mat = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    if (refl) { mat.envMap = cielo; mat.envMapIntensity = refl; }
    return mat;
  };

  const compuesto = M(opts.color ?? 0x363c42, 0.45, 0.3, 0.35); // tabla de compuesto
  const lija = new THREE.MeshStandardMaterial({ map: texturaLija(THREE), roughness: 1.0, metalness: 0.0 });
  const aluminio = M(opts.color3 ?? 0x8d959c, 0.28, 0.78, 0.8);
  const goma = M(0xd08a3e, 0.3, 0.05, 0.5);                     // uretano con brillo de resina
  const oscuro = M(0x24272b, 0.85, 0.1);
  const led = new THREE.MeshStandardMaterial({
    color: 0x9fe870, emissive: 0x5fae2f, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.1,
  });

  const grupo = new THREE.Group();
  grupo.name = 'patinetaElectrica';
  const chasis = new THREE.Group();
  chasis.name = 'chasis';
  grupo.add(chasis);

  // ── tabla con nose y kicktail de verdad ───────────────────────────────────
  const perfil = new THREE.Shape();
  perfil.moveTo(-0.55, 0.15);
  perfil.lineTo(0.55, 0.15);
  perfil.quadraticCurveTo(0.65, 0.155, 0.7, 0.21);   // nose que sube
  perfil.lineTo(0.675, 0.245);
  perfil.quadraticCurveTo(0.62, 0.2, 0.52, 0.192);
  perfil.lineTo(-0.52, 0.192);                        // plano de pisada
  perfil.quadraticCurveTo(-0.62, 0.2, -0.675, 0.245); // kicktail
  perfil.lineTo(-0.7, 0.21);
  perfil.quadraticCurveTo(-0.65, 0.155, -0.55, 0.15);
  const tabla = new THREE.Mesh(extruir(THREE, perfil, 0.34, 0.03, 10), compuesto);
  chasis.add(tabla);

  // lija arriba, con el borde de la tabla asomado
  const grip = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.01, 0.3), lija);
  grip.position.set(0, 0.2, 0);
  chasis.add(grip);

  // ── batería y controlador bajo la tabla ───────────────────────────────────
  const bateria = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.065, 0.22), oscuro);
  bateria.position.set(0.02, 0.11, 0);
  chasis.add(bateria);
  for (let i = 0; i < 3; i++) {
    const aletaB = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.008, 0.24), M(0x2e3237, 0.7, 0.2));
    aletaB.position.set(0.02, 0.085 + i * 0.02, 0);
    chasis.add(aletaB);
  }
  const testigo = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.012), led);
  testigo.position.set(0.27, 0.11, 0.1);
  chasis.add(testigo);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 5), oscuro);
  cable.rotation.z = Math.PI / 2 - 0.1;
  cable.position.set(-0.32, 0.1, 0.06);
  chasis.add(cable);

  // ── ejes (trucks) de verdad: base, kingpin y percha ───────────────────────
  for (const x of [0.5, -0.5]) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.02, 0.13), aluminio);
    base.position.set(x, 0.14, 0);
    chasis.add(base);
    const kingpin = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.07, 6), oscuro);
    kingpin.rotation.z = x > 0 ? -0.5 : 0.5;
    kingpin.position.set(x + (x > 0 ? -0.035 : 0.035), 0.105, 0);
    chasis.add(kingpin);
    const percha = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.3, 8), aluminio);
    percha.rotation.x = Math.PI / 2;
    percha.position.set(x, 0.09, 0);
    chasis.add(percha);
  }

  // ── ruedas chiquitas y duras de uretano (grupos nombrados) ────────────────
  const radio = 0.09;
  const ancho = 0.06;
  const ruedas = [];
  const ruedasF = [];
  const posRuedas = [
    { x: 0.5, z: 0.18, f: true, nombre: 'ruedaDelanteraDer' },
    { x: 0.5, z: -0.18, f: true, nombre: 'ruedaDelanteraIzq' },
    { x: -0.5, z: 0.18, f: false, nombre: 'ruedaTraseraDer' },
    { x: -0.5, z: -0.18, f: false, nombre: 'ruedaTraseraIzq' },
  ];
  for (const p of posRuedas) {
    const r = new THREE.Group();
    r.name = p.nombre;
    const c = new THREE.Group();
    c.rotation.x = Math.PI / 2; // eje de giro → Z, como rueda() en modelos.js
    r.add(c);
    const w = ancho / 2;
    const pts = [
      [0.034, w * 0.98], [0.062, w], [0.086, w * 0.78], [radio, w * 0.3],
      [radio, -w * 0.3], [0.086, -w * 0.78], [0.062, -w], [0.034, -w * 0.98],
    ].map((q) => new THREE.Vector2(q[0], q[1]));
    c.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 16), goma));
    const nucleo = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, ancho * 1.02, 10), oscuro);
    c.add(nucleo);
    r.position.set(p.x, radio, p.z);
    chasis.add(r);
    ruedas.push(r);
    if (p.f) ruedasF.push(r);
  }

  // ── ancla del piloto: de pie, expuesto ────────────────────────────────────
  const ancla = new THREE.Object3D();
  ancla.name = 'anclaPiloto';
  ancla.position.set(0, 0.82, 0);
  ancla.rotation.y = Math.PI / 2;
  ancla.userData = { modo: 'skate', escala: 0.72 };
  chasis.add(ancla);

  // sombras como en modelos.js: todo menos las ruedas
  const enRueda = new Set();
  for (const r of ruedas) r.traverse((o) => enRueda.add(o));
  grupo.traverse((o) => {
    if (o.isMesh && !enRueda.has(o)) o.castShadow = true;
  });

  grupo.userData = {
    id: 'skate',
    ruedas,
    ruedasF,
    chasis,
    volante: null,
    anclaPiloto: ancla,
    alturaPiso: 0.08,
    radioRueda: radio,
  };
  return grupo;
}
