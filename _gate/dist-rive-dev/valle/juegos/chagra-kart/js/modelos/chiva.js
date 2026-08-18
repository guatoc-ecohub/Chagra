// ── modelos/chiva.js — la chiva del Sumapaz (Chagra Kart) ────────────────────
// Módulo autocontenido: exporta crearChiva(THREE, opts) → THREE.Group.
// Misma convención que modelos.js:
//   · La fábrica mira +X (frente en x>0, escalera trasera en x<0).
//   · El grupo raíz contiene un hijo 'chasis' (roll/pitch los aplica el motor
//     sobre el chasis; heading/posición sobre el grupo raíz).
//   · Ruedas = THREE.Group hijos del chasis en (±x, radioRueda, ±z), con la
//     llanta adentro con eje a lo largo de Z. El motor las rota igual que a
//     las de modelos.js (rotation.x para rodar, rotation.y en las delanteras
//     para la dirección). Van NOMBRADAS: rueda_del_der, rueda_del_izq,
//     rueda_tras_der, rueda_tras_izq (der = z>0 mirando +X desde atrás).
//   · Huella ~4.2 × 2.05, radioRueda 0.44, alturaPiso 0.62 — mismos números
//     que la chiva vieja de modelos.js: el cableado es un reemplazo 1:1.
// Cableado sugerido (lo hace el orquestador, este módulo no toca el motor):
//   const grupo = crearChiva(THREE);
//   const { ruedas, ruedasF, chasis, volante, anclaPiloto } = grupo.userData;
//   piloto en anclaPiloto.pos, rotation.y = anclaPiloto.rotY, escala ~0.79.
// Toda la pintura (franjas, guardas, letrero, madera, caucho) es CanvasTexture
// procedural con semilla fija: cero assets externos, capturas reproducibles.
// Pasada 2 (arte): llantas con flanco abombado, tacos de trocha en relieve y
// rin de copa hundida con tuercas; rejilla frontal con barras y aire real;
// faros con aro y lente hundido; cromo y laca reflejan un cielo pintado
// (CubeTexture procedural) para que el metal se lea como metal sin perseguir
// fotorrealismo. Tacos, tuercas y barras van en InstancedMesh y
// contarTriangulos multiplica por instancia.

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

function texturar(THREE, canvas, aniso) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  return t;
}

// Vetas de madera y desgaste sobre lo ya pintado.
function vetear(ctx, w, h, rng, n, alfa, vertical) {
  for (let i = 0; i < n; i++) {
    const p = rng() * (vertical ? w : h);
    const grosor = 0.6 + rng() * 2.2;
    const oscuro = rng() < 0.62;
    const a = alfa * (0.35 + rng() * 0.65);
    ctx.fillStyle = oscuro ? `rgba(52,32,14,${a.toFixed(3)})` : `rgba(255,240,208,${(a * 0.8).toFixed(3)})`;
    if (vertical) ctx.fillRect(p, 0, grosor, h);
    else ctx.fillRect(0, p, w, grosor);
  }
}

function salpicar(ctx, w, h, rng, n, color, alfaMax, rMax) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `rgba(${color},${(rng() * alfaMax).toFixed(3)})`;
    const r = 0.5 + rng() * rMax;
    ctx.fillRect(rng() * w, rng() * h, r, r * (0.6 + rng()));
  }
}

// ── paleta de la chiva (viva pero terrosa, sin neones) ──────────────────────
const PALETA = {
  rojo: '#b23425',
  rojoOscuro: '#8c2a1e',
  amarillo: '#e8b52e',
  azul: '#2e6b9e',
  verde: '#47773c',
  crema: '#efe0bd',
  cremaSucio: '#e4d3ab',
  cafe: '#8a6a43',
  cafeOscuro: '#5f4527',
};

// ── texturas ────────────────────────────────────────────────────────────────
function crearTexturas(THREE, rng, aniso) {
  const T = {};

  // Franjas verticales de tablilla pintada: la firma de la chiva.
  T.franjas = texturar(THREE, lienzo(1024, 224, (ctx, w, h) => {
    const colores = [PALETA.rojo, PALETA.amarillo, PALETA.azul, PALETA.crema, PALETA.verde, PALETA.rojo, PALETA.crema, PALETA.azul, PALETA.amarillo, PALETA.verde, PALETA.rojo, PALETA.crema, PALETA.azul, PALETA.amarillo, PALETA.rojo, PALETA.verde];
    let x = 0;
    let i = 0;
    while (x < w) {
      const ancho = 56 + rng() * 22;
      ctx.fillStyle = colores[i % colores.length];
      ctx.fillRect(x, 0, ancho + 1, h);
      // canto iluminado de cada tablilla + junta oscura
      ctx.fillStyle = 'rgba(255,244,214,0.20)';
      ctx.fillRect(x + 1.5, 0, 2.5, h);
      ctx.fillStyle = 'rgba(40,24,10,0.5)';
      ctx.fillRect(x + ancho - 1.5, 0, 3, h);
      x += ancho;
      i++;
    }
    vetear(ctx, w, h, rng, 220, 0.09, true);
    // desconchados que dejan ver la madera
    for (let k = 0; k < 26; k++) {
      ctx.fillStyle = 'rgba(160,124,78,0.85)';
      const cw = 2 + rng() * 7;
      ctx.fillRect(rng() * w, rng() * h, cw, 1.5 + rng() * 4);
    }
    // guardas superior e inferior con filete
    ctx.fillStyle = PALETA.cafeOscuro;
    ctx.fillRect(0, 0, w, 13);
    ctx.fillRect(0, h - 13, w, 13);
    ctx.fillStyle = PALETA.amarillo;
    ctx.fillRect(0, 13, w, 4);
    ctx.fillRect(0, h - 17, w, 4);
    // polvo del camino abajo
    salpicar(ctx, w, h, rng, 240, '110,86,54', 0.16, 2.4);
  }), aniso);

  // Guarda de rombos para las fajas altas (sobre las ventanas).
  T.guarda = texturar(THREE, lienzo(1024, 96, (ctx, w, h) => {
    ctx.fillStyle = PALETA.crema;
    ctx.fillRect(0, 0, w, h);
    vetear(ctx, w, h, rng, 90, 0.07, true);
    const paso = 64;
    for (let x = 0; x < w; x += paso) {
      const cx = x + paso / 2;
      ctx.fillStyle = (x / paso) % 2 ? PALETA.azul : PALETA.rojo;
      ctx.beginPath();
      ctx.moveTo(cx, 16);
      ctx.lineTo(cx + 20, h / 2);
      ctx.lineTo(cx, h - 16);
      ctx.lineTo(cx - 20, h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETA.verde;
      ctx.beginPath();
      ctx.arc(x + 4, h / 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETA.amarillo;
      ctx.beginPath();
      ctx.moveTo(cx, h / 2 - 9);
      ctx.lineTo(cx + 8, h / 2);
      ctx.lineTo(cx, h / 2 + 9);
      ctx.lineTo(cx - 8, h / 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = PALETA.rojo;
    ctx.fillRect(0, 0, w, 7);
    ctx.fillRect(0, h - 7, w, 7);
    salpicar(ctx, w, h, rng, 70, '90,66,40', 0.1, 1.8);
  }), aniso);

  // Letrero de ruta sobre el parabrisas.
  T.letrero = texturar(THREE, lienzo(1024, 168, (ctx, w, h) => {
    ctx.fillStyle = PALETA.rojoOscuro;
    ctx.fillRect(0, 0, w, h);
    vetear(ctx, w, h, rng, 60, 0.08, true);
    ctx.strokeStyle = PALETA.crema;
    ctx.lineWidth = 7;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.strokeStyle = PALETA.amarillo;
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, w - 48, h - 48);
    ctx.fillStyle = PALETA.crema;
    ctx.font = 'bold 92px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S U M A P A Z', w / 2, h / 2 + 6);
    // estrellas de cuatro puntas a los lados
    for (const ex of [78, w - 78]) {
      ctx.fillStyle = PALETA.amarillo;
      ctx.beginPath();
      ctx.moveTo(ex, h / 2 - 26);
      ctx.lineTo(ex + 8, h / 2 - 8);
      ctx.lineTo(ex + 26, h / 2);
      ctx.lineTo(ex + 8, h / 2 + 8);
      ctx.lineTo(ex, h / 2 + 26);
      ctx.lineTo(ex - 8, h / 2 + 8);
      ctx.lineTo(ex - 26, h / 2);
      ctx.lineTo(ex - 8, h / 2 - 8);
      ctx.closePath();
      ctx.fill();
    }
  }), aniso);

  // Panel trasero: medallón de sol pintado a mano.
  T.trasera = texturar(THREE, lienzo(512, 256, (ctx, w, h) => {
    ctx.fillStyle = PALETA.crema;
    ctx.fillRect(0, 0, w, h);
    vetear(ctx, w, h, rng, 110, 0.08, true);
    const cx = w / 2, cy = h / 2;
    for (let r = 0; r < 16; r++) {
      const a0 = (r / 16) * Math.PI * 2;
      const a1 = a0 + Math.PI / 24;
      ctx.fillStyle = r % 2 ? PALETA.rojo : PALETA.amarillo;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a0) * 105, cy + Math.sin(a0) * 105);
      ctx.lineTo(cx + Math.cos(a1) * 105, cy + Math.sin(a1) * 105);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = PALETA.azul;
    ctx.beginPath();
    ctx.arc(cx, cy, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETA.crema;
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETA.verde;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();
    // rombos en las esquinas y marco
    for (const [ex, ey] of [[52, 52], [w - 52, 52], [52, h - 52], [w - 52, h - 52]]) {
      ctx.fillStyle = PALETA.rojo;
      ctx.beginPath();
      ctx.moveTo(ex, ey - 22);
      ctx.lineTo(ex + 16, ey);
      ctx.lineTo(ex, ey + 22);
      ctx.lineTo(ex - 16, ey);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = PALETA.verde;
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.strokeStyle = PALETA.amarillo;
    ctx.lineWidth = 3;
    ctx.strokeRect(18, 18, w - 36, h - 36);
    salpicar(ctx, w, h, rng, 200, '104,80,50', 0.18, 2.2);
  }), aniso);

  // Capó: lámina roja con filete amarillo y desgaste.
  T.capoTapa = texturar(THREE, lienzo(256, 256, (ctx, w, h) => {
    ctx.fillStyle = PALETA.rojo;
    ctx.fillRect(0, 0, w, h);
    salpicar(ctx, w, h, rng, 260, '30,16,8', 0.1, 2.0);
    salpicar(ctx, w, h, rng, 90, '255,220,170', 0.07, 1.6);
    ctx.strokeStyle = PALETA.amarillo;
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, w - 32, h - 32);
  }), aniso);

  // Costado del capó: persianas de ventilación de camión viejo.
  T.capoLado = texturar(THREE, lienzo(256, 128, (ctx, w, h) => {
    ctx.fillStyle = PALETA.rojo;
    ctx.fillRect(0, 0, w, h);
    salpicar(ctx, w, h, rng, 160, '30,16,8', 0.1, 1.8);
    for (let i = 0; i < 9; i++) {
      const x = 58 + i * 16;
      ctx.fillStyle = 'rgba(30,14,8,0.72)';
      ctx.fillRect(x, 34, 5, 62);
      ctx.fillStyle = 'rgba(255,226,180,0.32)';
      ctx.fillRect(x + 5, 34, 2, 62);
    }
    ctx.fillStyle = PALETA.amarillo;
    ctx.fillRect(0, 10, w, 4);
  }), aniso);

  // Zócalo/falda con filete y barro.
  T.zocalo = texturar(THREE, lienzo(512, 64, (ctx, w, h) => {
    ctx.fillStyle = PALETA.rojoOscuro;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = PALETA.amarillo;
    ctx.fillRect(0, 12, w, 4);
    vetear(ctx, w, h, rng, 60, 0.09, true);
    salpicar(ctx, w, h, rng, 300, '96,74,46', 0.3, 2.6);
  }), aniso);

  // Caucho de la llanta: el relieve real lo pone la geometría (lathe + tacos);
  // aquí solo va la lectura del material — banda más oscura que el flanco,
  // anillos de molde y grano fino. u = alrededor, v = a lo largo del perfil.
  T.caucho = texturar(THREE, lienzo(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#28282c';
    ctx.fillRect(0, 0, w, h);
    // banda de rodadura (v central del perfil) más oscura que el flanco
    ctx.fillStyle = '#1b1b1f';
    ctx.fillRect(0, h * 0.36, w, h * 0.28);
    // anillos de molde en los flancos
    ctx.fillStyle = 'rgba(212,210,218,0.10)';
    for (const v of [0.16, 0.24, 0.76, 0.84]) ctx.fillRect(0, h * v, w, 1.5);
    // talón en sombra (donde la llanta muere en el rin)
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.fillRect(0, 0, w, h * 0.05);
    ctx.fillRect(0, h * 0.95, w, h * 0.05);
    salpicar(ctx, w, h, rng, 210, '152,150,158', 0.05, 1.6);
    salpicar(ctx, w, h, rng, 150, '10,10,12', 0.14, 1.8);
  }), aniso);

  // Madera natural (escalera, bancas, barandal, tablero): cada tabla con su
  // tono, veta ondulada y nudos con anillos — mate, para contrastar el cromo.
  T.madera = texturar(THREE, lienzo(256, 256, (ctx, w, h) => {
    const alto = 42;
    for (let y = 0, fila = 0; y < h; y += alto, fila++) {
      const r = 158 + (fila % 2 ? -14 : 8) + Math.round(rng() * 14);
      ctx.fillStyle = `rgb(${r},${Math.round(r * 0.74)},${Math.round(r * 0.48)})`;
      ctx.fillRect(0, y, w, alto);
      for (let k = 0; k < 7; k++) {
        const vy = y + 4 + rng() * (alto - 8);
        const amp = 1 + rng() * 2.4;
        const fase = rng() * Math.PI * 2;
        ctx.strokeStyle = rng() < 0.7 ? 'rgba(74,46,20,0.5)' : 'rgba(255,232,190,0.3)';
        ctx.lineWidth = 0.8 + rng() * 1.4;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 8) {
          const yy = vy + Math.sin(x * 0.045 + fase) * amp;
          if (x === 0) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(48,28,10,0.75)';
      ctx.fillRect(0, y + alto - 2.5, w, 2.5);
      ctx.fillStyle = 'rgba(255,238,200,0.22)';
      ctx.fillRect(0, y, w, 1.5);
    }
    // nudos con anillos concéntricos
    for (let n = 0; n < 5; n++) {
      const nx = rng() * w, ny = rng() * h;
      for (let r = 5; r > 0; r--) {
        ctx.fillStyle = r % 2 ? 'rgba(88,54,24,0.55)' : 'rgba(152,110,64,0.55)';
        ctx.beginPath();
        ctx.ellipse(nx, ny, r * 2.2, r * 1.3, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    salpicar(ctx, w, h, rng, 120, '58,38,18', 0.12, 2.0);
  }), aniso);

  // Techo: tablones crema pintados con juntas transversales, veta y filetes.
  T.techo = texturar(THREE, lienzo(256, 512, (ctx, w, h) => {
    const alto = 36;
    for (let y = 0, fila = 0; y < h; y += alto, fila++) {
      const j = Math.round(rng() * 12) - (fila % 2 ? 9 : 0);
      ctx.fillStyle = `rgb(${224 + j},${208 + j},${170 + j})`;
      ctx.fillRect(0, y, w, alto);
      ctx.fillStyle = 'rgba(96,70,40,0.55)';
      ctx.fillRect(0, y + alto - 2, w, 2);
      ctx.fillStyle = 'rgba(255,250,232,0.5)';
      ctx.fillRect(0, y, w, 1.2);
    }
    vetear(ctx, w, h, rng, 170, 0.12, false);
    ctx.fillStyle = PALETA.rojo;
    ctx.fillRect(10, 0, 6, h);
    ctx.fillRect(w - 16, 0, 6, h);
    ctx.fillStyle = PALETA.verde;
    ctx.fillRect(w / 2 - 3, 0, 6, h);
    salpicar(ctx, w, h, rng, 200, '106,84,52', 0.1, 2.2);
  }), aniso);

  // Tejido de costal (gris, se tiñe por material).
  T.costal = texturar(THREE, lienzo(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#d8d2c4';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(70,56,34,0.4)';
    ctx.lineWidth = 1.6;
    for (let i = -h; i < w + h; i += 7) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i + h, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }
    for (let y = 6; y < h; y += 18) {
      ctx.strokeStyle = 'rgba(255,248,230,0.5)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(70,56,34,0.4)';
    }
  }), aniso);

  // Grano neutro para piezas pintadas lisas (se tiñe por material).
  T.grano = texturar(THREE, lienzo(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f4f2ee';
    ctx.fillRect(0, 0, w, h);
    salpicar(ctx, w, h, rng, 420, '30,22,12', 0.09, 1.8);
    salpicar(ctx, w, h, rng, 120, '255,255,244', 0.1, 1.4);
  }), aniso);

  return T;
}

// ── cielo pintado para reflejos (CubeTexture procedural, sin assets) ────────
// No persigue fotorrealismo: es una lámina de cielo, horizonte cálido y tierra
// para que cromo y laca tengan QUÉ reflejar y se lean como material distinto
// del plástico. Sin esto, metalness alto se ve gris muerto.
function crearCieloCubo(THREE) {
  const cara = (tipo) => lienzo(64, 64, (ctx, w, h) => {
    if (tipo === 1) {
      const g = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, 46);
      g.addColorStop(0, '#f6fbff');
      g.addColorStop(1, '#b6d2e4');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    } else if (tipo === -1) {
      const g = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, 46);
      g.addColorStop(0, '#4c4136');
      g.addColorStop(1, '#665649');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#a7cade');
      g.addColorStop(0.42, '#dceaf2');
      g.addColorStop(0.52, '#efe2c0');
      g.addColorStop(0.58, '#8d7a5e');
      g.addColorStop(1, '#544738');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  });
  const ct = new THREE.CubeTexture([cara(0), cara(0), cara(1), cara(-1), cara(0), cara(0)]);
  ct.colorSpace = THREE.SRGBColorSpace;
  ct.needsUpdate = true;
  return ct;
}

// ── materiales compartidos ──────────────────────────────────────────────────
function crearMateriales(THREE, T, cielo) {
  const std = (p) => new THREE.MeshStandardMaterial(p);
  return {
    franjas: std({ map: T.franjas, roughness: 0.82, metalness: 0.02 }),
    guarda: std({ map: T.guarda, roughness: 0.8, metalness: 0.02 }),
    letrero: std({ map: T.letrero, roughness: 0.75, metalness: 0.02 }),
    trasera: std({ map: T.trasera, roughness: 0.82, metalness: 0.02 }),
    capoTapa: std({ map: T.capoTapa, roughness: 0.42, metalness: 0.25, envMap: cielo, envMapIntensity: 0.5 }),
    capoLado: std({ map: T.capoLado, roughness: 0.42, metalness: 0.25, envMap: cielo, envMapIntensity: 0.5 }),
    zocalo: std({ map: T.zocalo, roughness: 0.85, metalness: 0.05 }),
    llanta: std({ map: T.caucho, roughness: 0.97, metalness: 0.0 }),
    cauchoTaco: std({ color: 0x1d1d21, roughness: 0.97, metalness: 0.0 }),
    cavidad: std({ color: 0x0d0b09, roughness: 0.96, metalness: 0.0 }),
    madera: std({ map: T.madera, roughness: 0.88, metalness: 0.0 }),
    maderaOscura: std({ map: T.madera, color: 0x8a6a48, roughness: 0.9 }),
    banca: std({ map: T.madera, color: 0xd9c8a2, roughness: 0.88 }),
    techo: std({ map: T.techo, roughness: 0.86, metalness: 0.0, side: THREE.DoubleSide }),
    costalCrudo: std({ map: T.costal, color: 0xc9b285, roughness: 0.95 }),
    costalVerde: std({ map: T.costal, color: 0x8a9464, roughness: 0.95 }),
    costalCafe: std({ map: T.costal, color: 0xa98a5c, roughness: 0.95 }),
    rojoLata: std({ map: T.grano, color: 0xb23425, roughness: 0.5, metalness: 0.18, envMap: cielo, envMapIntensity: 0.3 }),
    rojoBajo: std({ map: T.grano, color: 0x7e2a1f, roughness: 0.72, metalness: 0.12 }),
    amarilloPintado: std({ map: T.grano, color: 0xe0ac2c, roughness: 0.68, metalness: 0.04 }),
    verdePintado: std({ map: T.grano, color: 0x47773c, roughness: 0.7, metalness: 0.04 }),
    cromo: std({ color: 0xf3f6f9, roughness: 0.16, metalness: 0.92, envMap: cielo, envMapIntensity: 1.1 }),
    cromoFaceta: std({ color: 0xf3f6f9, roughness: 0.2, metalness: 0.88, envMap: cielo, envMapIntensity: 1.0, flatShading: true }),
    metalViejo: std({ map: T.grano, color: 0x74747c, roughness: 0.4, metalness: 0.7, envMap: cielo, envMapIntensity: 0.55 }),
    oscuro: std({ color: 0x211a12, roughness: 0.98, metalness: 0.0 }),
    interior: std({ color: 0x2b2115, roughness: 0.98, metalness: 0.0 }),
    vidrio: std({ color: 0xb9d4e2, roughness: 0.12, metalness: 0.25, transparent: true, opacity: 0.4, envMap: cielo, envMapIntensity: 0.8 }),
    faro: std({ color: 0xfff0c2, emissive: 0xffdf9a, emissiveIntensity: 0.6, roughness: 0.25 }),
    lucesTras: std({ color: 0xd8402f, emissive: 0xa61f12, emissiveIntensity: 0.45, roughness: 0.3 }),
    fique: std({ color: 0xcbb489, roughness: 0.95, metalness: 0.0 }),
    gallina: std({ map: T.grano, color: 0xf2eee2, roughness: 0.9 }),
    platano: std({ map: T.grano, color: 0x8aa53f, roughness: 0.85 }),
  };
}

// ── piezas ──────────────────────────────────────────────────────────────────
// Geometrías de rueda compartidas por las cuatro posiciones.
function crearGeosRueda(THREE) {
  const V2 = (x, y) => new THREE.Vector2(x, y);
  // Perfil de neumático de verdad: talón, flanco ABOMBADO con anillo de molde,
  // hombro redondeado y banda con canal central. Media sección espejada.
  const mitad = [
    [0.200, 0.106], [0.242, 0.124], [0.300, 0.133], [0.352, 0.138],
    [0.370, 0.129], [0.383, 0.135], [0.398, 0.125], [0.424, 0.103],
    [0.443, 0.076], [0.446, 0.030], [0.446, 0.013], [0.425, 0.009],
  ];
  // (recorrido de -y a +y para que las normales del lathe miren hacia afuera)
  const perfilLlanta = [
    ...mitad.map(([x, y]) => V2(x, -y)),
    ...mitad.slice().reverse().map(([x, y]) => V2(x, y)),
  ];
  // Rin de acero con copa hundida al frente, pestaña redondeada y fondo
  // cerrado hacia adentro (que no se vea a través desde abajo del chasis).
  const perfilRin = [
    [0.012, 0.030], [0.100, 0.036], [0.128, 0.050], [0.163, 0.080],
    [0.192, 0.088], [0.209, 0.077], [0.216, 0.042], [0.216, -0.058],
    [0.198, -0.102], [0.052, -0.104], [0.012, -0.098],
  ].map(([x, y]) => V2(x, y));
  return {
    llanta: new THREE.LatheGeometry(perfilLlanta, 26),
    taco: new THREE.BoxGeometry(0.032, 0.082, 0.072),
    rin: new THREE.LatheGeometry(perfilRin, 16),
    copa: new THREE.SphereGeometry(0.05, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2),
    tuerca: new THREE.CylinderGeometry(0.017, 0.02, 0.026, 6),
  };
}

// lado: +1 si la cara vista queda hacia +Z, -1 hacia -Z (la copa del rin y las
// tuercas miran hacia afuera del vehículo; la llanta es simétrica).
function crearRueda(THREE, mats, geos, nombre, lado) {
  const g = new THREE.Group();
  g.name = nombre;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const ejeZ = new THREE.Vector3(0, 0, 1);
  const ejeX = new THREE.Vector3(1, 0, 0);
  const esc = new THREE.Vector3(1, 1, 1);
  const giroCara = (lado > 0 ? 1 : -1) * (Math.PI / 2);

  const llanta = new THREE.Mesh(geos.llanta, mats.llanta);
  llanta.rotation.x = Math.PI / 2; // eje del lathe (Y) queda a lo largo de Z
  g.add(llanta);

  // tacos de trocha: dos filas trabadas alrededor de la banda, una sola
  // llamada de dibujo por rueda (InstancedMesh)
  const POR_FILA = 16;
  const tacos = new THREE.InstancedMesh(geos.taco, mats.cauchoTaco, POR_FILA * 2);
  let i = 0;
  for (const fila of [-1, 1]) {
    const desfase = fila < 0 ? 0 : Math.PI / POR_FILA;
    for (let k = 0; k < POR_FILA; k++) {
      const a = (k / POR_FILA) * Math.PI * 2 + desfase;
      q.setFromAxisAngle(ejeZ, a);
      m.compose(new THREE.Vector3(Math.cos(a) * 0.447, Math.sin(a) * 0.447, fila * 0.044), q, esc);
      tacos.setMatrixAt(i++, m);
    }
  }
  tacos.instanceMatrix.needsUpdate = true;
  g.add(tacos);

  const rin = new THREE.Mesh(geos.rin, mats.rojoLata);
  rin.rotation.x = giroCara;
  g.add(rin);

  const copa = new THREE.Mesh(geos.copa, mats.cromo);
  copa.rotation.x = giroCara;
  copa.position.z = lado * 0.032;
  g.add(copa);

  // seis tuercas hexagonales hundidas en la copa, cada una con su giro de
  // facetas (parejas se verían de fábrica, no de monte)
  const tuercas = new THREE.InstancedMesh(geos.tuerca, mats.cromoFaceta, 6);
  const qEje = new THREE.Quaternion().setFromAxisAngle(ejeX, giroCara);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.26;
    q.setFromAxisAngle(ejeZ, k * 0.35).multiply(qEje);
    m.compose(new THREE.Vector3(Math.cos(a) * 0.112, Math.sin(a) * 0.112, lado * 0.046), q, esc);
    tuercas.setMatrixAt(k, m);
  }
  tuercas.instanceMatrix.needsUpdate = true;
  g.add(tuercas);
  return g;
}

function crearFaro(THREE, mats) {
  const g = new THREE.Group();
  // balde cónico con la boca ancha al frente
  const balde = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.104, 0.15, 14), mats.cromo);
  balde.rotation.z = Math.PI / 2;
  g.add(balde);
  // aro biselado + lente hundido: el faro deja de ser cilindro con tapa plana
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.096, 0.015, 8, 18), mats.cromo);
  aro.rotation.y = Math.PI / 2;
  aro.position.x = 0.082;
  g.add(aro);
  const lente = new THREE.Mesh(new THREE.CircleGeometry(0.082, 14), mats.faro);
  lente.rotation.y = Math.PI / 2;
  lente.position.x = 0.08;
  g.add(lente);
  const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.14, 6), mats.metalViejo);
  tallo.position.set(-0.05, -0.12, 0);
  g.add(tallo);
  return g;
}

function crearVolanteChiva(THREE, mats) {
  const g = new THREE.Group();
  g.name = 'volante';
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.026, 8, 16), mats.maderaOscura);
  aro.rotation.y = Math.PI / 2;
  g.add(aro);
  const centro = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.09, 8), mats.cromo);
  centro.rotation.z = Math.PI / 2;
  g.add(centro);
  const radioGeo = new THREE.BoxGeometry(0.02, 0.32, 0.03);
  for (const ang of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
    const radio = new THREE.Mesh(radioGeo, mats.metalViejo);
    radio.rotation.x = ang;
    g.add(radio);
  }
  return g;
}

function crearGallina(THREE, mats) {
  const g = new THREE.Group();
  const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), mats.gallina);
  cuerpo.scale.set(1.3, 0.95, 0.9);
  g.add(cuerpo);
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), mats.gallina);
  cabeza.position.set(0.14, 0.11, 0);
  g.add(cabeza);
  const pico = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 5), mats.amarilloPintado);
  pico.rotation.z = -Math.PI / 2;
  pico.position.set(0.2, 0.1, 0);
  g.add(pico);
  const cresta = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 5), mats.rojoLata);
  cresta.scale.set(1.2, 1.4, 0.6);
  cresta.position.set(0.13, 0.17, 0);
  g.add(cresta);
  const cola = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 6), mats.gallina);
  cola.rotation.z = 0.7;
  cola.position.set(-0.16, 0.09, 0);
  g.add(cola);
  return g;
}

function crearRacimo(THREE, mats) {
  const g = new THREE.Group();
  const manoGeo = new THREE.CapsuleGeometry(0.032, 0.12, 3, 7);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 1.5 - Math.PI * 0.4;
    const m = new THREE.Mesh(manoGeo, mats.platano);
    m.position.set(Math.cos(a) * 0.075, i * 0.012, Math.sin(a) * 0.075);
    m.rotation.z = 0.5;
    m.rotation.y = -a;
    g.add(m);
  }
  const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.16, 6), mats.maderaOscura);
  tallo.position.y = 0.12;
  g.add(tallo);
  return g;
}

// ── conteo (para el gate de FPS) ────────────────────────────────────────────
// Cuenta lo que la GPU dibuja de verdad: los InstancedMesh multiplican los
// triángulos de su geometría por el número de instancias.
export function contarTriangulos(objeto) {
  let t = 0;
  objeto.traverse((o) => {
    if (o.isMesh && o.geometry) {
      const g = o.geometry;
      const caras = (g.index ? g.index.count : g.attributes.position.count) / 3;
      t += caras * (o.isInstancedMesh ? o.count : 1);
    }
  });
  return Math.round(t);
}

// ── la chiva ────────────────────────────────────────────────────────────────
export function crearChiva(THREE, opts = {}) {
  const rng = rngSemilla(opts.semilla ?? 20260806);
  const aniso = opts.anisotropia ?? 4;
  const T = crearTexturas(THREE, rng, aniso);
  const cielo = crearCieloCubo(THREE);
  const mats = crearMateriales(THREE, T, cielo);

  const grupo = new THREE.Group();
  grupo.name = 'chiva';
  const chasis = new THREE.Group();
  chasis.name = 'chasis';
  grupo.add(chasis);

  const RADIO = 0.44;

  // ── bastidor y falda ──
  const piso = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.2, 1.9), [
    mats.rojoBajo, mats.rojoBajo, mats.maderaOscura, mats.oscuro, mats.zocalo, mats.zocalo,
  ]);
  piso.position.set(0, 0.5, 0);
  chasis.add(piso);
  const bajos = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.22, 1.34), mats.oscuro);
  bajos.position.set(0, 0.32, 0);
  chasis.add(bajos);

  // ── caja de pasajeros: faja de franjas, ventanas abiertas, faja de guarda ──
  for (const lado of [1, -1]) {
    const faja = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.44, 0.08), [
      mats.rojoLata, mats.rojoLata, mats.maderaOscura, mats.maderaOscura, mats.franjas, mats.franjas,
    ]);
    faja.position.set(-0.78, 0.84, lado * 0.94);
    chasis.add(faja);

    const fajaCabina = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.44, 0.08), [
      mats.rojoLata, mats.rojoLata, mats.maderaOscura, mats.maderaOscura, mats.franjas, mats.franjas,
    ]);
    fajaCabina.position.set(0.85, 0.84, lado * 0.94);
    chasis.add(fajaCabina);

    const guarda = new THREE.Mesh(new THREE.BoxGeometry(3.26, 0.22, 0.08), [
      mats.rojoLata, mats.rojoLata, mats.maderaOscura, mats.maderaOscura, mats.guarda, mats.guarda,
    ]);
    guarda.position.set(-0.33, 1.61, lado * 0.94);
    chasis.add(guarda);
  }

  // parales torneados entre ventana y ventana (5 por lado)
  const perfilParal = [
    [0.052, 0.0], [0.056, 0.014], [0.034, 0.034], [0.028, 0.06],
    [0.038, 0.14], [0.041, 0.22], [0.038, 0.3], [0.028, 0.38],
    [0.034, 0.405], [0.056, 0.425], [0.052, 0.44],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const paralGeo = new THREE.LatheGeometry(perfilParal, 9);
  for (const lado of [1, -1]) {
    for (const x of [0.4, -0.19, -0.78, -1.37, -1.96]) {
      const paral = new THREE.Mesh(paralGeo, mats.amarilloPintado);
      paral.position.set(x, 1.06, lado * 0.94);
      chasis.add(paral);
    }
  }

  // pilares A (marco del parabrisas), de madera roja
  const pilarGeo = new THREE.BoxGeometry(0.08, 0.62, 0.09);
  for (const lado of [1, -1]) {
    const pilar = new THREE.Mesh(pilarGeo, mats.rojoLata);
    pilar.position.set(1.28, 1.36, lado * 0.9);
    pilar.rotation.z = -0.06;
    chasis.add(pilar);
  }

  // interior: cajón oscuro + bancas que se ven por las ventanas abiertas
  const interior = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.92, 1.56), mats.interior);
  interior.position.set(-0.36, 1.0, 0);
  chasis.add(interior);
  const bancaGeo = new THREE.BoxGeometry(0.34, 0.05, 1.5);
  const espaldarGeo = new THREE.BoxGeometry(0.05, 0.3, 1.5);
  for (const x of [-1.5, -0.9, -0.3, 0.3]) {
    const banca = new THREE.Mesh(bancaGeo, mats.banca);
    banca.position.set(x, 0.92, 0);
    chasis.add(banca);
    const espaldar = new THREE.Mesh(espaldarGeo, mats.banca);
    espaldar.position.set(x - 0.17, 1.1, 0);
    espaldar.rotation.z = 0.12;
    chasis.add(espaldar);
  }

  // ── frente de la cabina, parabrisas y letrero ──
  const cortafuego = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 1.84), mats.rojoLata);
  cortafuego.position.set(1.3, 0.86, 0);
  chasis.add(cortafuego);
  const tablero = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.5), mats.maderaOscura);
  tablero.position.set(1.14, 1.14, 0);
  chasis.add(tablero);
  const parabrisas = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 1.6), mats.vidrio);
  parabrisas.position.set(1.31, 1.32, 0);
  parabrisas.rotation.z = -0.1;
  chasis.add(parabrisas);
  const letrero = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.26, 1.9), [
    mats.letrero, mats.maderaOscura, mats.maderaOscura, mats.maderaOscura, mats.rojoLata, mats.rojoLata,
  ]);
  letrero.position.set(1.34, 1.62, 0);
  letrero.rotation.z = 0.06;
  chasis.add(letrero);

  // ── panel trasero pintado, faja alta y luces ──
  const panelTrasero = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.46, 1.9), [
    mats.rojoLata, mats.trasera, mats.maderaOscura, mats.maderaOscura, mats.rojoLata, mats.rojoLata,
  ]);
  panelTrasero.position.set(-1.98, 0.85, 0);
  chasis.add(panelTrasero);
  const guardaTras = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 1.9), [
    mats.rojoLata, mats.guarda, mats.maderaOscura, mats.maderaOscura, mats.rojoLata, mats.rojoLata,
  ]);
  guardaTras.position.set(-1.97, 1.61, 0);
  chasis.add(guardaTras);
  for (const z of [0.62, -0.62]) {
    const paralTras = new THREE.Mesh(paralGeo, mats.amarilloPintado);
    paralTras.position.set(-1.97, 1.06, z);
    chasis.add(paralTras);
  }
  const lucesTrasGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.05, 10);
  for (const lado of [1, -1]) {
    const luz = new THREE.Mesh(lucesTrasGeo, mats.lucesTras);
    luz.rotation.z = Math.PI / 2;
    luz.position.set(-2.04, 0.68, lado * 0.78);
    chasis.add(luz);
  }
  const defensaTras = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 1.6, 4, 10), mats.metalViejo);
  defensaTras.rotation.x = Math.PI / 2;
  defensaTras.position.set(-2.06, 0.42, 0);
  chasis.add(defensaTras);

  // ── techo abovedado, barandal y carga amarrada ──
  const techo = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 3.34, 12, 1, true, -0.425, 0.85), mats.techo);
  techo.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
  techo.position.set(-0.31, -0.47, 0);
  chasis.add(techo);

  const rielGeo = new THREE.CapsuleGeometry(0.028, 3.24, 4, 8);
  for (const lado of [1, -1]) {
    const riel = new THREE.Mesh(rielGeo, mats.maderaOscura);
    riel.rotation.z = Math.PI / 2;
    riel.position.set(-0.31, 2.0, lado * 0.99);
    chasis.add(riel);
  }
  const rielCortoGeo = new THREE.CapsuleGeometry(0.028, 1.94, 4, 8);
  for (const x of [1.36, -1.98]) {
    const riel = new THREE.Mesh(rielCortoGeo, mats.maderaOscura);
    riel.rotation.x = Math.PI / 2;
    riel.position.set(x, 2.0, 0);
    chasis.add(riel);
  }
  const posteGeo = new THREE.CylinderGeometry(0.022, 0.026, 0.26, 7);
  for (const lado of [1, -1]) {
    for (const x of [1.36, 0.52, -0.31, -1.14, -1.98]) {
      const poste = new THREE.Mesh(posteGeo, mats.amarilloPintado);
      poste.position.set(x, 1.87, lado * 0.99);
      chasis.add(poste);
    }
  }

  // carga: bultos, canasto, racimo y la gallina
  const bultoGeo = new THREE.CapsuleGeometry(0.24, 0.34, 4, 10);
  const bultos = [
    { m: mats.costalCrudo, p: [-1.32, 2.0, 0.3], r: 0.5, e: [1.25, 0.82, 1.0] },
    { m: mats.costalVerde, p: [-0.52, 1.99, -0.34], r: 1.9, e: [1.15, 0.78, 1.05] },
    { m: mats.costalCafe, p: [0.34, 1.99, 0.28], r: 0.9, e: [1.1, 0.8, 0.95] },
    { m: mats.costalCrudo, p: [-0.5, 1.99, 0.42], r: 2.6, e: [0.95, 0.72, 0.85] },
  ];
  for (const b of bultos) {
    const bulto = new THREE.Mesh(bultoGeo, b.m);
    bulto.rotation.z = Math.PI / 2;
    bulto.rotation.x = b.r;
    bulto.position.set(...b.p);
    bulto.scale.set(...b.e);
    chasis.add(bulto);
  }
  const perfilCanasto = [
    [0.05, 0.0], [0.14, 0.015], [0.185, 0.09], [0.205, 0.2], [0.185, 0.26], [0.2, 0.28],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const canasto = new THREE.Mesh(new THREE.LatheGeometry(perfilCanasto, 10), mats.costalCafe);
  canasto.material.side = THREE.DoubleSide;
  canasto.position.set(-1.55, 1.94, -0.5);
  chasis.add(canasto);
  const racimo = crearRacimo(THREE, mats);
  racimo.position.set(0.85, 1.96, -0.35);
  racimo.rotation.z = -0.25;
  chasis.add(racimo);
  const gallina = crearGallina(THREE, mats);
  gallina.position.set(-0.52, 2.28, -0.3);
  gallina.rotation.y = -0.6;
  gallina.scale.setScalar(0.85);
  chasis.add(gallina);

  // cinchas de fique que ciñen cada bulto (la cuerda se hunde en el costal)
  const cinchaGeo = new THREE.TorusGeometry(0.27, 0.016, 6, 16);
  for (const b of bultos) {
    const n = b.e[0] > 1.0 ? 2 : 1;
    for (let c = 0; c < n; c++) {
      const cincha = new THREE.Mesh(cinchaGeo, mats.fique);
      cincha.rotation.y = Math.PI / 2;
      const dx = n === 2 ? (c === 0 ? -0.16 : 0.16) * b.e[0] : 0;
      cincha.position.set(b.p[0] + dx, b.p[1], b.p[2]);
      cincha.scale.set(b.e[2], b.e[1] * 1.08, 1);
      chasis.add(cincha);
    }
  }

  // ── escalera trasera ──
  const escalera = new THREE.Group();
  escalera.name = 'escalera';
  const largueroGeo = new THREE.CylinderGeometry(0.028, 0.032, 1.52, 7);
  for (const lado of [1, -1]) {
    const larguero = new THREE.Mesh(largueroGeo, mats.maderaOscura);
    larguero.position.set(0, 0, lado * 0.23);
    escalera.add(larguero);
  }
  const peldanoGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.46, 6);
  for (let i = 0; i < 6; i++) {
    const peldano = new THREE.Mesh(peldanoGeo, mats.madera);
    peldano.rotation.x = Math.PI / 2;
    peldano.position.set(0, -0.62 + i * 0.25, 0);
    escalera.add(peldano);
  }
  escalera.position.set(-2.05, 1.24, 0.45);
  escalera.rotation.z = 0.08;
  chasis.add(escalera);

  // ── trompa de camión viejo ──
  // rejilla con aire de verdad: cavidad oscura retrocedida + barras cromadas
  // exentas (paralaje real entre barra y fondo, no una foto de rejilla)
  const radiador = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 1.0), [
    mats.cavidad, mats.rojoLata, mats.rojoLata, mats.rojoLata, mats.rojoLata, mats.rojoLata,
  ]);
  radiador.position.set(1.88, 0.84, 0);
  chasis.add(radiador);
  const barras = new THREE.InstancedMesh(new THREE.BoxGeometry(0.02, 0.56, 0.028), mats.cromo, 9);
  {
    const mB = new THREE.Matrix4();
    for (let k = 0; k < 9; k++) {
      mB.makeTranslation(2.022, 0.84, -0.36 + k * 0.09);
      barras.setMatrixAt(k, mB);
    }
    barras.instanceMatrix.needsUpdate = true;
  }
  chasis.add(barras);
  const marcoRejV = new THREE.BoxGeometry(0.03, 0.64, 0.05);
  const marcoRejH = new THREE.BoxGeometry(0.03, 0.05, 1.04);
  for (const lado of [1, -1]) {
    const mv = new THREE.Mesh(marcoRejV, mats.cromo);
    mv.position.set(2.03, 0.84, lado * 0.5);
    chasis.add(mv);
  }
  for (const dy of [0.31, -0.31]) {
    const mh = new THREE.Mesh(marcoRejH, mats.cromo);
    mh.position.set(2.03, 0.84 + dy, 0);
    chasis.add(mh);
  }
  const tapaRadiador = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.05, 8), mats.cromo);
  tapaRadiador.position.set(1.88, 1.17, 0);
  chasis.add(tapaRadiador);

  const capo = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.3, 1.06), [
    mats.rojoLata, mats.rojoLata, mats.capoTapa, mats.oscuro, mats.capoLado, mats.capoLado,
  ]);
  capo.position.set(1.58, 1.0, 0);
  capo.rotation.z = 0.045;
  chasis.add(capo);
  const filete = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.016, 0.035), mats.cromo);
  filete.position.set(1.58, 1.16, 0);
  filete.rotation.z = 0.045;
  chasis.add(filete);

  // guardabarros delanteros de media luna + faldón (radio holgado para que
  // los tacos de la llanta no muerdan el arco)
  const guardabarroDelGeo = new THREE.TorusGeometry(0.55, 0.1, 9, 16, Math.PI);
  const faldonGeo = new THREE.BoxGeometry(0.5, 0.34, 0.16);
  for (const lado of [1, -1]) {
    const gb = new THREE.Mesh(guardabarroDelGeo, mats.rojoBajo);
    gb.position.set(1.18, 0.48, lado * 0.93);
    chasis.add(gb);
    const faldon = new THREE.Mesh(faldonGeo, mats.rojoBajo);
    faldon.position.set(0.78, 0.55, lado * 0.93);
    faldon.rotation.z = 0.5;
    chasis.add(faldon);
    // estribo que corre del guardabarros a la caja
    const estribo = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.24), mats.maderaOscura);
    estribo.position.set(0.62, 0.42, lado * 0.98);
    chasis.add(estribo);
  }
  // guardabarros traseros
  const guardabarroTrasGeo = new THREE.TorusGeometry(0.545, 0.075, 8, 14, Math.PI);
  for (const lado of [1, -1]) {
    const gb = new THREE.Mesh(guardabarroTrasGeo, mats.rojoBajo);
    gb.position.set(-1.16, 0.46, lado * 0.97);
    chasis.add(gb);
  }

  // faros al lado del radiador
  for (const lado of [1, -1]) {
    const faro = crearFaro(THREE, mats);
    faro.position.set(1.98, 1.0, lado * 0.68);
    chasis.add(faro);
  }

  // defensa cromada con topes
  const defensa = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 1.82, 4, 10), mats.cromo);
  defensa.rotation.x = Math.PI / 2;
  defensa.position.set(2.09, 0.44, 0);
  chasis.add(defensa);
  const topeGeo = new THREE.CapsuleGeometry(0.042, 0.24, 4, 8);
  for (const lado of [1, -1]) {
    const tope = new THREE.Mesh(topeGeo, mats.cromo);
    tope.position.set(2.1, 0.5, lado * 0.38);
    chasis.add(tope);
    const soporte = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.05), mats.metalViejo);
    soporte.position.set(2.0, 0.44, lado * 0.55);
    chasis.add(soporte);
  }

  // espejos redondos anclados al pilar A
  for (const lado of [1, -1]) {
    const brazoEspejo = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.22, 6), mats.metalViejo);
    brazoEspejo.position.set(1.28, 1.55, lado * 0.99);
    brazoEspejo.rotation.x = lado * 0.55;
    chasis.add(brazoEspejo);
    const espejo = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.016, 12), mats.cromo);
    espejo.position.set(1.28, 1.65, lado * 1.05);
    espejo.rotation.z = Math.PI / 2;
    espejo.rotation.y = lado * 0.2;
    chasis.add(espejo);
  }
  const bocina = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 8), mats.cromo);
  bocina.rotation.z = -Math.PI / 2;
  bocina.position.set(1.44, 1.44, 0.58);
  chasis.add(bocina);

  // exosto viejo
  const exosto = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.7, 7), mats.oscuro);
  exosto.rotation.z = Math.PI / 2 - 0.12;
  exosto.position.set(-1.62, 0.26, -0.62);
  chasis.add(exosto);
  const boquilla = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.08, 7), mats.metalViejo);
  boquilla.rotation.z = Math.PI / 2;
  boquilla.position.set(-1.98, 0.22, -0.62);
  chasis.add(boquilla);

  // ── cabina: volante, palanca y ancla del piloto ──
  const volante = crearVolanteChiva(THREE, mats);
  volante.position.set(0.76, 1.14, 0);
  volante.rotation.z = Math.PI / 2;
  chasis.add(volante);
  const palanca = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.3, 6), mats.metalViejo);
  palanca.position.set(0.55, 1.0, 0.22);
  palanca.rotation.x = 0.25;
  chasis.add(palanca);
  const pomo = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mats.maderaOscura);
  pomo.position.set(0.55, 1.15, 0.26);
  chasis.add(pomo);

  // ── ruedas (misma convención de modelos.js, nombradas) ──
  const geosRueda = crearGeosRueda(THREE);
  const ruedas = [];
  const ruedasF = [];
  const posRuedas = [
    { x: 1.18, z: 0.93, f: true, nombre: 'rueda_del_der' },
    { x: 1.18, z: -0.93, f: true, nombre: 'rueda_del_izq' },
    { x: -1.16, z: 0.93, f: false, nombre: 'rueda_tras_der' },
    { x: -1.16, z: -0.93, f: false, nombre: 'rueda_tras_izq' },
  ];
  for (const p of posRuedas) {
    const r = crearRueda(THREE, mats, geosRueda, p.nombre, Math.sign(p.z));
    r.position.set(p.x, RADIO, p.z);
    chasis.add(r);
    ruedas.push(r);
    if (p.f) ruedasF.push(r);
  }

  // sombras: todo menos las ruedas (igual que construirModeloVehiculo)
  const enRueda = new Set();
  for (const r of ruedas) r.traverse((o) => enRueda.add(o));
  grupo.traverse((o) => {
    if (o.isMesh && !enRueda.has(o)) o.castShadow = true;
  });

  grupo.userData = {
    id: 'chiva',
    ruedas,
    ruedasF,
    chasis,
    volante,
    alturaPiso: 0.62,
    radioRueda: RADIO,
    anclaPiloto: { pos: new THREE.Vector3(0.24, 0.98, 0), rotY: Math.PI / 2, escala: 0.79 },
  };
  return grupo;
}
