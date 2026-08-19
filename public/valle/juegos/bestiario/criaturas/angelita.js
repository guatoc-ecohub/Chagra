// ── criaturas/angelita.js — ABEJA ANGELITA · Tetragonisca angustula ─────────
//
// Mide 4–5 mm. En el atlas se muestra agrandada; el modelo se construye en
// MILÍMETROS (1 unidad = 1 mm) y declara su escala real, así la regla del piso
// dice la verdad aunque la criatura se vea del tamaño de un gato.
//
// Lo que hace a esta abeja ESTA abeja, y está modelado:
//   · SIN AGUIJÓN (Meliponini) — el extremo del abdomen termina en punta lisa,
//     sin el estilete de una Apis. El punto caliente señala justo esa ausencia.
//   · CORBÍCULA: la tibia trasera es una PLACA plana y ancha con cerco de pelos,
//     con la bola de polen pegada encima.
//   · alas con VENACIÓN REDUCIDA — las nervaduras solo llegan al tercio basal;
//     de ahí para afuera la membrana va casi limpia. Es diagnóstico de melipona
//     y por eso el ala se dibuja en un canvas procedural, no con un plano liso.
//   · ANTENAS ACODADAS (con codo entre escapo y flagelo).
//   · y el TUBO DE CERUMEN de la entrada del nido, que en el campo es lo que
//     uno ve primero: el nido está escondido, la puerta no.
//
// Mira a +X. y=0 es la superficie del nido.

import * as THREE from 'three';
import {
  rng, poner, hueso, pintarPlano, pintarPorVertice, pintarMancha, fusionar, hornearPelaje,
  cuerpoOrganico, tuboCurva, mechon, materialPelaje, crearAnclas, ruidoFbm, clamp01, suavePaso,
} from '../anatomia.js';
import { crearSer } from '../../../lib3d/creatures/generarSer.js';

const QUITINA  = '#2c2016';   // cabeza y tórax
const PALIDO   = '#dcb75f';   // marcas amarillas de cara y costados del tórax
const AMBAR    = '#d9a445';   // el abdomen
const BANDA    = '#7a4d20';   // borde posterior de cada terguito
const OJO      = '#221810';
const PELUSA   = '#cdb287';
const CERA     = '#efd396';   // cerumen: cera propia + resina, tono miel pálido
const POLEN    = '#e3a527';

/* Perfil del abdomen: punta atrás, panza adelante. Sin esto una abeja queda
   con abdomen de cápsula y se lee como mosca. */
const A_LARGO = 2.36;
const perfilAbd = (t) => 0.02 + 0.56 * suavePaso(0, 0.30, t) * (1 - 0.34 * suavePaso(0.70, 1.0, t));

/* ── EL ALA: canvas procedural. La venación reducida es el dato. ─────────── */
function texturaAla({ ancho = 320, alto = 112, basal = 0.40 } = {}) {
  const cv = document.createElement('canvas');
  cv.width = ancho; cv.height = alto;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, ancho, alto);
  const my = alto / 2;

  // silueta lanceolada: base angosta a la izquierda, punta redonda a la derecha
  g.beginPath();
  g.moveTo(ancho * 0.02, my - alto * 0.10);
  g.bezierCurveTo(ancho * 0.30, my - alto * 0.44, ancho * 0.72, my - alto * 0.42, ancho * 0.985, my - alto * 0.10);
  g.bezierCurveTo(ancho * 1.00, my + alto * 0.02, ancho * 0.92, my + alto * 0.22, ancho * 0.74, my + alto * 0.30);
  g.bezierCurveTo(ancho * 0.44, my + alto * 0.42, ancho * 0.16, my + alto * 0.26, ancho * 0.02, my + alto * 0.08);
  g.closePath();

  const memb = g.createLinearGradient(0, 0, ancho, 0);
  memb.addColorStop(0.0, 'rgba(226,236,244,0.42)');
  memb.addColorStop(0.45, 'rgba(224,234,242,0.26)');
  memb.addColorStop(1.0, 'rgba(228,238,246,0.17)');
  g.fillStyle = memb;
  g.fill();

  // margen costal (borde de ataque): la nervadura que SÍ recorre toda el ala
  g.save();
  g.clip();
  g.strokeStyle = 'rgba(104,84,58,0.80)';
  g.lineWidth = alto * 0.055;
  g.beginPath();
  g.moveTo(ancho * 0.02, my - alto * 0.09);
  g.bezierCurveTo(ancho * 0.30, my - alto * 0.42, ancho * 0.72, my - alto * 0.40, ancho * 0.985, my - alto * 0.10);
  g.stroke();

  // pterostigma
  g.fillStyle = 'rgba(118,92,58,0.62)';
  g.beginPath();
  g.ellipse(ancho * 0.40, my - alto * 0.28, ancho * 0.045, alto * 0.055, -0.12, 0, Math.PI * 2);
  g.fill();

  // VENACIÓN REDUCIDA: nervaduras marcadas solo en el tercio basal; después,
  // trazos fantasma que se apagan. Eso es una melipona y no una Apis.
  g.lineCap = 'round';
  const nervios = [
    [[0.03, 0.02], [0.16, -0.02], [0.30, -0.06], [0.40, -0.10]],
    [[0.03, 0.06], [0.15, 0.10], [0.27, 0.10], [0.36, 0.06]],
    [[0.05, -0.04], [0.14, -0.12], [0.24, -0.20], [0.34, -0.25]],
    [[0.16, 0.09], [0.24, 0.04], [0.31, -0.02], [0.38, -0.07]],
    [[0.20, 0.14], [0.28, 0.16], [0.35, 0.14], [0.42, 0.09]],
  ];
  for (const n of nervios) {
    g.strokeStyle = 'rgba(112,90,60,0.72)';
    g.lineWidth = alto * 0.030;
    g.beginPath();
    g.moveTo(n[0][0] * ancho, my + n[0][1] * alto);
    for (let i = 1; i < n.length; i++) g.lineTo(n[i][0] * ancho, my + n[i][1] * alto);
    g.stroke();
  }
  // trazos apagados hacia la punta (venas vestigiales)
  g.strokeStyle = 'rgba(120,100,72,0.17)';
  g.lineWidth = alto * 0.020;
  for (let k = 0; k < 4; k++) {
    const y0 = -0.16 + k * 0.11;
    g.beginPath();
    g.moveTo(basal * ancho, my + y0 * alto);
    g.lineTo(ancho * 0.90, my + (y0 * 0.5 + 0.02) * alto);
    g.stroke();
  }
  g.restore();

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function alaPlana(largo, ancho, base, dir, alabeo, tex) {
  const g = new THREE.PlaneGeometry(largo, ancho, 22, 6);
  // alabeo: el ala no es una lámina plana, tiene comba
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = (pos.getX(i) / largo) + 0.5;
    pos.setZ(i, Math.sin(u * Math.PI) * alabeo + pos.getY(i) * 0.06);
  }
  g.computeVertexNormals();
  g.translate(largo / 2, 0, 0);
  const d = new THREE.Vector3(...dir).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d);
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...base), q, new THREE.Vector3(1, 1, 1)));
  const mat = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    roughness: 0.22, metalness: 0.0,
  });
  const m = new THREE.Mesh(g, mat);
  m.renderOrder = 3;
  // la geometría queda en espacio de MODELO (para medir el ancla); quien la
  // use la recentra sobre su raíz para poder aletear desde el hombro del ala.
  return { malla: m, geom: g, base };
}

export function construirAngelita() {
  const r = rng(2609);
  const cuerpo = [];    // todo lo quitinoso, se fusiona
  const cera = [];      // el tubo del nido y su base
  const A = crearAnclas();
  const G = new THREE.Group();
  G.name = 'abeja-angelita';

  const ALTURA = 4.65;  // la abeja vuela sobre la boca del tubo

  /* ── ABDOMEN (metasoma) ───────────────────────────────────────────────── */
  const abdomen = cuerpoOrganico({
    largo: A_LARGO, nSeg: 74, nRad: 46, semilla: 5, ruido: 0.010,
    espina: (t) => ALTURA - 0.06 - 0.20 * (1 - t) ** 1.7,
    arriba: (t) => perfilAbd(t),
    abajo: (t) => perfilAbd(t) * 0.90,
    lado: (t) => perfilAbd(t) * 0.88,
  });
  // el loft nace centrado en x=0; se corre para que la punta caiga atrás
  abdomen.translate(-1.30, 0, 0);
  {
    const cAmb = new THREE.Color(AMBAR), cBan = new THREE.Color(BANDA);
    const bandas = [-0.36, -0.83, -1.30, -1.77];
    pintarPorVertice(abdomen, (x, y, z, i, c) => {
      let d = 9;
      for (const b of bandas) d = Math.min(d, Math.abs(x - b));
      const dorso = clamp01((y - (ALTURA - 0.28)) / 0.42);
      const f = (1 - suavePaso(0.045, 0.125, d)) * (0.42 + 0.58 * dorso);
      const gr = (ruidoFbm(x * 7, y * 7, z * 7) - 0.5) * 0.06;
      return c.copy(cAmb).lerp(cBan, clamp01(f + gr));
    });
  }
  cuerpo.push(abdomen);
  A.marca('aguijon', abdomen, { modo: 'extremo', dir: [-1, -0.25, 0] });

  /* ── PECÍOLO + TÓRAX (mesosoma) ───────────────────────────────────────── */
  cuerpo.push(pintarPlano(hueso([0.18, ALTURA - 0.12, 0], [-0.10, ALTURA - 0.16, 0], 0.20, 0.26, 12), '#4a3520'));
  const torax = poner(new THREE.SphereGeometry(0.68, 34, 26), [0.86, ALTURA + 0.02, 0], [0, 0, 0.06], [1.02, 0.98, 0.96]);
  cuerpo.push(pintarPlano(torax, QUITINA));
  const escutelo = poner(new THREE.SphereGeometry(0.30, 18, 14), [0.30, ALTURA + 0.16, 0], [0, 0, 0.2], [0.95, 0.72, 1.06]);
  cuerpo.push(pintarPlano(escutelo, QUITINA));

  /* ── CABEZA ───────────────────────────────────────────────────────────── */
  const cabeza = poner(new THREE.SphereGeometry(0.68, 36, 28), [2.10, ALTURA + 0.02, 0], [0, 0, 0], [0.82, 1.02, 1.10]);
  cuerpo.push(pintarPlano(cabeza, QUITINA));
  // OJOS COMPUESTOS: grandes, laterales, arriñonados — media cara de la abeja.
  // Llevan una lumbrera pálida encima: sin ese brillo, en un bicho oscuro los
  // ojos desaparecen y la cabeza queda como una bola negra sin cara.
  let ojoDer = null;
  for (const s of [1, -1]) {
    const ojo = poner(new THREE.SphereGeometry(0.43, 30, 22), [2.11, ALTURA + 0.12, s * 0.47], [0, 0, 0.12], [0.92, 1.28, 0.68]);
    cuerpo.push(pintarPlano(ojo, OJO));
    if (s === 1) ojoDer = ojo;
    cuerpo.push(pintarPlano(
      poner(new THREE.SphereGeometry(0.13, 12, 9), [2.30, ALTURA + 0.40, s * 0.50], [0, 0, 0.3], [1.5, 0.7, 0.9]), '#9aa2a8'));
  }
  A.marca('ojo', ojoDer, { modo: 'centro' });
  // OCELOS: los tres ojitos simples de la coronilla
  for (const [dx, dz] of [[-0.20, 0], [-0.27, 0.16], [-0.27, -0.16]]) {
    cuerpo.push(pintarPlano(poner(new THREE.SphereGeometry(0.062, 10, 8), [2.10 + dx, ALTURA + 0.62, dz]), '#e0bb64'));
  }
  // mandíbulas
  for (const s of [1, -1]) {
    cuerpo.push(pintarPlano(
      poner(new THREE.SphereGeometry(0.14, 10, 8), [2.62, ALTURA - 0.38, s * 0.16], [0, 0, -0.5], [1.5, 0.55, 0.7]), '#6b4a24'));
  }
  // ANTENAS ACODADAS: escapo largo, codo, flagelo. Se hacen con tubo curvo
  // para que el codo se lea de verdad y no como un palo doblado.
  let antenaDer = null;
  for (const s of [1, -1]) {
    const ant = tuboCurva([
      [2.44, ALTURA - 0.02, s * 0.20],
      [2.72, ALTURA - 0.26, s * 0.34],
      [2.88, ALTURA - 0.44, s * 0.50],
      [3.18, ALTURA - 0.44, s * 0.72],
      [3.46, ALTURA - 0.52, s * 0.92],
    ], (t) => 0.062 - 0.026 * t, { segs: 26, radial: 8 });
    cuerpo.push(pintarPlano(ant, '#3d2c17'));
    if (s === 1) antenaDer = ant;
  }
  A.marca('antena', antenaDer, { modo: 'extremo', dir: [1, -0.3, 0.4] });

  /* ── SEIS PATAS · la trasera lleva la CORBÍCULA ───────────────────────── */
  const corbiculas = [];
  for (const s of [1, -1]) {
    // delantera
    cuerpo.push(pintarPlano(hueso([1.28, ALTURA - 0.44, s * 0.38], [1.62, ALTURA - 1.02, s * 0.74], 0.135, 0.100, 9), '#8a6228'));
    cuerpo.push(pintarPlano(hueso([1.62, ALTURA - 1.02, s * 0.74], [1.96, ALTURA - 1.56, s * 0.94], 0.100, 0.074, 8), '#8a6228'));
    cuerpo.push(pintarPlano(hueso([1.96, ALTURA - 1.56, s * 0.94], [2.22, ALTURA - 1.92, s * 1.04], 0.070, 0.042, 7), '#5e4018'));
    // media
    cuerpo.push(pintarPlano(hueso([0.86, ALTURA - 0.47, s * 0.40], [0.90, ALTURA - 1.08, s * 0.86], 0.140, 0.102, 9), '#8a6228'));
    cuerpo.push(pintarPlano(hueso([0.90, ALTURA - 1.08, s * 0.86], [0.92, ALTURA - 1.72, s * 1.10], 0.102, 0.074, 8), '#8a6228'));
    cuerpo.push(pintarPlano(hueso([0.92, ALTURA - 1.72, s * 1.10], [0.86, ALTURA - 2.10, s * 1.22], 0.070, 0.042, 7), '#5e4018'));
    // trasera: fémur → CORBÍCULA (tibia aplanada) → tarso
    cuerpo.push(pintarPlano(hueso([0.42, ALTURA - 0.46, s * 0.40], [0.14, ALTURA - 1.02, s * 0.86], 0.170, 0.125, 9), '#8a6228'));
    const corb = poner(new THREE.SphereGeometry(0.5, 24, 18),
      [-0.06, ALTURA - 1.48, s * 1.02], [0, s * 0.30, Math.PI - 0.62], [0.60, 1.10, 0.21]);
    cuerpo.push(pintarPlano(corb, '#5e4118'));
    corbiculas.push(corb);
    // el cerco de pelos que hace de canasta
    for (let k = 0; k < 13; k++) {
      const a = (k / 13) * Math.PI * 2;
      const p = [-0.06 + Math.cos(a) * 0.30, ALTURA - 1.48 + Math.sin(a) * 0.52, s * 1.02];
      cuerpo.push(pintarPlano(mechon(p, [Math.cos(a) * 0.8, Math.sin(a) * 0.9, s * 0.25], 0.30, 0.030, 5), PELUSA));
    }
    // LA BOLA DE POLEN pegada en la canasta
    const bola = poner(new THREE.SphereGeometry(0.36, 18, 14), [-0.10, ALTURA - 1.50, s * 1.20], [0, 0, 0.3], [1.12, 1.0, 0.82]);
    pintarPorVertice(bola, (x, y, z, i, c) => {
      const n = ruidoFbm(x * 9, y * 9, z * 9);
      return c.set(POLEN).lerp(new THREE.Color('#c98a1c'), clamp01((n - 0.45) * 2.2));
    });
    cuerpo.push(bola);
    cuerpo.push(pintarPlano(hueso([-0.44, ALTURA - 1.86, s * 1.10], [-0.72, ALTURA - 2.26, s * 1.20], 0.072, 0.044, 7), '#5e4018'));
  }
  A.marca('corbicula', corbiculas[0], { modo: 'centro' });

  /* ── PELUSA del tórax y la cara ───────────────────────────────────────── */
  for (let i = 0; i < 78; i++) {
    const a = r() * Math.PI * 2, b = Math.acos(2 * r() - 1);
    const n = [Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)];
    const p = [0.86 + n[0] * 0.66, ALTURA + 0.02 + n[1] * 0.64, n[2] * 0.62];
    cuerpo.push(pintarPlano(mechon(p, n, 0.24 + r() * 0.16, 0.036, 5), PELUSA));
  }
  for (let i = 0; i < 22; i++) {
    const a = r() * Math.PI * 2, b = Math.acos(2 * r() - 1);
    const n = [Math.sin(b) * Math.cos(a) * 0.8 + 0.4, Math.cos(b), Math.sin(b) * Math.sin(a)];
    const p = [2.10 + n[0] * 0.62, ALTURA + 0.02 + n[1] * 0.64, n[2] * 0.66];
    cuerpo.push(pintarPlano(mechon(p, n, 0.18 + r() * 0.10, 0.030, 5), PELUSA));
  }

  /* ── fusión + las marcas pálidas de la especie + AO ───────────────────── */
  const quitina = fusionar(cuerpo, 'angelita-cuerpo');
  // franjas pálidas laterales del tórax y máscara clara de la cara: T.
  // angustula lleva marcas amarillentas en la cara y en los costados
  for (const s of [1, -1]) {
    pintarMancha(quitina, [0.88, ALTURA - 0.18, s * 0.62], 0.46, PALIDO, { dureza: 0.55, ruido: 0.2, semilla: 4 + s, fuerza: 0.85 });
    pintarMancha(quitina, [1.34, ALTURA + 0.16, s * 0.40], 0.28, PALIDO, { dureza: 0.5, semilla: 9 + s, fuerza: 0.7 });
  }
  pintarMancha(quitina, [2.54, ALTURA - 0.12, 0], 0.38, PALIDO, {
    dureza: 0.5, ruido: 0.2, semilla: 14, fuerza: 0.9,
    donde: (x, y, z) => x > 2.28 && Math.abs(z) < 0.38,
  });
  hornearPelaje(quitina, {
    yBajo: ALTURA - 2.4, yAlto: ALTURA + 0.7, ao: 0.30, moteado: 0.05, semilla: 3, cielo: 0.24, freq: 1.6,
  });
  const vuelo = new THREE.Group();          // solo la abeja: el nido no flota
  vuelo.name = 'vuelo';
  G.add(vuelo);
  const mallaCuerpo = new THREE.Mesh(quitina, materialPelaje({ roughness: 0.46, metalness: 0.06, rim: 0.24, filo: 3.4 }));
  mallaCuerpo.castShadow = true;
  vuelo.add(mallaCuerpo);

  /* ── LAS CUATRO ALAS ──────────────────────────────────────────────────── */
  const tex = texturaAla();
  let alaDer = null;
  for (const s of [1, -1]) {
    const delantera = alaPlana(4.30, 1.34, [0.92, ALTURA + 0.52, s * 0.26], [-0.62, 0.14, s * 0.77], 0.18, tex);
    vuelo.add(delantera.malla);
    if (s === 1) alaDer = delantera.geom;
    const trasera = alaPlana(2.70, 0.86, [0.66, ALTURA + 0.34, s * 0.30], [-0.74, -0.02, s * 0.67], 0.12, tex);
    vuelo.add(trasera.malla);
  }
  A.marca('ala', alaDer, { modo: 'centro' });

  /* ── EL TUBO DE CERUMEN: la puerta del nido ───────────────────────────────
     ⚠️ CORRECCIÓN medida con captura: con el nido JUSTO DEBAJO de la abeja,
     ella le tiraba la sombra encima y el cerumen —que es cera color miel—
     salía verde musgo, iluminado solo por el rebote del pasto. El nido se
     corre a un costado, hacia la luz: además queda mejor leído, porque la
     guardiana de verdad se planta EN FRENTE de la entrada, no encima. */
  const NIDO = [1.55, 0, 1.72];
  const base = poner(new THREE.SphereGeometry(1.74, 44, 26), [NIDO[0], -0.60, NIDO[2]], [0, 0, 0], [1, 0.34, 1]);
  pintarPorVertice(base, (x, y, z, i, c) => {
    const n = ruidoFbm(x * 1.1, y * 1.1, z * 1.1);
    return c.set('#5c452c').lerp(new THREE.Color('#7d6142'), clamp01((n - 0.4) * 2));
  });
  cera.push(base);
  const tubo = tuboCurva([
    [NIDO[0] + 0.02, 0.05, NIDO[2]],
    [NIDO[0] + 0.05, 0.72, NIDO[2] + 0.04],
    [NIDO[0] + 0.10, 1.42, NIDO[2] + 0.06],
    [NIDO[0] + 0.12, 2.06, NIDO[2] + 0.03],
  ], (t) => 0.86 - 0.38 * t + 0.30 * suavePaso(0.74, 1.0, t), { segs: 46, radial: 26 });
  pintarPorVertice(tubo, (x, y, z, i, c) => {
    const n = ruidoFbm(x * 2.6, y * 2.6, z * 2.6);
    return c.set(CERA).lerp(new THREE.Color('#c39c52'), clamp01((n - 0.38) * 1.9));
  });
  cera.push(tubo);
  A.marca('tubo', tubo, { modo: 'extremo', dir: [0.2, 1, 0.2] });
  // la boca del tubo, un poco irregular: cerumen puesto a mordiscos
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2 + 0.2;
    const rad = 0.72 + (r() - 0.5) * 0.11;
    cera.push(pintarPlano(
      poner(new THREE.SphereGeometry(0.12, 8, 6),
        [NIDO[0] + 0.12 + Math.cos(a) * rad, 2.08 + (r() - 0.5) * 0.09, NIDO[2] + 0.03 + Math.sin(a) * rad]),
      r() > 0.5 ? CERA : '#d8b871'));
  }
  const geoCera = hornearPelaje(fusionar(cera, 'angelita-cera'), {
    yBajo: -0.5, yAlto: 2.2, ao: 0.22, moteado: 0.07, semilla: 12, cielo: 0.14, piso: 0.10, freq: 1.4,
  });
  const mallaCera = new THREE.Mesh(geoCera, materialPelaje({ roughness: 0.72, rim: 0.14, filo: 4.2 }));
  mallaCera.receiveShadow = true;
  mallaCera.castShadow = true;
  G.add(mallaCera);

  return crearSer({
    especie: 'angelita',
    reino: 'animal',
    estilo: 'naturalista',
    nivelDetalle: 2,
    grupo: G,
    // 1 unidad del modelo = 1 mm de bicho real
    metrosPorUnidad: 0.001,
    // se sostiene en el aire frente a la entrada, como hacen las guardianas:
    // un cabeceo lento y un balanceo, nada de aleteo estroboscópico
    animar: (t) => {
      vuelo.position.y = Math.sin(t * 1.9) * 0.20 + Math.sin(t * 3.7) * 0.06;
      vuelo.position.x = Math.sin(t * 1.3 + 0.7) * 0.10;
      vuelo.rotation.z = Math.sin(t * 1.55) * 0.022;
    },
    puntos: [
      {
        id: 'aguijon', etiqueta: 'Sin aguijón',
        descripcion: 'Es una abeja SIN AGUIJÓN: lo tiene reducido y no funciona, no puede picar. Por eso se cría en el patio, al lado de los niños. Cuando algo la molesta defiende el nido mordiendo — y con las guardianas, que se quedan quietas en el aire frente a la entrada, cosa que casi ninguna otra abeja hace.',
        posicion: A.punto('aguijon'),
      },
      {
        id: 'corbicula', etiqueta: 'Corbícula',
        descripcion: 'La tibia de la pata trasera es una placa plana y ancha, rodeada de un cerco de pelos: la canasta donde amasa la bola de polen y la carga hasta el nido. Lo que trae pegado ahí dice qué está floreciendo alrededor esta semana.',
        posicion: A.punto('corbicula'),
      },
      {
        id: 'ala', etiqueta: 'Alas de venación reducida',
        descripcion: 'Cuatro alas transparentes. En las meliponas las nervaduras solo llegan al tercio de la base y de ahí para afuera la membrana va casi limpia: es la marca que las separa de la abeja de miel bajo la lupa. En vuelo el ala de adelante y la de atrás se enganchan y baten como una sola.',
        posicion: A.punto('ala'),
      },
      {
        id: 'ojo', etiqueta: 'Ojos compuestos',
        descripcion: 'Dos ojos compuestos grandes a los lados, y arriba tres ocelos simples. Los compuestos leen movimiento y color — incluido el ultravioleta, con el que muchas flores dibujan la pista de aterrizaje que nosotros no vemos. Los ocelos le miden el nivel de luz para orientarse.',
        posicion: A.punto('ojo'),
      },
      {
        id: 'antena', etiqueta: 'Antenas acodadas',
        descripcion: 'Van dobladas en codo: un primer segmento largo y después el resto articulado. Ahí lleva el olfato y el gusto. Huele la flor antes de verla, y reconoce por el olor quién es del nido y quién no.',
        posicion: A.punto('antena'),
      },
      {
        id: 'tubo', etiqueta: 'La entrada de cera',
        descripcion: 'El nido está escondido en un hueco de tronco o de un muro; lo que se ve es este tubo de cerumen — cera propia amasada con resina de árbol. Es la puerta, y es de la especie: la forma del tubo la delata sin abrir nada. Al caer la tarde lo cierran.',
        posicion: A.punto('tubo'),
      },
    ],
    ficha: {
      nombreComun: 'Abeja angelita',
      nombreCientifico: 'Tetragonisca angustula',
      rol: 'Sabe qué está floreciendo. No tiene aguijón, así que vive en un tronco o una caja en el patio sin problema con nadie. Poliniza cultivo y monte nativo, y su miel —más líquida y más ácida que la de la abeja europea— se guarda como remedio de casa. Es el sensor vivo de la finca: lo que entra al nido cuenta qué floreció esta semana.',
      pisoTermico: '',
      riesgo: '',
    },
  });
}
