// ── escarabajo-rojo.js — todoterreno cuadrado de los 2010s (Chagra Kart) ────
// Factory pura: crearEscarabajoRojo(THREE, opts) → THREE.Group orientado a +X,
// piso en y=0. Convención modelos.js: grupo → chasis → piezas; ruedas como
// grupos nombrados hijos del chasis en (x, radio, z); el motor aplica
// rotation.x (giro) y rotation.y (dirección). Sin marcas ni logos: parrilla
// vertical de siete ranuras, faros redondos, parabrisas plano, llanta de
// repuesto atrás, techo duro. Rojo.
// Pasada 2 (arte): la llanta deja el look de engranaje — perfil de neumático
// real por LatheGeometry (talón, flanco abombado, hombro, canal central) con
// tacos chicos en dos filas trabadas por InstancedMesh (1 drawcall por
// rueda). Los materiales se separan por respuesta a la luz: laca roja y acero
// reflejan un cielo pintado (CubeTexture procedural), el caucho queda mate.

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

// perfil de neumático: talón, flanco abombado (más ancho que la banda),
// anillo de molde, hombro redondeado y canal central
function perfilNeumatico(THREE, R, w, ri) {
  const h = w / 2;
  const mitad = [
    [ri, h * 0.70], [R * 0.62, h * 1.00], [R * 0.78, h * 0.93],
    [R * 0.83, h * 0.97], [R * 0.90, h * 0.80], [R * 0.965, h * 0.48],
    [R, h * 0.18], [R * 0.985, h * 0.05],
  ];
  return [
    ...mitad.map(([x, y]) => new THREE.Vector2(x, -y)),
    ...mitad.slice().reverse().map(([x, y]) => new THREE.Vector2(x, y)),
  ];
}

// tacos de trocha en dos filas trabadas: una sola llamada de dibujo por rueda
function tacosLlanta(THREE, mat, R, w, porFila, dims, cy = 0) {
  const tacos = new THREE.InstancedMesh(new THREE.BoxGeometry(...dims), mat, porFila * 2);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const ejeY = new THREE.Vector3(0, 1, 0);
  const esc = new THREE.Vector3(1, 1, 1);
  let i = 0;
  for (const fila of [-1, 1]) {
    const desfase = fila < 0 ? 0 : Math.PI / porFila;
    for (let k = 0; k < porFila; k++) {
      const a = (k / porFila) * Math.PI * 2 + desfase;
      q.setFromAxisAngle(ejeY, a);
      m4.compose(
        new THREE.Vector3(Math.cos(a) * R * 0.99, cy + fila * w * 0.2, -Math.sin(a) * R * 0.99),
        q, esc
      );
      tacos.setMatrixAt(i++, m4);
    }
  }
  tacos.instanceMatrix.needsUpdate = true;
  return tacos;
}

function extruir(THREE, shape, ancho, bisel = 0.06, curva = 8) {
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

// llanta de taco simétrica (se ve igual por ambas caras)
function ruedaTaco(THREE, radio, ancho, nombre, mats) {
  const g = new THREE.Group();
  g.name = nombre;
  const c = new THREE.Group();
  c.rotation.x = Math.PI / 2; // eje de giro → Z, como rueda() en modelos.js
  g.add(c);
  const ri = radio * 0.55;
  c.add(new THREE.Mesh(new THREE.LatheGeometry(perfilNeumatico(THREE, radio, ancho, ri), 24), mats.goma));
  c.add(tacosLlanta(THREE, mats.taco, radio, ancho, 15, [0.036, ancho * 0.36, 0.085]));
  const plato = new THREE.Mesh(new THREE.CylinderGeometry(ri * 0.98, ri * 0.98, ancho * 0.5, 18), mats.acero);
  c.add(plato);
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Group();
    s.rotation.y = (i / 5) * Math.PI * 2 + 0.3;
    const hueco = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, ancho * 0.52, 10), mats.hueco);
    hueco.position.x = ri * 0.55;
    s.add(hueco);
    c.add(s);
  }
  const tapa = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, ancho * 0.56, 10), mats.acero);
  c.add(tapa);
  return g;
}

export function crearEscarabajoRojo(THREE, opts = {}) {
  const cielo = crearCielo(THREE);
  const M = (c, r = 0.85, m = 0.05, refl = 0) => {
    const mat = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    if (refl) { mat.envMap = cielo; mat.envMapIntensity = refl; }
    return mat;
  };

  const rojo = M(opts.color ?? 0xc62828, 0.44, 0.22, 0.45);  // laca de camioneta
  const rojoOscuro = M(0x992020, 0.58, 0.14, 0.25);
  const vidrio = M(0x2f3b44, 0.1, 0.4, 0.9);
  const negroPl = M(0x232527, 0.94, 0.03);   // aletines y techo duro, mate
  const acero = M(0x484c50, 0.38, 0.65, 0.6); // defensas de tubo
  const luz = M(0xf6f0d4, 0.16, 0.1, 0.35);
  const luzRoja = M(0xd8362e, 0.2, 0.1, 0.3);
  const ambar = M(0xe8962e, 0.28, 0.1, 0.3);
  const ranura = M(0x1c1614, 0.9, 0.05);
  const matsRueda = {
    goma: M(0x1a1b1e, 0.96, 0.0),
    taco: M(0x232428, 0.97, 0.0),
    acero: M(0x9ea3a8, 0.3, 0.7, 0.75),
    hueco: M(0x2a2c2f, 0.8, 0.2),
  };

  const grupo = new THREE.Group();
  grupo.name = 'escarabajoRojo';
  const chasis = new THREE.Group();
  chasis.name = 'chasis';
  grupo.add(chasis);

  // ── carrocería cuadrada, capó plano, cintura alta ─────────────────────────
  const perfil = new THREE.Shape();
  perfil.moveTo(-1.94, 0.56);
  perfil.lineTo(2.0, 0.56);
  perfil.lineTo(2.0, 1.0);
  perfil.quadraticCurveTo(2.0, 1.08, 1.9, 1.08);   // borde del capó
  perfil.lineTo(0.78, 1.1);                         // capó plano
  perfil.lineTo(0.68, 1.22);                        // escalón del cortafuego
  perfil.lineTo(-1.86, 1.22);                       // cintura recta
  perfil.quadraticCurveTo(-1.94, 1.22, -1.94, 1.12);
  perfil.lineTo(-1.94, 0.56);
  const cuerpo = new THREE.Mesh(extruir(THREE, perfil, 1.68, 0.06, 6), rojo);
  chasis.add(cuerpo);

  // parabrisas PLANO con marco, apenas reclinado
  const marcoPb = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.6, 1.62), rojo);
  marcoPb.position.set(0.56, 1.48, 0);
  marcoPb.rotation.z = -0.12;
  chasis.add(marcoPb);
  const pb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.48, 1.42), vidrio);
  pb.position.set(0.585, 1.47, 0);
  pb.rotation.z = -0.12;
  chasis.add(pb);
  for (const lado of [-1, 1]) {
    const limpia = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.3, 0.03), ranura);
    limpia.position.set(0.62, 1.32, lado * 0.35);
    limpia.rotation.z = -0.12;
    limpia.rotation.x = lado * 0.5;
    chasis.add(limpia);
  }

  // techo duro (tono contraste) con ventanas laterales y luneta
  const pTecho = new THREE.Shape();
  pTecho.moveTo(0.38, 1.24);
  pTecho.lineTo(0.32, 1.7);
  pTecho.quadraticCurveTo(0.3, 1.76, 0.2, 1.76);
  pTecho.lineTo(-1.72, 1.76);
  pTecho.quadraticCurveTo(-1.82, 1.76, -1.84, 1.68);
  pTecho.lineTo(-1.88, 1.24);
  pTecho.lineTo(0.38, 1.24);
  const techo = new THREE.Mesh(extruir(THREE, pTecho, 1.56, 0.05, 6), negroPl);
  chasis.add(techo);
  for (const lado of [-1, 1]) {
    const vLat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.32, 0.03), vidrio);
    vLat.position.set(-0.78, 1.5, lado * 0.83);
    chasis.add(vLat);
  }
  const luneta = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.32, 1.24), vidrio);
  luneta.position.set(-1.9, 1.5, 0);
  chasis.add(luneta);

  // ── cara: parrilla de SIETE ranuras verticales + faros redondos ───────────
  const panelGrilla = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 1.18), rojo);
  panelGrilla.position.set(2.03, 0.84, 0);
  chasis.add(panelGrilla);
  for (let i = 0; i < 7; i++) {
    const z = -0.45 + i * 0.15;
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.3, 0.085), ranura);
    slot.position.set(2.065, 0.84, z);
    chasis.add(slot);
  }
  for (const lado of [-1, 1]) {
    const aroFaro = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.025, 8, 16), matsRueda.acero);
    aroFaro.rotation.y = Math.PI / 2;
    aroFaro.position.set(2.045, 0.84, lado * 0.72);
    chasis.add(aroFaro);
    const faro = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.05, 16), luz);
    faro.rotation.z = Math.PI / 2;
    faro.position.set(2.04, 0.84, lado * 0.72);
    chasis.add(faro);
    const guiño = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.12), ambar);
    guiño.position.set(2.02, 1.06, lado * 0.62);
    chasis.add(guiño);
  }

  // aletines trapezoidales negros sobre cada rueda + luces traseras
  for (const lado of [-1, 1]) {
    for (const xw of [1.42, -1.42]) {
      const aletin = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.075, 6, 12, Math.PI), negroPl);
      aletin.position.set(xw, 0.5, lado * 0.9);
      chasis.add(aletin);
    }
    const stop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.13), luzRoja);
    stop.position.set(-1.99, 1.04, lado * 0.68);
    chasis.add(stop);
    const espejo = new THREE.Group();
    const brazo = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.05), ranura);
    brazo.position.y = 0.05;
    espejo.add(brazo);
    const cara = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.11), negroPl);
    cara.position.y = 0.16;
    espejo.add(cara);
    espejo.position.set(0.62, 1.26, lado * 0.88);
    chasis.add(espejo);
    // bisagras del capó y manijas
    const manija = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.02), matsRueda.acero);
    manija.position.set(0.1, 1.05, lado * 0.9);
    chasis.add(manija);
  }
  const tapaCombustible = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 12), matsRueda.acero);
  tapaCombustible.rotation.x = Math.PI / 2;
  tapaCombustible.position.set(-1.45, 0.95, 0.9);
  chasis.add(tapaCombustible);

  // ── defensas de tubo, ganchos, repuesto atrás ─────────────────────────────
  const defDel = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.9, 12), acero);
  defDel.rotation.x = Math.PI / 2;
  defDel.position.set(2.18, 0.58, 0);
  chasis.add(defDel);
  for (const lado of [-1, 1]) {
    const tapa = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), acero);
    tapa.position.set(2.18, 0.58, lado * 0.95);
    chasis.add(tapa);
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 6, 10, Math.PI), acero);
    hoop.rotation.y = Math.PI / 2;
    hoop.position.set(2.18, 0.62, lado * 0.52);
    chasis.add(hoop);
    const gancho = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.022, 6, 10), rojoOscuro);
    gancho.rotation.y = Math.PI / 2;
    gancho.position.set(2.12, 0.44, lado * 0.3);
    chasis.add(gancho);
  }
  const defTras = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.84, 12), acero);
  defTras.rotation.x = Math.PI / 2;
  defTras.position.set(-2.06, 0.54, 0);
  chasis.add(defTras);

  // llanta de repuesto montada en el portón (NO gira: no entra en ruedas)
  const soporte = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.3), rojoOscuro);
  soporte.position.set(-2.0, 0.95, 0);
  chasis.add(soporte);
  const repuesto = ruedaTaco(THREE, 0.4, 0.24, 'repuesto', matsRueda);
  repuesto.rotation.y = Math.PI / 2; // el eje queda longitudinal: mira hacia atrás
  repuesto.position.set(-2.13, 1.0, 0);
  chasis.add(repuesto);

  // ── ruedas (grupos nombrados, convención modelos.js) ──────────────────────
  const radio = 0.47;
  const ancho = 0.38;
  const ruedas = [];
  const ruedasF = [];
  const posRuedas = [
    { x: 1.42, z: 0.94, f: true, nombre: 'ruedaDelanteraDer' },
    { x: 1.42, z: -0.94, f: true, nombre: 'ruedaDelanteraIzq' },
    { x: -1.42, z: 0.94, f: false, nombre: 'ruedaTraseraDer' },
    { x: -1.42, z: -0.94, f: false, nombre: 'ruedaTraseraIzq' },
  ];
  for (const p of posRuedas) {
    const r = ruedaTaco(THREE, radio, ancho, p.nombre, matsRueda);
    r.position.set(p.x, radio, p.z);
    chasis.add(r);
    ruedas.push(r);
    if (p.f) ruedasF.push(r);
  }

  // ── volante y ancla del piloto ────────────────────────────────────────────
  const volante = new THREE.Group();
  volante.name = 'volante';
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 8, 16), M(0x2a2a30, 0.55, 0.2));
  aro.rotation.y = Math.PI / 2;
  volante.add(aro);
  const centroV = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), M(0x7d7d86, 0.42, 0.4));
  centroV.rotation.z = Math.PI / 2;
  volante.add(centroV);
  for (const ang of [0, Math.PI * 0.66, Math.PI * 1.33]) {
    const rad = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.03, 0.03), M(0x2a2a30, 0.5, 0.15));
    rad.rotation.z = ang;
    volante.add(rad);
  }
  volante.position.set(0.42, 1.34, 0);
  volante.rotation.z = Math.PI / 2;
  chasis.add(volante);

  const ancla = new THREE.Object3D();
  ancla.name = 'anclaPiloto';
  ancla.position.set(0.05, 1.14, 0);
  ancla.rotation.y = Math.PI / 2;
  ancla.userData = { modo: 'cabina', escala: 0.78 };
  chasis.add(ancla);

  // sombras como en modelos.js: todo menos las ruedas
  const enRueda = new Set();
  for (const r of ruedas) r.traverse((o) => enRueda.add(o));
  grupo.traverse((o) => {
    if (o.isMesh && !enRueda.has(o)) o.castShadow = true;
  });

  grupo.userData = {
    id: 'pickup',
    ruedas,
    ruedasF,
    chasis,
    volante,
    anclaPiloto: ancla,
    alturaPiso: 0.6,
    radioRueda: radio,
  };
  return grupo;
}
