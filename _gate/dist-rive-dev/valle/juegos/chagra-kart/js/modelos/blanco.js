// ── blanco.js — coupé de dos puertas ~2010 (Chagra Kart) ────────────────────
// Factory pura: crearBlanco(THREE, opts) → THREE.Group orientado a +X, piso en
// y=0. Convención modelos.js: grupo → chasis → piezas; ruedas como grupos
// nombrados hijos del chasis en (x, radio, z); el motor aplica rotation.x
// (giro) y rotation.y (dirección). Sin marcas ni logos: capó largo y bajo,
// techo en caída, faros afilados, escape doble. Blanco.
// Pasada 2 (arte): la laca blanca, el cromo del escape y la aleación reflejan
// un cielo pintado (CubeTexture procedural) para separarse por respuesta a la
// luz; la llanta gana perfil real con flanco abombado, hombro y canal.

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

function extruir(THREE, shape, ancho, bisel = 0.06, curva = 12) {
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

export function crearBlanco(THREE, opts = {}) {
  const cielo = crearCielo(THREE);
  const M = (c, r = 0.85, m = 0.05, refl = 0) => {
    const mat = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    if (refl) { mat.envMap = cielo; mat.envMapIntensity = refl; }
    return mat;
  };

  const blanco = M(opts.color ?? 0xf5f4f2, 0.2, 0.35, 0.5);  // laca blanca
  const vidrio = M(0x3c4a55, 0.08, 0.4, 0.9);
  const oscuro = M(0x25272b, 0.85, 0.1);
  const metal = M(opts.color3 ?? 0x5c6470, 0.28, 0.72, 0.6);
  const cromo = M(0xd9dde2, 0.1, 0.92, 1.1);
  const luz = M(0xeef3f6, 0.14, 0.1, 0.4);
  const luzRoja = M(0xd8362e, 0.18, 0.1, 0.3);
  const goma = M(0x1a1b1e, 0.95, 0.0);
  const rinMat = M(0xc3c8ce, 0.24, 0.8, 0.8);

  const grupo = new THREE.Group();
  grupo.name = 'elBlanco';
  const chasis = new THREE.Group();
  chasis.name = 'chasis';
  grupo.add(chasis);

  // ── carrocería: capó largo y bajo, cola con ducktail ──────────────────────
  const perfil = new THREE.Shape();
  perfil.moveTo(-1.62, 0.36);
  perfil.lineTo(1.5, 0.36);
  perfil.quadraticCurveTo(1.9, 0.38, 1.96, 0.54);   // trompa baja
  perfil.quadraticCurveTo(2.0, 0.68, 1.86, 0.71);
  perfil.lineTo(0.48, 0.87);                         // capó LARGO subiendo apenas
  perfil.lineTo(-1.4, 0.96);                         // cintura
  perfil.lineTo(-1.56, 1.0);                         // ducktail
  perfil.quadraticCurveTo(-1.7, 0.97, -1.68, 0.76);
  perfil.quadraticCurveTo(-1.7, 0.42, -1.62, 0.36);
  const cuerpo = new THREE.Mesh(extruir(THREE, perfil, 1.56, 0.06, 12), blanco);
  chasis.add(cuerpo);

  // cabina retrasada con techo en caída (fastback)
  const pCab = new THREE.Shape();
  pCab.moveTo(0.44, 0.85);
  pCab.lineTo(0.0, 1.28);                            // parabrisas tendido
  pCab.quadraticCurveTo(-0.28, 1.37, -0.55, 1.35);   // techo corto
  pCab.quadraticCurveTo(-1.1, 1.26, -1.48, 0.96);    // caída larga
  pCab.lineTo(0.44, 0.85);
  const cabina = new THREE.Mesh(extruir(THREE, pCab, 1.36, 0.05, 12), vidrio);
  chasis.add(cabina);
  // ── cara afilada: faros en la cara de la trompa, envolviendo la esquina ───
  for (const lado of [-1, 1]) {
    const faro = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.055, 0.44), luz);
    faro.position.set(1.955, 0.62, lado * 0.5);
    faro.rotation.y = lado * 0.32;
    chasis.add(faro);
    // paso de rueda oscuro que le da pozo a la llanta
    for (const xw of [1.08, -1.08]) {
      const paso = new THREE.Mesh(new THREE.TorusGeometry(0.485, 0.045, 8, 16, Math.PI), oscuro);
      paso.position.set(xw, 0.43, lado * 0.81);
      chasis.add(paso);
    }
  }
  const bocaSup = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.76), oscuro);
  bocaSup.position.set(1.99, 0.6, 0);
  chasis.add(bocaSup);
  const bocaInf = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 1.16), oscuro);
  bocaInf.position.set(1.94, 0.44, 0);
  chasis.add(bocaInf);
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 1.46), oscuro);
  splitter.position.set(1.94, 0.34, 0);
  chasis.add(splitter);

  // faldones y línea de puerta
  for (const lado of [-1, 1]) {
    const faldon = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.07, 0.06), M(opts.color2 ?? 0xcfd3d9, 0.5, 0.2));
    faldon.position.set(0, 0.34, lado * 0.82);
    chasis.add(faldon);
    const manija = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.022, 0.012), metal);
    manija.position.set(0.02, 0.88, lado * 0.84);
    chasis.add(manija);
    const espejo = new THREE.Group();
    const brazo = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.022, 0.1), oscuro);
    brazo.position.set(0, -0.02, lado * -0.06);
    espejo.add(brazo);
    const concha = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.13), blanco);
    espejo.add(concha);
    espejo.position.set(0.18, 0.98, lado * 0.87);
    chasis.add(espejo);
  }

  // ── cola: banda de luz, difusor y ESCAPE DOBLE ────────────────────────────
  const banda = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 1.4), luzRoja);
  banda.position.set(-1.66, 0.87, 0);
  chasis.add(banda);
  const difusor = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 1.28), oscuro);
  difusor.position.set(-1.66, 0.42, 0);
  chasis.add(difusor);
  for (const lado of [-1, 1]) {
    const tubo = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.052, 0.22, 12), cromo);
    tubo.rotation.z = Math.PI / 2;
    tubo.position.set(-1.72, 0.37, lado * 0.32);
    chasis.add(tubo);
    const bocaEsc = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.23, 10), M(0x0c0c0e, 0.9, 0.1));
    bocaEsc.rotation.z = Math.PI / 2;
    bocaEsc.position.set(-1.725, 0.37, lado * 0.32);
    chasis.add(bocaEsc);
  }
  const antena = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.03), blanco);
  antena.position.set(-0.62, 1.29, 0);
  antena.rotation.z = 0.1;
  chasis.add(antena);

  // ── ruedas deportivas de bajo perfil (grupos nombrados) ───────────────────
  const radio = 0.43;
  const ancho = 0.3;
  const ruedas = [];
  const ruedasF = [];
  const posRuedas = [
    { x: 1.08, z: 0.88, f: true, nombre: 'ruedaDelanteraDer' },
    { x: 1.08, z: -0.88, f: true, nombre: 'ruedaDelanteraIzq' },
    { x: -1.08, z: 0.88, f: false, nombre: 'ruedaTraseraDer' },
    { x: -1.08, z: -0.88, f: false, nombre: 'ruedaTraseraIzq' },
  ];
  for (const p of posRuedas) {
    const r = new THREE.Group();
    r.name = p.nombre;
    const c = new THREE.Group();
    c.rotation.x = Math.PI / 2; // eje de giro → Z, como rueda() en modelos.js
    r.add(c);
    const w = ancho / 2;
    const ri = radio * 0.68; // perfil bajo: mucho rin, poca goma
    // perfil con talón, flanco apenas abombado (perfil bajo) y canal central
    const mitad = [
      [ri, w * 0.74], [radio * 0.78, w * 1.0], [radio * 0.9, w * 0.92],
      [radio * 0.97, w * 0.6], [radio, w * 0.22], [radio * 0.985, w * 0.06],
    ];
    const pts = [
      ...mitad.map(([px, py]) => new THREE.Vector2(px, -py)),
      ...mitad.slice().reverse().map(([px, py]) => new THREE.Vector2(px, py)),
    ];
    c.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 24), goma));
    const aroRin = new THREE.Mesh(new THREE.CylinderGeometry(ri, ri, ancho * 0.66, 22, 1, true), rinMat);
    c.add(aroRin);
    const plato = new THREE.Mesh(new THREE.CylinderGeometry(ri * 0.85, ri * 0.85, ancho * 0.3, 20), M(0x1a1c1f, 0.8, 0.15));
    c.add(plato);
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Group();
      s.rotation.y = (i / 10) * Math.PI * 2;
      const rayo = new THREE.Mesh(new THREE.BoxGeometry(ri * 0.95, ancho * 0.52, 0.055), rinMat);
      rayo.position.x = ri * 0.5;
      rayo.rotation.y = 0.18;
      s.add(rayo);
      c.add(s);
    }
    const tapa = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, ancho * 0.56, 12), rinMat);
    c.add(tapa);
    r.position.set(p.x, radio, p.z);
    chasis.add(r);
    ruedas.push(r);
    if (p.f) ruedasF.push(r);
  }

  // ── volante y ancla del piloto ────────────────────────────────────────────
  const volante = new THREE.Group();
  volante.name = 'volante';
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.028, 8, 16), M(0x2b2b30, 0.55, 0.2));
  aro.rotation.y = Math.PI / 2;
  volante.add(aro);
  const centroV = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), M(0x7d7d86, 0.42, 0.4));
  centroV.rotation.z = Math.PI / 2;
  volante.add(centroV);
  for (const ang of [0, Math.PI * 0.66, Math.PI * 1.33]) {
    const rad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.028, 0.028), M(0x2b2b30, 0.5, 0.15));
    rad.rotation.z = ang;
    volante.add(rad);
  }
  volante.position.set(0.02, 1.05, 0);
  volante.rotation.z = Math.PI / 2;
  chasis.add(volante);

  const ancla = new THREE.Object3D();
  ancla.name = 'anclaPiloto';
  ancla.position.set(-0.12, 0.86, 0);
  ancla.rotation.y = Math.PI / 2;
  ancla.userData = { modo: 'cabina', escala: 0.74 };
  chasis.add(ancla);

  // sombras como en modelos.js: todo menos las ruedas
  const enRueda = new Set();
  for (const r of ruedas) r.traverse((o) => enRueda.add(o));
  grupo.traverse((o) => {
    if (o.isMesh && !enRueda.has(o)) o.castShadow = true;
  });

  grupo.userData = {
    id: 'coupe',
    ruedas,
    ruedasF,
    chasis,
    volante,
    anclaPiloto: ancla,
    alturaPiso: 0.48,
    radioRueda: radio,
  };
  return grupo;
}
