// ── pista-tierra.js — la cinta de tierra compactada del "Descenso" ──────────
// Factory: crearCintaPista(THREE, pista) → { grupo, rings, stats }.
// Reemplaza la banda plana de 3 vértices por una cinta de tierra con lectura
// de lámina naturalista: centro pisado y claro, dos huellas de llanta, bordes
// húmedos oscuros que se meten bajo el pasto, piedrecilla suelta, piedras
// encaladas marcando las curvas y postes de cerca con alambre que SIGUE la
// curva (antes los vanos de ~46 m cortaban el paisaje en línea recta).
//
// Decisiones que importan:
// - El perfil transversal aplica el MISMO peralte que el heightfield
//   (y = elev + lat·banco). La banda vieja lo ignoraba: en las curvas
//   peraltadas quedaba enterrada de un lado y flotando del otro.
// - La costura de la vuelta cierra en un número ENTERO de repeticiones de
//   textura (fila duplicada al final, sin módulo en el índice): cinta continua
//   de verdad, sin el borrón de u=338→0 en el último tramo.
// - Micro-relieve real (bombeo + surcos de huella) para que la luz rasante
//   separe los materiales; el color por vértice pone las zonas anchas y la
//   textura el grano fino. Nada fotorrealista: tierra de páramo, oscura y
//   húmeda, no arena de desierto.

let TEX_TIERRA = null;

function hash01(x, z) {
  const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

function crearTexturaTierra(THREE) {
  if (TEX_TIERRA) return TEX_TIERRA;
  const tam = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = tam;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(tam, tam);
  const px = img.data;
  const h = (x, y) => {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  };
  // fbm barato de 3 octavas con interpolación suave
  const val = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x, y) => 0.55 * val(x, y) + 0.3 * val(x * 2.1, y * 2.1) + 0.15 * val(x * 4.3, y * 4.3);
  for (let y = 0; y < tam; y++) {
    const v = y / tam;
    // perfil transversal de la textura, alineado con los vértices de la cinta:
    // huellas en v≈0.29 y v≈0.71, centro pisado, bordes húmedos
    const centro = Math.exp(-Math.pow((v - 0.5) / 0.30, 2));
    const huella = Math.exp(-Math.pow((v - 0.29) / 0.05, 2)) + Math.exp(-Math.pow((v - 0.71) / 0.05, 2));
    const borde = Math.min(1, Math.max(0, (Math.abs(v - 0.5) - 0.36) / 0.14));
    for (let x = 0; x < tam; x++) {
      const u = x / tam;
      const n = fbm(x * 0.045, y * 0.045) - 0.5;      // manchado ancho
      const g = fbm(x * 0.35, y * 0.35) - 0.5;        // grano fino
      // vibración de banda de rodadura: rayitas cortas a lo largo de u,
      // solo dentro de las huellas
      const dash = h(Math.floor(x / 7), Math.floor(y / 3)) > 0.55 ? Math.sin(u * 240 + y * 0.7) * 4 : 0;
      let r = 146 + n * 40 + g * 16 + centro * 18 - huella * 24 - borde * 44 + dash * huella;
      let gg = 128 + n * 34 + g * 14 + centro * 15 - huella * 20 - borde * 34 + dash * huella;
      let b = 101 + n * 26 + g * 11 + centro * 10 - huella * 15 - borde * 22 + dash * huella * 0.7;
      // humedad: los bordes tiran a frío orgánico, no a naranja
      b += borde * 6;
      const i = (y * tam + x) * 4;
      px[i] = Math.max(0, Math.min(255, r));
      px[i + 1] = Math.max(0, Math.min(255, gg));
      px[i + 2] = Math.max(0, Math.min(255, b));
      px[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // piedrecilla: clara y menuda, más densa hacia los bordes
  for (let i = 0; i < 640; i++) {
    const rx = h(i * 1.7, 3.1) * tam;
    const ry = h(i * 2.9, 7.7) * tam;
    const v = ry / tam;
    const borde = Math.min(1, Math.max(0, (Math.abs(v - 0.5) - 0.30) / 0.20));
    if (h(i * 5.3, 1.9) > 0.25 + borde * 0.62) continue;
    const rad = 0.7 + h(i * 3.3, 9.2) * 1.6;
    const claro = h(i * 7.1, 2.4) > 0.3;
    ctx.globalAlpha = 0.30 + h(i * 4.7, 5.5) * 0.25;
    ctx.fillStyle = claro ? '#d9cfb4' : '#4e4130';
    ctx.beginPath();
    ctx.ellipse(rx, ry, rad, rad * (0.55 + h(i, i) * 0.4), h(i * 9.1, 0.3) * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // vetas húmedas finas a lo largo
  ctx.globalAlpha = 0.14;
  ctx.strokeStyle = '#41372a';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 9; i++) {
    const y = h(i * 3.7, 8.8) * tam;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(tam * 0.3, y + (h(i, 1) - 0.5) * 26, tam * 0.7, y + (h(i, 2) - 0.5) * 26, tam, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16; // la cámara ve la pista siempre en rasante: sin esto el grano se licúa
  TEX_TIERRA = tex;
  return tex;
}

// posiciones laterales del perfil (fracción del semiancho) y su papel
const PERFIL_T = [-1, -0.68, -0.42, 0, 0.42, 0.68, 1];

// relieve transversal: bombeo al centro + surco en cada huella
function relieve(t) {
  const surco = Math.exp(-Math.pow((Math.abs(t) - 0.42) / 0.14, 2));
  return 0.05 * (1 - t * t) - 0.062 * surco;
}

export function crearCintaPista(THREE, pista, opts = {}) {
  const grupo = new THREE.Group();
  grupo.name = 'cinta-pista';

  // ── anillos a lo largo de la vuelta ────────────────────────────────────────
  const nAnillos = Math.max(560, Math.floor(pista.n / 4.3));
  const rings = [];
  let dist = 0;
  let prevCx = 0, prevCz = 0;
  for (let i = 0; i < nAnillos; i++) {
    const f = i / nAnillos;
    const p = pista.puntoEn(f);
    const pa = pista.puntoEn((f - 1 / nAnillos + 1) % 1);
    const pb = pista.puntoEn((f + 1 / nAnillos) % 1);
    const tx = pb.x - pa.x, tz = pb.z - pa.z;
    const tl = Math.hypot(tx, tz) || 1;
    const rx = tz / tl, rz = -tx / tl; // derecha del sentido de marcha
    const ruido = hash01(p.x * 0.033 + i * 0.011, p.z * 0.033 - i * 0.009);
    const half = Math.max(4.2, p.w * (0.62 + (ruido - 0.5) * 0.05));
    // bordes irregulares e independientes por lado (comidos por el pasto)
    const wL = half * (1 + (hash01(p.x * 0.11, p.z * 0.09) - 0.5) * 0.11);
    const wR = half * (1 + (hash01(p.z * 0.11 + 11.3, p.x * 0.09 - 7.4) - 0.5) * 0.11);
    const xC = p.x, zC = p.z;
    if (i > 0) dist += Math.hypot(xC - prevCx, zC - prevCz);
    prevCx = xC; prevCz = zC;
    rings.push({
      xC, zC, rx, rz, half, wL, wR, p, ruido,
      dist,
      // compat con las moras de entorno.js (usan half/rx/rz/xC/zC/u)
      u: dist * 0.26,
    });
  }
  const largoTotal = dist + Math.hypot(rings[0].xC - prevCx, rings[0].zC - prevCz);
  // costura invisible: la vuelta completa cae en un número entero de repeats
  const repMetros = 6.8; // una repetición de textura cada ~7 m
  const repeats = Math.max(4, Math.round(largoTotal / repMetros));
  const uPorMetro = repeats / largoTotal;

  // ── malla de la cinta: 7 vértices por anillo + fila de cierre duplicada ────
  const nCols = PERFIL_T.length;
  const filas = nAnillos + 1; // la última repite el anillo 0 con u entero
  const pos = new Float32Array(filas * nCols * 3);
  const uv = new Float32Array(filas * nCols * 2);
  const colr = new Float32Array(filas * nCols * 3);
  const idx = [];
  const cCentro = new THREE.Color(0xc6b28c);   // tierra pisada, seca por encima
  const cHuella = new THREE.Color(0x8f7857);   // huella: compacta, más honda y húmeda
  const cMedio = new THREE.Color(0xb29a72);
  const cBorde = new THREE.Color(0x69573d);    // borde húmedo, oscuro
  const cPasto = new THREE.Color(0x5f6f45);    // pasto que se come el borde
  if (opts.paleta) {
    // otros mundos (chorrera: lecho de piedra mojada) traen su propia paleta
    cCentro.setHex(opts.paleta.centro);
    cHuella.setHex(opts.paleta.huella);
    cMedio.setHex(opts.paleta.medio);
    cBorde.setHex(opts.paleta.borde);
    cPasto.setHex(opts.paleta.pasto);
  }
  const tmp = new THREE.Color();
  for (let fi = 0; fi < filas; fi++) {
    const i = fi % nAnillos;
    const r = rings[i];
    const uAqui = (fi === nAnillos ? largoTotal : r.dist) * uPorMetro;
    for (let c = 0; c < nCols; c++) {
      const t = PERFIL_T[c];
      const semi = t < 0 ? r.wL : r.wR;
      const lat = t * semi;
      const x = r.xC + r.rx * lat;
      const z = r.zC + r.rz * lat;
      // peralte idéntico al del heightfield + relieve propio de la cinta.
      // OJO con el signo: el heightfield mide lat con el vector (centro - punto),
      // así que su lat es -t·semi respecto al nuestro. Con el signo al derecho la
      // banda vieja divergía hasta 0.7 m del suelo en las curvas peraltadas.
      let y = r.p.y - lat * r.p.banco + 0.06 + relieve(t);
      if (Math.abs(t) === 1) y -= 0.14; // el borde se mete bajo el pasto: sin filo flotante
      const k = fi * nCols + c;
      pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
      uv[k * 2] = uAqui; uv[k * 2 + 1] = (t + 1) / 2;
      // color por vértice: zonas anchas del material
      const jit = 1 + (hash01(x * 0.31, z * 0.27) - 0.5) * 0.13;
      if (t === 0) tmp.copy(cCentro);
      else if (Math.abs(t) === 0.42) tmp.copy(cHuella);
      else if (Math.abs(t) === 0.68) tmp.copy(cMedio);
      else {
        // borde: mezcla irregular con el pasto, distinta en cada lado
        tmp.copy(cBorde).lerp(cPasto, hash01(x * 0.17, z * 0.19) * 0.55);
      }
      colr[k * 3] = Math.min(1, tmp.r * jit);
      colr[k * 3 + 1] = Math.min(1, tmp.g * jit);
      colr[k * 3 + 2] = Math.min(1, tmp.b * jit);
    }
  }
  for (let fi = 0; fi < nAnillos; fi++) {
    for (let c = 0; c < nCols - 1; c++) {
      const a = fi * nCols + c;
      const b = (fi + 1) * nCols + c;
      // winding con la normal HACIA ARRIBA: con (a, a+1, b+1) la banda quedaba
      // mirando al suelo y el backface-culling la desaparecía entera — el mismo
      // "kart sobre pasto pelado" que ya se reportó una vez. La banda vieja
      // tenía el mismo winding y solo se veía por side: DoubleSide.
      idx.push(a, b + 1, a + 1, a, b, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // la fila duplicada promedia normales distintas: copiar las del anillo 0
  // para que la luz no marque la costura
  const nor = geo.attributes.normal;
  for (let c = 0; c < nCols; c++) {
    const a = c, b = nAnillos * nCols + c;
    const nx = (nor.getX(a) + nor.getX(b)) * 0.5;
    const ny = (nor.getY(a) + nor.getY(b)) * 0.5;
    const nz = (nor.getZ(a) + nor.getZ(b)) * 0.5;
    nor.setXYZ(a, nx, ny, nz);
    nor.setXYZ(b, nx, ny, nz);
  }
  geo.computeBoundingSphere();
  const mat = new THREE.MeshStandardMaterial({
    map: crearTexturaTierra(THREE),
    vertexColors: true,
    roughness: 0.97,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const cinta = new THREE.Mesh(geo, mat);
  cinta.name = 'ruta';
  cinta.receiveShadow = true;
  grupo.add(cinta);

  // ── postes de cerca con alambre que sigue la curva ─────────────────────────
  // (opts.cerca === false los omite: ninguna finca alambra una cascada)
  const m4 = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const eul = new THREE.Euler();
  const esc = new THREE.Vector3();
  const posv = new THREE.Vector3();
  let nP = 0;
  if (opts.cerca !== false) {
  const pasoPoste = 7; // un poste cada ~16 m; los vanos ya no cortan el paisaje
  const nPostesLado = Math.ceil(nAnillos / pasoPoste);
  const posteGeo = new THREE.BoxGeometry(0.14, 1.25, 0.14);
  const posteMat = new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 0.95, metalness: 0 });
  const posteInst = new THREE.InstancedMesh(posteGeo, posteMat, nPostesLado * 2);
  const topes = [[], []]; // alturas de poste por lado, para colgar el alambre
  for (let i = 0; i < nAnillos; i += pasoPoste) {
    const r = rings[i];
    for (let lado = 0; lado < 2; lado++) {
      const s = lado === 0 ? -1 : 1;
      const off = (s < 0 ? r.wL : r.wR) + 1.35 + (hash01(r.xC * 0.09 + lado, r.zC * 0.09) - 0.5) * 0.5;
      const x = r.xC + r.rx * off * s;
      const z = r.zC + r.rz * off * s;
      const y = pista.alturaMundo(x, z);
      eul.set(
        (hash01(x * 1.7, z * 1.3) - 0.5) * 0.12,
        Math.atan2(r.rz, r.rx) + Math.PI / 2,
        (hash01(z * 1.9, x * 1.1) - 0.5) * 0.12
      );
      quat.setFromEuler(eul);
      const hj = 0.92 + hash01(x, z) * 0.24;
      esc.set(1, hj, 1);
      posv.set(x, y + 0.62 * hj, z);
      m4.compose(posv, quat, esc);
      posteInst.setMatrixAt(nP++, m4);
      topes[lado].push({ i, x, z, y: y + 1.18 * hj });
    }
  }
  posteInst.count = nP;
  posteInst.instanceMatrix.needsUpdate = true;
  grupo.add(posteInst);

  // alambre: polilínea que pasa por cada 2º anillo, con comba entre postes
  const alambreMat = new THREE.LineBasicMaterial({ color: 0x4a4034, transparent: true, opacity: 0.85 });
  for (let lado = 0; lado < 2; lado++) {
    const s = lado === 0 ? -1 : 1;
    const pts = [];
    for (let i = 0; i <= nAnillos; i += 2) {
      const r = rings[i % nAnillos];
      const off = (s < 0 ? r.wL : r.wR) + 1.35 + (hash01(r.xC * 0.09 + lado, r.zC * 0.09) - 0.5) * 0.5;
      const x = r.xC + r.rx * off * s;
      const z = r.zC + r.rz * off * s;
      const frac = (i % pasoPoste) / pasoPoste;
      const comba = -0.12 * Math.sin(Math.PI * frac);
      pts.push(new THREE.Vector3(x, pista.alturaMundo(x, z) + 1.06 + comba, z));
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    grupo.add(new THREE.Line(g, alambreMat));
  }
  } // fin opts.cerca

  // ── piedras encaladas marcando las curvas ──────────────────────────────────
  const encaladaGeo = new THREE.DodecahedronGeometry(0.3, 0);
  const encaladaMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
  const maxEncaladas = 168;
  const encaladaInst = new THREE.InstancedMesh(encaladaGeo, encaladaMat, maxEncaladas);
  let nE = 0;
  const cLima = new THREE.Color();
  // curvatura media del anillo (muestreada de la pista)
  const curvaEn = (i) => pista.CUR[Math.floor((i / nAnillos) * pista.n) % pista.n];
  for (let i = 0; i < nAnillos && nE < maxEncaladas; i += 3) {
    const cur = curvaEn(i);
    if (Math.abs(cur) < 0.008) continue; // solo curvas de verdad
    const r = rings[i];
    const s = cur > 0 ? 1 : -1; // exterior de la curva
    const off = (s < 0 ? r.wL : r.wR) + 0.55 + (hash01(r.xC * 0.7, r.zC * 0.7) - 0.5) * 0.3;
    const x = r.xC + r.rx * off * s;
    const z = r.zC + r.rz * off * s;
    const y = pista.alturaMundo(x, z) - 0.07; // medio enterradas
    eul.set(0, hash01(x, z) * Math.PI * 2, (hash01(z, x) - 0.5) * 0.2);
    quat.setFromEuler(eul);
    const e = 0.75 + hash01(x * 3.1, z * 2.7) * 0.6;
    esc.set(e, e * 0.72, e * 0.9);
    posv.set(x, y, z);
    m4.compose(posv, quat, esc);
    encaladaInst.setMatrixAt(nE, m4);
    // cal blanca con algo de mugre, cada piedra distinta (o la del mundo)
    cLima.setHex(opts.paleta?.encalada ?? 0xe8e2d2).multiplyScalar(0.9 + hash01(x * 5.1, z * 4.3) * 0.14);
    encaladaInst.setColorAt(nE, cLima);
    nE++;
  }
  encaladaInst.count = nE;
  encaladaInst.instanceMatrix.needsUpdate = true;
  if (encaladaInst.instanceColor) encaladaInst.instanceColor.needsUpdate = true;
  grupo.add(encaladaInst);

  // ── piedrecilla suelta sobre la banda (hacia los bordes) ───────────────────
  const gravaGeo = new THREE.TetrahedronGeometry(1, 0);
  const gravaMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.98, metalness: 0 });
  const nGrava = 260;
  const gravaInst = new THREE.InstancedMesh(gravaGeo, gravaMat, nGrava);
  const cGrava = new THREE.Color();
  for (let g = 0; g < nGrava; g++) {
    const i = Math.floor(hash01(g * 3.7, 1.9) * nAnillos);
    const r = rings[i];
    const s = hash01(g * 1.3, 7.7) < 0.5 ? -1 : 1;
    const t = 0.55 + hash01(g * 2.9, 3.3) * 0.38; // cerca del borde, no en la huella
    const semi = s < 0 ? r.wL : r.wR;
    const lat = t * semi * s;
    const x = r.xC + r.rx * lat;
    const z = r.zC + r.rz * lat;
    const y = r.p.y - lat * r.p.banco + 0.06 + relieve(t * s) + 0.015;
    eul.set(hash01(x, g) * Math.PI, hash01(g, z) * Math.PI, 0);
    quat.setFromEuler(eul);
    const e = 0.05 + hash01(x * 7.7, z * 5.1) * 0.075;
    esc.set(e, e * 0.8, e);
    posv.set(x, y, z);
    m4.compose(posv, quat, esc);
    gravaInst.setMatrixAt(g, m4);
    const claro = hash01(g * 9.1, 2.2);
    cGrava.setHex(claro > 0.45
      ? (opts.paleta?.gravaClara ?? 0xd8cdb0)
      : (opts.paleta?.gravaOscura ?? 0x8a7355)).multiplyScalar(0.85 + claro * 0.3);
    gravaInst.setColorAt(g, cGrava);
  }
  gravaInst.instanceMatrix.needsUpdate = true;
  if (gravaInst.instanceColor) gravaInst.instanceColor.needsUpdate = true;
  grupo.add(gravaInst);

  const stats = {
    anillos: nAnillos,
    trisCinta: nAnillos * (nCols - 1) * 2,
    postes: nP,
    encaladas: nE,
    grava: nGrava,
  };
  return { grupo, rings, stats };
}
