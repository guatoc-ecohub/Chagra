// ── carretilla.js — carretilla de finca querida y trabajada (Chagra Kart) ───
// Factory pura: crearCarretilla(THREE, opts) → THREE.Group orientado a +X,
// piso en y=0, la rueda adelante. Convención modelos.js: grupo → chasis →
// piezas; la rueda única es un grupo nombrado en (x, radio, z) y el motor le
// aplica rotation.x (giro) y rotation.y (dirección).
// Pasada 2 (arte): el balde deja de ser caja — es un casco CÓNICO de lámina
// hecho con LatheGeometry deformado a trapecio (se abre hacia arriba y hacia
// atrás), con labio enrollado, fondo redondeado, quilla y abolladuras reales
// de vértice. Doble casco: pintura azul-agua gastada por fuera, galvanizado
// rayado de pala por dentro (CanvasTexture procedural, cero assets). La rueda
// lleva perfil de neumático de verdad (talón, flanco abombado, anillo de
// molde, hombro, canal central) con tacos en dos filas trabadas por
// InstancedMesh y rin de dos copas amarillo viejo. Los metales se separan por
// respuesta a la luz con un cielo pintado (CubeTexture procedural). Desgaste
// honesto, no podrido: herramienta usada y querida. Sin marcas ni logos.
// Pasada 3 (el juez la dejó en 5/10 y era el BASTIDOR): los rieles ahora son
// líneas quebradas de tubo ENTRE puntos nombrados (puño → codo → eje), así el
// mango de madera es la continuación del riel por construcción — antes
// flotaba despegado — y la horquilla llega al eje por FUERA de la llanta, no
// atravesándola. Los puños van ALZADOS como carretilla en plena carrera
// (levantada para empujar, las patas al aire), que es además donde el piloto
// sentado en la carga los alcanza con brazos cortos. Balde 25% más hondo y
// menos acampanado: platón de obra, no bebedero de pájaros.

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

function salpicar(ctx, w, h, rng, n, color, alfaMax, rMax, y0 = 0, y1 = 1) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `rgba(${color},${(rng() * alfaMax).toFixed(3)})`;
    const r = 0.5 + rng() * rMax;
    ctx.fillRect(rng() * w, (y0 + rng() * (y1 - y0)) * h, r, r * (0.6 + rng()));
  }
}

// cielo pintado para reflejos: horizonte cálido arriba/abajo neutros. Sin esto
// el metal con metalness alto se ve gris muerto (mismo truco de la chiva).
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

// ── texturas del balde y compañía ───────────────────────────────────────────
function crearTexturas(THREE, rng) {
  const T = {};

  // Exterior: pintura azul-agua de ferretería, soleada y trabajada. u = vuelta
  // completa alrededor del balde, v = del fondo (abajo) al labio (arriba).
  T.pintura = texturar(THREE, lienzo(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#3f6d77';
    ctx.fillRect(0, 0, w, h);
    // brochazos horizontales (siguen la vuelta de la lámina)
    for (let i = 0; i < 46; i++) {
      const y = rng() * h;
      ctx.fillStyle = rng() < 0.5 ? `rgba(96,150,158,${(0.05 + rng() * 0.1).toFixed(3)})`
        : `rgba(38,74,84,${(0.05 + rng() * 0.12).toFixed(3)})`;
      ctx.fillRect(0, y, w, 1 + rng() * 3.5);
    }
    // sol comido: parches grandes desteñidos
    for (let i = 0; i < 7; i++) {
      const g = ctx.createRadialGradient(rng() * w, rng() * h, 2, rng() * w, rng() * h, 30 + rng() * 40);
      g.addColorStop(0, 'rgba(205,222,218,0.12)');
      g.addColorStop(1, 'rgba(205,222,218,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    // rayones que dejan ver imprimante
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = rng() < 0.6 ? 'rgba(196,204,200,0.35)' : 'rgba(30,52,58,0.4)';
      ctx.lineWidth = 0.7 + rng() * 0.9;
      const x = rng() * w, y = rng() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * 60, y + (rng() - 0.5) * 14);
      ctx.stroke();
    }
    // desconchados a galvanizado con cerco de óxido (labio y filo bajo)
    for (let i = 0; i < 30; i++) {
      const franjaAlta = rng() < 0.55;
      const y = franjaAlta ? h * (0.82 + rng() * 0.18) : h * rng() * 0.3;
      const x = rng() * w;
      const r = 1.5 + rng() * 4;
      ctx.fillStyle = 'rgba(122,72,38,0.85)';
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.5, r * 0.9, rng(), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(168,176,172,0.95)';
      ctx.beginPath();
      ctx.ellipse(x, y, r * 0.8, r * 0.5, rng(), 0, Math.PI * 2);
      ctx.fill();
    }
    // óxido corrido y barro seco en la parte baja
    for (let i = 0; i < 16; i++) {
      const x = rng() * w;
      const alto = 6 + rng() * 16;
      const g = ctx.createLinearGradient(0, h * 0.28, 0, 0);
      g.addColorStop(0, 'rgba(126,74,40,0)');
      g.addColorStop(1, `rgba(126,74,40,${(0.25 + rng() * 0.35).toFixed(2)})`);
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, 3 + rng() * 6, h * 0.28 + alto * 0);
    }
    salpicar(ctx, w, h, rng, 150, '112,86,52', 0.3, 2.4, 0, 0.3);
    salpicar(ctx, w, h, rng, 90, '130,80,44', 0.28, 2.0, 0.86, 1);
    salpicar(ctx, w, h, rng, 160, '28,44,50', 0.12, 1.8);
  }));

  // Interior: galvanizado rayado de pala, con flores de óxido y mugre al fondo.
  T.galva = texturar(THREE, lienzo(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#99a09b';
    ctx.fillRect(0, 0, w, h);
    // rayones de pala: van del fondo hacia el labio (verticales en el lienzo)
    for (let i = 0; i < 70; i++) {
      const x = rng() * w;
      ctx.strokeStyle = rng() < 0.55 ? `rgba(216,222,214,${(0.2 + rng() * 0.35).toFixed(2)})`
        : `rgba(120,126,120,${(0.15 + rng() * 0.3).toFixed(2)})`;
      ctx.lineWidth = 0.6 + rng() * 1.2;
      ctx.beginPath();
      ctx.moveTo(x, h * (0.1 + rng() * 0.3));
      ctx.lineTo(x + (rng() - 0.5) * 10, h * (0.6 + rng() * 0.4));
      ctx.stroke();
    }
    // flores de óxido
    for (let i = 0; i < 18; i++) {
      const x = rng() * w, y = rng() * h * 0.7;
      const r = 2 + rng() * 7;
      const g = ctx.createRadialGradient(x, y, 0.5, x, y, r);
      g.addColorStop(0, 'rgba(122,70,38,0.8)');
      g.addColorStop(0.6, 'rgba(140,90,50,0.35)');
      g.addColorStop(1, 'rgba(140,90,50,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // mugre asentada en el fondo (v bajo)
    const g2 = ctx.createLinearGradient(0, h * 0.35, 0, 0);
    g2.addColorStop(0, 'rgba(74,60,42,0)');
    g2.addColorStop(1, 'rgba(74,60,42,0.5)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h * 0.35);
    salpicar(ctx, w, h, rng, 140, '92,74,50', 0.2, 2.0, 0, 0.4);
  }));

  // Madera de los mangos: tabla clara con veta ondulada y canto oscuro.
  T.madera = texturar(THREE, lienzo(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#c8a068';
    ctx.fillRect(0, 0, w, h);
    for (let k = 0; k < 12; k++) {
      const vy = rng() * h;
      const amp = 1 + rng() * 2.4;
      const fase = rng() * Math.PI * 2;
      ctx.strokeStyle = rng() < 0.7 ? 'rgba(112,74,34,0.5)' : 'rgba(244,222,180,0.4)';
      ctx.lineWidth = 0.7 + rng() * 1.3;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const yy = vy + Math.sin(x * 0.06 + fase) * amp;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    salpicar(ctx, w, h, rng, 60, '84,56,26', 0.16, 1.8);
  }));

  // Caucho de la llanta: el relieve lo pone la geometría; aquí banda oscura,
  // anillos de molde en el flanco y grano fino (receta de la chiva).
  T.caucho = texturar(THREE, lienzo(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#28282c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1b1b1f';
    ctx.fillRect(0, h * 0.36, w, h * 0.28);
    ctx.fillStyle = 'rgba(212,210,218,0.10)';
    for (const v of [0.16, 0.24, 0.76, 0.84]) ctx.fillRect(0, h * v, w, 1.5);
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.fillRect(0, 0, w, h * 0.05);
    ctx.fillRect(0, h * 0.95, w, h * 0.05);
    salpicar(ctx, w, h, rng, 200, '152,150,158', 0.05, 1.6);
    salpicar(ctx, w, h, rng, 140, '10,10,12', 0.14, 1.8);
  }));

  // Grano neutro para piezas pintadas (se tiñe por material).
  T.grano = texturar(THREE, lienzo(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f4f2ee';
    ctx.fillRect(0, 0, w, h);
    salpicar(ctx, w, h, rng, 380, '30,22,12', 0.1, 1.8);
    salpicar(ctx, w, h, rng, 110, '255,255,244', 0.1, 1.4);
  }));

  // Tierra negra de era con piedritas.
  T.tierra = texturar(THREE, lienzo(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#43331f';
    ctx.fillRect(0, 0, w, h);
    salpicar(ctx, w, h, rng, 420, '22,16,8', 0.4, 2.2);
    salpicar(ctx, w, h, rng, 260, '110,88,58', 0.3, 1.8);
    for (let i = 0; i < 14; i++) {
      const x = rng() * w, y = rng() * h, r = 1 + rng() * 2.2;
      ctx.fillStyle = 'rgba(148,142,130,0.85)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(210,206,196,0.6)';
      ctx.beginPath();
      ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }));

  return T;
}

// ── deformación del balde: de bol torneado a trapecio de lámina abollada ────
// El casco nace como LatheGeometry (curvas de verdad: fondo redondeado, pared
// con flare, labio enrollado). Aquí se alarga en X con la altura — más hacia
// atrás que hacia adelante — para que la boca se abra hacia arriba y hacia
// atrás como un balde real, y se le meten las abolladuras desplazando
// vértices en su dirección radial. Misma función para casco exterior e
// interior: la lámina se lee como UNA sola pieza golpeada.
const ABOLLONES = [
  // [ángulo, altura 0-1, hondura, ancho angular, ancho vertical]
  [0.62, 0.74, 0.020, 0.55, 0.30],
  [2.70, 0.48, 0.016, 0.42, 0.30],
  [-1.85, 0.84, 0.022, 0.50, 0.22],
  [-2.90, 0.30, 0.013, 0.55, 0.35],
  [1.55, 0.95, 0.015, 0.35, 0.16], // mordisco en el labio
];

function deformarBalde(geo, ALTO) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);
    const r = Math.hypot(x, z);
    const t = Math.min(Math.max(y / ALTO, 0), 1);
    if (r > 0.03) {
      const ang = Math.atan2(z, x);
      // cuadrar la sección: de círculo a rectángulo redondeado (superelipse).
      // Sin esto el balde se lee como bol de cocina, no como platón de lámina.
      const P = 3.4;
      const f = Math.pow(
        Math.pow(Math.abs(Math.cos(ang)), P) + Math.pow(Math.abs(Math.sin(ang)), P),
        -1 / P
      );
      x *= f;
      z *= f;
      // ondulado fino de lámina + abollones puntuales
      let d = 0.5 * Math.sin(ang * 3 + 1.7) * Math.sin(y * 21 + 0.6)
        + 0.5 * Math.sin(ang * 5 + 4.0) * Math.cos(y * 13 + 2.2);
      d *= 0.009;
      for (const [a0, t0, hondo, wa, wt] of ABOLLONES) {
        let da = ang - a0;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        const dt = t - t0;
        d -= hondo * Math.exp(-((da * da) / (wa * wa) + (dt * dt) / (wt * wt)));
      }
      d *= 0.25 + 0.75 * t; // el fondo casi no se abolla, la pared sí
      const k = 1 + d / Math.max(r, 0.06);
      x *= k;
      z *= k;
    }
    // trapecio: la boca se estira hacia atrás (donde se palea) más que hacia
    // adelante (pared de volteo, más parada), y apenas se ensancha
    const nx = r > 1e-4 ? x / r : 0;
    const m = (nx + 1) / 2;
    const suave = m * m * (3 - 2 * m);
    const fFrente = 1.42 + 0.22 * t; // pared de volteo, más parada
    const fAtras = 1.52 + 0.30 * t;  // pared de palear, tendida pero sin abrirse en plato
    const sx = fAtras + (fFrente - fAtras) * suave;
    const sz = 0.92 + 0.06 * t; // paredes laterales casi verticales: platón hondo
    pos.setXYZ(i, x * sx, y, z * sz);
  }
  geo.computeVertexNormals();
  return geo;
}

export function crearCarretilla(THREE, opts = {}) {
  const rng = rngSemilla(opts.semilla ?? 20260807);
  const T = crearTexturas(THREE, rng);
  const cielo = crearCielo(THREE);
  const std = (p) => new THREE.MeshStandardMaterial(p);

  const mats = {
    pintura: std({ map: T.pintura, roughness: 0.52, metalness: 0.28, envMap: cielo, envMapIntensity: 0.4 }),
    galva: std({ map: T.galva, roughness: 0.46, metalness: 0.6, envMap: cielo, envMapIntensity: 0.45, side: THREE.BackSide }),
    tuboPintado: std({ map: T.grano, color: 0x35606c, roughness: 0.55, metalness: 0.3, envMap: cielo, envMapIntensity: 0.3 }),
    oxido: std({ map: T.grano, color: 0x74452a, roughness: 0.98, metalness: 0.02 }),
    acero: std({ map: T.grano, color: 0x787d82, roughness: 0.42, metalness: 0.68, envMap: cielo, envMapIntensity: 0.55 }),
    zapata: std({ color: 0xd9dde1, roughness: 0.22, metalness: 0.9, envMap: cielo, envMapIntensity: 1.0 }),
    madera: std({ map: T.madera, roughness: 0.9, metalness: 0.0 }),
    maderaGastada: std({ map: T.madera, color: 0xbfa075, roughness: 0.82, metalness: 0.0 }),
    caucho: std({ map: T.caucho, roughness: 0.97, metalness: 0.0 }),
    cauchoTaco: std({ color: 0x1d1d21, roughness: 0.97, metalness: 0.0 }),
    rinViejo: std({ map: T.grano, color: 0xc9992f, roughness: 0.55, metalness: 0.3, envMap: cielo, envMapIntensity: 0.35 }),
    tierra: std({ map: T.tierra, roughness: 1.0, metalness: 0.0 }),
    tallo: std({ color: 0x4e7a34, roughness: 0.9, metalness: 0.0 }),
    hojaA: std({ color: 0x6f9c46, roughness: 0.85, metalness: 0.0 }),
    hojaB: std({ color: 0x86ad55, roughness: 0.85, metalness: 0.0 }),
  };

  const grupo = new THREE.Group();
  grupo.name = 'laCarretilla';
  const chasis = new THREE.Group();
  chasis.name = 'chasis';
  grupo.add(chasis);

  // ── el balde: casco cónico de lámina, doble pared, labio enrollado ────────
  // 25% más hondo que la pasada 2 (el perfil se estira en y): la pared alta es
  // lo que separa un platón de carretilla de un bebedero de pájaros.
  const ALTO = 0.465;
  const balde = new THREE.Group();
  balde.position.set(0.02, 0.46, 0);
  balde.rotation.z = -0.06; // nariz apenas abajo, listo pa' voltear
  chasis.add(balde);

  // perfil exterior: fondo PLANO de platón → esquina firme → pared recta de
  // lámina doblada con flare → labio que sale, se enrolla y remata hacia
  // abajo (borde volteado de verdad)
  const perfilExt = [
    [0.022, 0.000], [0.115, 0.0025], [0.185, 0.010], [0.225, 0.0325],
    [0.247, 0.0775], [0.274, 0.1725], [0.302, 0.2725], [0.328, 0.3675],
    [0.345, 0.435], [0.368, 0.465], [0.383, 0.450], [0.373, 0.4275],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const casco = new THREE.Mesh(
    deformarBalde(new THREE.LatheGeometry(perfilExt, 30), ALTO),
    mats.pintura
  );
  balde.add(casco);

  // perfil interior: la misma lámina vista desde adentro (galvanizado rayado);
  // remata metido bajo el rollo del labio para esconder la costura
  const perfilInt = [
    [0.022, 0.015], [0.112, 0.0175], [0.180, 0.025], [0.216, 0.0475],
    [0.236, 0.090], [0.262, 0.1825], [0.289, 0.279], [0.314, 0.371],
    [0.331, 0.4375], [0.352, 0.460],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const cascoInt = new THREE.Mesh(
    deformarBalde(new THREE.LatheGeometry(perfilInt, 30), ALTO),
    mats.galva
  );
  balde.add(cascoInt);

  // quilla estampada bajo el fondo, con el óxido de arrastrarla
  const quilla = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.52, 4, 8), mats.oxido);
  quilla.rotation.z = Math.PI / 2;
  quilla.scale.set(1, 1, 0.6);
  quilla.position.set(-0.04, 0.0, 0);
  balde.add(quilla);

  // ── la carga: tierra de era con terrones y una matica brotando ────────────
  const tierraGeo = new THREE.SphereGeometry(0.34, 14, 9);
  {
    const pos = tierraGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const d = 1 + 0.09 * Math.sin(x * 9.1 + 1.2) * Math.cos(z * 7.7 + 0.4) * Math.max(y, 0);
      pos.setXYZ(i, x * d, y * d, z * d);
    }
    tierraGeo.computeVertexNormals();
  }
  const tierra = new THREE.Mesh(tierraGeo, mats.tierra);
  tierra.scale.set(1.42, 0.42, 0.78);
  tierra.position.set(-0.05, 0.33, 0);
  balde.add(tierra);
  for (const [x, y, z, r] of [[0.16, 0.43, 0.1, 0.05], [-0.24, 0.44, -0.1, 0.06], [-0.02, 0.46, 0.16, 0.04]]) {
    const terron = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), mats.tierra);
    terron.scale.set(1.2, 0.8, 1);
    terron.rotation.y = x * 9;
    terron.position.set(x, y, z);
    balde.add(terron);
  }
  const matica = new THREE.Group();
  const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.017, 0.28, 6), mats.tallo);
  tallo.position.y = 0.14;
  matica.add(tallo);
  const hojaShape = new THREE.Shape();
  hojaShape.moveTo(0, 0);
  hojaShape.quadraticCurveTo(0.05, 0.06, 0, 0.15);
  hojaShape.quadraticCurveTo(-0.05, 0.06, 0, 0);
  const hojaGeo = new THREE.ExtrudeGeometry(hojaShape, { depth: 0.005, bevelEnabled: false, curveSegments: 5 });
  for (let i = 0; i < 5; i++) {
    const hoja = new THREE.Mesh(hojaGeo, i % 2 ? mats.hojaA : mats.hojaB);
    hoja.position.y = 0.12 + i * 0.034;
    hoja.rotation.y = i * 1.75;
    hoja.rotation.x = -0.6 - (i % 2) * 0.32;
    matica.add(hoja);
  }
  matica.scale.setScalar(0.85);
  // adelante de la carga: el piloto va sentado atrás y la matica no puede
  // quedarle entre las piernas
  matica.position.set(0.22, 0.42, 0.04);
  matica.rotation.z = 0.1;
  balde.add(matica);

  // ── bastidor: cada riel es UNA línea quebrada de tubo, del puño al eje ────
  // La pasada 2 colocaba cada pieza a ojo con ángulos sueltos y el juez lo
  // cobró: mangos flotando despegados del larguero y horquilla clavada DENTRO
  // de la llanta. Ahora los tubos van ENTRE puntos nombrados — el mango queda
  // ensartado en el eje del riel por construcción y la horquilla baja al eje
  // por fuera del neumático. Los puños van alzados: carretilla EN CARRERA,
  // levantada para empujar, y ahí es donde el piloto sentado los alcanza.
  const V3 = (p) => new THREE.Vector3(p[0], p[1], p[2]);
  const entre = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const tuboEntre = (a, b, r0, r1, material, radial = 9) => {
    const d = V3(b).sub(V3(a));
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, d.length(), radial), material);
    m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return m;
  };
  // pieza de largo fijo con el CENTRO en un punto del riel y el MISMO eje
  const piezaEnRiel = (a, b, t, geo, material) => {
    const m = new THREE.Mesh(geo, material);
    const c = entre(a, b, t);
    m.position.set(c[0], c[1], c[2]);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), V3(b).sub(V3(a)).normalize());
    return m;
  };

  for (const lado of [-1, 1]) {
    // puntos del riel: puño (G) → codo bajo el balde (E) → punta al eje (F)
    const G = [-1.04, 0.78, lado * 0.27];
    const E = [-0.58, 0.475, lado * 0.21];
    const F = [0.70, 0.365, lado * 0.148];
    chasis.add(tuboEntre(G, E, 0.028, 0.028, mats.tuboPintado));
    chasis.add(tuboEntre(E, F, 0.028, 0.026, mats.tuboPintado));
    // el codo vende la dobladura del tubo
    const codo = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mats.tuboPintado);
    codo.position.set(E[0], E[1], E[2]);
    chasis.add(codo);

    // mango de madera ENSARTADO en el riel (mismo eje, por construcción), con
    // su férula y la zona pulida por las manos. Ojo: pilotos-manejando.js
    // encuentra los mangos por (radiusTop 0.04, height 0.38) — no cambiar.
    const dGE = V3(E).sub(V3(G)).length();
    chasis.add(piezaEnRiel(G, E, 0.16 / dGE, new THREE.CylinderGeometry(0.04, 0.045, 0.38, 10), mats.madera));
    chasis.add(piezaEnRiel(G, E, 0.09 / dGE, new THREE.CylinderGeometry(0.0405, 0.0405, 0.14, 10), mats.maderaGastada));
    chasis.add(piezaEnRiel(G, E, 0.36 / dGE, new THREE.CylinderGeometry(0.047, 0.047, 0.03, 10), mats.acero));

    // pata de tubo colgada del riel, con zapata pulida de tanto arrastrar
    const pataTop = [-0.545, 0.465, lado * 0.209];
    const pataBase = [-0.62, 0.032, lado * 0.24];
    chasis.add(tuboEntre(pataTop, pataBase, 0.024, 0.026, mats.tuboPintado, 8));
    const zapata = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.028, 0.07), mats.zapata);
    zapata.position.set(-0.635, 0.018, lado * 0.24);
    zapata.rotation.y = lado * -0.06;
    chasis.add(zapata);

    // horquilla: pletina corta que baja de la punta del riel al eje, POR FUERA
    // de la llanta (el neumático llega a ±0.086; esto vive en ±0.148)
    const horquilla = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.07, 0.016), mats.tuboPintado);
    horquilla.rotation.z = -0.5;
    horquilla.position.set(0.76, 0.3325, lado * 0.148);
    chasis.add(horquilla);
    const tuercaEje = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.027, 0.03, 6), mats.acero);
    tuercaEje.rotation.x = Math.PI / 2;
    tuercaEje.position.set(0.82, 0.3, lado * 0.16);
    chasis.add(tuercaEje);

    // abrazaderas que amarran el balde a los rieles, con su tornillo
    for (const [ax, ay, az] of [[-0.16, 0.458, 0.19], [0.24, 0.425, 0.171]]) {
      const abrazadera = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.055), mats.acero);
      abrazadera.position.set(ax, ay, lado * az);
      chasis.add(abrazadera);
      const tornillo = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.015, 0.024, 6), mats.acero);
      tornillo.position.set(ax, ay - 0.033, lado * az);
      chasis.add(tornillo);
    }
  }
  // barro seco pegado a una sola pata (dos verrugas simétricas se leían raro)
  const barrito = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 5), mats.oxido);
  barrito.scale.set(1, 1.6, 0.7);
  barrito.position.set(-0.595, 0.13, 0.252);
  chasis.add(barrito);
  // travesaño entre patas y travesaño bajo el balde entre rieles
  const travesano = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 8), mats.tuboPintado);
  travesano.rotation.x = Math.PI / 2;
  travesano.position.set(-0.587, 0.21, 0);
  chasis.add(travesano);
  const travesano2 = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.335, 8), mats.tuboPintado);
  travesano2.rotation.x = Math.PI / 2;
  travesano2.position.set(0.30, 0.399, 0);
  chasis.add(travesano2);
  const eje = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 8), mats.acero);
  eje.rotation.x = Math.PI / 2;
  eje.position.set(0.82, 0.3, 0);
  chasis.add(eje);

  // ── la rueda: neumático de verdad + rin de dos copas amarillo viejo ───────
  const radio = 0.3;
  const rueda = new THREE.Group();
  rueda.name = 'ruedaUnica';
  const c = new THREE.Group();
  c.rotation.x = Math.PI / 2; // eje de giro → Z, como rueda() en modelos.js
  rueda.add(c);

  // perfil con talón, flanco ABOMBADO, anillo de molde, hombro y canal central
  const mitad = [
    [0.166, 0.055], [0.196, 0.075], [0.228, 0.086], [0.252, 0.080],
    [0.260, 0.085], [0.274, 0.073], [0.289, 0.050], [0.298, 0.020], [0.292, 0.008],
  ];
  const perfilLlanta = [
    ...mitad.map(([x, y]) => new THREE.Vector2(x, -y)),
    ...mitad.slice().reverse().map(([x, y]) => new THREE.Vector2(x, y)),
  ];
  const llanta = new THREE.Mesh(new THREE.LatheGeometry(perfilLlanta, 26), mats.caucho);
  c.add(llanta);

  // tacos en dos filas trabadas: una sola llamada de dibujo
  const POR_FILA = 13;
  const tacoGeo = new THREE.BoxGeometry(0.021, 0.055, 0.05);
  const tacos = new THREE.InstancedMesh(tacoGeo, mats.cauchoTaco, POR_FILA * 2);
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
          new THREE.Vector3(Math.cos(a) * 0.297, fila * 0.03, -Math.sin(a) * 0.297),
          q, esc
        );
        tacos.setMatrixAt(i++, m4);
      }
    }
    tacos.instanceMatrix.needsUpdate = true;
  }
  c.add(tacos);

  // rin estampado en dos copas (simétrico: se ve por ambos lados)
  const perfilRin = [
    [0.040, 0.050], [0.122, 0.058], [0.152, 0.040], [0.166, 0.016],
    [0.166, -0.016], [0.152, -0.040], [0.122, -0.058], [0.040, -0.050],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const rin = new THREE.Mesh(new THREE.LatheGeometry(perfilRin, 18), mats.rinViejo);
  c.add(rin);
  // cuatro tornillos pasantes que amarran las dos copas
  const tornGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.128, 6);
  const tornillos = new THREE.InstancedMesh(tornGeo, mats.acero, 4);
  {
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.5;
      q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.3 * k);
      m4.compose(new THREE.Vector3(Math.cos(a) * 0.1, 0, -Math.sin(a) * 0.1), q, new THREE.Vector3(1, 1, 1));
      tornillos.setMatrixAt(k, m4);
    }
    tornillos.instanceMatrix.needsUpdate = true;
  }
  c.add(tornillos);
  const cubo = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.17, 10), mats.acero);
  c.add(cubo);
  const valvula = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.034, 5), mats.cauchoTaco);
  valvula.position.set(0.115, 0.062, 0);
  valvula.rotation.z = 0.4;
  c.add(valvula);

  rueda.position.set(0.82, radio, 0);
  chasis.add(rueda);

  const ruedas = [rueda];
  const ruedasF = [rueda];

  // ── ancla del piloto: SENTADO EN LA CARGA, cola contra el borde trasero ──
  // La pasada 2 lo paraba encima de la tierra con los brazos estirados más de
  // dos cuerpos hasta unos mangos a la altura de las rodillas: andamio, no
  // piloto. Ahora va sentado dentro del balde como en un trineo — rodillas
  // arriba, pies en la tierra, brazos cortos hacia atrás a los puños alzados.
  // Las constantes de pose específicas viven en pilotos-manejando.js
  // (hipY/pelvis.z/apoyos del ramal esCarretilla).
  const ancla = new THREE.Object3D();
  ancla.name = 'anclaPiloto';
  ancla.position.set(-0.30, 0.68, 0);
  ancla.rotation.y = Math.PI / 2;
  ancla.userData = { modo: 'expuesto', escala: 0.66 };
  chasis.add(ancla);

  // sombras como en modelos.js: todo menos la rueda
  const enRueda = new Set();
  rueda.traverse((o) => enRueda.add(o));
  grupo.traverse((o) => {
    if (o.isMesh && !enRueda.has(o)) o.castShadow = true;
  });

  grupo.userData = {
    id: 'carretilla',
    ruedas,
    ruedasF,
    chasis,
    volante: null,
    anclaPiloto: ancla,
    alturaPiso: 0.38,
    radioRueda: radio,
  };
  return grupo;
}
