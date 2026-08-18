// ═════════════════════════════════════════════════════════════════════════════
//  ⚠️ ARCHIVADO (2026-08-07) — SUPERADO POR lib3d/fx/aguaParamo.js
//
//  Este módulo y aguaParamo.js nacieron de la MISMA tarea despachada dos veces
//  la misma noche sin coordinación. Se compararon con la misma escena, la misma
//  cámara y el mismo medidor (comparador-agua.html, capturas en _gate/agua-*):
//    · Quebrada a ras: gana aguaParamo — su lámina es glauca con espuma en
//      encaje rompiendo en las piedras; aquí la espuma SATURA la lámina entera
//      (se lee como leche derramada, no como agua) y hay rocas de orilla
//      flotando sobre el terreno.
//    · Chorrera: gana aguaParamo — su cortina cae con peso; aquí se lee como
//      spray/vapor que sube, no como lámina de agua cayendo (medido con y sin
//      helechos, capturas agua-ch-a*.png).
//    · makeHelechosRibera(): era paraguas low-poly (cono sobre palo) — violaba
//      la regla dura "follaje = MASA". Hoy es mata de frondes como MASA
//      (FollajeMasa: núcleo esculpido + cards texturizados, viento de
//      vientoMundos) — la regla dura respetada.
//    · Perf: EMPATE — ambos sostienen vsync 60 FPS hasta px=4 en la GPU de
//      referencia (controles sin agua idénticos validaron el medidor). El
//      veredicto es 100% artístico. Movimiento: ambos pasan (3 hashes ≠).
//  NO importar en código nuevo — el agua nueva sale de lib3d/fx/aguaParamo.js
//  (+ brumaVolumetrica). Se conserva (no se borra) para que la decisión sea
//  reversible por el operador; su antigua entrada agua-quebrada-chorrera.html
//  fue PORTADA al ganador (2026-08-11) — este módulo queda visible solo en
//  comparador-agua.html?mod=a, y el truco "fondo pintado en el shader" queda
//  citable desde acá. makeHelechosRibera vive portado en aguaParamo
//  (crearHelechosRibera) desde la misma fecha.
// ═════════════════════════════════════════════════════════════════════════════
// ── lib/agua.js — LA QUEBRADA y LA CHORRERA como módulo reusable ────────────
// (2026-08-07, tarea #25 arte) Dos cuerpos de agua con carácter propio:
//
//   makeQuebrada()  — agua corriente POCO PROFUNDA sobre piedra: el fondo se
//                     ve (pintado en el mismo shader — truco Fallen Order: la
//                     roca lleva el agua PINTADA), el flujo corre aguas abajo,
//                     espuma donde golpea las rocas y rifles donde el cauce
//                     cae. NO es un plano azul: es una lámina que deja leer
//                     la piedra debajo.
//   makeChorrera()  — caída vertical: cortina de velos escalonados, neblina
//                     instanciada en la base, poza que recibe. Destilada de
//                     waterfalls.js del valle (commit b78eca8, la versión que
//                     GANÓ contra las fotos reales: una sola, velos blancos
//                     francos, pozo cristalino) — pero DESACOPLADA del DEM del
//                     valle: el caller pasa su terreno (heightAt) y su sol.
//
// BASE ELEGIDA: waterfalls.js live del valle (== lib3d/agua/waterfalls.js,
// b78eca8 2026-07-31), NO la rama wip/chorrera-fix (bcc93c0 2026-07-30): la
// versión live es POSTERIOR, ya incorpora la lectura del wip (una sola caída,
// der→izq, Chiflón aparte) y además reprueba con captura el "hilo fino
// translúcido" del wip. Los shaders probados (velo, banda mojada, bruma,
// gotas, pozo) se conservan; lo nuevo aquí es:
//   · la QUEBRADA entera (no existía como módulo);
//   · el sol como UNIFORM (uSol) — antes era const GLSL hardcodeada del
//     amanecer del valle: inservible fuera de él;
//   · todo cuelga de un THREE.Group (el valle ensuciaba scene directamente);
//   · RNG determinista sembrado (el gate compara capturas).
//
// REGLA DURA: render, NO física (feedback_valle_chorrera_render_sin_fisica).
// Todo movimiento es shader + instancias con uTime. Cero partículas simuladas.
import * as THREE from 'three';
import {
  texturaFollaje, materialFollaje, materialNucleo,
  geometriaNucleoMasa, geometriaCardsMasa,
} from '../lib3d/flora/FollajeMasa.js';
import { aplicarVientoMundo, tickVientoMundos } from '../lib3d/flora/vientoMundos.js';

// ── RNG determinista (mismo LCG de waterfalls.js) ───────────────────────────
function makeRng(seed) {
  let sd = seed;
  return () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
}

const GLSL_NOISE = /* glsl */`
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
  }
`;

// ════════════════════════════════════════════════════════════════════════════
// LA QUEBRADA — lámina de agua corriente sobre lecho de piedra
// ════════════════════════════════════════════════════════════════════════════
// La lección del valle aplicada al revés: la chorrera pinta el agua SOBRE la
// roca; la quebrada pinta la roca BAJO el agua. Un solo ribbon con un solo
// material: fondo de cantos rodados + columna de agua verde-azul por hondura +
// estrías de corriente + espuma (de roca, de rifle y de orilla) + destellos de
// sol. El fondo "refracta" moviéndose con un wobble que crece con la hondura.
const quebradaVert = /* glsl */`
  attribute float aDepth;   // 0 orilla → 1 thalweg (hondura visual)
  attribute float aFoam;    // campo de espuma horneado desde las rocas
  attribute float aRapid;   // pendiente local del cauce (rifles)
  varying vec2 vUv;
  varying float vDepth;
  varying float vFoam;
  varying float vRapid;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vUv = uv; vDepth = aDepth; vFoam = aFoam; vRapid = aRapid;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const quebradaFrag = /* glsl */`
  uniform float uTime;
  uniform vec3 uSol;
  uniform float uBright;
  uniform vec3 uTint;
  uniform vec3 uCielo;
  varying vec2 vUv;
  varying float vDepth;
  varying float vFoam;
  varying float vRapid;
  varying vec3 vN;
  varying vec3 vW;
  ${GLSL_NOISE}
  void main() {
    // ── EL FONDO SE VE: cantos rodados en dos escalas, cuantizados a mancha.
    // El wobble los mece — la refracción de una lámina que corre encima — y
    // crece con la hondura (en la orilla el agua es un vidrio quieto).
    float wob = (noise(vec2(vUv.x * 6.0, vUv.y * 7.0 - uTime * 0.9)) - 0.5)
              * (0.05 + vDepth * 0.14);
    vec2 pb = vec2(vUv.x * 3.0, vUv.y * 1.15) + wob;
    float st1 = noise(pb * 3.0);
    float st2 = noise(pb * 9.0 + 31.0);
    float piedra = smoothstep(0.26, 0.70, st1) * 0.62 + smoothstep(0.32, 0.76, st2) * 0.38;
    vec3 fondo = mix(vec3(0.13, 0.12, 0.09),          // sombra entre piedras
                     vec3(0.58, 0.50, 0.36),          // canto rodado claro y CÁLIDO
                     piedra);
    // alga/musgo tiñe lo hondo (verde-dominante, nunca azul piscina)
    fondo = mix(fondo, vec3(0.13, 0.23, 0.16), vDepth * 0.5);

    // ── COLUMNA DE AGUA: absorción con la hondura — el fondo se apaga hacia
    // el thalweg pero NUNCA desaparece (agua poco profunda: esa es la regla).
    // (v3: con 0,72 + estrías + fresnel la lámina saturaba a LECHE gris y el
    // fondo desaparecía — el encargo manda fondo VISIBLE, espuma solo puntual)
    float absorb = 1.0 - exp(-vDepth * 1.6);
    vec3 col = mix(fondo, uTint, absorb * 0.55);

    // ── LA CORRIENTE: estrías alargadas corriendo aguas abajo, dos octavas.
    // En los rápidos (aRapid) la octava fina se acelera: el agua se apura.
    float f1 = noise(vec2(vUv.x * 9.0, vUv.y * 4.0 - uTime * 1.4));
    float f2 = noise(vec2(vUv.x * 17.0 + 5.0, vUv.y * 8.0 - uTime * (2.6 + vRapid * 2.0)));
    float streak = smoothstep(0.52, 0.86, f1 * 0.55 + f2 * 0.45);
    col += vec3(0.05, 0.065, 0.06) * streak * (0.30 + vDepth * 0.55);

    // ── RIFLES: donde el cauce CAE toda la lámina se pica en crestas blancas
    float riff = smoothstep(0.30, 0.85, vRapid)
               * smoothstep(0.42, 0.78, noise(vec2(vUv.x * 13.0, vUv.y * 10.0 - uTime * 3.2)));
    // ── ESPUMA DE ROCA: el campo horneado revienta y arrastra lenguas
    float fn = noise(vec2(vUv.x * 20.0, vUv.y * 9.0 - uTime * 3.0));
    // ── ESPUMA DE ORILLA: hilo tenue e irregular pegado a los cantos
    float lat = sin(vUv.x * 3.14159);
    float bank = smoothstep(0.30, 0.06, lat)
               * smoothstep(0.35, 0.75, noise(vec2(vUv.x * 8.0, vUv.y * 6.0 - uTime * 0.8)));
    float foam = clamp(vFoam * (0.45 + 0.55 * fn) * 1.5 + riff * 0.75 + bank * 0.20, 0.0, 1.0);

    // ── SOL: destellos que corren con el agua + cielo en ángulo rasante
    vec3 N = normalize(vN + vec3(wob * 2.2, 0.0, wob * 1.6));
    vec3 V = normalize(cameraPosition - vW);
    vec3 L = normalize(uSol);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 60.0);
    float glint = smoothstep(0.74, 0.94, f2) * spec;
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.5);
    // luz difusa del sol SOBRE el cuerpo del agua (v4: sin esto la lámina
    // quedaba albedo crudo — pálida y lechosa contra el terreno tone-mapeado)
    col *= 0.52 + 0.48 * max(dot(N, L), 0.0);
    // en rasante el agua ESPEJA el cielo (reemplaza al fondo, no se suma):
    // con el color del cielo la lámina lee agua; con gris neutro leía peltre
    col = mix(col, uCielo, fres * 0.38);
    // la ESPUMA entra DESPUÉS de la luz: se queda blanca de verdad
    col = mix(col, vec3(1.02, 1.01, 0.96) * uBright, foam);
    col += vec3(1.20, 1.15, 1.00) * (spec * 0.25 + glint * 0.9);

    // orilla con canto VIVO pero irregular (nada de línea de regla)
    float edgeN = noise(vec2(vUv.y * 5.0, 3.7));
    float alpha = smoothstep(0.015 + edgeN * 0.05, 0.10 + edgeN * 0.05, lat);
    gl_FragColor = vec4(col, alpha * 0.97);
  }
`;

/**
 * La quebrada: ribbon drapeado sobre el terreno siguiendo el thalweg.
 * @param {object} o
 * @param {Array<{x:number,z:number}>} o.puntos  puntos de control aguas abajo
 * @param {(x:number,z:number)=>number} o.heightAt  terreno del caller
 * @param {number} [o.ancho=6]    ancho medio de la lámina (unidades)
 * @param {number} [o.hondura=1]  hondura VISUAL máxima del thalweg
 * @param {number} [o.rocas=9]    rocas emergentes en el cauce
 * @param {number} [o.seed=7]
 * @param {THREE.Vector3} [o.sol] dirección del sol (para specular)
 * @param {number} [o.alza=0.28]  lámina sobre el lecho
 */
export function makeQuebrada({
  puntos, heightAt, ancho = 6, hondura = 1.0, rocas = 9, seed = 7,
  sol = new THREE.Vector3(0.62, 0.35, 0.60), alza = 0.28,
  cielo = new THREE.Color(0x9fb8c9),
}) {
  const group = new THREE.Group();
  const mats = [];
  const rng = makeRng(seed);

  // ── el eje del cauce: Catmull-Rom por los puntos de control ──
  const curve = new THREE.CatmullRomCurve3(
    puntos.map((p) => new THREE.Vector3(p.x, 0, p.z)), false, 'centripetal', 0.5);
  const SEGS = 170, NW = 9;
  const cs = [], tans = [];
  for (let i = 0; i <= SEGS; i++) {
    const t = i / SEGS;
    cs.push(curve.getPoint(t));
    tans.push(curve.getTangent(t));
  }
  // superficie: el lecho + alza, suavizada y SIN correr cuesta arriba
  const ys = cs.map((c) => heightAt(c.x, c.z));
  for (let k = 0; k < 6; k++) for (let i = 1; i < SEGS; i++)
    ys[i] = (ys[i - 1] + ys[i] * 2 + ys[i + 1]) / 4;
  for (let i = 1; i <= SEGS; i++) ys[i] = Math.min(ys[i], ys[i - 1]);
  // pendiente local → rifles y ritmo (se mide sobre la superficie ya alisada)
  const rap = [];
  for (let i = 0; i <= SEGS; i++) {
    const a = ys[Math.max(0, i - 3)], b = ys[Math.min(SEGS, i + 3)];
    const run = cs[Math.max(0, i - 3)].distanceTo(cs[Math.min(SEGS, i + 3)]) || 1;
    rap.push(Math.min(1, Math.max(0, ((a - b) / run - 0.02) * 9)));
  }
  for (let k = 0; k < 3; k++) for (let i = 1; i < SEGS; i++)
    rap[i] = (rap[i - 1] + rap[i] * 2 + rap[i + 1]) / 4;
  // distancia acumulada aguas abajo (para el tiling del flujo)
  const dist = [0];
  for (let i = 1; i <= SEGS; i++) dist.push(dist[i - 1] + cs[i].distanceTo(cs[i - 1]));

  // ── ROCAS EMERGENTES primero: sus lenguas de espuma se hornean al ribbon ──
  const rocasDef = [];
  for (let i = 0; i < rocas; i++) {
    const t = 0.10 + (i + rng() * 0.7) / rocas * 0.82;    // repartidas, con jitter
    const si = Math.round(t * SEGS);
    const u = 0.28 + rng() * 0.44;                        // dentro del cauce
    const r = 0.55 + rng() * 0.95;
    rocasDef.push({ si, u, r, d: dist[si] });
  }

  // ── el ribbon ──
  const posArr = [], uvArr = [], dArr = [], fArr = [], rArr = [], idx = [];
  const side = new THREE.Vector3();
  for (let i = 0; i <= SEGS; i++) {
    const c = cs[i];
    side.set(-tans[i].z, 0, tans[i].x).normalize();
    // el ancho RESPIRA y se APRIETA en los rápidos (más angosto = más rápido)
    const w = ancho * (0.78 + 0.30 * Math.sin(dist[i] * 0.045 + seed))
                    * (1.0 - rap[i] * 0.25);
    for (let j = 0; j < NW; j++) {
      const u = j / (NW - 1);
      const off = (u - 0.5) * w;
      // perfil de hondura: parábola al thalweg; pozas hondas donde va lento
      const prof = Math.pow(Math.sin(u * Math.PI), 0.8)
                 * hondura * (0.62 + 0.38 * (1 - rap[i]));
      posArr.push(c.x + side.x * off, ys[i] + alza - prof * 0.06, c.z + side.z * off);
      uvArr.push(u, dist[i] / 8);
      dArr.push(prof / hondura);
      rArr.push(rap[i]);
      // espuma horneada: lengua aguas abajo de cada roca + proa aguas arriba
      let foam = 0;
      for (const rk of rocasDef) {
        const dd = dist[i] - rk.d;                        // + = aguas abajo
        const du = Math.abs(u - rk.u) * w;                // lateral en unidades
        if (dd > -2.2 && dd < 20) {
          const along = dd < 0 ? (1 + dd / 2.2) * 0.5     // proa corta
            : Math.exp(-dd / 7.5);                        // estela LARGA aguas abajo
          foam += along * Math.exp(-(du * du) / (2 * Math.pow(rk.r * 1.0, 2)));
        }
      }
      fArr.push(Math.min(1, foam));
      if (i > 0 && j > 0) {
        // winding CCW visto DESDE ARRIBA (la normal del agua apunta al cielo;
        // con el orden invertido el culling se comía la lámina entera — v1/v2)
        const b = i * NW + j, a = b - NW;
        idx.push(a - 1, a, b - 1, a, b, b - 1);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
  geo.setAttribute('aDepth', new THREE.Float32BufferAttribute(dArr, 1));
  geo.setAttribute('aFoam', new THREE.Float32BufferAttribute(fArr, 1));
  geo.setAttribute('aRapid', new THREE.Float32BufferAttribute(rArr, 1));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({
    vertexShader: quebradaVert, fragmentShader: quebradaFrag,
    uniforms: {
      uTime: { value: 0 },
      uSol: { value: sol.clone() },
      uBright: { value: 1.0 },
      uTint: { value: new THREE.Color(0.10, 0.21, 0.20) },
      uCielo: { value: new THREE.Color(cielo) },
    },
    transparent: true, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2;
  group.add(mesh); mats.push(mat);

  // ── las rocas de verdad (instanciadas, 1 draw call): emergen ~45% ──
  const NR = rocasDef.length + 10;                        // + rocas de orilla
  const rockGeo = new THREE.IcosahedronGeometry(1, 1);
  // base BLANCA: el color por instancia MULTIPLICA al del material — con dos
  // grises el producto salía carbón (v5); la instancia lleva el tono sola
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.94, flatShading: true,
  });
  const rocksMesh = new THREE.InstancedMesh(rockGeo, rockMat, NR);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), cc = new THREE.Color();
  let ri = 0;
  for (const rk of rocasDef) {
    const c = cs[rk.si];
    side.set(-tans[rk.si].z, 0, tans[rk.si].x).normalize();
    const w = ancho * 0.8;
    const off = (rk.u - 0.5) * w;
    q.setFromEuler(new THREE.Euler(rng() * 3, rng() * 3, rng() * 3));
    m4.compose(
      new THREE.Vector3(c.x + side.x * off, ys[rk.si] + alza - rk.r * 0.55, c.z + side.z * off),
      q, new THREE.Vector3(rk.r, rk.r * 0.8, rk.r));
    rocksMesh.setMatrixAt(ri, m4);
    // mojada: más oscura que la piedra seca de orilla (pero no carbón)
    cc.set(0x5d584e).offsetHSL((rng() - 0.5) * 0.02, 0, (rng() - 0.5) * 0.08);
    rocksMesh.setColorAt(ri++, cc);
  }
  for (let i = ri; i < NR; i++) {                         // cantos de orilla, secos
    const t = 0.06 + rng() * 0.88, si = Math.round(t * SEGS);
    const c = cs[si];
    side.set(-tans[si].z, 0, tans[si].x).normalize();
    const lado = rng() < 0.5 ? -1 : 1;
    const off = lado * (ancho * (0.55 + rng() * 0.25));
    const r = 0.4 + rng() * 0.8;
    q.setFromEuler(new THREE.Euler(rng() * 3, rng() * 3, rng() * 3));
    m4.compose(
      new THREE.Vector3(c.x + side.x * off, heightAt(c.x + side.x * off, c.z + side.z * off) + r * 0.1, c.z + side.z * off),
      q, new THREE.Vector3(r, r * 0.75, r));
    rocksMesh.setMatrixAt(i, m4);
    cc.set(0x6f6a5e).offsetHSL((rng() - 0.5) * 0.03, 0, (rng() - 0.5) * 0.12);
    rocksMesh.setColorAt(i, cc);
  }
  rocksMesh.instanceMatrix.needsUpdate = true;
  group.add(rocksMesh);

  function update(t) { for (const m of mats) m.uniforms.uTime.value = t; }
  return { group, update, mats, curve, superficieY: (i) => ys[Math.round(i * SEGS)] + alza };
}

// ════════════════════════════════════════════════════════════════════════════
// LA CHORRERA — cortina de velos + bruma + poza (destilado de waterfalls.js)
// ════════════════════════════════════════════════════════════════════════════
// Los cuatro planos que ganaron contra las fotos (b78eca8): banda de roca
// EMPAPADA sobre el terreno (el ancla — el ojo ancla por el CONTACTO), velo
// blanco FRANCO que nace angosto y se abre, halo de rocío, corazón denso.
// Bruma y mechones instanciados: un draw call cada sistema. Sol por uniform.
const veloVert = /* glsl */`
  attribute float aT;
  varying vec2 vUv;
  varying float vFade;
  varying float vT;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vUv = uv; vT = aT;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    vec4 mv = viewMatrix * wp;
    vFade = clamp(1.0 - (-mv.z - 400.0) / 1600.0, 0.85, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;
const veloFrag = /* glsl */`
  uniform float uTime;
  uniform vec3 uTint;
  uniform float uBright;
  uniform float uAlpha;
  uniform float uBirth;
  uniform float uImpact;
  uniform vec3 uSol;
  varying vec2 vUv;
  varying float vFade;
  varying float vT;
  varying vec3 vN;
  varying vec3 vW;
  ${GLSL_NOISE}
  void main() {
    // velos: estrías verticales cayendo, dos octavas
    float n1 = noise(vec2(vUv.x * 9.0, vUv.y * 16.0 - uTime * 1.2));
    float n2 = noise(vec2(vUv.x * 22.0 + 7.0, vUv.y * 34.0 - uTime * 2.1));
    float streak = n1 * 0.6 + n2 * 0.4;
    float lat = smoothstep(0.0, 0.20, vUv.x) * smoothstep(1.0, 0.80, vUv.x);
    lat = pow(lat, 0.5);
    float fray = noise(vec2(vUv.x * 30.0, vUv.y * 44.0 - uTime * 2.6));
    lat *= 0.60 + 0.40 * fray;
    float a = lat * (0.74 + smoothstep(0.30, 0.72, streak) * 0.34);
    a += smoothstep(0.62, 0.92, streak) * lat * 0.50;
    float strands = noise(vec2(vUv.x * 5.5 + 3.0, vUv.y * 2.2 - uTime * 0.25));
    a *= 0.55 + 0.45 * smoothstep(0.15, 0.58, strands + streak * 0.35);
    a *= smoothstep(0.0, 0.09, vT);
    float impact = smoothstep(0.80, 1.0, vT) * uImpact;
    a = min(1.0, a + impact * lat * 0.35);
    float footN = noise(vec2(vUv.x * 12.0, uTime * 0.7));
    a *= 1.0 - smoothstep(0.955 - footN * 0.05, 0.995 - footN * 0.03, vT) * 0.9;
    a *= 0.80 + 0.20 * noise(vec2(3.0, vUv.y * 2.6 + 0.4));
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vW);
    vec3 L = normalize(uSol);
    float dif = 0.55 + 0.58 * max(dot(N, L), 0.0);
    vec3 Hv = normalize(L + V);
    float spec = pow(max(dot(N, Hv), 0.0), 42.0);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
    float glint = smoothstep(0.72, 0.94, n2) * spec;
    a = min(1.0, a + fres * 0.22 * lat);
    float foamK = clamp(smoothstep(0.45, 0.85, streak) * 0.62 + impact * 0.55 + fres * 0.30, 0.0, 1.0);
    vec3 body = uTint * (0.66 + streak * 0.30);
    vec3 foam = vec3(1.06, 1.05, 1.00) * uBright;
    vec3 col = mix(body, foam, foamK) * dif
             + vec3(1.25, 1.18, 1.02) * (spec * 0.85 + glint * 1.5)
             + vec3(0.55, 0.62, 0.72) * fres * 0.35;
    col *= 1.0 + impact * 0.22;
    float birth = smoothstep(0.20, 0.02, vT) * uBirth;
    col = mix(col, vec3(0.14, 0.18, 0.18), birth * 0.75);
    a *= 1.0 - birth * 0.30;
    gl_FragColor = vec4(col, min(a, 1.0) * 0.97 * vFade * uAlpha);
  }
`;
const bandaVert = /* glsl */`
  attribute float aT;
  varying vec2 vUv;
  varying float vT;
  void main() { vUv = uv; vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const bandaFrag = /* glsl */`
  uniform float uTime;
  varying vec2 vUv;
  varying float vT;
  ${GLSL_NOISE}
  void main() {
    float nb = noise(vec2(vUv.x * 3.0, vUv.y * 8.0)) * 0.6
             + noise(vec2(vUv.x * 7.0, vUv.y * 19.0)) * 0.4;
    float lat = smoothstep(0.0, 0.24 + nb * 0.20, vUv.x)
              * smoothstep(1.0, 0.76 - nb * 0.20, vUv.x);
    float v = smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.96, vUv.y);
    float streak = noise(vec2(vUv.x * 13.0, vUv.y * 34.0 - uTime * 0.10));
    float a = lat * v * (0.46 + 0.22 * streak);
    vec3 col = mix(vec3(0.030, 0.048, 0.050), vec3(0.10, 0.13, 0.14),
                   streak * 0.55 + nb * 0.15);
    gl_FragColor = vec4(col, a);
  }
`;
const brumaVert = /* glsl */`
  uniform float uTime;
  attribute vec3 aOff;
  attribute vec4 aSeed;   // phase, speed, riseH, size
  varying vec2 vPc;
  varying float vO;
  varying float vSeed;
  void main() {
    float k = fract(aSeed.x + uTime * aSeed.y);
    vec3 c = aOff;
    c.y += k * aSeed.z;
    c.x += sin(uTime * 0.35 + aSeed.x * 40.0) * 0.8;
    vO = sin(k * 3.14159);
    vSeed = aSeed.x;
    vPc = position.xy;
    float s = aSeed.w * (0.62 + k * 0.85);
    vec4 mv = modelViewMatrix * vec4(c, 1.0);
    mv.xy += position.xy * vec2(s * 1.25, s);
    gl_Position = projectionMatrix * mv;
  }
`;
const brumaFrag = /* glsl */`
  uniform float uTime;
  varying vec2 vPc;
  varying float vO;
  varying float vSeed;
  ${GLSL_NOISE}
  void main() {
    vec2 pc = vPc;
    float ang = vSeed * 40.0 + uTime * 0.10;
    vec2 pr = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * pc;
    float d = length(pc) * 2.0;
    float nb = noise(pr * 4.5 + vSeed * 17.0) * 0.6 + noise(pr * 9.0 + vSeed * 31.0) * 0.4;
    float edge = 1.0 - smoothstep(0.38 + nb * 0.55, 1.0, d);
    float body = exp(-d * d * 2.1);
    float alp = body * edge * vO * 0.60;
    float litK = clamp(0.55 - pc.y * 1.7 + nb * 0.25, 0.0, 1.0);
    vec3 col = mix(vec3(1.04, 1.02, 0.98), vec3(0.70, 0.76, 0.85), litK);
    gl_FragColor = vec4(col, alp);
  }
`;
const gotaVert = /* glsl */`
  uniform float uTime;
  attribute vec3 aOff;
  attribute vec4 aSeed;   // phase, speed, dropLen, size
  varying vec2 vPc;
  varying float vO;
  void main() {
    float k = fract(aSeed.x + uTime * aSeed.y);
    vec3 c = aOff;
    c.y -= k * aSeed.z;
    vO = (1.0 - k * 0.7) * smoothstep(0.0, 0.12, k);
    vPc = position.xy;
    vec4 mv = modelViewMatrix * vec4(c, 1.0);
    mv.xy += position.xy * vec2(aSeed.w * 0.16, aSeed.w * (1.1 + k * 0.9));
    gl_Position = projectionMatrix * mv;
  }
`;
const gotaFrag = /* glsl */`
  varying vec2 vPc;
  varying float vO;
  void main() {
    float lat = pow(max(1.0 - abs(vPc.x) * 2.0, 0.0), 1.6);
    float v = smoothstep(-0.5, -0.28, vPc.y) * smoothstep(0.5, 0.05, vPc.y);
    gl_FragColor = vec4(1.02, 1.02, 0.99, lat * v * vO * 0.85);
  }
`;
const pozaVert = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const pozaFrag = /* glsl */`
  uniform float uTime;
  varying vec2 vUv;
  ${GLSL_NOISE}
  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    vec2 foco = vec2(0.0, 0.30);
    float df = length(p - foco) * 2.0;
    vec3 col = mix(vec3(0.07, 0.17, 0.16), vec3(0.20, 0.34, 0.30), smoothstep(0.15, 1.0, r));
    float rip = sin(df * 20.0 - uTime * 2.4) * 0.5 + 0.5;
    col += vec3(0.10, 0.12, 0.12) * rip * exp(-df * 1.8);
    float nf = noise(vec2(df * 5.0 - uTime * 0.7, atan(p.y - foco.y, p.x - foco.x) * 1.6 + uTime * 0.15));
    float foam = smoothstep(0.62, 0.10, df) * (0.50 + 0.50 * nf);
    foam = max(foam, smoothstep(0.80, 0.97, rip) * exp(-df * 1.4) * 0.55);
    col = mix(col, vec3(1.02, 1.02, 0.98), clamp(foam, 0.0, 1.0));
    float alpha = (1.0 - smoothstep(0.80, 1.0, r)) * 0.92;
    gl_FragColor = vec4(col, alpha);
  }
`;

function makeQuadCloud(items, vert, frag) {
  const geo = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  geo.index = quad.index;
  geo.setAttribute('position', quad.attributes.position);
  geo.setAttribute('uv', quad.attributes.uv);
  const off = new Float32Array(items.length * 3);
  const seed = new Float32Array(items.length * 4);
  items.forEach((p, i) => {
    off.set([p.x, p.y, p.z], i * 3);
    seed.set(p.seed, i * 4);
  });
  geo.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
  geo.instanceCount = items.length;
  const mat = new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag,
    uniforms: { uTime: { value: 0 } },
    transparent: true, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  return { mesh, mat };
}

/**
 * La chorrera: cortina escalonada drapeada contra la pared del caller.
 * @param {object} o
 * @param {{x:number,y:number,z:number}} o.labio   donde el agua salta
 * @param {{x:number,y:number,z:number}} o.pie     donde golpea
 * @param {(x:number,z:number)=>number} o.heightAt terreno (para drapear)
 * @param {number} [o.ancho=3.2]     ancho del velo en el labio
 * @param {number[]} [o.cortes]      fracciones 0..1 de los saltos (repisas)
 * @param {number} [o.seed=3]
 * @param {THREE.Vector3} [o.sol]
 * @param {boolean} [o.poza=true]    poza + cantos rodados al pie
 * @param {number} [o.roce=0.8]      cuánto despega el velo de la roca
 */
export function makeChorrera({
  labio, pie, heightAt, ancho = 3.2, cortes = [0, 0.42, 0.70, 1],
  seed = 3, sol = new THREE.Vector3(0.62, 0.35, 0.60), poza = true, roce = 0.8,
}) {
  const group = new THREE.Group();
  const mats = [];
  const rng = makeRng(seed);
  const brumaPts = [], gotaPts = [];

  // punto sobre la caída en k∈[0,1] (0=labio, 1=pie) + serpenteo del agua
  const caida = (k) => ({
    x: labio.x + (pie.x - labio.x) * k
       + (Math.sin(k * 9.0 + seed) + Math.sin(k * 17.0 + seed * 2) * 0.5) * ancho * 0.16,
    y: labio.y + (pie.y - labio.y) * k,
    z: labio.z + (pie.z - labio.z) * k,
  });

  // drapea z contra la pared del caller — el paso del valle (fallPath b78eca8):
  // sale del terreno hacia la cámara y vuelve a rozarlo, luego se alisa.
  function fallPath(kA, kB, widths, SEGS) {
    const samples = [];
    for (let i = 0; i <= SEGS; i++) {
      const k = kA + ((kB - kA) * i) / SEGS;
      samples.push(caida(k));
    }
    if (heightAt) {
      const PASO = 0.5, TOPE = 260;
      for (const sm of samples) {
        let z = sm.z, n = 0;
        while (n++ < TOPE && heightAt(sm.x, z) > sm.y) z += PASO;
        n = 0;
        while (n++ < TOPE && heightAt(sm.x, z - PASO) <= sm.y) z -= PASO;
        sm.z = z + roce;
      }
      for (let k = 0; k < 7; k++) for (let i = 1; i < SEGS; i++)
        samples[i].z = (samples[i - 1].z + samples[i].z * 2 + samples[i + 1].z) / 4;
    }
    // anchura: nace angosta en el labio, se ABRE al caer (horsetail), respira
    const w = [];
    for (let i = 0; i <= SEGS; i++) {
      const k = i / SEGS;
      const grow = 1 + k * 1.0 + Math.pow(k, 6) * (widths.splay ?? 0.6);
      const breathe = 0.80 + 0.34 * (Math.sin(samples[i].y * 0.55 + seed) * 0.5 + 0.5);
      w.push(widths.base * grow * breathe);
    }
    for (let k = 0; k < 4; k++) for (let i = 1; i < SEGS; i++)
      w[i] = (w[i - 1] + w[i] * 2 + w[i + 1]) / 4;
    return { samples, w };
  }

  function buildVelo(kA, kB, widths, tint) {
    const SEGS = 80, NW = 8;
    const { samples, w } = fallPath(kA, kB, widths, SEGS);
    const depth = widths.depth ?? 0.34;
    const posArr = [], uvArr = [], tArr = [], idx = [];
    for (let i = 0; i <= SEGS; i++) {
      const s = samples[i], k = i / SEGS;
      const bul = Math.min(w[i] * depth, 3) * (0.72 + 0.28 * Math.sin(k * Math.PI));
      for (let j = 0; j < NW; j++) {
        const u = j / (NW - 1);
        const arch = Math.pow(Math.sin(u * Math.PI), 0.8);
        posArr.push(s.x + (u - 0.5) * w[i], s.y, s.z + 0.15 + bul * arch);
        uvArr.push(u, k * (widths.vTiles ?? 2.4));
        tArr.push(k);
      }
      if (i > 0) {
        const b = i * NW, a = b - NW;
        for (let j = 0; j < NW - 1; j++) idx.push(a + j, b + j, a + j + 1, a + j + 1, b + j, b + j + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
    geo.setAttribute('aT', new THREE.Float32BufferAttribute(tArr, 1));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mat = new THREE.ShaderMaterial({
      vertexShader: veloVert, fragmentShader: veloFrag,
      uniforms: {
        uTime: { value: 0 }, uTint: { value: new THREE.Color(tint) },
        uBright: { value: widths.bright ?? 1.14 },
        uAlpha: { value: widths.alphaK ?? 1.0 },
        uBirth: { value: widths.birth ?? 0.0 },
        uImpact: { value: widths.impact ?? 1.0 },
        uSol: { value: sol.clone() },
      },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 3;
    return { mesh, mat };
  }

  function buildBanda(kA, kB, widths) {
    const SEGS = 50;
    const { samples, w } = fallPath(kA, kB, widths, SEGS);
    const posArr = [], uvArr = [], tArr = [], idx = [];
    for (let i = 0; i <= SEGS; i++) {
      const s = samples[i], k = i / SEGS;
      const wide = w[i] * (1.8 + k * 1.0);
      posArr.push(s.x - wide / 2, s.y, s.z - roce * 0.45, s.x + wide / 2, s.y, s.z - roce * 0.45);
      uvArr.push(0, k, 1, k);
      tArr.push(k, k);
      if (i > 0) { const b = i * 2; idx.push(b - 2, b - 1, b, b - 1, b + 1, b); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
    geo.setAttribute('aT', new THREE.Float32BufferAttribute(tArr, 1));
    geo.setIndex(idx);
    const mat = new THREE.ShaderMaterial({
      vertexShader: bandaVert, fragmentShader: bandaFrag,
      uniforms: { uTime: { value: 0 } },
      transparent: true, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 2;
    return { mesh, mat };
  }

  const addPluma = (x, y, z, r, n, dens = 1) => {
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * r;
      brumaPts.push({
        x: x + Math.cos(a) * rr,
        y: y + (rng() - 0.5) * r * 0.5,
        z: z + Math.sin(a) * rr * 0.75 + r * 0.25,
        seed: [rng(), 0.05 + rng() * 0.07, r * (0.45 + rng() * 0.5),
          r * (0.46 + rng() * 0.42) * dens],
      });
    }
  };
  const addGotas = (x, y, z, spread, len, n) => {
    for (let i = 0; i < n; i++) {
      gotaPts.push({
        x: x + (rng() - 0.5) * spread,
        y: y - rng() * len * 0.25,
        z: z + 0.5 + rng() * 1.2,
        seed: [rng(), 0.22 + rng() * 0.25, len * (0.7 + rng() * 0.6),
          0.5 + rng() * 0.9],
      });
    }
  };

  // ── los saltos: por cada tramo banda + velo + halo + corazón, espuma en la
  // repisa (la lección de b78eca8: cada escalón carga su nube CHICA de espuma)
  const alto = labio.y - pie.y;
  for (let s = 0; s < cortes.length - 1; s++) {
    const last = s === cortes.length - 2;
    const kA = cortes[s] + (s === 0 ? 0 : -0.008), kB = cortes[s + 1] + (last ? 0 : 0.02);
    const segW = ancho * [1.0, 0.85, 1.15][s % 3];
    const bright = [1.30, 1.20, 1.28][s % 3];
    const impact = last ? 1.0 : 0.9;
    const banda = buildBanda(kA, kB, { base: segW, splay: last ? 0.9 : 0.5 });
    group.add(banda.mesh); mats.push(banda.mat);
    const velo = buildVelo(kA, kB, {
      base: segW, splay: last ? 1.0 : 0.6, alphaK: 0.85,
      vTiles: 2.4 * (cortes[s + 1] - cortes[s]) * (alto / 22), depth: 0.2,
      bright, birth: s === 0 ? 1.0 : 0.0, impact,
    }, 0xe8efe9);
    group.add(velo.mesh); mats.push(velo.mat);
    const halo = buildVelo(kA, kB, {
      base: segW * 1.9, splay: last ? 0.9 : 0.6, alphaK: 0.18,
      vTiles: 1.9 * (cortes[s + 1] - cortes[s]) * (alto / 22), depth: 0.05,
      bright: 0.85, birth: s === 0 ? 1.0 : 0.0, impact: impact * 0.5,
    }, 0xc4d2ca);
    halo.mesh.position.z -= 0.35;
    halo.mesh.renderOrder = 2;
    group.add(halo.mesh); mats.push(halo.mat);
    const core = buildVelo(kA, kB, {
      base: segW * 0.45, splay: 0.7, vTiles: 3.0 * (cortes[s + 1] - cortes[s]) * (alto / 22),
      depth: 0.4, bright: bright + 0.08, alphaK: 0.9,
      birth: s === 0 ? 1.0 : 0.0, impact,
    }, 0xf4f6f0);
    core.mesh.position.z += 0.35;
    group.add(core.mesh); mats.push(core.mat);
    // espuma de la repisa + mechones a media caída
    const rep = caida(cortes[s + 1]);
    const repZ = heightAt ? (() => { let z = rep.z, n = 0; while (n++ < 260 && heightAt(rep.x, z) > rep.y) z += 0.5; return z + roce; })() : rep.z;
    addPluma(rep.x, rep.y + 1.2, repZ, last ? 2.8 : 2.4, last ? 8 : 6, 0.85);
    // mechones PEGADOS al velo (la lección del valle: sueltos leen como copos)
    const mid = caida((kA + kB) / 2);
    addGotas(mid.x, mid.y + alto * 0.06, repZ + 0.4, segW * 1.0, alto * 0.13, 10);
  }

  // ── la poza que recibe + cantos rodados ──
  if (poza) {
    const pozaGeo = new THREE.CircleGeometry(1, 28);
    pozaGeo.rotateX(-Math.PI / 2);
    const pozaMat = new THREE.ShaderMaterial({
      vertexShader: pozaVert, fragmentShader: pozaFrag,
      uniforms: { uTime: { value: 0 } },
      transparent: true, depthWrite: false,
    });
    const rx = ancho * 2.6, rz = ancho * 2.0;
    const pozaMesh = new THREE.Mesh(pozaGeo, pozaMat);
    pozaMesh.scale.set(rx, 1, rz);
    pozaMesh.position.set(pie.x, pie.y + 0.06, pie.z + rz * 0.55);
    pozaMesh.renderOrder = 2;
    group.add(pozaMesh); mats.push(pozaMat);
    addPluma(pie.x, pie.y + 1.5, pie.z + 1.2, ancho * 1.2, 10, 0.9);
    const NR = 9;
    const rockGeo = new THREE.IcosahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, NR);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), cc = new THREE.Color();
    for (let i = 0; i < NR; i++) {
      const th = (-0.5 + i / (NR - 1)) * 2.1;
      const sc = (0.5 + rng() * 0.6) * ancho * 0.35;
      q.setFromEuler(new THREE.Euler(rng() * 3, rng() * 3, rng() * 3));
      m4.compose(new THREE.Vector3(
        pozaMesh.position.x + Math.sin(th) * rx * (0.92 + rng() * 0.16),
        pozaMesh.position.y - sc * 0.25 + rng() * 0.3,
        pozaMesh.position.z + Math.cos(th) * rz * (0.92 + rng() * 0.16)),
        q, new THREE.Vector3(sc, sc * 0.7, sc));
      rocks.setMatrixAt(i, m4);
      cc.set(0x6f6a5e).offsetHSL((rng() - 0.5) * 0.03, 0, (rng() - 0.5) * 0.14);
      rocks.setColorAt(i, cc);
    }
    rocks.instanceMatrix.needsUpdate = true;
    group.add(rocks);
  }

  // sistemas instanciados: TODA la bruma en un draw call, TODAS las gotas en otro
  const bruma = makeQuadCloud(brumaPts, brumaVert, brumaFrag);
  group.add(bruma.mesh); mats.push(bruma.mat);
  const gotas = makeQuadCloud(gotaPts, gotaVert, gotaFrag);
  group.add(gotas.mesh); mats.push(gotas.mat);

  function update(t) { for (const m of mats) m.uniforms.uTime.value = t; }
  return { group, update, mats };
}

// ── HELECHOS ARBORESCENTES ribereños (la firma de la ribera del bosque de
// niebla, DR-chorrera) — verde-dominante, instanciados, deterministas.
// FOLLAJE = MASA (regla dura): cada planta es tronco esbelto + copa-mata de
// frondes que nacen del ápice, se arquean por su peso y se superponen en
// volumen. La copa se arma con FollajeMasa (núcleo esculpido + cards
// texturizados, 2 draw calls por variante, imposible contar hojas) y respira
// con el reloj compartido de vientoMundos — el llamador tickea `update(t)`.
export function makeHelechosRibera({ puntos, heightAt, n = 36, seed = 977, aparte = 5 }) {
  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(
    puntos.map((p) => new THREE.Vector3(p.x, 0, p.z)), false, 'centripetal', 0.5);
  const rng = makeRng(seed);

  // ── VARIANTES de copa: 3 formas deterministas por seed. Las plantas de una
  // variante COMPARTEN geometría y se instancian → pocos draw calls, y aunque
  // se acerque la cámara no se pueden contar hojas (la textura va en canvas).
  const VARIANTES = 3;
  const pal = { oscuro: '#2f5c2c', medio: '#4a8a3a', claro: '#9cc45f' };
  const texOpts = { oscuro: '#3a6b33', medio: '#4f8f3e', claro: '#8fc26a', hojas: 430, alargue: 3.1 };
  const cO = new THREE.Color(pal.oscuro), cM = new THREE.Color(pal.medio), cC = new THREE.Color(pal.claro);
  const tmpc = new THREE.Color();
  const copas = [];
  for (let v = 0; v < VARIANTES; v++) {
    const rv = makeRng(seed * 131 + v * 977 + 17);
    const jit = (k) => 1 + (rv() - 0.5) * k;
    // FRONDES RADIALES como cuentas a lo largo de rayos: cada fronde sube
    // desde el centro y CUELGA por su peso — el cuelgo es la firma del helecho
    // (una copa sin cuelgo se lee como capas horizontales, no como mata).
    const esferas = [];
    const NF = 8;
    for (let k = 0; k < NF; k++) {
      const a = (k / NF) * Math.PI * 2 + rv() * 0.45;
      const ca = Math.cos(a), sa = Math.sin(a);
      const R = 0.76 + rv() * 0.26;   // largo de la fronde (determinista)
      const BEADS = 4;
      for (let b = 0; b < BEADS; b++) {
        const f = (b + 0.5) / BEADS;             // 0 centro → 1 punta
        const rr = R * f;
        // perfil de arco por peso propio: sube hasta ~f=0,2 y CUELGA fuerte
        const y = 0.70 + 0.10 * Math.sin(f * Math.PI * 1.15) - 0.66 * Math.pow(f, 1.4);
        esferas.push({
          c: [ca * rr * jit(0.14), y * jit(0.08), sa * rr * jit(0.14)],
          r: (0.18 - 0.05 * f) * jit(0.2),
          esc: [1.15, 1, 1.15],
        });
      }
    }
    // ápice claro: los croziers (frondes nuevas enrolladas) — tuft visible
    // aunque la copa esté lejos (la palma no lo tiene: es su mejor firma)
    esferas.push({ c: [0, 0.84, 0], r: 0.15, esc: [1, 1.3, 1] });
    esferas.push({ c: [0.13, 0.87, 0.07], r: 0.11, esc: [1, 1.25, 1] });
    esferas.push({ c: [-0.11, 0.86, -0.10], r: 0.11, esc: [1, 1.25, 1] });
    esferas.push({ c: [0.05, 0.89, -0.11], r: 0.09, esc: [1, 1.2, 1] });
    // gradiente por altura: sombra abajo (puntas colgando), luz clara arriba
    const yB = 0.14, yT = 0.92;
    const gradiente = (x, y, z) => {
      const t = THREE.MathUtils.clamp((y - yB) / (yT - yB), 0, 1);
      if (t < 0.5) tmpc.copy(cO).lerp(cM, t * 2);
      else tmpc.copy(cM).lerp(cC, (t - 0.5) * 2);
      return tmpc;
    };
    const nucleo = geometriaNucleoMasa(THREE, esferas, {
      seed: v * 31 + 5, gradiente, tonoSombra: '#1c351a',
      rugosidad: 0.35, encoger: 0.93, sombra: 0.58,
    });
    const cards = geometriaCardsMasa(THREE, esferas, {
      seed: v * 31 + 6, gradiente,
      cobertura: 1.15, tamCard: 0.24, modulacion: 0.45, maxCards: 650, minCards: 12,
    });
    // la copa se sube al ápice del tronco (tronco unitario: 0..1)
    nucleo.translate(0, 0.55, 0);
    cards.translate(0, 0.55, 0);
    const tex = texturaFollaje(THREE, { seed: v * 31 + 7, ...texOpts });
    const matNuc = materialNucleo(THREE, { brillo: 0.12, tono: pal.medio });
    const matCards = materialFollaje(THREE, tex, { brillo: 0.22 });
    // viento COMPARTIDO: la copa respira, el tronco no (piso arriba de él)
    aplicarVientoMundo(matCards, { amplitud: 0.10, piso: 0.68, velocidad: 1.0 });
    aplicarVientoMundo(matNuc, { amplitud: 0.06, piso: 0.68, velocidad: 1.0 });
    copas.push({ nucleo, cards, matNuc, matCards });
  }

  // ── tronco esbelto compartido: un InstancedMesh para todas las plantas ──
  const trGeo = new THREE.CylinderGeometry(0.05, 0.09, 1, 6);
  trGeo.translate(0, 0.5, 0);
  const trMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true });
  const troncos = new THREE.InstancedMesh(trGeo, trMat, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), cc = new THREE.Color();
  const up = new THREE.Vector3(0, 1, 0), ej = new THREE.Vector3();
  const tan = new THREE.Vector3(), side = new THREE.Vector3();
  const puestos = [];
  for (let i = 0; i < n; i++) {
    const t = 0.12 + rng() * 0.84;      // el pie de la chorrera queda LIBRE
    const c = curve.getPoint(t);
    curve.getTangent(t, tan);
    side.set(-tan.z, 0, tan.x).normalize();
    const lado = rng() < 0.5 ? -1 : 1;
    const d = aparte + rng() * aparte * 1.6;
    const x = c.x + side.x * lado * d, z = c.z + side.z * lado * d;
    const h = 3.2 + rng() * 3.4;
    puestos.push({ x, y: heightAt(x, z) - 0.3, z, h, rot: rng() * Math.PI * 2 });
    // tronco con carácter: leve inclinación hacia un eje (2-5°)
    ej.set(rng() - 0.5, 1, rng() - 0.5).normalize();
    q.setFromAxisAngle(up, rng() * Math.PI * 2);
    q.multiply(new THREE.Quaternion().setFromAxisAngle(ej, 0.02 + rng() * 0.03));
    m4.compose(new THREE.Vector3(x, puestos[i].y, z), q, new THREE.Vector3(h, h, h));
    troncos.setMatrixAt(i, m4);
    cc.set(0x5a4632).offsetHSL((rng() - 0.5) * 0.03, 0, (rng() - 0.5) * 0.1);
    troncos.setColorAt(i, cc);
  }
  troncos.instanceMatrix.needsUpdate = true;
  if (troncos.instanceColor) troncos.instanceColor.needsUpdate = true;
  group.add(troncos);

  // ── copas instanciadas por variante (cada parte en un InstancedMesh) ──
  for (let v = 0; v < VARIANTES; v++) {
    const zona = copas[v];
    const lista = [];
    for (let i = v; i < n; i += VARIANTES) lista.push(puestos[i]);
    const imNuc = new THREE.InstancedMesh(zona.nucleo, zona.matNuc, lista.length);
    const imCar = new THREE.InstancedMesh(zona.cards, zona.matCards, lista.length);
    for (let j = 0; j < lista.length; j++) {
      const p = lista[j];
      q.setFromAxisAngle(up, p.rot);
      m4.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.h, p.h, p.h));
      imNuc.setMatrixAt(j, m4);
      imCar.setMatrixAt(j, m4);
    }
    imNuc.instanceMatrix.needsUpdate = true;
    imCar.instanceMatrix.needsUpdate = true;
    group.add(imNuc); group.add(imCar);
  }

  function update(t) { tickVientoMundos(t); }
  return { group, update };
}
