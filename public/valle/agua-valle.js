// ── Agua definitiva del valle ───────────────────────────────────────────────
// La entrada `agua-quebrada-chorrera.html` es la referencia visual aprobada:
// `lib3d/fx/aguaParamo.js` dibuja la quebrada y la chorrera sin física.
// Este adaptador sólo le entrega la geografía real del valle y excava la malla
// anfitriona; la apariencia vive en el módulo canónico, no aquí.
import * as THREE from 'three';
import { height, channelAxis } from './terrain.js';
import { facePos, pathX, T_NACE } from './cliff.js';
import {
  crearQuebrada,
  crearChorrera,
  crearHelechosRibera,
  crearGeometriaPiedraEsculpida,
} from './lib3d/fx/aguaParamo.js';
import { crearBrumaVolumetrica } from './lib3d/fx/brumaVolumetrica.js';

const PIE_T = 0.12;

// ── EL POZO CRISTALINO (la MEJOR agua que teníamos y que nunca se había
// puesto en ESTA cascada): cáusticas tipo navis, dos redes refractadas,
// móviles pero suaves, más ondas concéntricas del golpe y espuma viva.
// El agua permanece separada de la ubicación de la cascada: este plano solo
// acompaña el pie real y conserva la lectura aprobada de la poza.
const POZO_VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const POZO_FRAG = /* glsl */`
  uniform float uTime;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
  }
  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    vec2 foco = vec2(0.0, 0.30);
    float df = length(p - foco) * 2.0;
    vec3 col = mix(vec3(0.07, 0.17, 0.16), vec3(0.20, 0.34, 0.30), smoothstep(0.15, 1.0, r));
    float rip = sin(df * 20.0 - uTime * 2.4) * 0.5 + 0.5;
    col += vec3(0.10, 0.12, 0.12) * rip * exp(-df * 1.8);
    float ca1 = noise(p * 15.0 + vec2(uTime * 0.35, -uTime * 0.22));
    float ca2 = noise(p * 27.0 + vec2(-uTime * 0.18, uTime * 0.31));
    float caust = smoothstep(0.60, 0.86, ca1 * 0.62 + ca2 * 0.38) * (1.0 - smoothstep(0.72, 1.0, r));
    col += vec3(0.20, 0.35, 0.30) * caust * 0.42;
    float nf = noise(vec2(df * 5.0 - uTime * 0.7, atan(p.y - foco.y, p.x - foco.x) * 1.6 + uTime * 0.15));
    float foam = smoothstep(0.62, 0.10, df) * (0.50 + 0.50 * nf);
    foam = max(foam, smoothstep(0.80, 0.97, rip) * exp(-df * 1.4) * 0.55);
    col = mix(col, vec3(1.02, 1.02, 0.98), clamp(foam, 0.0, 1.0));
    float alpha = (1.0 - smoothstep(0.80, 1.0, r)) * 0.92;
    gl_FragColor = vec4(col, alpha);
  }
`;

function excavarQuebrada(scene, quebrada, limites = null) {
  const prof = quebrada?.profundidadEn;
  if (!prof) return;

  let terreno = null;
  scene.traverse((o) => {
    if (!terreno && o.isMesh && o.geometry?.attributes?.position
        && o.geometry.attributes.position.count > 50000) terreno = o;
  });
  if (!terreno) return;

  const pos = terreno.geometry.attributes.position;
  const arr = pos.array;
  for (let i = 0; i < arr.length; i += 3) {
    const x = arr[i], z = arr[i + 2];
    // La quebrada corre aguas abajo de La Chorrera; este margen evita revisar
    // la malla completa y deja intactas las otras laderas del mundo anfitrión.
    const x0 = limites?.x0 ?? -190, x1 = limites?.x1 ?? 190;
    const z0 = limites?.z0 ?? -900, z1 = limites?.z1 ?? 360;
    if (z < z0 || z > z1 || x < x0 || x > x1) continue;
    const zanja = prof(x, z);
    if (zanja > 0.001) arr[i + 1] -= zanja;
  }
  pos.needsUpdate = true;
  terreno.geometry.computeVertexNormals();
}

function materialesDe(grupo) {
  const mats = [];
  grupo.traverse((o) => {
    const material = o.material;
    if (Array.isArray(material)) {
      for (const m of material) if (m && !mats.includes(m)) mats.push(m);
    } else if (material && !mats.includes(material)) mats.push(material);
  });
  return mats;
}

function kartPoint(pista, f, lateral = 0) {
  const q = pista.puntoEn(f);
  const nx = Math.sin(q.hdg), nz = -Math.cos(q.hdg);
  return { q, x: q.x + nx * lateral, z: q.z + nz * lateral };
}

// ── la carpa azul del dron: el elemento de ESCALA (minúscula contra el muro) ─
function crearCarpaAzul(escala = 1) {
  const carpa = new THREE.Group();
  const lona = new THREE.Mesh(
    new THREE.ConeGeometry(3.4, 3.1, 4),
    new THREE.MeshStandardMaterial({ color: 0x2f79d1, roughness: 0.72, flatShading: true }),
  );
  lona.rotation.y = Math.PI / 4;
  lona.position.y = 1.55;
  carpa.add(lona);
  const piso = new THREE.Mesh(
    new THREE.CylinderGeometry(3.1, 3.3, 0.3, 10),
    new THREE.MeshStandardMaterial({ color: 0x54617a, roughness: 0.95, flatShading: true }),
  );
  piso.position.y = 0.12;
  carpa.add(piso);
  carpa.scale.setScalar(escala);
  return carpa;
}

// ── poza de ROCA (el pie del dron es un pedrero, no un borde limpio) ────────
function sembrarRocas(pista, { cx, cz, n = 22, r0 = 3, r1 = 13, seed = 1, escala = 1.5 }) {
  const rn = (() => {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
  const geo = crearGeometriaPiedraEsculpida(THREE, { seed });
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.98, metalness: 0.02 });
  const rocas = new THREE.InstancedMesh(geo, mat, n);
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e3 = new THREE.Euler();
  const v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  const oscura = new THREE.Color(0x2c3530), clara = new THREE.Color(0x707b71);
  const cTmp = new THREE.Color();
  for (let k = 0; k < n; k++) {
    const ang = rn() * Math.PI * 2;
    const rad = r0 + Math.pow(rn(), 0.7) * (r1 - r0);
    const x = cx + Math.cos(ang) * rad;
    const z = cz + Math.sin(ang) * rad * 0.8;
    const esc = escala * (0.45 + rn() * 1.1);
    e3.set(rn() * 0.9, rn() * Math.PI * 2, rn() * 0.8);
    q4.setFromEuler(e3);
    m4.compose(
      v3.set(x, pista.alturaMundo(x, z) - esc * 0.10, z),
      q4,
      s3.set(esc * (0.9 + rn() * 0.5), esc * (0.55 + rn() * 0.3), esc * (0.8 + rn() * 0.4)),
    );
    rocas.setMatrixAt(k, m4);
    cTmp.copy(oscura).lerp(clara, rn() * 0.85);
    rocas.setColorAt(k, cTmp);
  }
  if (rocas.instanceColor) rocas.instanceColor.needsUpdate = true;
  rocas.computeBoundingSphere();
  rocas.receiveShadow = true;
  return rocas;
}

function makeKartWaterfalls(scene, { pista, seed = 20260811 } = {}) {
  // ── EL DESCENSO DE LA CHORRERA (mundo kart) ───────────────────────────────
  // La vuelta entera baja por siete beats del video del dron. Cada beat es
  // una caída real de aguaParamo (la pieza que ganó el A/B) con su poza; los
  // tramos entre beats llevan el riachuelo (crearQuebrada) que el kart
  // acompaña — y a ratos pisa. Nada de cascada de cubos: TODO sale del
  // módulo canónico. Las posiciones se leen de la geometría viva de la pista
  // (pista.chorreraBeats / chorreraPozas), no de números duros.
  const sol = new THREE.Vector3(0.35, 0.72, -0.52).normalize();
  // las caras RECOSTADAS (muros) doraban con el glint del sol: luz de nublado
  const solMuro = new THREE.Vector3(-0.35, 0.25, 0.52).normalize();
  const grupo = new THREE.Group();
  grupo.name = 'chorrera-kart-descenso';
  const ticks = [];
  const pozasNavis = [];
  const anclasBruma = [];

  // Cada caída: fA=labio, fB=pie, lado del canal, ancho, saltos, calidad.
  // El agua corre a un costado del lecho jugable y salta por la misma repisa
  // que el kart (en el video la línea del agua ES la línea del kart).
  // fA→fB = EXACTAMENTE el acantilado del perfil (NODOS de descenso-chorrera):
  // con tramos anchos el velo quedaba tendido casi horizontal y se leía como
  // sábanas de papel blanco, no como agua cayendo.
  // `muro`: la caída CONTINÚA por encima del labio jugable — un velo hermano
  // baja por la pared de la garganta hasta la repisa (reencargo "como el
  // dron": el agua viene de lo ALTO, el kart corre pegado al muro de agua).
  const CAIDAS = [
    { fA: 0.0815, fB: 0.0850, lado: -1, ancho: 3.6, saltos: 1, cal: 'baja', gotas: 24, pozo: 2.6, muro: 1 },   // beat 1
    { fA: 0.1315, fB: 0.1350, lado: 1, ancho: 3.2, saltos: 1, cal: 'baja', gotas: 20, pozo: 2.2, muro: 1 },    // beat 2a
    { fA: 0.1545, fB: 0.1580, lado: 1, ancho: 3.4, saltos: 1, cal: 'baja', gotas: 20, pozo: 2.4 },             // beat 2b
    { fA: 0.2065, fB: 0.2110, lado: -1, ancho: 8.0, saltos: 2, cal: 'alta', gotas: 72, pozo: 3.0, muro: 1 },   // beat 3 — GRAN SALTO
    { fA: 0.2665, fB: 0.2700, lado: 1, ancho: 3.4, saltos: 1, cal: 'baja', gotas: 24, pozo: 2.5, muro: 1 },    // beat 4
    { fA: 0.3165, fB: 0.3200, lado: -1, ancho: 3.4, saltos: 1, cal: 'baja', gotas: 24, pozo: 2.5, muro: 1 },   // beat 5
    { fA: 0.4000, fB: 0.4040, lado: 1, ancho: 2.6, saltos: 1, cal: 'baja', gotas: 16, pozo: 1.8 },     // diag 1
    { fA: 0.4360, fB: 0.4400, lado: 1, ancho: 2.6, saltos: 1, cal: 'baja', gotas: 16, pozo: 1.8 },     // diag 2
    { fA: 0.4885, fB: 0.4930, lado: -1, ancho: 12.5, saltos: 1, cal: 'alta', gotas: 88, pozo: 4.2, anchoFinal: 1.25, muro: 1 }, // beat 7 — CLÍMAX ANCHO
  ];

  let iCaida = 0;
  for (const c of CAIDAS) {
    iCaida++;
    const off = (c.lado ?? 1) * 0.5; // fracción del ancho de vía hacia el costado
    const top = kartPoint(pista, c.fA, 0);
    const bot = kartPoint(pista, c.fB, 0);
    const offTop = kartPoint(pista, c.fA, top.q.w * off);
    const offBot = kartPoint(pista, c.fB, bot.q.w * off);
    const yTop = top.q.y;
    const yBot = bot.q.y;
    const alto = Math.max(2.5, yTop - yBot);
    const caraEn = (t) => ({
      x: offBot.x + (offTop.x - offBot.x) * t,
      z: offBot.z + (offTop.z - offBot.z) * t,
    });
    const caida = crearChorrera(THREE, {
      alto,
      ancho: c.ancho,
      saltos: c.saltos,
      deriva: 0,
      caraEn,
      pozo: c.pozo,
      gotas: c.gotas,
      calidad: c.cal,
      anchoFinal: c.anchoFinal ?? 0.9,
      seed: seed + 3 + iCaida * 17,
      solDir: sol,
    });
    caida.grupo.position.y = yBot;
    caida.grupo.name = `chorrera-caida-${iCaida}`;
    grupo.add(caida.grupo);
    ticks.push(caida);
    if (c.cal === 'alta') {
      for (const a of caida.anclasBruma) {
        anclasBruma.push({ x: a.x, y: yBot + a.y - 0.4, z: a.z });
      }
    }

    // ── EL MURO DE AGUA: la caída sigue POR ENCIMA del labio ────────────────
    // En el video del dron cada escalón jugable es solo el tramo bajo de un
    // sistema vertical mucho más alto: el velo hermano baja por la cara de la
    // pared de la garganta y golpea la repisa donde arranca la caída jugable.
    if (c.muro) {
      const lado = c.lado ?? 1;
      const latRepisa = top.q.w * 0.62 + 1.2;
      const repisa = kartPoint(pista, c.fA, lado * latRepisa);
      const latCeja = top.q.w + 20;
      const ceja = kartPoint(pista, c.fA, lado * latCeja);
      const yCeja = pista.alturaMundo(ceja.x, ceja.z);
      const altoMuro = Math.min(46, yCeja - yTop - 1.0);
      if (altoMuro > 7) {
        // el velo se recuesta contra la falda real de la pared (t=1 arriba):
        // sin el lean quedaba una columna flotando delante del monte
        const lean = Math.min((latCeja - latRepisa) * 0.92, altoMuro * 0.85);
        const alta = c.cal === 'alta';
        const muroCaida = crearChorrera(THREE, {
          alto: altoMuro,
          ancho: c.ancho * 0.82,
          saltos: altoMuro > 24 ? 2 : 1,
          deriva: 0,
          caraEn: (t) => {
            // aguaParamo sondea t un pelo fuera de [0,1] (velo/lip): clamp o
            // Math.pow(t<0, 1.35) = NaN y la geometría revienta
            const tc = Math.min(1, Math.max(0, t));
            return {
              x: 0,
              z: Math.sin(tc * Math.PI) * altoMuro * 0.02
                + (1 - tc) * altoMuro * 0.03
                - Math.pow(tc, 1.35) * lean,
            };
          },
          pozo: Math.max(1.6, c.pozo * 0.7),
          gotas: alta ? 30 : 10,
          calidad: alta ? 'media' : 'baja',
          anchoFinal: 0.95,
          seed: seed + 91 + iCaida * 29,
          solDir: solMuro,
        });
        // rotar para que el velo mire de la pared hacia la vía
        muroCaida.grupo.position.set(repisa.x, yTop + 0.15, repisa.z);
        muroCaida.grupo.rotation.y = Math.atan2(top.x - ceja.x, top.z - ceja.z);
        muroCaida.grupo.name = `chorrera-muro-${iCaida}`;
        grupo.add(muroCaida.grupo);
        ticks.push(muroCaida);
        if (alta) anclasBruma.push({ x: repisa.x, y: yTop + 1.4, z: repisa.z });
      }
    }
  }

  // ── pozas navis (cáusticas aprobadas) en cada aterrizaje ──────────────────
  const poolMat = new THREE.ShaderMaterial({
    vertexShader: POZO_VERT,
    fragmentShader: POZO_FRAG,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
  });
  const pozas = pista.chorreraPozas ?? [];
  for (const p of pozas) {
    const centro = kartPoint(pista, p.f, 0);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 26), poolMat);
    pool.geometry.rotateX(-Math.PI / 2);
    pool.name = `chorrera-poza-navis-f${p.f}`;
    pool.scale.set(p.r * 1.25, 1, p.r);
    pool.rotation.y = centro.q.hdg;
    pool.position.set(centro.x, pista.alturaMundo(centro.x, centro.z) + 0.12, centro.z);
    pool.renderOrder = 24;
    grupo.add(pool);
    pozasNavis.push(pool);
  }

  // ═══ LA MADRE: la catarata del dron (f_12), EL SUJETO del mundo ═══════════
  // En el clímax (f≈0.4885) el jugador mira de frente al remate del valle: ahí
  // se para un farallón de ~115 m con UNA columna de agua que se desploma a
  // una poza de pedrero junto a la vía (f≈0.57 dobla por su pie). Desde la
  // diagonal, el salto del clímax, la gran poza y todo el arranque del valle,
  // el muro vertical de agua DOMINA el encuadre — como en el video.
  let madre = null;
  {
    const eje = kartPoint(pista, 0.4885, 0);
    const fwd = { x: Math.cos(eje.q.hdg), z: Math.sin(eje.q.hdg) };
    const A = { x: fwd.z, z: -fwd.x }; // eje transversal del farallón
    const pozaM = { x: eje.x + fwd.x * 124, z: eje.z + fwd.z * 124 };
    const origenCaida = { x: eje.x + fwd.x * 132, z: eje.z + fwd.z * 132 };
    const C = { x: eje.x + fwd.x * 137, z: eje.z + fwd.z * 137 };
    const yPie = pista.alturaMundo(pozaM.x, pozaM.z);
    const yTopM = 119;
    const yBaseM = Math.min(
      yPie,
      pista.alturaMundo(C.x - A.x * 30, C.z - A.z * 30),
      pista.alturaMundo(C.x + A.x * 30, C.z + A.z * 30),
    ) - 5;

    // — el farallón (matte de roca húmeda: anfiteatro cóncavo, ceja irregular)
    const NXW = 24, NYW = 12, halfW = 38;
    const pos = [], colArr = [], idx = [];
    const cRoca1 = new THREE.Color(0x181f1b), cRoca2 = new THREE.Color(0x2c362f);
    const cVeta = new THREE.Color(0x6f7d74), cMusgo = new THREE.Color(0x2e4c2e);
    const cBruma = new THREE.Color(0x8ba393), cHumedo = new THREE.Color(0x151b18);
    const cTmp = new THREE.Color();
    const hachi = (a, b) => {
      const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
      return h - Math.floor(h);
    };
    for (let iy = 0; iy <= NYW; iy++) {
      const v = iy / NYW;
      for (let ix = 0; ix <= NXW; ix++) {
        const u = ix / NXW;
        const s = u * 2 - 1;
        const along = s * halfW;
        const bulge = 9 * s * s; // los extremos abrazan hacia el espectador
        let y = yBaseM + (yTopM - yBaseM) * v;
        if (iy === NYW) y += (hachi(ix * 3.7, 1.3) - 0.55) * 11; // ceja rota
        if (iy === NYW - 1) y += (hachi(ix * 2.9, 7.7) - 0.5) * 4;
        const relieve = (hachi(ix * 1.7, iy * 2.3) - 0.5) * 3.0;
        pos.push(
          C.x + A.x * along - fwd.x * (bulge + relieve),
          y,
          C.z + A.z * along - fwd.z * (bulge + relieve),
        );
        // color: roca húmeda con vetas, musgo a los flancos, bruma hacia lo alto
        const n1 = hachi(ix * 0.9, iy * 1.7), n2 = hachi(ix * 2.3 + 5, iy * 0.8);
        cTmp.copy(cRoca1).lerp(cRoca2, n1);
        if (Math.abs(s) < 0.2) cTmp.lerp(cVeta, (0.2 - Math.abs(s)) / 0.2 * 0.3 * n2);
        if (n2 > 0.58 && Math.abs(s) > 0.25) cTmp.lerp(cMusgo, (n2 - 0.58) * 1.4);
        if (v < 0.12) cTmp.lerp(cHumedo, 0.5);
        if (v > 0.55) cTmp.lerp(cBruma, (v - 0.55) / 0.45 * 0.3);
        colArr.push(cTmp.r, cTmp.g, cTmp.b);
        if (iy > 0 && ix > 0) {
          const b = iy * (NXW + 1) + ix, a = b - (NXW + 1);
          idx.push(a - 1, b - 1, a, a, b - 1, b);
        }
      }
    }
    const geoM = new THREE.BufferGeometry();
    geoM.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geoM.setAttribute('color', new THREE.Float32BufferAttribute(colArr, 3));
    geoM.setIndex(idx);
    geoM.computeVertexNormals();
    const farallon = new THREE.Mesh(geoM, new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide,
    }));
    farallon.name = 'chorrera-madre-farallon';
    farallon.receiveShadow = true;
    grupo.add(farallon);

    // — la columna de agua (una sola pieza monumental, calidad alta)
    const altoM = yTopM - 3 - yPie;
    const caidaM = crearChorrera(THREE, {
      alto: altoM,
      ancho: 17.5,
      saltos: 2,
      cortes: [1, 0.34, 0],
      deriva: 0,
      pozo: 6.5,
      gotas: 72,
      calidad: 'media',
      anchoFinal: 1.1,
      seed: seed + 977,
      solDir: sol,
    });
    caidaM.grupo.position.set(origenCaida.x, yPie + 0.1, origenCaida.z);
    caidaM.grupo.rotation.y = Math.atan2(-fwd.x, -fwd.z);
    caidaM.grupo.name = 'chorrera-madre-caida';
    grupo.add(caidaM.grupo);
    ticks.push(caidaM);

    // — poza de pedrero + lámina navis + carpa minúscula (la escala del dron)
    const rocasM = sembrarRocas(pista, {
      cx: pozaM.x, cz: pozaM.z, n: 30, r0: 3.5, r1: 15, seed: seed + 31, escala: 1.7,
    });
    rocasM.name = 'chorrera-madre-pedrero';
    grupo.add(rocasM);
    const pozaMesh = new THREE.Mesh(new THREE.CircleGeometry(1, 26), poolMat);
    pozaMesh.geometry.rotateX(-Math.PI / 2);
    pozaMesh.name = 'chorrera-madre-poza';
    pozaMesh.scale.set(9.5, 1, 7.5);
    pozaMesh.rotation.y = Math.atan2(fwd.z, fwd.x);
    pozaMesh.position.set(pozaM.x, yPie + 0.14, pozaM.z);
    pozaMesh.renderOrder = 24;
    grupo.add(pozaMesh);
    pozasNavis.push(pozaMesh);
    const carpaM = crearCarpaAzul(0.8);
    const carpaMx = pozaM.x - fwd.x * 9 + A.x * 10;
    const carpaMz = pozaM.z - fwd.z * 9 + A.z * 10;
    carpaM.position.set(carpaMx, pista.alturaMundo(carpaMx, carpaMz), carpaMz);
    carpaM.rotation.y = eje.q.hdg;
    carpaM.name = 'chorrera-madre-carpa';
    grupo.add(carpaM);

    // — bruma del impacto: la base de la madre respira (como el pie del dron)
    const ryM = Math.atan2(-fwd.x, -fwd.z);
    const cosM = Math.cos(ryM), sinM = Math.sin(ryM);
    for (const a of caidaM.anclasBruma) {
      // las anclas son LOCALES a un grupo rotado: rotarlas y trasladarlas
      anclasBruma.push({
        x: origenCaida.x + a.x * cosM + a.z * sinM,
        y: yPie + a.y - 0.4,
        z: origenCaida.z - a.x * sinM + a.z * cosM,
      });
    }
    anclasBruma.push(
      { x: pozaM.x, y: yPie + 3, z: pozaM.z },
      { x: pozaM.x, y: yPie + 10, z: pozaM.z },
      { x: origenCaida.x, y: yPie + 24, z: origenCaida.z },
    );
    madre = {
      cx: C.x, cz: C.z, yBase: yBaseM, yTop: yTopM,
      ax: A.x, az: A.z, nx: -fwd.x, nz: -fwd.z, halfW,
      pozaX: pozaM.x, pozaZ: pozaM.z,
    };
  }

  // — la GRAN POZA del clímax también es de roca (pedrero del dron)
  {
    const gp = kartPoint(pista, 0.508, 0);
    const rocasGP = sembrarRocas(pista, {
      cx: gp.x, cz: gp.z, n: 18, r0: 9, r1: 16, seed: seed + 57, escala: 1.25,
    });
    rocasGP.name = 'chorrera-granpoza-pedrero';
    grupo.add(rocasGP);
  }

  // ── el riachuelo: tramos entre beats (el kart lo acompaña y lo cruza) ─────
  // Cada tramo serpentea dentro del lecho: offsets laterales alternos.
  const TRAMOS = [
    { f0: 0.012, f1: 0.077, offs: [3.5, -2.5, 3.0, -2.0], piedras: 8, chispas: 22 },   // meseta
    { f0: 0.093, f1: 0.128, offs: [-3.0, 2.5, -2.5], piedras: 6, chispas: 16 },
    { f0: 0.166, f1: 0.202, offs: [3.0, -2.5, 3.0], piedras: 6, chispas: 16 },
    { f0: 0.221, f1: 0.262, offs: [-3.5, 3.0, -3.0], piedras: 8, chispas: 22 },        // sale del gran salto
    { f0: 0.279, f1: 0.312, offs: [3.0, -2.5], piedras: 5, chispas: 14 },
    { f0: 0.329, f1: 0.396, offs: [-3.0, 2.5, -2.5, 2.5], piedras: 8, chispas: 26 },
    { f0: 0.516, f1: 0.856, offs: [-4.0, 4.5, -4.0, 4.5, -3.5, 4.0, -4.5, 3.5], piedras: 22, chispas: 55 }, // valle de salida → portal
  ];
  const quebradas = [];
  let limites = null;
  let iTramo = 0;
  for (const t of TRAMOS) {
    iTramo++;
    const puntos = [];
    const largoTramo = Math.abs(t.f1 - t.f0) * pista.L;
    const nP = Math.max(4, t.offs.length + 2, Math.ceil(largoTramo / 26));
    // el riachuelo corre por UN costado del lecho (fuera de la cinta, que lo
    // taparía) y serpentea contra la pared; alterna de lado por tramo.
    const lado = iTramo % 2 === 0 ? 1 : -1;
    for (let k = 0; k < nP; k++) {
      const f = t.f0 + (t.f1 - t.f0) * (k / (nP - 1));
      const q = pista.puntoEn(f);
      const meandro = 0.86 + 0.18 * Math.sin(k * 1.9 + iTramo * 2.3);
      const lateral = lado * (q.w * 0.58 + 1.1) * meandro;
      const p = kartPoint(pista, f, lateral);
      puntos.push({ x: p.x, z: p.z });
    }
    const largo = Math.abs(t.f1 - t.f0) * pista.L;
    const quebrada = crearQuebrada(THREE, {
      puntos,
      // hundida bajo el suelo físico: la lámina queda DENTRO de la zanja
      // aunque los anillos LOD lejanos tallen la zanja a paso grueso
      alturaEn: (x, z) => pista.alturaMundo(x, z) - 0.42,
      ancho: iTramo === TRAMOS.length ? 3.8 : 2.9,
      hundir: 0.55,
      piedras: t.piedras,
      chispas: t.chispas,
      seed: seed + 7 + iTramo * 13,
      solDir: sol,
      muestras: Math.max(40, Math.min(220, Math.round(largo / 2.2))),
    });
    quebrada.grupo.name = `chorrera-riachuelo-${iTramo}`;
    grupo.add(quebrada.grupo);
    quebradas.push(quebrada);
    for (const p of puntos) {
      if (!limites) limites = { x0: p.x, x1: p.x, z0: p.z, z1: p.z };
      limites.x0 = Math.min(limites.x0, p.x - 20); limites.x1 = Math.max(limites.x1, p.x + 20);
      limites.z0 = Math.min(limites.z0, p.z - 20); limites.z1 = Math.max(limites.z1, p.z + 20);
    }
  }
  // La zanja visual NO se talla sobre la malla de la escena (el clipmap del
  // kart es de varios anillos y el traverse no la alcanzaba: el agua quedaba
  // enterrada y solo asomaban crestas blancas). El entorno construye su
  // terreno restando esta profundidad ANTES de armar el clipmap.
  const profundidadEn = (x, z) => {
    if (limites && (x < limites.x0 || x > limites.x1 || z < limites.z0 || z > limites.z1)) return 0;
    let d = 0;
    for (const q of quebradas) d = Math.max(d, q.profundidadEn?.(x, z) ?? 0);
    return d;
  };

  // helechos de ribera en los dos tramos héroe (gran salto y valle de salida)
  for (const [t, nH] of [[TRAMOS[3], 14], [TRAMOS[TRAMOS.length - 1], 26]]) {
    const puntos = [];
    for (let k = 0; k <= 5; k++) {
      const f = t.f0 + (t.f1 - t.f0) * (k / 5);
      const p = kartPoint(pista, f, 0);
      puntos.push({ x: p.x, z: p.z });
    }
    const helechos = crearHelechosRibera(THREE, {
      puntos,
      alturaEn: (x, z) => pista.alturaMundo(x, z),
      n: nH,
      seed: 977 + Math.round(t.f0 * 1000),
      aparte: 8,
    });
    grupo.add(helechos.grupo);
  }

  // ── LA CASCADA DEL PORTAL: el clímax monumental de la salida ──────────────
  // Corona la montaña del túnel y cae SOBRE la boca del portal: el velo que
  // el kart atraviesa al reiniciar la vuelta (paso mágico New Donk). Se ve
  // venir durante todo el valle del riachuelo, como la caída final del video.
  const fPortal = pista.chorreraPortal?.f ?? 0.868;
  const pPort = kartPoint(pista, fPortal, 0);
  const dirX = Math.cos(pPort.q.hdg), dirZ = Math.sin(pPort.q.hdg);
  // La montaña del túnel sube en risco justo detrás del arco (el heightfield
  // salta de ~5 m a ~29 m entre front+6 y front+12): el velo cae por ESA cara
  // frontal, de la ceja del risco a la boca — el kart lo atraviesa al entrar.
  const pieD = 6.5, labioD = 12.5;
  const cejaY = pista.alturaMundo(pPort.x + dirX * (labioD + 1.5), pPort.z + dirZ * (labioD + 1.5));
  const portalFall = crearChorrera(THREE, {
    alto: Math.max(16, cejaY - pPort.q.y - 1.2),
    ancho: pPort.q.w * 1.35,
    saltos: 2,
    deriva: 0,
    caraEn: (t) => ({
      x: pPort.x + dirX * (pieD + (labioD - pieD) * t),
      z: pPort.z + dirZ * (pieD + (labioD - pieD) * t),
    }),
    pozo: 3.5,
    gotas: 40,
    calidad: 'alta',
    anchoFinal: 0.95,
    seed: seed + 401,
    solDir: sol,
  });
  portalFall.grupo.position.y = pPort.q.y + 0.2;
  portalFall.grupo.name = 'chorrera-cascada-portal';
  grupo.add(portalFall.grupo);
  ticks.push(portalFall);
  for (const anc of portalFall.anclasBruma) {
    anclasBruma.push({ x: anc.x, y: pPort.q.y + anc.y, z: anc.z });
  }

  // ── bruma volumétrica: CADA caída respira, no solo las dos grandes ─────────
  const brumaAnclasExtra = [
    { f: 0.085, yOff: 1.5 },  // beat 1
    { f: 0.135, yOff: 1.2 },  // beat 2a
    { f: 0.158, yOff: 1.2 },  // beat 2b
    { f: 0.218, yOff: 1.5 },  // beat 3 — gran salto
    { f: 0.270, yOff: 1.5 },  // beat 4
    { f: 0.320, yOff: 1.5 },  // beat 5
    { f: 0.404, yOff: 1.0 },  // diag 1
    { f: 0.440, yOff: 1.0 },  // diag 2
    { f: 0.493, yOff: 2.0 },  // beat 7 — clímax
    { f: 0.505, yOff: 2.0 },  // poza del clímax
  ];
  for (const ba of brumaAnclasExtra) {
    const pt = kartPoint(pista, ba.f, 0);
    anclasBruma.push({ x: pt.x, y: pt.q.y + ba.yOff, z: pt.z });
  }
  const bruma = crearBrumaVolumetrica(THREE, {
    puntos: anclasBruma,
    jirones: 72,
    haces: 0,
    seed: seed + 47,
    dispersion: 3.2,
    solDir: sol,
    color: 0xe6efec,
    intensidad: 1,
    cerca: [8, 24],
    lejos: [180, 440],
  });
  grupo.add(bruma.grupo);

  // ── la CARPA AZUL: checkpoint de la meseta (beat 1 del video) ─────────────
  // En la MISMA salida: el kart arranca junto al campamento, como el dron
  // arranca su vuelo sobre la carpa. f=0.012 ≈ 20 m adelante de la línea.
  const carpaPt = kartPoint(pista, 0.012, 0);
  const ladoCarpa = kartPoint(pista, 0.012, carpaPt.q.w + 5.0);
  const carpa = crearCarpaAzul(1);
  carpa.name = 'chorrera-landmark-carpa-azul';
  carpa.position.set(
    ladoCarpa.x,
    pista.alturaMundo(ladoCarpa.x, ladoCarpa.z),
    ladoCarpa.z,
  );
  grupo.add(carpa);

  let ultimoT = null;
  function update(t) {
    const dt = ultimoT == null ? 0 : Math.max(0, Math.min(0.05, t - ultimoT));
    ultimoT = t;
    for (const c of ticks) c.tick(dt);
    for (const q of quebradas) q.tick(dt);
    bruma.tick(dt);
    poolMat.uniforms.uTime.value = t;
  }
  return { grupo, update, caidas: ticks, quebradas, bruma, pozasNavis, carpa, profundidadEn, madre };
}

export function makeWaterfalls(scene, { seed = 20260811, pista = null } = {}) {
  if (pista) return makeKartWaterfalls(scene, { pista, seed });
  const sol = new THREE.Vector3(0.62, 0.15, 0.60).normalize();
  const topX = pathX(T_NACE);
  const bottomX = pathX(PIE_T);
  // ── ANCLAJE SOBRE LA SUPERFICIE REAL (fix 2026-08-25) ─────────────────────
  // `facePos` (cliff.js) es la aproximación vieja de la cara; el terreno que
  // de verdad se RENDERIZA es `height()` (terrain.js), con su propio eje de
  // canal `channelAxis()`. Anclar el velo con facePos lo dejaba ~47u
  // enterrado bajo la roca y 18-24u desviado del eje del cauce. facePos se
  // conserva SOLO como semilla del rango de z (dónde caen, aprox., el
  // nacimiento y el pie); la posición de cada muestra sale de la superficie
  // que se ve en pantalla: x = channelAxis(z), y = height(x, z).
  const topZ = facePos(topX, T_NACE).z;
  const bottomZ = facePos(bottomX, PIE_T).z;
  const bottomXreal = channelAxis(bottomZ);
  const topXreal = channelAxis(topZ);
  const bottom = { x: bottomXreal, y: height(bottomXreal, bottomZ), z: bottomZ };
  const top = { x: topXreal, y: height(topXreal, topZ), z: topZ };
  const alto = top.y - bottom.y;
  // El perfil se invierte por ALTURA. `crearChorrera` interpola su caída de
  // forma lineal en Y. Cada muestra se lee directo del terreno renderizado
  // (height + channelAxis) en vez de facePos — ya no hay lámina aparte que
  // pueda desalinearse de la malla del DEM que de verdad se dibuja.
  const perfilMuestras = [];
  for (let i = 0; i <= 180; i++) {
    const z = bottomZ + (topZ - bottomZ) * (i / 180);
    const x = channelAxis(z);
    const y = height(x, z);
    perfilMuestras.push({ x, z: z - bottom.z, y });
  }
  const perfil = (t) => {
    const y = bottom.y + alto * t;
    let i = 0;
    while (i < perfilMuestras.length - 1 && perfilMuestras[i + 1].y < y) i++;
    const a = perfilMuestras[i];
    const b = perfilMuestras[Math.min(i + 1, perfilMuestras.length - 1)];
    const f = a.y >= b.y ? 0 : Math.min(1, Math.max(0, (y - a.y) / (b.y - a.y)));
    return {
      x: a.x + (b.x - a.x) * f,
      z: a.z + (b.z - a.z) * f + 0.6,
    };
  };

  // Una sola caída, con tres repisas y pozo, como en la entrada definitiva.
  const chorrera = crearChorrera(THREE, {
    alto,
    ancho: 5.0,
    saltos: 3,
    deriva: 0,
    caraEn: perfil,
    pozo: 6.4,
    gotas: 42,
    calidad: 'alta',
    seed: seed + 3,
    solDir: sol,
  });
  chorrera.grupo.position.set(0, bottom.y, bottom.z);
  scene.add(chorrera.grupo);

  // Poza horizontal anclada al pie real, con las cáusticas navis aprobadas.
  const pieBase = facePos(pathX(PIE_T), PIE_T);
  const poolGeo = new THREE.CircleGeometry(1, 28);
  poolGeo.rotateX(-Math.PI / 2);
  const poolMat = new THREE.ShaderMaterial({
    vertexShader: POZO_VERT, fragmentShader: POZO_FRAG,
    uniforms: { uTime: { value: 0 } },
    transparent: true, depthWrite: false,
  });
  const pozoCristalino = new THREE.Mesh(poolGeo, poolMat);
  pozoCristalino.name = 'chorrera-pozo-cristalino';
  pozoCristalino.scale.set(7.2, 1, 5.6);
  pozoCristalino.position.set(pieBase.x, pieBase.y + 0.12, pieBase.z + 5.0);
  pozoCristalino.renderOrder = 3;
  scene.add(pozoCristalino);

  // El curso continúa desde el pie de la caída hacia el valle. Los puntos
  // son XZ del anfitrión; la altura y la zanja las resuelve aguaParamo.
  const quebradaPuntos = [
    { x: bottomX, z: bottom.z + 10 },
    { x: bottomX + 12, z: bottom.z + 62 },
    { x: bottomX - 8, z: bottom.z + 145 },
    { x: bottomX + 18, z: bottom.z + 245 },
    { x: bottomX - 10, z: bottom.z + 360 },
    { x: bottomX + 5, z: bottom.z + 500 },
  ];
  const quebrada = crearQuebrada(THREE, {
    puntos: quebradaPuntos,
    alturaEn: (x, z) => height(x, z),
    ancho: 3.5,
    hundir: 0.7,
    piedras: 20,
    chispas: 60,
    seed: seed + 7,
    solDir: sol,
    muestras: 170,
  });
  scene.add(quebrada.grupo);
  excavarQuebrada(scene, quebrada);

  const helechos = crearHelechosRibera(THREE, {
    puntos: quebradaPuntos,
    alturaEn: (x, z) => height(x, z),
    n: 28,
    seed: 977,
    aparte: 9,
  });
  scene.add(helechos.grupo);

  const anclas = chorrera.anclasBruma.map((a) => ({
    x: a.x,
    y: bottom.y + a.y - 0.5,
    z: bottom.z + a.z,
  }));
  const bruma = crearBrumaVolumetrica(THREE, {
    puntos: anclas,
    jirones: 56,
    haces: 0,
    seed: seed + 47,
    dispersion: 3.0,
    solDir: sol,
    color: 0xe6efec,
    intensidad: 1,
    cerca: [8, 24],
    lejos: [260, 620],
  });
  scene.add(bruma.grupo);

  let ultimoT = null;
  return {
    update(t) {
      const dt = ultimoT == null ? 0 : Math.max(0, Math.min(0.05, t - ultimoT));
      ultimoT = t;
      quebrada.tick(dt);
      chorrera.tick(dt);
      bruma.tick(dt);
      poolMat.uniforms.uTime.value = t;
      // El reloj global de viento ya avanza una vez por frame en main.js.
    },
    mats: materialesDe(chorrera.grupo),
    quebrada,
    chorrera,
    pozoCristalino,
    helechos,
    bruma,
  };
}
