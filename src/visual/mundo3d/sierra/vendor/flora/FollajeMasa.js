/* ─────────────────────────────────────────────────────────────────────────────
 * COPIA VERBATIM VENDORIZADA — NO EDITAR A MANO.
 *
 * Original: `~/demos/3d/lib3d/flora/FollajeMasa.js` (valle). Se trae al bundle
 * de la PWA para el descenso por la Sierra.
 *
 * Licencia: MIT (Sylva / Token-Gremlin), notice completo al pie del archivo.
 * ───────────────────────────────────────────────────────────────────────────── */
/* eslint-disable */
/* ── INICIO COPIA VERBATIM ── */
// ── FollajeMasa.js — copas que se leen como MASA, no como hojas contables ────
//
// REGLA DURA del operador (2026-08-03, gate Humboldt): el follaje de una copa
// real se lee como una MASA densa — si al mirar el árbol se pueden CONTAR las
// hojas (planos poligonales sueltos, facetas low-poly grandes, "hojitas"), está
// MAL. La silueta + la densidad hacen el árbol, no las hojas sueltas.
//
// Técnica: por cada copa (lista de esferas/lóbulos) se arma
//   1. un NÚCLEO opaco esculpido con ruido y normales SUAVES (nada de facetas),
//      pintado en tonos de sombra — es el interior de la copa, tapa huecos;
//   2. una capa DENSA de alpha-cards texturizados (textura canvas de follaje con
//      cientos de hojitas y alpha en el borde) sembrados sobre la superficie de
//      los lóbulos — la silueta se rompe orgánica y la copa lee como follaje
//      denso ilustrado (lámina Humboldt/Ghibli), sin poderse contar hojas.
// Todo fusionado: 2 draw calls por copa (núcleo + cards), da igual cuántos lóbulos.
//
// PORTABLE entre demos con importmaps distintos: cada función recibe THREE como
// primer argumento (bosque-ent/, tierra-caliente/ y valle-trees/ comparten este
// archivo por symlink; python http.server sigue symlinks).
//
// El viento NO vive aquí: los materiales que devuelve esto se parchean afuera
// con `aplicarVientoMundo(mat)` (valle) o se cuelgan del grupo-copa que ya se
// mece (Ents standalone). Determinista por seed: el gate visual compara.

// ── PRNG determinista (mismo follaje cada carga) ─────────────────────────────
function prngMasa(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ruido barato 2D (para esculpir el núcleo)
function hashM(x, z) {
  const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
function vnoiseM(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hashM(xi, zi), b = hashM(xi + 1, zi), c = hashM(xi, zi + 1), d = hashM(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbmM(x, z) {
  let s = 0, amp = 1, f = 1, norm = 0;
  for (let i = 0; i < 4; i++) { s += amp * vnoiseM(x * f, z * f); norm += amp; amp *= 0.5; f *= 2.05; }
  return s / norm;
}

// ═════════════════════════════════════════════════════════════════════════════
//  TEXTURA DE FOLLAJE (canvas, determinista): cientos de hojitas en capas —
//  sombra abajo, luz arriba — con alpha ralo hacia el borde. En pantalla cada
//  hojita queda de centímetros: imposible contarlas, la copa lee como masa.
// ═════════════════════════════════════════════════════════════════════════════
export function texturaFollaje(THREE, opts = {}) {
  const seed = opts.seed ?? 11;
  const tam = opts.tam ?? 512;
  // tonos: oscuro (fondo/sombra), medio (cuerpo), claro (luz). CSS hex.
  const oscuro = opts.oscuro ?? '#2e4a2a';
  const medio = opts.medio ?? '#43593b';
  const claro = opts.claro ?? '#7a9a3f';
  const nHojas = opts.hojas ?? 380;
  const alargue = opts.alargue ?? 2.4;        // largo/ancho de la hojita
  const hojaProcedural = opts.procedural !== false;
  const rn = prngMasa(seed * 7919 + 13);

  const cv = document.createElement('canvas');
  cv.width = cv.height = tam;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, tam, tam);
  const R = tam / 2;

  const lerpHex = (a, b, t) => {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = ((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t;
    const g = ((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t;
    const bl = (pa & 255) + ((pb & 255) - (pa & 255)) * t;
    return `rgb(${r | 0},${g | 0},${bl | 0})`;
  };

  // punto con centro denso y borde ralo (el alpha del card cae orgánico)
  const punto = (spread) => {
    const a = rn() * Math.PI * 2;
    const r = R * Math.pow(rn(), 0.58) * spread;
    return [R + Math.cos(a) * r, R + Math.sin(a) * r, r / R];
  };
  const hojita = (x, y, L, tono, alpha, rot) => {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = tono;
    const ancho = L / alargue;
    ctx.beginPath();
    if (hojaProcedural) {
      // Hoja procedural: punta, hombros y nervadura. Una elipse se leía como
      // mancha redonda cuando el card se acercaba; esta silueta conserva masa,
      // pero devuelve un eje longitudinal reconocible.
      ctx.moveTo(-L, 0);
      ctx.bezierCurveTo(-L * 0.45, -ancho, L * 0.48, -ancho * 0.92, L, 0);
      ctx.bezierCurveTo(L * 0.48, ancho * 0.92, -L * 0.45, ancho, -L, 0);
    } else {
      ctx.ellipse(0, 0, L, ancho, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    if (hojaProcedural) {
      ctx.globalAlpha = alpha * 0.34;
      ctx.strokeStyle = '#d1df9a';
      ctx.lineWidth = Math.max(1, L * 0.055);
      ctx.beginPath(); ctx.moveTo(-L * 0.82, 0); ctx.lineTo(L * 0.78, 0); ctx.stroke();
    }
    ctx.restore();
  };

  // capa 1 — SOMBRA interna: manchas grandes difusas, solo hacia el centro
  for (let i = 0; i < Math.round(nHojas * 0.22); i++) {
    const [x, y] = punto(0.72);
    hojita(x, y, tam * 0.055 + rn() * tam * 0.05, lerpHex(oscuro, medio, rn() * 0.3), 0.55, rn() * Math.PI);
  }
  // capa 2 — CUERPO: hojitas medianas, tonos medios con jitter
  for (let i = 0; i < Math.round(nHojas * 0.48); i++) {
    const [x, y, rr] = punto(0.96);
    const t = rn() * 0.55 + rr * 0.2;   // hacia el borde algo más claro (luz rasante)
    hojita(x, y, tam * 0.022 + rn() * tam * 0.024, lerpHex(medio, claro, t), 0.9, rn() * Math.PI);
  }
  // capa 3 — LUZ: hojitas pequeñas claras, sesgadas arriba (el sol viene de arriba)
  for (let i = 0; i < Math.round(nHojas * 0.3); i++) {
    const [x, y] = punto(0.9);
    const yLuz = y - tam * 0.06 * rn(); // leve sesgo hacia arriba
    hojita(x, yLuz, tam * 0.016 + rn() * tam * 0.02, lerpHex(medio, claro, 0.55 + rn() * 0.45), 0.85, rn() * Math.PI);
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = opts.anisotropy ?? 4;
  return tex;
}

// ═════════════════════════════════════════════════════════════════════════════
//  MATERIALES
// ═════════════════════════════════════════════════════════════════════════════
// cards: alphaTest (sin sorting), doble cara, vertexColors = modulación de luz.
// `brillo` = translucidez ilustrada de la hoja (emissiveMap = map): sin él, la
// panza de la copa a contraluz rinde NEGRA (caras hacia abajo sin luz directa).
export function materialFollaje(THREE, tex, opts = {}) {
  const brillo = opts.brillo ?? 0;
  const m = new THREE.MeshStandardMaterial({
    map: tex, alphaTest: opts.alphaTest ?? 0.28, side: THREE.DoubleSide,
    vertexColors: true, roughness: 1, metalness: 0,
    ...(brillo > 0 ? { emissive: new THREE.Color(1, 1, 1), emissiveIntensity: brillo, emissiveMap: tex } : {}),
  });
  // Encargo flora-viento (2026-08-11): anti-centelleo y backlight vienen
  // ENCENDIDOS por defecto — TODA copa de masa los hereda sin tocar llamadores.
  // Opt-out con `false`; afinado pasando un objeto de opciones.
  if (opts.antiCentelleo !== false) {
    aplicarAntiCentelleo(THREE, m, typeof opts.antiCentelleo === 'object' ? opts.antiCentelleo : {});
  }
  if (opts.backlight !== false) {
    aplicarBacklight(THREE, m, { fuerza: 0.35, ...(typeof opts.backlight === 'object' ? opts.backlight : {}) });
  }
  // Sylva s39: oclusión horneada por árbol (opt-in por módulo o por `oclusion`).
  if (quiereOclusion(opts)) aplicarOclusionHorneada(THREE, m, typeof opts.oclusion === 'object' ? opts.oclusion : {});
  return m;
}
// núcleo: opaco, vertexColors (tonos sombra), normales suaves (NADA de facetas).
// brillo/tono: piso de luz (sin él, visto desde abajo con hemisferio oscuro el
// núcleo rinde NEGRO plano).
export function materialNucleo(THREE, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  if (opts.brillo > 0) {
    m.emissive = new THREE.Color(opts.tono ?? '#3c5a30');
    m.emissiveIntensity = opts.brillo;
  }
  if (quiereOclusion(opts)) aplicarOclusionHorneada(THREE, m, typeof opts.oclusion === 'object' ? opts.oclusion : {});
  return m;
}

// ═════════════════════════════════════════════════════════════════════════════
//  BACKLIGHT — subsurface aproximado a contraluz (robado de three-stylized,
//  Steve245270533, MIT; vía cortiz2894/stylized-components). El follaje se
//  siente "atravesado por el sol": cuando la cámara mira hacia el sol a través
//  de una hoja fina, la hoja se enciende. Tres factores (del fragment original):
//    viewToSun = cuánto mira la cámara hacia el sol, elevado a uBacklightPower
//    edgeOn    = cuánto está la hoja de filo frente a la luz (1 - |dot(N,L)|)
//    thinTip   = la punta más fina transmite más (mix por vUv.y)
//  Adaptado a r160: se inyecta en el fragment de MeshStandardMaterial antes de
//  `#include <opaque_fragment>`; usa `normal`/`vUv`/`vViewPosition` (espacio
//  vista) y `viewMatrix` para llevar la dirección del sol a espacio vista.
//  `fuerza <= 0` = apagado: no parchea nada (coste cero).
// ═════════════════════════════════════════════════════════════════════════════
export function aplicarBacklight(THREE, mat, opts = {}) {
  const fuerza = opts.fuerza ?? 0;
  if (fuerza <= 0 || (mat.userData && mat.userData.__backlight)) return mat;
  const color = opts.color ?? '#dfe66a';
  const potencia = opts.potencia ?? 3;
  const punta = opts.punta ?? 0.6;
  const direccion = opts.direccion ?? new THREE.Vector3(-0.4, 0.85, 0.3);
  mat.userData = mat.userData || {};
  mat.userData.__backlight = true;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uBacklightColor = { value: new THREE.Color(color) };
    shader.uniforms.uBacklightStrength = { value: fuerza };
    shader.uniforms.uBacklightPower = { value: potencia };
    shader.uniforms.uBacklightTip = { value: punta };
    shader.uniforms.uBacklightDir = { value: direccion.clone().normalize() };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uBacklightColor;
        uniform float uBacklightStrength;
        uniform float uBacklightPower;
        uniform float uBacklightTip;
        uniform vec3 uBacklightDir;`
      )
      .replace(
        '#include <opaque_fragment>',
        `{
          vec3 _lDirV = normalize(mat3(viewMatrix) * uBacklightDir);
          vec3 _viewDir = normalize(-vViewPosition);
          float _viewToSun = pow(max(dot(_viewDir, -_lDirV), 0.0), uBacklightPower);
          // edgeOn quiere la normal REAL de la hoja: si el anti-centelleo
          // aplano la normal hacia UP, aca se usa la copia previa al aplanado
          // (como en el original: vBladeNormal para edgeOn, UP para el difuso).
          #ifdef FOLLAJE_NORMAL_REAL
            float _edgeOn = 1.0 - abs(dot(_normalHojaFol, _lDirV));
          #else
            float _edgeOn = 1.0 - abs(dot(normal, _lDirV));
          #endif
          float _thinTip = 1.0;
          #ifdef USE_UV
            _thinTip = mix(1.0, vUv.y, uBacklightTip);
          #endif
          outgoingLight += uBacklightColor * (_viewToSun * _edgeOn * _thinTip) * uBacklightStrength;
        }
        #include <opaque_fragment>`
      );
    if (prev) prev(shader);
  };
  mat.needsUpdate = true;
  return mat;
}

// ═════════════════════════════════════════════════════════════════════════════
//  ANTI-CENTELLEO — difuso aplanado al vector UP (robado de three-stylized,
//  Steve245270533, MIT; vía cortiz2894/stylized-components). Cada card del
//  follaje lleva su propia normal: con ella el difuso agarra un valor distinto
//  por card y el campo TITILA al mover la cámara. El original lo resuelve
//  aplanando la normal de ILUMINACIÓN hacia UP («Flattening diffuse lighting to
//  the up vector avoids random per-ribbon shimmer»): la luz queda estable y el
//  volumen lo siguen poniendo los vertexColors, la textura y el backlight.
//  `aplanado` ∈ 0..1 mezcla normal real → UP (def 0.85; 0 = apagado, no parchea).
//  Deja `_normalHojaFol` (la normal real) + #define FOLLAJE_NORMAL_REAL para que
//  el backlight siga midiendo edgeOn contra la hoja de verdad.
// ═════════════════════════════════════════════════════════════════════════════
export function aplicarAntiCentelleo(THREE, mat, opts = {}) {
  const aplanado = opts.aplanado ?? 0.85;
  if (aplanado <= 0 || (mat.userData && mat.userData.__antiCentelleo)) return mat;
  mat.userData = mat.userData || {};
  mat.userData.__antiCentelleo = true;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uAplanadoUp = { value: aplanado };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        #define FOLLAJE_NORMAL_REAL
        uniform float uAplanadoUp;`
      )
      .replace(
        '#include <normal_fragment_begin>',
        `#include <normal_fragment_begin>
        vec3 _normalHojaFol = normal;
        normal = normalize(mix(normal, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz), uAplanadoUp));`
      );
    if (prev) prev(shader);
  };
  mat.needsUpdate = true;
  return mat;
}

// ═════════════════════════════════════════════════════════════════════════════
//  OCLUSIÓN HORNEADA POR ÁRBOL — Sylva s39 (Token-Gremlin/realistic-forest,
//  MIT © 2026 Token Gremlin; notice completo en lib3d/flora/LICENSE-sylva-MIT).
//  Sylva no usa SSAO en el follaje: cada árbol trae su oclusión HORNEADA y la
//  escribe al G-buffer (alpha de albedo, `s.occ`) para multiplicar ambiente/
//  cielo/rebote. Fórmulas portadas de src/veg/treeMaterials.js + deferred.js:
//    hoja:    occ = mix(0.62, 1.0, heightNorm)          (altura sobre la base)
//    card:    occ = mix(0.28, 1.0, shade)               (panza oscura, cumbre viva)
//    corteza: occ = mix(0.50, 1.0, smoothstep(0.05, 0.6, h))   (contacto al pie)
//    luz:     ambiente *= ao · envSpec *= mix(0.35, 1, ao) · rebote *= 0.4+0.6·ao
//  Aquí (forward, MeshStandardMaterial r160) va como ATRIBUTO por vértice
//  `aoHorneada` calculado al HORNEAR la copa (altura normalizada en la envolvente
//  de lóbulos × profundidad del vértice dentro de la masa) y aplicado en
//  <aomap_fragment>. Como la masa instanciada del valle NO proyecta sombra sobre
//  sí misma (castShadow=false), una fracción `directo` también atenúa la luz
//  directa — igual que Sylva oscurece el albedo del card con `shade`. Costo:
//  un float por vértice + un varying + tres multiplicaciones; cero pases extra.
//  `defaultAttributeValues` cubre geometrías fusionadas sin el atributo (leen
//  1.0, no 0.0 = negro). Toggle en vivo para A/B sin recargar: window.__aoHorneado.
// ═════════════════════════════════════════════════════════════════════════════
const estadoAO = { activo: false, fuerza: 1, directo: 0.5 };
const registroAO = new Set();
export function configurarOclusionHorneada(opts = {}) {
  for (const k of ['activo', 'fuerza', 'directo']) {
    if (opts[k] !== undefined && (k === 'activo' || Number.isFinite(opts[k]))) estadoAO[k] = opts[k];
  }
  return { ...estadoAO };
}
// cambia la intensidad de TODOS los materiales ya parcheados (mismo frame, sin
// recompilar): fuerza 0 = baseline exacto, 1 = horneado completo.
export function setOclusionHorneada(fuerza, directo) {
  for (const r of registroAO) {
    if (Number.isFinite(fuerza)) r.uFuerza.value = fuerza;
    if (Number.isFinite(directo)) r.uDirecto.value = directo;
  }
  return registroAO.size;
}
if (typeof window !== 'undefined') {
  window.__aoHorneado = {
    estado: () => ({ ...estadoAO, materiales: registroAO.size }),
    fuerza: setOclusionHorneada,
  };
}
function quiereOclusion(opts) {
  if (opts.oclusion === false) return false;
  if (opts.oclusion === true || typeof opts.oclusion === 'object') return true;
  return estadoAO.activo;
}
const _ss = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function contextoOclusion(esferas) {
  let yMin = Infinity, yMax = -Infinity;
  for (const e of esferas) {
    const sy = (e.esc ?? [1, 1, 1])[1];
    yMin = Math.min(yMin, e.c[1] - e.r * sy);
    yMax = Math.max(yMax, e.c[1] + e.r * sy);
  }
  return { esferas, yMin, yMax, span: Math.max(1e-3, yMax - yMin) };
}
// 1 = sobre la superficie del lóbulo más cercano (o afuera); <1 = hundido en la masa
function superficieN(ctx, x, y, z) {
  let dmin = Infinity;
  for (const e of ctx.esferas) {
    const [sx, sy, sz] = e.esc ?? [1, 1, 1];
    const dx = (x - e.c[0]) / (e.r * sx), dy = (y - e.c[1]) / (e.r * sy), dz = (z - e.c[2]) / (e.r * sz);
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < dmin) dmin = d;
  }
  return Math.min(1, dmin);
}
// Atributo `aoHorneada` para una geometría de copa (núcleo o cards) en el
// espacio local del árbol. piso = Sylva leaf 0.62 (panza); hondo = card hundido
// / interior; nucleo = factor extra del núcleo (interior por definición).
export function atributoOclusionCopa(THREE, geo, esferas, opts = {}) {
  const ctx = contextoOclusion(esferas);
  const piso = opts.piso ?? 0.62, hondo = opts.hondo ?? 0.55, nucleo = opts.nucleo ?? 1;
  const P = geo.attributes.position;
  const out = new Float32Array(P.count);
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const hS = _ss((y - ctx.yMin) / ctx.span, 0.0, 0.85);   // cumbre 15% plena
    const sN = superficieN(ctx, x, y, z);
    out[i] = (piso + (1 - piso) * hS) * (hondo + (1 - hondo) * sN) * nucleo;
  }
  geo.setAttribute('aoHorneada', new THREE.BufferAttribute(out, 1));
  return geo;
}
// Fuste/tronco: contacto con el suelo (Sylva bark: mix(0.50, 1, smoothstep(0.05, 0.6, h))).
export function atributoOclusionTronco(THREE, geo, opts = {}) {
  const P = geo.attributes.position;
  let yMin = opts.yMin ?? Infinity, yMax = opts.yMax ?? -Infinity;
  if (opts.yMin === undefined || opts.yMax === undefined) {
    for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y < yMin) yMin = y; if (y > yMax) yMax = y; }
  }
  const span = Math.max(1e-3, yMax - yMin), piso = opts.piso ?? 0.5;
  const out = new Float32Array(P.count);
  for (let i = 0; i < P.count; i++) out[i] = piso + (1 - piso) * _ss((P.getY(i) - yMin) / span, 0.05, 0.6);
  geo.setAttribute('aoHorneada', new THREE.BufferAttribute(out, 1));
  return geo;
}
// Parche de material: lee `aoHorneada`, multiplica indirecta (cielo/hemisferio)
// y, por `directo`, también la luz directa. Encadena onBeforeCompile previos.
export function aplicarOclusionHorneada(THREE, mat, opts = {}) {
  if (mat.userData && mat.userData.__aoHorneada) return mat;
  mat.userData = mat.userData || {};
  mat.userData.__aoHorneada = true;
  const uFuerza = { value: opts.fuerza ?? estadoAO.fuerza };
  const uDirecto = { value: opts.directo ?? estadoAO.directo };
  registroAO.add({ uFuerza, uDirecto });
  mat.defaultAttributeValues = { ...(mat.defaultAttributeValues || {}), aoHorneada: [1] };
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uAoFuerza = uFuerza;
    shader.uniforms.uAoDirecto = uDirecto;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aoHorneada;\nvarying float vAoHorneada;')
      .replace('#include <begin_vertex>', 'vAoHorneada = aoHorneada;\n#include <begin_vertex>');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uAoFuerza;\nuniform float uAoDirecto;\nvarying float vAoHorneada;')
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
        {
          float _aoH = mix(1.0, clamp(vAoHorneada, 0.0, 1.0), uAoFuerza);
          reflectedLight.indirectDiffuse *= _aoH;
          reflectedLight.indirectSpecular *= mix(0.35, 1.0, _aoH);
          float _aoD = mix(1.0, _aoH, uAoDirecto);
          reflectedLight.directDiffuse *= _aoD;
          reflectedLight.directSpecular *= _aoD;
        }`);
    if (prev) prev(shader);
  };
  mat.needsUpdate = true;
  return mat;
}

// ═════════════════════════════════════════════════════════════════════════════
//  TEXTURA MOTEADA TILEABLE (sin alpha): para copas por UV (InstancedMesh de
//  fondo) — moteo denso de hojitas que NO depende de la densidad de vértices.
// ═════════════════════════════════════════════════════════════════════════════
export function texturaMoteado(THREE, opts = {}) {
  const seed = opts.seed ?? 3;
  const tam = opts.tam ?? 256;
  const base = opts.base ?? '#3c6a30';
  const claro = opts.claro ?? '#6f9a3f';
  const oscuro = opts.oscuro ?? '#2c4a24';
  const n = opts.manchas ?? 420;
  const rn = prngMasa(seed * 4409 + 3);
  const cv = document.createElement('canvas');
  cv.width = cv.height = tam;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = base; ctx.fillRect(0, 0, tam, tam);
  const lerpHex = (a, b, t) => {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = ((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t;
    const g = ((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t;
    const bl = (pa & 255) + ((pb & 255) - (pa & 255)) * t;
    return `rgb(${r | 0},${g | 0},${bl | 0})`;
  };
  for (let i = 0; i < n; i++) {
    const x = rn() * tam, y = rn() * tam, L = tam * (0.014 + rn() * 0.03);
    const t = rn();
    const tono = t < 0.42 ? lerpHex(base, oscuro, rn() * 0.9) : lerpHex(base, claro, (t - 0.42) * 1.5);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rn() * Math.PI);
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = tono;
    ctx.beginPath(); ctx.ellipse(0, 0, L, L / 2.3, 0, 0, Math.PI * 2); ctx.fill();
    // tile-safe: repetir la mancha desplazada en los 4 bordes
    for (const [dx, dy] of [[-tam, 0], [tam, 0], [0, -tam], [0, tam]]) {
      ctx.save(); ctx.translate(dx, dy);
      ctx.beginPath(); ctx.ellipse(0, 0, L, L / 2.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ═════════════════════════════════════════════════════════════════════════════
//  NÚCLEO — esferas esculpidas con ruido, normales suaves, merge indexado.
//  `esferas`: [{ c:[x,y,z], r, esc:[sx,sy,sz]? }]
//  `gradiente(x,y,z)` → THREE.Color (se COPIA de inmediato; puede reusar un tmp)
// ═════════════════════════════════════════════════════════════════════════════
export function geometriaNucleoMasa(THREE, esferas, opts = {}) {
  const seed = opts.seed ?? 5;
  const rugosidad = opts.rugosidad ?? 0.34;
  const sombra = opts.sombra ?? 0.42;         // el núcleo es INTERIOR de copa: sombra
                                              // notoria — si queda claro, lee como bola
                                              // de plastilina asomando entre los cards
  const encoger = opts.encoger ?? 1;          // <1: hunde el núcleo bajo los cards
  const gradiente = opts.gradiente ?? (() => new THREE.Color('#3f6f3a'));
  const negroVerde = new THREE.Color(opts.tonoSombra ?? '#22371f');
  const rn = prngMasa(seed * 331 + 7);

  // `segs` (opcional, ADITIVO): [anchoSeg, altoSeg] de cada esfera-lóbulo.
  // Default intacto [18, 13] (héroes); los bosques instanciados piden menos.
  const [wSeg, hSeg] = opts.segs ?? [18, 13];
  const geos = [];
  for (const e of esferas) {
    const [sx, sy, sz] = e.esc ?? [1, 1, 1];
    const off = rn() * 90;
    const geo = new THREE.SphereGeometry(e.r, wSeg, hSeg);
    const P = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < P.count; i++) {
      v.set(P.getX(i), P.getY(i), P.getZ(i));
      const d = v.length() || 1;
      const n = fbmM(v.x / d * 1.9 + v.y / d * 1.3 + off, v.z / d * 1.9 - v.y / d * 1.1 + off * 0.7);
      const k = (1 + (n - 0.5) * rugosidad) * encoger;
      v.multiplyScalar(k);
      P.setXYZ(i, v.x * sx, v.y * sy, v.z * sz);
    }
    geo.translate(e.c[0], e.c[1], e.c[2]);
    geo.computeVertexNormals();               // indexada → normales SUAVES
    // color por vértice: gradiente hundido a sombra (es el interior de la copa)
    const n = P.count, colArr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const c = gradiente(P.getX(i), P.getY(i), P.getZ(i));
      const r = c.r, g = c.g, b = c.b; // copia inmediata (gradiente puede reusar tmp)
      colArr[i * 3] = r + (negroVerde.r - r) * sombra;
      colArr[i * 3 + 1] = g + (negroVerde.g - g) * sombra;
      colArr[i * 3 + 2] = b + (negroVerde.b - b) * sombra;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
    geos.push(geo);
  }
  // merge INDEXADO manual (todas homogéneas: position+normal+uv+color+index)
  let nv = 0, ni = 0;
  for (const g of geos) { nv += g.attributes.position.count; ni += g.index.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), colr = new Float32Array(nv * 3);
  const uv = new Float32Array(nv * 2);
  const idx = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, ov * 3);
    nor.set(g.attributes.normal.array, ov * 3);
    colr.set(g.attributes.color.array, ov * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, ov * 2);
    const ia = g.index.array;
    for (let i = 0; i < ia.length; i++) idx[oi + i] = ia[i] + ov;
    ov += g.attributes.position.count; oi += ia.length;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  // Sylva s39: el núcleo es INTERIOR de copa → oclusión horneada con factor extra.
  atributoOclusionCopa(THREE, out, esferas, { nucleo: opts.aoNucleo ?? 0.8 });
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
//  FUSIÓN QUE PRESERVA NORMALES — para mezclar madera (normales de cilindro) con
//  copas suaves (normales esféricas) en UNA geometría no-indexada SIN recalcular
//  (recalcular sobre no-indexado = flat = facetas contables, justo lo prohibido).
//  Exige position+normal en cada geo; color se rellena blanco si falta.
// ═════════════════════════════════════════════════════════════════════════════
export function fusionarPreservando(THREE, geos) {
  const gs = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0;
  for (const g of gs) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), colr = new Float32Array(n * 3);
  const uv = new Float32Array(n * 2);
  const ao = new Float32Array(n).fill(1);   // Sylva s39: sin atributo = sin oclusión (1), nunca 0
  let o = 0;
  for (const g of gs) {
    const cnt = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.color) colr.set(g.attributes.color.array, o * 3);
    else for (let i = 0; i < cnt * 3; i++) colr[o * 3 + i] = 1;
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    if (g.attributes.aoHorneada) ao.set(g.attributes.aoHorneada.array, o);
    o += cnt; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setAttribute('aoHorneada', new THREE.BufferAttribute(ao, 1));
  out.computeBoundingSphere();
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
//  CARDS — quads texturizados densos sobre la superficie de los lóbulos.
//  El vertexColor NO es el verde (ya viene en la textura): es MODULACIÓN de luz
//  derivada del gradiente — blanco.lerp(gradiente, modulacion) — para que el
//  card en sombra baje y el de la cumbre encienda, sin doble-saturar el verde.
// ═════════════════════════════════════════════════════════════════════════════
// Marco estable para una hoja: la normal sale del dosel y el eje longitudinal
// nace vertical, proyectado sobre la tangente. El roll aleatorio evita una
// corona con abanico repetido sin perder orientación de especie.
export function orientarHojaSylva(THREE, normal, rn, opts = {}) {
  const n = normal.clone().normalize();
  const verticalidad = THREE.MathUtils.clamp(opts.verticalidad ?? 0.32, 0, 1);
  const eje = new THREE.Vector3(0, 1, 0).lerp(n, verticalidad);
  eje.addScaledVector(n, -eje.dot(n));
  if (eje.lengthSq() < 1e-5) eje.set(1, 0, 0).addScaledVector(n, -n.x).normalize();
  else eje.normalize();
  const lateral = new THREE.Vector3().crossVectors(n, eje).normalize();
  const roll = (rn() - 0.5) * Math.PI * 2;
  const tangente = eje.clone().multiplyScalar(Math.cos(roll)).addScaledVector(lateral, Math.sin(roll)).normalize();
  const lado = new THREE.Vector3().crossVectors(n, tangente).normalize();
  return { normal: n, tangente, lado };
}

export function geometriaCardsMasa(THREE, esferas, opts = {}) {
  const seed = opts.seed ?? 9;
  const cobertura = opts.cobertura ?? 1.15;   // 1 = tapiz justo; >1 = solape
  const modulacion = opts.modulacion ?? 0.42; // suave: el verde ya viene en el map
  const gradiente = opts.gradiente ?? (() => new THREE.Color('#3f6f3a'));
  const rn = prngMasa(seed * 173 + 41);

  const P = [], N = [], UV = [], COL = [];
  const dir = new THREE.Vector3(), pos = new THREE.Vector3(), tmpC = new THREE.Color();
  const blanco = new THREE.Color(1, 1, 1);
  const esq = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const hojaProcedural = opts.hojaProcedural === true;

  const gauss = () => (rn() + rn() + rn()) - 1.5; // aprox normal(0, ~0.65)

  for (const e of esferas) {
    const [sx, sy, sz] = e.esc ?? [1, 1, 1];
    // superficie del elipsoide: media CUADRÁTICA de escalas (la aritmética se
    // queda corta y deja calvas — bola lisa asomando entre parches)
    const rEf = e.r * Math.sqrt((sx * sx + sy * sy + sz * sz) / 3);
    const t0 = opts.tamCard ?? Math.min(3.4, Math.max(1.2, rEf * 0.62));
    // ×1.45: factor de relleno (el card tiene alpha ralo en el borde)
    let n = Math.round(cobertura * 4 * Math.PI * (rEf / t0) * (rEf / t0) * 1.45);
    n = Math.min(opts.maxCards ?? 750, Math.max(opts.minCards ?? 20, n));

    for (let i = 0; i < n; i++) {
      // dirección uniforme en la esfera
      dir.set(gauss(), gauss(), gauss());
      if (dir.lengthSq() < 1e-4) dir.set(0, 1, 0);
      dir.normalize();
      // 72% pegados a la superficie, 28% hundidos (tapan el interior sin
      // engordar la silueta ni dejar cards flotando despegados)
      const prof = rn() < 0.72 ? (0.88 + rn() * 0.16) : (0.62 + rn() * 0.25);
      pos.set(
        e.c[0] + dir.x * e.r * prof * sx,
        e.c[1] + dir.y * e.r * prof * sy,
        e.c[2] + dir.z * e.r * prof * sz
      );
      // orientación: el baseline usa el mismo card plano; la variante
      // procedural fija un eje de crecimiento en el plano tangente.
      const jx = dir.x + gauss() * 0.5, jy = dir.y + gauss() * 0.5, jz = dir.z + gauss() * 0.5;
      const jl = Math.hypot(jx, jy, jz) || 1;
      const marco = orientarHojaSylva(THREE, new THREE.Vector3(jx / jl, jy / jl, jz / jl), rn, {
        verticalidad: opts.verticalidad,
      });
      const t = t0 * (0.75 + rn() * 0.55);
      const w = t / 2, h = t * 0.92 / 2;
      if (hojaProcedural) {
        const ancho = t * (0.28 + rn() * 0.08);
        const arco = t * (0.05 + rn() * 0.07);
        const base = marco.tangente.clone().multiplyScalar(-h * 0.58);
        const centro = marco.tangente.clone().multiplyScalar(h * 0.08);
        const punta = marco.tangente.clone().multiplyScalar(h * 0.58);
        const p0 = base;
        const p2 = centro.clone().addScaledVector(marco.lado, -ancho);
        const p3 = centro.clone().addScaledVector(marco.lado, ancho);
        const p4 = punta.clone().addScaledVector(marco.normal, arco);
        // Cometa de dos triángulos: base estrecha, hombros y punta. Mantiene
        // el presupuesto del card anterior (2 triángulos) y cambia la
        // silueta, no la cantidad de geometría.
        const tri = [p0, p2, p4, p0, p4, p3];
        const uvHoja = [[0.5, 0.08], [0.02, 0.58], [0.5, 0.98], [0.5, 0.08], [0.5, 0.98], [0.98, 0.58]];
        const flip = rn() < 0.5 ? 1 : 0;
        const gc = gradiente(pos.x, pos.y, pos.z);
        tmpC.copy(blanco).lerp(gc, modulacion);
        const lum = 0.85 + rn() * 0.35;
        const cr = Math.min(1.2, tmpC.r * lum), cg = Math.min(1.2, tmpC.g * lum), cb = Math.min(1.2, tmpC.b * lum);
        for (let k = 0; k < tri.length; k++) {
          const v = tri[k].clone().add(pos);
          P.push(v.x, v.y, v.z); N.push(marco.normal.x, marco.normal.y, marco.normal.z);
          const uv = uvHoja[k]; UV.push(flip ? 1 - uv[0] : uv[0], uv[1]); COL.push(cr, cg, cb);
        }
        continue;
      }
      esq[0].copy(marco.lado).multiplyScalar(-w).addScaledVector(marco.tangente, -h);
      esq[1].copy(marco.lado).multiplyScalar(w).addScaledVector(marco.tangente, -h);
      esq[2].copy(marco.lado).multiplyScalar(w).addScaledVector(marco.tangente, h);
      esq[3].copy(marco.lado).multiplyScalar(-w).addScaledVector(marco.tangente, h);
      for (const v of esq) v.add(pos);
      // color = modulación de luz del gradiente en el punto
      const gc = gradiente(pos.x, pos.y, pos.z);
      tmpC.copy(blanco).lerp(gc, modulacion);
      const lum = 0.85 + rn() * 0.35; // jitter por card (parches de luz)
      const cr = Math.min(1.2, tmpC.r * lum), cg = Math.min(1.2, tmpC.g * lum), cb = Math.min(1.2, tmpC.b * lum);
      // normal del card
      const nx = marco.normal.x, ny = marco.normal.y, nz = marco.normal.z;
      const flip = rn() < 0.5 ? 1 : 0; // espejeo UV: variedad gratis
      // dos triángulos: 0-1-2, 0-2-3
      const orden = [0, 1, 2, 0, 2, 3];
      for (let k = 0; k < 6; k++) {
        const v = esq[orden[k]];
        P.push(v.x, v.y, v.z); N.push(nx, ny, nz);
        UV.push(orden[k] === 0 ? (flip ? 1 : 0) : orden[k] === 1 ? (flip ? 0 : 1) : orden[k] === 2 ? (flip ? 0 : 1) : (flip ? 1 : 0), orden[k] < 2 ? 0 : 1);
        COL.push(cr, cg, cb);
      }
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3));
  out.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(N), 3));
  out.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(UV), 2));
  out.setAttribute('color', new THREE.BufferAttribute(new Float32Array(COL), 3));
  out.computeBoundingSphere();
  atributoOclusionCopa(THREE, out, esferas);   // Sylva s39
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
//  HOJA DE MUSÁCEA esculpida (plátano/heliconia/bihao): contorno oblongo, canal
//  desde la nervadura, punta que cae en arco, nervadura clara por vértice.
//  Nada de rectángulos flotando (gate Humboldt 2026-08-03). La geometría queda
//  CENTRADA en Y (como PlaneGeometry): el llamador la acuesta/rota/traslada.
//  opts: { L, W, tono, nervadura?, borde?, rn?, canal?, arco?, punta? }
// ═════════════════════════════════════════════════════════════════════════════
export function hojaMusa(THREE, opts = {}) {
  const L = opts.L ?? 2.6, W = opts.W ?? 1.5;
  const rn = opts.rn ?? prngMasa(101);
  const base = new THREE.Color(opts.tono ?? '#3f8a3a');
  const nerv = base.clone().lerp(new THREE.Color(opts.nervadura ?? '#cfe08a'), 0.5);
  const borde = base.clone().lerp(new THREE.Color(opts.borde ?? '#2f5a2e'), 0.45);
  const canalK = opts.canal ?? 0.2, arcoK = opts.arco ?? 0.34, puntaK = opts.punta ?? 0.65;
  const g = new THREE.PlaneGeometry(W, L, 4, 8);
  const P = g.attributes.position, n = P.count;
  const colr = new Float32Array(n * 3);
  const tmpc = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = P.getX(i), y = P.getY(i);
    const v = THREE.MathUtils.clamp((y + L / 2) / L, 0, 1);
    const forma = 0.16 + 0.92 * Math.pow(Math.sin(Math.PI * (v * 0.9 + 0.05)), puntaK);
    const rel = Math.abs(x) / (W / 2);
    const z = Math.pow(rel, 1.6) * canalK * W + Math.pow(v, 2) * L * arcoK;
    P.setX(i, x * forma); P.setZ(i, z);
    tmpc.copy(rel < 0.18 ? nerv : base);
    if (rel >= 0.18) tmpc.lerp(borde, (rel - 0.18) * 0.7);
    tmpc.lerp(base, 0.15 * (rn() - 0.5));
    colr[i * 3] = tmpc.r; colr[i * 3 + 1] = tmpc.g; colr[i * 3 + 2] = tmpc.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  g.computeVertexNormals(); // indexada → normales suaves
  return g;
}

// ═════════════════════════════════════════════════════════════════════════════
//  CONVENIENCIA — arma la copa completa: Group con núcleo + cards (2 draw calls).
//  opts: { esferas, gradiente, seed, texOpts, cobertura, tamCard, modulacion }
//  Devuelve { grupo, matCards, matNucleo, tex } — parchear viento AFUERA.
// ═════════════════════════════════════════════════════════════════════════════
export function crearCopaMasa(THREE, opts = {}) {
  const seed = opts.seed ?? 7;
  const tex = opts.tex ?? texturaFollaje(THREE, {
    seed, ...(opts.texOpts ?? {}), procedural: opts.hojaProcedural !== false,
  });
  const matNuc = materialNucleo(THREE, {
    brillo: (opts.brillo ?? 0) * 0.35, tono: (opts.texOpts && opts.texOpts.medio) || '#3c5a30',
    oclusion: opts.oclusion,
  });
  const matCards = materialFollaje(THREE, tex, { brillo: opts.brillo, ...opts });
  const nuc = new THREE.Mesh(
    geometriaNucleoMasa(THREE, opts.esferas, { seed, gradiente: opts.gradiente, ...(opts.nucleoOpts ?? {}) }),
    matNuc
  );
  const cards = new THREE.Mesh(
    geometriaCardsMasa(THREE, opts.esferas, {
      seed: seed + 1, gradiente: opts.gradiente,
      cobertura: opts.cobertura, tamCard: opts.tamCard, modulacion: opts.modulacion,
      maxCards: opts.maxCards, minCards: opts.minCards,
      hojaProcedural: opts.hojaProcedural === true,
      verticalidad: opts.verticalidad,
    }),
    matCards
  );
  const grupo = new THREE.Group();
  grupo.add(nuc); grupo.add(cards);
  // viento/sombra/backlight opcionales: la copa se mueve con el viento global
  // COHERENTE del valle (vientoMundos.js, import dinámico para que este módulo
  // siga sin dependencias). `sombra` además clona el depth material con la MISMA
  // ecuación: la sombra de la copa ondula con ella en vez de clavarse en la pose
  // de reposo.
  if (opts.viento || opts.sombra) {
    import('./vientoMundos.js').then((vm) => {
      if (opts.viento) {
        const vo = typeof opts.viento === 'object' ? opts.viento : {};
        const conf = { piso: 0, amplitud: 0.12, velocidad: 1.05, ...vo };
        vm.aplicarVientoMundo(matNuc, conf);
        vm.aplicarVientoMundo(matCards, conf);
      }
      if (opts.sombra) {
        const so = typeof opts.sombra === 'object' ? opts.sombra : {};
        vm.aplicarVientoSombra(nuc, so);
        vm.aplicarVientoSombra(cards, so);
      }
    }).catch(() => {});
  }
  return { grupo, matCards, matNucleo: matNuc, tex };
}
