/* ─────────────────────────────────────────────────────────────────────────────
 * COPIA VERBATIM VENDORIZADA — NO EDITAR A MANO.
 *
 * Original: `~/demos/3d/lib3d/fx/brumaVolumetrica.js` (el valle). Se trae al bundle de la PWA porque
 * el descenso por la Sierra necesita la MISMA bruma volumétrica entre los
 * troncos (jirones + haces del dosel), no una reimplementación «parecida».
 * El valle sirve ese archivo desde `public/valle/`, que NO está versionado
 * ni es importable desde `src/` — de ahí la copia.
 *
 * El byte-a-byte lo verifica `fxSylva.vendor.test.js` (sha-256 fijado). Si
 * el original cambia, ese test falla y hay que re-sincronizar con:
 *   cp ~/demos/3d/lib3d/fx/brumaVolumetrica.js src/visual/mundo3d/sierra/vendor/brumaVolumetrica.js
 *   (y volver a poner esta cabecera + actualizar el sha del test)
 *
 * Licencia: MIT (Sylva / Token-Gremlin). El original NO trae el notice al
 * pie (pieza portable escrita para el valle), así que el notice completo
 * viaja en esta cabecera:
 *
   MIT License
   Copyright (c) 2026 Token Gremlin
   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
   associated documentation files (the "Software"), to deal in the Software without restriction, including
   without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
   following conditions: The above copyright notice and this permission notice shall be included in all
   copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
   KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
   PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR
   ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * ───────────────────────────────────────────────────────────────────────────── */
/* eslint-disable */
/* ── INICIO COPIA VERBATIM ── */
// ── brumaVolumetrica.js — bruma ENTRE los troncos, no cortina de distancia ───
//
// El FogExp2 clásico tapa el FONDO pero no se mete al bosque: de cerca todo
// queda nítido y el "bosque de niebla" se lee como telón pintado. Esta pieza
// pone la niebla ADENTRO:
//   · JIRONES: billboards suaves (textura fbm de canvas, borde emplumado)
//     sembrados entre los troncos y sobre el camino. Derivan despacio, respiran,
//     se DISUELVEN al atravesarlos (nada de pegarse un cartón blanco en la cara)
//     y a lo lejos se funden con el FogExp2 de la escena (material con fog: true).
//   · HACES: luz filtrada del dosel — planos cruzados aditivos alineados con el
//     sol, brillantes arriba (el hueco del dosel) y disueltos hacia el piso.
//
// Doctrina de presupuesto (la escena de carrera vive a 60 FPS):
//   · TODO fusionado: 1 draw call para todos los jirones + 1 para todos los haces.
//   · El costo real es FILL, no triángulos: cada jirón se colapsa a quad
//     degenerado (cero rasterizado) cuando su alfa efectivo no aporta —
//     de cerca (atravesándolo) y de lejos (donde ya manda el FogExp2).
//   · Sin sorting por frame, sin depthWrite: alpha suave sobre el pase opaco.
//
// PORTABLE entre mundos (kart / valle): recibe THREE como primer argumento y
// PUNTOS DE ANCLAJE del que llama — no conoce pistas ni terrenos. Determinista
// por seed: el gate visual compara.

// ── PRNG determinista (misma bruma cada carga) ───────────────────────────────
function prngBruma(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ruido barato 2D para la textura del jirón
function hashB(x, z) {
  const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
function vnoiseB(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hashB(xi, zi), b = hashB(xi + 1, zi), c = hashB(xi, zi + 1), d = hashB(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbmB(x, z) {
  let s = 0, amp = 1, f = 1, norm = 0;
  for (let i = 0; i < 4; i++) { s += amp * vnoiseB(x * f, z * f); norm += amp; amp *= 0.5; f *= 2.07; }
  return s / norm;
}

// ── textura del jirón: mancha fbm blanca con borde MUY emplumado ─────────────
// Solo importa el canal alfa (el color lo pone uColor). El tope de alfa queda
// bajo (~0.42) para que varios jirones apilados sumen SUAVE, nunca a muro.
export function texturaJiron(THREE, opts = {}) {
  const seed = opts.seed ?? 7;
  const tam = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = tam;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(tam, tam);
  const px = img.data;
  const o = seed * 13.7;
  for (let y = 0; y < tam; y++) {
    for (let x = 0; x < tam; x++) {
      // elipse achatada (los jirones son más anchos que altos) + fbm que rompe
      // el borde para que ningún jirón se lea como "óvalo de photoshop"
      const dx = (x / tam - 0.5) / 0.46;
      const dy = (y / tam - 0.5) / 0.30;
      const r = Math.sqrt(dx * dx + dy * dy);
      const n = fbmB(x * 0.021 + o, y * 0.024 + o * 1.7);
      const borde = Math.max(0, Math.min(1, (1.08 - r + (n - 0.5) * 0.55) / 0.62));
      const suave = borde * borde * (3 - 2 * borde);
      const a = suave * (0.32 + 0.68 * n) * 0.42;
      const i = (y * tam + x) * 4;
      px[i] = px[i + 1] = px[i + 2] = 255;
      px[i + 3] = Math.round(Math.max(0, Math.min(1, a)) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── textura del haz: brillante arriba (hueco del dosel), disuelto abajo ──────
function texturaHaz(THREE) {
  const w = 64, h = 256;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(w, h);
  const px = img.data;
  for (let y = 0; y < h; y++) {
    // flipY de CanvasTexture: fila 0 del canvas = tope del quad (v=1)
    const cae = Math.pow(1 - y / h, 1.5);
    for (let x = 0; x < w; x++) {
      const lat = Math.pow(Math.sin((x / w) * Math.PI), 1.6);
      // vetas: rayos internos más brillantes para que el haz no sea una sábana
      const veta = 0.72 + 0.28 * Math.sin(x * 0.55 + Math.sin(x * 0.17) * 2.2);
      const a = cae * lat * veta * 0.5;
      const i = (y * w + x) * 4;
      px[i] = px[i + 1] = px[i + 2] = 255;
      px[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Crea la bruma volumétrica del bosque de niebla.
 * @param {object} THREE  el módulo three del mundo que llama
 * @param {object} opts
 *   puntos    {Array<{x,y,z}>}  anclas AL NIVEL DEL SUELO entre los troncos
 *                               (el que llama sabe dónde están sus árboles)
 *   jirones   {number}   cantidad total de jirones (def 110)
 *   haces     {number}   cantidad de haces de luz (def 12; 0 = sin haces)
 *   solDir    {Vector3}  dirección hacia el sol (se normaliza; def sol del kart)
 *   inclinacion {number} empuje vertical extra del haz (def 1.1): con el sol
 *                        bajo, el haz puro quedaría casi horizontal — esto lo
 *                        para en diagonal de dosel sin perder el azimut
 *   seed      {number}   semilla determinista (def 47)
 *   color     {number}   color del jirón (def 0xd9e4dc — verde-gris pálido)
 *   colorHaz  {number}   color del haz (def 0xfff3d6 — sol frío filtrado)
 *   intensidad {number}  alfa global inicial (def 1)
 *   cerca     {[number,number]}  disolución al acercarse (def [4, 14])
 *   dispersion {number}  radio de esparcido alrededor de cada ancla (def 3.5)
 *   lejos     {[number,number]}  colapso lejano, donde manda el FogExp2 (def [50, 95])
 * @returns {{ grupo, tick, setIntensidad, contarTriangulos }}
 *   tick(dt): 1×/frame. setIntensidad(v): meta 0..1 con transición suave.
 */
export function crearBrumaVolumetrica(THREE, opts = {}) {
  const puntos = opts.puntos ?? [];
  const nJ = Math.max(0, Math.round(opts.jirones ?? 110));
  const nH = Math.max(0, Math.round(opts.haces ?? 12));
  const seed = opts.seed ?? 47;
  const disp = opts.dispersion ?? 3.5; // radio de esparcido alrededor de cada ancla
  const rn = prngBruma(seed * 7919 + 3);
  const solDir = (opts.solDir ? opts.solDir.clone() : new THREE.Vector3(0.35, 0.18, -0.85)).normalize();
  const grupo = new THREE.Group();
  grupo.name = 'bruma-volumetrica';

  const uniforms = {
    uTiempo: { value: 0 },
    uIntensidad: { value: opts.intensidad ?? 1 },
  };

  // ── jirones: un solo BufferGeometry con nJ quads billboard ─────────────────
  if (nJ > 0 && puntos.length > 0) {
    const pos = new Float32Array(nJ * 4 * 3);   // centro del jirón (igual en los 4 vértices)
    const uv = new Float32Array(nJ * 4 * 2);
    const datos = new Float32Array(nJ * 4 * 4); // ancho, alto, fase, velocidad
    const giro = new Float32Array(nJ * 4);
    const idx = new (nJ * 4 > 65535 ? Uint32Array : Uint16Array)(nJ * 6);
    for (let i = 0; i < nJ; i++) {
      const p = puntos[Math.floor(rn() * puntos.length) % puntos.length];
      // dos familias: BAJOS (anchos, arrastrados al piso) y VELOS (más altos,
      // colgados entre los troncos). Ambas familias en el mismo draw call.
      const bajo = rn() < 0.55;
      const w = bajo ? 7 + rn() * 6 : 4.5 + rn() * 4.5;
      const h = bajo ? 2.0 + rn() * 1.4 : 3.0 + rn() * 2.6;
      const y = p.y + (bajo ? 0.8 + rn() * 0.9 : 1.6 + rn() * 1.8);
      const cx = p.x + (rn() - 0.5) * 2 * disp;
      const cz = p.z + (rn() - 0.5) * 2 * disp;
      const fase = rn() * Math.PI * 2;
      const vel = 0.35 + rn() * 0.5;
      const gr = (rn() - 0.5) * (bajo ? 0.16 : 0.5);
      for (let v = 0; v < 4; v++) {
        const k = i * 4 + v;
        pos[k * 3] = cx; pos[k * 3 + 1] = y; pos[k * 3 + 2] = cz;
        uv[k * 2] = v % 2;            // 0,1,0,1
        uv[k * 2 + 1] = v < 2 ? 0 : 1; // 0,0,1,1
        datos[k * 4] = w; datos[k * 4 + 1] = h; datos[k * 4 + 2] = fase; datos[k * 4 + 3] = vel;
        giro[k] = gr;
      }
      const b = i * 4;
      idx.set([b, b + 1, b + 2, b + 2, b + 1, b + 3], i * 6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('aDatos', new THREE.BufferAttribute(datos, 4));
    geo.setAttribute('aGiro', new THREE.BufferAttribute(giro, 1));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));

    const matJirones = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uMapa: { value: texturaJiron(THREE, { seed }) },
          uColor: { value: new THREE.Color(opts.color ?? 0xd9e4dc) },
          uCerca: { value: new THREE.Vector2(...(opts.cerca ?? [4, 14])) },
          uLejos: { value: new THREE.Vector2(...(opts.lejos ?? [50, 95])) },
        },
      ]),
      vertexShader: /* glsl */`
        uniform float uTiempo;
        uniform float uIntensidad;
        uniform vec2 uCerca;
        uniform vec2 uLejos;
        attribute vec4 aDatos;
        attribute float aGiro;
        varying vec2 vUv;
        varying float vAlfa;
        #include <fog_pars_vertex>
        void main() {
          vUv = uv;
          vec3 c = (modelMatrix * vec4(position, 1.0)).xyz;
          float f = aDatos.z;
          float t = uTiempo * aDatos.w;
          // deriva lenta: el jirón se arrastra y respira, nunca clavado
          c.x += sin(t + f) * 1.1 + sin(t * 0.37 + f * 3.1) * 0.5;
          c.z += cos(t * 0.81 + f * 1.9) * 1.0;
          c.y += sin(t * 0.53 + f * 2.7) * 0.22;
          float d = distance(c, cameraPosition);
          float cerca = smoothstep(uCerca.x, uCerca.y, d);
          float lejos = 1.0 - smoothstep(uLejos.x, uLejos.y, d);
          float resp = 0.78 + 0.22 * sin(t * 0.45 + f * 5.0);
          // BANCOS: campo lento de ruido espacial — parches densos que derivan
          // con claros de aire entre ellos. Sin esto el velo es parejo y mata
          // la profundidad que la propia bruma debería crear.
          float banco = sin(c.x * 0.075 + uTiempo * 0.055) * sin(c.z * 0.062 - uTiempo * 0.047);
          banco = smoothstep(-0.25, 0.65, banco);
          // segunda octava fina: rompe la celda gigante para que ni la fase más
          // densa se vuelva sopa uniforme (techo 0.78, piso 0.18)
          banco *= 0.72 + 0.28 * sin(c.x * 0.21 - uTiempo * 0.031) * sin(c.z * 0.19 + uTiempo * 0.026);
          banco = 0.18 + 0.60 * banco;
          vAlfa = cerca * lejos * resp * banco * uIntensidad;
          vec2 esq = (uv - 0.5) * aDatos.xy;
          float ang = aGiro + sin(t * 0.3 + f) * 0.16;
          float cg = cos(ang), sg = sin(ang);
          esq = vec2(esq.x * cg - esq.y * sg, esq.x * sg + esq.y * cg);
          // quad degenerado cuando no aporta => cero fill-rate
          esq *= step(0.015, vAlfa);
          vec3 derecha = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
          vec3 arriba  = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          vec4 mvPosition = viewMatrix * vec4(c + derecha * esq.x + arriba * esq.y, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D uMapa;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying float vAlfa;
        #include <fog_pars_fragment>
        void main() {
          float a = texture2D(uMapa, vUv).a * vAlfa;
          if (a < 0.004) discard;
          gl_FragColor = vec4(uColor, a);
          #include <fog_fragment>
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true, // el jirón lejano hereda el FogExp2 de la escena: se funde, no "flota"
    });
    matJirones.uniforms.uTiempo = uniforms.uTiempo;
    matJirones.uniforms.uIntensidad = uniforms.uIntensidad;

    const jirones = new THREE.Mesh(geo, matJirones);
    jirones.name = 'jirones-bruma';
    jirones.frustumCulled = false; // los centros derivan y el quad se expande en shader
    jirones.renderOrder = 40;      // después de todo lo opaco/alphaTest del mundo
    grupo.add(jirones);
  }

  // ── haces de luz filtrada: planos cruzados aditivos, estáticos ─────────────
  if (nH > 0 && puntos.length > 0) {
    const ejeHaz = solDir.clone();
    ejeHaz.y += opts.inclinacion ?? 1.1;
    ejeHaz.normalize();
    const lado1 = new THREE.Vector3().crossVectors(ejeHaz, new THREE.Vector3(0, 1, 0));
    if (lado1.lengthSq() < 1e-4) lado1.set(1, 0, 0); else lado1.normalize();
    const lado2 = new THREE.Vector3().crossVectors(ejeHaz, lado1).normalize();

    const nQ = nH * 2; // 2 quads cruzados por haz
    const pos = new Float32Array(nQ * 4 * 3);
    const uv = new Float32Array(nQ * 4 * 2);
    const fase = new Float32Array(nQ * 4);
    const idx = new Uint16Array(nQ * 6);
    const paso = Math.max(1, Math.floor(puntos.length / nH));
    let q = 0;
    for (let i = 0; i < nH; i++) {
      const p = puntos[(i * paso + Math.floor(rn() * paso)) % puntos.length];
      const wB = 1.0 + rn() * 1.6;          // ancho abajo
      const wT = wB * (0.6 + rn() * 0.2);   // arriba algo más angosto (hueco del dosel)
      const largo = 8 + rn() * 5;
      const fs = rn() * Math.PI * 2;
      const base = new THREE.Vector3(p.x + (rn() - 0.5) * 2, p.y + 0.15, p.z + (rn() - 0.5) * 2);
      const tope = base.clone().addScaledVector(ejeHaz, largo);
      for (const lado of [lado1, lado2]) {
        const k = q * 4;
        const v0 = base.clone().addScaledVector(lado, -wB / 2);
        const v1 = base.clone().addScaledVector(lado, wB / 2);
        const v2 = tope.clone().addScaledVector(lado, -wT / 2);
        const v3 = tope.clone().addScaledVector(lado, wT / 2);
        pos.set([v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z], k * 3);
        uv.set([0, 0, 1, 0, 0, 1, 1, 1], k * 2);
        fase.fill(fs, k, k + 4);
        idx.set([k, k + 1, k + 2, k + 2, k + 1, k + 3], q * 6);
        q++;
      }
    }
    const geoH = new THREE.BufferGeometry();
    geoH.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geoH.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geoH.setAttribute('aFaseH', new THREE.BufferAttribute(fase, 1));
    geoH.setIndex(new THREE.BufferAttribute(idx, 1));
    geoH.computeBoundingSphere();

    const matHaces = new THREE.ShaderMaterial({
      uniforms: {
        uTiempo: uniforms.uTiempo,
        uIntensidad: uniforms.uIntensidad,
        uMapaH: { value: texturaHaz(THREE) },
        uColorH: { value: new THREE.Color(opts.colorHaz ?? 0xfff3d6) },
      },
      vertexShader: /* glsl */`
        uniform float uTiempo;
        uniform float uIntensidad;
        attribute float aFaseH;
        varying vec2 vUv;
        varying float vAlfaH;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          float d = distance(wp.xyz, cameraPosition);
          float cerca = smoothstep(2.0, 7.0, d);
          float lejos = 1.0 - smoothstep(90.0, 150.0, d);
          // el dosel se mueve: el haz respira despacio, no estroboscopio
          float resp = 0.7 + 0.3 * sin(uTiempo * 0.5 + aFaseH);
          vAlfaH = cerca * lejos * resp * uIntensidad * 0.85;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D uMapaH;
        uniform vec3 uColorH;
        varying vec2 vUv;
        varying float vAlfaH;
        void main() {
          float a = texture2D(uMapaH, vUv).a * vAlfaH;
          if (a < 0.004) discard;
          gl_FragColor = vec4(uColorH, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false, // aditivo + fog se ensucia; el fade lejano ya lo apaga
    });

    const haces = new THREE.Mesh(geoH, matHaces);
    haces.name = 'haces-luz';
    haces.renderOrder = 41; // encima de los jirones: la luz "atraviesa" la bruma
    grupo.add(haces);
  }

  // ── ciclo ──────────────────────────────────────────────────────────────────
  let intensidadMeta = uniforms.uIntensidad.value;
  function tick(dt) {
    uniforms.uTiempo.value += dt;
    const u = uniforms.uIntensidad;
    u.value += (intensidadMeta - u.value) * (1 - Math.exp(-2.0 * dt));
  }
  function setIntensidad(v) { intensidadMeta = Math.max(0, Math.min(1, v)); }
  function contarTriangulos() { return nJ * 2 + nH * 4; }

  return { grupo, tick, setIntensidad, contarTriangulos };
}
