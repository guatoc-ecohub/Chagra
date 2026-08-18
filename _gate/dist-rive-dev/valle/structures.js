// ── El sitio: cabaña escalonada + domo + terrazas + deck + invernadero ──────
// Fiel a referencias/03-cabana-de-frente.jpg: construcción ESCALONADA en la
// ladera — nivel bajo de madera dorada con fila larga de ventanales cálidos y
// techo verde inclinado; nivel alto retranqueado (mirador de ventanales) con
// terraza de baranda; el domo geodésico verde con frente de vidrio coronando;
// bancales de huerta con tutores bajando la ladera; invernadero túnel al lado.
import * as THREE from 'three';
import { height, K, SITE_X, SITE_Z } from './terrain.js';

// ── PERF: fusión estática por material ──────────────────────────────────────
// Antes: cada tabla/marco/poste de la cabaña era su propio THREE.Mesh — ~89
// draw calls para UN edificio que nunca cambia de forma tras construirse.
// Mismo bug que resolvió `elementos.js` (su `fusion()`), pero esta fusión SÍ
// preserva UV (los materiales de aquí llevan textura: `wood`) y agrupa por
// material (no se puede fundir vidrio+madera en un solo mesh sin atlas).
// Ojo con el bug clásico de `mergeGeometries`: indexada+no-indexada mezcladas
// devuelve null EN SILENCIO. Por eso cada pieza se desindexa antes de fundir.
function fusionPorMaterial(meshes) {
  const porMat = new Map();
  for (const m of meshes) {
    if (!porMat.has(m.material)) porMat.set(m.material, []);
    porMat.get(m.material).push(m);
  }
  const salida = [];
  for (const [mat, ms] of porMat) {
    if (ms.length === 1) { salida.push(ms[0]); continue; }
    let g0 = ms[0].geometry;
    if (!g0.attributes.uv && ms.some((m) => m.geometry.attributes.uv)) {
      // si algún hermano del mismo material trae UV y otro no, no se puede
      // fundir sin romper el atlas — deja sueltos (caso no observado hoy,
      // guarda defensiva).
      salida.push(...ms);
      continue;
    }
    const geoms = ms.map((m) => {
      m.updateMatrix();
      const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone());
      g.applyMatrix4(m.matrix);
      return g;
    });
    let n = 0;
    const hasUV = !!geoms[0].attributes.uv;
    for (const g of geoms) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    const uv = hasUV ? new Float32Array(n * 2) : null;
    let o = 0;
    for (const g of geoms) {
      if (!g.attributes.normal) g.computeVertexNormals();
      const P = g.attributes.position.array, N = g.attributes.normal.array;
      const UV = hasUV && g.attributes.uv ? g.attributes.uv.array : null;
      const c = g.attributes.position.count;
      pos.set(P, o * 3); nor.set(N, o * 3);
      if (hasUV) { if (UV) uv.set(UV, o * 2); }
      o += c;
      g.dispose();
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    if (hasUV) merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, mat);
    salida.push(mesh);
  }
  return salida;
}

export function makeSite(scene) {
  // el sitio ENFRENTA a La Chorrera (canal en x=-70): la cabaña mira al cañón
  // la posición la manda terrain.js (una sola fuente de verdad: la explanada
  // del `height()` y el rim del amanecer se atan al mismo punto)
  const sx = SITE_X, sz = SITE_Z;
  const gy = height(sx, sz);
  const site = new THREE.Group();
  site.position.set(sx, gy, sz);

  // ══ ESCALA DEL SITIO ═══════════════════════════════════════════════════
  // `terrain.js` declara K = 0.6 unidades de escena por metro real, o sea
  // 1 u = 1,667 m. Este archivo estaba escrito como si 1 u = 1 m, así que
  // TODO el sitio medía 1,667x de más contra el terreno que lo sostiene:
  //
  //   cabaña ancho CW 12 u → 20,0 m   ·   altura de piso H1 2,7 u → 4,5 m
  //   domo diámetro 7 u    → 11,7 m   ·   deck del mirador 24 u → 40,0 m
  //   el carro 5,6 u       →  9,4 m   ·   tutores de huerta 2,3 u → 3,8 m
  //   columnas del torii   →  3,5 m   ·   invernadero 8,5 u → 14,2 m
  //
  // En vez de re-escribir ochenta cotas a mano (y volver a equivocarse en
  // alguna), las cotas de abajo se declaran EN METROS y todo el sitio cuelga
  // de un grupo con `scale = K`. Una sola pasada, sin cotas huérfanas.
  const S = new THREE.Group();
  S.scale.setScalar(K);
  site.add(S);
  // altura del terreno bajo un punto LOCAL (en metros) del sitio, devuelta
  // también en metros: ojo, hay que consultar el terreno en la posición YA
  // escalada, si no las cosas quedan flotando o enterradas.
  const gh = (lx, lz) => (height(sx + lx * K, sz + lz * K) - gy) / K;

  // textura procedural de tablas: la madera se lee como MADERA, no color plano
  function woodTexture(base, seam) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const c = cv.getContext('2d');
    c.fillStyle = base; c.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 18) { // tablas horizontales con junta oscura
      c.fillStyle = `rgba(0,0,0,${0.06 + (y * 7 % 13) / 90})`;
      c.fillRect(0, y, 256, 17);
      c.fillStyle = seam; c.fillRect(0, y + 17, 256, 1.6);
      for (let i = 0; i < 30; i++) { // veta
        c.fillStyle = `rgba(255,225,170,${0.03 + Math.random() * 0.05})`;
        c.fillRect(Math.random() * 256, y + 2 + Math.random() * 13, 14 + Math.random() * 46, 1);
      }
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  const wood = new THREE.MeshStandardMaterial({
    map: woodTexture('#a06c33', 'rgba(46,28,12,0.85)'), roughness: 0.78,
  });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x33220f, roughness: 0.88 });
  const woodPale = new THREE.MeshStandardMaterial({ color: 0xc9b691, roughness: 0.72 });
  const roofGreen = new THREE.MeshStandardMaterial({ color: 0x3d6b44, roughness: 0.8 });
  const glassSmoke = new THREE.MeshPhysicalMaterial({
    color: 0x2a3438, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.6,
    envMapIntensity: 1.2, emissive: 0xff9a4a, emissiveIntensity: 0.22,
  });
  const glassWarm = new THREE.MeshStandardMaterial({
    color: 0x241a10, roughness: 0.22, metalness: 0.05,
    emissive: 0xffa14f, emissiveIntensity: 1.15,
  });
  const m4 = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0),
    dirV = new THREE.Vector3(), q = new THREE.Quaternion(), IDq = new THREE.Quaternion();
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

  // ── nivel BAJO: madera dorada, fila larga de ventanales, corrido al frente ──
  const CW = 12, CD = 6.5, H1 = 2.7, H2 = 2.6;
  const F0 = 0.4;
  const B_X = 0.8, B_Z = -0.4;   // nivel bajo: al frente-derecha (ladera abajo)
  const U_X = -1.2, U_Z = 0.6;   // nivel alto: retranqueado atrás-izquierda
  const F1 = F0 + H1 + 0.25;
  const ROOF = F1 + H2;
  const roofTop = ROOF + 0.3;

  const base = box(CW, H1, CD, wood);
  base.position.set(B_X, F0 + H1 / 2, B_Z);
  S.add(base);
  // hilera de VENTANAS rectangulares en banda alta: madera vista abajo (foto 03)
  const G1H = 1.35, g1y = F0 + H1 - 0.35 - G1H / 2;
  const g1 = new THREE.Mesh(new THREE.PlaneGeometry(CW - 0.6, G1H), glassWarm);
  g1.position.set(B_X, g1y, B_Z - CD / 2 - 0.02);
  g1.rotation.y = Math.PI;
  S.add(g1);
  for (let i = 0; i <= 9; i++) { // parteluces: la fila se lee como ventanas
    const mull = box(0.13, G1H + 0.1, 0.16, wood);
    mull.position.set(B_X - (CW - 0.6) / 2 + ((CW - 0.6) / 9) * i, g1y, B_Z - CD / 2 - 0.02);
    S.add(mull);
  }
  for (const dy of [G1H / 2 + 0.06, -G1H / 2 - 0.06]) { // dintel y antepecho corridos
    const sill = box(CW - 0.4, 0.12, 0.18, woodDark);
    sill.position.set(B_X, g1y + dy, B_Z - CD / 2 - 0.02);
    S.add(sill);
  }
  const gR = new THREE.Mesh(new THREE.PlaneGeometry(CD - 1.6, 1.4), glassWarm);
  gR.position.set(B_X + CW / 2 + 0.02, F0 + H1 * 0.55, B_Z);
  gR.rotation.y = Math.PI / 2;
  S.add(gR);

  // techo VERDE inclinado del nivel bajo, bien visible cayendo al cañón (foto 03)
  const shed = box(CW + 1.6, 0.2, 8.2, roofGreen);
  shed.position.set(B_X, F0 + H1 + 0.5, B_Z - 0.9);
  shed.rotation.x = -0.24;
  S.add(shed);

  // pilotes bajo el frente (la ladera cae hacia el cañón)
  for (const [px, pz] of [[B_X - CW / 2 + 0.5, B_Z - CD / 2 + 0.3],
    [B_X + CW / 2 - 0.5, B_Z - CD / 2 + 0.3], [B_X, B_Z - CD / 2 + 0.3]]) {
    const gTop = F0 - 0.1;
    const gBot = gh(px, pz) - 0.4;
    const ph = Math.max(0.5, gTop - gBot);
    const p = box(0.26, ph, 0.26, woodDark);
    p.position.set(px, gTop - ph / 2, pz);
    S.add(p);
  }

  // ── nivel ALTO retranqueado: mirador de ventanales grandes ──
  const upper = box(8.2, H2, 5.6, wood);
  upper.position.set(U_X, F1 + H2 / 2, U_Z);
  S.add(upper);
  const g2 = new THREE.Mesh(new THREE.PlaneGeometry(7.4, H2 - 0.5), glassWarm);
  g2.position.set(U_X, F1 + H2 / 2, U_Z - 2.82);
  g2.rotation.y = Math.PI;
  S.add(g2);
  for (let i = 0; i <= 6; i++) {
    const mull = box(0.14, H2 - 0.4, 0.16, wood);
    mull.position.set(U_X - 3.7 + (7.4 / 6) * i, F1 + H2 / 2, U_Z - 2.82);
    S.add(mull);
  }
  for (const sgn of [-1, 1]) { // ventanas laterales del mirador
    const gS = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.5), glassWarm);
    gS.position.set(U_X + sgn * 4.12, F1 + H2 * 0.5, U_Z);
    gS.rotation.y = sgn * Math.PI / 2;
    S.add(gS);
  }
  // ventanas traseras: la vista jugable mira la cabaña desde atrás — que viva
  const gB = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 1.5), glassWarm);
  gB.position.set(U_X, F1 + H2 * 0.5, U_Z + 2.82);
  S.add(gB);
  for (let i = 0; i <= 4; i++) {
    const mullB = box(0.14, 1.6, 0.16, wood);
    mullB.position.set(U_X - 3.3 + (6.6 / 4) * i, F1 + H2 * 0.5, U_Z + 2.82);
    S.add(mullB);
  }
  const gBlo = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.1), glassWarm);
  gBlo.position.set(B_X + 1.4, F0 + H1 - 0.85, B_Z + CD / 2 + 0.02);
  S.add(gBlo);
  // luz interior que se derrama
  const inner = new THREE.PointLight(0xffb45e, 26, 34, 1.8);
  inner.position.set(0, F0 + H1 + 1, -1);
  S.add(inner);

  // ── cubierta del mirador: terraza con baranda alrededor del domo ──
  // ── ARMONÍA DE ESCALA (2026-07-31): el domo pasa de R=3,5 m (diámetro 7 m,
  // se veía chico) a R=5,0 m (diámetro 10 m, prominente — cerca del target de
  // 11,7 m del operador sin desbordar tanto la terraza que lo sostiene). La
  // terraza crece en la MISMA proporción (factor 5,0/3,5 = 1,4286) para que
  // el domo no quede más ancho que su propia plataforma.
  const DOME_F = 5.0 / 3.5;
  const upRoof = box(9.2 * DOME_F, 0.3, 6.6 * DOME_F, woodDark);
  upRoof.position.set(U_X, ROOF + 0.15, U_Z);
  S.add(upRoof);
  const terrPosts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.85, 0.09), woodDark, 26);
  {
    let ti = 0;
    const hw = 4.5 * DOME_F, hd = 3.2 * DOME_F, py = roofTop + 0.42;
    for (let i = 0; i < 9; i++) { m4.compose(new THREE.Vector3(U_X - hw + (2 * hw / 8) * i, py, U_Z - hd), IDq, new THREE.Vector3(1, 1, 1)); terrPosts.setMatrixAt(ti++, m4); }
    for (let i = 0; i < 9; i++) { m4.compose(new THREE.Vector3(U_X - hw + (2 * hw / 8) * i, py, U_Z + hd), IDq, new THREE.Vector3(1, 1, 1)); terrPosts.setMatrixAt(ti++, m4); }
    for (let i = 1; i < 5; i++) for (const sgn of [-1, 1]) { m4.compose(new THREE.Vector3(U_X + sgn * hw, py, U_Z - hd + (2 * hd / 4) * i), IDq, new THREE.Vector3(1, 1, 1)); terrPosts.setMatrixAt(ti++, m4); }
  }
  S.add(terrPosts);
  for (const dz of [-3.2 * DOME_F, 3.2 * DOME_F]) {
    const rl = box(9.0 * DOME_F, 0.07, 0.1, wood);
    rl.position.set(U_X, roofTop + 0.85, U_Z + dz);
    S.add(rl);
  }
  for (const dx of [-4.5 * DOME_F, 4.5 * DOME_F]) {
    const rl = box(0.1, 0.07, 6.4 * DOME_F, wood);
    rl.position.set(U_X + dx, roofTop + 0.85, U_Z);
    S.add(rl);
  }

  // ── domo geodésico VERDE coronando (media cúpula, vidrio ahumado al frente,
  //    entramado claro; foto 03: el verde domina, el vidrio mira al cañón) ──
  const R = 3.5 * DOME_F;
  const ico = new THREE.IcosahedronGeometry(R, 2).toNonIndexed();
  const p = ico.attributes.position;
  const greenTris = [], glassTris = [];
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3(), cen = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    va.fromBufferAttribute(p, i); vb.fromBufferAttribute(p, i + 1); vc.fromBufferAttribute(p, i + 2);
    if (va.y < -0.04 * R && vb.y < -0.04 * R && vc.y < -0.04 * R) continue; // solo media cúpula
    cen.copy(va).add(vb).add(vc).divideScalar(3).normalize();
    const target = cen.z < -0.62 ? glassTris : greenTris; // solo un ARCO de vidrio al frente: el verde domina (foto 03)
    target.push(va.x, va.y, va.z, vb.x, vb.y, vb.z, vc.x, vc.y, vc.z);
  }
  function triGeo(arr) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    return g;
  }
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x40602f, roughness: 0.9, flatShading: true });
  const domeGreen = new THREE.Mesh(triGeo(greenTris), greenMat);
  const domeGlass = new THREE.Mesh(triGeo(glassTris), glassSmoke);
  const domeG = new THREE.Group();
  domeG.add(domeGreen, domeGlass);

  // entramado triangulado (madera clara sobre las aristas)
  const edgeSet = new Set();
  const edges = [];
  const keyOf = (a, b) => {
    const ka = `${a.x.toFixed(2)},${a.y.toFixed(2)},${a.z.toFixed(2)}`;
    const kb = `${b.x.toFixed(2)},${b.y.toFixed(2)},${b.z.toFixed(2)}`;
    return ka < kb ? ka + '|' + kb : kb + '|' + ka;
  };
  const allTris = [...greenTris, ...glassTris];
  for (let i = 0; i < allTris.length; i += 9) {
    const A = new THREE.Vector3(allTris[i], allTris[i + 1], allTris[i + 2]);
    const B = new THREE.Vector3(allTris[i + 3], allTris[i + 4], allTris[i + 5]);
    const C = new THREE.Vector3(allTris[i + 6], allTris[i + 7], allTris[i + 8]);
    for (const [u, v] of [[A, B], [B, C], [C, A]]) {
      const k = keyOf(u, v);
      if (!edgeSet.has(k)) { edgeSet.add(k); edges.push([u.clone(), v.clone()]); }
    }
  }
  const strutGeo = new THREE.CylinderGeometry(0.028, 0.028, 1, 5);
  strutGeo.translate(0, 0.5, 0);
  const struts = new THREE.InstancedMesh(strutGeo, wood, edges.length);
  edges.forEach(([a, b], i) => {
    dirV.subVectors(b, a);
    const len = dirV.length();
    q.setFromUnitVectors(up, dirV.normalize());
    m4.compose(a, q, new THREE.Vector3(1, len, 1));
    struts.setMatrixAt(i, m4);
  });
  domeG.add(struts);
  domeG.position.set(U_X, roofTop, U_Z);
  S.add(domeG);

  // luz cálida dentro del domo
  const domeLight = new THREE.PointLight(0xffc070, 4, 16, 1.8);
  domeLight.position.set(U_X, roofTop + 1.5, U_Z);
  S.add(domeLight);

  // ── bancales de huerta en terrazas ABAJO de la cabaña (cabana-real2: la
  // huerta baja por la ladera bajo el sitio, no arriba) ──
  const soil = new THREE.MeshStandardMaterial({ color: 0x46351f, roughness: 1 });
  const crop = new THREE.MeshStandardMaterial({ color: 0x55793a, roughness: 0.95 });
  for (let i = 0; i < 4; i++) {
    const bw = 9 - i * 0.8;
    const bx = -4 - i * 0.8, bz = 10.5 + i * 2.9;
    const by = gh(bx, bz);
    const bed = box(bw, 0.9, 2.3, soil); // hundido en la ladera, no flotando
    bed.position.set(bx, by + 0.1, bz);
    bed.rotation.y = 0.12 + i * 0.05;
    bed.rotation.x = 0.06;
    S.add(bed);
    const cr = box(bw - 0.4, 0.24, 1.7, crop);
    cr.position.set(bx, by + 0.52, bz);
    cr.rotation.y = bed.rotation.y;
    cr.rotation.x = 0.06;
    S.add(cr);
  }
  // tutores de la huerta (varas inclinadas)
  for (let i = 0; i < 10; i++) {
    const vx = -3.5 - Math.random() * 5, vz = 9.5 + Math.random() * 9;
    const vy = gh(vx, vz);
    const vara = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 2.3, 4), woodDark);
    vara.position.set(vx, vy + 1.05, vz);
    vara.rotation.set((Math.random() - 0.5) * 0.35, 0, (Math.random() - 0.5) * 0.35);
    S.add(vara);
  }

  // ── deck pequeño abajo a la derecha (foto 03) ──
  const DW = 8, DD = 6, DKX = 4.5;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(DW, 0.35, DD), wood);
  deck.position.set(DKX, 0.35, -CD / 2 - DD / 2 + 0.5);
  S.add(deck);
  const plankMat = new THREE.MeshStandardMaterial({ color: 0x3c2814, roughness: 0.9 });
  for (let i = 1; i < 8; i++) {
    const gap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, DD), plankMat);
    gap.position.set(DKX - DW / 2 + (DW / 8) * i, 0.55, deck.position.z);
    S.add(gap);
  }
  const postGeo = new THREE.BoxGeometry(0.14, 1.05, 0.14);
  const posts = [];
  const railZ = deck.position.z - DD / 2 + 0.1;
  for (let i = 0; i <= 8; i++) posts.push([DKX - DW / 2 + (DW / 8) * i, railZ]);
  for (let i = 1; i <= 4; i++) {
    posts.push([DKX - DW / 2 + 0.07, railZ + (DD / 5) * i]);
    posts.push([DKX + DW / 2 - 0.07, railZ + (DD / 5) * i]);
  }
  const postMesh = new THREE.InstancedMesh(postGeo, woodDark, posts.length);
  posts.forEach(([px, pz], i) => {
    m4.makeTranslation(px, 1.05, pz);
    postMesh.setMatrixAt(i, m4);
  });
  S.add(postMesh);
  const railF = new THREE.Mesh(new THREE.BoxGeometry(DW, 0.1, 0.18), wood);
  railF.position.set(DKX, 1.62, railZ);
  S.add(railF);
  for (const sgn of [-1, 1]) {
    const railS = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, DD), wood);
    railS.position.set(DKX + sgn * (DW / 2 - 0.07), 1.62, deck.position.z);
    S.add(railS);
  }

  // ── torii pequeño (guiño del masterplan) en el sendero ──
  const torii = new THREE.Group();
  const tMat = new THREE.MeshStandardMaterial({ color: 0xa63b2a, roughness: 0.7 });
  for (const sgn of [-1, 1]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.1, 8), tMat);
    col.position.set(sgn * 0.8, 1.05, 0);
    torii.add(col);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.16, 0.2), tMat);
  lintel.position.y = 2.1; lintel.rotation.z = 0.02;
  torii.add(lintel);
  const lintel2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.16), tMat);
  lintel2.position.y = 1.75;
  torii.add(lintel2);
  const tx = 11, tz = 12;
  torii.position.set(tx, gh(tx, tz), tz);
  torii.rotation.y = 0.4;
  S.add(torii);

  // ── fogata con parpadeo ──
  const fx = -9, fz = 7;
  const fy = gh(fx, fz);
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x55504a, roughness: 1 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22), stoneMat);
    st.position.set(fx + Math.cos(a) * 0.7, fy + 0.12, fz + Math.sin(a) * 0.7);
    S.add(st);
  }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.9 }));
  flame.position.set(fx, fy + 0.5, fz);
  S.add(flame);
  const fireLight = new THREE.PointLight(0xff8030, 12, 18, 1.9);
  fireLight.position.set(fx, fy + 1, fz);
  S.add(fireLight);

  // ── invernadero túnel de ~14 m (las cotas de abajo ya son metros) DEBAJO
  // un nivel más abajo en la ladera, DIRECTAMENTE abajo — ni al lado ni arriba
  // (pedido del operador). Se busca el punto real del terreno en runtime. ──
  const ivG = new THREE.Group();
  const ivMat = new THREE.MeshPhysicalMaterial({
    color: 0xcfd8d2, roughness: 0.35, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
  });
  // bóveda con el arco ARRIBA (rotación horneada en la geometría) + tapas
  const tunGeo = new THREE.CylinderGeometry(2.1, 2.1, 8.5, 12, 1, true, 0, Math.PI);
  tunGeo.rotateZ(Math.PI / 2); // eje a lo largo de X, media bóveda hacia +Y
  ivG.add(new THREE.Mesh(tunGeo, ivMat));
  for (const sgn of [-1, 1]) { // tapas semicirculares en los extremos
    const capGeo = new THREE.CircleGeometry(2.1, 12, 0, Math.PI);
    capGeo.rotateY(sgn * Math.PI / 2);
    capGeo.translate(sgn * 4.25, 0, 0);
    ivG.add(new THREE.Mesh(capGeo, ivMat));
  }
  // rayos alrededor del domo, arrancando por el FRENTE (hacia la cascada):
  // el primer punto de ladera con ~18 u de desnivel bajo el domo gana
  // rayos alrededor del domo (todo en METROS locales, como el resto del sitio):
  // gana el primer punto de ladera con ~30 m de desnivel bajo el domo
  const angles = [0];
  for (let k = 1; k <= 12; k++) angles.push(k * Math.PI / 12, -k * Math.PI / 12);
  let ivSpot = null, ivAng = 0;
  outer:
  for (const tol of [4, 7, 10]) {
    for (const a of angles) {
      const dx = Math.sin(a), dzr = -Math.cos(a); // a=0 → de frente (-z)
      for (let r = 26; r <= 180; r += 3) {
        const px = U_X + dx * r, pz = U_Z + dzr * r;
        if (Math.hypot(px + 60, pz - 80) < 30) continue; // no encima del mirador (en metros locales)
        const dh = gh(px, pz);
        if (dh < -30 - tol) break;
        if (Math.abs(dh + 30) <= tol) { ivSpot = { x: px, z: pz }; ivAng = a; break outer; }
      }
    }
  }
  if (!ivSpot) ivSpot = { x: U_X - 24, z: U_Z + 50 }; // fallback: ladera de la huerta
  const ivx = ivSpot.x, ivz = ivSpot.z;
  ivG.position.set(ivx, gh(ivx, ivz) - 0.25, ivz);
  ivG.rotation.y = -ivAng; // tendido a lo largo de la curva de nivel
  S.add(ivG);

  // ── PERF: fundir los mesh estáticos sueltos de `S` por material ──────────
  // `S` acumuló ~60 THREE.Mesh de tablas/vidrios/postes que nunca se mueven
  // ni se referencian de nuevo (el domo/invernadero/torii/instanced quedan
  // AFUERA porque son grupos, ya son InstancedMesh, o los toca el raycast del
  // gate — `domoClicables`). Fundir por material: ~60 draw calls → ~4
  // (wood/woodDark/glassWarm/roofGreen/soil/crop/plankMat/stoneMat/flameMat).
  {
    // flame queda AFUERA: `update(t)` la escala cada frame (parpadeo).
    const sueltos = S.children.filter((o) => o.isMesh && !o.isInstancedMesh && o !== flame);
    const fundidos = fusionPorMaterial(sueltos);
    for (const o of sueltos) S.remove(o);
    for (const o of fundidos) S.add(o);
  }

  // ── el carro ROJO en la parte MÁS ALTA de la loma, detrás de la cabaña
  // (cabana-real2: el campero rojo parquea arriba, en la cresta) ──
  const carG = new THREE.Group();
  const carRed = new THREE.MeshStandardMaterial({ color: 0xb3271d, roughness: 0.45, metalness: 0.2 });
  const carDark = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.85 });
  const carGlass = new THREE.MeshStandardMaterial({ color: 0x20262c, roughness: 0.25, metalness: 0.1 });
  const cw = 2.0, cl = 4.5;
  const body = box(cl, 1.0, cw, carRed); body.position.y = 1.0; carG.add(body);
  const hood = box(1.5, 0.14, cw - 0.15, carRed); hood.position.set(cl / 2 - 0.8, 1.56, 0); carG.add(hood);
  const cab = box(2.5, 1.0, cw - 0.1, carRed); cab.position.set(-0.7, 2.0, 0); carG.add(cab); // capota
  const wind = box(0.08, 0.8, cw - 0.35, carGlass); wind.position.set(0.68, 2.0, 0); wind.rotation.z = -0.18; carG.add(wind);
  for (const sgn of [-1, 1]) { // ventanas laterales de la capota
    const win = box(2.1, 0.62, 0.06, carGlass);
    win.position.set(-0.75, 2.08, sgn * (cw / 2 - 0.02));
    carG.add(win);
  }
  const bump = box(0.3, 0.32, cw + 0.1, carDark); bump.position.set(cl / 2 + 0.1, 0.62, 0); carG.add(bump);
  const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.26, 10), carDark);
  spare.rotation.z = Math.PI / 2; spare.position.set(-cl / 2 - 0.15, 1.25, 0); carG.add(spare);
  const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.38, 10);
  wheelGeo.rotateX(Math.PI / 2);
  for (const [wx, wz] of [[1.45, 0.95], [1.45, -0.95], [-1.45, 0.95], [-1.45, -0.95]]) {
    const wh = new THREE.Mesh(wheelGeo, carDark);
    wh.position.set(wx, 0.48, wz);
    carG.add(wh);
  }
  // ── DÓNDE PARQUEA ─────────────────────────────────────────────────────
  // El comentario decía "en la parte MÁS ALTA de la loma, DETRÁS de la cabaña,
  // por ENCIMA del domo", pero la ventana de búsqueda barría cz ∈ [-46, 16]
  // con el sitio en z=+40 y el cañón hacia -z: el carro caía en z=-22, o sea
  // 62 u = 103 m HACIA EL CAÑÓN — DELANTE de la casa, y en la vista por
  // defecto era lo segundo que veía el usuario. El "detrás" del comentario era
  // relativo a `?cam=back`, no a la casa. Ahora se busca detrás DE VERDAD:
  // la franja z > sitio, antes de que la loma caiga al rim.
  let carX = sx, carZ = sz + 40, carH = -Infinity;
  for (let cx = sx - 48; cx <= sx + 46; cx += 2) {
    for (let cz = sz + 16; cz <= sz + 92; cz += 2) {
      if (Math.hypot(cx - sx, cz - sz) < 16) continue; // no encima de la cabaña
      const h = height(cx, cz);
      if (h > carH) { carH = h; carX = cx; carZ = cz; }
    }
  }
  carG.position.set(carX, carH + 0.05, carZ);
  carG.rotation.y = 0.55;
  // ARMONÍA DE ESCALA (2026-07-31): 1,25 de gracia daba 4,5 m × 1,25 = 5,6 m
  // de largo real — un jeep real mide ~4 m. Factor ajustado a 0,889 × K:
  // 4,5 m × 0,889 = 4,0 m de largo REAL (antes 1,25 sin K daba 9,4 m: camión).
  carG.scale.setScalar(0.889 * K);
  // PERF: 9 mesh sueltos del carro (carrocería/vidrios/llantas) → ~3 por material.
  {
    const sueltos = carG.children.filter((o) => o.isMesh && !o.isInstancedMesh);
    const fundidos = fusionPorMaterial(sueltos);
    for (const o of sueltos) carG.remove(o);
    for (const o of fundidos) carG.add(o);
  }
  scene.add(carG);

  scene.add(site);

  // ── mirador del cañón: deck del primer plano (se conserva) ──
  const mir = new THREE.Group();
  const mx = sx - 36, mz = sz + 48;
  const my = height(mx, mz);
  mir.position.set(mx, my, mz);
  mir.scale.setScalar(K);   // sus cotas también estaban en metros (MW=24 → 24 m)
  const MW = 24;
  const mDeck = new THREE.Mesh(new THREE.BoxGeometry(MW, 0.4, 11), wood);
  mDeck.position.set(-3, 0.4, 0);
  mir.add(mDeck);
  // PERF: antes CADA gap creaba su propio MeshStandardMaterial (14 materiales
  // idénticos) — aparte de gastar programa/uniforms de más, eso le habría
  // impedido a fusionPorMaterial fundirlos (agrupa por REFERENCIA de material).
  const mGapMat = new THREE.MeshStandardMaterial({ color: 0x3c2814, roughness: 0.9 });
  for (let i = 1; i < 15; i++) {
    const gap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 11), mGapMat);
    gap.position.set(-3 - MW / 2 + (MW / 15) * i, 0.62, 0);
    mir.add(gap);
  }
  const mRailZ = -5.4;
  const mPostGeo = new THREE.BoxGeometry(0.14, 1.05, 0.14);
  const mPosts = new THREE.InstancedMesh(mPostGeo, woodDark, 17);
  const mm4 = new THREE.Matrix4();
  for (let i = 0; i <= 16; i++) {
    mm4.makeTranslation(-3 - MW / 2 + (MW / 16) * i, 1.1, mRailZ);
    mPosts.setMatrixAt(i, mm4);
  }
  mir.add(mPosts);
  const mRail = new THREE.Mesh(new THREE.BoxGeometry(MW + 0.2, 0.12, 0.2), wood);
  mRail.position.set(-3, 1.68, mRailZ);
  mir.add(mRail);
  const mRail2 = new THREE.Mesh(new THREE.BoxGeometry(MW + 0.2, 0.07, 0.12), wood);
  mRail2.position.set(-3, 0.5, mRailZ);
  mir.add(mRail2);
  const lantern = new THREE.PointLight(0xffa860, 15, 20, 1.7);
  lantern.position.set(-4, 2.3, -1);
  mir.add(lantern);
  // PERF: deck + 14 gaps + 2 rieles → 3 mesh por material (wood / mGapMat).
  {
    const sueltos = mir.children.filter((o) => o.isMesh && !o.isInstancedMesh);
    const fundidos = fusionPorMaterial(sueltos);
    for (const o of sueltos) mir.remove(o);
    for (const o of fundidos) mir.add(o);
  }
  scene.add(mir);

  function update(t) {
    const f = 1 + Math.sin(t * 11) * 0.16 + Math.sin(t * 23 + 1.7) * 0.1;
    flame.scale.set(f, 1 + Math.sin(t * 13) * 0.22, f);
    fireLight.intensity = 12 * (0.85 + Math.random() * 0.3);
  }
  // domoClicables: las mallas del domo para el raycast de la ventana de mundos
  // (portales.js). SOLO referencia — la geometría del domo no se toca.
  //
  // domoPos / terrazaY / domoR: el PUNTO DE VISTA REAL DE GUATOC. El operador
  // fotografía el cañón parado en el domo, y en el domo el "piso local" es la
  // terraza del mirador (el suelo de ahí queda DENTRO de la cabaña). main.js
  // los usa para plantar la cámara `?cam=guatoc`. Sólo se leen posiciones ya
  // calculadas — no se mueve ni una malla.
  return {
    update,
    // ⚠️ en unidades de MUNDO: las cotas de arriba son metros y el sitio
    // cuelga de `S` con scale=K, así que hay que multiplicar al salir.
    sitePos: new THREE.Vector3(sx, gy, sz),
    domoPos: new THREE.Vector3(sx + U_X * K, gy + roofTop * K, sz + U_Z * K),
    terrazaY: gy + roofTop * K,
    domoR: R * K,
    domoClicables: [domeGreen, domeGlass, struts],
    // ── COLOCACIÓN LIBRE ──────────────────────────────────────────────────
    // «SE MUEVE: cabaña, carro, domo, invernadero, corral, huerta… NO SE
    //  MUEVE: el terreno real, la Chorrera, los macizos, el río.»
    // Sólo se EXPONEN las referencias que ya existían; cero geometría nueva y
    // cero cotas tocadas. `padre` indica los que cuelgan del grupo del sitio
    // (sus coordenadas están en METROS locales, no en unidades de mundo).
    movibles: [
      { id: 'sitio', nombre: 'La casa y el domo', obj: site },
      { id: 'carro', nombre: 'El campero', obj: carG, dy: 0.05 },
      { id: 'mirador', nombre: 'El mirador', obj: mir },
      { id: 'invernadero', nombre: 'El invernadero', obj: ivG, padre: S },
      { id: 'torii', nombre: 'El portal de madera', obj: torii, padre: S },
    ],
  };
}
