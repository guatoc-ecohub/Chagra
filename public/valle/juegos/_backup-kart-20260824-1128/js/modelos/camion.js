// ── camion.js — camión de estacas viejo de finca (Chagra Kart) ──────────────
// Factory pura: crearCamion(THREE, opts) → THREE.Group orientado a +X, piso en
// y=0. Convención modelos.js: grupo → chasis → piezas; ruedas como grupos
// nombrados hijos del chasis en (x, radio, z); el motor aplica rotation.x
// (giro) y rotation.y (dirección). Cabina alta y cuadrada, estacas de madera,
// guardabarros anchos, defensa de tubo, bultos amarrados con lazo. Las ruedas
// traseras son morochas (doble llanta en un solo grupo). Sin marcas ni logos.
// Pasada 2 (arte): llantas con perfil de neumático real y tacos chicos en dos
// filas trabadas (InstancedMesh, 1 drawcall por fila de tacos); la madera de
// las estacas lleva veta pintada (CanvasTexture) y los bultos tejido de
// fique; pintura y acero se separan por respuesta a la luz con un cielo
// pintado (CubeTexture procedural). Cero assets externos.

function rngSemilla(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

function lienzo(w, h, pintar) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  pintar(c.getContext('2d'), w, h);
  return c;
}

function texturar(THREE, canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

// cielo pintado para reflejos: sin esto el metal se ve gris muerto
function crearCielo(THREE) {
  const cara = (tipo) => lienzo(32, 32, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    if (tipo === 1) { g.addColorStop(0, '#f4fafe'); g.addColorStop(1, '#bcd6e6'); }
    else if (tipo === -1) { g.addColorStop(0, '#5c5044'); g.addColorStop(1, '#4a4036'); }
    else {
      g.addColorStop(0, '#a9cbde'); g.addColorStop(0.45, '#e9e3c8');
      g.addColorStop(0.58, '#8d7a5e'); g.addColorStop(1, '#544738');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  const t = new THREE.CubeTexture([cara(0), cara(0), cara(1), cara(-1), cara(0), cara(0)]);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

// madera pálida con veta ondulada y nudos: se tiñe por material (A/B/C)
function texturaMadera(THREE, rng) {
  return texturar(THREE, lienzo(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#ddd0b4';
    ctx.fillRect(0, 0, w, h);
    for (let k = 0; k < 14; k++) {
      const vy = rng() * h;
      const amp = 1 + rng() * 2.6;
      const fase = rng() * Math.PI * 2;
      ctx.strokeStyle = rng() < 0.7 ? 'rgba(96,64,30,0.45)' : 'rgba(250,236,204,0.5)';
      ctx.lineWidth = 0.7 + rng() * 1.4;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const yy = vy + Math.sin(x * 0.055 + fase) * amp;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    for (let n = 0; n < 3; n++) {
      const nx = rng() * w, ny = rng() * h;
      for (let r = 4; r > 0; r--) {
        ctx.fillStyle = r % 2 ? 'rgba(96,62,28,0.5)' : 'rgba(168,130,84,0.5)';
        ctx.beginPath();
        ctx.ellipse(nx, ny, r * 2.0, r * 1.2, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = `rgba(84,56,26,${(rng() * 0.14).toFixed(3)})`;
      ctx.fillRect(rng() * w, rng() * h, 1 + rng() * 2, 1 + rng() * 2);
    }
  }));
}

// tejido de costal de fique: se tiñe por material
function texturaFique(THREE, rng) {
  return texturar(THREE, lienzo(96, 96, (ctx, w, h) => {
    ctx.fillStyle = '#ded8ca';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(76,60,36,0.4)';
    ctx.lineWidth = 1.5;
    for (let i = -h; i < w + h; i += 6) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i + h, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }
    for (let y = 5; y < h; y += 14) {
      ctx.strokeStyle = 'rgba(255,248,230,0.45)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(76,60,36,0.4)';
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(96,76,44,${(rng() * 0.2).toFixed(3)})`;
      ctx.fillRect(rng() * w, rng() * h, 1 + rng() * 2, 1 + rng());
    }
  }));
}

// perfil de neumático: talón, flanco abombado, hombro y canal central
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

// tacos de trocha en dos filas trabadas: una sola llamada de dibujo
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

function ruedaCamion(THREE, radio, nombre, mats, morocha) {
  const g = new THREE.Group();
  g.name = nombre;
  const c = new THREE.Group();
  c.rotation.x = Math.PI / 2; // eje de giro → Z, como rueda() en modelos.js
  g.add(c);
  const anchoTotal = morocha ? 0.44 : 0.36;
  const centros = morocha ? [-0.115, 0.115] : [0];
  const anchoLlanta = morocha ? 0.2 : 0.36;
  for (const cy of centros) {
    const ri = radio * 0.52;
    const llanta = new THREE.Mesh(
      new THREE.LatheGeometry(perfilNeumatico(THREE, radio, anchoLlanta, ri), 22),
      mats.goma
    );
    llanta.position.y = cy;
    c.add(llanta);
    c.add(tacosLlanta(THREE, mats.taco, radio, anchoLlanta, 14, [0.034, anchoLlanta * 0.4, 0.08], cy));
  }
  const plato = new THREE.Mesh(
    new THREE.CylinderGeometry(radio * 0.5, radio * 0.5, anchoTotal * 0.6, 16),
    mats.acero
  );
  c.add(plato);
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Group();
    s.rotation.y = (i / 6) * Math.PI * 2;
    const tuerca = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, anchoTotal * 0.66, 6), mats.tuerca);
    tuerca.position.x = radio * 0.24;
    s.add(tuerca);
    c.add(s);
  }
  return g;
}

export function crearCamion(THREE, opts = {}) {
  const cielo = crearCielo(THREE);
  const rng = rngSemilla(20260807);
  const tMadera = texturaMadera(THREE, rng);
  const tFique = texturaFique(THREE, rng);
  const M = (c, r = 0.85, m = 0.05, refl = 0, map = null) => {
    const mat = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    if (refl) { mat.envMap = cielo; mat.envMapIntensity = refl; }
    if (map) mat.map = map;
    return mat;
  };

  const cabinaMat = M(opts.color ?? 0x8f6a3a, 0.55, 0.18, 0.3);  // pintura vieja
  const crema = M(opts.color2 ?? 0xc9b48a, 0.55, 0.1, 0.25);
  const vidrio = M(0x9dbecb, 0.12, 0.4, 0.85);
  const acero = M(0x53575c, 0.4, 0.65, 0.55);
  const oxido = M(0x6e4226, 1.0, 0.02);
  const luz = M(0xf6efc8, 0.18, 0.1, 0.3);
  const luzRoja = M(0xd8362e, 0.2, 0.1, 0.25);
  const negro = M(0x1b1c1f, 0.92, 0.03);
  const maderaA = M(0xa87d4c, 0.92, 0.0, 0, tMadera);
  const maderaB = M(0xc0955e, 0.92, 0.0, 0, tMadera);
  const maderaC = M(0x8d693c, 0.94, 0.0, 0, tMadera);
  const fiqueA = M(0xd6bb84, 0.98, 0.0, 0, tFique);
  const fiqueB = M(0xb59a6e, 0.98, 0.0, 0, tFique);
  const fiqueC = M(0x9c885e, 0.98, 0.0, 0, tFique);
  const soga = M(0x8a6b40, 0.95, 0.0);
  const matsRueda = {
    goma: M(0x1a1b1e, 0.96, 0.0),
    taco: M(0x232428, 0.97, 0.0),
    acero: M(0x8e9398, 0.32, 0.7, 0.65),
    tuerca: M(0x6a6f74, 0.45, 0.55, 0.45),
  };

  const grupo = new THREE.Group();
  grupo.name = 'camionDeCampo';
  const chasis = new THREE.Group();
  chasis.name = 'chasis';
  grupo.add(chasis);

  // ── bastidor ──────────────────────────────────────────────────────────────
  for (const lado of [-1, 1]) {
    const riel = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.12, 0.08), negro);
    riel.position.set(0, 0.5, lado * 0.55);
    chasis.add(riel);
  }
  for (const x of [-1.8, -0.6, 0.6, 1.8]) {
    const cruceta = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 1.1), negro);
    cruceta.position.set(x, 0.5, 0);
    chasis.add(cruceta);
  }

  // ── capó cuadrado, angosto, con rejilla y persianas laterales ─────────────
  const pCapo = new THREE.Shape();
  pCapo.moveTo(1.45, 0.66);
  pCapo.lineTo(2.1, 0.66);
  pCapo.quadraticCurveTo(2.18, 0.66, 2.18, 0.78);
  pCapo.lineTo(2.16, 1.12);
  pCapo.quadraticCurveTo(2.16, 1.2, 2.06, 1.2);
  pCapo.lineTo(1.55, 1.24);
  pCapo.lineTo(1.45, 1.24);
  pCapo.lineTo(1.45, 0.66);
  const capo = new THREE.Mesh(extruir(THREE, pCapo, 1.02, 0.05, 6), cabinaMat);
  chasis.add(capo);
  const lomo = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.035, 0.09), crema);
  lomo.position.set(1.82, 1.27, 0);
  chasis.add(lomo);
  for (const lado of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const persiana = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.05), negro);
      persiana.position.set(1.62 + i * 0.16, 0.96, lado * 0.57);
      chasis.add(persiana);
    }
  }
  // rejilla del radiador con marco crema
  const marcoRad = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 1.0), crema);
  marcoRad.position.set(2.2, 0.9, 0);
  chasis.add(marcoRad);
  for (let i = 0; i < 7; i++) {
    const barra = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.055), negro);
    barra.position.set(2.24, 0.89, -0.36 + i * 0.12);
    chasis.add(barra);
  }

  // ── cabina ALTA y CUADRADA ────────────────────────────────────────────────
  const pCab = new THREE.Shape();
  pCab.moveTo(0.42, 0.58);
  pCab.lineTo(1.5, 0.58);
  pCab.lineTo(1.5, 1.28);
  pCab.lineTo(1.42, 1.34);
  pCab.lineTo(1.38, 1.86);
  pCab.quadraticCurveTo(1.36, 2.0, 1.22, 2.0);
  pCab.lineTo(0.56, 2.0);
  pCab.quadraticCurveTo(0.44, 2.0, 0.43, 1.88);
  pCab.lineTo(0.42, 0.58);
  const cab = new THREE.Mesh(extruir(THREE, pCab, 1.66, 0.06, 6), cabinaMat);
  chasis.add(cab);
  // parabrisas plano en dos hojas con parante central
  for (const lado of [-1, 1]) {
    const hoja = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.4, 0.62), vidrio);
    hoja.position.set(1.43, 1.6, lado * 0.37);
    hoja.rotation.z = -0.04;
    chasis.add(hoja);
    const ventana = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.42, 0.03), vidrio);
    ventana.position.set(0.95, 1.62, lado * 0.88);
    chasis.add(ventana);
    // filo de puerta y manija
    const filo = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.9, 0.02), M(0x6e5029, 0.7, 0.1));
    filo.position.set(0.58, 1.15, lado * 0.9);
    chasis.add(filo);
    const manija = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 0.02), acero);
    manija.position.set(0.85, 1.2, lado * 0.9);
    chasis.add(manija);
  }
  const parante = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.44, 0.07), cabinaMat);
  parante.position.set(1.43, 1.6, 0);
  parante.rotation.z = -0.04;
  chasis.add(parante);
  // visera sobre el parabrisas, marca de camión viejo
  const visera = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 1.6), crema);
  visera.position.set(1.52, 1.92, 0);
  visera.rotation.z = -0.18;
  chasis.add(visera);
  // espejos de brazo largo
  for (const lado of [-1, 1]) {
    const brazoE = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.34, 6), acero);
    brazoE.rotation.x = Math.PI / 2;
    brazoE.position.set(1.46, 1.72, lado * 1.0);
    chasis.add(brazoE);
    const espejo = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.11), acero);
    espejo.position.set(1.44, 1.66, lado * 1.14);
    chasis.add(espejo);
  }
  // estribos de madera
  for (const lado of [-1, 1]) {
    const estribo = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.05, 0.26), maderaB);
    estribo.position.set(0.95, 0.62, lado * 0.95);
    chasis.add(estribo);
  }

  // ── guardabarros anchos y redondos con faros encima ───────────────────────
  for (const lado of [-1, 1]) {
    const fender = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.095, 8, 14, Math.PI), cabinaMat);
    fender.position.set(1.42, 0.5, lado * 0.94);
    chasis.add(fender);
    // faldón que une el guardabarros con el capó
    const faldon = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.035, 0.42), cabinaMat);
    faldon.position.set(1.42, 1.13, lado * 0.72);
    chasis.add(faldon);
    // faro clásico colgado al flanco del radiador
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.18), cabinaMat);
    pedestal.position.set(2.12, 1.0, lado * 0.56);
    chasis.add(pedestal);
    const cuerpoFaro = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 14), crema);
    cuerpoFaro.rotation.z = Math.PI / 2;
    cuerpoFaro.position.set(2.14, 1.03, lado * 0.68);
    chasis.add(cuerpoFaro);
    const lente = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.03, 14), luz);
    lente.rotation.z = Math.PI / 2;
    lente.position.set(2.21, 1.03, lado * 0.68);
    chasis.add(lente);
    const guardaTras = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 8, 14, Math.PI), negro);
    guardaTras.position.set(-1.42, 0.52, lado * 0.94);
    chasis.add(guardaTras);
    const stop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.14), luzRoja);
    stop.position.set(-2.12, 0.78, lado * 0.7);
    chasis.add(stop);
  }
  // óxido en fenders, capó y borde de cabina
  for (const [x, y, z, r] of [
    [1.7, 0.82, 0.99, 0.07], [1.15, 0.7, -0.97, 0.06], [2.1, 0.7, 0.4, 0.05],
    [0.48, 0.75, 0.86, 0.06], [1.48, 0.95, -0.88, 0.045], [2.14, 1.15, -0.3, 0.04],
  ]) {
    const mancha = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), oxido);
    mancha.scale.set(1, 1, 0.25);
    mancha.position.set(x, y, z);
    mancha.lookAt(x * 2, y, z * 4);
    chasis.add(mancha);
  }

  // ── defensa de tubo adelante ──────────────────────────────────────────────
  const tuboDef = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 1.96, 12), acero);
  tuboDef.rotation.x = Math.PI / 2;
  tuboDef.position.set(2.34, 0.56, 0);
  chasis.add(tuboDef);
  const tuboDef2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 10), acero);
  tuboDef2.rotation.x = Math.PI / 2;
  tuboDef2.position.set(2.34, 0.34, 0);
  chasis.add(tuboDef2);
  for (const lado of [-1, 1]) {
    const vertical = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.44, 8), acero);
    vertical.position.set(2.33, 0.45, lado * 0.62);
    chasis.add(vertical);
    const tapaT = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), acero);
    tapaT.position.set(2.34, 0.56, lado * 0.98);
    chasis.add(tapaT);
  }
  // chimenea de escape junto a la cabina
  const chimenea = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 1.15, 10), acero);
  chimenea.position.set(0.38, 1.5, -0.82);
  chasis.add(chimenea);
  const capucha = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.12, 10), negro);
  capucha.rotation.x = 0.5;
  capucha.position.set(0.38, 2.1, -0.84);
  chasis.add(capucha);

  // ── planchón de estacas ───────────────────────────────────────────────────
  const maderas = [maderaA, maderaB, maderaC];
  for (let i = 0; i < 7; i++) {
    const tabla = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.06, 0.235), maderas[i % 3]);
    tabla.position.set(-0.85, 0.88, -0.75 + i * 0.25);
    chasis.add(tabla);
  }
  // cabecero delantero
  for (const lado of [-1, 1]) {
    const posteC = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.07), maderaC);
    posteC.position.set(0.36, 1.42, lado * 0.55);
    chasis.add(posteC);
  }
  for (const y of [1.25, 1.55, 1.85]) {
    const tablaC = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 1.66), maderaA);
    tablaC.position.set(0.36, y, 0);
    chasis.add(tablaC);
  }
  // estacas laterales y traseras, con la vejez encima
  for (const lado of [-1, 1]) {
    for (const [k, x] of [0.28, -0.5, -1.28, -2.0].entries()) {
      const poste = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.0, 0.07), maderas[(k + lado + 3) % 3]);
      poste.position.set(x, 1.38, lado * 0.88);
      if (k === 2 && lado > 0) poste.rotation.x = 0.05; // una estaca vencida
      chasis.add(poste);
    }
    const rielBajo = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.07, 0.05), maderaB);
    rielBajo.position.set(-0.86, 1.18, lado * 0.9);
    chasis.add(rielBajo);
    const rielAlto = new THREE.Mesh(new THREE.BoxGeometry(lado > 0 ? 2.1 : 2.44, 0.07, 0.05), maderaA);
    rielAlto.position.set(lado > 0 ? -1.02 : -0.86, 1.56, lado * 0.9);
    if (lado > 0) rielAlto.rotation.z = 0.022; // tabla suelta, camión viejo
    chasis.add(rielAlto);
  }
  for (const y of [1.15, 1.5]) {
    const porton = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 1.6), maderaB);
    porton.position.set(-2.08, y, 0);
    chasis.add(porton);
  }

  // ── bultos amarrados con lazo ─────────────────────────────────────────────
  const bultos = [
    [-0.55, 1.08, 0.34, fiqueA, 0.3], [-0.6, 1.08, -0.32, fiqueB, -0.4],
    [-1.15, 1.08, 0.05, fiqueC, 0.8], [-1.7, 1.08, 0.3, fiqueB, -0.2],
    [-1.72, 1.08, -0.34, fiqueA, 0.5], [-0.9, 1.36, 0.02, fiqueA, 1.2],
    [-1.5, 1.34, -0.05, fiqueC, -0.7],
  ];
  for (const [x, y, z, mat, ry] of bultos) {
    const bulto = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.28, 4, 8), mat);
    bulto.rotation.z = Math.PI / 2;
    bulto.rotation.y = ry;
    bulto.scale.set(1, 1, 0.82);
    bulto.position.set(x, y, z);
    chasis.add(bulto);
  }
  // lazos: tres cruces por encima de la carga, amarrados a las estacas
  for (const [x, alto] of [[-0.6, 1.52], [-1.2, 1.46], [-1.75, 1.5]]) {
    const lazo = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.92, 6), soga);
    lazo.rotation.x = Math.PI / 2;
    lazo.rotation.z = 0.1;
    lazo.position.set(x, alto, 0);
    chasis.add(lazo);
    for (const lado of [-1, 1]) {
      const nudo = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 5), soga);
      nudo.position.set(x, alto - 0.28, lado * 0.88);
      chasis.add(nudo);
      const chicote = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 5), soga);
      chicote.rotation.z = 0.15;
      chicote.position.set(x, alto - 0.25, lado * 0.9);
      chasis.add(chicote);
    }
  }

  // ── ruedas: sencillas adelante, morochas atrás ────────────────────────────
  const radio = 0.47;
  const ruedas = [];
  const ruedasF = [];
  const rDD = ruedaCamion(THREE, radio, 'ruedaDelanteraDer', matsRueda, false);
  rDD.position.set(1.42, radio, 0.94);
  const rDI = ruedaCamion(THREE, radio, 'ruedaDelanteraIzq', matsRueda, false);
  rDI.position.set(1.42, radio, -0.94);
  const rTD = ruedaCamion(THREE, radio, 'ruedaTraseraDer', matsRueda, true);
  rTD.position.set(-1.42, radio, 0.9);
  const rTI = ruedaCamion(THREE, radio, 'ruedaTraseraIzq', matsRueda, true);
  rTI.position.set(-1.42, radio, -0.9);
  for (const r of [rDD, rDI, rTD, rTI]) {
    chasis.add(r);
    ruedas.push(r);
  }
  ruedasF.push(rDD, rDI);

  // ── volante y ancla del piloto ────────────────────────────────────────────
  const M2 = M;
  const volante = new THREE.Group();
  volante.name = 'volante';
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.032, 8, 16), M2(0x2a2a30, 0.55, 0.2));
  aro.rotation.y = Math.PI / 2;
  volante.add(aro);
  const centroV = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), M2(0x7d7d86, 0.42, 0.4));
  centroV.rotation.z = Math.PI / 2;
  volante.add(centroV);
  for (const ang of [0, Math.PI * 0.66, Math.PI * 1.33]) {
    const rad = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.032, 0.032), M2(0x2a2a30, 0.5, 0.15));
    rad.rotation.z = ang;
    volante.add(rad);
  }
  volante.position.set(1.22, 1.42, 0);
  volante.rotation.z = Math.PI / 2;
  chasis.add(volante);

  const ancla = new THREE.Object3D();
  ancla.name = 'anclaPiloto';
  ancla.position.set(0.9, 1.24, 0);
  ancla.rotation.y = Math.PI / 2;
  ancla.userData = { modo: 'cabina', escala: 0.8 };
  chasis.add(ancla);

  // sombras como en modelos.js: todo menos las ruedas
  const enRueda = new Set();
  for (const r of ruedas) r.traverse((o) => enRueda.add(o));
  grupo.traverse((o) => {
    if (o.isMesh && !enRueda.has(o)) o.castShadow = true;
  });

  grupo.userData = {
    id: 'volqueta',
    ruedas,
    ruedasF,
    chasis,
    volante,
    anclaPiloto: ancla,
    alturaPiso: 0.62,
    radioRueda: radio,
  };
  return grupo;
}
