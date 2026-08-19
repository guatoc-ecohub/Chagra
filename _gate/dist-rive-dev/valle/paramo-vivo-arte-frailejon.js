// ═══════════════════════════════════════════════════════════════════════════
//  PÁRAMO VIVO — ARTE · EL FRAILEJÓN-ENT (protagonista)
//  ---------------------------------------------------------------------------
//  Espeletia monumental hecha PERSONAJE. Cara tallada en el tronco de necromasa,
//  MIRADA que sigue al usuario (eje en los ojos — Trico/Tanaka CEDEC 2017),
//  lentitud que ES el personaje (balanceo con inercia, parpadeo ancestral),
//  una HERIDA visible (helada/quema) que lo humaniza, y REVERDECE con el
//  progreso = termómetro ecológico sin HUD (Ori/Sein). `setSalud(0..1)`.
//
//  Ciencia (CIENCIA-PARAMO-ENT §5, OBEDECIDA): roseta de hojas pubescentes
//  lanceoladas (captan niebla + aíslan del frío), tronco vestido de HOJAS
//  MUERTAS marcescentes (necromasa: abrigo térmico y coraza al fuego), vara de
//  capítulos AMARILLOS (policárpico), crece varios cm/año — NO 1 cm fijo.
// ═══════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { P, col, mezcla, lambert, concat, texturaVaho } from './paramo-vivo-arte-mundo.js';

// ── HOJA LANCEOLADA (la del frailejón de verdad): pala ANCHA con quilla ───────
// Base en y=0, punta en y=len, ancho en X, quilla abombada en +Z. Fue la clave
// del rechazo histórico: cono fino → coliflor; pala lanceolada → planta.
// EXPORTADA para que el bastón del oso andino reúse la MISMA hoja (Espeletia).
// `grad` = [Color base, Color punta]: hornea el degradado POR VÉRTICE (F23).
export function hojaLanceoladaGeo(len, wid, keel = 0.14, grad = null) {
  const secc = [0.00, 0.12, 0.30, 0.52, 0.76, 1.00];
  const perf = [0.34, 0.74, 1.00, 0.88, 0.54, 0.02];
  const pos = [], idx = [], colr = [];
  const cTmp = new THREE.Color();
  secc.forEach((t, i) => {
    const y = t * len, hw = perf[i] * wid * 0.5, kz = keel * Math.sin(t * Math.PI);
    pos.push(-hw, y, 0, 0, y, kz, hw, y, 0);
    if (grad) {
      // (F24, molde F23 de paramo.js) degradado base→punta: el corazón de la
      // roseta es VERDE y la plata vive en las puntas — así la mata lee como
      // masa afelpada con hondura y no como estrella de púas de un solo tono.
      cTmp.copy(grad[0]).lerp(grad[1], t * t);
      for (let v = 0; v < 3; v++) colr.push(cTmp.r, cTmp.g, cTmp.b);
    }
  });
  for (let i = 0; i < secc.length - 1; i++) {
    const a = i * 3, b = (i + 1) * 3;
    idx.push(a, a + 1, b, a + 1, b + 1, b, a + 1, a + 2, b + 1, a + 2, b + 2, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  if (grad) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colr), 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// roseta: coronas de palas lanceoladas, externas abiertas → cogollo empinado.
// (F24) palas MÁS ANCHAS y coronas más pobladas — las medidas F23 de paramo.js:
// la roseta real es un mazo denso de "orejas de burro", no una estrella rala
// de agave (el defecto medido en las capturas tick-0015).
const CAPAS = [
  { n: 21, len: 1.30, wid: 0.55, rad: 0.30, tilt: 0.30, y: 0.00 },
  { n: 17, len: 1.12, wid: 0.48, rad: 0.21, tilt: 0.66, y: 0.13 },
  { n: 13, len: 0.88, wid: 0.40, rad: 0.13, tilt: 1.00, y: 0.27 },
  { n: 8, len: 0.58, wid: 0.31, rad: 0.06, tilt: 1.30, y: 0.40 },
];
// multiplicadores del degradado (van SOBRE el color del material/instancia):
// base verde-sombra → punta blanca (deja pasar la plata de la instancia)
const GRAD_ROSETA = [new THREE.Color(0.46, 0.58, 0.40), new THREE.Color(1, 1, 1)];
// EXPORTADA: la roseta canónica del frailejón (reusada a escala bastón).
export function rosetaGeo(yBase, esc = 1) {
  const partes = [];
  for (const c of CAPAS) {
    for (let j = 0; j < c.n; j++) {
      const ang = (j / c.n) * Math.PI * 2 + c.y * 4.6;
      const hoja = hojaLanceoladaGeo(c.len * esc, c.wid * esc, 0.14, GRAD_ROSETA);
      hoja.rotateZ(-Math.PI / 2 + c.tilt); hoja.rotateY(ang);
      hoja.translate(Math.cos(ang) * c.rad * esc, yBase + c.y * esc, Math.sin(ang) * c.rad * esc);
      partes.push(hoja);
    }
  }
  return concat(...partes);
}

// ── el HALO DE PELUSA (la pubescencia, firma del frailejón — F23/paramo.js):
// 3 quads cruzados de vaho radial en la corona. De lejos esa neblinita pegada
// a la mata ES la lana plateada a contraluz; de cerca es casi invisible de
// puro tenue (opacidad 0,3 × alfa radial). Instanciar con la MISMA matriz que
// la roseta de cada adulto.
export function haloPelusaGeo(yCorona = 2.15, w = 2.1, h = 1.05) {
  const quads = [];
  for (let hq = 0; hq < 3; hq++) {
    const qd = new THREE.PlaneGeometry(w, h);
    qd.rotateY((hq / 3) * Math.PI);
    qd.translate(0, yCorona, 0);
    quads.push(qd);
  }
  return concat(...quads);
}
export const haloPelusaMat = () => new THREE.MeshBasicMaterial({
  map: texturaVaho(false), transparent: true, opacity: 0.30, depthWrite: false,
  side: THREE.DoubleSide, color: 0xe9f0da,
});

// tronco caulirrosulado: cilindro + anillos de hojas muertas colgando (necromasa)
function troncoGeo(alto) {
  const partes = [];
  const cil = new THREE.CylinderGeometry(0.15, 0.22, alto, 8); cil.translate(0, alto / 2, 0); partes.push(cil);
  const anillos = Math.max(5, Math.round(alto / 0.28));
  for (let a = 0; a < anillos; a++) {
    const yy = alto * (0.96 - a * (0.9 / anillos)), rad = 0.19 + a * 0.006;
    for (let j = 0; j < 10; j++) {
      const ang = (j / 10) * Math.PI * 2 + a * 0.42;
      const hoja = hojaLanceoladaGeo(0.5, 0.24, 0.08);
      hoja.rotateX(Math.PI); hoja.rotateZ(0.30); hoja.rotateY(ang);
      hoja.translate(Math.cos(ang) * rad, yy, Math.sin(ang) * rad);
      partes.push(hoja);
    }
  }
  return concat(...partes);
}
function faldaGeo(alto) { const f = new THREE.ConeGeometry(0.33, alto * 0.80, 12, 1, true); f.translate(0, alto * 0.48, 0); return f; }

// ── capítulo amarillo (la flor): lígulas en cuenco + disco pardo ──────────────
// EXPORTADO: la firma amarilla de Espeletia (reusada a escala bastón).
export function capituloMesh(r = 0.15) {
  const g = new THREE.Group();
  const gs = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const p = new THREE.BoxGeometry(r * 1.05, 0.02, r * 0.30); p.translate(r * 0.55, 0, 0); p.rotateZ(0.24); p.rotateY(a); gs.push(p);
  }
  g.add(new THREE.Mesh(concat(...gs), lambert(P.frailFlor, { side: THREE.DoubleSide })));
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.52, r * 0.52, 0.05, 12), lambert(0x40300f));
  disco.position.y = 0.03; g.add(disco);
  return g;
}

// geometrías compartidas para el PUEBLO instanciado (frailejonal alrededor)
export function frailejonUnitGeos() {
  const H_U = 1.6;
  return {
    tronco: troncoGeo(H_U), falda: faldaGeo(H_U), roseta: rosetaGeo(H_U), rasa: rosetaGeo(0.05),
    halo: haloPelusaGeo(H_U + 0.55), alturaU: H_U,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  EL FRAILEJÓN-ENT MONUMENTAL
// ═══════════════════════════════════════════════════════════════════════════
export function buildFrailejonEnt(rng, { escala = 4.6 } = {}) {
  const g = new THREE.Group();
  const ALTO = 9.0;               // tronco alto: monumento (la copa se pierde arriba)
  const Rt = 0.9;                  // radio del fuste a escala Ent

  // materiales que REVERDECEN (se guardan para setSalud)
  const matTronco = lambert(P.frailSeca2, { side: THREE.DoubleSide });
  const matFalda = lambert(P.frailSeca, { side: THREE.DoubleSide });
  // vertexColors: el degradado verde→plata horneado en la pala (GRAD_ROSETA)
  // multiplica al color de salud — corazón verde, puntas plateadas.
  const matRoseta = lambert(P.frailSage, { side: THREE.DoubleSide, vertexColors: true });   // arranca apagada (enferma)
  const matCogollo = lambert(P.frailCogollo);
  const matHoja = new THREE.MeshLambertMaterial({ color: col(P.frailFlor), flatShading: true, side: THREE.DoubleSide });

  // fuste + necromasa + falda, todo escalado a monumento
  const tronco = new THREE.Mesh(troncoGeo(ALTO), matTronco); tronco.scale.set(Rt / 0.22, 1, Rt / 0.22);
  const falda = new THREE.Mesh(faldaGeo(ALTO), matFalda); falda.scale.set(Rt / 0.33 * 0.9, 1, Rt / 0.33 * 0.9);
  g.add(tronco, falda);

  // ROSETA monumental (cabeza pensante): grande y plateada, sobre la copa
  const roseta = new THREE.Mesh(rosetaGeo(ALTO, 2.4), matRoseta);
  g.add(roseta);
  const cog = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), matCogollo); cog.position.set(0, ALTO + 1.0, 0); g.add(cog);
  const coronaY = ALTO + 1.0;
  // la pubescencia del anciano: el mismo vaho de la corona de los adultos,
  // a escala de su roseta (2,4) — la lana plateada a contraluz
  const matHaloEnt = haloPelusaMat();
  const haloEnt = new THREE.Mesh(haloPelusaGeo(coronaY + 0.3, 2.1 * 2.4, 1.05 * 2.4), matHaloEnt);
  g.add(haloEnt);

  // ── LA CARA tallada en la corteza (tercio alto del fuste, mira al claro +Z) ──
  // (F24) el molde F23 de entParamo.js portado acá, a escala de este fuste:
  // pozo MÁS oscuro que el globo (el escalón que hunde el ojo), globo pardo
  // cálido (madera en sombra, no hueco troquelado), iris chico 2:1 con
  // pupila-casquete y brillo COLGADOS del iris, ceja-visera con el canto
  // interno caído al entrecejo, nariz-cono larga, y boca-torus CERRADA casi
  // recta. Los discos con pupila crema y el medio-toro sonriente eran el
  // muñeco que F23 ya había sacado del otro páramo (capturas tick-0015).
  const caraG = new THREE.Group();
  caraG.position.set(0, ALTO * 0.66, Rt * 0.92);
  const matAmbar = new THREE.MeshStandardMaterial({ color: '#a4762a', roughness: 0.9, emissive: '#5c390e', emissiveIntensity: 0.5 });
  const matMadera = new THREE.MeshStandardMaterial({ color: mezcla(P.frailSeca2, P.cacao, 0.35), roughness: 1, flatShading: true });
  const matPozo = new THREE.MeshStandardMaterial({ color: '#150c04', roughness: 1 });
  const matGlobo = new THREE.MeshStandardMaterial({ color: '#31200e', roughness: 1 });
  const matPupila = new THREE.MeshStandardMaterial({ color: '#170f06', roughness: 1 });
  const ojos = [];
  for (const sx of [-1, 1]) {
    // ojos JUNTOS (±0,55) y HUNDIDOS: a ±0,85 sobre un fuste de r 0,9 asomaban
    // como binóculos fuera de la silueta (el "ojo saltón" que F23 midió en v13)
    const pozo = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), matPozo);
    pozo.position.set(sx * 0.55, 0.28, -0.34); pozo.scale.set(1.15, 1.25, 0.7); caraG.add(pozo);
    const ceja = new THREE.Mesh(new THREE.BoxGeometry(0.89, 0.21, 0.39), matMadera);
    ceja.position.set(sx * 0.576, 0.55, -0.02);
    ceja.rotation.z = sx * 0.24;   // canto interno caído al entrecejo: ceño serio
    ceja.rotation.x = 0.22;        // la visera se vuelca sobre el ojo: encapota, no saluda
    caraG.add(ceja);
    const globo = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 10), matGlobo);
    globo.position.set(sx * 0.55, 0.28, -0.18); caraG.add(globo);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.124, 14, 10), matAmbar);
    iris.position.set(sx * 0.55, 0.28, 0.08); caraG.add(iris); ojos.push(iris);
    // pupila casquete A RAS del ámbar + brillo chico, COLGADOS del iris:
    // sueltos se quedarían quietos cuando la cara gira y al ojo le saldría
    // un mordisco negro (bug medido en entParamo).
    const pupila = new THREE.Mesh(new THREE.SphereGeometry(0.066, 12, 8), matPupila);
    pupila.position.set(0, 0, Math.sqrt(0.124 * 0.124 - 0.066 * 0.066));
    pupila.scale.set(1, 1, 0.45); iris.add(pupila);
    const brillo = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), new THREE.MeshBasicMaterial({ color: 0xdfd3b4 }));
    brillo.position.set(sx * -0.047, 0.052, 0.108); iris.add(brillo);
  }
  // nariz larga (≈ media cara): corta leía como pico de búho entre los ojos
  const nariz = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.24, 5), matMadera);
  nariz.position.set(0, -0.02, 0.30); nariz.rotation.x = Math.PI; caraG.add(nariz);
  // BOCA: hendidura CERRADA, casi recta, puntas apenas caídas. Torus de radio
  // GRANDE y arco corto (el arco nace en θ=0: girarlo π/2−α lo centra arriba,
  // ∩ suave) — el medio-toro chico girado en Z era el arco de sonrisa.
  const R_BOCA = 3.39, MEDIO_ARCO = 0.193;
  const boca = new THREE.Mesh(new THREE.TorusGeometry(R_BOCA, 0.065, 6, 26, MEDIO_ARCO * 2),
    new THREE.MeshStandardMaterial({ color: '#241708', roughness: 1 }));
  boca.rotation.z = Math.PI / 2 - MEDIO_ARCO;
  boca.position.set(0, -0.90 - R_BOCA, 0.25);
  caraG.add(boca);
  g.add(caraG);

  // ── LA HERIDA: un flanco quemado/helado del abrigo de necromasa (se sana) ──
  // carbón + hoja seca gris en un sector del tronco medio; encoge al reverdecer.
  const heridaG = new THREE.Group();
  const matCarbon = lambert(P.heridaCarbon);
  const matHeridaSeca = lambert(P.heridaSeca, { side: THREE.DoubleSide });
  for (let i = 0; i < 14; i++) {
    const yy = ALTO * (0.18 + (i / 14) * 0.34), ang = -0.5 + (i % 3) * 0.18;
    const escama = new THREE.Mesh(hojaLanceoladaGeo(0.7, 0.3, 0.06), i % 2 ? matCarbon : matHeridaSeca);
    escama.position.set(Math.cos(ang) * Rt * 1.02, yy, Math.sin(ang) * Rt * 1.02);
    escama.rotation.set(Math.PI, ang, 0.4); escama.scale.setScalar(Rt / 0.22 * 0.5);
    heridaG.add(escama);
  }
  const cicatriz = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), matCarbon);
  cicatriz.position.set(Math.cos(-0.4) * Rt, ALTO * 0.34, Math.sin(-0.4) * Rt); cicatriz.scale.set(1.4, 2.4, 0.5);
  heridaG.add(cicatriz);
  g.add(heridaG);

  // ── LA VARA FLORAL: tallo velludo con capítulos amarillos donde come el chivito
  const vara = new THREE.Group();
  const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 3.4, 6), lambert(0x9aa06a));
  tallo.position.set(0.5, coronaY + 1.4, 0.3); tallo.rotation.z = -0.18; vara.add(tallo);
  const florAncla = new THREE.Vector3(0.6, coronaY + 3.0, 0.5);
  const capitulos = [];
  for (const off of [[0, 0, 0], [0.5, -0.4, -0.2], [-0.35, -0.55, 0.35], [0.2, 0.35, 0.15]]) {
    const cap = capituloMesh(0.4);
    cap.position.set(florAncla.x + off[0], florAncla.y + off[1], florAncla.z + off[2]);
    cap.rotation.set(0.45, off[0], 0.15);
    vara.add(cap); capitulos.push(cap);
  }
  g.add(vara);

  // ── BROMELIAS/epífitas que VUELVEN al reverdecer (copa de vida) ──────────────
  const epifitas = new THREE.Group();
  const matBrom = lambert(0xd8556f), matBrom2 = lambert(0x8fbf5a);
  for (let i = 0; i < 10; i++) {
    const a = rng.float(0, Math.PI * 2), d = rng.float(0.6, 2.0), yy = coronaY - rng.float(0, 1.4);
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(rng.float(0.16, 0.3), 0), rng.bool() ? matBrom : matBrom2);
    b.position.set(Math.cos(a) * d, yy, Math.sin(a) * d); epifitas.add(b);
  }
  g.add(epifitas);

  // ── ESTADO / SALUD (reverdece con el progreso) ───────────────────────────────
  let salud = 0.18;                 // arranca enfermo (herido, apagado)
  const cPlataViva = col(0xccd6b6), cSalvia = col(P.frailSage), cEnferma = col(0x8a8f76);
  const cCog = col(P.frailCogollo), cCogEnf = col(0xb7b89a);
  function setSalud(k) {
    salud = THREE.MathUtils.clamp(k, 0, 1);
    // roseta: gris-enferma → plata viva
    matRoseta.color.copy(cEnferma).lerp(cSalvia, salud).lerp(cPlataViva, salud * salud);
    matCogollo.color.copy(cCogEnf).lerp(cCog, salud);
    // iris: apagado → brillante
    matAmbar.emissiveIntensity = 0.28 + salud * 0.9;
    // herida: encoge y verdea
    heridaG.scale.setScalar(1 - salud * 0.7);
    heridaG.visible = salud < 0.92;
    matCarbon.color.copy(col(P.heridaCarbon)).lerp(col(P.musgo), salud * 0.8);
    // la pelusa vuelve con la salud (enfermo casi no lanea)
    matHaloEnt.opacity = 0.12 + salud * 0.20;
    // flores y bromelias: brotan con la salud
    vara.scale.setScalar(0.4 + salud * 0.6);
    epifitas.children.forEach((b, i) => { b.visible = salud > (i / epifitas.children.length) * 0.9 + 0.1; });
  }
  setSalud(salud);

  // ── ANIMACIÓN: lentitud = personaje (sway con inercia, parpadeo, mirada) ─────
  const eje = new THREE.Vector3();
  const qDeseada = new THREE.Quaternion(), mLook = new THREE.Matrix4();
  const worldFace = new THREE.Vector3();
  const update = (t, camera) => {
    // balanceo pesado desde la raíz (nunca metrónomo)
    const sway = Math.sin(t * 0.24) * 0.02 + Math.sin(t * 0.10 + 1) * 0.012;
    roseta.rotation.z = sway; roseta.rotation.x = Math.cos(t * 0.19) * 0.012;
    vara.rotation.z = sway * 1.4;
    g.rotation.z = sway * 0.18;
    // parpadeo ancestral (mucho abierto, un pestañeo corto)
    const ph = (t * 0.5) % 6.2, blink = ph > 5.9 ? 1 - Math.abs(ph - 6.05) / 0.15 : 0;
    const kb = 1 - THREE.MathUtils.clamp(blink, 0, 1) * 0.9;
    ojos.forEach((o) => { o.scale.y = kb; o.scale.z = kb < 0.5 ? 0.4 : 1; });
    matAmbar.emissiveIntensity = (0.28 + salud * 0.9) + Math.sin(t * 0.7) * 0.1;
    // LA MIRADA TE SIGUE: la cara gira suave hacia la cámara, eje en los ojos,
    // damping alto (el Ent es lento), y ACOTADA (no gira más de ~0.5 rad).
    if (camera) {
      caraG.getWorldPosition(worldFace);
      eje.copy(camera.position).sub(worldFace);
      const yaw = THREE.MathUtils.clamp(Math.atan2(eje.x, eje.z), -0.55, 0.55);
      const pitch = THREE.MathUtils.clamp(-Math.atan2(eje.y, Math.hypot(eje.x, eje.z)), -0.3, 0.3);
      mLook.makeRotationFromEuler(new THREE.Euler(pitch, yaw, 0));
      qDeseada.setFromRotationMatrix(mLook);
      caraG.quaternion.slerp(qDeseada, 0.03);   // damping alto = lentitud
    }
  };

  return { group: g, caraG, ojos, florAncla, coronaY, alto: ALTO, escala, update, setSalud, salud: () => salud };
}
