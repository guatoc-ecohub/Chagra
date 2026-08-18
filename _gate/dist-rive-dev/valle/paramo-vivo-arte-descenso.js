// ═══════════════════════════════════════════════════════════════════════════
//  PÁRAMO VIVO — ARTE · EL DESCENSO (Powers of Ten, SIN corte)
//  ---------------------------------------------------------------------------
//  El momento wow: la cámara baja de la COPA del Ent a su RAÍZ, atraviesa la
//  hojarasca, entra al «internet de hongos» (micorrizas con pulsos de luz tipo
//  sinapsis — Fantastic Fungi), llega al ARBÚSCULO (el árbol-fractal dentro de
//  la célula donde se firma el trato ámbar↔plata), y termina en la CÉLULA.
//  Todo apilado BAJO el Ent, en un solo eje vertical continuo.
//
//  Ciencia (CIENCIA-PARAMO-ENT §1,§2,§4 OBEDECIDA): tres capas reales de suelo
//  (hojarasca → andosol NEGRO → subsuelo/turba), hifas que amplían ~100× el
//  alcance de la raíz, intercambio bidireccional (carbono/azúcar planta→hongo
//  ÁMBAR; agua+P+N hongo→planta PLATA-AZUL), colonización altísima (98% en
//  Anaime). El arbúsculo = fractal-árbol dentro de la célula (eco del Ent).
//
//  LA CÉLULA (nivel «Anatomy Atelier», lámina ilustrada, NO fotorrealista):
//  célula VEGETAL real — pared celular prismática + membrana, vacuola central
//  glassy (el rasgo vegetal), CLOROPLASTOS con grana/tilacoides (protagonistas
//  de la fotosíntesis del Ent), núcleo con nucléolo, mitocondrias con crestas,
//  Golgi apilado, retículo endoplásmico con ribosomas, citoesqueleto. Todo con
//  rim-light fresnel (subsurface glow), citoplasma con partículas y luz interna:
//  NADA de fondo negro plano. Determinista, procedural, cero binarios.
//
//  Expone `anclas` (puntos-mundo del recorrido) y `curva` (CatmullRom continua)
//  para que `paramo-vivo-lecciones.js` conduzca la cámara «sin corte».
// ═══════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { P, col, lambert, mezcla, concat } from './paramo-vivo-arte-mundo.js';

// ── FRESNEL RIM (el salto «ilustrado»): borde luminoso tipo subsurface, robado
//    en espíritu del rim-lighting médico de Anatomy Atelier. Da a membranas y
//    organelos ese brillo interno de lámina — no PBR, no foto. abs(dot) para que
//    glow ambas caras (DoubleSide). depthWrite:false → se ve el interior. ──────
function fresnelMat({ color, rim, power = 2.1, opacity = 0.16, rimOpacity = 0.6, additive = false, side = THREE.DoubleSide }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uRim: { value: new THREE.Color(rim) },
      uPower: { value: power },
      uOpacity: { value: opacity },
      uRimOpacity: { value: rimOpacity },
    },
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vV;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform vec3 uRim;
      uniform float uPower; uniform float uOpacity; uniform float uRimOpacity;
      varying vec3 vN; varying vec3 vV;
      void main(){
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower);
        vec3 c = mix(uColor, uRim, f);
        float a = clamp(uOpacity + f * uRimOpacity, 0.0, 1.0);
        gl_FragColor = vec4(c, a);
      }`,
    transparent: true, side, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

// textura radial suave (glow / motas de citoplasma) — canvas, sin binarios
let _glowTex = null;
function glowTex() {
  if (_glowTex) return _glowTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.4, 'rgba(255,255,255,0.45)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
  _glowTex = new THREE.CanvasTexture(cv); _glowTex.colorSpace = THREE.SRGBColorSpace;
  return _glowTex;
}

// caja REDONDEADA procedural (SDF clamp) — la célula VEGETAL es prismática con
// pared gruesa (a diferencia de la esfera de la célula animal). seg alto = borde
// suave. Devuelve geometría cúbica de lado `size`, esquinas de radio `r`.
function roundedBox(size, r, seg = 7) {
  const g = new THREE.BoxGeometry(size, size, size, seg, seg, seg);
  const pos = g.attributes.position, h = size / 2 - r;
  const v = new THREE.Vector3(), q = new THREE.Vector3(), d = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    q.set(THREE.MathUtils.clamp(v.x, -h, h), THREE.MathUtils.clamp(v.y, -h, h), THREE.MathUtils.clamp(v.z, -h, h));
    d.copy(v).sub(q); const len = d.length();
    if (len > 1e-5) { d.multiplyScalar(r / len); v.copy(q).add(d); }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// aplica matriz a una copia de geo (para mergear con concat)
function xf(geo, pos, euler = new THREE.Euler(), scl = new THREE.Vector3(1, 1, 1)) {
  const m = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(euler), scl);
  const gg = geo.clone(); gg.applyMatrix4(m); return gg;
}

// ── EL CLOROPLASTO (protagonista): elipsoide-lente translúcido con GRANA reales
//    (pilas de tilacoides) y lamelas del estroma. La fotosíntesis que enseña el
//    Ent. Envoltura fresnel verde clorofila; grana verde saturado que se leen a
//    través de la envoltura. ───────────────────────────────────────────────────
const _discoGrana = new THREE.CylinderGeometry(0.135, 0.135, 0.03, 12);
const _lamela = new THREE.CylinderGeometry(0.02, 0.02, 1.0, 6);
function makeCloroplasto(rng, largo = 1.75) {
  const g = new THREE.Group();
  const env = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 16),
    fresnelMat({ color: 0x3f7d34, rim: 0xa6e57e, power: 1.9, opacity: 0.30, rimOpacity: 0.72 }));
  env.scale.set(largo, largo * 0.5, largo * 0.74);
  g.add(env);
  // grana: pilas de discos a lo largo del eje mayor; lamelas del estroma que las unen
  const partes = [];
  const nStacks = 5;
  const ys = [];
  for (let s = 0; s < nStacks; s++) {
    const u = (s / (nStacks - 1) - 0.5) * 1.35 * largo;
    const yy = rng.float(-0.14, 0.14) * largo;
    const zz = rng.float(-0.30, 0.30) * largo;
    ys.push(yy);
    const tilt = rng.float(-0.4, 0.4);
    const nDisc = rng.int(3, 5);
    for (let d = 0; d < nDisc; d++) {
      const p = new THREE.Vector3(u, yy + (d - (nDisc - 1) / 2) * 0.052, zz);
      partes.push(xf(_discoGrana, p, new THREE.Euler(0, 0, tilt)));
    }
  }
  // 2 lamelas del estroma (tubos finos que cosen las grana a lo largo del eje)
  for (let l = 0; l < 2; l++) {
    partes.push(xf(_lamela, new THREE.Vector3(0, ys[0] + (l - 0.5) * 0.22, 0),
      new THREE.Euler(0, 0, Math.PI / 2), new THREE.Vector3(1, largo * 1.15, 1)));
  }
  const grana = new THREE.Mesh(concat(...partes),
    new THREE.MeshStandardMaterial({ color: 0x2c6624, emissive: 0x0f3a0d, emissiveIntensity: 0.55, roughness: 0.55, flatShading: false }));
  g.add(grana);
  return g;
}

// ── MITOCONDRIA: cápsula fresnel con CRESTAS internas (toros parciales cruzando
//    el eje, como pliegues de la membrana interna). ─────────────────────────────
const _cresta = new THREE.TorusGeometry(0.17, 0.028, 6, 12, Math.PI * 1.25);
function makeMito(rng) {
  const g = new THREE.Group();
  const env = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.6, 6, 16),
    fresnelMat({ color: 0xd07f39, rim: 0xffce8f, power: 2.0, opacity: 0.34, rimOpacity: 0.62 }));
  env.rotation.z = Math.PI / 2;
  g.add(env);
  const partes = [];
  const n = 6;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1) - 0.5) * 0.74;
    partes.push(xf(_cresta, new THREE.Vector3(x, 0, 0), new THREE.Euler(Math.PI / 2, rng.float(0, 6.28), 0)));
  }
  const cr = new THREE.Mesh(concat(...partes),
    new THREE.MeshStandardMaterial({ color: 0xac521c, emissive: 0x5a1e08, emissiveIntensity: 0.45, roughness: 0.5 }));
  g.add(cr);
  return g;
}

// ── APARATO DE GOLGI: pila de cisternas (discos aplanados curvados) + vesículas
//    brotando. Rosa-malva de lámina. ───────────────────────────────────────────
const _cisterna = new THREE.SphereGeometry(1, 18, 10);
const _vesicula = new THREE.SphereGeometry(0.055, 8, 6);
function makeGolgi(rng) {
  const g = new THREE.Group();
  const partes = [];
  const n = 5;
  for (let i = 0; i < n; i++) {
    const r = 0.5 - i * 0.055;
    const y = (i - (n - 1) / 2) * 0.12;
    partes.push(xf(_cisterna, new THREE.Vector3(Math.sin(i * 0.6) * 0.05, y, 0),
      new THREE.Euler(0, 0, 0), new THREE.Vector3(r, 0.045, r * 0.82)));
  }
  const golgi = new THREE.Mesh(concat(...partes),
    new THREE.MeshStandardMaterial({ color: 0xd98fbf, emissive: 0x5a2748, emissiveIntensity: 0.32, roughness: 0.5, side: THREE.DoubleSide }));
  g.add(golgi);
  const vesM = new THREE.MeshStandardMaterial({ color: 0xefb8d8, emissive: 0x6a3457, emissiveIntensity: 0.4, roughness: 0.5 });
  for (let v = 0; v < 5; v++) {
    const ve = new THREE.Mesh(_vesicula, vesM);
    const a = rng.float(0, 6.28);
    ve.position.set(Math.cos(a) * 0.55, 0.32 + rng.float(0, 0.12), Math.sin(a) * 0.4);
    g.add(ve);
  }
  return g;
}

export function construirDescenso(rng, { cx = 0, cz = 0, baseY = 0, coronaY = 10 } = {}) {
  const g = new THREE.Group();
  const pulsos = [];   // {malla, t0, dir, dur, a, b}

  // ── 1) CORTE DE SUELO: tres capas reales, cara +Z, bajo el Ent ──────────────
  const suelo = new THREE.Group(); suelo.position.set(cx, baseY, cz);
  const W = 6.0, D = 4.0;
  const capas = [
    { color: P.hojarasca, h: 0.5, top: 0.5 },     // hojarasca (abriga)
    { color: P.sueloNegro, h: 2.2, top: 0.0 },     // andosol NEGRO (la vida)
    { color: P.subsuelo, h: 2.0, top: -2.2 },      // subsuelo firme
    { color: P.turba, h: 2.0, top: -4.2 },         // turba (carbono milenario)
  ];
  for (const c of capas) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(W, c.h, D), lambert(c.color));
    box.position.set(0, c.top - c.h / 2, 0); suelo.add(box);
  }
  const cobija = new THREE.Mesh(new THREE.BoxGeometry(W * 1.02, 0.16, D * 1.02), lambert(P.musgoClaro));
  cobija.position.set(0, 0.58, 0); suelo.add(cobija);

  // raíces que BAJAN por la cara de corte + hifas irradiando (micorrizas)
  const raizM = lambert(P.raiz);
  const micoM = new THREE.MeshStandardMaterial({ color: col(P.mico), emissive: col(P.micoLuz), emissiveIntensity: 0.35, roughness: 0.6 });
  const zc = D / 2 + 0.02;
  const anclasRaiz = [];
  for (let i = 0; i < 5; i++) {
    const rx = -W / 2 + 0.8 + (i / 4) * (W - 1.6);
    let yy = -0.1; const prof = 8;   // raíces arrancan BAJO la superficie (no cerca al ras)
    for (let s = 0; s < prof; s++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.6, 5), raizM);
      const jit = Math.sin(s * 1.7 + i) * 0.14;
      seg.position.set(rx + jit, yy, zc); seg.rotation.z = 0.18 * Math.sin(s + i); suelo.add(seg);
      anclasRaiz.push(new THREE.Vector3(rx + jit, yy, zc));
      for (let f = 0; f < 3; f++) {
        const fa = rng.float(0, Math.PI * 2);
        const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.024, 0.36, 3), micoM);
        fil.position.set(rx + jit + Math.cos(fa) * 0.24, yy, zc + 0.02); fil.rotation.z = fa; suelo.add(fil);
      }
      yy -= 0.52;
    }
  }
  // el «internet de hongos»: hilos que enlazan raíces vecinas
  for (let i = 0; i < anclasRaiz.length; i++) for (let j = i + 1; j < anclasRaiz.length; j++) {
    const a = anclasRaiz[i], b = anclasRaiz[j], dist = a.distanceTo(b);
    if (dist < 0.7 || dist > 2.0 || rng.float(0, 1) > 0.32) continue;
    const hilo = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, dist, 3), micoM);
    hilo.position.copy(a.clone().lerp(b, 0.5));
    hilo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    suelo.add(hilo);
  }
  g.add(suelo);

  // ── 2) LA CATEDRAL MICORRÍZICA: una raíz AMPLIADA envuelta de hifas nacaradas
  //        con PULSOS de luz (ámbar baja = azúcar; plata sube = agua/minerales) ─
  const micoY = baseY - 15;
  const catedral = new THREE.Group(); catedral.position.set(cx, micoY, cz);
  const raizGorda = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 10, 12), lambert(0xcdbb92));
  catedral.add(raizGorda);
  const hifaM = new THREE.MeshStandardMaterial({ color: 0xf3ecd8, emissive: col(P.micoLuz), emissiveIntensity: 0.5, transparent: true, opacity: 0.85, roughness: 0.4 });
  const filamentos = [];   // {a,b} endpoints para pulsos
  for (let i = 0; i < 40; i++) {
    const yy = rng.float(-4.5, 4.5), ang = rng.float(0, Math.PI * 2);
    const largo = rng.float(2, 5);
    const a = new THREE.Vector3(Math.cos(ang) * 1.0, yy, Math.sin(ang) * 1.0);
    const b = new THREE.Vector3(Math.cos(ang) * (1 + largo), yy + rng.float(-1.5, 1.5), Math.sin(ang) * (1 + largo));
    const dist = a.distanceTo(b);
    const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, dist, 4), hifaM);
    fil.position.copy(a.clone().lerp(b, 0.5));
    fil.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    catedral.add(fil);
    filamentos.push({ a: a.clone().add(catedral.position), b: b.clone().add(catedral.position) });
  }
  g.add(catedral);
  // pulsos: esferas emisivas que viajan por los filamentos
  const pulsoGeoAmbar = new THREE.SphereGeometry(0.09, 8, 6);
  const matAzucar = new THREE.MeshBasicMaterial({ color: col(P.azucar), transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const matPlata = new THREE.MeshBasicMaterial({ color: col(P.agua), transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < 26; i++) {
    const f = filamentos[i % filamentos.length];
    const baja = rng.bool();
    const m = new THREE.Mesh(pulsoGeoAmbar, baja ? matAzucar : matPlata);
    g.add(m);
    pulsos.push({ m, a: baja ? f.b : f.a, b: baja ? f.a : f.b, t0: rng.float(0, 3), dur: rng.float(1.6, 3.2) });
  }

  // ── 3) EL ARBÚSCULO: árbol-fractal dentro de una célula (el trato firmado) ───
  const arbY = baseY - 27;
  const arbusculo = new THREE.Group(); arbusculo.position.set(cx, arbY, cz);
  // la célula-hospedera: burbuja translúcida con MISMO lenguaje fresnel que la
  // célula profunda (continuidad Powers-of-Ten: el arbúsculo YA vive en una célula)
  const celHost = new THREE.Mesh(new THREE.SphereGeometry(3.4, 24, 18),
    fresnelMat({ color: 0x2f6d5f, rim: 0x8fe6cf, power: 2.0, opacity: 0.06, rimOpacity: 0.5 }));
  arbusculo.add(celHost);
  // el fractal: ramificación recursiva (eco del Ent — fractal dentro del fractal)
  const arbMat = new THREE.MeshStandardMaterial({ color: 0xffe3a0, emissive: col(P.azucar), emissiveIntensity: 0.5, roughness: 0.5 });
  function rama(desde, dir, largo, radio, prof) {
    if (prof <= 0 || largo < 0.12) return;
    const fin = desde.clone().add(dir.clone().multiplyScalar(largo));
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(radio * 0.6, radio, largo, 5), arbMat);
    seg.position.copy(desde.clone().lerp(fin, 0.5));
    seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    arbusculo.add(seg);
    const n = 2 + (prof > 2 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const nd = dir.clone();
      nd.x += rng.float(-0.7, 0.7); nd.y += rng.float(-0.5, 0.3); nd.z += rng.float(-0.7, 0.7);
      nd.normalize();
      rama(fin, nd, largo * 0.68, radio * 0.62, prof - 1);
    }
  }
  rama(new THREE.Vector3(0, -2.6, 0), new THREE.Vector3(0, 1, 0), 1.5, 0.22, 5);
  g.add(arbusculo);

  // ═════════════════════════════════════════════════════════════════════════
  //  4) LA CÉLULA VEGETAL (capa más profunda) — nivel Anatomy Atelier
  //  Composición biológicamente correcta: la VACUOLA central ocupa el volumen y
  //  empuja los organelos a una corteza delgada contra la PARED. Cloroplastos
  //  protagonistas hugueando la pared; núcleo con nucléolo a un lado; mitos,
  //  Golgi, RE y ribosomas en la corteza; citoesqueleto cruzando el citoplasma.
  // ═════════════════════════════════════════════════════════════════════════
  const celY = baseY - 39;
  const celula = new THREE.Group(); celula.position.set(cx, celY, cz);

  const HALF = 4.6;                 // media-arista de la pared
  const Rvac = 2.55;                // radio de la vacuola central

  // -- PARED CELULAR (prismática) + membrana: doble capa con rim fresnel --------
  const pared = new THREE.Mesh(roundedBox(HALF * 2, 1.15, 8),
    fresnelMat({ color: 0xdfe4c6, rim: 0xf6f8e4, power: 1.7, opacity: 0.08, rimOpacity: 0.5 }));
  celula.add(pared);
  const membrana = new THREE.Mesh(roundedBox(HALF * 2 - 0.5, 1.05, 8),
    fresnelMat({ color: 0x9fd8cf, rim: 0xcdf3ea, power: 2.2, opacity: 0.05, rimOpacity: 0.55 }));
  celula.add(membrana);
  // halo de subsurface: pared exterior aditiva muy suave (glow del contorno)
  const paredGlow = new THREE.Mesh(roundedBox(HALF * 2 + 0.35, 1.2, 6),
    fresnelMat({ color: 0x101c16, rim: 0x9fe8c4, power: 2.6, opacity: 0.0, rimOpacity: 0.22, additive: true, side: THREE.BackSide }));
  celula.add(paredGlow);

  // -- VACUOLA CENTRAL (el rasgo vegetal): burbuja glassy azul-cian, la más
  //    grande; tonoplasto con rim luminoso. Respira suave. ---------------------
  const vacuola = new THREE.Mesh(new THREE.SphereGeometry(Rvac, 40, 30),
    fresnelMat({ color: 0x2f6d84, rim: 0x9be6ff, power: 1.5, opacity: 0.13, rimOpacity: 0.6 }));
  vacuola.position.set(0.35, -0.25, 0.1);
  celula.add(vacuola);
  // glint especular de la vacuola: un parche aditivo pequeño arriba-izquierda
  // (lee como reflejo de agua, NO como segunda burbuja concéntrica)
  const brilloVac = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xdaf6ff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  brilloVac.scale.set(1.3, 1.3, 1);
  brilloVac.position.set(vacuola.position.x - Rvac * 0.5, vacuola.position.y + Rvac * 0.55, vacuola.position.z + Rvac * 0.6);
  celula.add(brilloVac);

  // dirección radial de corteza: coloca un organelo en el «cascarón» entre la
  // vacuola y la pared, orientado tangente (cara plana hacia la pared).
  const placeCortex = (obj, dir, r, spin = 0) => {
    dir = dir.clone().normalize();
    obj.position.copy(dir).multiplyScalar(r);
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    obj.rotateY(spin);
  };

  // -- NÚCLEO con NUCLÉOLO + cromatina + envoltura nuclear (a un lado) ----------
  const nucleoG = new THREE.Group();
  const nucDir = new THREE.Vector3(-0.72, 0.55, 0.42);
  nucleoG.position.copy(nucDir).normalize().multiplyScalar(3.05);
  const envolturaNuc = new THREE.Mesh(new THREE.SphereGeometry(1.15, 28, 22),
    fresnelMat({ color: 0x5b4a8f, rim: 0xcdb8ff, power: 1.8, opacity: 0.22, rimOpacity: 0.6 }));
  nucleoG.add(envolturaNuc);
  const nucleolo = new THREE.Mesh(new THREE.SphereGeometry(0.44, 18, 14),
    new THREE.MeshStandardMaterial({ color: 0x3a2d63, emissive: 0x241a45, emissiveIntensity: 0.5, roughness: 0.45 }));
  nucleolo.position.set(0.22, 0.12, 0.1);
  nucleoG.add(nucleolo);
  // cromatina: motas suaves dentro del núcleo
  const cromM = new THREE.MeshStandardMaterial({ color: 0x8a78c4, emissive: 0x4a3c86, emissiveIntensity: 0.35, roughness: 0.5 });
  for (let i = 0; i < 14; i++) {
    const cr = new THREE.Mesh(new THREE.SphereGeometry(rng.float(0.06, 0.12), 7, 6), cromM);
    const a = rng.float(0, 6.28), b = rng.float(-1, 1), rr = rng.float(0.35, 0.92);
    cr.position.set(Math.cos(a) * rr * Math.cos(b), Math.sin(b) * rr, Math.sin(a) * rr * Math.cos(b));
    nucleoG.add(cr);
  }
  celula.add(nucleoG);

  // -- RETÍCULO ENDOPLÁSMICO: red de túbulos serpenteando junto al núcleo, con
  //    ribosomas (RE rugoso). ---------------------------------------------------
  const reG = new THREE.Group(); reG.position.copy(nucleoG.position);
  const reMat = fresnelMat({ color: 0xc9a877, rim: 0xf0dcae, power: 2.0, opacity: 0.4, rimOpacity: 0.5 });
  const ribos = [];
  // cisternas perinucleares: parches cortos y ondulados CEÑIDOS a la envoltura
  // nuclear (radio ≈ envoltura), no radiando. Cada strand serpentea en un patch.
  for (let s = 0; s < 4; s++) {
    const c0 = new THREE.Vector3(rng.float(-1, 1), rng.float(-1, 1), rng.float(-1, 1)).normalize();
    const u = new THREE.Vector3().crossVectors(c0, new THREE.Vector3(0, 1, 0.3)).normalize();
    const v = new THREE.Vector3().crossVectors(c0, u).normalize();
    const pts = [];
    for (let k = 0; k < 6; k++) {
      const a = k * 1.4, spread = 0.55;
      const p = c0.clone().multiplyScalar(1.22 + Math.sin(a) * 0.05)
        .add(u.clone().multiplyScalar(Math.cos(a) * spread))
        .add(v.clone().multiplyScalar((k / 5 - 0.5) * 1.1));
      pts.push(p);
    }
    const curvaRE = new THREE.CatmullRomCurve3(pts);
    const tubo = new THREE.Mesh(new THREE.TubeGeometry(curvaRE, 34, 0.06, 6, false), reMat);
    reG.add(tubo);
    for (let k = 0; k <= 34; k += 3) ribos.push(curvaRE.getPoint(k / 34));
  }
  celula.add(reG);

  // -- CLOROPLASTOS (protagonistas): hugueando la pared, en la corteza ----------
  const cloroplastos = [];
  const dirsCloro = [
    new THREE.Vector3(0.9, 0.25, 0.5), new THREE.Vector3(0.4, -0.6, 0.85),
    new THREE.Vector3(-0.3, -0.35, 0.95), new THREE.Vector3(0.85, -0.25, -0.4),
    new THREE.Vector3(-0.85, -0.2, 0.5), new THREE.Vector3(0.15, 0.85, -0.5),
    new THREE.Vector3(-0.55, 0.45, -0.75),
  ];
  dirsCloro.forEach((dir, i) => {
    const cl = makeCloroplasto(rng, rng.float(1.55, 1.95));
    placeCortex(cl, dir, 3.35 + rng.float(-0.1, 0.15), rng.float(0, 6.28));
    celula.add(cl);
    cloroplastos.push({ obj: cl, spin: rng.float(0.02, 0.06) * (rng.bool() ? 1 : -1), ph: rng.float(0, 6.28) });
  });

  // -- MITOCONDRIAS con crestas (esparcidas en la corteza) ---------------------
  const mitos = [];
  for (let i = 0; i < 5; i++) {
    const mi = makeMito(rng);
    const dir = new THREE.Vector3(rng.float(-1, 1), rng.float(-1, 1), rng.float(-1, 1));
    placeCortex(mi, dir, 3.0 + rng.float(-0.2, 0.3), rng.float(0, 6.28));
    mi.rotateZ(rng.float(-0.6, 0.6));
    celula.add(mi);
    mitos.push({ obj: mi, ph: rng.float(0, 6.28) });
  }

  // -- GOLGI (junto al núcleo) --------------------------------------------------
  const golgi = makeGolgi(rng);
  placeCortex(golgi, new THREE.Vector3(-0.2, 0.75, -0.6), 2.95, 0.5);
  celula.add(golgi);

  // -- RIBOSOMAS: los del RE (rugoso) + libres en el citoplasma (InstancedMesh) -
  const freeRibo = [];
  for (let i = 0; i < 40; i++) {
    const dir = new THREE.Vector3(rng.float(-1, 1), rng.float(-1, 1), rng.float(-1, 1)).normalize();
    freeRibo.push(dir.multiplyScalar(rng.float(2.7, 4.15)));
  }
  const todosRibo = ribos.map((p) => p.clone().add(reG.position)).concat(freeRibo);
  const riboMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 6, 5),
    new THREE.MeshStandardMaterial({ color: 0x8a6b3f, emissive: 0x3a2a14, emissiveIntensity: 0.4, roughness: 0.6 }), todosRibo.length);
  const _m4 = new THREE.Matrix4();
  todosRibo.forEach((p, i) => { _m4.makeTranslation(p.x, p.y, p.z); riboMesh.setMatrixAt(i, _m4); });
  riboMesh.instanceMatrix.needsUpdate = true;
  celula.add(riboMesh);

  // -- CITOESQUELETO: microtúbulos finos cruzando la corteza (cuerdas tangentes)
  const csPartes = [];
  const tuboCS = new THREE.CylinderGeometry(0.018, 0.018, 1, 5);
  for (let i = 0; i < 9; i++) {
    const a = new THREE.Vector3(rng.float(-1, 1), rng.float(-1, 1), rng.float(-1, 1)).normalize().multiplyScalar(HALF - 0.6);
    const b = new THREE.Vector3(rng.float(-1, 1), rng.float(-1, 1), rng.float(-1, 1)).normalize().multiplyScalar(HALF - 0.6);
    if (a.distanceTo(b) < 3) continue;
    const mid = a.clone().lerp(b, 0.5), dir = b.clone().sub(a), len = dir.length();
    const q = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
    csPartes.push(xf(tuboCS, mid, q, new THREE.Vector3(1, len, 1)));
  }
  if (csPartes.length) {
    const cs = new THREE.Mesh(concat(...csPartes),
      new THREE.MeshBasicMaterial({ color: 0xbcd6c4, transparent: true, opacity: 0.16, depthWrite: false }));
    celula.add(cs);
  }

  // -- CITOPLASMA VIVO: partículas suspendidas (streaming citoplasmático) -------
  const NP = 240;
  const ppos = new Float32Array(NP * 3);
  for (let i = 0; i < NP; i++) {
    const dir = new THREE.Vector3(rng.float(-1, 1), rng.float(-1, 1), rng.float(-1, 1)).normalize();
    const r = rng.float(Rvac + 0.15, HALF - 0.25);
    ppos[i * 3] = dir.x * r; ppos[i * 3 + 1] = dir.y * r; ppos[i * 3 + 2] = dir.z * r;
  }
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3));
  const particulas = new THREE.Points(pgeo,
    new THREE.PointsMaterial({ map: glowTex(), color: 0xfff0c8, size: 0.14, sizeAttenuation: true, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  particulas.frustumCulled = false;
  celula.add(particulas);

  // -- LUZ INTERNA de la célula (glow subsurface): un punto cálido en el centro
  //    y un relleno frío; distancia acotada → no fuga a la superficie. ----------
  const luzCel = new THREE.PointLight(0xfff0d0, 5.0, 15, 2.0);
  luzCel.position.set(0.4, 0.2, 1.0); celula.add(luzCel);
  const luzFria = new THREE.PointLight(0x8fd8ff, 2.2, 14, 2.0);
  luzFria.position.set(-2.5, 1.5, -2.0); celula.add(luzFria);

  celula.rotation.y = 0.35;   // ángulo de composición inicial (buena lectura)
  g.add(celula);

  // -- GLOW volumétrico alrededor de la célula (campo luminoso, NO negro) -------
  const glowBlobs = [];
  const glowSpec = [
    { c: 0x9fe8c4, s: 20, p: [0.5, -0.5, -6], o: 0.16 },
    { c: 0xffe6a6, s: 14, p: [-5, 2, -4], o: 0.12 },
    { c: 0x8fd0ff, s: 12, p: [5, -2, -3], o: 0.10 },
  ];
  glowSpec.forEach((b) => {
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: b.c, transparent: true, opacity: b.o, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    spr.scale.set(b.s, b.s, 1);
    spr.position.set(cx + b.p[0], celY + b.p[1], cz + b.p[2]);
    g.add(spr); glowBlobs.push(spr);
  });

  // ── FONDO del mundo micro: domo envolvente con GRADIENTE (teal-verde vivo, NO
  //    negro plano). Techo BAJO tierra (≈baseY-6) para no pintar el cielo. ──────
  const fondoGeo = new THREE.SphereGeometry(33, 24, 18);
  {
    const pos = fondoGeo.attributes.position, colr = new Float32Array(pos.count * 3);
    const cAlto = col(0x0b1a17), cMedio = col(0x123028), cBajo = col(0x1c4034), cCal = col(0x243a2e);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const yn = THREE.MathUtils.clamp(pos.getY(i) / 33 * 0.5 + 0.5, 0, 1);  // 0 abajo → 1 arriba
      if (yn > 0.5) c.copy(cMedio).lerp(cAlto, (yn - 0.5) / 0.5);
      else c.copy(cBajo).lerp(cMedio, yn / 0.5);
      c.lerp(cCal, 0.12);
      colr[i * 3] = c.r; colr[i * 3 + 1] = c.g; colr[i * 3 + 2] = c.b;
    }
    fondoGeo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  }
  const fondo = new THREE.Mesh(fondoGeo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: true }));
  fondo.position.set(cx, celY, cz); fondo.renderOrder = -15; g.add(fondo);   // techo ≈ baseY-6

  // -- STREAM de continuidad arbúsculo→célula (Powers-of-Ten): motas ascendiendo
  const NC = 70;
  const cpos = new Float32Array(NC * 3);
  for (let i = 0; i < NC; i++) {
    const t = i / NC, a = rng.float(0, 6.28), rr = rng.float(0, 1.4);
    cpos[i * 3] = cx + Math.cos(a) * rr; cpos[i * 3 + 1] = THREE.MathUtils.lerp(celY + 4, arbY - 1, t); cpos[i * 3 + 2] = cz + Math.sin(a) * rr;
  }
  const cgeo = new THREE.BufferGeometry(); cgeo.setAttribute('position', new THREE.BufferAttribute(cpos, 3));
  const conector = new THREE.Points(cgeo,
    new THREE.PointsMaterial({ map: glowTex(), color: 0xbfe8c8, size: 0.1, sizeAttenuation: true, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  conector.frustumCulled = false; g.add(conector);

  // ── ANCLAS del recorrido (mundo) + la CURVA continua (Powers of Ten) ────────
  const anclas = {
    copa: new THREE.Vector3(cx, baseY + coronaY, cz),
    pie: new THREE.Vector3(cx, baseY + 1.2, cz),
    suelo: new THREE.Vector3(cx, baseY - 1.6, cz + zc + 0.5),
    micorriza: new THREE.Vector3(cx + 1.2, micoY + 2, cz),
    arbusculo: new THREE.Vector3(cx + 0.6, arbY + 0.5, cz),
    celula: new THREE.Vector3(cx, celY, cz),
  };
  // puntos de cámara (un poco afuera del eje para mirar cada capa)
  const puntosCam = [
    new THREE.Vector3(cx + 4, baseY + coronaY + 2, cz + 8),
    new THREE.Vector3(cx + 3, baseY + 2, cz + 6),
    new THREE.Vector3(cx + 3, baseY - 1.6, cz + 5),
    new THREE.Vector3(cx + 4, micoY + 2, cz + 5),
    new THREE.Vector3(cx + 4, arbY + 1, cz + 5),
    new THREE.Vector3(cx + 5, celY, cz + 7),
  ];
  const curva = new THREE.CatmullRomCurve3(puntosCam, false, 'catmullrom', 0.5);
  const miradas = [anclas.copa, anclas.pie, anclas.suelo, anclas.micorriza, anclas.arbusculo, anclas.celula];

  const update = (t) => {
    // pulsos viajando por las hifas
    for (const p of pulsos) {
      const k = ((t - p.t0) % p.dur) / p.dur;
      p.m.position.copy(p.a).lerp(p.b, k);
      p.m.material.opacity = Math.sin(k * Math.PI) * 0.95;
    }
    // la catedral y el arbúsculo respiran / giran despacio
    raizGorda.rotation.y = t * 0.05;
    arbusculo.rotation.y = t * 0.08;
    // la célula: giro lento de composición + vacuola que respira + cloroplastos
    // que rotan (streaming) + partículas del citoplasma a la deriva
    celula.rotation.y = 0.35 + t * 0.03;
    vacuola.scale.setScalar(1 + Math.sin(t * 0.8) * 0.02);
    nucleoG.scale.setScalar(1 + Math.sin(t * 1.1) * 0.03);
    for (const c of cloroplastos) { c.obj.rotateY(c.spin * 0.03); c.obj.position.y += Math.sin(t * 0.6 + c.ph) * 0.0006; }
    for (const m of mitos) { m.obj.rotateY(0.006); m.obj.position.y += Math.sin(t * 0.7 + m.ph) * 0.0005; }
    particulas.rotation.y = t * 0.05;
    particulas.rotation.x = Math.sin(t * 0.1) * 0.1;
    conector.rotation.y = t * 0.04;
  };

  return { group: g, anclas, curva, miradas, update };
}
