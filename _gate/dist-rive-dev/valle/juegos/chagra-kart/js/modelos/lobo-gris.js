// ── lobo-gris.js — crossover eléctrico compacto 2026 (Chagra Kart) ──────────
// Factory pura: crearLoboGris(THREE, opts) → THREE.Group orientado a +X con el
// piso en y=0. Convención de modelos.js: grupo → chasis → piezas; las ruedas
// son grupos nombrados hijos del chasis en (x, radio, z) y el motor les aplica
// rotation.x (giro) y rotation.y (dirección). Sin marcas ni logos: se resuelve
// por silueta — frente liso sin parrilla, faros delgados horizontales, barras
// de techo, rines de aleación, gris parejo de pintura nueva.
// Pasada 2 (arte): los materiales se separan por respuesta a la luz — la laca
// metalizada y la aleación reflejan un cielo pintado (CubeTexture procedural)
// mientras el revestimiento plástico queda mate; la llanta gana perfil real
// con flanco abombado, hombro y canal central.

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

function extruir(THREE, shape, ancho, bisel = 0.06, curva = 10) {
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

export function crearLoboGris(THREE, opts = {}) {
  const cielo = crearCielo(THREE);
  const M = (c, r = 0.85, m = 0.05, refl = 0) => {
    const mat = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    if (refl) { mat.envMap = cielo; mat.envMapIntensity = refl; }
    return mat;
  };

  const pintura = M(opts.color ?? 0xb8bcc2, 0.3, 0.55, 0.55); // laca metalizada nueva
  const vidrio = M(0x252d34, 0.08, 0.4, 0.9);                 // cristalera oscura continua
  const plastico = M(0x2c2f33, 0.92, 0.05);                   // revestimiento MATE
  const plata = M(opts.color3 ?? 0x9ba1a9, 0.26, 0.75, 0.7);
  const luzDia = M(0xf2f8ff, 0.14, 0.1, 0.4);
  const luzRoja = M(0xd8362e, 0.18, 0.1, 0.3);
  const oscuro = M(0x24262a, 0.6, 0.2);
  const goma = M(0x1a1b1e, 0.95, 0.0);
  const rinMat = M(0xd8dce1, 0.22, 0.82, 0.8);

  const grupo = new THREE.Group();
  grupo.name = 'loboGris';
  const chasis = new THREE.Group();
  chasis.name = 'chasis';
  grupo.add(chasis);

  // ── carrocería: capó corto, un solo gesto de crossover ────────────────────
  const perfil = new THREE.Shape();
  perfil.moveTo(-1.66, 0.4);
  perfil.lineTo(1.5, 0.4);
  perfil.quadraticCurveTo(1.9, 0.42, 1.96, 0.66);
  perfil.quadraticCurveTo(2.0, 0.9, 1.8, 0.97);    // frente liso, sin parrilla
  perfil.lineTo(1.02, 1.06);                        // capó CORTO
  perfil.lineTo(-1.5, 1.12);                        // línea de cintura
  perfil.quadraticCurveTo(-1.72, 1.08, -1.7, 0.82);
  perfil.quadraticCurveTo(-1.74, 0.46, -1.66, 0.4);
  const cuerpo = new THREE.Mesh(extruir(THREE, perfil, 1.72, 0.07, 12), pintura);
  chasis.add(cuerpo);

  // cristalera continua (techo panorámico, pilares negros), portón casi vertical
  const pCabina = new THREE.Shape();
  pCabina.moveTo(1.0, 1.03);
  pCabina.lineTo(0.5, 1.54);
  pCabina.quadraticCurveTo(0.08, 1.64, -0.35, 1.62);
  pCabina.quadraticCurveTo(-1.08, 1.58, -1.34, 1.16);
  pCabina.lineTo(1.0, 1.03);
  const cabina = new THREE.Mesh(extruir(THREE, pCabina, 1.56, 0.05, 10), vidrio);
  chasis.add(cabina);

  // revestimiento plástico bajo y difusores
  const zocalo = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.13, 1.88), plastico);
  zocalo.position.set(-0.05, 0.36, 0);
  chasis.add(zocalo);
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.2, 1.05), plastico);
  fascia.position.set(1.98, 0.5, 0);
  chasis.add(fascia);
  const skid = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.62), plata);
  skid.position.set(2.0, 0.38, 0);
  chasis.add(skid);
  const difusor = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 1.1), plastico);
  difusor.position.set(-1.72, 0.44, 0);
  chasis.add(difusor);
  const skidTras = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.6), plata);
  skidTras.position.set(-1.74, 0.36, 0);
  chasis.add(skidTras);

  // ── luces: barra delgada continua adelante, barra roja atrás ──────────────
  const barraLuz = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.055, 1.36), luzDia);
  barraLuz.position.set(2.02, 0.92, 0);
  chasis.add(barraLuz);
  for (const lado of [-1, 1]) {
    const punta = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.06), luzDia);
    punta.position.set(1.95, 0.92, lado * 0.76);
    punta.rotation.y = lado * 0.62;
    chasis.add(punta);
  }
  const barraTras = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 1.56), luzRoja);
  barraTras.position.set(-1.75, 1.02, 0);
  chasis.add(barraTras);

  // alerón pegado al borde del portón y aleta de antena sobre el techo
  const aleron = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.045, 1.56), pintura);
  aleron.position.set(-1.28, 1.42, 0);
  aleron.rotation.z = 0.4;
  chasis.add(aleron);
  const aleta = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.035), pintura);
  aleta.position.set(-0.85, 1.62, 0);
  aleta.rotation.z = 0.12;
  chasis.add(aleta);

  // barras de techo sobre el vano plano del techo
  for (const lado of [-1, 1]) {
    const barra = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 1.0, 4, 8), plata);
    barra.rotation.z = Math.PI / 2 - 0.03;
    barra.position.set(-0.28, 1.7, lado * 0.62);
    chasis.add(barra);
    for (const x of [-0.72, 0.18]) {
      const pie = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.05), oscuro);
      pie.position.set(x, 1.63, lado * 0.62);
      chasis.add(pie);
    }
  }

  // espejos anclados al arranque del pilar, manijas al ras, puerto de carga
  for (const lado of [-1, 1]) {
    const espejo = new THREE.Group();
    const brazo = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 0.12), oscuro);
    brazo.position.set(0, 0, lado * -0.08);
    espejo.add(brazo);
    const concha = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.15), pintura);
    espejo.add(concha);
    espejo.position.set(0.88, 1.12, lado * 0.98);
    chasis.add(espejo);
    for (const x of [0.35, -0.5]) {
      const manija = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.024, 0.012), oscuro);
      manija.position.set(x, 1.0, lado * 0.945);
      chasis.add(manija);
    }
    // pasos de rueda con moldura plástica, abrazados por el cuerpo ancho
    for (const xw of [1.0, -1.0]) {
      const paso = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.06, 8, 16, Math.PI), plastico);
      paso.position.set(xw, 0.48, lado * 0.9);
      chasis.add(paso);
    }
  }
  const puerto = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.1, 0.1), oscuro);
  puerto.position.set(-1.36, 0.96, 0.9);
  chasis.add(puerto);

  // ── ruedas de aleación (grupos nombrados, convención modelos.js) ──────────
  const radio = 0.48;
  const ancho = 0.34;
  const ruedas = [];
  const ruedasF = [];
  const posRuedas = [
    { x: 1.0, z: 0.88, f: true, nombre: 'ruedaDelanteraDer' },
    { x: 1.0, z: -0.88, f: true, nombre: 'ruedaDelanteraIzq' },
    { x: -1.0, z: 0.88, f: false, nombre: 'ruedaTraseraDer' },
    { x: -1.0, z: -0.88, f: false, nombre: 'ruedaTraseraIzq' },
  ];
  for (const p of posRuedas) {
    const r = new THREE.Group();
    r.name = p.nombre;
    const c = new THREE.Group();
    c.rotation.x = Math.PI / 2; // eje de giro → Z, como rueda() en modelos.js
    r.add(c);
    const w = ancho / 2;
    const ri = radio * 0.62;
    // perfil con talón, flanco abombado, hombro redondeado y canal central
    const mitad = [
      [ri, w * 0.7], [radio * 0.72, w * 1.0], [radio * 0.86, w * 0.94],
      [radio * 0.95, w * 0.66], [radio, w * 0.24], [radio * 0.985, w * 0.07],
    ];
    const pts = [
      ...mitad.map(([px, py]) => new THREE.Vector2(px, -py)),
      ...mitad.slice().reverse().map(([px, py]) => new THREE.Vector2(px, py)),
    ];
    c.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 24), goma));
    // aro visible + fondo oscuro para que la aleación tenga profundidad
    const aroRin = new THREE.Mesh(new THREE.CylinderGeometry(ri, ri, ancho * 0.7, 22, 1, true), rinMat);
    c.add(aroRin);
    const plato = new THREE.Mesh(new THREE.CylinderGeometry(ri * 0.86, ri * 0.86, ancho * 0.3, 18), M(0x17181b, 0.8, 0.1));
    c.add(plato);
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Group();
      s.rotation.y = (i / 5) * Math.PI * 2;
      const rayo = new THREE.Mesh(new THREE.BoxGeometry(ri * 0.96, ancho * 0.56, 0.105), rinMat);
      rayo.position.x = ri * 0.5;
      s.add(rayo);
      c.add(s);
    }
    const tapa = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, ancho * 0.62, 12), rinMat);
    c.add(tapa);
    r.position.set(p.x, radio, p.z);
    chasis.add(r);
    ruedas.push(r);
    if (p.f) ruedasF.push(r);
  }

  // ── volante y ancla del piloto (el cableado lo hace el orquestador) ───────
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
  volante.position.set(0.58, 1.12, 0);
  volante.rotation.z = Math.PI / 2;
  chasis.add(volante);

  const ancla = new THREE.Object3D();
  ancla.name = 'anclaPiloto';
  ancla.position.set(0.18, 1.0, 0);
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
    id: 'suv',
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
