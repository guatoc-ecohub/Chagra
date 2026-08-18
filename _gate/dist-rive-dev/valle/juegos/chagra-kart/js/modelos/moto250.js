// ── moto250.js — enduro 250 de trabajo campesino (Chagra Kart) ──────────────
// Factory pura: crearMoto250(THREE, opts) → THREE.Group orientado a +X, piso
// en y=0. Convención modelos.js: grupo → chasis → piezas; ruedas como grupos
// nombrados hijos del chasis en (x, radio, z); el motor aplica rotation.x
// (giro) y rotation.y (dirección). Tanque angosto, manubrio alto, guardabarros
// levantado, llantas de taco, parrilla de varilla con costal amarrado, barro
// seco en el motor. Sin marcas ni logos.
// Pasada 2 (arte): llantas con perfil de neumático real (talón, flanco
// abombado, hombro) y mochos de enduro chicos en dos filas trabadas por
// InstancedMesh; los rayos también van instanciados (1 drawcall). Tanque
// lacado, exosto y aros reflejan un cielo pintado (CubeTexture procedural).

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

function ruedaRayos(THREE, radio, ancho, nombre, mats) {
  const g = new THREE.Group();
  g.name = nombre;
  const c = new THREE.Group();
  c.rotation.x = Math.PI / 2; // eje de giro → Z, como rueda() en modelos.js
  g.add(c);
  const h = ancho / 2;
  const ri = radio * 0.72;
  // perfil con talón, flanco abombado, hombro redondeado y canal central
  const mitad = [
    [ri, h * 0.68], [radio * 0.80, h * 1.0], [radio * 0.88, h * 0.92],
    [radio * 0.955, h * 0.6], [radio, h * 0.22], [radio * 0.985, h * 0.06],
  ];
  const perfil = [
    ...mitad.map(([x, y]) => new THREE.Vector2(x, -y)),
    ...mitad.slice().reverse().map(([x, y]) => new THREE.Vector2(x, y)),
  ];
  c.add(new THREE.Mesh(new THREE.LatheGeometry(perfil, 22), mats.goma));
  // mochos de enduro: dos filas trabadas, una sola llamada de dibujo
  const POR_FILA = 14;
  const tacos = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.032, ancho * 0.52, 0.045),
    mats.taco, POR_FILA * 2
  );
  {
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const ejeY = new THREE.Vector3(0, 1, 0);
    const esc = new THREE.Vector3(1, 1, 1);
    let i = 0;
    for (const fila of [-1, 1]) {
      const desfase = fila < 0 ? 0 : Math.PI / POR_FILA;
      for (let k = 0; k < POR_FILA; k++) {
        const a = (k / POR_FILA) * Math.PI * 2 + desfase;
        q.setFromAxisAngle(ejeY, a);
        m4.compose(
          new THREE.Vector3(Math.cos(a) * radio, fila * ancho * 0.24, -Math.sin(a) * radio),
          q, esc
        );
        tacos.setMatrixAt(i++, m4);
      }
    }
    tacos.instanceMatrix.needsUpdate = true;
  }
  c.add(tacos);
  const aro = new THREE.Mesh(new THREE.CylinderGeometry(ri, ri, ancho * 0.5, 18, 1, true), mats.aro);
  c.add(aro);
  const cubo = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, ancho * 0.9, 10), mats.aro);
  c.add(cubo);
  // rayos cruzados instanciados: una sola llamada de dibujo
  const rayos = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.007, 0.007, ri - 0.05, 4),
    mats.rayo, 18
  );
  {
    const m4 = new THREE.Matrix4();
    const giro = new THREE.Matrix4();
    const paso = new THREE.Matrix4();
    for (let i = 0; i < 18; i++) {
      giro.makeRotationY((i / 18) * Math.PI * 2);
      paso.makeTranslation(ri * 0.5, (i % 2 ? 1 : -1) * ancho * 0.16, 0);
      m4.copy(giro).multiply(paso).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2 + (i % 2 ? 0.1 : -0.1)));
      rayos.setMatrixAt(i, m4);
    }
    rayos.instanceMatrix.needsUpdate = true;
  }
  c.add(rayos);
  return g;
}

export function crearMoto250(THREE, opts = {}) {
  const cielo = crearCielo(THREE);
  const M = (c, r = 0.85, m = 0.05, refl = 0) => {
    const mat = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    if (refl) { mat.envMap = cielo; mat.envMapIntensity = refl; }
    return mat;
  };

  const color = M(opts.color ?? 0xe67e22, 0.34, 0.25, 0.5);  // tanque lacado
  const negro = M(0x1d1e22, 0.9, 0.05);
  const motorMat = M(opts.color2 ?? 0x6a6d70, 0.45, 0.55, 0.35);
  const acero = M(0x9ca0a6, 0.32, 0.72, 0.6);
  const barro = M(0x5c4326, 1.0, 0.0);
  const fique = M(0xcdb37a, 0.98, 0.0);
  const cuerda = M(0x8a6b40, 0.95, 0.0);
  const matsRueda = {
    goma: M(0x1a1b1e, 0.96, 0.0),
    taco: M(0x232428, 0.97, 0.0),
    aro: M(0xb4b8bd, 0.28, 0.72, 0.7),
    rayo: M(0xc4c8cc, 0.26, 0.72, 0.7),
  };

  const grupo = new THREE.Group();
  grupo.name = 'moto250';
  const chasis = new THREE.Group();
  chasis.name = 'chasis';
  grupo.add(chasis);

  // ── cuadro y motor ────────────────────────────────────────────────────────
  const espina = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.72, 8), negro);
  espina.rotation.z = 1.28; // del cabezal al pivote
  espina.position.set(0.42, 0.78, 0);
  chasis.add(espina);
  for (const lado of [-1, 1]) {
    const cuna = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.62, 6), negro);
    cuna.rotation.z = 0.5;
    cuna.position.set(0.35, 0.55, lado * 0.07);
    chasis.add(cuna);
    const tirante = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 6), negro);
    tirante.rotation.z = -1.0;
    tirante.position.set(-0.32, 0.68, lado * 0.08);
    chasis.add(tirante);
  }
  const carter = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.26), motorMat);
  carter.position.set(0.02, 0.48, 0);
  chasis.add(carter);
  const cilindro = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.2), motorMat);
  cilindro.position.set(0.16, 0.68, 0);
  cilindro.rotation.z = -0.2;
  chasis.add(cilindro);
  for (let i = 0; i < 4; i++) { // aletas de refrigeración
    const aleta = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.24), negro);
    aleta.position.set(0.16 + i * 0.012, 0.6 + i * 0.055, 0);
    aleta.rotation.z = -0.2;
    chasis.add(aleta);
  }
  // barro seco en la parte baja del motor y el basculante
  for (const [x, y, z, r] of [
    [0.0, 0.38, 0.1, 0.07], [0.12, 0.36, -0.09, 0.08], [-0.08, 0.4, -0.05, 0.05],
    [-0.55, 0.42, 0.09, 0.05], [-0.8, 0.4, -0.07, 0.045], [0.95, 0.62, 0.06, 0.04],
  ]) {
    const costra = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), barro);
    costra.scale.set(1.3, 0.7, 1);
    costra.position.set(x, y, z);
    chasis.add(costra);
  }

  // ── tanque angosto, asiento plano, colín levantado ────────────────────────
  const tanque = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), color);
  tanque.scale.set(1.1, 0.6, 0.44); // ANGOSTO, de enduro
  tanque.position.set(0.4, 0.92, 0);
  chasis.add(tanque);
  const tapaTanque = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 8), negro);
  tapaTanque.position.set(0.4, 1.1, 0);
  chasis.add(tapaTanque);
  const asiento = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.24), negro);
  asiento.position.set(-0.26, 0.9, 0);
  asiento.rotation.z = 0.05;
  chasis.add(asiento);
  // guardabarros trasero levantado (con la cola al aire, silueta enduro)
  const colin = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.035, 0.22), color);
  colin.position.set(-0.85, 1.0, 0);
  colin.rotation.z = -0.22;
  chasis.add(colin);
  const stop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.1), M(0xd8362e, 0.22, 0.08));
  stop.position.set(-1.1, 1.05, 0);
  chasis.add(stop);

  // guardabarros delantero ALTO sobre la rueda, plano y ancho
  const guardaf = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 6, 14, 1.8), color);
  guardaf.rotation.z = (Math.PI - 1.8) / 2; // arco centrado arriba
  guardaf.scale.set(1.02, 0.85, 3.2);
  guardaf.position.set(0.95, 0.5, 0);
  chasis.add(guardaf);

  // ── suspensión, basculante, cadena ────────────────────────────────────────
  for (const lado of [-1, 1]) {
    const barraF = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8), acero);
    barraF.rotation.z = 0.26;
    barraF.position.set(0.87, 0.92, lado * 0.09);
    chasis.add(barraF);
    const botella = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.036, 0.42, 8), negro);
    botella.rotation.z = 0.26;
    botella.position.set(0.92, 0.58, lado * 0.09);
    chasis.add(botella);
    const brazoBasc = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.05, 0.035), negro);
    brazoBasc.rotation.z = 0.09;
    brazoBasc.position.set(-0.7, 0.44, lado * 0.1);
    chasis.add(brazoBasc);
  }
  // amortiguador con resorte
  const vastago = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 6), acero);
  vastago.rotation.z = 0.5;
  vastago.position.set(-0.52, 0.64, 0.02);
  chasis.add(vastago);
  for (let i = 0; i < 5; i++) {
    const espira = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.011, 5, 10), M(0xb03a2e, 0.5, 0.3));
    espira.rotation.y = Math.PI / 2 - 0.5;
    espira.position.set(-0.46 - i * 0.033, 0.7 - i * 0.058, 0.02);
    chasis.add(espira);
  }
  // cadena y piñón (lado izquierdo)
  const pinon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.015, 16), acero);
  pinon.rotation.x = Math.PI / 2;
  pinon.position.set(-1.0, 0.4, 0.12);
  chasis.add(pinon);
  for (const dy of [0.065, -0.05]) {
    const tramo = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.022, 0.02), negro);
    tramo.rotation.z = dy > 0 ? 0.06 : 0.02;
    tramo.position.set(-0.52, 0.43 + dy, 0.12);
    chasis.add(tramo);
  }

  // ── manubrio alto con guardamanos, faro con máscara ───────────────────────
  const tija = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.2), negro);
  tija.position.set(0.79, 1.08, 0);
  chasis.add(tija);
  for (const lado of [-1, 1]) {
    const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.1, 6), acero);
    riser.position.set(0.79, 1.14, lado * 0.05);
    chasis.add(riser);
  }
  const manubrio = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.54, 8), acero);
  manubrio.rotation.x = Math.PI / 2;
  manubrio.position.set(0.79, 1.2, 0);
  chasis.add(manubrio);
  for (const lado of [-1, 1]) {
    const punta = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 8), acero);
    punta.rotation.x = Math.PI / 2;
    punta.rotation.y = lado * 0.5;
    punta.position.set(0.75, 1.21, lado * 0.35);
    chasis.add(punta);
    const puno = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.13, 8), negro);
    puno.rotation.x = Math.PI / 2;
    puno.rotation.y = lado * 0.5;
    puno.position.set(0.71, 1.21, lado * 0.44);
    chasis.add(puno);
    const guardamano = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), color);
    guardamano.scale.set(1.15, 0.68, 0.5);
    guardamano.position.set(0.8, 1.22, lado * 0.46);
    chasis.add(guardamano);
    const palanca = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.13, 5), acero);
    palanca.rotation.x = Math.PI / 2;
    palanca.rotation.y = lado * 0.7;
    palanca.position.set(0.77, 1.24, lado * 0.33);
    chasis.add(palanca);
  }
  const mascara = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.2, 0.16), M(0xe8e4d8, 0.6, 0.05));
  mascara.position.set(0.88, 1.06, 0);
  mascara.rotation.z = -0.2;
  chasis.add(mascara);
  const faro = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 12), M(0xfff3ca, 0.18, 0.08));
  faro.rotation.z = Math.PI / 2;
  faro.position.set(0.92, 1.03, 0);
  chasis.add(faro);

  // ── escape alto con protector ─────────────────────────────────────────────
  const codo = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.3, 8), acero);
  codo.rotation.z = 0.9;
  codo.position.set(0.28, 0.52, -0.12);
  chasis.add(codo);
  const tramoBajo = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.55, 8), acero);
  tramoBajo.rotation.z = Math.PI / 2 - 0.18;
  tramoBajo.position.set(-0.18, 0.51, -0.15);
  chasis.add(tramoBajo);
  const codo2 = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.22, 8), acero);
  codo2.rotation.z = 1.15;
  codo2.position.set(-0.5, 0.56, -0.155);
  chasis.add(codo2);
  const silenciador = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.42, 4, 10), M(0xb9bdc2, 0.3, 0.7, 0.8));
  silenciador.rotation.z = 1.4;
  silenciador.position.set(-0.72, 0.62, -0.16);
  chasis.add(silenciador);
  const protector = new THREE.Mesh(
    new THREE.CylinderGeometry(0.072, 0.072, 0.34, 10, 1, true, 0, Math.PI),
    M(0x84888d, 0.45, 0.55, 0.45)
  );
  protector.rotation.z = 1.4;
  protector.rotation.y = Math.PI / 2;
  protector.position.set(-0.72, 0.66, -0.17);
  chasis.add(protector);

  // ── parrilla de varilla con costal amarrado ───────────────────────────────
  const parrilla = new THREE.Group();
  for (const lado of [-1, 1]) {
    const largueroP = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.36, 6), acero);
    largueroP.rotation.z = Math.PI / 2;
    largueroP.position.set(0, 0, lado * 0.11);
    parrilla.add(largueroP);
  }
  for (const dx of [-0.15, 0, 0.15]) {
    const varilla = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.25, 6), acero);
    varilla.rotation.x = Math.PI / 2;
    varilla.position.set(dx, 0, 0);
    parrilla.add(varilla);
  }
  for (const lado of [-1, 1]) {
    const soporte = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.22, 6), acero);
    soporte.rotation.z = 0.5;
    soporte.position.set(-0.08, -0.1, lado * 0.1);
    parrilla.add(soporte);
  }
  parrilla.position.set(-0.98, 1.02, 0);
  chasis.add(parrilla);
  const costal = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), fique);
  costal.scale.set(1.35, 0.9, 1.05);
  costal.position.set(-0.97, 1.13, 0);
  costal.rotation.z = 0.12;
  chasis.add(costal);
  const nudo = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), fique);
  nudo.position.set(-0.79, 1.21, 0);
  chasis.add(nudo);
  for (const [rz, y] of [[0.35, 1.13], [-0.3, 1.12]]) {
    const soga = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 5, 12), cuerda);
    soga.rotation.y = Math.PI / 2;
    soga.rotation.x = rz;
    soga.position.set(-0.97, y, 0);
    soga.scale.set(1.3, 0.95, 1.1);
    chasis.add(soga);
  }

  // estriberas y pedal
  for (const lado of [-1, 1]) {
    const estribera = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.14), negro);
    estribera.position.set(-0.12, 0.44, lado * 0.2);
    chasis.add(estribera);
  }
  const pedal = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.16, 5), acero);
  pedal.rotation.z = Math.PI / 2;
  pedal.position.set(0.08, 0.42, 0.16);
  chasis.add(pedal);

  // ── ruedas de taco con rayos (grupos nombrados) ───────────────────────────
  const radio = 0.4;
  const ruedas = [];
  const ruedasF = [];
  const rDel = ruedaRayos(THREE, radio, 0.13, 'ruedaDelantera', matsRueda);
  rDel.position.set(0.95, radio, 0);
  chasis.add(rDel);
  ruedas.push(rDel);
  ruedasF.push(rDel);
  const rTras = ruedaRayos(THREE, radio, 0.17, 'ruedaTrasera', matsRueda);
  rTras.position.set(-1.0, radio, 0);
  chasis.add(rTras);
  ruedas.push(rTras);

  // ── ancla del piloto (montado, orejas al viento) ──────────────────────────
  const ancla = new THREE.Object3D();
  ancla.name = 'anclaPiloto';
  ancla.position.set(-0.08, 0.76, 0);
  ancla.rotation.y = Math.PI / 2;
  ancla.userData = { modo: 'expuesto', escala: 0.64 };
  chasis.add(ancla);

  // sombras como en modelos.js: todo menos las ruedas
  const enRueda = new Set();
  for (const r of ruedas) r.traverse((o) => enRueda.add(o));
  grupo.traverse((o) => {
    if (o.isMesh && !enRueda.has(o)) o.castShadow = true;
  });

  grupo.userData = {
    id: 'moto',
    ruedas,
    ruedasF,
    chasis,
    volante: null,
    anclaPiloto: ancla,
    alturaPiso: 0.52,
    radioRueda: radio,
  };
  return grupo;
}
